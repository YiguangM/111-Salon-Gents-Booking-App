// Parsing for pasted YouTube / YouTube Music links, plus a loader for the
// YouTube IFrame Player API (the only sanctioned way to play YouTube audio -
// the streams can't be fed into a plain <audio> element).

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "youtube-nocookie.com"]);

export type YouTubeSource =
  | { kind: "playlist"; playlistId: string; index: number }
  | { kind: "videos"; videoIds: string[] };

export type ParsedYouTubeList = {
  source: YouTubeSource | null;
  invalid: string[];
  notice: string | null;
};

type ParsedLink = { videoId: string | null; playlistId: string | null; index: number };

function parseLink(token: string): ParsedLink | null {
  if (VIDEO_ID.test(token)) return { videoId: token, playlistId: null, index: 0 };

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(token) ? token : `https://${token}`);
  } catch {
    return null;
  }

  // Covers www., m. and music.youtube.com.
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  let videoId: string | null = null;
  let playlistId: string | null = null;

  if (host === "youtu.be") {
    videoId = url.pathname.slice(1).split("/")[0] || null;
  } else if (YOUTUBE_HOSTS.has(host)) {
    videoId =
      url.searchParams.get("v") ??
      url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/)?.[1] ??
      null;
  } else {
    return null;
  }

  const list = url.searchParams.get("list");
  if (list && PLAYLIST_ID.test(list)) playlistId = list;
  if (videoId && !VIDEO_ID.test(videoId)) videoId = null;
  if (!videoId && !playlistId) return null;

  // YouTube's `index` query param is 1-based.
  const index = Math.max(0, (Number(url.searchParams.get("index")) || 1) - 1);
  return { videoId, playlistId, index };
}

/**
 * Accepts anything a user might paste: a single playlist URL, or a list of
 * video URLs / bare video IDs separated by newlines, spaces or commas.
 *
 * A playlist can't be merged with loose videos (the IFrame API takes one or
 * the other), so a lone playlist link plays the whole playlist, while several
 * links are treated as a hand-picked list of videos.
 */
export function parseYouTubeList(text: string): ParsedYouTubeList {
  const tokens = text.split(/[\s,]+/).filter(Boolean);
  const links: ParsedLink[] = [];
  const invalid: string[] = [];

  for (const token of tokens) {
    const link = parseLink(token);
    if (link) links.push(link);
    else invalid.push(token);
  }

  const videoIds = links.flatMap((l) => (l.videoId ? [l.videoId] : []));
  const playlistLink = links.find((l) => l.playlistId);

  if (playlistLink?.playlistId && links.length === 1) {
    return {
      source: { kind: "playlist", playlistId: playlistLink.playlistId, index: playlistLink.index },
      invalid,
      notice: null,
    };
  }

  if (videoIds.length === 0) {
    return { source: null, invalid, notice: null };
  }

  return {
    source: { kind: "videos", videoIds },
    invalid,
    notice: playlistLink
      ? "Playlist links can't be mixed with other links, so only the individual videos were loaded."
      : null,
  };
}

// --- IFrame Player API -----------------------------------------------------

export const YT_STATE = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const;

export type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  stopVideo(): void;
  nextVideo(): void;
  previousVideo(): void;
  playVideoAt(index: number): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  setShuffle(shuffle: boolean): void;
  setLoop(loop: boolean): void;
  cuePlaylist(
    playlist: string[] | { list: string; listType: "playlist"; index?: number },
  ): void;
  getPlaylist(): string[] | null;
  getPlaylistIndex(): number;
  // Undocumented but long-standing; used for the cassette label.
  getVideoData?(): { video_id?: string; title?: string; author?: string };
  destroy(): void;
};

type YTPlayerOptions = {
  width?: string | number;
  height?: string | number;
  playerVars?: Record<string, string | number>;
  events?: {
    onReady?: (event: { target: YTPlayer }) => void;
    onStateChange?: (event: { data: number; target: YTPlayer }) => void;
    onError?: (event: { data: number; target: YTPlayer }) => void;
  };
};

type YTNamespace = {
  Player: new (element: HTMLElement, options: YTPlayerOptions) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    if (window.YT?.Player) {
      resolve(window.YT);
      return;
    }
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => {
      apiPromise = null;
      reject(new Error("Couldn't load the YouTube player. Check your connection or ad blocker."));
    };
    document.head.appendChild(script);
  });

  return apiPromise;
}

export function youTubeErrorMessage(code: number): string {
  switch (code) {
    case 2:
      return "That video ID is invalid.";
    case 5:
      return "This video can't be played in the browser.";
    case 100:
      return "This video was removed or made private.";
    case 101:
    case 150:
      return "The owner doesn't allow this video to be played outside YouTube.";
    default:
      return "YouTube couldn't play this track.";
  }
}

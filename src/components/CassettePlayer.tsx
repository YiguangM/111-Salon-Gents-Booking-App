"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  loadYouTubeApi,
  YT_STATE,
  youTubeErrorMessage,
  type YouTubeSource,
  type YTPlayer,
} from "@/lib/youtube";

const SEEK_STEP_SECONDS = 15;
const POLL_MS = 400;

type Props = {
  source: YouTubeSource;
  /** Handwritten text on the cassette label; falls back to the current track's title. */
  trackTitle?: string;
};

type Winding = "ff" | "rew" | null;

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

export function CassettePlayer({ source, trackTitle }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const windTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [trackError, setTrackError] = useState<string | null>(null);
  const [state, setState] = useState<number>(YT_STATE.UNSTARTED);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [loop, setLoop] = useState(false);
  const [winding, setWinding] = useState<Winding>(null);

  // Create the YouTube player. It replaces its target element with an iframe,
  // so give it a node React doesn't manage rather than one from JSX.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        const mount = document.createElement("div");
        container.appendChild(mount);
        playerRef.current = new YT.Player(mount, {
          width: "100%",
          height: "100%",
          playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: ({ target }) => {
              if (cancelled) return;
              target.setVolume(80);
              if (source.kind === "playlist") {
                target.cuePlaylist({
                  list: source.playlistId,
                  listType: "playlist",
                  index: source.index,
                });
              } else {
                target.cuePlaylist(source.videoIds);
              }
              setReady(true);
            },
            onStateChange: ({ data }) => {
              setState(data);
              if (data === YT_STATE.PLAYING) setTrackError(null);
            },
            onError: ({ data, target }) => {
              setTrackError(youTubeErrorMessage(data));
              // Skip unplayable tracks the way a tape would just keep rolling.
              const list = target.getPlaylist() ?? [];
              if (target.getPlaylistIndex() < list.length - 1) {
                setTimeout(() => target.nextVideo(), 1200);
              }
            },
          },
        });
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
      });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
      container.replaceChildren();
    };
  }, [source]);

  // The IFrame API has no time-update event, so poll.
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      setCurrentTime(p.getCurrentTime() || 0);
      setDuration(p.getDuration() || 0);
      setIndex(Math.max(0, p.getPlaylistIndex()));
      const list = p.getPlaylist();
      if (list) setPlaylist((prev) => (prev.join() === list.join() ? prev : list));
      const data = p.getVideoData?.();
      if (data?.video_id && data.title) {
        const { video_id, title } = data;
        setTitles((prev) => (prev[video_id] === title ? prev : { ...prev, [video_id]: title }));
      }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [ready]);

  useEffect(() => () => {
    if (windTimer.current) clearTimeout(windTimer.current);
  }, []);

  const isPlaying = state === YT_STATE.PLAYING || state === YT_STATE.BUFFERING;

  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.getPlayerState() === YT_STATE.PLAYING) p.pauseVideo();
    else p.playVideo();
  }, []);

  const wind = useCallback((direction: "ff" | "rew") => {
    const p = playerRef.current;
    if (!p) return;
    const delta = direction === "ff" ? SEEK_STEP_SECONDS : -SEEK_STEP_SECONDS;
    const target = Math.max(0, Math.min(p.getDuration() || 0, p.getCurrentTime() + delta));
    p.seekTo(target, true);
    setCurrentTime(target);
    setWinding(direction);
    if (windTimer.current) clearTimeout(windTimer.current);
    windTimer.current = setTimeout(() => setWinding(null), 500);
  }, []);

  const stop = () => {
    const p = playerRef.current;
    if (!p) return;
    p.seekTo(0, true);
    p.pauseVideo();
    setCurrentTime(0);
  };

  const seek = (seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setCurrentTime(seconds);
  };

  const changeVolume = (value: number) => {
    const p = playerRef.current;
    setVolume(value);
    p?.setVolume(value);
    if (muted && value > 0) {
      p?.unMute();
      setMuted(false);
    }
  };

  const toggleMute = () => {
    const p = playerRef.current;
    if (!p) return;
    if (muted) p.unMute();
    else p.mute();
    setMuted(!muted);
  };

  const toggleShuffle = () => {
    playerRef.current?.setShuffle(!shuffle);
    setShuffle(!shuffle);
  };

  const toggleLoop = () => {
    playerRef.current?.setLoop(!loop);
    setLoop(!loop);
  };

  // Keyboard shortcuts, ignored while typing in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight") {
        wind("ff");
      } else if (e.key === "ArrowLeft") {
        wind("rew");
      } else if (e.key === "n") {
        playerRef.current?.nextVideo();
      } else if (e.key === "p") {
        playerRef.current?.previousVideo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, wind]);

  const currentId = playlist[index];
  const currentTitle = (currentId && titles[currentId]) || (ready ? "Press play" : "Loading tape…");
  const progress = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  const reelSpin: ReelSpin = winding ? winding : isPlaying ? "play" : null;

  if (loadError) {
    return (
      <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
        {loadError}
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex flex-col gap-5">
        {/* Cassette shell */}
        <div className="relative mx-auto w-full max-w-xl rounded-2xl bg-neutral-800 p-4 shadow-2xl ring-1 ring-black/40 sm:p-6">
          <Screw className="left-2 top-2" />
          <Screw className="right-2 top-2" />
          <Screw className="bottom-2 left-2" />
          <Screw className="bottom-2 right-2" />

          {/* Label */}
          <div className="rounded-lg bg-amber-50 px-4 pb-4 pt-3 text-neutral-900 shadow-inner">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-amber-800">
              <span>Side A</span>
              <span>
                {playlist.length ? `Track ${index + 1} / ${playlist.length}` : "C-90"}
              </span>
            </div>
            <p
              className="mt-1 truncate border-b border-dashed border-amber-300 pb-1 font-display text-lg italic sm:text-xl"
              title={trackTitle ?? currentTitle}
            >
              {trackTitle ?? currentTitle}
            </p>
            {trackTitle && (
              <p className="mt-1 truncate text-xs text-neutral-600">{currentTitle}</p>
            )}

            {/* Tape window */}
            <div className="mx-auto mt-3 flex h-24 max-w-sm items-center justify-between rounded-full bg-neutral-900 px-4 ring-4 ring-amber-700/70 sm:h-28">
              <Reel fill={1 - progress} spin={reelSpin} />
              <div className="mx-2 h-10 flex-1 rounded bg-neutral-700/60">
                <div className="mt-[18px] h-1 bg-amber-950" />
              </div>
              <Reel fill={progress} spin={reelSpin} />
            </div>
          </div>

          {/* Bottom trapezoid of the shell */}
          <div className="mx-auto mt-3 h-6 w-2/3 rounded-b-xl bg-neutral-700 [clip-path:polygon(6%_0,94%_0,100%_100%,0_100%)]" />
        </div>

        {/* Counter + progress */}
        <div className="mx-auto w-full max-w-xl">
          <div className="flex items-center justify-between font-mono text-sm tabular-nums text-neutral-700">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={1}
            value={Math.min(currentTime, duration || 1)}
            onChange={(e) => seek(Number(e.target.value))}
            disabled={!ready || !duration}
            aria-label="Seek"
            className="w-full accent-amber-700"
          />
        </div>

        {/* Deck keys */}
        <div className="mx-auto flex w-full max-w-xl flex-wrap justify-center gap-1 rounded-xl bg-neutral-300 p-2 shadow-inner">
          <DeckKey label="Previous track" onClick={() => playerRef.current?.previousVideo()} disabled={!ready}>
            ⏮
          </DeckKey>
          <DeckKey label={`Rewind ${SEEK_STEP_SECONDS} seconds`} onClick={() => wind("rew")} disabled={!ready}>
            ⏪
          </DeckKey>
          <DeckKey
            label={isPlaying ? "Pause" : "Play"}
            onClick={togglePlay}
            disabled={!ready}
            pressed={isPlaying}
            wide
          >
            {isPlaying ? "⏸" : "▶"}
          </DeckKey>
          <DeckKey label="Stop" onClick={stop} disabled={!ready}>
            ■
          </DeckKey>
          <DeckKey label={`Fast forward ${SEEK_STEP_SECONDS} seconds`} onClick={() => wind("ff")} disabled={!ready}>
            ⏩
          </DeckKey>
          <DeckKey label="Next track" onClick={() => playerRef.current?.nextVideo()} disabled={!ready}>
            ⏭
          </DeckKey>
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-wrap items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              disabled={!ready}
              aria-label={muted ? "Unmute" : "Mute"}
              className="w-8 text-lg disabled:opacity-40"
            >
              {muted || volume === 0 ? "🔇" : "🔊"}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
              disabled={!ready}
              aria-label="Volume"
              className="w-32 accent-amber-700"
            />
          </div>
          <div className="flex gap-2">
            <ToggleChip on={shuffle} onClick={toggleShuffle} disabled={!ready}>
              Shuffle
            </ToggleChip>
            <ToggleChip on={loop} onClick={toggleLoop} disabled={!ready}>
              Repeat all
            </ToggleChip>
          </div>
        </div>

        {trackError && (
          <p role="status" className="mx-auto w-full max-w-xl rounded-md bg-amber-100 px-3 py-2 text-sm text-amber-900">
            {trackError}
          </p>
        )}

        <p className="mx-auto max-w-xl text-center text-xs text-neutral-500">
          Shortcuts: <kbd>Space</kbd> play/pause · <kbd>←</kbd>/<kbd>→</kbd> wind {SEEK_STEP_SECONDS}s ·{" "}
          <kbd>P</kbd>/<kbd>N</kbd> previous/next
        </p>
      </div>

      <aside className="flex flex-col gap-4">
        {/* YouTube's terms require the player to stay visible, so it lives here. */}
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
          <div ref={containerRef} className="h-full w-full" />
        </div>

        <div className="rounded-lg border border-neutral-200">
          <h2 className="border-b border-neutral-200 px-3 py-2 text-sm font-semibold">
            Track list {playlist.length > 0 && <span className="text-neutral-500">({playlist.length})</span>}
          </h2>
          <ol className="max-h-80 overflow-y-auto text-sm">
            {playlist.map((id, i) => (
              <li key={`${id}-${i}`}>
                <button
                  type="button"
                  onClick={() => playerRef.current?.playVideoAt(i)}
                  aria-current={i === index ? "true" : undefined}
                  className={`flex w-full gap-2 px-3 py-2 text-start hover:bg-amber-50 ${
                    i === index ? "bg-amber-100 font-medium text-amber-900" : ""
                  }`}
                >
                  <span className="w-6 shrink-0 text-end tabular-nums text-neutral-500">{i + 1}</span>
                  <span className="truncate">{titles[id] ?? id}</span>
                </button>
              </li>
            ))}
            {playlist.length === 0 && (
              <li className="px-3 py-2 text-neutral-500">{ready ? "Loading tracks…" : "Loading player…"}</li>
            )}
          </ol>
        </div>
      </aside>
    </div>
  );
}

type ReelSpin = "play" | "ff" | "rew" | null;

/** A tape reel whose wound tape grows/shrinks with `fill` (0..1). */
function Reel({ fill, spin }: { fill: number; spin: ReelSpin }) {
  const tapeRadius = 16 + 30 * fill;
  const animation = spin
    ? `reel-spin ${spin === "play" ? "2.4s" : "0.35s"} linear infinite${spin === "rew" ? " reverse" : ""}`
    : undefined;

  return (
    <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0 sm:h-24 sm:w-24" aria-hidden="true">
      <circle cx="50" cy="50" r={tapeRadius} fill="#3b2412" />
      <g
        style={{
          animation,
          transformBox: "fill-box",
          transformOrigin: "center",
        }}
      >
        <circle cx="50" cy="50" r="15" fill="#f5f5f4" />
        {[0, 60, 120, 180, 240, 300].map((deg) => (
          <rect key={deg} x="48" y="36" width="4" height="7" rx="1" fill="#404040" transform={`rotate(${deg} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="5" fill="#262626" />
      </g>
    </svg>
  );
}

function Screw({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-2.5 w-2.5 rounded-full bg-neutral-500 shadow-inner ring-1 ring-neutral-900 ${className}`}
    />
  );
}

function DeckKey({
  label,
  onClick,
  disabled,
  pressed,
  wide,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={`h-14 ${wide ? "w-20" : "w-14"} rounded-md border-b-4 text-xl transition-all disabled:opacity-40 ${
        pressed
          ? "translate-y-0.5 border-amber-900 bg-amber-600 text-white"
          : "border-neutral-500 bg-neutral-100 text-neutral-800 hover:bg-white active:translate-y-0.5 active:border-b-2"
      }`}
    >
      {children}
    </button>
  );
}

function ToggleChip({
  on,
  onClick,
  disabled,
  children,
}: {
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`rounded-full border px-3 py-1 text-xs font-medium disabled:opacity-40 ${
        on ? "border-amber-700 bg-amber-700 text-white" : "border-neutral-300 text-neutral-700 hover:bg-neutral-100"
      }`}
    >
      {children}
    </button>
  );
}

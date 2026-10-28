"use client";

import { useState, type FormEvent } from "react";
import { CassettePlayer } from "@/components/CassettePlayer";
import { parseYouTubeList, type YouTubeSource } from "@/lib/youtube";

const PLACEHOLDER = `Paste a playlist link:
https://music.youtube.com/playlist?list=PL...

…or one video link per line:
https://www.youtube.com/watch?v=...
https://youtu.be/...`;

export function YouTubeMixtape() {
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [source, setSource] = useState<YouTubeSource | null>(null);
  // Bumped on every load so re-loading the same list still rebuilds the player.
  const [tapeKey, setTapeKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = parseYouTubeList(text);
    if (!parsed.source) {
      setError("No YouTube links found. Paste a playlist URL or one or more video URLs.");
      setNotice(null);
      return;
    }
    const skipped = parsed.invalid.length
      ? `Skipped ${parsed.invalid.length} line${parsed.invalid.length === 1 ? "" : "s"} that weren't YouTube links.`
      : null;
    setError(null);
    setNotice([parsed.notice, skipped].filter(Boolean).join(" ") || null);
    setSource(parsed.source);
    setTapeKey((k) => k + 1);
  };

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <label htmlFor="yt-list" className="text-sm font-semibold">
          YouTube / YouTube Music links
        </label>
        <textarea
          id="yt-list"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          spellCheck={false}
          className="w-full rounded-lg border border-neutral-300 p-3 font-mono text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            <label htmlFor="tape-label" className="text-xs font-medium text-neutral-600">
              Tape label (optional)
            </label>
            <input
              id="tape-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="My mixtape"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-700/30"
            />
          </div>
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-lg bg-brand px-5 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            Load tape
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && <p className="text-sm text-amber-800">{notice}</p>}
      </form>

      {source && (
        <CassettePlayer key={tapeKey} source={source} trackTitle={label.trim() || undefined} />
      )}
    </div>
  );
}

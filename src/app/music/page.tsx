import type { Metadata } from "next";
import { YouTubeMixtape } from "@/components/YouTubeMixtape";

export const metadata: Metadata = {
  title: "Mixtape",
  description: "Paste a YouTube or YouTube Music list and play it on a cassette deck.",
};

export default function MusicPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl italic">Mixtape</h1>
      <p className="mt-2 mb-8 text-neutral-600">
        Paste a YouTube or YouTube Music playlist (or a stack of song links) and play it on the deck.
      </p>
      <YouTubeMixtape />
    </main>
  );
}

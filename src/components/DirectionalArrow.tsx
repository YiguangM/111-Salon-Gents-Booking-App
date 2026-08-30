// Arrow glyphs point the wrong way once the layout flips to RTL (the
// characters themselves don't know about `dir`). Mirroring horizontally
// under Tailwind's `rtl:` variant fixes both "forward" (→) and "back" (←)
// arrows without needing separate glyphs per direction.
export function Arrow({ direction }: { direction: "forward" | "back" }) {
  return <span className="inline-block rtl:-scale-x-100">{direction === "forward" ? "→" : "←"}</span>;
}

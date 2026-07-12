import type { Season } from "@/types/media";

export function SeasonSelector({
  seasons,
  activeSeason,
  onChange,
}: {
  seasons: Season[];
  activeSeason: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {seasons.map((s) => (
        <button
          key={s.id}
          onClick={() => onChange(s.seasonNumber)}
          aria-pressed={s.seasonNumber === activeSeason}
          className={
            "rounded-full border px-4 py-2 text-sm transition " +
            (s.seasonNumber === activeSeason
              ? "border-transparent bg-brand text-brand-foreground shadow-[var(--shadow-glow)]"
              : "border-white/10 glass hover:bg-white/10")
          }
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}
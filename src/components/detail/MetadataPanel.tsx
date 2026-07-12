import type { MediaItem } from "@/types/media";

function formatMoney(n?: number) {
  if (!n) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

export function MetadataPanel({ item }: { item: MediaItem }) {
  const rows: [string, string | undefined][] = item.kind === "movie"
    ? [
        ["Status", item.status],
        ["Original language", item.originalLanguage],
        ["Languages", item.spokenLanguages?.join(", ")],
        ["Budget", formatMoney(item.budget)],
        ["Revenue", formatMoney(item.revenue)],
        ["Age rating", item.ageRating],
        ["Quality", item.qualities?.join(" · ")],
      ]
    : [
        ["Status", item.status],
        ["Network", item.network],
        ["First aired", item.firstAirDate],
        ["Last aired", item.lastAirDate],
        ["Seasons", item.numberOfSeasons?.toString()],
        ["Episodes", item.numberOfEpisodes?.toString()],
        ["Languages", item.spokenLanguages?.join(", ")],
        ["Age rating", item.ageRating],
      ];
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-4 rounded-2xl border border-white/5 bg-surface/50 p-6 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col">
          <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{k}</dt>
          <dd className="mt-1 text-sm">{v || "—"}</dd>
        </div>
      ))}
      {item.productionCompanies?.length ? (
        <div className="sm:col-span-2">
          <dt className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Production</dt>
          <dd className="mt-2 flex flex-wrap gap-2">
            {item.productionCompanies.map((c) => (
              <span key={c.id} className="rounded-full glass px-3 py-1 text-xs">{c.name}</span>
            ))}
          </dd>
        </div>
      ) : null}
    </dl>
  );
}
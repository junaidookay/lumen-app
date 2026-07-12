import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { STATIC_GENRES as GENRES } from "@/constants/genres";
import type { CatalogueFilters } from "@/services/media";

interface Props {
  open: boolean;
  onClose: () => void;
  value: CatalogueFilters;
  onChange: (next: CatalogueFilters) => void;
  showKind?: boolean;
}

const YEARS = Array.from({ length: 15 }).map((_, i) => 2025 - i);
const RATINGS = [0, 6, 7, 7.5, 8, 8.5];

export function FilterDrawer({ open, onClose, value, onChange, showKind = true }: Props) {
  const toggleGenre = (name: string) => {
    const set = new Set(value.genres ?? []);
    if (set.has(name)) set.delete(name); else set.add(name);
    onChange({ ...value, genres: [...set] });
  };
  const reset = () => onChange({ kind: "all", genres: [], minYear: undefined, maxYear: undefined, minRating: undefined, sort: value.sort });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-white/10 bg-surface"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-5">
              <h3 className="text-lg font-semibold">Filters</h3>
              <button aria-label="Close filters" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 space-y-6 overflow-y-auto p-5">
              {showKind && (
                <Group label="Type">
                  <div className="flex gap-2">
                    {(["all", "movie", "tv"] as const).map((k) => (
                      <Chip key={k} active={(value.kind ?? "all") === k} onClick={() => onChange({ ...value, kind: k })}>
                        {k === "all" ? "All" : k === "movie" ? "Movies" : "TV"}
                      </Chip>
                    ))}
                  </div>
                </Group>
              )}
              <Group label="Genres">
                <div className="flex flex-wrap gap-2">
                  {GENRES.map((g) => (
                    <Chip key={g.id} active={value.genres?.includes(g.name) ?? false} onClick={() => toggleGenre(g.name)}>{g.name}</Chip>
                  ))}
                </div>
              </Group>
              <Group label="Year">
                <div className="flex flex-wrap gap-2">
                  <Chip active={!value.minYear} onClick={() => onChange({ ...value, minYear: undefined, maxYear: undefined })}>Any</Chip>
                  {YEARS.map((y) => (
                    <Chip key={y} active={value.minYear === y && value.maxYear === y} onClick={() => onChange({ ...value, minYear: y, maxYear: y })}>{y}</Chip>
                  ))}
                </div>
              </Group>
              <Group label="Minimum rating">
                <div className="flex flex-wrap gap-2">
                  {RATINGS.map((r) => (
                    <Chip key={r} active={(value.minRating ?? 0) === r} onClick={() => onChange({ ...value, minRating: r || undefined })}>{r === 0 ? "Any" : `${r}+`}</Chip>
                  ))}
                </div>
              </Group>
            </div>
            <div className="flex gap-2 border-t border-white/10 p-5">
              <button onClick={reset} className="flex-1 rounded-full glass border border-white/10 px-4 py-2.5 text-sm hover:bg-white/10">Reset</button>
              <button onClick={onClose} className="flex-1 rounded-full bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground">Show results</button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={"rounded-full border px-3 py-1.5 text-sm transition " + (active ? "border-transparent bg-brand text-brand-foreground" : "border-white/10 glass hover:bg-white/10")}
    >
      {children}
    </button>
  );
}
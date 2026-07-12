import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Loader2, Search, Sparkles, TrendingUp, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchQuery, trendingSearchesQuery } from "@/services/content";
import { MediaCard } from "@/components/cards/MediaCard";
import { CardSkeleton } from "@/components/skeletons/RowSkeleton";

const SUGGESTED = ["Sci-Fi", "Drama", "Animation", "Mystery", "Comedy", "Thriller"];
const RECENT_KEY = "lumen:recent-searches";

export function SearchExperience() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [debouncing, setDebouncing] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    if (!q) {
      setDebounced("");
      setDebouncing(false);
      return;
    }
    setDebouncing(true);
    const id = window.setTimeout(() => {
      setDebounced(q);
      setDebouncing(false);
    }, 320);
    return () => window.clearTimeout(id);
  }, [q]);

  const searchRes = useQuery(searchQuery(debounced));
  const trending = useQuery(trendingSearchesQuery());
  const results = searchRes.data?.items ?? [];
  const loading = debouncing || searchRes.isFetching;
  const trendingSearches = trending.data ?? [];

  const commit = (term: string) => {
    setQ(term);
    setRecent((prev) => {
      const next = [term, ...prev.filter((r) => r !== term)].slice(0, 6);
      try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const hasQuery = q.trim().length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-10">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="glass flex items-center gap-3 rounded-full border border-white/10 px-5 py-4 shadow-[var(--shadow-elevated)]">
          <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) commit(q.trim());
            }}
            placeholder="Search movies, series, genres…"
            aria-label="Search"
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:text-lg"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          {hasQuery && !loading && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear"
              className="grid h-8 w-8 place-items-center rounded-full bg-white/5 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!hasQuery ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-10 grid gap-10 md:grid-cols-2"
          >
            {recent.length > 0 && (
              <Section title="Recent" icon={<Clock className="h-4 w-4" />}>
                <ChipList items={recent} onPick={commit} />
              </Section>
            )}
            <Section title="Trending searches" icon={<TrendingUp className="h-4 w-4 text-brand" />}>
              <ChipList items={trendingSearches} onPick={commit} />
            </Section>
            <Section title="Try a genre" icon={<Sparkles className="h-4 w-4 text-brand" />}>
              <ChipList items={SUGGESTED} onPick={commit} />
            </Section>
          </motion.div>
        ) : loading && results.length === 0 ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </motion.div>
        ) : results.length === 0 && debounced ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-16 text-center"
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full glass">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-xl font-semibold">No results for &ldquo;{q}&rdquo;</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Try a different keyword or browse trending titles below.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {trendingSearches.slice(0, 5).map((s) => (
                <button
                  key={s}
                  onClick={() => commit(s)}
                  className="rounded-full glass px-4 py-1.5 text-sm hover:bg-white/10"
                >
                  {s}
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-10"
          >
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} result{results.length === 1 ? "" : "s"} for &ldquo;{debounced}&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {results.map((item, i) => (
                <MediaCard key={item.id} item={item} index={i} className="w-full" />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {icon}
        {title}
      </p>
      {children}
    </div>
  );
}

function ChipList({ items, onPick }: { items: string[]; onPick: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => (
        <button
          key={it}
          type="button"
          onClick={() => onPick(it)}
          className="rounded-full glass px-4 py-1.5 text-sm transition hover:bg-white/10"
        >
          {it}
        </button>
      ))}
    </div>
  );
}
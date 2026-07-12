import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, ArrowUpDown } from "lucide-react";

export interface SortOption { value: string; label: string }

export function SortDropdown({ value, options, onChange }: { value: string; options: SortOption[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, []);
  const active = options.find((o) => o.value === value) ?? options[0];
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full glass border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
      >
        <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Sort:</span>
        <span>{active.label}</span>
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-surface shadow-[var(--shadow-elevated)]">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm hover:bg-white/5"
            >
              {o.label}
              {o.value === value && <Check className="h-4 w-4 text-brand" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
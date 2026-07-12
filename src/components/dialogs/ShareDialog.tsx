import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Copy, Facebook, Link2, Twitter, X } from "lucide-react";

export function ShareDialog({ open, onClose, url, title }: { open: boolean; onClose: () => void; url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* noop */ }
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog" aria-modal="true"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-white/10 bg-surface p-6 shadow-[var(--shadow-elevated)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Share {title}</h3>
              <button aria-label="Close" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[{ icon: Twitter, label: "X" }, { icon: Facebook, label: "Facebook" }, { icon: Link2, label: "Link" }].map((s) => (
                <button key={s.label} className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-surface-elevated py-4 text-sm hover:bg-white/10">
                  <s.icon className="h-5 w-5" />
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-full glass border border-white/10 px-4 py-2 text-sm">
              <span className="truncate text-muted-foreground">{url}</span>
              <button onClick={doCopy} className="ml-auto flex items-center gap-1 rounded-full bg-brand px-3 py-1 text-xs font-medium text-brand-foreground">
                {copied ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> Copy</>}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
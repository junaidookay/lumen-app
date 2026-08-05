import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { SearchExperience } from "@/components/search/SearchExperience";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "Search — Watch Box" },
      { name: "description", content: "Search every movie and series in the Watch Box catalogue." },
      { property: "og:title", content: "Search — Watch Box" },
      { property: "og:description", content: "Search every movie and series in the Watch Box catalogue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  return (
    <AppShell>
      <div className="pt-32 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-10 max-w-3xl px-4 text-center sm:px-6 lg:px-10"
        >
          <p className="text-xs uppercase tracking-[0.25em] text-brand">Search</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
            Find what you&rsquo;re in the mood for.
          </h1>
        </motion.div>
        <SearchExperience />
      </div>
    </AppShell>
  );
}
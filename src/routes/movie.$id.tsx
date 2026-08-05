import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { MovieHero } from "@/components/detail/MovieHero";
import { MetadataPanel } from "@/components/detail/MetadataPanel";
import { CastCard } from "@/components/detail/CastCard";
import { CrewCard } from "@/components/detail/CrewCard";
import { ReviewCard } from "@/components/detail/ReviewCard";
import { GalleryCarousel } from "@/components/detail/GalleryCarousel";
import { RecommendationRow, SimilarContentRow } from "@/components/sections/RecommendationRow";
import { movieQuery } from "@/services/content";

export const Route = createFileRoute("/movie/$id")({
  loader: async ({ params, context }) => {
    try {
      await context.queryClient.ensureQueryData(movieQuery(params.id));
    } catch {
      throw notFound();
    }
  },
  head: ({ loaderData }) => {
    void loaderData;
    return {
      meta: [
        { title: "Movie — Watch Box" },
      ],
    };
  },
  component: MovieDetail,
});

function MovieDetail() {
  const { id } = Route.useParams();
  const { data } = useSuspenseQuery(movieQuery(id));
  const movie = data.item;
  const similar = data.similar;
  const recs = data.recommendations;
  const collectionItems = data.collectionItems ?? [];

  return (
    <AppShell>
      <MovieHero item={movie} />

      <div className="mx-auto max-w-[1400px] space-y-16 px-4 py-16 sm:px-6 lg:px-10">
        {/* Cast */}
        {movie.cast.length > 0 && (
          <section>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">Cast</h2>
            <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
              {movie.cast.map((c: any, i: number) => <CastCard key={c.id} member={c} index={i} />)}
            </div>
          </section>
        )}

        {/* Crew + Metadata */}
        <section className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">Details</h2>
            <MetadataPanel item={movie} />
          </div>
          <div>
            <h2 className="mb-4 text-2xl font-semibold tracking-tight">Crew</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {movie.director && (
                <div className="rounded-2xl border border-white/5 bg-surface/50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Director</p>
                  <p className="mt-1 text-sm font-medium">{movie.director}</p>
                </div>
              )}
              {movie.writers?.length ? (
                <div className="rounded-2xl border border-white/5 bg-surface/50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Writers</p>
                  <p className="mt-1 text-sm font-medium">{movie.writers.join(", ")}</p>
                </div>
              ) : null}
              {movie.crew?.map((c: any) => <CrewCard key={c.id} member={c} />)}
            </div>
          </div>
        </section>
      </div>

      {/* Gallery */}
      {movie.gallery?.length ? <GalleryCarousel images={movie.gallery} /> : null}

      {/* Reviews */}
      {movie.reviews?.length ? (
        <section className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-10">
          <h2 className="mb-4 text-2xl font-semibold tracking-tight">Reviews</h2>
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="grid gap-3 md:grid-cols-2">
            {movie.reviews.slice(0, 4).map((r: any) => <ReviewCard key={r.id} review={r} />)}
          </motion.div>
        </section>
      ) : null}

      {/* Collection */}
      {collectionItems.length > 0 && (
        <section className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-brand">Part of a collection</p>
              <h2 className="text-2xl font-semibold tracking-tight">More from this collection</h2>
            </div>
            <Link to="/discover" className="text-sm text-muted-foreground hover:text-foreground">See all</Link>
          </div>
          <SimilarContentRow title="" items={collectionItems} />
        </section>
      )}

      <div className="space-y-12 py-8">
        <SimilarContentRow items={similar} />
        <RecommendationRow title="Recommended for you" items={recs} />
      </div>
    </AppShell>
  );
}
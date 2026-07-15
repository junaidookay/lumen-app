import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { movieQuery, showQuery } from "@/services/content";
import { preloadMediaImages, preloadRecommendations } from "@/pwa/services/preload";

interface PreloadProviderProps {
  children: React.ReactNode;
}

export function PreloadProvider({ children }: PreloadProviderProps) {
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(new Set<string>());

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const mediaId = entry.target.getAttribute("data-preload-media");
          const mediaKind = entry.target.getAttribute("data-preload-kind") as "movie" | "tv" | null;
          if (!mediaId || !mediaKind || prefetchedRef.current.has(mediaId)) continue;
          prefetchedRef.current.add(mediaId);

          const query = mediaKind === "tv" ? showQuery(mediaId) : movieQuery(mediaId);
          queryClient
            .fetchQuery({ ...query, staleTime: Infinity } as any)
            .then((data: any) => {
              if (data?.item) preloadMediaImages(data.item);
              if (data?.recommendations) preloadRecommendations(data.recommendations.slice(0, 6));
            })
            .catch(() => {});
        }
      },
      { rootMargin: "200px" },
    );

    const elements = document.querySelectorAll("[data-preload-media]");
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [queryClient]);

  return <>{children}</>;
}

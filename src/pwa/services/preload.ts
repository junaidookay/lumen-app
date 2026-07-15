const preloadCache = new Map<string, HTMLImageElement>();

export function preloadImage(src: string): Promise<void> {
  if (preloadCache.has(src)) return Promise.resolve();

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadCache.set(src, img);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}

export function preloadImages(srcs: string[]): Promise<void[]> {
  return Promise.all(srcs.map(preloadImage));
}

export function preloadPoster(src: string): Promise<void> {
  return preloadImage(src);
}

export function preloadBackdrop(src: string): Promise<void> {
  return preloadImage(src);
}

export function preloadMediaImages(item: {
  poster?: string;
  backdrop?: string;
}): Promise<void[]> {
  const urls: string[] = [];
  if (item.poster) urls.push(item.poster);
  if (item.backdrop) urls.push(item.backdrop);
  return preloadImages(urls);
}

export function preloadRecommendations(items: Array<{ poster?: string; backdrop?: string }>): Promise<void[]> {
  const urls = items.slice(0, 6).flatMap((item) => {
    const u: string[] = [];
    if (item.poster) u.push(item.poster);
    if (item.backdrop) u.push(item.backdrop);
    return u;
  });
  return preloadImages(urls);
}

export function preloadNextEpisode(episode: { still?: string }): Promise<void[]> {
  if (!episode.still) return Promise.resolve([]);
  return preloadImages([episode.still]);
}

export function clearPreloadCache(): void {
  preloadCache.clear();
}

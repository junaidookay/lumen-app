import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type Hls from "hls.js";
import type { HlsConfig, Level, MediaPlaylist } from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  PictureInPicture2,
  RectangleHorizontal,
  Gauge,
  Subtitles,
  AudioLines,
  Settings2,
  SkipBack,
  SkipForward,
  Layers,
  Loader2,
  AlertTriangle,
  Wifi,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { track as trackPlayback } from "@/lib/analytics/playback";
import { pickFallback } from "@/lib/streaming/service";
import type {
  AudioTrack,
  PlaybackPreferences,
  QualityLevel,
  StreamingSource,
  SubtitleTrack,
} from "@/lib/streaming/types";

export interface VideoPlayerHandle {
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

export interface VideoPlayerProps {
  mediaId: string;
  mediaKind: "movie" | "tv";
  season?: number;
  episode?: number;
  title: string;
  subtitle?: string;
  poster?: string;
  sources: StreamingSource[];
  initialSourceId?: string;
  resumeSeconds?: number;
  preferences: PlaybackPreferences;
  onPreferenceChange?: (prefs: Partial<PlaybackPreferences>) => void;
  onProgress?: (info: {
    positionSeconds: number;
    durationSeconds: number;
    percent: number;
    sourceId: string;
  }) => void;
  onCompleted?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  /** Show "Up Next" overlay near end of episode. */
  upNext?: { title: string; still?: string; onPlay: () => void };
  className?: string;
}

type MenuKind = "none" | "speed" | "subs" | "audio" | "quality" | "source";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

function volumeIcon(volume: number, muted: boolean) {
  if (muted || volume === 0) return VolumeX;
  if (volume < 0.5) return Volume1;
  return Volume2;
}

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(h > 0 ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function VideoPlayer(props: VideoPlayerProps) {
  const {
    mediaId,
    mediaKind,
    season,
    episode,
    title,
    subtitle,
    poster,
    sources,
    initialSourceId,
    resumeSeconds = 0,
    preferences,
    onPreferenceChange,
    onProgress,
    onCompleted,
    onNext,
    onPrev,
    upNext,
    className,
  } = props;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const triedRef = useRef<string[]>([]);
  const resumedRef = useRef(false);

  const initialSource = useMemo(() => {
    return (
      sources.find((s) => s.id === initialSourceId) ??
      sources.find((s) => s.id === preferences.preferredSourceId) ??
      sources[0] ??
      null
    );
  }, [sources, initialSourceId, preferences.preferredSourceId]);

  const [source, setSource] = useState<StreamingSource | null>(initialSource);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [theater, setTheater] = useState(false);
  const [pip, setPip] = useState(false);
  const [menu, setMenu] = useState<MenuKind>("none");
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekBarRef = useRef<HTMLDivElement>(null);

  const [hlsLevels, setHlsLevels] = useState<Level[]>([]);
  const [hlsAudioTracks, setHlsAudioTracks] = useState<MediaPlaylist[]>([]);
  const [hlsSubtitleTracks, setHlsSubtitleTracks] = useState<MediaPlaylist[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number>(-1);
  const [currentAudio, setCurrentAudio] = useState<number>(-1);
  const [currentSubtitle, setCurrentSubtitle] = useState<number>(-1);

  const [upNextVisible, setUpNextVisible] = useState(false);
  const [upNextCountdown, setUpNextCountdown] = useState(10);

  // Sync source when props change (episode navigation)
  useEffect(() => {
    setSource(initialSource);
    triedRef.current = [];
    resumedRef.current = false;
  }, [initialSource]);

  // Load source into <video> — hls.js for .m3u8, native for MP4/native-HLS
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !source) return;

    let cancelled = false;
    setError(null);
    setLoading(true);
    setHlsLevels([]);
    setHlsAudioTracks([]);
    setHlsSubtitleTracks([]);
    setCurrentLevel(-1);
    setCurrentAudio(-1);
    setCurrentSubtitle(-1);

    const cleanup = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
    cleanup();

    const isHls = source.container === "hls" || source.url.endsWith(".m3u8");
    const canNativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";

    trackPlayback({
      name: "playback.source-changed",
      mediaId,
      mediaKind,
      season,
      episode,
      sourceId: source.id,
      provider: source.provider,
    });

    if (isHls && !canNativeHls) {
      void (async () => {
        try {
          const HlsMod = (await import("hls.js")).default;
          if (cancelled) return;
          if (!HlsMod.isSupported()) {
            setError("HLS is not supported in this browser.");
            return;
          }
          const config: Partial<HlsConfig> = { enableWorker: true, lowLatencyMode: false };
          const hls = new HlsMod(config);
          hlsRef.current = hls;
          hls.loadSource(source.url);
          hls.attachMedia(video);
          hls.on(HlsMod.Events.MANIFEST_PARSED, () => {
            if (cancelled) return;
            setHlsLevels(hls.levels ?? []);
            setHlsAudioTracks(hls.audioTracks ?? []);
            setHlsSubtitleTracks(hls.subtitleTracks ?? []);
            setCurrentLevel(hls.currentLevel);
            setCurrentAudio(hls.audioTrack);
            setCurrentSubtitle(preferences.subtitlesEnabled ? hls.subtitleTrack : -1);
            // Apply preferred audio/subtitle by language
            applyLanguagePreferences(hls, preferences);
          });
          hls.on(HlsMod.Events.LEVEL_SWITCHED, (_e, data) => setCurrentLevel(data.level));
          hls.on(HlsMod.Events.AUDIO_TRACK_SWITCHED, (_e, data) => setCurrentAudio(data.id));
          hls.on(HlsMod.Events.SUBTITLE_TRACK_SWITCH, (_e, data) => setCurrentSubtitle(data.id));
          hls.on(HlsMod.Events.ERROR, (_e, data) => {
            if (!data.fatal) return;
            trackPlayback({
              name: "playback.error",
              mediaId,
              mediaKind,
              season,
              episode,
              sourceId: source.id,
              meta: { type: data.type, details: data.details },
            });
            tryFallback("Playback error — trying next source…");
          });
        } catch (err) {
          if (!cancelled) setError((err as Error).message || "Failed to load stream.");
        }
      })();
    } else {
      // Native path (MP4 / Safari HLS)
      video.src = source.url;
      video.load();
    }

    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const applyLanguagePreferences = useCallback((hls: Hls, prefs: PlaybackPreferences) => {
    const audioIdx = hls.audioTracks?.findIndex((t) => t.lang?.startsWith(prefs.audioLanguage));
    if (audioIdx !== undefined && audioIdx >= 0) hls.audioTrack = audioIdx;
    if (prefs.subtitlesEnabled) {
      const subIdx = hls.subtitleTracks?.findIndex((t) => t.lang?.startsWith(prefs.subtitleLanguage));
      hls.subtitleTrack = subIdx !== undefined && subIdx >= 0 ? subIdx : -1;
    } else {
      hls.subtitleTrack = -1;
    }
  }, []);

  // Fallback to next source
  const tryFallback = useCallback(
    (message: string) => {
      if (!source) return;
      triedRef.current.push(source.id);
      const next = pickFallback(sources, triedRef.current);
      if (next) {
        setSource(next);
        onPreferenceChange?.({ preferredSourceId: next.id });
      } else {
        setError(message);
      }
    },
    [source, sources, onPreferenceChange],
  );

  // Wire native video events
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onLoaded = () => {
      setDuration(v.duration || 0);
      setLoading(false);
      if (!resumedRef.current && resumeSeconds > 1 && resumeSeconds < (v.duration || Infinity) - 5) {
        v.currentTime = resumeSeconds;
      }
      resumedRef.current = true;
      v.playbackRate = preferences.playbackSpeed;
    };
    const onTime = () => {
      setCurrentTime(v.currentTime);
      const b = v.buffered;
      if (b.length) setBuffered(b.end(b.length - 1));
      const dur = v.duration || 0;
      if (dur > 0) {
        const pct = v.currentTime / dur;
        onProgress?.({
          positionSeconds: v.currentTime,
          durationSeconds: dur,
          percent: pct,
          sourceId: source?.id ?? "",
        });
        // Up-next window: last 30s and TV episode
        if (upNext && dur - v.currentTime <= 30 && !v.paused) setUpNextVisible(true);
        else if (dur - v.currentTime > 30) setUpNextVisible(false);
      }
    };
    const onPlayEv = () => {
      setPlaying(true);
      trackPlayback({
        name: "playback.started",
        mediaId, mediaKind, season, episode, sourceId: source?.id, provider: source?.provider,
        positionSeconds: v.currentTime, durationSeconds: v.duration,
      });
    };
    const onPauseEv = () => {
      setPlaying(false);
      trackPlayback({
        name: "playback.paused",
        mediaId, mediaKind, season, episode, sourceId: source?.id,
        positionSeconds: v.currentTime, durationSeconds: v.duration,
      });
    };
    const onWaiting = () => setBuffering(true);
    const onPlaying = () => setBuffering(false);
    const onEnded = () => {
      trackPlayback({
        name: "playback.completed",
        mediaId, mediaKind, season, episode, sourceId: source?.id,
        positionSeconds: v.currentTime, durationSeconds: v.duration, percent: 1,
      });
      onCompleted?.();
      if (upNext) upNext.onPlay();
    };
    const onVolumeChange = () => {
      setVolume(v.volume);
      setMuted(v.muted);
    };
    const onError = () => tryFallback("Source unavailable — trying next source…");
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlayEv);
    v.addEventListener("pause", onPauseEv);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("playing", onPlaying);
    v.addEventListener("ended", onEnded);
    v.addEventListener("volumechange", onVolumeChange);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlayEv);
      v.removeEventListener("pause", onPauseEv);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("playing", onPlaying);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("volumechange", onVolumeChange);
      v.removeEventListener("error", onError);
    };
  }, [source, resumeSeconds, preferences.playbackSpeed, mediaId, mediaKind, season, episode, upNext, onProgress, onCompleted, tryFallback]);

  // Auto-hide controls while playing
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (playing && menu === "none") setControlsVisible(false);
    }, 3000);
  }, [playing, menu]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setVolumeSafe(Math.min(1, v.volume + 0.05));
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolumeSafe(Math.max(0, v.volume - 0.05));
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "c":
          e.preventDefault();
          onPreferenceChange?.({ subtitlesEnabled: !preferences.subtitlesEnabled });
          break;
        case "t":
          e.preventDefault();
          setTheater((t) => !t);
          break;
        case "n":
          e.preventDefault();
          onNext?.();
          break;
        case "p":
          e.preventDefault();
          onPrev?.();
          break;
        case "Escape":
          if (fullscreen) {
            e.preventDefault();
            void document.exitFullscreen?.();
          }
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences.subtitlesEnabled, fullscreen]);

  // Fullscreen tracking
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // Up-next countdown
  useEffect(() => {
    if (!upNextVisible || !upNext) return;
    setUpNextCountdown(10);
    const t = setInterval(() => {
      setUpNextCountdown((c) => {
        if (c <= 1) {
          clearInterval(t);
          upNext.onPlay();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [upNextVisible, upNext]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
  }, []);

  const seekBy = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      const next = Math.max(0, Math.min((v.duration || 0) - 0.1, v.currentTime + delta));
      v.currentTime = next;
      trackPlayback({
        name: "playback.seek",
        mediaId, mediaKind, season, episode, sourceId: source?.id,
        positionSeconds: next, meta: { delta },
      });
    },
    [mediaId, mediaKind, season, episode, source],
  );

  const setVolumeSafe = (v: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = v;
    if (v > 0 && video.muted) video.muted = false;
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void el.requestFullscreen?.();
  };

  const togglePip = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPip(false);
      } else if ((v as HTMLVideoElement).requestPictureInPicture) {
        await (v as HTMLVideoElement).requestPictureInPicture();
        setPip(true);
      }
    } catch {
      /* PiP unsupported */
    }
  };

  const onSeekBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = seekBarRef.current;
    const v = videoRef.current;
    if (!el || !v || !v.duration) return;
    const rect = el.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    v.currentTime = pct * v.duration;
  };

  const setSpeed = (s: number) => {
    const v = videoRef.current;
    if (v) v.playbackRate = s;
    onPreferenceChange?.({ playbackSpeed: s });
    setMenu("none");
  };

  const setQuality = (levelIdx: number) => {
    const hls = hlsRef.current;
    if (hls) {
      hls.currentLevel = levelIdx;
      const label = levelIdx === -1 ? "auto" : `${hls.levels[levelIdx]?.height ?? levelIdx}p`;
      onPreferenceChange?.({ quality: label });
      trackPlayback({
        name: "playback.quality-changed",
        mediaId, mediaKind, season, episode, sourceId: source?.id, meta: { level: label },
      });
    }
    setMenu("none");
  };

  const setAudio = (idx: number, lang: string) => {
    const hls = hlsRef.current;
    if (hls) hls.audioTrack = idx;
    onPreferenceChange?.({ audioLanguage: lang });
    trackPlayback({
      name: "playback.audio-changed",
      mediaId, mediaKind, season, episode, sourceId: source?.id, meta: { lang },
    });
    setMenu("none");
  };

  const setSubtitle = (idx: number, lang: string | null) => {
    const hls = hlsRef.current;
    if (hls) hls.subtitleTrack = idx;
    onPreferenceChange?.({
      subtitlesEnabled: idx >= 0,
      subtitleLanguage: lang ?? preferences.subtitleLanguage,
    });
    trackPlayback({
      name: "playback.subtitle-changed",
      mediaId, mediaKind, season, episode, sourceId: source?.id, meta: { lang, enabled: idx >= 0 },
    });
    setMenu("none");
  };

  const switchSource = (s: StreamingSource) => {
    triedRef.current = [];
    setSource(s);
    onPreferenceChange?.({ preferredSourceId: s.id, preferredProvider: s.providerId });
    setMenu("none");
  };

  const VolumeIcon = volumeIcon(volume, muted);
  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;

  // Build unified quality/audio/subtitle lists from hls.js or source metadata
  const qualityOptions: { id: string; label: string; levelIdx: number }[] = useMemo(() => {
    if (hlsLevels.length > 0) {
      return [
        { id: "auto", label: "Auto", levelIdx: -1 },
        ...hlsLevels
          .map((l, i) => ({
            id: `${i}`,
            label: l.height ? `${l.height}p` : `${Math.round((l.bitrate ?? 0) / 1000)}kbps`,
            levelIdx: i,
          }))
          .reverse(),
      ];
    }
    return source?.qualities.map((q: QualityLevel) => ({ id: q.id, label: q.label, levelIdx: -1 })) ?? [];
  }, [hlsLevels, source]);

  const audioOptions: { id: string; label: string; lang: string; idx: number }[] = useMemo(() => {
    if (hlsAudioTracks.length > 0) {
      return hlsAudioTracks.map((t, i) => ({
        id: `${i}`,
        label: t.name || t.lang || `Track ${i + 1}`,
        lang: t.lang || "en",
        idx: i,
      }));
    }
    return source?.audioTracks.map((a: AudioTrack, i) => ({
      id: a.id, label: a.label, lang: a.language, idx: i,
    })) ?? [];
  }, [hlsAudioTracks, source]);

  const subtitleOptions: { id: string; label: string; lang: string | null; idx: number }[] = useMemo(() => {
    const off = { id: "off", label: "Off", lang: null, idx: -1 } as const;
    if (hlsSubtitleTracks.length > 0) {
      return [
        off,
        ...hlsSubtitleTracks.map((t, i) => ({
          id: `${i}`,
          label: t.name || t.lang || `Track ${i + 1}`,
          lang: t.lang || "en",
          idx: i,
        })),
      ];
    }
    return [
      off,
      ...(source?.subtitles.map((s: SubtitleTrack, i) => ({
        id: s.id, label: s.label, lang: s.language, idx: i,
      })) ?? []),
    ];
  }, [hlsSubtitleTracks, source]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[var(--shadow-elevated)]",
        theater ? "aspect-[21/9]" : "aspect-video",
        className,
      )}
      onMouseMove={showControls}
      onMouseLeave={() => playing && menu === "none" && setControlsVisible(false)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-player-control]")) return;
        togglePlay();
      }}
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full bg-black object-contain"
        poster={poster}
        playsInline
        preload="metadata"
        crossOrigin="anonymous"
      >
        {source?.container !== "hls" &&
          source?.subtitles.map((s) => (
            <track
              key={s.id}
              kind="subtitles"
              src={s.url}
              srcLang={s.language}
              label={s.label}
              default={s.default}
            />
          ))}
      </video>

      {/* Center overlay states */}
      {(loading || buffering || error) && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          {error ? (
            <div className="pointer-events-auto max-w-md rounded-2xl border border-white/10 bg-black/80 p-6 text-center backdrop-blur">
              <AlertTriangle className="mx-auto h-8 w-8 text-brand" />
              <p className="mt-3 text-sm font-medium">{error}</p>
              <button
                type="button"
                data-player-control
                onClick={(e) => {
                  e.stopPropagation();
                  triedRef.current = [];
                  setSource(sources[0] ?? null);
                }}
                className="mt-4 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm hover:bg-white/10"
              >
                Retry
              </button>
            </div>
          ) : (
            <Loader2 className="h-10 w-10 animate-spin text-white/80" aria-label="Loading" />
          )}
        </div>
      )}

      {/* Title + Now playing */}
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4 transition-opacity duration-300 sm:p-6",
          controlsVisible ? "opacity-100" : "opacity-0",
        )}
      >
        <p className="text-[10px] uppercase tracking-[0.25em] text-white/60">Now playing</p>
        <p className="mt-1 text-base font-semibold sm:text-lg">{title}</p>
        {subtitle && <p className="text-xs text-white/70 sm:text-sm">{subtitle}</p>}
      </div>

      {/* Up-next overlay */}
      {upNextVisible && upNext && (
        <div
          data-player-control
          className="absolute bottom-24 right-4 z-20 w-72 overflow-hidden rounded-2xl border border-white/10 bg-black/85 backdrop-blur"
          onClick={(e) => e.stopPropagation()}
        >
          {upNext.still && (
            <img src={upNext.still} alt="" className="h-32 w-full object-cover" />
          )}
          <div className="p-4">
            <p className="text-[10px] uppercase tracking-[0.25em] text-brand">
              Up next in {upNextCountdown}s
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium">{upNext.title}</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => upNext.onPlay()}
                className="flex-1 rounded-full bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground hover:bg-brand/90"
              >
                Play now
              </button>
              <button
                type="button"
                onClick={() => setUpNextVisible(false)}
                className="flex-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <div
        data-player-control
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pb-4 pt-16 transition-opacity duration-300 sm:px-6",
          controlsVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {/* Seek bar */}
        <div
          ref={seekBarRef}
          onClick={onSeekBarClick}
          className="group/seek relative mb-3 h-1.5 cursor-pointer rounded-full bg-white/15"
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-white/25" style={{ width: `${bufferedPct}%` }} />
          <div className="absolute inset-y-0 left-0 rounded-full bg-brand" style={{ width: `${progressPct}%` }} />
          <div
            className="absolute -top-1 h-3.5 w-3.5 -translate-x-1/2 rounded-full bg-brand shadow opacity-0 transition-opacity group-hover/seek:opacity-100"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <IconBtn label={playing ? "Pause (k)" : "Play (k)"} onClick={togglePlay}>
            {playing ? <Pause /> : <Play className="fill-current" />}
          </IconBtn>
          {onPrev && (
            <IconBtn label="Previous (p)" onClick={onPrev}>
              <SkipBack />
            </IconBtn>
          )}
          {onNext && (
            <IconBtn label="Next (n)" onClick={onNext}>
              <SkipForward />
            </IconBtn>
          )}
          <div className="group/vol flex items-center gap-1">
            <IconBtn label={muted ? "Unmute (m)" : "Mute (m)"} onClick={toggleMute}>
              <VolumeIcon />
            </IconBtn>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={muted ? 0 : volume}
              onChange={(e) => setVolumeSafe(Number(e.target.value))}
              aria-label="Volume"
              className="hidden w-20 accent-brand sm:block"
            />
          </div>
          <span className="ml-1 tabular-nums text-white/80">
            {fmt(currentTime)} <span className="text-white/40">/ {fmt(duration)}</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            <MenuBtn label="Speed" icon={<Gauge />} value={`${preferences.playbackSpeed}x`} open={menu === "speed"} onOpen={() => setMenu((m) => (m === "speed" ? "none" : "speed"))}>
              {SPEEDS.map((s) => (
                <MenuItem key={s} active={preferences.playbackSpeed === s} onClick={() => setSpeed(s)}>
                  {s}x
                </MenuItem>
              ))}
            </MenuBtn>
            {subtitleOptions.length > 1 && (
              <MenuBtn
                label="Subtitles (c)"
                icon={<Subtitles />}
                value={
                  currentSubtitle >= 0
                    ? subtitleOptions.find((o) => o.idx === currentSubtitle)?.label ?? "On"
                    : "Off"
                }
                open={menu === "subs"}
                onOpen={() => setMenu((m) => (m === "subs" ? "none" : "subs"))}
              >
                {subtitleOptions.map((o) => (
                  <MenuItem
                    key={o.id}
                    active={currentSubtitle === o.idx || (o.idx === -1 && currentSubtitle < 0)}
                    onClick={() => setSubtitle(o.idx, o.lang)}
                  >
                    {o.label}
                  </MenuItem>
                ))}
              </MenuBtn>
            )}
            {audioOptions.length > 1 && (
              <MenuBtn
                label="Audio"
                icon={<AudioLines />}
                value={audioOptions.find((o) => o.idx === currentAudio)?.label ?? audioOptions[0]?.label ?? "—"}
                open={menu === "audio"}
                onOpen={() => setMenu((m) => (m === "audio" ? "none" : "audio"))}
              >
                {audioOptions.map((o) => (
                  <MenuItem key={o.id} active={currentAudio === o.idx} onClick={() => setAudio(o.idx, o.lang)}>
                    {o.label}
                  </MenuItem>
                ))}
              </MenuBtn>
            )}
            {qualityOptions.length > 0 && (
              <MenuBtn
                label="Quality"
                icon={<Settings2 />}
                value={
                  currentLevel === -1
                    ? "Auto"
                    : qualityOptions.find((o) => o.levelIdx === currentLevel)?.label ?? "Auto"
                }
                open={menu === "quality"}
                onOpen={() => setMenu((m) => (m === "quality" ? "none" : "quality"))}
              >
                {qualityOptions.map((o) => (
                  <MenuItem
                    key={o.id}
                    active={currentLevel === o.levelIdx}
                    onClick={() => setQuality(o.levelIdx)}
                  >
                    {o.label}
                  </MenuItem>
                ))}
              </MenuBtn>
            )}
            {sources.length > 1 && (
              <MenuBtn
                label="Source"
                icon={<Layers />}
                value={source?.provider ?? "—"}
                open={menu === "source"}
                onOpen={() => setMenu((m) => (m === "source" ? "none" : "source"))}
              >
                {sources.map((s) => (
                  <MenuItem key={s.id} active={source?.id === s.id} onClick={() => switchSource(s)}>
                    <span className="flex items-center gap-2">
                      <Wifi
                        className={cn(
                          "h-3 w-3",
                          s.health === "healthy" && "text-emerald-400",
                          s.health === "degraded" && "text-amber-400",
                          s.health === "offline" && "text-red-400",
                        )}
                      />
                      <span>{s.label}</span>
                    </span>
                  </MenuItem>
                ))}
              </MenuBtn>
            )}
            <IconBtn label={theater ? "Exit theater (t)" : "Theater mode (t)"} onClick={() => setTheater((t) => !t)} active={theater}>
              <RectangleHorizontal />
            </IconBtn>
            <IconBtn label={pip ? "Exit picture-in-picture" : "Picture-in-picture"} onClick={togglePip}>
              <PictureInPicture2 />
            </IconBtn>
            <IconBtn label={fullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"} onClick={toggleFullscreen}>
              {fullscreen ? <Minimize /> : <Maximize />}
            </IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({
  onClick,
  label,
  children,
  active,
}: {
  onClick?: () => void;
  label: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      data-player-control
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      aria-label={label}
      title={label}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full text-white/90 transition hover:bg-white/10 [&>svg]:h-4 [&>svg]:w-4",
        active && "bg-white/15 text-white",
      )}
    >
      {children}
    </button>
  );
}

function MenuBtn({
  label,
  icon,
  value,
  open,
  onOpen,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  open: boolean;
  onOpen: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative" data-player-control>
      <button
        type="button"
        data-player-control
        onClick={(e) => {
          e.stopPropagation();
          onOpen();
        }}
        aria-label={label}
        title={label}
        className={cn(
          "hidden items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] text-white/90 transition hover:bg-white/10 sm:flex [&>svg]:h-3.5 [&>svg]:w-3.5",
          open && "bg-white/15",
        )}
      >
        {icon}
        <span className="max-w-[80px] truncate">{value}</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 max-h-64 min-w-[180px] overflow-y-auto rounded-2xl border border-white/10 bg-black/95 p-1 shadow-[var(--shadow-elevated)] backdrop-blur">
          {children}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        "flex w-full items-center rounded-xl px-3 py-2 text-left text-xs text-white/85 hover:bg-white/5",
        active && "bg-white/10 text-white",
      )}
    >
      {children}
    </button>
  );
}
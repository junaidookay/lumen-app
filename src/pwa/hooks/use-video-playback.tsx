import { useState, useEffect } from "react";
import { setPlaybackState } from "@/pwa/services/sw-register";

let globalPlaying = false;
const listeners: Array<(playing: boolean) => void> = [];

export function setGlobalPlaybackState(playing: boolean) {
  globalPlaying = playing;
  setPlaybackState(playing);
  listeners.forEach((cb) => cb(playing));
}

export function useVideoPlayback(): boolean {
  const [playing, setPlaying] = useState(globalPlaying);

  useEffect(() => {
    listeners.push(setPlaying);
    return () => {
      const idx = listeners.indexOf(setPlaying);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return playing;
}

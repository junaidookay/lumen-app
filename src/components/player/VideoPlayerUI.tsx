import { useState } from "react";
import { motion } from "motion/react";
import {
  Play, Pause, Maximize, Volume2, VolumeX, SkipBack, SkipForward, Subtitles, AudioLines, Gauge, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  poster: string;
  title: string;
  subtitle?: string;
  progress?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SUBTITLES = ["Off", "English", "Japanese", "Spanish", "French"];
const AUDIO = ["English 5.1", "English Stereo", "Japanese", "Spanish"];

export function VideoPlayerUI({ poster, title, subtitle, progress = 0.32, onPrev, onNext }: Props) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [subs, setSubs] = useState("English");
  const [audio, setAudio] = useState("English 5.1");
  const [menu, setMenu] = useState<"none" | "speed" | "subs" | "audio">("none");

  return (
    <div className="group relative aspect-video w-full overflow-hidden rounded-3xl border border-white/10 bg-black shadow-[var(--shadow-elevated)]">
      <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/60" />

      <button
        type="button" aria-label={playing ? "Pause" : "Play"}
        onClick={() => setPlaying((p) => !p)}
        className="absolute inset-0 grid place-items-center"
      >
        <motion.span
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          className="grid h-20 w-20 place-items-center rounded-full bg-brand text-brand-foreground shadow-[var(--shadow-glow)]"
        >
          {playing ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8 fill-current" />}
        </motion.span>
      </button>

      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/60">Now playing</p>
          <p className="mt-1 text-lg font-semibold">{title}</p>
          {subtitle && <p className="text-sm text-white/70">{subtitle}</p>}
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="mb-3 h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-brand" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex items-center gap-2">
          <IconBtn onClick={onPrev} label="Previous episode"><SkipBack /></IconBtn>
          <IconBtn onClick={() => setPlaying((p) => !p)} label={playing ? "Pause" : "Play"}>
            {playing ? <Pause /> : <Play className="fill-current" />}
          </IconBtn>
          <IconBtn onClick={onNext} label="Next episode"><SkipForward /></IconBtn>
          <IconBtn onClick={() => setMuted((m) => !m)} label={muted ? "Unmute" : "Mute"}>{muted ? <VolumeX /> : <Volume2 />}</IconBtn>
          <div className="ml-auto flex items-center gap-2">
            <Menu label="Speed" icon={<Gauge />} open={menu === "speed"} onOpen={() => setMenu((m) => m === "speed" ? "none" : "speed")} value={`${speed}x`}>
              {SPEEDS.map((s) => (
                <MenuItem key={s} active={s === speed} onClick={() => { setSpeed(s); setMenu("none"); }}>{s}x</MenuItem>
              ))}
            </Menu>
            <Menu label="Subtitles" icon={<Subtitles />} open={menu === "subs"} onOpen={() => setMenu((m) => m === "subs" ? "none" : "subs")} value={subs}>
              {SUBTITLES.map((s) => (
                <MenuItem key={s} active={s === subs} onClick={() => { setSubs(s); setMenu("none"); }}>{s}</MenuItem>
              ))}
            </Menu>
            <Menu label="Audio" icon={<AudioLines />} open={menu === "audio"} onOpen={() => setMenu((m) => m === "audio" ? "none" : "audio")} value={audio}>
              {AUDIO.map((a) => (
                <MenuItem key={a} active={a === audio} onClick={() => { setAudio(a); setMenu("none"); }}>{a}</MenuItem>
              ))}
            </Menu>
            <IconBtn label="Settings"><Settings /></IconBtn>
            <IconBtn label="Fullscreen"><Maximize /></IconBtn>
          </div>
        </div>
      </div>
    </div>
  );
}

function IconBtn({ onClick, label, children }: { onClick?: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-full glass border border-white/10 hover:bg-white/10 [&>svg]:h-4 [&>svg]:w-4"
    >
      {children}
    </button>
  );
}
function Menu({ label, icon, value, open, onOpen, children }: { label: string; icon: React.ReactNode; value: string; open: boolean; onOpen: () => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <button
        type="button" onClick={onOpen} aria-label={label}
        className={cn("flex items-center gap-2 rounded-full glass border border-white/10 px-3 py-2 text-xs hover:bg-white/10 [&>svg]:h-4 [&>svg]:w-4", open && "bg-white/10")}
      >
        {icon}
        <span>{value}</span>
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-2 min-w-[160px] overflow-hidden rounded-2xl border border-white/10 bg-surface p-1 shadow-[var(--shadow-elevated)]">
          {children}
        </div>
      )}
    </div>
  );
}
function MenuItem({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn("flex w-full items-center rounded-xl px-3 py-2 text-left text-sm hover:bg-white/5", active && "bg-white/10")}
    >
      {children}
    </button>
  );
}
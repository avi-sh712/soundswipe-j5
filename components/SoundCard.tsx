"use client";

import { useState } from "react";
import { Heart, Download, Share2, Play, Pause, Check } from "lucide-react";
import type { SoundAsset } from "../lib/api";
import Waveform from "./Waveform";

interface SoundCardProps {
  asset: SoundAsset;
  active: boolean;
  liked: boolean;
  onTogglePlay: () => void;
  playing: boolean;
  onLike: () => void;
  onExport: () => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  const m = Math.floor(seconds / 60);
  return `${m}:${s}`;
}

export default function SoundCard({
  asset,
  active,
  liked,
  onTogglePlay,
  playing,
  onLike,
  onExport,
}: SoundCardProps) {
  const [duration, setDuration] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(asset.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const initials = asset.name?.slice(0, 1)?.toUpperCase() ?? "S";

  return (
    <section className="relative flex h-[100dvh] w-full snap-start items-center justify-center px-4">
      <div className="relative flex w-full max-w-md flex-col items-center">
        {/* Cover / play surface */}
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? "Pause" : "Play"}
          className="group relative mb-8 flex aspect-square w-56 items-center justify-center rounded-3xl bg-surface-2 shadow-2xl ring-1 ring-border transition-transform active:scale-[0.98]"
        >
          <span className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-accent/15 to-transparent" />
          <span className="pointer-events-none select-none text-7xl font-black text-foreground/10">
            {initials}
          </span>
          <span
            className={`absolute flex h-16 w-16 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-all ${
              playing ? "scale-90 opacity-0 group-hover:opacity-100" : "scale-100 opacity-100"
            }`}
          >
            {playing ? <Pause size={26} /> : <Play size={26} className="ml-1" />}
          </span>
          {playing && (
            <span className="absolute bottom-5 flex items-end gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <span
                  key={i}
                  className="eq-bar h-6 w-1 rounded-full bg-accent"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </span>
          )}
        </button>

        {/* Title + meta */}
        <span className="mb-2 rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted">
          {asset.category}
        </span>
        <h2 className="mb-1 text-balance text-center text-2xl font-bold tracking-tight">
          {asset.name}
        </h2>
        <p className="mb-6 font-mono text-xs text-muted">
          {formatTime(elapsed)} / {formatTime(duration)}
        </p>

        {/* Waveform */}
        <div className="w-full rounded-2xl bg-surface px-4 py-5 ring-1 ring-border">
          <Waveform
            url={asset.url}
            active={active}
            playing={playing}
            onReady={setDuration}
            onProgress={setElapsed}
            onPlayStateChange={(p) => {
              if (!p) setElapsed((e) => e);
            }}
          />
        </div>
      </div>

      {/* Action rail */}
      <div className="absolute bottom-28 right-5 flex flex-col items-center gap-5 md:right-8">
        <RailButton
          label={liked ? "Saved" : "Save"}
          onClick={onLike}
          active={liked}
          activeClass="bg-like/20 text-like"
        >
          <Heart size={26} fill={liked ? "currentColor" : "none"} />
        </RailButton>

        <RailButton label="Export" onClick={onExport}>
          <Download size={26} />
        </RailButton>

        <RailButton label={copied ? "Copied" : "Share"} onClick={handleShare} active={copied}>
          {copied ? <Check size={26} /> : <Share2 size={26} />}
        </RailButton>
      </div>
    </section>
  );
}

function RailButton({
  children,
  label,
  onClick,
  active = false,
  activeClass = "bg-accent/20 text-accent",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  activeClass?: string;
}) {
  return (
    <button onClick={onClick} className="group flex flex-col items-center gap-1.5">
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full backdrop-blur transition ${
          active
            ? activeClass
            : "bg-surface-2/80 text-foreground group-hover:bg-surface-2"
        }`}
      >
        {children}
      </span>
      <span className="text-[11px] font-semibold text-foreground/90 drop-shadow">
        {label}
      </span>
    </button>
  );
}

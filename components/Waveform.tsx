"use client";

import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformProps {
  url: string;
  /** Whether this card is the active/visible one. */
  active: boolean;
  /** Desired play state, controlled by the parent. */
  playing: boolean;
  onReady?: (durationSeconds: number) => void;
  onProgress?: (seconds: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
}

/**
 * Renders a real audio waveform with wavesurfer.js. The instance is only
 * created while the card is active to keep memory + CPU low across a long feed.
 */
export default function Waveform({
  url,
  active,
  playing,
  onReady,
  onProgress,
  onPlayStateChange,
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WaveSurfer | null>(null);
  const playingRef = useRef(playing);
  const [ready, setReady] = useState(false);

  playingRef.current = playing;

  // Create / destroy the wavesurfer instance based on `active`.
  useEffect(() => {
    if (!active || !containerRef.current) return;

    let cancelled = false;
    const ws = WaveSurfer.create({
      container: containerRef.current,
      url,
      height: 88,
      waveColor: "rgba(250, 250, 250, 0.22)",
      progressColor: "#f97316",
      cursorColor: "transparent",
      barWidth: 3,
      barGap: 2,
      barRadius: 4,
      normalize: true,
      interact: true,
    });
    wsRef.current = ws;

    ws.on("ready", () => {
      if (cancelled) return;
      setReady(true);
      onReady?.(ws.getDuration());
      if (playingRef.current) {
        ws.play().catch(() => onPlayStateChange?.(false));
      }
    });
    ws.on("audioprocess", (t: number) => onProgress?.(t));
    ws.on("play", () => onPlayStateChange?.(true));
    ws.on("pause", () => onPlayStateChange?.(false));
    // Loop the clip while it stays active.
    ws.on("finish", () => {
      if (playingRef.current) {
        ws.seekTo(0);
        ws.play().catch(() => onPlayStateChange?.(false));
      }
    });

    return () => {
      cancelled = true;
      setReady(false);
      try {
        ws.destroy();
      } catch {
        /* no-op */
      }
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, url]);

  // React to play/pause requests from the parent.
  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !ready) return;
    if (playing && !ws.isPlaying()) {
      ws.play().catch(() => onPlayStateChange?.(false));
    } else if (!playing && ws.isPlaying()) {
      ws.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, ready]);

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="w-full" aria-hidden="true" />
      {active && !ready && (
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="eq-bar h-8 w-1 rounded-full bg-accent/70"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

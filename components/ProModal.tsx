import { X, Check, Sparkles } from "lucide-react";

interface ProModalProps {
  onClose: () => void;
}

const PERKS = [
  "Upload clips longer than 30 seconds",
  "Uncompressed WAV exports",
  "Commercial use license",
  "Unlimited saved collections",
];

export default function ProModal({ onClose }: ProModalProps) {
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl bg-surface p-6 shadow-2xl ring-1 ring-border"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 text-muted transition hover:text-foreground"
        >
          <X size={22} />
        </button>

        <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
          <Sparkles size={14} />
          Pro
        </span>

        <h3 className="mb-1 text-2xl font-bold">Unlock longer uploads</h3>
        <p className="mb-6 text-sm text-muted">
          Free clips are capped at 30 seconds. Go Pro for full-length,
          studio-quality audio.
        </p>

        <div className="mb-6 rounded-2xl bg-surface-2 p-5 ring-1 ring-border">
          <div className="mb-4 flex items-baseline gap-1">
            <span className="text-4xl font-bold">$15</span>
            <span className="text-muted">/month</span>
          </div>
          <ul className="space-y-3">
            {PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 text-sm">
                <Check size={16} className="shrink-0 text-accent" />
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <button className="w-full rounded-xl bg-accent py-3 font-bold text-accent-foreground transition hover:opacity-90">
          Subscribe now
        </button>
      </div>
    </div>
  );
}

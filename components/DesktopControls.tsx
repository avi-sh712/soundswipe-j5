import { ChevronUp, ChevronDown } from "lucide-react";

interface DesktopControlsProps {
  onNext: () => void;
  onPrev: () => void;
}

export default function DesktopControls({ onNext, onPrev }: DesktopControlsProps) {
  return (
    <div className="hidden md:flex absolute right-[-80px] top-1/2 -translate-y-1/2 flex-col gap-4">
      <button 
        onClick={onPrev}
        className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white transition shadow-lg"
      >
        <ChevronUp size={32} />
      </button>
      <button 
        onClick={onNext}
        className="p-4 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white transition shadow-lg"
      >
        <ChevronDown size={32} />
      </button>
    </div>
  );
}
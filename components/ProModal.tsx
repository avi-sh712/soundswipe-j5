import { X, Check } from "lucide-react";

interface ProModalProps {
  onClose: () => void;
}

export default function ProModal({ onClose }: ProModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-2xl p-6 relative shadow-2xl">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <h3 className="text-2xl font-bold text-white mb-2">Upgrade to Pro</h3>
        <p className="text-zinc-400 text-sm mb-6">Get commercial licensing and uncompressed WAV downloads.</p>
        
        <div className="bg-zinc-950 rounded-xl p-4 mb-6 border border-zinc-800">
          <div className="flex items-baseline gap-1 mb-4">
            <span className="text-4xl font-bold text-white">$15</span>
            <span className="text-zinc-500">/month</span>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm text-zinc-300">
              <Check size={16} className="text-green-500" /> Uncompressed WAV exports
            </li>
            <li className="flex items-center gap-3 text-sm text-zinc-300">
              <Check size={16} className="text-green-500" /> Commercial use license
            </li>
            <li className="flex items-center gap-3 text-sm text-zinc-300">
              <Check size={16} className="text-green-500" /> Unlimited Asset Bins
            </li>
          </ul>
        </div>

        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition">
          Subscribe Now
        </button>
      </div>
    </div>
  );
}
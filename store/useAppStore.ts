import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedAsset {
  id: string;
  name: string;
  category: string;
  url: string;
}

interface AppState {
  /** Map of saved/liked assets keyed by id, so we can render a Saved view. */
  savedAssets: Record<string, SavedAsset>;
  toggleSave: (asset: SavedAsset) => void;
  currentCategory: string;
  setCategory: (category: string) => void;
}

const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      savedAssets: {},
      toggleSave: (asset) =>
        set((state) => {
          const next = { ...state.savedAssets };
          if (next[asset.id]) {
            delete next[asset.id];
          } else {
            next[asset.id] = asset;
          }
          return { savedAssets: next };
        }),
      currentCategory: "All",
      setCategory: (category) => set({ currentCategory: category }),
    }),
    {
      name: "soundswipe-store",
      // Only persist the saved library (a client cache; likes are also stored
      // server-side in DynamoDB). The active category resets on reload.
      partialize: (state) => ({ savedAssets: state.savedAssets }),
    },
  ),
);

export default useAppStore;

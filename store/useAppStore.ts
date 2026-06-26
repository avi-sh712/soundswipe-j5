import { create } from 'zustand';

interface AppState {
  likedAssets: Set<string>;
  toggleLike: (id: string) => void;
  currentCategory: string;
  setCategory: (category: string) => void;
}

const useAppStore = create<AppState>((set) => ({
  likedAssets: new Set(),
  toggleLike: (id) => set((state) => {
    const newLiked = new Set(state.likedAssets);
    if (newLiked.has(id)) {
      newLiked.delete(id);
    } else {
      newLiked.add(id);
    }
    return { likedAssets: newLiked };
  }),
  currentCategory: 'All',
  setCategory: (category) => set({ currentCategory: category }),
}));

export default useAppStore;
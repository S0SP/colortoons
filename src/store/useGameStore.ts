import { create } from 'zustand';

interface GameState {
    selectedColor: number;
    filledRegions: Record<number, boolean>;
    scale: number;
    translateX: number;
    translateY: number;
    score: number;
    coins: number;
    setSelectedColor: (color: number) => void;
    fillRegion: (id: number) => void;
    resetFilledRegions: () => void;
    setTransform: (scale: number, translateX: number, translateY: number) => void;
    setScore: (score: number) => void;
    addCoins: (c: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
    selectedColor: 0,
    filledRegions: {},
    scale: 1,
    translateX: 0,
    translateY: 0,
    score: 0,
    coins: 0,
    setSelectedColor: (color: number) => set({ selectedColor: color }),
    fillRegion: (id: number) =>
        set((state) => ({
            filledRegions: { ...state.filledRegions, [id]: true },
        })),
    resetFilledRegions: () => set({ filledRegions: {} }),
    setTransform: (scale: number, translateX: number, translateY: number) =>
        set({ scale, translateX, translateY }),
    setScore: (score: number) => set({ score }),
    addCoins: (c: number) => set((state) => ({ coins: state.coins + c })),
}));

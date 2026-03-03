import { create } from 'zustand';
import { mmkvStorage } from './mmkvStorage'; // We need to create this wrapper
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserState {
    coins: number;
    energy: number;
    streak: number;
    hasSeenOnboarding: boolean;
    unlockedPaintings: string[]; // IDs of unlocked paintings
    completedPaintings: string[]; // IDs

    // Actions
    addCoins: (amount: number) => void;
    spendCoins: (amount: number) => boolean;
    useEnergy: () => boolean;
    refillEnergy: () => void;
    incrementStreak: () => void;
}

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            coins: 100, // Starting bonus
            energy: 5,   // Max 5
            streak: 0,
            hasSeenOnboarding: false,
            unlockedPaintings: [],
            completedPaintings: [],

            addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),

            spendCoins: (amount) => {
                const current = get().coins;
                if (current >= amount) {
                    set({ coins: current - amount });
                    return true;
                }
                return false;
            },

            useEnergy: () => {
                const current = get().energy;
                if (current > 0) {
                    set({ energy: current - 1 });
                    return true;
                }
                return false;
            },

            refillEnergy: () => set({ energy: 5 }),

            incrementStreak: () => set((state) => ({ streak: state.streak + 1 })),
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
);

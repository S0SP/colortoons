/**
 * Game Store - In-Game State Management
 * =====================================
 * Manages current game session state
 * NOT persisted - resets each game
 */

import { create } from 'zustand';
import { useUserStore } from './useUserStore';

interface GameState {
    // Current game state
    selectedColor: number;
    filledRegions: Record<number, boolean>;

    // Transform state (for pan/zoom)
    scale: number;
    translateX: number;
    translateY: number;

    // Session stats
    sessionScore: number;
    sessionCoins: number;
    sessionStartTime: number;
    regionsFilledThisSession: number;

    // Game flags
    isGameActive: boolean;
    isPaused: boolean;

    // Actions
    setSelectedColor: (color: number) => void;
    fillRegion: (id: number) => void;
    resetFilledRegions: () => void;
    setTransform: (scale: number, translateX: number, translateY: number) => void;

    // Session management
    startGame: () => void;
    endGame: (completed: boolean) => void;
    pauseGame: () => void;
    resumeGame: () => void;

    // Scoring
    addSessionScore: (points: number) => void;
    addSessionCoins: (coins: number) => void;

    // Final sync to user store
    syncToUserStore: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
    // Initial state
    selectedColor: 0,
    filledRegions: {},
    scale: 1,
    translateX: 0,
    translateY: 0,
    sessionScore: 0,
    sessionCoins: 0,
    sessionStartTime: 0,
    regionsFilledThisSession: 0,
    isGameActive: false,
    isPaused: false,

    // Color selection
    setSelectedColor: (color) => set({ selectedColor: color }),

    // Fill a region
    fillRegion: (id) => {
        set((state) => ({
            filledRegions: { ...state.filledRegions, [id]: true },
            regionsFilledThisSession: state.regionsFilledThisSession + 1,
        }));
    },

    // Reset for new game
    resetFilledRegions: () => set({
        filledRegions: {},
        selectedColor: 0,
        regionsFilledThisSession: 0,
    }),

    // Transform (pan/zoom)
    setTransform: (scale, translateX, translateY) =>
        set({ scale, translateX, translateY }),

    // Start a new game session
    startGame: () => {
        console.log('[Game] Session started');
        set({
            isGameActive: true,
            isPaused: false,
            sessionStartTime: Date.now(),
            sessionScore: 0,
            sessionCoins: 0,
            regionsFilledThisSession: 0,
            filledRegions: {},
            selectedColor: 0,
            scale: 1,
            translateX: 0,
            translateY: 0,
        });

        // Increment games played in user store
        useUserStore.getState().incrementGamesPlayed();
        // Update streak
        useUserStore.getState().checkAndUpdateStreak();
    },

    // End game session
    endGame: (completed) => {
        const state = get();
        const playTimeSeconds = Math.floor((Date.now() - state.sessionStartTime) / 1000);

        console.log(`[Game] Session ended - Completed: ${completed}, Score: ${state.sessionScore}, Coins: ${state.sessionCoins}`);

        // Sync all stats to user store
        const userStore = useUserStore.getState();
        userStore.addCoins(state.sessionCoins, 'Game completion');
        userStore.addScore(state.sessionScore);
        userStore.addRegionsFilled(state.regionsFilledThisSession);
        userStore.addPlayTime(playTimeSeconds);

        if (completed) {
            userStore.incrementGamesCompleted();
        }

        set({ isGameActive: false, isPaused: false });
    },

    pauseGame: () => set({ isPaused: true }),
    resumeGame: () => set({ isPaused: false }),

    // Add score during game
    addSessionScore: (points) => {
        set((state) => ({ sessionScore: state.sessionScore + points }));
    },

    // Add coins during game
    addSessionCoins: (coins) => {
        set((state) => ({ sessionCoins: state.sessionCoins + coins }));
    },

    // Manual sync (for auto-save)
    syncToUserStore: () => {
        const state = get();
        const playTimeSeconds = Math.floor((Date.now() - state.sessionStartTime) / 1000);

        const userStore = useUserStore.getState();
        userStore.addRegionsFilled(state.regionsFilledThisSession);
        userStore.addPlayTime(playTimeSeconds);

        // Reset session counters after sync
        set({
            regionsFilledThisSession: 0,
            sessionStartTime: Date.now(),
        });
    },
}));
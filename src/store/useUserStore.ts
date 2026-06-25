/**
 * User Store - Universal Currency & Progress System
 * =================================================
 * Manages coins, energy, streaks, and user progress
 * Persisted across app sessions
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './mmkvStorage';
import { supabase } from '../services/supabase';

interface Achievement {
    id: string;
    title: string;
    description: string;
    emoji: string;
    unlockedAt: number | null;
}

interface DailyReward {
    day: number;
    coins: number;
    claimed: boolean;
}

interface UserState {
    // Currency
    coins: number;
    totalCoinsEarned: number;

    // Energy System
    energy: number;
    maxEnergy: number;
    lastEnergyRefill: number;

    // Streaks & Progress
    streak: number;
    longestStreak: number;
    lastPlayedDate: string | null;

    // Stats
    totalScore: number;
    gamesPlayed: number;
    gamesCompleted: number;
    totalRegionsFilled: number;
    totalPlayTimeSeconds: number;

    // Unlocks
    unlockedPaintings: string[];
    completedPaintings: string[];
    achievements: Achievement[];

    // Daily Rewards
    dailyRewards: DailyReward[];
    lastDailyClaimDate: string | null;
    currentDailyDay: number;

    // Settings
    hasSeenOnboarding: boolean;
    soundEnabled: boolean;
    musicEnabled: boolean;
    hapticsEnabled: boolean;

    // ═══════════════════════════════════════════════════════════
    // ACTIONS
    // ═══════════════════════════════════════════════════════════

    // Currency Actions
    addCoins: (amount: number, reason?: string) => void;
    spendCoins: (amount: number) => boolean;

    // Energy Actions
    useEnergy: () => boolean;
    refillEnergy: () => void;
    checkEnergyRefill: () => void;

    // Progress Actions
    incrementStreak: () => void;
    checkAndUpdateStreak: () => void;
    addScore: (score: number) => void;
    incrementGamesPlayed: () => void;
    incrementGamesCompleted: () => void;
    addRegionsFilled: (count: number) => void;
    addPlayTime: (seconds: number) => void;

    // Painting Actions
    unlockPainting: (paintingId: string) => void;
    completePainting: (paintingId: string) => void;
    isPaintingUnlocked: (paintingId: string) => boolean;
    isPaintingCompleted: (paintingId: string) => boolean;

    // Achievement Actions
    unlockAchievement: (achievementId: string) => void;
    checkAchievements: () => string[]; // Returns newly unlocked achievement IDs

    // Daily Rewards
    claimDailyReward: () => number; // Returns coins earned, 0 if already claimed
    canClaimDailyReward: () => boolean;

    // Settings
    setOnboardingSeen: () => void;
    toggleSound: () => void;
    toggleMusic: () => void;
    toggleHaptics: () => void;

    // Cloud Sync
    syncToCloud: () => Promise<void>;
    loadFromCloud: () => Promise<void>;

    // Reset
    resetProgress: () => void;
}

// Achievement definitions
const ACHIEVEMENTS: Achievement[] = [
    { id: 'first_painting', title: 'First Masterpiece', description: 'Complete your first painting', emoji: '🎨', unlockedAt: null },
    { id: 'streak_3', title: 'On a Roll', description: 'Maintain a 3-day streak', emoji: '🔥', unlockedAt: null },
    { id: 'streak_7', title: 'Week Warrior', description: 'Maintain a 7-day streak', emoji: '⚡', unlockedAt: null },
    { id: 'streak_30', title: 'Monthly Master', description: 'Maintain a 30-day streak', emoji: '👑', unlockedAt: null },
    { id: 'coins_1000', title: 'Coin Collector', description: 'Earn 1,000 total coins', emoji: '💰', unlockedAt: null },
    { id: 'coins_10000', title: 'Rich Artist', description: 'Earn 10,000 total coins', emoji: '💎', unlockedAt: null },
    { id: 'paintings_5', title: 'Art Enthusiast', description: 'Complete 5 paintings', emoji: '🖼️', unlockedAt: null },
    { id: 'paintings_25', title: 'Gallery Owner', description: 'Complete 25 paintings', emoji: '🏛️', unlockedAt: null },
    { id: 'paintings_100', title: 'Master Artist', description: 'Complete 100 paintings', emoji: '🏆', unlockedAt: null },
    { id: 'regions_1000', title: 'Detail Oriented', description: 'Fill 1,000 regions', emoji: '🔍', unlockedAt: null },
    { id: 'regions_10000', title: 'Precision Master', description: 'Fill 10,000 regions', emoji: '🎯', unlockedAt: null },
    { id: 'playtime_1h', title: 'Dedicated Artist', description: 'Play for 1 hour total', emoji: '⏰', unlockedAt: null },
    { id: 'playtime_10h', title: 'Art Addict', description: 'Play for 10 hours total', emoji: '🎮', unlockedAt: null },
];

// Daily rewards structure (7-day cycle)
const DAILY_REWARDS_TEMPLATE: DailyReward[] = [
    { day: 1, coins: 50, claimed: false },
    { day: 2, coins: 75, claimed: false },
    { day: 3, coins: 100, claimed: false },
    { day: 4, coins: 150, claimed: false },
    { day: 5, coins: 200, claimed: false },
    { day: 6, coins: 300, claimed: false },
    { day: 7, coins: 500, claimed: false }, // Big reward on day 7!
];

const ENERGY_REFILL_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes per energy

export const useUserStore = create<UserState>()(
    persist(
        (set, get) => ({
            // Initial State
            coins: 100,
            totalCoinsEarned: 100,
            energy: 5,
            maxEnergy: 5,
            lastEnergyRefill: Date.now(),
            streak: 0,
            longestStreak: 0,
            lastPlayedDate: null,
            totalScore: 0,
            gamesPlayed: 0,
            gamesCompleted: 0,
            totalRegionsFilled: 0,
            totalPlayTimeSeconds: 0,
            unlockedPaintings: [],
            completedPaintings: [],
            achievements: ACHIEVEMENTS.map(a => ({ ...a })),
            dailyRewards: DAILY_REWARDS_TEMPLATE.map(r => ({ ...r })),
            lastDailyClaimDate: null,
            currentDailyDay: 1,
            hasSeenOnboarding: false,
            soundEnabled: true,
            musicEnabled: true,
            hapticsEnabled: true,

            // ═══════════════════════════════════════════════════════════
            // CURRENCY ACTIONS
            // ═══════════════════════════════════════════════════════════

            addCoins: (amount, reason) => {
                console.log(`[Coins] +${amount} ${reason ? `(${reason})` : ''}`);
                set((state) => ({
                    coins: state.coins + amount,
                    totalCoinsEarned: state.totalCoinsEarned + amount,
                }));
                // Check coin achievements
                get().checkAchievements();
            },

            spendCoins: (amount) => {
                const { coins } = get();
                if (coins >= amount) {
                    console.log(`[Coins] -${amount} spent`);
                    set({ coins: coins - amount });
                    return true;
                }
                console.log(`[Coins] Not enough! Have ${coins}, need ${amount}`);
                return false;
            },

            // ═══════════════════════════════════════════════════════════
            // ENERGY ACTIONS
            // ═══════════════════════════════════════════════════════════

            useEnergy: () => {
                const { energy } = get();
                if (energy > 0) {
                    set({ energy: energy - 1 });
                    console.log(`[Energy] Used 1, remaining: ${energy - 1}`);
                    return true;
                }
                console.log('[Energy] No energy left!');
                return false;
            },

            refillEnergy: () => {
                const { maxEnergy } = get();
                set({ energy: maxEnergy, lastEnergyRefill: Date.now() });
                console.log('[Energy] Fully refilled');
            },

            checkEnergyRefill: () => {
                const { energy, maxEnergy, lastEnergyRefill } = get();
                if (energy >= maxEnergy) return;

                const now = Date.now();
                const elapsed = now - lastEnergyRefill;
                const energyToAdd = Math.floor(elapsed / ENERGY_REFILL_INTERVAL_MS);

                if (energyToAdd > 0) {
                    const newEnergy = Math.min(energy + energyToAdd, maxEnergy);
                    set({
                        energy: newEnergy,
                        lastEnergyRefill: now - (elapsed % ENERGY_REFILL_INTERVAL_MS),
                    });
                    console.log(`[Energy] Auto-refilled ${energyToAdd}, now: ${newEnergy}`);
                }
            },

            // ═══════════════════════════════════════════════════════════
            // PROGRESS ACTIONS
            // ═══════════════════════════════════════════════════════════

            incrementStreak: () => {
                const { streak, longestStreak } = get();
                const newStreak = streak + 1;
                set({
                    streak: newStreak,
                    longestStreak: Math.max(longestStreak, newStreak),
                    lastPlayedDate: new Date().toDateString(),
                });
                console.log(`[Streak] Now at ${newStreak} days`);
                get().checkAchievements();
            },

            checkAndUpdateStreak: () => {
                const { lastPlayedDate, streak } = get();
                const today = new Date().toDateString();

                if (lastPlayedDate === today) {
                    return; // Already played today
                }

                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toDateString();

                if (lastPlayedDate === yesterdayStr) {
                    // Played yesterday, continue streak
                    get().incrementStreak();
                } else if (lastPlayedDate !== null) {
                    // Missed a day, reset streak
                    console.log('[Streak] Reset due to missed day');
                    set({ streak: 1, lastPlayedDate: today });
                } else {
                    // First time playing
                    set({ streak: 1, lastPlayedDate: today });
                }
            },

            addScore: (score) => {
                set((state) => ({ totalScore: state.totalScore + score }));
            },

            incrementGamesPlayed: () => {
                set((state) => ({ gamesPlayed: state.gamesPlayed + 1 }));
            },

            incrementGamesCompleted: () => {
                set((state) => ({ gamesCompleted: state.gamesCompleted + 1 }));
                get().checkAchievements();
            },

            addRegionsFilled: (count) => {
                set((state) => ({ totalRegionsFilled: state.totalRegionsFilled + count }));
                get().checkAchievements();
            },

            addPlayTime: (seconds) => {
                set((state) => ({ totalPlayTimeSeconds: state.totalPlayTimeSeconds + seconds }));
                get().checkAchievements();
            },

            // ═══════════════════════════════════════════════════════════
            // PAINTING ACTIONS
            // ═══════════════════════════════════════════════════════════

            unlockPainting: (paintingId) => {
                const { unlockedPaintings } = get();
                if (!unlockedPaintings.includes(paintingId)) {
                    set({ unlockedPaintings: [...unlockedPaintings, paintingId] });
                    console.log(`[Paintings] Unlocked: ${paintingId}`);
                }
            },

            completePainting: (paintingId) => {
                const { completedPaintings } = get();
                if (!completedPaintings.includes(paintingId)) {
                    set({ completedPaintings: [...completedPaintings, paintingId] });
                    console.log(`[Paintings] Completed: ${paintingId}`);
                    get().incrementGamesCompleted();
                }
            },

            isPaintingUnlocked: (paintingId) => {
                return get().unlockedPaintings.includes(paintingId);
            },

            isPaintingCompleted: (paintingId) => {
                return get().completedPaintings.includes(paintingId);
            },

            // ═══════════════════════════════════════════════════════════
            // ACHIEVEMENT ACTIONS
            // ═══════════════════════════════════════════════════════════

            unlockAchievement: (achievementId) => {
                const { achievements } = get();
                const updated = achievements.map((a) =>
                    a.id === achievementId && !a.unlockedAt
                        ? { ...a, unlockedAt: Date.now() }
                        : a
                );
                set({ achievements: updated });
            },

            checkAchievements: () => {
                const state = get();
                const newlyUnlocked: string[] = [];

                const checkAndUnlock = (id: string, condition: boolean) => {
                    const achievement = state.achievements.find((a) => a.id === id);
                    if (achievement && !achievement.unlockedAt && condition) {
                        get().unlockAchievement(id);
                        newlyUnlocked.push(id);
                        // Bonus coins for achievement
                        get().addCoins(50, `Achievement: ${achievement.title}`);
                    }
                };

                // Check all achievements
                checkAndUnlock('first_painting', state.gamesCompleted >= 1);
                checkAndUnlock('streak_3', state.streak >= 3);
                checkAndUnlock('streak_7', state.streak >= 7);
                checkAndUnlock('streak_30', state.streak >= 30);
                checkAndUnlock('coins_1000', state.totalCoinsEarned >= 1000);
                checkAndUnlock('coins_10000', state.totalCoinsEarned >= 10000);
                checkAndUnlock('paintings_5', state.gamesCompleted >= 5);
                checkAndUnlock('paintings_25', state.gamesCompleted >= 25);
                checkAndUnlock('paintings_100', state.gamesCompleted >= 100);
                checkAndUnlock('regions_1000', state.totalRegionsFilled >= 1000);
                checkAndUnlock('regions_10000', state.totalRegionsFilled >= 10000);
                checkAndUnlock('playtime_1h', state.totalPlayTimeSeconds >= 3600);
                checkAndUnlock('playtime_10h', state.totalPlayTimeSeconds >= 36000);

                return newlyUnlocked;
            },

            // ═══════════════════════════════════════════════════════════
            // DAILY REWARDS
            // ═══════════════════════════════════════════════════════════

            claimDailyReward: () => {
                const { dailyRewards, currentDailyDay, lastDailyClaimDate } = get();
                const today = new Date().toDateString();

                if (lastDailyClaimDate === today) {
                    console.log('[Daily] Already claimed today');
                    return 0;
                }

                const reward = dailyRewards.find((r) => r.day === currentDailyDay);
                if (!reward) return 0;

                const coinsEarned = reward.coins;

                // Update state
                const nextDay = currentDailyDay >= 7 ? 1 : currentDailyDay + 1;
                const updatedRewards = currentDailyDay >= 7
                    ? DAILY_REWARDS_TEMPLATE.map(r => ({ ...r })) // Reset cycle
                    : dailyRewards.map((r) =>
                        r.day === currentDailyDay ? { ...r, claimed: true } : r
                    );

                set({
                    dailyRewards: updatedRewards,
                    currentDailyDay: nextDay,
                    lastDailyClaimDate: today,
                });

                get().addCoins(coinsEarned, 'Daily Reward');
                console.log(`[Daily] Claimed day ${currentDailyDay}: ${coinsEarned} coins`);

                return coinsEarned;
            },

            canClaimDailyReward: () => {
                const { lastDailyClaimDate } = get();
                const today = new Date().toDateString();
                return lastDailyClaimDate !== today;
            },

            // ═══════════════════════════════════════════════════════════
            // SETTINGS
            // ═══════════════════════════════════════════════════════════

            setOnboardingSeen: () => set({ hasSeenOnboarding: true }),
            toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
            toggleMusic: () => set((state) => ({ musicEnabled: !state.musicEnabled })),
            toggleHaptics: () => set((state) => ({ hapticsEnabled: !state.hapticsEnabled })),

            // ═══════════════════════════════════════════════════════════
            // CLOUD SYNC
            // ═══════════════════════════════════════════════════════════

            syncToCloud: async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.user) return; // Only sync if logged in

                    const state = get();
                    const profileData = {
                        id: session.user.id,
                        coins: state.coins,
                        total_coins_earned: state.totalCoinsEarned,
                        energy: state.energy,
                        streak: state.streak,
                        longest_streak: state.longestStreak,
                        total_score: state.totalScore,
                        games_played: state.gamesPlayed,
                        games_completed: state.gamesCompleted,
                        total_regions_filled: state.totalRegionsFilled,
                        total_play_time_seconds: state.totalPlayTimeSeconds,
                        last_played_date: state.lastPlayedDate,
                        last_energy_refill: state.lastEnergyRefill,
                        has_seen_onboarding: state.hasSeenOnboarding,
                        updated_at: new Date().toISOString(),
                    };

                    const { error } = await supabase
                        .from('profiles')
                        .upsert(profileData);

                    if (error) {
                        console.error('[Sync] Error syncing profile to Supabase:', error);
                    } else {
                        console.log('[Sync] Profile synced to Supabase successfully');
                    }
                } catch (error) {
                    console.error('[Sync] Unexpected error syncing to cloud:', error);
                }
            },

            loadFromCloud: async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.user) return;

                    const { data, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();

                    if (error && error.code !== 'PGRST116') { // Ignore row not found
                        console.error('[Sync] Error loading profile from Supabase:', error);
                        return;
                    }

                    if (data) {
                        set({
                            coins: Math.max(get().coins, data.coins || 100), // simplistic merge: take max
                            totalCoinsEarned: Math.max(get().totalCoinsEarned, data.total_coins_earned || 100),
                            energy: data.energy ?? 5,
                            streak: Math.max(get().streak, data.streak || 0),
                            longestStreak: Math.max(get().longestStreak, data.longest_streak || 0),
                            totalScore: Math.max(get().totalScore, data.total_score || 0),
                            gamesPlayed: Math.max(get().gamesPlayed, data.games_played || 0),
                            gamesCompleted: Math.max(get().gamesCompleted, data.games_completed || 0),
                            totalRegionsFilled: Math.max(get().totalRegionsFilled, data.total_regions_filled || 0),
                            totalPlayTimeSeconds: Math.max(get().totalPlayTimeSeconds, data.total_play_time_seconds || 0),
                            lastPlayedDate: data.last_played_date || get().lastPlayedDate,
                            lastEnergyRefill: data.last_energy_refill || get().lastEnergyRefill,
                            hasSeenOnboarding: data.has_seen_onboarding || get().hasSeenOnboarding,
                        });
                        console.log('[Sync] Profile loaded and merged from Supabase');
                    }
                } catch (error) {
                    console.error('[Sync] Unexpected error loading from cloud:', error);
                }
            },

            // ═══════════════════════════════════════════════════════════
            // RESET (for testing)
            // ═══════════════════════════════════════════════════════════

            resetProgress: () => {
                set({
                    coins: 100,
                    totalCoinsEarned: 100,
                    energy: 5,
                    streak: 0,
                    longestStreak: 0,
                    lastPlayedDate: null,
                    totalScore: 0,
                    gamesPlayed: 0,
                    gamesCompleted: 0,
                    totalRegionsFilled: 0,
                    totalPlayTimeSeconds: 0,
                    unlockedPaintings: [],
                    completedPaintings: [],
                    achievements: ACHIEVEMENTS.map((a) => ({ ...a })),
                    dailyRewards: DAILY_REWARDS_TEMPLATE.map((r) => ({ ...r })),
                    lastDailyClaimDate: null,
                    currentDailyDay: 1,
                });
                console.log('[User] Progress reset');
                get().syncToCloud();
            },
        }),
        {
            name: 'user-storage',
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
);
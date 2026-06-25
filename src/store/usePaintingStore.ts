/**
 * Painting Progress Store
 * =======================
 * Saves user's painting progress for "Jump Back In" feature
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from './mmkvStorage';
import { supabase } from '../services/supabase';

export interface SavedPainting {
    id: string;
    title: string;
    thumbnailB64: string;
    progress: number; // 0-1
    filledRegions: Record<number, boolean>;
    totalRegions: number;
    backendData: any; // Full backend response for resuming
    savedAt: number; // timestamp
    lastPlayedAt: number;
}

interface PaintingStore {
    savedPaintings: SavedPainting[];
    currentPaintingId: string | null;

    // Actions
    savePainting: (painting: Omit<SavedPainting, 'id' | 'savedAt'>) => string;
    updateProgress: (id: string, filledRegions: Record<number, boolean>, progress: number, thumbnailB64?: string) => void;
    deletePainting: (id: string) => void;
    getPainting: (id: string) => SavedPainting | undefined;
    setCurrentPainting: (id: string | null) => void;
    getRecentPaintings: (limit?: number) => SavedPainting[];
    clearAll: () => void;

    // Cloud Sync
    syncPaintingToCloud: (id: string) => Promise<void>;
    loadPaintingsFromCloud: () => Promise<void>;
    deletePaintingFromCloud: (id: string) => Promise<void>;
}

export const usePaintingStore = create<PaintingStore>()(
    persist(
        (set, get) => ({
            savedPaintings: [],
            currentPaintingId: null,

            savePainting: (painting) => {
                const id = `painting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newPainting: SavedPainting = {
                    ...painting,
                    id,
                    savedAt: Date.now(),
                    lastPlayedAt: Date.now(),
                };

                set((state) => {
                    // Try to prevent SQLite Full errors by drastically reducing saved item count
                    const trimmedPaintings = [newPainting, ...state.savedPaintings].slice(0, 5);
                    return {
                        savedPaintings: trimmedPaintings,
                        currentPaintingId: id,
                    };
                });

                console.log('[PaintingStore] Saved painting:', id);
                return id;
            },

            updateProgress: (id, filledRegions, progress, thumbnailB64) => {
                set((state) => ({
                    savedPaintings: state.savedPaintings.map((p) =>
                        p.id === id
                            ? {
                                ...p,
                                filledRegions,
                                progress,
                                lastPlayedAt: Date.now(),
                                ...(thumbnailB64 ? { thumbnailB64 } : {})
                            }
                            : p
                    ),
                }));
            },

            deletePainting: (id) => {
                set((state) => ({
                    savedPaintings: state.savedPaintings.filter((p) => p.id !== id),
                    currentPaintingId: state.currentPaintingId === id ? null : state.currentPaintingId,
                }));
            },

            getPainting: (id) => {
                return get().savedPaintings.find((p) => p.id === id);
            },

            setCurrentPainting: (id) => {
                set({ currentPaintingId: id });
            },

            getRecentPaintings: (limit = 10) => {
                return [...get().savedPaintings]
                    .sort((a, b) => b.lastPlayedAt - a.lastPlayedAt)
                    .slice(0, limit);
            },

            clearAll: () => {
                set({ savedPaintings: [], currentPaintingId: null });
            },

            // ═══════════════════════════════════════════════════════════
            // CLOUD SYNC
            // ═══════════════════════════════════════════════════════════

            syncPaintingToCloud: async (id: string) => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.user) return; // Only sync if logged in

                    const painting = get().savedPaintings.find(p => p.id === id);
                    if (!painting) return;

                    const dbPainting = {
                        id: painting.id,
                        user_id: session.user.id,
                        title: painting.title,
                        thumbnail_b64: painting.thumbnailB64,
                        progress: painting.progress,
                        total_regions: painting.totalRegions,
                        filled_regions: painting.filledRegions,
                        backend_data: painting.backendData,
                        saved_at: painting.savedAt,
                        last_played_at: painting.lastPlayedAt,
                        updated_at: new Date().toISOString()
                    };

                    const { error } = await supabase
                        .from('saved_paintings')
                        .upsert(dbPainting);

                    if (error) {
                        console.error('[PaintingSync] Error syncing painting:', error);
                    }
                } catch (error) {
                    console.error('[PaintingSync] Unexpected error:', error);
                }
            },

            deletePaintingFromCloud: async (id: string) => {
                 try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.user) return; 
                    
                    await supabase.from('saved_paintings').delete().eq('id', id);
                 } catch (e) {}
            },

            loadPaintingsFromCloud: async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session?.user) return;

                    const { data, error } = await supabase
                        .from('saved_paintings')
                        .select('*')
                        .eq('user_id', session.user.id);

                    if (error) {
                        console.error('[PaintingSync] Error loading paintings:', error);
                        return;
                    }

                    if (data && data.length > 0) {
                        const cloudPaintings: SavedPainting[] = data.map(dbP => ({
                            id: dbP.id,
                            title: dbP.title,
                            thumbnailB64: dbP.thumbnail_b64,
                            progress: dbP.progress,
                            filledRegions: dbP.filled_regions || {},
                            totalRegions: dbP.total_regions,
                            backendData: dbP.backend_data,
                            savedAt: dbP.saved_at,
                            lastPlayedAt: dbP.last_played_at
                        }));

                        // Basic merge: prefer cloud data, append local data not in cloud
                        const localPaintings = get().savedPaintings;
                        const merged = [...cloudPaintings];
                        localPaintings.forEach(lp => {
                            if (!merged.find(cp => cp.id === lp.id)) {
                                merged.push(lp);
                            }
                        });

                        set({ savedPaintings: merged });
                    }
                } catch (error) {
                    console.error('[PaintingSync] Unexpected error loading from cloud:', error);
                }
            },
        }),
        {
            name: 'painting-storage',
            storage: createJSONStorage(() => mmkvStorage),
        }
    )
);
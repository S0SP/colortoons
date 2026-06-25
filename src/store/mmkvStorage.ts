/**
 * MMKV Storage Wrapper for Zustand
 * Falls back to AsyncStorage if MMKV is not available
 */

import { StateStorage } from 'zustand/middleware';

// Try to use MMKV, fallback to AsyncStorage
let storage: StateStorage;

try {
    const { MMKV } = require('react-native-mmkv');
    const mmkv = new MMKV();

    storage = {
        getItem: (name: string) => {
            const value = mmkv.getString(name);
            return value ?? null;
        },
        setItem: (name: string, value: string) => {
            mmkv.set(name, value);
        },
        removeItem: (name: string) => {
            mmkv.delete(name);
        },
    };
    console.log('[Storage] Using MMKV');
} catch {
    // Fallback to AsyncStorage
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;

    storage = {
        getItem: async (name: string) => {
            return await AsyncStorage.getItem(name);
        },
        setItem: async (name: string, value: string) => {
            await AsyncStorage.setItem(name, value);
        },
        removeItem: async (name: string) => {
            await AsyncStorage.removeItem(name);
        },
    };
    console.log('[Storage] Using AsyncStorage fallback');
}

export const mmkvStorage = storage;
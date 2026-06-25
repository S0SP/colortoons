/**
 * AudioManager - Hypnotic Background Music System
 * ================================================
 * Manages two audio tracks:
 * 1. App-wide ambient music (relaxing, hypnotic)
 * 2. Game-specific focus music (engaging, addictive)
 */

import Sound from 'react-native-sound';
import { AppState, AppStateStatus } from 'react-native';

// Enable playback in silence mode
Sound.setCategory('Playback');

class AudioManagerClass {
    private appMusic: Sound | null = null;
    private gameMusic: Sound | null = null;
    private currentTrack: 'app' | 'game' | null = null;
    private volume: number = 0.3;
    private isMuted: boolean = false;
    private isInitialized: boolean = false;
    private appStateSubscription: any = null;
    private pendingPlay: 'app' | 'game' | null = null;

    // Sound file names (place in android/app/src/main/res/raw/)
    private readonly APP_MUSIC = 'ambient_hypnotic.mp3';
    private readonly GAME_MUSIC = 'game_focus.mp3';

    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Load app music
            this.appMusic = await this.loadSound(this.APP_MUSIC);
            if (this.appMusic) {
                this.appMusic.setNumberOfLoops(-1); // Infinite loop
                this.appMusic.setVolume(this.volume);
            }

            // Load game music
            this.gameMusic = await this.loadSound(this.GAME_MUSIC);
            if (this.gameMusic) {
                this.gameMusic.setNumberOfLoops(-1);
                this.gameMusic.setVolume(this.volume);
            }

            // Handle app state changes (pause when backgrounded)
            this.appStateSubscription = AppState.addEventListener(
                'change',
                this.handleAppStateChange
            );

            this.isInitialized = true;
            console.log('[AudioManager] Initialized successfully');

            // Play any pending track
            if (this.pendingPlay === 'app') {
                this.playAppMusic();
            } else if (this.pendingPlay === 'game') {
                this.playGameMusic();
            }
            this.pendingPlay = null;
        } catch (error) {
            console.warn('[AudioManager] Failed to initialize:', error);
        }
    }

    private loadSound(filename: string): Promise<Sound | null> {
        return new Promise((resolve) => {
            const sound = new Sound(filename, Sound.MAIN_BUNDLE, (error) => {
                if (error) {
                    console.warn(`[AudioManager] Failed to load ${filename}:`, error);
                    resolve(null);
                } else {
                    resolve(sound);
                }
            });
        });
    }

    private handleAppStateChange = (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
            this.resume();
        } else if (nextAppState === 'background' || nextAppState === 'inactive') {
            this.pause();
        }
    };

    playAppMusic(): void {
        this.currentTrack = 'app';
        if (this.isMuted) return;

        if (!this.appMusic) {
            this.pendingPlay = 'app';
            return;
        }

        if (this.gameMusic && typeof this.gameMusic.isPlaying === 'function' && this.gameMusic.isPlaying()) {
            this.fadeOut(this.gameMusic, 500);
        }

        this.fadeIn(this.appMusic, 800);
        this.currentTrack = 'app';
        console.log('[AudioManager] Playing app music');
    }

    playGameMusic(): void {
        this.currentTrack = 'game';
        if (this.isMuted) return;

        if (!this.gameMusic) {
            this.pendingPlay = 'game';
            return;
        }

        if (this.appMusic && typeof this.appMusic.isPlaying === 'function' && this.appMusic.isPlaying()) {
            this.fadeOut(this.appMusic, 500);
        }

        this.fadeIn(this.gameMusic, 800);
        this.currentTrack = 'game';
        console.log('[AudioManager] Playing game music');
    }

    private fadeIn(sound: Sound, duration: number): void {
        sound.setVolume(0);
        sound.play();

        const steps = 20;
        const stepDuration = duration / steps;
        const volumeStep = this.volume / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            sound.setVolume(Math.min(volumeStep * currentStep, this.volume));
            if (currentStep >= steps) clearInterval(interval);
        }, stepDuration);
    }

    private fadeOut(sound: Sound, duration: number): void {
        const steps = 20;
        const stepDuration = duration / steps;
        const currentVolume = this.volume;
        const volumeStep = currentVolume / steps;
        let currentStep = 0;

        const interval = setInterval(() => {
            currentStep++;
            const newVolume = Math.max(currentVolume - volumeStep * currentStep, 0);
            sound.setVolume(newVolume);
            if (currentStep >= steps) {
                clearInterval(interval);
                sound.pause();
            }
        }, stepDuration);
    }

    pause(): void {
        this.appMusic?.pause();
        this.gameMusic?.pause();
    }

    resume(): void {
        if (this.currentTrack === 'app' && this.appMusic) {
            this.appMusic.play();
        } else if (this.currentTrack === 'game' && this.gameMusic) {
            this.gameMusic.play();
        }
    }

    stop(): void {
        this.appMusic?.stop();
        this.gameMusic?.stop();
        this.currentTrack = null;
    }

    setVolume(volume: number): void {
        this.volume = Math.max(0, Math.min(1, volume));
        this.appMusic?.setVolume(this.volume);
        this.gameMusic?.setVolume(this.volume);
    }

    toggleMute(): boolean {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.pause();
        } else {
            this.resume();
        }
        return this.isMuted;
    }

    get muted(): boolean {
        return this.isMuted;
    }

    cleanup(): void {
        this.stop();
        this.appMusic?.release();
        this.gameMusic?.release();
        this.appStateSubscription?.remove();
        this.isInitialized = false;
    }
}

export const AudioManager = new AudioManagerClass();
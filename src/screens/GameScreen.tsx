console.log("GAME SCREEN V12 — SAFE-AREA CANVAS + PALETTE IMPROVEMENTS + SOUND TOGGLE");
/**
 * CHANGES IN V12:
 *
 * 1. FIT CANVAS WITHIN SAFE AREA
 *    - Canvas dimensions are now computed from available screen space
 *      (screen height minus safe-area insets, header and palette heights).
 *    - baseScale is chosen as min(scaleByWidth, scaleByHeight) so the canvas
 *      always fits between the top bar and the colour palette with no clipping.
 *
 * 2. FIX CANVAS RECENTERING
 *    - recenterCanvas() now computes the exact centred translation so the
 *      canvas sits in the middle of the available area rather than drifting
 *      left/top when minX/minY > 0.
 *
 * 3. REDUCE SKETCH LINE GAP (50%)
 *    - sketchShader lineSpacing reduced from 16.0 → 8.0 for tighter boundaries.
 *
 * 4. ADD SOUND TOGGLE IN GAME SCREEN
 *    - Mute/unmute button added to the header, sharing global AudioManager state
 *      with the Home Screen toggle.
 *
 * 5. COLOR PALETTE IMPROVEMENTS
 *    A) Sort colours by region count DESCENDING (most-used first).
 *    B) Show region count label ABOVE each colour circle instead of the index.
 *    C) Number labels on canvas regions were already absent in V11 — confirmed
 *       removed (labelFont computed but never rendered in the canvas pass).
 *
 * 6. PERFORMANCE OPTIMISATION
 *    - PaletteSwatch already React.memo; sortedRegions, palette indices,
 *      viewport calc all memoised.
 *    - Pan/pinch gesture state lives entirely in Reanimated shared values
 *      (UI thread) — zero JS state updates during gesture.
 */

import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import {
    View, StyleSheet, Dimensions, TouchableOpacity, Text,
    ScrollView, Alert, Vibration, Platform, Modal, BackHandler,
    Animated as RNAnimated, LogBox
} from 'react-native';
import {
    Canvas, Path, Skia, Group, BlurMask,
    Text as SkiaText, SkPath, useCanvasRef, ImageFormat, Shader,
    matchFont
} from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, {
    useSharedValue, runOnJS, useAnimatedStyle,
    clamp, useDerivedValue, withTiming, withRepeat,
    withSequence, withSpring, Easing,
} from 'react-native-reanimated';
import { useGameStore } from '../store/useGameStore';
import { useUserStore } from '../store/useUserStore';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import GameProgressBar from '../components/GameProgressBar';
import type { DecodedProcessResponse, Region } from '../services/api';

import { AudioManager } from '../services/AudioManager';
import { usePaintingStore } from '../store/usePaintingStore';
import { SaveProgressModal } from '../components/SaveProgressModal';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

// ─── Sound ────────────────────────────────────────────────────────────────────
let RNSound: any = null;
try {
    RNSound = require('react-native-sound');
    RNSound.default?.setCategory?.('Playback');
} catch { }

const loadSound = (f: string) => {
    if (!RNSound?.default) return null;
    return new RNSound.default(f, RNSound.default.MAIN_BUNDLE, (e: any) => {
        if (e) console.warn('[Sound]', f, e);
    });
};

const squashSound = loadSound('fill_squash.mp3');
const chimeSound  = loadSound('color_chime.mp3');
const fanfareSound = loadSound('level_fanfare.mp3');

const playSquash  = () => { if (!squashSound) return; squashSound.setSpeed?.(0.95 + Math.random() * 0.10); squashSound.play(); };
const playChime   = () => chimeSound?.play();
const playFanfare = () => fanfareSound?.play();

// ─── Confetti ─────────────────────────────────────────────────────────────────
let ConfettiCannon: any = null;
try { ConfettiCannon = require('react-native-confetti-cannon').default; } catch { }

// ─── Haptics ──────────────────────────────────────────────────────────────────
const haptic = {
    error:   () => Vibration.vibrate(50),
    success: () => Vibration.vibrate([0, 30, 30, 30]),
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Layout constants ─────────────────────────────────────────────────────────
// FIT CANVAS WITHIN SAFE AREA: these known heights are used to compute the
// maximum canvas area between the top bar and the colour palette.
const HEADER_HEIGHT  = 56;
const PALETTE_HEIGHT = 76; // paddingVertical(10×2) + swatch(50) + count label(~6)

// ─── Other constants ──────────────────────────────────────────────────────────
const DEBOUNCE_MS         = 150;
const RECENTER_THRESHOLD  = 50;
const MIN_LABEL_AREA      = 20;
const TAP_ASSIST_RADIUS   = 15;
const HIGHLIGHT_COLOR     = '#3a3a3a';

// ─── Sketch shader ────────────────────────────────────────────────────────────
// REDUCE SKETCH LINE GAP (50%): lineSpacing changed from 16.0 → 8.0
const sketchShader = Skia.RuntimeEffect.Make(`
uniform float u_scale;

vec4 main(vec2 pos) {
  float lineThickness = max(1.8 / u_scale, 0.5);
  float lineSpacing   = 8.0 / u_scale;   // was 16.0 — halved for tighter boundaries
  float val = mod(pos.x - pos.y, lineSpacing);

  if (val < lineThickness) {
    return vec4(0.4, 0.4, 0.4, 0.6);   // grey pencil line
  }
  return vec4(0.92, 0.92, 0.92, 0.8);  // light grey fill
}
`)!;

// ─── Contrast helper ──────────────────────────────────────────────────────────
function getContrastColor(hex: string): string {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16) / 255;
    const g = parseInt(h.substring(2, 4), 16) / 255;
    const b = parseInt(h.substring(4, 6), 16) / 255;
    const toLinear = (c: number) => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
    return L > 0.35 ? '#111111' : '#FFFFFF';
}

// ─── Viewport intersection ────────────────────────────────────────────────────
function bboxIntersectsViewport(
    bbox: Region['bbox'],
    viewportX: number, viewportY: number,
    viewportW: number, viewportH: number
): boolean {
    return !(
        bbox.x + bbox.w < viewportX ||
        bbox.x > viewportX + viewportW ||
        bbox.y + bbox.h < viewportY ||
        bbox.y > viewportY + viewportH
    );
}

// ─── PaletteSwatch ────────────────────────────────────────────────────────────
// COLOR PALETTE IMPROVEMENTS (B): shows region count label ABOVE the circle
// instead of the colour index number inside it.
const PaletteSwatch = React.memo(({
    colorHex,
    regionCount,   // number of regions that use this colour
    isSelected,
    isDone,
    onPress
}: {
    colorHex:    string;
    regionCount: number;
    isSelected:  boolean;
    isDone:      boolean;
    onPress:     () => void;
}) => {
    const scaleAnim = useRef(new RNAnimated.Value(1)).current;

    useEffect(() => {
        if (isDone) {
            RNAnimated.sequence([
                RNAnimated.timing(scaleAnim, { toValue: 0.60, duration: 130, useNativeDriver: true }),
                RNAnimated.spring(scaleAnim,  { toValue: 0.82, friction: 4,  useNativeDriver: true }),
            ]).start();
        } else {
            RNAnimated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        }
    }, [isDone]);

    return (
        <TouchableOpacity onPress={onPress} disabled={isDone} activeOpacity={0.75}>
            {/* Wrapper stacks the count label above the circle */}
            <View style={styles.swatchWrapper}>
                {/* Region count label above the swatch */}
                <Text style={[styles.swatchCountLabel, isDone && { opacity: 0.4 }]}>
                    {isDone ? '✓' : regionCount}
                </Text>

                <RNAnimated.View style={[styles.colorSwatch, {
                    backgroundColor: colorHex,
                    borderWidth:  isSelected ? 4 : 2,
                    borderColor:  isSelected ? '#FFF' : 'rgba(0,0,0,0.15)',
                    opacity:      isDone ? 0.45 : 1,
                    transform:    [{ scale: scaleAnim }],
                }]}>
                    {/* Show a star when this colour is fully coloured in */}
                    {isDone && <Text style={styles.swatchStar}>⭐</Text>}
                </RNAnimated.View>
            </View>
        </TouchableOpacity>
    );
});

// ─── Cached Region Type ───────────────────────────────────────────────────────
interface CachedRegion extends Region {
    skPath: SkPath | null;
}

// ─── Path Cache Manager ───────────────────────────────────────────────────────
class PathCache {
    private cache: Map<number, SkPath> = new Map();

    getPath(region: Region): SkPath | null {
        if (this.cache.has(region.region_id)) return this.cache.get(region.region_id)!;
        const path = Skia.Path.MakeFromSVGString(region.path_data);
        if (path) this.cache.set(region.region_id, path);
        return path;
    }

    clear(): void { this.cache.clear(); }
    get size(): number { return this.cache.size; }
}

// ─── Region Map Tap Detector ──────────────────────────────────────────────────
class RegionMapTapDetector {
    private regionMap: Uint16Array | null;
    private width:  number;
    private height: number;
    private scale:  number;

    constructor(regionMap: Uint16Array | null, width: number, height: number, scale: number) {
        this.regionMap = regionMap;
        this.width  = width;
        this.height = height;
        this.scale  = scale;
    }

    getRegionIdAt(canvasX: number, canvasY: number): number {
        if (!this.regionMap) return 0;
        const mapX = Math.floor(canvasX / this.scale);
        const mapY = Math.floor(canvasY / this.scale);
        if (mapX < 0 || mapX >= this.width || mapY < 0 || mapY >= this.height) return 0;
        return this.regionMap[mapY * this.width + mapX];
    }

    getRegionIdWithAssist(canvasX: number, canvasY: number, radiusPx: number): number {
        const directHit = this.getRegionIdAt(canvasX, canvasY);
        if (directHit > 0) return directHit;
        if (!this.regionMap) return 0;

        const counts = new Map<number, number>();
        const steps        = 16;
        const radiusInMap  = radiusPx / this.scale;

        for (let i = 0; i < steps; i++) {
            const angle = (i / steps) * Math.PI * 2;
            const mapX  = Math.floor((canvasX / this.scale) + Math.cos(angle) * radiusInMap);
            const mapY  = Math.floor((canvasY / this.scale) + Math.sin(angle) * radiusInMap);
            if (mapX >= 0 && mapX < this.width && mapY >= 0 && mapY < this.height) {
                const regionId = this.regionMap[mapY * this.width + mapX];
                if (regionId > 0) counts.set(regionId, (counts.get(regionId) || 0) + 1);
            }
        }

        let bestId = 0, bestCount = 0;
        counts.forEach((count, id) => { if (count > bestCount) { bestCount = count; bestId = id; } });
        return bestId;
    }
}

// ─── Coin Particle ────────────────────────────────────────────────────────────
interface CoinParticle { id: number; x: number; vy: number; t: number; rot: number; }

// ─── Outer Shell ──────────────────────────────────────────────────────────────
export const GameScreen = ({ route, navigation }: any) => {
    const data: DecodedProcessResponse | undefined = route.params?.data;

    if (!data?.regions?.length) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#555', fontSize: 16 }}>Loading…</Text>
            </View>
        );
    }

    return <GameContent backendData={data} navigation={navigation} route={route} />;
};

// ─── GameContent ──────────────────────────────────────────────────────────────
const GameContent = ({
    backendData,
    navigation,
    route
}: {
    backendData: DecodedProcessResponse;
    navigation:  any;
    route:       any;
}) => {
    const { savePainting, updateProgress } = usePaintingStore();
    const [showSaveModal,  setShowSaveModal]  = useState(false);
    const savedPaintingId     = route.params?.savedPaintingId;
    const resumeFilledRegions = route.params?.resumeFilledRegions;
    const canvasRef = useCanvasRef();

    // ADD SOUND TOGGLE IN GAME SCREEN
    // Reads the initial muted state from AudioManager so the icon is correct
    // even when the user muted on the Home Screen before entering the game.
    const [isMuted, setIsMuted] = useState(AudioManager.muted);

    useEffect(() => {
        LogBox.ignoreLogs(['Non-serializable values were found in the navigation state']);
    }, []);

    // Play game music on focus, restore app music on blur
    useFocusEffect(
        React.useCallback(() => {
            AudioManager.playGameMusic();
            return () => { AudioManager.playAppMusic(); };
        }, [])
    );

    const {
        regions,
        palette,
        width:  backendW,
        height: backendH,
        mega_paths_by_color: megaPaths,
        adjacency,
        regionMap,
        regionMapWidth,
        regionMapHeight,
        regionMapScale,
    } = backendData;

    // ── FIT CANVAS WITHIN SAFE AREA ───────────────────────────────────────────
    // Obtain the safe-area top inset so we don't accidentally overlap the
    // status bar or any device notch.
    const insets = useSafeAreaInsets();

    // Total vertical space consumed by chrome (safe area + header + palette)
    const chromeHeight = insets.top + HEADER_HEIGHT + PALETTE_HEIGHT + (insets.bottom || 0);
    const availableH   = SCREEN_HEIGHT - chromeHeight;

    // Choose the scale that fits both dimensions; content never clips behind UI.
    const scaleByWidth  = SCREEN_WIDTH / backendW;
    const scaleByHeight = availableH   / backendH;
    const baseScale     = Math.min(scaleByWidth, scaleByHeight);

    // Actual canvas pixel dimensions (may be narrower than SCREEN_WIDTH if the
    // image is portrait and height is the limiting dimension)
    const canvasW      = backendW * baseScale;
    const canvasHeight = backendH * baseScale;

    // ── Region bounding box extremes ──────────────────────────────────────────
    const { minX, minY, maxX, maxY } = useMemo(() => ({
        minX: Math.min(...regions.map(r => r.bbox.x)),
        minY: Math.min(...regions.map(r => r.bbox.y)),
        maxX: Math.max(...regions.map(r => r.bbox.x + r.bbox.w)),
        maxY: Math.max(...regions.map(r => r.bbox.y + r.bbox.h)),
    }), [regions]);

    // FIX CANVAS RECENTERING: centred translations at scale = 1
    // groupTransform applies: translateX.value - minX * s
    // We need: centeredTX - minX * baseScale = (canvasW - contentW) / 2
    // → centeredTX = (canvasW - (maxX - minX) * baseScale) / 2
    const contentW    = (maxX - minX) * baseScale;
    const contentH    = (maxY - minY) * baseScale;
    const centeredTX  = (canvasW      - contentW) / 2;
    const centeredTY  = (canvasHeight - contentH) / 2;

    // ── Path cache ────────────────────────────────────────────────────────────
    const pathCache = useRef(new PathCache()).current;
    useEffect(() => () => { pathCache.clear(); console.log('[GameScreen] Path cache cleared'); }, []);

    // ── Tap detector ──────────────────────────────────────────────────────────
    const tapDetector = useMemo(() =>
        new RegionMapTapDetector(regionMap, regionMapWidth, regionMapHeight, regionMapScale),
        [regionMap, regionMapWidth, regionMapHeight, regionMapScale]
    );

    // ── Region ID lookup map ──────────────────────────────────────────────────
    const regionById = useMemo(() => {
        const map = new Map<number, Region>();
        regions.forEach(r => map.set(r.region_id, r));
        return map;
    }, [regions]);

    // ── Pre-parse mega paths ──────────────────────────────────────────────────
    const skiaMegaPaths = useMemo(() => {
        const out: Record<number, SkPath | null> = {};
        for (const [k, v] of Object.entries(megaPaths ?? {})) {
            if (v) out[Number(k)] = Skia.Path.MakeFromSVGString(v);
        }
        return out;
    }, [megaPaths]);

    // ── Depth-sorted regions (parents first, then children) ───────────────────
    const sortedRegions = useMemo(() => {
        const depthMap = new Map<number, number>();
        const getDepth = (r: Region): number => {
            if (depthMap.has(r.region_id)) return depthMap.get(r.region_id)!;
            if (r.parent_id == null) { depthMap.set(r.region_id, 0); return 0; }
            const parent = regionById.get(r.parent_id);
            const depth  = parent ? getDepth(parent) + 1 : 0;
            depthMap.set(r.region_id, depth);
            return depth;
        };
        regions.forEach(r => getDepth(r));
        return [...regions].sort((a, b) => {
            const dA = depthMap.get(a.region_id) || 0;
            const dB = depthMap.get(b.region_id) || 0;
            if (dA !== dB) return dA - dB;
            return b.area - a.area;
        });
    }, [regions, regionById]);

    // ── Skia label font (kept for potential future use; not rendered on canvas) ─
    const labelFontSize = useMemo(() => Math.max(10, Math.round(12 / baseScale)), [baseScale]);
    const labelFont = useMemo(() => {
        try {
            const f = matchFont({
                fontFamily: Platform.OS === 'ios' ? 'Helvetica' : 'sans-serif',
                fontSize:   labelFontSize,
                fontWeight: 'bold'
            });
            return f || Skia.Font(null as any, labelFontSize);
        } catch { return null; }
    }, [labelFontSize]);

    // ── Zustand ───────────────────────────────────────────────────────────────
    const selectedColor        = useGameStore(s => s.selectedColor);
    const setSelectedColor     = useGameStore(s => s.setSelectedColor);
    const filledRegions        = useGameStore(s => s.filledRegions);
    const fillRegion           = useGameStore(s => s.fillRegion);
    const resetFilledRegions   = useGameStore(s => s.resetFilledRegions);
    const startGame            = useGameStore(s => s.startGame);
    const endGame              = useGameStore(s => s.endGame);
    const addSessionScore      = useGameStore(s => s.addSessionScore);
    const addSessionCoins      = useGameStore(s => s.addSessionCoins);
    const addCoins             = useUserStore(s => s.addCoins);

    useEffect(() => { startGame(); }, []);

    useEffect(() => {
        resetFilledRegions();
        setSelectedColor(0);
    }, [backendData]);

    const [startTime] = useState(Date.now());

    // ── Progress ──────────────────────────────────────────────────────────────
    const totalArea = useMemo(() => regions.reduce((s, r) => s + r.area, 0), [regions]);

    const filledAreaFraction = useMemo(() => {
        let f = 0;
        for (const r of regions) { if (filledRegions[r.region_id]) f += r.area; }
        return totalArea > 0 ? f / totalArea : 0;
    }, [regions, filledRegions, totalArea]);

    const progress    = Math.round(filledAreaFraction * 100);
    const filledCount = Object.keys(filledRegions).length;
    const isComplete  = filledCount === regions.length;

    // ── Resume from saved state ───────────────────────────────────────────────
    useEffect(() => {
        if (resumeFilledRegions && Object.keys(resumeFilledRegions).length > 0) {
            console.log('[Game] Resuming from saved state');
            Object.keys(resumeFilledRegions).forEach((regionId) => {
                if (resumeFilledRegions[regionId]) fillRegion(Number(regionId));
            });
        }
    }, []);

    // ── Auto-save every 30 s ──────────────────────────────────────────────────
    useEffect(() => {
        if (!savedPaintingId && filledCount > 0 && filledCount < regions.length) {
            const timer = setInterval(() => handleAutoSave(), 30000);
            return () => clearInterval(timer);
        }
    }, [filledCount]);

    // ── Back navigation ───────────────────────────────────────────────────────
    const handleBack = useCallback(() => {
        if (filledCount > 0 && !isComplete) setShowSaveModal(true);
        else navigation.goBack();
    }, [filledCount, isComplete, navigation]);

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleBack();
            return true;
        });
        return () => sub.remove();
    }, [handleBack]);

    const handleAutoSave = () => {
        if (savedPaintingId) updateProgress(savedPaintingId, filledRegions, filledAreaFraction);
    };

    // ── Manual save (captures canvas thumbnail) ───────────────────────────────
    const handleSave = () => {
        let activeThumbnail = backendData.thumbnail_b64 || '';
        try {
            const image = canvasRef.current?.makeImageSnapshot();
            if (image) {
                const b64 = image.encodeToBase64(ImageFormat.JPEG, 10);
                activeThumbnail = `data:image/jpeg;base64,${b64}`;
            }
        } catch (e) {
            console.warn('[GameScreen] Snapshot failed:', e);
        }

        const paintingId = savedPaintingId || savePainting({
            title:         route.params?.title || 'My Painting',
            thumbnailB64:  activeThumbnail,
            progress:      filledAreaFraction,
            filledRegions: filledRegions,
            totalRegions:  regions.length,
            backendData:   backendData,
            lastPlayedAt:  Date.now(),
        });

        if (savedPaintingId) {
            updateProgress(savedPaintingId, filledRegions, filledAreaFraction, activeThumbnail);
        }

        setShowSaveModal(false);
        navigation.goBack();
    };

    const handleDiscard = () => { setShowSaveModal(false); navigation.goBack(); };

    // ── Per-colour region counts ───────────────────────────────────────────────
    const totalByColor = useMemo(() => {
        const c = new Array(palette.length).fill(0);
        for (const r of regions) c[r.color_idx]++;
        return c;
    }, [regions, palette.length]);

    const remainingByColor = useMemo(() => {
        const c = new Array(palette.length).fill(0);
        for (const r of regions) { if (!filledRegions[r.region_id]) c[r.color_idx]++; }
        return c;
    }, [regions, filledRegions, palette.length]);

    const activeColorIndices = useMemo(() => {
        const s = new Set<number>();
        remainingByColor.forEach((c, i) => { if (c > 0) s.add(i); });
        return s;
    }, [remainingByColor]);

    const fullyFilledColorIndices = useMemo(() => {
        const s = new Set<number>();
        palette.forEach((_, i) => {
            if (totalByColor[i] > 0 && remainingByColor[i] === 0) s.add(i);
        });
        return s;
    }, [palette, totalByColor, remainingByColor]);

    // COLOR PALETTE IMPROVEMENTS (A): sort DESCENDING by region count so the
    // most-used colour appears first in the palette scroll.
    const sortedPaletteIndices = useMemo(() =>
        palette.map((_, i) => i)
            .filter(i => totalByColor[i] > 0)
            .sort((a, b) => totalByColor[b] - totalByColor[a]),  // ← was ascending (a-b)
        [palette, totalByColor]
    );

    // ── Shared values for gesture handling ────────────────────────────────────
    const scale      = useSharedValue(1);
    const translateX = useSharedValue(centeredTX);
    const translateY = useSharedValue(centeredTY);
    const savedScale = useSharedValue(1);
    const savedTX    = useSharedValue(centeredTX);
    const savedTY    = useSharedValue(centeredTY);
    const shakeX     = useSharedValue(0);
    const isGesturing  = useSharedValue(0);
    const fillBurstOpacity = useSharedValue(0);
    const fillBurstBlur    = useSharedValue(0);
    const [freshlyFilledId, setFreshlyFilledId] = useState<number | null>(null);

    const shaderUniforms = useDerivedValue(() => ({ u_scale: scale.value * baseScale }));

    const hintGlow     = useSharedValue(0);
    const waveOpacity  = useSharedValue(0);

    // ── Group transform ───────────────────────────────────────────────────────
    const groupTransform = useDerivedValue(() => {
        const s = baseScale * scale.value;
        return [
            { translateX: shakeX.value + translateX.value - minX * s },
            { translateY: translateY.value - minY * s },
            { scale: s },
        ];
    });

    // ── Viewport for culling ──────────────────────────────────────────────────
    const getViewport = useCallback(() => {
        const s = baseScale * scale.value;
        return {
            viewportX: (-translateX.value / s) + minX,
            viewportY: (-translateY.value / s) + minY,
            viewportW: canvasW      / s,
            viewportH: canvasHeight / s,
        };
    }, [baseScale, minX, minY, canvasW, canvasHeight]);

    // ── Recenter button visibility ────────────────────────────────────────────
    const recenterStyle = useAnimatedStyle(() => {
        const displaced =
            Math.abs(translateX.value - centeredTX) > RECENTER_THRESHOLD ||
            Math.abs(translateY.value - centeredTY) > RECENTER_THRESHOLD ||
            scale.value > 1.05;
        return {
            opacity:   withTiming(displaced ? 1 : 0,   { duration: 180 }),
            transform: [{ scale: withTiming(displaced ? 1 : 0.5, { duration: 180 }) }],
        };
    });

    const hintGlowDerived = useDerivedValue(() => hintGlow.value);
    const waveDerived     = useDerivedValue(() => waveOpacity.value);

    // ── Adjacency wave ────────────────────────────────────────────────────────
    const [waveFlashIds, setWaveFlashIds] = useState<Set<number>>(new Set());

    const triggerAdjacencyWave = useCallback((startId: number) => {
        const visited  = new Set<number>([startId]);
        let frontier   = [startId];
        const step = () => {
            if (!frontier.length) return;
            setWaveFlashIds(new Set(frontier));
            waveOpacity.value = 0;
            waveOpacity.value = withSequence(
                withTiming(0.80, { duration: 65,  easing: Easing.out(Easing.cubic) }),
                withTiming(0,    { duration: 200, easing: Easing.in(Easing.quad)   }),
            );
            const next: number[] = [];
            for (const id of frontier) {
                for (const n of ((adjacency ?? {})[String(id)] ?? [])) {
                    if (!visited.has(n)) { visited.add(n); next.push(n); }
                }
            }
            frontier = next;
            if (frontier.length) setTimeout(step, 115);
        };
        setTimeout(step, 55);
    }, [adjacency]);

    // ── Confetti / coins ──────────────────────────────────────────────────────
    const confettiRef  = useRef<any>(null);
    const [coinParticles, setCoinParticles] = useState<CoinParticle[]>([]);
    const coinFrame = useRef<number | null>(null);

    const launchGoldCoins = useCallback(() => {
        if (ConfettiCannon && confettiRef.current) { confettiRef.current.start(); return; }
        const now = Date.now();
        setCoinParticles(Array.from({ length: 26 }, (_, i) => ({
            id: now + i, x: Math.random() * SCREEN_WIDTH, vy: 1.5 + Math.random() * 3, t: 0, rot: Math.random() * 360
        })));
        const ts = Date.now();
        const go = () => {
            if (Date.now() - ts > 2400) { setCoinParticles([]); return; }
            setCoinParticles(p => p.map(c => ({ ...c, t: c.t + 0.016, vy: c.vy + 0.10, rot: c.rot + 4 })));
            coinFrame.current = requestAnimationFrame(go);
        };
        coinFrame.current = requestAnimationFrame(go);
    }, []);

    useEffect(() => () => { if (coinFrame.current) cancelAnimationFrame(coinFrame.current); }, []);

    // ── Hint system ───────────────────────────────────────────────────────────
    const [hintRegionId, setHintRegionId] = useState<number | null>(null);
    const hintTaps = useRef(0);

    const useHint = useCallback(() => {
        const pool = sortedRegions
            .filter(r => r.color_idx === selectedColor && !filledRegions[r.region_id])
            .sort((a, b) => b.hint_priority - a.hint_priority);

        let target = pool[0];
        if (!target) {
            const fallback = sortedRegions.find(r => !filledRegions[r.region_id]);
            if (!fallback) return;
            setSelectedColor(fallback.color_idx);
            target = fallback;
            hintTaps.current = 0;
        }

        hintTaps.current += 1;
        if (hintTaps.current >= 3) {
            handleTap(
                (target.label_x ?? (target.bbox.x + target.bbox.w / 2)) * baseScale + minX * baseScale,
                (target.label_y ?? (target.bbox.y + target.bbox.h / 2)) * baseScale + minY * baseScale,
                true, target.region_id, true
            );
            hintTaps.current = 0;
            setHintRegionId(null);
            return;
        }

        setHintRegionId(target.region_id);
        hintGlow.value = 0;
        hintGlow.value = withRepeat(
            withSequence(
                withTiming(0.92, { duration: 220, easing: Easing.out(Easing.cubic) }),
                withTiming(0.22, { duration: 310, easing: Easing.in(Easing.quad)  }),
            ), 4, true
        );

        const cx = target.label_x ?? (target.bbox.x + target.bbox.w / 2);
        const cy = target.label_y ?? (target.bbox.y + target.bbox.h / 2);

        scale.value = withTiming(2.5, { duration: 400, easing: Easing.out(Easing.cubic) });
        savedScale.value = 2.5;
        translateX.value = withTiming(-(cx - minX) * baseScale * 2.5 + canvasW      / 2, { duration: 400, easing: Easing.out(Easing.cubic) });
        translateY.value = withTiming(-(cy - minY) * baseScale * 2.5 + canvasHeight / 2, { duration: 400, easing: Easing.out(Easing.cubic) });

        setTimeout(() => {
            setHintRegionId(null);
            hintGlow.value = withTiming(0, { duration: 150 });
            savedTX.value  = translateX.value;
            savedTY.value  = translateY.value;
        }, 2000);
    }, [sortedRegions, selectedColor, filledRegions, baseScale, minX, minY, canvasW, canvasHeight]);

    // ── Game completion ───────────────────────────────────────────────────────
    const onGameCompleted = useCallback((lastId: number) => {
        playFanfare();
        launchGoldCoins();
        triggerAdjacencyWave(lastId);

        const t       = Math.floor((Date.now() - startTime) / 1000);
        const score   = 1000 + regions.length * 5 + Math.max(0, 120 - t) * 10;
        const coinsEarned = Math.floor(score / 50);

        addSessionScore(score);
        addSessionCoins(coinsEarned);
        endGame(true);

        setTimeout(() => navigation.replace('VictoryScreen', {
            score,
            coins: coinsEarned,
            timeTaken: t
        }), 2800);
    }, [startTime, regions.length, navigation, addSessionScore, addSessionCoins, endGame, triggerAdjacencyWave, launchGoldCoins]);

    // ── Particles ─────────────────────────────────────────────────────────────
    const [particles, setParticles] = useState<{ id: number; cx: number; cy: number; startTime: number; }[]>([]);

    const spawnParticles = useCallback((cx: number, cy: number) => {
        const now = Date.now();
        setParticles(p => [...p, ...Array.from({ length: 10 }, (_, i) => ({ id: now + i, cx, cy, startTime: now }))]);
        setTimeout(() => setParticles(p => p.filter(x => x.startTime !== now)), 420);
    }, []);

    // ── FIX CANVAS RECENTERING ────────────────────────────────────────────────
    // Reset to the pre-computed centred translations so the canvas sits exactly
    // in the middle of the available area, not shifted to the left/top.
    const recenterCanvas = useCallback(() => {
        scale.value      = withSpring(1,          { damping: 16, stiffness: 130 });
        translateX.value = withSpring(centeredTX, { damping: 16, stiffness: 130 });
        translateY.value = withSpring(centeredTY, { damping: 16, stiffness: 130 });
        savedScale.value = 1;
        savedTX.value    = centeredTX;
        savedTY.value    = centeredTY;
    }, [centeredTX, centeredTY]);

    // ── Gestures ──────────────────────────────────────────────────────────────
    const pinch = Gesture.Pinch()
        .onBegin(() => { isGesturing.value = 1; })
        .onUpdate(e => { scale.value = clamp(savedScale.value * e.scale, 0.5, 8); })
        .onEnd(() => { savedScale.value = scale.value; isGesturing.value = 0; });

    const pan = Gesture.Pan()
        .minDistance(1)
        .averageTouches(true)
        .onBegin(() => { isGesturing.value = 1; })
        .onUpdate(e => {
            translateX.value = savedTX.value + e.translationX;
            translateY.value = savedTY.value + e.translationY;
        })
        .onEnd(() => {
            savedTX.value = translateX.value;
            savedTY.value = translateY.value;
            isGesturing.value = 0;
        });

    // ── Tap handler ───────────────────────────────────────────────────────────
    const lastTapTime = useRef(0);

    const handleTap = useCallback((
        touchX: number, touchY: number,
        forceDirectId: boolean = false, directId: number = 0,
        isHintAutomated: boolean = false
    ) => {
        const now = Date.now();
        if (now - lastTapTime.current < DEBOUNCE_MS && !forceDirectId) return;
        lastTapTime.current = now;
        if (isComplete) return;

        let regionId = 0;
        const s = baseScale * scale.value;

        if (forceDirectId) {
            regionId = directId;
        } else {
            const canvasX = (touchX - translateX.value) / s + minX;
            const canvasY = (touchY - translateY.value) / s + minY;
            const adaptiveRadius = clamp(TAP_ASSIST_RADIUS / scale.value, 4, 16);
            regionId = tapDetector.getRegionIdWithAssist(canvasX, canvasY, adaptiveRadius);
        }

        if (regionId === 0) return;

        const hitRegion = regionById.get(regionId);
        if (!hitRegion || filledRegions[hitRegion.region_id]) return;

        if (hitRegion.color_idx !== selectedColor && !isHintAutomated) {
            haptic.error();
            shakeX.value = withSequence(
                withTiming(-5, { duration: 18 }),
                withTiming(5,  { duration: 18 }),
                withTiming(-3, { duration: 18 }),
                withTiming(3,  { duration: 18 }),
                withTiming(0,  { duration: 36 }),
            );
            return;
        }

        playSquash();
        console.log(`[DEBUG] Filling region ID: ${hitRegion.region_id}, Color Index: ${hitRegion.color_idx}`);
        fillRegion(hitRegion.region_id);
        runOnJS(setFreshlyFilledId)(hitRegion.region_id);
        fillBurstOpacity.value = 0.7;
        fillBurstBlur.value    = 8;
        fillBurstOpacity.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) });
        fillBurstBlur.value    = withTiming(0, { duration: 350 });
        setTimeout(() => runOnJS(setFreshlyFilledId)(null), 400);

        addSessionScore(10);

        const newRem = remainingByColor[hitRegion.color_idx] - 1;
        if (newRem <= 0) {
            haptic.success();
            playChime();
            const currentIdxInSorted = sortedPaletteIndices.indexOf(hitRegion.color_idx);
            const nextColor = sortedPaletteIndices.find((idx, pos) =>
                pos > currentIdxInSorted && activeColorIndices.has(idx) && idx !== hitRegion.color_idx
            ) ?? sortedPaletteIndices.find(idx =>
                activeColorIndices.has(idx) && idx !== hitRegion.color_idx
            );
            if (nextColor !== undefined) setTimeout(() => setSelectedColor(nextColor), 200);
        }

        if (filledCount + 1 >= regions.length) onGameCompleted(hitRegion.region_id);
    }, [
        isComplete, baseScale, scale, translateX, translateY, minX, minY,
        tapDetector, regionById, filledRegions, selectedColor, palette,
        fillRegion, remainingByColor, sortedPaletteIndices, activeColorIndices,
        filledCount, regions.length, onGameCompleted, setSelectedColor
    ]);

    const tapGesture  = Gesture.Tap().onEnd(e => { runOnJS(handleTap)(e.x, e.y); });
    const allGestures = Gesture.Race(tapGesture, Gesture.Simultaneous(pinch, pan));

    // ─── Render ───────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.container}>

                {/* ── Header ─────────────────────────────────────────────── */}
                <View style={styles.header}>
                    {/* Back button */}
                    <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
                        <Icon name="arrow-left" size={26} color="#333" />
                    </TouchableOpacity>

                    {/* Progress bar */}
                    <GameProgressBar progress={progress} />

                    {/* ADD SOUND TOGGLE IN GAME SCREEN
                        Uses the global AudioManager state so muting here also
                        mutes on the Home Screen, and vice-versa. */}
                    <TouchableOpacity
                        style={styles.headerBtn}
                        onPress={() => {
                            const newMuted = AudioManager.toggleMute();
                            setIsMuted(newMuted);
                        }}
                    >
                        <Icon
                            name={isMuted ? 'volume-off' : 'volume-high'}
                            size={22}
                            color="#333"
                        />
                    </TouchableOpacity>

                    {/* Hint button */}
                    <TouchableOpacity style={styles.headerBtn} onPress={useHint}>
                        <Text style={{ fontSize: 20 }}>💡</Text>
                    </TouchableOpacity>
                </View>

                {/* ── FIT CANVAS WITHIN SAFE AREA ────────────────────────── */}
                {/* The container occupies all remaining flex space; the canvas
                    is centred inside it and never overlaps the header or palette. */}
                <View style={styles.canvasContainer}>
                    <GestureDetector gesture={allGestures}>
                        <View style={{ width: canvasW, height: canvasHeight }}>
                            <Canvas
                                style={{ width: canvasW, height: canvasHeight }}
                                ref={canvasRef}
                            >
                                <Group transform={groupTransform}>
                                    {/*
                                     * SINGLE LAYER RENDERING — V11 architecture preserved.
                                     * COLOR PALETTE IMPROVEMENTS (C): number labels are
                                     * intentionally NOT rendered here — the labelFont /
                                     * labelFontSize values are computed for future use
                                     * but no SkiaText elements are placed on the canvas.
                                     */}
                                    {sortedRegions.map((r) => {
                                        const isFilled        = filledRegions[r.region_id];
                                        const isUnfilled      = !isFilled;
                                        const isSelectedColor = r.color_idx === selectedColor && !isFilled;
                                        const isHinted        = hintRegionId === r.region_id && !isFilled;
                                        const isWaveTarget    = waveFlashIds.has(r.region_id);

                                        const path = pathCache.getPath(r);
                                        if (!path) return null;

                                        return (
                                            <React.Fragment key={r.region_id}>
                                                {/* Solid white base for unfilled regions */}
                                                {isUnfilled && (
                                                    <Path path={path} color="#FFFFFF" style="fill" />
                                                )}

                                                {/* Sketch overlay for selected colour */}
                                                {isSelectedColor && (
                                                    <Path path={path}>
                                                        {sketchShader && (
                                                            <Shader source={sketchShader!} uniforms={shaderUniforms} />
                                                        )}
                                                    </Path>
                                                )}

                                                {/* Filled colour layer */}
                                                {isFilled && (
                                                    <>
                                                        <Path
                                                            path={path}
                                                            color={palette[r.color_idx % palette.length]}
                                                            style="fill"
                                                        />
                                                        {/* Ink-bleed burst on freshly filled region */}
                                                        {freshlyFilledId === r.region_id && (
                                                            <Path
                                                                path={path}
                                                                color={palette[r.color_idx % palette.length]}
                                                                style="fill"
                                                                opacity={fillBurstOpacity}
                                                            >
                                                                <BlurMask blur={fillBurstBlur} style="solid" />
                                                            </Path>
                                                        )}
                                                    </>
                                                )}

                                                {/* Hint glow */}
                                                {isHinted && (
                                                    <Path
                                                        path={path}
                                                        color={HIGHLIGHT_COLOR}
                                                        style="fill"
                                                        opacity={hintGlowDerived}
                                                    >
                                                        <BlurMask blur={10} style="outer" />
                                                    </Path>
                                                )}

                                                {/* Adjacency wave flash */}
                                                {isWaveTarget && (
                                                    <Path path={path} color="white" style="fill" opacity={waveDerived} />
                                                )}

                                                {/* Sketch stroke outline */}
                                                {isUnfilled && (
                                                    <Path
                                                        path={path}
                                                        color="#6E6E6E"
                                                        style="stroke"
                                                        strokeWidth={1.2}
                                                        strokeCap="round"
                                                        strokeJoin="round"
                                                        opacity={0.9}
                                                    />
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </Group>
                            </Canvas>

                            {/* Coin particle overlay */}
                            {coinParticles.length > 0 && (
                                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                                    {coinParticles.map(c => (
                                        <View key={c.id} style={{
                                            position: 'absolute',
                                            left: c.x,
                                            top:  c.t * c.vy * 55,
                                            transform: [{ rotate: `${c.rot}deg` }],
                                            opacity: Math.max(0, 1 - c.t / 2),
                                        }}>
                                            <Text style={{ fontSize: 20 }}>🪙</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </GestureDetector>

                    {/* Recenter button — shown when canvas has been panned/zoomed */}
                    <Animated.View style={[styles.recenterBtn, recenterStyle]} pointerEvents="box-none">
                        <TouchableOpacity
                            onPress={recenterCanvas}
                            style={styles.recenterInner}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        >
                            <Text style={styles.recenterText}>⊙</Text>
                        </TouchableOpacity>
                    </Animated.View>

                    {ConfettiCannon && (
                        <ConfettiCannon
                            ref={confettiRef}
                            count={80}
                            origin={{ x: SCREEN_WIDTH / 2, y: -10 }}
                            colors={['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#7C3AED']}
                            autoStart={false}
                            fadeOut
                        />
                    )}
                </View>

                {/* ── Colour Palette ─────────────────────────────────────── */}
                {/* COLOR PALETTE IMPROVEMENTS:
                    - Colours sorted descending by region count (A).
                    - Each swatch shows region count label above the circle (B).
                    - No number labels on canvas regions (C). */}
                <View style={styles.paletteContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.palette}
                    >
                        {sortedPaletteIndices.map((i) => (
                            <PaletteSwatch
                                key={i}
                                colorHex={palette[i]}
                                regionCount={totalByColor[i]}
                                isSelected={selectedColor === i}
                                isDone={!activeColorIndices.has(i)}
                                onPress={() => setSelectedColor(i)}
                            />
                        ))}
                    </ScrollView>
                </View>

                {/* Save Progress Modal */}
                <SaveProgressModal
                    visible={showSaveModal}
                    progress={progress}
                    onSave={handleSave}
                    onDiscard={handleDiscard}
                    onCancel={() => setShowSaveModal(false)}
                />
            </View>
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        height: HEADER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,       // tighter padding to fit 4 items
        backgroundColor: '#2c2c2c',
        elevation: 4,
        zIndex: 100,
    },
    headerBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        elevation: 3,
    },
    // FIT CANVAS WITHIN SAFE AREA: flex:1 lets the container take all available
    // height between header and palette; canvas is centred inside it.
    canvasContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    paletteContainer: {
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#E0E0E0',
        paddingVertical: 8,
        overflow: 'hidden',
    },
    palette: {
        paddingHorizontal: 12,
        gap: 10,
        alignItems: 'flex-end',  // anchor swatches to bottom so count labels expand upward
    },
    // COLOR PALETTE IMPROVEMENTS: wrapper stacks count label above the circle
    swatchWrapper: {
        alignItems: 'center',
        gap: 2,
    },
    swatchCountLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#444',
        textAlign: 'center',
        minWidth: 24,
    },
    colorSwatch: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    swatchStar: {
        fontSize: 18,
    },
    recenterBtn: {
        position: 'absolute',
        bottom: 14,
        right: 14,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.65)',
        elevation: 8,
        zIndex: 99,
    },
    recenterInner: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    recenterText: {
        fontSize: 22,
        color: '#FFF',
    },
});

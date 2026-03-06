console.log("GAME SCREEN V6 — STAGE 11 PREMIUM MICRO-UX");
import React, { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, Alert, Vibration } from 'react-native';
import { Canvas, Path, Skia, Group, Circle, ColorMatrix } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    runOnJS,
    useAnimatedStyle,
    clamp,
    useDerivedValue,
    withTiming,
    withRepeat,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { useGameStore } from '../store/useGameStore';
import { SafeAreaView } from 'react-native-safe-area-context';
import GameProgressBar from '../components/GameProgressBar';
// Haptic helper using built-in Vibration (no native rebuild needed)
const haptic = {
    error: () => Vibration.vibrate(50),
    success: () => Vibration.vibrate([0, 30, 30, 30]),
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Types ────────────────────────────────────────────────────────────────────
interface Region {
    id: number;
    parentId: number | null;
    children: number[];
    colorIndex: number;
    path: string;
    boundingBox: { x: number; y: number; w: number; h: number };
    centroid: { x: number; y: number };
    area?: number;
    numberPosition?: { x: number; y: number };
}

interface BackendData {
    width: number;
    height: number;
    outlinePath?: string;
    regions: Region[];
    palette: string[];
    meta?: { regionCount: number; processingTimeMs: number };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const TAP_ASSIST_RADIUS = 12;
const MIN_LABEL_PX = 24;
const DEBOUNCE_MS = 40;
const MAX_PATHS_PER_FRAME = 80;

/** Check if point is inside a bounding box (fast pre-filter) */
function pointInBBox(x: number, y: number, bb: Region['boundingBox'], margin = 0): boolean {
    return x >= bb.x - margin && x <= bb.x + bb.w + margin &&
        y >= bb.y - margin && y <= bb.y + bb.h + margin;
}

/** Squared distance from point to nearest edge of bounding box */
function distToBBox(x: number, y: number, bb: Region['boundingBox']): number {
    const dx = Math.max(bb.x - x, 0, x - (bb.x + bb.w));
    const dy = Math.max(bb.y - y, 0, y - (bb.y + bb.h));
    return Math.sqrt(dx * dx + dy * dy);
}

// ─── NumberHint (Stage 11: Adaptive font, white halo, visibility rules) ─────
const NumberHint = React.memo(({
    label, bx, by, bw, bh, area,
    minX, minY, baseScale, extraX, extraY,
    canvasWidth, canvasHeight,
    scaleShared, translateXShared, translateYShared,
    isFilled,
}: {
    label: number;
    bx: number; by: number; bw: number; bh: number;
    area: number;
    minX: number; minY: number;
    baseScale: number; extraX: number; extraY: number;
    canvasWidth: number; canvasHeight: number;
    scaleShared: any; translateXShared: any; translateYShared: any;
    isFilled: boolean;
}) => {
    const cx = bx + bw / 2;
    const cy = by + bh / 2;
    const minSide = Math.min(bw, bh);

    const style = useAnimatedStyle(() => {
        const s = scaleShared.value;
        const totalScale = baseScale * s;
        const screenX = (cx - minX) * totalScale + translateXShared.value + extraX;
        const screenY = (cy - minY) * totalScale + translateYShared.value + extraY;

        // Visibility: region must be large enough on screen
        const isVisible = minSide * totalScale >= MIN_LABEL_PX && s >= 0.8;
        const outsideCanvas =
            screenX < -20 || screenX > canvasWidth + 20 ||
            screenY < -20 || screenY > canvasHeight + 20;

        return {
            transform: [
                { translateX: screenX - 10 },
                { translateY: screenY - 8 },
            ],
            opacity: (!outsideCanvas && isVisible && !isFilled) ? 1 : 0,
        };
    });

    return (
        <Animated.View pointerEvents="none" style={[styles.numberHintWrap, style]}>
            <Text style={styles.numberHintText}>{label}</Text>
        </Animated.View>
    );
});

// ─── Outer shell ──────────────────────────────────────────────────────────────
export const GameScreen = ({ route, navigation }: any) => {
    const backendData: BackendData | undefined = route.params?.data;

    if (!backendData || !backendData.regions || backendData.regions.length === 0) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text>Loading…</Text>
            </View>
        );
    }

    return <GameContent backendData={backendData} navigation={navigation} />;
};

// ─── Inner component ──────────────────────────────────────────────────────────
const GameContent = ({
    backendData,
    navigation,
}: {
    backendData: BackendData;
    navigation: any;
}) => {
    const regions = backendData.regions;
    const palette = backendData.palette;
    const backendW = backendData.width;
    const backendH = backendData.height;
    const outlinePath = backendData.outlinePath;

    // ── Layout math ──────────────────────────────────────────────────────────
    const canvasW = SCREEN_WIDTH - 20;
    const baseScale = canvasW / backendW;
    const canvasHeight = canvasW * (backendH / backendW);
    const extraX = (SCREEN_WIDTH - backendW * baseScale) / 2;
    const extraY = (canvasHeight - backendH * baseScale) / 2;

    // ── Path bounds ──────────────────────────────────────────────────────────
    const minX = useMemo(() => Math.min(...regions.map((r) => r.boundingBox.x)), [regions]);
    const minY = useMemo(() => Math.min(...regions.map((r) => r.boundingBox.y)), [regions]);

    // ── Stage 11: Path Cache (pre-parse once) ────────────────────────────────
    const skiaRegions = useMemo(() => {
        const parents = regions.filter((r) => r.parentId == null);
        const children = regions.filter((r) => r.parentId != null);
        return [...parents, ...children].map((r) => ({
            ...r,
            skPath: Skia.Path.MakeFromSVGString(r.path),
        }));
    }, [regions]);

    const skiaOutlinePath = useMemo(
        () => (outlinePath ? Skia.Path.MakeFromSVGString(outlinePath) : null),
        [outlinePath],
    );

    // ── Zustand ───────────────────────────────────────────────────────────────
    const selectedColor = useGameStore((s) => s.selectedColor);
    const setSelectedColor = useGameStore((s) => s.setSelectedColor);
    const filledRegions = useGameStore((s) => s.filledRegions);
    const fillRegion = useGameStore((s) => s.fillRegion);
    const resetFilledRegions = useGameStore((s) => s.resetFilledRegions);
    const setScore = useGameStore((s) => s.setScore);
    const addCoins = useGameStore((s) => s.addCoins);

    // ── Stage 11: 3-Stage Progressive Rendering (LOD) ────────────────────────
    const [lodStage, setLodStage] = useState(0);

    useEffect(() => {
        resetFilledRegions();
        setSelectedColor(0); // Reset to first color on game start
        const t1 = setTimeout(() => setLodStage(1), 200);
        const t2 = setTimeout(() => setLodStage(2), 400);
        return () => { clearTimeout(t1); clearTimeout(t2); };
    }, [backendData]);

    // ── Timer ─────────────────────────────────────────────────────────────────
    const [startTime] = useState(Date.now());

    // ── Completion detection ──────────────────────────────────────────────────
    const filledCount = Object.keys(filledRegions).length;
    const progress = Math.round((filledCount / regions.length) * 100);
    const isComplete = filledCount === regions.length;

    // ── Stage 11: Remaining count per color (for palette psychology) ─────────
    // Track TOTAL regions per color (never changes) and REMAINING (unfilled)
    const totalByColor = useMemo(() => {
        const counts: number[] = new Array(palette.length).fill(0);
        for (const r of regions) counts[r.colorIndex]++;
        return counts;
    }, [regions, palette.length]);

    const remainingByColor = useMemo(() => {
        const counts: number[] = new Array(palette.length).fill(0);
        for (const r of regions) {
            if (!filledRegions[r.id]) counts[r.colorIndex]++;
        }
        return counts;
    }, [regions, filledRegions, palette.length]);

    const activeColorIndices = useMemo(() => {
        const s = new Set<number>();
        remainingByColor.forEach((c, i) => { if (c > 0) s.add(i); });
        return s;
    }, [remainingByColor]);

    // ── Stage 11: Palette — only show colors that have regions, sort by remaining
    const sortedPaletteIndices = useMemo(() => {
        return palette
            .map((_, i) => i)
            .filter(i => totalByColor[i] > 0)  // Hide unused colors
            .sort((a, b) => remainingByColor[a] - remainingByColor[b]);
    }, [palette, remainingByColor, totalByColor]);

    // ── Stage 11: Completion reveal state ─────────────────────────────────────
    const [revealPhase, setRevealPhase] = useState<0 | 1 | 2 | 3>(0);
    const grayscaleAmt = useSharedValue(0);
    const sweepProgress = useSharedValue(0);

    const grayscaleMatrix = useDerivedValue(() => {
        const g = grayscaleAmt.value;
        const r = 1 - g;
        const v = 0.33 * g;
        return [
            r + v, v, v, 0, 0,
            v, r + v, v, 0, 0,
            v, v, r + v, 0, 0,
            0, 0, 0, 1, 0,
        ];
    });

    const onGameCompleted = useCallback(() => {
        const endTime = Date.now();
        const timeTaken = Math.floor((endTime - startTime) / 1000);
        const baseScoreVal = 1000;
        const regionBonus = regions.length * 5;
        const speedBonus = Math.max(0, 120 - timeTaken) * 10;
        const totalScore = baseScoreVal + regionBonus + speedBonus;
        const coins = Math.floor(totalScore / 50);
        setScore(totalScore);
        addCoins(coins);
        navigation.replace('VictoryScreen', { score: totalScore, coins, timeTaken });
    }, [startTime, regions.length, navigation, setScore, addCoins]);

    useEffect(() => {
        if (isComplete && regions.length > 0 && revealPhase === 0) {
            // Stage 11: 3-Stage Completion Reveal
            setRevealPhase(1);
            // 1) Grayscale freeze
            grayscaleAmt.value = withTiming(1, { duration: 400 });
            const t1 = setTimeout(() => {
                setRevealPhase(2);
                // 2) Sweep color back (left to right via grayscale removal)
                grayscaleAmt.value = withTiming(0, { duration: 1200 });
            }, 600);
            const t2 = setTimeout(() => {
                setRevealPhase(3);
                onGameCompleted();
            }, 2000);
            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [isComplete]);

    // ── Stage 11: Smart Hint System ──────────────────────────────────────────
    const hintPulseScale = useSharedValue(1);
    const [hintRegionId, setHintRegionId] = useState<number | null>(null);

    const useHint = useCallback(() => {
        // Find nearest unfilled region matching selectedColor
        const candidates = skiaRegions.filter(
            r => r.colorIndex === selectedColor && !filledRegions[r.id]
        );
        if (candidates.length === 0) {
            // Fallback: fill any unfilled
            const any = skiaRegions.find(r => !filledRegions[r.id]);
            if (any) fillRegion(any.id);
            return;
        }
        // Sort by distance to canvas center
        const centerX = backendW / 2;
        const centerY = backendH / 2;
        candidates.sort((a, b) => {
            const da = Math.pow(a.centroid.x - centerX, 2) + Math.pow(a.centroid.y - centerY, 2);
            const db = Math.pow(b.centroid.x - centerX, 2) + Math.pow(b.centroid.y - centerY, 2);
            return da - db;
        });
        const target = candidates[0];
        setHintRegionId(target.id);
        // Animate pulse 1->1.2->1 x3
        hintPulseScale.value = 1;
        hintPulseScale.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 150 }),
                withTiming(1, { duration: 150 }),
            ), 3, false
        );
        // Auto-zoom camera to target
        const totalScale = baseScale * 2;
        scale.value = withTiming(2, { duration: 450, easing: Easing.out(Easing.cubic) });
        savedScale.value = 2;
        translateX.value = withTiming(
            -extraX - (target.centroid.x - minX) * totalScale + SCREEN_WIDTH / 2,
            { duration: 450, easing: Easing.out(Easing.cubic) }
        );
        translateY.value = withTiming(
            -extraY - (target.centroid.y - minY) * totalScale + canvasHeight / 2,
            { duration: 450, easing: Easing.out(Easing.cubic) }
        );
        // Clear hint highlight after animation
        setTimeout(() => {
            setHintRegionId(null);
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        }, 1000);
    }, [skiaRegions, selectedColor, filledRegions, baseScale, minX, minY, extraX, extraY, canvasHeight]);

    // ── Back button with alert ────────────────────────────────────────────────
    const handleBack = () => {
        Alert.alert('Exit Painting', 'Your progress will be lost.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', onPress: () => navigation.goBack() },
        ]);
    };

    // ── Hint-Only Highlight Pulse (only glows when hint is active) ─────────
    const pulseOpacity = useSharedValue(0);
    useEffect(() => {
        if (hintRegionId !== null) {
            pulseOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.5, { duration: 400, easing: Easing.inOut(Easing.ease) }),
                    withTiming(0.15, { duration: 400, easing: Easing.inOut(Easing.ease) }),
                ), -1, true,
            );
        } else {
            pulseOpacity.value = withTiming(0, { duration: 200 });
        }
    }, [hintRegionId]);
    const pulseOpacityDerived = useDerivedValue(() => pulseOpacity.value);

    // ── Zoom / pan shared values ─────────────────────────────────────────────
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);
    // Stage 11: Shake animation X offset
    const shakeX = useSharedValue(0);

    // ── Gestures ──────────────────────────────────────────────────────────────
    const pinch = Gesture.Pinch()
        .onUpdate((e) => { scale.value = clamp(savedScale.value * e.scale, 1, 4); })
        .onEnd(() => { savedScale.value = scale.value; });

    const pan = Gesture.Pan()
        .averageTouches(true)
        .onUpdate((e) => {
            translateX.value = savedTranslateX.value + e.translationX;
            translateY.value = savedTranslateY.value + e.translationY;
        })
        .onEnd(() => {
            savedTranslateX.value = translateX.value;
            savedTranslateY.value = translateY.value;
        });

    // ── Flood Fill Animation State (from Stage 8) ─────────────────────────────
    const [fillAnimRegion, setFillAnimRegion] = React.useState<{
        id: number; cx: number; cy: number; maxR: number; color: string;
    } | null>(null);
    const fillAnimRadius = useSharedValue(0);
    const fillAnimRadiusDerived = useDerivedValue(() => fillAnimRadius.value);

    // ── Stage 11: Particle Sparkle State ──────────────────────────────────────
    const [particles, setParticles] = useState<{
        id: number; cx: number; cy: number; startTime: number;
    }[]>([]);

    const spawnParticles = useCallback((cx: number, cy: number) => {
        const now = Date.now();
        const newParticles = Array.from({ length: 12 }, (_, i) => ({
            id: now + i, cx, cy, startTime: now,
        }));
        setParticles(prev => [...prev, ...newParticles]);
        // Auto-cleanup after 400ms
        setTimeout(() => {
            setParticles(prev => prev.filter(p => p.startTime !== now));
        }, 450);
    }, []);

    // ── Stage 11: Debounce ref ────────────────────────────────────────────────
    const lastTapTime = useRef(0);

    // ── Tap hit-test (Stage 11: BBox pre-check + Tap Assist + Color Lock) ────
    const handleTap = useCallback((touchX: number, touchY: number) => {
        // Stage 11: 40ms debounce
        const now = Date.now();
        if (now - lastTapTime.current < DEBOUNCE_MS) return;
        lastTapTime.current = now;

        if (isComplete) return;

        const totalScale = baseScale * scale.value;
        const canvasX = (touchX - translateX.value - extraX) / totalScale + minX;
        const canvasY = (touchY - translateY.value - extraY) / totalScale + minY;

        let hitRegion: typeof skiaRegions[0] | null = null;

        // Stage 11: Bounding box pre-check + path.contains
        for (let i = skiaRegions.length - 1; i >= 0; i--) {
            const r = skiaRegions[i];
            if (!pointInBBox(canvasX, canvasY, r.boundingBox)) continue;
            if (r.skPath?.contains(canvasX, canvasY)) {
                hitRegion = r;
                break;
            }
        }

        // Stage 11: Tap Assist — if miss, find nearest within 12px
        if (!hitRegion) {
            let bestDist = TAP_ASSIST_RADIUS + 1;
            for (const r of skiaRegions) {
                if (filledRegions[r.id]) continue;
                const dist = distToBBox(canvasX, canvasY, r.boundingBox);
                if (dist < bestDist) {
                    // Verify path actually contains centroid (sanity check)
                    if (r.skPath?.contains(r.centroid.x, r.centroid.y)) {
                        bestDist = dist;
                        hitRegion = r;
                    }
                }
            }
        }

        if (!hitRegion) return;

        // Already filled
        if (filledRegions[hitRegion.id]) return;

        // Stage 11: Color Lock Error
        if (hitRegion.colorIndex !== selectedColor) {
            haptic.error();
            // 120ms X-axis shake
            shakeX.value = withSequence(
                withTiming(-3, { duration: 20 }),
                withTiming(3, { duration: 20 }),
                withTiming(-2, { duration: 20 }),
                withTiming(2, { duration: 20 }),
                withTiming(0, { duration: 40 }),
            );
            return;
        }

        // ── Correct color match — fill with animation ─────────────────────
        const bb = hitRegion.boundingBox;
        const maxRadius = Math.sqrt(bb.w * bb.w + bb.h * bb.h);
        const color = palette[hitRegion.colorIndex % palette.length];

        setFillAnimRegion({ id: hitRegion.id, cx: canvasX, cy: canvasY, maxR: maxRadius, color });
        fillAnimRadius.value = 0;
        fillAnimRadius.value = withTiming(maxRadius, {
            duration: 180, easing: Easing.out(Easing.cubic),
        });

        // Stage 11: Spawn particles at centroid
        const totalS = baseScale * scale.value;
        const particleScreenX = (hitRegion.centroid.x - minX) * totalS + translateX.value + extraX;
        const particleScreenY = (hitRegion.centroid.y - minY) * totalS + translateY.value + extraY;
        spawnParticles(particleScreenX, particleScreenY);

        setTimeout(() => {
            fillRegion(hitRegion!.id);
            setFillAnimRegion(null);

            // Stage 11: Check if this color is now complete
            const newRemaining = remainingByColor[hitRegion!.colorIndex] - 1;
            if (newRemaining <= 0) {
                // Color complete haptic
                haptic.success();
            }
        }, 180);
    }, [isComplete, baseScale, scale, translateX, translateY, extraX, extraY, minX, minY,
        skiaRegions, filledRegions, selectedColor, palette, fillRegion, remainingByColor, spawnParticles]);

    const tap = Gesture.Tap().onEnd((e) => { runOnJS(handleTap)(e.x, e.y); });
    const allGestures = Gesture.Race(tap, Gesture.Simultaneous(pinch, pan));

    // ── Skia group transform (includes shake) ────────────────────────────────
    const groupTransform = useDerivedValue(() => {
        const s = baseScale * scale.value;
        return [
            { translateX: shakeX.value + translateX.value + extraX - minX * s },
            { translateY: translateY.value + extraY - minY * s },
            { scale: s },
        ];
    });

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.container}>

                {/* Header with Progress Bar */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.headerBtn}>
                        <Text style={{ fontSize: 24, color: '#333', lineHeight: 28 }}>←</Text>
                    </TouchableOpacity>

                    <GameProgressBar progress={progress} />

                    <TouchableOpacity style={styles.headerBtn} onPress={useHint}>
                        <Text style={{ fontSize: 20 }}>💡</Text>
                    </TouchableOpacity>
                </View>

                {/* Canvas area */}
                <View style={styles.canvasContainer}>
                    <GestureDetector gesture={allGestures}>
                        <View style={{ width: SCREEN_WIDTH, height: canvasHeight }}>
                            <Canvas style={{ width: SCREEN_WIDTH, height: canvasHeight }}>
                                <Group transform={groupTransform}>
                                    {/* Stage 11: Grayscale overlay for completion reveal */}
                                    {revealPhase > 0 && <ColorMatrix matrix={grayscaleMatrix} />}

                                    {/* Region fills — LOD stage 1+ */}
                                    {lodStage >= 1 && skiaRegions.map((r, idx) => {
                                        // Stage 11: Frame budget protection
                                        if (lodStage === 1 && idx >= MAX_PATHS_PER_FRAME) return null;
                                        return (
                                            <Path
                                                key={`fill-${r.id}`}
                                                path={r.skPath!}
                                                color={filledRegions[r.id]
                                                    ? palette[r.colorIndex % palette.length]
                                                    : 'white'}
                                                style="fill"
                                            />
                                        );
                                    })}

                                    {/* Hint-only pulse highlight — only the hinted region glows */}
                                    {hintRegionId !== null && skiaRegions.map((r) => {
                                        if (r.id !== hintRegionId) return null;
                                        if (filledRegions[r.id]) return null;
                                        return (
                                            <Path
                                                key={`pulse-${r.id}`}
                                                path={r.skPath!}
                                                color={palette[r.colorIndex % palette.length]}
                                                style="fill"
                                                opacity={pulseOpacityDerived}
                                            />
                                        );
                                    })}

                                    {/* Flood fill expanding circle */}
                                    {fillAnimRegion && (() => {
                                        const animRegion = skiaRegions.find(r => r.id === fillAnimRegion.id);
                                        if (!animRegion?.skPath) return null;
                                        return (
                                            <Group clip={animRegion.skPath}>
                                                <Circle
                                                    cx={fillAnimRegion.cx}
                                                    cy={fillAnimRegion.cy}
                                                    r={fillAnimRadiusDerived}
                                                    color={fillAnimRegion.color}
                                                />
                                            </Group>
                                        );
                                    })()}

                                    {/* Region borders */}
                                    {skiaRegions.map((r) => (
                                        <Path
                                            key={`stroke-${r.id}`}
                                            path={r.skPath!}
                                            color="#333333"
                                            style="stroke"
                                            strokeWidth={0.8}
                                        />
                                    ))}

                                    {/* Main outline */}
                                    {skiaOutlinePath && (
                                        <Path
                                            path={skiaOutlinePath}
                                            color="black"
                                            style="stroke"
                                            strokeWidth={1.5}
                                        />
                                    )}
                                </Group>
                            </Canvas>

                            {/* Number hints — LOD stage 2 */}
                            {lodStage >= 2 && (
                                <View
                                    pointerEvents="none"
                                    style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
                                >
                                    {skiaRegions.map((r) => {
                                        if (filledRegions[r.id]) return null;
                                        const regionArea = r.area || (r.boundingBox.w * r.boundingBox.h);
                                        return (
                                            <NumberHint
                                                key={`num-${r.id}`}
                                                label={(r.colorIndex % palette.length) + 1}
                                                bx={r.boundingBox.x}
                                                by={r.boundingBox.y}
                                                bw={r.boundingBox.w}
                                                bh={r.boundingBox.h}
                                                area={regionArea}
                                                minX={minX}
                                                minY={minY}
                                                baseScale={baseScale}
                                                extraX={extraX}
                                                extraY={extraY}
                                                canvasWidth={SCREEN_WIDTH}
                                                canvasHeight={canvasHeight}
                                                scaleShared={scale}
                                                translateXShared={translateX}
                                                translateYShared={translateY}
                                                isFilled={!!filledRegions[r.id]}
                                            />
                                        );
                                    })}
                                </View>
                            )}

                            {/* Stage 11: Particle Sparkles */}
                            {particles.length > 0 && (
                                <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                                    {particles.map((p) => {
                                        const age = Date.now() - p.startTime;
                                        const t = Math.min(age / 400, 1);
                                        const angle = (p.id % 12) * (Math.PI * 2 / 12);
                                        const speed = 30 + (p.id % 5) * 20;
                                        const ox = Math.cos(angle) * speed * t;
                                        const oy = Math.sin(angle) * speed * t;
                                        const opacity = 1 - t;
                                        return (
                                            <View
                                                key={p.id}
                                                style={{
                                                    position: 'absolute',
                                                    left: p.cx + ox - 3,
                                                    top: p.cy + oy - 3,
                                                    width: 6, height: 6,
                                                    borderRadius: 3,
                                                    backgroundColor: palette[selectedColor] || '#FFD700',
                                                    opacity,
                                                }}
                                            />
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </GestureDetector>
                </View>

                {/* Stage 11: Palette Psychology — sorted by remaining count */}
                <View style={styles.paletteContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.palette}
                    >
                        {sortedPaletteIndices.map((i) => {
                            const c = palette[i];
                            const isFullyDone = !activeColorIndices.has(i);
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.colorSwatch,
                                        {
                                            backgroundColor: c,
                                            borderWidth: selectedColor === i ? 4 : 2,
                                            borderColor: selectedColor === i ? '#FFF' : 'rgba(0,0,0,0.1)',
                                            opacity: isFullyDone ? 0.3 : 1,
                                        },
                                    ]}
                                    onPress={() => setSelectedColor(i)}
                                    disabled={isFullyDone}
                                >
                                    <Text style={[
                                        styles.swatchNumber,
                                        isFullyDone && { textDecorationLine: 'line-through' as const },
                                    ]}>
                                        {isFullyDone ? '✓' : i + 1}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

            </View>
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F0F0' },
    header: {
        height: 60, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', paddingHorizontal: 12,
        backgroundColor: '#2c2c2c', elevation: 2, zIndex: 100,
    },
    headerBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f0f0',
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2, elevation: 3,
    },
    canvasContainer: {
        flex: 1, backgroundColor: '#FFF',
        justifyContent: 'center', alignItems: 'center',
    },
    numberHintWrap: {
        position: 'absolute', left: 0, top: 0,
        width: 20, height: 16,
        justifyContent: 'center', alignItems: 'center',
    },
    numberHintText: {
        fontSize: 10, fontWeight: '600', color: '#444',
        textShadowColor: 'white',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 2,
    },
    paletteContainer: {
        backgroundColor: 'white', borderTopWidth: 1,
        borderTopColor: '#DDD', padding: 10, justifyContent: 'center',
    },
    palette: { paddingHorizontal: 10, gap: 10 },
    colorSwatch: {
        width: 50, height: 50, borderRadius: 25,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25, elevation: 5,
    },
    swatchNumber: { fontSize: 16, fontWeight: 'bold', color: '#333' },
});

console.log("GAME SCREEN V4 — STAGE 8 PREMIUM UX");
import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { Canvas, Path, Skia, Group, Circle, Paint, BlendMode } from '@shopify/react-native-skia';
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
}

interface BackendData {
    width: number;
    height: number;
    outlinePath?: string;
    regions: Region[];
    palette: string[];
    meta?: { regionCount: number; processingTimeMs: number };
}

// ─── NumberHint ──────────────────────────────────────────────────────────────
const MIN_LABEL_PX = 20;

const NumberHint = ({
    label,
    bx, by, bw, bh,
    minX, minY, baseScale, extraX, extraY,
    canvasWidth, canvasHeight,
    minScale,
    scaleShared,
    translateXShared,
    translateYShared,
}: {
    label: number;
    bx: number; by: number; bw: number; bh: number;
    minX: number; minY: number;
    baseScale: number; extraX: number; extraY: number;
    canvasWidth: number; canvasHeight: number;
    minScale: number;
    scaleShared: any;
    translateXShared: any;
    translateYShared: any;
}) => {
    const cx = bx + bw / 2;
    const cy = by + bh / 2;

    const style = useAnimatedStyle(() => {
        const s = scaleShared.value;
        const totalScale = baseScale * s;
        const canvasX = (cx - minX) * totalScale + translateXShared.value + extraX;
        const canvasY = (cy - minY) * totalScale + translateYShared.value + extraY;
        const outsideCanvas =
            canvasX < 0 || canvasX > canvasWidth ||
            canvasY < 0 || canvasY > canvasHeight;

        return {
            transform: [
                { translateX: canvasX - 10 },
                { translateY: canvasY - 8 },
            ],
            opacity: (!outsideCanvas && s >= minScale) ? 1 : 0,
        };
    });

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    position: 'absolute',
                    left: 0, top: 0,
                    width: 20, height: 16,
                    justifyContent: 'center',
                    alignItems: 'center',
                },
                style,
            ]}
        >
            <Text style={styles.numberHint}>{label}</Text>
        </Animated.View>
    );
};

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
    const minX = useMemo(
        () => Math.min(...regions.map((r) => r.boundingBox.x)),
        [regions],
    );
    const minY = useMemo(
        () => Math.min(...regions.map((r) => r.boundingBox.y)),
        [regions],
    );

    // ── Pre-parse Skia paths ──────────────────────────────────────────────────
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

    React.useEffect(() => {
        resetFilledRegions();
    }, [backendData]);

    // ── Timer ─────────────────────────────────────────────────────────────────
    const [startTime] = React.useState(Date.now());

    // ── Completion detection ──────────────────────────────────────────────────
    const filledCount = Object.keys(filledRegions).length;
    const progress = Math.round((filledCount / regions.length) * 100);
    const isComplete = filledCount === regions.length;

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

        navigation.replace('VictoryScreen', {
            score: totalScore,
            coins,
            timeTaken,
        });
    }, [startTime, regions.length, navigation, setScore, addCoins]);

    React.useEffect(() => {
        if (isComplete && regions.length > 0) {
            const timer = setTimeout(() => onGameCompleted(), 600);
            return () => clearTimeout(timer);
        }
    }, [filledCount]);

    // ── Hint system ───────────────────────────────────────────────────────────
    const useHint = () => {
        for (const r of skiaRegions) {
            if (!filledRegions[r.id]) {
                fillRegion(r.id);
                break;
            }
        }
    };

    // ── Back button with alert ────────────────────────────────────────────────
    const handleBack = () => {
        Alert.alert(
            'Exit Painting',
            'Your progress will be lost.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', onPress: () => navigation.goBack() },
            ],
        );
    };

    // ── 🆕 Stage 8 Feature 2: Dynamic Palette Filtering ──────────────────────
    // Only show colors that still have unfilled regions
    const activeColorIndices = useMemo(() => {
        const activeSet = new Set<number>();
        for (const r of regions) {
            if (!filledRegions[r.id]) {
                activeSet.add(r.colorIndex);
            }
        }
        return activeSet;
    }, [regions, filledRegions]);

    // ── 🆕 Stage 8 Feature 5: Region Highlight Pulse ─────────────────────────
    // 900ms pulse loop for unfilled regions matching selectedColor
    const pulseOpacity = useSharedValue(0.3);

    React.useEffect(() => {
        pulseOpacity.value = withRepeat(
            withSequence(
                withTiming(0.45, { duration: 450, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.15, { duration: 450, easing: Easing.inOut(Easing.ease) }),
            ),
            -1, // infinite
            true,
        );
    }, [selectedColor]);

    // Derived value for use inside Skia Canvas
    const pulseOpacityDerived = useDerivedValue(() => pulseOpacity.value);

    // ── Zoom / pan shared values ───────────────────────────────────────────────
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

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

    // ── 🆕 Stage 8 Feature 1: Flood Fill Animation State ─────────────────────
    // Track the last filled region for the expanding circle effect
    const [fillAnimRegion, setFillAnimRegion] = React.useState<{
        id: number;
        cx: number;
        cy: number;
        maxR: number;
        color: string;
    } | null>(null);
    const fillAnimRadius = useSharedValue(0);
    const fillAnimRadiusDerived = useDerivedValue(() => fillAnimRadius.value);

    // ── Tap hit-test ──────────────────────────────────────────────────────────
    const handleTap = (touchX: number, touchY: number) => {
        if (isComplete) return;

        const totalScale = baseScale * scale.value;
        const canvasX = (touchX - translateX.value - extraX) / totalScale + minX;
        const canvasY = (touchY - translateY.value - extraY) / totalScale + minY;

        for (let i = skiaRegions.length - 1; i >= 0; i--) {
            const r = skiaRegions[i];
            if (r.skPath?.contains(canvasX, canvasY)) {
                if (r.colorIndex === selectedColor && !filledRegions[r.id]) {
                    // 🆕 Trigger flood fill animation
                    const bb = r.boundingBox;
                    const maxRadius = Math.sqrt(bb.w * bb.w + bb.h * bb.h);
                    const color = palette[r.colorIndex % palette.length];

                    setFillAnimRegion({
                        id: r.id,
                        cx: canvasX,
                        cy: canvasY,
                        maxR: maxRadius,
                        color,
                    });

                    // Animate the radius from 0 to maxRadius
                    fillAnimRadius.value = 0;
                    fillAnimRadius.value = withTiming(maxRadius, {
                        duration: 180,
                        easing: Easing.out(Easing.cubic),
                    });

                    // Actually fill after animation completes
                    setTimeout(() => {
                        fillRegion(r.id);
                        setFillAnimRegion(null);
                    }, 180);
                }
                break;
            }
        }
    };

    const tap = Gesture.Tap().onEnd((e) => { runOnJS(handleTap)(e.x, e.y); });
    const allGestures = Gesture.Race(tap, Gesture.Simultaneous(pinch, pan));

    // ── Skia group transform ───────────────────────────────────────────────────
    const groupTransform = useDerivedValue(() => {
        const s = baseScale * scale.value;
        return [
            { translateX: translateX.value + extraX - minX * s },
            { translateY: translateY.value + extraY - minY * s },
            { scale: s },
        ];
    });

    // ── Performance ───────────────────────────────────────────────────────────
    const showNumbers = regions.length <= 900;

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
                            <Canvas style={{ width: SCREEN_WIDTH, height: canvasHeight }} mode="continuous">
                                <Group transform={groupTransform}>
                                    {/* Region fills */}
                                    {skiaRegions.map((r) => (
                                        <Path
                                            key={`fill-${r.id}`}
                                            path={r.skPath!}
                                            color={filledRegions[r.id]
                                                ? palette[r.colorIndex % palette.length]
                                                : 'white'}
                                            style="fill"
                                        />
                                    ))}

                                    {/* 🆕 Stage 8 Feature 5: Pulse highlight for matching unfilled regions */}
                                    {skiaRegions.map((r) => {
                                        if (filledRegions[r.id]) return null;
                                        if (r.colorIndex !== selectedColor) return null;
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

                                    {/* 🆕 Stage 8 Feature 1: Flood fill expanding circle */}
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

                            {/* Number hints */}
                            {showNumbers && (
                                <View
                                    pointerEvents="none"
                                    style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]}
                                >
                                    {skiaRegions.map((r) => {
                                        if (filledRegions[r.id]) return null;
                                        const minSide = Math.min(r.boundingBox.w, r.boundingBox.h);
                                        const minScaleToShow = minSide * baseScale >= MIN_LABEL_PX
                                            ? 1
                                            : MIN_LABEL_PX / (minSide * baseScale);
                                        return (
                                            <NumberHint
                                                key={`num-${r.id}`}
                                                label={(r.colorIndex % palette.length) + 1}
                                                bx={r.boundingBox.x}
                                                by={r.boundingBox.y}
                                                bw={r.boundingBox.w}
                                                bh={r.boundingBox.h}
                                                minX={minX}
                                                minY={minY}
                                                baseScale={baseScale}
                                                extraX={extraX}
                                                extraY={extraY}
                                                canvasWidth={SCREEN_WIDTH}
                                                canvasHeight={canvasHeight}
                                                minScale={minScaleToShow}
                                                scaleShared={scale}
                                                translateXShared={translateX}
                                                translateYShared={translateY}
                                            />
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </GestureDetector>
                </View>

                {/* 🆕 Stage 8 Feature 2: Dynamic Color Palette — hides fully completed colors */}
                <View style={styles.paletteContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.palette}
                    >
                        {palette.map((c, i) => {
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
    numberHint: { fontSize: 10, fontWeight: '600', color: '#444' },
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

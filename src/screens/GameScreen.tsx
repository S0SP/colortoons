console.log("GAME SCREEN V3 — COMPLETION SYSTEM");
import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { Canvas, Path, Skia, Group } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    runOnJS,
    useAnimatedStyle,
    clamp,
    useDerivedValue,
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

    const onGameCompleted = React.useCallback(() => {
        const endTime = Date.now();
        const timeTaken = Math.floor((endTime - startTime) / 1000);

        const baseScore = 1000;
        const regionBonus = regions.length * 5;
        const speedBonus = Math.max(0, 120 - timeTaken) * 10;
        const totalScore = baseScore + regionBonus + speedBonus;
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
            // Small delay so user can see the final fill
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

    // ── Tap hit-test ──────────────────────────────────────────────────────────
    const handleTap = (touchX: number, touchY: number) => {
        // Performance: disable tap after completion
        if (isComplete) return;

        const totalScale = baseScale * scale.value;
        const canvasX = (touchX - translateX.value - extraX) / totalScale + minX;
        const canvasY = (touchY - translateY.value - extraY) / totalScale + minY;

        // Reverse iteration → children (deepest) win over parents
        for (let i = skiaRegions.length - 1; i >= 0; i--) {
            const r = skiaRegions[i];
            if (r.skPath?.contains(canvasX, canvasY)) {
                if (r.colorIndex === selectedColor) fillRegion(r.id);
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

                {/* Colour palette */}
                <View style={styles.paletteContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.palette}
                    >
                        {palette.map((c, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[
                                    styles.colorSwatch,
                                    {
                                        backgroundColor: c,
                                        borderWidth: selectedColor === i ? 4 : 2,
                                        borderColor: selectedColor === i ? '#FFF' : 'rgba(0,0,0,0.1)',
                                    },
                                ]}
                                onPress={() => setSelectedColor(i)}
                            >
                                <Text style={styles.swatchNumber}>{i + 1}</Text>
                            </TouchableOpacity>
                        ))}
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

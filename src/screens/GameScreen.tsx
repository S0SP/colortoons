import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, Image as RnImage } from 'react-native';
import { Canvas, Path, Skia, Group, Image as SkiaImage, useImage, RuntimeShader, ColorMatrix, Paint, BlendMode, Rect } from '@shopify/react-native-skia';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS, useDerivedValue, useAnimatedStyle } from 'react-native-reanimated';
import { COLORS } from '../theme';

// Sobel Edge Detection Shader
const edgeDetectionShader = `
uniform shader image;
uniform float width;
uniform float height;

half4 main(float2 xy) {
  // Use 1.0 for pixel step, or slightly larger for thicker lines (e.g. 1.5)
  float dx = 1.0; 
  float dy = 1.0;
  
  half4 c = image.eval(xy);
  half4 l = image.eval(xy + float2(-dx, 0));
  half4 r = image.eval(xy + float2(dx, 0));
  half4 t = image.eval(xy + float2(0, -dy));
  half4 b = image.eval(xy + float2(0, dy));
  
  float deltaX = length(l.rgb - r.rgb);
  float deltaY = length(t.rgb - b.rgb);
  
  float edge = deltaX + deltaY;
  
  // Adjusted thresholds for cleaner lines
  float intensity = 1.0 - smoothstep(0.1, 0.4, edge);
  
  // Preserve alpha from source
  return half4(intensity, intensity, intensity, c.a);
}
`;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Region {
    colorIndex: number;
    pathData: string; // SVG Path string
    labelPoint: { x: number; y: number };
}

interface PaintingData {
    regions: Region[];
    palette: string[];
    width: number;
    height: number;
}

// Helper to create a random irregular blob path
const createBlobPath = (x: number, y: number, radius: number) => {
    const path = Skia.Path.Make();
    const segments = 8 + Math.floor(Math.random() * 4); // 8-12 segments
    const angleStep = (2 * Math.PI) / segments;

    path.moveTo(x + radius * Math.cos(0), y + radius * Math.sin(0));

    for (let i = 1; i <= segments; i++) {
        const angle = i * angleStep;
        // Randomize radius for "puzzle/irregular" look
        const r = radius * (0.8 + Math.random() * 0.4);
        const cx = x + r * Math.cos(angle);
        const cy = y + r * Math.sin(angle);
        path.lineTo(cx, cy);
    }
    path.close();
    return path;
};

export const GameScreen = ({ route, navigation }: any) => { // Added navigation prop
    // Check if we have 'data' (regions) or just an 'image' from Gallery
    const { data, image, title, mode } = route.params || {};

    // If we have an image but no regions, we might be in "Free Paint" mode or "Raster Coloring" mode
    // For now, let's gracefully handle missing 'data' if 'image' is present.
    const regions = data ? data.regions : [];
    // Define a fallback palette if COLORS.palette doesn't exist (it seems it didn't in lint error)
    // Actually typically we might have a preset.
    const DEFAULT_PALETTE = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
    const palette = data && data.palette ? data.palette : DEFAULT_PALETTE;

    // Load image if provided
    const loadedImage = useImage(image);

    // Number Hints for Raster Mode - denser distribution like reference
    const rasterData = useMemo(() => {
        if (mode !== 'raster') return { hints: [], paths: [] };

        const hints: any[] = [];
        const paths: any[] = [];

        // Generate ~60-80 numbers distributed across the canvas
        // Using a semi-random grid to avoid too much overlap
        const gridSize = 8; // 8x8 = 64 potential spots
        const cellWidth = 500 / gridSize;
        const cellHeight = 500 / gridSize;

        let id = 0;
        for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
                // Skip some cells randomly for natural look
                if (Math.random() < 0.2) continue;

                // Position with jitter within cell
                const x = col * cellWidth + cellWidth * 0.2 + Math.random() * cellWidth * 0.6;
                const y = row * cellHeight + cellHeight * 0.2 + Math.random() * cellHeight * 0.6;

                // Use larger number range (1-75) like reference
                const num = Math.floor(Math.random() * 75) + 1;

                hints.push({ id, x, y, num });

                // Create a circular tap region (not visible, just for hit testing)
                const path = Skia.Path.Make();
                path.addCircle(x, y, 20);
                paths.push({ id, skPath: path, num });

                id++;
            }
        }
        return { hints, paths };
    }, [mode]);

    const [selectedColor, setSelectedColor] = useState(0);
    const [filledRegions, setFilledRegions] = useState<number[]>([]);
    // For Raster mode, filledRegions will track INDICES of hints that are "revealed"

    const handleRasterTap = (x: number, y: number) => {
        // Check if tap is inside any of our random puzzle blobs
        const clickedBlobIndex = rasterData.paths.findIndex((p: any) => p.skPath.contains(x, y));

        if (clickedBlobIndex !== -1) {
            const blob = rasterData.paths[clickedBlobIndex];
            // Check if correct color is selected
            if (blob.num === selectedColor + 1) {
                if (!filledRegions.includes(blob.id)) {
                    setFilledRegions(prev => [...prev, blob.id]);
                }
            } else {
                console.log("Wrong color for this blob!");
            }
        }
    };

    // Define Shader
    const runtimeShader = useMemo(() => Skia.RuntimeEffect.Make(edgeDetectionShader), []);

    // Zoom/Pan State
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const savedScale = useSharedValue(1);
    const savedTranslateX = useSharedValue(0);
    const savedTranslateY = useSharedValue(0);

    const pinch = Gesture.Pinch()
        .onUpdate((e) => {
            scale.value = savedScale.value * e.scale;
        })
        .onEnd(() => {
            savedScale.value = scale.value;
        });

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

    const composedGesture = Gesture.Simultaneous(pinch, pan);

    // Convert SVG strings to Skia Paths once
    const skiaPaths = useMemo(() => {
        return regions.map((r: Region) => {
            const path = Skia.Path.MakeFromSVGString(r.pathData);
            return { ...r, skPath: path };
        });
    }, [regions]);

    const handleTap = (x: number, y: number) => {
        const localX = (x - translateX.value) / scale.value;
        const localY = (y - translateY.value) / scale.value;

        if (mode === 'raster') {
            handleRasterTap(localX, localY);
            return;
        }

        const clickedIndex = skiaPaths.findIndex((r: any) => r.skPath?.contains(localX, localY));

        if (clickedIndex !== -1) {
            const region = skiaPaths[clickedIndex];
            if (region.colorIndex === selectedColor) {
                if (!filledRegions.includes(clickedIndex)) {
                    setFilledRegions(prev => [...prev, clickedIndex]);
                }
            }
        }
    };

    const tap = Gesture.Tap().onEnd((e) => {
        runOnJS(handleTap)(e.x, e.y);
    });

    // Create animated style for the container to handle Pan/Zoom for BOTH Canvas and Overlays
    const mapStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { scale: scale.value },
            ],
        };
    });

    const allGestures = Gesture.Race(tap, composedGesture);

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{
                    width: 40, height: 40, borderRadius: 20, backgroundColor: 'white',
                    justifyContent: 'center', alignItems: 'center',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, elevation: 3
                }}>
                    <Text style={{ fontSize: 24, color: '#333', lineHeight: 28 }}>←</Text>
                </TouchableOpacity>

                {/* Hint Button */}
                <TouchableOpacity style={{
                    width: 40, height: 40, borderRadius: 20, backgroundColor: 'white',
                    justifyContent: 'center', alignItems: 'center',
                    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, elevation: 3
                }}>
                    {/* Magnifying Glass Emoji or Icon */}
                    <Text style={{ fontSize: 20 }}>🔍</Text>
                    {/* Badge */}
                    <View style={{
                        position: 'absolute', bottom: -5, right: -5,
                        backgroundColor: '#333', borderRadius: 10,
                        paddingHorizontal: 6, paddingVertical: 2
                    }}>
                        <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>3</Text>
                    </View>
                </TouchableOpacity>
            </View>

            <GestureDetector gesture={allGestures}>
                <View style={styles.canvasContainer}>
                    <Animated.View style={[mapStyle, { width: 500, height: 500 }]}>
                        {/* 1. Base Layer: Full Color Image (Native) */}
                        {image && (
                            <RnImage
                                source={typeof image === 'string' ? { uri: image } : image}
                                style={{ width: 500, height: 500, position: 'absolute' }}
                                resizeMode="contain"
                            />
                        )}

                        {/* 2. Overlay Layer: Black & White Skia Canvas */}
                        {/* 2. Overlay Layer: High Contrast B&W Skia Canvas */}
                        <Canvas style={{ width: 500, height: 500, position: 'absolute' }}>
                            {loadedImage && mode === 'raster' && (
                                <Group>
                                    <Group layer>
                                        {/* Line Art / Edge Detect Layer */}
                                        <SkiaImage
                                            image={loadedImage}
                                            x={0} y={0} width={500} height={500}
                                            fit="contain"
                                        >
                                            {runtimeShader && (
                                                <RuntimeShader
                                                    source={runtimeShader}
                                                    uniforms={{ width: 500, height: 500 }}
                                                />
                                            )}
                                        </SkiaImage>

                                        {/* Reveal: Cut holes for filled regions */}
                                        {filledRegions.map((id) => {
                                            const blob = rasterData.paths.find((p: any) => p.id === id);
                                            if (!blob) return null;
                                            return (
                                                <Path
                                                    key={id}
                                                    path={blob.skPath}
                                                    color="transparent"
                                                    blendMode="clear"
                                                />
                                            );
                                        })}
                                    </Group>

                                    {/* Colored fill regions (rendered before line art so lines stay visible) */}
                                    {filledRegions.map((id) => {
                                        const blob = rasterData.paths.find((p: any) => p.id === id);
                                        if (!blob) return null;
                                        const colorIndex = (blob.num - 1) % palette.length;
                                        return (
                                            <Path
                                                key={`fill-${id}`}
                                                path={blob.skPath}
                                                color={palette[colorIndex]}
                                                style="fill"
                                            />
                                        );
                                    })}
                                </Group>
                            )}

                            {/* Vector Rendering (Unchanged) */}
                            {mode !== 'raster' && skiaPaths.map((r: any, i: number) => (
                                <Path
                                    key={i}
                                    path={r.skPath!}
                                    color={filledRegions.includes(i) ? palette[r.colorIndex] : 'white'}
                                    style="fill"
                                />
                            ))}
                            {mode !== 'raster' && skiaPaths.map((r: any, i: number) => (
                                <Path
                                    key={`stroke-${i}`}
                                    path={r.skPath!}
                                    color="black"
                                    style="stroke"
                                    strokeWidth={1}
                                />
                            ))}
                        </Canvas>

                        {/* 3. Number Hints Overlay (Native) */}
                        {mode === 'raster' && rasterData.hints.map((hint: any, i: number) => (
                            !filledRegions.includes(hint.id) && (
                                <View
                                    key={i}
                                    style={{
                                        position: 'absolute',
                                        left: hint.x - 15,
                                        top: hint.y - 10,
                                        minWidth: 20,
                                        height: 20,
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        zIndex: 10,
                                    }}
                                    pointerEvents="none"
                                >
                                    <Text style={{
                                        fontSize: 12,
                                        fontWeight: '600',
                                        color: '#222',
                                    }}>
                                        {hint.num}
                                    </Text>
                                </View>
                            )
                        ))}
                    </Animated.View>
                </View>
            </GestureDetector>

            {/* Colors Palette & Tooltip */}
            <View style={styles.paletteContainer}>
                {/* Tooltip */}
                <View style={{
                    backgroundColor: '#555',
                    paddingHorizontal: 15,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginBottom: 10,
                    alignSelf: 'center'
                }}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>Pick a color to start</Text>
                    {/* Tiny Triangle Arrow */}
                    <View style={{
                        position: 'absolute', bottom: -6, left: '50%', marginLeft: -6,
                        width: 0, height: 0,
                        borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 6,
                        borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: '#555'
                    }} />
                </View>

                {/* Progress Indicator */}
                <Text style={{
                    color: '#999',
                    fontSize: 12,
                    textAlign: 'center',
                    marginBottom: 8
                }}>
                    {Math.round((filledRegions.length / Math.max(rasterData.hints.length, 1)) * 100)}%
                </Text>

                <View style={styles.palette}>
                    {palette.map((c: string, i: number) => (
                        <TouchableOpacity
                            key={i}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: 22,
                                backgroundColor: c,
                                justifyContent: 'center',
                                alignItems: 'center',
                                marginHorizontal: 5,
                                borderWidth: selectedColor === i ? 4 : 2,
                                borderColor: selectedColor === i ? '#FFF' : 'rgba(0,0,0,0.1)',
                                shadowColor: "#000",
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.25,
                                shadowRadius: 3.84,
                                elevation: 5,
                            }}
                            onPress={() => setSelectedColor(i)}
                        >
                            <Text style={{
                                color: 'white',
                                fontSize: 18,
                                fontFamily: 'Unknown', // Fallback
                                fontWeight: 'bold',
                                textShadowRadius: 2,
                                textShadowColor: 'rgba(0,0,0,0.5)'
                            }}>
                                {i + 1}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F0F0',
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        backgroundColor: 'white',
        elevation: 2,
        zIndex: 100,
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    canvasContainer: {
        flex: 1,
        overflow: 'hidden', // Clip content
        backgroundColor: '#FFF', // Canvas background
        justifyContent: 'center',
        alignItems: 'center',
    },
    paletteContainer: {
        height: 100,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#DDD',
        padding: 10,
        justifyContent: 'center',
    },
    palette: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
    },
    colorSwatch: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

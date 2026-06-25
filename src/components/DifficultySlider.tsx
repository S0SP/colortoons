import React, { useState, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Image, Text } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    runOnJS,
    withSpring,
} from 'react-native-reanimated';
import { Canvas, RoundedRect, LinearGradient, vec, Shadow } from "@shopify/react-native-skia";

interface DifficultySliderProps {
    value: number;
    onValueChange: (val: number) => void;
    min?: number;
    max?: number;
    showValue?: boolean;
}

const THUMB_SIZE = 50;
const TRACK_HEIGHT = 16;

// Difficulty labels based on value
const getDifficultyLabel = (value: number, min: number, max: number): { label: string; emoji: string } => {
    const percentage = (value - min) / (max - min);
    if (percentage < 0.2) return { label: 'Kids', emoji: '🧒' };
    if (percentage < 0.4) return { label: 'Easy', emoji: '😊' };
    if (percentage < 0.6) return { label: 'Normal', emoji: '🎨' };
    if (percentage < 0.8) return { label: 'Hard', emoji: '🔥' };
    return { label: 'Expert', emoji: '💀' };
};

export const DifficultySlider = ({
    value,
    onValueChange,
    min = 0,
    max = 100,
    showValue = false,
}: DifficultySliderProps) => {
    const [trackWidth, setTrackWidth] = useState(0);
    const offset = useSharedValue(0);
    const thumbScale = useSharedValue(1);
    const isDragging = useSharedValue(false);

    // Initial position logic
    useEffect(() => {
        if (trackWidth > 0 && !isDragging.value) {
            const maxPos = trackWidth - THUMB_SIZE;
            const percentage = (value - min) / (max - min);
            offset.value = percentage * maxPos;
        }
    }, [trackWidth, value]);

    const pan = Gesture.Pan()
        .onBegin(() => {
            isDragging.value = true;
            thumbScale.value = withSpring(1.15, { damping: 10 });
        })
        .onChange((e) => {
            if (trackWidth > 0) {
                const maxPos = trackWidth - THUMB_SIZE;
                offset.value = Math.min(Math.max(offset.value + e.changeX, 0), maxPos);

                const percentage = offset.value / maxPos;
                const mappedValue = Math.round(min + percentage * (max - min));
                runOnJS(onValueChange)(mappedValue);
            }
        })
        .onFinalize(() => {
            isDragging.value = false;
            thumbScale.value = withSpring(1, { damping: 10 });
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: offset.value },
            { scale: thumbScale.value },
        ],
    }));

    const onLayout = (e: LayoutChangeEvent) => {
        setTrackWidth(e.nativeEvent.layout.width);
    };

    const difficultyInfo = getDifficultyLabel(value, min, max);

    return (
        <View style={styles.container}>
            {/* Optional Value Display */}
            {showValue && (
                <View style={styles.valueDisplay}>
                    <Text style={styles.valueEmoji}>{difficultyInfo.emoji}</Text>
                    <Text style={styles.valueText}>{difficultyInfo.label}</Text>
                </View>
            )}

            <View style={styles.trackContainer} onLayout={onLayout}>
                {trackWidth > 0 && (
                    <Canvas style={{ width: trackWidth, height: 40, position: 'absolute', top: 0 }}>
                        {/* Outer Pipe/Bezel Structure */}
                        <RoundedRect x={0} y={4} width={trackWidth} height={32} r={16} color="rgba(255, 255, 255, 0.4)">
                            <Shadow dx={0} dy={2} blur={4} color="white" inner />
                        </RoundedRect>

                        {/* Border ring simulation */}
                        <RoundedRect x={0} y={4} width={trackWidth} height={32} r={16} style="stroke" strokeWidth={2} color="white" opacity={0.6} />

                        {/* Inner Rainbow Track */}
                        <RoundedRect x={6} y={10} width={trackWidth - 12} height={20} r={10}>
                            <LinearGradient
                                start={vec(0, 0)}
                                end={vec(trackWidth, 0)}
                                colors={["#4ADE80", "#FBBF24", "#F97316", "#EF4444", "#DC2626"]}
                            />
                            <Shadow dx={0} dy={2} blur={2} color="rgba(0,0,0,0.1)" />
                        </RoundedRect>

                        {/* Top Highlight on Rainbow */}
                        <RoundedRect x={10} y={12} width={trackWidth - 20} height={6} r={3} color="rgba(255,255,255,0.4)" />
                    </Canvas>
                )}

                <GestureDetector gesture={pan}>
                    <Animated.View style={[styles.thumb, animatedStyle]}>
                        <Image
                            source={require('../assets/star_thumb.png')}
                            style={styles.starImage}
                            resizeMode="contain"
                        />
                    </Animated.View>
                </GestureDetector>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 40,
        justifyContent: 'center',
        marginBottom: 20
    },
    valueDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        gap: 6,
    },
    valueEmoji: {
        fontSize: 24,
    },
    valueText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#5d4b7c',
    },
    trackContainer: {
        height: 40,
        justifyContent: 'center',
    },
    thumb: {
        position: 'absolute',
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#DAA520',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    starImage: {
        width: '100%',
        height: '100%',
    },
    labels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 5,
        paddingHorizontal: 0,
    },
    label: {
        fontSize: 16,
        fontWeight: '900',
        color: '#5d4b7c',
    }
});
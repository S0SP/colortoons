/**
 * Region Slider Component
 * =======================
 * Same beautiful style as DifficultySlider
 * Controls target region count (20-4000)
 */

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

interface RegionSliderProps {
    value: number;
    onValueChange: (val: number) => void;
    min?: number;
    max?: number;
}

const THUMB_SIZE = 50;

// Region count labels
export const getRegionLabel = (value: number): { label: string; emoji: string; color: string } => {
    if (value < 100) return { label: 'Simple', emoji: '', color: '#4ADE80' };
    if (value < 300) return { label: 'Easy', emoji: '😊', color: '#60A5FA' };
    if (value < 700) return { label: 'Medium', emoji: '🎨', color: '#FBBF24' };
    if (value < 1500) return { label: 'Detailed', emoji: '🔥', color: '#F97316' };
    if (value < 3000) return { label: 'Complex', emoji: '💎', color: '#A855F7' };
    return { label: 'Extreme', emoji: '💀', color: '#EF4444' };
};

export const RegionSlider: React.FC<RegionSliderProps> = ({
    value,
    onValueChange,
    min = 20,
    max = 4000,
}) => {
    const [trackWidth, setTrackWidth] = useState(0);
    const offset = useSharedValue(0);
    const thumbScale = useSharedValue(1);
    const isDragging = useSharedValue(false);

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
                // Use exponential scale for better control at lower values
                const mappedValue = Math.round(min + Math.pow(percentage, 1.5) * (max - min));
                runOnJS(onValueChange)(Math.max(min, Math.min(max, mappedValue)));
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

    return (
        <View style={styles.container}>

            <View style={styles.trackContainer} onLayout={onLayout}>
                {trackWidth > 0 && (
                    <Canvas style={{ width: trackWidth, height: 40, position: 'absolute', top: 0 }}>
                        {/* Outer Pipe/Bezel Structure - Same as DifficultySlider */}
                        <RoundedRect x={0} y={4} width={trackWidth} height={32} r={16} color="rgba(255, 255, 255, 0.4)">
                            <Shadow dx={0} dy={2} blur={4} color="white" inner />
                        </RoundedRect>

                        <RoundedRect x={0} y={4} width={trackWidth} height={32} r={16} style="stroke" strokeWidth={2} color="white" opacity={0.6} />

                        {/* Inner Gradient Track - Blue to Purple theme */}
                        <RoundedRect x={6} y={10} width={trackWidth - 12} height={20} r={10}>
                            <LinearGradient
                                start={vec(0, 0)}
                                end={vec(trackWidth, 0)}
                                colors={["#4ADE80", "#60A5FA", "#A855F7", "#F472B6", "#EF4444"]}
                            />
                            <Shadow dx={0} dy={2} blur={2} color="rgba(0,0,0,0.1)" />
                        </RoundedRect>

                        {/* Top Highlight */}
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

            <View style={styles.labels}>
                <Text style={styles.label}>20</Text>
                <Text style={styles.label}>1000</Text>
                <Text style={styles.label}>2500</Text>
                <Text style={styles.label}>4000</Text>
            </View>

            {/* Description */}
            <Text style={styles.description}>
                {value < 100 && 'Perfect for quick sessions'}
                {value >= 100 && value < 300 && 'Great balance of detail'}
                {value >= 300 && value < 700 && 'Detailed artwork'}
                {value >= 700 && value < 1500 && 'Challenge yourself!'}
                {value >= 1500 && value < 3000 && 'For dedicated artists'}
                {value >= 3000 && 'Extreme detail level!'}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 100,
        paddingVertical: 5,
        marginTop: 0,
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
        shadowColor: '#A855F7',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 6,
    },
    starImage: {
        width: '80%',
        height: '80%',
    },
    labels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingHorizontal: 20,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
    },
    description: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
    },
});
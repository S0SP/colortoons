import React, { useState, useEffect } from 'react';
import { View, StyleSheet, LayoutChangeEvent, Image } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';
import { Canvas, Rect, RoundedRect, LinearGradient, vec, Shadow } from "@shopify/react-native-skia";

interface DifficultySliderProps {
    value: number;
    onValueChange: (val: number) => void;
    min?: number;
    max?: number;
}

const THUMB_SIZE = 50;
const TRACK_HEIGHT = 16;

export const DifficultySlider = ({ value, onValueChange, min = 5, max = 30 }: DifficultySliderProps) => {
    const [trackWidth, setTrackWidth] = useState(0);
    const offset = useSharedValue(0);

    // Initial position logic needed if value changes externally or on mount
    useEffect(() => {
        if (trackWidth > 0) {
            const maxPos = trackWidth - THUMB_SIZE;
            const percentage = (value - min) / (max - min);
            offset.value = percentage * maxPos;
        }
    }, [trackWidth, value]);

    const pan = Gesture.Pan()
        .onChange((e) => {
            if (trackWidth > 0) {
                const maxPos = trackWidth - THUMB_SIZE; // Constrain to track width minus thumb
                offset.value = Math.min(Math.max(offset.value + e.changeX, 0), maxPos);

                const percentage = offset.value / maxPos;
                const mappedValue = Math.round(min + percentage * (max - min));
                runOnJS(onValueChange)(mappedValue);
            }
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: offset.value }],
    }));

    const onLayout = (e: LayoutChangeEvent) => {
        setTrackWidth(e.nativeEvent.layout.width);
    };

    return (
        <View style={styles.container}>
            {/* Labels above? No, Reference has them below. */}
            <View style={styles.trackContainer} onLayout={onLayout}>
                {trackWidth > 0 && (
                    <Canvas style={{ width: trackWidth, height: 40, position: 'absolute', top: 0 }}>
                        {/* Outer Pipe/Bezel Structure */}
                        {/* White "Glow/Bezel" Background - CAPSULE SHAPE */}
                        <RoundedRect x={0} y={4} width={trackWidth} height={32} r={16} color="rgba(255, 255, 255, 0.4)">
                            {/* Soft white background for the pipe */}
                            <Shadow dx={0} dy={2} blur={4} color="white" inner />
                        </RoundedRect>

                        {/* Border ring simulation */}
                        <RoundedRect x={0} y={4} width={trackWidth} height={32} r={16} style="stroke" strokeWidth={2} color="white" opacity={0.6} />

                        {/* Inner Rainbow Track - CAPSULE SHAPE */}
                        <RoundedRect x={6} y={10} width={trackWidth - 12} height={20} r={10}>
                            <LinearGradient
                                start={vec(0, 0)}
                                end={vec(trackWidth, 0)}
                                colors={["#FF5F6D", "#FFC371", "#FFEF96", "#50C9C3", "#96C93D", "#5D9CEC", "#AC92EC"]}
                            />
                            {/* Inner Shine for 3D effect */}
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
            <View style={styles.labels}>
                <Animated.Text style={styles.label}>Easy</Animated.Text>
                <Animated.Text style={styles.label}>Hard</Animated.Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 80, // Enough height for thumb
        justifyContent: 'center',
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
        // No background color, just the image
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
        fontWeight: '900', // Extra Bold like Ref
        color: '#5d4b7c', // Deep Purple
    }
});

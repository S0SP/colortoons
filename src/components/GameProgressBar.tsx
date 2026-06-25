import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    withTiming,
    useAnimatedStyle,
    Easing,
    interpolateColor,
    useDerivedValue,
} from 'react-native-reanimated';

interface GameProgressBarProps {
    progress: number;
    showPercentage?: boolean;
}

export default function GameProgressBar({ progress, showPercentage = true }: GameProgressBarProps) {
    const width = useSharedValue(0);

    useEffect(() => {
        // Stage 11: 250ms cubicOut dopamine
        width.value = withTiming(progress, {
            duration: 250,
            easing: Easing.out(Easing.cubic),
        });
    }, [progress]);

    const fillStyle = useAnimatedStyle(() => ({
        width: `${width.value}%` as any,
    }));

    // Dynamic color based on progress (optional enhancement)
    const colorProgress = useDerivedValue(() => width.value / 100);

    const animatedFillStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            colorProgress.value,
            [0, 0.33, 0.66, 1],
            ['#EF4444', '#F59E0B', '#7fff00', '#10B981']
        );
        return {
            width: `${width.value}%` as any,
            backgroundColor,
        };
    });

    return (
        <View style={styles.container}>
            <View style={styles.track}>
                <Animated.View style={[styles.fill, animatedFillStyle]} />
                {showPercentage && (
                    <Text style={styles.percent}>{progress}%</Text>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    track: {
        width: '100%',
        height: 22,
        backgroundColor: '#3c3c3c',
        borderRadius: 11,
        overflow: 'hidden',
        justifyContent: 'center',
    },
    fill: {
        position: 'absolute',
        left: 0,
        top: 0,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#7fff00', // Default, overridden by animated style
    },
    percent: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
        zIndex: 1,
    },
});
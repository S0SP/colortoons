import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    withTiming,
    useAnimatedStyle,
    Easing,
} from 'react-native-reanimated';

export default function GameProgressBar({ progress }: { progress: number }) {
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

    return (
        <View style={styles.container}>
            <View style={styles.track}>
                <Animated.View style={[styles.fill, fillStyle]} />
                <Text style={styles.percent}>{progress}%</Text>
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
        backgroundColor: '#7fff00',
    },
    percent: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
        textAlign: 'center',
        zIndex: 1,
    },
});

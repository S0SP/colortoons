import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';

interface CreateNewButtonProps {
    onPress: () => void;
    width?: number;
}

export const CreateNewButton = ({ onPress, width = 300 }: CreateNewButtonProps) => {
    const scale = useSharedValue(1);
    const shadowDepth = useSharedValue(6);
    const brightness = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const animatedShadowStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: shadowDepth.value }],
    }));

    const animatedGradientStyle = useAnimatedStyle(() => ({
        opacity: brightness.value,
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
        shadowDepth.value = withTiming(2, { duration: 100 });
        brightness.value = withTiming(0.9, { duration: 100 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
        shadowDepth.value = withTiming(6, { duration: 100 });
        brightness.value = withTiming(1, { duration: 100 });
    };

    return (
        <Animated.View style={[styles.container, { width }, animatedStyle]}>
            {/* Outer Glow (Underneath) */}
            <View style={styles.outerGlow} />

            {/* Bottom 3D Shadow layer */}
            <Animated.View style={[styles.shadowLayer, animatedShadowStyle]} />

            {/* Main Button Body via Pressable */}
            <Pressable
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                style={styles.pressable}
            >
                <Animated.View style={[styles.gradientWrapper, animatedGradientStyle]}>
                    <LinearGradient
                        colors={['#FFD84D', '#FFC107', '#F4A300']}
                        style={styles.gradient}
                    >
                        {/* Top Gloss Highlight */}
                        <View style={styles.glossHighlight} />

                        <Text style={styles.text}>CREATE NEW</Text>
                    </LinearGradient>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 65,
        borderRadius: 40,
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    outerGlow: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        backgroundColor: '#FFD84D',
        borderRadius: 45,
        opacity: 0.5,
        shadowColor: '#FFD84D',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 12,
        elevation: 8,
    },
    shadowLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#C98A00',
        borderRadius: 40,
        shadowColor: '#C98A00',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
    },
    pressable: {
        width: '100%',
        height: '100%',
        borderRadius: 40,
        overflow: 'hidden',
    },
    gradientWrapper: {
        flex: 1,
    },
    gradient: {
        flex: 1,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 40,
        position: 'relative',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.5)',
    },
    glossHighlight: {
        position: 'absolute',
        top: 0,
        left: '10%',
        right: '10%',
        height: '35%',
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    text: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 1.5,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
});

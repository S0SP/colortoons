import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS, FONTS, SPACING } from '../theme';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

export const ProcessingScreen = ({ route, navigation }: any) => {
    // Determine input type: Prompt (Text to Image) or Gallery Image
    const { prompt, style, difficulty, image, title, id } = route.params || {};

    const isImageProcessing = !!image;
    const [step, setStep] = React.useState(0);

    const rotation = useSharedValue(0);

    const STEPS = isImageProcessing
        ? ['Analyzing image...', 'Detecting edges...', 'Generating numbers...', 'Finalizing artwork...']
        : ['Summoning colors...', 'Mixing palette...', 'Adding magic stats...', 'Finalizing masterpiece...'];

    useEffect(() => {
        // Animation
        rotation.value = withRepeat(
            withTiming(360, { duration: 2000 }),
            -1
        );

        // Simulation Loop
        let currentStep = 0;
        const interval = setInterval(() => {
            currentStep++;
            if (currentStep < STEPS.length) {
                setStep(currentStep);
            } else {
                clearInterval(interval);
                // Navigation
                if (isImageProcessing) {
                    navigation.replace('Game', {
                        image,
                        title,
                        id,
                        mode: 'raster' // Tell GameScreen to use Raster Logic
                    });
                } else {
                    // Logic for GEN AI result would go here
                    // navigation.replace('Game', { ...data... })
                }
            }
        }, 1500); // 1.5s per step

        return () => clearInterval(interval);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.magicIcon, animatedStyle]}>
                <Text style={{ fontSize: 60 }}>{isImageProcessing ? '🖼️' : '🪄'}</Text>
            </Animated.View>
            <Text style={styles.text}>{STEPS[step]}</Text>
            {isImageProcessing ? (
                <Text style={styles.subtext}>Processing "{title}"</Text>
            ) : (
                <Text style={styles.subtext}>"{prompt}"</Text>
            )}

            {/* Progress Dots */}
            <View style={{ flexDirection: 'row', marginTop: 30, gap: 8 }}>
                {STEPS.map((_, i) => (
                    <View
                        key={i}
                        style={{
                            width: 10, height: 10, borderRadius: 5,
                            backgroundColor: i <= step ? COLORS.accent : '#333'
                        }}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.l,
    },
    magicIcon: {
        marginBottom: SPACING.xl,
    },
    text: {
        color: COLORS.white,
        ...FONTS.bold,
        fontSize: 24,
        textAlign: 'center',
    },
    subtext: {
        color: COLORS.subtext,
        marginTop: SPACING.m,
        fontSize: 16,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});

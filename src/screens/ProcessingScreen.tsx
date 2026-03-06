import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { COLORS, FONTS, SPACING } from '../theme';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import { processImage } from '../services/api';

const STEPS = [
    'Analyzing image...',
    'Detecting edges...',
    'Extracting regions...',
    'Building palette...',
    'Generating paths...',
    'Finalizing artwork...',
];

export const ProcessingScreen = ({ route, navigation }: any) => {
    const { image, title, id, imageUri } = route.params || {};
    const [step, setStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const rotation = useSharedValue(0);
    const processingDone = useRef(false);

    useEffect(() => {
        rotation.value = withRepeat(withTiming(360, { duration: 2000 }), -1);

        // Step animation — progress through steps visually
        let currentStep = 0;
        const stepInterval = setInterval(() => {
            if (currentStep < STEPS.length - 1 && !processingDone.current) {
                currentStep++;
                setStep(currentStep);
            }
        }, 1200);

        // Actual backend call
        const doProcess = async () => {
            try {
                // Resolve the image URI
                let uri: string;
                if (imageUri) {
                    // Direct file URI from camera/picker
                    uri = imageUri;
                } else if (typeof image === 'number') {
                    // require() asset — resolve it
                    const resolved = Image.resolveAssetSource(image);
                    uri = resolved.uri;
                } else if (image?.uri) {
                    uri = image.uri;
                } else {
                    throw new Error('No valid image source');
                }

                console.log('[Processing] Sending to backend:', uri);
                const data = await processImage(uri, title || 'image.jpg');
                processingDone.current = true;

                // Show final step
                setStep(STEPS.length - 1);

                // Small delay for visual polish, then navigate
                setTimeout(() => {
                    navigation.replace('Game', { data });
                }, 600);
            } catch (err: any) {
                console.error('[Processing] Error:', err);
                processingDone.current = true;
                clearInterval(stepInterval);
                let msg = err?.message || 'Processing failed. Please try again.';
                if (err?.code === 'ECONNABORTED' || msg.includes('timeout')) {
                    msg = 'Server is taking longer than usual to wake up. Please try one more time!';
                }
                setError(msg);
            }
        };

        doProcess();
        return () => clearInterval(stepInterval);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${rotation.value}deg` }],
    }));

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.magicIcon, animatedStyle]}>
                <Text style={{ fontSize: 60 }}>🖼️</Text>
            </Animated.View>

            {error ? (
                <>
                    <Text style={styles.errorText}>❌ {error}</Text>
                    <Text
                        style={styles.retryBtn}
                        onPress={() => navigation.goBack()}
                    >
                        ← Go Back
                    </Text>
                </>
            ) : (
                <>
                    <Text style={styles.text}>{STEPS[step]}</Text>
                    <Text style={styles.subtext}>Processing "{title}"</Text>

                    <View style={{ flexDirection: 'row', marginTop: 30, gap: 8 }}>
                        {STEPS.map((_, i) => (
                            <View
                                key={i}
                                style={{
                                    width: 10, height: 10, borderRadius: 5,
                                    backgroundColor: i <= step ? COLORS.accent : '#333',
                                }}
                            />
                        ))}
                    </View>
                </>
            )}
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
        fontWeight: 'bold' as const,
        fontSize: 24,
        textAlign: 'center' as const,
    },
    subtext: {
        color: COLORS.subtext,
        marginTop: SPACING.m,
        fontSize: 16,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 18,
        textAlign: 'center',
        marginBottom: 20,
    },
    retryBtn: {
        color: '#60A5FA',
        fontSize: 18,
        fontWeight: 'bold',
        paddingVertical: 12,
        paddingHorizontal: 24,
    },
});

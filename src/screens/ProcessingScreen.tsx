import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withSequence,
    Easing,
} from 'react-native-reanimated';
import { Canvas, Path } from '@shopify/react-native-skia';
import { processImage, generateImage, ProcessImageOptions } from '../services/api';
import { AudioManager } from '../services/AudioManager';

const { width } = Dimensions.get('window');

const STEPS = [
    'Analyzing image architecture...',
    'Detecting structural edges...',
    'Extracting geometric regions...',
    'Synthesizing color palette...',
    'Generating vector paths...',
    'Creating spatial region map...',
    'Finalizing artwork...',
];

export const ProcessingScreen = ({ route, navigation }: any) => {
    const { imageUri, title, options, prompt, style } = route.params || {};
    const [step, setStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const processingDone = useRef(false);

    // Animations
    const progressWidth = useSharedValue(0);
    const pathProgress = useSharedValue(0);
    const stepOpacity = useSharedValue(1);

    // Mock vector path for the loading animation (a geometric shape)
    const cx = width / 2;
    const cy = 120;
    const skiaPath = `M ${cx} ${cy-80} L ${cx+60} ${cy-20} L ${cx+40} ${cy+60} L ${cx-40} ${cy+60} L ${cx-60} ${cy-20} Z M ${cx} ${cy-80} L ${cx} ${cy} L ${cx+40} ${cy+60} M ${cx} ${cy} L ${cx-40} ${cy+60} M ${cx-60} ${cy-20} L ${cx} ${cy} L ${cx+60} ${cy-20}`;

    // Path drawing animation
    useEffect(() => {
        pathProgress.value = withTiming(1, { 
            duration: 8000, 
            easing: Easing.bezier(0.25, 0.1, 0.25, 1) 
        });
    }, []);

    // Step progress animation
    useEffect(() => {
        const progress = ((step + 1) / STEPS.length) * 100;
        progressWidth.value = withTiming(progress, { duration: 400, easing: Easing.out(Easing.ease) });

        stepOpacity.value = withSequence(
            withTiming(0, { duration: 150 }),
            withTiming(1, { duration: 300 })
        );
    }, [step]);

    // Step advancement
    useEffect(() => {
        let currentStep = 0;
        const stepInterval = setInterval(() => {
            if (currentStep < STEPS.length - 1 && !processingDone.current) {
                currentStep++;
                setStep(currentStep);
            }
        }, 1500);

        return () => clearInterval(stepInterval);
    }, []);

    // Backend processing
    useEffect(() => {
        const doProcess = async () => {
            try {
                if (!imageUri && !prompt) throw new Error('No input provided');

                let data;
                if (prompt) {
                    data = await generateImage(prompt, style || 'cartoon', options || {});
                } else {
                    data = await processImage(imageUri, title || 'image.jpg', 'image/jpeg', options || {});
                }

                processingDone.current = true;
                setStep(STEPS.length - 1);
                AudioManager.playGameMusic();
                setTimeout(() => navigation.replace('Game', { data, title }), 800);
            } catch (err: any) {
                processingDone.current = true;
                setError(err?.response?.data?.detail || err?.message || 'Processing failed.');
            }
        };
        doProcess();
    }, []);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const stepStyle = useAnimatedStyle(() => ({
        opacity: stepOpacity.value,
    }));

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                
                {/* Minimalist Skia Vector Animation */}
                <View style={styles.animationContainer}>
                    <Canvas style={styles.canvas}>
                        <Path
                            path={skiaPath}
                            style="stroke"
                            strokeWidth={1}
                            color="rgba(56, 189, 248, 0.15)"
                        />
                        <Path
                            path={skiaPath}
                            style="stroke"
                            strokeWidth={2}
                            color="#38BDF8"
                            end={pathProgress}
                            strokeCap="round"
                            strokeJoin="round"
                        />
                    </Canvas>
                </View>

                {error ? (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{error}</Text>
                        <Text style={styles.retryBtn} onPress={() => navigation.goBack()}>
                            ← Return to Gallery
                        </Text>
                    </View>
                ) : (
                    <View style={styles.statusContainer}>
                        {/* Current Step */}
                        <Animated.View style={[styles.stepContainer, stepStyle]}>
                            <Text style={styles.stepText}>{STEPS[step]}</Text>
                        </Animated.View>

                        {/* Title */}
                        <Text style={styles.titleText}>Processing '{title || prompt || 'Image'}'</Text>

                        {/* Progress Bar & Counter */}
                        <View style={styles.progressWrapper}>
                            <View style={styles.progressBg}>
                                <Animated.View style={[styles.progressFill, progressStyle]} />
                            </View>
                            <Text style={styles.progressCountText}>
                                Step {step + 1} of {STEPS.length}
                            </Text>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212', // Deep dark minimalist background
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
    },
    animationContainer: {
        width: width,
        height: 240,
        marginBottom: 40,
    },
    canvas: {
        flex: 1,
    },
    statusContainer: {
        width: '100%',
        alignItems: 'center',
    },
    titleText: {
        fontSize: 13,
        color: '#888888',
        letterSpacing: 0.5,
        marginBottom: 32,
    },
    stepContainer: {
        marginBottom: 8,
        height: 30,
        justifyContent: 'center',
    },
    stepText: {
        fontSize: 22,
        color: '#FFFFFF',
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    progressWrapper: {
        width: '100%',
        maxWidth: 280,
    },
    progressBg: {
        height: 3,
        backgroundColor: '#2A2A2A',
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#38BDF8', // Crisp accent blue
        borderRadius: 1.5,
    },
    progressCountText: {
        color: '#666666',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 12,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    errorContainer: {
        alignItems: 'center',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
    },
    retryBtn: {
        color: '#FFFFFF',
        fontSize: 14,
        padding: 12,
    },
});
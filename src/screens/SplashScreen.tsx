import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    interpolate,
    Extrapolation,
    runOnJS
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import { FONTS, COLORS } from '../theme';
import { useUserStore } from '../store/useUserStore';

const { width } = Dimensions.get('window');

export const SplashScreen = () => {
    const navigation = useNavigation();
    const hasSeenOnboarding = useUserStore(state => state.hasSeenOnboarding);

    const logoScale = useSharedValue(0.4);
    const logoOpacity = useSharedValue(0);
    const textTranslateY = useSharedValue(20);
    const textOpacity = useSharedValue(0);
    const exitProgress = useSharedValue(0);

    useEffect(() => {
        // Entry animation
        logoScale.value = withSpring(1, { damping: 14, stiffness: 160 });
        logoOpacity.value = withTiming(1, { duration: 300 });

        textTranslateY.value = withDelay(200, withTiming(0, { duration: 350 }));
        textOpacity.value = withDelay(200, withTiming(1, { duration: 350 }));

        // Exit after 1800ms
        const timeout = setTimeout(() => {
            exitProgress.value = withTiming(1, { duration: 300 });
            setTimeout(() => {
                navigateToNext();
            }, 300);
        }, 1800);

        return () => clearTimeout(timeout);
    }, []);

    const navigateToNext = () => {
        const hasSeenOnboarding = useUserStore.getState().hasSeenOnboarding;
        if (hasSeenOnboarding) {
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] });
        } else {
            navigation.reset({ index: 0, routes: [{ name: 'Onboarding' as never }] });
        }
    };

    const logoStyle = useAnimatedStyle(() => {
        const scale = interpolate(exitProgress.value, [0, 1], [logoScale.value, 1.06], Extrapolation.CLAMP);
        const opacity = interpolate(exitProgress.value, [0, 1], [logoOpacity.value, 0], Extrapolation.CLAMP);
        return {
            transform: [{ scale }],
            opacity,
        };
    });

    const textStyle = useAnimatedStyle(() => {
        const opacity = interpolate(exitProgress.value, [0, 1], [textOpacity.value, 0], Extrapolation.CLAMP);
        return {
            transform: [{ translateY: textTranslateY.value }],
            opacity,
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.logoContainer, logoStyle]}>
                <Animated.Image
                    source={require('../assets/mascot_fox.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            <Animated.View style={[styles.textContainer, textStyle]}>
                <Text style={styles.appName}>ColorToons</Text>
                <Text style={styles.tagline}>Color. Play. Repeat.</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        // Removed heavy shadow to match the flat clean look of the reference
    },
    logo: {
        width: 300,
        height: 300,
    },
    textContainer: {
        alignItems: 'center',
    },
    appName: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontWeight: '900',
        fontSize: 34,
        color: '#000000',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    tagline: {
        fontFamily: 'PlusJakartaSans-Medium',
        fontWeight: '500',
        fontSize: 16,
        color: '#555555',
    },
});

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withSequence,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width } = Dimensions.get('window');

// ─── Component ────────────────────────────────────────────────────────────────
export const VictoryScreen = ({ route, navigation }: any) => {
    const { score = 0, coins = 0, timeTaken = 0 } = route.params ?? {};
    const confettiRef = useRef<any>(null);

    // ── Star animations ───────────────────────────────────────────────────────
    const star1Scale = useSharedValue(0);
    const star2Scale = useSharedValue(0);
    const star3Scale = useSharedValue(0);
    const scoreScale = useSharedValue(0);
    const coinScale = useSharedValue(0);
    const buttonsOpacity = useSharedValue(0);

    useEffect(() => {
        star1Scale.value = withDelay(200, withSpring(1, { damping: 6, stiffness: 120 }));
        star2Scale.value = withDelay(400, withSpring(1, { damping: 6, stiffness: 120 }));
        star3Scale.value = withDelay(600, withSpring(1, { damping: 6, stiffness: 120 }));
        scoreScale.value = withDelay(800, withSpring(1, { damping: 8, stiffness: 100 }));
        coinScale.value = withDelay(1000, withSpring(1, { damping: 8, stiffness: 100 }));
        buttonsOpacity.value = withDelay(1200, withTiming(1, { duration: 400 }));
    }, []);

    const star1Style = useAnimatedStyle(() => ({
        transform: [{ scale: star1Scale.value }],
    }));
    const star2Style = useAnimatedStyle(() => ({
        transform: [{ scale: star2Scale.value }],
    }));
    const star3Style = useAnimatedStyle(() => ({
        transform: [{ scale: star3Scale.value }],
    }));
    const scoreStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scoreScale.value }],
    }));
    const coinStyle = useAnimatedStyle(() => ({
        transform: [{ scale: coinScale.value }],
    }));
    const buttonsStyle = useAnimatedStyle(() => ({
        opacity: buttonsOpacity.value,
    }));

    const formattedScore = score.toLocaleString();

    const handleShare = async () => {
        try {
            await Share.share({
                message: `I just scored ${formattedScore} points on ColorArt! 🎨⭐`,
            });
        } catch (_) { }
    };

    return (
        <View style={styles.background}>
            <SafeAreaView style={styles.safeArea}>
                {/* Confetti */}
                <ConfettiCannon
                    ref={confettiRef}
                    count={120}
                    origin={{ x: width / 2, y: 0 }}
                    fadeOut
                    autoStart
                    fallSpeed={2500}
                />

                {/* Stars Row */}
                <View style={styles.starsRow}>
                    <Animated.Text style={[styles.star, styles.starSide, star1Style]}>⭐</Animated.Text>
                    <Animated.Text style={[styles.star, styles.starCenter, star2Style]}>⭐</Animated.Text>
                    <Animated.Text style={[styles.star, styles.starSide, star3Style]}>⭐</Animated.Text>
                </View>

                {/* Gold Frame & Artwork Preview */}
                <View style={styles.frameOuter}>
                    <View style={styles.frameInner}>
                        <Text style={styles.framePlaceholder}>🎨</Text>
                    </View>
                </View>

                {/* Score */}
                <Animated.View style={scoreStyle}>
                    <Text style={styles.scoreText}>{formattedScore}</Text>
                </Animated.View>

                {/* Coin Reward */}
                <Animated.View style={[styles.coinRow, coinStyle]}>
                    <Text style={styles.chestEmoji}>💰</Text>
                    <Text style={styles.coinText}>+{coins} Coins!</Text>
                </Animated.View>

                {/* Time taken */}
                <Text style={styles.timeText}>
                    Completed in {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
                </Text>

                {/* Buttons */}
                <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
                    {/* Next Painting */}
                    <TouchableOpacity
                        style={styles.nextButton}
                        onPress={() => navigation.replace('Creation')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.nextIcon}>▶</Text>
                        <Text style={styles.nextText}>NEXT PAINTING</Text>
                    </TouchableOpacity>

                    {/* Share */}
                    <TouchableOpacity
                        style={styles.shareButton}
                        onPress={handleShare}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.shareIcon}>📷</Text>
                        <Text style={styles.shareText}>SHARE</Text>
                    </TouchableOpacity>

                    {/* Gallery */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate('MainTabs', { screen: 'Gallery' })}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.galleryLink}>Gallery</Text>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    background: {
        flex: 1,
        backgroundColor: '#0B132B',
    },
    safeArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    starsRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        marginBottom: 16,
    },
    star: {
        textAlign: 'center',
    },
    starSide: {
        fontSize: 52,
        marginHorizontal: 4,
    },
    starCenter: {
        fontSize: 68,
        marginHorizontal: 4,
        marginBottom: 8,
    },
    frameOuter: {
        width: 210,
        height: 210,
        borderRadius: 24,
        borderWidth: 5,
        borderColor: '#DAA520',
        backgroundColor: '#B8860B',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 20,
        elevation: 12,
        marginBottom: 20,
    },
    frameInner: {
        width: 190,
        height: 190,
        borderRadius: 18,
        backgroundColor: '#1C2541',
        justifyContent: 'center',
        alignItems: 'center',
    },
    framePlaceholder: {
        fontSize: 80,
    },
    scoreText: {
        fontSize: 72,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 150, 255, 0.7)',
        textShadowOffset: { width: 0, height: 3 },
        textShadowRadius: 12,
        marginBottom: 8,
    },
    coinRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    chestEmoji: {
        fontSize: 36,
        marginRight: 8,
    },
    coinText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFD700',
    },
    timeText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 28,
    },
    buttonsContainer: {
        width: '100%',
        alignItems: 'center',
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '85%',
        height: 60,
        borderRadius: 30,
        backgroundColor: '#28C840',
        marginBottom: 14,
        shadowColor: '#28C840',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 8,
    },
    nextIcon: {
        fontSize: 18,
        color: 'white',
        marginRight: 10,
    },
    nextText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 1.5,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '60%',
        height: 48,
        borderRadius: 24,
        backgroundColor: '#1DA1F2',
        marginBottom: 18,
        shadowColor: '#1DA1F2',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 6,
    },
    shareIcon: {
        fontSize: 16,
        marginRight: 8,
    },
    shareText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        letterSpacing: 1,
    },
    galleryLink: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.6)',
        textDecorationLine: 'underline',
    },
});

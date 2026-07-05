/**
 * Daily Reward Modal
 * ==================
 * Shows daily reward claim popup
 */

import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withDelay,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { useUserStore } from '../store/useUserStore';

const { width } = Dimensions.get('window');

interface DailyRewardModalProps {
    visible: boolean;
    onClose: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({
    visible,
    onClose,
}) => {
    const { dailyRewards, currentDailyDay, claimDailyReward, canClaimDailyReward } = useUserStore();

    const scale = useSharedValue(0.8);
    const opacity = useSharedValue(0);
    const coinScale = useSharedValue(1);
    const [claimedCoins, setClaimedCoins] = React.useState<number | null>(null);

    useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 12 });
            opacity.value = withTiming(1, { duration: 200 });
            setClaimedCoins(null);
        }
    }, [visible]);

    const handleClaim = () => {
        const coins = claimDailyReward();
        if (coins > 0) {
            setClaimedCoins(coins);
            // Animate coin
            coinScale.value = withSequence(
                withSpring(1.5, { damping: 5 }),
                withSpring(1, { damping: 8 })
            );
        }
    };

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const coinAnimStyle = useAnimatedStyle(() => ({
        transform: [{ scale: coinScale.value }],
    }));

    const canClaim = canClaimDailyReward();
    const currentReward = dailyRewards.find(r => r.day === currentDailyDay);

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    activeOpacity={1}
                />

                <Animated.View style={[styles.modal, containerStyle]}>
                    <Text style={styles.title}>🎁 Daily Reward</Text>
                    <Text style={styles.subtitle}>Day {currentDailyDay} of 7</Text>

                    {/* Reward Days */}
                    <View style={styles.daysContainer}>
                        {dailyRewards.map((reward, index) => {
                            const isToday = reward.day === currentDailyDay;
                            const isPast = reward.day < currentDailyDay || reward.claimed;

                            return (
                                <View
                                    key={reward.day}
                                    style={[
                                        styles.dayBox,
                                        isToday && styles.dayBoxToday,
                                        isPast && styles.dayBoxPast,
                                    ]}
                                >
                                    <Text style={styles.dayNumber}>Day {reward.day}</Text>
                                    <Text style={styles.dayCoins}>🪙 {reward.coins}</Text>
                                    {isPast && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                            );
                        })}
                    </View>

                    {/* Claim Section */}
                    {claimedCoins !== null ? (
                        <View style={styles.claimedContainer}>
                            <Animated.Text style={[styles.claimedCoins, coinAnimStyle]}>
                                🪙 +{claimedCoins}
                            </Animated.Text>
                            <Text style={styles.claimedText}>Claimed!</Text>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeButtonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    ) : canClaim ? (
                        <TouchableOpacity style={styles.claimButton} onPress={handleClaim}>
                            <Text style={styles.claimButtonText}>
                                Claim 🪙 {currentReward?.coins}
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.alreadyClaimedContainer}>
                            <Text style={styles.alreadyClaimedText}>
                                Come back tomorrow! ⏰
                            </Text>
                            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                                <Text style={styles.closeButtonText}>OK</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: width - 40,
        backgroundColor: '#1A1A1A',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#262626',
    },
    title: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontFamily: 'PlusJakartaSans-Medium',
        fontSize: 16,
        color: '#A3A3A3',
        marginBottom: 20,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    dayBox: {
        width: (width - 100) / 4,
        aspectRatio: 1,
        backgroundColor: '#121212',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
        borderWidth: 1,
        borderColor: '#262626',
    },
    dayBoxToday: {
        backgroundColor: '#2A1B18',
        borderWidth: 2,
        borderColor: '#FF6330',
    },
    dayBoxPast: {
        backgroundColor: '#1A2E20',
        borderColor: '#10B981',
    },
    dayNumber: {
        fontFamily: 'PlusJakartaSans-Medium',
        fontSize: 10,
        color: '#A3A3A3',
        marginBottom: 4,
    },
    dayCoins: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 14,
        fontWeight: '700',
        color: '#F5F5F5',
    },
    checkmark: {
        position: 'absolute',
        top: 6,
        right: 6,
        fontSize: 12,
        color: '#10B981',
    },
    claimButton: {
        backgroundColor: '#FF6330',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
    },
    claimButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
    },
    claimedContainer: {
        alignItems: 'center',
        width: '100%',
    },
    claimedCoins: {
        fontSize: 48,
        marginBottom: 8,
    },
    claimedText: {
        fontFamily: 'PlusJakartaSans-Bold',
        fontSize: 20,
        fontWeight: '700',
        color: '#FF6330',
        marginBottom: 16,
    },
    closeButton: {
        backgroundColor: '#262626',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
    },
    closeButtonText: {
        fontFamily: 'PlusJakartaSans-Bold',
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    alreadyClaimedContainer: {
        alignItems: 'center',
        width: '100%',
    },
    alreadyClaimedText: {
        fontFamily: 'PlusJakartaSans-Medium',
        fontSize: 16,
        color: '#A3A3A3',
        marginBottom: 16,
    },
});
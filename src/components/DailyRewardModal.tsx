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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        width: width - 40,
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
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
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    dayBoxToday: {
        backgroundColor: '#EEF2FF',
        borderWidth: 2,
        borderColor: '#6366F1',
    },
    dayBoxPast: {
        backgroundColor: '#D1FAE5',
    },
    dayNumber: {
        fontSize: 10,
        color: '#6B7280',
        marginBottom: 2,
    },
    dayCoins: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1F2937',
    },
    checkmark: {
        position: 'absolute',
        top: 4,
        right: 4,
        fontSize: 12,
        color: '#10B981',
    },
    claimButton: {
        backgroundColor: '#10B981',
        paddingVertical: 16,
        paddingHorizontal: 40,
        borderRadius: 16,
    },
    claimButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    claimedContainer: {
        alignItems: 'center',
    },
    claimedCoins: {
        fontSize: 48,
        marginBottom: 8,
    },
    claimedText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#10B981',
        marginBottom: 16,
    },
    closeButton: {
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 12,
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    alreadyClaimedContainer: {
        alignItems: 'center',
    },
    alreadyClaimedText: {
        fontSize: 16,
        color: '#6B7280',
        marginBottom: 16,
    },
});
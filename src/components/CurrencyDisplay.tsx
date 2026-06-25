/**
 * Currency Display Component
 * ==========================
 * Shows coins and streak - matches your existing style
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated as RNAnimated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserStore } from '../store/useUserStore';
import { SHADOWS } from '../theme';

interface CurrencyDisplayProps {
    showStreak?: boolean;
    showEnergy?: boolean;
    compact?: boolean;
    onCoinPress?: () => void;
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
    showStreak = true,
    showEnergy = false,
    compact = false,
    onCoinPress,
}) => {
    const { coins, streak, energy, maxEnergy } = useUserStore();

    // Coin bounce animation
    const coinScale = useRef(new RNAnimated.Value(1)).current;
    const prevCoins = useRef(coins);

    useEffect(() => {
        if (coins !== prevCoins.current) {
            // Bounce animation when coins change
            RNAnimated.sequence([
                RNAnimated.timing(coinScale, {
                    toValue: 1.3,
                    duration: 150,
                    useNativeDriver: true
                }),
                RNAnimated.spring(coinScale, {
                    toValue: 1,
                    friction: 4,
                    useNativeDriver: true
                }),
            ]).start();
            prevCoins.current = coins;
        }
    }, [coins]);

    const formatNumber = (num: number): string => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
        return num.toString();
    };

    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            {/* Coins - Matching your statPill style */}
            <TouchableOpacity
                style={[styles.statPill, compact && styles.pillCompact]}
                onPress={onCoinPress}
                activeOpacity={onCoinPress ? 0.7 : 1}
            >
                <RNAnimated.Text style={[styles.coinIcon, { transform: [{ scale: coinScale }] }]}>
                    🪙
                </RNAnimated.Text>
                <Text style={[styles.statText, compact && styles.textCompact]}>
                    {formatNumber(coins)}
                </Text>
            </TouchableOpacity>

            {/* Streak */}
            {showStreak && streak > 0 && (
                <View style={[styles.statPill, compact && styles.pillCompact]}>
                    <Icon name="fire" size={compact ? 16 : 20} color="#FF8906" />
                    <Text style={[styles.statText, compact && styles.textCompact]}>
                        {streak}
                    </Text>
                </View>
            )}

            {/* Energy */}
            {showEnergy && (
                <View style={[styles.statPill, compact && styles.pillCompact]}>
                    <Text style={styles.energyIcon}>⚡</Text>
                    <Text style={[styles.statText, compact && styles.textCompact]}>
                        {energy}/{maxEnergy}
                    </Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    containerCompact: {
        gap: 6,
    },
    statPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    pillCompact: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 16,
    },
    coinIcon: {
        fontSize: 16,
    },
    energyIcon: {
        fontSize: 14,
    },
    statText: {
        fontWeight: 'bold',
        color: '#2D3436',
        fontSize: 14,
    },
    textCompact: {
        fontSize: 12,
    },
});
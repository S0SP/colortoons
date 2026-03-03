import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SHADOWS, SPACING } from '../theme';

interface StyleCardProps {
    label: string;
    selected: boolean;
    onPress: () => void;
    emoji: string;
}

export const StyleCard = ({ label, selected, onPress, emoji }: StyleCardProps) => {
    return (
        <TouchableOpacity
            onPress={onPress}
            style={[
                styles.card,
                selected && styles.selectedCard,
            ]}
        >
            <Text style={styles.emoji}>{emoji}</Text>
            <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
            {selected && (
                <View style={styles.checkmark}>
                    <Icon name="check" size={12} color="white" />
                </View>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 18,
        padding: SPACING.s,
        marginRight: SPACING.m,
        alignItems: 'center',
        justifyContent: 'center',
        width: 90,
        height: 110,
        borderWidth: 3,
        borderColor: 'transparent',
        ...SHADOWS.small,
        elevation: 3,
    },
    selectedCard: {
        borderColor: '#FFD700', // Gold Border
        backgroundColor: '#FFF9E5', // Light Yellow Tint
    },
    emoji: {
        fontSize: 36,
        marginBottom: 8,
    },
    label: {
        color: COLORS.subtext,
        fontWeight: 'bold',
        fontSize: 14,
    },
    selectedLabel: {
        color: '#8B4513',
    },
    checkmark: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#2CB67D',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 1,
    }
});

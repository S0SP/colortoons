import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS } from '../theme';

export const ProfileScreen = () => {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>My Profile</Text>
            <Text style={styles.subText}>Coming Soon</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        ...FONTS.bold,
        fontSize: 24,
        color: COLORS.text,
    },
    subText: {
        color: COLORS.subtext,
    }
});

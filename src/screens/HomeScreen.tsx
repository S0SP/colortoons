import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, useWindowDimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Canvas, Rect, LinearGradient, vec } from "@shopify/react-native-skia";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserStore } from '../store';
import { COLORS, FONTS, SPACING, SHADOWS } from '../theme';

// Placeholder data for "Jump Back In"
const JUMP_BACK_IN = [
    { id: '1', title: 'Space Rocket', progress: 0.4, image: '🚀' },
    { id: '2', title: 'Cute Monster', progress: 0.7, image: '👾' },
    { id: '3', title: 'Rainbow', progress: 0.1, image: '🌈' },
];

const BANNER_HEIGHT = 360;

export const HomeScreen = () => {
    const { coins, streak } = useUserStore();
    const navigation = useNavigation();
    const { width } = useWindowDimensions();
    const bannerWidth = width - (SPACING.m * 2);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Image source={require('../assets/fox_avatar.png')} style={styles.avatar} />
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statPill}>
                        <Text style={styles.coinIcon}>🪙</Text>
                        <Text style={styles.statText}>{coins}</Text>
                    </View>
                    <View style={styles.statPill}>
                        <Icon name="fire" size={20} color="#FF8906" />
                        <Text style={styles.statText}>Streak {streak}</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Main Banner */}
                <View style={[styles.bannerContainer, { height: BANNER_HEIGHT }]}>
                    <Image
                        source={require('../assets/fox_banner_full.png')}
                        style={styles.bannerFullImage}
                        resizeMode="cover"
                    />

                    <TouchableOpacity
                        style={[styles.createButton, { width: bannerWidth - 40 }]}
                        onPress={() => navigation.navigate('Magic')}
                        activeOpacity={0.9}
                    >
                        <Text style={styles.createButtonText}>CREATE NEW</Text>
                    </TouchableOpacity>
                </View>

                {/* Jump Back In */}
                <Text style={styles.sectionTitle}>Jump Back In</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {JUMP_BACK_IN.map((item) => (
                        <TouchableOpacity key={item.id} style={styles.artCard}>
                            <View style={styles.artCardImagePlaceholder}>
                                <Text style={{ fontSize: 40 }}>{item.image}</Text>
                            </View>
                            <Text style={styles.artCardTitle}>{item.title}</Text>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: `${item.progress * 100}%` }]} />
                            </View>
                        </TouchableOpacity>
                    ))}
                    <View style={{ width: SPACING.m }} />
                </ScrollView>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F4F8',
    },
    absoluteFill: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
    },
    avatarContainer: {
        width: 50, height: 50,
        borderRadius: 25,
        backgroundColor: 'white',
        ...SHADOWS.small,
        justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2, borderColor: 'white'
    },
    avatar: { width: '100%', height: '100%' },
    statsContainer: {
        flexDirection: 'row',
        gap: SPACING.s,
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
    coinIcon: { fontSize: 16 },
    statText: { ...FONTS.bold, color: '#2D3436', fontSize: 14 },

    scrollContent: {
        padding: SPACING.m,
    },

    // Banner
    bannerContainer: {
        marginBottom: SPACING.xl,
        borderRadius: 30,
        position: 'relative',
        ...SHADOWS.medium,
        backgroundColor: 'white',
        overflow: 'hidden', // Ensure image clips to radius
    },
    bannerFullImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        resizeMode: 'stretch',
    },
    createButton: {
        position: 'absolute',
        bottom: 15,
        alignSelf: 'center',
        backgroundColor: '#FFD700',
        paddingVertical: 14,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        elevation: 10, // High elevation
        shadowColor: '#F57F17',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    createButtonText: {
        ...FONTS.bold,
        color: 'white',
        fontSize: 20,
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    bannerImage: {
        width: 200,
        height: 220,
        position: 'absolute',
        right: 10,
        bottom: 40, // Moved up to not be hidden by button
        zIndex: 1,
    },

    // Horizontal Scroll
    sectionTitle: {
        ...FONTS.bold,
        fontSize: 22,
        color: '#2D3436',
        marginBottom: SPACING.m,
    },
    horizontalScroll: {
        marginBottom: SPACING.l,
    },
    artCard: {
        width: 140,
        height: 100,
        backgroundColor: 'white',
        borderRadius: 20,
        marginRight: SPACING.m,
        padding: SPACING.s,
        elevation: 3,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    artCardImagePlaceholder: {
        flex: 1,
        backgroundColor: '#F7F9FC',
        borderRadius: 16,
        marginBottom: SPACING.s,
        justifyContent: 'center', alignItems: 'center'
    },
    artCardTitle: {
        ...FONTS.medium,
        color: '#2D3436',
        marginBottom: 8,
        fontSize: 14,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#EFF0F6',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.secondary,
        borderRadius: 3,
    }
});

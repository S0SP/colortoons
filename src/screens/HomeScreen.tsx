import React, { useCallback, useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image, ScrollView,
    useWindowDimensions, Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserStore } from '../store';
import { usePaintingStore, SavedPainting } from '../store/usePaintingStore';
import { DailyRewardModal } from '../components/DailyRewardModal';
import { CreateNewButton } from '../components/CreateNewButton';
import { FONTS, SPACING } from '../theme';
import { AudioManager } from '../services/AudioManager';

const BANNER_HEIGHT = 360;

// High-Density Jump Back In Card
const JumpBackInCard = ({ painting, onPress, onDelete }: { painting: SavedPainting; onPress: () => void; onDelete: () => void; }) => {
    const progressPercent = Math.round(painting.progress * 100);
    // Fix backend file names fallback
    const displayTitle = painting.title && !painting.title.includes('.png') && !painting.title.includes('.jpg') 
        ? painting.title 
        : 'Active Project';

    const handleLongPress = () => {
        Alert.alert('Delete Project?', `Remove "${displayTitle}" from your saved projects?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: onDelete },
        ]);
    };

    return (
        <TouchableOpacity style={styles.artCard} onPress={onPress} onLongPress={handleLongPress} activeOpacity={0.8}>
            <View style={styles.artCardImageContainer}>
                {painting.thumbnailB64 ? (
                    <Image source={{ uri: `data:image/jpeg;base64,${painting.thumbnailB64}` }} style={styles.artCardImage as any} resizeMode="cover" />
                ) : (
                    <View style={styles.artCardPlaceholder}>
                        {/* Faint wireframe/placeholder representing the art */}
                        <Icon name="vector-polyline" size={40} color="rgba(255,255,255,0.1)" />
                    </View>
                )}
                {/* 1px Border Overlay */}
                <View style={styles.artCardImageBorder} />
            </View>

            <View style={styles.artCardMeta}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.artCardTitle} numberOfLines={1}>{displayTitle}</Text>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${progressPercent}%` }]} />
                    </View>
                </View>
                <View style={styles.continueButton}>
                    <Icon name="play" size={16} color="#FFF" />
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const HomeScreen = () => {
    const { coins, streak, energy, canClaimDailyReward, checkEnergyRefill } = useUserStore();
    const { getRecentPaintings, deletePainting } = usePaintingStore();
    const navigation = useNavigation();
    const { width } = useWindowDimensions();
    const bannerWidth = width - SPACING.m * 2;
    const [showDailyReward, setShowDailyReward] = useState(false);
    const [isMuted, setIsMuted] = useState(AudioManager.muted);

    const recentPaintings = getRecentPaintings(10);

    useEffect(() => {
        checkEnergyRefill();
        if (canClaimDailyReward()) {
            setTimeout(() => setShowDailyReward(true), 500);
        }
    }, []);

    useFocusEffect(useCallback(() => {
        AudioManager.initialize().then(() => AudioManager.playAppMusic());
        return () => { };
    }, []));

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Image source={require('../assets/fox_avatar.png')} style={styles.avatar as any} />
                </View>
                <View style={styles.statsContainer}>
                    {/* Status Pill: Coins */}
                    <View style={[styles.statPill, { borderColor: '#F59E0B' }]}>
                        <Icon name="star-four-points-outline" size={18} color="#F59E0B" />
                        <Text style={styles.statText}>{coins}</Text>
                    </View>
                    {/* Status Pill: Streak */}
                    <View style={[styles.statPill, { borderColor: '#EF4444' }]}>
                        <Icon name="fire" size={18} color="#EF4444" />
                        <Text style={styles.statText}>{streak}</Text>
                    </View>
                    {/* Status Pill: Energy */}
                    <View style={[styles.statPill, { borderColor: '#38BDF8' }]}>
                        <Icon name="lightning-bolt" size={18} color="#38BDF8" />
                        <Text style={styles.statText}>{energy}</Text>
                    </View>

                    <TouchableOpacity style={styles.iconBtn} onPress={() => setIsMuted(AudioManager.toggleMute())}>
                        <Icon name={isMuted ? 'volume-off' : 'volume-high'} size={20} color="#F5F5F5" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={[styles.bannerContainer, { height: BANNER_HEIGHT }]}>
                    <Image source={require('../assets/fox_banner_full.png')} style={styles.bannerFullImage as any} resizeMode="cover" />
                    <View style={styles.createButtonContainer}>
                        <CreateNewButton width={bannerWidth - 40} onPress={() => (navigation as any).navigate('Magic')} />
                    </View>
                </View>

                {recentPaintings.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Jump Back In</Text>
                            <Text style={styles.sectionSubtitle}>{recentPaintings.length} saved</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll} contentContainerStyle={{ paddingRight: SPACING.m }}>
                            {recentPaintings.map((painting) => (
                                <JumpBackInCard key={painting.id} painting={painting} onPress={() => {
                                    AudioManager.playGameMusic();
                                    (navigation as any).navigate('Game', { data: painting.backendData, title: painting.title, savedPaintingId: painting.id, resumeFilledRegions: painting.filledRegions });
                                }} onDelete={() => deletePainting(painting.id)} />
                            ))}
                        </ScrollView>
                    </>
                )}
                <View style={{ height: 120 }} />
            </ScrollView>
            <DailyRewardModal visible={showDailyReward} onClose={() => setShowDailyReward(false)} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s },
    avatarContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    avatar: { width: '100%', height: '100%' },
    statsContainer: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    statPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4, borderWidth: 1 },
    statText: { ...FONTS.bold, color: '#F5F5F5', fontSize: 13 } as any,
    iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    scrollContent: { padding: SPACING.m },
    bannerContainer: { marginBottom: SPACING.xl, borderRadius: 24, position: 'relative', backgroundColor: '#1A1A1A', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    bannerFullImage: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, opacity: 0.9 },
    createButtonContainer: { position: 'absolute', bottom: 16, alignSelf: 'center', zIndex: 10 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.m },
    sectionTitle: { ...FONTS.bold, fontSize: 20, color: '#F5F5F5' } as any,
    sectionSubtitle: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
    horizontalScroll: { marginBottom: SPACING.l, marginLeft: -SPACING.m, paddingLeft: SPACING.m },
    artCard: { width: 140, backgroundColor: 'transparent', marginRight: SPACING.m },
    artCardImageContainer: { width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1A1A1A', marginBottom: 8, position: 'relative' },
    artCardImage: { width: '100%', height: '100%', opacity: 0.8 },
    artCardImageBorder: { ...StyleSheet.absoluteFillObject, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    artCardPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    artCardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    artCardTitle: { ...FONTS.medium, color: '#F5F5F5', fontSize: 13, marginBottom: 4 } as any,
    progressBarBg: { height: 4, backgroundColor: '#262626', borderRadius: 2, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#6366F1', borderRadius: 2 },
    continueButton: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6366F1', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
});
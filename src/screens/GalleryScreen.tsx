import React, { useState, useCallback } from 'react';
import {
    View, Text, Image, TextInput, ScrollView, FlatList,
    TouchableOpacity, StyleSheet, Dimensions, Alert, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AudioManager } from '../services/AudioManager';
import RNFS from 'react-native-fs';

const { width } = Dimensions.get('window');

const ASSETS: Record<string, any> = {};
try {
    ASSETS.tiger = require('../assets/gallery/card_1_tiger_1770252714051.png');
    ASSETS.castle = require('../assets/gallery/card_2_castle_1770252730046.png');
    ASSETS.mandala = require('../assets/gallery/card_3_mandala_1770252750695.png');
    ASSETS.car = require('../assets/gallery/card_4_car_1770252765697.png');
} catch (e) {
    console.warn('[Gallery] Some assets not found, using placeholders');
}

const CATEGORIES = [
    { id: 'all', label: 'All', emoji: '✨' },
    { id: 'animals', label: 'Animals', emoji: '🦁' },
    { id: 'nature', label: 'Nature', emoji: '🌲' },
    { id: 'fantasy', label: 'Fantasy', emoji: '🦄' },
    { id: 'vehicles', label: 'Vehicles', emoji: '🚀' },
    { id: 'mandala', label: 'Mandala', emoji: '🔮' },
];

interface GalleryItem {
    id: string;
    title: string;
    image: any;
    emoji: string;
    category: string;
    liked: boolean;
    isNew: boolean;
    difficulty: 'easy' | 'medium' | 'hard';
}

const INITIAL_CARDS: GalleryItem[] = [
    { id: '1', title: 'Jungle King', image: ASSETS.tiger, emoji: '🐯', category: 'animals', liked: false, isNew: false, difficulty: 'medium' },
    { id: '2', title: 'Fairytale Castle', image: ASSETS.castle, emoji: '🏰', category: 'fantasy', liked: false, isNew: true, difficulty: 'hard' },
    { id: '3', title: 'Zen Mandala', image: ASSETS.mandala, emoji: '🔮', category: 'mandala', liked: true, isNew: false, difficulty: 'hard' },
    { id: '4', title: 'Cyber Speed', image: ASSETS.car, emoji: '🚗', category: 'vehicles', liked: false, isNew: true, difficulty: 'medium' },
    { id: '5', title: 'Tiger Portrait', image: ASSETS.tiger, emoji: '🐅', category: 'animals', liked: false, isNew: false, difficulty: 'easy' },
    { id: '6', title: 'Magic Tower', image: ASSETS.castle, emoji: '🗼', category: 'fantasy', liked: false, isNew: true, difficulty: 'medium' },
    { id: '7', title: 'Forest Path', image: null, emoji: '🌲', category: 'nature', liked: false, isNew: false, difficulty: 'easy' },
    { id: '8', title: 'Ocean Waves', image: null, emoji: '🌊', category: 'nature', liked: true, isNew: false, difficulty: 'medium' },
];

const renderDifficultyStars = (difficulty: 'easy' | 'medium' | 'hard') => {
    const starCount = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
    return '⭐'.repeat(starCount);
};

const GalleryCard = ({ item, onPress, onLike }: { item: GalleryItem; onPress: () => void; onLike: () => void; }) => {
    const [imageError, setImageError] = useState(false);

    return (
        <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.8}>
            <View style={styles.imageWrapper}>
                {item.image && !imageError ? (
                    <Image source={item.image} style={styles.cardImage} onError={() => setImageError(true)} />
                ) : (
                    <View style={styles.emojiPlaceholder}>
                        <Text style={styles.emojiText}>{item.emoji}</Text>
                    </View>
                )}
                {item.isNew && <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>}
                <View style={styles.imageBorderOverlay} />
            </View>
            <View style={styles.cardFooter}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.difficultyText}>{renderDifficultyStars(item.difficulty)}</Text>
                </View>
                <TouchableOpacity onPress={onLike} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name={item.liked ? 'heart' : 'heart-outline'} size={18} color={item.liked ? '#EF4444' : '#8E8E93'} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

export const GalleryScreen = ({ navigation }: any) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cards, setCards] = useState<GalleryItem[]>(INITIAL_CARDS);
    const [isLoadingImage, setIsLoadingImage] = useState(false);

    useFocusEffect(useCallback(() => { AudioManager.playAppMusic(); return () => {}; }, []));

    const filteredCards = cards.filter(card => {
        const matchesCategory = selectedCategory === 'all' || card.category === selectedCategory;
        const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleLike = (id: string) => {
        setCards(current => current.map(card => card.id === id ? { ...card, liked: !card.liked } : card));
    };



    const handleCardPress = async (item: GalleryItem) => {
        if (!item.image) {
            Alert.alert('Not Available', 'Image not available. Try another.');
            return;
        }

        const resolved = Image.resolveAssetSource(item.image);
        if (!resolved?.uri) {
            Alert.alert('Error', 'Could not resolve image source.');
            return;
        }

        setIsLoadingImage(true);
        try {
            // We pass the resolved.uri directly because api.ts handles platform-specific resolution
            // (e.g. copying Android resources or downloading remote URLs automatically)
            navigation.navigate('Processing', {
                imageUri: resolved.uri,
                title: item.title,
                id: item.id,
                options: {
                    numColors: item.difficulty === 'easy' ? 16 : item.difficulty === 'medium' ? 24 : 32,
                    targetRegions: item.difficulty === 'easy' ? 150 : item.difficulty === 'medium' ? 250 : 400,
                    minRegionArea: item.difficulty === 'easy' ? 80 : item.difficulty === 'medium' ? 60 : 40,
                },
            });
        } catch (error) {
            console.error('[Gallery] Error:', error);
            Alert.alert('Error', 'Failed to prepare the image.');
        } finally {
            setIsLoadingImage(false);
        }
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Gallery</Text>
                <View style={styles.searchBar}>
                    <Icon name="search-outline" size={20} color="#8E8E93" style={{ marginRight: 10 }} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search artworks..."
                        placeholderTextColor="#8E8E93"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <TouchableOpacity onPress={() => {}}>
                        <Icon name="mic" size={20} color="#8E8E93" />
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                    {CATEGORIES.map(cat => {
                        const isActive = selectedCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[styles.categoryPill, isActive && styles.categoryPillActive]}
                                onPress={() => setSelectedCategory(cat.id)}
                            >
                                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>{cat.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {isLoadingImage && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFF" />
                </View>
            )}

            <FlatList
                data={filteredCards}
                renderItem={({ item }) => <GalleryCard item={item} onPress={() => handleCardPress(item)} onLike={() => handleLike(item.id)} />}
                keyExtractor={item => item.id}
                numColumns={3}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Icon name="image-outline" size={60} color="#262626" />
                        <Text style={styles.emptyText}>No artworks found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

// Calculate 3-column width layout with gap
const cardWidth = (width - 32 - 16) / 3;

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#121212' },
    headerContainer: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 16 },
    headerTitle: { fontSize: 28, fontWeight: '800', color: '#F5F5F5', marginBottom: 16, letterSpacing: -0.5 },
    searchBar: { backgroundColor: '#1A1A1A', borderRadius: 12, height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    searchInput: { flex: 1, fontSize: 15, color: '#F5F5F5' },
    categoryList: { paddingRight: 16, gap: 8 },
    categoryPill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, marginRight: 8, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    categoryPillActive: { backgroundColor: '#262626', borderColor: '#6366F1' },
    categoryEmoji: { fontSize: 14, marginRight: 4 },
    categoryText: { fontWeight: '600', fontSize: 13, color: '#8E8E93' },
    categoryTextActive: { color: '#F5F5F5' },
    gridContainer: { paddingHorizontal: 16, paddingBottom: 120 }, // 120 padding bottom to fix overlap bug
    columnWrapper: { justifyContent: 'space-between' },
    cardContainer: { width: cardWidth, marginBottom: 16 },
    imageWrapper: { position: 'relative', width: '100%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1A1A1A' },
    cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    imageBorderOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    emojiPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emojiText: { fontSize: 32 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 8 },
    cardTitle: { fontWeight: '600', fontSize: 12, color: '#F5F5F5', marginBottom: 2 },
    difficultyText: { fontSize: 10, color: '#8E8E93' },
    newBadge: { position: 'absolute', top: 6, left: 6, backgroundColor: '#6366F1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
    newBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '800' },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyText: { fontSize: 16, fontWeight: '600', color: '#8E8E93', marginTop: 16 },
    loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(18,18,18,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
});

import React, { useState } from 'react';
import { View, Text, Image, TextInput, ScrollView, FlatList, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// --- Assets ---
// Using require with the exact filenames generated
const ASSETS = {
    tiger: require('../assets/gallery/card_1_tiger_1770252714051.png'),
    castle: require('../assets/gallery/card_2_castle_1770252730046.png'),
    mandala: require('../assets/gallery/card_3_mandala_1770252750695.png'),
    car: require('../assets/gallery/card_4_car_1770252765697.png'),
    badgeNew: require('../assets/gallery/badge_new_starburst_1770252805503.png'),
    badgeAI: require('../assets/gallery/badge_ai_glow_1770252781446.png'),
};

// --- Data ---
const CATEGORIES = [
    { id: 'all', label: 'All', bg: '#000000', text: '#FFFFFF' },
    { id: 'animals', label: 'Animals', bg: '#FFA500', text: '#FFFFFF' },
    { id: 'robots', label: 'Robots', bg: '#60A5FA', text: '#FFFFFF' },
    { id: 'princesses', label: 'Princesses', bg: '#F472B6', text: '#FFFFFF' },
    { id: 'space', label: 'Space', bg: '#A855F7', text: '#FFFFFF' },
];

const INITIAL_CARDS = [
    { id: '1', title: 'Jungle King', image: ASSETS.tiger, badge: 'completed', badgeType: 'completed', category: 'animals', liked: false },
    { id: '2', title: 'Fairytale Castle', image: ASSETS.castle, badge: 'New', badgeType: 'new', category: 'princesses', liked: false },
    { id: '3', title: 'Zen Mandala', image: ASSETS.mandala, badge: null, badgeType: null, category: 'all', liked: true },
    { id: '4', title: 'Cyber Speed', image: ASSETS.car, badge: 'AI', badgeType: 'ai', category: 'robots', liked: false },
    { id: '5', title: 'Tiger Portrait', image: ASSETS.tiger, badge: null, badgeType: null, category: 'animals', liked: false },
    { id: '6', title: 'Magic Tower', image: ASSETS.castle, badge: 'New', badgeType: 'new', category: 'princesses', liked: false },
];

// --- Components ---

const GalleryCard = ({ item, onPress, onLike }: { item: any, onPress: () => void, onLike: () => void }) => {
    return (
        <TouchableOpacity style={styles.cardContainer} onPress={onPress}>
            <View style={styles.imageWrapper}>
                <Image source={item.image} style={styles.cardImage} />

                {/* Badges */}
                {item.badgeType === 'completed' && (
                    <View style={styles.badgeCompleted}>
                        <Icon name="checkmark-circle" size={16} color="#22C55E" />
                        <Text style={styles.badgeTextCompleted}>Completed</Text>
                    </View>
                )}
                {item.badgeType === 'new' && (
                    <Image source={ASSETS.badgeNew} style={styles.badgeNew} resizeMode="contain" />
                )}
                {item.badgeType === 'ai' && (
                    <Image source={ASSETS.badgeAI} style={styles.badgeAI} resizeMode="contain" />
                )}
            </View>

            <View style={styles.cardFooter}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <TouchableOpacity onPress={onLike}>
                    <Icon name={item.liked ? "heart" : "heart-outline"} size={20} color={item.liked ? "#EF4444" : "#374151"} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

// BottomDock Removed


// ... imports

// ... Header, GalleryCard components remain same

export const GalleryScreen = ({ navigation }: any) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [cards, setCards] = useState(INITIAL_CARDS);

    // Filter Logic
    const filteredCards = cards.filter(card => {
        const matchesCategory = selectedCategory === 'all' || card.category === selectedCategory;
        const matchesSearch = card.title.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    // Handlers
    const handleLike = (id: string) => {
        setCards(currentCards =>
            currentCards.map(card =>
                card.id === id ? { ...card, liked: !card.liked } : card
            )
        );
    };

    const handleCardPress = (item: any) => {
        // Navigate to Processing Screen to simulate "Image to Outline" steps
        console.log('Opening for processing:', item.title);
        navigation.navigate('Processing', {
            image: item.image,
            title: item.title,
            id: item.id
        });
    };

    return (
        <SafeAreaView style={styles.screen} edges={['top']}>
            <View style={styles.headerContainer}>
                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Icon name="search-outline" size={20} color="#9CA3AF" style={{ marginRight: 10 }} />
                    <TextInput
                        style={styles.searchText}
                        placeholder="Search for Cats, Cars, Space..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>

                {/* Categories */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
                    {CATEGORIES.map((cat, index) => {
                        const isActive = selectedCategory === cat.id;
                        return (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.categoryPill,
                                    { backgroundColor: isActive ? cat.bg : '#E5E7EB' } // Gray if inactive
                                ]}
                                onPress={() => setSelectedCategory(cat.id)}
                            >
                                <Text style={[
                                    styles.categoryText,
                                    { color: isActive ? cat.text : '#4B5563' }
                                ]}>
                                    {cat.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <FlatList
                data={filteredCards}
                renderItem={({ item }) => (
                    <GalleryCard
                        item={item}
                        onPress={() => handleCardPress(item)}
                        onLike={() => handleLike(item.id)}
                    />
                )}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 50 }}>
                        <Text style={{ color: '#9CA3AF', fontSize: 16 }}>No art found 🎨</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
    },
    searchBar: {
        backgroundColor: '#FFFFFF',
        borderRadius: 50,
        height: 50,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 20,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    searchText: {
        fontFamily: 'System',
        fontSize: 14,
        color: '#9CA3AF',
    },
    categoryList: {
        paddingRight: 16,
    },
    categoryPill: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 50,
        marginRight: 10,
    },
    categoryText: {
        fontWeight: 'bold',
        fontSize: 14,
    },
    // Grid
    gridContainer: {
        paddingHorizontal: 16,
        paddingBottom: 100, // Space for CustomTabBar
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    // Card
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 8,
        width: (width - 48) / 2, // 2 columns with spacing
        marginBottom: 16,
        // Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 4,
    },
    imageWrapper: {
        position: 'relative',
        width: '100%',
        aspectRatio: 1,
        borderRadius: 16,
        overflow: 'hidden',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 12,
        paddingHorizontal: 4,
        paddingBottom: 4,
    },
    cardTitle: {
        fontWeight: 'bold',
        fontSize: 14,
        color: '#111827',
    },
    // Badges
    badgeCompleted: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'white',
        borderRadius: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    badgeTextCompleted: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#111827',
    },
    badgeNew: {
        position: 'absolute',
        top: -10, // Overhanging
        left: -10,
        width: 50,
        height: 50,
    },
    badgeAI: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 40,
        height: 40,
    },
});

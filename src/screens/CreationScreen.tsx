import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, FONTS, SHADOWS } from '../theme';
import { StyleCard } from '../components/StyleCard';
import { DifficultySlider } from '../components/DifficultySlider';
import { generatePainting } from '../services/api';
import { useUserStore } from '../store';
import { useNavigation } from '@react-navigation/native';

const STYLES = [
    { id: 'cartoon', label: 'Cartoon', emoji: '🎨' },
    { id: 'realistic', label: 'Realistic', emoji: '👁️' },
    { id: 'pixel', label: 'Pixel', emoji: '👾' },
    { id: 'anime', label: 'Anime', emoji: '🎌' },
];

import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { launchImageLibrary } from 'react-native-image-picker';
import ImageProcessorService from '../services/ImageProcessor';

export const CreationScreen = () => {
    const navigation = useNavigation();
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('cartoon');
    const [difficulty, setDifficulty] = useState(10);
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);

    const { coins, useEnergy } = useUserStore();

    React.useEffect(() => {
        const onSpeechStart = () => setIsListening(true);
        const onSpeechEnd = () => setIsListening(false);
        const onSpeechError = (e: SpeechErrorEvent) => {
            console.error(e);
            setIsListening(false);
        };
        const onSpeechResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value[0]) {
                setPrompt(e.value[0]);
            }
        };

        Voice.onSpeechStart = onSpeechStart;
        Voice.onSpeechEnd = onSpeechEnd;
        Voice.onSpeechError = onSpeechError;
        Voice.onSpeechResults = onSpeechResults;

        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
        };
    }, []);

    const toggleListening = async () => {
        try {
            if (isListening) {
                await Voice.stop();
            } else {
                setPrompt(''); // Clear previous prompt for new input, or we can append if desired
                await Voice.start('en-US');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleCreate = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        try {
            // BYPASS: Mock Data for Testing without Backend
            // const data = await generatePainting(prompt, selectedStyle, difficulty);

            // Simulating API delay
            await new Promise(r => setTimeout(r, 1500));

            const mockData = {
                width: 500, height: 500,
                palette: ["#FF5733", "#33FF57", "#3357FF", "#FFFF33"],
                regions: [
                    // Simple Square (Color 0 - Red)
                    { colorIndex: 0, pathData: "M50,50 L200,50 L200,200 L50,200 Z", labelPoint: { x: 125, y: 125 } },
                    // Simple Square (Color 1 - Green)
                    { colorIndex: 1, pathData: "M220,50 L370,50 L370,200 L220,200 Z", labelPoint: { x: 295, y: 125 } },
                    // Triangle (Color 2 - Blue)
                    { colorIndex: 2, pathData: "M50,250 L200,400 L50,400 Z", labelPoint: { x: 80, y: 350 } },
                    // Circle-ish (Color 3 - Yellow)
                    { colorIndex: 3, pathData: "M250,325 Q250,250 325,250 Q400,250 400,325 Q400,400 325,400 Q250,400 250,325 Z", labelPoint: { x: 325, y: 325 } }
                ]
            };

            console.log("Using Mock Data:", mockData.regions.length, "regions");
            // Navigate to Game Screen
            navigation.navigate('Game' as any, { data: mockData });
        } catch (e) {
            Alert.alert("Error", "Failed to generate painting");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async () => {
        try {
            const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
            });

            if (result.didCancel) return;
            if (result.errorMessage) {
                Alert.alert("Error", result.errorMessage);
                return;
            }

            if (result.assets && result.assets.length > 0 && result.assets[0].uri) {
                const imageUri = result.assets[0].uri;
                setLoading(true);

                // Process the image
                try {
                    console.log("Processing image:", imageUri);
                    // Use 800x800 as target size
                    const processedData = await ImageProcessorService.convertToOutline(imageUri, 800, 800);

                    console.log("Processing complete, regions:", processedData.regions.length);
                    // Map result to GameScreen format
                    // Note: region.colorId is 1-based from Java module, we make it 0-based for palette index
                    // palette usually has 10 colors.

                    // Create a palette based on colorIds or static
                    const palette = [
                        '#1A237E', '#283593', '#00ACC1', '#E0E0E0', '#FFB74D',
                        '#E57373', '#9575CD', '#64B5F6', '#81C784', '#FFD54F'
                    ];

                    const gameData = {
                        width: processedData.width,
                        height: processedData.height,
                        palette: palette,
                        regions: processedData.regions.map(r => ({
                            colorIndex: (r.colorId - 1) % palette.length,
                            pathData: r.pathData,
                            labelPoint: r.center
                        }))
                    };

                    navigation.navigate('Game' as any, {
                        data: gameData,
                        image: processedData.outlineUri // Use the processed outline as background if needed, or original
                    });

                } catch (err: any) {
                    console.error("Image Processing Failed:", err);
                    Alert.alert("Error", "Failed to process image: " + err.message);
                } finally {
                    setLoading(false);
                }
            }
        } catch (err) {
            console.error(err);
            Alert.alert("Error", "Failed to pick image");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header: Fox & Bubble & Input */}
            <View style={styles.topSection}>
                {/* Fox Peeking - Rendered First but Z-indexed in styles */}
                <Image
                    source={require('../assets/fox_peeking.png')}
                    style={styles.foxPeeking}
                    resizeMode="contain"
                />

                {/* Speech Bubble */}
                <View style={styles.speechBubbleContainer}>
                    <View style={styles.speechBubble}>
                        <Text style={styles.speechText}>What shall we{'\n'}paint today?</Text>
                        <View style={styles.bubbleTail} />
                    </View>
                </View>

                {/* Input Area (Below Fox Paws) */}
                <View style={styles.inputCard}>
                    <View style={styles.inputInnerContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Draw a dinosaur drinking a..."
                            placeholderTextColor="#94A3B8"
                            multiline
                            value={prompt}
                            onChangeText={setPrompt}
                        />
                    </View>
                    {/* Mic Button */}
                    <TouchableOpacity
                        style={[styles.micButton, isListening && styles.micButtonActive]}
                        onPress={toggleListening}
                    >
                        <Icon
                            name={isListening ? "microphone-off" : "microphone"}
                            size={28}
                            color={isListening ? "#FFF" : "#00A3FF"}
                        />
                    </TouchableOpacity>

                    {/* Image Upload Button - Left Side */}
                    <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={handleImageUpload}
                        disabled={loading}
                    >
                        <Icon
                            name="image-plus"
                            size={28}
                            color="#7d51c1"
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Pick a Style</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleList}>
                {STYLES.map(s => (
                    <StyleCard
                        key={s.id}
                        label={s.label}
                        emoji={s.emoji}
                        selected={selectedStyle === s.id}
                        onPress={() => setSelectedStyle(s.id)}
                    />
                ))}
            </ScrollView>

            <Text style={styles.sectionTitle}>Difficulty</Text>
            <View style={styles.sliderContainer}>
                <DifficultySlider
                    value={difficulty}
                    onValueChange={setDifficulty}
                    min={5}
                    max={30}
                />
            </View>

            <TouchableOpacity
                style={[styles.button, (!prompt || loading) && styles.disabledButton]}
                onPress={handleCreate}
                disabled={loading || !prompt}
            >
                {loading ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ActivityIndicator color="#FFF" />
                        <Text style={[styles.buttonText, { marginLeft: 10 }]}>Processing...</Text>
                    </View>
                ) : (
                    <Text style={styles.buttonText}>MAKE IT REAL! ⚡</Text>
                )}
            </TouchableOpacity>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#e9dafe', // Lavender to match fox background
        padding: SPACING.m,
    },
    topSection: {
        marginTop: 100, // Moved down by ~30%
        marginBottom: SPACING.l,
        position: 'relative',
        height: 200, // Increased height
    },
    // Bubble
    speechBubbleContainer: {
        position: 'absolute',
        top: -50, // Align with fox head
        right: 20, // Keep some margin
        left: 150, // Start after Fox head (140 wide)
        zIndex: 5,
        alignItems: 'flex-start',
    },
    speechBubble: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 24, // Very rounded
        ...SHADOWS.small,
        elevation: 4,
        width: '100%',
    },
    speechText: {
        fontFamily: 'sans-serif-rounded', // Android rounded font
        fontWeight: '700', // Extra Bold
        color: '#7d51c1', // Vibrant Purple
        fontSize: 20,
        lineHeight: 24,
        textAlign: 'center',
    },
    bubbleTail: {
        position: 'absolute',
        left: -12, // Move outside bubble on the left
        top: '50%', // Center vertically relative to bubble size? Or lower?
        marginTop: 10, // Push down a bit to match "mouth" level
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderTopWidth: 10,
        borderBottomWidth: 10,
        borderRightWidth: 15, // Points left
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        borderRightColor: 'white', // The visible triangle
    },
    // Fox
    foxPeeking: {
        position: 'absolute',
        bottom: 181.5, // Move up to sit ON TOP of the box (overlap slightly for blend)
        left: 20,
        width: 140,
        height: 140, // Larger to see details
        zIndex: 2,
    },
    // Input
    // Input - Outer "Double Border" Container
    inputCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF', // Outer Border Color (White)
        borderRadius: 34, // Slightly larger
        padding: 6, // Matches "Border Width" of outer layer
        height: 198, // Total Height

        // Outside Shadow
        elevation: 8,
        shadowColor: '#6D28D9', // Purple-ish shadow
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 10,

        zIndex: 1,
    },
    // Inner "Inset" Container
    inputInnerContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Slightly off-white for "inset" feel
        borderRadius: 28, // Matches inner curve
        borderWidth: 2,
        borderColor: '#E2E8F0', // Inner subtle border
        padding: SPACING.m,
        paddingTop: 34, // Text spacing
        paddingRight: 80,

        // "Inside Blur" simulation (using faint inner border color usually works best in RN w/o Skia)
        // If we want true inner shadow, we need a library. 
        // For now, let's rely on the color diff and border.
    },
    input: {
        ...FONTS.medium,
        fontSize: 20,
        color: '#475569',
        flex: 1,
        textAlignVertical: 'top',
        marginTop: 2,
    },
    micButton: {
        position: 'absolute',
        bottom: 30,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF',
        borderWidth: 3,
        borderColor: '#00A3FF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    micButtonActive: {
        backgroundColor: '#EF4444', // Red for recording
        borderColor: '#EF4444',
    },
    uploadButton: {
        position: 'absolute',
        bottom: 30,
        left: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF',
        borderWidth: 3,
        borderColor: '#7d51c1',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    sectionTitle: {
        ...FONTS.bold,
        fontSize: 20,
        color: 'rgba(51, 13, 107)', // Slate
        marginBottom: 12,
    },
    styleList: {
        marginBottom: SPACING.l,
        overflow: 'visible', // For shadows
        maxHeight: 140,
    },
    sliderContainer: {
        // backgroundColor: COLORS.card, // Removed dark card
        paddingHorizontal: SPACING.m, // Keep horizontal padding
        // padding: SPACING.m, // Removed vertical padding
        // borderRadius: 12,
        marginBottom: SPACING.xxl,
    },
    button: {
        backgroundColor: 'purple',
        padding: SPACING.m,
        borderRadius: 30,
        alignItems: 'center',
        shadowColor: 'purple',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 8,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        color: COLORS.white,
        ...FONTS.bold,
        fontSize: 20,
    },
});

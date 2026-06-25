import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DifficultySlider } from '../components/DifficultySlider';
import { RegionSlider, getRegionLabel } from '../components/RegionSlider';
import { useUserStore } from '../store';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AudioManager } from '../services/AudioManager';

import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';
import { launchImageLibrary } from 'react-native-image-picker';
import { ProcessImageOptions } from '../services/api';

const STYLES = [
    { id: 'cartoon', label: 'Cartoon' },
    { id: 'realistic', label: 'Realistic' },
    { id: 'pixel', label: 'Pixel Art' },
    { id: 'anime', label: 'Anime' },
    { id: 'watercolor', label: 'Watercolor' },
];

export const CreationScreen = () => {
    const navigation = useNavigation();
    const [prompt, setPrompt] = useState('');
    const [selectedStyle, setSelectedStyle] = useState('cartoon');
    const [difficulty, setDifficulty] = useState(50);
    const [targetRegions, setTargetRegions] = useState(400);
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
    const [selectedImageTitle, setSelectedImageTitle] = useState<string | null>(null);
    const [confirmImageUri, setConfirmImageUri] = useState<string | null>(null);

    const { coins, useEnergy } = useUserStore();
    const GENERATION_COST = 20;

    useFocusEffect(
        React.useCallback(() => {
            AudioManager.playAppMusic();
            setPrompt('');
            setSelectedImageUri(null);
            setSelectedImageTitle(null);
            return () => { };
        }, [])
    );

    const getProcessingOptions = (): ProcessImageOptions => {
        let numColors: number;
        let minRegionArea: number;

        if (difficulty < 25) { numColors = 12; minRegionArea = 100; }
        else if (difficulty < 50) { numColors = 24; minRegionArea = 50; }
        else if (difficulty < 75) { numColors = 32; minRegionArea = 25; }
        else if (difficulty < 90) { numColors = 64; minRegionArea = 10; }
        else { numColors = 128; minRegionArea = 1; }

        return { numColors, minRegionArea, targetRegions, maxDimension: 1024 };
    };

    useEffect(() => {
        Voice.onSpeechStart = () => setIsListening(true);
        Voice.onSpeechEnd = () => setIsListening(false);
        Voice.onSpeechError = (e: SpeechErrorEvent) => {
            setIsListening(false);
            if (e.error?.message) Alert.alert('Voice Error', e.error.message);
        };
        Voice.onSpeechResults = (e: SpeechResultsEvent) => {
            if (e.value?.[0]) setPrompt(prev => prev ? `${prev} ${e.value![0]}` : e.value![0]);
        };

        return () => {
            Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => {});
        };
    }, []);

    const toggleListening = async () => {
        try {
            if (isListening) {
                await Voice.stop();
                setIsListening(false);
            } else {
                if (Platform.OS === 'android') {
                    const { PermissionsAndroid } = require('react-native');
                    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
                    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                        Alert.alert('Permission Denied', 'Microphone permission is required');
                        return;
                    }
                }
                await Voice.start('en-US');
            }
        } catch (e: any) {
            setIsListening(false);
            Alert.alert('Voice Error', e.message || 'Failed to start voice recognition');
        }
    };

    const handleMainAction = () => {
        if (!prompt.trim() && !selectedImageUri) {
            Alert.alert('Missing Input', 'Please enter a prompt or select an image');
            return;
        }

        if (coins < GENERATION_COST) {
            Alert.alert(
                'Not Enough Coins',
                `Generating art costs ${GENERATION_COST} coins. Play games or claim your daily reward to get more!`
            );
            return;
        }

        const options = getProcessingOptions();
        
        if (selectedImageUri) {
            navigation.navigate('Processing' as any, {
                imageUri: selectedImageUri,
                title: selectedImageTitle ?? 'My Painting',
                options,
                cost: GENERATION_COST,
            });
        } else {
            navigation.navigate('Processing' as any, {
                prompt: prompt.trim(),
                style: selectedStyle,
                title: `AI: ${prompt.trim().substring(0, 20)}...`,
                options,
                cost: GENERATION_COST,
            });
        }
    };

    const handleImageUpload = async () => {
        const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.9, maxWidth: 2048, maxHeight: 2048 });
        if (result.didCancel || !result.assets?.[0]) return;
        
        if (result.errorMessage) {
            Alert.alert('Error', result.errorMessage);
            return;
        }
        
        // Show confirmation popup first
        setConfirmImageUri(result.assets[0].uri!);
        setSelectedImageTitle(result.assets[0].fileName ?? 'My Painting');
    };

    const confirmImage = () => {
        setSelectedImageUri(confirmImageUri);
        setConfirmImageUri(null);
    };

    const cancelImage = () => {
        setConfirmImageUri(null);
        setSelectedImageTitle(null);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerTitle}>Create Magic</Text>
                </View>
                
                {/* Fox Peeking - Rendered First but Z-indexed in styles */}
                <Image
                    source={require('../assets/fox_peeking.png')}
                    style={styles.foxPeeking as any}
                    resizeMode="contain"
                />
                
                <View style={styles.inputContainer}>
                    {selectedImageUri ? (
                        <View style={styles.selectedImageWrapper}>
                            <View style={styles.imageHeader}>
                                <Icon name="image-check" size={24} color="#38BDF8" />
                                <Text style={styles.imageTitleText} numberOfLines={1}>
                                    {selectedImageTitle || 'Custom Photo Selected'}
                                </Text>
                            </View>
                            <Text style={{ color: '#A3A3A3', fontSize: 14, marginTop: 4 }}>
                                Ready to be transformed into a masterpiece. Adjust the sliders below and tap Generate.
                            </Text>
                            <TouchableOpacity style={styles.clearBtn} onPress={() => setSelectedImageUri(null)}>
                                <Icon name="close" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TextInput
                            style={styles.textInput}
                            placeholder="Describe what you want to paint..."
                            placeholderTextColor="#525252"
                            multiline
                            value={prompt}
                            onChangeText={setPrompt}
                        />
                    )}

                    <View style={styles.inputActions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleImageUpload}>
                            <Icon name="image-outline" size={24} color="#A3A3A3" />
                        </TouchableOpacity>
                        {!selectedImageUri && (
                            <TouchableOpacity style={[styles.actionBtn, isListening && styles.actionBtnActive]} onPress={toggleListening}>
                                <Icon name="microphone-outline" size={24} color={isListening ? "#FFF" : "#A3A3A3"} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {!selectedImageUri && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Art Style</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.styleScroll}>
                            {STYLES.map(s => (
                                <TouchableOpacity 
                                    key={s.id} 
                                    style={[styles.styleChip, selectedStyle === s.id && styles.styleChipActive]}
                                    onPress={() => setSelectedStyle(s.id)}
                                >
                                    <Text style={[styles.styleText, selectedStyle === s.id && styles.styleTextActive]}>
                                        {s.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Complexity</Text>
                    <DifficultySlider value={difficulty} onValueChange={setDifficulty} min={0} max={100} />
                </View>

                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={styles.sectionTitle}>Detail Level</Text>
                        <Text style={styles.detailValue}>{targetRegions} regions</Text>
                    </View>
                    <RegionSlider value={targetRegions} onValueChange={setTargetRegions} min={20} max={4000} />
                </View>

                <TouchableOpacity 
                    style={[styles.generateBtn, (!prompt.trim() && !selectedImageUri) && styles.generateBtnDisabled]} 
                    onPress={handleMainAction}
                    disabled={!prompt.trim() && !selectedImageUri}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.generateBtnText}>Generate Art</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                            <Icon name="star-four-points-outline" size={16} color="#000" />
                            <Text style={{ color: '#000', fontSize: 14, fontWeight: 'bold', marginLeft: 4 }}>
                                {GENERATION_COST}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Image Confirmation Modal */}
            <Modal
                visible={!!confirmImageUri}
                animationType="fade"
                transparent={true}
                onRequestClose={cancelImage}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Use this photo?</Text>
                        <View style={styles.modalImageContainer}>
                            {confirmImageUri && (
                                <Image 
                                    source={{ uri: confirmImageUri }} 
                                    style={styles.modalPreviewImage} 
                                />
                            )}
                        </View>
                        <Text style={styles.modalSubtitle}>
                            You can tweak the complexity sliders below after confirming.
                        </Text>
                        
                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={cancelImage}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirmBtn} onPress={confirmImage}>
                                <Text style={styles.modalConfirmText}>Confirm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#121212' },
    scrollContent: { padding: 24 },
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
    headerTitle: { fontSize: 32, fontWeight: '800', color: '#FFF', letterSpacing: -0.5 },
    foxPeeking: { width: 140, height: 140, position: 'absolute', top: 10, right: 10, zIndex: 10 },
    inputContainer: { backgroundColor: '#1A1A1A', borderRadius: 20, padding: 16, marginBottom: 32, borderWidth: 1, borderColor: '#262626' },
    textInput: { color: '#FFF', fontSize: 18, minHeight: 100, textAlignVertical: 'top', fontWeight: '500' },
    selectedImageWrapper: { backgroundColor: '#262626', borderRadius: 16, padding: 16, position: 'relative' },
    imageHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    imageTitleText: { color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 12, flex: 1 },
    selectedImageThumbnail: { width: '100%', height: 120, borderRadius: 12, resizeMode: 'cover', opacity: 0.8 },
    clearBtn: { position: 'absolute', top: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.8)', padding: 8, borderRadius: 20 },
    inputActions: { flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#262626', paddingTop: 16, marginTop: 8 },
    actionBtn: { padding: 8, marginLeft: 16, borderRadius: 12, backgroundColor: '#262626' },
    actionBtnActive: { backgroundColor: '#EF4444' },
    section: { marginBottom: 32 },
    sectionTitle: { fontSize: 14, fontWeight: '600', color: '#A3A3A3', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    styleScroll: { flexDirection: 'row' },
    styleChip: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#1A1A1A', borderWidth: 1, borderColor: '#262626', marginRight: 12 },
    styleChipActive: { backgroundColor: '#FFF', borderColor: '#FFF' },
    styleText: { color: '#A3A3A3', fontWeight: '600' },
    styleTextActive: { color: '#000' },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    detailValue: { color: '#FFF', fontSize: 14, fontWeight: '500', marginBottom: 16 },
    generateBtn: { backgroundColor: '#FFF', flexDirection: 'row', paddingVertical: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
    generateBtnDisabled: { opacity: 0.5 },
    generateBtnText: { color: '#000', fontSize: 18, fontWeight: '700', marginRight: 8 },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { backgroundColor: '#1A1A1A', borderRadius: 24, padding: 24, width: '100%', borderWidth: 1, borderColor: '#262626' },
    modalTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 20, textAlign: 'center' },
    modalImageContainer: { width: '100%', height: 300, backgroundColor: '#121212', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
    modalPreviewImage: { width: '100%', height: '100%', resizeMode: 'contain' },
    modalSubtitle: { color: '#A3A3A3', fontSize: 14, textAlign: 'center', marginBottom: 24, paddingHorizontal: 16 },
    modalActionRow: { flexDirection: 'row', gap: 12 },
    modalCancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#262626', alignItems: 'center' },
    modalCancelText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    modalConfirmBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center' },
    modalConfirmText: { color: '#000', fontSize: 16, fontWeight: '700' },
});
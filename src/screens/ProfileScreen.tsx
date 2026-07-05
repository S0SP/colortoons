import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, 
    Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useUserStore } from '../store/useUserStore';
import { usePaintingStore } from '../store/usePaintingStore';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
    // TODO: Replace with your actual Web Client ID from Google Cloud Console
    webClientId: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
});

export const ProfileScreen = () => {
    const { coins, gamesCompleted, streak, loadFromCloud } = useUserStore();
    const { loadPaintingsFromCloud } = usePaintingStore();
    const navigation = useNavigation();
    
    const [user, setUser] = useState<any>(null);
    const [authModalVisible, setAuthModalVisible] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSignUp, setIsSignUp] = useState(false);
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        // Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please enter email and password');
            return;
        }

        setIsLoading(true);
        try {
            if (isSignUp) {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
                Alert.alert('Success', 'Account created! You are now signed in.');
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                
                // On login, load cloud data to merge with local
                await loadFromCloud();
                await loadPaintingsFromCloud();
            }
            setAuthModalVisible(false);
            setEmail('');
            setPassword('');
        } catch (error: any) {
            Alert.alert('Authentication Error', error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignOut = async () => {
        setIsLoading(true);
        await supabase.auth.signOut();
        try {
            await GoogleSignin.signOut();
        } catch (error) {
            console.log('Google signOut error', error);
        }
        setIsLoading(false);
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            const userInfo = await GoogleSignin.signIn();
            if (userInfo.data?.idToken) {
                const { data, error } = await supabase.auth.signInWithIdToken({
                    provider: 'google',
                    token: userInfo.data.idToken,
                });
                if (error) throw error;
                await loadFromCloud();
                await loadPaintingsFromCloud();
                setAuthModalVisible(false);
                Alert.alert('Success', 'Signed in with Google!');
            } else {
                throw new Error('no ID token present!');
            }
        } catch (error: any) {
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                // user cancelled the login flow
            } else if (error.code === statusCodes.IN_PROGRESS) {
                // operation (e.g. sign in) is in progress already
            } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                // play services not available or outdated
                Alert.alert('Error', 'Play services not available');
            } else {
                Alert.alert('Google Sign-In Error', error.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView contentContainerStyle={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profile</Text>
                    <TouchableOpacity style={styles.settingsBtn} onPress={() => setSettingsModalVisible(true)}>
                        <Icon name="cog-outline" size={24} color="#A3A3A3" />
                    </TouchableOpacity>
                </View>

                {/* User Info / Auth */}
                <View style={styles.authCard}>
                    <View style={styles.avatarCircle}>
                        <Icon name="account" size={40} color="#525252" />
                    </View>
                    <View style={styles.authTextContainer}>
                        <Text style={styles.userName} numberOfLines={1}>
                            {user ? (user.email?.split('@')[0] || 'Artist') : 'Guest Artist'}
                        </Text>
                        <Text style={styles.userSub}>
                            {user ? 'Progress synced to cloud' : 'Sign in to sync your progress'}
                        </Text>
                    </View>
                    {user ? (
                        <TouchableOpacity style={styles.signInBtn} onPress={handleSignOut}>
                            {isLoading ? <ActivityIndicator size="small" color="#000" /> : <Text style={styles.signInText}>Sign Out</Text>}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={styles.signInBtn} onPress={() => setAuthModalVisible(true)}>
                            <Text style={styles.signInText}>Sign In</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Stats Grid */}
                <Text style={styles.sectionTitle}>Statistics</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Icon name="palette-outline" size={28} color="#38BDF8" style={styles.statIcon} />
                        <Text style={styles.statValue}>{gamesCompleted || 0}</Text>
                        <Text style={styles.statLabel}>Artworks Completed</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Icon name="fire" size={28} color="#F59E0B" style={styles.statIcon} />
                        <Text style={styles.statValue}>{streak || 0}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Icon name="star-four-points-outline" size={28} color="#A78BFA" style={styles.statIcon} />
                        <Text style={styles.statValue}>{coins}</Text>
                        <Text style={styles.statLabel}>Coins Earned</Text>
                    </View>
                </View>

                {/* Actions */}
                <Text style={styles.sectionTitle}>Manage</Text>
                <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('Gallery' as any)}>
                    <View style={styles.actionIconBg}>
                        <Icon name="image-multiple-outline" size={22} color="#E5E5E5" />
                    </View>
                    <Text style={styles.actionText}>My Masterpieces</Text>
                    <Icon name="chevron-right" size={24} color="#525252" />
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.actionRow} 
                    onPress={async () => {
                        if (!user) {
                            Alert.alert('Not signed in', 'Sign in to manually sync your progress.');
                            return;
                        }
                        setIsLoading(true);
                        await useUserStore.getState().syncToCloud();
                        setIsLoading(false);
                        Alert.alert('Success', 'Progress synced to cloud!');
                    }}
                >
                    <View style={styles.actionIconBg}>
                        <Icon name="cloud-sync-outline" size={22} color="#E5E5E5" />
                    </View>
                    <Text style={styles.actionText}>Force Cloud Sync</Text>
                    <Icon name="chevron-right" size={24} color="#525252" />
                </TouchableOpacity>
                
            </ScrollView>

            {/* Auth Modal */}
            <Modal
                visible={authModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setAuthModalVisible(false)}
            >
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
                            <TouchableOpacity onPress={() => setAuthModalVisible(false)}>
                                <Icon name="close" size={24} color="#A3A3A3" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Save your artworks and progress to the cloud.
                        </Text>

                        <View style={styles.inputContainer}>
                            <Icon name="email-outline" size={20} color="#737373" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Email address"
                                placeholderTextColor="#737373"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Icon name="lock-outline" size={20} color="#737373" style={styles.inputIcon} />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor="#737373"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                        </View>

                        <TouchableOpacity 
                            style={styles.primaryBtn} 
                            onPress={handleAuth}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.primaryBtnText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
                            )}
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 20 }}>
                            <View style={{ flex: 1, height: 1, backgroundColor: '#262626' }} />
                            <Text style={{ color: '#737373', marginHorizontal: 10 }}>OR</Text>
                            <View style={{ flex: 1, height: 1, backgroundColor: '#262626' }} />
                        </View>

                        <TouchableOpacity 
                            style={[styles.primaryBtn, { backgroundColor: '#4285F4', marginTop: 0 }]} 
                            onPress={handleGoogleSignIn}
                            disabled={isLoading}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Icon name="google" size={20} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={[styles.primaryBtnText, { color: '#FFF' }]}>Continue with Google</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.switchModeBtn}
                            onPress={() => setIsSignUp(!isSignUp)}
                        >
                            <Text style={styles.switchModeText}>
                                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Settings Modal */}
            <Modal
                visible={settingsModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setSettingsModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Settings</Text>
                            <TouchableOpacity onPress={() => setSettingsModalVisible(false)}>
                                <Icon name="close" size={24} color="#A3A3A3" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={{ marginTop: 16 }}>
                            <TouchableOpacity style={styles.actionRow} onPress={() => {
                                Alert.alert('Sound', 'Sound toggle coming soon!');
                            }}>
                                <View style={styles.actionIconBg}>
                                    <Icon name="volume-high" size={22} color="#E5E5E5" />
                                </View>
                                <Text style={styles.actionText}>Sound & Music</Text>
                                <Icon name="chevron-right" size={24} color="#525252" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionRow} onPress={() => {
                                Alert.alert('About', 'ColorToons v1.0.0');
                            }}>
                                <View style={styles.actionIconBg}>
                                    <Icon name="information-outline" size={22} color="#E5E5E5" />
                                </View>
                                <Text style={styles.actionText}>About ColorToons</Text>
                                <Icon name="chevron-right" size={24} color="#525252" />
                            </TouchableOpacity>

                            <TouchableOpacity style={[styles.actionRow, { borderColor: '#EF4444' }]} onPress={() => {
                                Alert.alert(
                                    'Reset Progress', 
                                    'Are you sure you want to reset all your coins, energy and streak? This cannot be undone.', 
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Reset', style: 'destructive', onPress: () => {
                                            useUserStore.getState().coins = 50;
                                            useUserStore.getState().streak = 1;
                                            Alert.alert('Reset', 'Progress has been reset.');
                                        }}
                                    ]
                                );
                            }}>
                                <View style={[styles.actionIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                                    <Icon name="delete-outline" size={22} color="#EF4444" />
                                </View>
                                <Text style={[styles.actionText, { color: '#EF4444' }]}>Reset Progress</Text>
                                <Icon name="chevron-right" size={24} color="#525252" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#121212' },
    container: { padding: 24, paddingBottom: 100 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
    headerTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    settingsBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center' },
    authCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', borderRadius: 20, padding: 20, marginBottom: 40, borderWidth: 1, borderColor: '#262626' },
    avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    authTextContainer: { flex: 1, paddingRight: 10 },
    userName: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 4 },
    userSub: { fontSize: 13, color: '#A3A3A3' },
    signInBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    signInText: { color: '#000000', fontWeight: '700', fontSize: 14 },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: '#A3A3A3', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40, gap: 12 },
    statCard: { flex: 1, backgroundColor: '#1A1A1A', borderRadius: 20, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#262626' },
    statIcon: { marginBottom: 12 },
    statValue: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
    statLabel: { fontSize: 11, color: '#A3A3A3', textAlign: 'center', fontWeight: '500' },
    actionRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#262626' },
    actionIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#262626', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
    actionText: { flex: 1, fontSize: 16, fontWeight: '500', color: '#FFFFFF' },
    
    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1A1A1A', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, borderWidth: 1, borderColor: '#262626' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    modalTitle: { fontSize: 24, fontWeight: '800', color: '#FFF' },
    modalSubtitle: { fontSize: 14, color: '#A3A3A3', marginBottom: 32 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', borderRadius: 16, marginBottom: 16, paddingHorizontal: 16, height: 56 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: '#FFF', fontSize: 16 },
    primaryBtn: { backgroundColor: '#FFF', height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 8 },
    primaryBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },
    switchModeBtn: { marginTop: 24, alignItems: 'center' },
    switchModeText: { color: '#A3A3A3', fontSize: 14, fontWeight: '500' }
});

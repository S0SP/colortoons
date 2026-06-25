import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AudioManager } from './src/services/AudioManager';
import { supabase } from './src/services/supabase';
import { useUserStore } from './src/store/useUserStore';

const App = () => {
  useEffect(() => {
    // Initialize audio manager on app start
    AudioManager.initialize().then(() => {
      console.log('[App] AudioManager initialized');
    });

    // Initialize Anonymous Guest Auth
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[App] No session found, signing in anonymously...');
        const { error } = await supabase.auth.signInAnonymously();
        if (error) {
          console.error('[App] Anonymous sign in failed:', error);
        } else {
          console.log('[App] Anonymous sign in successful!');
          // Initial sync to create profile
          useUserStore.getState().syncToCloud();
        }
      } else {
        console.log('[App] Existing session found for user:', session.user.id);
      }
    };
    initAuth();

    // Cleanup on unmount
    return () => {
      AudioManager.cleanup();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#121212" />
        <RootNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

export default App;
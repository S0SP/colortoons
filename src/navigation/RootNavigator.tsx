import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { CustomTabBar } from '../components/CustomTabBar';

import { HomeScreen } from '../screens/HomeScreen';
import { CreationScreen } from '../screens/CreationScreen';
import { ProcessingScreen } from '../screens/ProcessingScreen';
import { GameScreen } from '../screens/GameScreen';
import { GalleryScreen } from '../screens/GalleryScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { VictoryScreen } from '../screens/VictoryScreen';
import { SplashScreen } from '../screens/SplashScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { COLORS } from '../theme';

// FIX: SHOW ONBOARDING ONLY ON FIRST INSTALL
// Read the persisted flag from the MMKV-backed Zustand store.
// On first install hasSeenOnboarding = false  → Splash → Onboarding → MainTabs
// On every subsequent launch hasSeenOnboarding = true  → directly MainTabs (skips both Splash and Onboarding)
import { useUserStore } from '../store/useUserStore';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    return (
        <Tab.Navigator
            initialRouteName="Home"
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                }
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: 'Home' }}
            />
            <Tab.Screen
                name="Gallery"
                component={GalleryScreen}
                options={{ tabBarLabel: 'Gallery' }}
            />
            <Tab.Screen
                name="Magic"
                component={CreationScreen}
                options={{ tabBarLabel: 'Magic' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ tabBarLabel: 'Profile' }}
            />
        </Tab.Navigator>
    );
};

export const RootNavigator = () => {
    // FIX: SHOW ONBOARDING ONLY ON FIRST INSTALL
    // If the user has already seen onboarding, skip Splash + Onboarding entirely.
    const hasSeenOnboarding = useUserStore(s => s.hasSeenOnboarding);

    return (
        <NavigationContainer>
            <Stack.Navigator
                // Jump straight to MainTabs for returning users; new users start at Splash.
                initialRouteName={hasSeenOnboarding ? 'MainTabs' : 'Splash'}
                screenOptions={{
                    headerShown: false,
                    // FIX: SCREEN TRANSPARENCY DURING BACK NAVIGATION
                    // 'slide_from_right' uses a pure translate animation with no opacity
                    // changes, eliminating the semi-transparent flash on back navigation.
                    animation: 'slide_from_right',
                    // Ensure the content behind the animating screen is always fully opaque.
                    contentStyle: { backgroundColor: COLORS.background },
                }}
            >
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />

                {/* MainTabs uses 'none' so the tab bar switch is instant and opaque */}
                <Stack.Screen
                    name="MainTabs"
                    component={MainTabs}
                    options={{ animation: 'none' }}
                />

                <Stack.Screen name="Creation" component={CreationScreen} />
                <Stack.Screen name="Processing" component={ProcessingScreen} />

                {/* Game screen: slide animation prevents semi-transparent back transition */}
                <Stack.Screen
                    name="Game"
                    component={GameScreen}
                    options={{ animation: 'slide_from_right' }}
                />

                <Stack.Screen
                    name="VictoryScreen"
                    component={VictoryScreen}
                    options={{ headerShown: false }}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

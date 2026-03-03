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
import { COLORS } from '../theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
    return (
        <Tab.Navigator
            initialRouteName="Gallery"
            tabBar={props => <CustomTabBar {...props} />}
            screenOptions={{
                headerShown: false,
                // Hide default tab bar style since we are using custom tabBar component
                // The CustomTabBar handles positioning.
                tabBarStyle: {
                    position: 'absolute', // Ensure transparent standard bg doesn't interfere, though 'tabBar' prop replaces it entirely.
                }
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarLabel: 'Home'
                }}
            />
            <Tab.Screen
                name="Gallery"
                component={GalleryScreen}
                options={{
                    tabBarLabel: 'Gallery'
                }}
            />
            <Tab.Screen
                name="Magic"
                component={CreationScreen}
                options={{
                    tabBarLabel: 'Magic'
                }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{
                    tabBarLabel: 'Profile'
                }}
            />
        </Tab.Navigator>
    );
};

export const RootNavigator = () => {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: COLORS.background },
                }}
            >
                <Stack.Screen name="MainTabs" component={MainTabs} />
                <Stack.Screen name="Creation" component={CreationScreen} />
                <Stack.Screen name="Processing" component={ProcessingScreen} />
                <Stack.Screen name="Game" component={GameScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

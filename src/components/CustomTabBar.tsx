import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    return (
        <View style={styles.dockWrapper}>
            {/* Blur Background */}
            <BlurView
                style={styles.dockBlur}
                blurType="light"
                blurAmount={20}
                reducedTransparencyFallbackColor="white"
            />

            <View style={styles.dockContent}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const label =
                        options.tabBarLabel !== undefined
                            ? options.tabBarLabel
                            : options.title !== undefined
                                ? options.title
                                : route.name;

                    const isFocused = state.index === index;

                    const onPress = () => {
                        const event = navigation.emit({
                            type: 'tabPress',
                            target: route.key,
                            canPreventDefault: true,
                        });

                        if (!isFocused && !event.defaultPrevented) {
                            navigation.navigate(route.name);
                        }
                    };

                    // Define icons based on route name matching RootNavigator
                    let iconName = 'alert-circle';
                    if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
                    else if (route.name === 'Gallery') iconName = isFocused ? 'image-multiple' : 'image-multiple-outline';
                    else if (route.name === 'Magic') iconName = isFocused ? 'wand' : 'wand'; // MaterialCommunityIcons doesn't always have outline for specific ones
                    else if (route.name === 'Profile') iconName = isFocused ? 'account' : 'account-outline';

                    // Magic/Wand icon tweaks
                    if (route.name === 'Magic' && !isFocused) iconName = 'wand';

                    // Render Active Tab with Gradient
                    if (isFocused) {
                        return (
                            <TouchableOpacity
                                key={index}
                                onPress={onPress}
                                style={styles.dockItem}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#A855F7', '#6366F1']} // Purple to Blue Gradient
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={styles.activeTabBackground}
                                >
                                    <Icon name={iconName} size={24} color="#FFFFFF" />
                                    <Text style={[styles.dockLabel, { color: 'white', fontWeight: 'bold' }]}>
                                        {label as string}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    }

                    // Render Inactive Tab
                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={onPress}
                            style={styles.dockItem}
                            activeOpacity={0.8}
                        >
                            <Icon name={iconName} size={24} color="#64748B" />
                            <Text style={styles.dockLabel}>
                                {label as string}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    dockWrapper: {
        position: 'absolute',
        bottom: 30,
        width: '90%',
        alignSelf: 'center',
        height: 75,
        borderRadius: 40,
        overflow: 'hidden',
        // Shadow for the floating effect
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        backgroundColor: 'rgba(255,255,255,0.7)', // Fallback
    },
    dockBlur: {
        ...StyleSheet.absoluteFillObject,
    },
    dockContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    dockItem: {
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        flex: 1,
    },
    activeTabBackground: {
        width: 60,
        height: 60,
        borderRadius: 22, // Squircle shape
        alignItems: 'center',
        justifyContent: 'center',
        // Slight shadow inside the dock?
        elevation: 5,
        shadowColor: "#A855F7",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    dockLabel: {
        fontSize: 10,
        marginTop: 4,
        color: '#64748B',
        fontWeight: '500',
    },
});

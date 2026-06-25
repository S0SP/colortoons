import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform } from 'react-native';
import { BlurView } from '@react-native-community/blur';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useUserStore } from '../store/useUserStore';

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
    // Get daily reward status for badge
    const canClaimDailyReward = useUserStore((s) => s.canClaimDailyReward());

    return (
        <View style={styles.dockWrapper}>
            {/* Dark Frosted Glassmorphism */}
            <BlurView
                style={styles.dockBlur}
                blurType="dark"
                blurAmount={20}
                reducedTransparencyFallbackColor="#121212"
            />
            {/* 1px border overlay for Matte Dark Studio */}
            <View style={styles.dockBorder} />

            <View style={styles.dockContent}>
                {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
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

                    // Chunky solid icons for active state, clean outlines for inactive
                    let iconName = 'alert-circle';
                    if (route.name === 'Home') iconName = isFocused ? 'home' : 'home-outline';
                    else if (route.name === 'Gallery') iconName = isFocused ? 'image-multiple' : 'image-multiple-outline';
                    else if (route.name === 'Magic') iconName = isFocused ? 'auto-fix' : 'auto-fix';
                    else if (route.name === 'Profile') iconName = isFocused ? 'account' : 'account-outline';

                    const showBadge = route.name === 'Home' && canClaimDailyReward;
                    const iconColor = isFocused ? '#6366F1' : '#8E8E93';

                    return (
                        <TouchableOpacity
                            key={index}
                            onPress={onPress}
                            style={styles.dockItem}
                            activeOpacity={0.8}
                        >
                            <View style={styles.iconContainer}>
                                <Icon name={iconName} size={28} color={iconColor} />
                                {showBadge && <View style={styles.badge} />}
                            </View>
                            {isFocused && <View style={styles.activeDot} />}
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
        width: '85%',
        alignSelf: 'center',
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        backgroundColor: 'rgba(20,20,20,0.6)',
    },
    dockBlur: {
        ...StyleSheet.absoluteFillObject,
    },
    dockBorder: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 32,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    dockContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    dockItem: {
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        flex: 1,
        position: 'relative',
    },
    iconContainer: {
        position: 'relative',
    },
    activeDot: {
        position: 'absolute',
        bottom: 6,
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#6366F1',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -6,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
        borderWidth: 1,
        borderColor: '#121212',
    },
});
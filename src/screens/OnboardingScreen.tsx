import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Image,
    FlatList,
    ViewToken,
    // FIX: WHITE SCREEN AFTER ONBOARDING
    // InteractionManager defers the navigation.reset() call until all pending
    // animations/interactions have finished, preventing the blank frame that
    // appeared between the last onboarding slide and the Home Screen.
    InteractionManager,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Animated, {
    useSharedValue,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    interpolateColor,
    interpolate,
    Extrapolation,
    SharedValue
} from 'react-native-reanimated';
import { useUserStore } from '../store/useUserStore';

const { width, height } = Dimensions.get('window');
const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const SLIDES = [
    {
        id: '1',
        title: 'Tap to Paint',
        description: 'Tap your 3D paint-splash regions and watch hues flow.',
        image: require('../assets/paint_burst.png'),
        cta: 'Next >'
    },
    {
        id: '2',
        title: 'Fill Every Number',
        description: 'Every bit of your art comes alive with our 3D ink engine.',
        image: require('../assets/numbered_regions.png'),
        cta: 'Next >'
    },
    {
        id: '3',
        title: 'Build Your Gallery',
        description: 'Build your personal gallery and enjoy background hue rotation.',
        image: require('../assets/gallery_trophy.png'),
        cta: 'Welcome to ColorToons'
    }
];

const BG_COLORS = ['#FFDAC4', '#DDD3EE', '#FBE3AD'];

export const OnboardingScreen = () => {
    const navigation = useNavigation();
    const setOnboardingSeen = useUserStore(state => state.setOnboardingSeen);
    const flatListRef = useRef<FlatList>(null);
    const scrollX = useSharedValue(0);
    const [currentIndex, setCurrentIndex] = useState(0);

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems[0]) {
            setCurrentIndex(viewableItems[0].index ?? 0);
        }
    }).current;

    const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

    // FIX: WHITE SCREEN AFTER ONBOARDING
    // Mark onboarding seen first, then wait for all current interactions/animations
    // to finish before triggering the navigation reset. This prevents the blank
    // white frame that occasionally appeared while the navigator was re-mounting.
    const finishOnboarding = () => {
        setOnboardingSeen();
        InteractionManager.runAfterInteractions(() => {
            navigation.reset({
                index: 0,
                routes: [{ name: 'MainTabs' as never }],
            });
        });
    };

    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
        } else {
            finishOnboarding();
        }
    };

    const handleSkip = () => {
        finishOnboarding();
    };

    const bgStyle = useAnimatedStyle(() => {
        const backgroundColor = interpolateColor(
            scrollX.value,
            SLIDES.map((_, i) => i * width),
            BG_COLORS
        );
        return { backgroundColor };
    });

    const Paginator = () => {
        return (
            <View style={styles.paginatorContainer}>
                {SLIDES.map((_, i) => {
                    const dotStyle = useAnimatedStyle(() => {
                        const dotWidth = interpolate(
                            scrollX.value,
                            [(i - 1) * width, i * width, (i + 1) * width],
                            [8, 24, 8],
                            Extrapolation.CLAMP
                        );
                        const opacity = interpolate(
                            scrollX.value,
                            [(i - 1) * width, i * width, (i + 1) * width],
                            [0.3, 1, 0.3],
                            Extrapolation.CLAMP
                        );
                        return { width: dotWidth, opacity };
                    });
                    return <Animated.View style={[styles.dot, dotStyle]} key={i.toString()} />;
                })}
            </View>
        );
    };

    return (
        <Animated.View style={[styles.container, bgStyle]}>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>

            <AnimatedFlatList
                ref={flatListRef}
                data={SLIDES}
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                bounces={false}
                onScroll={onScroll}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewConfig}
                scrollEventThrottle={16}
                keyExtractor={(item: any) => item.id}
                renderItem={({ item, index }: any) => {
                    return (
                        <View style={styles.slide}>
                            <View style={styles.imageContainer}>
                                <Image source={item.image} style={styles.image} resizeMode="contain" />
                            </View>
                            <View style={styles.textContainer}>
                                <Text style={styles.title}>{item.title}</Text>
                                <Text style={styles.description}>{item.description}</Text>
                            </View>
                            <TouchableOpacity style={[
                                styles.ctaButton,
                                index === SLIDES.length - 1 ? styles.ctaButtonLarge : undefined
                            ]} onPress={handleNext}>
                                <Text style={styles.ctaText}>{item.cta}</Text>
                            </TouchableOpacity>
                        </View>
                    );
                }}
            />
            <Paginator />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    slide: {
        width,
        alignItems: 'center',
        padding: 40,
        paddingTop: 80,
    },
    imageContainer: {
        flex: 0.6,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    image: {
        width: width * 0.8,
        height: width * 0.8,
    },
    textContainer: {
        flex: 0.3,
        alignItems: 'center',
        width: '100%',
    },
    title: {
        fontFamily: 'PlusJakartaSans-ExtraBold',
        fontWeight: '900',
        fontSize: 28,
        color: '#111111',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontFamily: 'PlusJakartaSans-Medium',
        fontWeight: '400',
        fontSize: 16,
        color: '#222222',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    ctaButton: {
        backgroundColor: '#FF6330',
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 40,
        marginBottom: 0,
        width: '50%',
        alignItems: 'center'
    },
    ctaButtonLarge: {
        width: '110%',
        alignItems: 'center',
        paddingVertical: 15,
    },
    ctaText: {
        color: '#FFFFFF',
        fontFamily: 'PlusJakartaSans-Bold',
        fontWeight: '700',
        fontSize: 20,
    },
    skipButton: {
        position: 'absolute',
        top: 20,
        right: 24,
        zIndex: 10,
        padding: 8,
    },
    skipText: {
        fontFamily: 'PlusJakartaSans-Medium',
        fontWeight: '900',
        fontSize: 15,
        color: '#727070ff',
    },
    paginatorContainer: {
        flexDirection: 'row',
        height: 64,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'absolute',
        bottom: 20,
        width: '100%',
    },
    dot: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF6330',
        marginHorizontal: 4,
    },
});

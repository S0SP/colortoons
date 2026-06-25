import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/Feather';

const { width } = Dimensions.get('window');

interface SaveProgressModalProps {
    visible: boolean;
    progress: number; // 0-100
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}

export const SaveProgressModal: React.FC<SaveProgressModalProps> = ({
    visible,
    progress,
    onSave,
    onDiscard,
    onCancel,
}) => {
    const scale = useSharedValue(0.95);
    const opacity = useSharedValue(0);

    React.useEffect(() => {
        if (visible) {
            scale.value = withSpring(1, { damping: 15, stiffness: 200 });
            opacity.value = withTiming(1, { duration: 200 });
        } else {
            scale.value = withTiming(0.95, { duration: 150 });
            opacity.value = withTiming(0, { duration: 150 });
        }
    }, [visible]);

    const containerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: opacity.value,
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none">
            <View style={styles.overlay}>
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        onPress={onCancel}
                        activeOpacity={1}
                    />
                </Animated.View>

                <Animated.View style={[styles.modal, containerStyle]}>
                    {/* Close Button Top Right */}
                    <TouchableOpacity style={styles.closeButton} onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Icon name="x" size={24} color="#888888" />
                    </TouchableOpacity>

                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Icon name="save" size={28} color="#FAFAF8" />
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>Save Progress?</Text>

                    {/* Message */}
                    <Text style={styles.message}>
                        You can safely pause here and continue painting later from your Home screen.
                    </Text>

                    {/* Progress Display */}
                    <View style={styles.progressContainer}>
                        <Text style={styles.progressText}>{Math.round(progress)}% Complete</Text>
                        <View style={styles.progressBar}>
                            <View
                                style={[styles.progressFill, { width: `${progress}%` }]}
                            />
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={onSave}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.saveButtonText}>Save & Exit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.discardButton}
                            onPress={onDiscard}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.discardButtonText}>Discard Artwork</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
    },
    modal: {
        width: width - 48,
        backgroundColor: '#1A1A1A', // Dark gray
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2A2A2A',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFFFFF',
        marginBottom: 12,
        letterSpacing: -0.5,
    },
    message: {
        fontSize: 14,
        color: '#8A8A8A',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    progressContainer: {
        width: '100%',
        marginBottom: 32,
    },
    progressText: {
        fontSize: 12,
        color: '#FAFAF8',
        fontWeight: '500',
        textAlign: 'right',
        marginBottom: 8,
    },
    progressBar: {
        height: 3,
        backgroundColor: '#2A2A2A',
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#38BDF8', // Accent color
        borderRadius: 1.5,
    },
    buttons: {
        width: '100%',
        gap: 12,
    },
    saveButton: {
        backgroundColor: '#FAFAF8', // High contrast white
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
    },
    discardButton: {
        backgroundColor: 'transparent',
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    discardButtonText: {
        color: '#FF453A', // Muted destructive red
        fontSize: 15,
        fontWeight: '500',
    },
});
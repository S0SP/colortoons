export const COLORS = {
    primary: '#7F5AF0', // Purple user saw in "Make It Real"
    secondary: '#2CB67D', // Green for success/next
    background: '#16161a', // Dark mode background (Deep space/charcoal)
    card: '#242629', // Slightly lighter for cards
    text: '#fffffe', // Main text
    subtext: '#94a1b2', // Secondary text
    accent: '#FF8906', // Orange/Gold for stars/coins
    danger: '#ff5470', // Red for errors
    white: '#FFFFFF',
    black: '#000000',

    // Difficulty Slider Gradient Colors
    gradientStart: '#ff5470',
    gradientMiddle: '#ff8906',
    gradientEnd: '#2cb67d',
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 16,
    l: 24,
    xl: 32,
    xxl: 48,
};

export const FONTS = {
    // We will use system fonts for now to avoid linking complexity, 
    // but can switch to Poppins/Nunito later.
    bold: { fontWeight: '700' },
    medium: { fontWeight: '500' },
    regular: { fontWeight: '400' },
};

export const SHADOWS = {
    small: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 2,
    },
    medium: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.34,
        shadowRadius: 6.27,
        elevation: 5,
    }
};

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image as RNImage,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import Svg, { Path, Circle, G, Image, Text as SvgText } from 'react-native-svg';
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedG = Animated.createAnimatedComponent(G);

// Enhanced color palette matching the reference image
const COLOR_PALETTE = [
  { id: 1, color: '#1A237E', name: 'Deep Blue' },
  { id: 2, color: '#283593', name: 'Navy' },
  { id: 3, color: '#00ACC1', name: 'Cyan' },
  { id: 4, color: '#E0E0E0', name: 'Light Gray' },
  { id: 5, color: '#FFB74D', name: 'Light Orange' },
  { id: 6, color: '#E57373', name: 'Coral' },
  { id: 7, color: '#9575CD', name: 'Purple' },
  { id: 8, color: '#64B5F6', name: 'Sky Blue' },
  { id: 9, color: '#81C784', name: 'Green' },
  { id: 10, color: '#FFD54F', name: 'Yellow' },
];

const ColoringGameOptimized = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[2]);
  const [coloredRegions, setColoredRegions] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [completionPercentage, setCompletionPercentage] = useState(0);

  // Gesture handling
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const originX = useSharedValue(0);
  const originY = useSharedValue(0);

  // Pick image from library
  const pickImage = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        selectionLimit: 1,
      });

      if (result.assets && result.assets[0]) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        await processImageToOutline(imageUri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  }, []);

  // Process image to outline and detect regions
  const processImageToOutline = async (imageUri) => {
    setIsProcessing(true);
    
    try {
      // Get image dimensions
      RNImage.getSize(imageUri, async (originalWidth, originalHeight) => {
        // Calculate scaled dimensions
        const maxDimension = 800;
        const scale = Math.min(maxDimension / originalWidth, maxDimension / originalHeight);
        const width = Math.floor(originalWidth * scale);
        const height = Math.floor(originalHeight * scale);

        // Process image (this would ideally be done with a native module)
        const processed = await simulateImageProcessing(imageUri, width, height);
        
        setProcessedData(processed);
        setIsProcessing(false);
      });
    } catch (error) {
      console.error('Processing error:', error);
      Alert.alert('Error', 'Failed to process image');
      setIsProcessing(false);
    }
  };

  // Simulate image processing (in production, use native module)
  const simulateImageProcessing = async (imageUri, width, height) => {
    // This is a simulation. In production, you'd use a native module
    // with OpenCV or similar for actual edge detection
    
    return new Promise((resolve) => {
      setTimeout(() => {
        // Generate sample regions based on the reference image
        const regions = generateSampleRegions(width, height);
        
        resolve({
          imageUri,
          width,
          height,
          regions,
          edgePaths: generateSampleEdgePaths(width, height),
        });
      }, 1500);
    });
  };

  // Generate sample regions (replace with actual region detection)
  const generateSampleRegions = (width, height) => {
    const regions = [];
    const numRegions = 30; // Number of regions to create
    const gridSize = Math.ceil(Math.sqrt(numRegions));
    const cellWidth = width / gridSize;
    const cellHeight = height / gridSize;

    let regionId = 0;
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (regionId >= numRegions) break;

        const x = col * cellWidth + cellWidth / 2;
        const y = row * cellHeight + cellHeight / 2;
        
        // Add some randomness
        const offsetX = (Math.random() - 0.5) * cellWidth * 0.5;
        const offsetY = (Math.random() - 0.5) * cellHeight * 0.5;

        regions.push({
          id: regionId,
          center: {
            x: x + offsetX,
            y: y + offsetY,
          },
          colorId: (regionId % COLOR_PALETTE.length) + 1,
          // Generate polygon path for the region
          path: generateRegionPath(
            x + offsetX,
            y + offsetY,
            cellWidth * 0.8,
            cellHeight * 0.8
          ),
        });
        
        regionId++;
      }
    }

    return regions;
  };

  // Generate a polygonal path for a region
  const generateRegionPath = (cx, cy, width, height) => {
    const points = 6; // Hexagon-like regions
    let path = 'M ';
    
    for (let i = 0; i <= points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const x = cx + Math.cos(angle) * width / 2;
      const y = cy + Math.sin(angle) * height / 2;
      path += `${x},${y} `;
      if (i === 0) path += 'L ';
    }
    
    path += 'Z';
    return path;
  };

  // Generate sample edge paths
  const generateSampleEdgePaths = (width, height) => {
    // This would contain the actual edge paths from edge detection
    return [];
  };

  // Handle region tap
  const handleRegionTap = useCallback((regionId) => {
    setColoredRegions(prev => {
      const newRegions = { ...prev, [regionId]: selectedColor.color };
      const completed = Object.keys(newRegions).length;
      const total = processedData?.regions.length || 1;
      setCompletionPercentage(Math.round((completed / total) * 100));
      return newRegions;
    });
  }, [selectedColor, processedData]);

  // Pinch gesture handler
  const pinchHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startScale = scale.value;
    },
    onActive: (event, ctx) => {
      scale.value = Math.max(1, Math.min(ctx.startScale * event.scale, 5));
    },
  });

  // Pan gesture handler
  const panHandler = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
    },
    onActive: (event, ctx) => {
      translateX.value = ctx.startX + event.translationX;
      translateY.value = ctx.startY + event.translationY;
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Reset zoom
  const resetZoom = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  // Clear all colors
  const clearColors = () => {
    Alert.alert(
      'Clear All Colors',
      'Are you sure you want to clear all colored regions?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setColoredRegions({});
            setCompletionPercentage(0);
          },
        },
      ]
    );
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Color by Numbers</Text>
          {processedData && (
            <Text style={styles.subtitle}>{completionPercentage}% Complete</Text>
          )}
        </View>
        <View style={styles.headerButtons}>
          {processedData && (
            <>
              <TouchableOpacity style={styles.iconButton} onPress={resetZoom}>
                <Text style={styles.iconButtonText}>🔍</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={clearColors}>
                <Text style={styles.iconButtonText}>🗑️</Text>
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
            <Text style={styles.pickButtonText}>
              {processedData ? '📷' : 'Pick Image'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Canvas Area */}
      <View style={styles.canvasContainer}>
        {isProcessing && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00ACC1" />
            <Text style={styles.loadingText}>Processing image...</Text>
            <Text style={styles.loadingSubtext}>
              Detecting edges and regions
            </Text>
          </View>
        )}

        {!isProcessing && !processedData && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎨</Text>
            <Text style={styles.emptyTitle}>Start Coloring!</Text>
            <Text style={styles.emptyText}>
              Pick an image from your gallery to convert it into a color-by-numbers game
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={pickImage}>
              <Text style={styles.emptyButtonText}>Pick Image</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isProcessing && processedData && (
          <PanGestureHandler onGestureEvent={panHandler}>
            <Animated.View style={styles.svgContainer}>
              <PinchGestureHandler onGestureEvent={pinchHandler}>
                <AnimatedG style={animatedStyle}>
                  <Svg
                    width={processedData.width}
                    height={processedData.height}
                    viewBox={`0 0 ${processedData.width} ${processedData.height}`}
                  >
                    {/* Background image (faded) */}
                    <Image
                      href={{ uri: processedData.imageUri }}
                      width={processedData.width}
                      height={processedData.height}
                      opacity={0.2}
                      preserveAspectRatio="xMidYMid slice"
                    />

                    {/* Colored regions */}
                    {processedData.regions.map((region) => (
                      <TapGestureHandler
                        key={`region-${region.id}`}
                        onHandlerStateChange={(event) => {
                          if (event.nativeEvent.state === State.END) {
                            handleRegionTap(region.id);
                          }
                        }}
                      >
                        <Path
                          d={region.path}
                          fill={coloredRegions[region.id] || 'transparent'}
                          stroke="#333"
                          strokeWidth={1.5}
                          opacity={coloredRegions[region.id] ? 0.8 : 0}
                        />
                      </TapGestureHandler>
                    ))}

                    {/* Edge lines */}
                    {processedData.regions.map((region) => (
                      <Path
                        key={`edge-${region.id}`}
                        d={region.path}
                        fill="none"
                        stroke="#000"
                        strokeWidth={2}
                      />
                    ))}

                    {/* Numbers */}
                    {processedData.regions.map((region) =>
                      !coloredRegions[region.id] ? (
                        <G key={`number-${region.id}`}>
                          <Circle
                            cx={region.center.x}
                            cy={region.center.y}
                            r={20}
                            fill="white"
                            stroke="#333"
                            strokeWidth={2}
                          />
                          <SvgText
                            x={region.center.x}
                            y={region.center.y}
                            fontSize="16"
                            fontWeight="bold"
                            fill="#000"
                            textAnchor="middle"
                            alignmentBaseline="central"
                          >
                            {region.colorId}
                          </SvgText>
                        </G>
                      ) : null
                    )}
                  </Svg>
                </AnimatedG>
              </PinchGestureHandler>
            </Animated.View>
          </PanGestureHandler>
        )}
      </View>

      {/* Color Palette */}
      {processedData && (
        <View style={styles.paletteSection}>
          <Text style={styles.paletteTitle}>Select Color</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.paletteContainer}
          >
            {COLOR_PALETTE.map((color) => (
              <TouchableOpacity
                key={color.id}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: color.color,
                    borderWidth: selectedColor.id === color.id ? 4 : 2,
                    borderColor: selectedColor.id === color.id ? '#FFD700' : '#333',
                    transform: [
                      { scale: selectedColor.id === color.id ? 1.1 : 1 },
                    ],
                  },
                ]}
                onPress={() => setSelectedColor(color)}
              >
                <View style={styles.colorNumberContainer}>
                  <Text style={styles.colorNumber}>{color.id}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A237E',
  },
  subtitle: {
    fontSize: 14,
    color: '#00ACC1',
    marginTop: 2,
    fontWeight: '600',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonText: {
    fontSize: 20,
  },
  pickButton: {
    backgroundColor: '#00ACC1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 100,
    alignItems: 'center',
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  svgContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A237E',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A237E',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: '#00ACC1',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  paletteSection: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  paletteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A237E',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  paletteContainer: {
    paddingHorizontal: 12,
    gap: 12,
  },
  colorButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  colorNumberContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
});

export default ColoringGameOptimized;

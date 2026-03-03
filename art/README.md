# Color by Numbers Game - React Native

A fully-featured color-by-numbers mobile game for kids built with React Native CLI. This app converts any image into an interactive coloring game with automatic edge detection, region segmentation, and number assignment.

## 📱 Features

- 🖼️ **Image Selection**: Pick images from device gallery
- 🎨 **Automatic Edge Detection**: Canny edge detection with Sobel operators
- 🔢 **Smart Numbering**: Automatic region detection and number assignment (1-74)
- 🎯 **Interactive Coloring**: Tap regions to color them
- 🔍 **Zoom & Pan**: Pinch-to-zoom and pan gestures for detailed work
- 📊 **Progress Tracking**: Real-time completion percentage
- 💾 **Auto-save**: Colored regions are automatically saved
- 🎨 **10-Color Palette**: Beautiful pre-selected color palette
- ⚡ **Native Performance**: Uses native modules for fast image processing

## 🏗️ Architecture

### Components

1. **ColoringGameOptimized.js** - Main game component with UI
2. **ImageProcessor.js** - JavaScript image processing utilities
3. **Native Modules** - iOS/Android native image processing

### Image Processing Pipeline

```
Image Selection
    ↓
Load & Resize (800x800 max)
    ↓
Grayscale Conversion
    ↓
Gaussian Blur (noise reduction)
    ↓
Canny Edge Detection
    ├─ Sobel Gradient Calculation
    ├─ Non-Maximum Suppression
    └─ Double Threshold + Hysteresis
    ↓
Region Detection (Flood Fill)
    ↓
Number Assignment
    ↓
Interactive Canvas
```

## 📦 Installation

### Prerequisites

- Node.js >= 18
- React Native CLI
- Xcode 14+ (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS)

### Step 1: Clone or Create Project

```bash
# Create new React Native project
npx react-native init ColorByNumbersGame

# Or use existing project
cd your-project-name
```

### Step 2: Install Dependencies

```bash
npm install react-native-gesture-handler \
  react-native-reanimated \
  react-native-image-picker \
  react-native-svg \
  react-native-fs

# For iOS
cd ios && pod install && cd ..
```

### Step 3: Configure Babel

Update `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // Must be last!
  ],
};
```

### Step 4: Configure Gesture Handler

Add to the **very top** of `index.js`:

```javascript
import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
```

### Step 5: Add Permissions

#### iOS (`ios/YourApp/Info.plist`):

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to select images for coloring</string>
<key>NSCameraUsageDescription</key>
<string>We need access to your camera to take photos</string>
```

#### Android (`android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

### Step 6: Copy Project Files

Copy the following files to your project:

```
src/
├── ColoringGameOptimized.js  → Main component
├── ImageProcessor.js          → JS image processing
├── ios/
│   ├── ImageProcessorModule.h
│   └── ImageProcessorModule.m
└── android/
    ├── ImageProcessorModule.java
    └── ImageProcessorPackage.java
```

### Step 7: Register Native Modules

#### iOS

Add to your Xcode project's target:
- `ImageProcessorModule.h`
- `ImageProcessorModule.m`

#### Android

1. Copy `ImageProcessorModule.java` and `ImageProcessorPackage.java` to:
   ```
   android/app/src/main/java/com/yourapp/
   ```

2. Register in `MainApplication.java`:

```java
import com.coloringgame.ImageProcessorPackage;

@Override
protected List<ReactPackage> getPackages() {
    List<ReactPackage> packages = new PackageList(this).getPackages();
    packages.add(new ImageProcessorPackage()); // Add this line
    return packages;
}
```

### Step 8: Update App.js

```javascript
import React from 'react';
import ColoringGameOptimized from './src/ColoringGameOptimized';

function App() {
  return <ColoringGameOptimized />;
}

export default App;
```

### Step 9: Run the App

```bash
# Android
npm run android

# iOS
npm run ios
```

## 🎮 How to Use

1. **Pick an Image**: Tap "Pick Image" button
2. **Wait for Processing**: The app will detect edges and regions (5-10 seconds)
3. **Select a Color**: Choose from the color palette at the bottom
4. **Tap to Color**: Tap any numbered region to fill it with the selected color
5. **Zoom In**: Use pinch gesture to zoom into detailed areas
6. **Pan Around**: Drag to move around the image
7. **Reset View**: Tap 🔍 to reset zoom
8. **Clear All**: Tap 🗑️ to clear all colors

## 🎨 Image Processing Details

### Edge Detection (Canny Algorithm)

```
1. Gaussian Blur (σ = 1.4)
   - Reduces noise
   - 5x5 kernel

2. Sobel Operator
   - Calculates gradients in X and Y
   - Determines edge strength and direction

3. Non-Maximum Suppression
   - Thins edges to 1-pixel wide
   - Keeps only local maxima

4. Double Threshold
   - Strong edges: magnitude > 150
   - Weak edges: magnitude > 50
   - Suppressed: magnitude < 50

5. Edge Tracking by Hysteresis
   - Keep weak edges connected to strong edges
   - Remove disconnected weak edges
```

### Region Detection (Flood Fill)

```
1. Start from each non-edge pixel
2. Flood fill to find connected components
3. Filter regions by size (> 200 pixels)
4. Calculate center point for each region
5. Assign color number (1-74 cycling)
6. Limit to top 50 largest regions
```

## ⚙️ Configuration

### Adjust Edge Sensitivity

In `ImageProcessor.js`:

```javascript
static cannyEdgeDetection(pixels, width, height, 
  lowThreshold = 30,    // Lower = more edges
  highThreshold = 90    // Lower = more edges
)
```

### Change Minimum Region Size

```javascript
if (region.pixels.length > 200) { // Increase for fewer, larger regions
  regions.push(region);
}
```

### Modify Color Palette

In `ColoringGameOptimized.js`:

```javascript
const COLOR_PALETTE = [
  { id: 1, color: '#YOUR_COLOR', name: 'Color Name' },
  // Add up to 74 colors
];
```

### Adjust Max Image Size

```javascript
const maxDimension = 800; // Change to 1024 for higher quality
```

## 🚀 Performance Optimization

### For Production

1. **Enable Hermes Engine**:
   - iOS: Edit `Podfile`, set `hermes_enabled` to true
   - Android: Already enabled by default in RN 0.70+

2. **Enable ProGuard (Android)**:
   ```gradle
   buildTypes {
       release {
           minifyEnabled true
           proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
       }
   }
   ```

3. **Optimize Images**:
   - Compress images before processing
   - Limit resolution to 1024x1024

4. **Use Native Modules**:
   - The included native modules provide 10x faster processing
   - For even better performance, integrate OpenCV

## 📊 Testing Recommendations

### Best Image Types

✅ **Excellent Results**:
- Cartoon characters
- Anime/manga art
- Line art / coloring book pages
- Simple illustrations

⚠️ **Moderate Results**:
- Photos with high contrast
- Simplified graphics

❌ **Poor Results**:
- Complex photographs
- Low contrast images
- Very detailed illustrations

### Test Images

Test your implementation with various image types:

1. Simple cartoon (10-20 regions)
2. Medium complexity illustration (20-40 regions)
3. Detailed drawing (40-50 regions)

## 🐛 Troubleshooting

### Problem: Image processing is very slow

**Solutions**:
- Reduce `maxDimension` to 600-800
- Ensure native modules are properly linked
- Check if Hermes is enabled
- Limit regions to 30-40 max

### Problem: Too many small regions

**Solutions**:
- Increase `lowThreshold` in edge detection (try 40-60)
- Increase minimum region size to 300-500 pixels
- Apply stronger Gaussian blur (σ = 2.0)

### Problem: Not enough regions detected

**Solutions**:
- Decrease `lowThreshold` (try 20-30)
- Decrease minimum region size to 100 pixels
- Use higher resolution images

### Problem: Gestures not responding

**Solutions**:
- Verify `react-native-gesture-handler` is first import in `index.js`
- Clear Metro cache: `npm start -- --reset-cache`
- Rebuild the app completely

### Problem: Native module not found

**Solutions**:
- iOS: Run `pod install` in ios directory
- Android: Verify package is added in `MainApplication.java`
- Clean build: `cd android && ./gradlew clean && cd ..`

## 📁 Project Structure

```
ColorByNumbersGame/
├── src/
│   ├── ColoringGameOptimized.js   # Main game component
│   ├── ImageProcessor.js           # JS image processing
│   ├── components/
│   │   ├── ColorPalette.js        # Color selection UI
│   │   └── ZoomableCanvas.js      # Canvas with gestures
│   └── utils/
│       └── imageUtils.js          # Helper functions
├── ios/
│   ├── ImageProcessorModule.h     # iOS native header
│   └── ImageProcessorModule.m     # iOS native implementation
├── android/
│   └── app/src/main/java/com/yourapp/
│       ├── ImageProcessorModule.java    # Android native module
│       └── ImageProcessorPackage.java   # Android package registration
├── package.json
└── README.md
```

## 🔬 Advanced Features (Optional)

### OpenCV Integration

For production apps, integrate OpenCV for much faster processing:

#### iOS

1. Add to Podfile:
```ruby
pod 'OpenCV', '~> 4.5.0'
```

2. Update `ImageProcessorModule.m` to use OpenCV functions

#### Android

1. Add to `build.gradle`:
```gradle
implementation 'org.opencv:opencv:4.5.0'
```

2. Update `ImageProcessorModule.java` to use OpenCV

### Machine Learning Enhancement

Use ML models for better segmentation:

```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native
```

Implement semantic segmentation for more accurate regions.

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📮 Support

For issues or questions:
- Open an issue on GitHub
- Check the troubleshooting section
- Review React Native documentation

## 🎯 Future Enhancements

- [ ] Save/load colored images
- [ ] Multiple difficulty levels
- [ ] Share completed artwork
- [ ] Custom color palettes
- [ ] Undo/redo functionality
- [ ] Hints system
- [ ] Animation effects
- [ ] Sound effects
- [ ] Social features
- [ ] AI-generated coloring pages

## 📸 Screenshots

[Add your app screenshots here]

## 🙏 Acknowledgments

- React Native team
- OpenCV contributors
- Community contributors

---

**Built with ❤️ for kids who love to color!**

# Color by Numbers Game - Installation & Setup Guide

## Prerequisites

- Node.js >= 18
- React Native CLI
- Xcode (for iOS development)
- Android Studio (for Android development)

## Installation Steps

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Install iOS Pods (iOS only)

```bash
cd ios && pod install && cd ..
```

### 3. Configure react-native-reanimated

Add the following to your `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: ['react-native-reanimated/plugin'], // This should be last
};
```

### 4. Configure react-native-gesture-handler

In your `index.js` or `App.js`, add at the very top:

```javascript
import 'react-native-gesture-handler';
```

### 5. Android Permissions

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.CAMERA"/>
```

### 6. iOS Permissions

Add to `ios/YourAppName/Info.plist`:

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs access to your photo library to select images for coloring</string>
<key>NSCameraUsageDescription</key>
<string>This app needs access to your camera to take photos</string>
```

## Running the App

### Android
```bash
npm run android
# or
yarn android
```

### iOS
```bash
npm run ios
# or
yarn ios
```

## Project Structure

```
ColorByNumbersGame/
├── ColoringGame.js          # Main game component
├── ImageProcessor.js        # Image processing utilities
├── components/
│   ├── ColorPalette.js     # Color selection component
│   └── ZoomableCanvas.js   # Zoomable/pannable canvas
├── utils/
│   └── imageUtils.js       # Helper functions
└── assets/
    └── sample-images/      # Sample images for testing
```

## Features

1. **Image Selection**: Pick images from device library
2. **Edge Detection**: Automatic outline generation using Canny edge detection
3. **Region Detection**: Smart region segmentation with flood fill algorithm
4. **Number Assignment**: Automatic numbering of regions (1-74)
5. **Color Palette**: 8-color palette for coloring
6. **Zoom & Pan**: Pinch to zoom and pan gestures for detailed work
7. **Progress Tracking**: Track completion percentage
8. **Auto-save**: Colored regions are saved automatically

## Image Processing Pipeline

1. **Load Image** → Convert to target resolution
2. **Grayscale Conversion** → Prepare for edge detection
3. **Gaussian Blur** → Reduce noise
4. **Edge Detection** → Canny algorithm (gradient + non-max suppression)
5. **Region Detection** → Connected components labeling
6. **Number Assignment** → Place numbers at region centers
7. **Interactive Coloring** → Fill regions on tap

## Optimization Tips

### For Better Performance:
- Limit image resolution to 1024x1024 max
- Use minimum region size of 200 pixels
- Limit regions to top 50 largest areas
- Enable hermes engine in build config

### For Better Edge Detection:
- Use high-contrast images
- Avoid very complex images
- Pre-process images with filters if needed

## Troubleshooting

### Issue: Image processing is slow
**Solution**: Reduce target resolution or enable native modules

### Issue: Too many small regions detected
**Solution**: Increase minimum region size in `detectRegions()` function

### Issue: Gestures not working
**Solution**: Make sure react-native-gesture-handler is properly installed and imported

### Issue: Canvas not rendering
**Solution**: Check if react-native-canvas is properly linked

## Advanced Configuration

### Custom Color Palette

Edit the `COLOR_PALETTE` array in `ColoringGame.js`:

```javascript
const COLOR_PALETTE = [
  { id: 1, color: '#YOUR_COLOR', name: 'Color Name' },
  // Add more colors...
];
```

### Adjust Edge Detection Sensitivity

In `ImageProcessor.js`, modify the threshold values:

```javascript
static cannyEdgeDetection(pixels, width, height, lowThreshold = 30, highThreshold = 90)
```

- Lower values = more edges detected
- Higher values = fewer edges detected

### Adjust Region Detection

Modify minimum region size:

```javascript
if (region.pixels.length > 200) { // Change this value
  regions.push(region);
}
```

## Native Module for Better Performance (Optional)

For production apps, consider implementing native modules with:

- **iOS**: Core Image / Vision framework
- **Android**: OpenCV for Android

This will significantly improve processing speed.

## Testing

Test with various image types:
- ✅ Cartoon characters (best results)
- ✅ Simple drawings
- ✅ Coloring book pages
- ⚠️ Photos (may need preprocessing)
- ⚠️ Complex illustrations (may produce too many regions)

## License

MIT License

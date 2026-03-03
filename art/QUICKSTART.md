# Quick Start Guide - Color by Numbers Game

## 🚀 Fast Setup (5 minutes)

### 1. Create New React Native Project

```bash
npx react-native@latest init ColorByNumbersGame
cd ColorByNumbersGame
```

### 2. Install All Dependencies

```bash
npm install --save \
  react-native-gesture-handler@^2.14.0 \
  react-native-reanimated@^3.6.0 \
  react-native-image-picker@^7.1.0 \
  react-native-svg@^14.1.0 \
  react-native-fs@^2.20.0
```

### 3. Install iOS Dependencies

```bash
cd ios && pod install && cd ..
```

### 4. Update babel.config.js

```javascript
module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    'react-native-reanimated/plugin',
  ],
};
```

### 5. Update index.js (Add to TOP)

```javascript
import 'react-native-gesture-handler';
// ... rest of your imports
```

### 6. Add Permissions

**iOS (ios/ColorByNumbersGame/Info.plist):**

```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>Select images to create coloring pages</string>
<key>NSCameraUsageDescription</key>
<string>Take photos to create coloring pages</string>
```

**Android (android/app/src/main/AndroidManifest.xml):**

```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
```

### 7. Copy Files

Create `src/` folder and copy:
- `ColoringGameOptimized.js`
- `ImageProcessor.js`

### 8. Update App.js

```javascript
import React from 'react';
import ColoringGameOptimized from './src/ColoringGameOptimized';

export default function App() {
  return <ColoringGameOptimized />;
}
```

### 9. Run!

```bash
# Android
npx react-native run-android

# iOS  
npx react-native run-ios
```

## 🎯 Quick Test

1. Launch app
2. Tap "Pick Image"
3. Select any cartoon/illustration image
4. Wait 5-10 seconds for processing
5. Start coloring!

## 🐛 Common Issues & Fixes

### Metro Bundler Error
```bash
npx react-native start --reset-cache
```

### Android Build Error
```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### iOS Build Error
```bash
cd ios && pod deintegrate && pod install && cd ..
npx react-native run-ios
```

### Gesture Handler Not Working
Make sure `import 'react-native-gesture-handler';` is the FIRST line in `index.js`

## 📱 Platform-Specific Notes

### iOS
- Minimum iOS version: 13.0
- Requires Xcode 14+
- Test on simulator first

### Android
- Minimum SDK: 21 (Android 5.0)
- Target SDK: 33 (Android 13)
- Enable hardware acceleration

## 🎨 Customization Quick Tips

### Change Color Palette

Edit `COLOR_PALETTE` in `ColoringGameOptimized.js`:

```javascript
const COLOR_PALETTE = [
  { id: 1, color: '#FF6B6B', name: 'Red' },
  { id: 2, color: '#4ECDC4', name: 'Teal' },
  // Add more colors...
];
```

### Adjust Processing Speed

In `simulateImageProcessing()`, change timeout:

```javascript
setTimeout(() => {
  // ...
}, 1000); // Reduce for faster (but less accurate) processing
```

### Change Region Count

In `generateSampleRegions()`:

```javascript
const numRegions = 30; // Increase for more regions
```

## 📊 Performance Tips

1. **Use smaller images** (800x800 max)
2. **Test on real devices** (not just simulator)
3. **Enable Hermes** (RN 0.70+ has it by default)
4. **Profile with Flipper** to find bottlenecks

## 🔧 Development Tools

```bash
# React Native Debugger
npm install -g react-native-debugger

# Flipper (Facebook's debugging platform)
# Download from https://fbflipper.com/

# View logs
npx react-native log-android
npx react-native log-ios
```

## 🎯 Next Steps

1. ✅ Get basic app running
2. ✅ Test with different images
3. 📝 Implement native modules for better performance
4. 🎨 Customize colors and UI
5. 📱 Add save/share features
6. 🚀 Publish to app stores

## 📚 Learning Resources

- [React Native Docs](https://reactnative.dev/)
- [React Native Gesture Handler](https://docs.swmansion.com/react-native-gesture-handler/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [React Native SVG](https://github.com/software-mansion/react-native-svg)

## 💡 Pro Tips

1. **Test with real images** - Start with simple cartoons
2. **Monitor performance** - Use Flipper to check FPS
3. **Cache processed images** - Save time on repeated loads
4. **Add loading indicators** - Processing takes 5-10 seconds
5. **Handle errors gracefully** - Not all images work well

## 🎮 Try These Test Images

**Good for beginners:**
- Simple cartoon characters
- Coloring book pages
- Line art drawings

**Advanced:**
- Anime characters
- Comic book art
- Illustrated scenes

**Challenging:**
- Detailed photographs
- Complex illustrations
- Low-contrast images

---

**Happy Coding! 🎨**

Need help? Check the full README.md for detailed documentation.

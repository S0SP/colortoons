# File Placement Guide

This document shows you exactly where to place each file in your React Native project.

## Project Root Files

```
YourProjectName/
├── package.json                    # Replace or merge with yours
├── babel.config.js                 # Update with reanimated plugin
└── index.js                        # Add gesture-handler import at top
```

## Source Files

```
YourProjectName/
└── src/
    ├── ColoringGameOptimized.js    # Main game component
    └── ImageProcessor.js           # Image processing utilities
```

## iOS Native Module Files

```
YourProjectName/
└── ios/
    └── YourProjectName/            # Your iOS project folder
        ├── ImageProcessorModule.h
        └── ImageProcessorModule.m
```

**Note:** Add these files to your Xcode project:
1. Open `YourProjectName.xcworkspace` in Xcode
2. Right-click your project folder in Xcode
3. Select "Add Files to..."
4. Choose both ImageProcessorModule.h and .m files
5. Make sure "Copy items if needed" is checked

## Android Native Module Files

```
YourProjectName/
└── android/
    └── app/
        └── src/
            └── main/
                └── java/
                    └── com/
                        └── yourprojectname/    # Your package name (lowercase)
                            ├── ImageProcessorModule.java
                            └── ImageProcessorPackage.java
```

**Important:** Replace `com.yourprojectname` with your actual package name.

## Update App.js

Replace the contents of `App.js` in your project root with:

```javascript
import React from 'react';
import ColoringGameOptimized from './src/ColoringGameOptimized';

export default function App() {
  return <ColoringGameOptimized />;
}
```

## Update MainApplication.java (Android)

File location: `android/app/src/main/java/com/yourprojectname/MainApplication.java`

Add the import:
```java
import com.yourprojectname.ImageProcessorPackage;
```

In the `getPackages()` method, add:
```java
packages.add(new ImageProcessorPackage());
```

## Update Info.plist (iOS)

File location: `ios/YourProjectName/Info.plist`

Add before `</dict>`:
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to select images for coloring</string>
<key>NSCameraUsageDescription</key>
<string>We need access to take photos for coloring</string>
```

## Update AndroidManifest.xml (Android)

File location: `android/app/src/main/AndroidManifest.xml`

Add before `<application>`:
```xml
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
```

## Complete Project Structure

```
YourProjectName/
├── README.md
├── QUICKSTART.md
├── INSTALLATION.md
├── package.json
├── babel.config.js
├── index.js
├── App.js
├── src/
│   ├── ColoringGameOptimized.js
│   └── ImageProcessor.js
├── ios/
│   ├── YourProjectName/
│   │   ├── Info.plist
│   │   ├── ImageProcessorModule.h
│   │   └── ImageProcessorModule.m
│   └── Podfile
└── android/
    └── app/
        └── src/
            └── main/
                ├── AndroidManifest.xml
                └── java/
                    └── com/
                        └── yourprojectname/
                            ├── MainApplication.java
                            ├── ImageProcessorModule.java
                            └── ImageProcessorPackage.java
```

## Quick Checklist

- [ ] Created `src/` directory
- [ ] Copied ColoringGameOptimized.js to `src/`
- [ ] Copied ImageProcessor.js to `src/`
- [ ] Added iOS files to Xcode project
- [ ] Copied Android files to correct package directory
- [ ] Updated MainApplication.java
- [ ] Added iOS permissions to Info.plist
- [ ] Added Android permissions to AndroidManifest.xml
- [ ] Updated babel.config.js
- [ ] Updated index.js
- [ ] Updated App.js
- [ ] Installed npm packages
- [ ] Ran `pod install` (iOS)
- [ ] Tested on device/simulator

## Troubleshooting File Placement

### Can't find ImageProcessorModule (iOS)
- Open Xcode and check if files are in the project navigator
- Clean build folder (Cmd+Shift+K)
- Rebuild

### Can't find ImageProcessorModule (Android)
- Check package name matches everywhere
- Run `./gradlew clean` in android directory
- Check imports in MainApplication.java

### Module not registered
- Make sure ImageProcessorPackage is added in MainApplication.java
- Rebuild the app completely

---

Follow this guide carefully and your app will work perfectly! 🎨

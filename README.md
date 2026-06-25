# 🎨 ColorArt Native Frontend

> **The Elite React Native Application for Color-by-Number Games**

ColorArt is a fully interactive, hyper-optimized Android/iOS Color-by-Number mobile application powered by **React Native** and **Skia**. It turns generative imagery and custom photos into buttery-smooth vector experiences capable of handling 4000+ regions natively at 60 FPS. 

---

## ✨ Application Features & Mechanics

ColorArt implements several complex gaming mechanics and optimizations using custom math, gestures, and audio-visual queues.

### 1. O(1) Instant Tap Detection Engine
Most mobile SVG apps fall apart at 1,000+ regions because `path.contains(x, y)` math blocks the main thread. ColorArt avoids math entirely. The backend generates a compressed base64 **Region Map** (`Uint16Array`), essentially a shadow image where pixel colors represent the `region_id`. 
* When a user taps the screen `(x, y)`, the app instantly looks up the ID from the 1D array: `regionMap[y * width + x]`. 
* Uses **Radial Tap Assist** to gently sample 16 points around the finger bounds if a direct hit misses, ensuring zero frustration.

### 2. Single-Pass Render with Progressive LOD 
To maintain native 60fps on low-end devices:
* **Path Caching**: Generates and maps `Skia.Path` instances globally on load; doesn't recalculate SVG strings on taps.
* **Progressive LOD (Level of Detail)**: Staggered mounting stages. Renders outlines instantly (Stage 0), unrolls the heavy paths after 80ms (Stage 1), and defers the rendering of `<Text>` number labels to 220ms (Stage 2) to eliminate jank.
* **Viewport Culling**: Constantly calculates intersection algorithms to drop the rendering of regions visually situated outside the device's zoomed-in screen.

### 3. Dynamic Hint Camera
Users easily get stuck looking for microscopic regions. The custom Hint engine maps active numbers against remaining region pools and ranks them using `hint_priority`. Activating a hint triggers:
* Reanimated `withTiming` zooms scale to `2.5x` specifically to the focal point of the area `[cx, cy]`.
* Generates an animated pulse/glow highlighting effect explicitly on the targeted unpainted `Skia Path`.

### 4. Sensorial Feedback & VFX
An addictive game feels satisfying:
* **Audio Rewards Framework**: Dynamic sounds generated on interactions — plays `squash.mp3` on normal taps, `chime.mp3` when completely filling out a color number grouping, and cascades `fanfare.mp3` on level completion. 
* **Haptics Integration**: Provides native, physical feedback (`Vibration.vibrate`) specifically reacting defensively/negatively when tapping incorrect color zones.
* **Adjacency Flood Fill**: At 100% completion, triggers an algorithmic recursive wave animation leveraging backend `adjacency` data to simulate an illuminating flash scaling out from the very last painted region.

### 5. Infinite Autosave
Employs local cache through `react-native-mmkv` powered Zustand stores. Captures layout contexts and populated `fillRegions` JSON dumps continuously to re-hydrate uncompleted artworks on boot seamlessly natively.

---

## 📡 Data Flow: Fetching from Backend

The backend engine parses standard image files into comprehensive, metadata-rich payloads for the frontend engine.

### Axios Initialization (api.ts)

```typescript
const BASE_URL = 'https://backendcolor.up.railway.app';
export const processImage = async (fileUri: string, options: Options) => { ... }
export const generateImage = async (prompt: string, style: string, options: Options) => { ... }
```

### Full Engine Response Map
When data hits the frontend wrapper via `/api/process` or `/api/generate`, it yields highly pre-calculated metrics mapping seamlessly into local rendering definitions:

```json
{
  "width": 1024,
  "height": 768,
  // Low-resolution Base64 fallback used aggressively in Gallery views.
  "thumbnail_b64": "<base64_jpg>",
  
  // Compound vector map representing massive SVG bodies bound heavily to Color indices.
  "mega_paths_by_color": {
    "0": "M 0 0 ...",
    "1": "M 10 20 ..."
  },
  
  // Decoding engine inflates these binaries into Uint16Array for structural lookup
  "region_map_b64": "<base64_zlib_compressed_O(1)_array>",
  "region_map_width": 512,
  "region_map_height": 384,
  "region_map_scale": 0.5,
  
  // The interactive zones
  "regions": [
    {
      "region_id": 402,
      "color_number": 4,
      "color_idx": 3,
      "color_hex": "#FF5733",
      "path_data": "M 100 200 L 105 205 ...",
      "area": 5234,
      "hint_priority": 98,
      "bbox": {"x": 100, "y": 200, "w": 80, "h": 60},
      "label_x": 140.5,
      "label_y": 230.0,
      "label_font_size": 14
    }
  ],
  "palette": ["#FF5733", "#4A90E2", ...],
  
  // Generates real-time top-header Level Progress Tracking stats natively.
  "palette_stats": [
    {
      "color_idx": 3,
      "hex": "#FF5733",
      "area_fraction": 0.25,
      "region_count": 45
    }
  ],
  
  // Nodal relational mapping; triggering cascading completion effect logic waves.
  "adjacency": {
    "402": [403, 405, 510]
  },
  "timing": { "total": 1.004 }
}
```

---

## 💻 Running the App Locally

### Step 1: Install Dependencies
Ensure you have the latest packages, specifically catering to Nitro/Skia native elements.

```bash
# Using npm
npm install
```

### Step 2: iOS Cocoapods

```bash
cd ios
bundle install
bundle exec pod install
cd ..
```

### Step 3: Start Metro Server & Environment

Use the CLI to bundle configurations and trigger Fast Refresh listeners.

```bash
# Using npm
npm start
```

### Step 4: Build Platform
Open a secondary terminal:

```bash
# For iPhone Simulation
npm run ios

# For Android Emulator
npm run android
```

## ⚙️ Tech Stack & Packages Used
* **Framework:** React Native v0.83.1
* **Drawing Core:** `@shopify/react-native-skia`
* **Animations:** `react-native-reanimated` & `react-native-gesture-handler`
* **Global States/Stores:** `zustand` + `react-native-mmkv`
* **Networking/Decoding:** `axios`, `pako` (for ZLIB byte de-compression)

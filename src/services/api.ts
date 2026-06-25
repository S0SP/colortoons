import axios from 'axios';
import pako from 'pako';
import { Platform } from 'react-native'; // Assuming Platform is available in this context

// ─── Backend URL ──────────────────────────────────────────────────────────────
// ↓↓ CHANGE THIS to your deployed pbn-layered backend URL ↓↓
const BASE_URL = 'https://squashpaintbackend.vercel.app/';
// Examples:
//   'https://squashpaintbackend-production.up.railway.app/'
//   'http://10.0.2.2:3000/'   ← Android emulator
//   'http://192.168.1.5:3000/' ← Physical device local testing → localhost

// Axios instance with better interceptors for debugging
export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 120000,    // 120s — AI/Image processing can be slow
});

// Log requests/responses in dev for easier debugging of Network Errors
api.interceptors.request.use(config => {
    console.log(`[api] ${config.method?.toUpperCase()} ${config.url}`, config.data instanceof FormData ? 'Form Data' : config.data);
    return config;
});

api.interceptors.response.use(
    (response) => {
        console.log(`[api] SUCCESS ${response.status} from ${response.config.url}`);
        return response;
    },
    (error) => {
        if (error.response) {
            console.warn(`[api] SERVER ERROR ${error.response.status}:`, error.response.data);
        } else if (error.request) {
            console.warn('[api] NETWORK ERROR (No response):', error.request);
        } else {
            console.warn('[api] REQUEST ERROR:', error.message);
        }
        return Promise.reject(error);
    }
);

// ─── Base64 Decoder (React Native compatible, no atob) ───────────────────────
const decodeBase64ToBytes = (input: string): Uint8Array => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

    let inputLength = input.length;
    while (input[inputLength - 1] === '=') inputLength--;

    const bufferLength = Math.floor(inputLength * 3 / 4);
    const bytes = new Uint8Array(bufferLength);
    let p = 0;

    for (let i = 0; i < input.length; i += 4) {
        const e1 = lookup[input.charCodeAt(i)] || 0;
        const e2 = lookup[input.charCodeAt(i + 1)] || 0;
        const e3 = lookup[input.charCodeAt(i + 2)] || 0;
        const e4 = lookup[input.charCodeAt(i + 3)] || 0;
        if (p < bufferLength) bytes[p++] = (e1 << 2) | (e2 >> 4);
        if (p < bufferLength) bytes[p++] = ((e2 & 15) << 4) | (e3 >> 2);
        if (p < bufferLength) bytes[p++] = ((e3 & 3) << 6) | (e4 & 63);
    }
    return bytes;
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcessImageOptions {
    numColors?: number;
    maxDimension?: number;
    minRegionArea?: number;
    targetRegions?: number;
}

export interface Region {
    region_id: number;
    color_number: number;
    color_idx: number;
    color_hex: string;
    path_data: string;
    area: number;
    bbox: { x: number; y: number; w: number; h: number };
    label_x: number | null;
    label_y: number | null;
    label_font_size: number;
    hint_priority: number;
    parent_id?: number | null;
    children?: number[];
}

export interface PaletteStat {
    color_idx: number;
    hex: string;
    area_fraction: number;
    region_count: number;
}

export interface ProcessResponse {
    width: number;
    height: number;
    thumbnail_b64: string;
    mega_paths_by_color: { [colorIdx: string]: string };
    regions: Region[];
    palette: string[];
    palette_stats: PaletteStat[];
    adjacency: { [regionId: string]: number[] };
    region_map_b64?: string;
    region_map_width?: number;
    region_map_height?: number;
    region_map_scale?: number;
    timing: {
        load: number;
        quantize: number;
        segment: number;
        labels: number;
        adjacency: number;
        svg: number;
        region_map?: number;
        total: number;
    };
    meta: {
        num_colors_requested: number;
        num_regions: number;
        is_illustration: boolean;
    };
}

// Decoded response — regionMap is a typed Uint16Array instead of base64
export interface DecodedProcessResponse extends Omit<ProcessResponse, 'region_map_b64'> {
    regionMap: Uint16Array | null;
    regionMapWidth: number;
    regionMapHeight: number;
    regionMapScale: number;
}

// ─── Health check ─────────────────────────────────────────────────────────────
export const checkHealth = async (): Promise<boolean> => {
    try {
        const res = await api.get('/api/health', { timeout: 8000 });
        return res.data?.status === 'ok';
    } catch {
        return false;
    }
};

// ─── Decode region map (zlib-deflated Uint16Array, little-endian, base64) ────
const decodeRegionMap = (
    b64Data: string | undefined,
    width: number,
    height: number,
): Uint16Array | null => {
    if (!b64Data || b64Data.length === 0) return null;
    try {
        const compressedBytes = decodeBase64ToBytes(b64Data);
        const decompressed = pako.inflate(compressedBytes);
        const expectedSize = width * height;
        const regionMap = new Uint16Array(expectedSize);
        for (let i = 0; i < expectedSize && i * 2 + 1 < decompressed.length; i++) {
            regionMap[i] = decompressed[i * 2] | (decompressed[i * 2 + 1] << 8);
        }
        const uniqueIds = new Set(regionMap);
        console.log(`[api] Region map: ${uniqueIds.size} unique region IDs`);
        return regionMap;
    } catch (error) {
        console.warn('[api] Failed to decode region map:', error);
        return null;
    }
};

// ─── Shared post-processing (both processImage + generateImage use this) ──────
function postProcess(data: ProcessResponse): DecodedProcessResponse {
    // Compatibility shims (handles any legacy field names)
    if ((data as any).mega_paths && !data.mega_paths_by_color) {
        data.mega_paths_by_color = (data as any).mega_paths;
    } else if (!data.mega_paths_by_color) {
        data.mega_paths_by_color = {};
    }

    if (data.regions && data.palette) {
        for (const r of data.regions) {
            if (r.color_idx === undefined) {
                r.color_idx = data.palette.indexOf(r.color_hex);
                if (r.color_idx === -1) r.color_idx = r.color_number ? r.color_number - 1 : 0;
            }
            if ((r as any).path_data === undefined && (r as any).path !== undefined) {
                r.path_data = (r as any).path;
            }
        }
    }

    // Region map dimensions + scale
    // The new backend uses SVG coordinates for paths, so:
    //   region_map_scale = MULT (3) = svgW / origW
    const regionMapWidth = data.region_map_width || Math.round(data.width / (data.region_map_scale || 3));
    const regionMapHeight = data.region_map_height || Math.round(data.height / (data.region_map_scale || 3));
    const regionMapScale = data.region_map_scale || 3;

    console.log(`[api] region map: ${regionMapWidth}×${regionMapHeight}, scale=${regionMapScale}`);

    const regionMap = decodeRegionMap(data.region_map_b64, regionMapWidth, regionMapHeight);

    const { region_map_b64, ...rest } = data;
    return { ...rest, regionMap, regionMapWidth, regionMapHeight, regionMapScale };
}

export const processImage = async (
    fileUri: string,
    fileName: string = 'upload.jpg',
    fileType: string = 'image/jpeg',
    options: ProcessImageOptions = {},
): Promise<DecodedProcessResponse> => {
    console.log('[api] POST /api/process …', { uri: fileUri, type: fileType, name: fileName });

    let normalizedUri = fileUri;

    // For Android, physical file paths without schemas need file://
    // For bundled resources (like require(...) in release mode), it gives a resource ID without any schema.
    if (Platform.OS === 'android') {
        if (!fileUri.startsWith('content://') && !fileUri.startsWith('file://') && !fileUri.startsWith('http') && !fileUri.startsWith('/')) {
            // It's a bundled resource ID (e.g. 'card_1_tiger_1770252714051')
            try {
                const RNFS = require('react-native-fs');
                // Remove extension just in case, although resource IDs typically don't have them
                const resName = fileUri.split('/').pop()?.split('.')[0] || fileUri;
                const tempDest = `${RNFS.TemporaryDirectoryPath}/${resName}_copy.png`;
                console.log(`[api] Copying Android resource: ${resName} to ${tempDest}`);

                await RNFS.copyFileRes(resName, tempDest);
                normalizedUri = `file://${tempDest}`;
            } catch (e) {
                console.error('[api] Failed to copy Android resource, fallback via file://', e);
                normalizedUri = `file://${fileUri}`; // fallback
            }
        } else if (fileUri.startsWith('/') && !fileUri.startsWith('file://')) {
            normalizedUri = `file://${fileUri}`;
        }
    }

    // 🆕 FIX: If the URI is a remote/Metro asset URL (common in Gallery dev mode),
    // we must download it to a local temp file before FormData can upload it.
    if (normalizedUri.startsWith('http')) {
        try {
            const RNFS = require('react-native-fs');
            const tempPath = `${RNFS.TemporaryDirectoryPath}/temp_gallery_upload.png`;
            console.log('[api] Downloading gallery asset to temp file:', tempPath);

            // Remove previous if exists to prevent stale content caches
            if (await RNFS.exists(tempPath)) {
                await RNFS.unlink(tempPath);
            }

            await RNFS.downloadFile({
                fromUrl: normalizedUri,
                toFile: tempPath,
            }).promise;
            normalizedUri = `file://${tempPath}`;
        } catch (e) {
            console.error('[api] Failed to download gallery asset:', e);
            throw new Error('Gallery image could not be prepared for upload.');
        }
    }

    // Verify connectivity first
    try {
        const check = await fetch(`${BASE_URL}api/health`);
        console.log('[api] Pre-upload health check:', check.status);
    } catch (e) {
        console.warn('[api] Could not reach backend:', BASE_URL);
    }

    // Detect actual type if possible, fallback to image/jpeg
    const actualType = normalizedUri.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('image', {
        uri: normalizedUri,
        type: actualType,
        name: fileName.includes('.') ? fileName : `${fileName}${actualType === 'image/png' ? '.png' : '.jpg'}`
    } as any);

    if (options.numColors != null) formData.append('num_colors', String(options.numColors));
    if (options.minRegionArea != null) formData.append('min_region_area', String(options.minRegionArea));
    if (options.targetRegions != null) formData.append('target_regions', String(options.targetRegions));

    formData.append('settings', JSON.stringify({
        kMeansNrOfClusters: options.numColors ?? 16,
        removeFacetsSmallerThanNrOfPoints: options.minRegionArea ?? 30,
        enableShadowLayer: false,
        enableHighlightLayer: false,
        enableDepthLayer: false,
    }));

    console.log('[api] Uploading to:', `${BASE_URL}api/process`);

    const t0 = Date.now();
    const response = await fetch(`${BASE_URL}api/process`, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        const text = await response.text();
        console.error('[api] Upload failed:', response.status, text);
        throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log(`[api] Success in ${Date.now() - t0}ms, regions: ${result.regions?.length}`);

    return postProcess(result);
};

// ─── generateImage — AI-generated image (prompt-based) ───────────────────────
// NOTE: The new Node.js backend does NOT implement an /api/generate endpoint.
// This function is kept for API compatibility.  If you need AI generation,
// either point it at a separate service or implement /api/generate in server.ts.
export const generateImage = async (
    prompt: string,
    style: string,
    options: ProcessImageOptions = {},
): Promise<DecodedProcessResponse> => {
    const payload = {
        prompt,
        style,
        num_colors: options.numColors,
        max_dimension: options.maxDimension,
        min_region_area: options.minRegionArea,
        target_regions: options.targetRegions,
        settings: {
            kMeansNrOfClusters: options.numColors ?? 16,
            removeFacetsSmallerThanNrOfPoints: options.minRegionArea ?? 30,
            enableShadowLayer: false,
            enableHighlightLayer: false,
            enableDepthLayer: false,
        },
    };

    console.log('[api] POST /api/generate-ai …');
    const t0 = Date.now();
    const response = await api.post<ProcessResponse>('/api/generate-ai', payload, {
        timeout: 120000,
    });
    console.log(`[api] generate response in ${Date.now() - t0}ms`);

    return postProcess(response.data);
};

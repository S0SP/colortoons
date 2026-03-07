import axios from 'axios';
import pako from 'pako';

// ─── Backend URL ──────────────────────────────────────────────────────────────
const BASE_URL = 'https://backendcolor.up.railway.app';

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 60000,
});

// ─── Base64 Decoder (React Native compatible) ─────────────────────────────────
const decodeBase64ToBytes = (input: string): Uint8Array => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const lookup = new Uint8Array(256);
    for (let i = 0; i < chars.length; i++) {
        lookup[chars.charCodeAt(i)] = i;
    }

    // Remove padding and calculate length
    let inputLength = input.length;
    while (input[inputLength - 1] === '=') inputLength--;

    const bufferLength = Math.floor(inputLength * 3 / 4);
    const bytes = new Uint8Array(bufferLength);
    let p = 0;

    for (let i = 0; i < input.length; i += 4) {
        const encoded1 = lookup[input.charCodeAt(i)] || 0;
        const encoded2 = lookup[input.charCodeAt(i + 1)] || 0;
        const encoded3 = lookup[input.charCodeAt(i + 2)] || 0;
        const encoded4 = lookup[input.charCodeAt(i + 3)] || 0;

        if (p < bufferLength) bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        if (p < bufferLength) bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        if (p < bufferLength) bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
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
    // Region map for O(1) tap detection
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

// ─── Decoded response with typed regionMap ────────────────────────────────────
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

// ─── Decode region map from base64+zlib ───────────────────────────────────────
const decodeRegionMap = (
    b64Data: string | undefined,
    width: number,
    height: number
): Uint16Array | null => {
    if (!b64Data || b64Data.length === 0) {
        console.log('[api] No region map data provided');
        return null;
    }

    try {
        console.log(`[api] Decoding region map: ${b64Data.length} chars -> ${width}x${height}`);

        // Decode base64 to bytes
        const compressedBytes = decodeBase64ToBytes(b64Data);
        console.log(`[api] Base64 decoded: ${compressedBytes.length} bytes`);

        // Decompress with pako
        const decompressed = pako.inflate(compressedBytes);
        console.log(`[api] Decompressed: ${decompressed.length} bytes`);

        // Convert to Uint16Array (little-endian)
        const expectedSize = width * height;
        const regionMap = new Uint16Array(expectedSize);

        for (let i = 0; i < expectedSize && i * 2 + 1 < decompressed.length; i++) {
            // Little-endian: low byte first, then high byte
            regionMap[i] = decompressed[i * 2] | (decompressed[i * 2 + 1] << 8);
        }

        // Log some stats
        const uniqueIds = new Set(regionMap);
        console.log(`[api] Region map decoded: ${uniqueIds.size} unique region IDs`);

        return regionMap;
    } catch (error) {
        console.warn('[api] Failed to decode region map:', error);
        return null;
    }
};

// ─── Main pipeline call ───────────────────────────────────────────────────────
export const processImage = async (
    fileUri: string,
    fileName: string = 'upload.jpg',
    fileType: string = 'image/jpeg',
    options: ProcessImageOptions = {},
): Promise<DecodedProcessResponse> => {
    const formData = new FormData();

    formData.append('image', {
        uri: fileUri,
        type: fileType,
        name: fileName,
    } as any);

    if (options.numColors != null) formData.append('num_colors', String(options.numColors));
    if (options.maxDimension != null) formData.append('max_dimension', String(options.maxDimension));
    if (options.minRegionArea != null) formData.append('min_region_area', String(options.minRegionArea));
    if (options.targetRegions != null) formData.append('target_regions', String(options.targetRegions));

    console.log('[api] Sending request to backend...');
    const startTime = Date.now();

    const response = await api.post<ProcessResponse>('/api/process', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
    });

    console.log(`[api] Response received in ${Date.now() - startTime}ms`);

    const data = response.data;

    // Compatibility shims
    if ((data as any).mega_paths && !data.mega_paths_by_color) {
        data.mega_paths_by_color = (data as any).mega_paths;
    } else if (!data.mega_paths_by_color) {
        data.mega_paths_by_color = {};
    }

    if (data.regions && data.palette) {
        for (const r of data.regions) {
            if (r.color_idx === undefined) {
                r.color_idx = data.palette.indexOf(r.color_hex);
                if (r.color_idx === -1) {
                    r.color_idx = r.color_number ? r.color_number - 1 : 0;
                }
            }
            if ((r as any).path_data === undefined && (r as any).path !== undefined) {
                r.path_data = (r as any).path;
            }
        }
    }

    // Decode region map
    const regionMapWidth = data.region_map_width || 512;
    const regionMapHeight = data.region_map_height || Math.round(512 * (data.height / data.width));
    const regionMapScale = data.region_map_scale || (data.width / regionMapWidth);

    console.log(`[api] Region map params: ${regionMapWidth}x${regionMapHeight}, scale=${regionMapScale}`);

    const regionMap = decodeRegionMap(
        data.region_map_b64,
        regionMapWidth,
        regionMapHeight
    );

    // Remove the base64 string from response to save memory
    const { region_map_b64, ...rest } = data;

    return {
        ...rest,
        regionMap,
        regionMapWidth,
        regionMapHeight,
        regionMapScale,
    };
};

// ─── Legacy stub ──────────────────────────────────────────────────────────────
export const generatePainting = async (_prompt: string, _style: string, _difficulty: number) => {
    console.warn('[api] generatePainting() is deprecated');
    throw new Error('generatePainting is no longer supported. Use processImage() with a real image.');
};
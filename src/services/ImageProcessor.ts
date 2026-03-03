import { NativeModules, Platform } from 'react-native';

const { ImageProcessor } = NativeModules;

export interface Point {
    x: number;
    y: number;
}

export interface Region {
    id: number;
    colorId: number;
    pathData: string;
    center: Point;
}

export interface ProcessedImageResult {
    outlineUri: string;
    width: number;
    height: number;
    regions: Region[];
}

class ImageProcessorService {
    /**
     * Convert image to outline using edge detection
     * @param imageUri - URI of the source image
     * @param targetWidth - Target width for processing
     * @param targetHeight - Target height for processing
     */
    static async convertToOutline(
        imageUri: string,
        targetWidth: number,
        targetHeight: number
    ): Promise<ProcessedImageResult> {
        if (!ImageProcessor) {
            console.warn('ImageProcessor native module not found');
            throw new Error('ImageProcessor native module not found');
        }

        try {
            // Android URIs might need adjustment if they don't have file:// prefix or are content://
            // Native module uses Uri.parse(), which handles both well.
            const result = await ImageProcessor.processImageToOutline(
                imageUri,
                targetWidth,
                targetHeight
            );
            return result;
        } catch (error) {
            console.error('Image processing error:', error);
            throw error;
        }
    }
}

export default ImageProcessorService;

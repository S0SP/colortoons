package com.coloringgame;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Canvas;
import android.graphics.ColorMatrix;
import android.graphics.ColorMatrixColorFilter;
import android.graphics.Paint;
import android.net.Uri;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Random;

public class ImageProcessorModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "ImageProcessor";
    private final ReactApplicationContext reactContext;

    public ImageProcessorModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void processImageToOutline(String imageUri, int targetWidth, int targetHeight, Promise promise) {
        try {
            // Load image
            Uri uri = Uri.parse(imageUri);
            InputStream inputStream = reactContext.getContentResolver().openInputStream(uri);
            Bitmap originalBitmap = BitmapFactory.decodeStream(inputStream);
            inputStream.close();

            if (originalBitmap == null) {
                promise.reject("IMAGE_LOAD_ERROR", "Failed to load image");
                return;
            }

            // Resize bitmap
            Bitmap resizedBitmap = Bitmap.createScaledBitmap(originalBitmap, targetWidth, targetHeight, true);
            originalBitmap.recycle();

            // Convert to grayscale
            Bitmap grayscaleBitmap = convertToGrayscale(resizedBitmap);

            // Apply edge detection
            Bitmap edgeBitmap = detectEdges(grayscaleBitmap);

            // Find regions
            WritableArray regions = findRegions(edgeBitmap);

            // Save processed image
            String processedPath = saveImageToTemp(edgeBitmap);

            // Create result
            WritableMap result = Arguments.createMap();
            result.putString("outlineUri", processedPath);
            result.putInt("width", targetWidth);
            result.putInt("height", targetHeight);
            result.putArray("regions", regions);

            // Cleanup
            resizedBitmap.recycle();
            grayscaleBitmap.recycle();
            edgeBitmap.recycle();

            promise.resolve(result);

        } catch (Exception e) {
            promise.reject("PROCESSING_ERROR", e.getMessage(), e);
        }
    }

    private Bitmap convertToGrayscale(Bitmap bitmap) {
        Bitmap grayscaleBitmap = Bitmap.createBitmap(bitmap.getWidth(), bitmap.getHeight(), Bitmap.Config.ARGB_8888);
        
        Canvas canvas = new Canvas(grayscaleBitmap);
        Paint paint = new Paint();
        
        ColorMatrix colorMatrix = new ColorMatrix();
        colorMatrix.setSaturation(0);
        
        ColorMatrixColorFilter filter = new ColorMatrixColorFilter(colorMatrix);
        paint.setColorFilter(filter);
        
        canvas.drawBitmap(bitmap, 0, 0, paint);
        
        return grayscaleBitmap;
    }

    private Bitmap detectEdges(Bitmap bitmap) {
        int width = bitmap.getWidth();
        int height = bitmap.getHeight();
        
        Bitmap edgeBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888);
        
        int[] pixels = new int[width * height];
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height);
        
        int[] edgePixels = new int[width * height];
        
        // Sobel operator
        int[][] sobelX = {{-1, 0, 1}, {-2, 0, 2}, {-1, 0, 1}};
        int[][] sobelY = {{-1, -2, -1}, {0, 0, 0}, {1, 2, 1}};
        
        for (int y = 1; y < height - 1; y++) {
            for (int x = 1; x < width - 1; x++) {
                int gx = 0;
                int gy = 0;
                
                for (int ky = -1; ky <= 1; ky++) {
                    for (int kx = -1; kx <= 1; kx++) {
                        int pixel = pixels[(y + ky) * width + (x + kx)];
                        int gray = (pixel >> 16) & 0xFF; // Red channel (all channels same in grayscale)
                        
                        gx += gray * sobelX[ky + 1][kx + 1];
                        gy += gray * sobelY[ky + 1][kx + 1];
                    }
                }
                
                int magnitude = (int) Math.sqrt(gx * gx + gy * gy);
                magnitude = Math.min(255, magnitude);
                
                int edgeColor = (magnitude > 128) ? 0xFF000000 : 0xFFFFFFFF; // Black or white
                edgePixels[y * width + x] = edgeColor;
            }
        }
        
        edgeBitmap.setPixels(edgePixels, 0, width, 0, 0, width, height);
        
        return edgeBitmap;
    }

    private WritableArray findRegions(Bitmap edgeBitmap) {
        WritableArray regions = Arguments.createArray();
        
        int width = edgeBitmap.getWidth();
        int height = edgeBitmap.getHeight();
        
        // Simple grid-based region detection
        int gridSize = 5;
        int cellWidth = width / gridSize;
        int cellHeight = height / gridSize;
        
        Random random = new Random();
        
        for (int row = 0; row < gridSize; row++) {
            for (int col = 0; col < gridSize; col++) {
                int x = col * cellWidth + cellWidth / 2;
                int y = row * cellHeight + cellHeight / 2;
                
                // Add random offset
                x += random.nextInt(cellWidth / 2) - cellWidth / 4;
                y += random.nextInt(cellHeight / 2) - cellHeight / 4;
                
                WritableMap center = Arguments.createMap();
                center.putInt("x", x);
                center.putInt("y", y);
                
                WritableMap region = Arguments.createMap();
                region.putInt("id", row * gridSize + col);
                region.putMap("center", center);
                region.putInt("colorId", (row * gridSize + col) % 10 + 1);
                
                regions.pushMap(region);
            }
        }
        
        return regions;
    }

    private String saveImageToTemp(Bitmap bitmap) throws Exception {
        File tempDir = reactContext.getCacheDir();
        String filename = "processed_" + System.currentTimeMillis() + ".png";
        File file = new File(tempDir, filename);
        
        FileOutputStream outputStream = new FileOutputStream(file);
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream);
        outputStream.flush();
        outputStream.close();
        
        return "file://" + file.getAbsolutePath();
    }
}

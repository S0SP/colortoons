package com.colorart;

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
            if (inputStream != null)
                inputStream.close();

            if (originalBitmap == null) {
                promise.reject("IMAGE_LOAD_ERROR", "Failed to load image");
                return;
            }

            // Resize bitmap
            Bitmap resizedBitmap = Bitmap.createScaledBitmap(originalBitmap, targetWidth, targetHeight, true);
            if (originalBitmap != resizedBitmap) {
                originalBitmap.recycle();
            }

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
        int[][] sobelX = { { -1, 0, 1 }, { -2, 0, 2 }, { -1, 0, 1 } };
        int[][] sobelY = { { -1, -2, -1 }, { 0, 0, 0 }, { 1, 2, 1 } };

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

        int[] pixels = new int[width * height];
        edgeBitmap.getPixels(pixels, 0, width, 0, 0, width, height);

        int[] labels = new int[width * height]; // 0 = visited/none, -1 = edge, >0 = region id

        // Mark edges
        for (int i = 0; i < pixels.length; i++) {
            // Edge is black (0xFF000000), background is white (0xFFFFFFFF)
            if (pixels[i] == 0xFF000000) {
                labels[i] = -1;
            }
        }

        int currentLabel = 1;
        int minRegionSize = 100; // Minimum pixels to be a region

        for (int y = 0; y < height; y++) {
            for (int x = 0; x < width; x++) {
                int idx = y * width + x;
                if (labels[idx] == 0) {
                    // Flood fill
                    RegionData data = floodFill(pixels, labels, x, y, width, height, currentLabel);

                    if (data.pixelCount > minRegionSize) {
                        WritableMap center = Arguments.createMap();
                        center.putInt("x", (data.minX + data.maxX) / 2);
                        center.putInt("y", (data.minY + data.maxY) / 2);

                        WritableMap region = Arguments.createMap();
                        region.putInt("id", currentLabel);
                        region.putMap("center", center);
                        region.putInt("colorId", (currentLabel % 10) + 1);

                        // Path: Bounding Box (Better than random, still simple)
                        String path = "M " + data.minX + " " + data.minY +
                                " L " + data.maxX + " " + data.minY +
                                " L " + data.maxX + " " + data.maxY +
                                " L " + data.minX + " " + data.maxY + " Z";

                        region.putString("pathData", path);
                        regions.pushMap(region);

                        currentLabel++;
                        // Cap at 150 regions for performance
                        if (currentLabel > 150)
                            return regions;
                    }
                }
            }
        }

        return regions;
    }

    private static class RegionData {
        int pixelCount = 0;
        int minX = Integer.MAX_VALUE;
        int maxX = Integer.MIN_VALUE;
        int minY = Integer.MAX_VALUE;
        int maxY = Integer.MIN_VALUE;
    }

    private RegionData floodFill(int[] pixels, int[] labels, int startX, int startY, int width, int height, int label) {
        RegionData data = new RegionData();
        // Use a simple array stack to avoid recursion depth issues
        int[] stack = new int[width * height];
        int stackPtr = 0;

        stack[stackPtr++] = startY * width + startX;
        labels[startY * width + startX] = label;

        data.minX = startX;
        data.maxX = startX;
        data.minY = startY;
        data.maxY = startY;
        data.pixelCount = 0;

        while (stackPtr > 0) {
            int idx = stack[--stackPtr];
            int cx = idx % width;
            int cy = idx / width;

            data.pixelCount++;
            if (cx < data.minX)
                data.minX = cx;
            if (cx > data.maxX)
                data.maxX = cx;
            if (cy < data.minY)
                data.minY = cy;
            if (cy > data.maxY)
                data.maxY = cy;

            // Checks 4 neighbors
            int[] neighbors = {
                    idx - 1, // Left
                    idx + 1, // Right
                    idx - width, // Up
                    idx + width // Down
            };

            for (int nIdx : neighbors) {
                if (nIdx >= 0 && nIdx < labels.length) {
                    // Check bounds for wrap-around
                    int nx = nIdx % width;
                    int ny = nIdx / width;

                    // Prevent wrapping labeled edges or finding distant pixels
                    // Simple Manhattan distance check for adjacency in grid
                    if (Math.abs(nx - cx) + Math.abs(ny - cy) == 1) {
                        if (labels[nIdx] == 0) {
                            labels[nIdx] = label;
                            stack[stackPtr++] = nIdx;
                        }
                    }
                }
            }
        }
        return data;
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

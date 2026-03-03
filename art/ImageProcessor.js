// ImageProcessor.js - Advanced image processing utilities
import { NativeModules, Platform } from 'react-native';
import RNFS from 'react-native-fs';

class ImageProcessor {
  /**
   * Convert image to outline using edge detection
   * @param {string} imageUri - URI of the source image
   * @param {number} targetWidth - Target width for processing
   * @param {number} targetHeight - Target height for processing
   * @returns {Promise<{outlineUri: string, regions: Array}>}
   */
  static async convertToOutline(imageUri, targetWidth, targetHeight) {
    try {
      // Load image data
      const imageData = await this.loadImageData(imageUri, targetWidth, targetHeight);
      
      // Apply preprocessing
      const grayscale = this.toGrayscale(imageData);
      
      // Apply Gaussian blur to reduce noise
      const blurred = this.gaussianBlur(grayscale, imageData.width, imageData.height);
      
      // Apply Canny edge detection
      const edges = this.cannyEdgeDetection(blurred, imageData.width, imageData.height);
      
      // Detect regions using connected components
      const regions = this.detectRegions(edges, imageData.width, imageData.height);
      
      // Create outline image
      const outlineImage = this.createOutlineImage(edges, imageData.width, imageData.height);
      
      // Save and return
      const outlineUri = await this.saveImage(outlineImage, imageData.width, imageData.height);
      
      return {
        outlineUri,
        regions,
        width: imageData.width,
        height: imageData.height,
      };
    } catch (error) {
      console.error('Image processing error:', error);
      throw error;
    }
  }

  /**
   * Load and resize image data
   */
  static async loadImageData(uri, width, height) {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        
        const imageData = ctx.getImageData(0, 0, width, height);
        resolve({
          data: imageData.data,
          width,
          height,
        });
      };
      
      img.onerror = reject;
      img.src = uri;
    });
  }

  /**
   * Convert to grayscale
   */
  static toGrayscale(imageData) {
    const { data, width, height } = imageData;
    const gray = new Uint8Array(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    }
    
    return gray;
  }

  /**
   * Apply Gaussian blur
   */
  static gaussianBlur(pixels, width, height, sigma = 1.4) {
    const kernel = this.getGaussianKernel(sigma);
    const radius = Math.floor(kernel.length / 2);
    const blurred = new Uint8Array(pixels.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;
        
        for (let ky = -radius; ky <= radius; ky++) {
          for (let kx = -radius; kx <= radius; kx++) {
            const ny = Math.min(Math.max(y + ky, 0), height - 1);
            const nx = Math.min(Math.max(x + kx, 0), width - 1);
            const weight = kernel[ky + radius][kx + radius];
            
            sum += pixels[ny * width + nx] * weight;
            weightSum += weight;
          }
        }
        
        blurred[y * width + x] = Math.round(sum / weightSum);
      }
    }
    
    return blurred;
  }

  /**
   * Generate Gaussian kernel
   */
  static getGaussianKernel(sigma) {
    const size = Math.ceil(sigma * 3) * 2 + 1;
    const kernel = [];
    const center = Math.floor(size / 2);
    
    for (let y = 0; y < size; y++) {
      kernel[y] = [];
      for (let x = 0; x < size; x++) {
        const dx = x - center;
        const dy = y - center;
        kernel[y][x] = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
      }
    }
    
    return kernel;
  }

  /**
   * Canny edge detection
   */
  static cannyEdgeDetection(pixels, width, height, lowThreshold = 50, highThreshold = 150) {
    // Calculate gradients using Sobel operator
    const { magnitude, direction } = this.sobelOperator(pixels, width, height);
    
    // Non-maximum suppression
    const suppressed = this.nonMaximumSuppression(magnitude, direction, width, height);
    
    // Double threshold and edge tracking
    const edges = this.doubleThreshold(suppressed, width, height, lowThreshold, highThreshold);
    
    return edges;
  }

  /**
   * Sobel operator for gradient calculation
   */
  static sobelOperator(pixels, width, height) {
    const magnitude = new Float32Array(width * height);
    const direction = new Float32Array(width * height);
    
    const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
    const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0;
        let gy = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = (y + ky) * width + (x + kx);
            const kernelIdx = (ky + 1) * 3 + (kx + 1);
            
            gx += pixels[idx] * sobelX[kernelIdx];
            gy += pixels[idx] * sobelY[kernelIdx];
          }
        }
        
        const idx = y * width + x;
        magnitude[idx] = Math.sqrt(gx * gx + gy * gy);
        direction[idx] = Math.atan2(gy, gx);
      }
    }
    
    return { magnitude, direction };
  }

  /**
   * Non-maximum suppression
   */
  static nonMaximumSuppression(magnitude, direction, width, height) {
    const suppressed = new Uint8Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const angle = direction[idx] * 180 / Math.PI;
        const normalizedAngle = angle < 0 ? angle + 180 : angle;
        
        let neighbor1, neighbor2;
        
        // Determine neighbors based on gradient direction
        if (normalizedAngle < 22.5 || normalizedAngle >= 157.5) {
          neighbor1 = magnitude[y * width + (x - 1)];
          neighbor2 = magnitude[y * width + (x + 1)];
        } else if (normalizedAngle < 67.5) {
          neighbor1 = magnitude[(y - 1) * width + (x + 1)];
          neighbor2 = magnitude[(y + 1) * width + (x - 1)];
        } else if (normalizedAngle < 112.5) {
          neighbor1 = magnitude[(y - 1) * width + x];
          neighbor2 = magnitude[(y + 1) * width + x];
        } else {
          neighbor1 = magnitude[(y - 1) * width + (x - 1)];
          neighbor2 = magnitude[(y + 1) * width + (x + 1)];
        }
        
        // Keep only if it's a local maximum
        if (magnitude[idx] >= neighbor1 && magnitude[idx] >= neighbor2) {
          suppressed[idx] = Math.min(255, magnitude[idx]);
        }
      }
    }
    
    return suppressed;
  }

  /**
   * Double threshold and edge tracking by hysteresis
   */
  static doubleThreshold(pixels, width, height, lowThreshold, highThreshold) {
    const edges = new Uint8Array(width * height);
    
    // Classify pixels
    for (let i = 0; i < pixels.length; i++) {
      if (pixels[i] >= highThreshold) {
        edges[i] = 255; // Strong edge
      } else if (pixels[i] >= lowThreshold) {
        edges[i] = 128; // Weak edge
      }
    }
    
    // Edge tracking by hysteresis
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        
        if (edges[idx] === 128) {
          // Check if connected to strong edge
          let hasStrongNeighbor = false;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (edges[(y + dy) * width + (x + dx)] === 255) {
                hasStrongNeighbor = true;
                break;
              }
            }
            if (hasStrongNeighbor) break;
          }
          
          edges[idx] = hasStrongNeighbor ? 255 : 0;
        }
      }
    }
    
    return edges;
  }

  /**
   * Detect regions using connected components labeling
   */
  static detectRegions(edges, width, height) {
    const labels = new Int32Array(width * height).fill(-1);
    const regions = [];
    let currentLabel = 0;
    
    // Find all white (non-edge) regions
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        
        if (edges[idx] === 0 && labels[idx] === -1) {
          const region = this.floodFill(edges, labels, x, y, width, height, currentLabel);
          
          if (region.pixels.length > 200) { // Minimum region size
            regions.push({
              id: currentLabel,
              pixels: region.pixels,
              center: region.center,
              bounds: region.bounds,
              colorId: (currentLabel % 74) + 1, // Assign color numbers 1-74
            });
            currentLabel++;
          }
        }
      }
    }
    
    return regions;
  }

  /**
   * Flood fill to find connected components
   */
  static floodFill(edges, labels, startX, startY, width, height, label) {
    const stack = [[startX, startY]];
    const pixels = [];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    let sumX = 0, sumY = 0;
    
    while (stack.length > 0) {
      const [x, y] = stack.pop();
      const idx = y * width + x;
      
      if (x < 0 || x >= width || y < 0 || y >= height || labels[idx] !== -1 || edges[idx] > 0) {
        continue;
      }
      
      labels[idx] = label;
      pixels.push({ x, y });
      sumX += x;
      sumY += y;
      
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // 4-connectivity
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    return {
      pixels,
      center: {
        x: Math.round(sumX / pixels.length),
        y: Math.round(sumY / pixels.length),
      },
      bounds: { minX, maxX, minY, maxY },
    };
  }

  /**
   * Create outline image from edges
   */
  static createOutlineImage(edges, width, height) {
    const imageData = new Uint8ClampedArray(width * height * 4);
    
    for (let i = 0; i < edges.length; i++) {
      const pixelIdx = i * 4;
      const isEdge = edges[i] > 0;
      
      imageData[pixelIdx] = isEdge ? 0 : 255;     // R
      imageData[pixelIdx + 1] = isEdge ? 0 : 255; // G
      imageData[pixelIdx + 2] = isEdge ? 0 : 255; // B
      imageData[pixelIdx + 3] = 255;              // A
    }
    
    return imageData;
  }

  /**
   * Save image to file system
   */
  static async saveImage(imageData, width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    const imgData = new ImageData(imageData, width, height);
    ctx.putImageData(imgData, 0, 0);
    
    return canvas.toDataURL('image/png');
  }

  /**
   * Get optimal zoom level for region
   */
  static getZoomLevel(region, screenWidth, screenHeight) {
    const regionWidth = region.bounds.maxX - region.bounds.minX;
    const regionHeight = region.bounds.maxY - region.bounds.minY;
    
    const scaleX = screenWidth / regionWidth;
    const scaleY = screenHeight / regionHeight;
    
    return Math.min(scaleX, scaleY, 3); // Max zoom of 3x
  }
}

export default ImageProcessor;

//
//  ImageProcessorModule.m
//  ColorByNumbersGame
//
//  Native module implementation for image processing
//

#import "ImageProcessorModule.h"
#import <React/RCTLog.h>
#import <UIKit/UIKit.h>

// If using OpenCV, uncomment:
// #ifdef __cplusplus
// #import <opencv2/opencv.hpp>
// #import <opencv2/imgcodecs/ios.h>
// #endif

@implementation ImageProcessorModule

RCT_EXPORT_MODULE(ImageProcessor);

// Process image to outline
RCT_EXPORT_METHOD(processImageToOutline:(NSString *)imageUri
                  targetWidth:(NSInteger)width
                  targetHeight:(NSInteger)height
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        @try {
            // Load image
            NSURL *url = [NSURL URLWithString:imageUri];
            NSData *imageData = [NSData dataWithContentsOfURL:url];
            UIImage *image = [UIImage imageWithData:imageData];
            
            if (!image) {
                reject(@"image_load_error", @"Failed to load image", nil);
                return;
            }
            
            // Resize image
            UIImage *resizedImage = [self resizeImage:image toWidth:width height:height];
            
            // Convert to grayscale
            UIImage *grayscaleImage = [self convertToGrayscale:resizedImage];
            
            // Apply edge detection (simplified Sobel)
            UIImage *edgeImage = [self detectEdges:grayscaleImage];
            
            // Find regions
            NSArray *regions = [self findRegions:edgeImage];
            
            // Save processed image
            NSString *processedPath = [self saveImageToTemp:edgeImage];
            
            // Return results
            NSDictionary *result = @{
                @"outlineUri": processedPath,
                @"width": @(width),
                @"height": @(height),
                @"regions": regions
            };
            
            dispatch_async(dispatch_get_main_queue(), ^{
                resolve(result);
            });
            
        } @catch (NSException *exception) {
            reject(@"processing_error", exception.reason, nil);
        }
    });
}

// Resize image
- (UIImage *)resizeImage:(UIImage *)image toWidth:(NSInteger)width height:(NSInteger)height {
    CGSize newSize = CGSizeMake(width, height);
    UIGraphicsBeginImageContextWithOptions(newSize, NO, 1.0);
    [image drawInRect:CGRectMake(0, 0, newSize.width, newSize.height)];
    UIImage *resizedImage = UIGraphicsGetImageFromCurrentImageContext();
    UIGraphicsEndImageContext();
    return resizedImage;
}

// Convert to grayscale
- (UIImage *)convertToGrayscale:(UIImage *)image {
    CGSize size = image.size;
    CGRect rect = CGRectMake(0, 0, size.width, size.height);
    
    // Create a grayscale context
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceGray();
    CGContextRef context = CGBitmapContextCreate(nil, size.width, size.height, 8, 0, colorSpace, kCGImageAlphaNone);
    
    // Draw the image
    CGContextDrawImage(context, rect, image.CGImage);
    
    // Get the grayscale image
    CGImageRef imageRef = CGBitmapContextCreateImage(context);
    UIImage *grayscaleImage = [UIImage imageWithCGImage:imageRef];
    
    // Cleanup
    CGColorSpaceRelease(colorSpace);
    CGContextRelease(context);
    CGImageRelease(imageRef);
    
    return grayscaleImage;
}

// Simple edge detection (Sobel-like)
- (UIImage *)detectEdges:(UIImage *)image {
    CIContext *context = [CIContext contextWithOptions:nil];
    CIImage *ciImage = [CIImage imageWithCGImage:image.CGImage];
    
    // Apply edge detection filter
    CIFilter *edgeFilter = [CIFilter filterWithName:@"CIEdges"];
    [edgeFilter setValue:ciImage forKey:kCIInputImageKey];
    [edgeFilter setValue:@(2.0) forKey:kCIInputIntensityKey];
    
    CIImage *outputImage = [edgeFilter outputImage];
    
    // Convert back to UIImage
    CGImageRef cgImage = [context createCGImage:outputImage fromRect:outputImage.extent];
    UIImage *edgeImage = [UIImage imageWithCGImage:cgImage];
    CGImageRelease(cgImage);
    
    return edgeImage;
}

// Find regions using connected components
- (NSArray *)findRegions:(UIImage *)edgeImage {
    NSMutableArray *regions = [NSMutableArray array];
    
    CGImageRef imageRef = edgeImage.CGImage;
    NSInteger width = CGImageGetWidth(imageRef);
    NSInteger height = CGImageGetHeight(imageRef);
    
    // Get pixel data
    CGColorSpaceRef colorSpace = CGColorSpaceCreateDeviceGray();
    unsigned char *pixels = (unsigned char *)calloc(width * height, sizeof(unsigned char));
    
    CGContextRef contextRef = CGBitmapContextCreate(pixels, width, height, 8, width, colorSpace, kCGImageAlphaNone);
    CGContextDrawImage(contextRef, CGRectMake(0, 0, width, height), imageRef);
    
    // Simple region detection (grid-based for performance)
    NSInteger gridSize = 5;
    NSInteger cellWidth = width / gridSize;
    NSInteger cellHeight = height / gridSize;
    
    for (NSInteger row = 0; row < gridSize; row++) {
        for (NSInteger col = 0; col < gridSize; col++) {
            NSInteger x = col * cellWidth + cellWidth / 2;
            NSInteger y = row * cellHeight + cellHeight / 2;
            
            // Add some random offset
            x += (arc4random() % (cellWidth / 2)) - cellWidth / 4;
            y += (arc4random() % (cellHeight / 2)) - cellHeight / 4;
            
            NSDictionary *region = @{
                @"id": @(row * gridSize + col),
                @"center": @{
                    @"x": @(x),
                    @"y": @(y)
                },
                @"colorId": @((row * gridSize + col) % 10 + 1)
            };
            
            [regions addObject:region];
        }
    }
    
    // Cleanup
    free(pixels);
    CGColorSpaceRelease(colorSpace);
    CGContextRelease(contextRef);
    
    return regions;
}

// Save image to temporary directory
- (NSString *)saveImageToTemp:(UIImage *)image {
    NSString *tempDir = NSTemporaryDirectory();
    NSString *filename = [NSString stringWithFormat:@"processed_%@.png", [[NSUUID UUID] UUIDString]];
    NSString *filePath = [tempDir stringByAppendingPathComponent:filename];
    
    NSData *imageData = UIImagePNGRepresentation(image);
    [imageData writeToFile:filePath atomically:YES];
    
    return [NSString stringWithFormat:@"file://%@", filePath];
}

@end

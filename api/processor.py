import cv2
import numpy as np
import base64

def process_image(image_bytes, k=10):
    # 1. Decode Image
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 2. Resize for speed (Max 512px)
    height, width = img.shape[:2]
    max_dim = 512
    if max(height, width) > max_dim:
        scale = max_dim / max(height, width)
        new_width = int(width * scale)
        new_height = int(height * scale)
        img = cv2.resize(img, (new_width, new_height), interpolation=cv2.INTER_AREA)

    # 3. Blur to remove noise/details
    img_blur = cv2.bilateralFilter(img, 9, 75, 75)

    # 4. K-Means Clustering for Color Reduction
    z = img_blur.reshape((-1, 3))
    z = np.float32(z)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    ret, label, center = cv2.kmeans(z, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    
    center = np.uint8(center)
    res = center[label.flatten()]
    img_quantized = res.reshape((img.shape))

    # 5. Extract Regions
    regions = []
    palette = []
    
    # Convert palette to Hex
    for val in center:
        # OpenCV is BGR, need RGB for Hex
        hex_color = "#{:02x}{:02x}{:02x}".format(val[2], val[1], val[0]) 
        palette.append(hex_color)

    # Find contours for each color
    for i in range(k):
        # Create a mask for this color index
        mask = (label.reshape(img.shape[0], img.shape[1]) == i).astype(np.uint8) * 255
        
        # Find contours
        contours, hierarchy = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area < 50: # Filter tiny specks
                continue
                
            # Simplify contour
            epsilon = 0.002 * cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, epsilon, True)
            
            # Create SVG Path Data
            path_data = "M"
            for point in approx:
                x, y = point[0]
                path_data += f"{x} {y} L"
            path_data = path_data[:-1] + "Z" # Close path

            # Calculate Centroid for Label
            M = cv2.moments(cnt)
            if M["m00"] != 0:
                cX = int(M["m10"] / M["m00"])
                cY = int(M["m01"] / M["m00"])
            else:
                cX, cY = 0, 0

            regions.append({
                "colorIndex": i,
                "pathData": path_data,
                "labelPoint": {"x": cX, "y": cY},
                "area": area # Useful for sorting/rendering order
            })

    # Sort regions by area (largest first usually renders better, or maybe smallest on top?)
    # SVG rendering order: latter elements obtain higher z-index. 
    # So we want larger shapes first, smaller shapes last (on top).
    regions.sort(key=lambda x: x["area"], reverse=True)

    return {
        "palette": palette,
        "regions": regions,
        "width": img.shape[1],
        "height": img.shape[0]
    }

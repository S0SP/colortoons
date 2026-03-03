from flask import Flask, jsonify, request
import os
import vertexai
from vertexai.preview.vision_models import ImageGenerationModel

app = Flask(__name__)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "ArtFox AI Backend Running"})

@app.route('/api/generate', methods=['POST'])
def generate():
    try:
        data = request.json
        prompt = data.get('prompt', 'A cute robot coloring book page')
        style = data.get('style', 'cartoon') # unused for now, could tweak prompt
        difficulty = int(data.get('difficulty', 10)) # k-means clusters
        
        # Enforce limits
        difficulty = max(5, min(difficulty, 30))

        # 1. Generate Image with Vertex AI
        # Ensure GOOGLE_APPLICATION_CREDENTIALS or similar are set in Env
        project_id = os.environ.get("PROJECT_ID")
        location = os.environ.get("LOCATION", "us-central1")
        
        if not project_id:
             # Fallback for local testing without creds - return mock/error
             return jsonify({"error": "PROJECT_ID env var not set"}), 500

        vertexai.init(project=project_id, location=location)
        model = ImageGenerationModel.from_pretrained("imagegeneration@005")
        
        # Enhanced prompt for coloring book style
        full_prompt = f"simple black and white line art of {prompt}, white background, {style} style, thick outlines, children's coloring book, high contrast, no shading"

        images = model.generate_images(
            prompt=full_prompt,
            number_of_images=1,
            language="en",
            aspect_ratio="1:1",
            safety_filter_level="block_some",
            person_generation="allow_adult"
        )

        if not images:
            return jsonify({"error": "Image generation failed"}), 500

        # 2. Process Image
        # images[0]._image_bytes contains the raw bytes
        generated_image_bytes = images[0]._image_bytes
        
        # Use our processor
        from .processor import process_image
        result = process_image(generated_image_bytes, k=difficulty)
        
        # Add original image as base64 for reference (optional, might be heavy)
        # result['original_base64'] = base64.b64encode(generated_image_bytes).decode('utf-8')

        return jsonify(result)

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": str(e)}), 500

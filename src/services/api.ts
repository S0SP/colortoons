import axios from 'axios';

// For Android Emulator, localhost is 10.0.2.2
// For actual device, use your machine's IP, or the Vercel URL
const API_URL = 'https://colorartbackend.onrender.com/api';
// For real device on same Wi-Fi, use: 'http://192.168.1.9:5000/api'
export const api = axios.create({
    baseURL: API_URL,
    timeout: 120000, // 120s timeout for Cold Starts + Processing
});

export const generatePainting = async (prompt: string, style: string, difficulty: number) => {
    try {
        const response = await api.post('/generate', {
            prompt,
            style,
            difficulty,
        });
        return response.data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
};

export const processImage = async (fileUri: string, fileName?: string, fileType?: string) => {
    try {
        const formData = new FormData();
        formData.append('image', {
            uri: fileUri,
            type: fileType || 'image/jpeg',
            name: fileName || 'upload.jpg',
        } as any);

        const response = await api.post('/v1/process', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000, // 120s for Render Cold Start + OpenCV
        });
        return response.data;
    } catch (error) {
        console.error('Image Process API Error:', error);
        throw error;
    }
};

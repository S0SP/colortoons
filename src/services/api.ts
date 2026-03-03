import axios from 'axios';

// For Android Emulator, localhost is 10.0.2.2
// For actual device, use your machine's IP, or the Vercel URL
const API_URL = 'http://10.0.2.2:5000/api';

export const api = axios.create({
    baseURL: API_URL,
    timeout: 60000, // 60s timeout for GenAI
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

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://liokahxwujiwjywvloha.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpb2thaHh3dWppd2p5d3Zsb2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzODk5OTEsImV4cCI6MjA5Nzk2NTk5MX0.1_afkhRvGvqKbtkeURDJSEUdvJSZeTGOy-ZAOcSWsaM';

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

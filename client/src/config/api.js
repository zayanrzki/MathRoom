// API Configuration
// Untuk development di browser: gunakan hostname dinamis
// Untuk mobile app (APK): ganti dengan IP server yang sebenarnya

// Deteksi apakah running di Capacitor (mobile app) atau browser
const isCapacitor = window.Capacitor !== undefined;

// Pilih URL berdasarkan environment
// Gunakan link Railway yang sudah online
export const API_URL = 'https://mathroom-production.up.railway.app';

// Socket URL (untuk WebSocket connection)
export const SOCKET_URL = 'https://mathroom-production.up.railway.app';

export default API_URL;

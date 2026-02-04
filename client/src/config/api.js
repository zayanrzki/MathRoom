// API Configuration
// Untuk development di browser: gunakan hostname dinamis
// Untuk mobile app (APK): ganti dengan IP server yang sebenarnya

// Deteksi apakah running di Capacitor (mobile app) atau browser
const isCapacitor = window.Capacitor !== undefined;

// IP Server Anda - GANTI INI dengan IP komputer Anda
// Jalankan 'ipconfig' di terminal untuk melihat IP Anda
const SERVER_IP = '10.182.53.45'; // Ganti dengan IP komputer Anda

// Pilih URL berdasarkan environment
export const API_URL = isCapacitor
    ? `http://${SERVER_IP}:3001`  // Mobile app: gunakan IP tetap
    : `http://${window.location.hostname}:3001`;  // Browser: gunakan hostname dinamis

// Socket URL (untuk WebSocket connection)
export const SOCKET_URL = isCapacitor
    ? `http://${SERVER_IP}:3001`
    : `http://${window.location.hostname}:3001`;

export default API_URL;

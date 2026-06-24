import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

// Fallback configuration for Emulator development.
// Firebase Emulator does not validate API key/domain format, so dummy values are fully functional.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "demo-api-key-activity-ledger",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "demo-auth-domain-activity-ledger",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "activity-ledger-app",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "demo-bucket-activity-ledger",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1234567890:web:abcdef12345"
};

// Initialize Firebase client
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Check if emulator usage is enabled (defaults to true in development)
const useEmulator = import.meta.env.VITE_USE_EMULATOR === 'true' || true;

if (useEmulator) {
  console.log('[Firebase Client] Connecting to Local Emulators');
  
  // Connect to Auth Emulator
  connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  
  // Connect to Firestore Emulator
  connectFirestoreEmulator(db, 'localhost', 8080);
}
export default app;

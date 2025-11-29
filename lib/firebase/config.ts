import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Get Firebase configuration from environment variables (internal)
const loadFirebaseConfig = (): FirebaseConfig => {
  const config: FirebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
  };

  // Add measurementId if provided (optional for Analytics)
  if (process.env.FIREBASE_MEASUREMENT_ID) {
    config.measurementId = process.env.FIREBASE_MEASUREMENT_ID;
  }

  // Validate required configuration
  const requiredFields: (keyof FirebaseConfig)[] = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
  ];

  const missingFields = requiredFields.filter(
    (field) => !config[field] || config[field]?.trim() === ''
  );

  if (missingFields.length > 0) {
    throw new Error(
      `Missing Firebase configuration: ${missingFields.join(', ')}`
    );
  }

  return config;
};

// Initialize Firebase App
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

export const initializeFirebase = (): {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  storage: FirebaseStorage;
} => {
  // Return existing instances if already initialized
  if (app && auth && db && storage) {
    return { app, auth, db, storage };
  }

  // Check if Firebase is already initialized
  const existingApps = getApps();
  if (existingApps.length > 0) {
    app = existingApps[0];
  } else {
    // Initialize Firebase with configuration from environment variables
    const firebaseConfig = loadFirebaseConfig();
    app = initializeApp(firebaseConfig);
  }

  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  return { app, auth, db, storage };
};

// Export initialized services (lazy initialization)
export const getFirebaseApp = (): FirebaseApp => {
  if (!app) {
    const { app: initializedApp } = initializeFirebase();
    return initializedApp;
  }
  return app;
};

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    const { auth: initializedAuth } = initializeFirebase();
    return initializedAuth;
  }
  return auth;
};

export const getFirebaseDb = (): Firestore => {
  if (!db) {
    const { db: initializedDb } = initializeFirebase();
    return initializedDb;
  }
  return db;
};

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storage) {
    const { storage: initializedStorage } = initializeFirebase();
    return initializedStorage;
  }
  return storage;
};

// Export a function to get the config (lazy evaluation)
export const getFirebaseConfig = (): FirebaseConfig => {
  return loadFirebaseConfig();
};


# Firebase Setup Guide

This project uses Firebase with configuration loaded from environment variables.

## Environment Variables Setup

Create a `.env.local` file in the root of your project with the following variables:

```env
FIREBASE_API_KEY=your-api-key-here
FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
FIREBASE_APP_ID=your-app-id
FIREBASE_MEASUREMENT_ID=your-measurement-id
```

## Getting Your Firebase Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create a new one)
3. Click on the gear icon ⚙️ next to "Project Overview"
4. Select "Project settings"
5. Scroll down to "Your apps" section
6. If you haven't created a web app yet, click "Add app" and select the web icon (</>)
7. Copy the configuration values from the Firebase SDK setup

## Usage

Import and use Firebase services in your components:

```typescript
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage } from '@/lib/firebase';

// In your component or API route
const auth = getFirebaseAuth();
const db = getFirebaseDb();
const storage = getFirebaseStorage();
```

Or initialize everything at once:

```typescript
import { initializeFirebase } from '@/lib/firebase';

const { app, auth, db, storage } = initializeFirebase();
```

## Notes

- All environment variables are prefixed with `NEXT_PUBLIC_` to make them available on the client side
- The configuration is validated on initialization - missing required fields will throw an error
- Firebase services are initialized lazily and cached for performance
- The `measurementId` is optional (only needed if you're using Google Analytics)


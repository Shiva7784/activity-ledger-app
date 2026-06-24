import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import admin from 'firebase-admin';

// Load shared .env from root first, then look locally
dotenv.config({ path: '../.env' });
dotenv.config();

const port = process.env.PORT || 3001;
const projectId = process.env.FIREBASE_PROJECT_ID || 'activity-ledger-app';

// Ensure emulator environment variables are set for firebase-admin
// when running against local emulators.
if (process.env.FIRESTORE_EMULATOR_HOST) {
  console.log(`[Firebase Admin] Connecting to Firestore Emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`);
} else {
  // If not set but VITE_USE_EMULATOR is true in development, set a default
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  console.log(`[Firebase Admin] Defaulting FIRESTORE_EMULATOR_HOST to localhost:8080`);
}

if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.log(`[Firebase Admin] Connecting to Auth Emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`);
} else {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  console.log(`[Firebase Admin] Defaulting FIREBASE_AUTH_EMULATOR_HOST to localhost:9099`);
}

// Initialize Firebase Admin SDK
admin.initializeApp({
  projectId: projectId,
});

const db = admin.firestore();
const auth = admin.auth();

const app = express();

// Configure CORS to permit frontend origins
app.use(cors({
  origin: '*', // Accept requests from any client origin in local development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Express custom typing for Request with authenticated user context
interface AuthenticatedRequest extends express.Request {
  user?: admin.auth.DecodedIdToken;
}

// Middleware to verify Firebase ID Token
const verifyToken = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected Bearer token.'
    });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await auth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error: any) {
    console.error('Error verifying Firebase ID token:', error.message);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired authentication token',
      details: error.message
    });
  }
};

// API Endpoint to write user events
app.post('/api/events', (async (
  req: AuthenticatedRequest,
  res: express.Response
) => {
  try {
    const { eventType, metadata } = req.body;

    if (!eventType || typeof eventType !== 'string') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'eventType is required and must be a string'
      });
    }

    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'User authentication details missing'
      });
    }

    // Prepare Firestore event document
    const eventDoc = {
      userId,
      eventType,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: metadata || {},
    };

    // Store in Firestore "events" collection
    const docRef = await db.collection('events').add(eventDoc);
    
    console.log(`[Audit Log] Saved event '${eventType}' for User '${userId}' as Document ID '${docRef.id}'`);

    return res.status(201).json({
      success: true,
      id: docRef.id,
      userId,
      eventType,
      timestamp: new Date().toISOString(),
      metadata: metadata || {}
    });
  } catch (error: any) {
    console.error('Error writing activity event:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to write event to storage database',
      details: error.message
    });
  }
}) as express.RequestHandler);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', time: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`[Server] User Activity Ledger Server running on http://localhost:${port}`);
});

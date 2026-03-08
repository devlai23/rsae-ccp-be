import admin from '../config/firebase.js';

const authMiddleware = async (req, res, next) => {
  if (process.env.FIREBASE_BYPASS_AUTH === 'true') {
    req.user = {
      uid: 'dev-admin-uid',
      email: 'admin@local.dev',
      role: 'admin',
    };
    return next();
  }

  try {
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : null;

    if (!token) {
      return res.status(401).json({ error: 'No Firebase ID token provided' });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Firebase Auth middleware error:', error);
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Firebase ID token expired' });
    }
    if (error.code === 'auth/invalid-id-token') {
      return res.status(401).json({ error: 'Invalid Firebase ID token' });
    }
    res
      .status(500)
      .json({ error: 'Internal server error during authentication' });
  }
};

export default authMiddleware;

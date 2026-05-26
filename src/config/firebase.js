import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

try {
  const rawServiceAccount = (
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  ).trim();

  const normalizedServiceAccount =
    (rawServiceAccount.startsWith("'") && rawServiceAccount.endsWith("'")) ||
    (rawServiceAccount.startsWith('"') && rawServiceAccount.endsWith('"'))
      ? rawServiceAccount.slice(1, -1)
      : rawServiceAccount;

  const serviceAccount = JSON.parse(normalizedServiceAccount);

  if (!serviceAccount.project_id) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not properly configured'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error.message);
  throw error;
}

export default admin;

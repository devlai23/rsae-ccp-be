import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

const useDevAuthBypass = process.env.FIREBASE_BYPASS_AUTH === 'true';
let adminClient = admin;

const buildDevAdminMock = () => ({
  auth() {
    return {
      async verifyIdToken(token) {
        if (!token) {
          const error = new Error('Missing token in FIREBASE_BYPASS_AUTH mode');
          error.code = 'auth/invalid-id-token';
          throw error;
        }

        return {
          uid: 'dev-admin-uid',
          email: 'admin@local.dev',
          role: 'admin',
        };
      },
      async createUser({ email }) {
        return {
          uid: `dev-${Date.now()}`,
          email,
        };
      },
    };
  },
});

try {
  const serviceAccount = JSON.parse(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}'
  );

  if (!serviceAccount.project_id) {
    if (useDevAuthBypass) {
      console.warn(
        'FIREBASE_BYPASS_AUTH=true: skipping Firebase Admin SDK initialization'
      );
      adminClient = buildDevAdminMock();
    } else {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not properly configured'
      );
    }
  } else {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    console.log('Firebase Admin SDK initialized successfully');
  }
} catch (error) {
  if (useDevAuthBypass) {
    console.warn(
      `FIREBASE_BYPASS_AUTH=true: using fallback admin mock (${error.message})`
    );
    adminClient = buildDevAdminMock();
  } else {
    console.error('Error initializing Firebase Admin SDK:', error.message);
    throw error;
  }
}

export default adminClient;

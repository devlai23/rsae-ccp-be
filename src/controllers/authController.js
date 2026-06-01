import admin from '../config/firebase.js';
import userRepository from '../repositories/userRepository.js';
import auditLogService from '../services/auditLogService.js';

const authController = {
  async signup(req, res) {
    return res.status(403).json({
      error:
        'Self-service signup is disabled. An administrator must provision your account.',
    });
  },

  async login(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({
          error: 'Firebase ID token is required',
        });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const user = await userRepository.findByUid(decodedToken.uid);

      if (!user) {
        return res.status(403).json({
          error: 'This account is not authorized to access the application.',
        });
      }

      res.cookie('session', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600 * 1000,
        path: '/',
      });

      res.status(200).json({
        message: 'Login successful',
        uid: decodedToken.uid,
        user,
      });

      await auditLogService.write(
        {
          user: {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role,
          },
        },
        {
          actionType: 'auth.login',
          entityType: 'auth',
          entityId: decodedToken.uid,
          metadata: { provider: 'firebase' },
        }
      );
    } catch (error) {
      console.error('Login error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  },

  async getMe(req, res) {
    try {
      const token =
        req.cookies.session || req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const decodedToken = await admin.auth().verifyIdToken(token);

      const user = await userRepository.findByUid(decodedToken.uid);

      if (!user) {
        return res.status(403).json({
          error: 'This account is not authorized to access the application.',
        });
      }

      return res.json(user);
    } catch (error) {
      console.error('ME endpoint error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  },

  async logout(req, res) {
    try {
      const token =
        req.cookies.session || req.headers.authorization?.split(' ')[1];

      if (token) {
        try {
          const decodedToken = await admin.auth().verifyIdToken(token);
          await auditLogService.write(
            {
              user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                role: decodedToken.role,
              },
            },
            {
              actionType: 'auth.logout',
              entityType: 'auth',
              entityId: decodedToken.uid,
              metadata: { provider: 'firebase' },
            }
          );
        } catch (verifyError) {
          console.warn(
            'Logout token verify failed:',
            verifyError?.message || verifyError
          );
        }
      }

      res.clearCookie('session', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  },

  async getAllUsers(_req, res) {
    try {
      const users = await userRepository.getAll();

      res.status(200).json(users);
    } catch (error) {
      console.error('Get all users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Called after Google OAuth (popup or redirect) to sync the Firebase user into the database.
  async handleToken(req, res) {
    try {
      const { idToken } = req.body;

      if (!idToken) {
        return res.status(400).json({ error: 'No ID token provided' });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const user = await userRepository.findByUid(decodedToken.uid);

      if (!user) {
        return res.status(403).json({
          error: 'This Google account is not authorized to access the application.',
        });
      }

      res.cookie('session', idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600 * 1000,
        path: '/',
      });

      res.json({ success: true, user });

      await auditLogService.write(
        {
          user: {
            uid: decodedToken.uid,
            email: decodedToken.email,
            role: decodedToken.role,
          },
        },
        {
          actionType: 'auth.login',
          entityType: 'auth',
          entityId: decodedToken.uid,
          metadata: { provider: 'google' },
        }
      );
    } catch (error) {
      console.error('Token handling error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
};

export default authController;

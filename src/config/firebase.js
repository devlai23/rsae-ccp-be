import fs from 'fs';
import path from 'path';

import dotenv from 'dotenv';
import admin from 'firebase-admin';

dotenv.config();

/**
 * Firebase downloads service account JSON with a multi-line private_key.
 * Pasting that into .env as one "JSON string" often breaks JSON.parse because
 * real newlines inside the private_key value are invalid in JSON.
 */
function parseServiceAccountJson(raw) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const pkLabel = '"private_key"';
    const i = trimmed.indexOf(pkLabel);
    if (i === -1) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON (missing private_key)'
      );
    }

    const colon = trimmed.indexOf(':', i);
    const openQuote = trimmed.indexOf('"', colon + 1);
    const valueStart = openQuote + 1;
    const endToken = '-----END PRIVATE KEY-----';
    const endTokIdx = trimmed.indexOf(endToken, valueStart);
    if (endTokIdx === -1) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON (could not find END PRIVATE KEY)'
      );
    }
    const closeQuote = trimmed.indexOf('"', endTokIdx + endToken.length);
    if (closeQuote === -1) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_KEY is not valid JSON (unclosed private_key)'
      );
    }

    const keyInner = trimmed.slice(valueStart, closeQuote);
    const escapedInner = keyInner
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n/g, '\\n');

    const rebuilt = `${trimmed.slice(0, valueStart)}${escapedInner}${trimmed.slice(closeQuote)}`;
    return JSON.parse(rebuilt);
  }
}

function loadServiceAccount() {
  const filePath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (filePath) {
    const absolute = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    if (!fs.existsSync(absolute)) {
      throw new Error(
        `FIREBASE_SERVICE_ACCOUNT_PATH file not found: ${absolute}`
      );
    }
    const fileRaw = fs.readFileSync(absolute, 'utf8');
    return parseServiceAccountJson(fileRaw);
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw?.trim()) {
    throw new Error(
      'Set FIREBASE_SERVICE_ACCOUNT_PATH (JSON file) or FIREBASE_SERVICE_ACCOUNT_KEY in .env'
    );
  }

  return parseServiceAccountJson(raw);
}

try {
  const serviceAccount = loadServiceAccount();

  if (!serviceAccount.project_id) {
    throw new Error(
      'Firebase service account JSON is missing project_id'
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

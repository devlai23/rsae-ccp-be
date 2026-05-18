import crypto from 'crypto';

export const VOTER_COOKIE_NAME = 'ccp_vid';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readVoterId(req) {
  const raw = req.cookies?.[VOTER_COOKIE_NAME];
  if (typeof raw !== 'string' || !UUID_RE.test(raw.trim())) {
    return null;
  }
  return raw.trim();
}

export function assignVoterCookie(res, voterId) {
  const maxAgeSeconds = 365 * 24 * 60 * 60;
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(VOTER_COOKIE_NAME, voterId, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: maxAgeSeconds * 1000,
    path: '/',
  });
}

export function getOrCreateVoterId(req, res) {
  let id = readVoterId(req);
  if (!id) {
    id = crypto.randomUUID();
  }
  assignVoterCookie(res, id);
  return id;
}

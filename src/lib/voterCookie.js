import crypto from 'crypto';

export const VOTER_COOKIE_NAME = 'ccp_vid';
export const VOTER_HEADER_NAME = 'x-voter-id';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function readVoterId(req) {
  const queryValue = req.query?.voterId;
  const queryCandidate = Array.isArray(queryValue) ? queryValue[0] : queryValue;
  if (
    typeof queryCandidate === 'string' &&
    UUID_RE.test(queryCandidate.trim())
  ) {
    return queryCandidate.trim();
  }

  const bodyValue = req.body?.voterId;
  if (typeof bodyValue === 'string' && UUID_RE.test(bodyValue.trim())) {
    return bodyValue.trim();
  }

  const headerValue = req.headers?.[VOTER_HEADER_NAME];
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (typeof candidate === 'string' && UUID_RE.test(candidate.trim())) {
    return candidate.trim();
  }

  const raw = req.cookies?.[VOTER_COOKIE_NAME];
  if (typeof raw === 'string' && UUID_RE.test(raw.trim())) {
    return raw.trim();
  }

  return null;
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

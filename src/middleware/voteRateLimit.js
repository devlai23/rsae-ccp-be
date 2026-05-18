const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_WINDOW = 120;

const buckets = new Map();

function pruneBucket(ip, now) {
  const b = buckets.get(ip);
  if (!b) {
    return;
  }
  if (now - b.start > WINDOW_MS) {
    buckets.delete(ip);
  }
}

export default function voteRateLimit(req, res, next) {
  const ip =
    req.ip ||
    req.socket?.remoteAddress ||
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    'unknown';
  const now = Date.now();

  pruneBucket(ip, now);

  let bucket = buckets.get(ip);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    bucket = { start: now, count: 0 };
    buckets.set(ip, bucket);
  }

  bucket.count += 1;
  if (bucket.count > MAX_PER_WINDOW) {
    return res.status(429).json({
      error: 'Too many votes from this network. Please try again later.',
    });
  }

  next();
}

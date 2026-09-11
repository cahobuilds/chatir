import crypto from 'crypto';

// Retell signs webhooks with HMAC-SHA256 using the API key as secret. The signature is sent
// in the `X-Retell-Signature` header as `v={unix_ms_timestamp},d={hex_digest}`, where the
// digest is computed over the RAW request body concatenated with the timestamp. A ~5 minute
// window rejects replay attacks. (The Node SDK ships no verify helper, so this is manual.)
const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function verifyRetellSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): boolean {
  if (!signatureHeader || !secret) return false;

  const match = /^v=(\d+),d=([0-9a-fA-F]+)$/.exec(signatureHeader);
  if (!match) return false;

  const [, timestampStr, digest] = match;
  const timestamp = Number(timestampStr);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Date.now() - timestamp) > FIVE_MINUTES_MS) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody + timestamp)
    .digest('hex');

  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(digest);
  if (expectedBuf.length !== providedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, providedBuf);
}

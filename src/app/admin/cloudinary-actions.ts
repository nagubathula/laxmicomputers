'use server';

import crypto from 'crypto';

export async function getCloudinaryUploadParams(): Promise<{
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
}> {
  const url = process.env.CLOUDINARY_URL;
  if (!url) throw new Error('CLOUDINARY_URL is not set in .env.local');

  // Parse cloudinary://api_key:api_secret@cloud_name
  const m = url.match(/^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/);
  if (!m) throw new Error('Invalid CLOUDINARY_URL format');

  const [, apiKey, apiSecret, cloudName] = m;
  const timestamp = Math.round(Date.now() / 1000);

  // Cloudinary signed-upload signature: SHA-1 of "timestamp=<ts><api_secret>"
  const signature = crypto
    .createHash('sha1')
    .update(`timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  return { cloudName, apiKey, timestamp, signature };
}

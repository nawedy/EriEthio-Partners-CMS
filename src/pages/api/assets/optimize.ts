import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import sharp from 'sharp';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { key, width, height, quality = 80 } = req.body;

  if (!key) {
    return res.status(400).json({ error: 'Image key is required' });
  }

  try {
    // Get the original image from S3
    const getObjectResponse = await s3Client.send(
      new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || '',
        Key: key,
      })
    );

    if (!getObjectResponse.Body) {
      throw new Error('Failed to get image from S3');
    }

    // Convert stream to buffer
    const imageBuffer = await streamToBuffer(getObjectResponse.Body as Readable);

    // Process the image with Sharp
    let sharpImage = sharp(imageBuffer);

    // Resize if dimensions are provided
    if (width || height) {
      sharpImage = sharpImage.resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Optimize based on format
    const format = key.split('.').pop()?.toLowerCase();
    let optimizedBuffer: Buffer;

    switch (format) {
      case 'jpg':
      case 'jpeg':
        optimizedBuffer = await sharpImage
          .jpeg({ quality, mozjpeg: true })
          .toBuffer();
        break;
      case 'png':
        optimizedBuffer = await sharpImage
          .png({ quality, compressionLevel: 9 })
          .toBuffer();
        break;
      case 'webp':
        optimizedBuffer = await sharpImage
          .webp({ quality })
          .toBuffer();
        break;
      default:
        optimizedBuffer = await sharpImage.toBuffer();
    }

    // Generate optimized image key
    const optimizedKey = key.replace(
      /(\.[^.]+)$/,
      `_${width}x${height}q${quality}$1`
    );

    // Upload optimized image to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || '',
        Key: optimizedKey,
        Body: optimizedBuffer,
        ContentType: `image/${format}`,
      })
    );

    // Return the URL of the optimized image
    const optimizedUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/${optimizedKey}`;
    return res.status(200).json({ url: optimizedUrl });
  } catch (error) {
    console.error('Image optimization error:', error);
    return res.status(500).json({ error: 'Failed to optimize image' });
  }
}

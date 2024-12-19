import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from 'next-auth/react';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import env from '@/utils/env';

const prisma = new PrismaClient();

// Configure AWS S3
const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadToS3 = async (file: formidable.File, key: string) => {
  const fileStream = fs.createReadStream(file.filepath);
  
  const uploadParams = {
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: fileStream,
    ContentType: file.mimetype || 'application/octet-stream',
  };

  try {
    await s3Client.send(new PutObjectCommand(uploadParams));
    return `https://${env.AWS_S3_BUCKET}.s3.amazonaws.com/${key}`;
  } catch (error) {
    console.error('S3 upload error:', error);
    throw error;
  }
};

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

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    const tenantId = fields.tenantId?.[0];

    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID is required' });
    }

    const uploadedAssets = [];

    for (const fileArray of Object.values(files)) {
      for (const file of fileArray) {
        const key = `${tenantId}/${Date.now()}-${file.originalFilename}`;
        const url = await uploadToS3(file, key);

        const asset = await prisma.asset.create({
          data: {
            name: file.originalFilename || 'Untitled',
            type: file.mimetype || 'application/octet-stream',
            url,
            size: file.size,
            tenantId,
          },
        });

        uploadedAssets.push(asset);
      }
    }

    return res.status(200).json(uploadedAssets);
  } catch (error) {
    console.error('Upload error:', error);
    return res.status(500).json({ error: 'Failed to upload files' });
  }
}

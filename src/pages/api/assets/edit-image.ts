import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from 'next-auth/react';
import OpenAI from 'openai';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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

  const { image, prompt, mask } = req.body;

  if (!image || !prompt) {
    return res.status(400).json({ error: 'Image and prompt are required' });
  }

  try {
    // Upload original image to Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(image, {
      folder: 'temp',
    });

    // Generate edited image using DALL-E
    const response = await openai.images.edit({
      image: await fetch(uploadResponse.secure_url).then(r => r.blob()),
      mask: mask ? await fetch(mask).then(r => r.blob()) : undefined,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const editedImageUrl = response.data[0].url;
    if (!editedImageUrl) {
      throw new Error('No image generated');
    }

    // Upload edited image to Cloudinary
    const finalUploadResponse = await cloudinary.uploader.upload(editedImageUrl, {
      folder: 'ai-edited',
    });

    // Clean up temp image
    await cloudinary.uploader.destroy(uploadResponse.public_id);

    // Save to database
    const asset = await prisma.asset.create({
      data: {
        name: `AI Edited Image - ${new Date().toISOString()}`,
        type: 'image/png',
        url: finalUploadResponse.secure_url,
        size: finalUploadResponse.bytes,
        tenantId: req.body.tenantId,
        metadata: {
          prompt,
          model: 'dall-e-3',
          originalImage: uploadResponse.secure_url,
        },
      },
    });

    return res.status(200).json(asset);
  } catch (error) {
    console.error('Image editing error:', error);
    return res.status(500).json({ error: 'Failed to edit image' });
  }
}

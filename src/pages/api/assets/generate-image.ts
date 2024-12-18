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

  const { prompt, size = '1024x1024', style = 'vivid' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Generate image using DALL-E
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt,
      n: 1,
      size: size as "1024x1024" | "1792x1024" | "1024x1792",
      style: style as "vivid" | "natural",
    });

    const imageUrl = response.data[0].url;
    if (!imageUrl) {
      throw new Error('No image generated');
    }

    // Upload to Cloudinary for permanent storage
    const uploadResponse = await cloudinary.uploader.upload(imageUrl, {
      folder: 'ai-generated',
    });

    // Save to database
    const asset = await prisma.asset.create({
      data: {
        name: `AI Generated Image - ${new Date().toISOString()}`,
        type: 'image/png',
        url: uploadResponse.secure_url,
        size: 0, // Size will be updated after download
        tenantId: req.body.tenantId,
        metadata: {
          prompt,
          model: 'dall-e-3',
          style,
        },
      },
    });

    return res.status(200).json(asset);
  } catch (error) {
    console.error('Image generation error:', error);
    return res.status(500).json({ error: 'Failed to generate image' });
  }
}

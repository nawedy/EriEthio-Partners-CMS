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

  const { prompt, duration = '10' } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    // Generate video using OpenAI's upcoming video generation model
    // Note: This is a placeholder for when the API becomes available
    const response = await openai.videos.generate({
      model: "dall-e-3-video",
      prompt,
      duration: parseInt(duration),
    });

    const videoUrl = response.data[0].url;
    if (!videoUrl) {
      throw new Error('No video generated');
    }

    // Upload to Cloudinary for permanent storage
    const uploadResponse = await cloudinary.uploader.upload(videoUrl, {
      folder: 'ai-generated-videos',
      resource_type: 'video',
    });

    // Save to database
    const asset = await prisma.asset.create({
      data: {
        name: `AI Generated Video - ${new Date().toISOString()}`,
        type: 'video/mp4',
        url: uploadResponse.secure_url,
        size: uploadResponse.bytes,
        tenantId: req.body.tenantId,
        metadata: {
          prompt,
          model: 'dall-e-3-video',
          duration,
        },
      },
    });

    return res.status(200).json(asset);
  } catch (error) {
    console.error('Video generation error:', error);
    return res.status(500).json({ error: 'Failed to generate video' });
  }
}

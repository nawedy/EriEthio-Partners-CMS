import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { getSession } from 'next-auth/react';

const prisma = new PrismaClient();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req });

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { tenantId } = req.query;

  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant ID is required' });
  }

  switch (req.method) {
    case 'GET':
      try {
        const pages = await prisma.page.findMany({
          where: {
            tenantId: tenantId as string,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        });
        return res.status(200).json(pages);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch pages' });
      }

    case 'POST':
      try {
        const { title, slug, content, meta } = req.body;

        if (!title || !slug || !content) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if slug is unique for this tenant
        const existingPage = await prisma.page.findUnique({
          where: {
            tenantId_slug: {
              tenantId: tenantId as string,
              slug,
            },
          },
        });

        if (existingPage) {
          return res.status(400).json({ error: 'Slug must be unique' });
        }

        const page = await prisma.page.create({
          data: {
            title,
            slug,
            content,
            meta: meta || {},
            tenant: {
              connect: {
                id: tenantId as string,
              },
            },
          },
        });

        return res.status(201).json(page);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to create page' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

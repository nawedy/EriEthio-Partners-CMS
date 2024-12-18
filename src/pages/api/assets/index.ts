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
        const assets = await prisma.asset.findMany({
          where: {
            tenantId: tenantId as string,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });
        return res.status(200).json(assets);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch assets' });
      }

    default:
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

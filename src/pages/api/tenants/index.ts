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

  switch (req.method) {
    case 'GET':
      try {
        const tenants = await prisma.tenant.findMany({
          include: {
            _count: {
              select: {
                users: true,
                pages: true,
              },
            },
          },
        });
        return res.status(200).json(tenants);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch tenants' });
      }

    case 'POST':
      try {
        const { name, domain } = req.body;

        if (!name || !domain) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const tenant = await prisma.tenant.create({
          data: {
            name,
            domain,
            settings: {
              theme: {
                primaryColor: '#3182CE',
                secondaryColor: '#63B3ED',
                logo: '',
              },
              features: {
                blog: true,
                ecommerce: false,
                customDomain: false,
              },
            },
          },
        });

        return res.status(201).json(tenant);
      } catch (error) {
        return res.status(500).json({ error: 'Failed to create tenant' });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Tenant } from '@prisma/client';

export const useTenants = () => {
  const { data: session } = useSession();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const response = await fetch('/api/tenants');
        if (!response.ok) {
          throw new Error('Failed to fetch tenants');
        }
        const data = await response.json();
        setTenants(data);
        
        // Set the first tenant as current if none is selected
        if (data.length > 0 && !currentTenant) {
          setCurrentTenant(data[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchTenants();
    }
  }, [session]);

  const createTenant = async (name: string, domain: string) => {
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, domain }),
      });

      if (!response.ok) {
        throw new Error('Failed to create tenant');
      }

      const newTenant = await response.json();
      setTenants((prev) => [...prev, newTenant]);
      return newTenant;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    }
  };

  return {
    tenants,
    currentTenant,
    setCurrentTenant,
    isLoading,
    error,
    createTenant,
  };
};

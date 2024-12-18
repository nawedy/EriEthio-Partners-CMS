import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Heading,
  useToast,
} from '@chakra-ui/react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useTenants } from '../../../hooks/useTenants';

export default function CreatePage() {
  const router = useRouter();
  const toast = useToast();
  const { currentTenant } = useTenants();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          slug,
          content: [],
          tenantId: currentTenant.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to create page');

      const page = await response.json();
      toast({
        title: 'Page created successfully',
        status: 'success',
        duration: 3000,
      });

      router.push(`/dashboard/pages/${page.id}`);
    } catch (error) {
      console.error('Error creating page:', error);
      toast({
        title: 'Error creating page',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    setSlug(generateSlug(newTitle));
  };

  return (
    <DashboardLayout>
      <Container maxW="xl" py={8}>
        <Stack spacing={8}>
          <Heading size="lg">Create New Page</Heading>

          <Box
            as="form"
            onSubmit={handleCreate}
            bg="white"
            p={8}
            rounded="lg"
            shadow="sm"
          >
            <Stack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Page Title</FormLabel>
                <Input
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Enter page title"
                />
              </FormControl>

              <FormControl isRequired>
                <FormLabel>Slug</FormLabel>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="page-url-slug"
                />
              </FormControl>

              <Stack direction="row" spacing={4} pt={4}>
                <Button
                  type="submit"
                  colorScheme="blue"
                  isLoading={isCreating}
                >
                  Create Page
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard/pages')}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </Box>
        </Stack>
      </Container>
    </DashboardLayout>
  );
}

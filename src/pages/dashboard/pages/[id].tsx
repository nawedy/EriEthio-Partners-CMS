import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import {
  Box,
  Container,
  Flex,
  Button,
  FormControl,
  FormLabel,
  Input,
  Stack,
  useToast,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Heading,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
} from '@chakra-ui/react';
import { FiSave, FiMoreVertical, FiEye, FiTrash2 } from 'react-icons/fi';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { VisualEditor } from '../../../components/VisualEditor';
import { useTenants } from '../../../hooks/useTenants';
import { useVisualEditor } from '../../../hooks/useVisualEditor';
import { Page, PageContent } from '../../../types';

export default function PageEditor() {
  const router = useRouter();
  const { id } = router.query;
  const toast = useToast();
  const { currentTenant } = useTenants();
  const [page, setPage] = useState<Page | null>(null);
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const {
    content,
    handleAddComponent,
    handleUpdateComponent,
    handleDeleteComponent,
    handleMoveComponent,
  } = useVisualEditor(page?.content as PageContent[] || []);

  useEffect(() => {
    const fetchPage = async () => {
      if (!id || !currentTenant) return;

      try {
        const response = await fetch(`/api/pages/${id}?tenantId=${currentTenant.id}`);
        if (!response.ok) throw new Error('Failed to fetch page');
        const data = await response.json();
        setPage(data);
        setTitle(data.title);
        setSlug(data.slug);
      } catch (error) {
        console.error('Error fetching page:', error);
        toast({
          title: 'Error fetching page',
          status: 'error',
          duration: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchPage();
  }, [id, currentTenant]);

  const handleSave = async () => {
    if (!currentTenant) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/pages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          slug,
          content,
          tenantId: currentTenant.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to save page');

      toast({
        title: 'Page saved successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving page:', error);
      toast({
        title: 'Error saving page',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!currentTenant) return;

    try {
      const response = await fetch(`/api/pages/${id}/publish`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to publish page');

      toast({
        title: 'Page published successfully',
        status: 'success',
        duration: 3000,
      });

      // Refresh page data
      const updatedPage = await response.json();
      setPage(updatedPage);
    } catch (error) {
      console.error('Error publishing page:', error);
      toast({
        title: 'Error publishing page',
        status: 'error',
        duration: 5000,
      });
    }
  };

  const handlePreview = () => {
    window.open(`/preview/${page?.id}`, '_blank');
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <DashboardLayout>
      <Container maxW="full" p={0}>
        <Flex
          position="sticky"
          top="0"
          zIndex="sticky"
          bg="white"
          borderBottomWidth="1px"
          py={4}
          px={8}
          justifyContent="space-between"
          alignItems="center"
        >
          <Stack spacing={4} direction="row" align="center">
            <Heading size="md">{title || 'Untitled Page'}</Heading>
          </Stack>

          <Stack spacing={4} direction="row">
            <Button
              leftIcon={<FiEye />}
              variant="ghost"
              onClick={handlePreview}
            >
              Preview
            </Button>
            <Button
              colorScheme="blue"
              isLoading={isSaving}
              onClick={handleSave}
              leftIcon={<FiSave />}
            >
              Save
            </Button>
            <Menu>
              <MenuButton
                as={IconButton}
                icon={<FiMoreVertical />}
                variant="ghost"
              />
              <MenuList>
                <MenuItem onClick={handlePublish}>
                  {page?.status === 'published' ? 'Unpublish' : 'Publish'}
                </MenuItem>
                <MenuItem icon={<FiTrash2 />} color="red.500">
                  Delete
                </MenuItem>
              </MenuList>
            </Menu>
          </Stack>
        </Flex>

        <Box p={8}>
          <Tabs>
            <TabList>
              <Tab>Content</Tab>
              <Tab>Settings</Tab>
            </TabList>

            <TabPanels>
              <TabPanel p={0} pt={4}>
                <VisualEditor
                  content={content}
                  onChange={(newContent) => {
                    // Handle content changes
                  }}
                />
              </TabPanel>
              <TabPanel>
                <Stack spacing={4} maxW="xl">
                  <FormControl>
                    <FormLabel>Page Title</FormLabel>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel>Slug</FormLabel>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                    />
                  </FormControl>
                </Stack>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </Container>
    </DashboardLayout>
  );
}

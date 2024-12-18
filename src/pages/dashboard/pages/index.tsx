import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Icon,
  Stack,
  Text,
  useColorModeValue,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
} from '@chakra-ui/react';
import { FiPlus, FiMoreVertical, FiEdit2, FiEye, FiTrash2 } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useTenants } from '../../../hooks/useTenants';
import { Page } from '@prisma/client';

export default function Pages() {
  const router = useRouter();
  const { currentTenant } = useTenants();
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPages = async () => {
      if (!currentTenant) return;
      
      try {
        const response = await fetch(`/api/pages?tenantId=${currentTenant.id}`);
        if (!response.ok) throw new Error('Failed to fetch pages');
        const data = await response.json();
        setPages(data);
      } catch (error) {
        console.error('Error fetching pages:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPages();
  }, [currentTenant]);

  const handleCreatePage = () => {
    router.push('/dashboard/pages/create');
  };

  const handleEditPage = (pageId: string) => {
    router.push(`/dashboard/pages/${pageId}`);
  };

  const handleViewPage = (slug: string) => {
    window.open(`/${slug}`, '_blank');
  };

  const handleDeletePage = async (pageId: string) => {
    if (!confirm('Are you sure you want to delete this page?')) return;

    try {
      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete page');

      setPages(pages.filter(page => page.id !== pageId));
    } catch (error) {
      console.error('Error deleting page:', error);
    }
  };

  return (
    <DashboardLayout>
      <Container maxW="7xl" py={5}>
        <Stack spacing={5}>
          <Flex justifyContent="space-between" alignItems="center">
            <Heading size="lg">Pages</Heading>
            <Button
              leftIcon={<Icon as={FiPlus} />}
              colorScheme="blue"
              onClick={handleCreatePage}
            >
              Create Page
            </Button>
          </Flex>

          <Box
            bg={useColorModeValue('white', 'gray.800')}
            shadow="sm"
            rounded="lg"
            overflow="hidden"
          >
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Title</Th>
                  <Th>Slug</Th>
                  <Th>Status</Th>
                  <Th>Last Updated</Th>
                  <Th></Th>
                </Tr>
              </Thead>
              <Tbody>
                {pages.map((page) => (
                  <Tr key={page.id}>
                    <Td>
                      <Text fontWeight="medium">{page.title}</Text>
                    </Td>
                    <Td>
                      <Text color="gray.600">/{page.slug}</Text>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={page.status === 'published' ? 'green' : 'yellow'}
                      >
                        {page.status}
                      </Badge>
                    </Td>
                    <Td>
                      <Text color="gray.600">
                        {new Date(page.updatedAt).toLocaleDateString()}
                      </Text>
                    </Td>
                    <Td>
                      <Menu>
                        <MenuButton
                          as={IconButton}
                          icon={<FiMoreVertical />}
                          variant="ghost"
                          size="sm"
                        />
                        <MenuList>
                          <MenuItem
                            icon={<FiEdit2 />}
                            onClick={() => handleEditPage(page.id)}
                          >
                            Edit
                          </MenuItem>
                          <MenuItem
                            icon={<FiEye />}
                            onClick={() => handleViewPage(page.slug)}
                          >
                            View
                          </MenuItem>
                          <MenuItem
                            icon={<FiTrash2 />}
                            color="red.500"
                            onClick={() => handleDeletePage(page.id)}
                          >
                            Delete
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Stack>
      </Container>
    </DashboardLayout>
  );
}

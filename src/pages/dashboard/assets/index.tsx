import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Image,
  Stack,
  useColorModeValue,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Input,
  FormControl,
  FormLabel,
  Progress,
} from '@chakra-ui/react';
import { FiUpload, FiMoreVertical, FiTrash2, FiCopy, FiFolder } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import DashboardLayout from '../../../components/layout/DashboardLayout';
import { useTenants } from '../../../hooks/useTenants';
import { Asset } from '@prisma/client';

export default function Assets() {
  const { currentTenant } = useTenants();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const bgColor = useColorModeValue('white', 'gray.800');

  const onDrop = async (acceptedFiles: File[]) => {
    if (!currentTenant) return;

    const formData = new FormData();
    acceptedFiles.forEach(file => {
      formData.append('files', file);
    });
    formData.append('tenantId', currentTenant.id);

    try {
      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const newAssets = await response.json();
      setAssets(prev => [...prev, ...newAssets]);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'video/*': ['.mp4', '.webm'],
    },
  });

  useEffect(() => {
    const fetchAssets = async () => {
      if (!currentTenant) return;

      try {
        const response = await fetch(`/api/assets?tenantId=${currentTenant.id}`);
        if (!response.ok) throw new Error('Failed to fetch assets');
        const data = await response.json();
        setAssets(data);
      } catch (error) {
        console.error('Error fetching assets:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAssets();
  }, [currentTenant]);

  const handleDelete = async (assetId: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete asset');

      setAssets(assets.filter(asset => asset.id !== assetId));
    } catch (error) {
      console.error('Error deleting asset:', error);
    }
  };

  const copyToClipboard = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <DashboardLayout>
      <Container maxW="7xl" py={5}>
        <Stack spacing={5}>
          <Flex justifyContent="space-between" alignItems="center">
            <Heading size="lg">Assets</Heading>
            <Button
              leftIcon={<FiUpload />}
              colorScheme="blue"
              onClick={onOpen}
            >
              Upload Files
            </Button>
          </Flex>

          <Grid
            templateColumns="repeat(auto-fill, minmax(200px, 1fr))"
            gap={6}
          >
            {assets.map((asset) => (
              <Box
                key={asset.id}
                bg={bgColor}
                rounded="lg"
                overflow="hidden"
                shadow="sm"
              >
                <Box position="relative" paddingTop="100%">
                  {asset.type.startsWith('image/') ? (
                    <Image
                      src={asset.url}
                      alt={asset.name}
                      position="absolute"
                      top="0"
                      left="0"
                      width="100%"
                      height="100%"
                      objectFit="cover"
                    />
                  ) : (
                    <Flex
                      position="absolute"
                      top="0"
                      left="0"
                      width="100%"
                      height="100%"
                      alignItems="center"
                      justifyContent="center"
                      bg="gray.100"
                    >
                      <Icon as={FiFolder} boxSize="32px" color="gray.400" />
                    </Flex>
                  )}
                </Box>

                <Box p={4}>
                  <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                    {asset.name}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatFileSize(asset.size)}
                  </Text>

                  <Flex justifyContent="flex-end" mt={2}>
                    <Menu>
                      <MenuButton
                        as={IconButton}
                        icon={<FiMoreVertical />}
                        variant="ghost"
                        size="sm"
                      />
                      <MenuList>
                        <MenuItem
                          icon={<FiCopy />}
                          onClick={() => copyToClipboard(asset.url)}
                        >
                          Copy URL
                        </MenuItem>
                        <MenuItem
                          icon={<FiTrash2 />}
                          color="red.500"
                          onClick={() => handleDelete(asset.id)}
                        >
                          Delete
                        </MenuItem>
                      </MenuList>
                    </Menu>
                  </Flex>
                </Box>
              </Box>
            ))}
          </Grid>
        </Stack>

        {/* Upload Modal */}
        <Modal isOpen={isOpen} onClose={onClose} size="xl">
          <ModalOverlay />
          <ModalContent>
            <ModalHeader>Upload Files</ModalHeader>
            <ModalCloseButton />
            <ModalBody pb={6}>
              <Box
                {...getRootProps()}
                p={10}
                border="2px"
                borderStyle="dashed"
                borderColor={isDragActive ? 'blue.500' : 'gray.200'}
                rounded="lg"
                textAlign="center"
                cursor="pointer"
                transition="all 0.2s"
                _hover={{
                  borderColor: 'blue.500',
                }}
              >
                <input {...getInputProps()} />
                <Stack spacing={2} alignItems="center">
                  <Icon as={FiUpload} boxSize={8} color="gray.400" />
                  {isDragActive ? (
                    <Text>Drop the files here...</Text>
                  ) : (
                    <>
                      <Text>Drag and drop files here, or click to select files</Text>
                      <Text fontSize="sm" color="gray.500">
                        Supports images, PDFs, and videos up to 10MB
                      </Text>
                    </>
                  )}
                </Stack>
              </Box>

              {uploadProgress > 0 && (
                <Box mt={4}>
                  <Progress value={uploadProgress} size="sm" colorScheme="blue" />
                </Box>
              )}
            </ModalBody>
          </ModalContent>
        </Modal>
      </Container>
    </DashboardLayout>
  );
}

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Grid,
  Box,
  Image,
  Text,
  Icon,
  Input,
  InputGroup,
  InputLeftElement,
  Stack,
  Button,
  useColorModeValue,
  Flex,
  Badge,
} from '@chakra-ui/react';
import { FiSearch, FiFolder, FiUpload } from 'react-icons/fi';
import { useDropzone } from 'react-dropzone';
import { useTenants } from '../../hooks/useTenants';
import { Asset } from '@prisma/client';

interface AssetPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  selectedAsset?: Asset;
  acceptedTypes?: string[];
}

export default function AssetPicker({
  isOpen,
  onClose,
  onSelect,
  selectedAsset,
  acceptedTypes = ['image/*'],
}: AssetPickerProps) {
  const { currentTenant } = useTenants();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const bgColor = useColorModeValue('white', 'gray.800');
  const selectedBg = useColorModeValue('blue.50', 'blue.900');

  const onDrop = async (acceptedFiles: File[]) => {
    if (!currentTenant) return;

    setIsUploading(true);
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
      setAssets(prev => [...newAssets, ...prev]);
      
      // Auto-select the first uploaded asset
      if (newAssets.length > 0) {
        onSelect(newAssets[0]);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
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
      }
    };

    if (isOpen) {
      fetchAssets();
    }
  }, [currentTenant, isOpen]);

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (acceptedTypes.includes(asset.type) || 
     acceptedTypes.includes('*') || 
     acceptedTypes.includes(asset.type.split('/')[0] + '/*'))
  );

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="6xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Select Asset</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Stack spacing={4}>
            <Flex gap={4}>
              <InputGroup flex={1}>
                <InputLeftElement pointerEvents="none">
                  <Icon as={FiSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </InputGroup>
              <Button
                leftIcon={<FiUpload />}
                colorScheme="blue"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Upload
              </Button>
            </Flex>

            <Box
              {...getRootProps()}
              p={6}
              border="2px"
              borderStyle="dashed"
              borderColor={isDragActive ? 'blue.500' : 'gray.200'}
              rounded="lg"
              bg={isDragActive ? 'blue.50' : 'transparent'}
              cursor="pointer"
            >
              <input {...getInputProps()} id="file-upload" />
              <Stack align="center" spacing={2}>
                <Icon
                  as={FiUpload}
                  boxSize={8}
                  color={isDragActive ? 'blue.500' : 'gray.400'}
                />
                <Text textAlign="center" color={isDragActive ? 'blue.500' : 'gray.500'}>
                  {isDragActive
                    ? 'Drop files here...'
                    : 'Drag and drop files here, or click to select'}
                </Text>
              </Stack>
            </Box>

            <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={4}>
              {filteredAssets.map((asset) => (
                <Box
                  key={asset.id}
                  bg={asset.id === selectedAsset?.id ? selectedBg : bgColor}
                  p={2}
                  rounded="md"
                  cursor="pointer"
                  onClick={() => onSelect(asset)}
                  borderWidth={1}
                  borderColor={asset.id === selectedAsset?.id ? 'blue.500' : 'gray.200'}
                  _hover={{
                    borderColor: 'blue.500',
                  }}
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
                        rounded="md"
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
                        rounded="md"
                      >
                        <Icon as={FiFolder} boxSize="32px" color="gray.400" />
                      </Flex>
                    )}
                  </Box>
                  <Box mt={2}>
                    <Text fontSize="sm" noOfLines={1}>
                      {asset.name}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {formatFileSize(asset.size)}
                    </Text>
                  </Box>
                </Box>
              ))}
            </Grid>
          </Stack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

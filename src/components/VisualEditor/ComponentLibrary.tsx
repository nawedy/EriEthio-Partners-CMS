import React from 'react';
import {
  VStack,
  Box,
  Text,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { 
  FaHeading, 
  FaImage, 
  FaUsers, 
  FaCogs, 
  FaEnvelope,
  FaNewspaper 
} from 'react-icons/fa';

const components = [
  {
    type: 'hero',
    icon: FaHeading,
    label: 'Hero Section',
    template: {
      type: 'hero',
      data: {
        title: 'Welcome',
        subtitle: 'Add your subtitle here',
        ctaText: 'Get Started',
        ctaLink: '#',
        backgroundImage: '',
      },
      style: {
        padding: '4rem',
        margin: '0',
        backgroundColor: '#ffffff',
      },
    },
  },
  {
    type: 'text',
    icon: FaNewspaper,
    label: 'Text Block',
    template: {
      type: 'text',
      data: {
        content: 'Add your content here',
      },
      style: {
        padding: '2rem',
        margin: '0',
        backgroundColor: '#ffffff',
      },
    },
  },
  {
    type: 'image',
    icon: FaImage,
    label: 'Image',
    template: {
      type: 'image',
      data: {
        src: '',
        alt: '',
        caption: '',
      },
      style: {
        padding: '1rem',
        margin: '0',
        backgroundColor: 'transparent',
      },
    },
  },
  {
    type: 'services',
    icon: FaCogs,
    label: 'Services Grid',
    template: {
      type: 'services',
      data: {
        title: 'Our Services',
        services: [],
      },
      style: {
        padding: '4rem',
        margin: '0',
        backgroundColor: '#f7fafc',
      },
    },
  },
  {
    type: 'team',
    icon: FaUsers,
    label: 'Team Section',
    template: {
      type: 'team',
      data: {
        title: 'Our Team',
        members: [],
      },
      style: {
        padding: '4rem',
        margin: '0',
        backgroundColor: '#ffffff',
      },
    },
  },
  {
    type: 'contact',
    icon: FaEnvelope,
    label: 'Contact Form',
    template: {
      type: 'contact',
      data: {
        title: 'Contact Us',
        email: '',
        phone: '',
        address: '',
      },
      style: {
        padding: '4rem',
        margin: '0',
        backgroundColor: '#f7fafc',
      },
    },
  },
];

const ComponentLibrary: React.FC = () => {
  const handleDragStart = (e: React.DragEvent, component: any) => {
    e.dataTransfer.setData('component', JSON.stringify({
      ...component.template,
      id: `${component.type}-${Date.now()}`,
    }));
  };

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Components
      </Text>
      {components.map((component) => (
        <Box
          key={component.type}
          p={4}
          bg={useColorModeValue('gray.50', 'gray.700')}
          borderRadius="md"
          cursor="grab"
          draggable
          onDragStart={(e) => handleDragStart(e, component)}
          _hover={{
            bg: useColorModeValue('gray.100', 'gray.600'),
          }}
        >
          <VStack spacing={2} align="center">
            <Icon as={component.icon} boxSize={6} />
            <Text fontSize="sm">{component.label}</Text>
          </VStack>
        </Box>
      ))}
    </VStack>
  );
};

export default ComponentLibrary;

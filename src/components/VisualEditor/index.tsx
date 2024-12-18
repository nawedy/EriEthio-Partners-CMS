import React, { useState } from 'react';
import {
  Box,
  Flex,
  IconButton,
  useColorModeValue,
  DragHandleIcon,
  Stack,
} from '@chakra-ui/react';
import { PageContent } from '../../types';
import ComponentLibrary from './ComponentLibrary';
import EditPanel from './EditPanel';

interface VisualEditorProps {
  content: PageContent[];
  onChange: (content: PageContent[]) => void;
}

export const VisualEditor: React.FC<VisualEditorProps> = ({ content, onChange }) => {
  const [selectedComponent, setSelectedComponent] = useState<PageContent | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    const componentData = JSON.parse(e.dataTransfer.getData('component'));
    const newContent = [...content];
    newContent.splice(index, 0, componentData);
    onChange(newContent);
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleComponentSelect = (component: PageContent) => {
    setSelectedComponent(component);
  };

  const handleComponentUpdate = (updatedComponent: PageContent) => {
    const newContent = content.map((c) =>
      c.id === updatedComponent.id ? updatedComponent : c
    );
    onChange(newContent);
  };

  return (
    <Flex h="calc(100vh - 64px)">
      {/* Component Library Sidebar */}
      <Box
        w="250px"
        bg={useColorModeValue('white', 'gray.800')}
        borderRight="1px"
        borderColor={useColorModeValue('gray.200', 'gray.700')}
        p={4}
      >
        <ComponentLibrary />
      </Box>

      {/* Main Editor Area */}
      <Box flex="1" p={4} bg={useColorModeValue('gray.50', 'gray.900')}>
        <Stack spacing={4}>
          {content.map((component, index) => (
            <Box
              key={component.id}
              position="relative"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
            >
              <Flex
                bg={useColorModeValue('white', 'gray.800')}
                p={4}
                borderRadius="md"
                boxShadow={selectedComponent?.id === component.id ? 'outline' : 'base'}
                onClick={() => handleComponentSelect(component)}
                cursor="pointer"
                position="relative"
              >
                <IconButton
                  aria-label="Drag handle"
                  icon={<DragHandleIcon />}
                  variant="ghost"
                  cursor="grab"
                  position="absolute"
                  left="-8"
                  top="50%"
                  transform="translateY(-50%)"
                />
                {/* Render component based on type */}
                {/* Add your component rendering logic here */}
              </Flex>
              {isDragging && (
                <Box
                  h="2px"
                  bg="blue.500"
                  position="absolute"
                  bottom="-1px"
                  left="0"
                  right="0"
                />
              )}
            </Box>
          ))}
        </Stack>
      </Box>

      {/* Edit Panel Sidebar */}
      <Box
        w="300px"
        bg={useColorModeValue('white', 'gray.800')}
        borderLeft="1px"
        borderColor={useColorModeValue('gray.200', 'gray.700')}
        p={4}
      >
        <EditPanel
          component={selectedComponent}
          onUpdate={handleComponentUpdate}
        />
      </Box>
    </Flex>
  );
};

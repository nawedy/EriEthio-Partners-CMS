import React from 'react';
import {
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Box,
  Text,
  ColorPicker,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
} from '@chakra-ui/react';
import { PageContent } from '../../types';

interface EditPanelProps {
  component: PageContent | null;
  onUpdate: (component: PageContent) => void;
}

const EditPanel: React.FC<EditPanelProps> = ({ component, onUpdate }) => {
  if (!component) {
    return (
      <Box p={4}>
        <Text>Select a component to edit</Text>
      </Box>
    );
  }

  const handleChange = (field: string, value: any) => {
    onUpdate({
      ...component,
      data: {
        ...component.data,
        [field]: value,
      },
    });
  };

  const handleStyleChange = (field: string, value: any) => {
    onUpdate({
      ...component,
      style: {
        ...component.style,
        [field]: value,
      },
    });
  };

  const renderFields = () => {
    switch (component.type) {
      case 'hero':
        return (
          <>
            <FormControl>
              <FormLabel>Title</FormLabel>
              <Input
                value={component.data.title}
                onChange={(e) => handleChange('title', e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Subtitle</FormLabel>
              <Input
                value={component.data.subtitle}
                onChange={(e) => handleChange('subtitle', e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>CTA Text</FormLabel>
              <Input
                value={component.data.ctaText}
                onChange={(e) => handleChange('ctaText', e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>CTA Link</FormLabel>
              <Input
                value={component.data.ctaLink}
                onChange={(e) => handleChange('ctaLink', e.target.value)}
              />
            </FormControl>
          </>
        );

      case 'text':
        return (
          <FormControl>
            <FormLabel>Content</FormLabel>
            <Textarea
              value={component.data.content}
              onChange={(e) => handleChange('content', e.target.value)}
              minH="200px"
            />
          </FormControl>
        );

      case 'image':
        return (
          <>
            <FormControl>
              <FormLabel>Image URL</FormLabel>
              <Input
                value={component.data.src}
                onChange={(e) => handleChange('src', e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Alt Text</FormLabel>
              <Input
                value={component.data.alt}
                onChange={(e) => handleChange('alt', e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Caption</FormLabel>
              <Input
                value={component.data.caption}
                onChange={(e) => handleChange('caption', e.target.value)}
              />
            </FormControl>
          </>
        );

      // Add more cases for other component types

      default:
        return null;
    }
  };

  return (
    <VStack spacing={4} align="stretch">
      <Text fontSize="lg" fontWeight="bold" mb={4}>
        Edit {component.type.charAt(0).toUpperCase() + component.type.slice(1)}
      </Text>

      {renderFields()}

      <Box mt={8}>
        <Text fontSize="md" fontWeight="bold" mb={4}>
          Style
        </Text>
        <FormControl>
          <FormLabel>Padding</FormLabel>
          <Input
            value={component.style.padding}
            onChange={(e) => handleStyleChange('padding', e.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Margin</FormLabel>
          <Input
            value={component.style.margin}
            onChange={(e) => handleStyleChange('margin', e.target.value)}
          />
        </FormControl>
        <FormControl>
          <FormLabel>Background Color</FormLabel>
          <Input
            type="color"
            value={component.style.backgroundColor}
            onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
          />
        </FormControl>
      </Box>
    </VStack>
  );
};

export default EditPanel;

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Stack,
  Text,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Input,
  Select,
  useToast,
  IconButton,
  Flex,
  Textarea,
} from '@chakra-ui/react';
import { fabric } from 'fabric';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import {
  FiRotateCw,
  FiRotateCcw,
  FiZoomIn,
  FiZoomOut,
  FiSave,
  FiMagic,
  FiImage,
  FiEdit2,
} from 'react-icons/fi';

interface ImageEditorProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
}

export default function ImageEditor({ imageUrl, onSave }: ImageEditorProps) {
  const [canvas, setCanvas] = useState<fabric.Canvas | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editMode, setEditMode] = useState<'basic' | 'advanced' | 'ai'>('basic');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (canvasRef.current) {
      const newCanvas = new fabric.Canvas(canvasRef.current);
      setCanvas(newCanvas);

      fabric.Image.fromURL(imageUrl, (img) => {
        img.scaleToWidth(newCanvas.width!);
        newCanvas.add(img);
        newCanvas.renderAll();
      });

      return () => {
        newCanvas.dispose();
      };
    }
  }, [imageUrl]);

  const handleRotate = (angle: number) => {
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        activeObject.rotate((activeObject.angle || 0) + angle);
        canvas.renderAll();
      }
    }
  };

  const handleZoom = (scale: number) => {
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        activeObject.scale(activeObject.scaleX! * scale);
        canvas.renderAll();
      }
    }
  };

  const handleFilter = () => {
    if (canvas) {
      const activeObject = canvas.getActiveObject();
      if (activeObject && activeObject.type === 'image') {
        const filters = [
          new fabric.Image.filters.Brightness({ brightness: (brightness - 100) / 100 }),
          new fabric.Image.filters.Contrast({ contrast: (contrast - 100) / 100 }),
          new fabric.Image.filters.Saturation({ saturation: saturation / 100 }),
        ];
        (activeObject as fabric.Image).filters = filters;
        (activeObject as fabric.Image).applyFilters();
        canvas.renderAll();
      }
    }
  };

  const handleAIGenerate = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/assets/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error('Failed to generate image');

      const data = await response.json();
      onSave(data.url);
      
      toast({
        title: 'Image generated successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('AI generation error:', error);
      toast({
        title: 'Failed to generate image',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAIEdit = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    try {
      // Get the current canvas state as a data URL
      const dataUrl = canvas?.toDataURL();
      
      const response = await fetch('/api/assets/edit-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: dataUrl,
          prompt,
        }),
      });

      if (!response.ok) throw new Error('Failed to edit image');

      const data = await response.json();
      onSave(data.url);
      
      toast({
        title: 'Image edited successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('AI edit error:', error);
      toast({
        title: 'Failed to edit image',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (canvas) {
      const dataUrl = canvas.toDataURL();
      onSave(dataUrl);
    }
  };

  return (
    <Box>
      <Tabs onChange={(index) => setEditMode(['basic', 'advanced', 'ai'][index])}>
        <TabList>
          <Tab>Basic Editing</Tab>
          <Tab>Advanced Editing</Tab>
          <Tab>AI Enhancement</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Stack spacing={4}>
              <ButtonGroup>
                <IconButton
                  aria-label="Rotate left"
                  icon={<FiRotateCcw />}
                  onClick={() => handleRotate(-90)}
                />
                <IconButton
                  aria-label="Rotate right"
                  icon={<FiRotateCw />}
                  onClick={() => handleRotate(90)}
                />
                <IconButton
                  aria-label="Zoom in"
                  icon={<FiZoomIn />}
                  onClick={() => handleZoom(1.1)}
                />
                <IconButton
                  aria-label="Zoom out"
                  icon={<FiZoomOut />}
                  onClick={() => handleZoom(0.9)}
                />
              </ButtonGroup>

              <Box>
                <Text>Brightness</Text>
                <Slider
                  value={brightness}
                  onChange={setBrightness}
                  min={0}
                  max={200}
                  onChangeEnd={handleFilter}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </Box>

              <Box>
                <Text>Contrast</Text>
                <Slider
                  value={contrast}
                  onChange={setContrast}
                  min={0}
                  max={200}
                  onChangeEnd={handleFilter}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </Box>

              <Box>
                <Text>Saturation</Text>
                <Slider
                  value={saturation}
                  onChange={setSaturation}
                  min={0}
                  max={200}
                  onChangeEnd={handleFilter}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb />
                </Slider>
              </Box>
            </Stack>
          </TabPanel>

          <TabPanel>
            <canvas ref={canvasRef} style={{ border: '1px solid #ccc' }} />
          </TabPanel>

          <TabPanel>
            <Stack spacing={4}>
              <Box>
                <Text mb={2}>AI Image Generation/Editing</Text>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to generate or how you want to edit the image..."
                  rows={4}
                />
              </Box>

              <Flex gap={4}>
                <Button
                  leftIcon={<FiImage />}
                  colorScheme="blue"
                  onClick={handleAIGenerate}
                  isLoading={isGenerating}
                  loadingText="Generating..."
                >
                  Generate New
                </Button>

                <Button
                  leftIcon={<FiEdit2 />}
                  colorScheme="purple"
                  onClick={handleAIEdit}
                  isLoading={isGenerating}
                  loadingText="Editing..."
                >
                  Edit Current
                </Button>
              </Flex>
            </Stack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Flex justifyContent="flex-end" mt={4}>
        <Button
          leftIcon={<FiSave />}
          colorScheme="green"
          onClick={handleSave}
        >
          Save Changes
        </Button>
      </Flex>
    </Box>
  );
}

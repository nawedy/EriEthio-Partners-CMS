import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Stack,
  Text,
  Input,
  Select,
  Textarea,
  Progress,
  useToast,
  Grid,
  Image,
  IconButton,
  Flex,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
} from '@chakra-ui/react';
import { FiPlay, FiPause, FiTrash2, FiPlus, FiVideo, FiMusic } from 'react-icons/fi';
import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
import { Asset } from '@prisma/client';

const ffmpeg = createFFmpeg({ log: true });

interface VideoCreatorProps {
  onSave: (videoUrl: string) => void;
  assets: Asset[];
}

interface Clip {
  id: string;
  type: 'image' | 'video';
  url: string;
  duration: number;
}

export default function VideoCreator({ onSave, assets }: VideoCreatorProps) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [duration, setDuration] = useState(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audioTrack, setAudioTrack] = useState<File | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const loadFFmpeg = async () => {
      if (!ffmpeg.isLoaded()) {
        await ffmpeg.load();
      }
    };
    loadFFmpeg();
  }, []);

  const handleAddClip = () => {
    if (!selectedAsset) return;

    const newClip: Clip = {
      id: Math.random().toString(36).substr(2, 9),
      type: selectedAsset.type.startsWith('image/') ? 'image' : 'video',
      url: selectedAsset.url,
      duration: duration,
    };

    setClips([...clips, newClip]);
    setSelectedAsset(null);
    setIsPickerOpen(false);
  };

  const handleRemoveClip = (clipId: string) => {
    setClips(clips.filter(clip => clip.id !== clipId));
  };

  const handleAudioUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAudioTrack(file);
    }
  };

  const handleGenerateVideo = async () => {
    if (!clips.length) return;

    setIsProcessing(true);
    try {
      // Write all clips to FFmpeg virtual filesystem
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const response = await fetch(clip.url);
        const buffer = await response.arrayBuffer();
        const filename = `clip_${i}${clip.type === 'image' ? '.jpg' : '.mp4'}`;
        ffmpeg.FS('writeFile', filename, new Uint8Array(buffer));
      }

      // Create concat file
      const concat = clips.map((clip, i) => {
        const filename = `clip_${i}${clip.type === 'image' ? '.jpg' : '.mp4'}`;
        if (clip.type === 'image') {
          return `file ${filename}\nduration ${clip.duration}`;
        }
        return `file ${filename}`;
      }).join('\n');
      ffmpeg.FS('writeFile', 'concat.txt', new TextEncoder().encode(concat));

      // Add audio if provided
      let audioArgs = [];
      if (audioTrack) {
        const audioBuffer = await audioTrack.arrayBuffer();
        ffmpeg.FS('writeFile', 'audio.mp3', new Uint8Array(audioBuffer));
        audioArgs = ['-i', 'audio.mp3', '-shortest'];
      }

      // Generate video
      await ffmpeg.run(
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat.txt',
        ...audioArgs,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        'output.mp4'
      );

      // Read the output file
      const data = ffmpeg.FS('readFile', 'output.mp4');
      const videoBlob = new Blob([data.buffer], { type: 'video/mp4' });
      const videoUrl = URL.createObjectURL(videoBlob);

      // Upload to storage
      const formData = new FormData();
      formData.append('file', new File([videoBlob], 'video.mp4'));

      const response = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to upload video');

      const { url } = await response.json();
      onSave(url);

      toast({
        title: 'Video created successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Video creation error:', error);
      toast({
        title: 'Failed to create video',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateAIVideo = async () => {
    if (!prompt) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/assets/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error('Failed to generate video');

      const { url } = await response.json();
      onSave(url);

      toast({
        title: 'Video generated successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('AI video generation error:', error);
      toast({
        title: 'Failed to generate video',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box>
      <Stack spacing={6}>
        <Flex justifyContent="space-between" alignItems="center">
          <Text fontSize="xl" fontWeight="bold">Video Creator</Text>
          <Button
            leftIcon={<FiPlus />}
            colorScheme="blue"
            onClick={() => setIsPickerOpen(true)}
          >
            Add Clip
          </Button>
        </Flex>

        <Grid templateColumns="repeat(auto-fill, minmax(200px, 1fr))" gap={4}>
          {clips.map((clip, index) => (
            <Box
              key={clip.id}
              borderWidth={1}
              borderRadius="md"
              overflow="hidden"
              position="relative"
            >
              {clip.type === 'image' ? (
                <Image src={clip.url} alt={`Clip ${index + 1}`} />
              ) : (
                <video src={clip.url} style={{ width: '100%' }} />
              )}
              <Flex
                position="absolute"
                bottom={0}
                left={0}
                right={0}
                p={2}
                bg="blackAlpha.700"
                justifyContent="space-between"
                alignItems="center"
              >
                <Badge colorScheme={clip.type === 'image' ? 'green' : 'blue'}>
                  {clip.duration}s
                </Badge>
                <IconButton
                  aria-label="Remove clip"
                  icon={<FiTrash2 />}
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => handleRemoveClip(clip.id)}
                />
              </Flex>
            </Box>
          ))}
        </Grid>

        <Stack spacing={4}>
          <Box>
            <Text mb={2}>Background Music</Text>
            <Input
              type="file"
              accept="audio/*"
              onChange={handleAudioUpload}
            />
          </Box>

          <Box>
            <Text mb={2}>AI Video Generation</Text>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the video you want to generate..."
              mb={2}
            />
            <Button
              leftIcon={<FiVideo />}
              colorScheme="purple"
              onClick={handleGenerateAIVideo}
              isLoading={isGenerating}
              loadingText="Generating..."
            >
              Generate AI Video
            </Button>
          </Box>
        </Stack>

        {isProcessing && (
          <Progress value={progress} size="sm" colorScheme="blue" />
        )}

        <Flex justifyContent="flex-end" gap={4}>
          <Button
            leftIcon={<FiPlay />}
            colorScheme="green"
            onClick={handleGenerateVideo}
            isLoading={isProcessing}
            loadingText="Creating..."
          >
            Create Video
          </Button>
        </Flex>
      </Stack>

      <Modal isOpen={isPickerOpen} onClose={() => setIsPickerOpen(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Select Media</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Stack spacing={4}>
              <Grid templateColumns="repeat(auto-fill, minmax(150px, 1fr))" gap={4}>
                {assets.map(asset => (
                  <Box
                    key={asset.id}
                    onClick={() => setSelectedAsset(asset)}
                    cursor="pointer"
                    borderWidth={1}
                    borderRadius="md"
                    borderColor={selectedAsset?.id === asset.id ? 'blue.500' : 'gray.200'}
                    overflow="hidden"
                  >
                    {asset.type.startsWith('image/') ? (
                      <Image src={asset.url} alt={asset.name} />
                    ) : (
                      <video src={asset.url} style={{ width: '100%' }} />
                    )}
                  </Box>
                ))}
              </Grid>

              {selectedAsset && (
                <Box>
                  <Text mb={2}>Duration (seconds)</Text>
                  <Input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    min={1}
                  />
                </Box>
              )}

              <Button
                colorScheme="blue"
                onClick={handleAddClip}
                isDisabled={!selectedAsset}
              >
                Add to Timeline
              </Button>
            </Stack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}

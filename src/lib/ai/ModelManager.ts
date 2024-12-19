import OpenAI from 'openai';
import { Replicate } from 'replicate';
import { StabilityClient } from 'stability-client';
import { Configuration, OpenAIApi } from 'openai-edge';
import { HuggingFaceInference } from '@huggingface/inference';
import { AI_CONFIG } from '@/utils/ai-config';
import { FEATURE_FLAGS } from '@/utils/ai-config';

export type AIModel = {
  id: string;
  name: string;
  provider: 'openai' | 'replicate' | 'stability' | 'huggingface';
  type: 'image' | 'video' | 'text' | 'audio';
  capabilities: string[];
  maxInputSize?: number;
  pricing: {
    input: number;
    output: number;
    unit: 'token' | 'second' | 'image';
  };
};

export class ModelManager {
  private openai: OpenAI;
  private replicate: Replicate;
  private stability: StabilityClient;
  private huggingface: HuggingFaceInference;
  private models: Map<string, AIModel>;

  constructor() {
    if (!FEATURE_FLAGS.enableAI) {
      throw new Error('AI features are disabled');
    }

    this.openai = new OpenAI({
      apiKey: AI_CONFIG.openai.apiKey,
    });

    this.replicate = new Replicate({
      auth: AI_CONFIG.replicate.apiToken,
    });

    this.stability = new StabilityClient({
      key: AI_CONFIG.stability?.apiKey,
    });

    this.huggingface = new HuggingFaceInference(AI_CONFIG.huggingface.apiKey);

    this.models = new Map([
      ['dall-e-3', {
        id: 'dall-e-3',
        name: 'DALL-E 3',
        provider: 'openai',
        type: 'image',
        capabilities: ['generation', 'editing', 'variation'],
        pricing: { input: 0.04, output: 0.08, unit: 'image' },
      }],
      ['stable-diffusion-xl', {
        id: 'stable-diffusion-xl',
        name: 'Stable Diffusion XL',
        provider: 'stability',
        type: 'image',
        capabilities: ['generation', 'inpainting', 'outpainting'],
        pricing: { input: 0.02, output: 0.04, unit: 'image' },
      }],
      ['midjourney', {
        id: 'midjourney',
        name: 'Midjourney v5',
        provider: 'replicate',
        type: 'image',
        capabilities: ['generation', 'variation'],
        pricing: { input: 0.05, output: 0.1, unit: 'image' },
      }],
      ['zeroscope-v2', {
        id: 'zeroscope-v2',
        name: 'ZeroScope v2',
        provider: 'replicate',
        type: 'video',
        capabilities: ['generation'],
        pricing: { input: 0.1, output: 0.2, unit: 'second' },
      }],
    ]);
  }

  async generateImage(
    prompt: string,
    model: string,
    options: any = {}
  ): Promise<string> {
    const selectedModel = this.models.get(model);
    if (!selectedModel) throw new Error('Model not found');

    switch (selectedModel.provider) {
      case 'openai':
        const response = await this.openai.images.generate({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: options.size || "1024x1024",
          style: options.style || "vivid",
        });
        return response.data[0].url || '';

      case 'stability':
        const stabilityResponse = await this.stability.generateImage({
          prompt,
          width: options.width || 1024,
          height: options.height || 1024,
          samples: 1,
        });
        return stabilityResponse.artifacts[0].base64;

      case 'replicate':
        const replicateResponse = await this.replicate.run(
          "stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf",
          {
            input: {
              prompt,
              ...options,
            }
          }
        );
        return replicateResponse[0];

      default:
        throw new Error('Unsupported provider');
    }
  }

  async generateVideo(
    prompt: string,
    model: string,
    options: any = {}
  ): Promise<string> {
    const selectedModel = this.models.get(model);
    if (!selectedModel) throw new Error('Model not found');

    switch (selectedModel.provider) {
      case 'replicate':
        const response = await this.replicate.run(
          "anotherjesse/zeroscope-v2-xl:9f747673945c62801b13b84701c783929c0ee784e4748ec062204894dda1a351",
          {
            input: {
              prompt,
              frames: options.frames || 24,
              duration: options.duration || 4,
            }
          }
        );
        return response[0];

      default:
        throw new Error('Unsupported provider for video generation');
    }
  }

  async editImage(
    image: string,
    prompt: string,
    model: string,
    options: any = {}
  ): Promise<string> {
    const selectedModel = this.models.get(model);
    if (!selectedModel) throw new Error('Model not found');

    switch (selectedModel.provider) {
      case 'openai':
        const response = await this.openai.images.edit({
          image: await fetch(image).then(r => r.blob()),
          mask: options.mask ? await fetch(options.mask).then(r => r.blob()) : undefined,
          prompt,
          n: 1,
          size: options.size || "1024x1024",
        });
        return response.data[0].url || '';

      case 'stability':
        const stabilityResponse = await this.stability.generateImageVariation({
          image: Buffer.from(image.split(',')[1], 'base64'),
          prompt,
          width: options.width || 1024,
          height: options.height || 1024,
        });
        return stabilityResponse.artifacts[0].base64;

      default:
        throw new Error('Unsupported provider for image editing');
    }
  }

  getAvailableModels(type?: 'image' | 'video' | 'text' | 'audio'): AIModel[] {
    return Array.from(this.models.values())
      .filter(model => !type || model.type === type);
  }

  estimateCost(model: string, units: number): number {
    const selectedModel = this.models.get(model);
    if (!selectedModel) throw new Error('Model not found');

    return (selectedModel.pricing.input + selectedModel.pricing.output) * units;
  }
}

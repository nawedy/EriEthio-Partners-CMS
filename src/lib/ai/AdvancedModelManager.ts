import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Anthropic } from '@anthropic-ai/sdk';
import { HuggingFaceInference } from '@huggingface/inference';
import { StabilityClient } from 'stability-client';
import { Replicate } from 'replicate';
import { AI_CONFIG } from '@/utils/ai-config';
import { FEATURE_FLAGS } from '@/utils/ai-config';

interface ModelCapability {
  type: 'text' | 'image' | 'video' | 'audio' | 'multimodal';
  features: string[];
  maxInputTokens?: number;
  maxOutputTokens?: number;
  supportedFormats?: string[];
}

interface ModelProvider {
  name: string;
  models: {
    [key: string]: {
      capabilities: ModelCapability[];
      version: string;
      pricing: {
        input: number;
        output: number;
        unit: 'token' | 'image' | 'second' | 'minute';
      };
    };
  };
}

export class AdvancedModelManager {
  private openai: OpenAI;
  private gemini: GoogleGenerativeAI;
  private anthropic: Anthropic;
  private huggingface: HuggingFaceInference;
  private stability: StabilityClient;
  private replicate: Replicate;

  private providers: { [key: string]: ModelProvider } = {
    openai: {
      name: 'OpenAI',
      models: {
        'gpt-4-vision-preview': {
          capabilities: [
            {
              type: 'multimodal',
              features: ['text-generation', 'image-understanding', 'code-generation'],
              maxInputTokens: 128000,
              maxOutputTokens: 4096,
            },
          ],
          version: '1.0',
          pricing: { input: 0.01, output: 0.03, unit: 'token' },
        },
        'dall-e-3': {
          capabilities: [
            {
              type: 'image',
              features: ['generation', 'editing', 'variation'],
              supportedFormats: ['png', 'jpeg'],
            },
          ],
          version: '1.0',
          pricing: { input: 0.04, output: 0.08, unit: 'image' },
        },
      },
    },
    anthropic: {
      name: 'Anthropic',
      models: {
        'claude-3-opus': {
          capabilities: [
            {
              type: 'multimodal',
              features: ['text-generation', 'image-understanding', 'analysis'],
              maxInputTokens: 200000,
              maxOutputTokens: 4096,
            },
          ],
          version: '1.0',
          pricing: { input: 0.015, output: 0.075, unit: 'token' },
        },
      },
    },
    gemini: {
      name: 'Google',
      models: {
        'gemini-pro-vision': {
          capabilities: [
            {
              type: 'multimodal',
              features: ['text-generation', 'image-understanding', 'code-generation'],
              maxInputTokens: 100000,
              maxOutputTokens: 2048,
            },
          ],
          version: '1.0',
          pricing: { input: 0.005, output: 0.01, unit: 'token' },
        },
      },
    },
  };

  constructor() {
    if (!FEATURE_FLAGS.enableAI) {
      throw new Error('AI features are disabled');
    }

    this.openai = new OpenAI({
      apiKey: AI_CONFIG.openai.apiKey,
    });

    this.gemini = new GoogleGenerativeAI(AI_CONFIG.google.apiKey);

    this.anthropic = new Anthropic({
      apiKey: AI_CONFIG.anthropic.apiKey,
    });

    this.huggingface = new HuggingFaceInference(AI_CONFIG.huggingface.apiKey);

    this.stability = new StabilityClient({
      key: AI_CONFIG.stability?.apiKey,
    });

    this.replicate = new Replicate({
      auth: AI_CONFIG.replicate.apiToken,
    });
  }

  async generateMultiModal(
    prompt: string,
    images: string[],
    model: string,
    options: any = {}
  ) {
    switch (model) {
      case 'gpt-4-vision-preview':
        return await this.openai.chat.completions.create({
          model: "gpt-4-vision-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                ...images.map(image => ({
                  type: "image_url",
                  image_url: image,
                })),
              ],
            },
          ],
          max_tokens: options.maxTokens || 4096,
        });

      case 'claude-3-opus':
        return await this.anthropic.messages.create({
          model: "claude-3-opus",
          max_tokens: options.maxTokens || 4096,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                ...images.map(image => ({
                  type: "image",
                  source: { type: "base64", media_type: "image/jpeg", data: image },
                })),
              ],
            },
          ],
        });

      case 'gemini-pro-vision':
        const geminiModel = this.gemini.getGenerativeModel({ model: "gemini-pro-vision" });
        return await geminiModel.generateContent([
          prompt,
          ...images.map(image => ({
            inlineData: {
              data: image.replace(/^data:image\/\w+;base64,/, ''),
              mimeType: 'image/jpeg',
            },
          })),
        ]);

      default:
        throw new Error(`Unsupported model: ${model}`);
    }
  }

  async generateImage(
    prompt: string,
    model: string,
    options: any = {}
  ): Promise<string> {
    switch (model) {
      case 'dall-e-3':
        const response = await this.openai.images.generate({
          model: "dall-e-3",
          prompt,
          n: 1,
          size: options.size || "1024x1024",
          style: options.style || "vivid",
        });
        return response.data[0].url || '';

      case 'stable-diffusion-xl':
        const stabilityResponse = await this.stability.generateImage({
          prompt,
          width: options.width || 1024,
          height: options.height || 1024,
          samples: 1,
        });
        return stabilityResponse.artifacts[0].base64;

      case 'sdxl':
        const replicateResponse = await this.replicate.run(
          "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
          {
            input: {
              prompt,
              negative_prompt: options.negative_prompt,
              width: options.width || 1024,
              height: options.height || 1024,
            }
          }
        );
        return replicateResponse[0];

      default:
        throw new Error(`Unsupported model: ${model}`);
    }
  }

  getAvailableModels(type?: 'text' | 'image' | 'video' | 'audio' | 'multimodal'): {
    provider: string;
    model: string;
    capabilities: ModelCapability[];
  }[] {
    const models: {
      provider: string;
      model: string;
      capabilities: ModelCapability[];
    }[] = [];

    for (const [providerKey, provider] of Object.entries(this.providers)) {
      for (const [modelKey, modelInfo] of Object.entries(provider.models)) {
        if (!type || modelInfo.capabilities.some(cap => cap.type === type)) {
          models.push({
            provider: provider.name,
            model: modelKey,
            capabilities: modelInfo.capabilities,
          });
        }
      }
    }

    return models;
  }

  estimateCost(model: string, units: number): number {
    for (const provider of Object.values(this.providers)) {
      const modelInfo = provider.models[model];
      if (modelInfo) {
        return (modelInfo.pricing.input + modelInfo.pricing.output) * units;
      }
    }
    throw new Error(`Model not found: ${model}`);
  }

  async compareResults(
    prompt: string,
    models: string[],
    type: 'text' | 'image' | 'multimodal',
    options: any = {}
  ) {
    const results = await Promise.allSettled(
      models.map(async model => {
        const startTime = Date.now();
        try {
          let result;
          if (type === 'image') {
            result = await this.generateImage(prompt, model, options);
          } else if (type === 'multimodal') {
            result = await this.generateMultiModal(prompt, options.images || [], model, options);
          }
          return {
            model,
            result,
            time: Date.now() - startTime,
            cost: this.estimateCost(model, 1),
          };
        } catch (error) {
          throw new Error(`Error with ${model}: ${error.message}`);
        }
      })
    );

    return results.map((result, index) => ({
      model: models[index],
      status: result.status,
      ...(result.status === 'fulfilled'
        ? result.value
        : { error: result.reason.message }),
    }));
  }
}

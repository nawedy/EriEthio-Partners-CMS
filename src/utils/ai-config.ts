import env from './env';

export const AI_CONFIG = {
  openai: {
    apiKey: env.OPENAI_API_KEY,
    models: {
      chat: 'gpt-4-1106-preview',
      completion: 'gpt-4-1106-preview',
      embedding: 'text-embedding-ada-002',
    },
  },
  anthropic: {
    apiKey: env.ANTHROPIC_API_KEY,
    models: {
      chat: 'claude-2.1',
    },
  },
  huggingface: {
    apiKey: env.HUGGINGFACE_API_KEY,
    imageApiKey: env.HUGGING_FACE_IMAGE_TO_IMAGE_API,
  },
  google: {
    apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
    models: {
      chat: 'gemini-pro',
      vision: 'gemini-pro-vision',
    },
  },
  mistral: {
    apiKey: env.MISTRAL_API_KEY,
    models: {
      chat: 'mistral-large-latest',
    },
  },
  cohere: {
    apiKey: env.COHERE_API_KEY,
  },
  xai: {
    apiKey: env.XAI_API_KEY,
  },
  groq: {
    apiKey: env.GROQ_API_KEY,
  },
} as const;

export const IMAGE_SERVICES = {
  pexels: {
    apiKey: env.PEXELS_API_KEY,
  },
  replicate: {
    apiToken: env.REPLICATE_API_TOKEN,
  },
} as const;

export const GOOGLE_SERVICES = {
  maps: {
    apiKey: env.GOOGLE_MAPS_API_KEY,
  },
} as const;

export const FEATURE_FLAGS = {
  enableAI: env.ENABLE_AI_FEATURES,
  enableImageProcessing: env.ENABLE_IMAGE_PROCESSING,
  enableVideoProcessing: env.ENABLE_VIDEO_PROCESSING,
} as const;

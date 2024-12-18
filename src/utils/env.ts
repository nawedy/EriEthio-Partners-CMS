import { z } from 'zod';

/**
 * Specify your environment variables schema here.
 * This way you can ensure the app isn't built with invalid env vars.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  
  // Next Auth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),

  // AI Services
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  HUGGINGFACE_API_KEY: z.string().min(1),
  HUGGING_FACE_IMAGE_TO_IMAGE_API: z.string().min(1),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(1),
  MISTRAL_API_KEY: z.string().min(1),
  COHERE_API_KEY: z.string().min(1),
  XAI_API_KEY: z.string().min(1),
  GROQ_API_KEY: z.string().min(1),

  // Image Services
  PEXELS_API_KEY: z.string().min(1),
  REPLICATE_API_TOKEN: z.string().min(1),

  // Google Services
  GOOGLE_MAPS_API_KEY: z.string().min(1),

  // Feature Flags
  ENABLE_AI_FEATURES: z.string().transform((str) => str === 'true'),
  ENABLE_IMAGE_PROCESSING: z.string().transform((str) => str === 'true'),
  ENABLE_VIDEO_PROCESSING: z.string().transform((str) => str === 'true'),

  // Optional: Monitoring and Analytics
  SENTRY_DSN: z.string().url().optional(),
  ANALYTICS_API_KEY: z.string().optional(),

  // Optional: Cache Configuration
  REDIS_URL: z.string().url().optional(),

  // Optional: CDN Configuration
  CDN_URL: z.string().url().optional(),
  CDN_API_KEY: z.string().optional(),
});

/**
 * Validate that all environment variables are set and valid
 */
const processEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
  HUGGING_FACE_IMAGE_TO_IMAGE_API: process.env.HUGGING_FACE_IMAGE_TO_IMAGE_API,
  GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
  COHERE_API_KEY: process.env.COHERE_API_KEY,
  XAI_API_KEY: process.env.XAI_API_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  PEXELS_API_KEY: process.env.PEXELS_API_KEY,
  REPLICATE_API_TOKEN: process.env.REPLICATE_API_TOKEN,
  GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
  ENABLE_AI_FEATURES: process.env.ENABLE_AI_FEATURES ?? 'false',
  ENABLE_IMAGE_PROCESSING: process.env.ENABLE_IMAGE_PROCESSING ?? 'false',
  ENABLE_VIDEO_PROCESSING: process.env.ENABLE_VIDEO_PROCESSING ?? 'false',
  SENTRY_DSN: process.env.SENTRY_DSN,
  ANALYTICS_API_KEY: process.env.ANALYTICS_API_KEY,
  REDIS_URL: process.env.REDIS_URL,
  CDN_URL: process.env.CDN_URL,
  CDN_API_KEY: process.env.CDN_API_KEY,
};

/**
 * Parse and validate environment variables
 * Throws an error if any required environment variables are missing
 */
const env = envSchema.parse(processEnv);

export default env;

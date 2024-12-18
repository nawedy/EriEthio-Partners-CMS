import 'openai/shims/node';
import { AdvancedModelManager } from '../AdvancedModelManager';

describe('AdvancedModelManager', () => {
  let modelManager: AdvancedModelManager;

  beforeEach(() => {
    modelManager = new AdvancedModelManager();
  });

  describe('getAvailableModels', () => {
    it('should return all models when no type is specified', () => {
      const models = modelManager.getAvailableModels();
      expect(models.length).toBeGreaterThan(0);
      expect(models[0]).toHaveProperty('provider');
      expect(models[0]).toHaveProperty('model');
      expect(models[0]).toHaveProperty('capabilities');
    });

    it('should filter models by type', () => {
      const imageModels = modelManager.getAvailableModels('image');
      expect(imageModels.length).toBeGreaterThan(0);
      expect(imageModels.every(m => 
        m.capabilities.some(c => c.type === 'image')
      )).toBe(true);
    });
  });

  describe('estimateCost', () => {
    it('should calculate correct cost for DALL-E 3', () => {
      const cost = modelManager.estimateCost('dall-e-3', 1);
      expect(cost).toBe(0.12); // 0.04 (input) + 0.08 (output)
    });

    it('should throw error for invalid model', () => {
      expect(() => {
        modelManager.estimateCost('invalid-model', 1);
      }).toThrow('Model not found');
    });
  });

  describe('generateImage', () => {
    it('should generate image with DALL-E 3', async () => {
      const prompt = 'A beautiful sunset';
      const imageUrl = await modelManager.generateImage(prompt, 'dall-e-3');
      expect(typeof imageUrl).toBe('string');
      expect(imageUrl).toMatch(/^https?:\/\//);
    });

    it('should handle generation error', async () => {
      const prompt = '';
      await expect(
        modelManager.generateImage(prompt, 'dall-e-3')
      ).rejects.toThrow();
    });
  });

  describe('generateMultiModal', () => {
    it('should generate content with GPT-4V', async () => {
      const prompt = 'Describe this image';
      const images = ['https://example.com/image.jpg'];
      const response = await modelManager.generateMultiModal(
        prompt,
        images,
        'gpt-4-vision-preview'
      );
      expect(response).toBeDefined();
    });

    it('should handle invalid model', async () => {
      const prompt = 'Test';
      const images = ['https://example.com/image.jpg'];
      await expect(
        modelManager.generateMultiModal(prompt, images, 'invalid-model')
      ).rejects.toThrow('Unsupported model');
    });
  });

  describe('compareResults', () => {
    it('should compare results from multiple models', async () => {
      const prompt = 'A test prompt';
      const models = ['dall-e-3', 'stable-diffusion-xl'];
      const results = await modelManager.compareResults(
        prompt,
        models,
        'image'
      );
      expect(results.length).toBe(2);
      expect(results[0]).toHaveProperty('model');
      expect(results[0]).toHaveProperty('result');
      expect(results[0]).toHaveProperty('time');
      expect(results[0]).toHaveProperty('cost');
    });

    it('should handle failed models gracefully', async () => {
      const prompt = 'A test prompt';
      const models = ['dall-e-3', 'invalid-model'];
      const results = await modelManager.compareResults(
        prompt,
        models,
        'image'
      );
      expect(results.length).toBe(2);
      expect(results[1].status).toBe('rejected');
      expect(results[1]).toHaveProperty('error');
    });
  });
});

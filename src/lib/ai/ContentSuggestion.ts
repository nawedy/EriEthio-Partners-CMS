import OpenAI from 'openai';
import { PrismaClient, Asset } from '@prisma/client';
import { ModelManager } from './ModelManager';

interface ContentSuggestion {
  type: 'image' | 'video' | 'text';
  prompt: string;
  reason: string;
  confidence: number;
  estimatedCost: number;
  model: string;
  options?: any;
}

interface ContentAnalysis {
  topics: string[];
  style: string;
  tone: string;
  targetAudience: string;
  recommendations: string[];
}

export class ContentSuggestionSystem {
  private openai: OpenAI;
  private prisma: PrismaClient;
  private modelManager: ModelManager;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.prisma = new PrismaClient();
    this.modelManager = new ModelManager();
  }

  async analyzeTenant(tenantId: string): Promise<ContentAnalysis> {
    // Fetch tenant's existing content
    const assets = await this.prisma.asset.findMany({
      where: { tenantId },
      include: { metadata: true },
    });

    const pages = await this.prisma.page.findMany({
      where: { tenantId },
      include: { content: true },
    });

    // Analyze content with GPT-4
    const analysis = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a content strategy expert. Analyze the provided content and suggest improvements."
        },
        {
          role: "user",
          content: JSON.stringify({
            assets: assets.map(a => ({
              type: a.type,
              name: a.name,
              metadata: a.metadata,
            })),
            pages: pages.map(p => ({
              title: p.title,
              content: p.content,
            })),
          })
        }
      ],
      functions: [
        {
          name: "provide_content_analysis",
          parameters: {
            type: "object",
            properties: {
              topics: {
                type: "array",
                items: { type: "string" },
                description: "Main topics covered in the content"
              },
              style: {
                type: "string",
                description: "Overall content style"
              },
              tone: {
                type: "string",
                description: "Content tone"
              },
              targetAudience: {
                type: "string",
                description: "Identified target audience"
              },
              recommendations: {
                type: "array",
                items: { type: "string" },
                description: "Content improvement recommendations"
              }
            },
            required: ["topics", "style", "tone", "targetAudience", "recommendations"]
          }
        }
      ],
      function_call: { name: "provide_content_analysis" }
    });

    const analysisResult = JSON.parse(
      analysis.choices[0].message.function_call?.arguments || '{}'
    );

    return analysisResult;
  }

  async generateSuggestions(
    tenantId: string,
    context: string
  ): Promise<ContentSuggestion[]> {
    const analysis = await this.analyzeTenant(tenantId);

    // Generate suggestions with GPT-4
    const suggestions = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a creative content strategist. Generate content suggestions based on the analysis and context."
        },
        {
          role: "user",
          content: JSON.stringify({
            analysis,
            context,
            availableModels: this.modelManager.getAvailableModels(),
          })
        }
      ],
      functions: [
        {
          name: "provide_content_suggestions",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["image", "video", "text"]
                    },
                    prompt: {
                      type: "string"
                    },
                    reason: {
                      type: "string"
                    },
                    confidence: {
                      type: "number",
                      minimum: 0,
                      maximum: 1
                    },
                    model: {
                      type: "string"
                    },
                    options: {
                      type: "object"
                    }
                  },
                  required: ["type", "prompt", "reason", "confidence", "model"]
                }
              }
            },
            required: ["suggestions"]
          }
        }
      ],
      function_call: { name: "provide_content_suggestions" }
    });

    const suggestionsResult = JSON.parse(
      suggestions.choices[0].message.function_call?.arguments || '{}'
    );

    // Add cost estimates
    return suggestionsResult.suggestions.map((suggestion: ContentSuggestion) => ({
      ...suggestion,
      estimatedCost: this.modelManager.estimateCost(suggestion.model, 1),
    }));
  }

  async generateContentVariations(
    assetId: string,
    count: number = 3
  ): Promise<ContentSuggestion[]> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: { metadata: true },
    });

    if (!asset) throw new Error('Asset not found');

    // Generate variations with GPT-4
    const variations = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a creative content generator. Generate variations of the provided content."
        },
        {
          role: "user",
          content: JSON.stringify({
            asset: {
              type: asset.type,
              name: asset.name,
              metadata: asset.metadata,
            },
            count,
            availableModels: this.modelManager.getAvailableModels(),
          })
        }
      ],
      functions: [
        {
          name: "provide_content_variations",
          parameters: {
            type: "object",
            properties: {
              variations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: {
                      type: "string",
                      enum: ["image", "video", "text"]
                    },
                    prompt: {
                      type: "string"
                    },
                    reason: {
                      type: "string"
                    },
                    confidence: {
                      type: "number",
                      minimum: 0,
                      maximum: 1
                    },
                    model: {
                      type: "string"
                    },
                    options: {
                      type: "object"
                    }
                  },
                  required: ["type", "prompt", "reason", "confidence", "model"]
                }
              }
            },
            required: ["variations"]
          }
        }
      ],
      function_call: { name: "provide_content_variations" }
    });

    const variationsResult = JSON.parse(
      variations.choices[0].message.function_call?.arguments || '{}'
    );

    // Add cost estimates
    return variationsResult.variations.map((variation: ContentSuggestion) => ({
      ...variation,
      estimatedCost: this.modelManager.estimateCost(variation.model, 1),
    }));
  }

  async generateContentSchedule(
    tenantId: string,
    duration: number = 30 // days
  ): Promise<{
    schedule: Array<{
      date: string;
      suggestions: ContentSuggestion[];
    }>;
    totalCost: number;
  }> {
    const analysis = await this.analyzeTenant(tenantId);
    const today = new Date();

    // Generate content schedule with GPT-4
    const schedule = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a content planning expert. Create a content schedule based on the analysis."
        },
        {
          role: "user",
          content: JSON.stringify({
            analysis,
            duration,
            startDate: today.toISOString(),
            availableModels: this.modelManager.getAvailableModels(),
          })
        }
      ],
      functions: [
        {
          name: "provide_content_schedule",
          parameters: {
            type: "object",
            properties: {
              schedule: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: {
                      type: "string",
                      format: "date"
                    },
                    suggestions: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          type: {
                            type: "string",
                            enum: ["image", "video", "text"]
                          },
                          prompt: {
                            type: "string"
                          },
                          reason: {
                            type: "string"
                          },
                          confidence: {
                            type: "number",
                            minimum: 0,
                            maximum: 1
                          },
                          model: {
                            type: "string"
                          },
                          options: {
                            type: "object"
                          }
                        },
                        required: ["type", "prompt", "reason", "confidence", "model"]
                      }
                    }
                  },
                  required: ["date", "suggestions"]
                }
              }
            },
            required: ["schedule"]
          }
        }
      ],
      function_call: { name: "provide_content_schedule" }
    });

    const scheduleResult = JSON.parse(
      schedule.choices[0].message.function_call?.arguments || '{}'
    );

    // Add cost estimates
    let totalCost = 0;
    const scheduleWithCosts = scheduleResult.schedule.map(
      (day: { date: string; suggestions: ContentSuggestion[] }) => {
        const suggestionsWithCosts = day.suggestions.map(suggestion => {
          const cost = this.modelManager.estimateCost(suggestion.model, 1);
          totalCost += cost;
          return { ...suggestion, estimatedCost: cost };
        });
        return { ...day, suggestions: suggestionsWithCosts };
      }
    );

    return {
      schedule: scheduleWithCosts,
      totalCost,
    };
  }
}

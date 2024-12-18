import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient, Asset } from '@prisma/client';
import { ModelManager } from '../ai/ModelManager';
import { createFFmpeg } from '@ffmpeg/ffmpeg';

const ffmpeg = createFFmpeg({ log: true });

interface BatchJob {
  id: string;
  type: 'image' | 'video';
  action: 'generate' | 'edit' | 'process';
  items: BatchItem[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  options: any;
}

interface BatchItem {
  id: string;
  input: string;
  output?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

export class BatchManager extends EventEmitter {
  private jobs: Map<string, BatchJob>;
  private modelManager: ModelManager;
  private prisma: PrismaClient;
  private processing: boolean;
  private maxConcurrent: number;

  constructor() {
    super();
    this.jobs = new Map();
    this.modelManager = new ModelManager();
    this.prisma = new PrismaClient();
    this.processing = false;
    this.maxConcurrent = 5;
  }

  async createBatchJob(
    type: 'image' | 'video',
    action: 'generate' | 'edit' | 'process',
    items: string[],
    options: any = {}
  ): Promise<string> {
    const jobId = uuidv4();
    const batchItems = items.map(input => ({
      id: uuidv4(),
      input,
      status: 'pending' as const,
    }));

    const job: BatchJob = {
      id: jobId,
      type,
      action,
      items: batchItems,
      status: 'pending',
      progress: 0,
      options,
    };

    this.jobs.set(jobId, job);
    this.emit('jobCreated', job);

    // Start processing if not already running
    if (!this.processing) {
      this.processBatchJobs();
    }

    return jobId;
  }

  private async processBatchJobs() {
    if (this.processing) return;
    this.processing = true;

    try {
      while (true) {
        // Find pending jobs
        const pendingJobs = Array.from(this.jobs.values())
          .filter(job => job.status === 'pending');

        if (pendingJobs.length === 0) break;

        // Process jobs concurrently up to maxConcurrent
        await Promise.all(
          pendingJobs.slice(0, this.maxConcurrent).map(job => this.processJob(job))
        );
      }
    } finally {
      this.processing = false;
    }
  }

  private async processJob(job: BatchJob) {
    job.status = 'processing';
    this.emit('jobStarted', job);

    try {
      const processedItems = await Promise.all(
        job.items.map(async (item, index) => {
          try {
            item.status = 'processing';
            this.emit('itemStarted', { jobId: job.id, item });

            let output: string;
            switch (job.action) {
              case 'generate':
                output = await this.generateContent(job.type, item.input, job.options);
                break;
              case 'edit':
                output = await this.editContent(job.type, item.input, job.options);
                break;
              case 'process':
                output = await this.processContent(job.type, item.input, job.options);
                break;
              default:
                throw new Error('Invalid action');
            }

            item.output = output;
            item.status = 'completed';
            
            // Update progress
            job.progress = ((index + 1) / job.items.length) * 100;
            this.emit('itemCompleted', { jobId: job.id, item });

            return item;
          } catch (error) {
            item.status = 'failed';
            item.error = error.message;
            this.emit('itemFailed', { jobId: job.id, item, error });
            throw error;
          }
        })
      );

      job.items = processedItems;
      job.status = 'completed';
      this.emit('jobCompleted', job);
    } catch (error) {
      job.status = 'failed';
      job.error = error.message;
      this.emit('jobFailed', { jobId: job.id, error });
    }
  }

  private async generateContent(
    type: 'image' | 'video',
    prompt: string,
    options: any
  ): Promise<string> {
    switch (type) {
      case 'image':
        return await this.modelManager.generateImage(prompt, options.model, options);
      case 'video':
        return await this.modelManager.generateVideo(prompt, options.model, options);
      default:
        throw new Error('Unsupported content type');
    }
  }

  private async editContent(
    type: 'image' | 'video',
    input: string,
    options: any
  ): Promise<string> {
    switch (type) {
      case 'image':
        return await this.modelManager.editImage(input, options.prompt, options.model, options);
      case 'video':
        // Implement video editing logic
        throw new Error('Video editing not implemented');
      default:
        throw new Error('Unsupported content type');
    }
  }

  private async processContent(
    type: 'image' | 'video',
    input: string,
    options: any
  ): Promise<string> {
    switch (type) {
      case 'image':
        // Process image using sharp
        return input; // Implement image processing

      case 'video':
        if (!ffmpeg.isLoaded()) {
          await ffmpeg.load();
        }

        // Process video using FFmpeg
        const inputFileName = `input_${uuidv4()}.mp4`;
        const outputFileName = `output_${uuidv4()}.mp4`;

        ffmpeg.FS('writeFile', inputFileName, await fetch(input).then(r => r.arrayBuffer()));

        const ffmpegArgs = this.buildFFmpegArgs(options, inputFileName, outputFileName);
        await ffmpeg.run(...ffmpegArgs);

        const data = ffmpeg.FS('readFile', outputFileName);
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        return URL.createObjectURL(blob);

      default:
        throw new Error('Unsupported content type');
    }
  }

  private buildFFmpegArgs(options: any, input: string, output: string): string[] {
    const args = ['-i', input];

    if (options.fps) args.push('-r', options.fps.toString());
    if (options.scale) args.push('-vf', `scale=${options.scale}`);
    if (options.bitrate) args.push('-b:v', options.bitrate);
    if (options.codec) args.push('-c:v', options.codec);
    if (options.filters) args.push('-vf', options.filters.join(','));

    args.push(output);
    return args;
  }

  getJobStatus(jobId: string): BatchJob | undefined {
    return this.jobs.get(jobId);
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'pending') {
      job.status = 'failed';
      job.error = 'Cancelled by user';
      this.emit('jobCancelled', job);
      return true;
    }
    return false;
  }

  clearCompletedJobs() {
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(jobId);
      }
    }
  }
}

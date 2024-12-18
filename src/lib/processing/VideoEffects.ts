import { createFFmpeg } from '@ffmpeg/ffmpeg';
import { v4 as uuidv4 } from 'uuid';

export interface VideoEffect {
  type: string;
  options: any;
}

export interface TransitionEffect {
  type: string;
  duration: number;
  options: any;
}

export class VideoEffects {
  private ffmpeg: any;

  constructor() {
    this.ffmpeg = createFFmpeg({ log: true });
  }

  async initialize() {
    if (!this.ffmpeg.isLoaded()) {
      await this.ffmpeg.load();
    }
  }

  async applyEffect(
    videoUrl: string,
    effect: VideoEffect
  ): Promise<string> {
    await this.initialize();

    const inputFileName = `input_${uuidv4()}.mp4`;
    const outputFileName = `output_${uuidv4()}.mp4`;

    try {
      // Write input file
      const videoData = await fetch(videoUrl).then(r => r.arrayBuffer());
      this.ffmpeg.FS('writeFile', inputFileName, new Uint8Array(videoData));

      // Apply effect
      const filterCommand = this.buildFilterCommand(effect);
      await this.ffmpeg.run(
        '-i', inputFileName,
        ...filterCommand,
        outputFileName
      );

      // Read output file
      const data = this.ffmpeg.FS('readFile', outputFileName);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      return URL.createObjectURL(blob);
    } finally {
      // Cleanup
      try {
        this.ffmpeg.FS('unlink', inputFileName);
        this.ffmpeg.FS('unlink', outputFileName);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
  }

  async addTransition(
    video1Url: string,
    video2Url: string,
    transition: TransitionEffect
  ): Promise<string> {
    await this.initialize();

    const input1FileName = `input1_${uuidv4()}.mp4`;
    const input2FileName = `input2_${uuidv4()}.mp4`;
    const outputFileName = `output_${uuidv4()}.mp4`;

    try {
      // Write input files
      const video1Data = await fetch(video1Url).then(r => r.arrayBuffer());
      const video2Data = await fetch(video2Url).then(r => r.arrayBuffer());
      
      this.ffmpeg.FS('writeFile', input1FileName, new Uint8Array(video1Data));
      this.ffmpeg.FS('writeFile', input2FileName, new Uint8Array(video2Data));

      // Apply transition
      const transitionCommand = this.buildTransitionCommand(
        input1FileName,
        input2FileName,
        transition
      );
      
      await this.ffmpeg.run(...transitionCommand, outputFileName);

      // Read output file
      const data = this.ffmpeg.FS('readFile', outputFileName);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      return URL.createObjectURL(blob);
    } finally {
      // Cleanup
      try {
        this.ffmpeg.FS('unlink', input1FileName);
        this.ffmpeg.FS('unlink', input2FileName);
        this.ffmpeg.FS('unlink', outputFileName);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
  }

  private buildFilterCommand(effect: VideoEffect): string[] {
    switch (effect.type) {
      case 'blur':
        return ['-vf', `boxblur=${effect.options.radius || 2}:${effect.options.power || 1}`];
      
      case 'brightness':
        return ['-vf', `eq=brightness=${effect.options.level || 0}`];
      
      case 'contrast':
        return ['-vf', `eq=contrast=${effect.options.level || 1}`];
      
      case 'saturation':
        return ['-vf', `eq=saturation=${effect.options.level || 1}`];
      
      case 'speed':
        return ['-filter:v', `setpts=${1/effect.options.factor}*PTS`];
      
      case 'reverse':
        return ['-vf', 'reverse'];
      
      case 'rotate':
        return ['-vf', `rotate=${effect.options.angle || 0}*PI/180`];
      
      case 'overlay':
        return [
          '-i', effect.options.overlayUrl,
          '-filter_complex', `[0:v][1:v]overlay=${effect.options.x || 0}:${effect.options.y || 0}`
        ];
      
      case 'chromakey':
        return [
          '-vf',
          `colorkey=${effect.options.color || 'green'}:${effect.options.similarity || 0.3}:${effect.options.blend || 0.1}`
        ];
      
      case 'denoise':
        return ['-vf', 'nlmeans'];
      
      case 'stabilize':
        return ['-vf', 'deshake'];
      
      case 'vignette':
        return ['-vf', 'vignette'];
      
      case 'pixelate':
        return ['-vf', `scale=iw/${effect.options.factor}:-1,scale=iw*${effect.options.factor}:-1`];
      
      default:
        throw new Error(`Unsupported effect type: ${effect.type}`);
    }
  }

  private buildTransitionCommand(
    input1: string,
    input2: string,
    transition: TransitionEffect
  ): string[] {
    const duration = transition.duration || 1;

    switch (transition.type) {
      case 'fade':
        return [
          '-i', input1,
          '-i', input2,
          '-filter_complex',
          `[0:v]fade=t=out:st=${duration}:d=${duration}[v0];` +
          `[1:v]fade=t=in:st=0:d=${duration}[v1];` +
          `[v0][v1]overlay`
        ];
      
      case 'wipe':
        return [
          '-i', input1,
          '-i', input2,
          '-filter_complex',
          `[0:v][1:v]xfade=transition=wipe${transition.options.direction || 'left'}:duration=${duration}`
        ];
      
      case 'dissolve':
        return [
          '-i', input1,
          '-i', input2,
          '-filter_complex',
          `[0:v][1:v]xfade=transition=dissolve:duration=${duration}`
        ];
      
      case 'slide':
        const direction = transition.options.direction || 'left';
        return [
          '-i', input1,
          '-i', input2,
          '-filter_complex',
          `[0:v][1:v]xfade=transition=slide${direction}:duration=${duration}`
        ];
      
      case 'zoom':
        return [
          '-i', input1,
          '-i', input2,
          '-filter_complex',
          `[0:v][1:v]xfade=transition=zoom${transition.options.direction || 'in'}:duration=${duration}`
        ];
      
      case 'pixelize':
        return [
          '-i', input1,
          '-i', input2,
          '-filter_complex',
          `[0:v][1:v]xfade=transition=pixelize:duration=${duration}`
        ];
      
      default:
        throw new Error(`Unsupported transition type: ${transition.type}`);
    }
  }

  async addAudioEffect(
    videoUrl: string,
    audioEffect: {
      type: string;
      options: any;
    }
  ): Promise<string> {
    await this.initialize();

    const inputFileName = `input_${uuidv4()}.mp4`;
    const outputFileName = `output_${uuidv4()}.mp4`;

    try {
      const videoData = await fetch(videoUrl).then(r => r.arrayBuffer());
      this.ffmpeg.FS('writeFile', inputFileName, new Uint8Array(videoData));

      const audioFilter = this.buildAudioFilterCommand(audioEffect);
      await this.ffmpeg.run(
        '-i', inputFileName,
        ...audioFilter,
        outputFileName
      );

      const data = this.ffmpeg.FS('readFile', outputFileName);
      const blob = new Blob([data.buffer], { type: 'video/mp4' });
      return URL.createObjectURL(blob);
    } finally {
      try {
        this.ffmpeg.FS('unlink', inputFileName);
        this.ffmpeg.FS('unlink', outputFileName);
      } catch (e) {
        console.error('Cleanup error:', e);
      }
    }
  }

  private buildAudioFilterCommand(audioEffect: { type: string; options: any }): string[] {
    switch (audioEffect.type) {
      case 'volume':
        return ['-af', `volume=${audioEffect.options.level || 1}`];
      
      case 'fade':
        return [
          '-af',
          `afade=t=${audioEffect.options.type || 'in'}:st=${audioEffect.options.start || 0}:d=${audioEffect.options.duration || 1}`
        ];
      
      case 'echo':
        return ['-af', 'aecho=0.8:0.9:1000:0.3'];
      
      case 'bass':
        return ['-af', `bass=g=${audioEffect.options.gain || 0}`];
      
      case 'treble':
        return ['-af', `treble=g=${audioEffect.options.gain || 0}`];
      
      case 'normalize':
        return ['-af', 'loudnorm'];
      
      default:
        throw new Error(`Unsupported audio effect type: ${audioEffect.type}`);
    }
  }
}

import {
  BAND_COUNT,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  ScaleId,
  StyleId,
  ScanMode,
  SPEED_INTERVALS_MS,
} from './presets';
import {
  analyzeImageData,
  AnalysisResult,
  BandData,
  AnalyzeOptions,
} from './analyzer';
import { mapBandToEvents, AudioNoteEvent, MappedBandOutput } from './mapping';
import { selectStyle } from './styleSelector';
import { SonificationEngine } from './SonificationEngine';
import { Narrator } from './narrator';

export type ImageSource =
  | string
  | HTMLImageElement
  | HTMLCanvasElement
  | File
  | Blob
  | ImageData;

export interface ImageSonifierStepInfo {
  bandIndex: number;
  totalBands: number;
  band: BandData;
  events: AudioNoteEvent[];
  output: MappedBandOutput;
  caption: string;
  progress: number;
  peakY: number;
  featureColor: string;
}

export interface ImageSonifierOptions {
  bandCount?: number;
  scanMode?: ScanMode;
  style?: StyleId;
  scaleId?: ScaleId;
  speed?: number;
  volume?: number;
  loop?: boolean;
  enableNarration?: boolean;
  engine?: SonificationEngine;
  narrator?: Narrator;
  onStep?: (info: ImageSonifierStepInfo) => void;
  onComplete?: (result: AnalysisResult) => void;
  onError?: (err: Error) => void;
  onImageLoaded?: (dimensions: { width: number; height: number }) => void;
}

export class ImageSonifier {
  private engine: SonificationEngine;
  private narrator: Narrator;
  private options: Required<Omit<ImageSonifierOptions, 'engine' | 'narrator' | 'onStep' | 'onComplete' | 'onError' | 'onImageLoaded'>> & {
    onStep?: (info: ImageSonifierStepInfo) => void;
    onComplete?: (result: AnalysisResult) => void;
    onError?: (err: Error) => void;
    onImageLoaded?: (dimensions: { width: number; height: number }) => void;
  };

  private pixelData: Uint8ClampedArray | null = null;
  private imageWidth: number = CANVAS_WIDTH;
  private imageHeight: number = CANVAS_HEIGHT;
  private analysisResult: AnalysisResult | null = null;
  private resolvedStyle: Exclude<StyleId, 'auto'> = 'duet';

  private currentBandIndex: number = 0;
  private isPlaying: boolean = false;
  private isAnalyzing: boolean = false;

  constructor(options: ImageSonifierOptions = {}) {
    this.engine = options.engine || new SonificationEngine();
    this.narrator = options.narrator || new Narrator();

    this.options = {
      bandCount: options.bandCount || BAND_COUNT,
      scanMode: options.scanMode || 'lr',
      style: options.style || 'auto',
      scaleId: options.scaleId || 'pentatonic',
      speed: options.speed || 3,
      volume: options.volume !== undefined ? options.volume : 0.75,
      loop: options.loop !== undefined ? options.loop : true,
      enableNarration: options.enableNarration || false,
      onStep: options.onStep,
      onComplete: options.onComplete,
      onError: options.onError,
      onImageLoaded: options.onImageLoaded,
    };

    this.engine.setVolume(this.options.volume);
  }

  public async loadImage(source: ImageSource): Promise<ImageData> {
    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('ImageSonifier: Unable to create 2D Canvas context');
    }

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (source instanceof ImageData) {
      this.pixelData = new Uint8ClampedArray(source.data);
      this.imageWidth = source.width;
      this.imageHeight = source.height;
      this.options.onImageLoaded?.({ width: source.width, height: source.height });
      return source;
    }

    let imgElement: HTMLImageElement | HTMLCanvasElement;

    if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
      imgElement = source;
    } else if (source instanceof File || source instanceof Blob) {
      const url = URL.createObjectURL(source);
      try {
        imgElement = await this.loadHtmlImage(url);
      } finally {
        URL.revokeObjectURL(url);
      }
    } else if (typeof source === 'string') {
      imgElement = await this.loadHtmlImage(source);
    } else {
      throw new Error('ImageSonifier: Unsupported image source format');
    }

    ctx.drawImage(imgElement, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.pixelData = imgData.data;
    this.imageWidth = CANVAS_WIDTH;
    this.imageHeight = CANVAS_HEIGHT;
    this.options.onImageLoaded?.({ width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

    return imgData;
  }

  private loadHtmlImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error(`ImageSonifier: Failed to load image from "${url}": ${err}`));
      img.src = url;
    });
  }

  public async sonify(source: ImageSource, startIndex: number = 0): Promise<void> {
    try {
      this.isAnalyzing = true;
      this.engine.init();
      this.engine.setVolume(this.options.volume);

      await this.loadImage(source);

      if (!this.pixelData) {
        throw new Error('ImageSonifier: Pixel data is null after loading image');
      }

      const analyzeOpts: AnalyzeOptions = {
        bandCount: this.options.bandCount,
        scanMode: this.options.scanMode,
      };

      this.analysisResult = analyzeImageData(
        this.pixelData,
        this.imageWidth,
        this.imageHeight,
        analyzeOpts
      );

      if (this.options.style === 'auto') {
        this.resolvedStyle = selectStyle(this.analysisResult.summary);
      } else {
        this.resolvedStyle = this.options.style as Exclude<StyleId, 'auto'>;
      }

      this.isAnalyzing = false;
      this.currentBandIndex = Math.max(0, Math.min(this.options.bandCount - 1, startIndex));

      this.startPlaybackLoop();
    } catch (err) {
      this.isAnalyzing = false;
      this.isPlaying = false;
      const error = err instanceof Error ? err : new Error(String(err));
      this.options.onError?.(error);
      throw error;
    }
  }

  public step(bandIndex?: number): ImageSonifierStepInfo | null {
    if (bandIndex !== undefined) {
      this.currentBandIndex = Math.max(0, Math.min(this.options.bandCount - 1, bandIndex));
    }

    if (!this.analysisResult || !this.analysisResult.bands[this.currentBandIndex]) {
      return null;
    }

    const band = this.analysisResult.bands[this.currentBandIndex];
    const output = mapBandToEvents(band, {
      style: this.resolvedStyle,
      scaleId: this.options.scaleId,
      maxBrightness: this.analysisResult.maxBrightness,
      bandCount: this.options.bandCount,
      bandIndex: this.currentBandIndex,
    });

    this.engine.scheduleEvents(output.events);

    if (this.options.enableNarration && output.caption) {
      const intervalMs = SPEED_INTERVALS_MS[Math.max(0, Math.min(4, this.options.speed - 1))];
      this.narrator.updateCaption(output.caption, intervalMs);
    }

    const stepInfo: ImageSonifierStepInfo = {
      bandIndex: this.currentBandIndex,
      totalBands: this.options.bandCount,
      band,
      events: output.events,
      output,
      caption: output.caption,
      progress: (this.currentBandIndex + 1) / this.options.bandCount,
      peakY: band.peakY,
      featureColor: band.featureColor,
    };

    this.options.onStep?.(stepInfo);

    return stepInfo;
  }

  private startPlaybackLoop(): void {
    this.isPlaying = true;
    this.step();

    const getStepSec = () => {
      const ms = SPEED_INTERVALS_MS[Math.max(0, Math.min(4, this.options.speed - 1))];
      return ms / 1000;
    };

    this.engine.startScheduler(getStepSec, () => {
      if (!this.isPlaying) return;

      const nextIndex = this.currentBandIndex + 1;
      if (nextIndex >= this.options.bandCount) {
        if (this.analysisResult) {
          this.options.onComplete?.(this.analysisResult);
        }
        if (this.options.loop) {
          this.currentBandIndex = 0;
          this.step();
        } else {
          this.pause();
        }
      } else {
        this.currentBandIndex = nextIndex;
        this.step();
      }
    });
  }

  public async playInstantChord(source?: ImageSource): Promise<AudioNoteEvent[]> {
    if (source) {
      await this.loadImage(source);
    }

    if (!this.pixelData) {
      throw new Error('ImageSonifier: No image data loaded for instant chord');
    }

    this.engine.init();
    this.engine.setVolume(this.options.volume);

    if (!this.analysisResult) {
      this.analysisResult = analyzeImageData(
        this.pixelData,
        this.imageWidth,
        this.imageHeight,
        { bandCount: this.options.bandCount, scanMode: this.options.scanMode }
      );
    }

    const { summary, maxBrightness } = this.analysisResult;
    const chordEvents: AudioNoteEvent[] = [];

    const baseFreq = 110 + (1 - summary.darkFraction) * 110;
    chordEvents.push({
      freq: baseFreq,
      gain: 0.05,
      duration: 2.5,
      wave: 'sine',
      pan: 0,
    });

    const warmRatio = summary.bucketShare.warm;
    const coolRatio = summary.bucketShare.cool;

    if (warmRatio > 0.05) {
      chordEvents.push({
        freq: baseFreq * 1.5,
        gain: 0.03 + Math.min(0.06, warmRatio * 0.1),
        duration: 2.2,
        wave: 'triangle',
        pan: 0.4,
      });
      chordEvents.push({
        freq: baseFreq * 2.0,
        gain: 0.02 + Math.min(0.04, warmRatio * 0.08),
        duration: 2.0,
        wave: 'sine',
        pan: 0.6,
      });
    }

    if (coolRatio > 0.05) {
      chordEvents.push({
        freq: baseFreq * 1.25,
        gain: 0.03 + Math.min(0.06, coolRatio * 0.1),
        duration: 2.4,
        wave: 'sine',
        pan: -0.4,
      });
      chordEvents.push({
        freq: baseFreq * 0.75,
        gain: 0.03,
        duration: 2.6,
        wave: 'sine',
        pan: -0.2,
      });
    }

    if (summary.edgeDensity > 0.05) {
      chordEvents.push({
        freq: baseFreq * 4.0,
        gain: 0.015 + Math.min(0.03, summary.edgeDensity * 0.05),
        duration: 1.2,
        wave: 'triangle',
        pan: 0.2,
      });
    }

    if (maxBrightness > 0.3) {
      chordEvents.push({
        freq: baseFreq * 3.0,
        gain: 0.02,
        duration: 1.5,
        wave: 'sine',
        pan: -0.5,
      });
    }

    this.engine.scheduleEvents(chordEvents);
    return chordEvents;
  }

  public play(): void {
    if (this.isPlaying) return;
    if (!this.analysisResult) {
      if (this.pixelData) {
        this.analysisResult = analyzeImageData(this.pixelData, this.imageWidth, this.imageHeight, {
          bandCount: this.options.bandCount,
          scanMode: this.options.scanMode,
        });
      } else {
        throw new Error('ImageSonifier: No image loaded. Call sonify(imageSource) first.');
      }
    }
    this.startPlaybackLoop();
  }

  public pause(): void {
    this.isPlaying = false;
    this.engine.stopScheduler();
  }

  public stop(): void {
    this.isPlaying = false;
    this.engine.stopScheduler();
    this.currentBandIndex = 0;
  }

  public seek(bandIndex: number): ImageSonifierStepInfo | null {
    this.currentBandIndex = Math.max(0, Math.min(this.options.bandCount - 1, bandIndex));
    return this.step(this.currentBandIndex);
  }

  public setSpeed(speed: number): void {
    this.options.speed = Math.max(1, Math.min(5, speed));
  }

  public setVolume(volume: number): void {
    this.options.volume = Math.max(0, Math.min(1, volume));
    this.engine.setVolume(this.options.volume);
  }

  public setStyle(style: StyleId): void {
    this.options.style = style;
    if (style === 'auto') {
      if (this.analysisResult) {
        this.resolvedStyle = selectStyle(this.analysisResult.summary);
      }
    } else {
      this.resolvedStyle = style as Exclude<StyleId, 'auto'>;
    }
  }

  public setScale(scaleId: ScaleId): void {
    this.options.scaleId = scaleId;
  }

  public setLoop(loop: boolean): void {
    this.options.loop = loop;
  }

  public setNarrationEnabled(enabled: boolean): void {
    this.options.enableNarration = enabled;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  public getIsAnalyzing(): boolean {
    return this.isAnalyzing;
  }

  public getCurrentBandIndex(): number {
    return this.currentBandIndex;
  }

  public getAnalysisResult(): AnalysisResult | null {
    return this.analysisResult;
  }

  public getResolvedStyle(): Exclude<StyleId, 'auto'> {
    return this.resolvedStyle;
  }

  public getAudioEngine(): SonificationEngine {
    return this.engine;
  }

  public destroy(): void {
    this.stop();
    this.pixelData = null;
    this.analysisResult = null;
  }
}

export async function sonifyImage(
  source: ImageSource,
  options: ImageSonifierOptions = {}
): Promise<ImageSonifier> {
  const sonifier = new ImageSonifier(options);
  await sonifier.sonify(source);
  return sonifier;
}

export async function playImageChord(
  source: ImageSource,
  options: ImageSonifierOptions = {}
): Promise<{ sonifier: ImageSonifier; events: AudioNoteEvent[] }> {
  const sonifier = new ImageSonifier(options);
  const events = await sonifier.playInstantChord(source);
  return { sonifier, events };
}

export const sonifyScanLine = (img: ImageData, x: number, ac: AudioContext, dur = 0.3) => Array.from({ length: img.height }, (_, y) => { const idx = (y * img.width + x) * 4, r = img.data[idx], g = img.data[idx + 1], bl = img.data[idx + 2], mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), sat = mx ? (mx - mn) / mx : 0, b = (r * 0.299 + g * 0.587 + bl * 0.114) / 255; return { y, b, sat }; }).filter(({ y, b, sat }) => y >= img.height * 0.22 && y <= img.height * 0.78 && b > 0.05 && !(b > 0.55 && sat < 0.25)).forEach(({ y, b }) => { const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = 'sine'; o.frequency.setValueAtTime(100 + (1 - y / img.height) * 1000, t); g.gain.setValueAtTime(b * 0.02, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur); });

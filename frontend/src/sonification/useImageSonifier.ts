import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ImageSonifier,
  ImageSonifierOptions,
  ImageSonifierStepInfo,
  ImageSource,
} from './ImageSonifier';
import { AnalysisResult } from './analyzer';
import { ScaleId, StyleId } from './presets';

export interface UseImageSonifierOptions extends Omit<ImageSonifierOptions, 'onStep' | 'onComplete' | 'onError'> {
  autoPlay?: boolean;
  initialSource?: ImageSource;
}

export interface UseImageSonifierReturn {
  sonifier: ImageSonifier | null;
  isPlaying: boolean;
  isAnalyzing: boolean;
  currentBandIndex: number;
  currentStep: ImageSonifierStepInfo | null;
  analysisResult: AnalysisResult | null;
  resolvedStyle: Exclude<StyleId, 'auto'>;
  sonify: (source: ImageSource, startIndex?: number) => Promise<void>;
  playInstantChord: (source?: ImageSource) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (bandIndex: number) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setStyle: (style: StyleId) => void;
  setScale: (scale: ScaleId) => void;
}

export function useImageSonifier(
  options: UseImageSonifierOptions = {}
): UseImageSonifierReturn {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [currentBandIndex, setCurrentBandIndex] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<ImageSonifierStepInfo | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [resolvedStyle, setResolvedStyle] = useState<Exclude<StyleId, 'auto'>>('duet');

  const sonifierRef = useRef<ImageSonifier | null>(null);

  useEffect(() => {
    const sonifier = new ImageSonifier({
      ...options,
      onStep: (info) => {
        setCurrentBandIndex(info.bandIndex);
        setCurrentStep(info);
      },
      onComplete: (res) => {
        setAnalysisResult(res);
      },
      onError: (err) => {
        console.error('useImageSonifier error:', err);
        setIsPlaying(false);
        setIsAnalyzing(false);
      },
    });

    sonifierRef.current = sonifier;

    if (options.initialSource && options.autoPlay) {
      sonifier.sonify(options.initialSource).then(() => {
        setIsPlaying(true);
        setAnalysisResult(sonifier.getAnalysisResult());
        setResolvedStyle(sonifier.getResolvedStyle());
      }).catch((e) => console.warn(e));
    }

    return () => {
      sonifier.destroy();
    };
  }, []);

  const sonify = useCallback(async (source: ImageSource, startIndex = 0) => {
    if (!sonifierRef.current) return;
    setIsAnalyzing(true);
    try {
      await sonifierRef.current.sonify(source, startIndex);
      setIsPlaying(true);
      setAnalysisResult(sonifierRef.current.getAnalysisResult());
      setResolvedStyle(sonifierRef.current.getResolvedStyle());
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const playInstantChord = useCallback(async (source?: ImageSource) => {
    if (!sonifierRef.current) return;
    setIsAnalyzing(true);
    try {
      await sonifierRef.current.playInstantChord(source);
      setAnalysisResult(sonifierRef.current.getAnalysisResult());
      setResolvedStyle(sonifierRef.current.getResolvedStyle());
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const play = useCallback(() => {
    if (!sonifierRef.current) return;
    sonifierRef.current.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    if (!sonifierRef.current) return;
    sonifierRef.current.pause();
    setIsPlaying(false);
  }, []);

  const stop = useCallback(() => {
    if (!sonifierRef.current) return;
    sonifierRef.current.stop();
    setIsPlaying(false);
    setCurrentBandIndex(0);
  }, []);

  const seek = useCallback((bandIndex: number) => {
    if (!sonifierRef.current) return;
    const info = sonifierRef.current.seek(bandIndex);
    if (info) {
      setCurrentBandIndex(info.bandIndex);
      setCurrentStep(info);
    }
  }, []);

  const setSpeed = useCallback((speed: number) => {
    sonifierRef.current?.setSpeed(speed);
  }, []);

  const setVolume = useCallback((volume: number) => {
    sonifierRef.current?.setVolume(volume);
  }, []);

  const setStyle = useCallback((style: StyleId) => {
    sonifierRef.current?.setStyle(style);
    if (sonifierRef.current) {
      setResolvedStyle(sonifierRef.current.getResolvedStyle());
    }
  }, []);

  const setScale = useCallback((scale: ScaleId) => {
    sonifierRef.current?.setScale(scale);
  }, []);

  return {
    sonifier: sonifierRef.current,
    isPlaying,
    isAnalyzing,
    currentBandIndex,
    currentStep,
    analysisResult,
    resolvedStyle,
    sonify,
    playInstantChord,
    play,
    pause,
    stop,
    seek,
    setSpeed,
    setVolume,
    setStyle,
    setScale,
  };
}

import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Earth } from './Earth';
import { Mars, Saturn, Moon } from './Planets';
import { Starfield } from './Starfield';
import { EarthSkeleton } from './EarthSkeleton';

export interface PlanetSceneProps {
  textureUrl?: string;
  customTexture?: THREE.Texture | null;
  currentBandIndex?: number;
  isPlaying?: boolean;
  activeStyle?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  loadingSubMessage?: string;
}

function SceneContent(props: PlanetSceneProps) {
  return (
    <>
      {/* Natural, uniform celestial illumination without harsh spot lights */}
      <ambientLight intensity={1.5} color="#ffffff" />
      <directionalLight position={[6, 4, 5]} intensity={0.7} color="#ffffff" />
      <directionalLight position={[-5, 2, -4]} intensity={0.4} color="#dbeafe" />

      {/* Crisp background starfield */}
      <Starfield />

      {/* Clean 3D Earth with Sonification Scan Line */}
      <Earth
        textureUrl={props.textureUrl}
        customTexture={props.customTexture}
        currentBandIndex={props.currentBandIndex ?? 0}
        isPlaying={props.isPlaying ?? false}
        activeStyle={props.activeStyle}
      />

      {/* Photorealistic Orbiting Celestial Bodies */}
      <Mars />
      <Saturn />
      <Moon orbitRadius={1.75} speed={0.2} size={0.08} />

      {/* 3D OrbitControls for smooth inspection of the planet */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        rotateSpeed={0.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={(Math.PI * 3) / 4}
      />
    </>
  );
}

function LoadingFallback() {
  return null;
}

export const PlanetScene: React.FC<PlanetSceneProps> = (props) => {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#06080e]">
      <Canvas
        camera={{
          position: [0, 0.15, 3.1],
          fov: 46,
          near: 0.1,
          far: 200,
        }}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        style={{
          background: '#06080e',
          width: '100%',
          height: '100%',
        }}
      >
        <Suspense fallback={<LoadingFallback />}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>

      {/* Skeleton UI shown during live NASA scraping / texture loading */}
      <EarthSkeleton
        isLoading={Boolean(props.isLoading)}
        message={props.loadingMessage}
        subMessage={props.loadingSubMessage}
      />
    </div>
  );
};

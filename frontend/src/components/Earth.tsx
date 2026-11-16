import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { BAND_COUNT } from '../sonification/presets';
import { resolveTextureUrl } from '../utils/textureUrl';

export interface EarthProps {
  textureUrl?: string;
  customTexture?: THREE.Texture | null;
  currentBandIndex: number;
  isPlaying: boolean;
  activeStyle?: string;
}

// Delicate, natural atmospheric Fresnel rim
const AtmosphereShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform vec3 glowColor;
    void main() {
      vec3 viewDir = normalize(-vPosition);
      float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
      float intensity = pow(rim, 3.8) * 1.2;
      gl_FragColor = vec4(glowColor, intensity);
    }
  `,
};

class MeridianCurve extends THREE.Curve<THREE.Vector3> {
  private radius: number;
  constructor(radius = 1.018) {
    super();
    this.radius = radius;
  }
  getPoint(t: number): THREE.Vector3 {
    const theta = t * Math.PI;
    const x = -this.radius * Math.sin(theta);
    const y = this.radius * Math.cos(theta);
    const z = 0;
    return new THREE.Vector3(x, y, z);
  }
}

/**
 * 3D Sonification Line hugging the planetary surface.
 */
function SonificationScanLine({
  currentBandIndex,
  isPlaying,
  activeStyle = 'duet',
}: {
  currentBandIndex: number;
  isPlaying: boolean;
  activeStyle?: string;
}) {
  const scanGroupRef = useRef<THREE.Group>(null);

  // Compute rotation angle around Y matching texture longitude
  const phi = (currentBandIndex / BAND_COUNT) * 2 * Math.PI;

  const styleColors = useMemo(() => {
    switch (activeStyle) {
      case 'sparkle':
        return { primary: '#facc15', glow: '#fbbf24' };
      case 'flow':
        return { primary: '#2dd4bf', glow: '#06b6d4' };
      case 'layers':
        return { primary: '#e879f9', glow: '#c084fc' };
      case 'field':
        return { primary: '#38bdf8', glow: '#0284c7' };
      case 'duet':
      default:
        return { primary: '#38bdf8', glow: '#fb923c' };
    }
  }, [activeStyle]);

  const meridianCurve = useMemo(() => new MeridianCurve(1.018), []);
  const coreTubeGeo = useMemo(
    () => new THREE.TubeGeometry(meridianCurve, 64, 0.0035, 8, false),
    [meridianCurve]
  );
  const haloTubeGeo = useMemo(
    () => new THREE.TubeGeometry(meridianCurve, 64, 0.012, 8, false),
    [meridianCurve]
  );

  return (
    <group ref={scanGroupRef} rotation-y={phi}>
      {/* 1. Luminous Laser Core Line */}
      <mesh geometry={coreTubeGeo}>
        <meshBasicMaterial color={styleColors.primary} />
      </mesh>

      {/* 2. Outer Holographic Glow Halo */}
      <mesh geometry={haloTubeGeo}>
        <meshBasicMaterial
          color={styleColors.glow}
          transparent
          opacity={isPlaying ? 0.45 : 0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export const Earth: React.FC<EarthProps> = ({
  textureUrl = resolveTextureUrl('textures/sea_surface_temperature.png'),
  customTexture = null,
  currentBandIndex = 0,
  isPlaying = false,
  activeStyle = 'flow',
}) => {
  const earthGroupRef = useRef<THREE.Group>(null);
  const cloudMeshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Preload known NASA datasets: Sea Surface Temperature, Eyes on Earth, Global Precipitation
  const [
    sstTex,
    eyesOnEarthTex,
    precipitationTex,
  ] = useLoader(THREE.TextureLoader, [
    resolveTextureUrl('textures/sea_surface_temperature.png'),
    resolveTextureUrl('textures/eyes_on_earth_now.jpg'),
    resolveTextureUrl('textures/imergert_1080p.now.png'),
  ]);

  useMemo(() => {
    sstTex.colorSpace = THREE.SRGBColorSpace;
    eyesOnEarthTex.colorSpace = THREE.SRGBColorSpace;
    precipitationTex.colorSpace = THREE.SRGBColorSpace;
  }, [sstTex, eyesOnEarthTex, precipitationTex]);

  // Dynamic texture loader for live scraped textures
  const [dynamicTexture, setDynamicTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    if (customTexture) return;
    if (!textureUrl) return;

    // Check if textureUrl matches preloaded static textures
    if (
      textureUrl.includes('sea_surface_temperature') ||
      textureUrl.includes('eyes_on_earth_now') ||
      textureUrl.includes('imergert_1080p')
    ) {
      setDynamicTexture(null);
      return;
    }

    let isCancelled = false;
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');

    loader.load(
      resolveTextureUrl(textureUrl),
      (tex) => {
        if (isCancelled) {
          tex.dispose();
          return;
        }
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.needsUpdate = true;
        setDynamicTexture(tex);
      },
      undefined,
      (err) => {
        console.warn('Dynamic texture load fallback:', textureUrl, err);
      }
    );

    return () => {
      isCancelled = true;
    };
  }, [textureUrl, customTexture]);

  const activeTexture = useMemo(() => {
    if (customTexture) return customTexture;
    if (dynamicTexture) return dynamicTexture;
    if (textureUrl.includes('eyes_on_earth')) return eyesOnEarthTex;
    if (textureUrl.includes('imergert') || textureUrl.includes('precip')) return precipitationTex;
    if (textureUrl.includes('sea_surface') || textureUrl.includes('temperature') || textureUrl.includes('sst')) return sstTex;
    return sstTex;
  }, [customTexture, dynamicTexture, textureUrl, sstTex, eyesOnEarthTex, precipitationTex]);

  const atmosphereUniforms = useMemo(
    () => ({
      glowColor: { value: new THREE.Color('#38bdf8') },
    }),
    []
  );

  useFrame((_state, delta) => {
    if (earthGroupRef.current) {
      // Gentle natural celestial drift
      const speed = isHovered ? 0.015 : 0.035;
      earthGroupRef.current.rotation.y += delta * speed;
    }
    if (cloudMeshRef.current) {
      cloudMeshRef.current.rotation.y += delta * 0.012;
    }
  });

  return (
    <group ref={earthGroupRef}>
      {/* 3D Planetary Sphere - Pure visual planet with no touch-to-play triggers and no place pins */}
      <mesh
        onPointerEnter={() => setIsHovered(true)}
        onPointerLeave={() => setIsHovered(false)}
      >
        <sphereGeometry args={[1, 64, 64]} />
        <meshStandardMaterial
          map={activeTexture}
          roughness={0.92}
          metalness={0.0}
        />
      </mesh>

      {/* 3D Sonification Line */}
      <SonificationScanLine
        currentBandIndex={currentBandIndex}
        isPlaying={isPlaying}
        activeStyle={activeStyle}
      />

      {/* Natural Atmosphere Limb */}
      <mesh>
        <sphereGeometry args={[1.022, 64, 64]} />
        <shaderMaterial
          vertexShader={AtmosphereShader.vertexShader}
          fragmentShader={AtmosphereShader.fragmentShader}
          uniforms={atmosphereUniforms}
          transparent
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.FrontSide}
        />
      </mesh>
    </group>
  );
};

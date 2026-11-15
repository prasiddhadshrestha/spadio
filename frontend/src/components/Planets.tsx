import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

// Photorealistic Mars using NASA Viking/MGS orbital mosaic
export const Mars: React.FC = () => {
  const marsRef = useRef<THREE.Mesh>(null);
  const marsTexture = useLoader(THREE.TextureLoader, '/textures/mars.jpg');

  useMemo(() => {
    marsTexture.colorSpace = THREE.SRGBColorSpace;
  }, [marsTexture]);

  useFrame((_state, delta) => {
    if (marsRef.current) {
      marsRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group position={[2.5, 0.35, -0.7]} rotation={[0, 0, (25.2 * Math.PI) / 180]}>
      <mesh ref={marsRef}>
        <sphereGeometry args={[0.38, 48, 48]} />
        <meshStandardMaterial
          map={marsTexture}
          roughness={0.88}
          metalness={0.02}
        />
      </mesh>
    </group>
  );
};

// Photorealistic Moon orbiting Earth
export const Moon: React.FC<{ orbitRadius?: number; speed?: number; size?: number }> = ({
  orbitRadius = 1.75,
  speed = 0.22,
  size = 0.08,
}) => {
  const moonRef = useRef<THREE.Mesh>(null);
  const moonTexture = useLoader(THREE.TextureLoader, '/textures/moon.jpg');

  useMemo(() => {
    moonTexture.colorSpace = THREE.SRGBColorSpace;
  }, [moonTexture]);

  useFrame((state) => {
    if (moonRef.current) {
      const t = state.clock.getElapsedTime() * speed;
      moonRef.current.position.x = Math.cos(t) * orbitRadius;
      moonRef.current.position.z = Math.sin(t) * orbitRadius;
      moonRef.current.position.y = Math.sin(t * 0.4) * 0.25;
      moonRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh ref={moonRef}>
      <sphereGeometry args={[size, 32, 32]} />
      <meshStandardMaterial
        map={moonTexture}
        roughness={0.92}
        metalness={0.0}
      />
    </mesh>
  );
};

// Realistic Saturn with gas bands and ring system (with Cassini division)
export const Saturn: React.FC = () => {
  const saturnBodyRef = useRef<THREE.Mesh>(null);
  const saturnTexture = useLoader(THREE.TextureLoader, '/textures/saturn.jpg');

  useMemo(() => {
    saturnTexture.colorSpace = THREE.SRGBColorSpace;
  }, [saturnTexture]);

  // Generate procedural high-res ring texture with realistic particle dust bands
  const ringTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 1;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0.0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.15, 'rgba(165,150,120,0.25)'); // D ring
    grad.addColorStop(0.28, 'rgba(190,175,145,0.7)');  // C ring
    grad.addColorStop(0.55, 'rgba(215,200,165,0.95)'); // B ring (dense)
    grad.addColorStop(0.58, 'rgba(10,8,6,0.1)');        // Cassini division
    grad.addColorStop(0.62, 'rgba(195,180,150,0.85)'); // A ring
    grad.addColorStop(0.85, 'rgba(170,155,130,0.6)');  // Encke gap outer
    grad.addColorStop(1.0, 'rgba(0,0,0,0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 1);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }, []);

  useFrame((_state, delta) => {
    if (saturnBodyRef.current) {
      saturnBodyRef.current.rotation.y += delta * 0.04;
    }
  });

  return (
    <group position={[-2.7, 0.95, -1.8]} rotation={[(26.7 * Math.PI) / 180, 0, 0.2]}>
      {/* Saturn Body */}
      <mesh ref={saturnBodyRef}>
        <sphereGeometry args={[0.26, 36, 36]} />
        <meshStandardMaterial
          map={saturnTexture}
          roughness={0.75}
          metalness={0.05}
        />
      </mesh>

      {/* Planetary Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.62, 64]} />
        <meshStandardMaterial
          map={ringTexture}
          side={THREE.DoubleSide}
          transparent
          opacity={0.88}
          roughness={0.8}
        />
      </mesh>
    </group>
  );
};

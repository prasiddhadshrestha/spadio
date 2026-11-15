import * as THREE from 'three';
import { HOTSPOTS } from './climateData.js';

function latLngTo3D(lat, lng, radius) {
  const phi = ((lng + 180) * Math.PI) / 180;
  const theta = ((90 - lat) * Math.PI) / 180;
  const x = -radius * Math.cos(phi) * Math.sin(theta);
  const y = radius * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

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
      float intensity = pow(rim, 3.4) * 1.3;
      gl_FragColor = vec4(glowColor, intensity);
    }
  `
};

export class EarthGlobe {
  constructor(container, onSelectHotspot) {
    this.container = container;
    this.onSelectHotspot = onSelectHotspot;
    this.animId = null;
    this.isDragging = false;
    this.prevMousePos = { x: 0, y: 0 };
    this.rotVelocity = { x: 0.0005, y: 0.001 };
    this.targetRotation = { x: 0.2, y: 0 };
    this.currentRotation = { x: 0.2, y: 0 };

    this.init();
  }

  init() {
    const width = this.container.clientWidth || 640;
    const height = this.container.clientHeight || 420;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(0, 0, 2.8);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Subtle starfield ambient lighting + directional sunlight
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.6);
    sunLight.position.set(5, 3, 4);
    this.scene.add(sunLight);

    this.earthGroup = new THREE.Group();
    this.scene.add(this.earthGroup);

    // Textures
    const textureLoader = new THREE.TextureLoader();
    const dayTexture = textureLoader.load('/textures/earth_day.jpg');
    const specularTexture = textureLoader.load('/textures/earth_specular.jpg');
    const cloudsTexture = textureLoader.load('/textures/earth_clouds.png');

    dayTexture.colorSpace = THREE.SRGBColorSpace;
    cloudsTexture.colorSpace = THREE.SRGBColorSpace;

    // Earth Sphere
    const sphereGeo = new THREE.SphereGeometry(1, 64, 64);
    this.earthMat = new THREE.MeshStandardMaterial({
      map: dayTexture,
      roughnessMap: specularTexture,
      roughness: 0.45,
      metalness: 0.05
    });
    this.earthMesh = new THREE.Mesh(sphereGeo, this.earthMat);
    this.earthGroup.add(this.earthMesh);

    // Cloud Layer
    const cloudGeo = new THREE.SphereGeometry(1.014, 64, 64);
    this.cloudMat = new THREE.MeshStandardMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    this.cloudMesh = new THREE.Mesh(cloudGeo, this.cloudMat);
    this.earthGroup.add(this.cloudMesh);

    // Atmosphere Rim
    this.atmosphereUniforms = {
      glowColor: { value: new THREE.Color('#38bdf8') }
    };
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: AtmosphereShader.vertexShader,
      fragmentShader: AtmosphereShader.fragmentShader,
      uniforms: this.atmosphereUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide
    });
    const atmosphereMesh = new THREE.Mesh(new THREE.SphereGeometry(1.025, 64, 64), atmosphereMat);
    this.earthGroup.add(atmosphereMesh);

    // Hotspots
    this.hotspotMeshes = [];
    this.buildHotspots();

    // Interaction Handlers
    this.setupInteractions();

    // Resize Observer
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);

    this.animate = this.animate.bind(this);
    this.animate();
  }

  buildHotspots() {
    const raycastGeo = new THREE.SphereGeometry(0.045, 16, 16);
    const ringGeo = new THREE.RingGeometry(0.024, 0.038, 32);
    const dotGeo = new THREE.SphereGeometry(0.016, 16, 16);

    HOTSPOTS.forEach((spot) => {
      const pos = latLngTo3D(spot.lat, spot.lng, 1.02);
      const group = new THREE.Group();
      group.position.copy(pos);
      group.lookAt(pos.clone().multiplyScalar(2));

      // Visual Ring
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      group.add(ringMesh);

      // Center Dot
      const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      group.add(dotMesh);

      // Invisible Raycast Hit Target
      const hitMat = new THREE.MeshBasicMaterial({ visible: false });
      const hitMesh = new THREE.Mesh(raycastGeo, hitMat);
      hitMesh.userData = { spot };
      group.add(hitMesh);

      this.earthGroup.add(group);
      this.hotspotMeshes.push({ group, ringMesh, hitMesh, spot });
    });
  }

  setupInteractions() {
    const el = this.renderer.domElement;
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const getCoord = (e) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const onDown = (e) => {
      this.isDragging = true;
      const coord = getCoord(e);
      this.prevMousePos = coord;
      this.downPos = coord;
    };

    const onMove = (e) => {
      if (!this.isDragging) return;
      const coord = getCoord(e);
      const dx = coord.x - this.prevMousePos.x;
      const dy = coord.y - this.prevMousePos.y;

      this.targetRotation.y += dx * 0.005;
      this.targetRotation.x = Math.max(-0.8, Math.min(0.8, this.targetRotation.x + dy * 0.005));

      this.prevMousePos = coord;
    };

    const onUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      const coord = getCoord(e);
      const dist = Math.hypot(coord.x - this.downPos.x, coord.y - this.downPos.y);

      // If clicked without large drag, check hotspot intersection
      if (dist < 6) {
        const rect = el.getBoundingClientRect();
        mouse.x = ((coord.x - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((coord.y - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, this.camera);
        const hitTargets = this.hotspotMeshes.map(h => h.hitMesh);
        const intersects = raycaster.intersectObjects(hitTargets, true);

        if (intersects.length > 0 && intersects[0].object.userData.spot) {
          const spot = intersects[0].object.userData.spot;
          if (this.onSelectHotspot) this.onSelectHotspot(spot);
        }
      }
    };

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    el.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  }

  updateThermalOverlay(tempAnomaly) {
    // Normal +0.1C is clean celestial cyan (#38bdf8)
    // At +1.5C anomaly, atmosphere warms to solar amber/orange (#f97316)
    const factor = Math.max(0, Math.min(1, (tempAnomaly - 0.2) / 1.3));
    const cyan = new THREE.Color('#38bdf8');
    const amber = new THREE.Color('#f97316');
    this.atmosphereUniforms.glowColor.value.lerpColors(cyan, amber, factor);
  }

  handleResize() {
    if (!this.renderer || !this.camera || !this.container) return;
    const width = this.container.clientWidth || 640;
    const height = this.container.clientHeight || 420;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.animId = requestAnimationFrame(this.animate);

    if (!this.isDragging) {
      this.targetRotation.y += 0.0015;
    }

    // Smooth inertia interpolation
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;

    this.earthGroup.rotation.x = this.currentRotation.x;
    this.earthGroup.rotation.y = this.currentRotation.y;

    if (this.cloudMesh) {
      this.cloudMesh.rotation.y += 0.0004;
    }

    // Gentle pulsing for hotspot rings
    const time = Date.now() * 0.003;
    this.hotspotMeshes.forEach((h, i) => {
      const scale = 1 + Math.sin(time + i) * 0.15;
      h.ringMesh.scale.set(scale, scale, 1);
    });

    this.renderer.render(this.scene, this.camera);
  }

  destroy() {
    if (this.animId) cancelAnimationFrame(this.animId);
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
    }
  }
}

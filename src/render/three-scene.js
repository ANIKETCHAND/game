/**
 * Echo Duel - ThreeSceneManager
 * 3D WebGL Perspective Arena, Lighting, Cyber Grid Runway,
 * Holographic Directional Telegraphs, Particle VFX, and Camera Choreography.
 */

import * as THREE from '../libs/three.module.js';
import { HumanoidDuelist } from './humanoid.js';
import { SignalDirections } from '../core/game.js';

export class ThreeSceneManager {
  constructor(container, options = {}) {
    this.container = container;
    this.highContrast = !!options.highContrast;
    this.reduceMotion = !!options.reduceMotion;
    this.isSupported = false;
    this.isInitialized = false;

    this.gameState = 'LANDING';
    this.roundPhase = 'IDLE';
    this.currentSignal = null;
    this.lastResult = null;

    if (typeof window === 'undefined' || typeof document === 'undefined' || !container) {
      return; // Headless / test environment safety
    }

    this.width = container.clientWidth || 800;
    this.height = container.clientHeight || 460;

    // 1. WebGL Renderer with fallback guard
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        alpha: true
      });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      this.canvas = this.renderer.domElement;
      this.canvas.id = 'three-game-canvas';
      this.canvas.setAttribute('role', 'img');
      this.canvas.setAttribute('aria-label', '3D Echo Duel Battle Arena with Cyber Warriors');

      // Replace or insert canvas in container
      const oldCanvas = container.querySelector('#game-canvas');
      if (oldCanvas) {
        oldCanvas.style.display = 'none';
        container.appendChild(this.canvas);
      } else {
        container.appendChild(this.canvas);
      }

      this.isSupported = true;
    } catch (e) {
      console.warn('WebGL initialization failed:', e);
      return;
    }

    // 2. Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.highContrast ? 0x000000 : 0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(this.highContrast ? 0x000000 : 0x0a0f1d, 0.035);

    // 3. Perspective Camera
    this.camera = new THREE.PerspectiveCamera(38, this.width / this.height, 0.1, 100);
    this.baseCameraPos = new THREE.Vector3(0, 3.2, 10.5);
    this.camera.position.copy(this.baseCameraPos);
    this.cameraLookAt = new THREE.Vector3(0, 1.25, 0);
    this.camera.lookAt(this.cameraLookAt);

    this.cameraShake = 0;
    this.cameraTime = 0;

    // 4. Lighting
    this.setupLighting();

    // 5. Arena Environment & 3D Combat Platforms
    this.setupArena();

    // 6. Holographic Telegraph Portals
    this.setupTelegraphs();

    // 7. Humanoid Duelists
    this.playerDuelist = new HumanoidDuelist({ isPlayer: true, baseX: -4.2 });
    this.rivalDuelist = new HumanoidDuelist({ isPlayer: false, baseX: 4.2 });
    this.scene.add(this.playerDuelist.group);
    this.scene.add(this.rivalDuelist.group);

    // 8. 3D Spark Particle System & Ambient Cyber Embers
    this.setupParticles();
    this.setupAmbientEmbers();

    // 9. Interactive Mouse Parallax tracking
    this.targetCameraX = 0;
    this.targetCameraY = 3.2;
    this.currentCameraX = 0;
    this.currentCameraY = 3.2;
    this.setupMouseParallax();

    // Game state tracking
    this.gameState = 'LANDING';
    this.roundPhase = 'IDLE';
    this.currentSignal = null;
    this.lastResult = null;
    this.clock = new THREE.Clock();

    this.applyTheme();
    this.isInitialized = true;
  }

  setupMouseParallax() {
    if (typeof window === 'undefined') return;
    this.onMouseMove = (e) => {
      if (this.reduceMotion) return;
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      this.targetCameraX = nx * 0.9;
      this.targetCameraY = 3.2 - ny * 0.45;
    };
    window.addEventListener('mousemove', this.onMouseMove);
  }

  setupLighting() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(this.ambientLight);

    // Key directional light
    this.dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    this.dirLight.position.set(4, 12, 8);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight);

    // Cyber Player Rim Light (Cyan)
    this.playerLight = new THREE.PointLight(0x00e5ff, 1.5, 12);
    this.playerLight.position.set(-4.2, 2.5, 2);
    this.scene.add(this.playerLight);

    // Cyber Rival Rim Light (Rose/Crimson)
    this.rivalLight = new THREE.PointLight(0xff2a55, 1.5, 12);
    this.rivalLight.position.set(4.2, 2.5, 2);
    this.scene.add(this.rivalLight);

    // Center Clash Flash Light
    this.clashLight = new THREE.PointLight(0xfbbf24, 0, 16);
    this.clashLight.position.set(0, 1.8, 1);
    this.scene.add(this.clashLight);
  }

  setupArena() {
    // Cyber reflective ground floor
    const floorGeo = new THREE.PlaneGeometry(36, 20);
    this.floorMat = new THREE.MeshStandardMaterial({
      color: 0x080e1c,
      roughness: 0.25,
      metalness: 0.85
    });
    this.floor = new THREE.Mesh(floorGeo, this.floorMat);
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.position.y = 0;
    this.floor.receiveShadow = true;
    this.scene.add(this.floor);

    // Neon perspective grid
    this.grid = new THREE.GridHelper(32, 32, 0x38bdf8, 0x1e293b);
    this.grid.position.y = 0.02;
    this.scene.add(this.grid);

    // Center Divider Laser Wire
    const dividerGeo = new THREE.CylinderGeometry(0.03, 0.03, 16, 8);
    dividerGeo.rotateX(Math.PI / 2);
    this.dividerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4
    });
    this.dividerLine = new THREE.Mesh(dividerGeo, this.dividerMat);
    this.dividerLine.position.set(0, 0.04, 0);
    this.scene.add(this.dividerLine);

    // Duel Horizon rail
    const railGeo = new THREE.BoxGeometry(14, 0.05, 0.05);
    const railMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(0, 0.03, -3);
    this.scene.add(rail);

    // 3D Battle Podiums / Combat Platforms for Player & Rival
    this.setupCombatPlatforms();
  }

  setupCombatPlatforms() {
    const createPlatform = (xPos, isPlayer) => {
      const platformGroup = new THREE.Group();
      platformGroup.position.set(xPos, 0, 0);

      // Base cylinder podium
      const podiumGeo = new THREE.CylinderGeometry(1.65, 1.85, 0.22, 32);
      const podiumMat = new THREE.MeshStandardMaterial({
        color: isPlayer ? 0x0f172a : 0x181124,
        roughness: 0.35,
        metalness: 0.8
      });
      const podium = new THREE.Mesh(podiumGeo, podiumMat);
      podium.position.y = 0.11;
      podium.receiveShadow = true;
      platformGroup.add(podium);

      // Glowing Outer Bevel Neon Ring
      const neonColor = isPlayer ? 0x00e5ff : 0xff2a55;
      const ringGeo = new THREE.TorusGeometry(1.68, 0.035, 12, 36);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: neonColor,
        transparent: true,
        opacity: 0.85
      });
      const neonRing = new THREE.Mesh(ringGeo, ringMat);
      neonRing.position.y = 0.225;
      platformGroup.add(neonRing);

      // Inner Circuit Decal Ring
      const innerRingGeo = new THREE.RingGeometry(0.8, 1.25, 24);
      innerRingGeo.rotateX(-Math.PI / 2);
      const innerRingMat = new THREE.MeshBasicMaterial({
        color: neonColor,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide
      });
      const innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
      innerRing.position.y = 0.222;
      platformGroup.add(innerRing);

      this.scene.add(platformGroup);
      return platformGroup;
    };

    this.playerPlatform = createPlatform(-4.2, true);
    this.rivalPlatform = createPlatform(4.2, false);
  }

  setupAmbientEmbers() {
    const emberCount = 35;
    const emberGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(emberCount * 3);

    for (let i = 0; i < emberCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = 0.5 + Math.random() * 4.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;
    }

    emberGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const emberMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.12,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });

    this.ambientEmbers = new THREE.Points(emberGeo, emberMat);
    this.scene.add(this.ambientEmbers);
  }

  setupTelegraphs() {
    this.telegraphs = {};

    const createPylon = (direction, posX, colorHex, symbolShape) => {
      const group = new THREE.Group();
      group.position.set(posX, 0, -0.6);

      // Floor hologram ring
      const ringGeo = new THREE.RingGeometry(0.45, 0.58, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.03;
      group.add(ring);

      // Floating Holographic Glyph Prism
      let glyphGeo;
      if (symbolShape === 'LEFT_ARROW') {
        // Triangle prism pointing Left
        glyphGeo = new THREE.ConeGeometry(0.35, 0.6, 3);
        glyphGeo.rotateZ(Math.PI / 2);
      } else if (symbolShape === 'RIGHT_ARROW') {
        // Triangle prism pointing Right
        glyphGeo = new THREE.ConeGeometry(0.35, 0.6, 3);
        glyphGeo.rotateZ(-Math.PI / 2);
      } else {
        // Center Diamond / Octahedron
        glyphGeo = new THREE.OctahedronGeometry(0.35, 0);
      }

      const glyphMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.4,
        roughness: 0.2,
        metalness: 0.5,
        transparent: true,
        opacity: 0.8
      });
      const glyph = new THREE.Mesh(glyphGeo, glyphMat);
      glyph.position.y = 1.25;
      group.add(glyph);

      // Vertical holographic light beam
      const beamGeo = new THREE.CylinderGeometry(0.12, 0.25, 4.5, 12, 1, true);
      const beamMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide
      });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 2.25;
      group.add(beam);

      this.scene.add(group);
      return { group, ring, ringMat, glyph, glyphMat, beam, beamMat, colorHex };
    };

    this.telegraphs[SignalDirections.LEFT] = createPylon(SignalDirections.LEFT, -2.4, 0x00e5ff, 'LEFT_ARROW');
    this.telegraphs[SignalDirections.CENTER] = createPylon(SignalDirections.CENTER, 0.0, 0xfbbf24, 'CENTER_DIAMOND');
    this.telegraphs[SignalDirections.RIGHT] = createPylon(SignalDirections.RIGHT, 2.4, 0xf43f5e, 'RIGHT_ARROW');
  }

  setupParticles() {
    const particleCount = 45;
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -10; // hidden initially
      positions[i * 3 + 2] = 0;
      velocities.push(new THREE.Vector3(0, 0, 0));
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pMat = new THREE.PointsMaterial({
      color: 0xffea00,
      size: 0.22,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(pGeo, pMat);
    this.particleVelocities = velocities;
    this.particleLife = 0;
    this.scene.add(this.particles);
  }

  triggerSparks(posX, posY, posZ, colorHex = 0xffea00) {
    if (this.reduceMotion) return;

    this.particleLife = 1.0;
    this.particles.material.color.setHex(colorHex);
    this.particles.material.opacity = 1.0;

    const pos = this.particles.geometry.attributes.position.array;
    for (let i = 0; i < this.particleVelocities.length; i++) {
      pos[i * 3] = posX;
      pos[i * 3 + 1] = posY;
      pos[i * 3 + 2] = posZ;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5.0;
      this.particleVelocities[i].set(
        Math.cos(angle) * speed,
        1.5 + Math.random() * 4.0,
        Math.sin(angle) * speed * 0.5
      );
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  triggerClash(winner, isFalseStart) {
    this.triggerClashVisuals(winner, isFalseStart);
  }

  triggerMatchOver(matchWinner) {
    this.triggerMatchOverVisuals(matchWinner);
  }

  setPhase(phase) {
    this.updateState({ roundPhase: phase });
  }

  triggerClashVisuals(winner, isFalseStart) {
    if (!this.isInitialized) return;

    if (!this.reduceMotion) {
      this.cameraShake = isFalseStart ? 0.25 : 0.45;
    }

    if (winner === 'PLAYER') {
      this.playerDuelist.setAnimationState('LUNGE');
      this.rivalDuelist.setAnimationState('HIT');
      this.clashLight.color.setHex(0x00e5ff);
      this.clashLight.intensity = 3.5;
      this.triggerSparks(1.2, 1.4, 0, 0x00e5ff);
    } else if (winner === 'OPPONENT') {
      this.rivalDuelist.setAnimationState('LUNGE');
      this.playerDuelist.setAnimationState('HIT');
      this.clashLight.color.setHex(0xff1744);
      this.clashLight.intensity = 3.5;
      this.triggerSparks(-1.2, 1.4, 0, 0xff1744);
    }
  }

  triggerMatchOverVisuals(matchWinner) {
    if (!this.isInitialized) return;

    if (matchWinner === 'PLAYER') {
      this.playerDuelist.setAnimationState('VICTORY');
      this.rivalDuelist.setAnimationState('HIT');
      this.clashLight.color.setHex(0x22c55e);
      this.clashLight.intensity = 2.0;
      this.triggerSparks(0, 2.0, 0, 0x22c55e);
    } else {
      this.rivalDuelist.setAnimationState('VICTORY');
      this.playerDuelist.setAnimationState('HIT');
      this.clashLight.color.setHex(0xff1744);
      this.clashLight.intensity = 2.0;
      this.triggerSparks(0, 2.0, 0, 0xff1744);
    }
  }

  updateState(stateObj = {}) {
    if (!this.isInitialized) return;

    if (stateObj.playerName) {
      this.playerDuelist.name = stateObj.playerName;
    }

    if (stateObj.gameState) {
      this.gameState = stateObj.gameState;
      if (this.gameState === 'MENU' || this.gameState === 'LANDING') {
        this.playerDuelist.setAnimationState('IDLE');
        this.rivalDuelist.setAnimationState('IDLE');
      }
    }

    if (stateObj.roundPhase) {
      this.roundPhase = stateObj.roundPhase;
      if (this.roundPhase === 'TENSION') {
        this.playerDuelist.setAnimationState('TENSION');
        this.rivalDuelist.setAnimationState('TENSION');
        this.currentSignal = null;
      }
    }

    if (stateObj.currentSignal !== undefined) {
      this.currentSignal = stateObj.currentSignal;
    }

    if (stateObj.scannedDirection) {
      this.scannedDirection = stateObj.scannedDirection;
    }

    if (stateObj.lastResult) {
      this.lastResult = stateObj.lastResult;
    }
  }

  setHighContrast(isHigh) {
    this.highContrast = isHigh;
    if (this.isInitialized) {
      this.applyTheme();
    }
  }

  setReduceMotion(reduce) {
    this.reduceMotion = reduce;
  }

  applyTheme() {
    this.scene.background.setHex(this.highContrast ? 0x000000 : 0x0a0f1d);
    this.scene.fog.color.setHex(this.highContrast ? 0x000000 : 0x0a0f1d);

    if (this.floorMat) {
      this.floorMat.color.setHex(this.highContrast ? 0x000000 : 0x080e1c);
      this.floorMat.roughness = this.highContrast ? 1.0 : 0.25;
    }

    if (this.grid) {
      this.grid.visible = true;
    }

    if (this.playerDuelist) this.playerDuelist.setHighContrast(this.highContrast);
    if (this.rivalDuelist) this.rivalDuelist.setHighContrast(this.highContrast);
  }

  handleResize() {
    if (!this.container) return;
    this.width = this.container.clientWidth || 800;
    this.height = this.container.clientHeight || 460;

    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  render() {
    if (!this.isSupported || !this.renderer) return;

    const dt = this.clock.getDelta();
    this.cameraTime += dt;

    // 1. Update Humanoid Duelist Animations
    if (this.playerDuelist) this.playerDuelist.update(dt);
    if (this.rivalDuelist) this.rivalDuelist.update(dt);

    // 2. Animate 3D Holographic Telegraphs
    const activeDir = this.currentSignal || this.scannedDirection;
    for (const [dirKey, tel] of Object.entries(this.telegraphs)) {
      const isActive = dirKey === activeDir;
      const isSignalFiring = dirKey === this.currentSignal;

      // Rotate glyph
      tel.glyph.rotation.y += dt * 1.5;

      if (isSignalFiring) {
        // High intensity active strike signal
        tel.glyphMat.emissiveIntensity = 2.0;
        tel.beamMat.opacity = 0.55 + Math.sin(this.cameraTime * 15) * 0.15;
        tel.ringMat.opacity = 0.9;
        tel.glyph.position.y = 1.45 + Math.sin(this.cameraTime * 8) * 0.12;
      } else if (isActive) {
        // Scanned in switch mode or ready
        tel.glyphMat.emissiveIntensity = 1.0;
        tel.beamMat.opacity = 0.2;
        tel.ringMat.opacity = 0.6;
        tel.glyph.position.y = 1.25 + Math.sin(this.cameraTime * 4) * 0.05;
      } else {
        // Idle dormant state
        tel.glyphMat.emissiveIntensity = 0.35;
        tel.beamMat.opacity = 0.0;
        tel.ringMat.opacity = 0.25;
        tel.glyph.position.y = 1.25;
      }
    }

    // 3. Animate 3D Particle Sparks
    if (this.particleLife > 0) {
      this.particleLife -= dt * 1.8;
      this.particles.material.opacity = Math.max(0, this.particleLife);

      const pos = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleVelocities.length; i++) {
        const vel = this.particleVelocities[i];
        vel.y -= 9.8 * dt; // gravity

        pos[i * 3] += vel.x * dt;
        pos[i * 3 + 1] += vel.y * dt;
        pos[i * 3 + 2] += vel.z * dt;

        // Ground bounce
        if (pos[i * 3 + 1] < 0.05) {
          pos[i * 3 + 1] = 0.05;
          vel.y = -vel.y * 0.4;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Animate Ambient Cyber Embers
    if (this.ambientEmbers) {
      const emberPos = this.ambientEmbers.geometry.attributes.position.array;
      for (let i = 0; i < emberPos.length / 3; i++) {
        emberPos[i * 3 + 1] += dt * 0.25; // gently rise
        if (emberPos[i * 3 + 1] > 5.0) {
          emberPos[i * 3 + 1] = 0.5;
        }
      }
      this.ambientEmbers.geometry.attributes.position.needsUpdate = true;
    }

    // 5. Fade Clash Light
    if (this.clashLight && this.clashLight.intensity > 0) {
      this.clashLight.intensity = Math.max(0, this.clashLight.intensity - dt * 6.0);
    }

    // 6. Camera Animation (Breath, Smooth Parallax Lerp & Shake)
    if (this.reduceMotion) {
      this.camera.position.copy(this.baseCameraPos);
    } else {
      // Smooth lerp toward mouse target
      this.currentCameraX += (this.targetCameraX - this.currentCameraX) * dt * 3.5;
      this.currentCameraY += (this.targetCameraY - this.currentCameraY) * dt * 3.5;

      // Subtle cinematic breathing
      const breathX = Math.sin(this.cameraTime * 0.8) * 0.12;
      const breathY = Math.cos(this.cameraTime * 1.1) * 0.08;

      // Shake decay
      let shakeX = 0;
      let shakeY = 0;
      if (this.cameraShake > 0) {
        shakeX = (Math.random() - 0.5) * this.cameraShake;
        shakeY = (Math.random() - 0.5) * this.cameraShake;
        this.cameraShake = Math.max(0, this.cameraShake - dt * 2.5);
      }

      this.camera.position.x = this.baseCameraPos.x + this.currentCameraX + breathX + shakeX;
      this.camera.position.y = this.currentCameraY + breathY + shakeY;
      this.camera.position.z = this.baseCameraPos.z;
    }
    this.camera.lookAt(this.cameraLookAt);

    // 7. Render Scene
    this.renderer.render(this.scene, this.camera);
  }

  update(dt) {
    if (!this.isInitialized) return;
    this.render();
  }

  dispose() {
    if (typeof window !== 'undefined' && this.onMouseMove) {
      window.removeEventListener('mousemove', this.onMouseMove);
    }
    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.isInitialized = false;
    this.isSupported = false;
  }
}

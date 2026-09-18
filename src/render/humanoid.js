/**
 * Echo Duel - Articulated 3D Jack-Jack Super-Baby Duelist
 * Renders the iconic superhero baby character with 3D perspective depth,
 * glowing laser eyes, energetic aura, ground shadow, and animated combat actions.
 */

import * as THREE from '../libs/three.module.js';

export class HumanoidDuelist {
  constructor(options = {}) {
    this.isPlayer = !!options.isPlayer;
    this.name = options.name || (this.isPlayer ? 'Jack-Jack' : 'Rival Jack');
    this.baseX = options.baseX !== undefined ? options.baseX : (this.isPlayer ? -4.0 : 4.0);
    this.baseY = options.baseY || 0;
    this.baseZ = options.baseZ || 0;

    this.textureUrl = this.isPlayer ? 'assets/jack_player.png' : 'assets/jack_rival.png';
    this.laserColorHex = this.isPlayer ? 0x00e5ff : 0xff2a55; // Electric Cyan vs Crimson Rose
    this.auraColorHex = this.isPlayer ? 0x38bdf8 : 0xf43f5e;
    this.highContrast = false;

    this.group = new THREE.Group();
    this.group.position.set(this.baseX, this.baseY, this.baseZ);

    this.state = 'IDLE'; // IDLE, TENSION, LUNGE, HIT, VICTORY
    this.animTime = Math.random() * 5; // offset phase
    this.lungeProgress = 0;
    this.hitProgress = 0;

    this.materials = [];
    this.buildCharacter();
  }

  buildCharacter() {
    // 1. Ground Shadow Disk
    const shadowGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.02, 16);
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.5
    });
    this.shadow = new THREE.Mesh(shadowGeo, this.shadowMat);
    this.shadow.position.y = 0.01;
    this.group.add(this.shadow);

    // 2. Main Body Group (Squash, Stretch, Hover)
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.y = 1.35;
    this.group.add(this.bodyGroup);

    // 3. Ground Energy Aura Ring
    const auraGeo = new THREE.RingGeometry(0.5, 0.75, 24);
    auraGeo.rotateX(-Math.PI / 2);
    this.auraMat = new THREE.MeshBasicMaterial({
      color: this.auraColorHex,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    });
    this.auraMesh = new THREE.Mesh(auraGeo, this.auraMat);
    this.auraMesh.position.y = 0.03;
    this.group.add(this.auraMesh);

    // 4. Jack-Jack 3D Cutout Mesh
    const planeGeo = new THREE.PlaneGeometry(2.35, 2.55);

    let texture = null;
    if (typeof document !== 'undefined') {
      try {
        const loader = new THREE.TextureLoader();
        texture = loader.load(this.textureUrl);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
      } catch (e) {
        console.warn('Could not load Jack-Jack texture:', e);
      }
    }

    this.charMat = new THREE.MeshStandardMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      alphaTest: 0.02,
      roughness: 0.45,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    this.materials.push(this.charMat);

    this.charMesh = new THREE.Mesh(planeGeo, this.charMat);
    this.charMesh.castShadow = true;
    this.charMesh.receiveShadow = false;

    const yAngle = this.isPlayer ? 0.28 : -0.28;
    this.charMesh.rotation.y = yAngle;
    this.bodyGroup.add(this.charMesh);

    // 5. 3D Laser Eyes
    this.laserGroup = new THREE.Group();
    this.laserGroup.position.set(0, 0.48, 0.08);
    this.laserGroup.rotation.y = yAngle;
    this.bodyGroup.add(this.laserGroup);

    // Eye glow flares
    const eyeGlowGeo = new THREE.SphereGeometry(0.065, 12, 12);
    this.eyeGlowMat = new THREE.MeshBasicMaterial({
      color: this.laserColorHex,
      transparent: true,
      opacity: 0.6
    });

    const leftEye = new THREE.Mesh(eyeGlowGeo, this.eyeGlowMat);
    leftEye.position.set(-0.16, 0, 0);
    this.laserGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGlowGeo, this.eyeGlowMat);
    rightEye.position.set(0.16, 0, 0);
    this.laserGroup.add(rightEye);

    // Laser Beams
    const beamGeo = new THREE.CylinderGeometry(0.035, 0.065, 3.2, 8);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 1.6);

    this.laserBeamMat = new THREE.MeshBasicMaterial({
      color: this.laserColorHex,
      transparent: true,
      opacity: 0.0
    });

    const aimAngle = this.isPlayer ? 0.35 : -0.35;

    this.leftBeam = new THREE.Mesh(beamGeo, this.laserBeamMat);
    this.leftBeam.position.set(-0.16, 0, 0.05);
    this.leftBeam.rotation.y = aimAngle;
    this.laserGroup.add(this.leftBeam);

    this.rightBeam = new THREE.Mesh(beamGeo, this.laserBeamMat);
    this.rightBeam.position.set(0.16, 0, 0.05);
    this.rightBeam.rotation.y = aimAngle;
    this.laserGroup.add(this.rightBeam);
  }

  setAnimationState(state) {
    this.state = state;
    if (state === 'LUNGE') {
      this.lungeProgress = 0;
    } else if (state === 'HIT') {
      this.hitProgress = 0;
    }
  }

  triggerLunge() {
    this.setAnimationState('LUNGE');
  }

  triggerHit() {
    this.setAnimationState('HIT');
  }

  setHighContrast(isHigh) {
    this.highContrast = isHigh;
    if (isHigh) {
      if (this.charMat) this.charMat.roughness = 1.0;
      if (this.eyeGlowMat) this.eyeGlowMat.color.setHex(this.isPlayer ? 0x00ffff : 0xff0044);
      if (this.laserBeamMat) this.laserBeamMat.color.setHex(this.isPlayer ? 0x00ffff : 0xff0044);
    } else {
      if (this.charMat) this.charMat.roughness = 0.45;
      if (this.eyeGlowMat) this.eyeGlowMat.color.setHex(this.laserColorHex);
      if (this.laserBeamMat) this.laserBeamMat.color.setHex(this.laserColorHex);
    }
  }

  update(dt = 0.016) {
    this.animTime += dt;

    if (this.auraMesh) {
      this.auraMesh.rotation.z += dt * (this.isPlayer ? 1.5 : -1.5);
    }

    if (this.state === 'IDLE') {
      const hop = Math.abs(Math.sin(this.animTime * 3.5));
      this.bodyGroup.position.y = 1.3 + hop * 0.22;
      this.bodyGroup.scale.y = 1.0 + (hop > 0.08 ? 0.06 : -0.04);
      this.bodyGroup.scale.x = 1.0 - (hop > 0.08 ? 0.04 : -0.03);
      this.bodyGroup.rotation.z = Math.sin(this.animTime * 2.5) * 0.04;

      if (this.eyeGlowMat) {
        this.eyeGlowMat.opacity = 0.4 + Math.sin(this.animTime * 4.0) * 0.25;
      }
      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 0;
      }

      if (this.shadow) {
        const shadowScale = 1.0 - hop * 0.2;
        this.shadow.scale.set(shadowScale, 1, shadowScale);
        this.shadowMat.opacity = 0.5 - hop * 0.2;
      }

      this.group.position.x += (this.baseX - this.group.position.x) * 0.15;
      this.group.position.z += (this.baseZ - this.group.position.z) * 0.15;
    } else if (this.state === 'TENSION') {
      this.bodyGroup.position.y = 1.15;
      this.bodyGroup.scale.y = 0.92;
      this.bodyGroup.scale.x = 1.08;
      this.bodyGroup.rotation.z = this.isPlayer ? 0.12 : -0.12;

      const charge = (Math.sin(this.animTime * 20.0) + 1) * 0.5;
      if (this.eyeGlowMat) {
        this.eyeGlowMat.opacity = 0.7 + charge * 0.3;
      }
      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 0.35 + charge * 0.35;
        this.laserBeamMat.color.setHex(this.isPlayer ? 0x38bdf8 : 0xf43f5e);
      }
      if (this.shadow) {
        this.shadow.scale.set(1.15, 1, 1.15);
        this.shadowMat.opacity = 0.6;
      }
    } else if (this.state === 'LUNGE') {
      this.lungeProgress += dt * 4.2;
      const t = Math.min(1, this.lungeProgress);
      const lungeDist = (this.isPlayer ? 1 : -1) * (2.8 * Math.sin(t * Math.PI));

      this.group.position.x = this.baseX + lungeDist;
      this.bodyGroup.position.y = 1.25 + Math.sin(t * Math.PI) * 0.4;
      this.bodyGroup.rotation.z = (this.isPlayer ? 0.38 : -0.38);

      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 1.0;
        this.laserBeamMat.color.setHex(0xffffff);
      }
      if (this.eyeGlowMat) {
        this.eyeGlowMat.opacity = 1.0;
      }

      if (this.lungeProgress >= 1) {
        this.setAnimationState('IDLE');
      }
    } else if (this.state === 'HIT') {
      this.hitProgress += dt * 3.6;
      const t = Math.min(1, this.hitProgress);
      const recoilDist = (this.isPlayer ? -1 : 1) * (1.3 * Math.sin(t * Math.PI));

      this.group.position.x = this.baseX + recoilDist;
      this.bodyGroup.position.y = 1.4 + Math.sin(t * Math.PI) * 0.5;
      this.bodyGroup.rotation.z = (this.isPlayer ? -1 : 1) * Math.sin(t * Math.PI) * 0.75;
      this.bodyGroup.scale.y = 1.0 - Math.sin(t * Math.PI) * 0.2;

      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 0;
      }
      if (this.eyeGlowMat) {
        this.eyeGlowMat.opacity = (Math.sin(this.animTime * 30.0) > 0) ? 0.1 : 0.8;
      }

      if (this.hitProgress >= 1) {
        this.setAnimationState('IDLE');
      }
    } else if (this.state === 'VICTORY') {
      this.bodyGroup.position.y = 1.9 + Math.sin(this.animTime * 3.5) * 0.28;
      this.bodyGroup.rotation.z = Math.sin(this.animTime * 2.0) * 0.18;
      this.bodyGroup.rotation.y += dt * 2.5;

      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 0;
      }
      if (this.eyeGlowMat) {
        this.eyeGlowMat.opacity = 0.9;
      }
      if (this.shadow) {
        this.shadow.scale.set(0.65, 1, 0.65);
        this.shadowMat.opacity = 0.25;
      }
    }
  }
}
/**
 * Echo Duel - True Volumetric 3D Jack-Jack Super-Baby Duelist
 * Built with procedural Three.js 3D meshes (chubby baby head, hair spike,
 * contoured domino mask, 3D eyes, chubby belly super-suit, articulated limbs,
 * and dynamic 3D laser eye beams).
 */

import * as THREE from '../libs/three.module.js';

export class HumanoidDuelist {
  constructor(options = {}) {
    this.isPlayer = !!options.isPlayer;
    this.name = options.name || (this.isPlayer ? 'Jack-Jack' : 'Rival Jack');
    this.baseX = options.baseX !== undefined ? options.baseX : (this.isPlayer ? -3.8 : 3.8);
    this.baseY = options.baseY || 0;
    this.baseZ = options.baseZ || 0;

    // Super-Suit Colors: Classic Incredibles Red for Player, Deep Violet/Cyan for Rival
    this.suitColorHex = this.isPlayer ? 0xdc2626 : 0x2563eb;
    this.accentColorHex = this.isPlayer ? 0x00e5ff : 0xf43f5e;
    this.laserColorHex = this.isPlayer ? 0x00e5ff : 0xff2a55;
    this.highContrast = false;

    this.group = new THREE.Group();
    this.group.position.set(this.baseX, this.baseY, this.baseZ);

    // Duelists face each other across the center stage
    this.facingAngle = this.isPlayer ? Math.PI / 2 : -Math.PI / 2;
    this.group.rotation.y = this.facingAngle;

    this.state = 'IDLE'; // IDLE, TENSION, LUNGE, HIT, VICTORY
    this.animTime = Math.random() * 5;
    this.lungeProgress = 0;
    this.hitProgress = 0;

    this.materials = [];
    this.buildCharacter();
  }

  buildCharacter() {
    // 1. Shared Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xffdfc4,
      roughness: 0.6,
      metalness: 0.05
    });
    this.skinMat = skinMat;
    this.materials.push(skinMat);

    const suitMat = new THREE.MeshStandardMaterial({
      color: this.suitColorHex,
      roughness: 0.35,
      metalness: 0.15
    });
    this.suitMat = suitMat;
    this.materials.push(suitMat);

    const blackTrimMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.25,
      metalness: 0.2
    });
    this.blackTrimMat = blackTrimMat;
    this.materials.push(blackTrimMat);

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.5,
      metalness: 0.1
    });
    this.materials.push(hairMat);

    // 2. Soft Ground Shadow
    const shadowGeo = new THREE.CylinderGeometry(0.75, 0.75, 0.02, 24);
    this.shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.45
    });
    this.shadow = new THREE.Mesh(shadowGeo, this.shadowMat);
    this.shadow.position.y = 0.01;
    this.group.add(this.shadow);

    // 3. Ground Hero Aura Ring
    const auraGeo = new THREE.RingGeometry(0.65, 0.85, 32);
    auraGeo.rotateX(-Math.PI / 2);
    this.auraMat = new THREE.MeshBasicMaterial({
      color: this.accentColorHex,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.auraMesh = new THREE.Mesh(auraGeo, this.auraMat);
    this.auraMesh.position.y = 0.03;
    this.group.add(this.auraMesh);

    // 4. Character Articulated Hierarchy
    this.bodyRoot = new THREE.Group();
    this.bodyRoot.position.y = 1.05;
    this.group.add(this.bodyRoot);

    // Hips & Baby Belly
    this.hips = new THREE.Group();
    this.bodyRoot.add(this.hips);

    const bellyGeo = new THREE.SphereGeometry(0.56, 24, 20);
    bellyGeo.scale(0.98, 1.15, 0.94);
    const belly = new THREE.Mesh(bellyGeo, suitMat);
    this.hips.add(belly);

    // Torso / Chest
    this.torso = new THREE.Group();
    this.torso.position.y = 0.32;
    this.hips.add(this.torso);

    // Black Suit Collar
    const collarGeo = new THREE.TorusGeometry(0.26, 0.05, 12, 24);
    collarGeo.rotateX(Math.PI / 2);
    const collar = new THREE.Mesh(collarGeo, blackTrimMat);
    collar.position.y = 0.34;
    this.torso.add(collar);

    // Head Group
    this.head = new THREE.Group();
    this.head.position.set(0, 0.62, 0.04);
    this.torso.add(this.head);

    // Chubby Baby Head Sphere
    const headGeo = new THREE.SphereGeometry(0.58, 32, 24);
    headGeo.scale(1.05, 0.98, 1.04);
    const headMesh = new THREE.Mesh(headGeo, skinMat);
    this.head.add(headMesh);

    // Signature Pointed Ginger Hair Spike
    const hairGeo = new THREE.ConeGeometry(0.15, 0.48, 16);
    hairGeo.rotateX(-0.18);
    const hairSpike = new THREE.Mesh(hairGeo, hairMat);
    hairSpike.position.set(0, 0.68, -0.04);
    this.head.add(hairSpike);

    // Hero Domino Mask (Black curved mask covering eyes)
    const maskGroup = new THREE.Group();
    maskGroup.position.set(0, 0.06, 0.52);
    this.head.add(maskGroup);

    const maskCenterGeo = new THREE.BoxGeometry(0.24, 0.18, 0.08);
    const maskCenter = new THREE.Mesh(maskCenterGeo, blackTrimMat);
    maskGroup.add(maskCenter);

    const maskWingGeo = new THREE.SphereGeometry(0.24, 16, 12);
    maskWingGeo.scale(1.2, 0.65, 0.3);

    const leftMaskWing = new THREE.Mesh(maskWingGeo, blackTrimMat);
    leftMaskWing.position.set(-0.24, 0.02, 0);
    leftMaskWing.rotation.z = -0.15;
    maskGroup.add(leftMaskWing);

    const rightMaskWing = new THREE.Mesh(maskWingGeo, blackTrimMat);
    rightMaskWing.position.set(0.24, 0.02, 0);
    rightMaskWing.rotation.z = 0.15;
    maskGroup.add(rightMaskWing);

    // 3D Eyes (White Sclera, Blue Iris, Black Pupil, Specular Glisten)
    const eyeWhiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeIrisMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const glistenMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const createEye = (xPos) => {
      const eyeRoot = new THREE.Group();
      eyeRoot.position.set(xPos, 0.06, 0.53);

      const sclera = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), eyeWhiteMat);
      sclera.scale.set(1.0, 0.9, 0.6);
      eyeRoot.add(sclera);

      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.062, 16, 12), eyeIrisMat);
      iris.position.set(0, 0, 0.07);
      eyeRoot.add(iris);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 12), eyePupilMat);
      pupil.position.set(0, 0, 0.095);
      eyeRoot.add(pupil);

      const glisten = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), glistenMat);
      glisten.position.set(0.02, 0.025, 0.12);
      eyeRoot.add(glisten);

      return eyeRoot;
    };

    this.leftEye = createEye(-0.21);
    this.head.add(this.leftEye);

    this.rightEye = createEye(0.21);
    this.head.add(this.rightEye);

    // Determined Furrowed Eyebrows
    const browGeo = new THREE.BoxGeometry(0.22, 0.04, 0.05);
    const leftBrow = new THREE.Mesh(browGeo, blackTrimMat);
    leftBrow.position.set(-0.21, 0.22, 0.54);
    leftBrow.rotation.z = 0.22;
    this.head.add(leftBrow);

    const rightBrow = new THREE.Mesh(browGeo, blackTrimMat);
    rightBrow.position.set(0.21, 0.22, 0.54);
    rightBrow.rotation.z = -0.22;
    this.head.add(rightBrow);

    // Cute Chubby Ears
    const earGeo = new THREE.SphereGeometry(0.14, 16, 12);
    earGeo.scale(0.4, 0.9, 0.7);

    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.62, 0.02, 0);
    leftEar.rotation.y = -0.2;
    this.head.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.62, 0.02, 0);
    rightEar.rotation.y = 0.2;
    this.head.add(rightEar);

    // 5. Volumetric 3D Laser Eyes
    this.laserBeamMat = new THREE.MeshBasicMaterial({
      color: this.laserColorHex,
      transparent: true,
      opacity: 0.0
    });

    const beamGeo = new THREE.CylinderGeometry(0.032, 0.065, 3.8, 8);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 1.9);

    this.leftLaser = new THREE.Mesh(beamGeo, this.laserBeamMat);
    this.leftLaser.position.set(-0.21, 0.06, 0.56);
    this.head.add(this.leftLaser);

    this.rightLaser = new THREE.Mesh(beamGeo, this.laserBeamMat);
    this.rightLaser.position.set(0.21, 0.06, 0.56);
    this.head.add(this.rightLaser);

    // 6. Articulated Arms
    const armGeo = new THREE.CylinderGeometry(0.13, 0.11, 0.38, 16);
    const cuffGeo = new THREE.CylinderGeometry(0.14, 0.14, 0.1, 16);
    const fistGeo = new THREE.SphereGeometry(0.13, 16, 14);

    // Left Arm
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.52, 0.18, 0);
    this.torso.add(this.leftArm);

    const leftArmMesh = new THREE.Mesh(armGeo, suitMat);
    leftArmMesh.position.y = -0.16;
    this.leftArm.add(leftArmMesh);

    const leftCuff = new THREE.Mesh(cuffGeo, blackTrimMat);
    leftCuff.position.y = -0.32;
    this.leftArm.add(leftCuff);

    const leftFist = new THREE.Mesh(fistGeo, skinMat);
    leftFist.position.y = -0.42;
    this.leftArm.add(leftFist);

    // Right Arm
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.52, 0.18, 0);
    this.torso.add(this.rightArm);

    const rightArmMesh = new THREE.Mesh(armGeo, suitMat);
    rightArmMesh.position.y = -0.16;
    this.rightArm.add(rightArmMesh);

    const rightCuff = new THREE.Mesh(cuffGeo, blackTrimMat);
    rightCuff.position.y = -0.32;
    this.rightArm.add(rightCuff);

    const rightFist = new THREE.Mesh(fistGeo, skinMat);
    rightFist.position.y = -0.42;
    this.rightArm.add(rightFist);

    // 7. Articulated Legs & Footie Pajama Boots
    const legGeo = new THREE.CylinderGeometry(0.17, 0.14, 0.38, 16);
    const bootGeo = new THREE.SphereGeometry(0.17, 16, 14);
    bootGeo.scale(0.85, 0.7, 1.35);

    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.24, -0.42, 0);
    this.hips.add(this.leftLeg);

    const leftLegMesh = new THREE.Mesh(legGeo, suitMat);
    leftLegMesh.position.y = -0.18;
    this.leftLeg.add(leftLegMesh);

    const leftBoot = new THREE.Mesh(bootGeo, suitMat);
    leftBoot.position.set(0, -0.36, 0.08);
    this.leftLeg.add(leftBoot);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.24, -0.42, 0);
    this.hips.add(this.rightLeg);

    const rightLegMesh = new THREE.Mesh(legGeo, suitMat);
    rightLegMesh.position.y = -0.18;
    this.rightLeg.add(rightLegMesh);

    const rightBoot = new THREE.Mesh(bootGeo, suitMat);
    rightBoot.position.set(0, -0.36, 0.08);
    this.rightLeg.add(rightBoot);
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
      if (this.suitMat) this.suitMat.color.setHex(this.isPlayer ? 0x00ffff : 0xff1744);
      if (this.laserBeamMat) this.laserBeamMat.color.setHex(this.isPlayer ? 0x00ffff : 0xff1744);
    } else {
      if (this.suitMat) this.suitMat.color.setHex(this.suitColorHex);
      if (this.laserBeamMat) this.laserBeamMat.color.setHex(this.laserColorHex);
    }
  }

  update(dt = 0.016) {
    this.animTime += dt;

    if (this.auraMesh) {
      this.auraMesh.rotation.z += dt * (this.isPlayer ? 1.5 : -1.5);
    }

    if (this.state === 'IDLE') {
      // Energetic baby hop, breathing, arm sway
      const hop = Math.abs(Math.sin(this.animTime * 3.6));
      this.bodyRoot.position.y = 1.05 + hop * 0.24;

      // Squash and stretch
      this.hips.scale.y = 1.0 + (hop > 0.06 ? 0.08 : -0.05);
      this.hips.scale.x = 1.0 - (hop > 0.06 ? 0.05 : -0.04);
      this.hips.scale.z = 1.0 - (hop > 0.06 ? 0.05 : -0.04);

      // Arm swing
      this.leftArm.rotation.x = Math.sin(this.animTime * 3.6) * 0.25;
      this.rightArm.rotation.x = -Math.sin(this.animTime * 3.6) * 0.25;
      this.head.rotation.y = Math.sin(this.animTime * 1.8) * 0.08;

      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 0;
      }

      if (this.shadow) {
        const shadowScale = 1.0 - hop * 0.25;
        this.shadow.scale.set(shadowScale, 1, shadowScale);
        this.shadowMat.opacity = 0.45 - hop * 0.2;
      }

      // Smooth position restore
      this.group.position.x += (this.baseX - this.group.position.x) * 0.15;
      this.group.position.z += (this.baseZ - this.group.position.z) * 0.15;
    } else if (this.state === 'TENSION') {
      // Determined low superhero crouch, fists back, lasers charging
      this.bodyRoot.position.y = 0.94;
      this.hips.scale.set(1.1, 0.9, 1.1);
      this.torso.rotation.x = 0.18;

      this.leftArm.rotation.x = -0.45;
      this.rightArm.rotation.x = -0.45;
      this.leftLeg.rotation.x = -0.25;
      this.rightLeg.rotation.x = 0.25;

      const charge = (Math.sin(this.animTime * 24.0) + 1) * 0.5;
      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 0.35 + charge * 0.45;
        this.laserBeamMat.color.setHex(this.isPlayer ? 0x38bdf8 : 0xf43f5e);
      }

      if (this.shadow) {
        this.shadow.scale.set(1.2, 1, 1.2);
        this.shadowMat.opacity = 0.6;
      }
    } else if (this.state === 'LUNGE') {
      // Super-speed rocket thrust flight forward!
      this.lungeProgress += dt * 4.4;
      const t = Math.min(1, this.lungeProgress);
      const lungeDist = (this.isPlayer ? 1 : -1) * (2.8 * Math.sin(t * Math.PI));

      this.group.position.x = this.baseX + lungeDist;
      this.bodyRoot.position.y = 1.1 + Math.sin(t * Math.PI) * 0.35;
      this.bodyRoot.rotation.z = (this.isPlayer ? -0.35 : 0.35); // forward flight lean

      this.leftArm.rotation.x = 1.2; // arms back like superhero flight
      this.rightArm.rotation.x = 1.2;

      // Full White-Hot 3D Laser Blast!
      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 1.0;
        this.laserBeamMat.color.setHex(0xffffff);
      }

      if (this.lungeProgress >= 1) {
        this.bodyRoot.rotation.z = 0;
        this.setAnimationState('IDLE');
      }
    } else if (this.state === 'HIT') {
      // Comical baby tumble recoil!
      this.hitProgress += dt * 3.6;
      const t = Math.min(1, this.hitProgress);
      const recoilDist = (this.isPlayer ? -1 : 1) * (1.3 * Math.sin(t * Math.PI));

      this.group.position.x = this.baseX + recoilDist;
      this.bodyRoot.position.y = 1.3 + Math.sin(t * Math.PI) * 0.5;
      this.bodyRoot.rotation.z = (this.isPlayer ? 0.85 : -0.85) * Math.sin(t * Math.PI);
      this.head.rotation.x = -0.4;

      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 0;
      }

      if (this.hitProgress >= 1) {
        this.bodyRoot.rotation.z = 0;
        this.setAnimationState('IDLE');
      }
    } else if (this.state === 'VICTORY') {
      // Triumphant super-baby levitation & spin!
      this.bodyRoot.position.y = 1.75 + Math.sin(this.animTime * 3.5) * 0.25;
      this.group.rotation.y += dt * 2.8;

      this.leftArm.rotation.x = -1.8; // arms high in the air cheering!
      this.rightArm.rotation.x = -1.8;

      if (this.laserBeamMat) {
        this.laserBeamMat.opacity = 0;
      }

      if (this.shadow) {
        this.shadow.scale.set(0.6, 1, 0.6);
        this.shadowMat.opacity = 0.22;
      }
    }
  }
}
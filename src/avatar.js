import * as THREE from 'three';

export function createAvatar(scene) {
  const avatarGroup = new THREE.Group();
  
  // Create a pivot group that holds the actual model
  const modelGroup = new THREE.Group();
  
  // Body
  const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4169E1,  // Blue shirt
    roughness: 0.8
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 1.1;
  body.castShadow = true;
  modelGroup.add(body);

  // Head
  const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
  const headMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFDBAC,  // Skin tone
    roughness: 0.6
  });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 2.0;
  head.castShadow = true;
  modelGroup.add(head);

  // Hair
  const hairGeometry = new THREE.SphereGeometry(0.32, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  const hairMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x3D2314,  // Brown hair
    roughness: 0.9
  });
  const hair = new THREE.Mesh(hairGeometry, hairMaterial);
  hair.position.y = 2.05;
  hair.castShadow = true;
  modelGroup.add(hair);

  // Farmer hat
  const hatBrimGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16);
  const hatMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xF5DEB3,  // Straw color
    roughness: 0.9
  });
  const hatBrim = new THREE.Mesh(hatBrimGeometry, hatMaterial);
  hatBrim.position.y = 2.35;
  hatBrim.castShadow = true;
  modelGroup.add(hatBrim);

  const hatTopGeometry = new THREE.CylinderGeometry(0.25, 0.3, 0.3, 16);
  const hatTop = new THREE.Mesh(hatTopGeometry, hatMaterial);
  hatTop.position.y = 2.5;
  hatTop.castShadow = true;
  modelGroup.add(hatTop);

  // Arms
  const armGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.8, 8);
  const armMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFDBAC,
    roughness: 0.6
  });

  // Left arm
  const leftArm = new THREE.Mesh(armGeometry, armMaterial);
  leftArm.position.set(-0.45, 1.3, 0);
  leftArm.rotation.z = Math.PI / 6;
  leftArm.castShadow = true;
  leftArm.name = 'leftArm';
  modelGroup.add(leftArm);

  // Right arm
  const rightArm = new THREE.Mesh(armGeometry, armMaterial);
  rightArm.position.set(0.45, 1.3, 0);
  rightArm.rotation.z = -Math.PI / 6;
  rightArm.castShadow = true;
  rightArm.name = 'rightArm';
  modelGroup.add(rightArm);

  // Legs
  const legGeometry = new THREE.CylinderGeometry(0.12, 0.1, 0.8, 8);
  const legMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,  // Brown pants
    roughness: 0.8
  });

  // Left leg
  const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
  leftLeg.position.set(-0.15, 0.4, 0);
  leftLeg.castShadow = true;
  leftLeg.name = 'leftLeg';
  modelGroup.add(leftLeg);

  // Right leg
  const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
  rightLeg.position.set(0.15, 0.4, 0);
  rightLeg.castShadow = true;
  rightLeg.name = 'rightLeg';
  modelGroup.add(rightLeg);

  // Boots
  const bootGeometry = new THREE.BoxGeometry(0.18, 0.15, 0.3);
  const bootMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2F1810,  // Dark brown boots
    roughness: 0.7
  });

  const leftBoot = new THREE.Mesh(bootGeometry, bootMaterial);
  leftBoot.position.set(-0.15, 0.08, 0.05);
  leftBoot.castShadow = true;
  modelGroup.add(leftBoot);

  const rightBoot = new THREE.Mesh(bootGeometry, bootMaterial);
  rightBoot.position.set(0.15, 0.08, 0.05);
  rightBoot.castShadow = true;
  modelGroup.add(rightBoot);

  // Eyes - positioned on the FRONT of the face (positive Z in model space, which becomes forward after rotation)
  const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(-0.1, 2.05, 0.25);  // Positive Z in model space
  modelGroup.add(leftEye);

  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(0.1, 2.05, 0.25);  // Positive Z in model space
  modelGroup.add(rightEye);

  // NO rotation needed - model faces positive Z, camera is behind at positive Z
  // The avatar walks in negative Z direction (forward into the scene)
  
  // Add model to avatar group
  avatarGroup.add(modelGroup);
  
  // Store reference to model group for animations
  avatarGroup.userData = {
    modelGroup: modelGroup,
    walkCycle: 0,
    isWalking: false,
    velocity: new THREE.Vector3(),
    speed: 0.15,
    rotationSpeed: 0.1
  };

  scene.add(avatarGroup);
  
  return avatarGroup;
}

export class AvatarController {
  constructor(avatar, camera) {
    this.avatar = avatar;
    this.camera = camera;
    this.modelGroup = avatar.userData.modelGroup;
    
    this.keys = {
      w: false,
      a: false,
      s: false,
      d: false,
      q: false, //sideway left
      r: false, //sideway right
      shift: false
    };
    
    this.moveSpeed = 0.15;
    this.runSpeed = 0.3;
    this.rotationSpeed = 0.05;
    this.cameraMode = 'close';
    this.cameraModes = {
      close: { offset: new THREE.Vector3(0, 2.5, -4), lookOffset: new THREE.Vector3(0, 1.5, 0) },
      medium: { offset: new THREE.Vector3(0, 5, -8), lookOffset: new THREE.Vector3(0, 1, 0) },
      far: { offset: new THREE.Vector3(0, 10, -15), lookOffset: new THREE.Vector3(0, 0, 0) }
    };
    this.cameraOffset = new THREE.Vector3(0, 3, -5);  // Camera behind avatar (negative Z)
    this.cameraLookOffset = new THREE.Vector3(0, 1.5, 0);
    
    this.setupControls();
  }

  setupControls() {
    document.addEventListener('keydown', (event) => {
      this.handleKeyDown(event);
    });

    document.addEventListener('keyup', (event) => {
      this.handleKeyUp(event);
    });
  }

  handleKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
            this.keys.w = true;
            break;
        case 'KeyA':
            this.keys.a = true;
            break;
        case 'KeyS':
            this.keys.s = true;
            break;
        case 'KeyD':
            this.keys.d = true;
            break;
        case 'KeyQ':
            this.keys.q = true;
            break;
        case 'KeyR':
            this.keys.r = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            this.keys.shift = true;
            break;
        case 'KeyV':
        this.toggleCameraMode();
        break;
    }
  }

  handleKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
            this.keys.w = false;
            break;
        case 'KeyA':
            this.keys.a = false;
            break;
        case 'KeyS':
            this.keys.s = false;
            break;
        case 'KeyD':
            this.keys.d = false;
            break;
        case 'KeyQ':
            this.keys.q = false;
            break;
        case 'KeyR':
            this.keys.r = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            this.keys.shift = false;
            break;
    }
  }

  toggleCameraMode() {
    const modes = ['close', 'medium', 'far'];
    const currentIndex = modes.indexOf(this.cameraMode);
    this.cameraMode = modes[(currentIndex + 1) % modes.length];
    
    this.cameraOffset = this.cameraModes[this.cameraMode].offset.clone();
    this.cameraLookOffset = this.cameraModes[this.cameraMode].lookOffset.clone();
    
    console.log(`Camera mode: ${this.cameraMode}`);
  }

  update() {
    if(this.keys.r) {
        console.log('R key is pressed')
    }
    const speed = this.keys.shift ? this.runSpeed : this.moveSpeed;
    let isMoving = false;
    
    // Get forward direction based on avatar rotation (positive Z is forward)
    const forward = new THREE.Vector3(0, 0, 1);
    forward.applyQuaternion(this.avatar.quaternion);

    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.avatar.quaternion);
    
    // Movement
    if (this.keys.w) {
      this.avatar.position.add(forward.clone().multiplyScalar(speed));
      isMoving = true;
    }
    if (this.keys.s) {
      this.avatar.position.add(forward.clone().multiplyScalar(-speed * 0.7));
      isMoving = true;
    }
    
    // A = turn left (positive Y rotation), D = turn right (negative Y rotation)
    if (this.keys.a) {
      this.avatar.rotation.y += this.rotationSpeed;
    }
    if (this.keys.d) {
      this.avatar.rotation.y -= this.rotationSpeed;
    }

    // Q/E - move sideway left/right
    if (this.keys.q) {
      this.avatar.position.add(right.clone().multiplyScalar(speed));  
      isMoving = true;
    }
    if (this.keys.r) {
      this.avatar.position.add(right.clone().multiplyScalar(-speed));   
      isMoving = true;
    }

    // Walking animation
    this.avatar.userData.isWalking = isMoving;
    if (isMoving) {
      this.avatar.userData.walkCycle += this.keys.shift ? 0.3 : 0.2;
      this.animateWalk();
    } else {
      this.resetPose();
    }

    // Update camera to follow avatar
    this.updateCamera();
    
    // Keep avatar on ground
    this.avatar.position.y = 0;
    
    // Boundary check (keep avatar in farm area)
    this.avatar.position.x = Math.max(-55, Math.min(50, this.avatar.position.x));
    this.avatar.position.z = Math.max(-35, Math.min(35, this.avatar.position.z));
  }

  animateWalk() {
    const cycle = this.avatar.userData.walkCycle;
    const swing = Math.sin(cycle) * 0.4;

    // Animate legs (get from modelGroup)
    const leftLeg = this.modelGroup.getObjectByName('leftLeg');
    const rightLeg = this.modelGroup.getObjectByName('rightLeg');
    
    if (leftLeg && rightLeg) {
      leftLeg.rotation.x = swing;
      rightLeg.rotation.x = -swing;
    }

    // Animate arms (opposite to legs)
    const leftArm = this.modelGroup.getObjectByName('leftArm');
    const rightArm = this.modelGroup.getObjectByName('rightArm');
    
    if (leftArm && rightArm) {
      leftArm.rotation.x = -swing * 0.5;
      rightArm.rotation.x = swing * 0.5;
    }
  }

  resetPose() {
    const leftLeg = this.modelGroup.getObjectByName('leftLeg');
    const rightLeg = this.modelGroup.getObjectByName('rightLeg');
    const leftArm = this.modelGroup.getObjectByName('leftArm');
    const rightArm = this.modelGroup.getObjectByName('rightArm');
    
    if (leftLeg) leftLeg.rotation.x = 0;
    if (rightLeg) rightLeg.rotation.x = 0;
    if (leftArm) leftArm.rotation.x = 0;
    if (rightArm) rightArm.rotation.x = 0;
  }

  updateCamera() {
    // Calculate camera position behind avatar
    const cameraOffset = this.cameraOffset.clone();
    cameraOffset.applyQuaternion(this.avatar.quaternion);
    
    const targetCameraPos = this.avatar.position.clone().add(cameraOffset);

    targetCameraPos.y = Math.max(targetCameraPos.y, 1.5);

    
    // Smooth camera follow
    this.camera.position.lerp(targetCameraPos, 0.08);
    
    // Look at avatar
    const lookTarget = this.avatar.position.clone().add(this.cameraLookOffset);
    this.camera.lookAt(lookTarget);
  }

  getPosition() {
    return this.avatar.position.clone();
  }
}
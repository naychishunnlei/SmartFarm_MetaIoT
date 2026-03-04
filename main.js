import * as THREE from 'three';
import { createScene } from './scene.js';
import { createFarm } from './farm.js';
import { setUpControls } from './controls.js';
import { createAvatar, AvatarController } from './avatar.js';

class FarmVerse {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.irrigationActive = false;
    this.sprinklerActive = false;
    this.fanActive = false;
    this.lightsActive = false;
    this.panelOpen = false;
    this.nearPlant = false;
    this.useAvatarCamera = true; // Toggle between avatar and free camera
    
    this.init().then(() => {
      this.setupEventListeners();
      this.animate();
    });
  }

  async init() {
    // Setup renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Create scene and camera
    const { scene, camera, sun } = createScene();
    this.scene = scene;
    this.camera = camera;
    this.sun = sun;

    // Create farm elements (async - loads models)
    this.farmElements = await createFarm(this.scene);

    // Create avatar and controller
    this.avatar = createAvatar(this.scene);
    this.avatar.position.set(0, 0, 5); // Starting position
    this.avatarController = new AvatarController(this.avatar, this.camera);

    // Setup orbit controls (for free camera mode)
    this.controls = setUpControls(this.camera, this.renderer.domElement);
    this.controls.enabled = !this.useAvatarCamera; // Disable if using avatar camera

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
    
    // Add instructions UI
    this.addInstructionsUI();
  }

  addInstructionsUI() {
    const instructions = document.createElement('div');
    instructions.id = 'avatar-instructions';
    instructions.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        font-family: Arial, sans-serif;
        font-size: 14px;
        z-index: 1000;
      ">
        <div style="font-weight: bold; margin-bottom: 10px; color: #4CAF50;">🧑‍🌾 Avatar Controls</div>
        <div style="margin-bottom: 5px;"><kbd style="background: #444; padding: 2px 8px; border-radius: 3px;">W</kbd> Move Forward</div>
        <div style="margin-bottom: 5px;"><kbd style="background: #444; padding: 2px 8px; border-radius: 3px;">S</kbd> Move Backward</div>
        <div style="margin-bottom: 5px;"><kbd style="background: #444; padding: 2px 8px; border-radius: 3px;">A</kbd> Turn Left</div>
        <div style="margin-bottom: 5px;"><kbd style="background: #444; padding: 2px 8px; border-radius: 3px;">D</kbd> Turn Right</div>
        <div style="margin-bottom: 5px;"><kbd style="background: #444; padding: 2px 8px; border-radius: 3px;">Q</kbd> Move Sideway Left</div>
        <div style="margin-bottom: 5px;"><kbd style="background: #444; padding: 2px 8px; border-radius: 3px;">R</kbd> Move Sideway Right</div>
        <div style="margin-bottom: 5px;"><kbd style="background: #444; padding: 2px 8px; border-radius: 3px;">Shift</kbd> Run</div>
        <div style="margin-top: 10px;"><kbd style="background: #444; padding: 2px 8px; border-radius: 3px;">V</kbd> Toggle Camera Zoom</div>
        <div style="margin-bottom: 5px;"><kbd style="background: #444; padding: 2px 8px; border-radius: 3px;">C</kbd> Toggle Camera Mode</div>
      </div>
    `;
    document.body.appendChild(instructions);
  }

  setupEventListeners() {
    // Irrigation toggle
    document.getElementById('toggle-irrigation').addEventListener('click', () => {
      this.irrigationActive = !this.irrigationActive;
      this.farmElements.toggleIrrigation(this.irrigationActive);
      document.getElementById('toggle-irrigation').classList.toggle('active', this.irrigationActive);
    });

    // Sprinkler toggle
    document.getElementById('toggle-sprinkler').addEventListener('click', () => {
      this.sprinklerActive = !this.sprinklerActive;
      this.farmElements.toggleSprinkler(this.sprinklerActive);
      document.getElementById('toggle-sprinkler').classList.toggle('active', this.sprinklerActive);
    });

    // Fan toggle
    document.getElementById('toggle-fan').addEventListener('click', () => {
      this.fanActive = !this.fanActive;
      this.farmElements.toggleFan(this.fanActive);
      document.getElementById('toggle-fan').classList.toggle('active', this.fanActive);
    });

    // Lights toggle
    document.getElementById('toggle-lights').addEventListener('click', () => {
      this.lightsActive = !this.lightsActive;
      this.farmElements.toggleLights(this.lightsActive);
      document.getElementById('toggle-lights').classList.toggle('active', this.lightsActive);
    });

    // Close panel button
    document.getElementById('close-panel').addEventListener('click', () => {
      this.closePanel();
    });

    // Press E to open panel when near plant
    document.addEventListener('keydown', (event) => {
      if (event.code === 'KeyE' && this.nearPlant && !this.panelOpen) {
        this.openPanel();
      } else if (event.code === 'Escape' && this.panelOpen) {
        this.closePanel();
      } else if (event.code === 'KeyC') {
        // Toggle camera mode
        this.useAvatarCamera = !this.useAvatarCamera;
        this.controls.enabled = !this.useAvatarCamera;
        
        if (!this.useAvatarCamera) {
          // Reset camera to overview position
          this.camera.position.set(30, 25, 30);
          this.camera.lookAt(0, 0, 0);
        }
      }
    });
  }

  openPanel() {
    this.panelOpen = true;
    document.getElementById('control-panel').style.display = 'block';
    document.getElementById('proximity-popup').style.display = 'none';
  }

  closePanel() {
    this.panelOpen = false;
    document.getElementById('control-panel').style.display = 'none';
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Update avatar controller
    if (this.useAvatarCamera) {
      this.avatarController.update();
    } else {
      // Update orbit controls when in free camera mode
      this.controls.update();
    }

    // Check proximity to plants (use avatar position instead of camera)
    this.checkPlantProximity();

    // Update farm animations
    if (this.farmElements && this.farmElements.update) {
      this.farmElements.update();
    }

    // Update sensor data (simulated for now)
    this.updateSensorData();

    // Render scene
    this.renderer.render(this.scene, this.camera);
  }

  checkPlantProximity() {
    const proximityDistance = 5; // Distance to trigger popup
    let isNearPlant = false;

    // Use avatar position for proximity check
    const checkPosition = this.useAvatarCamera 
      ? this.avatar.position 
      : this.camera.position;

    // Check distance to all crops
    if (this.farmElements && this.farmElements.crops) {
      for (let crop of this.farmElements.crops) {
        const distance = checkPosition.distanceTo(crop.position);
        if (distance < proximityDistance) {
          isNearPlant = true;
          break;
        }
      }
    }

    // Show/hide popup based on proximity
    if (isNearPlant && !this.panelOpen) {
      if (!this.nearPlant) {
        document.getElementById('proximity-popup').style.display = 'block';
      }
      this.nearPlant = true;
    } else {
      if (this.nearPlant) {
        document.getElementById('proximity-popup').style.display = 'none';
      }
      this.nearPlant = false;
    }
  }

  updateSensorData() {
    // Simulated sensor data - will be replaced with real IoT data later
    const moisture = (50 + Math.sin(Date.now() * 0.001) * 20).toFixed(1);
    const temp = (25 + Math.sin(Date.now() * 0.0005) * 5).toFixed(1);
    const humidity = (60 + Math.cos(Date.now() * 0.0008) * 15).toFixed(1);

    document.getElementById('soil-moisture').textContent = `${moisture}%`;
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new FarmVerse();
});
import * as THREE from 'three';
import { createScene } from './scene.js';
import { createFarm } from './farm.js';
import { setUpControls } from './controls.js';

class FarmVerse {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.irrigationActive = false;
    this.sprinklerActive = false;
    this.fanActive = false;
    this.lightsActive = false;
    this.panelOpen = false;
    this.nearPlant = false;
    
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

    // Setup controls
    this.controls = setUpControls(this.camera, this.renderer.domElement);

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
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

    // Update controls
    this.controls.update();

    // Check proximity to plants
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

    // Check distance to all crops
    if (this.farmElements && this.farmElements.crops) {
      for (let crop of this.farmElements.crops) {
        const distance = this.camera.position.distanceTo(crop.position);
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
    document.getElementById('temperature').textContent = `${temp}°C`;
    document.getElementById('humidity').textContent = `${humidity}%`;
  }
}

// Initialize the application
new FarmVerse();


// Smart Farm - Core Module
// Main initialization, scene setup, and event handling
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { setupEventListeners, loadObjects } from './utils.js';
import { createObject } from './objects.js';

// Global variables
let scene, camera, renderer, controls;
let ground;
let objects = [];
let selectedObjectType = null;
let deleteMode = false;
let raycaster, mouse;
let contextMenuTarget = null;

// Object configurations
const objectConfigs = {
    // Crops
    tomato: { name: 'Tomato', emoji: '🍅', category: 'crops' },
    carrot: { name: 'Carrot', emoji: '🥕', category: 'crops' },
    corn: { name: 'Corn', emoji: '🌽', category: 'crops' },
    wheat: { name: 'Wheat', emoji: '🌾', category: 'crops' },
    sunflower: { name: 'Sunflower', emoji: '🌻', category: 'crops' },
    cabbage: { name: 'Cabbage', emoji: '🥬', category: 'crops' },
    // Infrastructure
    soilBed: { name: 'Soil Bed', emoji: '🟫', category: 'infrastructure' },
    plantPot: { name: 'Plant Pot', emoji: '🪴', category: 'infrastructure' },
    greenhouse: { name: 'Greenhouse', emoji: '🏠', category: 'infrastructure' },
    waterTank: { name: 'Water Tank', emoji: '🛢️', category: 'infrastructure' },
    irrigationPipe: { name: 'Irrigation Pipe', emoji: '🔧', category: 'infrastructure' },
    solarPanel: { name: 'Solar Panel', emoji: '☀️', category: 'infrastructure' },
    // IoT Devices
    moistureSensor: { name: 'Moisture Sensor', emoji: '💧', category: 'iot' },
    tempSensor: { name: 'Temperature Sensor', emoji: '🌡️', category: 'iot' },
    humiditySensor: { name: 'Humidity Sensor', emoji: '💦', category: 'iot' },
    waterPump: { name: 'Water Pump', emoji: '⛽', category: 'iot' },
    sprinkler: { name: 'Sprinkler', emoji: '🚿', category: 'iot' },
    esp32: { name: 'ESP32', emoji: '🔌', category: 'iot' },
    // Animals
    chicken: { name: 'Chicken', emoji: '🐔', category: 'animals' },
    cow: { name: 'Cow', emoji: '🐄', category: 'animals' },
    pig: { name: 'Pig', emoji: '🐷', category: 'animals' },
    sheep: { name: 'Sheep', emoji: '🐑', category: 'animals' },
    duck: { name: 'Duck', emoji: '🦆', category: 'animals' },
    horse: { name: 'Horse', emoji: '🐴', category: 'animals' },
    // Environment
    tree: { name: 'Tree', emoji: '🌳', category: 'environment' },
    bush: { name: 'Bush', emoji: '🌿', category: 'environment' },
    storageHouse: { name: 'Storage House', emoji: '🏚️', category: 'environment' },
    fence: { name: 'Fence', emoji: '🚧', category: 'environment' },
    rock: { name: 'Rock', emoji: '🪨', category: 'environment' },
    path: { name: 'Path', emoji: '🛤️', category: 'environment' }
};

// Initialize the scene
export async function init() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create gradient sky background
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.5, '#E0F6FF');
    gradient.addColorStop(1, '#F0FFF0');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    
    const skyTexture = new THREE.CanvasTexture(canvas);
    scene.background = skyTexture;

    // Create camera
    camera = new THREE.PerspectiveCamera(
        50,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(15, 12, 15);
    camera.lookAt(0, 0, 0);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.getElementById('farm-container').insertBefore(
        renderer.domElement,
        document.querySelector('.farm-ui')
    );

    // Add orbit controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minDistance = 8;
    controls.maxDistance = 35;
    controls.target.set(0, 0, 0);

    // Setup raycaster for click detection
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Create environment
    createEnvironment();

    // Setup lighting
    setupLighting();

    // Load saved objects
    loadObjects(scene, objects, createObject);

    // Setup event listeners
    const context = {
        renderer,
        camera,
        scene,
        ground,
        objectsRef: objects,
        createObject
    };
    setupEventListeners(context);

    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 1500);

    // Start animation loop
    animate();
}

// Create the farm environment
function createEnvironment() {
    // Large grass field - this is the main clickable ground
    const grassGeometry = new THREE.PlaneGeometry(100, 100);
    const grassMaterial = new THREE.MeshStandardMaterial({
        color: 0x8fbc8f,
        roughness: 1.0,
        metalness: 0.0
    });
    ground = new THREE.Mesh(grassGeometry, grassMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

    // Farm soil area (visual only, center plot)
    const soilGeometry = new THREE.PlaneGeometry(16, 16);
    const soilMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c4033,
        roughness: 1
    });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.rotation.x = -Math.PI / 2;
    soil.position.y = 0.01;
    soil.receiveShadow = true;
    scene.add(soil);

    // Add soil rows for realism
    createSoilRows();

    // Add decorative elements
    createFarmFence();
    // createDecorations();
}

// Create soil rows
function createSoilRows() {
    const rowMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a3728,
        roughness: 1
    });
    
    for (let i = -7; i <= 7; i += 1) {
        const rowGeometry = new THREE.BoxGeometry(16, 0.08, 0.3);
        const row = new THREE.Mesh(rowGeometry, rowMaterial);
        row.position.set(0, 0.02, i);
        row.receiveShadow = true;
        scene.add(row);
    }
}

// Create wooden fence around the farm
function createFarmFence() {
    const woodMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B5A2B,
        roughness: 0.8
    });
    
    const postGeometry = new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8);
    const railGeometry = new THREE.BoxGeometry(2, 0.08, 0.06);
    
    // Create fence posts
    const positions = [];
    for (let x = -8; x <= 8; x += 2) {
        positions.push({ x, z: -8 });
        positions.push({ x, z: 8 });
    }
    for (let z = -6; z <= 6; z += 2) {
        positions.push({ x: -8, z });
        positions.push({ x: 8, z });
    }
    
    positions.forEach(pos => {
        const post = new THREE.Mesh(postGeometry, woodMaterial);
        post.position.set(pos.x, 0.6, pos.z);
        post.castShadow = true;
        post.receiveShadow = true;
        scene.add(post);
    });
    
    // Add horizontal rails
    for (let x = -7; x <= 7; x += 2) {
        [-8, 8].forEach(z => {
            [0.4, 0.9].forEach(y => {
                const rail = new THREE.Mesh(railGeometry, woodMaterial);
                rail.position.set(x, y, z);
                rail.castShadow = true;
                scene.add(rail);
            });
        });
    }
    
    for (let z = -7; z <= 7; z += 2) {
        [-8, 8].forEach(x => {
            [0.4, 0.9].forEach(y => {
                const rail = new THREE.Mesh(railGeometry, woodMaterial);
                rail.position.set(x, y, z);
                rail.rotation.y = Math.PI / 2;
                rail.castShadow = true;
                scene.add(rail);
            });
        });
    }
}

// Create decorations around the farm
function createDecorations() {
    // Add trees at random positions around the farm (outside the fence)
    for (let i = 0; i < 10; i++) {
        let x, z;
        do {
            x = (Math.random() - 0.5) * 40;
            z = (Math.random() - 0.5) * 40;
        } while (Math.abs(x) < 10 && Math.abs(z) < 10);
        
        createDecoTree(x, z);
    }
}

// Create decorative tree
function createDecoTree(x, z) {
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;
    scene.add(trunk);
    
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a27 });
    
    const foliage1 = new THREE.Mesh(
        new THREE.ConeGeometry(1.8, 2.5, 8),
        foliageMaterial
    );
    foliage1.position.set(x, 3, z);
    foliage1.castShadow = true;
    scene.add(foliage1);
    
    const foliage2 = new THREE.Mesh(
        new THREE.ConeGeometry(1.4, 2, 8),
        foliageMaterial
    );
    foliage2.position.set(x, 4.2, z);
    foliage2.castShadow = true;
    scene.add(foliage2);
}

// Setup lighting
function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Main sun light
    const sunLight = new THREE.DirectionalLight(0xfffaf0, 1.3);
    sunLight.position.set(20, 30, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 100;
    sunLight.shadow.camera.left = -30;
    sunLight.shadow.camera.right = 30;
    sunLight.shadow.camera.top = 30;
    sunLight.shadow.camera.bottom = -30;
    sunLight.shadow.bias = -0.0001;
    scene.add(sunLight);

    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c4e, 0.6);
    scene.add(hemiLight);
    
    // Fill light
    const fillLight = new THREE.DirectionalLight(0xfff5e6, 0.5);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();

    // Update active sprinkler water particles (when isRunning === true)
    objects.forEach(obj => {
        if (obj.userData.type === 'sprinkler' && obj.userData.isRunning && obj.waterEffect) {
            updateSprinklerWater(obj.waterEffect)
        }
        
        // Rotate fan blades when running
        if (obj.userData.type === 'fan' && obj.userData.isRunning && obj.fanBlades) {
            obj.fanBlades.rotation.y += 0.1; // Rotation speed
        }
    })

    renderer.render(scene, camera);
}

function updateSprinklerWater(waterGroup) {
    if (!waterGroup.visible) return;

    const positions = waterGroup.positions;
    const velocities = waterGroup.velocities;
    const lifetimes = waterGroup.lifetimes;
    const particleCount = waterGroup.particleCount;
    const maxLifetime = waterGroup.maxLifetime;
    const deltaTime = 0.016; // ~60fps
    const gravity = 9.8;

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;

        // Update lifetime
        lifetimes[i] += deltaTime;
        
        if (lifetimes[i] > maxLifetime) {
            // Reset particle completely
            lifetimes[i] = 0;
            positions[i3] = (Math.random() - 0.5) * 0.5;
            positions[i3 + 1] = 0;
            positions[i3 + 2] = (Math.random() - 0.5) * 0.5;

            // Reset velocity to new spray direction
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            velocities[i3] = Math.cos(angle) * speed;
            velocities[i3 + 1] = 1 + Math.random() * 2;
            velocities[i3 + 2] = Math.sin(angle) * speed;
        } else {
            // Update position
            positions[i3] += velocities[i3] * deltaTime;
            positions[i3 + 1] += velocities[i3 + 1] * deltaTime;
            positions[i3 + 2] += velocities[i3 + 2] * deltaTime;

            // Apply gravity
            velocities[i3 + 1] -= gravity * deltaTime;
        }
    }

    waterGroup.particles.geometry.attributes.position.needsUpdate = true;
}


// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

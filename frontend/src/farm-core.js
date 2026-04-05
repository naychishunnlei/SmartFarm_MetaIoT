import { getObjectsForFarm, toggleDevice, updateObjectGrowth } from './apiService.js';
import { addObject, setupEventListeners } from './utils.js';

// Global variables
let scene, camera, renderer, controls;
let ground;
let objects = [];
let skyTexture;
let ambientLight;
let sunLight;
let hemiLight;
let fillLight;
let isNightMode = false
let streetLightPointLights = []
let streetLightMaterial = null
let userAvatar = null
let avatarTarget = new THREE.Vector3()


let selectedObjectType = null;
let deleteMode = false;
let raycaster, mouse;
let contextMenuTarget = null;

const keys = { w: false, a: false, s: false, d: false }

//sample sensor data
let farmSoilMoisture = 0.6
let farmWaterLevel = 0.8
let wasLowMoisture = false

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
    fan: { name: 'Fan', emoji: '🌀', category: 'iot' },
    streetLight: {name: 'Street Light', emoji: '💡', category: 'iot'},
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

function formatSensorValue(type, value) {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return '--';
    }

    if (type === 'tempSensor') {
        return `${Number(value).toFixed(1)}°C`;
    }

    const percentValue = Number(value) <= 1 ? Number(value) * 100 : Number(value);
    return `${percentValue.toFixed(0)}%`;
}

function getZoneLabelForObject(obj) {
    const explicitZoneId = obj?.userData?.zoneId ?? obj?.userData?.zone_id ?? obj?.userData?.zoneID;
    if (explicitZoneId !== undefined && explicitZoneId !== null && explicitZoneId !== '') {
        return `Zone ${explicitZoneId}`;
    }

    const x = obj?.position?.x ?? 0;
    const z = obj?.position?.z ?? 0;

    if (Math.abs(x) <= 4 && Math.abs(z) <= 4) {
        return 'Central Zone';
    }

    if (x < 0 && z < 0) return 'Zone A';
    if (x >= 0 && z < 0) return 'Zone B';
    if (x < 0 && z >= 0) return 'Zone C';
    return 'Zone D';
}

function computeZoneStatus(summary) {
    if (summary.totalObjects === 0) {
        return { label: 'Idle', tone: 'idle' };
    }

    if (summary.alerts.length > 0) {
        return { label: 'Attention', tone: 'attention' };
    }

    if (summary.runningDevices > 0 || summary.sensorCount > 0) {
        return { label: 'Active', tone: 'active' };
    }

    if (summary.averageGrowth >= 0.75 || summary.crops > 0) {
        return { label: 'Healthy', tone: 'healthy' };
    }

    return { label: 'Stable', tone: 'healthy' };
}

function summarizeZones() {
    const zoneMap = new Map();

    objects.forEach((obj) => {
        const zoneLabel = getZoneLabelForObject(obj);
        if (!zoneMap.has(zoneLabel)) {
            zoneMap.set(zoneLabel, {
                label: zoneLabel,
                totalObjects: 0,
                crops: 0,
                sensors: 0,
                runningDevices: 0,
                growthTotal: 0,
                growthSamples: 0,
                sensorReadings: [],
                alerts: []
            });
        }

        const summary = zoneMap.get(zoneLabel);
        const category = obj?.userData?.category || 'unknown';
        const type = obj?.userData?.type || '';

        summary.totalObjects += 1;

        if (category === 'crops') {
            summary.crops += 1;
            const growthValue = Number(obj?.userData?.growth ?? 0);
            summary.growthTotal += growthValue;
            summary.growthSamples += 1;
        }

        if (category === 'iot') {
            summary.sensors += 1;
            if (type === 'waterPump' || type === 'sprinkler' || type === 'fan' || type === 'streetLight') {
                if (obj?.userData?.isRunning) {
                    summary.runningDevices += 1;
                }
            }

            if (type === 'moistureSensor' || type === 'tempSensor' || type === 'humiditySensor') {
                summary.sensorReadings.push({ type, value: Number(obj?.userData?.sensorValue ?? 0) });
            }
        }
    });

    const summaries = Array.from(zoneMap.values()).map((summary) => {
        const averageGrowth = summary.growthSamples > 0 ? summary.growthTotal / summary.growthSamples : 0;
        const moistureReading = summary.sensorReadings.find((reading) => reading.type === 'moistureSensor');
        const temperatureReading = summary.sensorReadings.find((reading) => reading.type === 'tempSensor');
        const humidityReading = summary.sensorReadings.find((reading) => reading.type === 'humiditySensor');

        if (moistureReading && Number(moistureReading.value) <= 0.35) {
            summary.alerts.push('Low soil moisture');
        }

        if (temperatureReading && Number(temperatureReading.value) >= 35) {
            summary.alerts.push('High temperature');
        }

        if (humidityReading && Number(humidityReading.value) <= 0.35) {
            summary.alerts.push('Low humidity');
        }

        const status = computeZoneStatus({
            ...summary,
            averageGrowth
        });

        return {
            ...summary,
            averageGrowth,
            sensorCount: summary.sensors,
            moistureLabel: moistureReading ? formatSensorValue('moistureSensor', moistureReading.value) : '--',
            temperatureLabel: temperatureReading ? formatSensorValue('tempSensor', temperatureReading.value) : '--',
            humidityLabel: humidityReading ? formatSensorValue('humiditySensor', humidityReading.value) : '--',
            status
        };
    });

    summaries.sort((left, right) => left.label.localeCompare(right.label));
    return summaries;
}

function updateFarmDashboard() {
    const zoneList = document.getElementById('zone-dashboard-list');
    const zoneCountElement = document.getElementById('dashboard-zone-count');
    const objectCountElement = document.getElementById('dashboard-object-count');
    const alertCountElement = document.getElementById('dashboard-alert-count');

    if (!zoneList) {
        return;
    }

    const zoneSummaries = summarizeZones();
    const objectTotal = objects.length;
    const alertTotal = zoneSummaries.reduce((total, summary) => total + summary.alerts.length, 0);

    if (zoneCountElement) zoneCountElement.textContent = String(zoneSummaries.length);
    if (objectCountElement) objectCountElement.textContent = String(objectTotal);
    if (alertCountElement) alertCountElement.textContent = String(alertTotal);

    if (zoneSummaries.length === 0) {
        zoneList.innerHTML = `
            <div class="zone-empty">
                No objects are placed yet. Add crops, sensors, or devices to see each zone summary update here.
            </div>
        `;
        return;
    }

    zoneList.innerHTML = zoneSummaries.map((summary) => {
        const averageGrowthText = summary.growthSamples > 0 ? `${Math.round(summary.averageGrowth * 100)}%` : '--';
        const alertText = summary.alerts.length > 0 ? summary.alerts.join(', ') : 'No alerts';

        return `
            <section class="zone-card">
                <div class="zone-card-header">
                    <div>
                        <div class="zone-card-title">
                            <span>${summary.label}</span>
                        </div>
                        <div class="zone-card-subtitle">${summary.totalObjects} objects monitored</div>
                    </div>
                    <span class="zone-status-pill ${summary.status.tone}">${summary.status.label}</span>
                </div>

                <div class="zone-stats">
                    <div class="zone-stat">
                        <span class="zone-stat-label">Crops</span>
                        <span class="zone-stat-value">${summary.crops}</span>
                    </div>
                    <div class="zone-stat">
                        <span class="zone-stat-label">Devices</span>
                        <span class="zone-stat-value">${summary.runningDevices} active</span>
                    </div>
                    <div class="zone-stat">
                        <span class="zone-stat-label">Growth</span>
                        <span class="zone-stat-value">${averageGrowthText}</span>
                    </div>
                    <div class="zone-stat">
                        <span class="zone-stat-label">Sensors</span>
                        <span class="zone-stat-value">${summary.sensors}</span>
                    </div>
                    <div class="zone-stat">
                        <span class="zone-stat-label">Moisture</span>
                        <span class="zone-stat-value">${summary.moistureLabel}</span>
                    </div>
                    <div class="zone-stat">
                        <span class="zone-stat-label">Temp</span>
                        <span class="zone-stat-value">${summary.temperatureLabel}</span>
                    </div>
                </div>

                <div class="zone-alerts">
                    <strong>Status:</strong> ${alertText}<br>
                    <strong>Humidity:</strong> ${summary.humidityLabel}
                </div>
            </section>
        `;
    }).join('');
}

// Initialize the scene
export async function init() {

    const farmId = localStorage.getItem('selectedFarmId')
    if (!farmId) {
        alert('no farm selected. Redirecting to map')
        window.location.href = 'map.html'
        return
    }
    // Create scene
    scene = new THREE.Scene();

    const storedNight = localStorage.getItem('farmverseSkyNight') === '1';
    isNightMode = storedNight;
    skyTexture = createSkyTexture(THREE, isNightMode);
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
    controls = new window.OrbitControls(camera, renderer.domElement);
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
    applyDayNightLighting(isNightMode);
    setupDayNightToggle();

    // Load objects from API
    try {
        const farmObjects = await getObjectsForFarm(farmId)
        console.log('loading objs from db')
        objects.length = 0
        farmObjects.forEach(dbObject => {
            const position = new THREE.Vector3(
                parseFloat(dbObject.position_x), 
                parseFloat(dbObject.position_y), 
                parseFloat(dbObject.position_z)
            )
            addObject(scene, objects, dbObject.object_name, position, dbObject, objectConfigs)
        })

        const objectCountElement = document.getElementById('object-count')
        if(objectCountElement) objectCountElement.textContent = objects.length
        updateFarmDashboard()

    }catch(error) {
        console.error('failed to load objs')
        alert(`error loading farm data: ${error.message}`)
    }
    

    // Setup event listeners
    const context = {
        renderer,
        camera,
        scene,
        ground,
        objectsRef: objects,
        objectConfigs
    };
    setupEventListeners(context)

    setupCameraView()

    const savedAvatarJson = localStorage.getItem('farmverse_avatar');
    if (savedAvatarJson) {
        try {
            const avatarConfig = JSON.parse(savedAvatarJson);
            userAvatar = buildFarmAvatar(avatarConfig);
            userAvatar.position.set(0, 0, 5); 
            scene.add(userAvatar);
            pickNewAvatarTarget();
        } catch (e) {
            console.error("Failed to build avatar:", e);
        }
    }

    // Hide loading screen
    setTimeout(() => {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }, 1500);

    // Start animation loop
    animate()

    setInterval(async () => {
        if(!farmId) return

        try {
            const liveDbObjects = await getObjectsForFarm(farmId);

            objects.forEach(obj => {
                if (obj.userData.category === 'crops' && obj.userData.dbId) {
                    if (obj.userData.growth <= 1.0) {
                        updateObjectGrowth(farmId, obj.userData.dbId, obj.userData.growth)
                    }
                }

                if ((obj.userData.type === 'sprinkler' || obj.userData.type === 'waterPump') && obj.userData.dbId) {
                    if (obj.userData.isRunning !== obj.userData.db_isRunning) {
                        toggleDevice(farmId, obj.userData.dbId, obj.userData.isRunning);
                        obj.userData.db_isRunning = obj.userData.isRunning; 
                    }
                }

                if (obj.userData.category === 'iot' && obj.userData.dbId) {
                    const dbMatch = liveDbObjects.find(dbObj => dbObj.id === obj.userData.dbId);
                    if (dbMatch && dbMatch.metadata && dbMatch.metadata.sensor_value !== undefined) {
                        obj.userData.sensorValue = parseFloat(dbMatch.metadata.sensor_value);
                    }
                }
            })

            updateFarmDashboard()
        } catch (error) {
            console.error("Failed to sync live sensor data:", error);
        }
    }, 10000)

    window.updateFarmDashboard = updateFarmDashboard;
}


//setup camera view
function setupCameraView() {
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return

        const key = e.key.toLowerCase()
        if (keys.hasOwnProperty(key)) keys[key] = true

        switch(e.key) {
            case '1': // Drone View 
                camera.position.set(0, 12, 18);
                controls.target.set(0, 0, 0);
                controls.minDistance = 8;
                controls.maxDistance = 35;
                controls.maxPolarAngle = Math.PI / 2.2;
                break;
            case '2': // Top View (Planner Mode)
                // Z is 0.1 to avoid OrbitControls gimbal lock when looking perfectly straight down
                camera.position.set(0, 30, 0.1); 
                controls.target.set(0, 0, 0);
                break;
            case '3': // First-person View (Ground level)
                camera.position.set(0, 1.5, 12); 
                controls.target.set(0, 1.5, 0);
                controls.minDistance = 0.1;
                controls.maxPolarAngle = Math.PI / 2; // Prevent looking below ground
                break;
        }
        controls.update(); 
    });

    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (keys.hasOwnProperty(key)) keys[key] = false;
    })
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
    createFarmFence()
    createStreetLights()
    createIrrigationSystem()
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

function createStreetLights() {
    const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.8 });
    
    const lightMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffaa, 
        emissive: 0xfff0aa, 
        emissiveIntensity: isNightMode ? 2 : 0 
    });

   
    streetLightPointLights = [];

    const positions = [
    //    { x: -9 - Math.random(), z: -9 - Math.random() }, // Top-Left
        // { x:  9 + Math.random(), z: -9 - Math.random() }, // Top-Right
        { x: -9 - Math.random() ,z:  10 + Math.random() }, // Bottom-Left
        // { x:  9 + Math.random(), z:  9 + Math.random() }  // Bottom-Right
    
    ];

    positions.forEach(pos => {
        const group = new THREE.Group();
        group.position.set(pos.x, 0, pos.z);
        
        group.lookAt(0, 0, 0);
        group.rotateY(-Math.PI / 2);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 4, 8), metalMaterial);
        pole.position.y = 2;
        pole.castShadow = true;
        group.add(pole);

        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8), metalMaterial);
        arm.rotation.z = Math.PI / 2;
        arm.position.set(0.5, 3.8, 0); 
        group.add(arm);

        const lamp = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.3, 8), metalMaterial);
        lamp.position.set(1.0, 3.7, 0);
        group.add(lamp);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), lightMaterial);
        bulb.position.set(1.0, 3.65, 0);
        group.add(bulb);

        // INCREASED TO 1000, DISTANCE 0 (infinite reach, dims naturally)
        const light = new THREE.SpotLight(0xfff0aa, isNightMode ? 1000 : 0);
        light.position.set(1.0, 3.5, 0);
        light.angle = Math.PI / 2.5; 
        light.penumbra = 0.5;
        light.decay = 0.4;
        light.distance = 0; 
        light.castShadow = false;

        const targetObject = new THREE.Object3D();
        targetObject.position.set(20, -2, 0); 
        group.add(targetObject);
        light.target = targetObject;
        
        group.add(light);
        streetLightPointLights.push(light); 


        scene.add(group);
    });
}
function createIrrigationSystem() {
    const tankMaterial = new THREE.MeshStandardMaterial({ color: 0x2196F3, roughness: 0.3, metalness: 0.2 });
    const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.5 });
    const supportMaterial = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.8 });

    const group = new THREE.Group();
    // Place slightly outside the farm soil bed
    group.position.set(-10.5, 0, 0.5); 

    // Tank Platform Support
    const support = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 2.2), supportMaterial);
    support.position.y = 0.75;
    support.castShadow = true;
    group.add(support);

    // Large Blue Water Tank
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 2.5, 16), tankMaterial);
    tank.position.y = 2.75;
    tank.castShadow = true;
    group.add(tank);

    // Main Pipe coming down from tank
    const mainPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.5, 8), pipeMaterial);
    mainPipe.position.set(1.1, 0.75, 0);
    group.add(mainPipe);

    // Pipe bringing water to the soil area
    const horizPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.9, 8), pipeMaterial);
    horizPipe.rotation.z = Math.PI / 2;
    horizPipe.position.set(2.05, -0.05, 0);
    group.add(horizPipe);

    // Distribution pipe running parallel across the edge of the soil bed
    const distPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 14, 8), pipeMaterial);
    distPipe.rotation.x = Math.PI / 2;
    distPipe.position.set(3.0, -0.002, 0);
    group.add(distPipe);

    scene.add(group);
}


function createSkyTexture(THREE, night) {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    if (night) {
        // Moonlit sky: readable but clearly "night" (not pitch black)
        gradient.addColorStop(0, '#1a2840');
        gradient.addColorStop(0.35, '#2a3a55');
        gradient.addColorStop(0.65, '#243228');
        gradient.addColorStop(1, '#1a221c');
    } else {
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.5, '#E0F6FF');
        gradient.addColorStop(1, '#F0FFF0');
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace !== undefined) {
        tex.colorSpace = THREE.SRGBColorSpace;
    }
    return tex;
}

function applyDayNightLighting(night) {
    if (!ambientLight || !sunLight || !hemiLight || !fillLight || !renderer) return;

    if (night) {
        ambientLight.color.setHex(0xc8d4e8);
        ambientLight.intensity = 0.42;
        sunLight.color.setHex(0xb8c8e8);
        sunLight.intensity = 0.55;
        hemiLight.color.setHex(0x3a5080);
        hemiLight.groundColor.setHex(0x283828);
        hemiLight.intensity = 0.48;
        fillLight.color.setHex(0x6a8cc8);
        fillLight.intensity = 0.32;
        renderer.toneMappingExposure = 0.78;

        //turn on
        if (streetLightMaterial) streetLightMaterial.emissiveIntensity = 2;
        streetLightPointLights.forEach(light => light.intensity = 10)
    } else {
        ambientLight.color.setHex(0xffffff);
        ambientLight.intensity = 0.7;
        sunLight.color.setHex(0xfffaf0);
        sunLight.intensity = 1.3;
        hemiLight.color.setHex(0x87ceeb);
        hemiLight.groundColor.setHex(0x4a7c4e);
        hemiLight.intensity = 0.6;
        fillLight.color.setHex(0xfff5e6);
        fillLight.intensity = 0.5;
        renderer.toneMappingExposure = 1.2;

        //turn off
        if (streetLightMaterial) streetLightMaterial.emissiveIntensity = 0;
        streetLightPointLights.forEach(light => light.intensity = 0);
    }
}

function updateDayNightUi() {
    const btn = document.getElementById('day-night-toggle');
    const icon = document.querySelector('.day-night-icon');
    const label = document.querySelector('.day-night-label');
    const weatherIcon = document.getElementById('weather-icon-display');
    const condition = document.getElementById('weather-condition-display');

    if (btn) btn.setAttribute('aria-pressed', isNightMode ? 'true' : 'false');
    if (icon) icon.textContent = isNightMode ? '🌙' : '☀️';
    if (label) label.textContent = isNightMode ? 'Night' : 'Day';
    if (weatherIcon) weatherIcon.textContent = isNightMode ? '🌙' : '☀️';
    if (condition) condition.textContent = isNightMode ? 'Clear night' : 'Sunny';
}

function setupDayNightToggle() {
    const btn = document.getElementById('day-night-toggle');
    if (!btn) return;

    updateDayNightUi();

    btn.addEventListener('click', () => {
        isNightMode = !isNightMode;
        localStorage.setItem('farmverseSkyNight', isNightMode ? '1' : '0');

        if (skyTexture) skyTexture.dispose();
        skyTexture = createSkyTexture(THREE, isNightMode);
        scene.background = skyTexture;

        applyDayNightLighting(isNightMode);
        updateDayNightUi();
    });
}

// Setup lighting
function setupLighting() {
    ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    sunLight = new THREE.DirectionalLight(0xfffaf0, 1.3);
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

    hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x4a7c4e, 0.6);
    scene.add(hemiLight);

    fillLight = new THREE.DirectionalLight(0xfff5e6, 0.5);
    fillLight.position.set(-10, 10, -10);
    scene.add(fillLight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate)

    let isMoving = false
    if (keys.w || keys.a || keys.s || keys.d) {
        const moveSpeed = 0.2; 
        const front = new THREE.Vector3();
        const right = new THREE.Vector3();
        const direction = new THREE.Vector3();

        camera.getWorldDirection(front);
        front.y = 0; 
        front.normalize();

        right.crossVectors(front, camera.up).normalize();

        if (keys.w) direction.add(front);
        if (keys.s) direction.sub(front);
        if (keys.a) direction.sub(right);
        if (keys.d) direction.add(right);

        if (direction.lengthSq() > 0) {
            direction.normalize();

            if (userAvatar) {
                // Move avatar relative to camera direction
                userAvatar.position.addScaledVector(direction, moveSpeed);
                
                // Smoothly rotate avatar to face movement direction
                const targetRotation = Math.atan2(direction.x, direction.z);
                let diff = targetRotation - userAvatar.rotation.y;
                while (diff > Math.PI) diff -= Math.PI * 2;
                while (diff < -Math.PI) diff += Math.PI * 2;
                userAvatar.rotation.y += diff * 0.15;

                // Cast a ray straight down from above the avatar
                raycaster.set(
                    new THREE.Vector3(userAvatar.position.x, userAvatar.position.y + 2, userAvatar.position.z), 
                    new THREE.Vector3(0, -1, 0)
                );
                
                // Find what surface is immediately below the avatar
                const intersects = raycaster.intersectObjects([ground, ...objects], true);
                const floorIntersects = intersects.filter(hit => hit.point.y <= userAvatar.position.y + 0.6);

                if (floorIntersects.length > 0) {
                    userAvatar.position.y = floorIntersects[0].point.y;
                }

                // Move camera to follow the avatar
                camera.position.addScaledVector(direction, moveSpeed);
                controls.target.copy(userAvatar.position);
                isMoving = true;
            } else {
                // Moving camera freely if no avatar exists
                direction.multiplyScalar(moveSpeed);
                camera.position.add(direction);
                controls.target.add(direction);
            }
        }
    }

    if (userAvatar) {
        if (isMoving) {
            const time = Date.now() * 0.015;
            userAvatar.userData.leftLeg.rotation.x = Math.sin(time) * 0.6;
            userAvatar.userData.rightLeg.rotation.x = Math.sin(time + Math.PI) * 0.6;
            userAvatar.userData.leftArm.rotation.x = Math.sin(time + Math.PI) * 0.6;
            userAvatar.userData.rightArm.rotation.x = Math.sin(time) * 0.6;
        } else {
            // Reset limbs when idle
            userAvatar.userData.leftLeg.rotation.x = 0;
            userAvatar.userData.rightLeg.rotation.x = 0;
            userAvatar.userData.leftArm.rotation.x = 0;
            userAvatar.userData.rightArm.rotation.x = 0;
        }
    }

    controls.update()

    if (camera.position.y < 0.5) {
        camera.position.y = 0.5;
    }
    //growth rate
    const baseGrowthRate = 0.0003
    const moistureFactor = 1.0 - Math.abs(0.7 - farmSoilMoisture) * 2
    const waterFactor = Math.min(farmWaterLevel, 1.0)
    const effectiveGrowthRate = Math.max(0, baseGrowthRate * moistureFactor * waterFactor)

    //Calculate average moisture from sensors
    let totalMoisture = 0;
    let moistureSensorCount = 0;
    objects.forEach(o => {
        if (o.userData.type === 'moistureSensor') {
            totalMoisture += (o.userData.sensorValue || 0);
            moistureSensorCount++;
        }
    });
    const currentMoisture = moistureSensorCount > 0 ? (totalMoisture / moistureSensorCount) : (farmSoilMoisture * 100);
    const isLowMoisture = currentMoisture < 30; // Threshold to trigger automation


    const justBecameLowMoisture = isLowMoisture && !wasLowMoisture;
    wasLowMoisture = isLowMoisture;

    // Update active sprinkler water particles (when isRunning === true)
    objects.forEach(obj => {

        //Handle Crop Growth
        if (obj.userData.category === 'crops') {
            if (obj.userData.growth < 1.0) {
                obj.userData.growth += effectiveGrowthRate;
                if (obj.userData.growth > 1.0) obj.userData.growth = 1.0;
                
                // Scale the crop based on its new growth value
                const g = obj.userData.growth;
                obj.scale.set(g, g, g);
            }
        }

        // Auto-turn on sprinklers and pumps
        if ((obj.userData.type === 'sprinkler' || obj.userData.type === 'waterPump') && justBecameLowMoisture) {
            obj.userData.isRunning = true;
        }

        if (obj.userData.type === 'sprinkler' && obj.userData.isRunning && obj.waterEffect) {
            obj.waterEffect.visible = true; 
            updateSprinklerWater(obj.waterEffect)
        } else if (obj.userData.type === 'sprinkler' && !obj.userData.isRunning && obj.waterEffect) {
            obj.waterEffect.visible = false; 
        }
        
        // Rotate fan blades when running
        if (obj.userData.type === 'fan' && obj.userData.isRunning && obj.fanBlades) {
            obj.fanBlades.rotation.y += 0.1; 
        }

        //toggle user-placed streetLight
        if (obj.userData.type === 'streetLight') {
            if (isNightMode) {
                if (obj.bulbMaterial) obj.bulbMaterial.emissiveIntensity = 2;
                if (obj.spotLight) obj.spotLight.intensity = 10;
            } else {
                if (obj.bulbMaterial) obj.bulbMaterial.emissiveIntensity = 0;
                if (obj.spotLight) obj.spotLight.intensity = 0;
            }
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

function pickNewAvatarTarget() {
    avatarTarget.set(
        (Math.random() - 0.5) * 14, // Random X inside farm bounds
        0,
        (Math.random() - 0.5) * 14  // Random Z inside farm bounds
    );
}

// ...existing code...
function buildFarmAvatar(config) {
    const mats = {
        skin: new THREE.MeshStandardMaterial({ color: config.skinColor, roughness: 0.3 }),
        hair: new THREE.MeshStandardMaterial({ color: config.hairColor, roughness: 0.8 }),
        shirt: new THREE.MeshStandardMaterial({ color: config.shirtColor, roughness: 0.7 }),
        bottom: new THREE.MeshStandardMaterial({ color: config.bottomColor, roughness: 0.7 }),
        shoe: new THREE.MeshStandardMaterial({ color: '#222222', roughness: 0.9 }),
        faceDark: new THREE.MeshStandardMaterial({ color: '#2b2b2b', roughness: 0.9 }),
        lip: new THREE.MeshStandardMaterial({ color: '#c06b72', roughness: 0.6 }),
        stripe: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5 })
    };

    const group = new THREE.Group();

    // 1. Shirt & Body
    const isTankTop = config.shirtStyle === 'tanktop';
    const isOversized = config.shirtStyle === 'oversized';
    const isStriped = config.shirtStyle === 'striped';
    const isDress = config.shirtStyle === 'dress';

    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.16), mats.shirt);
    bodyMesh.position.y = 1.2;
    const shirtScale = isOversized ? 1.25 : 1.0;
    bodyMesh.scale.set(shirtScale, 1, shirtScale);
    group.add(bodyMesh);

    if (isStriped) {
        const stripeGroup = new THREE.Group();
        for (let i = 0; i < 3; i++) {
            const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.02, 0.17), mats.stripe);
            stripe.position.set(0, 1.32 - (i * 0.08), 0);
            stripeGroup.add(stripe);
        }
        group.add(stripeGroup);
    }

    if (isDress) {
        const dressMesh = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.35, 0.18), mats.shirt);
        dressMesh.position.set(0, 0.8, 0);
        group.add(dressMesh);
    }

    // 2. Head & Face
    const headGroup = new THREE.Group();
    headGroup.position.y = 1.575;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mats.skin);
    headGroup.add(head);

    const faceZ = 0.16;
    const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
    const leftEye = new THREE.Mesh(eyeGeo, mats.faceDark);
    leftEye.position.set(-0.06, 0.045, faceZ);
    const rightEye = new THREE.Mesh(eyeGeo, mats.faceDark);
    rightEye.position.set(0.06, 0.045, faceZ);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), mats.skin);
    nose.position.set(0, 0, faceZ + 0.01);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), mats.lip);
    mouth.position.set(0, -0.055, faceZ);
    headGroup.add(leftEye, rightEye, nose, mouth);

    // Hair
    if (config.hairStyle === 'bob') {
        const hairGroup = new THREE.Group();
        const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.34), mats.hair);
        topCap.position.set(0, 0.15, 0);
        const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.05), mats.hair);
        backPlate.position.set(0, 0, -0.145);
        const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.22), mats.hair);
        leftSide.position.set(-0.145, 0, -0.06);
        const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.22), mats.hair);
        rightSide.position.set(0.145, 0, -0.06);
        hairGroup.add(topCap, backPlate, leftSide, rightSide);
        headGroup.add(hairGroup);
    } else {
        const hairGeo = config.hairStyle === 'short' ? new THREE.BoxGeometry(0.32, 0.08, 0.32) : new THREE.BoxGeometry(0.36, 0.38, 0.36);
        const hair = new THREE.Mesh(hairGeo, mats.hair);
        hair.position.y = config.hairStyle === 'short' ? 0.15 : 0.05;
        if (config.hairStyle === 'long') hair.position.z = -0.05;
        headGroup.add(hair);
    }
    group.add(headGroup);

    // Pivots for limbs
    const createLimb = (geo, mat, yOffset, xPos) => {
        const pivot = new THREE.Group();
        pivot.position.set(xPos, yOffset, 0);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = -geo.parameters.height / 2;
        pivot.add(mesh);
        return pivot;
    };

    // 3. Arms & Hands
    const armX = isOversized ? 0.26 : 0.22;
    const armMat = isTankTop ? mats.skin : mats.shirt;
    const leftArm = createLimb(new THREE.BoxGeometry(0.12, 0.45, 0.12), armMat, 1.425, -armX);
    const rightArm = createLimb(new THREE.BoxGeometry(0.12, 0.45, 0.12), armMat, 1.425, armX);
    
    const handGeo = new THREE.BoxGeometry(0.1, 0.12, 0.08);
    const lHand = new THREE.Mesh(handGeo, mats.skin);
    lHand.position.set(0, -0.51, 0.02);
    leftArm.add(lHand);
    const rHand = new THREE.Mesh(handGeo, mats.skin);
    rHand.position.set(0, -0.51, 0.02);
    rightArm.add(rHand);
    group.add(leftArm, rightArm);

    // 4. Legs & Pants
    const isShorts = config.bottomStyle === 'shorts';
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.09, 0.975, 0);
    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.09, 0.975, 0);

    const legSkinGeo = new THREE.BoxGeometry(0.12, 0.5, 0.12);
    const pantsGeo = new THREE.BoxGeometry(0.14, 0.5, 0.14);

    const buildLegOptions = (legGroup) => {
        const skin = new THREE.Mesh(legSkinGeo, mats.skin);
        skin.position.y = -0.25;
        legGroup.add(skin);

        if (!isDress) {
            const pants = new THREE.Mesh(pantsGeo, mats.bottom);
            pants.position.y = isShorts ? -0.125 : -0.25;
            pants.scale.y = isShorts ? 0.5 : 1.0;
            legGroup.add(pants);
        }

        const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.22), mats.shoe);
        shoe.position.set(0, -0.56, 0.04);
        legGroup.add(shoe);
    };

    buildLegOptions(leftLeg);
    buildLegOptions(rightLeg);
    group.add(leftLeg, rightLeg);

    group.userData = { leftArm, rightArm, leftLeg, rightLeg };
    // group.scale.set(0.8, 0.8, 0.8);
    const outerGroup = new THREE.Group();
    group.position.y = -0.4; 
    outerGroup.add(group);

    outerGroup.userData = group.userData;
    outerGroup.scale.set(0.8, 0.8, 0.8);
    
    
    return outerGroup;
}



// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

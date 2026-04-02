// THREE is loaded globally
export function createObject(type, position) {
    const group = new THREE.Group();
    // Create a 3D object based on type
    switch(type) {
        // Crops
        case 'tomato': createTomatoPlant(group); break;
        case 'carrot': createCarrotPlant(group); break;
        case 'corn': createCornPlant(group); break;
        case 'wheat': createWheatPlant(group); break;
        case 'sunflower': createSunflower(group); break;
        case 'cabbage': createCabbage(group); break;
        // Infrastructure
        case 'soilBed': createSoilBed(group); break;
        case 'plantPot': createPlantPot(group); break;
        case 'greenhouse': createGreenhouse(group); break;
        case 'waterTank': createWaterTank(group); break;
        case 'irrigationPipe': createIrrigationPipe(group); break;
        case 'solarPanel': createSolarPanel(group); break;
        // IoT Devices
        case 'moistureSensor': createMoistureSensor(group); break;
        case 'tempSensor': createTempSensor(group); break;
        case 'humiditySensor': createHumiditySensor(group); break;
        case 'waterPump': createWaterPump(group); break;
        case 'sprinkler': createSprinkler(group); break;
        case 'fan': createFan(group); break;
        // Animals
        case 'chicken': createChicken(group); break;
        case 'cow': createCow(group); break;
        case 'pig': createPig(group); break;
        case 'sheep': createSheep(group); break;
        case 'duck': createDuck(group); break;
        case 'horse': createHorse(group); break;
        // Environment
        case 'tree': createTree(group); break;
        case 'bush': createBush(group); break;
        case 'storageHouse': createStorageHouse(group); break;
        case 'fence': createFence(group); break;
        case 'rock': createRock(group); break;
        case 'path': createPath(group); break;
    }

    group.position.copy(position)
    group.userData = { 
        type: type, 
        id: Date.now() + Math.random(),
        growth: 0.4,
    }

    // If it is a crop, set its initial scale to be very small
    const cropTypes = ['tomato', 'carrot', 'corn', 'wheat', 'sunflower', 'cabbage'];
    if (cropTypes.includes(type)) {
        group.userData.category = 'crops';
        const g = group.userData.growth;
        group.scale.set(g, g, g); // Scale down to 10% size
    }

    return group
}

// ==================== CROPS ====================

function createTomatoPlant(group) {
    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.8, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x2d5a1e });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.4;
    stem.castShadow = true;
    group.add(stem);

    // Leaves
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x3d7a2e, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
        const leafGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        leafGeometry.scale(1, 0.3, 1);
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (i / 4) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.15, 0.5 + i * 0.1, Math.sin(angle) * 0.15);
        leaf.castShadow = true;
        group.add(leaf);
    }

    // Tomatoes
    const tomatoMaterial = new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.3 });
    const positions = [
        { x: 0.12, y: 0.45, z: 0.08 },
        { x: -0.1, y: 0.55, z: 0.1 },
        { x: 0.08, y: 0.65, z: -0.1 }
    ];
    positions.forEach(pos => {
        const tomatoGeometry = new THREE.SphereGeometry(0.08, 12, 12);
        const tomato = new THREE.Mesh(tomatoGeometry, tomatoMaterial);
        tomato.position.set(pos.x, pos.y, pos.z);
        tomato.castShadow = true;
        group.add(tomato);
    });
}

function createCarrotPlant(group) {
    // Carrot top (leaves)
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x558b2f });
    for (let i = 0; i < 6; i++) {
        const leafGeometry = new THREE.CylinderGeometry(0.01, 0.02, 0.4, 6);
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (i / 6) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.03, 0.25, Math.sin(angle) * 0.03);
        leaf.rotation.x = Math.cos(angle) * 0.3;
        leaf.rotation.z = Math.sin(angle) * 0.3;
        leaf.castShadow = true;
        group.add(leaf);
    }

    // Carrot body (partially visible)
    const carrotGeometry = new THREE.ConeGeometry(0.06, 0.25, 12);
    const carrotMaterial = new THREE.MeshStandardMaterial({ color: 0xff7043 });
    const carrot = new THREE.Mesh(carrotGeometry, carrotMaterial);
    carrot.position.y = 0.02;
    carrot.rotation.x = Math.PI;
    carrot.castShadow = true;
    group.add(carrot);
}

function createCornPlant(group) {
    // Stalk
    const stalkGeometry = new THREE.CylinderGeometry(0.04, 0.06, 1.5, 8);
    const stalkMaterial = new THREE.MeshStandardMaterial({ color: 0x7cb342 });
    const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
    stalk.position.y = 0.75;
    stalk.castShadow = true;
    group.add(stalk);

    // Leaves
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x558b2f, side: THREE.DoubleSide });
    for (let i = 0; i < 6; i++) {
        const leafGeometry = new THREE.PlaneGeometry(0.5, 0.12);
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const height = 0.4 + i * 0.2;
        const angle = (i / 3) * Math.PI;
        leaf.position.set(Math.cos(angle) * 0.15, height, Math.sin(angle) * 0.15);
        leaf.rotation.y = angle;
        leaf.rotation.z = 0.5;
        leaf.castShadow = true;
        group.add(leaf);
    }

    // Corn cob
    const cobGeometry = new THREE.CylinderGeometry(0.08, 0.06, 0.25, 12);
    const cobMaterial = new THREE.MeshStandardMaterial({ color: 0xffd54f });
    const cob = new THREE.Mesh(cobGeometry, cobMaterial);
    cob.position.set(0.1, 0.9, 0);
    cob.rotation.z = 0.3;
    cob.castShadow = true;
    group.add(cob);

    // Corn husk
    const huskMaterial = new THREE.MeshStandardMaterial({ color: 0x8bc34a });
    const huskGeometry = new THREE.ConeGeometry(0.1, 0.15, 6);
    const husk = new THREE.Mesh(huskGeometry, huskMaterial);
    husk.position.set(0.1, 1.05, 0);
    husk.rotation.z = 0.3;
    group.add(husk);
}

function createWheatPlant(group) {
    // Multiple wheat stalks
    for (let i = 0; i < 5; i++) {
        const offsetX = (Math.random() - 0.5) * 0.15;
        const offsetZ = (Math.random() - 0.5) * 0.15;
        
        // Stalk
        const stalkGeometry = new THREE.CylinderGeometry(0.015, 0.02, 0.8, 6);
        const stalkMaterial = new THREE.MeshStandardMaterial({ color: 0xc9b037 });
        const stalk = new THREE.Mesh(stalkGeometry, stalkMaterial);
        stalk.position.set(offsetX, 0.4, offsetZ);
        stalk.castShadow = true;
        group.add(stalk);

        // Wheat head
        const headGeometry = new THREE.CylinderGeometry(0.03, 0.02, 0.15, 6);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0xdaa520 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(offsetX, 0.85, offsetZ);
        head.castShadow = true;
        group.add(head);
    }
}

function createSunflower(group) {
    // Stem
    const stemGeometry = new THREE.CylinderGeometry(0.04, 0.05, 1.2, 8);
    const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x558b2f });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = 0.6;
    stem.castShadow = true;
    group.add(stem);

    // Leaves
    const leafMaterial = new THREE.MeshStandardMaterial({ color: 0x43a047, side: THREE.DoubleSide });
    for (let i = 0; i < 4; i++) {
        const leafGeometry = new THREE.CircleGeometry(0.15, 8);
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        const angle = (i / 4) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.1, 0.4 + i * 0.15, Math.sin(angle) * 0.1);
        leaf.rotation.y = angle;
        leaf.rotation.x = 0.5;
        leaf.castShadow = true;
        group.add(leaf);
    }

    // Flower center
    const centerGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.08, 16);
    const centerMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 1.25;
    center.rotation.x = -0.3;
    center.castShadow = true;
    group.add(center);

    // Petals
    const petalMaterial = new THREE.MeshStandardMaterial({ color: 0xffc107 });
    for (let i = 0; i < 12; i++) {
        const petalGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        petalGeometry.scale(0.3, 1, 0.5);
        const petal = new THREE.Mesh(petalGeometry, petalMaterial);
        const angle = (i / 12) * Math.PI * 2;
        petal.position.set(
            Math.cos(angle) * 0.22,
            1.25 + Math.sin(angle) * 0.05,
            Math.sin(angle) * 0.22
        );
        petal.rotation.z = angle + Math.PI / 2;
        petal.rotation.x = -0.3;
        petal.castShadow = true;
        group.add(petal);
    }
}

function createCabbage(group) {
    // Outer leaves
    const outerLeafMaterial = new THREE.MeshStandardMaterial({ color: 0x66bb6a });
    for (let i = 0; i < 8; i++) {
        const leafGeometry = new THREE.SphereGeometry(0.18, 8, 8);
        leafGeometry.scale(1, 0.4, 0.8);
        const leaf = new THREE.Mesh(leafGeometry, outerLeafMaterial);
        const angle = (i / 8) * Math.PI * 2;
        leaf.position.set(Math.cos(angle) * 0.12, 0.15, Math.sin(angle) * 0.12);
        leaf.rotation.y = angle;
        leaf.rotation.x = -0.3;
        leaf.castShadow = true;
        group.add(leaf);
    }

    // Inner head
    const innerMaterial = new THREE.MeshStandardMaterial({ color: 0xa5d6a7 });
    const innerGeometry = new THREE.SphereGeometry(0.15, 12, 12);
    const inner = new THREE.Mesh(innerGeometry, innerMaterial);
    inner.position.y = 0.18;
    inner.castShadow = true;
    group.add(inner);
}

// ==================== INFRASTRUCTURE ====================

function createSoilBed(group) {
    // Soil inside
    const soilGeometry = new THREE.BoxGeometry(1.3, 0.15, 1.3);
    const soilMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.y = 0.075;
    soil.receiveShadow = true;
    group.add(soil);
}

function createPlantPot(group) {
    // Pot body
    const potGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.3, 12);
    const potMaterial = new THREE.MeshStandardMaterial({ color: 0xb87333 });
    const pot = new THREE.Mesh(potGeometry, potMaterial);
    pot.position.y = 0.15;
    pot.castShadow = true;
    group.add(pot);

    // Rim
    const rimGeometry = new THREE.TorusGeometry(0.2, 0.025, 8, 24);
    const rim = new THREE.Mesh(rimGeometry, potMaterial);
    rim.position.y = 0.3;
    rim.rotation.x = Math.PI / 2;
    group.add(rim);

    // Soil
    const soilGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 12);
    const soilMaterial = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
    const soil = new THREE.Mesh(soilGeometry, soilMaterial);
    soil.position.y = 0.28;
    group.add(soil);

    // Small plant
    const plantGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const plantMaterial = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
    const plant = new THREE.Mesh(plantGeometry, plantMaterial);
    plant.position.y = 0.4;
    plant.castShadow = true;
    group.add(plant);
}

function createGreenhouse(group) {
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const glassMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87ceeb, 
        transparent: true, 
        opacity: 0.3 
    });

    // Base frame
    const baseGeometry = new THREE.BoxGeometry(3, 0.1, 2);
    const base = new THREE.Mesh(baseGeometry, frameMaterial);
    base.position.y = 0.05;
    group.add(base);

    // Walls (glass)
    const wallGeometry = new THREE.BoxGeometry(3, 1.5, 0.05);
    [-1, 1].forEach(z => {
        const wall = new THREE.Mesh(wallGeometry, glassMaterial);
        wall.position.set(0, 0.8, z);
        group.add(wall);
    });

    // Side walls
    const sideWallGeometry = new THREE.BoxGeometry(0.05, 1.5, 2);
    [-1.5, 1.5].forEach(x => {
        const wall = new THREE.Mesh(sideWallGeometry, glassMaterial);
        wall.position.set(x, 0.8, 0);
        group.add(wall);
    });

    // Roof
    const roofGeometry = new THREE.BoxGeometry(3.2, 0.05, 1.2);
    [-0.5, 0.5].forEach(z => {
        const roof = new THREE.Mesh(roofGeometry, glassMaterial);
        roof.position.set(0, 1.7, z);
        roof.rotation.x = z > 0 ? 0.3 : -0.3;
        group.add(roof);
    });
}

function createWaterTank(group) {
    // Tank body
    const tankGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.2, 16);
    const tankMaterial = new THREE.MeshStandardMaterial({ color: 0x1565c0 });
    const tank = new THREE.Mesh(tankGeometry, tankMaterial);
    tank.position.y = 0.9;
    tank.castShadow = true;
    group.add(tank);

    // Stand
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x424242 });
    for (let i = 0; i < 4; i++) {
        const legGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
        const leg = new THREE.Mesh(legGeometry, standMaterial);
        const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
        leg.position.set(Math.cos(angle) * 0.35, 0.3, Math.sin(angle) * 0.35);
        leg.castShadow = true;
        group.add(leg);
    }

    // Lid
    const lidGeometry = new THREE.CylinderGeometry(0.52, 0.52, 0.08, 16);
    const lid = new THREE.Mesh(lidGeometry, tankMaterial);
    lid.position.y = 1.54;
    group.add(lid);
}

function createIrrigationPipe(group) {
    const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x37474f });
    
    // Main pipe
    const pipeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 2, 12);
    const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
    pipe.position.y = 0.15;
    pipe.rotation.z = Math.PI / 2;
    pipe.castShadow = true;
    group.add(pipe);

    // Drip emitters
    const emitterMaterial = new THREE.MeshStandardMaterial({ color: 0x212121 });
    for (let i = -0.8; i <= 0.8; i += 0.4) {
        const emitterGeometry = new THREE.CylinderGeometry(0.02, 0.03, 0.08, 8);
        const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
        emitter.position.set(i, 0.08, 0);
        group.add(emitter);
    }
}

function createSolarPanel(group) {
    // Pole
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x757575 });
    const poleGeometry = new THREE.CylinderGeometry(0.05, 0.06, 1.2, 8);
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 0.6;
    pole.castShadow = true;
    group.add(pole);

    // Panel frame
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x424242 });
    const frameGeometry = new THREE.BoxGeometry(1.2, 0.08, 0.8);
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.y = 1.3;
    frame.rotation.x = -0.4;
    frame.castShadow = true;
    group.add(frame);

    // Solar cells
    const cellMaterial = new THREE.MeshStandardMaterial({ color: 0x1a237e });
    const cellGeometry = new THREE.BoxGeometry(1.1, 0.02, 0.7);
    const cells = new THREE.Mesh(cellGeometry, cellMaterial);
    cells.position.y = 1.34;
    cells.rotation.x = -0.4;
    group.add(cells);
}

// ==================== IOT DEVICES ====================

function createMoistureSensor(group) {
    // Probe
    const probeMaterial = new THREE.MeshStandardMaterial({ color: 0x37474f });
    const probeGeometry = new THREE.CylinderGeometry(0.02, 0.015, 0.4, 8);
    const probe = new THREE.Mesh(probeGeometry, probeMaterial);
    probe.position.y = 0.1;
    probe.castShadow = true;
    group.add(probe);

    // Sensor head
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x1976d2 });
    const headGeometry = new THREE.BoxGeometry(0.12, 0.08, 0.06);
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.35;
    head.castShadow = true;
    group.add(head);

    // LED indicator
    const ledMaterial = new THREE.MeshStandardMaterial({ color: 0x4caf50, emissive: 0x4caf50 });
    const ledGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const led = new THREE.Mesh(ledGeometry, ledMaterial);
    led.position.set(0.04, 0.37, 0.035);
    group.add(led);
}

function createTempSensor(group) {
    // Base
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const baseGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.08);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.35;
    base.castShadow = true;
    group.add(base);

    // Pole
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x757575 });
    const poleGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.3, 8);
    const pole = new THREE.Mesh(poleGeometry, poleMaterial);
    pole.position.y = 0.1;
    pole.castShadow = true;
    group.add(pole);

    // Display screen
    const screenMaterial = new THREE.MeshStandardMaterial({ color: 0x1b5e20 });
    const screenGeometry = new THREE.BoxGeometry(0.1, 0.08, 0.01);
    const screen = new THREE.Mesh(screenGeometry, screenMaterial);
    screen.position.set(0, 0.38, 0.045);
    group.add(screen);
}

function createHumiditySensor(group) {
    // Housing
    const houseMaterial = new THREE.MeshStandardMaterial({ color: 0x90caf9 });
    const houseGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12);
    const house = new THREE.Mesh(houseGeometry, houseMaterial);
    house.position.y = 0.35;
    house.castShadow = true;
    group.add(house);

    // Stand
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x616161 });
    const standGeometry = new THREE.CylinderGeometry(0.03, 0.04, 0.25, 8);
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.y = 0.125;
    stand.castShadow = true;
    group.add(stand);

    // Ventilation slots
    const slotMaterial = new THREE.MeshStandardMaterial({ color: 0x424242 });
    for (let i = 0; i < 4; i++) {
        const slotGeometry = new THREE.BoxGeometry(0.04, 0.02, 0.01);
        const slot = new THREE.Mesh(slotGeometry, slotMaterial);
        slot.position.set(0.081, 0.3 + i * 0.04, 0);
        group.add(slot);
    }
}

function createWaterPump(group) {
    // Motor housing
    const motorMaterial = new THREE.MeshStandardMaterial({ color: 0xf44336 });
    const motorGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.25, 12);
    const motor = new THREE.Mesh(motorGeometry, motorMaterial);
    motor.position.y = 0.2;
    motor.rotation.x = Math.PI / 2;
    motor.castShadow = true;
    group.add(motor);

    // Base
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x424242 });
    const baseGeometry = new THREE.BoxGeometry(0.35, 0.08, 0.25);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.04;
    base.castShadow = true;
    group.add(base);

    // Input/output pipes
    const pipeMaterial = new THREE.MeshStandardMaterial({ color: 0x757575 });
    const pipeGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.15, 8);
    [-0.12, 0.12].forEach(x => {
        const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
        pipe.position.set(x, 0.2, 0.18);
        pipe.rotation.x = Math.PI / 2;
        group.add(pipe);
    });
}

function createSprinkler(group) {
    // Base
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
    const baseGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.08, 12);
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.y = 0.04;
    base.castShadow = true;
    group.add(base);

    // Riser
    const riserMaterial = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const riserGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8);
    const riser = new THREE.Mesh(riserGeometry, riserMaterial);
    riser.position.y = 0.18;
    group.add(riser);

    // Spray head
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffeb3b });
    const headGeometry = new THREE.SphereGeometry(0.06, 12, 12);
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.32;
    head.castShadow = true;
    group.add(head);

    // Water spray effect (small cones)
    const sprayMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x42a5f5, 
        transparent: true, 
        opacity: 0.5 
    });
    for (let i = 0; i < 6; i++) {
        const sprayGeometry = new THREE.ConeGeometry(0.02, 0.15, 6);
        const spray = new THREE.Mesh(sprayGeometry, sprayMaterial);
        const angle = (i / 6) * Math.PI * 2;
        spray.position.set(
            Math.cos(angle) * 0.1,
            0.4,
            Math.sin(angle) * 0.1
        );
        spray.rotation.x = 0.5;
        spray.rotation.y = angle;
        group.add(spray);
    }

    const waterEffect = createSprinklerWater(new THREE.Vector3(0, 0.32, 0))
    waterEffect.visible = false
    group.add(waterEffect)
    group.waterEffect = waterEffect
    group.userData.isRunning = false
}

//water particles for sprinkling
function createSprinklerWater(position) {
    const waterGroup = new THREE.Group()
    waterGroup.position.copy(position)
    waterGroup.userData.type = 'sprinkler-water'
    waterGroup.userData.isActive = false

    const particleCount = 200
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)
    const lifetimes = new Float32Array(particleCount)
    const maxLifetime = 2 

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3

        //random position
        positions[i3] = (Math.random() - 0.5) * 0.5
        positions[i3+1] = 0
        positions[i3+2] = (Math.random() - 0.5) * 0.5

        //random velocities
        const angle = Math.random() * Math.PI * 2
        const speed = 2 + Math.random() * 3
        velocities[i3] = Math.cos(angle) * speed
        velocities[i3 + 1] = 1 + Math.random() * 2 // upward
        velocities[i3 + 2] = Math.sin(angle) * speed

        lifetimes[i] = 0

    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3))

    const material = new THREE.PointsMaterial({
        color: 0x4a9eff,
        size: 0.08,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    })

    const particles = new THREE.Points(geometry, material)
    waterGroup.add(particles)

    waterGroup.particles = particles
    waterGroup.velocities = velocities
    waterGroup.positions = positions
    waterGroup.lifetimes = lifetimes
    waterGroup.particleCount = particleCount
    waterGroup.maxLifetime = maxLifetime

    return waterGroup

}

function createESP32(group) {
    // PCB board
    const pcbMaterial = new THREE.MeshStandardMaterial({ color: 0x1b5e20 });
    const pcbGeometry = new THREE.BoxGeometry(0.25, 0.02, 0.12);
    const pcb = new THREE.Mesh(pcbGeometry, pcbMaterial);
    pcb.position.y = 0.25;
    pcb.castShadow = true;
    group.add(pcb);

    // Chip
    const chipMaterial = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const chipGeometry = new THREE.BoxGeometry(0.08, 0.015, 0.08);
    const chip = new THREE.Mesh(chipGeometry, chipMaterial);
    chip.position.set(0, 0.27, 0);
    group.add(chip);

    // USB port
    const usbMaterial = new THREE.MeshStandardMaterial({ color: 0x9e9e9e });
    const usbGeometry = new THREE.BoxGeometry(0.04, 0.015, 0.03);
    const usb = new THREE.Mesh(usbGeometry, usbMaterial);
    usb.position.set(-0.12, 0.26, 0);
    group.add(usb);

    // Antenna
    const antennaMaterial = new THREE.MeshStandardMaterial({ color: 0x757575 });
    const antennaGeometry = new THREE.BoxGeometry(0.06, 0.015, 0.025);
    const antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna.position.set(0.1, 0.27, 0);
    group.add(antenna);

    // Stand
    const standGeometry = new THREE.BoxGeometry(0.15, 0.23, 0.08);
    const standMaterial = new THREE.MeshStandardMaterial({ color: 0x37474f });
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    stand.position.y = 0.115;
    stand.castShadow = true;
    group.add(stand);

    // LED indicators
    const ledColors = [0x4caf50, 0xf44336];
    ledColors.forEach((color, i) => {
        const ledMaterial = new THREE.MeshStandardMaterial({ color: color, emissive: color });
        const ledGeometry = new THREE.SphereGeometry(0.01, 8, 8);
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.position.set(0.05, 0.27, -0.04 + i * 0.03);
        group.add(led);
    });
}

function createFan(group) {
    const canopyMaterial = new THREE.MeshStandardMaterial({ color: 0xd4a574 });
    const motorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
    const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });

    // Fan pole
    const fanPoleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
    const fanPole = new THREE.Mesh(fanPoleGeometry, poleMaterial);
    fanPole.position.y = 1.5;
    fanPole.castShadow = true;
    group.add(fanPole);

    // Fan motor housing
    const motorGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8);
    const motor = new THREE.Mesh(motorGeometry, motorMaterial);
    motor.position.y = 1.0;
    motor.castShadow = true;
    group.add(motor);

    // Fan blades group (rotatable)
    const fanGroup = new THREE.Group();
    fanGroup.position.y = 0.95;
    fanGroup.name = 'bladeGroup';
    fanGroup.userData.isRotating = false;

    // Create 3 fan blades
    for (let i = 0; i < 3; i++) {
        const bladeGeometry = new THREE.BoxGeometry(2, 0.05, 0.4);
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.rotation.y = (i / 3) * Math.PI * 2;
        blade.castShadow = true;
        fanGroup.add(blade);
    }
    
    group.add(fanGroup);
    group.fanBlades = fanGroup;
    group.userData.isRunning = false;
}

// ==================== ANIMALS ====================

function createChicken(group) {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5dc, roughness: 0.8 });
    const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xffa726 });
    const combMaterial = new THREE.MeshStandardMaterial({ color: 0xd32f2f });
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xffb74d });
    
    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.15, 12, 12);
    bodyGeometry.scale(1.2, 1, 1);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.2;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.1, 10, 10);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.15, 0.32, 0);
    head.castShadow = true;
    group.add(head);
    
    // Beak
    const beakGeometry = new THREE.ConeGeometry(0.03, 0.08, 6);
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0.25, 0.3, 0);
    beak.rotation.z = -Math.PI / 2;
    group.add(beak);
    
    // Comb
    const combGeometry = new THREE.BoxGeometry(0.06, 0.08, 0.02);
    const comb = new THREE.Mesh(combGeometry, combMaterial);
    comb.position.set(0.15, 0.42, 0);
    group.add(comb);
    
    // Legs
    [-0.05, 0.05].forEach(z => {
        const legGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6);
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(0, 0.06, z);
        group.add(leg);
    });
}

function createCow(group) {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const spotMaterial = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
    const noseMaterial = new THREE.MeshStandardMaterial({ color: 0xffb6c1 });
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.8, 0.45, 0.4);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.45;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.BoxGeometry(0.25, 0.25, 0.22);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.45, 0.55, 0);
    head.castShadow = true;
    group.add(head);
    
    // Snout
    const snoutGeometry = new THREE.BoxGeometry(0.12, 0.1, 0.18);
    const snout = new THREE.Mesh(snoutGeometry, noseMaterial);
    snout.position.set(0.56, 0.48, 0);
    group.add(snout);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.25, 8);
    [[-0.25, -0.12], [-0.25, 0.12], [0.25, -0.12], [0.25, 0.12]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeometry, bodyMaterial);
        leg.position.set(x, 0.125, z);
        leg.castShadow = true;
        group.add(leg);
    });

    // Spots
    const spotGeometry = new THREE.CircleGeometry(0.08, 8);
    [[0.1, 0.5, 0.21], [-0.1, 0.45, -0.21]].forEach(([x, y, z]) => {
        const spot = new THREE.Mesh(spotGeometry, spotMaterial);
        spot.position.set(x, y, z);
        spot.rotation.y = z > 0 ? 0 : Math.PI;
        group.add(spot);
    });
}

function createPig(group) {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffb6c1, roughness: 0.7 });
    const snoutMaterial = new THREE.MeshStandardMaterial({ color: 0xf48fb1 });
    
    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.25, 12, 12);
    bodyGeometry.scale(1.3, 1, 1);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.25;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.15, 10, 10);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.3, 0.3, 0);
    head.castShadow = true;
    group.add(head);
    
    // Snout
    const snoutGeometry = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 12);
    const snout = new THREE.Mesh(snoutGeometry, snoutMaterial);
    snout.position.set(0.42, 0.28, 0);
    snout.rotation.z = Math.PI / 2;
    group.add(snout);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.04, 0.035, 0.15, 8);
    [[-0.15, -0.1], [-0.15, 0.1], [0.15, -0.1], [0.15, 0.1]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeometry, bodyMaterial);
        leg.position.set(x, 0.075, z);
        leg.castShadow = true;
        group.add(leg);
    });

    // Curly tail
    const tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.3, 0.25, 0),
        new THREE.Vector3(-0.35, 0.3, 0.03),
        new THREE.Vector3(-0.32, 0.35, 0)
    ]);
    const tailGeometry = new THREE.TubeGeometry(tailCurve, 8, 0.015, 6, false);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    group.add(tail);
}

function createSheep(group) {
    const woolMaterial = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 1 });
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0x2d2d2d });
    
    // Fluffy wool body
    const bodyPositions = [
        { x: 0, y: 0.35, z: 0, r: 0.22 },
        { x: 0.12, y: 0.38, z: 0.08, r: 0.15 },
        { x: -0.1, y: 0.38, z: 0.1, r: 0.14 }
    ];
    bodyPositions.forEach(bp => {
        const woolGeometry = new THREE.IcosahedronGeometry(bp.r, 1);
        const wool = new THREE.Mesh(woolGeometry, woolMaterial);
        wool.position.set(bp.x, bp.y, bp.z);
        wool.castShadow = true;
        group.add(wool);
    });
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.1, 10, 10);
    const head = new THREE.Mesh(headGeometry, faceMaterial);
    head.position.set(0.28, 0.4, 0);
    head.castShadow = true;
    group.add(head);
    
    // Legs
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const legGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6);
    [[-0.12, -0.08], [-0.12, 0.08], [0.1, -0.08], [0.1, 0.08]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(x, 0.1, z);
        leg.castShadow = true;
        group.add(leg);
    });
}

function createDuck(group) {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const beakMaterial = new THREE.MeshStandardMaterial({ color: 0xffa726 });
    const legMaterial = new THREE.MeshStandardMaterial({ color: 0xff8f00 });
    
    // Body
    const bodyGeometry = new THREE.SphereGeometry(0.15, 12, 12);
    bodyGeometry.scale(1.3, 0.9, 1);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.15;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeometry = new THREE.SphereGeometry(0.08, 10, 10);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.18, 0.28, 0);
    head.castShadow = true;
    group.add(head);
    
    // Beak
    const beakGeometry = new THREE.BoxGeometry(0.1, 0.025, 0.06);
    const beak = new THREE.Mesh(beakGeometry, beakMaterial);
    beak.position.set(0.27, 0.26, 0);
    group.add(beak);
    
    // Legs
    [-0.04, 0.04].forEach(z => {
        const legGeometry = new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6);
        const leg = new THREE.Mesh(legGeometry, legMaterial);
        leg.position.set(0.02, 0.04, z);
        group.add(leg);
    });
}

function createHorse(group) {
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.8 });
    const darkMaterial = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.7, 0.35, 0.3);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.55;
    body.castShadow = true;
    group.add(body);
    
    // Neck
    const neckGeometry = new THREE.CylinderGeometry(0.08, 0.12, 0.35, 8);
    const neck = new THREE.Mesh(neckGeometry, bodyMaterial);
    neck.position.set(0.35, 0.72, 0);
    neck.rotation.z = -0.5;
    neck.castShadow = true;
    group.add(neck);
    
    // Head
    const headGeometry = new THREE.BoxGeometry(0.25, 0.15, 0.12);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.set(0.52, 0.85, 0);
    head.rotation.z = -0.2;
    head.castShadow = true;
    group.add(head);
    
    // Legs
    const legGeometry = new THREE.CylinderGeometry(0.035, 0.03, 0.4, 8);
    [[-0.22, -0.1], [-0.22, 0.1], [0.22, -0.1], [0.22, 0.1]].forEach(([x, z]) => {
        const leg = new THREE.Mesh(legGeometry, bodyMaterial);
        leg.position.set(x, 0.2, z);
        leg.castShadow = true;
        group.add(leg);
        
        const hoofGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.04, 8);
        const hoof = new THREE.Mesh(hoofGeometry, darkMaterial);
        hoof.position.set(x, 0.02, z);
        group.add(hoof);
    });

    // Mane
    const maneMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    for (let i = 0; i < 5; i++) {
        const maneGeometry = new THREE.BoxGeometry(0.04, 0.1, 0.02);
        const mane = new THREE.Mesh(maneGeometry, maneMaterial);
        mane.position.set(0.35 + i * 0.02, 0.78 + i * 0.02, 0);
        mane.rotation.z = -0.3;
        group.add(mane);
    }
}

// ==================== ENVIRONMENT ====================

function createTree(group) {
    // Trunk
    const trunkGeometry = new THREE.CylinderGeometry(0.15, 0.2, 1.5, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);

    // Foliage layers
    const foliageMaterial = new THREE.MeshStandardMaterial({ color: 0x266f20 });
    const layers = [
        { y: 1.8, r: 0.8, h: 1.2 },
        { y: 2.5, r: 0.6, h: 1.0 },
        { y: 3.1, r: 0.4, h: 0.8 }
    ];
    layers.forEach(layer => {
        const foliageGeometry = new THREE.ConeGeometry(layer.r, layer.h, 8);
        const foliage = new THREE.Mesh(foliageGeometry, foliageMaterial);
        foliage.position.y = layer.y;
        foliage.castShadow = true;
        group.add(foliage);
    });
}

function createBush(group) {
    const bushMaterial = new THREE.MeshStandardMaterial({ color: 0x266f20 });
    
    // Multiple spheres for organic shape
    const positions = [
        { x: 0, y: 0.2, z: 0, r: 0.25 },
        { x: 0.15, y: 0.25, z: 0.1, r: 0.18 },
        { x: -0.12, y: 0.22, z: 0.12, r: 0.16 },
        { x: 0.1, y: 0.18, z: -0.15, r: 0.15 }
    ];
    
    positions.forEach(pos => {
        const sphereGeometry = new THREE.SphereGeometry(pos.r, 8, 8);
        const sphere = new THREE.Mesh(sphereGeometry, bushMaterial);
        sphere.position.set(pos.x, pos.y, pos.z);
        sphere.castShadow = true;
        group.add(sphere);
    });

    // Some small flowers
    const flowerMaterial = new THREE.MeshStandardMaterial({ color: 0xffeb3b });
    for (let i = 0; i < 5; i++) {
        const flowerGeometry = new THREE.SphereGeometry(0.03, 6, 6);
        const flower = new THREE.Mesh(flowerGeometry, flowerMaterial);
        flower.position.set(
            (Math.random() - 0.5) * 0.4,
            0.3 + Math.random() * 0.1,
            (Math.random() - 0.5) * 0.4
        );
        group.add(flower);
    }
}

function createStorageHouse(group) {
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8d6e63 });
    const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x4e342e });

    // Walls
    const wallGeometry = new THREE.BoxGeometry(2, 1.5, 1.5);
    const walls = new THREE.Mesh(wallGeometry, wallMaterial);
    walls.position.y = 0.75;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Roof
    const roofGeometry = new THREE.ConeGeometry(1.5, 0.8, 4);
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.position.y = 1.9;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Door
    const doorGeometry = new THREE.BoxGeometry(0.5, 1, 0.05);
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, 0.5, 0.76);
    group.add(door);

    // Window
    const windowMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x87ceeb, 
        transparent: true, 
        opacity: 0.7 
    });
    const windowGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.05);
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    windowMesh.position.set(0.5, 1, 0.76);
    group.add(windowMesh);
}

function createFence(group) {
    const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    
    // Posts
    const postGeometry = new THREE.BoxGeometry(0.08, 0.6, 0.08);
    [-0.4, 0, 0.4].forEach(x => {
        const post = new THREE.Mesh(postGeometry, woodMaterial);
        post.position.set(x, 0.3, 0);
        post.castShadow = true;
        group.add(post);
    });

    // Rails
    const railGeometry = new THREE.BoxGeometry(1, 0.06, 0.04);
    [0.2, 0.45].forEach(y => {
        const rail = new THREE.Mesh(railGeometry, woodMaterial);
        rail.position.set(0, y, 0);
        rail.castShadow = true;
        group.add(rail);
    });
}

function createRock(group) {
    const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x757575, roughness: 0.9 });
    
    // Main rock
    const rockGeometry = new THREE.DodecahedronGeometry(0.3, 1);
    const rock = new THREE.Mesh(rockGeometry, rockMaterial);
    rock.position.y = 0.2;
    rock.scale.set(1, 0.7, 0.9);
    rock.rotation.set(Math.random(), Math.random(), 0);
    rock.castShadow = true;
    group.add(rock);

    // Smaller rocks
    for (let i = 0; i < 2; i++) {
        const smallRockGeometry = new THREE.DodecahedronGeometry(0.12, 0);
        const smallRock = new THREE.Mesh(smallRockGeometry, rockMaterial);
        smallRock.position.set(
            (Math.random() - 0.5) * 0.4,
            0.08,
            (Math.random() - 0.5) * 0.3
        );
        smallRock.rotation.set(Math.random(), Math.random(), 0);
        smallRock.castShadow = true;
        group.add(smallRock);
    }
}

function createPath(group) {
    const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x9e9e9e });
    const dirtMaterial = new THREE.MeshStandardMaterial({ color: 0x6d4c41 });

    // Dirt base
    const baseGeometry = new THREE.BoxGeometry(1.5, 0.02, 0.6);
    const base = new THREE.Mesh(baseGeometry, dirtMaterial);
    base.position.y = 0.01;
    base.receiveShadow = true;
    group.add(base);

    // Stepping stones
    const stonePositions = [-0.5, 0, 0.5];
    stonePositions.forEach(x => {
        const stoneGeometry = new THREE.CylinderGeometry(0.15, 0.17, 0.05, 8);
        const stone = new THREE.Mesh(stoneGeometry, stoneMaterial);
        stone.position.set(x, 0.03, 0);
        stone.rotation.y = Math.random();
        stone.receiveShadow = true;
        group.add(stone);
    });
}

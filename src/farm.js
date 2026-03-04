import * as THREE from 'three';
import { loadModel } from './modelLoader.js';

// Store loaded models
let cropModel = null
let greenhouseModel = null

export async function createFarm(scene) {
  const farmElements = {
    crops: [],
    buildings: [],
    irrigation: [],
    sprinklers: [],
    waterParticles: []
  };

  // Load crop model
  try {
    cropModel = await loadModel('/models/crops_low_poly.glb');
    console.log('Crop model loaded successfully!');
    console.log('Model structure:', cropModel);
  } catch (error) {
    console.warn('Could not load crop model, using fallback geometry:', error);
  }

  //load greenhouse model
  try {
    greenhouseModel = await loadModel('/models/greenhouse.glb')
    console.log('greenhouse model loaded')
  } catch(error) {
    console.warn('error loading model')
  }

  await createCropFields(scene, farmElements);

  createFarmHouse(scene, farmElements);
  createGreenhouse(scene, farmElements);
  createWaterTank(scene, farmElements);

  createIrrigationPipes(scene, farmElements);
  createSprinklers(scene, farmElements);

  createTrees(scene, farmElements);

  createFences(scene, farmElements);

  createDecorations(scene, farmElements);

  return {
    toggleIrrigation: (active) => toggleIrrigation(farmElements, active),
    toggleSprinkler: (active) => toggleSprinkler(farmElements, active, scene),
    toggleFan: (active) => toggleFan(farmElements, active),
    toggleLights: (active) => toggleLights(farmElements, active),
    update: () => updateFarm(farmElements),
    crops: farmElements.crops 
  };
}

async function createCropFields(scene, farmElements) {
  const soilMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d4e37, 
    roughness: 0.95
  });

  // Create raised soil beds
  for (let row = 0; row < 2; row++) {
    const bedGeometry = new THREE.BoxGeometry(18, 0.3, 2);
    const soilBed = new THREE.Mesh(bedGeometry, soilMaterial);
    soilBed.position.set(-6, 0.15, -8 + row * 8);
    soilBed.receiveShadow = true;
    scene.add(soilBed);

    // Plant corn in rows on the bed
    for (let col = 0; col < 9; col++) {
      if (cropModel) {
        const plant = createModelPlant(0);
        plant.position.set(-15 + col * 2, 0.3, -8 + row * 4);
        plant.castShadow = true;
        plant.receiveShadow = true;
        plant.userData.originalY = 0.3;
        plant.userData.growthPhase = Math.random();
        
        scene.add(plant);
        farmElements.crops.push(plant);
      }
    }
  }


  for (let row = 3; row < 6; row++) {
    const bedGeometry = new THREE.BoxGeometry(18, 0.3, 2);
    const soilBed = new THREE.Mesh(bedGeometry, soilMaterial);
    soilBed.position.set(-6, 0.15, -8 + row * 2);
    soilBed.receiveShadow = true;
    scene.add(soilBed);

    // Plant corn in rows on the bed
    for (let col = 0; col < 9; col++) {
      if (cropModel) {
        const plant = createModelPlant(0);
        plant.position.set(-15 + col * 2, 0.3, -8 + row * 2);
        plant.castShadow = true;
        plant.receiveShadow = true;
        plant.userData.originalY = 0.3;
        plant.userData.growthPhase = Math.random();
        
        scene.add(plant);
        farmElements.crops.push(plant);
      }
    }
  }

}

function createModelPlant(type) {
  if (!cropModel) {
    console.warn('No crop model loaded - skipping plant');
    return new THREE.Group(); 
  }
  
  // Clone the loaded model
  const plant = cropModel.clone();
  
  // Adjust scale based on plant type
  const scales = {
    0: 0.8,  // Corn - larger
    1: 0.6,  // Tomato - medium
    2: 0.4   // Lettuce - smaller
  };
  
  const scale = scales[type] || 0.8;
  plant.scale.set(scale, scale, scale);
  
  // Ensure model is visible
  plant.visible = true;
  
  // Enable shadows for all meshes in the model
  plant.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.visible = true;
      
      // Make sure materials are visible
      if (child.material) {
        child.material.needsUpdate = true;
      }
    }
  });
  
  console.log(`Created ${type === 0 ? 'corn' : type === 1 ? 'tomato' : 'lettuce'} plant from model, scale: ${scale}`);
  
  return plant;
}

function createFarmHouse(scene, farmElements) {
  const foundationGeometry = new THREE.BoxGeometry(9, 0.5, 7);
  const foundationMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x696969,
    roughness: 0.9
  });
  const foundation = new THREE.Mesh(foundationGeometry, foundationMaterial);
  foundation.position.set(20, 0.25, -15);
  foundation.receiveShadow = true;
  scene.add(foundation);

  // House base
  const houseGeometry = new THREE.BoxGeometry(8, 5, 6);
  const houseMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xD2691E,
    roughness: 0.8
  });
  const house = new THREE.Mesh(houseGeometry, houseMaterial);
  house.position.set(20, 2.75, -15);
  house.castShadow = true;
  house.receiveShadow = true;
  scene.add(house);
  farmElements.buildings.push(house);

  // Roof
  const roofGeometry = new THREE.ConeGeometry(5.5, 3, 4);
  const roofMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.7
  });
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(20, 6.75, -15);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);

  // Chimney
  const chimneyGeometry = new THREE.BoxGeometry(0.8, 2, 0.8);
  const chimneyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B0000 });
  const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
  chimney.position.set(22, 6.5, -16);
  chimney.castShadow = true;
  scene.add(chimney);

  // Door with frame
  const doorFrameGeometry = new THREE.BoxGeometry(1.7, 3.2, 0.15);
  const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x4a3728 });
  const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
  doorFrame.position.set(20, 1.6, -11.85);
  scene.add(doorFrame);

  const doorGeometry = new THREE.BoxGeometry(1.5, 3, 0.2);
  const doorMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x654321,
    roughness: 0.6
  });
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(20, 1.5, -11.9);
  scene.add(door);

  // Door knob
  const knobGeometry = new THREE.SphereGeometry(0.08, 8, 8);
  const knobMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFFD700,
    metalness: 0.9,
    roughness: 0.1
  });
  const knob = new THREE.Mesh(knobGeometry, knobMaterial);
  knob.position.set(20.6, 1.5, -11.75);
  scene.add(knob);

  // Windows with frames
  const windowPositions = [[22, 3, -11.9], [18, 3, -11.9], [23.9, 3, -15], [16.1, 3, -15]];
  windowPositions.forEach(pos => {
    const windowFrameGeometry = new THREE.BoxGeometry(1.2, 1.2, 0.15);
    const windowFrameMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
    const windowFrame = new THREE.Mesh(windowFrameGeometry, windowFrameMaterial);
    windowFrame.position.set(pos[0], pos[1], pos[2]);
    scene.add(windowFrame);

    const windowGeometry = new THREE.BoxGeometry(1, 1, 0.1);
    const windowMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x87CEEB,
      transparent: true,
      opacity: 0.7,
      metalness: 0.5
    });
    const windowMesh = new THREE.Mesh(windowGeometry, windowMaterial);
    windowMesh.position.set(pos[0], pos[1], pos[2]);
    scene.add(windowMesh);
  });

  // Front porch
  const porchGeometry = new THREE.BoxGeometry(4, 0.3, 2);
  const porchMaterial = new THREE.MeshStandardMaterial({ color: 0x8B7355 });
  const porch = new THREE.Mesh(porchGeometry, porchMaterial);
  porch.position.set(20, 0.65, -10.5);
  porch.receiveShadow = true;
  scene.add(porch);

  // Porch pillars
  const pillarGeometry = new THREE.CylinderGeometry(0.15, 0.15, 2, 8);
  const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0xFFFFFF });
  [-1.5, 1.5].forEach(x => {
    const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
    pillar.position.set(20 + x, 1.8, -9.5);
    scene.add(pillar);
  });
}

// function createGreenhouse(scene, farmElements) {
//   // Greenhouse metal frame structure
//   const frameMaterial = new THREE.MeshStandardMaterial({
//     color: 0x888888,
//     metalness: 0.8,
//     roughness: 0.2
//   });

//   // Vertical frame posts
//   const postGeometry = new THREE.BoxGeometry(0.15, 4, 0.15);
//   const posts = [
//     [-25, 2, 12], [-25, 2, 18], [-15, 2, 12], [-15, 2, 18],
//     [-20, 2, 12], [-20, 2, 18]
//   ];
//   posts.forEach(pos => {
//     const post = new THREE.Mesh(postGeometry, frameMaterial);
//     post.position.set(pos[0], pos[1], pos[2]);
//     post.castShadow = true;
//     scene.add(post);
//   });

//   // Horizontal frame beams
//   const beamGeometry1 = new THREE.BoxGeometry(10, 0.15, 0.15);
//   const beamGeometry2 = new THREE.BoxGeometry(0.15, 0.15, 6);
  
//   // Top beams
//   [12, 18].forEach(z => {
//     const beam = new THREE.Mesh(beamGeometry1, frameMaterial);
//     beam.position.set(-20, 4, z);
//     scene.add(beam);
//   });
  
//   [-25, -15].forEach(x => {
//     const beam = new THREE.Mesh(beamGeometry2, frameMaterial);
//     beam.position.set(x, 4, 15);
//     scene.add(beam);
//   });

//   // Glass panels
//   const glassGeometry = new THREE.BoxGeometry(10, 4, 6);
//   const glassMaterial = new THREE.MeshStandardMaterial({
//     color: 0xE0FFFF,
//     transparent: true,
//     opacity: 0.25,
//     roughness: 0.05,
//     metalness: 0.1
//   });
//   const greenhouse = new THREE.Mesh(glassGeometry, glassMaterial);
//   greenhouse.position.set(-20, 2, 15);
//   greenhouse.castShadow = true;
//   greenhouse.receiveShadow = true;
//   scene.add(greenhouse);
//   farmElements.buildings.push(greenhouse);

//   // Arched roof
//   const roofCurveGeometry = new THREE.CylinderGeometry(3.5, 3.5, 10, 16, 1, true, 0, Math.PI);
//   const roofMaterial = new THREE.MeshStandardMaterial({
//     color: 0xB0E0E6,
//     transparent: true,
//     opacity: 0.3,
//     side: THREE.DoubleSide
//   });
//   const roofMesh = new THREE.Mesh(roofCurveGeometry, roofMaterial);
//   roofMesh.position.set(-20, 4, 15);
//   roofMesh.rotation.z = Math.PI / 2;
//   scene.add(roofMesh);

//   // Add plants inside greenhouse
//   const plantPositions = [
//     [-22, 0.5, 13], [-22, 0.5, 15], [-22, 0.5, 17],
//     [-20, 0.5, 13], [-20, 0.5, 15], [-20, 0.5, 17],
//     [-18, 0.5, 13], [-18, 0.5, 15], [-18, 0.5, 17]
//   ];

//   plantPositions.forEach((pos, index) => {
//     // Plant pot
//     const potGeometry = new THREE.CylinderGeometry(0.3, 0.25, 0.4, 8);
//     const potMaterial = new THREE.MeshStandardMaterial({ 
//       color: 0x8B4513,
//       roughness: 0.9
//     });
//     const pot = new THREE.Mesh(potGeometry, potMaterial);
//     pot.position.set(pos[0], pos[1], pos[2]);
//     pot.castShadow = true;
//     scene.add(pot);

//     // Create herb/small plant for greenhouse
//     const plantGroup = new THREE.Group();
    
//     // Soil
//     const soilGeometry = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 8);
//     const soilMaterial = new THREE.MeshStandardMaterial({ color: 0x3E2723 });
//     const soil = new THREE.Mesh(soilGeometry, soilMaterial);
//     soil.position.y = 0.2;
//     plantGroup.add(soil);

//     // Create bushy herb plant
//     const leafColors = [0x228B22, 0x2E8B57, 0x3CB371];
//     const leafColor = leafColors[index % 3];
    
//     for (let i = 0; i < 12; i++) {
//       const leafGeometry = new THREE.SphereGeometry(0.08, 6, 6);
//       const leafMaterial = new THREE.MeshStandardMaterial({ 
//         color: leafColor,
//         roughness: 0.8
//       });
//       const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
//       const angle = (i / 12) * Math.PI * 2;
//       const radius = 0.1 + Math.random() * 0.1;
//       const height = 0.3 + Math.random() * 0.2;
      
//       leaf.position.set(
//         Math.cos(angle) * radius,
//         height,
//         Math.sin(angle) * radius
//       );
//       leaf.scale.set(1, 1.2, 1);
//       plantGroup.add(leaf);
//     }

//     // Small stems
//     const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x556B2F });
//     for (let i = 0; i < 5; i++) {
//       const stemGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 4);
//       const stem = new THREE.Mesh(stemGeometry, stemMaterial);
//       const angle = (i / 5) * Math.PI * 2;
//       stem.position.set(
//         Math.cos(angle) * 0.08,
//         0.4,
//         Math.sin(angle) * 0.08
//       );
//       stem.rotation.z = Math.PI / 8;
//       plantGroup.add(stem);
//     }

//     plantGroup.position.set(pos[0], pos[1], pos[2]);
//     plantGroup.userData.originalY = pos[1];
//     scene.add(plantGroup);
//     farmElements.crops.push(plantGroup);
//   });

//   // Add ceiling fan
//   const fanPoleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1, 8);
//   const fanPoleMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
//   const fanPole = new THREE.Mesh(fanPoleGeometry, fanPoleMaterial);
//   fanPole.position.set(-20, 3.5, 15);
//   scene.add(fanPole);

//   // Fan motor housing
//   const motorGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8);
//   const motorMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
//   const motor = new THREE.Mesh(motorGeometry, motorMaterial);
//   motor.position.set(-20, 3, 15);
//   scene.add(motor);

//   // Fan blades
//   const fanGroup = new THREE.Group();
//   for (let i = 0; i < 3; i++) {
//     const bladeGeometry = new THREE.BoxGeometry(2, 0.05, 0.4);
//     const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
//     const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
//     blade.rotation.y = (i / 3) * Math.PI * 2;
//     fanGroup.add(blade);
//   }
//   fanGroup.position.set(-20, 2.9, 15);
//   fanGroup.userData.rotating = false;
//   scene.add(fanGroup);
//   farmElements.fan = fanGroup;

//   // Overhead sprinklers in greenhouse
//   const greenhouseSprinklerPositions = [
//     [-22, 3.8, 15], [-20, 3.8, 15], [-18, 3.8, 15]
//   ];

//   greenhouseSprinklerPositions.forEach(pos => {
//     const sprinklerGeometry = new THREE.CylinderGeometry(0.15, 0.1, 0.3, 8);
//     const sprinklerMaterial = new THREE.MeshStandardMaterial({ color: 0xC0C0C0 });
//     const sprinkler = new THREE.Mesh(sprinklerGeometry, sprinklerMaterial);
//     sprinkler.position.set(pos[0], pos[1], pos[2]);
//     sprinkler.rotation.x = Math.PI;
//     sprinkler.userData.rotation = 0;
//     sprinkler.userData.isGreenhouse = true;
//     scene.add(sprinkler);
//     farmElements.sprinklers.push(sprinkler);
//   });

//   // Light bulbs
//   const lightPositions = [
//     [-22, 3.5, 13], [-18, 3.5, 13],
//     [-22, 3.5, 17],  [-18, 3.5, 17]
//   ];

//   farmElements.lightBulbs = [];
//   lightPositions.forEach(pos => {
//     // Bulb fixture
//     const fixtureGeometry = new THREE.CylinderGeometry(0.15, 0.1, 0.2, 8);
//     const fixtureMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
//     const fixture = new THREE.Mesh(fixtureGeometry, fixtureMaterial);
//     fixture.position.set(pos[0], pos[1], pos[2]);
//     fixture.rotation.x = Math.PI;
//     scene.add(fixture);

//     // Light bulb
//     const bulbGeometry = new THREE.SphereGeometry(0.2, 8, 8);
//     const bulbMaterial = new THREE.MeshStandardMaterial({
//       color: 0xFFFFAA,
//       emissive: 0x000000,
//       emissiveIntensity: 0
//     });
//     const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial);
//     bulb.position.set(pos[0], pos[1] - 0.25, pos[2]);
//     scene.add(bulb);

//     // Point light for each bulb
//     const pointLight = new THREE.PointLight(0xFFFFAA, 0, 5);
//     pointLight.position.set(pos[0], pos[1] - 0.25, pos[2]);
//     scene.add(pointLight);

//     farmElements.lightBulbs.push({
//       bulb: bulb,
//       light: pointLight,
//       on: false
//     });
//   });
// }

function createGreenhouse(scene, farmElements) {
  if (greenhouseModel) {
    // Use GLB model
    const greenhouse = greenhouseModel.clone();
    
    // Position greenhouse far from crops - moved to the back right area
    greenhouse.position.set(-45, 0, 20);
    greenhouse.scale.set(1.5, 1.5, 1.5); // Adjust scale as needed
    
    // Enable shadows
    greenhouse.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    
    scene.add(greenhouse);
    farmElements.buildings.push(greenhouse);
    
    console.log('🏡 Greenhouse GLB model added to scene at position (20, 0, 20)');
  } else {
    // Fallback: create simple placeholder if model fails to load
    const placeholderGeometry = new THREE.BoxGeometry(10, 4, 6);
    const placeholderMaterial = new THREE.MeshStandardMaterial({
      color: 0xE0FFFF,
      transparent: true,
      opacity: 0.3
    });
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    placeholder.position.set(20, 2, 20);
    placeholder.castShadow = true;
    placeholder.receiveShadow = true;
    scene.add(placeholder);
    farmElements.buildings.push(placeholder);
    
    console.warn('⚠️ Using placeholder - greenhouse GLB model not loaded');
  }

}

function createWaterTank(scene, farmElements) {
  // Water tank
  const tankGeometry = new THREE.CylinderGeometry(2, 2, 5, 16);
  const tankMaterial = new THREE.MeshStandardMaterial({
    color: 0x4682B4,
    roughness: 0.3,
    metalness: 0.7
  });
  const tank = new THREE.Mesh(tankGeometry, tankMaterial);
  tank.position.set(15, 2.5, 15);
  tank.castShadow = true;
  scene.add(tank);
  farmElements.buildings.push(tank);

  // Tank stand
  const standGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 8);
  const standMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
  
  for (let i = 0; i < 4; i++) {
    const stand = new THREE.Mesh(standGeometry, standMaterial);
    const angle = (i / 4) * Math.PI * 2;
    stand.position.set(
      15 + Math.cos(angle) * 1.5,
      0.5,
      15 + Math.sin(angle) * 1.5
    );
    scene.add(stand);
  }
}

function createIrrigationPipes(scene, farmElements) {
  const pipeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x708090,
    metalness: 0.5,
    roughness: 0.5
  });
  
  
  // Vertical drop from tank
  const dropPipeGeometry = new THREE.CylinderGeometry(0.12, 0.12, 2, 8);
  const dropPipe = new THREE.Mesh(dropPipeGeometry, pipeMaterial);
  dropPipe.position.set(15, 1.5, 15);
  scene.add(dropPipe);
  farmElements.irrigation.push(dropPipe);

  // Horizontal pipe from tank to field (along Z axis)
  const connectionPipe1Geometry = new THREE.CylinderGeometry(0.1, 0.1, 20, 8);
  const connectionPipe1 = new THREE.Mesh(connectionPipe1Geometry, pipeMaterial);
  connectionPipe1.rotation.x = Math.PI / 2;
  connectionPipe1.position.set(15, 0.2, 5);
  scene.add(connectionPipe1);
  farmElements.irrigation.push(connectionPipe1);

  // Turn pipe (from Z to X direction)
  const turnPipeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 15, 8);
  const turnPipe = new THREE.Mesh(turnPipeGeometry, pipeMaterial);
  turnPipe.rotation.z = Math.PI / 2;
  turnPipe.position.set(7.5, 0.2, -5);
  scene.add(turnPipe);
  farmElements.irrigation.push(turnPipe);
  
  // Main pipe (horizontal along X axis)
  const pipeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 30, 8);
  const mainPipe = new THREE.Mesh(pipeGeometry, pipeMaterial);
  mainPipe.rotation.z = Math.PI / 2;
  mainPipe.position.set(0, 0.2, -5);
  scene.add(mainPipe);
  farmElements.irrigation.push(mainPipe);

  // Branch pipes with drip emitters
  farmElements.dripEmitters = [];
  for (let i = 0; i < 5; i++) {
    const branchGeometry = new THREE.CylinderGeometry(0.08, 0.08, 10, 8);
    const branch = new THREE.Mesh(branchGeometry, pipeMaterial);
    branch.rotation.x = Math.PI / 2;
    branch.position.set(-12 + i * 3, 0.2, 0);
    scene.add(branch);
    farmElements.irrigation.push(branch);

    // Add drip emitters along each branch
    for (let j = 0; j < 5; j++) {
      const emitterGeometry = new THREE.SphereGeometry(0.05, 6, 6);
      const emitterMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x4682B4,
        transparent: true,
        opacity: 0
      });
      const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
      emitter.position.set(-12 + i * 3, 0.1, -4 + j * 2);
      scene.add(emitter);
      farmElements.dripEmitters.push(emitter);
    }
  }

  // Add valve at tank connection point
  const valveGeometry = new THREE.SphereGeometry(0.2, 8, 8);
  const valveMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFF0000,
    metalness: 0.7,
    roughness: 0.3
  });
  const valve = new THREE.Mesh(valveGeometry, valveMaterial);
  valve.position.set(15, 0.5, 15);
  scene.add(valve);
  farmElements.buildings.push(valve);
}

function createSprinklers(scene, farmElements) {
  const sprinklerMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xC0C0C0,
    metalness: 0.6,
    roughness: 0.3
  });

  // Create sprinkler stands/poles
  const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
  const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });

  // Add sprinklers for each crop row
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 2; col++) {
      // Pole
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(-10 + col * 10, 0.6, -8 + row * 3);
      pole.castShadow = true;
      scene.add(pole);

      // Sprinkler head assembly
      const sprinklerGroup = createSprinklerHead();
      sprinklerGroup.position.set(-10 + col * 10, 1.3, -8 + row * 3);
      sprinklerGroup.userData.rotation = 0;
      sprinklerGroup.castShadow = true;
      scene.add(sprinklerGroup);
      farmElements.sprinklers.push(sprinklerGroup);
    }
  }

  // for rows 3-4
  for (let row = 3; row < 5; row++) {
    for (let col = 0; col < 2; col++) {
      // Pole
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(-10 + col * 10, 0.6, -8 + row * 3);
      pole.castShadow = true;
      scene.add(pole);

      // Sprinkler head assembly
      const sprinklerGroup = createSprinklerHead();
      sprinklerGroup.position.set(-10 + col * 10, 1.3, -8 + row * 3);
      sprinklerGroup.userData.rotation = 0;
      sprinklerGroup.castShadow = true;
      scene.add(sprinklerGroup);
      farmElements.sprinklers.push(sprinklerGroup);
    }
  }
}

function createSprinklerHead() {
  const group = new THREE.Group();
  
  // Base connector
  const baseGeometry = new THREE.CylinderGeometry(0.08, 0.1, 0.15, 8);
  const baseMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x888888,
    metalness: 0.7,
    roughness: 0.3
  });
  const base = new THREE.Mesh(baseGeometry, baseMaterial);
  base.position.y = -0.05;
  group.add(base);
  
  // Main sprinkler body (dome shape)
  const bodyGeometry = new THREE.SphereGeometry(0.12, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const bodyMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xC0C0C0,
    metalness: 0.6,
    roughness: 0.2
  });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.05;
  group.add(body);
  
  // Rotating arms (2 arms opposite each other)
  const armMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x4682B4,
    metalness: 0.5,
    roughness: 0.4
  });
  
  // Arm 1
  const arm1Geometry = new THREE.CylinderGeometry(0.025, 0.025, 0.4, 6);
  const arm1 = new THREE.Mesh(arm1Geometry, armMaterial);
  arm1.rotation.z = Math.PI / 2;
  arm1.position.set(0.2, 0.1, 0);
  group.add(arm1);
  
  // Arm 2 (opposite side)
  const arm2 = new THREE.Mesh(arm1Geometry, armMaterial);
  arm2.rotation.z = Math.PI / 2;
  arm2.position.set(-0.2, 0.1, 0);
  group.add(arm2);
  
  // Nozzles at the end of arms
  const nozzleGeometry = new THREE.ConeGeometry(0.04, 0.08, 6);
  const nozzleMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xFF6347,
    metalness: 0.4,
    roughness: 0.3
  });
  
  // Nozzle 1
  const nozzle1 = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
  nozzle1.position.set(0.4, 0.1, 0);
  nozzle1.rotation.z = -Math.PI / 2;
  group.add(nozzle1);
  
  // Nozzle 2
  const nozzle2 = new THREE.Mesh(nozzleGeometry, nozzleMaterial);
  nozzle2.position.set(-0.4, 0.1, 0);
  nozzle2.rotation.z = Math.PI / 2;
  group.add(nozzle2);
  
  return group;
}

function createTrees(scene, farmElements) {
  const positions = [
    [-20, 0, -20], [30, 0, -25], [-25, 0, 20], [35, 0, 25]
  ];

  positions.forEach(pos => {
    // Trunk with texture-like appearance
    const trunkGeometry = new THREE.CylinderGeometry(0.5, 0.7, 5, 12);
    const trunkMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x654321,
      roughness: 0.95,
      metalness: 0.1
    });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.set(pos[0], 2.5, pos[2]);
    trunk.castShadow = true;
    scene.add(trunk);

    // Multiple foliage layers for more realistic tree
    const foliageColors = [0x228B22, 0x2E8B57, 0x006400];
    
    // Bottom layer (larger)
    const foliage1 = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 8, 8),
      new THREE.MeshStandardMaterial({ 
        color: foliageColors[0],
        roughness: 0.9
      })
    );
    foliage1.position.set(pos[0], 5.5, pos[2]);
    foliage1.scale.set(1, 0.8, 1);
    foliage1.castShadow = true;
    scene.add(foliage1);

    // Middle layer
    const foliage2 = new THREE.Mesh(
      new THREE.SphereGeometry(3, 8, 8),
      new THREE.MeshStandardMaterial({ 
        color: foliageColors[1],
        roughness: 0.85
      })
    );
    foliage2.position.set(pos[0], 6.5, pos[2]);
    foliage2.scale.set(0.9, 0.7, 0.9);
    foliage2.castShadow = true;
    scene.add(foliage2);

    // Top layer (smaller)
    const foliage3 = new THREE.Mesh(
      new THREE.SphereGeometry(2, 8, 8),
      new THREE.MeshStandardMaterial({ 
        color: foliageColors[2],
        roughness: 0.8
      })
    );
    foliage3.position.set(pos[0], 7.5, pos[2]);
    foliage3.scale.set(0.8, 0.6, 0.8);
    foliage3.castShadow = true;
    scene.add(foliage3);
  });
}

function createFences(scene, farmElements) {
  const fenceMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8B4513,
    roughness: 0.9
  });

  //create fence 
  const fenceHeight = 1.2;
  const postGeometry = new THREE.BoxGeometry(0.15, fenceHeight, 0.15);
  const railGeometry = new THREE.BoxGeometry(2, 0.1, 0.1);
  
  const fenceLines = [
    { start: [-18, -13], end: [5, -11], axis: 'x' }, // Front (south) - expanded
    { start: [-18, 8], end: [5, 8], axis: 'x' },     // Back (north) - expanded
    { start: [-18, -13], end: [-18, 8], axis: 'z' }, // Left (west) - expanded
    { start: [5, -13], end: [5, 8], axis: 'z' }      // Right (east) - expanded
  ];

  fenceLines.forEach(line => {
    if (line.axis === 'x') {
      for (let x = line.start[0]; x <= line.end[0]; x += 2) {
        // Post
        const post = new THREE.Mesh(postGeometry, fenceMaterial);
        post.position.set(x, fenceHeight / 2, line.start[1]);
        post.castShadow = true;
        scene.add(post);

        // Rails
        const rail1 = new THREE.Mesh(railGeometry, fenceMaterial);
        rail1.position.set(x + 1, fenceHeight * 0.3, line.start[1]);
        scene.add(rail1);

        const rail2 = new THREE.Mesh(railGeometry, fenceMaterial);
        rail2.position.set(x + 1, fenceHeight * 0.7, line.start[1]);
        scene.add(rail2);
      }
    } else {
      for (let z = line.start[1]; z <= line.end[1]; z += 2) {
        // Post
        const post = new THREE.Mesh(postGeometry, fenceMaterial);
        post.position.set(line.start[0], fenceHeight / 2, z);
        post.castShadow = true;
        scene.add(post);

        // Rails
        const railGeometryZ = new THREE.BoxGeometry(0.1, 0.1, 2);
        const rail1 = new THREE.Mesh(railGeometryZ, fenceMaterial);
        rail1.position.set(line.start[0], fenceHeight * 0.3, z + 1);
        scene.add(rail1);

        const rail2 = new THREE.Mesh(railGeometryZ, fenceMaterial);
        rail2.position.set(line.start[0], fenceHeight * 0.7, z + 1);
        scene.add(rail2);
      }
    }
  });
}

function createDecorations(scene, farmElements) {
  // Wheelbarrow
  const wheelbarrowGroup = new THREE.Group();
  
  // Body
  const bodyGeometry = new THREE.BoxGeometry(1, 0.5, 0.8);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF4500 });
  const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
  body.position.y = 0.5;
  body.rotation.x = 0.2;
  wheelbarrowGroup.add(body);

  // Wheel
  const wheelGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.1, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
  const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
  wheel.position.set(0, 0.25, 0.5);
  wheel.rotation.z = Math.PI / 2;
  wheelbarrowGroup.add(wheel);

  // Handles
  const handleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 8);
  const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
  [-0.3, 0.3].forEach(x => {
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(x, 0.7, -0.5);
    handle.rotation.x = -Math.PI / 6;
    wheelbarrowGroup.add(handle);
  });

  wheelbarrowGroup.position.set(18, 0, -10);
  wheelbarrowGroup.castShadow = true;
  scene.add(wheelbarrowGroup);

  // Scarecrow
  const scarecrowGroup = new THREE.Group();
  
  // Post
  const postGeometry = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 8);
  const postMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
  const post = new THREE.Mesh(postGeometry, postMaterial);
  post.position.y = 1.25;
  scarecrowGroup.add(post);

  // Cross beam (arms)
  const armGeometry = new THREE.CylinderGeometry(0.08, 0.08, 2, 8);
  const arm = new THREE.Mesh(armGeometry, postMaterial);
  arm.position.y = 1.8;
  arm.rotation.z = Math.PI / 2;
  scarecrowGroup.add(arm);

  // Head
  const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
  const headMaterial = new THREE.MeshStandardMaterial({ color: 0xF5DEB3 });
  const head = new THREE.Mesh(headGeometry, headMaterial);
  head.position.y = 2.3;
  scarecrowGroup.add(head);

  // Hat
  const hatBaseGeometry = new THREE.CylinderGeometry(0.35, 0.35, 0.2, 8);
  const hatMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
  const hatBase = new THREE.Mesh(hatBaseGeometry, hatMaterial);
  hatBase.position.y = 2.6;
  scarecrowGroup.add(hatBase);

  const hatTopGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.4, 8);
  const hatTop = new THREE.Mesh(hatTopGeometry, hatMaterial);
  hatTop.position.y = 2.9;
  scarecrowGroup.add(hatTop);

  scarecrowGroup.position.set(-8, 0, 5);
  scarecrowGroup.castShadow = true;
  scene.add(scarecrowGroup);

  // Wooden crates
  for (let i = 0; i < 3; i++) {
    const crateGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const crateMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x8B7355,
      roughness: 0.95
    });
    const crate = new THREE.Mesh(crateGeometry, crateMaterial);
    crate.position.set(22 + i * 0.9, 0.4, -18);
    crate.rotation.y = Math.random() * 0.3;
    crate.castShadow = true;
    crate.receiveShadow = true;
    scene.add(crate);
  }

  // Hay bales
  for (let i = 0; i < 2; i++) {
    const baleGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
    const baleMaterial = new THREE.MeshStandardMaterial({ color: 0xDAA520 });
    const bale = new THREE.Mesh(baleGeometry, baleMaterial);
    bale.position.set(25, 0.5, -20 + i * 1.5);
    bale.rotation.z = Math.PI / 2;
    bale.castShadow = true;
    scene.add(bale);
  }
}

function toggleIrrigation(farmElements, active) {
  // Change pipe color to show water flowing
  farmElements.irrigation.forEach(pipe => {
    pipe.material.color.setHex(active ? 0x4682B4 : 0x708090);
    pipe.material.emissive.setHex(active ? 0x1E90FF : 0x000000);
    pipe.material.emissiveIntensity = active ? 0.3 : 0;
  });

  // Show/hide drip emitters
  if (farmElements.dripEmitters) {
    farmElements.dripEmitters.forEach(emitter => {
      emitter.material.opacity = active ? 0.7 : 0;
    });
  }
}

function toggleSprinkler(farmElements, active, scene) {
  if (active) {
    // Create water particles for each sprinkler
    farmElements.sprinklers.forEach(sprinkler => {
      // Create many more particles for realistic spray effect
      for (let i = 0; i < 100; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.04, 4, 4);
        const particleMaterial = new THREE.MeshStandardMaterial({
          color: 0x87CEEB,
          transparent: true,
          opacity: 0.8,
          emissive: 0x4682B4,
          emissiveIntensity: 0.3
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Start position at sprinkler head
        particle.position.copy(sprinkler.position);
        
        // Create spray pattern - water shoots outward in a circle
        const angle = (i / 100) * Math.PI * 2;
        const spray = 0.25; // Increased spray force
        
        // Random start time for continuous flow
        particle.userData.startDelay = Math.random() * 0.5;
        
        particle.userData.velocity = new THREE.Vector3(
          Math.cos(angle) * spray,
          0.3 + Math.random() * 0.15, // Higher upward arc
          Math.sin(angle) * spray
        );
        particle.userData.sprinkler = sprinkler;
        particle.userData.lifetime = -particle.userData.startDelay; // Stagger start times
        
        scene.add(particle);
        farmElements.waterParticles.push(particle);
      }
    });
  } else {
    // Remove water particles
    farmElements.waterParticles.forEach(particle => {
      scene.remove(particle);
    });
    farmElements.waterParticles = [];
  }
}

function toggleFan(farmElements, active) {
  if (farmElements.fan) {
    farmElements.fan.userData.rotating = active;
  }
}

function toggleLights(farmElements, active) {
  if (farmElements.lightBulbs) {
    farmElements.lightBulbs.forEach(lightData => {
      lightData.on = active;
      lightData.bulb.material.emissive.setHex(active ? 0xFFFF00 : 0x000000);
      lightData.bulb.material.emissiveIntensity = active ? 1 : 0;
      lightData.light.intensity = active ? 1.5 : 0;
    });
  }
}

function updateFarm(farmElements) {
  const time = Date.now() * 0.001;

  // Rotate sprinklers (outdoor ones rotate slower)
  farmElements.sprinklers.forEach(sprinkler => {
    if (sprinkler.userData.isGreenhouse) {
      sprinkler.userData.rotation += 0.04;
    } else {
      sprinkler.userData.rotation += 0.02;
    }
    sprinkler.rotation.y = sprinkler.userData.rotation;
  });

  // Rotate fan if active
  if (farmElements.fan && farmElements.fan.userData.rotating) {
    farmElements.fan.rotation.y += 0.15;
  }

  // Animate drip emitters (pulsing effect when irrigation is active)
  if (farmElements.dripEmitters) {
    farmElements.dripEmitters.forEach((emitter, index) => {
      if (emitter.material.opacity > 0) {
        const pulse = Math.sin(time * 3 + index * 0.5) * 0.2 + 0.5;
        emitter.material.opacity = pulse;
        emitter.scale.set(1 + pulse * 0.3, 1 + pulse * 0.3, 1 + pulse * 0.3);
      }
    });
  }

  // Update water particles
  farmElements.waterParticles.forEach((particle, index) => {
    // Only animate if past start delay
    if (particle.userData.lifetime < 0) {
      particle.userData.lifetime += 0.02;
      particle.material.opacity = 0;
      return;
    }
    
    // Apply gravity (faster fall)
    particle.userData.velocity.y -= 0.025;
    
    // Update position based on velocity
    particle.position.add(particle.userData.velocity);
    
    // Fade out as particle falls (slower fade for more visible water)
    particle.userData.lifetime += 0.02;
    const fadeStart = 0.8;
    if (particle.userData.lifetime > fadeStart) {
      particle.material.opacity = Math.max(0, 0.8 - (particle.userData.lifetime - fadeStart) * 1.5);
    } else {
      particle.material.opacity = 0.8;
    }

    // Reset particle if it hits the ground or fades out (faster reset)
    if (particle.position.y < 0.1 || particle.userData.lifetime > 1.2) {
      // Reset to sprinkler position
      particle.position.copy(particle.userData.sprinkler.position);
      
      // New spray angle
      const angle = Math.random() * Math.PI * 2;
      const spray = 0.25;
      
      particle.userData.velocity.set(
        Math.cos(angle) * spray,
        0.3 + Math.random() * 0.15,
        Math.sin(angle) * spray
      );
      
      particle.userData.lifetime = 0;
      particle.material.opacity = 0.8;
    }
  });
}


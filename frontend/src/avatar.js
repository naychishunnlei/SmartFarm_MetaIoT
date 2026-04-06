import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

(async function checkExistingAvatar() {
    const token = localStorage.getItem('farmverseToken');
    if (!token) { window.location.href = 'index.html'; return; }

    try {
        const response = await fetch('http://localhost:5001/api/users/profile', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await response.json();

        // If they ALREADY have an avatar, skip this page and go to map
        if (userData.has_avatar) {
            window.location.href = 'map.html';
        }
    } catch (e) {
        window.location.href = 'index.html';
    }
})();

const config = {
  skinColor: '#f1c27d',
  hairStyle: 'short',
  hairColor: '#3d2210',
  shirtStyle: 'tshirt',
  shirtColor: '#ffffff',
  bottomStyle: 'jeans',
  bottomColor: '#2980b9'
};

const UI_DATA = {
  body: {
    menus: [
      { id: 'skinColor', label: 'Skin Tone' },
      { id: 'hairStyle', label: 'Hair Style' },
      { id: 'hairColor', label: 'Hair Color' }
    ],
    options: {
      skinColor: [
        { type: 'color', val: '#fbe2c0' }, { type: 'color', val: '#f1c27d' },
        { type: 'color', val: '#e0ac69' }, { type: 'color', val: '#8d5524' }
      ],
      hairStyle: [
        { type: 'card', val: 'short', label: 'Buzz Cut' },
        { type: 'card', val: 'long', label: 'Flowing' },
        { type: 'card', val: 'bob', label: 'The Bob' }
      ],
      hairColor: [
        { type: 'color', val: '#3d2210' }, { type: 'color', val: '#222222' },
        { type: 'color', val: '#d4af37' }, { type: 'color', val: '#8b4513' }
      ]
    }
  },
  wardrobe: {
    menus: [
      { id: 'shirtStyle', label: 'Top Style' },
      { id: 'shirtColor', label: 'Top Color' },
      { id: 'bottomStyle', label: 'Bottom Style' },
      { id: 'bottomColor', label: 'Bottom Color' }
    ],
    options: {
      shirtStyle: [
        { type: 'card', val: 'tshirt', label: 'T-Shirt' },
        { type: 'card', val: 'oversized', label: 'Oversized' },
        { type: 'card', val: 'tanktop', label: 'Tank Top' },
        { type: 'card', val: 'striped', label: 'Striped' },
        { type: 'card', val: 'dress', label: 'Dress' }
      ],
      shirtColor: [
        { type: 'color', val: '#ffffff' }, { type: 'color', val: '#222' },
        { type: 'color', val: '#e74c3c' }, { type: 'color', val: '#2ecc71' }
      ],
      bottomStyle: [
        { type: 'card', val: 'jeans', label: 'Slim Fit' },
        { type: 'card', val: 'shorts', label: 'Cargo Shorts' }
      ],
      bottomColor: [
        { type: 'color', val: '#2980b9' }, { type: 'color', val: '#34495e' },
        { type: 'color', val: '#7f8c8d' }
      ]
    }
  }
};

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(0, 1.2, 3.5);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);
controls.enableDamping = true;

// --- Lighting ---
scene.add(new THREE.AmbientLight(0xffffff, 0.8));
const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
mainLight.position.set(5, 10, 7.5);
scene.add(mainLight);

const rimLight = new THREE.PointLight(0x7c6df9, 2);
rimLight.position.set(-2, 2, -2);
scene.add(rimLight);

// --- Materials ---
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

const avatarGroup = new THREE.Group();
scene.add(avatarGroup);

// --- Base Mesh Construction ---
const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.45, 0.16), mats.shirt);
bodyMesh.position.y = 1.2;
avatarGroup.add(bodyMesh);

const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mats.skin);
head.position.y = 1.575;
avatarGroup.add(head);

// Facial Features
const faceZ = 0.16;
const eyeGeo = new THREE.BoxGeometry(0.04, 0.04, 0.02);
const leftEye = new THREE.Mesh(eyeGeo, mats.faceDark);
leftEye.position.set(-0.06, 1.62, faceZ);
const rightEye = new THREE.Mesh(eyeGeo, mats.faceDark);
rightEye.position.set(0.06, 1.62, faceZ);

const nose = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), mats.skin);
nose.position.set(0, 1.575, faceZ + 0.01);

const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.02), mats.lip);
mouth.position.set(0, 1.52, faceZ);
avatarGroup.add(leftEye, rightEye, nose, mouth);

// Limbs
const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), mats.shirt);
leftArm.position.set(-0.22, 1.2, 0);
const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), mats.shirt);
rightArm.position.set(0.22, 1.2, 0);

const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.08), mats.skin);
leftHand.position.set(-0.22, 0.915, 0.02);
const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.08), mats.skin);
rightHand.position.set(0.22, 0.915, 0.02);
avatarGroup.add(leftArm, rightArm, leftHand, rightHand);

const leftLegSkin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), mats.skin);
leftLegSkin.position.set(-0.09, 0.725, 0);
const rightLegSkin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.12), mats.skin);
rightLegSkin.position.set(0.09, 0.725, 0);

const leftPants = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), mats.bottom);
leftPants.position.set(-0.09, 0.725, 0);
const rightPants = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.5, 0.14), mats.bottom);
rightPants.position.set(0.09, 0.725, 0);
avatarGroup.add(leftLegSkin, rightLegSkin, leftPants, rightPants);

const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.22), mats.shoe);
leftShoe.position.set(-0.09, 0.415, 0.04);
const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.22), mats.shoe);
rightShoe.position.set(0.09, 0.415, 0.04);
avatarGroup.add(leftShoe, rightShoe);

let currentHair = null;
let stripeGroup = null;
let dressMesh = null;

let currentTab = 'body';
let currentMenu = 'skinColor';


function updateVisuals() {
  mats.skin.color.set(config.skinColor);
  mats.hair.color.set(config.hairColor);
  mats.shirt.color.set(config.shirtColor);
  mats.bottom.color.set(config.bottomColor);

  // Hair Styles Logic
  if (currentHair) avatarGroup.remove(currentHair);
  if (config.hairStyle === 'bob') {
    currentHair = new THREE.Group();
    const topCap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.34), mats.hair);
    topCap.position.set(0, 0.15, 0);
    const backPlate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.05), mats.hair);
    backPlate.position.set(0, 0, -0.145);
    const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.22), mats.hair);
    leftSide.position.set(-0.145, 0, -0.06);
    const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.22), mats.hair);
    rightSide.position.set(0.145, 0, -0.06);
    currentHair.add(topCap, backPlate, leftSide, rightSide);
    currentHair.position.set(0, 1.575, 0);
  } else {
    const geo = config.hairStyle === 'short'
      ? new THREE.BoxGeometry(0.32, 0.08, 0.32)
      : new THREE.BoxGeometry(0.36, 0.38, 0.36);
    currentHair = new THREE.Mesh(geo, mats.hair);
    currentHair.position.y = config.hairStyle === 'short' ? 1.725 : 1.625;
    if (config.hairStyle === 'long') currentHair.position.z = -0.05;
  }
  avatarGroup.add(currentHair);

  // Shirt Styles Logic
  const isTankTop = config.shirtStyle === 'tanktop';
  const isOversized = config.shirtStyle === 'oversized';
  const isStriped = config.shirtStyle === 'striped';
  const isDress = config.shirtStyle === 'dress';

  leftArm.material = isTankTop ? mats.skin : mats.shirt;
  rightArm.material = isTankTop ? mats.skin : mats.shirt;

  const shirtScale = isOversized ? 1.25 : 1.0;
  bodyMesh.scale.set(shirtScale, 1, shirtScale);

  const armX = isOversized ? 0.26 : 0.22;
  leftArm.position.x = -armX;
  rightArm.position.x = armX;
  leftHand.position.x = -armX;
  rightHand.position.x = armX;

  // Stripe Logic
  if (stripeGroup) avatarGroup.remove(stripeGroup);
  if (isStriped) {
    stripeGroup = new THREE.Group();
    const numStripes = 3;
    const stripeSpacing = 0.08;
    const startY = 1.32;

    for (let i = 0; i < numStripes; i++) {
      const stripeGeo = new THREE.BoxGeometry(0.33, 0.02, 0.17);
      const stripe = new THREE.Mesh(stripeGeo, mats.stripe);
      stripe.position.set(0, startY - (i * stripeSpacing), 0);
      stripeGroup.add(stripe);
    }
    avatarGroup.add(stripeGroup);
  }

  // Dress Logic
  if (dressMesh) avatarGroup.remove(dressMesh);
  if (isDress) {
    const dressGeo = new THREE.BoxGeometry(0.34, 0.35, 0.18);
    dressMesh = new THREE.Mesh(dressGeo, mats.shirt);
    dressMesh.position.set(0, 0.8, 0);
    avatarGroup.add(dressMesh);
  }

  // Pants Styles Logic
  const isShorts = config.bottomStyle === 'shorts';
  
  // Hide pants when wearing a dress
  leftPants.visible = !isDress;
  rightPants.visible = !isDress;

  leftPants.scale.y = isShorts ? 0.5 : 1.0;
  rightPants.scale.y = isShorts ? 0.5 : 1.0;
  const pantsY = isShorts ? 0.85 : 0.725;
  leftPants.position.y = pantsY;
  rightPants.position.y = pantsY;
}

function renderUI() {
  const sideMenu = document.getElementById('side-menu');
  const grid = document.getElementById('options-grid');
  sideMenu.innerHTML = '';
  grid.innerHTML = '';

  UI_DATA[currentTab].menus.forEach(menu => {
    const btn = document.createElement('button');
    btn.textContent = menu.label;
    if (menu.id === currentMenu) btn.classList.add('active');
    btn.onclick = () => {
      currentMenu = menu.id;
      renderUI();
    };
    sideMenu.appendChild(btn);
  });

  UI_DATA[currentTab].options[currentMenu].forEach(opt => {
    const item = document.createElement('div');
    if (opt.type === 'color') {
      item.className = 'swatch';
      item.style.backgroundColor = opt.val;
      if (config[currentMenu] === opt.val) item.classList.add('selected');
    } else {
      item.className = 'option-card';
      item.textContent = opt.label;
      if (config[currentMenu] === opt.val) item.classList.add('selected');
    }
    item.onclick = () => {
      config[currentMenu] = opt.val;
      updateVisuals();
      renderUI();
    };
    grid.appendChild(item);
  });
}

// --- Event Listeners ---
document.querySelectorAll('.top-tabs div').forEach(tab => {
  tab.onclick = (e) => {
    document.querySelectorAll('.top-tabs div').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTab = tab.dataset.tab;
    currentMenu = UI_DATA[currentTab].menus[0].id;
    renderUI();
  };
});

document.getElementById('save-btn').onclick = async () => {
  const saveBtn = document.getElementById('save-btn');
  saveBtn.textContent = "Saving...";
  saveBtn.disabled = true;

  console.log("Saving Configuration:", config);
  
  // Save locally for instant 3D loading
  localStorage.setItem('farmverse_avatar', JSON.stringify(config));

  const token = localStorage.getItem('farmverseToken');
  
  if (!token) {
    alert("You must be logged in to save your avatar to the database.");
    window.location.href = 'index.html';
    return;
  }

  try {
    // Direct fetch to guarantee it matches your backend userController exactly
    const response = await fetch('http://localhost:5001/api/users/avatar', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        // 🌟 CRITICAL: Wrapping config inside "avatarConfig" to match req.body.avatarConfig
        body: JSON.stringify({ avatarConfig: config }) 
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Database rejected the update');
    }

    alert("Avatar successfully saved to your Farmverse profile!");
    
    // 🌟 ONLY redirect to map.html if the database actually succeeded!
    window.location.href = 'map.html'; 

  } catch (error) {
    console.error("Database sync failed:", error);
    alert(`Error saving avatar: ${error.message}`); // Now you will actually see what went wrong!
    
    // Reset button so you can try again
    saveBtn.textContent = "Save Avatar";
    saveBtn.disabled = false;
  }
};

// --- Execution ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

updateVisuals();
renderUI();
animate();
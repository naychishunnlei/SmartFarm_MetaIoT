import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import './style.scss'

// Scene setup
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })

renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(window.devicePixelRatio)
document.body.appendChild(renderer.domElement)

// Camera position
camera.position.z = 5

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// Variables to store interactive objects
let lightSwitch = null
let lightBulb = null
let isLightOn = true

// ESP32 Configuration
const ESP32_IP = '192.168.1.141' // Change this to your ESP32's IP address (check Serial Monitor)
let websocket = null

// Raycaster for click detection
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

// Connect to ESP32 via WebSocket (Port 81)
function connectToESP32() {
  try {
    websocket = new WebSocket(`ws://${ESP32_IP}:81`)
    
    websocket.onopen = () => {
      console.log('✅ Connected to ESP32')
      updateConnectionStatus('Connected', true)
    }
    
    websocket.onclose = () => {
      console.log('❌ Disconnected from ESP32')
      updateConnectionStatus('Disconnected', false)
      // Try to reconnect after 3 seconds
      setTimeout(connectToESP32, 3000)
    }
    
    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
      updateConnectionStatus('Error', false)
    }
    
    websocket.onmessage = (event) => {
      console.log('📩 Message from ESP32:', event.data)
      
      // Sync the LED state from ESP32 (when physical button is pressed)
      if (event.data === 'ON') {
        isLightOn = true
        updateLightVisual(true)
      } else if (event.data === 'OFF') {
        isLightOn = false
        updateLightVisual(false)
      }
    }
  } catch (error) {
    console.error('Failed to connect to ESP32:', error)
    updateConnectionStatus('Connection Failed', false)
  }
}

// Send toggle command to ESP32 via WebSocket
function toggleESP32LED(newState) {
  if (websocket && websocket.readyState === WebSocket.OPEN) {
    const command = newState ? 'ON' : 'OFF'
    websocket.send(command)
    console.log('📡 Command sent via WebSocket:', command)
    return Promise.resolve(true)
  } else {
    console.error('❌ WebSocket not connected')
    return Promise.resolve(false)
  }
}

// Update connection status UI
function updateConnectionStatus(status, isConnected) {
  const statusElement = document.getElementById('esp32-status')
  if (statusElement) {
    statusElement.textContent = status
    statusElement.style.color = isConnected ? '#4ade80' : '#ef4444'
  }
}

// Initialize ESP32 connection
connectToESP32()

// Load GLTF Model
const loader = new GLTFLoader()

loader.load(
  '/models/lightbulb.glb', // Path to your model in public folder
  (gltf) => {
    // Success callback
    const model = gltf.scene
    
    // Rotate model to face the camera
    model.rotation.y = Math.PI / 2// 180 degrees rotation
    // model.rotation.z = Math.PI / 2
    
    scene.add(model)
    
    // Find the switch and bulb objects in your model
    // Log the model structure to see available objects
    console.log('Model loaded successfully!')
    console.log('Model children:', model.children)
    
    model.traverse((child) => {
      console.log('Object name:', child.name)
      
      // Look for switch - adjust the name to match your model
      if (child.name.toLowerCase().includes('switch') || 
          child.name.toLowerCase().includes('plate')) {
        lightSwitch = child
        console.log('Found switch:', child.name)
      }
      
      // Look for bulb/light
      if (child.name.toLowerCase().includes('bulb') || 
          child.name.toLowerCase().includes('light') ||
          child.name.toLowerCase().includes('sphere')) {
        lightBulb = child
        console.log('Found bulb:', child.name)
      }
    })
  },
  (progress) => {
    // Progress callback
    console.log('Loading progress:', (progress.loaded / progress.total * 100) + '%')
  },
  (error) => {
    // Error callback
    console.error('Error loading model:', error)
  }
)

// Animation loop
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

animate()

// Mouse click event listener
window.addEventListener('click', (event) => {
  // Calculate mouse position in normalized device coordinates (-1 to +1)
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
  
  // Update the raycaster with camera and mouse position
  raycaster.setFromCamera(mouse, camera)
  
  // Calculate objects intersecting the picking ray
  const intersects = raycaster.intersectObjects(scene.children, true)
  
  if (intersects.length > 0) {
    const clickedObject = intersects[0].object
    console.log('Clicked on:', clickedObject.name)
    
    // Check if we clicked on the switch
    if (lightSwitch && (clickedObject === lightSwitch || clickedObject.parent === lightSwitch)) {
      toggleLight()
    }
  }
})

// Function to toggle the light
async function toggleLight() {
  const newState = !isLightOn
  
  console.log('🔄 Toggling light to:', newState ? 'ON' : 'OFF')
  
  // Send command to ESP32
  const success = await toggleESP32LED(newState)
  
  // Only update state if request was successful
  if (success) {
    isLightOn = newState
    updateLightVisual(isLightOn)
  } else {
    console.warn('⚠️ Toggle command failed, keeping previous state')
    updateConnectionStatus('Failed to send', false)
  }
}

// Update the 3D light visual
function updateLightVisual(state) {
  // Update UI status
  const lightStatusElement = document.getElementById('light-status')
  if (lightStatusElement) {
    lightStatusElement.textContent = state ? 'ON' : 'OFF'
    lightStatusElement.style.color = state ? '#4ade80' : '#ef4444'
  }
  
  // Toggle bulb brightness/material
  if (lightBulb) {
    if (state) {
      // Light ON - bright material
      if (lightBulb.material) {
        lightBulb.material.emissive = new THREE.Color(0xffffaa)
        lightBulb.material.emissiveIntensity = 1
      }
    } else {
      // Light OFF - dark material
      if (lightBulb.material) {
        lightBulb.material.emissive = new THREE.Color(0x000000)
        lightBulb.material.emissiveIntensity = 0
      }
    }
  }
  
  // Optional: Toggle scene lighting
  if (directionalLight) {
    directionalLight.intensity = state ? 1 : 0.2
  }
  if (ambientLight) {
    ambientLight.intensity = state ? 0.5 : 0.1
  }
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

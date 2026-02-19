/** @jest-environment jsdom */

import { jest } from '@jest/globals'

const mockWebSocketInstances = []
let loaderModelRef = null
let displayCubeRef = null

class MockWebSocket {
  constructor(url) {
    this.url = url
    this.readyState = 1
    mockWebSocketInstances.push(this)
  }

  send() {}

  close() {
    if (this.onclose) {
      this.onclose()
    }
  }
}

global.WebSocket = MockWebSocket
global.fetch = jest.fn(() => Promise.resolve({}))
global.requestAnimationFrame = jest.fn()
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  fillText: jest.fn(),
  fillStyle: '#000000',
  font: '12px Arial'
}))

jest.unstable_mockModule('three', () => {
  class Scene {
    constructor() {
      this.children = []
    }

    add(obj) {
      this.children.push(obj)
    }
  }

  class PerspectiveCamera {
    constructor() {
      this.position = { z: 0 }
      this.aspect = 1
    }

    updateProjectionMatrix() {}
  }

  class WebGLRenderer {
    constructor() {
      this.domElement = document.createElement('canvas')
    }

    setSize() {}
    setPixelRatio() {}
    render() {}
  }

  class AmbientLight {
    constructor(color, intensity) {
      this.color = color
      this.intensity = intensity
    }
  }

  class DirectionalLight {
    constructor(color, intensity) {
      this.color = color
      this.intensity = intensity
      this.position = { set() {} }
    }
  }

  class Raycaster {
    setFromCamera() {}
    intersectObjects() {
      return []
    }
  }

  class Vector2 {
    constructor() {
      this.x = 0
      this.y = 0
    }
  }

  class Color {
    constructor(value) {
      this.value = value
    }
  }

  class CanvasTexture {
    constructor(image) {
      this.image = image
      this.needsUpdate = false
    }
  }

  return {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    AmbientLight,
    DirectionalLight,
    Raycaster,
    Vector2,
    Color,
    CanvasTexture,
    SRGBColorSpace: 'srgb'
  }
})

jest.unstable_mockModule('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class {
    constructor() {
      this.enableDamping = false
    }

    update() {}
  }
}))

jest.unstable_mockModule('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(url, onLoad) {
      const clonedMaterial = {
        needsUpdate: false
      }
      const baseMaterial = {
        clone: jest.fn(() => clonedMaterial)
      }

      const lightSwitch = { name: 'Switch', rotation: { z: 0 } }
      const lightBulb = { name: 'Bulb', material: { emissive: null, emissiveIntensity: 0 } }
      displayCubeRef = { name: 'Cube', material: baseMaterial }

      loaderModelRef = {
        rotation: { y: 0 },
        children: [lightSwitch, lightBulb, displayCubeRef],
        traverse(callback) {
          this.children.forEach((child) => callback(child))
        }
      }

      onLoad({ scene: loaderModelRef })
    }
  }
}))

jest.unstable_mockModule('../src/style.scss', () => ({}), { virtual: true })

let socket = null

beforeAll(async () => {
  await import('../src/main.js')
  socket = mockWebSocketInstances[mockWebSocketInstances.length - 1]
})

beforeEach(() => {
  document.body.innerHTML = ''
})

test('loads the 3D model and rotates it to face the camera', () => {
  expect(loaderModelRef).not.toBeNull()
  expect(loaderModelRef.rotation.y).toBeCloseTo(Math.PI / 2)
})

// test('sets up display cube material for the UI screen', () => {
//   expect(displayCubeRef).not.toBeNull()
//   expect(displayCubeRef.material.map).toBeDefined()
//   expect(displayCubeRef.material.emissive.value).toBe(0xffffff)
//   expect(displayCubeRef.material.emissiveIntensity).toBe(1)
//   expect(displayCubeRef.material.toneMapped).toBe(false)
//   expect(displayCubeRef.material.needsUpdate).toBe(true)
// })

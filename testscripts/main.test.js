/** @jest-environment jsdom */

import { jest } from '@jest/globals'

const mockWebSocketInstances = []

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
    load() {}
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

// test('updates esp32 status on websocket open', () => {
//   document.body.innerHTML = '<div id="esp32-status"></div>'

//   socket.onopen()

//   const status = document.getElementById('esp32-status')
//   expect(status.textContent).toBe('Connected')
//   expect(status.style.color).toBe('rgb(74, 222, 128)')
// })

// test('updates sensor values from websocket message', () => {
//   document.body.innerHTML = '<div id="temp-value"></div><div id="hum-value"></div>'

//   socket.onmessage({ data: 'TEMP:25,HUM:60' })

//   const temp = document.getElementById('temp-value')
//   const hum = document.getElementById('hum-value')
//   expect(temp.textContent).toBe('25')
//   expect(hum.textContent).toBe('60')
// })

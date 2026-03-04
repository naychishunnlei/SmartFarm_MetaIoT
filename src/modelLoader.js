import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const modelCache = {};

export function loadModel(path) {
    return new Promise((resolve, reject) => {
        //return cached model if alrdy loaded
        if (modelCache[path]) {
            resolve(modelCache[path].clone())
            return
        }

        loader.load(
            path,
            (gltf) => {
                console.log('model is loaded succssfully')
                modelCache[path] = gltf.scene
                resolve(gltf.scene.clone())
            },
            (progress) => {
                const percent = (progress.loaded / progress.total * 100). toFixed(2)
            },
            (error) => {
                console.error('error loading model')
                reject(error)
            }
        )
    })
}

export function preLoadModels(models) {
    return Promise.all(models.map(path => loadModel(path)))
}
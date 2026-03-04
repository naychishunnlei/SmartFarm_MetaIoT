import { OrbitControls } from "three/examples/jsm/Addons.js";

export function setUpControls(camera, domElement) {
    const controls = new OrbitControls(camera, domElement)

    //configure controls
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.minDistance = 10
    controls.maxDistance = 100
    controls.maxPolarAngle = Math.PI / 2.2      //to prevent going below ground

    //set target to center of farm
    controls.target.set(0,0,0)
    controls.update()

    return controls
}
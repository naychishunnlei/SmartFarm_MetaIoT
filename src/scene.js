// THREE is loaded globally

export function createScene() {
    //create scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x87CEEB)
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200)

    //create camera
    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    )
    camera.position.set(30,20,30)
    camera.lookAt(0,0,0)

    //add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    //add directional light, (light color, intensity)
    const sun = new THREE.DirectionalLight(0xffffff, 0.8)
    sun.position.set(50,50,25)
    sun.castShadow = true

    //shadow area box, if obj is outside of shadow box, it won't have shadow
    sun.shadow.camera.left = -50
    sun.shadow.camera.right = 50
    sun.shadow.camera.top = 50
    sun.shadow.camera.bottom = -50

    //depth range of shadow rendering, 
    sun.shadow.camera.near = 0.1 //start rendering shadow this close to light
    sun.shadow.camera.far = 200 //stop rendering shadows after 200 units

   
    //shadow texture resolution
    sun.shadow.mapSize.width = 2048
    sun.shadow.mapSize.height = 2048

    scene.add(sun)

    //for better outdoor lighting
    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x6B8E23, 0.4)
    scene.add(hemiLight)

    //create ground
    const groundGeometry = new THREE.PlaneGeometry(150,150,50,50)
    const positions = groundGeometry.attributes.position

    for(let i = 0; i < positions.count; i++) {
        const x = positions.getX(i)
        const y = positions.getY(i)
        const noise = Math.sin(x * 0.1) * Math.cos(y * 0.1) * 0.3
        positions.setZ(i, noise)
    }
    groundGeometry.computeVertexNormals()

    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x7cb342,
        roughness: 0.85,
        metalness: 0.05
    })
    const ground = new THREE.Mesh(groundGeometry, groundMaterial)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    const pathGeometry = new THREE.PlaneGeometry(3,60)
    const pathMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B7355,
        roughness: 0.95
    })

    return { scene, camera, sun }


}
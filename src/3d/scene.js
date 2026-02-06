import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

export const state = {
    scene: null,
    camera: null,
    renderer: null,
    controls: null,
    composer: null,
    clock: new THREE.Clock(),
    width: window.innerWidth,
    height: window.innerHeight
}

export function initScene(container) {
    // 1. Scene
    state.scene = new THREE.Scene()
    state.scene.fog = new THREE.FogExp2(0x050505, 0.02)
    state.scene.background = new THREE.Color(0x050505)

    // 2. Camera
    state.camera = new THREE.PerspectiveCamera(60, state.width / state.height, 0.1, 1000)
    state.camera.position.set(0, 5, 10)
    state.camera.lookAt(0, 0.9, 0)

    // 3. Renderer
    state.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" })
    state.renderer.setSize(state.width, state.height)
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(state.renderer.domElement)

    // 4. Controls
    state.controls = new OrbitControls(state.camera, state.renderer.domElement)
    state.controls.enableDamping = true
    state.controls.dampingFactor = 0.05
    state.controls.maxPolarAngle = Math.PI / 2 + 0.2 // Allow slightly below ground? No, keep above
    state.controls.minDistance = 2
    state.controls.maxDistance = 20

    // 5. Post Processing (Bloom)
    const renderScene = new RenderPass(state.scene, state.camera)

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(state.width, state.height),
        1.9, // strength
        0.55, // radius
        0.58 // threshold
    )

    state.composer = new EffectComposer(state.renderer)
    state.composer.addPass(renderScene)
    state.composer.addPass(bloomPass)

    // Resize Handler
    window.addEventListener('resize', onWindowResize)

    return state
}

function onWindowResize() {
    state.width = window.innerWidth
    state.height = window.innerHeight

    state.camera.aspect = state.width / state.height
    state.camera.updateProjectionMatrix()

    state.renderer.setSize(state.width, state.height)
    state.composer.setSize(state.width, state.height)
}

export function renderScene() {
    state.controls.update()
    state.composer.render()
}

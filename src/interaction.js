import * as TWEEN from '@tweenjs/tween.js'
import * as THREE from 'three'

export class InteractionManager {
    constructor(sceneState, tree, photoCloud, audioController = null) {
        this.sceneState = sceneState // { camera, controls, etc }
        this.tree = tree
        this.photoCloud = photoCloud
        this.audioController = audioController

        this.state = 'TREE' // TREE, EXPLODE, FOCUS
        this.focusedPhoto = null
        this.lastGesture = 'NONE'
        this.lastTransitionAt = 0
        this.transitionCooldownMs = 700
        this.pendingGesture = 'NONE'
        this.pendingGestureFrames = 0
        this.requiredGestureFrames = 6
        this.interactAnim = null
    }

    update(gestureData) {
        const { gesture, smoothPos, angle, pinchDist, numHands } = gestureData
        
        // Update debug display
        const gestureText = document.getElementById('gesture-text')
        const stateText = document.getElementById('state-text')
        if (gestureText) gestureText.textContent = gesture
        if (stateText) stateText.textContent = this.state === 'TREE' ? 'HEART' : this.state

        // 1. Camera Control (Hand Movement)
        if (smoothPos && this.state !== 'FOCUS') {
            const targetX = (smoothPos.x - 0.5) * 4
            const targetY = (0.5 - smoothPos.y) * 4 + 5

            this.tree.mesh.rotation.y += (targetX * 0.1 - this.tree.mesh.rotation.y) * 0.05
            this.tree.mesh.rotation.x += (-(targetY - 5) * 0.05 - this.tree.mesh.rotation.x) * 0.05
        }

        this.photoCloud.update(this.sceneState.clock.getElapsedTime(), this.state === 'TREE' ? 0 : this.state === 'EXPLODE' ? 1 : 2)

        // 2. State Machine with debounce
        if (gesture === this.pendingGesture) {
            this.pendingGestureFrames += 1
        } else {
            this.pendingGesture = gesture
            this.pendingGestureFrames = 1
        }

        if (gesture === 'NONE' || this.pendingGestureFrames < this.requiredGestureFrames) return

        const now = performance.now()
        const canTransition = now - this.lastTransitionAt > this.transitionCooldownMs
        if (!canTransition) return
        if (gesture === this.lastGesture) return
        this.lastGesture = gesture

        if (gesture === 'FIST' && this.state !== 'TREE') {
            this.toTreeState()
        } else if (gesture === 'OPEN' && this.state !== 'EXPLODE') {
            this.toExplodeState()
        } else if (gesture === 'PINCH' && this.state !== 'FOCUS') {
            this.toFocusState()
        }
    }

    toTreeState() {
        this.lastTransitionAt = performance.now()
        this.state = 'TREE'
        this.restoreTreeColor()
        this.photoCloud.implode()
        this.audioController?.playTransition('tree')
        this.animateInteractTo(0, 1400, TWEEN.Easing.Quartic.InOut)

        if (this.focusedPhoto) {
            const photo = this.focusedPhoto
            this.focusedPhoto = null

            new TWEEN.Tween(photo.position)
                .to({
                    x: photo.userData.originalPos.x,
                    y: photo.userData.originalPos.y,
                    z: photo.userData.originalPos.z
                }, 800)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start()

            new TWEEN.Tween(photo.scale)
                .to({
                    x: photo.userData.originalScale.x,
                    y: photo.userData.originalScale.y,
                    z: photo.userData.originalScale.z
                }, 800)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start()
        }
    }

    toExplodeState() {
        this.lastTransitionAt = performance.now()
        this.state = 'EXPLODE'
        this.photoCloud.explode()
        if (this.focusedPhoto) this.focusedPhoto = null
        this.audioController?.playTransition('explode')
        this.animateInteractTo(1, 1300, TWEEN.Easing.Cubic.Out)
    }

    toFocusState() {
        const photos = this.photoCloud.photos
        if (photos.length === 0) return

        this.lastTransitionAt = performance.now()
        this.state = 'FOCUS'
        this.photoCloud.implode()
        this.audioController?.playTransition('focus')

        const targetPhoto = photos[Math.floor(Math.random() * photos.length)]
        this.focusedPhoto = targetPhoto

        const endPos = this.sceneState.camera.position.clone().add(
            this.sceneState.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3)
        )

        new TWEEN.Tween(targetPhoto.position)
            .to({ x: endPos.x, y: endPos.y, z: endPos.z }, 1000)
            .easing(TWEEN.Easing.Cubic.Out)
            .start()

        new TWEEN.Tween(targetPhoto.scale)
            .to({ x: 2, y: 2, z: 2 }, 1000)
            .easing(TWEEN.Easing.Back.Out)
            .start()

        targetPhoto.lookAt(this.sceneState.camera.position)

        new TWEEN.Tween(this.tree.uniforms.uColor.value)
            .to({ r: 0.1, g: 0.1, b: 0.1 }, 1000)
            .start()

        setTimeout(() => {
            if (this.state === 'FOCUS' && this.focusedPhoto === targetPhoto) {
                this.toTreeState()
            }
        }, 3000)
    }

    restoreTreeColor() {
        new TWEEN.Tween(this.tree.uniforms.uColor.value)
            .to({ r: 1.0, g: 0.95, b: 0.99 }, 1000)
            .start()
    }

    animateInteractTo(target, duration, easing) {
        this.interactAnim = {
            start: this.tree.uniforms.uInteract.value,
            target,
            duration,
            easing,
            startedAt: performance.now()
        }
    }

    tick() {
        if (!this.interactAnim) return

        const now = performance.now()
        const elapsed = now - this.interactAnim.startedAt
        const t = Math.min(Math.max(elapsed / this.interactAnim.duration, 0), 1)
        const eased = this.interactAnim.easing(t)

        this.tree.uniforms.uInteract.value = THREE.MathUtils.lerp(
            this.interactAnim.start,
            this.interactAnim.target,
            eased
        )

        if (t >= 1) {
            this.tree.uniforms.uInteract.value = this.interactAnim.target
            this.interactAnim = null
        }
    }
}

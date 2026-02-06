import { Hands } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'

// Low-pass filter for smoothing
class Smoother {
    constructor(alpha = 0.5) {
        this.alpha = alpha
        this.value = null
    }

    next(newValue) {
        if (this.value === null) {
            this.value = newValue
        } else {
            // Simple Exp Smoothing
            // For scalar:
            // this.value = this.alpha * newValue + (1 - this.alpha) * this.value

            // For arrays/objects, we need deep smooth.
            // Assuming 3D point {x,y,z}
            this.value = {
                x: this.alpha * newValue.x + (1 - this.alpha) * this.value.x,
                y: this.alpha * newValue.y + (1 - this.alpha) * this.value.y,
                z: this.alpha * newValue.z + (1 - this.alpha) * this.value.z
            }
        }
        return this.value
    }
}

export class GestureController {
    constructor() {
        this.hands = null
        this.camera = null
        this.onResult = null
        this.smoother = new Smoother(0.2) // 0.2 means very smooth, slow response. 0.8 is fast.
        this.lastState = 'TREE'
    }

    async init(videoElement, callback) {
        this.onResult = callback

        this.hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
            }
        })

        this.hands.setOptions({
            maxNumHands: 2,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        })

        this.hands.onResults((results) => this.processResults(results))

        this.camera = new Camera(videoElement, {
            onFrame: async () => {
                await this.hands.send({ image: videoElement })
            },
            width: 640,
            height: 480
        })

        await this.camera.start()
    }

    processResults(results) {
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            if (this.onResult) {
                this.onResult({
                    landmarks: null,
                    smoothPos: null,
                    gesture: 'NONE',
                    angle: 0,
                    pinchDist: 1,
                    numHands: 0
                })
            }
            return // No hands
        }

        // Process first hand for primary gestures
        const landmarks = results.multiHandLandmarks[0]

        // Smooth wrist/center for camera control
        const palmCenter = landmarks[9] // Middle finger MCP
        const smoothPos = this.smoother.next(palmCenter)

        // Geometry calculations
        const thumbTip = landmarks[4]
        const indexTip = landmarks[8]
        const middleTip = landmarks[12]
        const ringTip = landmarks[16]
        const pinkyTip = landmarks[20]
        const wrist = landmarks[0]

        // 1. Fist Detection: Average distance of tips to wrist
        const tips = [indexTip, middleTip, ringTip, pinkyTip]

        const avgDistToWrist = tips.reduce((sum, tip) => {
            return sum + this.dist(tip, wrist)
        }, 0) / 4

        // Thresholds need tuning. Normalized coords 0..1
        // Fist usually < 0.2 (depending on z)
        const isFist = avgDistToWrist < 0.25

        // 2. Open Hand: Tips far from wrist
        const isOpen = avgDistToWrist > 0.4

        // 3. Pinch: Thumb to Index
        const pinchDist = this.dist(thumbTip, indexTip)
        const isPinch = pinchDist < 0.05

        // Determine State
        let gesture = 'NONE'
        if (isFist) gesture = 'FIST'
        else if (isOpen) gesture = 'OPEN'
        else if (isPinch) gesture = 'PINCH'

        // Rotation (Thumb-Index Vector angle)
        const dx = indexTip.x - thumbTip.x
        const dy = indexTip.y - thumbTip.y
        const angle = Math.atan2(dy, dx)

        // Callback
        if (this.onResult) {
            this.onResult({
                landmarks,
                smoothPos,
                gesture,
                angle,
                pinchDist,
                numHands: results.multiHandLandmarks.length
            })
        }
    }

    dist(p1, p2) {
        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2))
    }
}

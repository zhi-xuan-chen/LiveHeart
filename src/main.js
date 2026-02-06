import './style.css'
import * as THREE from 'three'
import { initScene, renderScene, state } from './3d/scene'
import { ParticleTree } from './3d/particles'
import { PhotoCloud } from './3d/photos'
import { GestureController } from './vision/vision'
import { InteractionManager } from './interaction'
import { AudioController } from './audio/audio'
import * as TWEEN from '@tweenjs/tween.js'

const DEFAULT_AUDIO_URL = 'https://cdn.pixabay.com/download/audio/2022/10/25/audio_9463f2f595.mp3?filename=magic-christmas-night-124455.mp3'
const statusEl = document.getElementById('status-text')
const playBtn = document.getElementById('play-btn')
const musicUploadInput = document.getElementById('music-upload')
const photoUploadInput = document.getElementById('photo-upload')
const musicUploadBtn = document.getElementById('music-upload-btn')

function setStatus(text) {
  if (statusEl) statusEl.textContent = text
}

// Init Scene
const { scene } = initScene(document.querySelector('#app'))

// Init Tree
const tree = new ParticleTree(12000)
tree.init(scene)

// Init Photos
const photoCloud = new PhotoCloud()
photoCloud.init(scene)

// Add Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.58)
scene.add(ambientLight)
const pointLight = new THREE.PointLight(0xff6fb5, 1.2, 24)
pointLight.position.set(2, 5, 2)
scene.add(pointLight)
const rimLight = new THREE.PointLight(0xff9ad7, 1.05, 22)
rimLight.position.set(-3.5, 2.5, -2.5)
scene.add(rimLight)
const warmLight = new THREE.PointLight(0xffd5a8, 0.65, 18)
warmLight.position.set(0, 6, 4)
scene.add(warmLight)

// Init Audio
const audioController = new AudioController()
audioController.init()

const unlockAudio = async () => {
  if (audioController.context && audioController.context.state === 'suspended') {
    try {
      await audioController.context.resume()
      setStatus('音频已解锁，切换时将播放浪漫音效')
    } catch {
      setStatus('音频未解锁，请点击页面后重试')
    }
  }
}
window.addEventListener('pointerdown', unlockAudio, { once: true })
window.addEventListener('keydown', unlockAudio, { once: true })

// Init Interaction
const interactionManager = new InteractionManager(state, tree, photoCloud, audioController)

// Init Vision
const gestureController = new GestureController()
gestureController
  .init(document.getElementById('webcam-video'), (data) => {
    interactionManager.update(data)
  })
  .then(() => setStatus('摄像头已连接，可使用手势控制'))
  .catch(() => setStatus('摄像头访问失败，请允许摄像头权限后刷新'))

// Animation Loop
function animate() {
  requestAnimationFrame(animate)

  TWEEN.update()

  const time = state.clock.getElapsedTime()

  const beat = audioController.getBass()

  tree.update(time, beat, 0)
  interactionManager.tick()

  const loading = document.getElementById('loading')
  if (loading && time > 1) loading.style.display = 'none'

  renderScene()
}


// UI Events
document.getElementById('upload-btn').addEventListener('click', () => {
  photoUploadInput.click()
})

photoUploadInput.addEventListener('change', (e) => {
  if (e.target.files && e.target.files.length > 0) {
    photoCloud.addPhotos(e.target.files)
    setStatus(`已添加 ${e.target.files.length} 张照片`)
  }
})

musicUploadBtn.addEventListener('click', () => {
  musicUploadInput.click()
})

musicUploadInput.addEventListener('change', async (e) => {
  if (e.target.files && e.target.files.length > 0) {
    try {
      await audioController.loadFile(e.target.files[0])
      playBtn.textContent = '暂停音乐'
      setStatus(`音乐已加载：${e.target.files[0].name}`)
    } catch {
      setStatus('音乐解析失败，请更换音频文件')
    }
  }
})

playBtn.addEventListener('click', async () => {
  if (!audioController.hasTrack) {
    setStatus('正在加载默认音乐...')
    try {
      await audioController.loadUrl(DEFAULT_AUDIO_URL)
      playBtn.textContent = '暂停音乐'
      setStatus('默认音乐已开始播放')
      return
    } catch {
      setStatus('默认音乐加载失败，请上传本地音乐')
      return
    }
  }

  const playbackState = await audioController.togglePlayback()
  if (playbackState === 'PLAYING') {
    playBtn.textContent = '暂停音乐'
    setStatus('音乐播放中')
  } else if (playbackState === 'PAUSED') {
    playBtn.textContent = '继续播放'
    setStatus('音乐已暂停')
  }
})

document.getElementById('reset-btn').addEventListener('click', () => {
  interactionManager.toTreeState()
  setStatus('已重置到爱心形态')
})

window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'e') {
    interactionManager.toExplodeState()
    setStatus('已触发爆发（键盘 E）')
  }
  if (e.key.toLowerCase() === 'r') {
    interactionManager.toTreeState()
    setStatus('已还原爱心（键盘 R）')
  }
})

animate()

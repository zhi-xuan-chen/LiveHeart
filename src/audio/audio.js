export class AudioController {
    constructor() {
        this.context = null
        this.analyser = null
        this.source = null
        this.dataArray = null
        this.isPlaying = false
        this.hasTrack = false
    }

    init(url = null) {
        if (this.context) return

        const AudioContext = window.AudioContext || window.webkitAudioContext
        this.context = new AudioContext()

        this.analyser = this.context.createAnalyser()
        this.analyser.fftSize = 256
        this.dataArray = new Uint8Array(this.analyser.frequencyBinCount) // 128 bins

        // Connect to speakers
        this.analyser.connect(this.context.destination)

        if (url) {
            this.loadUrl(url)
        }
    }

    async loadUrl(url) {
        if (!this.context) this.init()
        if (this.source) this.source.stop()

        const response = await fetch(url)
        const buffer = await response.arrayBuffer()
        const audioBuffer = await this.context.decodeAudioData(buffer)

        this.playBuffer(audioBuffer)
    }

    async loadFile(file) {
        if (!this.context) this.init()
        if (this.source) this.source.stop()

        const arrayBuffer = await file.arrayBuffer()
        const audioBuffer = await this.context.decodeAudioData(arrayBuffer)

        this.playBuffer(audioBuffer)
    }

    playBuffer(buffer) {
        if (this.context.state === 'suspended') {
            this.context.resume()
        }

        this.source = this.context.createBufferSource()
        this.source.buffer = buffer
        this.source.connect(this.analyser)
        this.source.loop = true
        this.source.start(0)
        this.isPlaying = true
        this.hasTrack = true
    }

    playTransition(kind = 'explode') {
        if (!this.context) this.init()
        if (!this.context || this.context.state === 'suspended') return

        const now = this.context.currentTime + 0.01

        if (kind === 'explode') {
            this.playTone(392, now, 0.16, 'triangle', 0.05)
            this.playTone(523.25, now + 0.08, 0.18, 'sine', 0.055)
            this.playTone(659.25, now + 0.16, 0.28, 'sine', 0.06)
            return
        }

        if (kind === 'tree') {
            this.playTone(659.25, now, 0.14, 'sine', 0.05)
            this.playTone(523.25, now + 0.07, 0.16, 'triangle', 0.048)
            this.playTone(392, now + 0.14, 0.22, 'sine', 0.045)
            return
        }

        if (kind === 'focus') {
            this.playTone(523.25, now, 0.26, 'sine', 0.05)
            this.playTone(783.99, now + 0.1, 0.3, 'triangle', 0.045)
        }
    }

    playTone(freq, start, duration, wave, volume) {
        const osc = this.context.createOscillator()
        const gain = this.context.createGain()

        osc.type = wave
        osc.frequency.setValueAtTime(freq, start)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.03)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)

        osc.connect(gain)
        gain.connect(this.analyser || this.context.destination)
        osc.start(start)
        osc.stop(start + duration + 0.03)
    }

    // Get Bass value normalized 0..1
    getBass() {
        if (!this.isPlaying) return 0

        this.analyser.getByteFrequencyData(this.dataArray)

        // Bins: 128 bins over Nyquist (SampleRate/2 ~ 24kHz/2 = 12kHz usually? or 44.1/2 = 22kHz)
        // fftSize=256 -> 128 bins.
        // Each bin is approx 44100 / 256 = 172 Hz wide.
        // Index 0: 0-172 Hz (Bass)
        // Index 1: 172-344 Hz

        // Let's take average of first 2 bins for Bass (0-344Hz)
        const bassAvg = (this.dataArray[0] + this.dataArray[1]) / 2
        return bassAvg / 255
    }

    async togglePlayback() {
        if (!this.context || !this.hasTrack) return 'NO_TRACK'

        if (this.context.state === 'running') {
            await this.context.suspend()
            this.isPlaying = false
            return 'PAUSED'
        }

        await this.context.resume()
        this.isPlaying = true
        return 'PLAYING'
    }
}

export default class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;

        // Master volume
        this.masterGain = null;
    }

    init() {
        if (this.initialized) return;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3; // Default volume
        this.masterGain.connect(this.ctx.destination);

        this.initialized = true;

        // Resume context if suspended (browser policy)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Helper to create an oscillator
    playTone(freq, type, duration, startTime = 0) {
        if (!this.initialized) this.init();
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(1, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    // --- Sound Effects ---

    playShoot(type = 'default') {
        if (!this.initialized) return;

        if (type === 'PERFECT') {
            // High pitch laser
            this.playTone(880, 'square', 0.1);
            setTimeout(() => this.playTone(1760, 'sawtooth', 0.1), 50);
        } else if (type === 'GREAT') {
            this.playTone(660, 'square', 0.1);
        } else if (type === 'GOOD') {
            this.playTone(440, 'triangle', 0.1);
        } else {
            // Miss sound
            this.playTone(150, 'sawtooth', 0.15);
        }
    }

    playHit() {
        if (!this.initialized) return;
        // Simple noise-like effect using low freq sawtooth
        this.playTone(100, 'sawtooth', 0.1);
    }

    playExplosion() {
        if (!this.initialized) return;
        this.playTone(50, 'sawtooth', 0.3);
        setTimeout(() => this.playTone(30, 'square', 0.3), 50);
    }

    playUI(type) {
        if (!this.initialized) this.init(); // Auto-init for UI interactions

        if (type === 'click') {
            this.playTone(800, 'sine', 0.05);
        } else if (type === 'buy') {
            this.playTone(1200, 'sine', 0.1);
            setTimeout(() => this.playTone(1800, 'sine', 0.2, 0.1), 0);
        } else if (type === 'error') {
            this.playTone(200, 'sawtooth', 0.15);
        }
    }

    playGameOver() {
        if (!this.initialized) return;

        const now = 0;
        this.playTone(300, 'triangle', 0.5, now);
        this.playTone(250, 'triangle', 0.5, now + 0.5);
        this.playTone(200, 'triangle', 1.0, now + 1.0);
    }

    // --- BGM ---
    playBGM(url) {
        if (this.bgmAudio) {
            // Already playing this track?
            if (!this.bgmAudio.paused && this.bgmAudio.src.includes(url)) return;
            this.stopBGM();
        }

        this.bgmAudio = new Audio(url);
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.4; // Slightly lower than effects

        // Attempt to play
        this.bgmAudio.play().catch(e => {
            console.warn("BGM autoplay prevented:", e);
        });
    }

    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            this.bgmAudio = null;
        }
    }
}

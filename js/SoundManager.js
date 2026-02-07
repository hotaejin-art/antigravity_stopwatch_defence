export default class SoundManager {
    constructor() {
        this.ctx = null;
        this.initialized = false;

        // Master volume
        this.masterGain = null;
        this.isMusicEnabled = true;
        this.bgmUrl = 'audio/bgm.mp3?v=3'; // Default URL needed for resume
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

    playBossSpawn() {
        if (!this.initialized) return;
        const audio = new Audio('audio/boss_spawn.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.warn("Boss spawn SFX failed", e));
    }

    playOverdriveStart() {
        if (!this.initialized) return;
        const audio = new Audio('audio/overdrive_start.mp3');
        audio.volume = 0.6;
        audio.play().catch(e => console.warn("Overdrive start SFX failed", e));
    }

    playOverdriveEnd() {
        if (!this.initialized) return;
        const audio = new Audio('audio/overdrive_end.mp3');
        audio.volume = 0.6;
        audio.play().catch(e => console.warn("Overdrive end SFX failed", e));
    }

    playBossDeath() {
        if (!this.initialized) return;
        const audio = new Audio('audio/boss_death.mp3');
        audio.volume = 0.7; // Slightly louder for impact
        audio.play().catch(e => console.warn("Boss death SFX failed", e));
    }

    // --- BGM ---
    playBGM(url) {
        if (!url) url = this.bgmUrl;
        this.bgmUrl = url;

        if (this.bgmAudio) {
            // Already initialized?
            if (!this.bgmAudio.paused && this.bgmAudio.src.includes(url)) {
                if (!this.isMusicEnabled) this.bgmAudio.pause();
                return;
            }
            this.stopBGM();
        }

        if (!this.isMusicEnabled) return;

        this.bgmAudio = new Audio(url);
        this.bgmAudio.loop = true;
        this.bgmAudio.volume = 0.4;

        this.bgmAudio.play().catch(e => {
            console.warn("BGM autoplay prevented:", e);
        });
    }

    stopBGM() {
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            // Don't fully nullify if you want to resume? 
            // Actually, keep it simple. Destroy on stop.
            this.bgmAudio = null;
        }
    }

    toggleMusic() {
        this.isMusicEnabled = !this.isMusicEnabled;
        if (this.isMusicEnabled) {
            this.playBGM(this.bgmUrl);
        } else {
            this.stopBGM();
        }
        return this.isMusicEnabled;
    }
}

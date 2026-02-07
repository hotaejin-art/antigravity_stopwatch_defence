export default class Stopwatch {
    constructor() {
        this.time = 0;
        this.isRunning = false;
        this.targetTime = 3.00; // Start with 3 seconds
        this.nextTargetDelay = 3.00; // Seconds until next target
        this.timeScale = 1.0;
        this.isGlitched = false;

        this.tolerance = {
            PERFECT: 0.05,
            GREAT: 0.15,
            GOOD: 0.30
        };
        this.difficulty = 'NORMAL';
    }

    setDifficulty(level) {
        this.difficulty = level;
        switch (level) {
            case 'EASY':
                this.tolerance = { PERFECT: 0.08, GREAT: 0.20, GOOD: 0.40 };
                break;
            case 'NORMAL':
                this.tolerance = { PERFECT: 0.05, GREAT: 0.15, GOOD: 0.30 };
                break;
            case 'HARD':
                this.tolerance = { PERFECT: 0.03, GREAT: 0.10, GOOD: 0.20 };
                break;
            case 'HELL':
                this.tolerance = { PERFECT: 0.03, GREAT: 0, GOOD: 0 };
                break;
        }
    }

    setTimeScale(scale) {
        this.timeScale = scale;
    }

    setGlitch(enabled) {
        this.isGlitched = enabled;
    }

    upgradeTolerance() {
        // Only upgrade if not Hell? Or allow upgrading perfect window?
        // For simplicity, just multiply all.
        this.tolerance.PERFECT *= 1.2;
        if (this.difficulty !== 'HELL') {
            this.tolerance.GREAT *= 1.2;
            this.tolerance.GOOD *= 1.2;
        }
    }

    reset() {
        this.time = 0;
        this.isRunning = false;
        this.targetTime = 3.00;
        this.timeScale = 1.0;
        this.isGlitched = false;
    }

    start() {
        this.isRunning = true;
    }

    stop() {
        this.isRunning = false;
        return this.checkAccuracy();
    }

    update(deltaTime) {
        if (this.isRunning) {
            this.time += deltaTime * this.timeScale;
        }
    }

    formatTime(seconds, forceNoGlitch = false) {
        if (!forceNoGlitch && this.isGlitched && Math.random() > 0.7) {
            // Random glitch characters
            const chars = "0123456789.##??@!";
            let str = "";
            for (let i = 0; i < 5; i++) str += chars.charAt(Math.floor(Math.random() * chars.length));
            return str;
        }
        return seconds.toFixed(2).padStart(5, '0');
    }

    // Alias for compatibility if needed, or remove
    getFormattedTime() {
        return this.formatTime(this.time);
    }

    updateTarget(explicitTarget = null) {
        if (explicitTarget !== null) {
            this.targetTime = explicitTarget;
        } else {
            // Normal Logic: Round down current time + 3
            const currentInt = Math.floor(this.time);
            this.targetTime = currentInt + 3.00;
        }
    }

    checkAccuracy() {
        const diff = Math.abs(this.time - this.targetTime);

        if (diff <= this.tolerance.PERFECT) return 'PERFECT';

        if (this.difficulty === 'HELL') return 'MISS'; // Hell mode restriction

        if (diff <= this.tolerance.GREAT) return 'GREAT';
        if (diff <= this.tolerance.GOOD) return 'GOOD';
        return 'MISS';
    }
}

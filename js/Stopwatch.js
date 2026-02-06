export default class Stopwatch {
    constructor() {
        this.time = 0;
        this.isRunning = false;
        this.targetTime = 3.00; // Start with 3 seconds
        this.nextTargetDelay = 3.00; // Seconds until next target
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
            this.time += deltaTime;
        }
    }

    formatTime(seconds) {
        return seconds.toFixed(2).padStart(5, '0');
    }

    getFormattedTime() {
        return this.formatTime(this.time);
    }

    updateTarget() {
        // Increment target time for the next round
        // Logic: Add 2-4 seconds to current time for next target?
        // Or just fixed increments. Let's do fixed +3 seconds for now.
        // But we must base it on current TIME, not old target, to avoid falling behind?
        // No, the game is about stopping AT the target.
        // So after a stop (attack), we set a NEW target.
        this.targetTime = Math.ceil(this.time + 3.00) + 0.00; // Ensure it ends in .00

        // Correction: if we are at 3.01 and stop, next target should be 6.00?
        // Math.floor(time) + 3 might be safer.
        // Let's settle on: Current Integer + 3.
        const currentInt = Math.floor(this.time);
        this.targetTime = currentInt + 3.00;
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

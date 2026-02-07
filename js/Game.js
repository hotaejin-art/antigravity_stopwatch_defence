import Renderer from './Renderer.js?v=2';
import Stopwatch from './Stopwatch.js?v=2';
import Shop from './Shop.js';
import { Castle, Enemy, Shockwave, FloatingText, WaveAnnouncement, Boss } from './Entities.js';
import SoundManager from './SoundManager.js?v=3';

export default class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.stopwatch = new Stopwatch();
        this.shop = new Shop();
        this.soundManager = new SoundManager();
        this.castle = new Castle();
        this.enemies = [];
        this.shockwaves = []; // Array for visual effects
        this.floatingTexts = [];
        this.waveAnnouncements = []; // For flying text
        this.spawnTimer = 0;
        this.spawnInterval = 2.0;

        this.wave = 1;
        this.enemiesInWave = 10;
        this.enemiesSpawned = 0;
        this.waveTimer = 0;
        this.betweenWaves = false;

        // Boss State
        this.currentBoss = null;
        this.isBossWave = false;
        this.bossLevel = 0; // Starts at 0, increments to 1 for Boss A

        this.isRunning = false;
        this.lastTime = 0;
        this.score = 0;
        this.coins = 0;
        this.score = 0;
        this.coins = 0;
        this.combo = 0;
        this.combo = 0;
        this.isProcessingAttack = false;
        this.isOverdrivePaused = false; // Flag to prevent target overwrite during freeze

        // Bind methods
        this.loop = this.loop.bind(this);
        this.handleInput = this.handleInput.bind(this);
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const diff = e.currentTarget.dataset.diff;
                this.start(diff);
                this.soundManager.playUI('click');
            });
        });

        document.getElementById('restart-btn').addEventListener('click', () => {
            // For restart, maybe go back to menu or restart same diff?
            // Let's restart with same difficulty for now, OR show start screen again.
            // Showing start screen again is safer to change diff.
            document.getElementById('game-over-screen').classList.add('hidden');
            document.getElementById('start-screen').classList.remove('hidden');
            this.soundManager.playUI('click');
        });

        // Shop UI
        document.getElementById('shop-btn').addEventListener('click', () => {
            this.soundManager.playUI('click');
            this.openShop();
        });
        document.getElementById('close-shop-btn').addEventListener('click', () => {
            this.soundManager.playUI('click');
            this.closeShop();
        });

        document.querySelectorAll('.buy-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const item = e.target.closest('.shop-item').dataset.item;
                const cost = this.shop.getCost(item);

                if (cost !== 'MAX' && this.coins < cost) {
                    this.soundManager.playUI('error');
                }
                this.buyUpgrade(item);
            });
        });



        // Game Controls
        // Game Controls
        document.getElementById('menu-btn').addEventListener('click', () => {
            this.soundManager.playUI('click');
            this.togglePause();
        });

        document.getElementById('resume-btn').addEventListener('click', () => {
            this.soundManager.playUI('click');
            this.togglePause();
        });

        document.getElementById('pause-menu-btn').addEventListener('click', () => {
            this.soundManager.playUI('click');
            this.returnToMenu();
        });

        // Music Toggle
        const musicBtn = document.getElementById('music-toggle-btn');
        musicBtn.addEventListener('click', () => {
            this.soundManager.playUI('click');
            const enabled = this.soundManager.toggleMusic();
            musicBtn.textContent = enabled ? 'MUSIC: ON' : 'MUSIC: OFF';
        });

        // Input handling
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') this.handleInput();
        });
        this.canvas.addEventListener('mousedown', this.handleInput);
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault(); // Prevent scrolling
            this.handleInput();
        }, { passive: false });

        // Initial interaction to unlock AudioContext and start BGM
        const startAudio = () => {
            if (!this.soundManager.initialized) {
                this.soundManager.init();
                // Use v=3 cache bust just in case
                this.soundManager.playBGM('audio/bgm.mp3?v=3');
            }
            window.removeEventListener('click', startAudio);
            window.removeEventListener('touchstart', startAudio);
            window.removeEventListener('keydown', startAudio);
        };

        window.addEventListener('click', startAudio);
        window.addEventListener('touchstart', startAudio);
        window.addEventListener('keydown', startAudio);
    }

    resize() {
        const LOGICAL_WIDTH = 720;
        const LOGICAL_HEIGHT = 1280;

        // Enforce logical size
        this.canvas.width = LOGICAL_WIDTH;
        this.canvas.height = LOGICAL_HEIGHT;
        this.renderer.resize(LOGICAL_WIDTH, LOGICAL_HEIGHT);

        // Scale container to fit window
        const scaleX = window.innerWidth / LOGICAL_WIDTH;
        const scaleY = window.innerHeight / LOGICAL_HEIGHT;
        const scale = Math.min(scaleX, scaleY); // Fit inside

        const container = document.getElementById('game-container');
        container.style.width = `${LOGICAL_WIDTH}px`;
        container.style.height = `${LOGICAL_HEIGHT}px`;
        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = 'center center'; // Scale from center

        // Center positioning handled by flex body in CSS, but transform can mess with layout flow if not careful.
        // Since body is flex center, and container has fixed size, scale will shrink/grow it visually.
        // We might need to handle absolute centering if scale affects flex layout weirdly.
        // Actually, flex center works on the *layout* size. If we scale, the layout size stays constant unless we set it.
        // Wait, if we set width/height to 720/1280, it will be huge on desktop if not scaled down, or overflow on mobile.
        // The transform visually scales it.
    }

    start(difficulty) {
        try {
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('game-over-screen').classList.add('hidden');

            this.isRunning = true;
            this.lastTime = performance.now();
            this.stopwatch.reset();
            if (difficulty) this.stopwatch.setDifficulty(difficulty);
            console.log(`Starting game with difficulty: ${this.stopwatch.difficulty}`);

            this.stopwatch.start();

            try {
                this.soundManager.init();
                this.soundManager.playBGM('audio/bgm.mp3?v=3');
            } catch (e) {
                console.warn("Sound init failed", e);
            }

            // Reset game state
            this.score = 0;
            this.coins = 0;
            this.combo = 0;
            this.wave = 1;
            this.enemiesInWave = 10;
            this.enemiesSpawned = 0;
            this.betweenWaves = false;

            this.isBossWave = false;
            this.currentBoss = null;
            this.bossLevel = 0;

            this.enemies = [];
            this.shockwaves = [];
            this.floatingTexts = [];
            this.waveAnnouncements = [];

            // Initial Wave Announcement
            this.waveAnnouncements.push(new WaveAnnouncement(this.wave, this.canvas.width, this.canvas.height));

            // Debug Menu Listener
            const jumpBtn = document.getElementById('wave-jump-btn');
            if (jumpBtn) {
                // Remove existing to prevent duplicates if start called multiple times?
                // Game instance is recreated usually? No, `start()` reuses instance.
                const newBtn = jumpBtn.cloneNode(true);
                jumpBtn.parentNode.replaceChild(newBtn, jumpBtn);

                newBtn.addEventListener('click', () => {
                    const select = document.getElementById('wave-select');
                    const wave = parseInt(select.value, 10);
                    if (wave > 0) {
                        this.jumpToWave(wave);
                    }
                });
            }

            this.castle = new Castle();
            this.spawnTimer = 0;
            document.getElementById('score').textContent = this.coins;
            document.getElementById('wave').textContent = this.wave;

            if (this.castle) {
                document.getElementById('health').textContent = this.castle.health;
            }

            requestAnimationFrame(this.loop);
        } catch (error) {
            console.error("Start Error:", error);
            alert("Start Error: " + error.message);
        }
    }




    handleInput() {
        if (!this.isRunning) return;
        if (this.isPaused) return; // Prevent interaction during Pause or Overdrive Freeze
        if (this.isProcessingAttack) return; // Prevent rapid fire

        this.isProcessingAttack = true; // Lock input
        const result = this.stopwatch.stop();
        console.log('Attack result:', result);
        this.lastResult = { text: result, time: performance.now() };

        this.triggerAttack(result);

        setTimeout(() => {
            this.isProcessingAttack = false; // Unlock input
            if (this.isRunning) {
                // Prevent updating target if we are in Overdrive Pause (target was already set by Overdrive logic)
                if (this.isOverdrivePaused) {
                    this.stopwatch.start();
                    return;
                }

                if (this.currentBoss && this.currentBoss.isSurging) {
                    // Random decimal target for Surge
                    const decimal = Math.floor(Math.random() * 90) + 10;
                    const time = Math.floor(this.stopwatch.time) + 1 + (decimal / 100);
                    this.stopwatch.updateTarget(time);
                } else {
                    this.stopwatch.updateTarget();
                }
                this.stopwatch.start();
            }
        }, 500); // Brief pause
    }

    triggerAttack(result) {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        if (result === 'PERFECT') {
            this.soundManager.playShoot('PERFECT');
            // Screen clear / massive AOE

            // Damage Upgrade Effect: Radius Multiplier
            const radiusLvl = this.shop.getUpgrade('radius').level;
            const radiusMult = 1 + (radiusLvl - 1) * 0.2;

            this.shockwaves.push(new Shockwave(centerX, centerY, '#00ff88', Math.max(this.canvas.width, this.canvas.height) * radiusMult));

            // Boss Damage
            if (this.currentBoss && this.currentBoss.active) {
                const powerLvl = this.shop.getUpgrade('power').level;
                // Perfect might deal double damage or just guanrateed hit?
                this.currentBoss.takeDamage(1 * powerLvl);
                this.floatingTexts.push(new FloatingText(`-${1 * powerLvl}`, this.currentBoss.x, this.currentBoss.y, '#ff0055'));
                // Play Boss Hit Sound?
            }

            // Kill all enemies
            if (this.enemies.length > 0) this.soundManager.playExplosion();
            this.enemies.forEach(e => {
                // Perfect kills everything instantly ideally, or deals massive damage, 
                // but user wants tanks (HP 2) to survive at least once. 
                // So base damage should be 1.
                const powerLvl = this.shop.getUpgrade('power').level;
                if (e.takeDamage(1 * powerLvl)) {
                    this.coins += 1; // Base coin per enemy
                    this.floatingTexts.push(new FloatingText('+1', e.x, e.y, '#FFD700'));
                }
            });

            // Economy & Combo
            this.combo++;
            if (this.combo >= 3 && this.combo % 3 === 0) {
                this.coins += 10; // Bonus
                this.floatingTexts.push(new FloatingText('+10 Combo!', centerX, centerY - 100, '#FFD700'));
            }

        } else if (result === 'GREAT') {
            this.soundManager.playShoot('GREAT');
            // Medium AOE
            const radiusLvl = this.shop.getUpgrade('radius').level;
            const radius = 450 * (1 + (radiusLvl - 1) * 0.2);

            this.shockwaves.push(new Shockwave(centerX, centerY, '#ffff00', radius));

            // Boss Damage (Great or higher)
            if (this.currentBoss && this.currentBoss.active) {
                const powerLvl = this.shop.getUpgrade('power').level;
                this.currentBoss.takeDamage(1 * powerLvl);
                this.floatingTexts.push(new FloatingText(`-${1 * powerLvl}`, this.currentBoss.x, this.currentBoss.y, '#ffae00'));
            }

            this.combo = 0; // Reset combo
            this.coins += 2;

            // Damage Calculation based on Power Upgrade
            const powerLvl = this.shop.getUpgrade('power').level;
            const damage = 1 + (powerLvl - 1); // Base 1, +1 per level

            // Kill enemies within radius
            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - centerX, e.y - centerY);
                if (dist < radius) {
                    if (e.takeDamage(damage)) {
                        this.coins += 1;
                        this.soundManager.playExplosion();
                        this.floatingTexts.push(new FloatingText('+1', e.x, e.y, '#FFD700'));
                    } else {
                        // Hit but not dead
                        this.soundManager.playHit();
                    }
                }
            });
        } else if (result === 'GOOD') {
            this.soundManager.playShoot('GOOD');
            // Small AOE
            const radiusLvl = this.shop.getUpgrade('radius').level;
            const radius = 225 * (1 + (radiusLvl - 1) * 0.2);

            this.shockwaves.push(new Shockwave(centerX, centerY, '#ffffff', radius));

            this.combo = 0; // Reset combo
            this.coins += 1;

            // Damage Calculation based on Power Upgrade
            const powerLvl = this.shop.getUpgrade('power').level;
            const damage = 1 + (powerLvl - 1); // Base 1, +1 per level

            // Kill enemies within radius
            this.enemies.forEach(e => {
                const dist = Math.hypot(e.x - centerX, e.y - centerY);
                if (dist < radius) {
                    if (e.takeDamage(damage)) {
                        this.coins += 1;
                        this.soundManager.playExplosion();
                        this.floatingTexts.push(new FloatingText('+1', e.x, e.y, '#FFD700'));
                    } else {
                        // Hit but not dead
                        this.soundManager.playHit();
                    }
                }
            });
        } else {
            this.soundManager.playShoot('MISS');
            this.combo = 0; // Miss
        }

        document.getElementById('score').textContent = this.coins;
    }

    loop(timestamp) {
        if (!this.isRunning) return;

        try {
            const deltaTime = (timestamp - this.lastTime) / 1000;
            this.lastTime = timestamp;

            if (!this.isPaused) {
                this.update(deltaTime);
            }
            this.render();

            requestAnimationFrame(this.loop);
        } catch (error) {
            console.error("Game Loop Error:", error);
            alert("Game Loop Error: " + error.message + "\nStack: " + error.stack);
            this.isRunning = false;
        }
    }

    update(deltaTime) {
        this.stopwatch.update(deltaTime);

        // Spawn Enemies
        // Spawn Enemies
        if (!this.betweenWaves) {
            if (this.isBossWave) {
                // Boss Logic
                if (this.currentBoss && this.currentBoss.active) {
                    this.currentBoss.update(deltaTime);

                    // Minion Spawning during boss
                    this.spawnTimer += deltaTime;

                    // Surge Logic Check
                    if (this.currentBoss.justStartedSurge) {
                        this.soundManager.playOverdriveStart();

                        // Visual Flare
                        // Create a specific large floating text or just standard for now, will update class next
                        const surgeText = new FloatingText("OVERDRIVE!", this.canvas.width / 2, this.canvas.height / 2 - 150, '#ff0055');
                        surgeText.size = 60; // Manually properties injection before class update, or just wait for class update
                        this.floatingTexts.push(surgeText);

                        // Brief Pause for impact (Freeze frame)
                        this.isPaused = true;
                        this.isOverdrivePaused = true; // Set flag

                        // Set Red Glow on Stopwatch
                        document.getElementById('stopwatch-display').style.color = '#ff0055';
                        document.getElementById('stopwatch-display').style.textShadow = '0 0 20px #ff0055';

                        // Set Decimal Target IMMEDIATELY
                        const decimal = Math.floor(Math.random() * 90) + 10; // .10 to .99
                        const time = Math.floor(this.stopwatch.time) + 1 + (decimal / 100);
                        this.stopwatch.updateTarget(time);

                        setTimeout(() => {
                            this.isPaused = false;
                            this.isOverdrivePaused = false; // Clear flag
                            this.lastTime = performance.now(); // Reset delta so no huge jump

                        }, 2000); // 2 second freeze
                    }

                    // Surge End Check
                    if (this.currentBoss.justEndedSurge) {
                        const endText = new FloatingText("OVERDRIVE ENDED", this.canvas.width / 2, this.canvas.height / 2 - 150, '#00ff88');
                        endText.size = 40;
                        this.floatingTexts.push(endText);
                        this.soundManager.playOverdriveEnd();
                    }

                    // Reset Stopwatch Color if not surging
                    if (!this.currentBoss.isSurging && !this.currentBoss.justStartedSurge) {
                        document.getElementById('stopwatch-display').style.color = 'rgba(255, 255, 255, 0.9)';
                        document.getElementById('stopwatch-display').style.textShadow = '0 0 10px rgba(0, 0, 0, 0.8)';
                    }

                    // Faster spawn during surge
                    let spawnMultiplier = (this.currentBoss.level === 1) ? 3.0 : 1.0;
                    let currentSpawnInterval = (this.currentBoss.isSurging ? 0.3 : 1.5) * spawnMultiplier;

                    if (this.spawnTimer >= currentSpawnInterval) {
                        this.spawnTimer = 0;
                        // Spawn minions near boss or random?
                        this.enemies.push(new Enemy('RUSHER', this.canvas.width, this.canvas.height));
                    }
                } else if (this.currentBoss && !this.currentBoss.active) {
                    // Boss Defeated!
                    this.isBossWave = false;
                    this.currentBoss = null;

                    // Clear minions
                    this.enemies.forEach(e => e.takeDamage(999));
                    this.enemies = [];
                    this.enemiesSpawned = this.enemiesInWave; // Force clear condition

                    // Reset Effects
                    this.stopwatch.setTimeScale(1.0);
                    this.stopwatch.setGlitch(false);
                    document.getElementById('stopwatch-display').style.color = 'rgba(255, 255, 255, 0.9)';
                    document.getElementById('stopwatch-display').style.textShadow = '0 0 10px rgba(0, 0, 0, 0.8)';

                    this.soundManager.playUI('buy'); // Victory sound placeholder

                    // Restore Normal BGM
                    this.soundManager.playBGM('audio/bgm.mp3?v=3');
                }
            } else if (this.enemiesSpawned < this.enemiesInWave) {
                this.spawnTimer += deltaTime;
                if (this.spawnTimer >= this.spawnInterval) {
                    this.spawnTimer = 0;
                    this.enemiesSpawned++;

                    // Difficulty scaling
                    let type = 'RUSHER';
                    if (this.wave > 1 && Math.random() > 0.8) type = 'TANK';
                    if (this.wave > 2 && Math.random() > 0.7) type = 'SWARMER';
                    if (this.wave > 4 && Math.random() > 0.8) type = 'SNIPER';

                    this.enemies.push(new Enemy(type, this.canvas.width, this.canvas.height));
                }
            }
        }

        // Check Wave Clear
        if (!this.isBossWave && this.enemies.length === 0 && this.enemiesSpawned >= this.enemiesInWave) {
            // Wave Clear!
            this.betweenWaves = true;
            this.wave++;

            // Check for Boss Wave (Every 3rd wave)
            if (this.wave % 3 === 0) {
                // Delay slightly before boss start?
                setTimeout(() => this.startBossWave(), 1000);
            } else {
                // Reset enemies count for normal wave (Calculate based on wave number)
                this.enemiesInWave = 10 + (this.wave * 5);
                this.enemiesSpawned = 0;
                this.spawnInterval = Math.max(0.5, 2.0 - (this.wave * 0.1));

                // Announce next wave
                this.waveAnnouncements.push(new WaveAnnouncement(this.wave, this.canvas.width, this.canvas.height));
            }

            // Bonus Health
            this.castle.health = Math.min(this.castle.maxHealth, this.castle.health + 10);
            document.getElementById('health').textContent = this.castle.health;
            document.getElementById('wave').textContent = this.wave;

            // Brief pause
            setTimeout(() => {
                // Only if not boss wave started
                if (!this.isBossWave) this.betweenWaves = false;
                else this.betweenWaves = false; // Boss wave starts immediately after timeout
            }, 2000);
        }

        // Update Enemies
        const castleX = this.canvas.width / 2;
        const castleY = this.canvas.height / 2;

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            const status = enemy.update(deltaTime, castleX, castleY);

            if (status === 'HIT_CASTLE') {
                this.enemies.splice(i, 1);
                this.castle.health -= enemy.damage; // Dynamic Damage
                this.soundManager.playHit();
                document.getElementById('health').textContent = this.castle.health;
            } else if (!enemy.active) {
                this.enemies.splice(i, 1);
            }
        }

        // Update Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            this.shockwaves[i].update(deltaTime);
            if (!this.shockwaves[i].active) {
                this.shockwaves.splice(i, 1);
            }
        }

        // Update Floating Texts
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            this.floatingTexts[i].update(deltaTime);
            if (!this.floatingTexts[i].active) {
                this.floatingTexts.splice(i, 1);
            }
        }

        // Update Wave Announcements
        for (let i = this.waveAnnouncements.length - 1; i >= 0; i--) {
            this.waveAnnouncements[i].update(deltaTime);
            if (!this.waveAnnouncements[i].active) {
                this.waveAnnouncements.splice(i, 1);
            }
        }

        // Check Game Over
        if (this.castle.health <= 0) {
            this.gameOver();
        }


        // Update display
        document.getElementById('stopwatch-display').innerHTML = `
            ${this.stopwatch.formatTime(this.stopwatch.time)}
            <span style="font-size: 0.5em; color: #00ffff; margin-top: 5px;">
                ${this.stopwatch.formatTime(this.stopwatch.targetTime)}
            </span>
        `;
    }

    render() {
        this.renderer.clear();
        this.castle.draw(this.renderer.ctx, this.canvas.width, this.canvas.height);

        // Draw Enemies
        this.enemies.forEach(enemy => enemy.draw(this.renderer.ctx));

        // Draw Shockwaves
        this.shockwaves.forEach(sw => sw.draw(this.renderer.ctx));

        // Draw Floating Texts
        this.floatingTexts.forEach(ft => ft.draw(this.renderer.ctx));

        // Draw Wave Announcements
        this.waveAnnouncements.forEach(wa => wa.draw(this.renderer.ctx));

        if (this.currentBoss) {
            this.currentBoss.draw(this.renderer.ctx);
        }

        // Draw result text
        if (this.lastResult && performance.now() - this.lastResult.time < 1000) {
            this.renderer.drawText(this.lastResult.text, this.canvas.width / 2, this.canvas.height / 2 - 50);
        }
    }

    startBossWave() {
        this.isBossWave = true;
        this.bossLevel++;
        this.currentBoss = new Boss(this.bossLevel, this.canvas.width, this.canvas.height);

        // Announce Boss
        this.waveAnnouncements.push(new WaveAnnouncement(this.wave, this.canvas.width, this.canvas.height)); // Reuse wave announcement for now?
        // Or specific boss announcement? The WaveAnnouncement takes "wave" number string constraint.
        // Let's modify WaveAnnouncement later or accept string. For now, "WAVE 3" is fine, but Boss Name is better.
        // The previous tool didn't modify WaveAnnouncement to take generic text.

        this.enemiesInWave = 999; // Infinite spawns until boss dies
        this.enemiesSpawned = 0;
        this.enemies = []; // Clear previous

        console.log(`Starting Boss Wave: ${this.currentBoss.name}`);

        // Apply Boss Ability (Initial)
        if (this.currentBoss.ability === 'TIME_WARP') {
            this.stopwatch.setTimeScale(1.5);
        } else if (this.currentBoss.ability === 'GLITCH') {
            this.stopwatch.setGlitch(true);
        }

        // Play Boss BGM
        this.soundManager.playBGM('audio/bgm_boss.mp3');
        this.soundManager.playBossSpawn();
    }

    jumpToWave(targetWave) {
        this.wave = targetWave;
        this.enemies = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.waveAnnouncements = [];
        this.enemiesSpawned = 0;
        this.betweenWaves = false;
        this.spawnTimer = 0;

        // Reset Boss State
        this.isBossWave = false;
        this.currentBoss = null;
        this.stopwatch.setTimeScale(1.0);
        this.stopwatch.setGlitch(false);
        this.stopwatch.reset();
        this.stopwatch.start();

        // Update UI
        document.getElementById('wave').textContent = this.wave;

        // Check if target is boss wave
        if (this.wave % 3 === 0) {
            this.bossLevel = Math.floor(this.wave / 3) - 1; // Prepare for increment in startBossWave
            this.startBossWave();
        } else {
            this.bossLevel = Math.floor(this.wave / 3);

            // Scale Difficulty
            this.enemiesInWave = 10 + (this.wave * 5);
            this.spawnInterval = Math.max(0.5, 2.0 - (this.wave * 0.1));

            // Announce
            this.waveAnnouncements.push(new WaveAnnouncement(this.wave, this.canvas.width, this.canvas.height));

            // Ensure Normal BGM
            this.soundManager.playBGM('audio/bgm.mp3?v=3');
        }
    }

    gameOver() {
        this.soundManager.playGameOver();
        this.soundManager.stopBGM();
        this.isRunning = false;
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').textContent = this.coins;
    }

    openShop() {
        this.isRunning = false; // Pause game
        this.updateShopUI();
        document.getElementById('shop-screen').classList.remove('hidden');
    }

    closeShop() {
        document.getElementById('shop-screen').classList.add('hidden');
        this.isRunning = true;
        this.lastTime = performance.now(); // Reset time to prevent huge delta
        this.stopwatch.start(); // Resume stopwatch if needed
        if (this.stopwatch.time > 0) this.stopwatch.start();

        requestAnimationFrame(this.loop);
    }

    updateShopUI() {
        document.getElementById('shop-coins').textContent = this.coins;

        document.querySelectorAll('.shop-item').forEach(el => {
            const name = el.dataset.item;
            const upgrade = this.shop.getUpgrade(name);
            const btn = el.querySelector('.buy-btn');

            // Update Cost / Button State
            const cost = this.shop.getCost(name);

            if (cost === 'MAX') {
                btn.textContent = 'MAX';
                btn.disabled = true;
                btn.style.opacity = 0.5;
                btn.style.cursor = 'default';
            } else {
                btn.textContent = `${cost}`;
                btn.disabled = false;

                if (this.coins < cost) {
                    btn.disabled = true; // Visual disable
                }
            }

            // Update Level Indicators (if exist)
            const indicator = el.querySelector('.level-indicator');
            if (indicator) {
                const pips = indicator.querySelectorAll('.pip');
                pips.forEach((pip, index) => {
                    // Level 1 = 0 upgrades = 0 pips
                    // Level 2 = 1 upgrade = 1 pip
                    if (index < upgrade.level - 1) {
                        pip.classList.add('filled');
                        pip.classList.remove('empty');
                    } else {
                        pip.classList.remove('filled');
                        pip.classList.add('empty');
                    }
                });
            }
        });
    }

    buyUpgrade(name) {
        const cost = this.shop.getCost(name);
        if (cost === 'MAX') return;

        if (this.coins >= cost) {
            // Purchase successful in logic
            if (this.shop.purchase(name)) {
                this.coins -= cost;
                this.soundManager.playUI('buy');

                // Apply One-Time Effects
                if (name === 'heal') {
                    this.castle.health = Math.min(this.castle.maxHealth, this.castle.health + 20);
                } else if (name === 'maxHealth') {
                    this.castle.maxHealth += 10;
                    this.castle.health += 10; // Heal the amount added
                }
                // Tolerance removed
            }
        }

        // Update UI
        this.updateShopUI();
        document.getElementById('health').textContent = this.castle.health;
        document.getElementById('score').textContent = this.coins;
    }
    togglePause() {
        if (!this.isRunning) return;
        this.isPaused = !this.isPaused;

        if (this.isPaused) {
            document.getElementById('pause-screen').classList.remove('hidden');
            this.stopwatch.stop();
        } else {
            document.getElementById('pause-screen').classList.add('hidden');
            this.lastTime = performance.now();
            this.stopwatch.start();
            requestAnimationFrame(this.loop);
        }
    }

    returnToMenu() {
        this.isRunning = false;
        this.isPaused = false;
        this.stopwatch.reset();

        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('pause-screen').classList.add('hidden');
        document.getElementById('shop-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');

        this.enemies = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.renderer.clear();
        this.soundManager.playBGM('audio/bgm.mp3?v=3');
    }
}

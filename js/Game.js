import Renderer from './Renderer.js?v=2';
import Stopwatch from './Stopwatch.js?v=2';
import Shop from './Shop.js';
import { Castle, Enemy, Shockwave, FloatingText, WaveAnnouncement, Boss } from './Entities.js';
import SoundManager from './SoundManager.js?v=3';
import SupabaseManager from './SupabaseManager.js';

export default class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new Renderer(this.canvas);
        this.stopwatch = new Stopwatch();
        this.shop = new Shop();
        this.soundManager = new SoundManager();
        this.dbManager = new SupabaseManager();
        this.castle = new Castle();
        this.pendingRecord = null;
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
        // WebView 렌더링 타이밍 버그 해결: 로딩 직후 2초 동안 0.1초마다 강제로 크기 재계산
        this.resize();
        let resizeAttempts = 0;
        const resizeInterval = setInterval(() => {
            this.resize();
            resizeAttempts++;
            if (resizeAttempts > 20) clearInterval(resizeInterval);
        }, 100);

        window.addEventListener('resize', () => this.resize());

        // document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const diff = e.currentTarget.dataset.diff;
                this.start(diff);
                this.soundManager.playUI('click');
            });
        });

        const rankingBtn = document.getElementById('ranking-btn');
        if (rankingBtn) {
            rankingBtn.addEventListener('click', () => {
                this.soundManager.playUI('click');
                this.openRanking('NORMAL'); // Default tab
            });
        }
        
        const closeRankingBtn = document.getElementById('close-ranking-btn');
        if (closeRankingBtn) {
            closeRankingBtn.addEventListener('click', () => {
                this.soundManager.playUI('click');
                document.getElementById('ranking-screen').classList.add('hidden');
            });
        }

        document.querySelectorAll('.rank-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const diff = e.target.dataset.target;
                this.openRanking(diff);
                this.soundManager.playUI('click');
            });
        });

        const submitNameBtn = document.getElementById('submit-name-btn');
        if (submitNameBtn) {
            submitNameBtn.addEventListener('click', () => {
                this.submitName();
            });
        }

        this.screenFlash = { active: false, alpha: 0, color: 'white', duration: 0.5 };
        this.cameraShake = { active: false, intensity: 0, duration: 0 };

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

        const container = document.getElementById('game-container');
        container.style.width = `${LOGICAL_WIDTH}px`;
        container.style.height = `${LOGICAL_HEIGHT}px`;
        container.style.transform = 'none';
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
            this.totalPlayTime = 0;
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

            // Reset Stopwatch Display Style (Fix for Overdrive persistance)
            document.getElementById('stopwatch-display').style.color = 'rgba(255, 255, 255, 0.9)';
            document.getElementById('stopwatch-display').style.textShadow = '0 0 10px rgba(0, 0, 0, 0.8)';

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

        try {
            this.triggerAttack(result);
        } catch (e) {
            console.error("Attack Error: ", e);
            alert("Error in attack: " + e.message + "\n" + e.stack);
        }

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
                this.soundManager.playBossHit(); // 보스 전용 피격음
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
                this.soundManager.playBossHit(); // 보스 전용 피격음
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
        this.totalPlayTime += deltaTime;
        // Flash Logic
        if (this.screenFlash.active) {
            this.screenFlash.alpha -= deltaTime / this.screenFlash.duration;
            if (this.screenFlash.alpha <= 0) {
                this.screenFlash.active = false;
                this.screenFlash.alpha = 0;
            }
        }

        // Shake Logic
        if (this.cameraShake.active) {
            this.cameraShake.duration -= deltaTime;
            if (this.cameraShake.duration <= 0) {
                this.cameraShake.active = false;
                this.cameraShake.intensity = 0;
                this.renderer.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
            } else {
                // Apply shake
                const dx = (Math.random() - 0.5) * this.cameraShake.intensity;
                const dy = (Math.random() - 0.5) * this.cameraShake.intensity;
                this.renderer.ctx.setTransform(1, 0, 0, 1, dx, dy);
            }
        } else {
            // Ensure reset
            this.renderer.ctx.setTransform(1, 0, 0, 1, 0, 0);
        }

        this.stopwatch.update(deltaTime);

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
                        let overDriveMsg = "OVERDRIVE!";
                        let msgSize = 60;
                        if (this.currentBoss.ability === 'OVERDRIVE_SPEED') {
                            overDriveMsg = "OVERDRIVE! (2x SPEED)";
                            msgSize = 45;
                        }
                        const surgeText = new FloatingText(overDriveMsg, this.canvas.width / 2, this.canvas.height / 2 - 150, '#ff0055');
                        surgeText.size = msgSize;
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

                        if (this.currentBoss.ability === 'OVERDRIVE_SPEED') {
                            this.stopwatch.setTimeScale(2.0); // 2배속
                        }

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

                        if (this.currentBoss.ability === 'OVERDRIVE_SPEED') {
                            this.stopwatch.setTimeScale(1.0); // 원래 속도로 복구
                        }
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
                    const defeatedBossLevel = this.currentBoss.level;
                    this.soundManager.playBossDeath();
                    this.isBossWave = false;
                    this.currentBoss = null;

                    // Clear minions
                    this.enemies.forEach(e => e.takeDamage(999));
                    this.enemies = [];
                    this.enemiesSpawned = this.enemiesInWave; // Force clear condition

                    if (defeatedBossLevel === 5) {
                        this.playEnding();
                        return; // Stop further processing
                    }

                    // Dramatic Death Effect
                    // Dramatic Death Effect
                    this.triggerScreenFlash('white', 0.1, 0.4); // Short, semi-transparent flash
                    this.triggerCameraShake(20, 0.5); // Intense shake
                    this.triggerCameraShake(20, 0.5); // Intense shake

                    // Reset Effects
                    this.stopwatch.setTimeScale(1.0);
                    this.stopwatch.setGlitch(false);
                    document.getElementById('stopwatch-display').style.color = 'rgba(255, 255, 255, 0.9)';
                    document.getElementById('stopwatch-display').style.textShadow = '0 0 10px rgba(0, 0, 0, 0.8)';

                    this.soundManager.playUI('buy'); // Victory sound placeholder

                    // Restore Normal BGM
                    this.soundManager.playBGM('audio/bgm.mp3?v=3');

                    // Boss clear bonus: Max HP +10%, Heal 10%
                    const hpBonus = Math.floor(this.castle.maxHealth * 0.1);
                    this.castle.maxHealth += hpBonus;
                    this.castle.health = Math.min(this.castle.maxHealth, this.castle.health + hpBonus);
                    
                    document.getElementById('health').textContent = this.castle.health;

                    const hpText = new FloatingText(`MAX HP +${hpBonus} & HEAL!`, this.canvas.width / 2, this.canvas.height / 2 - 100, '#00ff88');
                    hpText.size = 30;
                    hpText.life = 2.5; // 화면에 2.5초간 머무름
                    hpText.velocity = 30; // 위로 떠오르는 속도를 살짝 낮춰 잘 보이게 함
                    this.floatingTexts.push(hpText);
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
        if (!this.betweenWaves && !this.isBossWave && this.enemies.length === 0 && this.enemiesSpawned >= this.enemiesInWave) {
            // Wave Clear!
            this.betweenWaves = true;
            this.wave++;

            // Check for Boss Wave (Every 3rd wave)
            if (this.wave % 3 === 0) {
                this.isBossWave = true;
                this.enemiesInWave = 999;
                this.enemiesSpawned = 0;
                setTimeout(() => this.startBossWave(), 1000);
            } else {
                // Reset enemies count for normal wave (Calculate based on wave number)
                // Adjusted for faster pacing: fewer enemies but faster spawns
                this.enemiesInWave = 10 + (this.wave * 3);
                this.enemiesSpawned = 0;
                this.spawnInterval = Math.max(0.4, 1.8 - (this.wave * 0.15));

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
                ${this.stopwatch.formatTime(this.stopwatch.targetTime, true)}
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

        // Screen Flash Effect
        if (this.screenFlash.active) {
            this.renderer.ctx.save();
            this.renderer.ctx.fillStyle = this.screenFlash.color;
            this.renderer.ctx.globalAlpha = this.screenFlash.alpha;
            this.renderer.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.renderer.ctx.restore();
        }

        // Screen Flash Effect
        if (this.screenFlash.active) {
            this.renderer.ctx.save();
            this.renderer.ctx.fillStyle = this.screenFlash.color;
            this.renderer.ctx.globalAlpha = this.screenFlash.alpha;
            this.renderer.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.renderer.ctx.restore();
        }
    }

    startBossWave() {
        // Flags already set in update() to prevent race
        this.isBossWave = true;

        this.bossLevel++;
        this.currentBoss = new Boss(this.bossLevel, this.canvas.width, this.canvas.height);

        // Announce Boss
        // We can create a speciai Boss Announcement text if needed, or stick to Wave
        this.waveAnnouncements.push(new WaveAnnouncement(this.wave, this.canvas.width, this.canvas.height));

        this.enemiesInWave = 999; // Infinite spawns until boss dies
        this.enemiesSpawned = 0;
        this.enemies = []; // Clear previous

        console.log(`Starting Boss Wave: ${this.currentBoss.name}`);

        // Apply Boss Ability (Initial)
        if (this.currentBoss.ability === 'GLITCH') {
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
        
        this.saveScore(); // Save high score

        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('final-score').textContent = this.coins;
    }

    playEnding() {
        this.isRunning = false;
        this.soundManager.stopBGM();

        this.saveTime(); // Save clear time

        const endingScreen = document.getElementById('ending-screen');
        const video = document.getElementById('ending-video');
        
        endingScreen.classList.remove('hidden');
        
        // Hide HUD and other UI things
        document.getElementById('hud').style.display = 'none';
        document.getElementById('stopwatch-display').style.display = 'none';
        
        video.onended = () => {
            this.returnToMenu();
        };
        video.play();
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
        document.getElementById('ending-screen').classList.add('hidden');
        
        document.getElementById('hud').style.display = 'flex';
        document.getElementById('stopwatch-display').style.display = 'flex';

        document.getElementById('start-screen').classList.remove('hidden');

        this.enemies = [];
        this.shockwaves = [];
        this.floatingTexts = [];
        this.renderer.clear();
        this.soundManager.playBGM('audio/bgm.mp3?v=3');
    }

    saveScore() {
        const diff = this.stopwatch.difficulty || 'NORMAL';
        const key = `defense_highscore_${diff}`;
        const prevData = localStorage.getItem(key);
        const prevScore = prevData ? parseInt(prevData, 10) : 0;

        if (this.coins > prevScore) {
            localStorage.setItem(key, this.coins);
            this.pendingRecord = { type: 'score', score: this.coins, difficulty: diff };
            this.showNameInput();
        }
    }

    saveTime() {
        const diff = this.stopwatch.difficulty || 'NORMAL';
        const key = `defense_fastestTime_${diff}`;
        const prevData = localStorage.getItem(key);
        const prevTime = prevData ? parseFloat(prevData) : Infinity;

        if (this.totalPlayTime < prevTime) {
            localStorage.setItem(key, this.totalPlayTime.toString());
            this.pendingRecord = { type: 'time', time: this.totalPlayTime, difficulty: diff };
            this.showNameInput();
        }
    }

    showNameInput() {
        document.getElementById('name-input-screen').classList.remove('hidden');
    }

    async submitName() {
        const input = document.getElementById('nickname-input');
        const name = input.value.trim() || 'Anonymous';
        
        if (this.pendingRecord) {
            if (this.pendingRecord.type === 'score') {
                await this.dbManager.saveScore(name, this.pendingRecord.difficulty, this.pendingRecord.score);
            } else if (this.pendingRecord.type === 'time') {
                await this.dbManager.saveClearTime(name, this.pendingRecord.difficulty, this.pendingRecord.time);
            }
            this.pendingRecord = null;
        }
        
        document.getElementById('name-input-screen').classList.add('hidden');
    }

    formatDisplayTime(seconds) {
        if (!seconds || seconds === Infinity) return "-";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 100);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    async openRanking(diffTarget) {
        document.getElementById('ranking-screen').classList.remove('hidden');
        
        // Update Tabs
        document.querySelectorAll('.rank-tab-btn').forEach(btn => {
            if (btn.dataset.target === diffTarget) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        // Show Local Record Info At Bottom
        const timeKey = `defense_fastestTime_${diffTarget}`;
        const timeStr = localStorage.getItem(timeKey);
        const scoreKey = `defense_highscore_${diffTarget}`;
        const scoreStr = localStorage.getItem(scoreKey);
        const localTimeInfo = timeStr ? this.formatDisplayTime(parseFloat(timeStr)) : '-';
        const localScoreInfo = scoreStr ? scoreStr : '0';
        document.getElementById('local-record-text').textContent = `[MY LOCAL RECORD] TIME: ${localTimeInfo} | SCORE: ${localScoreInfo}`;

        // Load Global Time
        const timeTbody = document.getElementById('time-rank-body');
        timeTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';
        const times = await this.dbManager.getClearTimes(diffTarget);
        timeTbody.innerHTML = '';
        if (times.length === 0) {
            timeTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No records yet</td></tr>';
        } else {
            times.forEach((doc, i) => {
                timeTbody.innerHTML += `<tr><td>${i+1}</td><td>${doc.name}</td><td>${this.formatDisplayTime(doc.time)}</td></tr>`;
            });
        }

        // Load Global Score
        const scoreTbody = document.getElementById('score-rank-body');
        scoreTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">Loading...</td></tr>';
        const scores = await this.dbManager.getHighScores(diffTarget);
        scoreTbody.innerHTML = '';
        if (scores.length === 0) {
            scoreTbody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No records yet</td></tr>';
        } else {
            scores.forEach((doc, i) => {
                scoreTbody.innerHTML += `<tr><td>${i+1}</td><td>${doc.name}</td><td>${doc.score}</td></tr>`;
            });
        }
    }

    triggerScreenFlash(color = 'white', duration = 0.5, maxAlpha = 1.0) {
        this.screenFlash.active = true;
        this.screenFlash.color = color;
        this.screenFlash.alpha = maxAlpha;
        this.screenFlash.duration = duration;
    }

    triggerCameraShake(intensity, duration) {
        this.cameraShake.active = true;
        this.cameraShake.intensity = intensity;
        this.cameraShake.duration = duration;
    }
}

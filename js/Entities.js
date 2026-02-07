export class Castle {
    constructor() {
        this.health = 100;
        this.maxHealth = 100;
        this.radius = 30;
        this.image = new Image();
        this.image.src = 'img/tower.png';
        this.imageLoaded = false;
        this.image.onload = () => { this.imageLoaded = true; };
    }

    draw(ctx, width, height) {
        const x = width / 2;
        const y = height / 2;

        if (this.imageLoaded) {
            // Draw image centered
            const size = 120;
            ctx.drawImage(this.image, x - size / 2, y - size / 2, size, size);
        } else {
            // Fallback
            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.arc(x, y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }


        // Draw Health Bar
        const barWidth = 80;
        const barHeight = 8;
        const barX = x - barWidth / 2;
        const barY = y + 70; // Position below the tower

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health
        const healthPct = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = healthPct > 0.5 ? '#00ff88' : (healthPct > 0.2 ? '#ffff00' : '#ff4444');
        ctx.fillRect(barX, barY, barWidth * healthPct, barHeight);

        // Border
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

export class Enemy {
    constructor(type, canvasWidth, canvasHeight) {
        this.type = type;
        this.active = true;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Spawn at random edge
        const edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left

        if (edge === 0) { // Top
            this.x = Math.random() * canvasWidth;
            this.y = -20;
        } else if (edge === 1) { // Right
            this.x = canvasWidth + 20;
            this.y = Math.random() * canvasHeight;
        } else if (edge === 2) { // Bottom
            this.x = Math.random() * canvasWidth;
            this.y = canvasHeight + 20;
        } else { // Left
            this.x = -20;
            this.y = Math.random() * canvasHeight;
        }

        // Defaults
        this.radius = 20;
        this.speed = 50;
        this.color = '#f00';
        this.health = 1; // Default health
        this.maxHealth = 1;
        this.damage = 10; // Default damage

        this.setupType();
    }

    setupType() {
        switch (this.type) {
            case 'RUSHER':
                this.speed = 100;
                this.color = '#ff4444';
                this.radius = 24;
                this.health = 1;
                this.damage = 10;
                break;
            case 'SNIPER':
                this.speed = 30; // Stops early?
                this.color = '#ffff00';
                this.radius = 20;
                this.health = 1;
                this.damage = 20; // Sniper hits harder?
                break;
            case 'SWARMER':
                this.speed = 70;
                this.color = '#ff00ff';
                this.radius = 16;
                this.health = 1;
                this.damage = 5;
                break;
            case 'TANK':
                this.speed = 35; // Slow
                this.color = '#4488ff'; // Blueish
                this.radius = 36; // Bigger
                this.health = 2;
                this.damage = 15;
                break;
            default:
                this.speed = 50;
                this.color = '#f00';
                this.radius = 20;
                this.health = 1;
                this.damage = 10;
                break;
        }
        this.maxHealth = this.health;

        // Load shared image if not loaded
        if (!Enemy.image) {
            Enemy.image = new Image();
            Enemy.image.src = 'img/enemy.png';
        }
        this.angle = 0;
        this.rotationSpeed = 15; // Increased speed for rapid spinning
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
            return true; // Died
        }
        // Flash white or toggle color to indicate hit? 
        // Simple visual feedback: slightly darker color or size change?
        this.radius *= 0.8; // Shrink slightly on hit
        return false; // Survived
    }

    update(deltaTime, targetX, targetY) {
        if (!this.active) return;

        // Rotate
        this.angle += this.rotationSpeed * deltaTime;

        // Move towards target
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5 + 30) { // 30 is castle radius approx
            // Reached target (Castle) - basic collision check
            this.active = false; // Despawn, game will handle damage
            return 'HIT_CASTLE';
        }

        const moveX = (dx / dist) * this.speed * deltaTime;
        const moveY = (dy / dist) * this.speed * deltaTime;

        this.x += moveX;
        this.y += moveY;
    }

    draw(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (Enemy.image && Enemy.image.complete) {
            const width = Enemy.image.naturalWidth;
            const height = Enemy.image.naturalHeight;
            const aspect = width / height;

            // Fit content into size box while preserving aspect ratio
            // We want the 'logical' size of the enemy to cover the hit circle roughly
            // Let's constrain the larger dimension to size
            const maxSize = this.radius * 2.8;

            let drawW, drawH;
            if (width > height) {
                drawW = maxSize;
                drawH = maxSize / aspect;
            } else {
                drawH = maxSize;
                drawW = maxSize * aspect;
            }

            ctx.drawImage(Enemy.image, -drawW / 2, -drawH / 2, drawW, drawH);
        } else {
            // Fallback
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();

        // Draw Health Bar for stronger enemies
        if (this.maxHealth > 1) {
            const barWidth = this.radius * 2.5;
            const barHeight = 5;
            const barX = this.x - barWidth / 2;
            const barY = this.y - this.radius * 1.5; // Above the enemy

            // Background
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(barX, barY, barWidth, barHeight);

            // Health
            const pct = Math.max(0, this.health / this.maxHealth);
            ctx.fillStyle = pct > 0.5 ? '#00ff88' : '#ff4444';
            ctx.fillRect(barX, barY, barWidth * pct, barHeight);
        }
    }
}

export class Shockwave {
    constructor(x, y, color, maxRadius) {
        this.x = x;
        this.y = y;
        this.radius = 1;
        this.maxRadius = maxRadius;
        this.color = color;
        this.active = true;
        this.speed = 15;
        this.lineWidth = 5;
    }

    update(deltaTime) {
        this.radius += this.speed * deltaTime * 60; // speed adjustment
        this.lineWidth = 5 * (1 - this.radius / this.maxRadius);

        if (this.radius >= this.maxRadius) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.strokeStyle = this.color;
        ctx.lineWidth = Math.max(0.1, this.lineWidth);
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
    }
}

export class FloatingText {
    constructor(text, x, y, color) {
        this.text = text;
        this.x = x;
        this.y = y;
        this.color = color;
        this.life = 1.0; // 1 second
        this.velocity = 50;
        this.active = true;
        this.size = 20; // Default size
    }

    update(deltaTime) {
        this.life -= deltaTime;
        this.y -= this.velocity * deltaTime; // Float up
        if (this.life <= 0) {
            this.active = false;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life); // Fade out
        ctx.fillStyle = this.color;

        ctx.font = `${this.size}px "Major Mono Display"`;
        ctx.textAlign = 'center';

        // Add glow for larger texts?
        if (this.size > 20) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
        }

        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

export class WaveAnnouncement {
    constructor(wave, canvasWidth, canvasHeight) {
        this.text = `WAVE ${wave}`;
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        this.y = canvasHeight * 0.3; // Top 30%
        this.x = canvasWidth + 200; // Start off-screen right
        this.active = true;

        // Animation state
        this.state = 'ENTERING'; // ENTERING -> PAUSED -> EXITING
        this.timer = 0;
        this.pauseDuration = 1.0; // Stay in middle for 1s
    }

    update(deltaTime) {
        const centerX = this.canvasWidth / 2;

        if (this.state === 'ENTERING') {
            // Fast approach
            const dist = this.x - centerX;
            if (Math.abs(dist) < 5) {
                this.x = centerX;
                this.state = 'PAUSED';
            } else {
                // Ease out
                this.x -= (dist * 5 * deltaTime) + (200 * deltaTime);
            }
        } else if (this.state === 'PAUSED') {
            this.timer += deltaTime;
            if (this.timer >= this.pauseDuration) {
                this.state = 'EXITING';
            }
        } else if (this.state === 'EXITING') {
            // Accelerate left
            this.x -= 800 * deltaTime;
            if (this.x < -200) {
                this.active = false;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.font = 'bold 64px "Major Mono Display"';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Glow effect
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#ffffff';

        // Skew for "wind" effect
        // ctx.transform(1, 0, -0.2, 1, 0, 0); // Horizontal skew

        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

export class Boss {
    constructor(bossLevel, canvasWidth, canvasHeight) {
        // Boss Level 1 = A, 2 = B, etc.
        this.level = bossLevel;
        // Boss A (level 1) -> charCode 65 ('A')
        this.name = `BOSS ${String.fromCharCode(64 + bossLevel)}`;

        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;

        // Stats
        this.maxHealth = 20 + ((bossLevel - 1) * 5);
        this.health = this.maxHealth;
        this.radius = 60;

        // Orbit Physics
        this.targetOrbitRadius = 250;
        this.orbitRadius = canvasHeight * 0.8; // Start far out (entrance animation)
        this.orbitAngle = 0; // Renamed from angle to avoid confusion
        this.orbitSpeed = 0.5; // Rad/s

        // Self Rotation
        this.selfRotation = 0;

        // Center position (orbit center)
        this.cx = canvasWidth / 2;
        this.cy = canvasHeight / 2;

        this.x = this.cx;
        this.y = this.cy;

        this.active = true;

        // Visuals
        this.image = new Image();
        if (this.level === 1) {
            this.image.src = 'img/boss_a.png';
        } else if (this.level === 2) {
            this.image.src = 'img/boss_b.png';
        } else if (this.level === 3) {
            this.image.src = 'img/boss_c.png';
        } else if (this.level === 4) {
            this.image.src = 'img/boss_d.png';
        }

        // Abilities
        this.ability = 'NONE';
        // Simple assignment for now
        if (bossLevel % 2 === 0) this.ability = 'TIME_WARP';
        else if (bossLevel > 1) this.ability = 'GLITCH';

        // Enrage / Surge
        this.isSurging = false;
        this.surgeCooldown = 15.0; // Cooldown between surges
        this.surgeTimer = this.surgeCooldown; // Start with cooldown so it doesn't trigger immediately
        this.surgeDuration = 8.0; // How long surge lasts
        this.justStartedSurge = false; // Flag for Game.js to catch
        this.justEndedSurge = false; // Flag for end of surge
    }

    update(deltaTime) {
        if (!this.active) return;

        // Entrance Animation: Shrink orbit radius
        if (this.orbitRadius > this.targetOrbitRadius) {
            this.orbitRadius -= 150 * deltaTime; // Approach speed
            if (this.orbitRadius < this.targetOrbitRadius) {
                this.orbitRadius = this.targetOrbitRadius;
            }
        }

        // Orbit Center
        let currentOrbitSpeed = this.orbitSpeed;
        if (this.isSurging) {
            currentOrbitSpeed *= 4.0; // Much faster during surge
        }
        this.orbitAngle += currentOrbitSpeed * deltaTime;

        this.x = this.cx + Math.cos(this.orbitAngle) * this.orbitRadius;
        this.y = this.cy + Math.sin(this.orbitAngle) * this.orbitRadius;

        // Self Rotation (Visual)
        // Slow rotate normally, Fast during Surge
        const rotationSpeed = this.isSurging ? 5.0 : 0.5;
        this.selfRotation += rotationSpeed * deltaTime;

        // Surge Logic
        this.justStartedSurge = false; // Reset frame flag
        this.justEndedSurge = false;

        if (this.isSurging) {
            this.surgeTimer -= deltaTime;
            if (this.surgeTimer <= 0) {
                this.isSurging = false;
                this.justEndedSurge = true;
                this.surgeTimer = this.surgeCooldown;
            }
        } else {
            this.surgeTimer -= deltaTime;
            if (this.surgeTimer <= 0) {
                this.startSurge();
            }
        }
    }

    startSurge() {
        this.isSurging = true;
        this.surgeTimer = this.surgeDuration;
        this.justStartedSurge = true;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
            return true; // Died
        }
        return false;
    }

    draw(ctx) {
        if (!this.active) return;

        // Draw Orbit Path - REMOVED per user request
        // ctx.beginPath();
        // ctx.strokeStyle = 'rgba(255, 0, 85, 0.2)';
        // ctx.lineWidth = 2;
        // ctx.arc(this.cx, this.cy, this.orbitRadius, 0, Math.PI * 2);
        // ctx.stroke();

        ctx.save();
        // Translate to boss position
        ctx.translate(this.x, this.y);

        // Draw Boss Image (Level 1-4)
        if (this.level <= 4 && this.image.complete) {
            ctx.rotate(this.selfRotation);
            const size = this.radius * 2.8; // Adjust size multiplier as needed
            ctx.drawImage(this.image, -size / 2, -size / 2, size, size);

            // Optional: Glow effect if surging
            if (this.isSurging) {
                ctx.globalCompositeOperation = 'lighter';
                ctx.globalAlpha = 0.5;
                ctx.drawImage(this.image, -size / 2, -size / 2, size, size);
                ctx.globalAlpha = 1.0;
                ctx.globalCompositeOperation = 'source-over';
            }
        } else {
            // Placeholder visual: Giant Polygon
            ctx.beginPath();
            const sides = 5 + (this.level % 3); // Shape changes with level
            const r = this.radius;
            for (let i = 0; i < sides; i++) {
                const theta = (i / sides) * Math.PI * 2;
                const px = Math.cos(theta) * r;
                const py = Math.sin(theta) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();

            ctx.fillStyle = '#ff0055'; // Boss Red
            ctx.shadowColor = '#ff0055';
            ctx.shadowBlur = 20;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.restore();

        // Draw Name & Health Bar (Post-restore so no rotation)
        ctx.save();
        ctx.translate(this.x, this.y);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px "Major Mono Display"';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#000';
        ctx.shadowBlur = 4;
        ctx.fillText(this.name, 0, -this.radius - 20);

        // Draw Health Bar
        const barWidth = 100;
        const barHeight = 10;
        const barY = -this.radius - 10;

        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);

        const pct = Math.max(0, this.health / this.maxHealth);
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(-barWidth / 2, barY, barWidth * pct, barHeight);

        ctx.restore();
    }
}

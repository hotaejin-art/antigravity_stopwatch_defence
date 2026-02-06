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
            // Adjust scale as needed. Radius is 30, so diameter 60.
            // Let's make the tower slightly larger visually
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

            // Border (optional, keeps it clean)
            // ctx.strokeStyle = 'white';
            // ctx.lineWidth = 0.5;
            // ctx.strokeRect(barX, barY, barWidth, barHeight);
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
        ctx.font = '20px "Major Mono Display"';
        ctx.textAlign = 'center';
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

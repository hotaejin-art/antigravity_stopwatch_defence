export default class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        this.bgImage = new Image();
        this.bgLoaded = false;

        this.bgImage.onload = () => {
            console.log('Background image loaded successfully');
            this.bgLoaded = true;
        };
        this.bgImage.onerror = (e) => {
            console.error('Failed to load background image', e);
            alert('Failed to load background image: img/background.png');
        };

        this.bgImage.src = 'img/background.png?t=' + new Date().getTime(); // Force reload
    }

    resize(width, height) {
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.height = height;
    }

    clear() {
        if (this.bgLoaded) {
            this.ctx.drawImage(this.bgImage, 0, 0, this.width, this.height);
        } else {
            this.ctx.fillStyle = '#000033'; // Dark blue fallback to indicate "Image Not Loaded"
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.drawGrid();
        }

        // Darken overlay for better UI visibility?
        // this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        // this.ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGrid() {
        this.ctx.strokeStyle = '#222';
        this.ctx.lineWidth = 1;

        const gridSize = 50;
        for (let x = 0; x <= this.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        for (let y = 0; y <= this.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
    }

    drawText(text, x, y, color = '#fff', size = 40) {
        this.ctx.fillStyle = color;
        this.ctx.font = `${size}px "Major Mono Display"`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(text, x, y);
    }

    showFloatingText(text, x, y, color) {
        // For now, just draw it immediately or add to a list?
        // Renderer should probably just draw. Game.js handles state.
        // But Game.js called `renderer.showFloatingText`.
        // Let's implement a simple list in Renderer to manage floating texts? 
        // No, Game.js should manage entities.
        // I'll make this method just create a "FloatingText" entity in the Game class?
        // Or better, let's just make this method log for now and I'll add FloatingText entity to Game.js later.
        // Actually, I can just draw it once here but it won't float.
        // I check Game.js again. It calls it once. So it expects a fire-and-forget effect.
        // Renderer is stateless usually.
        // Let's change Game.js to manage floating texts properly.
        console.log('Floating Text:', text);
    }
}

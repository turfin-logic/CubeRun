// game.js - Core Game Logic

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const scoreDisplay = document.getElementById('scoreValue');
const finalScoreDisplay = document.getElementById('finalScore');
const highScoreDisplay = document.getElementById('highScore');

// Game State
let GAME_STATE = 'MENU'; // MENU, PLAYING, GAMEOVER
let score = 0;
let highScore = localStorage.getItem('neonDriftHighScore') || 0;
let frameCount = 0;
let baseSpeed = 5;

// Resize canvas to full screen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Constants based on canvas size
const CEILING = canvas.height * 0.2;
const FLOOR = canvas.height * 0.8;
const LANE_HEIGHT = FLOOR - CEILING;

// Entities
const player = {
    x: 100,
    y: FLOOR - 30,
    width: 30,
    height: 30,
    color: '#00f3ff', // neon cyan
    gravityDir: 1, // 1 for down, -1 for up
    velocity: 0,
    isSwapping: false
};

let obstacles = [];
let particles = [];

// Particle System
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.color = color;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.02;
    }
    draw(ctx) {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 4, 4);
        ctx.globalAlpha = 1.0;
    }
}

function createExplosion(x, y, color) {
    for(let i=0; i<30; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Obstacle class
class Obstacle {
    constructor() {
        this.width = 40 + Math.random() * 40;
        this.height = 40 + Math.random() * 40;
        this.x = canvas.width;
        // 50% chance top or bottom
        this.isTop = Math.random() > 0.5;
        this.y = this.isTop ? CEILING : FLOOR - this.height;
        this.color = '#ff007f'; // neon pink
    }
    update(speed) {
        this.x -= speed;
    }
    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.shadowBlur = 0; // reset
    }
}

// Input Handling
function swapGravity() {
    if (GAME_STATE !== 'PLAYING') return;
    if (!player.isSwapping) {
        player.gravityDir *= -1;
        player.isSwapping = true;
    }
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') swapGravity();
});
window.addEventListener('touchstart', swapGravity);
window.addEventListener('mousedown', swapGravity);

// Game Loop Functions
function initGame() {
    score = 0;
    frameCount = 0;
    baseSpeed = 5;
    obstacles = [];
    particles = [];
    player.y = FLOOR - player.height;
    player.gravityDir = 1;
    player.isSwapping = false;
    
    scoreDisplay.innerText = score;
    startScreen.classList.remove('active');
    gameOverScreen.classList.remove('active');
    
    GAME_STATE = 'PLAYING';
    gameLoop();
}

function update() {
    frameCount++;
    
    // Increase difficulty
    if (frameCount % 600 === 0) baseSpeed += 1;

    // Player Movement (Gravity Swap)
    if (player.isSwapping) {
        const swapSpeed = 15;
        player.y += swapSpeed * player.gravityDir;
        
        // Floor collision
        if (player.gravityDir === 1 && player.y >= FLOOR - player.height) {
            player.y = FLOOR - player.height;
            player.isSwapping = false;
        }
        // Ceiling collision
        if (player.gravityDir === -1 && player.y <= CEILING) {
            player.y = CEILING;
            player.isSwapping = false;
        }
    }

    // Spawn Obstacles
    if (frameCount % Math.max(60, 150 - baseSpeed*5) === 0) {
        obstacles.push(new Obstacle());
    }

    // Update Obstacles & Check Collisions
    for (let i = obstacles.length - 1; i >= 0; i--) {
        let obs = obstacles[i];
        obs.update(baseSpeed);

        // Collision Logic AABB
        if (player.x < obs.x + obs.width &&
            player.x + player.width > obs.x &&
            player.y < obs.y + obs.height &&
            player.y + player.height > obs.y) {
            
            gameOver();
        }

        if (obs.x + obs.width < 0) {
            obstacles.splice(i, 1);
            score += 10;
            scoreDisplay.innerText = score;
        }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        if (particles[i].life <= 0) particles.splice(i, 1);
    }
}

function draw() {
    // Clear and draw background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Tunnel lines (Ceiling and Floor)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, CEILING); ctx.lineTo(canvas.width, CEILING);
    ctx.moveTo(0, FLOOR); ctx.lineTo(canvas.width, FLOOR);
    ctx.stroke();

    // Draw Grid (moving effect)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
    const offset = (frameCount * baseSpeed) % 50;
    for(let i = -offset; i < canvas.width; i+=50) {
        ctx.beginPath();
        ctx.moveTo(i, CEILING); ctx.lineTo(i, FLOOR);
        ctx.stroke();
    }

    // Draw Obstacles
    obstacles.forEach(obs => obs.draw(ctx));

    // Draw Particles
    particles.forEach(p => p.draw(ctx));

    // Draw Player
    if (GAME_STATE === 'PLAYING') {
        ctx.fillStyle = player.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = player.color;
        ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.shadowBlur = 0;
    }
}

function gameLoop() {
    if (GAME_STATE !== 'PLAYING') return;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    GAME_STATE = 'GAMEOVER';
    createExplosion(player.x + 15, player.y + 15, player.color);
    draw(); // Draw final explosion frame

    // Update High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('neonDriftHighScore', highScore);
    }

    finalScoreDisplay.innerText = score;
    highScoreDisplay.innerText = highScore;
    
    gameOverScreen.classList.add('active');

    // TRIGGER AD BEFORE RESTART
    // The restart button is hidden initially, ads.js will reveal it
    if(window.AdManager) {
        AdManager.showInterstitial().then(() => {
            console.log("Ready to play again.");
        });
    } else {
        // Fallback if ad manager fails
        restartBtn.style.display = 'block';
    }
}

// Listeners for UI
startBtn.addEventListener('click', initGame);
restartBtn.addEventListener('click', initGame);

// Show initial banner ad
if(window.AdManager) {
    AdManager.showBanner();
}

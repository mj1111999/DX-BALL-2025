const canvas = document.getElementById("gameCanvas");
canvas.width = 800;
canvas.height = 600;
const ctx = canvas.getContext("2d");

// Ball
let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 2;
let dy = -2;
const ballRadius = 10;

// Paddle
const paddleHeight = 10;
let paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

// Controls
let rightPressed = false;
let leftPressed = false;
let isTouch = false;
let touchX = null;

// Bricks
let brickRowCount = 3;
const brickColumnCount = 5;
const brickWidth = 75;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;
let bricks = [];

let level = 1;
const maxLevel = 100;
let score = 0;

// Sounds
const bounceSound = new Audio("sounds/mixkit-soccer-ball-quick-kick-2108.wav");
const brickSound = new Audio("sounds/mixkit-glass-break-with-hammer-thud-759.wav");
const levelSound = new Audio("sounds/next-level-160613.mp3");
const bonusSound = new Audio("sounds/realistic-gun-fire-100696.mp3");

// Music
const bgMusic = new Audio("sounds/game-music-player-console-8bit-background-intro-theme-297305.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;
document.addEventListener("click", () => bgMusic.play(), { once: true });

const muteButton = document.createElement("button");
muteButton.textContent = "🔇 Mute Music";
muteButton.style.margin = "10px";
document.body.appendChild(muteButton);
let musicMuted = false;

muteButton.onclick = () => {
  musicMuted = !musicMuted;
  bgMusic.muted = musicMuted;
  muteButton.textContent = musicMuted ? "🔊 Unmute Music" : "🔇 Mute Music";
};

// Power-ups
let powerUps = [];

function spawnPowerUp(x, y) {
  const types = ["expand", "slow", "multi"];
  const type = types[Math.floor(Math.random() * types.length)];
  powerUps.push({ x, y, type, active: true });
}

function drawPowerUps() {
  powerUps.forEach(p => {
    if (!p.active) return;
    ctx.beginPath();
    ctx.rect(p.x, p.y, 20, 20);
    ctx.fillStyle = {
      expand: "lime",
      slow: "cyan",
      multi: "gold"
    }[p.type];
    ctx.fill();
    ctx.closePath();
  });
}

function updatePowerUps() {
  powerUps.forEach(p => {
    if (!p.active) return;
    p.y += 2;
    if (
      p.y + 20 >= canvas.height - paddleHeight &&
      p.x >= paddleX &&
      p.x <= paddleX + paddleWidth
    ) {
      p.active = false;
      bonusSound.play();
      activatePowerUp(p.type);
    }
  });
}

function activatePowerUp(type) {
  if (type === "expand") {
    paddleWidth += 40;
    setTimeout(() => {
      paddleWidth -= 40;
    }, 8000);
  } else if (type === "slow") {
    dx *= 0.6;
    dy *= 0.6;
    setTimeout(() => {
      dx *= 1.67;
      dy *= 1.67;
    }, 8000);
  } else if (type === "multi") {
    // Placeholder: You can implement multi-ball logic here
    score += 5;
  }
}

// Bricks
function createBricks() {
  bricks = [];
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      const status = Math.random() < 0.9 ? 1 : 0;
      const hasBonus = Math.random() < 0.2;
      bricks[c][r] = { x: 0, y: 0, status, bonus: hasBonus };
    }
  }
}

// Input
document.addEventListener("keydown", e => {
  if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
  if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
});
document.addEventListener("keyup", e => {
  if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
  if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
});

// Touch controls
canvas.addEventListener("touchstart", e => {
  isTouch = true;
  touchX = e.touches[0].clientX;
});
canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  touchX = e.touches[0].clientX;
  const rect = canvas.getBoundingClientRect();
  paddleX = touchX - rect.left - paddleWidth / 2;
}, { passive: false });

// Drawing
function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status) {
        const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
        const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
        b.x = brickX;
        b.y = brickY;
        ctx.beginPath();
        ctx.rect(brickX, brickY, brickWidth, brickHeight);
        ctx.fillStyle = b.bonus ? "#FFD700" : `hsl(${(level * 45 + r * 10) % 360}, 80%, 60%)`;
        ctx.fill();
        ctx.closePath();
      }
    }
  }
}

function collisionDetection() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
        if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
          dy = -dy;
          b.status = 0;
          score++;
          brickSound.play();
          if (b.bonus) spawnPowerUp(b.x + brickWidth / 2, b.y);
        }
      }
    }
  }
}

function checkLevelComplete() {
  for (let c = 0; c < brickColumnCount; c++)
    for (let r = 0; r < brickRowCount; r++)
      if (bricks[c][r].status === 1) return;

  levelSound.play();
  setTimeout(() => {
    level++;
    if (level % 3 === 0 && brickRowCount < 6) brickRowCount++;
    resetLevel();
  }, 600);
}

function resetLevel() {
  x = canvas.width / 2;
  y = canvas.height - 30;
  dx = 2 + 0.5 * (level - 1);
  dy = -2 - 0.5 * (level - 1);
  paddleWidth = 75;
  paddleX = (canvas.width - paddleWidth) / 2;
  powerUps = [];
  createBricks();
}

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function drawHUD() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`Level: ${level} / ${maxLevel}`, 8, 20);
  ctx.fillText(`Score: ${score}`, canvas.width - 110, 20);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  drawHUD();
  drawPowerUps();
  updatePowerUps();
  collisionDetection();
  checkLevelComplete();

  if (x + dx > canvas.width - ballRadius || x + dx < ballRadius) {
    dx = -dx;
    bounceSound.play();
  }
  if (y + dy < ballRadius) {
    dy = -dy;
    bounceSound.play();
  } else if (y + dy > canvas.height - ballRadius) {
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
      bounceSound.play();
    } else {
      alert("Game Over! Reloading...");
      document.location.reload();
      return;
    }
  }

  if (!isTouch) {
    if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 7;
    else if (leftPressed && paddleX > 0) paddleX -= 7;
  }

  x += dx;
  y += dy;

  requestAnimationFrame(draw);
}

// Start
createBricks();
draw();

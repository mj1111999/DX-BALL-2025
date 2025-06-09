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
const paddleWidth = 75;
let paddleX = (canvas.width - paddleWidth) / 2;

// Controls
let rightPressed = false;
let leftPressed = false;

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
let isPaused = false;
let animationId = null;
let powerUps = [];

// Sounds
const bounceSound = new Audio("sounds/mixkit-soccer-ball-quick-kick-2108.wav");
const brickSound = new Audio("sounds/mixkit-glass-break-with-hammer-thud-759.wav");
const levelSound = new Audio("sounds/next-level-160613.mp3");
const bonusSound = new Audio("sounds/realistic-gun-fire-100696.mp3");

// Background Music
const bgMusic = new Audio("sounds/game-music-player-console-8bit-background-intro-theme-297305.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;

let musicMuted = false;

// Mute Button
const muteButton = document.createElement("button");
muteButton.style.margin = "10px";
muteButton.textContent = "🔇 Mute Music";
document.body.appendChild(muteButton);

// Try to autoplay on first interaction
document.addEventListener("click", () => {
  bgMusic.play().catch(err => console.warn("Autoplay blocked:", err));
}, { once: true });

muteButton.onclick = () => {
  musicMuted = !musicMuted;
  bgMusic.muted = musicMuted;
  muteButton.textContent = musicMuted ? "🔊 Unmute Music" : "🔇 Mute Music";
};

// Keyboard Controls
document.addEventListener("keydown", keyDownHandler);
document.addEventListener("keyup", keyUpHandler);

function keyDownHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
  else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
}

function keyUpHandler(e) {
  if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
  else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
}

// Create Bricks
function createBricks() {
  bricks = [];
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      const status = Math.random() < 0.8 ? 1 : 0;
      const hasBonus = Math.random() < 0.2;
      bricks[c][r] = { x: 0, y: 0, status, bonus: hasBonus };
    }
  }
}

// Draw Bricks
function drawBricks() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      const b = bricks[c][r];
      if (b.status === 1) {
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

// Draw Ball
function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.closePath();
}

// Draw Paddle
function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

// Draw HUD
function drawHUD() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Level: " + level + " / " + maxLevel, 8, 20);
  ctx.fillText("Score: " + score, canvas.width - 110, 20);
}

// Collision Detection
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

          if (b.bonus) {
            powerUps.push({ x: b.x + brickWidth / 2, y: b.y + brickHeight, dy: 2 });
            score += 5;
          }
        }
      }
    }
  }
}

// Draw Power-Ups
function drawPowerUps() {
  for (let i = 0; i < powerUps.length; i++) {
    const pu = powerUps[i];
    pu.y += pu.dy;

    ctx.beginPath();
    ctx.arc(pu.x, pu.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#FFD700";
    ctx.fill();
    ctx.closePath();

    // Check paddle catch
    if (
      pu.y + 8 > canvas.height - paddleHeight &&
      pu.x > paddleX &&
      pu.x < paddleX + paddleWidth
    ) {
      score += 10;
      bonusSound.play();
      powerUps.splice(i, 1);
      i--;
    }

    // Remove if off screen
    if (pu.y > canvas.height) {
      powerUps.splice(i, 1);
      i--;
    }
  }
}

// Level Check
function checkLevelComplete() {
  let allBricksCleared = true;
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) {
        allBricksCleared = false;
        break;
      }
    }
  }

  if (allBricksCleared) {
    levelSound.play();
    isPaused = true;

    setTimeout(() => {
      level++;
      if (level > maxLevel) {
        alert("🎉 Congratulations! You've completed all 100 levels!");
        resetGame();
        return;
      }

      if (level % 3 === 0 && brickRowCount < 6) brickRowCount++;
      dx += dx > 0 ? 0.5 : -0.5;
      dy += dy > 0 ? 0.5 : -0.5;

      resetLevel();
      isPaused = false;
      draw();
    }, 1000);
  }
}

// Reset Level
function resetLevel() {
  x = canvas.width / 2;
  y = canvas.height - 30;
  paddleX = (canvas.width - paddleWidth) / 2;
  createBricks();
}

// Reset Entire Game
function resetGame() {
  level = 1;
  score = 0;
  brickRowCount = 3;
  dx = 2;
  dy = -2;
  powerUps = [];
  resetLevel();
  draw();
}

// Main Draw Function
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  drawHUD();
  drawPowerUps();
  collisionDetection();
  checkLevelComplete();

  // Wall and paddle collisions
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
      alert("Game Over!");
      resetGame();
      return;
    }
  }

  if (rightPressed && paddleX < canvas.width - paddleWidth) paddleX += 7;
  else if (leftPressed && paddleX > 0) paddleX -= 7;

  x += dx;
  y += dy;

  if (!isPaused) {
    animationId = requestAnimationFrame(draw);
  }
}

// Start Game
createBricks();
draw();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Audio setup
const bounceSound = new Audio("sounds/mixkit-soccer-ball-quick-kick-2108.wav");
const brickSound = new Audio("sounds/mixkit-glass-break-with-hammer-thud-759.wav");
const levelSound = new Audio("sounds/next-level-160613.mp3");
const bonusSound = new Audio("sounds/realistic-gun-fire-100696.mp3");
const bgMusic = new Audio("sounds/game-music-player-console-8bit-background-intro-theme-297305.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;

// Mute button
const muteButton = document.createElement("button");
muteButton.style.margin = "10px";
muteButton.textContent = "🔇 Mute Music";
document.body.appendChild(muteButton);
let musicMuted = false;

document.addEventListener("click", () => {
  bgMusic.play().catch((err) => console.warn("Blocked: ", err));
}, { once: true });

muteButton.onclick = () => {
  musicMuted = !musicMuted;
  bgMusic.muted = musicMuted;
  muteButton.textContent = musicMuted ? "🔊 Unmute Music" : "🔇 Mute Music";
};

// Game state
let x, y, dx, dy;
let ballRadius = 10;
let paddleHeight = 10;
let paddleWidth = 75;
let paddleX;
let rightPressed = false;
let leftPressed = false;
let brickRowCount = 3;
const brickColumnCount = 5;
let brickWidth = 75;
let brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;
let bricks = [];
let level = 1;
const maxLevel = 100;
let score = 0;
let isPaused = false;
let animationId;

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight - 80;

  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  scaleGame(width, height);
}

function scaleGame(w, h) {
  const scale = Math.min(w / 800, h / 600);

  ballRadius = 10 * scale;
  paddleHeight = 10 * scale;
  paddleWidth = 75 * scale;
  dx = (2 + 0.5 * (level - 1)) * scale;
  dy = (-2 - 0.5 * (level - 1)) * scale;
  x = w / 2;
  y = h - 30 * scale;
  paddleX = (w - paddleWidth) / 2;

  brickWidth = 75 * scale;
  brickHeight = 20 * scale;

  createBricks();
}

function createBricks() {
  bricks = [];
  for (let c = 0; c < brickColumnCount; c++) {
    bricks[c] = [];
    for (let r = 0; r < brickRowCount; r++) {
      const status = Math.random() < 0.8 ? 1 : 0;
      const hasBonus = Math.random() < 0.2;
      const type = hasBonus ? ["expand", "shrink", "score"][Math.floor(Math.random() * 3)] : null;
      bricks[c][r] = { x: 0, y: 0, status: status, bonus: hasBonus, type: type };
    }
  }
}

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

function drawBall() {
  ctx.beginPath();
  ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.closePath();
}

function drawPaddle() {
  ctx.beginPath();
  ctx.rect(paddleX, canvas.height / window.devicePixelRatio - paddleHeight, paddleWidth, paddleHeight);
  ctx.fillStyle = "#0095DD";
  ctx.fill();
  ctx.closePath();
}

function drawHUD() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Level: " + level + " / " + maxLevel, 8, 20);
  ctx.fillText("Score: " + score, canvas.width / window.devicePixelRatio - 110, 20);
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
          if (b.bonus) {
            bonusSound.play();
            if (b.type === "expand") paddleWidth *= 1.5;
            if (b.type === "shrink") paddleWidth *= 0.75;
            if (b.type === "score") score += 10;
          }
        }
      }
    }
  }
}

function checkLevelComplete() {
  for (let c = 0; c < brickColumnCount; c++) {
    for (let r = 0; r < brickRowCount; r++) {
      if (bricks[c][r].status === 1) return;
    }
  }

  if (level >= maxLevel) {
    alert("🎉 Congratulations! You've completed all 100 levels!");
    document.location.reload();
    return;
  }

  levelSound.play();
  setTimeout(() => {
    level++;
    if (level % 3 === 0 && brickRowCount < 6) brickRowCount++;
    scaleGame(window.innerWidth, window.innerHeight);
  }, 500);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBricks();
  drawBall();
  drawPaddle();
  drawHUD();
  collisionDetection();
  checkLevelComplete();

  if (x + dx > canvas.width / window.devicePixelRatio - ballRadius || x + dx < ballRadius) {
    dx = -dx;
    bounceSound.play();
  }

  if (y + dy < ballRadius) {
    dy = -dy;
    bounceSound.play();
  } else if (y + dy > canvas.height / window.devicePixelRatio - ballRadius) {
    if (x > paddleX && x < paddleX + paddleWidth) {
      dy = -dy;
      bounceSound.play();
    } else {
      alert("Game Over! Reloading...");
      document.location.reload();
    }
  }

  if (rightPressed && paddleX < canvas.width / window.devicePixelRatio - paddleWidth) paddleX += 7;
  else if (leftPressed && paddleX > 0) paddleX -= 7;

  x += dx;
  y += dy;

  if (!isPaused) animationId = requestAnimationFrame(draw);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
  else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
});

document.addEventListener("keyup", (e) => {
  if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
  else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
draw();

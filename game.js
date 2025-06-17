const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Get buttons and modal elements
const muteButton = document.getElementById("muteButton");
const pauseButton = document.getElementById("pauseButton");
const gameModal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCloseButton = document.getElementById("modalCloseButton");

// --- Audio Elements ---
// Create Audio objects for each sound
const backgroundMusic = new Audio('sounds/game-music-player-console-8bit-background-intro-theme-297305.mp3');
backgroundMusic.loop = true; // Loop background music
backgroundMusic.volume = 0.3; // Lower volume for background music

const brickHitSound = new Audio('sounds/mixkit-glass-break-with-hammer-thud-759.wav');
brickHitSound.volume = 0.7;

const bounceSound = new Audio('sounds/mixkit-soccer-ball-quick-kick-2108.wav');
bounceSound.volume = 0.8;

const levelUpSound = new Audio('sounds/next-level-160613.mp3');
levelUpSound.volume = 0.9;

const gameOverSound = new Audio('sounds/game-over-38511.mp3');
gameOverSound.volume = 0.9;

const bonusCollectedSound = new Audio('sounds/realistic-gun-fire-100696.mp3');
bonusCollectedSound.volume = 0.8;

// NEW: Invisible block reveal sound
const invisibleRevealSound = new Audio('sounds/metal-whoosh-hit-10-202176.mp3');
invisibleRevealSound.volume = 0.6; // Adjust volume as needed


// Audio state
let gameSoundsMuted = false;
let bgMusicPlaying = false;

// Function to play sounds
const playSound = (name) => {
    if (gameSoundsMuted) {
        return; // Don't play if muted
    }
    switch (name) {
        case "Brick Hit":
            brickHitSound.currentTime = 0; // Rewind to start for quick repeated plays
            brickHitSound.play().catch(e => console.error("Error playing brick hit sound:", e));
            break;
        case "Bounce":
            bounceSound.currentTime = 0;
            bounceSound.play().catch(e => console.error("Error playing bounce sound:", e));
            break;
        case "Level Up":
            levelUpSound.currentTime = 0;
            levelUpSound.play().catch(e => console.error("Error playing level up sound:", e));
            break;
        case "Game Over":
            gameOverSound.currentTime = 0;
            gameOverSound.play().catch(e => console.error("Error playing game over sound:", e));
            break;
        case "Bonus Collected":
            bonusCollectedSound.currentTime = 0;
            bonusCollectedSound.play().catch(e => console.error("Error playing bonus collected sound:", e));
            break;
        case "Invisible Reveal": // NEW CASE
            invisibleRevealSound.currentTime = 0;
            invisibleRevealSound.play().catch(e => console.error("Error playing invisible reveal sound:", e));
            break;
        // Background music is handled separately for autoplay policy
    }
};

// Attempt to start background music on first user interaction
document.addEventListener("click", () => {
    if (!bgMusicPlaying && !gameSoundsMuted) {
        backgroundMusic.play().then(() => {
            bgMusicPlaying = true;
            console.log("🎵 Background music started.");
        }).catch(e => console.error("Error playing background music:", e));
    }
}, { once: true }); // Only trigger this listener once

// Mute/Unmute functionality
muteButton.onclick = () => {
    gameSoundsMuted = !gameSoundsMuted;
    muteButton.textContent = gameSoundsMuted ? "🔊 Unmute Game Sounds" : "🔇 Mute Game Sounds";

    if (gameSoundsMuted) {
        backgroundMusic.pause(); // Pause background music when muted
        console.log("🔇 Game sounds muted.");
    } else {
        // Only try to play background music if it was previously playing
        if (bgMusicPlaying) {
            backgroundMusic.play().catch(e => console.error("Error resuming background music:", e));
        }
        console.log("🔊 Game sounds unmuted.");
    }
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

// --- Core Game Functions ---

/**
 * Resizes the canvas to fit the window and scales game elements.
 */
function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    // Get current window dimensions, subtracting a bit for controls/padding
    const width = window.innerWidth;
    const height = window.innerHeight - 150; // Adjust for controls and top padding

    // Set canvas display size (CSS pixels)
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // Set canvas internal drawing buffer size (device pixels)
    canvas.width = width * dpr;
    canvas.height = height * dpr;

    // Apply scaling to the context to match device pixel ratio
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation
    ctx.scale(dpr, dpr);

    // Scale game elements based on the new logical (CSS) dimensions
    scaleGame(width, height);
}

/**
 * Scales game elements based on the given logical width and height.
 * @param {number} w - Logical width of the canvas.
 * @param {number} h - Logical height of the canvas.
 */
function scaleGame(w, h) {
    // Base scale factor, relative to a reference size (e.g., 800x600)
    const baseRefWidth = 800;
    const baseRefHeight = 600;
    const scale = Math.min(w / baseRefWidth, h / baseRefHeight);

    ballRadius = 10 * scale;
    paddleHeight = 10 * scale;
    paddleWidth = 75 * scale;

    // Adjust ball speed based on level and scale
    dx = (2 + 0.5 * (level - 1)) * scale;
    dy = (-2 - 0.5 * (level - 1)) * scale;

    // Re-position ball and paddle based on new canvas size and scale
    x = w / 2;
    y = h - 30 * scale; // Keep ball just above paddle
    paddleX = (w - paddleWidth) / 2; // Center paddle

    brickWidth = 75 * scale;
    brickHeight = 20 * scale;

    createBricks(); // Recreate bricks with new dimensions
}

/**
 * Initializes or re-initializes the brick layout for the current level.
 * Bricks are either active (status 1), invisible (status 2), or inactive (status 0).
 * Some active bricks can have a bonus.
 */
function createBricks() {
    bricks = [];
    // Adjust the probability for invisible blocks here (e.g., 0.15 for 15%)
    const invisibleBlockChance = 0.15 + (level * 0.01); // Slightly increase chance with level
    for (let c = 0; c < brickColumnCount; c++) {
        bricks[c] = [];
        for (let r = 0; r < brickRowCount; r++) {
            let status = 1; // Default to active
            const isInvisible = Math.random() < invisibleBlockChance;
            if (isInvisible) {
                status = 2; // Set status to 2 for invisible bricks
            }

            const hasBonus = Math.random() < 0.2; // 20% chance for a bonus
            const type = hasBonus ? ["expand", "shrink", "score"][Math.floor(Math.random() * 3)] : null;
            bricks[c][r] = { x: 0, y: 0, status: status, bonus: hasBonus, type: type };
        }
    }
}

/**
 * Draws all active and visible bricks on the canvas.
 */
function drawBricks() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            // Only draw if status is 1 (visible and active)
            if (b.status === 1) {
                // Calculate brick position adjusted for padding and offset
                const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
                const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;
                b.x = brickX;
                b.y = brickY; // Store actual position for collision detection

                ctx.beginPath();
                ctx.roundRect(brickX, brickY, brickWidth, brickHeight, 5); // Rounded rectangles
                // Dynamic brick color based on level and row
                const hue = (level * 45 + r * 10) % 360;
                ctx.fillStyle = b.bonus ? "#FFD700" : `hsl(${hue}, 80%, 60%)`; // Gold for bonus, HSL for others
                ctx.fill();
                ctx.closePath();
            }
        }
    }
}

/**
 * Draws the ball on the canvas.
 */
function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff"; // White ball
    ctx.fill();
    ctx.closePath();
}

/**
 * Draws the paddle on the canvas.
 */
function drawPaddle() {
    ctx.beginPath();
    // Paddle is drawn at the bottom, adjusting for device pixel ratio
    ctx.roundRect(paddleX, canvas.height / window.devicePixelRatio - paddleHeight, paddleWidth, paddleHeight, 5);
    ctx.fillStyle = "#0095DD"; // Blue paddle
    ctx.fill();
    ctx.closePath();
}

/**
 * Draws the Heads-Up Display (HUD) showing level and score.
 */
function drawHUD() {
    ctx.font = "bold 18px 'Inter'"; // Slightly larger, bold font
    ctx.fillStyle = "#ffffff"; // White text
    ctx.textAlign = "left";
    ctx.fillText(`Level: ${level} / ${maxLevel}`, 8, 20); // Top-left
    ctx.textAlign = "right";
    // Adjust position for score based on canvas width and device pixel ratio
    ctx.fillText(`Score: ${score}`, canvas.width / window.devicePixelRatio - 8, 20); // Top-right
}

/**
 * Handles collision detection between the ball and bricks.
 */
function collisionDetection() {
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            const b = bricks[c][r];
            // Only check active (status 1) or invisible (status 2) bricks
            if (b.status === 1 || b.status === 2) {
                // Check if ball's center is within brick's bounds
                if (x > b.x && x < b.x + brickWidth && y > b.y && y < b.y + brickHeight) {
                    dy = -dy; // Reverse ball direction

                    if (b.status === 2) {
                        // If it's an invisible brick, make it visible and play reveal sound
                        b.status = 1; // Change status to visible (active)
                        playSound("Invisible Reveal");
                        // Don't increase score on reveal, only on actual break
                    } else if (b.status === 1) {
                        // If it's a visible brick, break it
                        b.status = 0; // Mark brick as hit (inactive)
                        score++; // Increase score
                        playSound("Brick Hit"); // Play brick sound
                        if (b.bonus) {
                            playSound("Bonus Collected"); // Play bonus sound
                            if (b.type === "expand") paddleWidth = Math.min(paddleWidth * 1.5, canvas.width / window.devicePixelRatio * 0.8); // Max 80% width
                            if (b.type === "shrink") paddleWidth = Math.max(paddleWidth * 0.75, 30); // Min 30px width
                            if (b.type === "score") score += 10; // Bonus points
                        }
                    }
                    // Break out of the inner loop once a collision is detected and handled
                    return;
                }
            }
        }
    }
}

/**
 * Checks if the current level is complete and advances to the next level or ends the game.
 */
function checkLevelComplete() {
    // Check if any active (status 1) or invisible (status 2) bricks remain
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            if (bricks[c][r].status === 1 || bricks[c][r].status === 2) return; // Level not complete
        }
    }

    // If all bricks are cleared (status 0)
    if (level >= maxLevel) {
        showModal("🎉 Congratulations!", "You've completed all 100 levels! Amazing job!", true);
        return;
    }

    playSound("Level Up"); // Play level sound
    isPaused = true; // Pause game temporarily for level transition
    setTimeout(() => {
        level++; // Increment level
        if (level % 3 === 0 && brickRowCount < 6) brickRowCount++; // Add a new row of bricks every 3 levels
        scaleGame(window.innerWidth, window.innerHeight - 150); // Re-initialize game state for new level
        isPaused = false; // Resume game
        // If animation was stopped by pause, restart it
        if (!animationId) draw();
    }, 1000); // Wait 1 second before next level
}

/**
 * The main game drawing and update loop.
 */
function draw() {
    if (isPaused) {
        animationId = null; // Ensure animation stops if paused
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

    drawBricks();
    drawBall();
    drawPaddle();
    drawHUD();
    collisionDetection(); // Call collision detection before ball movement
    checkLevelComplete();

    // Ball movement logic: bounce off walls
    if (x + dx > canvas.width / window.devicePixelRatio - ballRadius || x + dx < ballRadius) {
        dx = -dx;
        playSound("Bounce"); // Play bounce sound
    }
    if (y + dy < ballRadius) {
        dy = -dy;
        playSound("Bounce"); // Play bounce sound
    } else if (y + dy > canvas.height / window.devicePixelRatio - ballRadius - paddleHeight) {
        // Check collision with paddle
        if (x > paddleX && x < paddleX + paddleWidth) {
            dy = -dy; // Reverse direction
            // Optional: adjust ball angle based on where it hits the paddle
            const hitPoint = (x - paddleX) / paddleWidth; // 0 to 1
            dx = (hitPoint - 0.5) * (dx > 0 ? 1 : -1) * (2 + 0.5 * (level - 1)); // Adjust angle and speed
            playSound("Bounce"); // Play bounce sound
        } else if (y + dy > canvas.height / window.devicePixelRatio - ballRadius) {
            // Ball hit the bottom (missed paddle)
            showModal("Game Over!", "You missed the ball! Try again?", false);
            return; // Stop game loop immediately
        }
    }

    // Paddle movement logic (keyboard)
    const paddleSpeed = 7; // Fixed paddle speed for keyboard
    if (rightPressed && paddleX < canvas.width / window.devicePixelRatio - paddleWidth) {
        paddleX += paddleSpeed;
    } else if (leftPressed && paddleX > 0) {
        paddleX -= paddleSpeed;
    }

    // Update ball position
    x += dx;
    y += dy;

    // Request next frame
    animationId = requestAnimationFrame(draw);
}

// --- Event Listeners ---

// Keyboard controls for paddle
document.addEventListener("keydown", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = true;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = true;
});

document.addEventListener("keyup", (e) => {
    if (e.key === "Right" || e.key === "ArrowRight") rightPressed = false;
    else if (e.key === "Left" || e.key === "ArrowLeft") leftPressed = false;
});

// Touch controls for paddle (mobile)
let touchStartPaddleX = 0; // Where the touch started on the paddle
let touchStartX = 0; // Where the touch started on the screen

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault(); // Prevent scrolling/zooming
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        // Calculate where the touch is relative to the paddle's current center
        touchStartPaddleX = paddleX + paddleWidth / 2;
    }
}, { passive: false }); // passive: false to allow preventDefault

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault(); // Prevent scrolling/zooming
    if (e.touches.length > 0) {
        const touch = e.touches[0];
        const deltaX = touch.clientX - touchStartX;
        let newPaddleX = touchStartPaddleX + deltaX - paddleWidth / 2;

        // Clamp paddleX to stay within canvas bounds
        newPaddleX = Math.max(0, Math.min(newPaddleX, canvas.width / window.devicePixelRatio - paddleWidth));
        paddleX = newPaddleX;
    }
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    e.preventDefault(); // Prevent scrolling/zooming
    // Stop any further touch-based movement if desired, though `touchmove` handles continuous updates
}, { passive: false });

// Pause/Resume functionality
pauseButton.onclick = () => {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? "▶️ Resume" : "⏸️ Pause";
    if (!isPaused) {
        draw(); // Resume animation loop
        console.log("Game Resumed");
        if (bgMusicPlaying && !gameSoundsMuted) {
            backgroundMusic.play().catch(e => console.error("Error resuming background music:", e));
        }
    } else {
        cancelAnimationFrame(animationId); // Stop current animation frame
        animationId = null; // Clear animation ID
        backgroundMusic.pause(); // Pause background music when game is paused
        console.log("Game Paused");
    }
};

// --- Custom Modal Logic ---

/**
 * Shows a custom modal with a title and message.
 * @param {string} title - The title for the modal.
 * @param {string} message - The message content for the modal.
 * @param {boolean} winCondition - True if it's a win, false for game over.
 */
function showModal(title, message, winCondition) {
    isPaused = true; // Pause the game
    cancelAnimationFrame(animationId);
    animationId = null;
    backgroundMusic.pause(); // Pause background music on game over/win

    if (!gameSoundsMuted) {
        if (!winCondition) {
            playSound("Game Over");
        }
        // Could add a specific win sound here if you have one
    }

    modalTitle.textContent = title;
    modalMessage.textContent = message;
    gameModal.style.display = "flex"; // Show the modal

    modalCloseButton.onclick = () => {
        gameModal.style.display = "none"; // Hide the modal
        // Reset game state for a new game
        level = 1;
        score = 0;
        brickRowCount = 3; // Reset brick count for new game
        resizeCanvas(); // Re-initialize all dimensions and bricks
        isPaused = false; // Unpause
        draw(); // Restart game loop
        console.log("Game Restarted");
        if (!gameSoundsMuted) {
            // Restart background music only if it was playing and not muted
            backgroundMusic.currentTime = 0; // Rewind for new game
            backgroundMusic.play().catch(e => console.error("Error restarting background music:", e));
        }
    };
}

// --- Initial Setup ---

// Resize canvas on window load and any subsequent resize
window.addEventListener("load", resizeCanvas);
window.addEventListener("resize", resizeCanvas);

// Initial game start
resizeCanvas(); // Set up initial canvas size and game elements
draw(); // Start the game loop

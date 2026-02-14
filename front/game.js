// ======= Config =======
const SERVER_URL = "http://localhost:3000"; // backend receiver
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const statusEl = document.getElementById("status");
const btnStart = document.getElementById("btnStart");
const btnRestart = document.getElementById("btnRestart");
const btnPause = document.getElementById("btnPause");
const btnFs = document.getElementById("btnFs");

// Coins UI (make sure you added this in index.html: <b id="coins">0</b>)
const coinEl = document.getElementById("coins");

// Best UI (make sure you added: <b id="best">0</b>)
const bestEl = document.getElementById("best");

// ======= Simple IDs =======
const playerId = localStorage.getItem("player_id") || crypto.randomUUID();
localStorage.setItem("player_id", playerId);

let sessionId = null;

// ======= Game State =======
let running = false;
let paused = false;

let score = 0; // keep as float internally (dt-based)
let coins = 0;

let roadOffset = 0;
let speed = 5;
let lastSpawn = 0;

let enemies = [];
let coinItems = [];

let rafId = null;

// dt helpers
let lastT = 0;

// speed ramp gate
let nextSpeedUpAt = 500;

// optional feature flag (fixes ReferenceError in drawCar)
let shieldActive = false;

const road = { x: 60, y: 0, w: 300, h: canvas.height };
const player = { x: 200, y: 560, w: 50, h: 90, vx: 0 };

// ======= Best score =======
let bestScore = Number(localStorage.getItem("best_score") || 0);
if (bestEl) bestEl.textContent = String(bestScore);

// ======= Fullscreen =======
btnFs?.addEventListener("click", () => {
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen?.();
  else document.exitFullscreen?.();
});

// ======= Pause helpers =======
function setPaused(v) {
  paused = v;
  if (btnPause) btnPause.textContent = paused ? "Resume" : "Pause";
  if (running) statusEl.textContent = paused ? "Paused" : "Running...";
}

btnPause?.addEventListener("click", () => {
  if (!sessionId || !running) return;
  setPaused(!paused);
  emitEvent(paused ? "pause" : "resume");
});

window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "p") {
    if (!sessionId || !running) return;
    setPaused(!paused);
    emitEvent(paused ? "pause" : "resume");
  }
});

// ======= Reset =======
function resetGame() {
  running = false;
  paused = false;

  score = 0;
  coins = 0;

  speed = 5;
  roadOffset = 0;

  enemies = [];
  coinItems = [];
  lastSpawn = 0;

  lastT = 0;
  nextSpeedUpAt = 500;

  player.x = 200;
  player.vx = 0;

  if (scoreEl) scoreEl.textContent = "0";
  if (coinEl) coinEl.textContent = "0";

  if (statusEl) statusEl.textContent = "";
  if (btnRestart) btnRestart.disabled = true;
  if (btnPause) btnPause.textContent = "Pause";

  if (rafId) cancelAnimationFrame(rafId);
  rafId = null;
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

// ======= Event emitter (HTTP POST) =======
async function emitEvent(event, data = {}) {
  const payload = {
    event_id: crypto.randomUUID(),
    event,
    player_id: playerId,
    session_id: sessionId,
    ts: new Date().toISOString(),
    score: Math.floor(score),
    speed,
    coins,
    ...data,
  };

  try {
    await fetch(`${SERVER_URL}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    // backend off -> ignore
  }
}

function updateBestScoreIfNeeded(finalScoreInt) {
  if (finalScoreInt > bestScore) {
    bestScore = finalScoreInt;
    localStorage.setItem("best_score", String(bestScore));
    if (bestEl) bestEl.textContent = String(bestScore);
    emitEvent("new_high_score", { best_score: bestScore });
  }
}

// ======= Input =======
const keys = new Set();
window.addEventListener("keydown", (e) => keys.add(e.key));
window.addEventListener("keyup", (e) => keys.delete(e.key));

// ======= Spawn enemies/coins =======
const laneX = [95, 175, 255, 335];
const enemyColors = ["#ff4d4d", "#ff8800", "#ff00cc", "#00bfff"];

function spawnEnemy() {
  const x = laneX[Math.floor(Math.random() * laneX.length)];
  enemies.push({
    x: x - 25,
    y: -120,
    w: 50,
    h: 90,
    vy: speed + 2,
    color: enemyColors[Math.floor(Math.random() * enemyColors.length)], // FIX: stable color
  });
}

function spawnCoin() {
  // try a few times to find a lane that is not occupied by an enemy near the top
  for (let tries = 0; tries < 8; tries++) {
    const x = laneX[Math.floor(Math.random() * laneX.length)];
    const coinX = x - 15;
    const coinY = -40;

    // check if any enemy is in same lane and close to spawn area
    const blocked = enemies.some(
      (e) =>
        Math.abs(e.x + e.w / 2 - x) < 25 && // same lane-ish
        e.y < 180 // near the top area
    );

    if (!blocked) {
      coinItems.push({ x: coinX, y: coinY, w: 30, h: 30, vy: speed + 2 });
      return;
    }
  }

  // fallback: spawn anyway if all lanes blocked
  const x = laneX[Math.floor(Math.random() * laneX.length)];
  coinItems.push({ x: x - 15, y: -40, w: 30, h: 30, vy: speed + 2 });
}

// ======= Drawing =======
function drawRoad() {
  // side grass
  ctx.fillStyle = "#0f1b3a";
  ctx.fillRect(0, 0, road.x, canvas.height);
  ctx.fillRect(road.x + road.w, 0, canvas.width - (road.x + road.w), canvas.height);

  // road gradient
  const grad = ctx.createLinearGradient(road.x, 0, road.x + road.w, 0);
  grad.addColorStop(0, "#1c1c1c");
  grad.addColorStop(0.5, "#2a2a2a");
  grad.addColorStop(1, "#1c1c1c");

  ctx.fillStyle = grad;
  ctx.fillRect(road.x, road.y, road.w, road.h);

  // glowing side lines
  ctx.strokeStyle = "#ffcc00";
  ctx.lineWidth = 4;
  ctx.strokeRect(road.x, 0, road.w, canvas.height);

  // lane markers
  ctx.fillStyle = "rgba(255,255,255,.7)";
  const lineW = 6;
  const gap = 40;
  const dashH = 25;

  for (let i = 0; i < 3; i++) {
    const lx = road.x + (road.w / 4) * (i + 1);
    for (let y = -dashH; y < canvas.height + dashH; y += gap + dashH) {
      ctx.fillRect(lx - lineW / 2, y + roadOffset, lineW, dashH);
    }
  }
}

function drawCar(car, color) {
  // body
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(car.x, car.y, car.w, car.h, 10);
  ctx.fill();

  // windshield
  ctx.fillStyle = "rgba(255,255,255,.35)";
  ctx.beginPath();
  ctx.roundRect(car.x + 10, car.y + 10, car.w - 20, 25, 6);
  ctx.fill();

  // wheels
  ctx.fillStyle = "#111";
  ctx.fillRect(car.x - 4, car.y + 15, 6, 20);
  ctx.fillRect(car.x + car.w - 2, car.y + 15, 6, 20);
  ctx.fillRect(car.x - 4, car.y + car.h - 35, 6, 20);
  ctx.fillRect(car.x + car.w - 2, car.y + car.h - 35, 6, 20);

  // headlights (player only)
  if (car === player) {
    ctx.fillStyle = "yellow";
    ctx.fillRect(car.x + 10, car.y - 5, 8, 8);
    ctx.fillRect(car.x + car.w - 18, car.y - 5, 8, 8);
  }

  // shield glow (safe: shieldActive is defined)
  if (shieldActive && car === player) {
    ctx.strokeStyle = "cyan";
    ctx.lineWidth = 3;
    ctx.strokeRect(car.x - 6, car.y - 6, car.w + 12, car.h + 12);
  }
}

function drawCoin(c) {
  ctx.fillStyle = "gold";
  ctx.beginPath();
  ctx.arc(c.x + 15, c.y + 15, 15, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,.75)";
  ctx.beginPath();
  ctx.arc(c.x + 15, c.y + 15, 6, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0b1020";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawRoad();

  // darken when paused or game over
  if ((paused && running) || (!running && sessionId)) {
    ctx.fillStyle = "rgba(0,0,0,.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawCar(player, "#40c057");

  // enemies (stable colors)
  for (const e of enemies) drawCar(e, e.color || "#ff4d4d");

  // coins
  for (const c of coinItems) drawCoin(c);

  if (!running && sessionId) {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "32px system-ui";
    ctx.fillText("Game Over", canvas.width / 2, 320);
    ctx.font = "18px system-ui";
    ctx.fillText(`Final Score: ${Math.floor(score)}`, canvas.width / 2, 360);
    ctx.textAlign = "left";
  }

  if (paused && running) {
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.font = "28px system-ui";
    ctx.fillText("Paused", canvas.width / 2, 320);
    ctx.textAlign = "left";
  }
}

// ======= Game Loop =======
function update(t) {
  if (!running) return;

  // dt = 1 at ~60fps (fix FPS-dependent gameplay)
  if (!lastT) lastT = t;
  const dt = (t - lastT) / 16.6667;
  lastT = t;

  if (paused) {
    draw();
    rafId = requestAnimationFrame(update);
    return;
  }

  // animate road
  roadOffset = (roadOffset + speed * dt) % 65;

  // controls
  player.vx = 0;
  if (keys.has("ArrowLeft") || keys.has("a")) player.vx = -7;
  if (keys.has("ArrowRight") || keys.has("d")) player.vx = 7;

  player.x += player.vx * dt;

  const minX = road.x + 10;
  const maxX = road.x + road.w - player.w - 10;
  if (player.x < minX) player.x = minX;
  if (player.x > maxX) player.x = maxX;

  // spawn enemies
  if (!lastSpawn) lastSpawn = t;
  if (t - lastSpawn > 900) {
    spawnEnemy();
    lastSpawn = t;
  }

  // random coin spawn (scaled by dt for consistency)
  if (Math.random() < 0.01 * dt) spawnCoin();

  // move enemies
  for (const e of enemies) {
    e.y += e.vy * dt;
    e.vy = speed + 2;
  }
  enemies = enemies.filter((e) => e.y < canvas.height + 140);

  // move coins
  for (const c of coinItems) {
    c.y += c.vy * dt;
    c.vy = speed + 2;
  }
  coinItems = coinItems.filter((c) => c.y < canvas.height + 60);

  // scoring (dt-based)
  score += 1 * dt;
  const shownScore = Math.floor(score);

  // speed ramp (safe gate)
  if (shownScore >= nextSpeedUpAt) {
    speed += 0.6;
    nextSpeedUpAt += 500;
  }

  if (scoreEl) scoreEl.textContent = String(shownScore);

  // coin collection
  for (let i = coinItems.length - 1; i >= 0; i--) {
    if (rectsOverlap(player, coinItems[i])) {
      coins++;
      if (coinEl) coinEl.textContent = String(coins);
      emitEvent("coin_collected", { total_coins: coins });
      coinItems.splice(i, 1);
    }
  }

  // collision
  for (const e of enemies) {
    if (rectsOverlap(player, e)) {
      running = false;
      if (statusEl) statusEl.textContent = "Crashed!";
      if (btnRestart) btnRestart.disabled = false;

      emitEvent("crash", { reason: "collision" });
      emitEvent("game_end", {
        reason: "collision",
        final_score: shownScore,
        total_coins: coins,
      });

      updateBestScoreIfNeeded(shownScore);

      draw();
      return;
    }
  }

  draw();
  rafId = requestAnimationFrame(update);
}

// ======= Controls =======
btnStart?.addEventListener("click", async () => {
  if (running) return;
  resetGame();

  sessionId = crypto.randomUUID();
  running = true;
  setPaused(false);

  if (btnRestart) btnRestart.disabled = true;
  if (statusEl) statusEl.textContent = "Running...";

  await emitEvent("game_start", { game: "2d_car_racer" });
  rafId = requestAnimationFrame(update);
});

btnRestart?.addEventListener("click", () => {
  resetGame();

  sessionId = crypto.randomUUID();
  running = true;
  setPaused(false);

  if (statusEl) statusEl.textContent = "Running...";
  emitEvent("game_start", { game: "2d_car_racer", restart: true });
  rafId = requestAnimationFrame(update);
});

// ======= Init =======
resetGame();
draw();

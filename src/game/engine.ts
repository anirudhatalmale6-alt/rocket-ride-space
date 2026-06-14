// Core game engine for Rocket Flap: deterministic loop, state, physics.

export type GameStatus = "ready" | "playing" | "gameover";
export type ObstacleType = "asteroid" | "planet" | "station" | "laser";

export interface Obstacle {
  x: number;
  gapY: number;
  gapHeight: number;
  width: number;
  type: ObstacleType;
  seed: number; // for stable random visuals
  passed: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface Star {
  x: number;
  y: number;
  size: number;
  layer: number; // 0=far, 1=mid, 2=near
  twinkle: number;
}

export interface GameState {
  status: GameStatus;
  width: number;
  height: number;
  rocketX: number;
  rocketY: number;
  rocketVy: number;
  rocketRot: number;
  thrustT: number; // time since last flap, for thruster fade
  obstacles: Obstacle[];
  particles: Particle[];
  stars: Star[];
  score: number;
  best: number;
  time: number;
  spawnTimer: number;
  bgOffset: number;
  flashAlpha: number;
  shake: number;
}

export const CONFIG = {
  gravity: 1600,
  flap: -480,
  maxFallSpeed: 900,
  scrollSpeed: 180,
  obstacleSpawn: 1.5, // seconds
  baseGap: 180,
  minGap: 140,
  obstacleWidth: 80,
  rocketSize: 32,
};

const OBSTACLE_TYPES: ObstacleType[] = ["asteroid"];

function makeStars(w: number, h: number): Star[] {
  const stars: Star[] = [];
  const count = 90;
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * w,
      y: Math.random() * h,
      size: Math.random() < 0.7 ? 1 : Math.random() < 0.9 ? 1.5 : 2.5,
      layer: Math.random() < 0.55 ? 0 : Math.random() < 0.85 ? 1 : 2,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function createState(width: number, height: number, best = 0): GameState {
  return {
    status: "ready",
    width,
    height,
    rocketX: width * 0.3,
    rocketY: height * 0.45,
    rocketVy: 0,
    rocketRot: 0,
    thrustT: 1,
    obstacles: [],
    particles: [],
    stars: makeStars(width, height),
    score: 0,
    best,
    time: 0,
    spawnTimer: 0,
    bgOffset: 0,
    flashAlpha: 0,
    shake: 0,
  };
}

export function resize(state: GameState, w: number, h: number) {
  state.width = w;
  state.height = h;
  state.stars = makeStars(w, h);
  if (state.status === "ready") {
    state.rocketX = w * 0.3;
    state.rocketY = h * 0.45;
  }
}

export function flap(state: GameState, onStart?: () => void) {
  if (state.status === "gameover") return;
  if (state.status === "ready") {
    state.status = "playing";
    onStart?.();
  }
  state.rocketVy = CONFIG.flap;
  state.thrustT = 0;
  // exhaust particles
  for (let i = 0; i < 10; i++) {
    state.particles.push({
      x: state.rocketX - 14,
      y: state.rocketY + 4 + (Math.random() - 0.5) * 8,
      vx: -120 - Math.random() * 100,
      vy: 20 + (Math.random() - 0.5) * 60,
      life: 0.45,
      maxLife: 0.45,
      color: i % 3 === 0 ? "#fef3c7" : i % 3 === 1 ? "#fb923c" : "#f43f5e",
      size: 2 + Math.random() * 3,
    });
  }
}

function spawnObstacle(state: GameState) {
  const margin = 60;
  const gap = Math.max(CONFIG.minGap, CONFIG.baseGap - state.score * 1.5);
  const minY = margin + gap / 2;
  const maxY = state.height - margin - gap / 2;
  const gapY = minY + Math.random() * (maxY - minY);
  const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
  state.obstacles.push({
    x: state.width + 20,
    gapY,
    gapHeight: gap,
    width: CONFIG.obstacleWidth,
    type,
    seed: Math.random() * 1000,
    passed: false,
  });
}

function rectsOverlap(
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function update(
  state: GameState,
  dt: number,
  callbacks: { onScore?: () => void; onDie?: () => void } = {},
) {
  state.time += dt;
  state.thrustT += dt;
  state.bgOffset += dt * 20;

  // stars parallax
  const speeds = [10, 30, 70];
  for (const st of state.stars) {
    st.x -= speeds[st.layer] * dt;
    st.twinkle += dt * 2;
    if (st.x < -2) {
      st.x = state.width + 2;
      st.y = Math.random() * state.height;
    }
  }

  // particles
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    if (p.life <= 0) { state.particles.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 100 * dt;
  }

  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2);
  if (state.flashAlpha > 0) state.flashAlpha = Math.max(0, state.flashAlpha - dt * 3);

  if (state.status === "ready") {
    state.rocketY += Math.sin(state.time * 4) * 0.6;
    return;
  }

  if (state.status === "playing") {
    state.rocketVy = Math.min(CONFIG.maxFallSpeed, state.rocketVy + CONFIG.gravity * dt);
    state.rocketY += state.rocketVy * dt;
    state.rocketRot = Math.max(-0.5, Math.min(1.2, state.rocketVy / 600));

    // continuous thruster trail while flying
    if (state.thrustT < 0.25 && Math.random() < 0.7) {
      state.particles.push({
        x: state.rocketX - 12,
        y: state.rocketY + (Math.random() - 0.5) * 4,
        vx: -80 - Math.random() * 40,
        vy: (Math.random() - 0.5) * 20,
        life: 0.3,
        maxLife: 0.3,
        color: "#fde68a",
        size: 1.5 + Math.random() * 1.5,
      });
    }

    state.spawnTimer += dt;
    if (state.spawnTimer >= CONFIG.obstacleSpawn) {
      state.spawnTimer = 0;
      spawnObstacle(state);
    }

    for (let i = state.obstacles.length - 1; i >= 0; i--) {
      const o = state.obstacles[i];
      o.x -= CONFIG.scrollSpeed * dt;
      if (!o.passed && o.x + o.width < state.rocketX) {
        o.passed = true;
        state.score += 1;
        callbacks.onScore?.();
      }
      if (o.x + o.width < -10) state.obstacles.splice(i, 1);
    }

    // collisions
    const rs = CONFIG.rocketSize;
    const rx = state.rocketX - rs / 2;
    const ry = state.rocketY - rs / 2;

    let dead = false;
    if (state.rocketY + rs / 2 >= state.height) { dead = true; state.rocketY = state.height - rs / 2; }
    if (state.rocketY - rs / 2 <= 0) { dead = true; state.rocketY = rs / 2; }

    for (const o of state.obstacles) {
      const topH = o.gapY - o.gapHeight / 2;
      const botY = o.gapY + o.gapHeight / 2;
      const botH = state.height - botY;
      if (
        rectsOverlap(rx, ry, rs, rs, o.x, 0, o.width, topH) ||
        rectsOverlap(rx, ry, rs, rs, o.x, botY, o.width, botH)
      ) {
        dead = true; break;
      }
    }

    if (dead) {
      state.status = "gameover";
      state.shake = 1;
      state.flashAlpha = 0.6;
      callbacks.onDie?.();
      for (let i = 0; i < 30; i++) {
        const a = (i / 30) * Math.PI * 2;
        state.particles.push({
          x: state.rocketX, y: state.rocketY,
          vx: Math.cos(a) * (100 + Math.random() * 140),
          vy: Math.sin(a) * (100 + Math.random() * 140),
          life: 0.9, maxLife: 0.9,
          color: i % 3 === 0 ? "#fbbf24" : i % 3 === 1 ? "#fb7185" : "#fff",
          size: 2 + Math.random() * 3,
        });
      }
    }
  } else if (state.status === "gameover") {
    if (state.rocketY + CONFIG.rocketSize / 2 < state.height) {
      state.rocketVy = Math.min(CONFIG.maxFallSpeed, state.rocketVy + CONFIG.gravity * dt);
      state.rocketY += state.rocketVy * dt;
      state.rocketRot = Math.min(1.6, state.rocketRot + dt * 3);
      if (state.rocketY + CONFIG.rocketSize / 2 >= state.height) {
        state.rocketY = state.height - CONFIG.rocketSize / 2;
      }
    }
  }
}

export function reset(state: GameState) {
  const best = state.best;
  const w = state.width, h = state.height;
  Object.assign(state, createState(w, h, best));
}

// Canvas renderer for Rocket Flap.
import { CONFIG, type GameState, type Obstacle } from "./engine";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBackground(ctx: CanvasRenderingContext2D, s: GameState) {
  // deep space gradient
  const g = ctx.createLinearGradient(0, 0, 0, s.height);
  g.addColorStop(0, "#05010f");
  g.addColorStop(0.55, "#0b0524");
  g.addColorStop(1, "#1a0938");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s.width, s.height);

  // nebula glow blobs
  const t = s.time * 0.05;
  const blobs: Array<[number, number, string]> = [
    [s.width * 0.2, s.height * 0.3, "rgba(124, 58, 237, 0.25)"],
    [s.width * 0.75, s.height * 0.6, "rgba(236, 72, 153, 0.2)"],
    [s.width * 0.5, s.height * 0.85, "rgba(56, 189, 248, 0.18)"],
  ];
  for (const [bx, by, color] of blobs) {
    const r = Math.min(s.width, s.height) * 0.55;
    const rg = ctx.createRadialGradient(bx + Math.sin(t) * 20, by, 0, bx, by, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, s.width, s.height);
  }

  // stars (parallax)
  for (const st of s.stars) {
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(st.twinkle));
    ctx.fillStyle = `rgba(255,255,255,${alpha * (0.4 + st.layer * 0.3)})`;
    ctx.fillRect(st.x, st.y, st.size, st.size);
  }

  // distant planet drifting
  const dx = ((s.bgOffset * 0.05) % (s.width + 200)) - 100;
  const px = s.width - dx;
  const py = s.height * 0.18;
  const pr = 38;
  const pg = ctx.createRadialGradient(px - 10, py - 10, 4, px, py, pr);
  pg.addColorStop(0, "#fda4af");
  pg.addColorStop(0.7, "#9f1239");
  pg.addColorStop(1, "#3f0d1a");
  ctx.fillStyle = pg;
  ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
}

// ---------- Obstacle drawers ----------

function asteroidPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const steps = 18;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const n = Math.sin(a * 3 + seed) * 0.12 + Math.cos(a * 5 + seed * 1.3) * 0.08;
    const px = cx + Math.cos(a) * rx * (1 + n);
    const py = cy + Math.sin(a) * ry * (1 + n);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, o: Obstacle, s: GameState) {
  const topH = o.gapY - o.gapHeight / 2;
  const botY = o.gapY + o.gapHeight / 2;
  const botH = s.height - botY;
  const w = o.width;
  const drawChunk = (x: number, y: number, ww: number, hh: number, seed: number) => {
    if (hh <= 0) return;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10;
    const grad = ctx.createLinearGradient(x, y, x + ww, y + hh);
    grad.addColorStop(0, "#3f3a4a");
    grad.addColorStop(0.5, "#6b6478");
    grad.addColorStop(1, "#2a2533");
    ctx.fillStyle = grad;
    asteroidPath(ctx, x - 6, y - 6, ww + 12, hh + 12, seed);
    ctx.fill();
    ctx.restore();
    // craters
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    for (let i = 0; i < 5; i++) {
      const cx = x + ((seed * (i + 1) * 37) % ww);
      const cy = y + ((seed * (i + 2) * 53) % hh);
      const cr = 3 + (i % 3);
      ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.fill();
    }
    // rim highlight
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1.5;
    asteroidPath(ctx, x - 6, y - 6, ww + 12, hh + 12, seed);
    ctx.stroke();
  };
  drawChunk(o.x, 0, w, topH, o.seed);
  drawChunk(o.x, botY, w, botH, o.seed + 7);
}

function drawPlanet(ctx: CanvasRenderingContext2D, o: Obstacle, s: GameState) {
  const topH = o.gapY - o.gapHeight / 2;
  const botY = o.gapY + o.gapHeight / 2;
  const botH = s.height - botY;
  const w = o.width;
  const cx = o.x + w / 2;
  // Top planet: center above screen so a curved bottom enters from top
  const topRadius = Math.max(topH, w) + 30;
  const topCy = topH - topRadius + 24;
  ctx.save();
  ctx.beginPath();
  ctx.rect(o.x - 40, 0, w + 80, topH);
  ctx.clip();
  const tg = ctx.createRadialGradient(cx - 20, topCy + topRadius * 0.4, 4, cx, topCy, topRadius);
  tg.addColorStop(0, "#67e8f9");
  tg.addColorStop(0.5, "#0ea5e9");
  tg.addColorStop(1, "#082f49");
  ctx.fillStyle = tg;
  ctx.beginPath(); ctx.arc(cx, topCy, topRadius, 0, Math.PI * 2); ctx.fill();
  // rings band
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(o.x - 40, topH - 18, w + 80, 4);
  ctx.restore();

  // Bottom planet
  const botRadius = Math.max(botH, w) + 30;
  const botCy = botY + botRadius - 24;
  ctx.save();
  ctx.beginPath();
  ctx.rect(o.x - 40, botY, w + 80, botH);
  ctx.clip();
  const bg = ctx.createRadialGradient(cx - 20, botCy - botRadius * 0.4, 4, cx, botCy, botRadius);
  bg.addColorStop(0, "#fcd34d");
  bg.addColorStop(0.5, "#d97706");
  bg.addColorStop(1, "#451a03");
  ctx.fillStyle = bg;
  ctx.beginPath(); ctx.arc(cx, botCy, botRadius, 0, Math.PI * 2); ctx.fill();
  // surface bands
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(o.x - 40, botY + 16 + i * 18, w + 80, 4);
  }
  ctx.restore();
}

function drawStation(ctx: CanvasRenderingContext2D, o: Obstacle, s: GameState) {
  const topH = o.gapY - o.gapHeight / 2;
  const botY = o.gapY + o.gapHeight / 2;
  const botH = s.height - botY;
  const w = o.width;
  const drawSection = (x: number, y: number, ww: number, hh: number, isTop: boolean) => {
    if (hh <= 0) return;
    ctx.save();
    ctx.shadowColor = "rgba(56,189,248,0.45)";
    ctx.shadowBlur = 16;
    const grad = ctx.createLinearGradient(x, y, x + ww, y);
    grad.addColorStop(0, "#1e293b");
    grad.addColorStop(0.5, "#475569");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    roundRect(ctx, x, y, ww, hh, 8); ctx.fill();
    ctx.restore();
    // panel lines
    ctx.strokeStyle = "rgba(148,163,184,0.4)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(x + (i * ww) / 4, y);
      ctx.lineTo(x + (i * ww) / 4, y + hh);
      ctx.stroke();
    }
    // window lights
    ctx.fillStyle = "#fef08a";
    ctx.shadowColor = "#fde047"; ctx.shadowBlur = 8;
    const rows = Math.max(1, Math.floor(hh / 22));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 4; c++) {
        if (((r + c + Math.floor(o.seed)) % 3) === 0) {
          ctx.fillRect(x + 6 + c * (ww / 4) + (ww / 4 - 6) * 0.2, y + 10 + r * 22, 6, 6);
        }
      }
    }
    ctx.shadowBlur = 0;
    // docking ring near gap
    ctx.fillStyle = "#cbd5e1";
    if (isTop) {
      roundRect(ctx, x - 6, y + hh - 10, ww + 12, 10, 3); ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x + ww / 2 - 4, y + hh - 6, 8, 4);
    } else {
      roundRect(ctx, x - 6, y, ww + 12, 10, 3); ctx.fill();
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(x + ww / 2 - 4, y + 2, 8, 4);
    }
  };
  drawSection(o.x, 0, w, topH, true);
  drawSection(o.x, botY, w, botH, false);
}

function drawLaser(ctx: CanvasRenderingContext2D, o: Obstacle, s: GameState) {
  const topH = o.gapY - o.gapHeight / 2;
  const botY = o.gapY + o.gapHeight / 2;
  const botH = s.height - botY;
  const w = o.width;
  const pulse = 0.7 + 0.3 * Math.sin(s.time * 8 + o.seed);

  const drawBeam = (x: number, y: number, ww: number, hh: number, isTop: boolean) => {
    if (hh <= 0) return;
    // emitter
    const emitterH = 22;
    const emY = isTop ? y + hh - emitterH : y;
    ctx.save();
    ctx.shadowColor = "rgba(244,63,94,0.6)";
    ctx.shadowBlur = 14;
    const eg = ctx.createLinearGradient(x, emY, x + ww, emY);
    eg.addColorStop(0, "#1f2937");
    eg.addColorStop(0.5, "#94a3b8");
    eg.addColorStop(1, "#1f2937");
    ctx.fillStyle = eg;
    roundRect(ctx, x - 6, emY, ww + 12, emitterH, 6); ctx.fill();
    ctx.restore();

    // beam body
    const beamY = isTop ? y : y + emitterH;
    const beamH = hh - emitterH;
    if (beamH > 0) {
      ctx.save();
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 22 * pulse;
      const bg = ctx.createLinearGradient(x, 0, x + ww, 0);
      bg.addColorStop(0, "rgba(244,63,94,0.15)");
      bg.addColorStop(0.5, `rgba(255,200,210,${0.9 * pulse})`);
      bg.addColorStop(1, "rgba(244,63,94,0.15)");
      ctx.fillStyle = bg;
      ctx.fillRect(x + 6, beamY, ww - 12, beamH);
      // bright core
      ctx.fillStyle = `rgba(255,255,255,${pulse})`;
      ctx.fillRect(x + ww / 2 - 2, beamY, 4, beamH);
      ctx.restore();
    }

    // emitter lights
    ctx.fillStyle = `rgba(255,80,100,${pulse})`;
    ctx.beginPath();
    ctx.arc(x + ww / 2, isTop ? emY + emitterH - 6 : emY + 6, 4, 0, Math.PI * 2);
    ctx.fill();
  };

  drawBeam(o.x, 0, w, topH, true);
  drawBeam(o.x, botY, w, botH, false);
}

function drawObstacles(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const o of s.obstacles) {
    switch (o.type) {
      case "asteroid": drawAsteroid(ctx, o, s); break;
      case "planet":   drawPlanet(ctx, o, s);   break;
      case "station":  drawStation(ctx, o, s);  break;
      case "laser":    drawLaser(ctx, o, s);    break;
    }
  }
}

function drawRocket(ctx: CanvasRenderingContext2D, s: GameState) {
  ctx.save();
  ctx.translate(s.rocketX, s.rocketY);
  ctx.rotate(s.rocketRot);
  const size = CONFIG.rocketSize;

  // thruster flame (when recently flapped)
  if (s.thrustT < 0.18) {
    const f = 1 - s.thrustT / 0.18;
    ctx.save();
    ctx.shadowColor = "#fb923c";
    ctx.shadowBlur = 22 * f;
    const fg = ctx.createLinearGradient(-size / 2 - 18 * f, 0, -size / 2, 0);
    fg.addColorStop(0, "rgba(254, 215, 170, 0)");
    fg.addColorStop(0.5, "#fbbf24");
    fg.addColorStop(1, "#f43f5e");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(-size / 2 - 18 * f, 0);
    ctx.lineTo(-size / 2, -6);
    ctx.lineTo(-size / 2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // body (capsule shape pointing right)
  ctx.shadowColor = "rgba(96,165,250,0.6)";
  ctx.shadowBlur = 14;
  const bodyGrad = ctx.createLinearGradient(0, -size / 2, 0, size / 2);
  bodyGrad.addColorStop(0, "#f8fafc");
  bodyGrad.addColorStop(0.5, "#cbd5e1");
  bodyGrad.addColorStop(1, "#64748b");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  // capsule: rounded rectangle with pointed nose
  const bw = size * 0.95;
  const bh = size * 0.55;
  ctx.moveTo(-bw / 2, -bh / 2);
  ctx.lineTo(bw / 2 - bh / 2, -bh / 2);
  // nose cone
  ctx.lineTo(bw / 2 + 6, 0);
  ctx.lineTo(bw / 2 - bh / 2, bh / 2);
  ctx.lineTo(-bw / 2, bh / 2);
  ctx.quadraticCurveTo(-bw / 2 - 4, 0, -bw / 2, -bh / 2);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  // nose tip red
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(bw / 2 - bh / 2 - 2, -bh / 2 + 2);
  ctx.lineTo(bw / 2 + 6, 0);
  ctx.lineTo(bw / 2 - bh / 2 - 2, bh / 2 - 2);
  ctx.closePath();
  ctx.fill();

  // window
  ctx.fillStyle = "#0ea5e9";
  ctx.beginPath();
  ctx.arc(2, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#bae6fd";
  ctx.beginPath(); ctx.arc(3.2, -1.2, 1.6, 0, Math.PI * 2); ctx.fill();

  // fins
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(-bw / 2 + 2, -bh / 2);
  ctx.lineTo(-bw / 2 - 4, -bh / 2 - 6);
  ctx.lineTo(-bw / 2 + 6, -bh / 2);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-bw / 2 + 2, bh / 2);
  ctx.lineTo(-bw / 2 - 4, bh / 2 + 6);
  ctx.lineTo(-bw / 2 + 6, bh / 2);
  ctx.closePath();
  ctx.fill();

  // stripe
  ctx.fillStyle = "rgba(15,23,42,0.5)";
  ctx.fillRect(-bw / 2 + 2, -1, bw - 8, 2);

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, s: GameState) {
  for (const p of s.particles) {
    const a = p.life / p.maxLife;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawScore(ctx: CanvasRenderingContext2D, s: GameState) {
  if (s.status === "ready") return;
  ctx.save();
  ctx.font = "bold 56px system-ui, -apple-system, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 10;
  ctx.fillStyle = "#fff";
  ctx.fillText(String(s.score), s.width / 2, 30);
  ctx.restore();
}

export function render(ctx: CanvasRenderingContext2D, s: GameState) {
  ctx.save();
  if (s.shake > 0) {
    const m = s.shake * 8;
    ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
  }
  drawBackground(ctx, s);
  drawObstacles(ctx, s);
  drawParticles(ctx, s);
  drawRocket(ctx, s);
  drawScore(ctx, s);
  ctx.restore();

  if (s.flashAlpha > 0) {
    ctx.fillStyle = `rgba(255,255,255,${s.flashAlpha})`;
    ctx.fillRect(0, 0, s.width, s.height);
  }
}

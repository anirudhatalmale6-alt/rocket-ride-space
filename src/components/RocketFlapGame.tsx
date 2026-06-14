import { useEffect, useRef, useState } from "react";
import { createState, flap, reset, resize, update, type GameState } from "@/game/engine";
import { render } from "@/game/renderer";
import { audio } from "@/game/audio";

const BEST_KEY = "rocket-flap-best";

export function RocketFlapGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const [, force] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const best = Number(localStorage.getItem(BEST_KEY) || 0);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const fit = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (stateRef.current) resize(stateRef.current, rect.width, rect.height);
    };

    const rect = canvas.getBoundingClientRect();
    stateRef.current = createState(rect.width, rect.height, best);
    fit();

    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = stateRef.current!;
      const prevStatus = s.status;
      update(s, dt, {
        onScore: () => audio.score(),
        onDie: () => {
          if (s.score > s.best) {
            s.best = s.score;
            localStorage.setItem(BEST_KEY, String(s.best));
          }
          audio.die();
        },
      });
      render(ctx, s);
      if (prevStatus !== s.status) force(x => x + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const doFlap = () => {
      const s = stateRef.current!;
      if (s.status === "gameover") return;
      const wasReady = s.status === "ready";
      flap(s, () => audio.start());
      audio.flap();
      if (wasReady) force(x => x + 1);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        const s = stateRef.current!;
        if (s.status === "gameover") restart();
        else doFlap();
      }
    };

    const onPointer = (e: PointerEvent) => {
      e.preventDefault();
      const s = stateRef.current!;
      if (s.status === "gameover") return;
      doFlap();
    };

    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const restart = () => {
    const s = stateRef.current!;
    reset(s);
    force(x => x + 1);
  };

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    audio.setMuted(m);
  };

  const s = stateRef.current;
  const status = s?.status ?? "ready";
  const score = s?.score ?? 0;
  const best = s?.best ?? 0;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-black select-none touch-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full block" />

      {/* Top HUD */}
      <div className="pointer-events-none absolute top-0 left-0 right-0 flex items-start justify-between p-4 z-10">
        <div className="rounded-full bg-black/50 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white/90 border border-white/10">
          Best: {best}
        </div>
        <button
          onClick={toggleMute}
          className="pointer-events-auto rounded-full bg-black/50 backdrop-blur px-3 py-1.5 text-xs font-semibold text-white/90 border border-white/10 hover:bg-black/70 transition"
          aria-label="Toggle sound"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Ready overlay */}
      {status === "ready" && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10 animate-fade-in">
          <div className="text-center px-6">
            <h1 className="text-5xl sm:text-6xl font-black text-white drop-shadow-[0_4px_24px_rgba(244,63,94,0.5)] tracking-tight">
              🚀 Rocket Flap
            </h1>
            <p className="mt-3 text-white/80 text-sm sm:text-base font-medium">
              Tap, click, or press Space to fire your thrusters
            </p>
            <p className="mt-1 text-white/50 text-xs">
              Dodge the asteroids
            </p>
            <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur px-5 py-3 border border-white/20">
              <span className="size-2 rounded-full bg-rose-400 animate-pulse" />
              <span className="text-white font-semibold text-sm">Tap to launch</span>
            </div>
          </div>
        </div>
      )}

      {/* Game over overlay */}
      {status === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="mx-6 w-full max-w-sm rounded-3xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/10 p-6 shadow-2xl animate-scale-in">
            <h2 className="text-center text-2xl font-bold text-white">Mission Failed</h2>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-white/50">Score</div>
                <div className="mt-1 text-3xl font-black text-white">{score}</div>
              </div>
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-center">
                <div className="text-xs uppercase tracking-wider text-rose-300/70">Best</div>
                <div className="mt-1 text-3xl font-black text-rose-300">{best}</div>
              </div>
            </div>
            {score > 0 && score === best && (
              <div className="mt-3 text-center text-xs font-semibold text-rose-300">
                ✨ New record!
              </div>
            )}
            <button
              onClick={restart}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-rose-500 to-orange-500 px-6 py-4 font-bold text-white shadow-lg shadow-rose-500/30 hover:scale-[1.02] active:scale-[0.98] transition"
            >
              Launch Again
            </button>
            <p className="mt-3 text-center text-[11px] text-white/40">
              Space / Tap / Click to thrust
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

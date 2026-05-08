"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { orbitron } from "@/lib/fonts";

type Mode = "running" | "paused" | "summary";

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean);
}

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export default function FocusModePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);

  const [mode, setMode] = useState<Mode>("running");
  const [breaksTaken, setBreaksTaken] = useState(0);
  const [task, setTask] = useState("");
  const [subtasks, setSubtasks] = useState("");

  const startedAtRef = useRef<number | null>(null);
  const accumulatedRef = useRef<number>(0);
  const [displayMs, setDisplayMs] = useState(0);

  const elapsedMs = useMemo(() => {
    if (mode === "running" && startedAtRef.current != null) {
      return accumulatedRef.current + (performance.now() - startedAtRef.current);
    }

    return accumulatedRef.current;
  }, [mode, displayMs]);

  const taskLines = useMemo(() => splitLines(task), [task]);
  const subtaskLines = useMemo(() => splitLines(subtasks), [subtasks]);

  const togglePause = () => {
    setMode((prev) => {
      if (prev === "running") {
        setBreaksTaken((count) => count + 1);
        return "paused";
      }
      if (prev === "paused") {
        return "running";
      }
      return prev;
    });
  };

  useEffect(() => {
    if (mode === "running" && startedAtRef.current == null) {
      startedAtRef.current = performance.now();
    }

    if (mode !== "running" && startedAtRef.current != null) {
      accumulatedRef.current += performance.now() - startedAtRef.current;
      startedAtRef.current = null;
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "running") {
      return;
    }

    const id = window.setInterval(() => {
      setDisplayMs(performance.now());
    }, 250);

    return () => window.clearInterval(id);
  }, [mode]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.code !== "Space") {
        return;
      }

      if (mode === "summary") {
        return;
      }

      if (isTypingTarget(event.target)) {
        return;
      }

      event.preventDefault();
      togglePause();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (prefersReducedMotion()) {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const dpr = window.devicePixelRatio || 1;
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const setup = () => {
      const dpr = window.devicePixelRatio || 1;
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = Math.max(50, Math.floor((w * h) / 18000));
      particlesRef.current = Array.from({ length: targetCount }, () => {
        const speed = 0.16 + Math.random() * 0.55;
        const angle = Math.random() * Math.PI * 2;
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 1.2 + Math.random() * 2.4,
          a: 0.14 + Math.random() * 0.3,
        };
      });
    };

    setup();
    window.addEventListener("resize", setup, { passive: true });

    let last = performance.now();

    const tick = (now: number) => {
      const canvasWidth = window.innerWidth;
      const canvasHeight = window.innerHeight;

      const dt = Math.min(48, now - last);
      last = now;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const theme = document.documentElement.getAttribute("data-theme");
      const isDark = theme === "dark";
      const particleRgb = isDark ? "236, 242, 248" : "22, 32, 43";
      const linkRgb = isDark ? "236, 242, 248" : "47, 107, 97";

      const particles = particlesRef.current;
      ctx.lineWidth = 1;

      for (const p of particles) {
        p.x += p.vx * (dt / 16);
        p.y += p.vy * (dt / 16);

        if (p.x < -30) p.x = canvasWidth + 30;
        if (p.x > canvasWidth + 30) p.x = -30;
        if (p.y < -30) p.y = canvasHeight + 30;
        if (p.y > canvasHeight + 30) p.y = -30;
      }

      // connections
      for (let i = 0; i < particles.length; i += 1) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j += 1) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          const max = 140;
          if (d2 < max * max) {
            const t = 1 - Math.sqrt(d2) / max;
            ctx.strokeStyle = `rgba(${linkRgb}, ${isDark ? 0.16 * t : 0.12 * t})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // particles
      for (const p of particles) {
        ctx.fillStyle = `rgba(${particleRgb}, ${isDark ? p.a : p.a * 0.75})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", setup);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const headerLabel = useMemo(() => {
    if (mode === "running") return "Focus Mode";
    if (mode === "paused") return "Paused";
    return "Session Summary";
  }, [mode]);

  return (
    <div className={`focus-page ${orbitron.className}`}>
      <canvas ref={canvasRef} className="focus-page__canvas" aria-hidden="true" />
      <div className="focus-page__veil" aria-hidden="true" />

      <div className="focus-topright" aria-label="Focus mode controls">
        <div className="focus-pill">{headerLabel}</div>
        <div className="focus-actions">
          {mode !== "summary" ? (
            <>
              <button type="button" className="focus-action focus-action--primary" onClick={togglePause}>
                {mode === "running" ? "Pause" : "Resume"}
              </button>
              <button
                type="button"
                className="focus-action"
                onClick={() => {
                  setMode("summary");
                }}
              >
                End
              </button>
              <button
                type="button"
                className="focus-action"
                onClick={() => {
                  router.push("/");
                }}
              >
                Exit
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="focus-action focus-action--primary"
                onClick={() => {
                  setMode("running");
                }}
              >
                Grind more
              </button>
              <button
                type="button"
                className="focus-action"
                onClick={() => {
                  router.push("/");
                }}
              >
                Exit
              </button>
            </>
          )}
        </div>
      </div>

      <section className="focus-center" aria-label="Focus timer">
        <div className="focus-timer" aria-live="polite">
          {formatElapsed(elapsedMs)}
        </div>
        {mode !== "summary" ? (
          <input
            className="focus-taskline"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="enter task to focus"
            aria-label="Current task under focus"
            disabled={mode === "paused"}
          />
        ) : null}

        {mode === "summary" ? (
          <div className="focus-summary">
            <div>
              <strong>Time elapsed</strong>: {formatElapsed(elapsedMs)}
            </div>
            <div>
              <strong>Breaks taken</strong>: {breaksTaken}
            </div>
            {taskLines.length ? (
              <div>
                <strong>Current task</strong>: {taskLines[0]}
              </div>
            ) : null}
            {subtaskLines.length ? (
              <div>
                <strong>Subtasks / notes</strong>:
                <ul className="focus-list">
                  {subtaskLines.map((line, idx) => (
                    <li key={`${idx}-${line}`}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      {mode === "summary" ? null : (
        <aside className="focus-notes" aria-label="Focus notes">
          <div className="focus-grid">
            <div className="focus-field">
              <label className="focus-label" htmlFor="focus-subtasks">
                Subtasks / notes (one per line)
              </label>
              <textarea
                id="focus-subtasks"
                className="focus-textarea"
                value={subtasks}
                onChange={(e) => setSubtasks(e.target.value)}
                placeholder={"- Write one item per line\n- Rendered as bullets in summary"}
                disabled={mode === "paused"}
              />
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}


import { useEffect, useRef, useCallback } from "react";

const DURATION = 1800;
const ROD_H = 0;

function ease(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 3.2);
}

function flutter(t: number): number {
  if (t > 0.92) return 0;
  const decay = Math.pow(1 - t, 1.8);
  return Math.sin(t * Math.PI * 4.5) * decay;
}

function drawCurtain(
  ctx: CanvasRenderingContext2D,
  side: "left" | "right",
  progress: number,
  W: number,
  H: number
) {
  const isLeft = side === "left";
  const numPleats = 8;
  const closedWidth = W / 2;
  const openWidth = closedWidth * 0.17;

  const ep = ease(progress);
  const flutterVal = flutter(progress) * 18;

  const topAnchors: number[] = [];
  for (let i = 0; i <= numPleats; i++) {
    const t = i / numPleats;
    const closedX = isLeft ? t * closedWidth : W - t * closedWidth;
    const gather = Math.pow(t, 0.7);
    const openX = isLeft ? openWidth * gather : W - openWidth * gather;
    const raw = closedX + (openX - closedX) * ep;
    const wave =
      flutterVal *
      Math.sin(t * Math.PI * 1.8 + progress * 9) *
      (isLeft ? 1 : -1);
    topAnchors.push(raw + wave);
  }

  const bottomAnchors: { x: number; sag: number }[] = [];
  for (let i = 0; i <= numPleats; i++) {
    const t = i / numPleats;
    const lagFactor = isLeft ? 1 - t : t;
    const lagDelay = lagFactor * 0.22;
    const lagProgress = Math.max(0, progress - lagDelay) / (1 - lagDelay);
    const lagEp = ease(Math.min(lagProgress, 1));

    const closedX = isLeft ? t * closedWidth : W - t * closedWidth;
    const gather = Math.pow(t, 0.7);
    const openX = isLeft ? openWidth * gather : W - openWidth * gather;
    const raw = closedX + (openX - closedX) * lagEp;

    const sagPeak = Math.sin(Math.PI * lagFactor) * (1 - lagProgress) * 34;
    const bottomWave =
      flutterVal *
      0.65 *
      Math.sin(t * Math.PI * 2 + progress * 7) *
      (isLeft ? 1 : -1);

    bottomAnchors.push({ x: raw + bottomWave, sag: sagPeak });
  }

  for (let i = 0; i < numPleats; i++) {
    const ax = topAnchors[i];
    const bx = topAnchors[i + 1];
    const ab = bottomAnchors[i];
    const bb = bottomAnchors[i + 1];

    const isFront = i % 2 === (isLeft ? 0 : 1);
    const bulge = isFront ? 1 : -1;
    const bulgeAmt = (9 + flutterVal * 0.35) * (1 - ep * 0.55);

    const isLeadingStrip = isLeft ? i === numPleats - 1 : i === 0;
    const leadingCurve = isLeadingStrip
      ? (isLeft ? -1 : 1) * (1 - ep) * 26
      : 0;

    ctx.beginPath();
    ctx.moveTo(ax, ROD_H);
    ctx.bezierCurveTo(
      ax + (bx - ax) * 0.35, ROD_H,
      ax + (bx - ax) * 0.65, ROD_H,
      bx, ROD_H
    );
    ctx.bezierCurveTo(
      bx + bulge * bulgeAmt + leadingCurve * 0.6, H * 0.32,
      bb.x + bulge * bulgeAmt * 0.4 + leadingCurve * 0.9 + bb.sag * 0.12, H * 0.72,
      bb.x + bb.sag * 0.08, H + bb.sag * 0.5
    );
    const midBotSag = (ab.sag + bb.sag) * 0.5;
    ctx.bezierCurveTo(
      bb.x - (bx - ax) * 0.3 + midBotSag * 0.1, H + midBotSag * 0.8,
      ab.x + (bx - ax) * 0.3 + midBotSag * 0.1, H + midBotSag * 0.8,
      ab.x + ab.sag * 0.08, H + ab.sag * 0.5
    );
    ctx.bezierCurveTo(
      ab.x - bulge * bulgeAmt * 0.4, H * 0.72,
      ax - bulge * bulgeAmt, H * 0.32,
      ax, ROD_H
    );
    ctx.closePath();

    const lum = isFront ? 1.0 : 0.25;
    const r = Math.round(lum * 65);
    const g = Math.round(lum * 1);
    const b = Math.round(lum * 1);

    const grd = ctx.createLinearGradient(
      isLeft ? ax : bx, 0,
      isLeft ? bx : ax, 0
    );
    grd.addColorStop(0,    `rgb(${Math.round(r * 0.55)},${Math.round(g * 0.55)},${Math.round(b * 0.55)})`);
    grd.addColorStop(0.25, `rgb(${r},${g},${b})`);
    grd.addColorStop(0.55, `rgb(${Math.min(255, Math.round(r * 1.2))},${Math.round(g * 1.1)},${Math.round(b * 1.1)})`);
    grd.addColorStop(1,    `rgb(${Math.round(r * 0.65)},${Math.round(g * 0.65)},${Math.round(b * 0.65)})`);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(ax, ROD_H);
    ctx.bezierCurveTo(ax - bulge * 3, H * 0.38, ab.x, H * 0.72, ab.x, H);
    ctx.strokeStyle = `rgba(0,0,0,${isFront ? 0.3 : 0.12})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const edgeX = topAnchors[isLeft ? numPleats : 0];
  const dir = isLeft ? 1 : -1;
  const shadG = ctx.createLinearGradient(edgeX, 0, edgeX + dir * 28, 0);
  shadG.addColorStop(0, "rgba(0,0,0,0.5)");
  shadG.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = shadG;
  ctx.fillRect(edgeX, ROD_H, dir * 28, H);
}

interface CurtainOpenProps {
  /** Content revealed behind the curtain */
  children?: React.ReactNode;
  /** Extra classes on the outer wrapper */
  className?: string;
  /** Called when the curtain finishes opening */
  onOpened?: () => void;
  /** Delay in ms before the animation starts (default 300) */
  delay?: number;
}

export default function CurtainOpen({
  children,
  className = "",
  onOpened,
  delay = 300,
}: CurtainOpenProps) {
  const stageRef   = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const animIdRef  = useRef<number>(0);
  const startTimeRef = useRef<number | null>(null);

  const getCtx = () => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext("2d") : null;
  };

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const stage  = stageRef.current;
    if (!canvas || !stage) return;
    canvas.width  = stage.offsetWidth;
    canvas.height = stage.offsetHeight;
  }, []);

  const drawFrame = useCallback((progress: number) => {
    const canvas = canvasRef.current;
    const ctx    = getCtx();
    if (!canvas || !ctx) return;
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    drawCurtain(ctx, "left",  progress, W, H);
    drawCurtain(ctx, "right", progress, W, H);
  }, []);

  const animate = useCallback((ts: number) => {
    if (!startTimeRef.current) startTimeRef.current = ts;
    const progress = Math.min((ts - startTimeRef.current) / DURATION, 1);

    drawFrame(progress);

    if (progress > 0.3 && backdropRef.current) {
      backdropRef.current.classList.add("opacity-100");
      backdropRef.current.classList.remove("opacity-0");
    }

    if (progress < 1) {
      animIdRef.current = requestAnimationFrame(animate);
    } else {
      onOpened?.();
    }
  }, [drawFrame, onOpened]);

  const play = useCallback(() => {
    cancelAnimationFrame(animIdRef.current);
    startTimeRef.current = null;

    if (backdropRef.current) {
      backdropRef.current.classList.remove("opacity-100");
      backdropRef.current.classList.add("opacity-0");
    }

    resizeCanvas();
    drawFrame(0);

    setTimeout(() => {
      animIdRef.current = requestAnimationFrame(animate);
    }, delay);
  }, [resizeCanvas, drawFrame, animate, delay]);

  useEffect(() => {
    resizeCanvas();
    drawFrame(0);
    const t = setTimeout(play, delay);

    const onResize = () => resizeCanvas();
    window.addEventListener("resize", onResize);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className={`relative w-full h-full overflow-hidden bg-[#080408] ${className}`}
    >
      {/* Backdrop / revealed content */}
      <div
        ref={backdropRef}
        className="absolute inset-0 opacity-0 transition-opacity duration-[1100ms] ease-in-out flex flex-col items-center justify-center"
        style={{ background: "radial-gradient(ellipse 70% 60% at 50% 55%, #1c0d14 0%, #080408 100%)" }}
      >
        {children}
      </div>

      {/* Canvas — curtain drawn here */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}

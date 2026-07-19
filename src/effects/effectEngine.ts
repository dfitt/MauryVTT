import { EFFECT_REGISTRY, ParticleConfig } from "./effectDefs.js";

export class EffectEngine {
  /**
   * Play an animation directly over a target DOM element (e.g., a chat message).
   * Creates an absolute overlay positioned over the element.
   */
  public static playOverElement(targetEl: HTMLElement, effectId: string): void {
    const effect = EFFECT_REGISTRY[effectId];
    if (!effect) return;

    // Create container overlay
    const overlay = document.createElement("div");
    overlay.className = "vtt-effect-overlay";
    overlay.style.position = "absolute";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.pointerEvents = "none";
    overlay.style.overflow = "hidden";
    overlay.style.zIndex = "1000";
    overlay.style.borderRadius = "inherit";

    const computedPos = window.getComputedStyle(targetEl).position;
    if (computedPos === "static") {
      targetEl.style.position = "relative";
    }

    // Inject SVG layer
    const svgDiv = document.createElement("div");
    svgDiv.style.position = "absolute";
    svgDiv.style.top = "0";
    svgDiv.style.left = "0";
    svgDiv.style.width = "100%";
    svgDiv.style.height = "100%";
    svgDiv.style.display = "flex";
    svgDiv.style.alignItems = "center";
    svgDiv.style.justifyContent = "center";
    svgDiv.innerHTML = effect.renderSvg();
    overlay.appendChild(svgDiv);

    // Inject Particle Canvas layer
    if (effect.particles) {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      overlay.appendChild(canvas);

      // Run particles
      this.runParticleSystem(canvas, effect.particles, effect.durationMs);
    }

    targetEl.appendChild(overlay);

    // Auto cleanup
    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    }, effect.durationMs + 150);
  }

  /**
   * Play an animation at explicit screen coordinates (for map token effects, pings, or tool actions).
   */
  public static playAtScreenCoord(screenX: number, screenY: number, effectId: string, sizePx = 140): void {
    const effect = EFFECT_REGISTRY[effectId];
    if (!effect) return;

    const overlay = document.createElement("div");
    overlay.className = "vtt-effect-overlay-screen";
    overlay.style.position = "fixed";
    overlay.style.left = `${screenX - sizePx / 2}px`;
    overlay.style.top = `${screenY - sizePx / 2}px`;
    overlay.style.width = `${sizePx}px`;
    overlay.style.height = `${sizePx}px`;
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "99999";

    const svgDiv = document.createElement("div");
    svgDiv.style.position = "absolute";
    svgDiv.style.width = "100%";
    svgDiv.style.height = "100%";
    svgDiv.style.display = "flex";
    svgDiv.style.alignItems = "center";
    svgDiv.style.justifyContent = "center";
    svgDiv.innerHTML = effect.renderSvg();
    overlay.appendChild(svgDiv);

    if (effect.particles) {
      const canvas = document.createElement("canvas");
      canvas.style.position = "absolute";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      overlay.appendChild(canvas);
      this.runParticleSystem(canvas, effect.particles, effect.durationMs);
    }

    document.body.appendChild(overlay);

    setTimeout(() => {
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
    }, effect.durationMs + 150);
  }

  public static runParticleSystem(canvas: HTMLCanvasElement, config: ParticleConfig, durationMs: number): void {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width || 300;
    const h = rect.height || 80;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      life: number; // 0 to 1
      maxLifeMs: number;
      birthTime: number;
      rotation: number;
      rotSpeed: number;
      noteChar?: string;
    }

    const particles: Particle[] = [];
    const now = performance.now();
    const centerX = w / 2;
    const centerY = h / 2;

    const minAngle = config.spreadAngleRange ? config.spreadAngleRange[0] : 0;
    const maxAngle = config.spreadAngleRange ? config.spreadAngleRange[1] : Math.PI * 2;

    for (let i = 0; i < config.count; i++) {
      const angle = minAngle + Math.random() * (maxAngle - minAngle);
      const speed = config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0]);
      const size = config.sizeRangePx[0] + Math.random() * (config.sizeRangePx[1] - config.sizeRangePx[0]);
      const color = config.colors[Math.floor(Math.random() * config.colors.length)];
      const lifeMs = config.lifeMs * (0.7 + Math.random() * 0.6);

      const noteChars = ["♪", "♫", "♬", "♩"];
      particles.push({
        x: centerX + (Math.random() - 0.5) * 20,
        y: centerY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        color,
        life: 1.0,
        maxLifeMs: lifeMs,
        birthTime: now + Math.random() * 80,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        noteChar: config.shape === "note" ? noteChars[Math.floor(Math.random() * noteChars.length)] : undefined
      });
    }

    const startTime = now;
    let animId = 0;

    const renderFrame = (timestamp: number) => {
      const elapsed = timestamp - startTime;
      if (elapsed >= durationMs + 150) {
        return;
      }

      ctx.clearRect(0, 0, w, h);

      const dt = 0.016; // Approx 60fps delta
      let activeCount = 0;

      for (const p of particles) {
        if (timestamp < p.birthTime) {
          activeCount++;
          continue;
        }

        const pAge = timestamp - p.birthTime;
        p.life = Math.max(0, 1 - pAge / p.maxLifeMs);
        if (p.life <= 0) continue;

        activeCount++;
        p.x += p.vx * dt;
        p.vy += config.gravity * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotSpeed * dt;

        ctx.save();
        ctx.globalAlpha = p.life * (p.life < 0.2 ? p.life * 5 : 1);
        ctx.fillStyle = p.color;
        ctx.strokeStyle = p.color;

        if (config.shape === "circle") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fill();
        } else if (config.shape === "sparkle") {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          const s = p.size * p.life * 1.3;
          ctx.beginPath();
          ctx.moveTo(0, -s);
          ctx.quadraticCurveTo(0, 0, s, 0);
          ctx.quadraticCurveTo(0, 0, 0, s);
          ctx.quadraticCurveTo(0, 0, -s, 0);
          ctx.quadraticCurveTo(0, 0, 0, -s);
          ctx.closePath();
          ctx.fill();
        } else if (config.shape === "ember") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.fill();
        } else if (config.shape === "splinter") {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-p.size, -p.size / 3, p.size * 2, p.size / 1.5);
        } else if (config.shape === "note") {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation * 0.3);
          ctx.font = `bold ${Math.max(12, p.size * 3)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 6;
          ctx.fillText(p.noteChar || "♪", 0, 0);
        }

        ctx.restore();
      }

      if (activeCount > 0) {
        animId = requestAnimationFrame(renderFrame);
      }
    };

    animId = requestAnimationFrame(renderFrame);
  }
}

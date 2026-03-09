import * as THREE from "three";
import { CfdPointSystem } from "./types";

// ============================================================================
// Pipe geometry constants — must match GeometryBuilder.ts exactly
// ============================================================================

// ---- INLET pipe (internal supply bar) ----
// Pipe axis:   runs along X
// Pipe centre: (X∈[INLET_X_MIN,INLET_X_MAX], Y=yCenter, Z=INLET_Z)
// Radius:      INLET_PIPE_RAD  (= INTERNAL_PIPE_RAD in GeometryBuilder)
// Air exits the evenly-spaced holes in the +Z direction (into the compartment)
const INLET_Z = 50;
const INLET_X_MIN = -220;
const INLET_X_MAX = 220;
const INLET_PIPE_RAD = 12;

// ---- EXHAUST pickup bar ----
// Pipe axis:   runs along X
// Pipe centre: (X∈[OUTLET_X_MIN,OUTLET_X_MAX], Y=yCenter-20, Z=OUTLET_Z)
// Radius:      OUTLET_PIPE_RAD
// Particles are "sucked in" once inside this cylinder
const OUTLET_Z = 1170;
const OUTLET_X_MIN = -200;
const OUTLET_X_MAX = 200;
const OUTLET_PIPE_RAD = 12;
const OUTLET_PIPE_Y_OFF = -20;   // bar sits 20 units below yCenter

// ============================================================================

function generateRadialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 32; canvas.height = 32;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to initialize canvas context");
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.8)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);
  return new THREE.CanvasTexture(canvas);
}

/**
 * Samples a uniformly-random point inside the INLET pipe cylinder cross-section.
 * The pipe axis is X; the cross-section is a circle in the YZ plane with
 * centre (yCenter, INLET_Z) and radius INLET_PIPE_RAD.
 * Particles are born pointing in the +Z direction, so they start at Z = INLET_Z.
 */
function spawnAtInlet(
  out: { x: number; y: number; z: number },
  yCenter: number,
): void {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * INLET_PIPE_RAD; // uniform disk
  out.x = INLET_X_MIN + Math.random() * (INLET_X_MAX - INLET_X_MIN);
  out.y = yCenter + r * Math.cos(angle);   // ±12 from pipe centre Y
  out.z = INLET_Z + r * Math.sin(angle);  // ±12 just past the pipe face
}

/**
 * Returns true when a particle is inside the exhaust pickup bar cylinder.
 *   Bar axis: X∈[OUTLET_X_MIN,OUTLET_X_MAX]  at  (Y=yCenter+OUTLET_PIPE_Y_OFF, Z=OUTLET_Z)
 *   Cross-section: YZ circle of radius OUTLET_PIPE_RAD²
 */
function insideExhaustBar(
  px: number, py: number, pz: number,
  yCenter: number,
): boolean {
  if (px < OUTLET_X_MIN - 5 || px > OUTLET_X_MAX + 5) return false;
  if (pz < OUTLET_Z - OUTLET_PIPE_RAD * 2) return false;
  const barY = yCenter + OUTLET_PIPE_Y_OFF;
  const dy = py - barY;
  const dz = pz - OUTLET_Z;
  return dy * dy + dz * dz < OUTLET_PIPE_RAD * OUTLET_PIPE_RAD * 1.5;
}

/**
 * Manages particle-based CFD point systems for each incubator compartment.
 *
 * Physics goals (v4):
 *  1.  Particles born INSIDE the inlet pipe cylinder (radius 12, along X).
 *  2.  Strong +Z jet from inlet — decays realistically over the cabinet length.
 *  3.  Large-radius toroidal vortex (CW) sweeps particles to ALL four side walls.
 *  4.  Secondary oscillating cross-flow fills top/bottom corners.
 *  5.  Back-wall stagnation deflects particles radially into the four corners.
 *  6.  Return flow (near walls, particles can briefly move in −Z) closes the loop.
 *  7.  Suction toward the EXACT exhaust bar cylinder — particles visibly
 *      converge into the bar's YZ cross-section before vanishing.
 */
export class CfdSystem {
  private scene: THREE.Scene;
  private systems: CfdPointSystem[] = [];

  constructor(scene: THREE.Scene) { this.scene = scene; }

  getSystems(): CfdPointSystem[] { return this.systems; }
  setVisible(visible: boolean): void {
    this.systems.forEach((s) => { s.visible = visible; });
  }

  initCompartment(yCenter: number, compHeight: number, cabWidth: number): void {
    const particleCount = 100_000; // Increased for better density
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const lifespans = new Float32Array(particleCount);
    const sp = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < particleCount; i += 1) {
      if (i < particleCount * 0.10) {
        spawnAtInlet(sp, yCenter);
        positions[i * 3] = sp.x;
        positions[i * 3 + 1] = sp.y;
        positions[i * 3 + 2] = sp.z;
      } else {
        positions[i * 3] = -cabWidth / 2 + 10 + Math.random() * (cabWidth - 20);
        positions[i * 3 + 1] = yCenter - compHeight / 2 + 10 + Math.random() * (compHeight - 20);
        positions[i * 3 + 2] = INLET_Z + Math.random() * (OUTLET_Z - INLET_Z);
      }
      lifespans[i] = Math.random() * 600;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.2, // Slightly smaller for better density feel
      map: generateRadialTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const sys = new THREE.Points(geometry, material) as CfdPointSystem;
    sys.userData = { life: lifespans, yCenter, compH: compHeight, cabW: cabWidth };
    this.scene.add(sys);
    this.systems.push(sys);
  }

  update(time: number): void {
    const dt = 1.0;
    const sp = { x: 0, y: 0, z: 0 };

    this.systems.forEach((sys) => {
      const pos = sys.geometry.attributes.position.array as Float32Array;
      const col = sys.geometry.attributes.color.array as Float32Array;
      const life = sys.userData.life;
      const { yCenter, compH, cabW } = sys.userData;
      const count = pos.length / 3;

      const minX = -cabW / 2 + 5;
      const maxX = cabW / 2 - 5;
      const minY = yCenter - compH / 2 + 5;
      const maxY = yCenter + compH / 2 - 5;
      const halfW = cabW / 2;
      const halfH = compH / 2;
      const floorY = yCenter - compH / 2 + 35; // The height of the egg racks

      for (let i = 0; i < count; i += 1) {
        const idx = i * 3;
        let px = pos[idx];
        let py = pos[idx + 1];
        let pz = pos[idx + 2];

        // ── Respawn ──────────────────────────────────────────────────────────
        const captured = insideExhaustBar(px, py, pz, yCenter);
        if (life[i] <= 0 || captured || pz > OUTLET_Z + 15 || pz < INLET_Z - 30) {
          spawnAtInlet(sp, yCenter);
          px = sp.x; py = sp.y; pz = sp.z;
          life[i] = 250 + Math.random() * 350;
        }
        life[i] -= 1;

        const zProg = Math.max(0, Math.min(1, (pz - INLET_Z) / (OUTLET_Z - INLET_Z)));

        // ── 1. Realistic Jet Physics ─────────────────────────────────────
        const pulse = Math.sin(pz * 0.015 - time * 5.2) * 2.0;
        let vz = (16 * Math.exp(-zProg * 1.8) + 2.5) + pulse;

        let vx = 0;
        let vy = 0;

        // ── 2. Boundary Wash (Pass over eggs) ─────────────────────────────
        // As the jet hits the far side, it must wash down towards the eggs on the floor.
        const eggWashDist = Math.abs(pz - 600); // 600 is egg tray center
        if (zProg > 0.2 && zProg < 0.8) {
          // Push air DOWN towards the floor where eggs are
          const downPush = (1 - Math.abs(py - floorY) / halfH) * 2.0;
          vy -= downPush;

          // Lateral spread to hit eggs on the edges
          const lateralPush = (Math.abs(px) / halfW) * 1.5;
          vx += (px > 0 ? -lateralPush : lateralPush);
        }

        // ── 3. Toroidal Recirculation ─────────────────────────────────────
        const dx = px;
        const dy = py - yCenter;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const vortexR = compH * 0.55;
        const omega = 6.2 / vortexR;
        if (dist < vortexR) {
          vx += -dy * omega;
          vy += dx * omega;
        }

        // ── 4. High-Vibrancy Turbulence ──────────────────────────────────
        vx += Math.sin(py * 0.04 + pz * 0.02 + time * 3) * 2.5;
        vy += Math.cos(px * 0.04 + pz * 0.02 - time * 3) * 2.5;

        // ── Standardized Color (Standardized Entry-to-Exit) ──────────────
        // Color Mapping (Standardized from Enter to Leave)
        // Calculated BEFORE final suction pull to keep the pattern stable.
        const chamberSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        // nColor: 1.0 at entry (warm), 0.0 at exit (cool), blended with speed
        let nColor = Math.min(chamberSpeed / 18.0, 1.0) * 0.3 + (1.0 - zProg) * 0.7;

        let r_c: number, g_c: number, b_c: number;
        if (nColor < 0.25) { r_c = 0; g_c = nColor * 4; b_c = 1; }
        else if (nColor < 0.50) { r_c = 0; g_c = 1; b_c = 1 - (nColor - 0.25) * 4; }
        else if (nColor < 0.75) { r_c = (nColor - 0.50) * 4; g_c = 1; b_c = 0; }
        else { r_c = 1; g_c = 1 - (nColor - 0.75) * 4; b_c = 0; }
        col[idx] = r_c; col[idx + 1] = g_c; col[idx + 2] = b_c;

        // ── 5. Suction Improvement (The "Snag") ──────────────────────────
        // Smoothly draw particles into the exhaust bar cylinder.
        if (zProg > 0.65) {
          const barY = yCenter + OUTLET_PIPE_Y_OFF;
          const barZ = OUTLET_Z;
          const targetX = Math.max(OUTLET_X_MIN, Math.min(OUTLET_X_MAX, px));

          const dx_ex = targetX - px;
          const dy_ex = barY - py;
          const dz_ex = barZ - pz;
          const distEx = Math.sqrt(dx_ex * dx_ex + dy_ex * dy_ex + dz_ex * dz_ex) || 1;

          // Suction strength increases as we approach the bar
          const pullStr = Math.min(1.5, (pz - 800) / 400) * 12.0;

          // Laminar Convergence: Gradually replace chamber momentum with suction momentum
          // This prevents the "breakage" by ensuring particles align with the suction vector
          const mix = Math.max(0, Math.min(1, (pz - 900) / 250)); // 0 at 900, 1 at outlet

          vx = vx * (1 - mix) + (dx_ex * 0.1) * pullStr * mix;
          vy = vy * (1 - mix) + (dy_ex * 0.1) * pullStr * mix;
          vz = vz * (1 - mix) + (dz_ex * 0.15 + 6.0) * pullStr * mix;

          // Extra "vacuum" snag for particles very close to the bar
          if (distEx < 40) {
            const snap = (1 - distEx / 40);
            vx += dx_ex * 0.3 * snap;
            vy += dy_ex * 0.3 * snap;
            vz += 5.0 * snap;
          }
        }

        // Integrate
        px += vx * dt;
        py += vy * dt;
        pz += vz * dt;

        // Wall Clamping
        if (px < minX) { px = minX; vx *= -0.2; }
        if (px > maxX) { px = maxX; vx *= -0.2; }
        if (py < minY) { py = minY; vy *= -0.2; }
        if (py > maxY) { py = maxY; vy *= -0.2; }

        pos[idx] = px;
        pos[idx + 1] = py;
        pos[idx + 2] = pz;

      }

      sys.geometry.attributes.position.needsUpdate = true;
      sys.geometry.attributes.color.needsUpdate = true;
    });
  }
}

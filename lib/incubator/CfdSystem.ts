import * as THREE from "three";
import { CfdPointSystem } from "./types";

// ============================================================================
// Pipe geometry constants — must match GeometryBuilder.ts
// ----------------------------------------------------------------------------
// Inlet pipe: cylindrical, runs ALONG X from INLET_X_MIN to INLET_X_MAX.
//   Pipe axis:    X direction
//   Pipe center:  Y = yCenter, Z = INLET_Z
//   Pipe radius:  INLET_PIPE_RAD (= INTERNAL_PIPE_RAD in GeometryBuilder)
//   Air exits the pipe holes in the +Z direction (into the compartment)
const INLET_Z = 50;
const INLET_X_MIN = -170;
const INLET_X_MAX = 170;
const INLET_PIPE_RAD = 12; // matches INTERNAL_PIPE_RAD

// Exhaust pickup bar: same radius, runs along X.
//   Pipe axis:    X direction
//   Pipe center:  Y = yCenter - 20, Z = OUTLET_Z
const OUTLET_Z = 1170;
const OUTLET_X_MIN = -200;
const OUTLET_X_MAX = 200;
const OUTLET_PIPE_RAD = 12; // matches INTERNAL_PIPE_RAD

// ============================================================================

function generateRadialTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 32;
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
 * Spawns a particle randomly within the cross-section circle of the inlet pipe.
 *
 * The inlet pipe runs along X. Its cross-section (in the YZ plane) is a circle
 * of radius INLET_PIPE_RAD, centred at (yCenter, INLET_Z).
 * Particles exit in the +Z direction, so Z ≈ INLET_Z + tiny forward offset.
 */
function spawnAtInlet(
  out: { x: number; y: number; z: number },
  yCenter: number,
): void {
  // Uniform disk sampling in the pipe cross-section (Y,Z plane)
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * INLET_PIPE_RAD;
  out.x = INLET_X_MIN + Math.random() * (INLET_X_MAX - INLET_X_MIN); // full pipe length
  out.y = yCenter + r * Math.cos(angle);                              // ±12 around center
  out.z = INLET_Z + Math.abs(r * Math.sin(angle));                    // just inside the exit face
}

/**
 * Manages particle-based CFD point systems for each incubator compartment.
 *
 * Physics goals (v3 — realistic pipe-driven circulation):
 *  1. Particles born strictly inside the inlet pipe cylinder (radius 12)
 *  2. Strong axial (+Z) jet from inlet, decaying toward the back wall
 *  3. A large-radius toroidal vortex in XY sweeps particles to ALL four walls
 *  4. Wall-stagnation at the back wall deflects particles radially to corners
 *  5. All-wall-touching return flow (particles bounce and circulate back)
 *  6. Suction pulls particles into the exhaust bar cross-section (radius 12)
 */
export class CfdSystem {
  private scene: THREE.Scene;
  private systems: CfdPointSystem[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  getSystems(): CfdPointSystem[] { return this.systems; }

  setVisible(visible: boolean): void {
    this.systems.forEach((s) => { s.visible = visible; });
  }

  /**
   * Creates and pre-warms a CFD point system for one compartment.
   */
  initCompartment(yCenter: number, compHeight: number, cabWidth: number): void {
    const particleCount = 60_000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const lifespans = new Float32Array(particleCount);
    const spawn = { x: 0, y: 0, z: 0 };

    for (let i = 0; i < particleCount; i += 1) {
      if (i < particleCount * 0.08) {
        // 8% seed at the inlet pipe for immediate visible jet
        spawnAtInlet(spawn, yCenter);
        positions[i * 3] = spawn.x;
        positions[i * 3 + 1] = spawn.y;
        positions[i * 3 + 2] = spawn.z;
      } else {
        // Rest: pre-warm the whole volume (pushes all surfaces from frame 1)
        positions[i * 3] = -cabWidth / 2 + 15 + Math.random() * (cabWidth - 30);
        positions[i * 3 + 1] = yCenter - compHeight / 2 + 15 + Math.random() * (compHeight - 30);
        positions[i * 3 + 2] = INLET_Z + Math.random() * (OUTLET_Z - INLET_Z);
      }
      lifespans[i] = Math.random() * 500;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.5,
      map: generateRadialTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

    const pointSystem = new THREE.Points(geometry, material) as CfdPointSystem;
    pointSystem.userData = { life: lifespans, yCenter, compH: compHeight, cabW: cabWidth };
    this.scene.add(pointSystem);
    this.systems.push(pointSystem);
  }

  /**
   * Advances all compartment particle systems by one frame.
   *
   * Flow diagram (simplified):
   *
   *   [Inlet pipe holes] ──+Z jet──► [expands to fill cross-section]
   *         ↑                               │
   *         │                  ┌────────────▼─────────────┐
   *         │                  │  Toroidal vortex mixes   │
   *         │                  │  air to all 4 inner walls │
   *         │                  └────────────┬─────────────┘
   *         │                               │
   *         └──── return flow ──────────────▼
   *                              [Back wall deflects radially]
   *                                         │
   *                              [Exhaust bar sucks particles in]
   */
  update(time: number): void {
    const dt = 1.0;
    const spawn = { x: 0, y: 0, z: 0 };

    this.systems.forEach((sys) => {
      const pos = sys.geometry.attributes.position.array as Float32Array;
      const col = sys.geometry.attributes.color.array as Float32Array;
      const life = sys.userData.life;
      const { yCenter, compH, cabW } = sys.userData;
      const count = pos.length / 3;

      // Absolute compartment wall bounds
      const minX = -cabW / 2 + 4;
      const maxX = cabW / 2 - 4;
      const minY = yCenter - compH / 2 + 4;
      const maxY = yCenter + compH / 2 - 4;

      // Vortex radius large enough to sweep particles right to the walls
      const vortexR = Math.min(cabW, compH) * 0.52; // 0.52 × 375 ≈ 195 — deliberately >compH/2

      // Half extents for normalisation
      const halfW = cabW / 2; // 250
      const halfH = compH / 2; // 187.5

      for (let i = 0; i < count; i += 1) {
        const idx = i * 3;
        let px = pos[idx];
        let py = pos[idx + 1];
        let pz = pos[idx + 2];

        // ---- Respawn check ----
        // A particle is "captured" by the exhaust bar when it enters the bar's
        // cylinder cross-section (radius OUTLET_PIPE_RAD around the bar axis).
        const dxOut = 0;                   // bar is centred at X clipped below
        const dyOut = py - (yCenter - 20); // bar Y centre
        const inBarXRange = px >= OUTLET_X_MIN - 5 && px <= OUTLET_X_MAX + 5;
        const inBarCrossSection = dyOut * dyOut < OUTLET_PIPE_RAD * OUTLET_PIPE_RAD; // simplified
        const capturedByExhaust = inBarXRange && inBarCrossSection && pz > OUTLET_Z - 20;

        if (life[i] <= 0 || capturedByExhaust || pz > OUTLET_Z + 15 || pz < INLET_Z - 25) {
          spawnAtInlet(spawn, yCenter);
          px = spawn.x;
          py = spawn.y;
          pz = spawn.z;
          life[i] = 180 + Math.random() * 320;
        }
        life[i] -= 1;

        const zProgress = Math.max(0, Math.min(1, (pz - INLET_Z) / (OUTLET_Z - INLET_Z)));

        // ---- Velocity components ----
        let vx = 0;
        let vy = 0;

        // 1. PRIMARY AXIAL JET (+Z) decaying from inlet
        //    A travelling pressure pulse ensures continuous banding (no static look)
        const pulse = Math.sin(pz * 0.013 - time * 4.8) * 2.0;
        let vz = (13 * Math.exp(-zProgress * 2.0) + 3.5) + pulse;
        vz = Math.max(1.0, vz);

        // 2. INITIAL JET SPREAD — near the inlet, the jet expands radially in XY
        //    This pushes particles outward FROM the pipe toward the surrounding walls.
        if (zProgress < 0.35) {
          const spreadFactor = (0.35 - zProgress) * 8.0;
          vx += (px / halfW) * spreadFactor;
          vy += ((py - yCenter) / halfH) * spreadFactor;
        }

        // 3. LARGE TOROIDAL VORTEX in the XY cross-section
        //    Radius bigger than half the compartment → sweeps to all four walls.
        //    Single clockwise rotation (viewed from +Z). Counter-direction on return
        //    is provided by wall bounce + turbulence.
        const dx = px;
        const dy = py - yCenter;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const vortexStrength = 5.5;
        if (dist < vortexR) {
          // Solid-body rotation — tangential speed grows with radius toward the wall
          const omega = vortexStrength / vortexR;
          vx += -dy * omega;
          vy += dx * omega;
        } else {
          // Outside core: gentle irrotational wrap-around
          const omega = vortexStrength / (dist + 1);
          vx += -dy * omega * 0.4;
          vy += dx * omega * 0.4;
        }

        // 4. SPATIALLY-COHERENT TURBULENCE
        //    Driven by position + time to create rolling eddies that push particles
        //    into corners and touch all six surfaces.
        const turbAmp = 3.2 * Math.sin(zProgress * Math.PI + 0.15);
        vx += Math.sin(py * 0.028 + pz * 0.012 + time * 2.6) * turbAmp;
        vy += Math.cos(px * 0.028 + pz * 0.012 - time * 2.6) * turbAmp;
        // Small Z turbulence creates realistic pressure fluctuations along the duct
        vz += Math.sin(px * 0.015 + py * 0.015 + time * 3.2) * 1.2;

        // 5. BACK-WALL STAGNATION & RADIAL DEFLECTION
        //    When particles hit the back wall they spread radially — this is what fills
        //    the top corners and bottom corners that the forward jet misses.
        if (zProgress > 0.78) {
          const deflect = (zProgress - 0.78) * 10.0;
          const safeR = Math.max(dist, 1.0);
          vx += (dx / safeR) * deflect;
          vy += (dy / safeR) * deflect;
          vz *= Math.max(0, 1.0 - deflect * 0.15); // slow forward component
        }

        // 6. EXHAUST BAR SUCTION
        //    Gradually converge particles toward the bar cross-section as they approach
        //    the outlet. Target = nearest point on the bar axis.
        if (zProgress > 0.60) {
          const pullStr = (zProgress - 0.60) * 9.0;
          const clampedX = Math.max(OUTLET_X_MIN, Math.min(OUTLET_X_MAX, px));
          const barY = yCenter - 20;
          vx += (clampedX - px) * 0.055 * pullStr;
          vy += (barY - py) * 0.055 * pullStr;
          vz += 5.5 * pullStr;
        }

        // 7. BOUNDARY LAYER DECELERATION near all six walls
        //    Gentle so particles still reach and "touch" the walls, but slow down there.
        const wallFracX = Math.abs(px) / halfW;
        const wallFracY = Math.abs(py - yCenter) / halfH;
        const nearWall = Math.max(wallFracX, wallFracY);
        if (nearWall > 0.88) {
          const slow = (nearWall - 0.88) * 4.5;
          vx *= 1 - slow;
          vy *= 1 - slow;
          vz *= 1 - slow;
        }

        // Integrate
        px += vx * dt;
        py += vy * dt;
        pz += vz * dt;

        // Hard-clamp to compartment bounds (bounce so particles don't pile on walls)
        if (px < minX) { px = minX; vx = Math.abs(vx) * 0.4; }
        if (px > maxX) { px = maxX; vx = -Math.abs(vx) * 0.4; }
        if (py < minY) { py = minY; vy = Math.abs(vy) * 0.4; }
        if (py > maxY) { py = maxY; vy = -Math.abs(vy) * 0.4; }

        pos[idx] = px;
        pos[idx + 1] = py;
        pos[idx + 2] = pz;

        // ---- Velocity → colour mapping (blue=slow → cyan → green → yellow → red=fast) ----
        const speed = Math.sqrt(vx * vx + vy * vy + vz * vz);
        const nS = Math.min(Math.max(speed / 17.0, 0), 1.0);

        let r: number, g: number, b: number;
        if (nS < 0.25) { r = 0; g = nS * 4; b = 1; }
        else if (nS < 0.50) { r = 0; g = 1; b = 1 - (nS - 0.25) * 4; }
        else if (nS < 0.75) { r = (nS - 0.50) * 4; g = 1; b = 0; }
        else { r = 1; g = 1 - (nS - 0.75) * 4; b = 0; }

        col[idx] = r;
        col[idx + 1] = g;
        col[idx + 2] = b;
      }

      sys.geometry.attributes.position.needsUpdate = true;
      sys.geometry.attributes.color.needsUpdate = true;
    });
  }
}

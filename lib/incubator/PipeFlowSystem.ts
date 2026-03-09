import * as THREE from "three";
import { FlowPath } from "./types";

function generateRadialTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
        throw new Error("Unable to initialize canvas context");
    }

    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.4, "rgba(255,255,255,0.8)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    return new THREE.CanvasTexture(canvas);
}

export class PipeFlowSystem {
    private scene: THREE.Scene;
    private pointSystem!: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
    private particleData: {
        pathIndex: number;
        progress: number;
        radiusOffset: number;
        angleOffset: number;
        baseSpeed: number;
    }[] = [];
    private flowPaths: FlowPath[];

    constructor(scene: THREE.Scene, flowPaths: FlowPath[]) {
        this.scene = scene;
        this.flowPaths = flowPaths;
    }

    setVisible(visible: boolean): void {
        if (this.pointSystem) {
            this.pointSystem.visible = visible;
        }
    }

    init(): void {
        if (this.flowPaths.length === 0) return;

        // Allocate ~200 particles per curve, scaled by an arbitrary length factor if needed,
        // but a fixed large amount looks better.
        const particleCount = this.flowPaths.length * 500;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i += 1) {
            const pathIndex = i % this.flowPaths.length;
            const path = this.flowPaths[pathIndex];
            // Pipes generally have radius 8 to 12. Using 7 as a safe visual bound.
            let maxRadius = 7;
            if (path.type === "exhaust_spine") maxRadius = 9;

            // Distribution weighted towards center or uniform? Random sqrt gives uniform area density in cross-section
            const rRatio = Math.sqrt(Math.random());
            const radiusOffset = rRatio * maxRadius;
            const angleOffset = Math.random() * Math.PI * 2;

            // Parabolic velocity profile (Poiseuille flow)
            // Max speed at center (r=0), zero at walls (r=R)
            const vProfile = 1 - (radiusOffset * radiusOffset) / (maxRadius * maxRadius);
            // Speed multiplier to roughly match CFD speed scale (max ~18 for red)
            const baseSpeed = 0.002 + 0.008 * vProfile;

            this.particleData.push({
                pathIndex,
                progress: Math.random(), // start at random position along pipe
                radiusOffset,
                angleOffset,
                baseSpeed,
            });
        }

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 3.0,
            map: generateRadialTexture(),
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        this.pointSystem = new THREE.Points(geometry, material);

        // Perform initial positional update
        this.update(0);

        this.scene.add(this.pointSystem);
    }

    update(time: number): void {
        if (!this.pointSystem || this.flowPaths.length === 0) return;

        const positions = this.pointSystem.geometry.attributes.position.array as Float32Array;
        const colors = this.pointSystem.geometry.attributes.color.array as Float32Array;

        const count = this.particleData.length;
        for (let i = 0; i < count; i += 1) {
            const data = this.particleData[i];
            const path = this.flowPaths[data.pathIndex];
            const curve = path.curve;
            const type = path.type;

            // 1. Advance progress with type-specific physics
            let currentSpeed = data.baseSpeed;
            if (type === "fan_in") {
                // Suction: accelerate as we get closer to the fan (progress -> 1)
                currentSpeed *= 0.5 + 2.5 * data.progress;
            } else if (type === "fan_out") {
                // Exhaust: decelerate as we move away (progress -> 1)
                currentSpeed *= 2.0 * (1 - data.progress * 0.7);
            }

            data.progress += currentSpeed;
            if (data.progress >= 1) {
                data.progress = 0;
                data.angleOffset = Math.random() * Math.PI * 2;
            }

            // 2. Position and Offsetting
            const pt = curve.getPointAt(data.progress);
            const tangent = curve.getTangentAt(data.progress);

            let up = new THREE.Vector3(0, 1, 0);
            if (Math.abs(tangent.y) > 0.99) up = new THREE.Vector3(1, 0, 0);
            const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
            const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

            // Squeeze radius for fan_in and fan_out for better "jet" look
            let rMult = 1.0;
            if (type === "fan_in") rMult = 1.0 - data.progress * 0.8;
            if (type === "fan_out") rMult = 0.3 + data.progress * 1.5;

            const rX = Math.cos(data.angleOffset) * data.radiusOffset * rMult;
            const rY = Math.sin(data.angleOffset) * data.radiusOffset * rMult;

            const finalX = pt.x + normal.x * rX + binormal.x * rY;
            const finalY = pt.y + normal.y * rX + binormal.y * rY;
            const finalZ = pt.z + normal.z * rX + binormal.z * rY;

            const idx = i * 3;
            positions[idx] = finalX;
            positions[idx + 1] = finalY;
            positions[idx + 2] = finalZ;

            // 3. Velocity Colour Mapping
            const nominalSpeed = currentSpeed * 1500;
            const nS = Math.min(Math.max(nominalSpeed / 18.0, 0), 1.0);

            let r = 0, g = 0, b = 0;
            if (nS < 0.25) { r = 0; g = 4 * nS; b = 1; }
            else if (nS < 0.5) { r = 0; g = 1; b = 1 - 4 * (nS - 0.25); }
            else if (nS < 0.75) { r = 4 * (nS - 0.5); g = 1; b = 0; }
            else { r = 1; g = 1 - 4 * (nS - 0.75); b = 0; }

            // 4. Opacity & Sparkle (Alpha stored in vertex color for additive blending)
            let alpha = 0.8;
            if (type === "fan_in") {
                // Fade in as they get sucked in
                alpha = data.progress * 0.9;
            } else if (type === "fan_out") {
                // Fade out as they disperse
                alpha = (1.0 - data.progress) * 0.9;
            }

            // High-frequency sparkle for turbulent fan air
            if (type === "fan_in" || type === "fan_out") {
                const flicker = 0.7 + Math.random() * 0.3;
                alpha *= flicker;
            }

            colors[idx] = r * alpha;
            colors[idx + 1] = g * alpha;
            colors[idx + 2] = b * alpha;
        }

        this.pointSystem.geometry.attributes.position.needsUpdate = true;
        this.pointSystem.geometry.attributes.color.needsUpdate = true;
    }
}

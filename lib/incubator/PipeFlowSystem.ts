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
            const curve = this.flowPaths[data.pathIndex].curve;

            // Advance progress
            data.progress += data.baseSpeed;
            if (data.progress >= 1) {
                data.progress = 0;
                // Optional: scramble radius/angle on rebirth for variety
                data.angleOffset = Math.random() * Math.PI * 2;
            }

            // Get point and tangent for offsetting
            const pt = curve.getPointAt(data.progress);
            const tangent = curve.getTangentAt(data.progress);

            // Calculate normal and binormal to sweep the radius reliably
            // We use a dummy up vector to calculate a cross product
            let up = new THREE.Vector3(0, 1, 0);
            // If tangent is parallel to UP, use X axis as up
            if (Math.abs(tangent.y) > 0.99) {
                up = new THREE.Vector3(1, 0, 0);
            }
            const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();
            const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();

            // Apply offset
            const rX = Math.cos(data.angleOffset) * data.radiusOffset;
            const rY = Math.sin(data.angleOffset) * data.radiusOffset;

            const finalX = pt.x + normal.x * rX + binormal.x * rY;
            const finalY = pt.y + normal.y * rX + binormal.y * rY;
            const finalZ = pt.z + normal.z * rX + binormal.z * rY;

            const idx = i * 3;
            positions[idx] = finalX;
            positions[idx + 1] = finalY;
            positions[idx + 2] = finalZ;

            // Velocity Colour Mapping based on simulation standards
            // We map baseSpeed (0.002 to 0.010 roughly) to the 0-18 length scale
            const nominalSpeed = data.baseSpeed * 1500; // max ~15
            const nS = Math.min(Math.max(nominalSpeed / 18.0, 0), 1.0);

            let r = 0, g = 0, b = 0;
            // Match CfdSystem Solidworks scale mapping
            if (nS < 0.25) { r = 0; g = 4 * nS; b = 1; }
            else if (nS < 0.5) { r = 0; g = 1; b = 1 - 4 * (nS - 0.25); }
            else if (nS < 0.75) { r = 4 * (nS - 0.5); g = 1; b = 0; }
            else { r = 1; g = 1 - 4 * (nS - 0.75); b = 0; }

            colors[idx] = r;
            colors[idx + 1] = g;
            colors[idx + 2] = b;
        }

        this.pointSystem.geometry.attributes.position.needsUpdate = true;
        this.pointSystem.geometry.attributes.color.needsUpdate = true;
    }
}

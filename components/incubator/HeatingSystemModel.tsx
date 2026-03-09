"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";

export function HeatingSystemModel() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (!containerRef.current) return;

        // --- Global Variables ---
        let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
        let heaterCube: THREE.Mesh, solenoidMesh: THREE.Mesh;
        let particleSystem: THREE.Points;
        const particleCount = 8000;
        const particlesData: any[] = [];
        let inletCurve: THREE.CatmullRomCurve3, outletCurve: THREE.CatmullRomCurve3;

        const bafflesConfig = [
            { y: 30, minX: -50, maxX: 25 },
            { y: 10, minX: -25, maxX: 50 },
            { y: -10, minX: -50, maxX: 25 },
            { y: -30, minX: -25, maxX: 50 }
        ];

        let animationId: number;

        // --- Initialization ---
        function init() {
            const width = containerRef.current!.clientWidth;
            const height = containerRef.current!.clientHeight;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0f172a);
            sceneRef.current = scene;

            camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
            camera.position.set(300, 300, 300);
            cameraRef.current = camera;

            renderer = new THREE.WebGLRenderer({
                antialias: true,
                logarithmicDepthBuffer: true,
                preserveDrawingBuffer: true
            });
            renderer.setSize(width, height);
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.shadowMap.enabled = true;
            containerRef.current!.appendChild(renderer.domElement);
            rendererRef.current = renderer;

            // Lighting
            const ambientLight = new THREE.AmbientLight(0x404040);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(200, 500, 200);
            directionalLight.castShadow = true;
            scene.add(directionalLight);
            const fillLight = new THREE.DirectionalLight(0xffaa00, 0.3);
            fillLight.position.set(-200, 100, 0);
            scene.add(fillLight);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;

            createHeaterBase();
            createInletSystem();
            createInternalBaffles();
            createSerpentineCoil();
            createOutletSystem();
            initParticles();

            animate();
        }

        // --- Helper Functions ---
        function createCurvedPipe(curve: THREE.CatmullRomCurve3, radius: number, material: THREE.Material) {
            const geometry = new THREE.TubeGeometry(curve, 64, radius, 8, false);
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            return mesh;
        }

        function getParticleTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const context = canvas.getContext('2d');
            if (context) {
                const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
                gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
                gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.5)');
                gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
                context.fillStyle = gradient;
                context.fillRect(0, 0, 32, 32);
            }
            return new THREE.CanvasTexture(canvas);
        }

        function createHeaterBase() {
            const geometry = new THREE.BoxGeometry(100, 100, 100);
            const material = new THREE.MeshStandardMaterial({
                color: 0xfbbf24,
                metalness: 0.1,
                roughness: 0.2,
                transparent: true,
                opacity: 0.1,
                depthWrite: false,
                side: THREE.DoubleSide
            });
            heaterCube = new THREE.Mesh(geometry, material);
            scene.add(heaterCube);

            const edges = new THREE.EdgesGeometry(geometry);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.3, transparent: true }));
            scene.add(line);
        }

        function createInletSystem() {
            const MAT_TRAP = new THREE.MeshStandardMaterial({
                color: 0xa855f7,
                metalness: 0.4,
                roughness: 0.4,
                transparent: true,
                opacity: 0.3,
                depthWrite: false
            });

            const PIPE_RAD = 8;
            const startX = -40;
            const startY = 150;
            const endX = 0;
            const endY = 50;

            inletCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(startX, startY, 0),
                new THREE.Vector3(startX, startY - 60, 0),
                new THREE.Vector3(endX, startY - 20, 0),
                new THREE.Vector3(endX, endY, 0)
            ]);

            createCurvedPipe(inletCurve, PIPE_RAD, MAT_TRAP);
        }

        function createInternalBaffles() {
            const MAT_METAL = new THREE.MeshStandardMaterial({
                color: 0xbdc3c7,
                metalness: 0.7,
                roughness: 0.2,
                side: THREE.DoubleSide
            });

            const wallThickness = 2;
            const plateWidth = 75;
            const plateDepth = 96;

            const levels = [30, 10, -10, -30];

            levels.forEach((yPos, index) => {
                const geometry = new THREE.BoxGeometry(plateWidth, wallThickness, plateDepth);
                const plate = new THREE.Mesh(geometry, MAT_METAL);

                let xPos;
                if (index % 2 === 0) {
                    xPos = -50 + (plateWidth / 2); // Left Attached
                } else {
                    xPos = 50 - (plateWidth / 2); // Right Attached
                }

                plate.position.set(xPos, yPos, 0);
                scene.add(plate);
            });
        }

        function createSerpentineCoil() {
            const points: THREE.Vector3[] = [];
            function addLayer(yLevel: number, direction: number) {
                const xStart = -40 * direction;
                const xEnd = 40 * direction;
                points.push(new THREE.Vector3(xStart, yLevel, -30));
                points.push(new THREE.Vector3(xEnd, yLevel, -30));
                points.push(new THREE.Vector3(xEnd, yLevel, 0));
                points.push(new THREE.Vector3(xStart, yLevel, 0));
                points.push(new THREE.Vector3(xStart, yLevel, 30));
                points.push(new THREE.Vector3(xEnd, yLevel, 30));
            }

            addLayer(42, -1);
            points.push(new THREE.Vector3(40, 22, 30));
            addLayer(22, 1);
            points.push(new THREE.Vector3(-40, 2, 30));
            addLayer(2, -1);
            points.push(new THREE.Vector3(40, -18, 30));
            addLayer(-18, 1);
            points.push(new THREE.Vector3(-40, -40, 30));
            addLayer(-40, -1);

            const curve = new THREE.CatmullRomCurve3(points);
            const geometry = new THREE.TubeGeometry(curve, 300, 1.5, 8, false);

            const material = new THREE.MeshStandardMaterial({
                color: 0xff4500,
                emissive: 0xff0000,
                emissiveIntensity: 1.0,
                metalness: 0.5,
                roughness: 0.1
            });

            solenoidMesh = new THREE.Mesh(geometry, material);
            scene.add(solenoidMesh);
        }

        function createOutletSystem() {
            const MAT_OUTLET = new THREE.MeshStandardMaterial({
                color: 0xef4444,
                metalness: 0.4,
                roughness: 0.4,
                transparent: true,
                opacity: 0.3,
                depthWrite: false
            });

            const PIPE_RAD = 8;
            const start = new THREE.Vector3(0, -50, 0);
            const mid = new THREE.Vector3(0, -80, 0);
            const turn = new THREE.Vector3(-20, -100, 0);
            const end = new THREE.Vector3(-60, -100, 0);

            outletCurve = new THREE.CatmullRomCurve3([start, mid, turn, end]);
            createCurvedPipe(outletCurve, PIPE_RAD, MAT_OUTLET);
        }

        function initParticles() {
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount; i++) {
                resetParticle(i, positions, colors, true);
            }

            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const mat = new THREE.PointsMaterial({
                size: 5,
                map: getParticleTexture(),
                transparent: true,
                opacity: 0.6,
                vertexColors: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            particleSystem = new THREE.Points(geo, mat);
            scene.add(particleSystem);
        }

        function resetParticle(i: number, positions: Float32Array, colors: Float32Array, initial = false) {
            particlesData[i] = {
                phase: 0,
                progress: initial ? Math.random() : 0,
                speed: 0.003 + Math.random() * 0.003,
                pos: new THREE.Vector3(),
                vel: new THREE.Vector3(),
                xOffset: (Math.random() - 0.5) * 5,
                yOffset: (Math.random() - 0.5) * 16,
                zOffset: (Math.random() - 0.5) * 5
            };

            updateParticlePosition(i, positions, colors);
        }

        function updateParticlePosition(i: number, positions: Float32Array, colors: Float32Array) {
            const data = particlesData[i];
            const i3 = i * 3;
            let pt = new THREE.Vector3();
            let color = new THREE.Color();

            const COL_COLD = new THREE.Color(0x3b82f6);
            const COL_HOT = new THREE.Color(0xff4500);

            if (data.phase === 0) {
                data.progress += data.speed;
                if (data.progress >= 1) {
                    data.phase = 1;
                    data.pos.copy(inletCurve.getPoint(1));
                    data.pos.x += data.xOffset;
                    data.pos.z += data.zOffset;
                    data.vel.set(
                        (Math.random() - 0.5) * 1.5,
                        -1.5 - Math.random(),
                        (Math.random() - 0.5) * 1.5
                    );
                    return;
                }
                pt = inletCurve.getPoint(data.progress);
                pt.x += data.xOffset;
                pt.y += data.yOffset * 0.2;
                pt.z += data.zOffset;
                color.copy(COL_COLD);
            }
            else if (data.phase === 1) {
                const dt = 1.0;

                data.vel.y -= 0.015 * dt;

                const windForce = 0.06;
                if (data.pos.y > 30) data.vel.x += windForce * dt;
                else if (data.pos.y > 10) data.vel.x -= windForce * dt;
                else if (data.pos.y > -10) data.vel.x += windForce * dt;
                else if (data.pos.y > -30) data.vel.x -= windForce * dt;
                else data.vel.x += (0 - data.pos.x) * 0.02 * dt;

                if (Math.abs(data.pos.z) < 40) {
                    data.vel.z += (Math.random() - 0.5) * 0.3 * dt;
                }
                data.vel.x += (Math.random() - 0.5) * 0.05 * dt;
                data.vel.y += (Math.random() - 0.5) * 0.05 * dt;

                data.vel.multiplyScalar(0.94);

                let oldY = data.pos.y;
                data.pos.add(data.vel);

                const radius = 1.0;
                for (let b = 0; b < bafflesConfig.length; b++) {
                    const baffle = bafflesConfig[b];
                    const halfThick = 1;

                    if (oldY > baffle.y + halfThick && data.pos.y <= baffle.y + halfThick + radius) {
                        if (data.pos.x >= baffle.minX && data.pos.x <= baffle.maxX) {
                            data.pos.y = baffle.y + halfThick + radius + 0.1;
                            data.vel.y *= -0.3;
                            data.vel.x += (Math.random() - 0.5) * 0.5;
                        }
                    }
                    else if (oldY < baffle.y - halfThick && data.pos.y >= baffle.y - halfThick - radius) {
                        if (data.pos.x >= baffle.minX && data.pos.x <= baffle.maxX) {
                            data.pos.y = baffle.y - halfThick - radius - 0.1;
                            data.vel.y *= -0.3;
                        }
                    }
                }

                if (data.pos.x > 48) { data.pos.x = 48; data.vel.x *= -0.5; }
                if (data.pos.x < -48) { data.pos.x = -48; data.vel.x *= -0.5; }
                if (data.pos.z > 48) { data.pos.z = 48; data.vel.z *= -0.5; }
                if (data.pos.z < -48) { data.pos.z = -48; data.vel.z *= -0.5; }
                if (data.pos.y > 48) { data.pos.y = 48; data.vel.y *= -0.5; }

                if (data.pos.y < -48) {
                    if (Math.abs(data.pos.x) < 8 && Math.abs(data.pos.z) < 8) {
                        data.phase = 2;
                        data.progress = 0;
                        return;
                    } else {
                        data.pos.y = -48;
                        data.vel.y *= -0.2;
                        data.vel.x += (0 - data.pos.x) * 0.05;
                        data.vel.z += (0 - data.pos.z) * 0.05;
                    }
                }

                pt.copy(data.pos);

                let heatFactor = (50 - pt.y) / 100;
                heatFactor = Math.max(0, Math.min(1, heatFactor));
                color.lerpColors(COL_COLD, COL_HOT, heatFactor);
            }
            else {
                data.progress += data.speed;
                if (data.progress >= 1) {
                    resetParticle(i, positions, colors);
                    return;
                }
                pt = outletCurve.getPoint(data.progress);
                pt.x += data.xOffset;
                pt.y += data.yOffset * 0.2;
                pt.z += data.zOffset;
                color.copy(COL_HOT);
            }

            positions[i3] = pt.x;
            positions[i3 + 1] = pt.y;
            positions[i3 + 2] = pt.z;

            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
        }

        function animate() {
            animationId = requestAnimationFrame(animate);
            if (controls) controls.update();

            if (solenoidMesh) {
                const time = Date.now() * 0.003;
                (solenoidMesh.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.0 + Math.sin(time) * 0.5;
            }

            if (particleSystem) {
                const positions = particleSystem.geometry.attributes.position.array as Float32Array;
                const colors = particleSystem.geometry.attributes.color.array as Float32Array;

                for (let i = 0; i < particleCount; i++) {
                    updateParticlePosition(i, positions, colors);
                }

                particleSystem.geometry.attributes.position.needsUpdate = true;
                particleSystem.geometry.attributes.color.needsUpdate = true;
            }

            if (renderer && scene && camera) renderer.render(scene, camera);
        }

        init();

        const handleResize = () => {
            if (!cameraRef.current || !rendererRef.current || !containerRef.current) return;
            const w = containerRef.current.clientWidth;
            const h = containerRef.current.clientHeight;
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(w, h);
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(animationId);
            if (containerRef.current && rendererRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }
            if (rendererRef.current) {
                rendererRef.current.dispose();
            }
        };
    }, []);

    const handleCapture = () => {
        if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const link = document.createElement("a");
        link.download = "heater_simulation.png";
        link.href = rendererRef.current.domElement.toDataURL("image/png");
        link.click();
    };

    const toggleRecording = () => {
        if (!rendererRef.current) return;

        if (!isRecording) {
            // @ts-ignore - captureStream exists on canvas
            const stream = rendererRef.current.domElement.captureStream(60);
            const options = { mimeType: "video/webm; codecs=vp9", videoBitsPerSecond: 8000000 };

            try {
                mediaRecorderRef.current = new MediaRecorder(stream, options);
            } catch (e) {
                mediaRecorderRef.current = new MediaRecorder(stream);
            }

            recordedChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "heater_simulation.webm";
                a.click();
                URL.revokeObjectURL(url);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } else {
            if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
            }
            setIsRecording(false);
        }
    };

    return (
        <div className="relative w-full h-full">
            <div ref={containerRef} className="absolute inset-0" />

            {/* Legend Overlay */}
            <div className="absolute top-6 left-6 z-10 bg-neutral-900/80 p-4 rounded-xl border border-neutral-700/50 backdrop-blur-md pointer-events-none text-sm text-white font-medium select-none shadow-xl">
                <h3 className="font-bold text-neutral-300 mb-3 uppercase tracking-wider text-xs">Thermal Simulation</h3>
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                    Cool Inlet Air
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></span>
                    Heating Process
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                    Hot Outlet Air
                </div>
            </div>

            {/* Controls Overlay */}
            <div className="absolute top-6 right-6 z-10 flex flex-col gap-3">
                <button
                    onClick={handleCapture}
                    className="flex items-center justify-center gap-2 bg-neutral-900/90 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-neutral-950 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg hover:shadow-cyan-500/40 w-48"
                >
                    📷 Capture Image
                </button>
                <button
                    onClick={toggleRecording}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg w-48 ${isRecording
                        ? "bg-red-500 text-white border border-red-500 animate-[pulse_2s_infinite] shadow-red-500/40"
                        : "bg-neutral-900/90 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-neutral-950 hover:shadow-cyan-500/40"
                        }`}
                >
                    {isRecording ? "🛑 Stop Recording" : "🔴 Start Recording"}
                </button>
            </div>
        </div>
    );
}

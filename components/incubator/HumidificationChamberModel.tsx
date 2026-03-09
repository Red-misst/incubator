"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";

export function HumidificationChamberModel() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);

    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    // Use a ref to track animation state inside the loop
    const animationRunningRef = useRef(true);

    useEffect(() => {
        if (!containerRef.current) return;

        let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
        let particleSystem: THREE.Points;
        const particleCount = 2500;
        const particlesData: any[] = [];
        let animationId: number;

        let leftInletCurve: THREE.CubicBezierCurve3, rightInletCurve: THREE.CubicBezierCurve3, nTrapCurve: THREE.CatmullRomCurve3;
        let mistifierSource: THREE.Vector3;
        let chamberBounds: any = {};
        let basinBounds: any = {};

        function init() {
            const width = containerRef.current!.clientWidth;
            const height = containerRef.current!.clientHeight;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0f172a);
            sceneRef.current = scene;

            camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
            camera.position.set(300, 850, 300);
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

            const ambientLight = new THREE.AmbientLight(0x404040);
            scene.add(ambientLight);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
            directionalLight.position.set(500, 1000, 500);
            directionalLight.castShadow = true;
            scene.add(directionalLight);
            const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.3);
            fillLight.position.set(-500, 100, 0);
            scene.add(fillLight);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.target.set(0, 825, -50);

            createHumidifierSystem();
            initParticles();

            animate();
        }

        function createComponent(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, name: string) {
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(x, y, z);
            mesh.userData.name = name;
            scene.add(mesh);
            return mesh;
        }

        function createCurvedPipe(curve: THREE.Curve<THREE.Vector3>, radius: number, material: THREE.Material) {
            const geometry = new THREE.TubeGeometry(curve, 64, radius, 8, false);
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            return mesh;
        }

        function getMistTexture() {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const context = canvas.getContext('2d')!;
            const gradient = context.createRadialGradient(16, 16, 0, 16, 16, 16);
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
            gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            context.fillStyle = gradient;
            context.fillRect(0, 0, 32, 32);
            return new THREE.CanvasTexture(canvas);
        }

        function createHumidifierSystem() {
            const MAT_HUMIDIFIER = new THREE.MeshStandardMaterial({
                color: 0x3b82f6, metalness: 0.1, roughness: 0.1,
                transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false
            });

            const MAT_PIPE = new THREE.MeshStandardMaterial({
                color: 0x64748b, metalness: 0.1, roughness: 0.1,
                transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false
            });

            const MAT_TRAP = new THREE.MeshStandardMaterial({
                color: 0xa855f7, metalness: 0.1, roughness: 0.1,
                transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false
            });

            const MAT_BASIN_STRUCT = new THREE.MeshStandardMaterial({
                color: 0x1e293b, metalness: 0.5, roughness: 0.7
            });

            const MAT_WATER = new THREE.MeshStandardMaterial({
                color: 0x00eaff, metalness: 0.9, roughness: 0.05,
                transparent: true, opacity: 0.7, emissive: 0x004455, emissiveIntensity: 0.2, depthWrite: false
            });

            const MAT_MISTIFIER = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

            const WALL_THICKNESS = 100;
            const WALL_Z = -WALL_THICKNESS / 2;
            const AHU_TOP_Y = 850;
            const CHAMBER_SIZE = 50;
            const PIPE_RAD = 8;
            const HUM_Y = AHU_TOP_Y - CHAMBER_SIZE / 2;

            chamberBounds = {
                minX: -(CHAMBER_SIZE / 2) + 2, maxX: (CHAMBER_SIZE / 2) - 2,
                minY: HUM_Y - (CHAMBER_SIZE / 2) + 2, maxY: HUM_Y + (CHAMBER_SIZE / 2) - 2,
                minZ: WALL_Z - (CHAMBER_SIZE / 2) + 2, maxZ: WALL_Z + (CHAMBER_SIZE / 2) - 2
            };

            const ahubox = new THREE.BoxGeometry(CHAMBER_SIZE, CHAMBER_SIZE, CHAMBER_SIZE);
            createComponent(ahubox, MAT_HUMIDIFIER, 0, HUM_Y, WALL_Z, "Humidifier Chamber");
            const edges = new THREE.EdgesGeometry(ahubox);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.2, transparent: true }));
            line.position.set(0, HUM_Y, WALL_Z);
            scene.add(line);

            const BASIN_LEN_X = CHAMBER_SIZE / 3;
            const BASIN_HEIGHT = CHAMBER_SIZE * (2 / 3);
            const BASIN_WIDTH_Z = CHAMBER_SIZE - 4;

            const basinX = -(CHAMBER_SIZE / 2) + (BASIN_LEN_X / 2) + 1;
            const basinY = (HUM_Y - CHAMBER_SIZE / 2) + (BASIN_HEIGHT / 2);

            const basinStructGeo = new THREE.BoxGeometry(BASIN_LEN_X, BASIN_HEIGHT, BASIN_WIDTH_Z);
            createComponent(basinStructGeo, MAT_BASIN_STRUCT, basinX, basinY, WALL_Z, "Basin Structure");

            const waterGeo = new THREE.BoxGeometry(BASIN_LEN_X - 1, BASIN_HEIGHT - 1, BASIN_WIDTH_Z - 1);
            createComponent(waterGeo, MAT_WATER, basinX, basinY, WALL_Z, "Water Volume");

            basinBounds = {
                maxX: basinX + BASIN_LEN_X / 2,
                maxY: basinY + BASIN_HEIGHT / 2
            };

            const MISTIFIER_SIZE = 10;
            const mistifierGeo = new THREE.CylinderGeometry(MISTIFIER_SIZE / 2, MISTIFIER_SIZE / 2, 4, 16);
            const mistifierY = basinY + (BASIN_HEIGHT / 2) + 2;
            mistifierSource = new THREE.Vector3(basinX, mistifierY, WALL_Z);
            createComponent(mistifierGeo, MAT_MISTIFIER, mistifierSource.x, mistifierSource.y, mistifierSource.z, "Mistifier Device");

            const INLET_START_Y = HUM_Y + 100;
            const INLET_SPREAD_X = 60;

            leftInletCurve = new THREE.CubicBezierCurve3(
                new THREE.Vector3(-INLET_SPREAD_X, INLET_START_Y, WALL_Z),
                new THREE.Vector3(-INLET_SPREAD_X, INLET_START_Y - 40, WALL_Z),
                new THREE.Vector3(0, HUM_Y + CHAMBER_SIZE / 2 + 20, WALL_Z),
                new THREE.Vector3(0, HUM_Y + CHAMBER_SIZE / 2, WALL_Z)
            );
            createCurvedPipe(leftInletCurve, PIPE_RAD, MAT_PIPE);

            rightInletCurve = new THREE.CubicBezierCurve3(
                new THREE.Vector3(INLET_SPREAD_X, INLET_START_Y, WALL_Z),
                new THREE.Vector3(INLET_SPREAD_X, INLET_START_Y - 40, WALL_Z),
                new THREE.Vector3(0, HUM_Y + CHAMBER_SIZE / 2 + 20, WALL_Z),
                new THREE.Vector3(0, HUM_Y + CHAMBER_SIZE / 2, WALL_Z)
            );
            createCurvedPipe(rightInletCurve, PIPE_RAD, MAT_PIPE);

            const OUTLET_START_Y = HUM_Y - CHAMBER_SIZE / 2;
            const N_WIDTH = 40;
            const N_HEIGHT = 60;
            nTrapCurve = new THREE.CatmullRomCurve3([
                new THREE.Vector3(0, OUTLET_START_Y, WALL_Z),
                new THREE.Vector3(0, OUTLET_START_Y - N_HEIGHT, WALL_Z),
                new THREE.Vector3(N_WIDTH, OUTLET_START_Y - 20, WALL_Z),
                new THREE.Vector3(N_WIDTH, OUTLET_START_Y - N_HEIGHT - 20, WALL_Z)
            ]);
            createCurvedPipe(nTrapCurve, PIPE_RAD, MAT_TRAP);
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
                map: getMistTexture(),
                transparent: true,
                opacity: 0.9,
                vertexColors: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending
            });

            particleSystem = new THREE.Points(geo, mat);
            scene.add(particleSystem);
        }

        function resetParticle(i: number, positions: Float32Array, colors: Float32Array, initial = false) {
            const type = Math.random() < 0.4 ? 0 : 1;

            particlesData[i] = {
                type: type,
                progress: 0,
                velocity: new THREE.Vector3(0, 0, 0),
                path: Math.random() < 0.5 ? leftInletCurve : rightInletCurve,
                colorVals: type === 0 ? { r: 1, g: 1, b: 1 } : { r: 0.23, g: 0.51, b: 0.96 },
                age: 0
            };

            if (type === 0) {
                const pt = particlesData[i].path.getPoint(0);
                positions[i * 3] = pt.x + (Math.random() - 0.5) * 5;
                positions[i * 3 + 1] = pt.y;
                positions[i * 3 + 2] = pt.z + (Math.random() - 0.5) * 5;
                colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1;
            } else {
                positions[i * 3] = mistifierSource.x + (Math.random() - 0.5) * 6;
                positions[i * 3 + 1] = mistifierSource.y + 1;
                positions[i * 3 + 2] = mistifierSource.z + (Math.random() - 0.5) * 6;
                colors[i * 3] = 0.23; colors[i * 3 + 1] = 0.51; colors[i * 3 + 2] = 0.96;
            }
        }

        function animate() {
            animationId = requestAnimationFrame(animate);
            if (controls) controls.update();

            if (particleSystem && animationRunningRef.current) {
                const positions = particleSystem.geometry.attributes.position.array as Float32Array;
                const colors = particleSystem.geometry.attributes.color.array as Float32Array;

                const targetR = 0.02;
                const targetG = 0.71;
                const targetB = 0.83;

                const suctionTarget = new THREE.Vector3(0, chamberBounds.minY, mistifierSource.z);

                for (let i = 0; i < particleCount; i++) {
                    const data = particlesData[i];
                    const i3 = i * 3;

                    if (data.type === 0) {
                        data.progress += 0.008;
                        if (data.progress >= 1) {
                            data.type = 2;
                            data.velocity.set((Math.random() - 0.5) * 0.5, -0.8, (Math.random() - 0.5) * 0.5);
                        } else {
                            const pt = data.path.getPoint(data.progress);
                            positions[i3] = pt.x + (Math.random() - 0.5) * 5;
                            positions[i3 + 1] = pt.y;
                            positions[i3 + 2] = pt.z + (Math.random() - 0.5) * 5;
                        }

                    } else if (data.type === 1) {
                        positions[i3] += (Math.random() - 0.5) * 0.2;
                        positions[i3 + 1] += 0.8;
                        positions[i3 + 2] += (Math.random() - 0.5) * 0.2;

                        if (positions[i3 + 1] > chamberBounds.maxY - 15) {
                            data.type = 2;
                            data.velocity.set(0.5, 0, 0);
                        }

                    } else if (data.type === 2) {
                        data.velocity.x += (Math.random() - 0.5) * 0.08;
                        data.velocity.y += (Math.random() - 0.5) * 0.08;
                        data.velocity.z += (Math.random() - 0.5) * 0.08;

                        const dx = suctionTarget.x - positions[i3];
                        const dy = suctionTarget.y - positions[i3 + 1];
                        const dz = suctionTarget.z - positions[i3 + 2];
                        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                        if (dist < 30) {
                            data.velocity.x += dx * 0.005;
                            data.velocity.y += dy * 0.005;
                            data.velocity.z += dz * 0.005;
                        } else {
                            if (positions[i3] < 0) {
                                data.velocity.y += 0.01;
                                data.velocity.x += 0.01;
                            } else {
                                data.velocity.y -= 0.005;
                                data.velocity.x -= 0.002;
                            }
                        }

                        data.velocity.multiplyScalar(0.97);
                        positions[i3] += data.velocity.x;
                        positions[i3 + 1] += data.velocity.y;
                        positions[i3 + 2] += data.velocity.z;

                        if (positions[i3] < chamberBounds.minX) { positions[i3] = chamberBounds.minX; data.velocity.x = Math.abs(data.velocity.x) * 0.5; }
                        if (positions[i3] > chamberBounds.maxX) { positions[i3] = chamberBounds.maxX; data.velocity.x = -Math.abs(data.velocity.x) * 0.5; }
                        if (positions[i3 + 2] < chamberBounds.minZ) { positions[i3 + 2] = chamberBounds.minZ; data.velocity.z = Math.abs(data.velocity.z) * 0.5; }
                        if (positions[i3 + 2] > chamberBounds.maxZ) { positions[i3 + 2] = chamberBounds.maxZ; data.velocity.z = -Math.abs(data.velocity.z) * 0.5; }
                        if (positions[i3 + 1] > chamberBounds.maxY) {
                            positions[i3 + 1] = chamberBounds.maxY;
                            data.velocity.y = -Math.abs(data.velocity.y) * 0.5;
                        }

                        const isOverBasin = (positions[i3] < basinBounds.maxX);
                        const floorLimit = isOverBasin ? basinBounds.maxY : chamberBounds.minY;

                        if (positions[i3 + 1] < floorLimit) {
                            if (!isOverBasin && Math.abs(positions[i3]) < 10 && Math.abs(positions[i3 + 2] - suctionTarget.z) < 10) {
                                data.type = 3;
                                data.progress = 0;
                            } else {
                                positions[i3 + 1] = floorLimit + 1;
                                data.velocity.y = Math.abs(data.velocity.y) * 0.6 + 0.1;
                                data.velocity.x += (Math.random() - 0.5) * 0.5;
                            }
                        }

                        colors[i3] += (targetR - colors[i3]) * 0.03;
                        colors[i3 + 1] += (targetG - colors[i3 + 1]) * 0.03;
                        colors[i3 + 2] += (targetB - colors[i3 + 2]) * 0.03;

                    } else if (data.type === 3) {
                        data.progress += 0.008;
                        if (data.progress >= 1) {
                            resetParticle(i, positions, colors);
                        } else {
                            const pt = nTrapCurve.getPoint(data.progress);
                            positions[i3] = pt.x + (Math.random() - 0.5) * 5;
                            positions[i3 + 1] = pt.y;
                            positions[i3 + 2] = pt.z + (Math.random() - 0.5) * 5;
                        }
                    }
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
        link.download = "humidifier_simulation.png";
        link.href = rendererRef.current.domElement.toDataURL("image/png");
        link.click();
    };

    const toggleAnimation = () => {
        setIsPaused(!isPaused);
        animationRunningRef.current = isPaused; // isPaused is the old state, so true means it will be running again
    };

    const toggleRecording = () => {
        if (!rendererRef.current) return;

        if (!isRecording) {
            // @ts-ignore
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
                a.download = "humidifier_high_res.webm";
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
                <h3 className="font-bold text-neutral-300 mb-3 uppercase tracking-wider text-xs">Humidification Chamber</h3>
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]"></span>
                    Inlet Air (Dry)
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                    Mist Generation
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.6)]"></span>
                    Mixed Output
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
                    onClick={toggleAnimation}
                    className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all shadow-lg w-48 ${isPaused
                        ? "bg-amber-500 text-white border border-amber-500 shadow-amber-500/40"
                        : "bg-neutral-900/90 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500 hover:text-neutral-950 hover:shadow-cyan-500/40"
                        }`}
                >
                    {isPaused ? "▶ Resume Animation" : "⏸ Pause Animation"}
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

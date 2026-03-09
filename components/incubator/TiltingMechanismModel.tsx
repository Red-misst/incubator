"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three-stdlib";
import { createMaterials } from "@/lib/incubator/materials";

export function TiltingMechanismModel() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isRecording, setIsRecording] = useState(false);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        if (!containerRef.current) return;

        let scene: THREE.Scene, camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls;
        let animationId: number;

        // References to tilting parts
        const racks: THREE.Group[] = [];

        function init() {
            const width = containerRef.current!.clientWidth;
            const height = containerRef.current!.clientHeight;

            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0f172a);
            sceneRef.current = scene;

            camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
            camera.position.set(400, 300, 600);
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
            const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.3);
            fillLight.position.set(-200, 100, 0);
            scene.add(fillLight);

            controls = new OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.target.set(0, 50, 0);

            buildMechanism();

            animate();
        }

        function buildMechanism() {
            const mats = createMaterials();
            const CAB_W = 600;
            const CAB_L = 1200;

            const trayFrameGroup = new THREE.Group();
            scene.add(trayFrameGroup);

            // Left rail
            const leftRail = new THREE.Mesh(new THREE.BoxGeometry(10, 20, CAB_L - 40), mats.MAT_FRAME);
            leftRail.position.set(-((CAB_W - 40) / 2) - 5, 0, 0);
            trayFrameGroup.add(leftRail);

            // Right rail
            const rightRail = new THREE.Mesh(new THREE.BoxGeometry(10, 20, CAB_L - 40), mats.MAT_FRAME);
            rightRail.position.set((CAB_W - 40) / 2 + 5, 0, 0);
            trayFrameGroup.add(rightRail);

            // Motor
            const motor = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 30, 32), mats.MAT_MOTOR);
            motor.position.set((CAB_W - 40) / 2 + 5, 0, CAB_L / 2 - 200 + 100);
            motor.rotation.z = Math.PI / 2;
            trayFrameGroup.add(motor);

            // Linkage Rod
            const linkageRod = new THREE.Mesh(new THREE.BoxGeometry(5, 5, CAB_L - 200), mats.MAT_FRAME);
            linkageRod.position.set((CAB_W - 40) / 2 - 10, 10, 0);
            trayFrameGroup.add(linkageRod);

            // Individual Racks
            const ROWS_Z = 6;
            const EGGS_PER_ROW = 5;
            const Z_SPACING = (CAB_L - 250) / (ROWS_Z - 1);
            const X_SPACING = (CAB_W - 120) / (EGGS_PER_ROW - 1);

            const plankGeo = new THREE.BoxGeometry(CAB_W - 60, 5, 40);
            const cupGeo = new THREE.CylinderGeometry(20, 15, 10, 32, 1, true);
            const eggGeo = new THREE.SphereGeometry(22, 32, 32);
            eggGeo.scale(1, 1.35, 1);

            for (let r = 0; r < ROWS_Z; r += 1) {
                // center the entire assembly around z=0
                const rollerZ = -((CAB_L - 250) / 2) + r * Z_SPACING;

                const rackPlank = new THREE.Group();
                rackPlank.position.set(0, 0, rollerZ);
                trayFrameGroup.add(rackPlank);
                racks.push(rackPlank);

                const plankMesh = new THREE.Mesh(plankGeo, mats.MAT_ROLLER);
                rackPlank.add(plankMesh);

                for (let e = 0; e < EGGS_PER_ROW; e += 1) {
                    const px = -((CAB_W - 120) / 2) + e * X_SPACING;

                    const cup = new THREE.Mesh(cupGeo, mats.MAT_VALVE);
                    cup.position.set(px, 5, 0);
                    rackPlank.add(cup);

                    const egg = new THREE.Mesh(eggGeo, mats.MAT_EGG);
                    egg.position.set(px, 18, 0);
                    egg.rotation.z = (Math.random() - 0.5) * 0.3;
                    egg.rotation.x = (Math.random() - 0.5) * 0.3;
                    rackPlank.add(egg);
                }
            }
        }

        function animate() {
            animationId = requestAnimationFrame(animate);
            if (controls) controls.update();

            const time = Date.now() * 0.001;

            // Tilt animation logic! Let's exaggerate it slightly for visualization
            const tiltAngle = Math.sin(time * 0.6) * 0.75;

            racks.forEach(rack => {
                rack.rotation.x = tiltAngle;
            });

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
        link.download = "tilting_mechanism.png";
        link.href = rendererRef.current.domElement.toDataURL("image/png");
        link.click();
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
                a.download = "tilting_mechanism.webm";
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
                <h3 className="font-bold text-neutral-300 mb-3 uppercase tracking-wider text-xs">Tilting Mechanism</h3>
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-[#fcd34d] shadow-[0_0_8px_rgba(252,211,77,0.6)]"></span>
                    Egg Mass
                </div>
                <div className="flex items-center gap-3 mb-2">
                    <span className="w-3 h-3 rounded-full bg-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
                    Linkage & Rails
                </div>
                <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                    Actuator System
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

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import { createMaterials, IncubatorMaterials } from "./materials";
import { CfdSystem } from "./CfdSystem";
import { buildScene } from "./GeometryBuilder";
import { SceneRefs, SceneState } from "./types";
import { PipeFlowSystem } from "./PipeFlowSystem";

export type { SceneState } from "./types";

export class IncubatorSceneController {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private container!: HTMLElement;
  private rafId: number | null = null;

  private mats!: IncubatorMaterials;
  private cfd!: CfdSystem;
  private refs!: SceneRefs;
  private pipeSystem!: PipeFlowSystem;

  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];

  private state: SceneState = {
    shellVisible: true,
    compVisible: true,
    doorsOpen: false,
    labelsVisible: true,
    systemOn: true,
    isRecording: false,
  };

  // ------------------------------------------------------------------- init

  init(container: HTMLElement): void {
    this.container = container;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
    this.camera.position.set(2400, 1000, 800);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lights
    this.scene.add(new THREE.AmbientLight(0x404040));

    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(500, 1000, 500);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 3000;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0x38bdf8, 0.3);
    fill.position.set(-500, 100, 0);
    this.scene.add(fill);

    // Controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.target.set(0, 500, 600);

    // Build modules
    this.mats = createMaterials();
    this.cfd = new CfdSystem(this.scene);
    this.refs = buildScene(this.scene, this.mats, this.cfd);
    this.pipeSystem = new PipeFlowSystem(this.scene, this.refs.flowPaths);
    this.pipeSystem.init();

    this.animate();
  }

  // ---------------------------------------------------------------- dispose

  dispose(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
      this.state.isRecording = false;
    }
    this.controls?.dispose();
    this.renderer?.dispose();
    if (this.container?.contains(this.renderer?.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }

  // ---------------------------------------------------------------- public

  getState(): SceneState {
    return { ...this.state };
  }

  resize(width: number, height: number): void {
    if (!this.camera || !this.renderer || width <= 0 || height <= 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // --------------------------------------------------------------- camera

  moveCamera(x: number, y: number, z: number, tx = 0, ty = 500, tz = 600): void {
    new TWEEN.Tween(this.camera.position)
      .to({ x, y, z }, 1500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();
    new TWEEN.Tween(this.controls.target)
      .to({ x: tx, y: ty, z: tz }, 1500)
      .easing(TWEEN.Easing.Cubic.InOut)
      .start();
  }

  // ------------------------------------------------------------- capture / record

  captureScreenshot(): void {
    const originalSize = new THREE.Vector2();
    this.renderer.getSize(originalSize);
    const originalPixelRatio = this.renderer.getPixelRatio();

    this.renderer.setPixelRatio(1);
    this.renderer.setSize(3840, 2160, false);
    this.camera.aspect = 3840 / 2160;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);

    const link = document.createElement("a");
    link.download = "incubator_cfd_4k.png";
    link.href = this.renderer.domElement.toDataURL("image/png", 1.0);
    link.click();

    this.renderer.setSize(originalSize.x, originalSize.y);
    this.renderer.setPixelRatio(originalPixelRatio);
    this.camera.aspect = originalSize.x / originalSize.y;
    this.camera.updateProjectionMatrix();
    this.renderer.render(this.scene, this.camera);
  }

  toggleRecording(): boolean {
    if (!this.state.isRecording) {
      const canvasStream = this.renderer.domElement.captureStream(60);
      let options: MediaRecorderOptions = {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 25_000_000,
      };
      if (!MediaRecorder.isTypeSupported(options.mimeType ?? "")) {
        options = { mimeType: "video/webm", videoBitsPerSecond: 25_000_000 };
      }
      try {
        this.mediaRecorder = new MediaRecorder(canvasStream, options);
      } catch {
        return this.state.isRecording;
      }
      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) this.recordedChunks.push(e.data);
      };
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "incubator_cfd_hq.webm";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
      };
      this.mediaRecorder.start();
      this.state.isRecording = true;
      return true;
    }
    this.mediaRecorder?.stop();
    this.state.isRecording = false;
    return false;
  }

  // -------------------------------------------------------------- toggles

  toggleWalls(): boolean {
    this.state.shellVisible = !this.state.shellVisible;
    this.refs.wallGroup.visible = this.state.shellVisible;
    return this.state.shellVisible;
  }

  toggleCompWalls(): boolean {
    this.state.compVisible = !this.state.compVisible;
    this.refs.compWallGroup.visible = this.state.compVisible;
    return this.state.compVisible;
  }

  toggleDoors(): boolean {
    this.state.doorsOpen = !this.state.doorsOpen;
    return this.state.doorsOpen;
  }

  toggleLabels(): boolean {
    this.state.labelsVisible = !this.state.labelsVisible;
    this.refs.labelGroup.visible = this.state.labelsVisible;
    return this.state.labelsVisible;
  }

  toggleAnimation(): boolean {
    this.state.systemOn = !this.state.systemOn;
    return this.state.systemOn;
  }

  // -------------------------------------------------------------- render loop

  private animate = (time = 0): void => {
    this.rafId = requestAnimationFrame(this.animate);
    TWEEN.update(time);
    this.controls.update();

    const seconds = Date.now() * 0.001;

    // Door swing
    const targetAngle = this.state.doorsOpen ? -Math.PI / 2 : 0;
    this.refs.doorPivots.forEach((pivot) => {
      if (Math.abs(pivot.rotation.z - targetAngle) > 0.001) {
        pivot.rotation.z += (targetAngle - pivot.rotation.z) * 0.1;
      }
    });

    if (this.state.systemOn) {
      // Fan blades
      this.refs.fans.forEach((hub) => {
        hub.rotation.y -= 0.3;
      });

      // Heater glow pulse
      const heater = this.refs.heaterMesh;
      if (heater) {
        const pulse = (Math.sin(seconds * 3) + 1) * 0.5;
        heater.material.emissiveIntensity = 0.2 + pulse * 0.5;
        heater.material.opacity = 0.6 + pulse * 0.4;
      }

      // Pipe-path particles
      this.pipeSystem.update(seconds);
      this.pipeSystem.setVisible(true);

      // CFD compartment particles
      this.cfd.update(seconds);
      this.cfd.setVisible(true);
    } else {
      this.pipeSystem.setVisible(false);
      this.cfd.setVisible(false);
    }

    this.renderer.render(this.scene, this.camera);
  };
}

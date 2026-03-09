"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./IncubatorApp.module.css";
import { IncubatorSceneController } from "@/lib/incubator/IncubatorSceneController";
import { EngineeringDrawing } from "./EngineeringDrawing";

const cx = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(" ");

/** Collapsible panel with a clickable header */
function Panel({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.panel}>
      <button
        type="button"
        className={styles.panelHeader}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={styles.panelTitle}>{title}</span>
        <span className={cx(styles.chevron, !open && styles.chevronClosed)}>▾</span>
      </button>
      <div className={cx(styles.panelBody, !open && styles.panelBodyClosed)}>
        {children}
      </div>
    </div>
  );
}

export function IncubatorApp() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<IncubatorSceneController | null>(null);
  const [controlState, setControlState] = useState(() => {
    const controller = new IncubatorSceneController();
    return controller.getState();
  });
  const [legendOpen, setLegendOpen] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showDrawing, setShowDrawing] = useState(false);

  useEffect(() => {
    if (!canvasHostRef.current) return;

    const controller = new IncubatorSceneController();
    controllerRef.current = controller;
    controller.init(canvasHostRef.current);

    const onResize = () => {
      if (!canvasHostRef.current || !controllerRef.current) return;
      controllerRef.current.resize(
        canvasHostRef.current.clientWidth,
        canvasHostRef.current.clientHeight,
      );
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  const toggleShell = () => {
    const next = controllerRef.current?.toggleWalls();
    if (typeof next === "boolean")
      setControlState((p) => ({ ...p, shellVisible: next }));
  };
  const toggleComp = () => {
    const next = controllerRef.current?.toggleCompWalls();
    if (typeof next === "boolean")
      setControlState((p) => ({ ...p, compVisible: next }));
  };
  const toggleDoors = () => {
    const next = controllerRef.current?.toggleDoors();
    if (typeof next === "boolean")
      setControlState((p) => ({ ...p, doorsOpen: next }));
  };
  const toggleLabels = () => {
    const next = controllerRef.current?.toggleLabels();
    if (typeof next === "boolean")
      setControlState((p) => ({ ...p, labelsVisible: next }));
  };
  const togglePower = () => {
    const next = controllerRef.current?.toggleAnimation();
    if (typeof next === "boolean")
      setControlState((p) => ({ ...p, systemOn: next }));
  };
  const moveCamera = (x: number, y: number, z: number, tx = 0, ty = 500, tz = 600) =>
    controllerRef.current?.moveCamera(x, y, z, tx, ty, tz);
  const capture = () => controllerRef.current?.captureScreenshot();
  const toggleRecording = () => {
    const next = controllerRef.current?.toggleRecording();
    if (typeof next === "boolean")
      setControlState((p) => ({ ...p, isRecording: next }));
  };

  return (
    <div className={styles.root}>
      <div ref={canvasHostRef} className={styles.canvasHost} />

      {/* ── Header badge ── */}
      <div className={styles.info}>
        Incubator Simulation
        <br />
        <span className={styles.infoSmall}>Dimensions: 600W x 1000H x 1200L mm</span>
      </div>

      {/* ── Navigation Sidebar ── */}
      <div className={cx(styles.sidebar, !sidebarOpen && styles.sidebarClosed)}>
        <div className={styles.sidebarHeader}>
          <div className={styles.sidebarLogo}>INCUBATOR HUB</div>
        </div>

        <div className={styles.sidebarScroll}>
          <div className={styles.navSection}>
            <div className={styles.navLabel}>Tools</div>
            <button
              className={cx(styles.navItem, showDrawing && styles.navActive)}
              onClick={() => { setShowDrawing(true); setSidebarOpen(false); }}
            >
              📐 Engineering Drawing
            </button>
            <button
              className={styles.navItem}
              onClick={() => { setSidebarOpen(false); capture(); }}
            >
              📷 4K Screenshot
            </button>
          </div>

          <Panel title="System Controls">
            <button
              type="button"
              onClick={toggleShell}
              className={cx(styles.button, controlState.shellVisible && styles.active)}
            >
              Outer Shell <div className={styles.statusDot} />
            </button>
            <button
              type="button"
              onClick={toggleComp}
              className={cx(styles.button, controlState.compVisible && styles.active)}
            >
              Comp. Walls <div className={styles.statusDot} />
            </button>
            <button
              type="button"
              onClick={toggleDoors}
              className={cx(styles.button, controlState.doorsOpen && styles.active)}
            >
              Doors <div className={styles.statusDot} />
            </button>
            <button
              type="button"
              onClick={toggleLabels}
              className={cx(styles.button, controlState.labelsVisible && styles.active)}
            >
              Labels <div className={styles.statusDot} />
            </button>
            <button
              type="button"
              onClick={togglePower}
              className={cx(styles.button, controlState.systemOn && styles.active)}
            >
              System Power <div className={styles.statusDot} />
            </button>
          </Panel>

          <Panel title="Pre-Set Analysis">
            <button
              type="button"
              className={cx(styles.button, styles.cameraBtn)}
              onClick={() => moveCamera(2400, 1000, 800)}
            >
              Isometric View
            </button>
            <button
              type="button"
              className={cx(styles.button, styles.cameraBtn)}
              onClick={() => moveCamera(0, 750, 300, 0, 750, 50)}
            >
              Inlet Jet Focus
            </button>
            <button
              type="button"
              className={cx(styles.button, styles.cameraBtn)}
              onClick={() => moveCamera(0, 750, 900, 0, 750, 1200)}
            >
              Exhaust Pull Focus
            </button>
          </Panel>

          <div className={styles.navSection}>
            <div className={styles.navLabel}>Export</div>
            <button
              type="button"
              className={cx(
                styles.button,
                styles.recordBtn,
                controlState.isRecording && styles.recordingPulse,
              )}
              onClick={toggleRecording}
            >
              {controlState.isRecording ? "🛑 Stop Recording" : "🎥 Video HQ"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Menu Toggle Button ── */}
      <button
        className={cx(styles.menuToggle, !showUI && styles.hidden, sidebarOpen && styles.menuToggleActive)}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <div className={styles.bar} />
        <div className={styles.bar} />
        <div className={styles.bar} />
      </button>

      {/* ── Bottom-left legend (collapsible) ── */}
      <div className={cx(styles.legendBox, !showUI && styles.legendHidden)}>
        <button
          type="button"
          className={styles.legendHeader}
          onClick={() => setLegendOpen((o) => !o)}
          aria-expanded={legendOpen}
        >
          <strong className={styles.legendStrong}>Simulation Status</strong>
          <span className={cx(styles.chevron, !legendOpen && styles.chevronClosed)}>▾</span>
        </button>

        <div className={cx(styles.legendBody, !legendOpen && styles.panelBodyClosed)}>
          <div className={styles.legendItem}>
            <span className={cx(styles.dot, styles.dotCyan)} />
            AHU Suction Pipe
          </div>
          <div className={styles.legendItem}>
            <span className={cx(styles.dot, styles.dotOrange)} />
            Conditioned Delivery
          </div>
          <div className={styles.legendItem}>
            <span className={cx(styles.dot, styles.dotGray)} />
            Exhaust Manifold
          </div>

          <strong className={styles.legendStrongSmall}>CFD Chamber Velocity</strong>
          <div className={styles.cfdScale} />
          <div className={styles.cfdLabels}>
            <span>Low (Stagnant)</span>
            <span>High (Jet)</span>
          </div>
        </div>
      </div>

      {/* ── Toggle UI Button ── */}
      <button
        type="button"
        className={styles.toggleVisBtn}
        onClick={() => { setShowUI((v) => !v); setSidebarOpen(false); }}
        title={showUI ? "Hide Controls" : "Show Controls"}
      >
        {showUI ? "👁️" : "🙈"}
      </button>

      {/* ── 2D Presentation Overlay ── */}
      {showDrawing && (
        <EngineeringDrawing onClose={() => setShowDrawing(false)} />
      )}
    </div>
  );
}

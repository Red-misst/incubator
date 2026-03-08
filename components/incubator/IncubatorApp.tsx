"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./IncubatorApp.module.css";
import { IncubatorSceneController } from "@/lib/incubator/IncubatorSceneController";



const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function IncubatorApp() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<IncubatorSceneController | null>(null);
  // Initialize state lazily from the controller's default state
  const [controlState, setControlState] = useState(() => {
    const controller = new IncubatorSceneController(); // or however you create it
    return controller.getState();
  });

  useEffect(() => {
    if (!canvasHostRef.current) {
      return;
    }

    const controller = new IncubatorSceneController();
    controllerRef.current = controller;
    controller.init(canvasHostRef.current);
    // ❌ Remove: setControlState(controller.getState());

    const onResize = () => {
      if (!canvasHostRef.current || !controllerRef.current) {
        return;
      }
      controllerRef.current.resize(canvasHostRef.current.clientWidth, canvasHostRef.current.clientHeight);
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
    if (typeof next === "boolean") {
      setControlState((prev) => ({ ...prev, shellVisible: next }));
    }
  };

  const toggleComp = () => {
    const next = controllerRef.current?.toggleCompWalls();
    if (typeof next === "boolean") {
      setControlState((prev) => ({ ...prev, compVisible: next }));
    }
  };

  const toggleDoors = () => {
    const next = controllerRef.current?.toggleDoors();
    if (typeof next === "boolean") {
      setControlState((prev) => ({ ...prev, doorsOpen: next }));
    }
  };

  const toggleLabels = () => {
    const next = controllerRef.current?.toggleLabels();
    if (typeof next === "boolean") {
      setControlState((prev) => ({ ...prev, labelsVisible: next }));
    }
  };

  const togglePower = () => {
    const next = controllerRef.current?.toggleAnimation();
    if (typeof next === "boolean") {
      setControlState((prev) => ({ ...prev, systemOn: next }));
    }
  };

  const moveCamera = (x: number, y: number, z: number, tx = 0, ty = 500, tz = 600) => {
    controllerRef.current?.moveCamera(x, y, z, tx, ty, tz);
  };

  const capture = () => {
    controllerRef.current?.captureScreenshot();
  };

  const toggleRecording = () => {
    const next = controllerRef.current?.toggleRecording();
    if (typeof next === "boolean") {
      setControlState((prev) => ({ ...prev, isRecording: next }));
    }
  };

  return (
    <div className={styles.root}>
      <div ref={canvasHostRef} className={styles.canvasHost} />

      <div className={styles.info}>
        End-Wall Cabinet Incubator v4.0
        <br />
        <span className={styles.infoSmall}>CFD SolidWorks Flow Simulation</span>
      </div>

      <div className={styles.uiContainer}>
        <div className={styles.panel}>
          <div className={styles.panelTitle}>System Controls</div>

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
        </div>

        <div className={styles.panel}>
          <div className={styles.panelTitle}>Analysis Views</div>

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
            Internal: Inlet Jet
          </button>

          <button
            type="button"
            className={cx(styles.button, styles.cameraBtn)}
            onClick={() => moveCamera(0, 750, 900, 0, 750, 1200)}
          >
            Internal: Exhaust Pull
          </button>

          <div className={styles.panelTitle} style={{ marginTop: 10 }}>Export</div>
          <div className={styles.captureGroup}>
            <button
              type="button"
              className={cx(styles.button, styles.captureBtn)}
              onClick={capture}
            >
              📷 Snap 4K
            </button>

            <button
              type="button"
              className={cx(
                styles.button,
                styles.recordBtn,
                controlState.isRecording && styles.recordingPulse,
              )}
              onClick={toggleRecording}
            >
              {controlState.isRecording ? "🛑 Stop" : "🎥 Video HQ"}
            </button>
          </div>
        </div>
      </div>

      <div className={styles.legendBox}>
        <strong className={styles.legendStrong}>Simulation Status</strong>
        <div className={styles.legendItem}>
          <span className={cx(styles.dot, styles.dotCyan)} />AHU Suction Pipe
        </div>
        <div className={styles.legendItem}>
          <span className={cx(styles.dot, styles.dotOrange)} />Conditioned Delivery
        </div>
        <div className={styles.legendItem}>
          <span className={cx(styles.dot, styles.dotGray)} />Exhaust Manifold
        </div>

        <strong className={styles.legendStrongSmall}>CFD Chamber Velocity</strong>
        <div className={styles.cfdScale} />
        <div className={styles.cfdLabels}>
          <span>Low (Stagnant)</span>
          <span>High (Jet)</span>
        </div>
      </div>
    </div>
  );
}

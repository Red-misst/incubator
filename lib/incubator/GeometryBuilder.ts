import * as THREE from "three";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { IncubatorMaterials } from "./materials";
import { CfdSystem } from "./CfdSystem";
import { FlowPath, FlowType, Particle, SceneRefs } from "./types";

// Cabinet constants shared across build functions
const CAB_L = 1200;
const CAB_H = 1000;
const CAB_W = 500;
const WALL_THICKNESS = 100;
const INS_THICKNESS = 50;

/**
 * Builds all static and dynamic scene geometry, returns refs needed by the
 * controller for animation and toggle logic.
 */
export function buildScene(
  scene: THREE.Scene,
  mats: IncubatorMaterials,
  cfd: CfdSystem,
): SceneRefs {
  const flowPaths: FlowPath[] = [];
  const fans: THREE.Group[] = [];
  const doorPivots: THREE.Group[] = [];
  const dynamicEggTrays: DynamicEggGroups[] = [];

  // ------------------------------------------------------------------ helpers

  function createComponent(
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    x: number,
    y: number,
    z: number,
    name: string,
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.userData.name = name;
    scene.add(mesh);
    return mesh;
  }

  function createCurvedPipe(
    startPt: THREE.Vector3,
    controlPt1: THREE.Vector3,
    controlPt2: THREE.Vector3,
    endPt: THREE.Vector3,
    radius: number,
    flowType: FlowType | null = null,
    isInternal = false,
  ): THREE.Mesh {
    const curve = new THREE.CubicBezierCurve3(startPt, controlPt1, controlPt2, endPt);
    const geo = new THREE.TubeGeometry(curve, 128, radius, 32, false);
    const mesh = new THREE.Mesh(geo, isInternal ? mats.MAT_PIPE_INTERNAL : mats.MAT_PIPE);
    scene.add(mesh);
    if (flowType) {
      flowPaths.push({ curve, type: flowType });
    }
    return mesh;
  }

  function addFanBlades(fanMesh: THREE.Object3D): void {
    const bladeGeo = new THREE.BoxGeometry(36, 5, 2);
    const blade1 = new THREE.Mesh(bladeGeo, mats.MAT_FAN_BLADE);
    const blade2 = new THREE.Mesh(bladeGeo, mats.MAT_FAN_BLADE);
    blade2.rotation.y = Math.PI / 2;
    const hub = new THREE.Group();
    hub.add(blade1);
    hub.add(blade2);
    hub.rotation.x = Math.PI / 2;
    fanMesh.add(hub);
    fans.push(hub);
  }

  // -------------------------------------------------------------- main shell

  const wallGeo = new THREE.BoxGeometry(CAB_W, CAB_H, WALL_THICKNESS);
  const wallFrame = new THREE.Mesh(wallGeo, mats.MAT_WALL_FRAME);
  wallFrame.position.set(0, CAB_H / 2, -WALL_THICKNESS / 2);
  scene.add(wallFrame);

  const bodyGeo = new THREE.BoxGeometry(CAB_W, CAB_H, CAB_L);
  const bodyGlass = new THREE.Mesh(bodyGeo, mats.MAT_BODY_GLASS);
  bodyGlass.position.set(0, CAB_H / 2, CAB_L / 2);
  scene.add(bodyGlass);

  const bodyEdges = new THREE.EdgesGeometry(bodyGeo);
  const bodyLines = new THREE.LineSegments(bodyEdges, mats.MAT_CHAMBER_FRAME);
  bodyLines.position.set(0, CAB_H / 2, CAB_L / 2);
  scene.add(bodyLines);

  // ---------------------------------------------------------- insulated shell

  const wallGroup = new THREE.Group();
  scene.add(wallGroup);

  const TOTAL_LEN = CAB_L + WALL_THICKNESS + INS_THICKNESS;
  const ASSEMBLY_CENTER_Z = (CAB_L - WALL_THICKNESS + INS_THICKNESS) / 2;

  const farWall = new THREE.Mesh(
    new THREE.BoxGeometry(CAB_W + INS_THICKNESS * 2, CAB_H + INS_THICKNESS * 2, INS_THICKNESS),
    mats.MAT_OPAQUE_WALL,
  );
  farWall.position.set(0, CAB_H / 2, CAB_L + INS_THICKNESS / 2);
  wallGroup.add(farWall);

  const sideWallGeo = new THREE.BoxGeometry(INS_THICKNESS, CAB_H + INS_THICKNESS * 2, TOTAL_LEN);
  const leftWall = new THREE.Mesh(sideWallGeo, mats.MAT_OPAQUE_WALL);
  leftWall.position.set(-CAB_W / 2 - INS_THICKNESS / 2, CAB_H / 2, ASSEMBLY_CENTER_Z);
  wallGroup.add(leftWall);

  const roofGeo = new THREE.BoxGeometry(CAB_W + INS_THICKNESS * 2, INS_THICKNESS, TOTAL_LEN);
  const roof = new THREE.Mesh(roofGeo, mats.MAT_OPAQUE_WALL);
  roof.position.set(0, CAB_H + INS_THICKNESS / 2, ASSEMBLY_CENTER_Z);
  wallGroup.add(roof);

  const floor = new THREE.Mesh(roofGeo, mats.MAT_OPAQUE_WALL);
  floor.position.set(0, -INS_THICKNESS / 2, ASSEMBLY_CENTER_Z);
  wallGroup.add(floor);

  const ahuSkin = new THREE.Mesh(new THREE.BoxGeometry(CAB_W, CAB_H, 5), mats.MAT_OPAQUE_WALL);
  ahuSkin.position.set(0, CAB_H / 2, -WALL_THICKNESS - 2.5);
  wallGroup.add(ahuSkin);

  // ------------------------------------------------------- electrical channel

  const staticGroup = new THREE.Group();
  scene.add(staticGroup);

  const ELEC_Y = 968.75;
  const ELEC_W = 200;
  const ELEC_L = 300;
  const ELEC_H = 40;
  const GAP_H = 62.5;
  const GAP_Z_CENTER = CAB_L / 2;

  const elecBox = new THREE.Mesh(
    new THREE.BoxGeometry(ELEC_W, ELEC_H, ELEC_L),
    mats.MAT_ELEC,
  );
  elecBox.position.set(0, ELEC_Y, GAP_Z_CENTER);
  staticGroup.add(elecBox);

  const padLeftGeo = new THREE.BoxGeometry((CAB_W - ELEC_W) / 2, GAP_H, CAB_L);
  const padLeft = new THREE.Mesh(padLeftGeo, mats.MAT_PADDING);
  padLeft.position.set(-((CAB_W / 2 + ELEC_W / 2) / 2), ELEC_Y, GAP_Z_CENTER);
  staticGroup.add(padLeft);
  const padRight = new THREE.Mesh(padLeftGeo, mats.MAT_PADDING);
  padRight.position.set((CAB_W / 2 + ELEC_W / 2) / 2, ELEC_Y, GAP_Z_CENTER);
  staticGroup.add(padRight);

  const frontLen = (CAB_L - ELEC_L) / 2;
  const padFrontGeo = new THREE.BoxGeometry(ELEC_W, GAP_H, frontLen);
  const padFront = new THREE.Mesh(padFrontGeo, mats.MAT_PADDING);
  padFront.position.set(0, ELEC_Y, frontLen / 2);
  staticGroup.add(padFront);
  const padBack = new THREE.Mesh(padFrontGeo, mats.MAT_PADDING);
  padBack.position.set(0, ELEC_Y, CAB_L - frontLen / 2);
  staticGroup.add(padBack);

  // ----------------------------------------------------- intake AHU / fans

  const WALL_Z = -WALL_THICKNESS / 2;
  const FAN_RAD = 20;
  const PIPE_RAD = 8;
  const CHAMBER_SIZE = 50;
  const FAN_Y = 950;
  const FAN_X_OFFSET = CAB_W / 2 - 80;
  const PLENUM_W = 60;
  const PLENUM_H = 60;
  const PLENUM_D = WALL_THICKNESS * 0.75;

  createComponent(
    new THREE.BoxGeometry(PLENUM_W, PLENUM_H, PLENUM_D),
    mats.MAT_PLENUM,
    -FAN_X_OFFSET,
    FAN_Y,
    WALL_Z,
    "Plenum Left",
  );
  createComponent(
    new THREE.BoxGeometry(PLENUM_W, PLENUM_H, PLENUM_D),
    mats.MAT_PLENUM,
    FAN_X_OFFSET,
    FAN_Y,
    WALL_Z,
    "Plenum Right",
  );

  const FAN_THICKNESS = 60;
  const FAN_Z_POS = WALL_Z - PLENUM_D / 2 - FAN_THICKNESS / 2 - 2;
  const fanGeo = new THREE.CylinderGeometry(FAN_RAD, FAN_RAD, FAN_THICKNESS, 64);

  const fan1 = createComponent(fanGeo, mats.MAT_FAN_HOUSING, -FAN_X_OFFSET, FAN_Y, FAN_Z_POS, "Fan Left");
  fan1.rotation.x = -Math.PI / 2;
  addFanBlades(fan1);

  const fan2 = createComponent(fanGeo, mats.MAT_FAN_HOUSING, FAN_X_OFFSET, FAN_Y, FAN_Z_POS, "Fan Right");
  fan2.rotation.x = -Math.PI / 2;
  addFanBlades(fan2);

  const createFanIntake = (xOffset: number) => {
    for (let i = 0; i < 15; i += 1) {
      const startAngle = Math.random() * Math.PI * 2;
      const startRadius = 60 + Math.random() * 40;
      const sz = FAN_Z_POS - 150 - Math.random() * 50;
      const sx = xOffset + Math.cos(startAngle) * startRadius;
      const sy = FAN_Y + Math.sin(startAngle) * startRadius;
      const endAngle = Math.random() * Math.PI * 2;
      const endRadius = Math.random() * (FAN_RAD - 2);
      const ex = xOffset + Math.cos(endAngle) * endRadius;
      const ey = FAN_Y + Math.sin(endAngle) * endRadius;
      const ez = FAN_Z_POS - 5;
      const midZ = (sz + ez) / 2;
      const mid = new THREE.Vector3(sx * 0.8 + xOffset * 0.2, sy * 0.8 + FAN_Y * 0.2, midZ);
      flowPaths.push({
        curve: new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(sx, sy, sz),
          mid,
          new THREE.Vector3(ex, ey, ez),
        ),
        type: "fan_in",
      });
    }
  };

  createFanIntake(-FAN_X_OFFSET);
  createFanIntake(FAN_X_OFFSET);

  const ductGeo = new THREE.CylinderGeometry(FAN_RAD - 2, FAN_RAD - 2, FAN_THICKNESS + 20, 64);
  const duct1 = createComponent(ductGeo, mats.MAT_PIPE, -FAN_X_OFFSET, FAN_Y, FAN_Z_POS + FAN_THICKNESS / 2, "Duct Left");
  duct1.rotation.x = -Math.PI / 2;
  const duct2 = createComponent(ductGeo, mats.MAT_PIPE, FAN_X_OFFSET, FAN_Y, FAN_Z_POS + FAN_THICKNESS / 2, "Duct Right");
  duct2.rotation.x = -Math.PI / 2;

  // ------------------------------------------------------- AHU conditioning

  const AHU_TOP_Y = 850;
  const PLENUM_BOTTOM_Y = FAN_Y - PLENUM_H / 2;

  createCurvedPipe(
    new THREE.Vector3(-FAN_X_OFFSET, PLENUM_BOTTOM_Y, WALL_Z),
    new THREE.Vector3(-FAN_X_OFFSET, PLENUM_BOTTOM_Y - 30, WALL_Z),
    new THREE.Vector3(0, AHU_TOP_Y + 50, WALL_Z),
    new THREE.Vector3(0, AHU_TOP_Y, WALL_Z),
    PIPE_RAD,
    "intake",
    false,
  );
  createCurvedPipe(
    new THREE.Vector3(FAN_X_OFFSET, PLENUM_BOTTOM_Y, WALL_Z),
    new THREE.Vector3(FAN_X_OFFSET, PLENUM_BOTTOM_Y - 30, WALL_Z),
    new THREE.Vector3(0, AHU_TOP_Y + 50, WALL_Z),
    new THREE.Vector3(0, AHU_TOP_Y, WALL_Z),
    PIPE_RAD,
    "intake",
    false,
  );

  const HUM_Y = AHU_TOP_Y - CHAMBER_SIZE / 2;
  const ahuBox = new THREE.BoxGeometry(CHAMBER_SIZE, CHAMBER_SIZE, CHAMBER_SIZE);
  createComponent(ahuBox, mats.MAT_HUMIDIFIER, 0, HUM_Y, WALL_Z, "Humidifier");

  const TRAP_START_Y = HUM_Y - CHAMBER_SIZE / 2;
  const TRAP_BOTTOM_1_Y = TRAP_START_Y - 60;
  const TRAP_TOP_2_Y = TRAP_START_Y - 20;
  const TRAP_END_Y = TRAP_START_Y - 150;
  const HEATER_X_OFFSET = 40;

  const trapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, TRAP_START_Y, WALL_Z),
    new THREE.Vector3(0, TRAP_BOTTOM_1_Y, WALL_Z),
    new THREE.Vector3(HEATER_X_OFFSET, TRAP_TOP_2_Y, WALL_Z),
    new THREE.Vector3(HEATER_X_OFFSET, TRAP_END_Y, WALL_Z),
  ]);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(trapCurve, 128, PIPE_RAD, 32, false), mats.MAT_TRAP));
  flowPaths.push({ curve: trapCurve, type: "trap" });

  const HEATER_SIZE = CHAMBER_SIZE;
  const HEATER_Y = TRAP_END_Y - HEATER_SIZE / 2;
  const heaterMesh = createComponent(
    ahuBox,
    mats.MAT_HEATER,
    HEATER_X_OFFSET,
    HEATER_Y,
    WALL_Z,
    "Heater",
  ) as THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial>;

  const HEATER_BOTTOM_Y = HEATER_Y - HEATER_SIZE / 2;
  const BRANCH_X = -CAB_W / 2 + 80;
  const BRANCH_Y = HEATER_BOTTOM_Y - 50;
  const BRANCH_Z = WALL_Z;

  createCurvedPipe(
    new THREE.Vector3(HEATER_X_OFFSET, HEATER_BOTTOM_Y, WALL_Z),
    new THREE.Vector3(HEATER_X_OFFSET, HEATER_BOTTOM_Y - 20, WALL_Z),
    new THREE.Vector3(BRANCH_X + 50, BRANCH_Y, WALL_Z),
    new THREE.Vector3(BRANCH_X, BRANCH_Y, WALL_Z),
    PIPE_RAD + 2,
    "conditioned",
    false,
  );

  // ----------------------------------------------------- compartments + doors

  const COMP_H = 375;
  const GAP = 125;
  const COMP_CENTERS = [250, 750];

  const O = mats.MAT_COMP_OUTER;
  const I = mats.MAT_COMP_INNER;
  const matsFloor = [O, O, I, O, O, O];
  const matsRoof = [O, O, O, I, O, O];
  const matsBackWall = [I, O, O, O, O, O];
  const matsNearWall = [O, O, O, O, I, O];

  const compWallGroup = new THREE.Group();
  scene.add(compWallGroup);

  const doorGroup = new THREE.Group();
  scene.add(doorGroup);

  const compFloorGeo = new THREE.BoxGeometry(CAB_W, 4, CAB_L);
  const compBackGeo = new THREE.BoxGeometry(4, COMP_H, CAB_L);
  const compEndGeo = new THREE.BoxGeometry(CAB_W, COMP_H, 4);
  const paddingGeo = new THREE.BoxGeometry(CAB_W, GAP, CAB_L);
  const eggGeo = new THREE.SphereGeometry(6, 64, 64);
  eggGeo.scale(1, 1.4, 1);

  COMP_CENTERS.forEach((yCenter, index) => {
    const compNum = COMP_CENTERS.length - index;

    // Floor / roof slabs
    const floorMesh = new THREE.Mesh(compFloorGeo, matsFloor);
    floorMesh.position.set(0, yCenter - COMP_H / 2, CAB_L / 2);
    staticGroup.add(floorMesh);

    const roofMesh = new THREE.Mesh(compFloorGeo, matsRoof);
    roofMesh.position.set(0, yCenter + COMP_H / 2, CAB_L / 2);
    staticGroup.add(roofMesh);

    if (index < COMP_CENTERS.length - 1) {
      const padding = new THREE.Mesh(paddingGeo, mats.MAT_PADDING);
      padding.position.set(0, yCenter + COMP_H / 2 + GAP / 2, CAB_L / 2);
      staticGroup.add(padding);
    }

    // Compartment walls (far, back, near)
    const cFar = new THREE.Mesh(compEndGeo, matsNearWall);
    cFar.position.set(0, yCenter, CAB_L - 2);
    compWallGroup.add(cFar);

    const cBack = new THREE.Mesh(compBackGeo, matsBackWall);
    cBack.position.set(-CAB_W / 2 + 2, yCenter, CAB_L / 2);
    compWallGroup.add(cBack);

    const cNear = new THREE.Mesh(compEndGeo, matsNearWall);
    cNear.position.set(0, yCenter, 2);
    compWallGroup.add(cNear);

    // Door pivot
    const pivot = new THREE.Group();
    pivot.position.set(CAB_W / 2, yCenter - COMP_H / 2, CAB_L / 2);
    doorGroup.add(pivot);
    doorPivots.push(pivot);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(10, COMP_H, CAB_L), mats.MAT_DOOR_FRAME);
    frame.position.set(0, COMP_H / 2, 0);
    pivot.add(frame);

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(12, COMP_H - 40, CAB_L - 40),
      mats.MAT_DOOR_GLASS,
    );
    glass.position.set(0, COMP_H / 2, 0);
    pivot.add(glass);

    // Roller rails + eggs
    const ROLLER_Y = yCenter - COMP_H / 2 + 20;
    const ROLLER_SPACING = 30;

    // Create a group that will physically rotate for the simulation
    const trayGroup = new THREE.Group();
    // The tray technically pivots around the center of the compartment
    const trayPivotZ = CAB_L / 2;
    const trayPivotY = ROLLER_Y;
    trayGroup.position.set(0, trayPivotY, trayPivotZ);
    staticGroup.add(trayGroup);

    dynamicEggTrays.push({
      group: trayGroup,
      py: trayPivotY,
      pz: trayPivotZ,
    });

    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(5, 10, CAB_L - 20), mats.MAT_FRAME);
    leftRail.position.set(-((CAB_W - 40) / 2) - 2.5, 0, 0); // local to pivot
    trayGroup.add(leftRail);

    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(5, 10, CAB_L - 20), mats.MAT_FRAME);
    rightRail.position.set((CAB_W - 40) / 2 + 2.5, 0, 0);
    trayGroup.add(rightRail);

    const rollerGeo = new THREE.CylinderGeometry(7.5, 7.5, CAB_W - 40, 32);
    const rollerCount = Math.floor(CAB_L / ROLLER_SPACING) - 2;

    for (let r = 0; r < rollerCount; r += 1) {
      const rollerZ = r * ROLLER_SPACING + 40;
      const roller = new THREE.Mesh(rollerGeo, mats.MAT_ROLLER);
      roller.position.set(0, 0, rollerZ - trayPivotZ); // internal to group
      roller.rotation.z = Math.PI / 2;
      trayGroup.add(roller);

      if (r < rollerCount - 1) {
        const midZ = (rollerZ + (r + 1) * ROLLER_SPACING + 40) / 2;
        const nestleY = ROLLER_Y + 5;
        const spacing = (CAB_W - 60) / 5;

        for (let e = 0; e < 5; e += 1) {
          const egg = new THREE.Mesh(eggGeo, mats.MAT_EGG);
          const px = -((CAB_W - 60) / 2) + spacing / 2 + spacing * e;
          const py = nestleY - trayPivotY;
          const pz = midZ - trayPivotZ;
          egg.position.set(px, py, pz);
          egg.rotation.z = (Math.random() - 0.5) * 0.2;
          egg.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.2;
          trayGroup.add(egg);

          // Note: we'll draw fluid boundaries dynamically per-frame in IncudatorSceneController
        }
      }
    }

    const motor = new THREE.Mesh(new THREE.CylinderGeometry(15, 15, 30, 32), mats.MAT_MOTOR);
    motor.position.set((CAB_W - 40) / 2 + 2.5 - 25, ROLLER_Y, CAB_L - 40);
    motor.rotation.z = Math.PI / 2;
    staticGroup.add(motor);

    // Conditioned air supply to this compartment
    const INTERNAL_PIPE_RAD = 12;
    const TARGET_Y = yCenter;
    const VALVE_X = BRANCH_X;

    createCurvedPipe(
      new THREE.Vector3(BRANCH_X, BRANCH_Y, BRANCH_Z),
      new THREE.Vector3(BRANCH_X - 10, (BRANCH_Y + TARGET_Y) / 2, BRANCH_Z),
      new THREE.Vector3(BRANCH_X - 10, (BRANCH_Y + TARGET_Y) / 2, BRANCH_Z),
      new THREE.Vector3(VALVE_X, TARGET_Y, BRANCH_Z),
      INTERNAL_PIPE_RAD,
      "conditioned",
      false,
    );

    const valve = createComponent(
      new THREE.CylinderGeometry(8, 8, 20, 32),
      mats.MAT_VALVE,
      VALVE_X,
      TARGET_Y,
      BRANCH_Z + 15,
      `Valve ${compNum}`,
    );
    valve.rotation.x = Math.PI / 2;

    const ENTRY_Z = 50;

    createCurvedPipe(
      new THREE.Vector3(VALVE_X, TARGET_Y, BRANCH_Z),
      new THREE.Vector3(VALVE_X, TARGET_Y, BRANCH_Z + 20),
      new THREE.Vector3(VALVE_X, TARGET_Y, ENTRY_Z - 10),
      new THREE.Vector3(VALVE_X, TARGET_Y, ENTRY_Z),
      INTERNAL_PIPE_RAD,
      "conditioned",
      true,
    );

    createCurvedPipe(
      new THREE.Vector3(VALVE_X, TARGET_Y, ENTRY_Z),
      new THREE.Vector3(VALVE_X + 50, TARGET_Y, ENTRY_Z + 20),
      new THREE.Vector3(-VALVE_X - 50, TARGET_Y, ENTRY_Z + 20),
      new THREE.Vector3(-VALVE_X, TARGET_Y, ENTRY_Z),
      INTERNAL_PIPE_RAD,
      "conditioned",
      true,
    );

    // CFD compartment particles
    cfd.initCompartment(yCenter, COMP_H, CAB_W);

    // Exhaust pickup
    const OUTLET_Z = CAB_L + INS_THICKNESS / 2;
    const EX_PIPE_Y = yCenter - 20;
    const MAIN_PIPE_X = 0;
    const PICKUP_Z = CAB_L - 30;

    createCurvedPipe(
      new THREE.Vector3(MAIN_PIPE_X, yCenter, OUTLET_Z),
      new THREE.Vector3(MAIN_PIPE_X, yCenter, OUTLET_Z - 20),
      new THREE.Vector3(MAIN_PIPE_X, EX_PIPE_Y, PICKUP_Z + 10),
      new THREE.Vector3(MAIN_PIPE_X, EX_PIPE_Y, PICKUP_Z),
      INTERNAL_PIPE_RAD,
      "exhaust",
      true,
    );

    const pickupBar = createComponent(
      new THREE.CylinderGeometry(INTERNAL_PIPE_RAD, INTERNAL_PIPE_RAD, CAB_W - 100, 32),
      mats.MAT_PIPE_INTERNAL,
      MAIN_PIPE_X,
      EX_PIPE_Y,
      PICKUP_Z,
      "Pickup Bar",
    );
    pickupBar.rotation.z = Math.PI / 2;

    const valveEx = createComponent(
      new THREE.CylinderGeometry(8, 8, 20, 32),
      mats.MAT_VALVE,
      MAIN_PIPE_X,
      yCenter,
      CAB_L + INS_THICKNESS / 2 + 10,
      `ExValve ${compNum}`,
    );
    valveEx.rotation.x = Math.PI / 2;
  });

  // ---------------------------------------------------- exhaust fan system

  const OUTLET_Z = CAB_L + INS_THICKNESS / 2;
  const EX_FAN_Y = 100;
  const EX_FAN_OFFSET_X = CAB_W / 2 - 80;
  const MAIN_PIPE_X = 0;
  const SPINE_BOT = EX_FAN_Y + 50;
  const BOTTOM_COMP_Y = COMP_CENTERS[0] - 20;

  flowPaths.push({
    curve: new THREE.LineCurve3(
      new THREE.Vector3(MAIN_PIPE_X, BOTTOM_COMP_Y, OUTLET_Z),
      new THREE.Vector3(MAIN_PIPE_X, SPINE_BOT, OUTLET_Z),
    ),
    type: "exhaust_spine",
  });

  createComponent(
    new THREE.BoxGeometry(PLENUM_W, PLENUM_H, INS_THICKNESS),
    mats.MAT_PLENUM,
    -EX_FAN_OFFSET_X,
    EX_FAN_Y,
    OUTLET_Z,
    "Exhaust Plenum Left",
  );
  createComponent(
    new THREE.BoxGeometry(PLENUM_W, PLENUM_H, INS_THICKNESS),
    mats.MAT_PLENUM,
    EX_FAN_OFFSET_X,
    EX_FAN_Y,
    OUTLET_Z,
    "Exhaust Plenum Right",
  );

  const exFanGeo = new THREE.CylinderGeometry(FAN_RAD, FAN_RAD, FAN_THICKNESS, 64);

  const exFan1 = createComponent(
    exFanGeo,
    mats.MAT_FAN_HOUSING,
    -EX_FAN_OFFSET_X,
    EX_FAN_Y,
    OUTLET_Z + 30,
    "ExFan 1",
  );
  exFan1.rotation.x = Math.PI / 2;
  addFanBlades(exFan1);

  const exFan2 = createComponent(
    exFanGeo,
    mats.MAT_FAN_HOUSING,
    EX_FAN_OFFSET_X,
    EX_FAN_Y,
    OUTLET_Z + 30,
    "ExFan 2",
  );
  exFan2.rotation.x = Math.PI / 2;
  addFanBlades(exFan2);

  const createFanExhaust = (xOffset: number) => {
    for (let i = 0; i < 15; i += 1) {
      const startAngle = Math.random() * Math.PI * 2;
      const startRadius = Math.random() * (FAN_RAD - 2);
      const startX = xOffset + Math.cos(startAngle) * startRadius;
      const startY = EX_FAN_Y + Math.sin(startAngle) * startRadius;
      const startZ = OUTLET_Z + 55;
      const endAngle = Math.random() * Math.PI * 2;
      const endRadius = 50 + Math.random() * 100;
      const endX = xOffset + Math.cos(endAngle) * endRadius;
      const endY = EX_FAN_Y + Math.sin(endAngle) * endRadius;
      const endZ = OUTLET_Z + 350;
      const mid = new THREE.Vector3(
        (startX + endX) / 2,
        (startY + endY) / 2,
        (startZ + endZ) / 2,
      );
      flowPaths.push({
        curve: new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(startX, startY, startZ),
          mid,
          new THREE.Vector3(endX, endY, endZ),
        ),
        type: "fan_out",
      });
    }
  };

  createFanExhaust(-EX_FAN_OFFSET_X);
  createFanExhaust(EX_FAN_OFFSET_X);

  const spineHeight = AHU_TOP_Y - SPINE_BOT;
  createComponent(
    new THREE.CylinderGeometry(10, 10, spineHeight, 32),
    mats.MAT_MANIFOLD,
    MAIN_PIPE_X,
    SPINE_BOT + spineHeight / 2,
    OUTLET_Z,
    "Exhaust Spine",
  );

  createCurvedPipe(
    new THREE.Vector3(MAIN_PIPE_X, SPINE_BOT, OUTLET_Z),
    new THREE.Vector3(MAIN_PIPE_X, SPINE_BOT - 20, OUTLET_Z),
    new THREE.Vector3(-EX_FAN_OFFSET_X, EX_FAN_Y + 30, OUTLET_Z),
    new THREE.Vector3(-EX_FAN_OFFSET_X, EX_FAN_Y + PLENUM_H / 2, OUTLET_Z),
    PIPE_RAD,
    "exhaust",
    false,
  );
  createCurvedPipe(
    new THREE.Vector3(MAIN_PIPE_X, SPINE_BOT, OUTLET_Z),
    new THREE.Vector3(MAIN_PIPE_X, SPINE_BOT - 20, OUTLET_Z),
    new THREE.Vector3(EX_FAN_OFFSET_X, EX_FAN_Y + 30, OUTLET_Z),
    new THREE.Vector3(EX_FAN_OFFSET_X, EX_FAN_Y + PLENUM_H / 2, OUTLET_Z),
    PIPE_RAD,
    "exhaust",
    false,
  );

  return {
    wallGroup,
    compWallGroup,
    doorGroup,
    staticGroup,
    labelGroup: buildLabels(scene, mats),
    doorPivots,
    fans,
    flowPaths,
    heaterMesh,
  };
}

/** Async font-based labels — returns the group immediately; meshes are added once the font loads. */
function buildLabels(scene: THREE.Scene, mats: IncubatorMaterials): THREE.Group {
  const labelGroup = new THREE.Group();
  scene.add(labelGroup);

  const loader = new FontLoader();
  loader.load(
    "https://threejs.org/examples/fonts/helvetiker_regular.typeface.json",
    (font) => {
      const addLabel = (text: string, x: number, y: number, z: number, rotY = 0) => {
        const geo = new TextGeometry(text, { font, size: 40, depth: 2 });
        const mesh = new THREE.Mesh(geo, mats.MAT_TEXT);
        mesh.position.set(x, y, z);
        mesh.rotation.y = rotY;
        labelGroup.add(mesh);
      };

      addLabel("FRONT (DOORS)", 300, 500, 600, Math.PI / 2);
      addLabel("AHU (INTAKE)", -300, 1100, -100);
      addLabel("OUTLET END", -300, 1100, 1250);
    },
  );

  return labelGroup;
}


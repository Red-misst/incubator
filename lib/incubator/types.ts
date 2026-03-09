import * as THREE from "three";

export type FlowType =
  | "intake"
  | "fan_in"
  | "conditioned"
  | "trap"
  | "exhaust"
  | "exhaust_spine"
  | "fan_out";

export type FlowPath = {
  curve: THREE.Curve<THREE.Vector3>;
  type: FlowType;
};

export type Particle = {
  mesh: THREE.Mesh;
  curve: THREE.Curve<THREE.Vector3>;
  type: FlowType;
  progress: number;
  speed: number;
};

export type CfdPointSystem = THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> & {
  userData: {
    life: Float32Array;
    yCenter: number;
    compH: number;
    cabW: number;
  };
};

export type SceneState = {
  shellVisible: boolean;
  compVisible: boolean;
  doorsOpen: boolean;
  labelsVisible: boolean;
  systemOn: boolean;
  isRecording: boolean;
};

export type DynamicEggGroups = {
  group: THREE.Group; // Static frame
  racks: THREE.Group[]; // Individual tilting planks
  py: number;
  pz: number;
};

export type SceneRefs = {
  wallGroup: THREE.Group;
  compWallGroup: THREE.Group;
  doorGroup: THREE.Group;
  labelGroup: THREE.Group;
  staticGroup: THREE.Group;
  doorPivots: THREE.Group[];
  fans: THREE.Group[];
  flowPaths: FlowPath[];
  dynamicEggTrays: DynamicEggGroups[]; // Now contains list of racks
  heaterMesh: THREE.Mesh<THREE.BoxGeometry, THREE.MeshStandardMaterial> | null;
};

import * as THREE from "three";

export interface IncubatorMaterials {
  MAT_FAN_HOUSING: THREE.MeshStandardMaterial;
  MAT_FAN_BLADE: THREE.MeshStandardMaterial;
  MAT_PIPE: THREE.MeshStandardMaterial;
  MAT_PIPE_INTERNAL: THREE.MeshStandardMaterial;
  MAT_HUMIDIFIER: THREE.MeshStandardMaterial;
  MAT_HEATER: THREE.MeshStandardMaterial;
  MAT_MANIFOLD: THREE.MeshStandardMaterial;
  MAT_VALVE: THREE.MeshStandardMaterial;
  MAT_TRAP: THREE.MeshStandardMaterial;
  MAT_PLENUM: THREE.MeshStandardMaterial;
  MAT_WALL_FRAME: THREE.MeshBasicMaterial;
  MAT_BODY_GLASS: THREE.MeshStandardMaterial;
  MAT_CHAMBER_FRAME: THREE.LineBasicMaterial;
  MAT_PADDING: THREE.MeshStandardMaterial;
  MAT_ROLLER: THREE.MeshStandardMaterial;
  MAT_FRAME: THREE.MeshStandardMaterial;
  MAT_MOTOR: THREE.MeshStandardMaterial;
  MAT_OPAQUE_WALL: THREE.MeshStandardMaterial;
  MAT_COMP_INNER: THREE.MeshStandardMaterial;
  MAT_COMP_OUTER: THREE.MeshStandardMaterial;
  MAT_DOOR_FRAME: THREE.MeshStandardMaterial;
  MAT_DOOR_GLASS: THREE.MeshStandardMaterial;
  MAT_TEXT: THREE.MeshBasicMaterial;
  MAT_EGG: THREE.MeshStandardMaterial;
  MAT_ELEC: THREE.MeshStandardMaterial;
}

export function createMaterials(): IncubatorMaterials {
  return {
    MAT_FAN_HOUSING: new THREE.MeshStandardMaterial({
      color: 0xef4444,
      metalness: 0.3,
      roughness: 0.4,
    }),

    MAT_FAN_BLADE: new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
    }),

    MAT_PIPE: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.4,
      roughness: 0.5,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),

    MAT_PIPE_INTERNAL: new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.5,
      roughness: 0.5,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),

    MAT_HUMIDIFIER: new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      metalness: 0.1,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    }),

    MAT_HEATER: new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      metalness: 0.3,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      emissive: new THREE.Color(0xfbbf24),
      emissiveIntensity: 0.2,
    }),

    MAT_MANIFOLD: new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.5,
      roughness: 0.5,
    }),

    MAT_VALVE: new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      metalness: 0.6,
      roughness: 0.3,
    }),

    MAT_TRAP: new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      metalness: 0.4,
      roughness: 0.4,
    }),

    MAT_PLENUM: new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.2,
      roughness: 0.7,
    }),

    MAT_WALL_FRAME: new THREE.MeshBasicMaterial({
      color: 0x64748b,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),

    MAT_BODY_GLASS: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.1,
      roughness: 0.1,
      transparent: true,
      opacity: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),

    MAT_CHAMBER_FRAME: new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    }),

    MAT_PADDING: new THREE.MeshStandardMaterial({
      color: 0x374151,
      metalness: 0.1,
      roughness: 0.9,
    }),

    MAT_ROLLER: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.1,
      roughness: 0.9,
    }),

    MAT_FRAME: new THREE.MeshStandardMaterial({
      color: 0xffea00,
      metalness: 0.1,
      roughness: 0.6,
    }),

    MAT_MOTOR: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.6,
      roughness: 0.4,
    }),

    MAT_OPAQUE_WALL: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.1,
      roughness: 0.8,
    }),

    MAT_COMP_INNER: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.8,
    }),

    MAT_COMP_OUTER: new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      metalness: 0.1,
      roughness: 0.6,
    }),

    MAT_DOOR_FRAME: new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.3,
      roughness: 0.5,
    }),

    MAT_DOOR_GLASS: new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      metalness: 0.1,
      roughness: 0,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),

    MAT_TEXT: new THREE.MeshBasicMaterial({ color: 0xffffff }),

    MAT_EGG: new THREE.MeshStandardMaterial({
      color: 0xeebb99,
      roughness: 0.5,
      metalness: 0,
    }),

    MAT_ELEC: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.3,
    }),
  };
}

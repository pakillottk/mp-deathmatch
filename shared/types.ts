export type WeaponId = "pistol" | "smg" | "shotgun";

export interface InputPayload {
  seq: number;
  left: boolean;
  right: boolean;
  jump: boolean;
  jetpack: boolean;
  shoot: boolean;
  mouseAngle: number; // radianes, 0 = derecha, PI/2 = abajo
}

export interface WeaponConfig {
  id: WeaponId;
  damage: number;
  fireRateMs: number;   // ms entre disparos
  pellets: number;      // escopeta = 6, resto = 1
  spreadRad: number;    // dispersion en radianes
  ammoMax: number;
  reloadMs: number;
  isAutomatic: boolean;
}

export const WEAPONS: Record<WeaponId, WeaponConfig> = {
  pistol: {
    id: "pistol",
    damage: 35,
    fireRateMs: 450,
    pellets: 1,
    spreadRad: 0.03,
    ammoMax: 12,
    reloadMs: 1200,
    isAutomatic: false,
  },
  smg: {
    id: "smg",
    damage: 14,
    fireRateMs: 100,
    pellets: 1,
    spreadRad: 0.07,
    ammoMax: 30,
    reloadMs: 1800,
    isAutomatic: true,
  },
  shotgun: {
    id: "shotgun",
    damage: 18,
    fireRateMs: 900,
    pellets: 6,
    spreadRad: 0.25,
    ammoMax: 6,
    reloadMs: 2200,
    isAutomatic: false,
  },
};

// Segmento de linea del mapa de colisiones
export interface MapSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Plataforma visual + colision
export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Punto de respawn
export interface SpawnPoint {
  x: number;
  y: number;
}

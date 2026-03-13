import { Platform, SpawnPoint } from "../../../shared/types";
// MAP_WIDTH, MAP_HEIGHT used implicitly by platform definitions

// Las plataformas definen tanto la geometria visual como la colision.
// Cada plataforma es un rectangulo solido: el jugador colisiona desde arriba (suelo),
// abajo (techo) y lados (paredes).

export const PLATFORMS: Platform[] = [
  // Suelo principal (izquierda)
  { x: 0,    y: 830, w: 600,  h: 70 },
  // Suelo principal (derecha)
  { x: 1800, y: 830, w: 600,  h: 70 },
  // Plataforma inferior central
  { x: 900,  y: 830, w: 600,  h: 70 },

  // Plataformas de nivel medio
  { x: 100,  y: 640, w: 320,  h: 20 },
  { x: 600,  y: 580, w: 200,  h: 20 },
  { x: 1000, y: 620, w: 400,  h: 20 },
  { x: 1600, y: 580, w: 200,  h: 20 },
  { x: 1980, y: 640, w: 320,  h: 20 },

  // Plataformas de nivel alto
  { x: 200,  y: 430, w: 260,  h: 20 },
  { x: 650,  y: 390, w: 180,  h: 20 },
  { x: 1100, y: 410, w: 200,  h: 20 },
  { x: 1570, y: 390, w: 180,  h: 20 },
  { x: 1940, y: 430, w: 260,  h: 20 },

  // Plataforma central alta (punto caliente del mapa)
  { x: 950,  y: 300, w: 500,  h: 20 },

  // Techo / plataformas muy altas
  { x: 400,  y: 200, w: 160,  h: 20 },
  { x: 1840, y: 200, w: 160,  h: 20 },

  // Paredes laterales
  { x: 0,    y: 0,   w: 30,   h: 900 },
  { x: 2370, y: 0,   w: 30,   h: 900 },
];

export const SPAWN_POINTS: SpawnPoint[] = [
  { x: 150,  y: 790 },
  { x: 450,  y: 790 },
  { x: 950,  y: 790 },
  { x: 1250, y: 790 },
  { x: 1950, y: 790 },
  { x: 2250, y: 790 },
  { x: 260,  y: 390 },
  { x: 730,  y: 350 },
  { x: 1200, y: 370 },
  { x: 1660, y: 350 },
  { x: 2070, y: 390 },
  { x: 1200, y: 260 },
];

// Comprueba si un AABB (jugador) colisiona con una plataforma
// Devuelve informacion de colision para resolver penetracion
export interface CollisionResult {
  collides: boolean;
  overlapX: number;
  overlapY: number;
  fromTop: boolean;
  fromBottom: boolean;
  fromLeft: boolean;
  fromRight: boolean;
}

export function checkAABB(
  px: number, py: number, pw: number, ph: number,
  plat: Platform
): CollisionResult {
  const result: CollisionResult = {
    collides: false,
    overlapX: 0,
    overlapY: 0,
    fromTop: false,
    fromBottom: false,
    fromLeft: false,
    fromRight: false,
  };

  // px,py son la esquina superior-izquierda del jugador
  const overlapX = Math.min(px + pw, plat.x + plat.w) - Math.max(px, plat.x);
  const overlapY = Math.min(py + ph, plat.y + plat.h) - Math.max(py, plat.y);

  if (overlapX <= 0 || overlapY <= 0) return result;

  result.collides = true;
  result.overlapX = overlapX;
  result.overlapY = overlapY;

  if (overlapX < overlapY) {
    result.fromLeft  = px + pw / 2 < plat.x + plat.w / 2;
    result.fromRight = !result.fromLeft;
  } else {
    result.fromTop    = py + ph / 2 < plat.y + plat.h / 2;
    result.fromBottom = !result.fromTop;
  }

  return result;
}

// Resuelve un raycast (origen + direccion) contra todas las plataformas.
// Devuelve la distancia al impacto mas cercano, o Infinity si no hay impacto.
export function raycastPlatforms(
  ox: number, oy: number,
  dx: number, dy: number,
  maxDist: number
): number {
  let nearest = maxDist;

  for (const p of PLATFORMS) {
    // Comprueba las 4 aristas de la plataforma
    const edges = [
      // top
      { x1: p.x, y1: p.y,        x2: p.x + p.w, y2: p.y },
      // bottom
      { x1: p.x, y1: p.y + p.h,  x2: p.x + p.w, y2: p.y + p.h },
      // left
      { x1: p.x, y1: p.y,        x2: p.x,        y2: p.y + p.h },
      // right
      { x1: p.x + p.w, y1: p.y,  x2: p.x + p.w,  y2: p.y + p.h },
    ];

    for (const e of edges) {
      const t = raySegmentIntersect(ox, oy, dx, dy, e.x1, e.y1, e.x2, e.y2);
      if (t !== null && t >= 0 && t < nearest) {
        nearest = t;
      }
    }
  }

  return nearest;
}

// Interseccion rayo-segmento. Devuelve t (distancia) o null si no hay interseccion.
function raySegmentIntersect(
  rx: number, ry: number, rdx: number, rdy: number,
  x1: number, y1: number, x2: number, y2: number
): number | null {
  const ex = x2 - x1;
  const ey = y2 - y1;
  const denom = rdx * ey - rdy * ex;
  if (Math.abs(denom) < 1e-10) return null;

  const diffX = x1 - rx;
  const diffY = y1 - ry;
  const t = (diffX * ey - diffY * ex) / denom;
  const u = (diffX * rdy - diffY * rdx) / denom;

  if (t >= 0 && u >= 0 && u <= 1) {
    return t;
  }
  return null;
}

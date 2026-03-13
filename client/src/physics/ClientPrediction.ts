import {
  GRAVITY, MOVE_SPEED, JUMP_VY, JETPACK_FORCE,
  JETPACK_DRAIN, JETPACK_REGEN, MAX_FALL_SPEED,
  PLAYER_W, PLAYER_H, JETPACK_MAX_FUEL, MAP_WIDTH,
} from "shared/constants";
import { InputPayload } from "shared/types";

export interface PredictedState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  fuel: number;
  onGround: boolean;
}

// Plataformas duplicadas del servidor para la prediccion del cliente.
// Deben mantenerse sincronizadas con server/src/physics/CollisionMap.ts
const PLATFORMS = [
  { x: 0,    y: 830, w: 600,  h: 70 },
  { x: 1800, y: 830, w: 600,  h: 70 },
  { x: 900,  y: 830, w: 600,  h: 70 },
  { x: 100,  y: 640, w: 320,  h: 20 },
  { x: 600,  y: 580, w: 200,  h: 20 },
  { x: 1000, y: 620, w: 400,  h: 20 },
  { x: 1600, y: 580, w: 200,  h: 20 },
  { x: 1980, y: 640, w: 320,  h: 20 },
  { x: 200,  y: 430, w: 260,  h: 20 },
  { x: 650,  y: 390, w: 180,  h: 20 },
  { x: 1100, y: 410, w: 200,  h: 20 },
  { x: 1570, y: 390, w: 180,  h: 20 },
  { x: 1940, y: 430, w: 260,  h: 20 },
  { x: 950,  y: 300, w: 500,  h: 20 },
  { x: 400,  y: 200, w: 160,  h: 20 },
  { x: 1840, y: 200, w: 160,  h: 20 },
  { x: 0,    y: 0,   w: 30,   h: 900 },
  { x: 2370, y: 0,   w: 30,   h: 900 },
];

export function predictStep(
  state: PredictedState,
  input: InputPayload,
  dt: number
): PredictedState {
  const next: PredictedState = { ...state };

  // Movimiento horizontal
  next.vx = 0;
  if (input.left)  next.vx -= MOVE_SPEED;
  if (input.right) next.vx += MOVE_SPEED;

  // Gravedad
  next.vy += GRAVITY * dt;

  // Jetpack
  if (input.jetpack && next.fuel > 0) {
    next.vy += JETPACK_FORCE * dt;
    next.fuel = Math.max(0, next.fuel - JETPACK_DRAIN * dt);
  } else if (next.onGround) {
    next.fuel = Math.min(JETPACK_MAX_FUEL, next.fuel + JETPACK_REGEN * dt);
  }

  // Salto
  if (input.jump && next.onGround) {
    next.vy = JUMP_VY;
    next.onGround = false;
  }

  if (next.vy > MAX_FALL_SPEED) next.vy = MAX_FALL_SPEED;

  next.x += next.vx * dt;
  next.y += next.vy * dt;

  resolveCollisions(next);

  return next;
}

function resolveCollisions(s: PredictedState): void {
  s.onGround = false;

  for (let iter = 0; iter < 3; iter++) {
    let resolved = false;

    for (const plat of PLATFORMS) {
      const ox = Math.min(s.x + PLAYER_W, plat.x + plat.w) - Math.max(s.x, plat.x);
      const oy = Math.min(s.y + PLAYER_H, plat.y + plat.h) - Math.max(s.y, plat.y);
      if (ox <= 0 || oy <= 0) continue;

      if (ox < oy) {
        if (s.x + PLAYER_W / 2 < plat.x + plat.w / 2) {
          s.x -= ox; s.vx = 0;
        } else {
          s.x += ox; s.vx = 0;
        }
      } else {
        if (s.y + PLAYER_H / 2 < plat.y + plat.h / 2) {
          s.y -= oy;
          if (s.vy > 0) s.vy = 0;
          s.onGround = true;
        } else {
          s.y += oy;
          if (s.vy < 0) s.vy = 0;
        }
      }
      resolved = true;
    }

    if (!resolved) break;
  }

  if (s.x < 0) { s.x = 0; s.vx = 0; }
  if (s.x + PLAYER_W > MAP_WIDTH) { s.x = MAP_WIDTH - PLAYER_W; s.vx = 0; }
}

// Reconciliacion: suaviza la diferencia entre prediccion y estado autorizado
export function reconcile(
  predicted: PredictedState,
  authoritative: { x: number; y: number }
): PredictedState {
  const dx = authoritative.x - predicted.x;
  const dy = authoritative.y - predicted.y;
  const distSq = dx * dx + dy * dy;

  if (distSq > 10000) {
    // Diferencia grande: teletransportar directamente
    return { ...predicted, x: authoritative.x, y: authoritative.y };
  } else if (distSq > 4) {
    // Diferencia pequena: interpolar suavemente
    return {
      ...predicted,
      x: predicted.x + dx * 0.3,
      y: predicted.y + dy * 0.3,
    };
  }

  return predicted;
}

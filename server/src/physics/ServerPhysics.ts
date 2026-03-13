import { PlayerState } from "../schema/PlayerState";
import { InputPayload, WEAPONS } from "../../../shared/types";
import {
  GRAVITY, MOVE_SPEED, JUMP_VY, JETPACK_FORCE,
  JETPACK_DRAIN, JETPACK_REGEN, MAX_FALL_SPEED,
  PLAYER_W, PLAYER_H, JETPACK_MAX_FUEL,
} from "../../../shared/constants";
import { PLATFORMS, checkAABB } from "./CollisionMap";

export function stepPlayer(
  player: PlayerState,
  input: InputPayload,
  dt: number  // segundos
): void {
  if (!player.alive) return;

  // --- Movimiento horizontal ---
  let vx = 0;
  if (input.left)  vx -= MOVE_SPEED;
  if (input.right) vx += MOVE_SPEED;
  player.vx = vx;
  if (vx !== 0) player.facingRight = vx > 0;

  // --- Angulo del arma ---
  player.angle = input.mouseAngle;

  // --- Gravedad ---
  player.vy += GRAVITY * dt;

  // --- Jetpack ---
  if (input.jetpack && player.fuel > 0) {
    player.vy += JETPACK_FORCE * dt;
    player.fuel = Math.max(0, player.fuel - JETPACK_DRAIN * dt);
  } else if (player.onGround) {
    player.fuel = Math.min(JETPACK_MAX_FUEL, player.fuel + JETPACK_REGEN * dt);
  }

  // --- Salto ---
  if (input.jump && player.onGround) {
    player.vy = JUMP_VY;
    player.onGround = false;
  }

  // --- Limitar velocidad de caida ---
  if (player.vy > MAX_FALL_SPEED) player.vy = MAX_FALL_SPEED;

  // --- Integrar posicion ---
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  // --- Resolver colisiones ---
  resolveCollisions(player);
}

function resolveCollisions(player: PlayerState): void {
  player.onGround = false;

  for (let iter = 0; iter < 3; iter++) {
    let resolved = false;

    for (const plat of PLATFORMS) {
      const r = checkAABB(player.x, player.y, PLAYER_W, PLAYER_H, plat);
      if (!r.collides) continue;

      if (r.fromTop) {
        player.y -= r.overlapY;
        if (player.vy > 0) player.vy = 0;
        player.onGround = true;
      } else if (r.fromBottom) {
        player.y += r.overlapY;
        if (player.vy < 0) player.vy = 0;
      } else if (r.fromLeft) {
        player.x -= r.overlapX;
        player.vx = 0;
      } else if (r.fromRight) {
        player.x += r.overlapX;
        player.vx = 0;
      }
      resolved = true;
    }

    if (!resolved) break;
  }

  // Limites del mapa
  if (player.x < 0) { player.x = 0; player.vx = 0; }
  if (player.x + PLAYER_W > 2400) { player.x = 2400 - PLAYER_W; player.vx = 0; }
  // Si cae fuera del mapa por abajo, respawn (tratado en la Room)
}

import { Room, Client } from "@colyseus/core";
import { GameState } from "../schema/GameState";
import { PlayerState } from "../schema/PlayerState";
import { BulletState } from "../schema/BulletState";
import { InputPayload, WEAPONS, WeaponId } from "../../../shared/types";
import {
  TICK_MS, KILL_LIMIT, MATCH_DURATION_S,
  MAX_PLAYERS, PLAYER_W, PLAYER_H, RESPAWN_MS,
} from "../../../shared/constants";
import { stepPlayer } from "../physics/ServerPhysics";
import { SPAWN_POINTS, raycastPlatforms } from "../physics/CollisionMap";

const BULLET_SPEED = 900;   // px/s para balas de pistola/smg
const MAX_BULLET_DIST = 2600;

interface PendingInput {
  input: InputPayload;
  receivedAt: number;
}

interface PlayerExtra {
  lastFireTime: number;
  reloadEndTime: number;
  respawnTimer: NodeJS.Timeout | null;
  inputQueue: PendingInput[];
}

export class DeathMatchRoom extends Room<GameState> {
  private extras = new Map<string, PlayerExtra>();
  private bulletCounter = 0;

  maxClients = MAX_PLAYERS;

  onCreate(_options: Record<string, unknown>): void {
    this.setState(new GameState());
    this.state.timeRemaining = MATCH_DURATION_S;

    // Game loop a tick rate fijo
    this.setSimulationInterval((dt) => this.gameLoop(dt), TICK_MS);

    // Temporizador de partida (cada 1s)
    this.clock.setInterval(() => {
      if (this.state.matchOver) return;
      this.state.timeRemaining = Math.max(0, this.state.timeRemaining - 1);
      if (this.state.timeRemaining <= 0) {
        this.endMatch();
      }
    }, 1000);

    // Mensajes del cliente
    this.onMessage("input", (client: Client, input: InputPayload) => {
      const extra = this.extras.get(client.sessionId);
      if (!extra) return;
      extra.inputQueue.push({ input, receivedAt: Date.now() });
    });

    this.onMessage("changeWeapon", (client: Client, weapon: WeaponId) => {
      const player = this.state.players.get(client.sessionId);
      if (!player || !player.alive) return;
      if (!WEAPONS[weapon]) return;
      player.weapon = weapon;
      player.ammo = WEAPONS[weapon].ammoMax;
      player.reloading = false;
    });
  }

  onJoin(client: Client, options: { name?: string }): void {
    const player = new PlayerState();
    player.name = (options?.name ?? "Soldier").substring(0, 20);

    const spawn = this.randomSpawn();
    player.x = spawn.x;
    player.y = spawn.y;
    player.alive = true;
    player.hp = 100;
    player.fuel = 100;

    this.state.players.set(client.sessionId, player);
    this.extras.set(client.sessionId, {
      lastFireTime: 0,
      reloadEndTime: 0,
      respawnTimer: null,
      inputQueue: [],
    });

    this.broadcast("playerJoined", { id: client.sessionId, name: player.name });
  }

  onLeave(client: Client): void {
    const extra = this.extras.get(client.sessionId);
    if (extra?.respawnTimer) clearTimeout(extra.respawnTimer);

    this.state.players.delete(client.sessionId);
    this.extras.delete(client.sessionId);
    this.broadcast("playerLeft", { id: client.sessionId });
  }

  private gameLoop(dt: number): void {
    if (this.state.matchOver) return;

    const dtSec = dt / 1000;

    this.state.players.forEach((player, sessionId) => {
      const extra = this.extras.get(sessionId);
      if (!extra || !player.alive) return;

      // Procesar inputs acumulados del cliente
      const inputs = extra.inputQueue.splice(0);
      if (inputs.length === 0) return;

      for (const { input } of inputs) {
        stepPlayer(player, input, dtSec / Math.max(inputs.length, 1));

        if (input.shoot) {
          this.handleShoot(sessionId, player, extra, input.mouseAngle);
        }
      }

      // Comprobar si el jugador cayo fuera del mapa
      if (player.y > 950) {
        this.killPlayer(sessionId, player, null);
      }
    });
  }

  private handleShoot(
    sessionId: string,
    player: PlayerState,
    extra: PlayerExtra,
    angle: number
  ): void {
    const now = Date.now();
    const weaponCfg = WEAPONS[player.weapon as WeaponId];
    if (!weaponCfg) return;

    // Comprueba cadencia
    if (now - extra.lastFireTime < weaponCfg.fireRateMs) return;

    // Comprueba recarga
    if (extra.reloadEndTime > now) return;

    // Comprueba municion
    if (player.ammo <= 0) {
      this.startReload(player, extra, weaponCfg);
      return;
    }

    extra.lastFireTime = now;
    player.ammo--;

    // Origen del disparo: centro-derecha del jugador
    const ox = player.x + PLAYER_W / 2;
    const oy = player.y + PLAYER_H / 2;

    // Disparar N pellets (escopeta = 6)
    for (let i = 0; i < weaponCfg.pellets; i++) {
      const spread = (Math.random() - 0.5) * weaponCfg.spreadRad * 2;
      const a = angle + spread;
      const dx = Math.cos(a);
      const dy = Math.sin(a);

      // Raycast contra el terreno
      const terrainDist = raycastPlatforms(ox, oy, dx, dy, MAX_BULLET_DIST);

      // Comprueba hit contra jugadores
      let hitPlayer: string | null = null;
      let hitDist = terrainDist;

      this.state.players.forEach((target, targetId) => {
        if (targetId === sessionId || !target.alive) return;

        const t = raycastAABB(ox, oy, dx, dy, target.x, target.y, PLAYER_W, PLAYER_H);
        if (t !== null && t < hitDist) {
          hitDist = t;
          hitPlayer = targetId;
        }
      });

      if (hitPlayer) {
        const target = this.state.players.get(hitPlayer)!;
        target.hp -= weaponCfg.damage;
        if (target.hp <= 0) {
          this.killPlayer(hitPlayer, target, sessionId);
        }
      } else {
        // Crear bala visual (solo si no es hitscan inmediato con hit)
        this.spawnBulletVisual(ox, oy, a, sessionId, player.weapon as WeaponId);
      }
    }

    // Auto-recarga si queda sin municion
    if (player.ammo <= 0) {
      this.startReload(player, extra, WEAPONS[player.weapon as WeaponId]);
    }
  }

  private spawnBulletVisual(
    x: number, y: number, angle: number,
    ownerId: string, weapon: WeaponId
  ): void {
    const b = new BulletState();
    b.id = `b${this.bulletCounter++}`;
    b.x = x;
    b.y = y;
    b.angle = angle;
    b.ownerId = ownerId;
    b.weapon = weapon;
    this.state.bullets.push(b);

    // Limpiar bala visual tras 100ms (solo decorativo, hit ya resuelto)
    this.clock.setTimeout(() => {
      const idx = this.state.bullets.findIndex((bl) => bl.id === b.id);
      if (idx >= 0) this.state.bullets.splice(idx, 1);
    }, 120);
  }

  private startReload(
    player: PlayerState,
    extra: PlayerExtra,
    weaponCfg: typeof WEAPONS[WeaponId]
  ): void {
    if (player.reloading) return;
    player.reloading = true;
    extra.reloadEndTime = Date.now() + weaponCfg.reloadMs;

    this.clock.setTimeout(() => {
      player.reloading = false;
      player.ammo = weaponCfg.ammoMax;
    }, weaponCfg.reloadMs);
  }

  private killPlayer(
    victimId: string,
    victim: PlayerState,
    killerId: string | null
  ): void {
    victim.alive = false;
    victim.hp = 0;
    victim.vx = 0;
    victim.vy = 0;
    victim.deaths++;

    if (killerId) {
      const killer = this.state.players.get(killerId);
      if (killer) {
        killer.kills++;
        if (killer.kills >= KILL_LIMIT) {
          this.endMatch(killerId);
          return;
        }
      }
    }

    this.broadcast("playerDied", { victimId, killerId });

    const extra = this.extras.get(victimId);
    if (!extra) return;

    victim.respawnAt = Date.now() + RESPAWN_MS;
    extra.respawnTimer = setTimeout(() => {
      if (!this.state.matchOver) {
        this.respawnPlayer(victimId, victim);
      }
    }, RESPAWN_MS);
  }

  private respawnPlayer(sessionId: string, player: PlayerState): void {
    const spawn = this.randomSpawn();
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.hp = 100;
    player.fuel = 100;
    player.ammo = WEAPONS[player.weapon as WeaponId]?.ammoMax ?? 12;
    player.reloading = false;
    player.alive = true;
    player.onGround = false;
  }

  private endMatch(winnerId?: string): void {
    this.state.matchOver = true;
    this.state.winnerId = winnerId ?? "";
    this.broadcast("matchOver", { winnerId: this.state.winnerId });

    // Cerrar sala tras 10s
    this.clock.setTimeout(() => this.disconnect(), 10000);
  }

  private randomSpawn(): { x: number; y: number } {
    return SPAWN_POINTS[Math.floor(Math.random() * SPAWN_POINTS.length)];
  }
}

// Raycast contra AABB del jugador
function raycastAABB(
  rx: number, ry: number,
  dx: number, dy: number,
  px: number, py: number,
  pw: number, ph: number
): number | null {
  let tMin = -Infinity;
  let tMax = Infinity;

  // Eje X
  if (Math.abs(dx) > 1e-10) {
    const t1 = (px - rx) / dx;
    const t2 = (px + pw - rx) / dx;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (rx < px || rx > px + pw) {
    return null;
  }

  // Eje Y
  if (Math.abs(dy) > 1e-10) {
    const t1 = (py - ry) / dy;
    const t2 = (py + ph - ry) / dy;
    tMin = Math.max(tMin, Math.min(t1, t2));
    tMax = Math.min(tMax, Math.max(t1, t2));
  } else if (ry < py || ry > py + ph) {
    return null;
  }

  if (tMax < tMin || tMax < 0) return null;
  return Math.max(tMin, 0);
}

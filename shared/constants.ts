// Fisica
export const GRAVITY = 900;           // px/s^2
export const MOVE_SPEED = 220;        // px/s
export const JUMP_VY = -480;          // px/s (negativo = arriba)
export const JETPACK_FORCE = -1100;   // px/s^2 (contrarresta gravedad + sube)
export const JETPACK_MAX_FUEL = 100;
export const JETPACK_DRAIN = 35;      // unidades/s
export const JETPACK_REGEN = 18;      // unidades/s (cuando no se usa y en suelo)
export const MAX_FALL_SPEED = 700;    // px/s

// Juego
export const TICK_RATE = 20;          // Hz (50ms por tick)
export const TICK_MS = 1000 / TICK_RATE;
export const PLAYER_W = 28;          // hitbox ancho
export const PLAYER_H = 44;          // hitbox alto
export const RESPAWN_MS = 3000;
export const KILL_LIMIT = 20;        // kills para ganar
export const MATCH_DURATION_S = 300; // 5 minutos
export const MAX_PLAYERS = 10;

// Red
export const SERVER_PORT = 2567;
export const ROOM_NAME = "deathmatch";

// Mapa (dimensiones del nivel)
export const MAP_WIDTH = 2400;
export const MAP_HEIGHT = 900;

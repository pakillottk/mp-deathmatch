// Interpolacion lineal para jugadores remotos.
// Guarda los dos ultimos estados conocidos y suaviza entre ellos.

export interface RemoteSnapshot {
  x: number;
  y: number;
  angle: number;
  facingRight: boolean;
  hp: number;
  fuel: number;
  weapon: string;
  timestamp: number;
}

const INTERP_DELAY_MS = 100; // ms de delay para tener dos muestras entre las que interpolar

export class RemoteInterpolator {
  private history: RemoteSnapshot[] = [];

  push(snapshot: RemoteSnapshot): void {
    this.history.push(snapshot);
    // Mantener solo los ultimos 10 snapshots
    if (this.history.length > 10) this.history.shift();
  }

  get(now: number): RemoteSnapshot | null {
    if (this.history.length === 0) return null;

    const renderTime = now - INTERP_DELAY_MS;

    // Encontrar los dos snapshots entre los que interpolar
    for (let i = 0; i < this.history.length - 1; i++) {
      const a = this.history[i];
      const b = this.history[i + 1];

      if (renderTime >= a.timestamp && renderTime <= b.timestamp) {
        const t = (renderTime - a.timestamp) / (b.timestamp - a.timestamp);
        return {
          x: Phaser.Math.Linear(a.x, b.x, t),
          y: Phaser.Math.Linear(a.y, b.y, t),
          angle: lerpAngle(a.angle, b.angle, t),
          facingRight: t < 0.5 ? a.facingRight : b.facingRight,
          hp: Phaser.Math.Linear(a.hp, b.hp, t),
          fuel: b.fuel,
          weapon: b.weapon,
          timestamp: renderTime,
        };
      }
    }

    // Si renderTime supera el ultimo snapshot, devolver el ultimo
    return this.history[this.history.length - 1];
  }

  clear(): void {
    this.history = [];
  }
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * t;
}

// Necesario para que TypeScript no se queje del uso de Phaser
declare const Phaser: { Math: { Linear: (a: number, b: number, t: number) => number } };

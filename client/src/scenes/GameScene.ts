import Phaser from "phaser";
import type { Room } from "colyseus.js";
import { Player } from "../entities/Player";
import { HUD } from "../ui/HUD";
import { predictStep, reconcile, PredictedState } from "../physics/ClientPrediction";
import { RemoteInterpolator } from "../physics/Interpolation";
import { InputPayload, WeaponId, WEAPONS } from "shared/types";
import { PLAYER_W, PLAYER_H, MAP_WIDTH, MAP_HEIGHT } from "shared/constants";

// Plataformas del mapa (sincronizadas con el servidor)
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

interface PlayerExtra {
  interpolator: RemoteInterpolator;
  lastWeapon: string;
  lastAlive: boolean;
}

export class GameScene extends Phaser.Scene {
  private room!: Room;
  private playerName!: string;

  // Jugadores
  private localPlayer!: Player;
  private remotePlayers = new Map<string, Player>();
  private playerExtras = new Map<string, PlayerExtra>();

  // Estado predicho local
  private predictedState!: PredictedState;

  // Input
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private tabKey!: Phaser.Input.Keyboard.Key;
  private inputSeq = 0;
  private lastSentInput: InputPayload | null = null;

  // Estado del arma local
  private currentWeapon: WeaponId = "pistol";
  private localAmmo = 12;
  private localReloading = false;
  private localFuel = 100;
  private localHp = 100;
  private localKills = 0;
  private localDeaths = 0;

  // HUD
  private hud!: HUD;

  // Camara
  private mapLayer!: Phaser.GameObjects.TileSprite;
  private platformGraphics!: Phaser.GameObjects.Graphics;

  constructor() {
    super("GameScene");
  }

  init(data: { room: Room; playerName: string }): void {
    this.room = data.room;
    this.playerName = data.playerName;
  }

  create(): void {
    // Ajustar limites del mundo
    this.cameras.main.setBounds(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Fondo
    this.add.image(MAP_WIDTH / 2, MAP_HEIGHT / 2, "background");

    // Dibujar plataformas
    this.drawPlatforms();

    // Inputs
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = {
      up:    this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left:  this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.tabKey   = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);

    // Cambio de arma con 1/2/3
    this.input.keyboard!.on("keydown-ONE",   () => this.selectWeapon("pistol"));
    this.input.keyboard!.on("keydown-TWO",   () => this.selectWeapon("smg"));
    this.input.keyboard!.on("keydown-THREE", () => this.selectWeapon("shotgun"));

    // Recargar con R
    this.input.keyboard!.on("keydown-R", () => {
      if (!this.localReloading) {
        this.room.send("changeWeapon", this.currentWeapon); // truco para trigger reload
      }
    });

    // Scoreboard con Tab
    this.tabKey.on("down", () => this.hud?.setScoreboardVisible(true));
    this.tabKey.on("up",   () => this.hud?.setScoreboardVisible(false));

    // HUD
    this.hud = new HUD(this);

    // Estado inicial predicho (debe existir antes de setupColyseusHandlers:
    // onAdd puede ejecutarse de forma síncrona y accede a predictedState)
    this.predictedState = {
      x: 200, y: 700,
      vx: 0, vy: 0,
      fuel: 100,
      onGround: false,
    };

    // Configurar mensajes Colyseus
    this.setupColyseusHandlers();

    // Prevenir menu contextual
    this.game.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private drawPlatforms(): void {
    this.platformGraphics = this.add.graphics();

    for (const p of PLATFORMS) {
      // Relleno
      this.platformGraphics.fillStyle(0x3a4a5a, 1);
      this.platformGraphics.fillRect(p.x, p.y, p.w, p.h);

      // Borde superior luminoso
      this.platformGraphics.fillStyle(0x6688aa, 1);
      this.platformGraphics.fillRect(p.x, p.y, p.w, 2);

      // Patron de bloques
      this.platformGraphics.fillStyle(0x2a3a4a, 0.5);
      for (let bx = p.x; bx < p.x + p.w; bx += 32) {
        this.platformGraphics.fillRect(bx + 1, p.y + 3, 30, Math.min(p.h - 5, 14));
      }
    }
  }

  private setupColyseusHandlers(): void {
    // Cuando se une alguien
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.room.state.players.onAdd((playerState: any, sessionId: string) => {
      const isLocal = sessionId === this.room.sessionId;
      const name = (playerState.name as string) ?? "Soldier";
      const x = (playerState.x as number) ?? 0;
      const y = (playerState.y as number) ?? 0;

      const player = new Player(this, x, y, sessionId, name, isLocal);
      player.setDepth(10);

      if (isLocal) {
        this.localPlayer = player;
        this.cameras.main.startFollow(player, true, 0.08, 0.08);

        // Sincronizar estado predicho con el servidor al unirse
        this.predictedState.x = x;
        this.predictedState.y = y;
      } else {
        this.remotePlayers.set(sessionId, player);
        this.playerExtras.set(sessionId, {
          interpolator: new RemoteInterpolator(),
          lastWeapon: "pistol",
          lastAlive: true,
        });
      }

      // Escuchar cambios de estado del jugador
      if (playerState && typeof playerState.onChange === "function") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        playerState.onChange(() => {
          this.handlePlayerStateChange(sessionId, playerState as PlayerStateData, null, isLocal);
        });
      }
    });

    // Cuando alguien sale
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.room.state.players.onRemove((_playerState: any, sessionId: string) => {
      const player = this.remotePlayers.get(sessionId);
      player?.destroy();
      this.remotePlayers.delete(sessionId);
      this.playerExtras.delete(sessionId);
    });

    // Mensajes del servidor
    this.room.onMessage("playerDied", (data: { victimId: string; killerId: string | null }) => {
      const victim = data.victimId === this.room.sessionId
        ? this.localPlayer
        : this.remotePlayers.get(data.victimId);

      if (victim) victim.playDeathAnimation();

      if (data.killerId) {
        const killerState = this.room.state.players.get(data.killerId);
        const victimState = this.room.state.players.get(data.victimId);
        const killerName = killerState?.name ?? "?";
        const victimName = victimState?.name ?? "?";
        this.hud.addKillFeedMessage(`${killerName} > ${victimName}`);
      }
    });

    this.room.onMessage("matchOver", (data: { winnerId: string }) => {
      const winnerState = this.room.state.players.get(data.winnerId);
      const winnerName = winnerState?.name ?? "Desconocido";
      this.hud.showMatchOver(winnerName);
      this.time.delayedCall(6000, () => {
        this.room.leave();
        this.scene.start("LobbyScene");
      });
    });

    this.room.onError((code, message) => {
      console.error("Room error:", code, message);
      this.scene.start("LobbyScene");
    });

    this.room.onLeave(() => {
      this.scene.start("LobbyScene");
    });
  }

  private handlePlayerStateChange(
    sessionId: string,
    state: PlayerStateData,
    _changes: null,
    isLocal: boolean
  ): void {
    if (isLocal) {
      // Reconciliar prediccion con el estado autorizado
      this.predictedState = reconcile(this.predictedState, { x: state.x, y: state.y });

      // Sincronizar variables de estado local con el servidor
      this.localHp = state.hp;
      this.localFuel = state.fuel;
      this.localKills = state.kills;
      this.localDeaths = state.deaths;
      this.localAmmo = state.ammo;
      this.localReloading = state.reloading;

      if (state.alive && !this.localPlayer?.visible) {
        this.localPlayer?.playRespawnAnimation();
        this.predictedState.x = state.x;
        this.predictedState.y = state.y;
        this.predictedState.vx = 0;
        this.predictedState.vy = 0;
      }
    } else {
      // Guardar snapshot para interpolacion
      const extra = this.playerExtras.get(sessionId);
      if (!extra) return;

      extra.interpolator.push({
        x: state.x,
        y: state.y,
        angle: state.angle,
        facingRight: state.facingRight,
        hp: state.hp,
        fuel: state.fuel,
        weapon: state.weapon,
        timestamp: Date.now(),
      });

      // Detectar respawn
      if (state.alive && !extra.lastAlive) {
        const player = this.remotePlayers.get(sessionId);
        player?.playRespawnAnimation();
      }
      extra.lastAlive = state.alive;
    }
  }

  update(time: number, delta: number): void {
    const dt = delta / 1000;

    // === Input ===
    const ptr = this.input.activePointer;
    const isDown = ptr.isDown;

    // Calcular angulo hacia el puntero (en coordenadas del mundo)
    let mouseAngle = 0;
    if (this.localPlayer) {
      const worldPtr = this.cameras.main.getWorldPoint(ptr.x, ptr.y);
      const cx = this.localPlayer.x + PLAYER_W / 2;
      const cy = this.localPlayer.y + PLAYER_H / 2;
      mouseAngle = Math.atan2(worldPtr.y - cy, worldPtr.x - cx);
    }

    const input: InputPayload = {
      seq: this.inputSeq++,
      left:    this.cursors.left!.isDown || this.wasd.left.isDown,
      right:   this.cursors.right!.isDown || this.wasd.right.isDown,
      jump:    Phaser.Input.Keyboard.JustDown(this.cursors.up!) || Phaser.Input.Keyboard.JustDown(this.wasd.up),
      jetpack: this.spaceKey.isDown,
      shoot:   isDown && (ptr.leftButtonDown()),
      mouseAngle,
    };

    // Enviar input al servidor (cada frame para maxima responsividad)
    if (this.room) {
      this.room.send("input", input);
    }

    // === Prediccion local ===
    if (this.localPlayer) {
      this.predictedState = predictStep(this.predictedState, input, dt);
      this.localPlayer.setPosition(this.predictedState.x, this.predictedState.y);
      this.localPlayer.setAimAngle(mouseAngle, input.right || (!input.left && this.localPlayer.x < MAP_WIDTH / 2));
      this.localPlayer.setWeapon(this.currentWeapon);
      this.localPlayer.setJetpackActive(input.jetpack && this.predictedState.fuel > 0);
      this.localPlayer.drawHealthBar(this.localHp);
      this.localPlayer.drawFuelBar(this.predictedState.fuel);
    }

    // === Interpolacion de jugadores remotos ===
    const now = Date.now();
    this.remotePlayers.forEach((player, sessionId) => {
      const extra = this.playerExtras.get(sessionId);
      if (!extra) return;

      const snap = extra.interpolator.get(now);
      if (!snap) return;

      player.setPosition(snap.x, snap.y);
      player.setAimAngle(snap.angle, snap.facingRight);
      player.setWeapon(snap.weapon);
      player.drawHealthBar(snap.hp);
    });

    // === HUD ===
    const timeRemaining = Math.max(0, Math.ceil(this.room?.state?.timeRemaining ?? 0));
    this.hud?.update({
      hp:           this.localHp,
      fuel:         this.predictedState.fuel,
      ammo:         this.localAmmo,
      maxAmmo:      WEAPONS[this.currentWeapon]?.ammoMax ?? 0,
      weapon:       this.currentWeapon,
      reloading:    this.localReloading,
      kills:        this.localKills,
      deaths:       this.localDeaths,
      timeRemaining,
    });

    // Actualizar scoreboard si visible
    if (this.tabKey?.isDown) {
      const entries: Array<{ id: string; name: string; kills: number; deaths: number }> = [];
      this.room?.state?.players?.forEach((p: PlayerStateData, id: string) => {
        entries.push({ id, name: p.name, kills: p.kills, deaths: p.deaths });
      });
      this.hud.updateScoreboard(entries);
    }
  }

  private selectWeapon(weapon: WeaponId): void {
    if (this.currentWeapon === weapon) return;
    this.currentWeapon = weapon;
    this.localAmmo = WEAPONS[weapon].ammoMax;
    this.localReloading = false;
    this.room?.send("changeWeapon", weapon);
  }

  shutdown(): void {
    this.hud?.destroy();
    this.room?.leave().catch(() => {});
  }
}

// Tipo auxiliar para acceder a los campos del estado del jugador
interface PlayerStateData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  hp: number;
  fuel: number;
  weapon: string;
  ammo: number;
  reloading: boolean;
  kills: number;
  deaths: number;
  alive: boolean;
  onGround: boolean;
  facingRight: boolean;
  name: string;
  onChange?: (cb: (changes: Array<{field: string; value: unknown}>) => void) => void;
}

import Phaser from "phaser";
import { WEAPONS } from "shared/types";
import type { WeaponId } from "shared/types";

export interface HUDData {
  hp: number;
  fuel: number;
  ammo: number;
  maxAmmo: number;
  weapon: WeaponId;
  reloading: boolean;
  kills: number;
  deaths: number;
  timeRemaining: number;
}

interface ScoreEntry {
  id: string;
  name: string;
  kills: number;
  deaths: number;
}

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Barras
  private hpBar!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private fuelBar!: Phaser.GameObjects.Graphics;

  // Info arma
  private ammoText!: Phaser.GameObjects.Text;
  private weaponText!: Phaser.GameObjects.Text;
  private reloadText!: Phaser.GameObjects.Text;

  // Timer y kills
  private timerText!: Phaser.GameObjects.Text;
  private killsText!: Phaser.GameObjects.Text;

  // Scoreboard (Tab)
  private scoreboard!: Phaser.GameObjects.Container;
  private scoreVisible = false;

  // Kill feed
  private killFeedItems: Phaser.GameObjects.Text[] = [];

  // Crosshair
  private crosshair!: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0).setScrollFactor(0).setDepth(100);
    this.build();
  }

  private build(): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    // === HP bar (abajo izquierda) ===
    const hpBg = this.scene.add.rectangle(10, H - 48, 160, 16, 0x220000, 0.85).setOrigin(0);
    this.hpBar = this.scene.add.graphics();
    this.hpText = this.scene.add.text(20, H - 46, "HP 100", {
      fontSize: "11px", color: "#ffffff", fontFamily: "Courier New", stroke: "#000", strokeThickness: 2,
    });

    // === Fuel bar ===
    const fuelBg = this.scene.add.rectangle(10, H - 28, 160, 10, 0x002222, 0.85).setOrigin(0);
    this.fuelBar = this.scene.add.graphics();
    const fuelLabel = this.scene.add.text(12, H - 27, "JET", {
      fontSize: "8px", color: "#00ccff", fontFamily: "Courier New",
    });

    // === Arma (abajo derecha) ===
    this.weaponText = this.scene.add.text(W - 140, H - 50, "PISTOLA", {
      fontSize: "13px", color: "#ffcc44", fontFamily: "Courier New", fontStyle: "bold",
    }).setOrigin(0);
    this.ammoText = this.scene.add.text(W - 140, H - 32, "AMMO: 12/12", {
      fontSize: "12px", color: "#aaaaaa", fontFamily: "Courier New",
    }).setOrigin(0);
    this.reloadText = this.scene.add.text(W - 140, H - 16, "RECARGANDO...", {
      fontSize: "11px", color: "#ff8800", fontFamily: "Courier New",
    }).setOrigin(0).setVisible(false);

    // === Timer y kills (arriba centro) ===
    const topBg = this.scene.add.rectangle(W / 2, 0, 200, 36, 0x000000, 0.6).setOrigin(0.5, 0);
    this.timerText = this.scene.add.text(W / 2, 6, "05:00", {
      fontSize: "20px", color: "#ffffff", fontFamily: "Courier New", fontStyle: "bold",
    }).setOrigin(0.5, 0);
    this.killsText = this.scene.add.text(W / 2, 28, "K:0  D:0", {
      fontSize: "11px", color: "#aaaaaa", fontFamily: "Courier New",
    }).setOrigin(0.5, 0);

    this.container.add([
      hpBg, this.hpBar, this.hpText,
      fuelBg, this.fuelBar, fuelLabel,
      this.weaponText, this.ammoText, this.reloadText,
      topBg, this.timerText, this.killsText,
    ]);

    // === Scoreboard (Tab) ===
    this.scoreboard = this.scene.add.container(W / 2 - 160, 60).setScrollFactor(0).setDepth(200).setVisible(false);

    // === Crosshair ===
    this.crosshair = this.scene.add.graphics().setScrollFactor(0).setDepth(50);
    this.drawCrosshair();

    // Ocultar cursor del sistema
    this.scene.input.setDefaultCursor("none");
  }

  private drawCrosshair(): void {
    this.crosshair.clear();
    this.crosshair.lineStyle(1.5, 0xffffff, 0.8);
    this.crosshair.strokeCircle(0, 0, 8);
    this.crosshair.lineBetween(-14, 0, -10, 0);
    this.crosshair.lineBetween(10, 0, 14, 0);
    this.crosshair.lineBetween(0, -14, 0, -10);
    this.crosshair.lineBetween(0, 10, 0, 14);
  }

  update(data: HUDData): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    // HP bar
    this.hpBar.clear();
    const hpColor = data.hp > 50 ? 0x44ff44 : data.hp > 25 ? 0xffaa00 : 0xff2222;
    this.hpBar.fillStyle(hpColor, 0.9);
    this.hpBar.fillRect(10, H - 48, (160 * data.hp) / 100, 16);
    this.hpText.setText(`HP ${Math.ceil(data.hp)}`);

    // Fuel bar
    this.fuelBar.clear();
    this.fuelBar.fillStyle(0x00ccff, 0.85);
    this.fuelBar.fillRect(28, H - 27, (130 * data.fuel) / 100, 8);

    // Arma
    const names: Record<WeaponId, string> = { pistol: "PISTOLA", smg: "SUBFUSIL", shotgun: "ESCOPETA" };
    this.weaponText.setText(names[data.weapon] ?? data.weapon.toUpperCase());
    this.ammoText.setText(`AMMO: ${data.ammo}/${WEAPONS[data.weapon]?.ammoMax ?? "??"}`);
    this.reloadText.setVisible(data.reloading);

    // Timer
    const mm = Math.floor(data.timeRemaining / 60).toString().padStart(2, "0");
    const ss = (data.timeRemaining % 60).toString().padStart(2, "0");
    this.timerText.setText(`${mm}:${ss}`);
    this.killsText.setText(`K:${data.kills}  D:${data.deaths}`);

    // Crosshair
    const ptr = this.scene.input.activePointer;
    this.crosshair.setPosition(ptr.x, ptr.y);
  }

  updateScoreboard(players: ScoreEntry[]): void {
    this.scoreboard.removeAll(true);

    const sorted = [...players].sort((a, b) => b.kills - a.kills);
    const W = 320;

    // Fondo
    this.scoreboard.add(
      this.scene.add.rectangle(0, 0, W, 30 + sorted.length * 24, 0x000000, 0.85).setOrigin(0)
    );
    this.scoreboard.add(
      this.scene.add.text(W / 2, 8, "PUNTUACION", {
        fontSize: "14px", color: "#ffcc44", fontFamily: "Courier New", fontStyle: "bold",
      }).setOrigin(0.5, 0)
    );

    sorted.forEach((p, i) => {
      const y = 32 + i * 24;
      const line = `${(i + 1).toString().padStart(2)}. ${p.name.padEnd(16)} K:${p.kills}  D:${p.deaths}`;
      this.scoreboard.add(
        this.scene.add.text(10, y, line, {
          fontSize: "11px", color: i === 0 ? "#ffee44" : "#aaaaaa", fontFamily: "Courier New",
        })
      );
    });
  }

  setScoreboardVisible(visible: boolean): void {
    this.scoreVisible = visible;
    this.scoreboard.setVisible(visible);
  }

  addKillFeedMessage(msg: string): void {
    const W = this.scene.scale.width;
    const text = this.scene.add
      .text(W - 10, 50 + this.killFeedItems.length * 20, msg, {
        fontSize: "11px", color: "#ff8844", fontFamily: "Courier New",
        stroke: "#000000", strokeThickness: 2,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(90);

    this.killFeedItems.push(text);

    this.scene.time.delayedCall(3500, () => {
      this.scene.tweens.add({
        targets: text,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          text.destroy();
          this.killFeedItems = this.killFeedItems.filter((t) => t !== text);
        },
      });
    });
  }

  showMatchOver(winnerName: string): void {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    const overlay = this.scene.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0.7)
      .setScrollFactor(0)
      .setDepth(300);

    this.scene.add.text(W / 2, H / 2 - 30, "PARTIDA TERMINADA", {
      fontSize: "28px", color: "#ff4444", fontFamily: "Courier New", fontStyle: "bold",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);

    this.scene.add.text(W / 2, H / 2 + 10, `Ganador: ${winnerName}`, {
      fontSize: "18px", color: "#ffcc44", fontFamily: "Courier New",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);

    this.scene.add.text(W / 2, H / 2 + 50, "Volviendo al lobby...", {
      fontSize: "13px", color: "#888888", fontFamily: "Courier New",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301);
  }

  destroy(): void {
    this.container.destroy();
    this.scoreboard.destroy();
    this.crosshair.destroy();
    this.killFeedItems.forEach((t) => t.destroy());
    this.scene.input.setDefaultCursor("default");
  }
}

import Phaser from "phaser";
import { PLAYER_W, PLAYER_H } from "shared/constants";

export class Player extends Phaser.GameObjects.Container {
  private sprite: Phaser.GameObjects.Image;
  private weaponSprite: Phaser.GameObjects.Image;
  private nameText: Phaser.GameObjects.Text;
  private healthBar: Phaser.GameObjects.Graphics;
  private fuelBar: Phaser.GameObjects.Graphics;
  private jetpackParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  public isLocal: boolean = false;
  public sessionId: string = "";

  // Para interpolacion (remotos)
  public targetX: number = 0;
  public targetY: number = 0;

  // Para prediccion (local)
  public serverX: number = 0;
  public serverY: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    sessionId: string,
    name: string,
    isLocal: boolean
  ) {
    super(scene, x, y);

    this.sessionId = sessionId;
    this.isLocal = isLocal;
    this.targetX = x;
    this.targetY = y;

    this.sprite = scene.add.image(PLAYER_W / 2, PLAYER_H / 2, "player");
    this.sprite.setOrigin(0.5);

    this.weaponSprite = scene.add.image(PLAYER_W + 2, PLAYER_H / 2, "pistol");
    this.weaponSprite.setOrigin(0, 0.5);

    this.nameText = scene.add
      .text(PLAYER_W / 2, -12, name, {
        fontSize: "10px",
        color: isLocal ? "#ffee44" : "#aaddff",
        fontFamily: "Courier New",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.healthBar = scene.add.graphics();
    this.fuelBar = scene.add.graphics();

    this.add([this.sprite, this.weaponSprite, this.nameText, this.healthBar, this.fuelBar]);

    scene.add.existing(this);

    this.drawHealthBar(100);
    this.drawFuelBar(100);
  }

  setWeapon(weapon: string): void {
    const texture = ["pistol", "smg", "shotgun"].includes(weapon) ? weapon : "pistol";
    this.weaponSprite.setTexture(texture);
  }

  setAimAngle(angle: number, facingRight: boolean): void {
    this.sprite.setFlipX(!facingRight);

    // El arma sigue el angulo del raton
    const displayAngle = facingRight ? angle : Math.PI - angle;
    this.weaponSprite.setRotation(displayAngle);
    this.weaponSprite.setX(facingRight ? PLAYER_W + 2 : -2);
    this.weaponSprite.setFlipY(!facingRight && (angle > Math.PI / 2 || angle < -Math.PI / 2));
  }

  setJetpackActive(active: boolean): void {
    if (active && !this.jetpackParticles) {
      try {
        this.jetpackParticles = this.scene.add.particles(0, 0, "particle", {
          follow: this,
          followOffset: { x: PLAYER_W / 2, y: PLAYER_H },
          speed: { min: 60, max: 120 },
          angle: { min: 70, max: 110 },
          lifespan: 250,
          scale: { start: 0.8, end: 0 },
          alpha: { start: 0.9, end: 0 },
          tint: [0xff6600, 0xffaa00],
          quantity: 3,
        });
      } catch {
        // Particulas no disponibles en esta version
      }
    } else if (!active && this.jetpackParticles) {
      this.jetpackParticles.destroy();
      this.jetpackParticles = null;
    }
  }

  drawHealthBar(hp: number): void {
    this.healthBar.clear();
    const barW = PLAYER_W + 4;
    const barH = 4;
    const bx = -2;
    const by = -6;
    this.healthBar.fillStyle(0x330000);
    this.healthBar.fillRect(bx, by, barW, barH);
    const color = hp > 50 ? 0x44ff44 : hp > 25 ? 0xffaa00 : 0xff2222;
    this.healthBar.fillStyle(color);
    this.healthBar.fillRect(bx, by, (barW * hp) / 100, barH);
  }

  drawFuelBar(fuel: number): void {
    this.fuelBar.clear();
    if (!this.isLocal) return;
    const barW = PLAYER_W + 4;
    const barH = 2;
    const bx = -2;
    const by = -9;
    this.fuelBar.fillStyle(0x003333);
    this.fuelBar.fillRect(bx, by, barW, barH);
    this.fuelBar.fillStyle(0x00ccff);
    this.fuelBar.fillRect(bx, by, (barW * fuel) / 100, barH);
  }

  playDeathAnimation(): void {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: 180,
      duration: 600,
      ease: "Power2",
      onComplete: () => {
        this.setVisible(false);
        this.setAlpha(1);
        this.setAngle(0);
      },
    });

    // Particulas de muerte
    try {
      const emitter = this.scene.add.particles(this.x + PLAYER_W / 2, this.y + PLAYER_H / 2, "particle", {
        speed: { min: 80, max: 220 },
        angle: { min: 0, max: 360 },
        lifespan: 500,
        scale: { start: 1.2, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xff2222, 0xff8800],
        quantity: 20,
        duration: 200,
      });
      this.scene.time.delayedCall(700, () => emitter.destroy());
    } catch {
      // Particulas no disponibles
    }
  }

  playRespawnAnimation(): void {
    this.setAlpha(0);
    this.setVisible(true);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 400,
      ease: "Power2",
    });
  }

  destroy(fromScene?: boolean): void {
    this.jetpackParticles?.destroy();
    super.destroy(fromScene);
  }
}

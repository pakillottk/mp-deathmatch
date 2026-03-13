import Phaser from "phaser";

// Genera todos los assets graficos de forma procedural con Canvas API
// para no necesitar archivos externos.
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    // Nada que cargar externamente
  }

  create(): void {
    this.generateTextures();
    this.scene.start("LobbyScene");
  }

  private generateTextures(): void {
    this.genPlayerTexture();
    this.genPlatformTexture();
    this.genBulletTexture();
    this.genParticleTexture();
    this.genBackgroundTexture();
    this.genWeaponTextures();
  }

  private genPlayerTexture(): void {
    const W = 28, H = 44;
    const gfx = this.make.graphics({ x: 0, y: 0 });

    // Sombra
    gfx.fillStyle(0x000000, 0.3);
    gfx.fillEllipse(W / 2, H - 2, W, 8);

    // Cuerpo
    gfx.fillStyle(0x2a5f8a);
    gfx.fillRect(4, 14, 20, 24);

    // Cabeza
    gfx.fillStyle(0xf0c080);
    gfx.fillCircle(W / 2, 10, 9);

    // Casco
    gfx.fillStyle(0x1a3355);
    gfx.fillRect(5, 2, 18, 10);

    // Piernas
    gfx.fillStyle(0x1a3355);
    gfx.fillRect(5, 36, 8, 8);
    gfx.fillRect(15, 36, 8, 8);

    // Botas
    gfx.fillStyle(0x2a1a0a);
    gfx.fillRect(4, 40, 10, 4);
    gfx.fillRect(14, 40, 10, 4);

    // Arma (brazo)
    gfx.fillStyle(0x333333);
    gfx.fillRect(20, 18, 10, 5);

    gfx.generateTexture("player", W + 8, H);
    gfx.destroy();
  }

  private genWeaponTextures(): void {
    const weapons = [
      { key: "pistol",  color: 0x666666, w: 16, h: 6 },
      { key: "smg",     color: 0x555555, w: 22, h: 7 },
      { key: "shotgun", color: 0x775533, w: 26, h: 8 },
    ];

    for (const wp of weapons) {
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(wp.color);
      gfx.fillRect(0, 0, wp.w, wp.h);
      gfx.fillStyle(0x222222);
      gfx.fillRect(wp.w - 4, 1, 4, wp.h - 2);
      gfx.generateTexture(wp.key, wp.w, wp.h);
      gfx.destroy();
    }
  }

  private genPlatformTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });

    // Superficie
    gfx.fillStyle(0x3a4a5a);
    gfx.fillRect(0, 0, 64, 20);

    // Borde superior luminoso
    gfx.fillStyle(0x6688aa);
    gfx.fillRect(0, 0, 64, 2);

    // Detalle de textura
    gfx.fillStyle(0x2a3a4a);
    for (let x = 0; x < 64; x += 16) {
      gfx.fillRect(x, 3, 14, 14);
    }

    gfx.generateTexture("platform", 64, 20);
    gfx.destroy();
  }

  private genBulletTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.fillStyle(0xffdd44);
    gfx.fillEllipse(4, 2, 8, 4);
    gfx.generateTexture("bullet", 8, 4);
    gfx.destroy();
  }

  private genParticleTexture(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.fillStyle(0xff4422);
    gfx.fillCircle(3, 3, 3);
    gfx.generateTexture("particle", 6, 6);
    gfx.destroy();
  }

  private genBackgroundTexture(): void {
    const W = 2400, H = 900;
    const gfx = this.make.graphics({ x: 0, y: 0 });

    // Cielo oscuro
    gfx.fillStyle(0x0a0a1a);
    gfx.fillRect(0, 0, W, H);

    // Estrellas / puntos de luz
    gfx.fillStyle(0xffffff, 0.3);
    for (let i = 0; i < 200; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H * 0.7;
      gfx.fillRect(sx, sy, 1, 1);
    }

    // Edificios en el fondo
    gfx.fillStyle(0x111122);
    const buildings = [
      [0, 600, 150, 300], [160, 650, 100, 250], [270, 580, 130, 320],
      [500, 620, 180, 280], [700, 560, 120, 340], [830, 600, 160, 300],
      [1000, 540, 200, 360], [1220, 590, 140, 310], [1380, 620, 170, 280],
      [1600, 550, 190, 350], [1800, 570, 160, 330], [1970, 610, 130, 290],
      [2110, 640, 150, 260], [2270, 600, 130, 300],
    ];

    for (const [bx, by, bw, bh] of buildings) {
      gfx.fillStyle(0x111122);
      gfx.fillRect(bx, by, bw, bh);
      // Ventanas
      gfx.fillStyle(0x334455, 0.6);
      for (let wy = by + 20; wy < by + bh - 20; wy += 30) {
        for (let wx = bx + 10; wx < bx + bw - 10; wx += 20) {
          if (Math.random() > 0.4) {
            gfx.fillStyle(0xffcc44, 0.2 + Math.random() * 0.4);
            gfx.fillRect(wx, wy, 10, 14);
          }
        }
      }
    }

    gfx.generateTexture("background", W, H);
    gfx.destroy();
  }
}

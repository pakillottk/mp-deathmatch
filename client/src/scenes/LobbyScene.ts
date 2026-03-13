import Phaser from "phaser";
import { getAvailableRooms, joinOrCreateRoom, joinRoom } from "../network/ColyseusClient";
import type { Room, RoomAvailable } from "colyseus.js";

const W = 800;
const H = 500;

export class LobbyScene extends Phaser.Scene {
  private nameInput!: HTMLInputElement;
  private statusText!: Phaser.GameObjects.Text;
  private roomListContainer!: Phaser.GameObjects.Container;
  private refreshBtn!: Phaser.GameObjects.Text;
  private joinBtn!: Phaser.GameObjects.Text;
  private rooms: RoomAvailable[] = [];
  private selectedRoom: string | null = null;
  private connecting = false;

  constructor() {
    super("LobbyScene");
  }

  create(): void {
    const { width, height } = this.scale;

    // Fondo
    this.add.rectangle(0, 0, width, height, 0x0a0a1a).setOrigin(0);

    // Titulo
    this.add
      .text(width / 2, 40, "MP DEATHMATCH", {
        fontSize: "36px",
        color: "#ff4444",
        fontFamily: "Courier New",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 78, "estilo Soldat  •  Phaser 3 + Colyseus", {
        fontSize: "13px",
        color: "#556688",
        fontFamily: "Courier New",
      })
      .setOrigin(0.5);

    // Campo de nombre (HTML overlay)
    this.createNameInput(width);

    // Lista de salas
    this.add.text(40, 140, "SALAS DISPONIBLES:", {
      fontSize: "14px",
      color: "#aaccff",
      fontFamily: "Courier New",
    });

    this.roomListContainer = this.add.container(0, 160);

    // Botones
    this.refreshBtn = this.add
      .text(40, 390, "[ ACTUALIZAR ]", {
        fontSize: "14px",
        color: "#44aaff",
        fontFamily: "Courier New",
      })
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.refreshBtn.setColor("#88ddff"))
      .on("pointerout", () => this.refreshBtn.setColor("#44aaff"))
      .on("pointerdown", () => this.refreshRooms());

    this.joinBtn = this.add
      .text(width / 2, 430, "[ UNIRSE / CREAR SALA ]", {
        fontSize: "18px",
        color: "#ffcc00",
        fontFamily: "Courier New",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.joinBtn.setColor("#ffee66"))
      .on("pointerout", () => this.joinBtn.setColor("#ffcc00"))
      .on("pointerdown", () => this.connect());

    this.statusText = this.add
      .text(width / 2, 470, "Conectando al servidor...", {
        fontSize: "12px",
        color: "#888888",
        fontFamily: "Courier New",
      })
      .setOrigin(0.5);

    this.refreshRooms();
  }

  private createNameInput(width: number): void {
    this.nameInput = document.createElement("input");
    this.nameInput.type = "text";
    this.nameInput.placeholder = "Tu nombre (max 20 chars)";
    this.nameInput.maxLength = 20;
    this.nameInput.value = "Soldier" + Math.floor(Math.random() * 999);

    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / this.scale.width;
    const scaleY = rect.height / this.scale.height;

    Object.assign(this.nameInput.style, {
      position: "fixed",
      left: `${rect.left + 40 * scaleX}px`,
      top:  `${rect.top  + 100 * scaleY}px`,
      width: `${280 * scaleX}px`,
      height: `${32 * scaleY}px`,
      fontSize: `${14 * Math.min(scaleX, scaleY)}px`,
      background: "#1a1a2e",
      color: "#ffffff",
      border: "1px solid #334466",
      padding: "4px 8px",
      fontFamily: "Courier New",
      outline: "none",
      zIndex: "100",
    });

    document.body.appendChild(this.nameInput);

    this.add.text(40, 100, "NOMBRE:", {
      fontSize: "13px",
      color: "#aaccff",
      fontFamily: "Courier New",
    });

    // Limpiar al salir de la escena
    this.events.on("shutdown", () => this.nameInput.remove());
    this.events.on("destroy", () => this.nameInput.remove());
  }

  private async refreshRooms(): Promise<void> {
    this.statusText.setText("Actualizando lista de salas...");
    try {
      this.rooms = await getAvailableRooms();
      this.renderRoomList();
      this.statusText.setText(
        this.rooms.length === 0
          ? "No hay salas activas. Pulsa UNIRSE para crear una."
          : `${this.rooms.length} sala(s) encontradas.`
      );
    } catch {
      this.statusText.setText("Error al conectar con el servidor.");
    }
  }

  private renderRoomList(): void {
    this.roomListContainer.removeAll(true);
    const { width } = this.scale;

    if (this.rooms.length === 0) {
      this.roomListContainer.add(
        this.add.text(40, 0, "  (sin salas activas)", {
          fontSize: "13px",
          color: "#556677",
          fontFamily: "Courier New",
        })
      );
      return;
    }

    this.rooms.forEach((room, i) => {
      const y = i * 38;
      const isSelected = room.roomId === this.selectedRoom;

      const bg = this.add
        .rectangle(40, y, width - 80, 30, isSelected ? 0x223344 : 0x111122, 0.9)
        .setOrigin(0, 0)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => {
          this.selectedRoom = room.roomId;
          this.renderRoomList();
        });

      const label = this.add.text(56, y + 8, `Sala ${room.roomId.slice(-6)}   ${room.clients}/${room.maxClients} jugadores`, {
        fontSize: "13px",
        color: isSelected ? "#88ddff" : "#aaaaaa",
        fontFamily: "Courier New",
      });

      this.roomListContainer.add([bg, label]);
    });
  }

  private async connect(): Promise<void> {
    if (this.connecting) return;
    this.connecting = true;
    this.joinBtn.setColor("#888888");
    this.statusText.setText("Conectando...");

    const name = this.nameInput.value.trim() || "Soldier";

    try {
      let room: Room;
      if (this.selectedRoom) {
        room = await joinRoom(this.selectedRoom, name);
      } else {
        room = await joinOrCreateRoom(name);
      }

      this.nameInput.remove();
      this.scene.start("GameScene", { room, playerName: name });
    } catch (err) {
      this.statusText.setText("Error al unirse. Intenta de nuevo.");
      this.joinBtn.setColor("#ffcc00");
      this.connecting = false;
      console.error(err);
    }
  }
}

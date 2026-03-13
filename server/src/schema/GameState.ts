import { Schema, MapSchema, ArraySchema, type } from "@colyseus/schema";
import { PlayerState } from "./PlayerState";
import { BulletState } from "./BulletState";

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type([BulletState]) bullets = new ArraySchema<BulletState>();
  @type("number") timeRemaining: number = 300;
  @type("boolean") matchOver: boolean = false;
  @type("string") winnerId: string = "";
}

import { Schema, type } from "@colyseus/schema";

export class BulletState extends Schema {
  @type("string") id: string = "";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") angle: number = 0;
  @type("string") ownerId: string = "";
  @type("string") weapon: string = "pistol";
}

import { Schema, type } from "@colyseus/schema";
import { WeaponId } from "../../../shared/types";

export class PlayerState extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") vx: number = 0;
  @type("number") vy: number = 0;
  @type("number") angle: number = 0;
  @type("number") hp: number = 100;
  @type("number") fuel: number = 100;
  @type("string") weapon: string = "pistol";
  @type("number") ammo: number = 12;
  @type("boolean") reloading: boolean = false;
  @type("number") kills: number = 0;
  @type("number") deaths: number = 0;
  @type("boolean") alive: boolean = true;
  @type("boolean") onGround: boolean = false;
  @type("boolean") facingRight: boolean = true;
  @type("string") name: string = "Soldier";
  @type("number") respawnAt: number = 0;

  getWeapon(): WeaponId {
    return this.weapon as WeaponId;
  }
}

/// <reference types="vite/client" />
import { Client, Room, type RoomAvailable } from "colyseus.js";
import { ROOM_NAME, SERVER_PORT } from "shared/constants";

const DEFAULT_HOST =
  (import.meta.env["VITE_SERVER_URL"] as string | undefined) ??
  `ws://localhost:${SERVER_PORT}`;

let _client: Client | null = null;

export function getClient(): Client {
  if (!_client) {
    _client = new Client(DEFAULT_HOST);
  }
  return _client;
}

export async function getAvailableRooms(): Promise<RoomAvailable[]> {
  try {
    return await getClient().getAvailableRooms(ROOM_NAME);
  } catch {
    return [];
  }
}

export async function joinOrCreateRoom(
  playerName: string
): Promise<Room> {
  return getClient().joinOrCreate(ROOM_NAME, { name: playerName });
}

export async function joinRoom(
  roomId: string,
  playerName: string
): Promise<Room> {
  return getClient().joinById(roomId, { name: playerName });
}

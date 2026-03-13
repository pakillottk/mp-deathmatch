import "reflect-metadata";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { DeathMatchRoom } from "./rooms/DeathMatchRoom";
import { ROOM_NAME, SERVER_PORT } from "../../shared/constants";

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({ server: httpServer }),
});

gameServer.define(ROOM_NAME, DeathMatchRoom);

// Health check para Render.com
app.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Lista de salas activas (para el lobby del cliente)
app.get("/rooms", async (_req, res) => {
  try {
    const rooms = await matchMaker.query({ name: ROOM_NAME });
    res.json(rooms);
  } catch {
    res.json([]);
  }
});

const port = Number(process.env.PORT ?? SERVER_PORT);

httpServer.listen(port, () => {
  console.log(`[Colyseus] Deathmatch server on :${port}`);
});

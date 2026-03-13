# MP Deathmatch

Juego 2D deathmatch estilo Soldat en el navegador. Phaser 3 (cliente) + Colyseus (servidor).

## Controles

| Tecla | Accion |
|-------|--------|
| A / Flecha izquierda | Mover izquierda |
| D / Flecha derecha | Mover derecha |
| W / Flecha arriba | Saltar |
| Espacio | Jetpack |
| Click izquierdo | Disparar |
| 1 / 2 / 3 | Pistola / Subfusil / Escopeta |
| Tab (mantener) | Scoreboard |

## Desarrollo local

```bash
# Instalar dependencias
npm install

# Arrancar cliente y servidor en paralelo
npm run dev
```

- Cliente: http://localhost:3000
- Servidor: ws://localhost:2567

## Build de produccion

```bash
npm run build
```

- Cliente compilado: `client/dist/`
- Servidor compilado: `server/dist/`

## Despliegue

### Opcion A: Gratis (Render + GitHub Pages)

**Servidor** en [Render.com](https://render.com) (free tier, 512 MB RAM):
1. Conecta el repositorio en Render
2. Render detecta `render.yaml` automaticamente
3. Añade variable de entorno en el repositorio de GitHub: `COLYSEUS_SERVER_URL=wss://mp-deathmatch-server.onrender.com`

**Cliente** en GitHub Pages:
1. Activa GitHub Pages en Settings > Pages > Source: GitHub Actions
2. El workflow `.github/workflows/deploy-client.yml` se dispara al hacer push a `main`

Limitacion: el servidor se duerme tras 15 min de inactividad. El primer jugador espera ~30-50s.

### Opcion B: ~3-5 €/mes (Hetzner CX22)

```bash
# En el VPS
npm install
npm run build

# Con PM2
pm2 start deploy/pm2.ecosystem.config.js
pm2 save && pm2 startup

# Nginx + SSL
sudo cp deploy/nginx-hetzner.conf /etc/nginx/sites-available/deathmatch
sudo ln -s /etc/nginx/sites-available/deathmatch /etc/nginx/sites-enabled/
sudo certbot --nginx -d tudominio.com
sudo nginx -t && sudo systemctl reload nginx
```

## Arquitectura

```
Cliente (Phaser 3)          Servidor (Colyseus)
─────────────────           ───────────────────
Input (WASD + mouse)  ──►  DeathMatchRoom
Prediccion local            Fisica autoritativa (20 Hz)
Interpolacion remotos  ◄──  Delta patches de estado
HUD + Lobby                 Matchmaking
```

## Limitaciones de concurrencia

| Plataforma | CCU estimados | Salas (~8 jugadores) |
|-----------|--------------|----------------------|
| Render free (512 MB) | ~32 CCU | 2-4 salas |
| Hetzner CX22 (4 GB) | ~150-200 CCU | 15-25 salas |

El cuello de botella principal es la CPU de Node.js single-thread ejecutando la fisica de todas las salas a 20 Hz.

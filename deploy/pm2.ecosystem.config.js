// pm2.ecosystem.config.js
// Uso: pm2 start deploy/pm2.ecosystem.config.js
// Para arrancar automaticamente en el arranque: pm2 startup && pm2 save

module.exports = {
  apps: [
    {
      name: "mp-deathmatch",
      script: "./server/dist/src/index.js",
      instances: 1,           // Single process (Node.js single-thread)
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 2567,
      },
      error_file: "./logs/err.log",
      out_file:   "./logs/out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
    },
  ],
};

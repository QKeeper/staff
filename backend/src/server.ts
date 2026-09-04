import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(
    `🚀 Staff Backend Server running on http://localhost:${env.PORT}`,
  );
  console.log(`📡 Environment: ${env.NODE_ENV}`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully shutting down...`);
  server.close(async () => {
    console.log("HTTP server closed.");
    await prisma.$disconnect();
    console.log("Prisma disconnected.");
    process.exit(0);
  });

  // Force shutdown after 10 seconds if still hanging
  setTimeout(() => {
    console.error("Forcefully shutting down due to timeout.");
    process.exit(1);
  }, 10000);
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

/**
 * Queen AI — Entry Point
 *
 * Hive coordination, drone management, and estate intelligence service
 * for the Trancendos mesh. Orchestrates drone swarms to scan and analyze
 * external estates (GitHub, Notion, Linear, etc.).
 * Zero-cost compliant — no LLM calls.
 *
 * Port: 3020
 * Architecture: Trancendos Industry 6.0 / 2060 Standard
 */

import { app, hive } from './api/server';
import { logger } from './utils/logger';

const PORT = Number(process.env.PORT ?? 3020);
const HOST = process.env.HOST ?? '0.0.0.0';

// ── Startup ────────────────────────────────────────────────────────────────

async function bootstrap(): Promise<void> {
  logger.info('Queen AI starting up...');

  const server = app.listen(PORT, HOST, () => {
    logger.info(
      { port: PORT, host: HOST, env: process.env.NODE_ENV ?? 'development' },
      '👑 Queen AI is online — The Hive is ready',
    );
  });

  // ── Periodic Hive Status (every 15 minutes) ──────────────────────────────
  const HIVE_INTERVAL = Number(process.env.HIVE_INTERVAL_MS ?? 15 * 60 * 1000);
  const hiveTimer = setInterval(() => {
    try {
      const stats = hive.getStats();
      logger.info(
        {
          totalEstates: stats.totalEstates,
          totalDrones: stats.totalDrones,
          activeDrones: stats.activeDrones,
          totalMissions: stats.totalMissions,
          completedMissions: stats.completedMissions,
          totalFindings: stats.totalFindings,
        },
        '👑 Queen AI periodic hive status',
      );
    } catch (err) {
      logger.error({ err }, 'Periodic hive status failed');
    }
  }, HIVE_INTERVAL);

  // ── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    clearInterval(hiveTimer);
    server.close(() => {
      logger.info('Queen AI shut down cleanly');
      process.exit(0);
    });
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Bootstrap failed');
  process.exit(1);
});
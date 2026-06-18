import app from './app';
import { logger } from '@shared/utils/logger';

const rawPort = process.env.PORT ?? '3000';
const PORT = parseInt(rawPort, 10);

if (isNaN(PORT)) {
  logger.error(`Invalid PORT value: "${rawPort}"`);
  process.exit(1);
}

const server = app.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

const shutdown = (): void => {
  logger.info('Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  // Force-exit if connections don't drain within 10 s
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000).unref();
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', { err });
  shutdown();
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason });
  shutdown();
});

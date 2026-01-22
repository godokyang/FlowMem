// Global Error Handler

import { logger } from './logger.js';

export function setupGlobalHandlers() {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });

  // Handle termination signals
  ['SIGINT', 'SIGTERM', 'SIGQUIT'].forEach(signal => {
    process.on(signal, () => {
      logger.info(`Received ${signal}, shutting down...`);
      process.exit(0);
    });
  });
}

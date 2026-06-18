import cors from 'cors';
import express from 'express';
import type { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { logger } from '@shared/utils/logger';
import { apiRouter } from './routes/index';

const app: Application = express();

app.use(helmet());
app.use(cors());

app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

app.use('/api/v1', apiRouter);

// 4-arg signature required by Express to recognise this as an error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  const raw = err as Record<string, unknown>;
  const status = typeof raw['status'] === 'number' ? raw['status'] : 500;

  if (status >= 500) {
    logger.error('Unhandled error', { err });
  }

  // Expose message for client errors only; hide internals for 5xx
  const hasMessage = typeof raw['message'] === 'string';
  const message = status < 500 && hasMessage ? (raw['message'] as string) : 'Internal server error';

  res.status(status).json({ error: message });
});

export default app;

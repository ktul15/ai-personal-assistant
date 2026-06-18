import { Router } from 'express';
import type { Request, Response } from 'express';
import { version } from '../../package.json';

export const healthRouter = Router();

healthRouter.get('/', (_req: Request, res: Response): void => {
  res.json({
    status: 'ok',
    version,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      // Populated when Prisma + Redis are wired up
      database: 'unchecked',
      redis: 'unchecked',
    },
  });
});

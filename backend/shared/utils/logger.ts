import winston from 'winston';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const devFormat = combine(colorize({ all: true }), timestamp(), simple());
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

export const logger = winston.createLogger({
  level: process.env['LOG_LEVEL'] ?? 'info',
  format: process.env['NODE_ENV'] === 'production' ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
});

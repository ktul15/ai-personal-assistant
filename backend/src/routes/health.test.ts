import request from 'supertest';
import app from '../app';

interface HealthResponse {
  status: string;
  timestamp: string;
  uptime: number;
  services: { database: string; redis: string };
}

describe('GET /api/v1/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    const body = res.body as HealthResponse;
    expect(body.status).toBe('ok');
    expect(typeof body.timestamp).toBe('string');
    expect(typeof body.uptime).toBe('number');
  });
});

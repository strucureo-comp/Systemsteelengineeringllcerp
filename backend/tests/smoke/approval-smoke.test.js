const request = require('supertest');
const app = require('../../server'); // expects server.js exports the express app when required

describe('Smoke: Health and approval flows', () => {
  test('GET /api/health returns OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // Placeholder: create a PO -> submit for approval -> expect approval request created
  test.skip('Create PO and submit for approval (requires DB + auth)', async () => {
    // This test is intentionally skipped in CI until environment and auth are configured
  });
});

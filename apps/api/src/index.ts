/**
 * A.PICK API Server — Entry point (skeleton)
 * Phase 1: Only /internal/health and /internal/probe routes active.
 */
import express from 'express';
import * as path from 'path';
import * as fs from 'fs';

const app = express();
app.use(express.json());

const PORT = process.env.PORT ?? 3001;

// Internal health check
app.get('/internal/health', (_req, res) => {
  res.json({
    status: 'UP',
    phase: '1',
    timestamp: new Date().toISOString(),
    services: {
      betmanConnector: 'NOT_YET_INITIALIZED',
      db: 'NOT_YET_INITIALIZED',
    },
  });
});

// Serve last probe report if exists
app.get('/internal/probe-report', (_req, res) => {
  const reportPath = path.resolve(__dirname, '..', '..', 'reports', 'BETMAN_CONNECTOR_REPORT.json');
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    res.json(report);
  } else {
    res.status(404).json({ error: 'No probe report found. Run: npm run probe' });
  }
});

app.listen(PORT, () => {
  console.log(`A.PICK API server running on http://localhost:${PORT}`);
  console.log('Phase 1 — Betman Connector Probe only');
});

export default app;

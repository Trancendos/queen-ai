/**
 * Queen AI — REST API Server
 *
 * Exposes hive coordination, drone management, estate scanning,
 * and intelligence reporting endpoints for the Trancendos mesh.
 *
 * Architecture: Trancendos Industry 6.0 / 2060 Standard
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import {
  HiveCoordinator,
  DroneType,
  DroneStatus,
  EstateType,
  IntelligenceCategory,
} from '../hive/hive-coordinator';
import { logger } from '../utils/logger';


// ============================================================================
// IAM MIDDLEWARE — Trancendos 2060 Standard (TRN-PROD-001)
// ============================================================================
import { createHash, createHmac } from 'crypto';

const IAM_JWT_SECRET = process.env.IAM_JWT_SECRET || process.env.JWT_SECRET || '';
const IAM_ALGORITHM = process.env.JWT_ALGORITHM || 'HS512';
const SERVICE_ID = 'queen';
const MESH_ADDRESS = process.env.MESH_ADDRESS || 'queen.agent.local';

function sha512Audit(data: string): string {
  return createHash('sha512').update(data).digest('hex');
}

function b64urlDecode(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(b64 + '='.repeat((4 - b64.length % 4) % 4), 'base64').toString('utf8');
}

interface JWTClaims {
  sub: string; email?: string; role?: string;
  active_role_level?: number; permissions?: string[];
  exp?: number; jti?: string;
}

function verifyIAMToken(token: string): JWTClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [h, p, sig] = parts;
    const header = JSON.parse(b64urlDecode(h));
    const alg = header.alg === 'HS512' ? 'sha512' : 'sha256';
    const expected = createHmac(alg, IAM_JWT_SECRET)
      .update(`${h}.${p}`).digest('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    if (expected !== sig) return null;
    const claims = JSON.parse(b64urlDecode(p)) as JWTClaims;
    if (claims.exp && Date.now() / 1000 > claims.exp) return null;
    return claims;
  } catch { return null; }
}

function requireIAMLevel(maxLevel: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) { res.status(401).json({ error: 'Authentication required', service: SERVICE_ID }); return; }
    const claims = verifyIAMToken(token);
    if (!claims) { res.status(401).json({ error: 'Invalid or expired token', service: SERVICE_ID }); return; }
    const level = claims.active_role_level ?? 6;
    if (level > maxLevel) {
      console.log(JSON.stringify({ level: 'audit', decision: 'DENY', service: SERVICE_ID,
        principal: claims.sub, requiredLevel: maxLevel, actualLevel: level, path: req.path,
        integrityHash: sha512Audit(`DENY:${claims.sub}:${req.path}:${Date.now()}`),
        timestamp: new Date().toISOString() }));
      res.status(403).json({ error: 'Insufficient privilege level', required: maxLevel, actual: level });
      return;
    }
    (req as any).principal = claims;
    next();
  };
}

function iamRequestMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('X-Service-Id', SERVICE_ID);
  res.setHeader('X-Mesh-Address', MESH_ADDRESS);
  res.setHeader('X-IAM-Version', '1.0');
  next();
}

function iamHealthStatus() {
  return {
    iam: {
      version: '1.0', algorithm: IAM_ALGORITHM,
      status: IAM_JWT_SECRET ? 'configured' : 'unconfigured',
      meshAddress: MESH_ADDRESS,
      routingProtocol: process.env.MESH_ROUTING_PROTOCOL || 'static_port',
      cryptoMigrationPath: 'hmac_sha512 → ml_kem (2030) → hybrid_pqc (2040) → slh_dsa (2060)',
    },
  };
}
// ============================================================================
// END IAM MIDDLEWARE
// ============================================================================

// ── Bootstrap ──────────────────────────────────────────────────────────────

const app = express();
export const hive = new HiveCoordinator();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined', {
  stream: { write: (msg: string) => logger.info(msg.trim()) },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data, timestamp: new Date().toISOString() });
}

function fail(res: Response, message: string, status = 400): void {
  res.status(status).json({ success: false, error: message, timestamp: new Date().toISOString() });
}

function wrap(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);
}

// ── Health ─────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  ok(res, { status: 'healthy', service: 'queen-ai', uptime: process.uptime() });
});

app.get('/metrics', (_req, res) => {
  ok(res, {
    ...hive.getStats(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
  });
});

// ── Estates ────────────────────────────────────────────────────────────────

// GET /estates — list all estates
app.get('/estates', (req, res) => {
  const { type } = req.query;
  const estates = hive.getEstates(type as EstateType | undefined);
  ok(res, { estates, count: estates.length });
});

// GET /estates/:id — get a specific estate
app.get('/estates/:id', (req, res) => {
  const estate = hive.getEstate(req.params.id);
  if (!estate) return fail(res, 'Estate not found', 404);
  ok(res, estate);
});

// POST /estates — add an estate
app.post('/estates', (req, res) => {
  const { name, type, url, description, credentials } = req.body;
  if (!name || !type || !url) {
    return fail(res, 'name, type, url are required');
  }
  const validTypes: EstateType[] = ['github', 'gitlab', 'bitbucket', 'vercel', 'notion', 'linear', 'google_drive', 'onedrive', 'dropbox'];
  if (!validTypes.includes(type)) {
    return fail(res, `type must be one of: ${validTypes.join(', ')}`);
  }
  try {
    const estate = hive.addEstate({ name, type: type as EstateType, url, description, credentials });
    ok(res, estate, 201);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// DELETE /estates/:id — remove an estate
app.delete('/estates/:id', (req, res) => {
  const deleted = hive.removeEstate(req.params.id);
  if (!deleted) return fail(res, 'Estate not found', 404);
  ok(res, { deleted: true, id: req.params.id });
});

// ── Drones ─────────────────────────────────────────────────────────────────

// GET /drones — list all drones
app.get('/drones', (req, res) => {
  const { status } = req.query;
  const drones = hive.getDrones(status as DroneStatus | undefined);
  ok(res, { drones, count: drones.length });
});

// GET /drones/:id — get a specific drone
app.get('/drones/:id', (req, res) => {
  const drone = hive.getDrone(req.params.id);
  if (!drone) return fail(res, 'Drone not found', 404);
  ok(res, drone);
});

// POST /drones — summon a drone
app.post('/drones', (req, res) => {
  const { type, name, capabilities } = req.body;
  if (!type || !name) return fail(res, 'type, name are required');
  const validTypes: DroneType[] = ['scanner', 'analyzer', 'validator', 'enricher'];
  if (!validTypes.includes(type)) {
    return fail(res, `type must be one of: ${validTypes.join(', ')}`);
  }
  try {
    const drone = hive.summonDrone({ type: type as DroneType, name, capabilities });
    ok(res, drone, 201);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// PATCH /drones/:id/recall — recall a drone
app.patch('/drones/:id/recall', (req, res) => {
  const drone = hive.recallDrone(req.params.id);
  if (!drone) return fail(res, 'Drone not found', 404);
  ok(res, drone);
});

// ── Missions ───────────────────────────────────────────────────────────────

// GET /missions — list all missions
app.get('/missions', (req, res) => {
  const { estateId } = req.query;
  const missions = hive.getMissions(estateId as string | undefined);
  ok(res, { missions, count: missions.length });
});

// GET /missions/:id — get a specific mission
app.get('/missions/:id', (req, res) => {
  const mission = hive.getMission(req.params.id);
  if (!mission) return fail(res, 'Mission not found', 404);
  ok(res, mission);
});

// POST /missions — launch a scan mission
app.post('/missions', (req, res) => {
  const { estateId, objective, priority } = req.body;
  if (!estateId || !objective) return fail(res, 'estateId, objective are required');
  try {
    const mission = hive.launchMission({ estateId, objective, priority });
    ok(res, mission, 201);
  } catch (err) {
    fail(res, (err as Error).message);
  }
});

// POST /missions/:id/complete — complete a mission with findings
app.post('/missions/:id/complete', (req, res) => {
  const { findings } = req.body;
  if (!Array.isArray(findings)) return fail(res, 'findings must be an array');
  const mission = hive.completeMission(req.params.id, findings);
  if (!mission) return fail(res, 'Mission not found', 404);
  ok(res, mission);
});

// ── Findings ───────────────────────────────────────────────────────────────

// GET /findings — list findings with optional filters
app.get('/findings', (req, res) => {
  const { category, severity, estateId } = req.query;
  const findings = hive.getFindings({
    category: category as IntelligenceCategory | undefined,
    severity: severity as 'low' | 'medium' | 'high' | 'critical' | undefined,
    estateId: estateId as string | undefined,
  });
  ok(res, { findings, count: findings.length });
});

// ── Intelligence ───────────────────────────────────────────────────────────

// GET /intelligence — generate intelligence report
app.get('/intelligence', (_req, res) => {
  const report = hive.generateIntelligenceReport();
  ok(res, report);
});

// ── Workers ────────────────────────────────────────────────────────────────

// GET /workers — list all workers
app.get('/workers', (_req, res) => {
  const workers = hive.getWorkers();
  ok(res, { workers, count: workers.length });
});

// ── Stats ──────────────────────────────────────────────────────────────────

app.get('/stats', (_req, res) => {
  ok(res, hive.getStats());
});


// ═══════════════════════════════════════════════════════════════════════════════
// 2060 SMART RESILIENCE LAYER — Auto-wired by Trancendos Compliance Engine
// ═══════════════════════════════════════════════════════════════════════════════
import {
  SmartTelemetry,
  SmartEventBus,
  SmartCircuitBreaker,
  telemetryMiddleware,
  adaptiveRateLimitMiddleware,
  createHealthEndpoint,
  setupGracefulShutdown,
} from '../middleware/resilience-layer';

// Initialize 2060 singletons
const telemetry2060 = SmartTelemetry.getInstance();
const eventBus2060 = SmartEventBus.getInstance();
const circuitBreaker2060 = new SmartCircuitBreaker(`${SERVICE_ID}-primary`, {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenMaxAttempts: 3,
});

// Wire telemetry middleware (request tracking + trace propagation)
app.use(telemetryMiddleware);

// Wire adaptive rate limiting (IAM-level aware)
app.use(adaptiveRateLimitMiddleware);

// 2060 Enhanced health endpoint with resilience status
app.get('/health/2060', createHealthEndpoint({
  serviceName: SERVICE_ID,
  meshAddress: MESH_ADDRESS,
  getCustomHealth: () => ({
    circuitBreaker: circuitBreaker2060.getState(),
    eventBusListeners: eventBus2060.listenerCount(),
    telemetryMetrics: telemetry2060.getMetricNames().length,
  }),
}));

// Prometheus text format metrics export
app.get('/metrics/prometheus', (_req: any, res: any) => {
  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(telemetry2060.exportPrometheus());
});

// Emit service lifecycle events
eventBus2060.emit('service.2060.wired', {
  serviceId: SERVICE_ID,
  meshAddress: MESH_ADDRESS,
  timestamp: new Date().toISOString(),
  features: ['telemetry', 'rate-limiting', 'circuit-breaker', 'event-bus', 'prometheus-export'],
});

// ═══════════════════════════════════════════════════════════════════════════════
// END 2060 SMART RESILIENCE LAYER
// ═══════════════════════════════════════════════════════════════════════════════

// ── Error Handler ──────────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Unhandled error');
  fail(res, err.message || 'Internal server error', 500);
});

export { app };
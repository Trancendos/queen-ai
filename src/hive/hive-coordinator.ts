/**
 * Queen AI — Hive Intelligence Coordinator
 *
 * Chairman-tier AI responsible for estate scanning orchestration,
 * drone summoning and management, worker coordination, and
 * intelligence report generation. Collaborates with The Dr, Norman, Guardian.
 *
 * Architecture: Trancendos Industry 6.0 / 2060 Standard
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// ── Types ─────────────────────────────────────────────────────────────────

export type DroneType = 'scanner' | 'analyzer' | 'validator' | 'enricher';
export type DroneStatus = 'idle' | 'active' | 'scanning' | 'analyzing' | 'complete' | 'failed' | 'recalled';
export type WorkerRole = 'data_collector' | 'pattern_matcher' | 'report_generator' | 'injector';
export type EstateType = 'github' | 'gitlab' | 'bitbucket' | 'vercel' | 'notion' | 'linear' | 'google_drive' | 'onedrive' | 'dropbox';
export type ScanStatus = 'queued' | 'in_progress' | 'complete' | 'failed';
export type IntelligenceCategory = 'security' | 'performance' | 'compliance' | 'opportunity' | 'risk';

export interface Drone {
  id: string;
  type: DroneType;
  status: DroneStatus;
  estateId?: string;
  assignedTask?: string;
  findings: Finding[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface Worker {
  id: string;
  role: WorkerRole;
  droneId?: string;
  status: 'available' | 'busy';
  tasksCompleted: number;
  createdAt: Date;
}

export interface Estate {
  id: string;
  name: string;
  type: EstateType;
  url: string;
  description?: string;
  lastScanned?: Date;
  scanCount: number;
  findingCount: number;
  createdAt: Date;
}

export interface ScanMission {
  id: string;
  estateId: string;
  droneIds: string[];
  status: ScanStatus;
  scanTypes: string[];
  findings: Finding[];
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

export interface Finding {
  id: string;
  missionId: string;
  droneId: string;
  category: IntelligenceCategory;
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  location?: string;
  recommendation?: string;
  createdAt: Date;
}

export interface IntelligenceReport {
  id: string;
  title: string;
  generatedAt: Date;
  period: string;
  totalEstates: number;
  totalScans: number;
  totalFindings: number;
  findingsBySeverity: Record<string, number>;
  findingsByCategory: Record<IntelligenceCategory, number>;
  topFindings: Finding[];
  recommendations: string[];
}

export interface HiveStats {
  totalDrones: number;
  activeDrones: number;
  idleDrones: number;
  totalWorkers: number;
  availableWorkers: number;
  totalEstates: number;
  totalMissions: number;
  completedMissions: number;
  totalFindings: number;
  criticalFindings: number;
}

// ── Hive Coordinator ──────────────────────────────────────────────────────

export class HiveCoordinator {
  private drones: Map<string, Drone> = new Map();
  private workers: Map<string, Worker> = new Map();
  private estates: Map<string, Estate> = new Map();
  private missions: Map<string, ScanMission> = new Map();
  private findings: Finding[] = [];

  constructor() {
    this.seedWorkers();
    logger.info('HiveCoordinator (Queen AI) initialized — The Hive is ready');
  }

  // ── Estate Management ───────────────────────────────────────────────────

  addEstate(params: {
    name: string;
    type: EstateType;
    url: string;
    description?: string;
  }): Estate {
    const estate: Estate = {
      id: uuidv4(),
      name: params.name,
      type: params.type,
      url: params.url,
      description: params.description,
      scanCount: 0,
      findingCount: 0,
      createdAt: new Date(),
    };
    this.estates.set(estate.id, estate);
    logger.info({ estateId: estate.id, name: estate.name, type: estate.type }, 'Estate registered');
    return estate;
  }

  getEstate(estateId: string): Estate | undefined {
    return this.estates.get(estateId);
  }

  getEstates(type?: EstateType): Estate[] {
    let estates = Array.from(this.estates.values());
    if (type) estates = estates.filter(e => e.type === type);
    return estates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  removeEstate(estateId: string): boolean {
    return this.estates.delete(estateId);
  }

  // ── Drone Management ────────────────────────────────────────────────────

  summonDrone(params: {
    type: DroneType;
    estateId?: string;
    assignedTask?: string;
  }): Drone {
    const drone: Drone = {
      id: uuidv4(),
      type: params.type,
      status: 'idle',
      estateId: params.estateId,
      assignedTask: params.assignedTask,
      findings: [],
      createdAt: new Date(),
    };
    this.drones.set(drone.id, drone);
    logger.info({ droneId: drone.id, type: drone.type, estateId: drone.estateId }, 'Drone summoned');
    return drone;
  }

  getDrone(droneId: string): Drone | undefined {
    return this.drones.get(droneId);
  }

  getDrones(status?: DroneStatus): Drone[] {
    let drones = Array.from(this.drones.values());
    if (status) drones = drones.filter(d => d.status === status);
    return drones;
  }

  recallDrone(droneId: string): Drone | undefined {
    const drone = this.drones.get(droneId);
    if (!drone) return undefined;
    drone.status = 'recalled';
    drone.completedAt = new Date();
    logger.info({ droneId }, 'Drone recalled');
    return drone;
  }

  // ── Scan Missions ───────────────────────────────────────────────────────

  launchMission(params: {
    estateId: string;
    scanTypes?: string[];
    droneCount?: number;
  }): ScanMission {
    const estate = this.estates.get(params.estateId);
    if (!estate) throw new Error(`Estate ${params.estateId} not found`);

    const droneCount = params.droneCount || 3;
    const droneTypes: DroneType[] = ['scanner', 'analyzer', 'validator'];
    const drones: Drone[] = [];

    for (let i = 0; i < droneCount; i++) {
      const drone = this.summonDrone({
        type: droneTypes[i % droneTypes.length],
        estateId: params.estateId,
      });
      drone.status = 'scanning';
      drone.startedAt = new Date();
      drones.push(drone);
    }

    const mission: ScanMission = {
      id: uuidv4(),
      estateId: params.estateId,
      droneIds: drones.map(d => d.id),
      status: 'in_progress',
      scanTypes: params.scanTypes || ['documentation', 'modules', 'functions', 'workflows'],
      findings: [],
      startedAt: new Date(),
      createdAt: new Date(),
    };

    this.missions.set(mission.id, mission);
    estate.scanCount++;
    estate.lastScanned = new Date();

    logger.info({ missionId: mission.id, estateId: params.estateId, drones: drones.length }, 'Scan mission launched');
    return mission;
  }

  completeMission(missionId: string, findings: Omit<Finding, 'id' | 'missionId' | 'droneId' | 'createdAt'>[]): ScanMission | undefined {
    const mission = this.missions.get(missionId);
    if (!mission) return undefined;

    const now = new Date();
    const newFindings: Finding[] = findings.map(f => ({
      id: uuidv4(),
      missionId,
      droneId: mission.droneIds[0] || 'unknown',
      ...f,
      createdAt: now,
    }));

    mission.findings = newFindings;
    mission.status = 'complete';
    mission.completedAt = now;

    this.findings.push(...newFindings);

    // Update estate finding count
    const estate = this.estates.get(mission.estateId);
    if (estate) estate.findingCount += newFindings.length;

    // Mark drones complete
    for (const droneId of mission.droneIds) {
      const drone = this.drones.get(droneId);
      if (drone) {
        drone.status = 'complete';
        drone.completedAt = now;
        drone.findings = newFindings.filter(f => f.droneId === droneId);
      }
    }

    logger.info({ missionId, findings: newFindings.length }, 'Mission completed');
    return mission;
  }

  getMission(missionId: string): ScanMission | undefined {
    return this.missions.get(missionId);
  }

  getMissions(estateId?: string): ScanMission[] {
    let missions = Array.from(this.missions.values());
    if (estateId) missions = missions.filter(m => m.estateId === estateId);
    return missions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ── Findings ────────────────────────────────────────────────────────────

  getFindings(filters?: {
    category?: IntelligenceCategory;
    severity?: Finding['severity'];
    estateId?: string;
    limit?: number;
  }): Finding[] {
    let findings = [...this.findings];
    if (filters?.category) findings = findings.filter(f => f.category === filters.category);
    if (filters?.severity) findings = findings.filter(f => f.severity === filters.severity);
    if (filters?.estateId) {
      const missionIds = new Set(
        Array.from(this.missions.values())
          .filter(m => m.estateId === filters.estateId)
          .map(m => m.id)
      );
      findings = findings.filter(f => missionIds.has(f.missionId));
    }
    findings.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    if (filters?.limit) findings = findings.slice(0, filters.limit);
    return findings;
  }

  // ── Intelligence Reports ─────────────────────────────────────────────────

  generateIntelligenceReport(): IntelligenceReport {
    const findings = this.findings;
    const findingsBySeverity: Record<string, number> = {};
    const findingsByCategory = {} as Record<IntelligenceCategory, number>;
    const categories: IntelligenceCategory[] = ['security', 'performance', 'compliance', 'opportunity', 'risk'];
    for (const cat of categories) findingsByCategory[cat] = 0;

    for (const f of findings) {
      findingsBySeverity[f.severity] = (findingsBySeverity[f.severity] || 0) + 1;
      findingsByCategory[f.category]++;
    }

    const topFindings = findings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .slice(0, 10);

    const recommendations: string[] = [];
    if (findingsBySeverity['critical'] > 0) recommendations.push(`Address ${findingsBySeverity['critical']} critical findings immediately`);
    if (findingsBySeverity['high'] > 0) recommendations.push(`Review ${findingsBySeverity['high']} high-severity findings`);
    if (findingsByCategory['security'] > 0) recommendations.push(`Security findings require Guardian AI review`);
    recommendations.push('Continue regular estate scanning');

    const report: IntelligenceReport = {
      id: uuidv4(),
      title: 'Hive Intelligence Report',
      generatedAt: new Date(),
      period: '24h',
      totalEstates: this.estates.size,
      totalScans: this.missions.size,
      totalFindings: findings.length,
      findingsBySeverity,
      findingsByCategory,
      topFindings,
      recommendations,
    };

    logger.info({ reportId: report.id, findings: findings.length }, 'Intelligence report generated');
    return report;
  }

  // ── Workers ──────────────────────────────────────────────────────────────

  getWorkers(): Worker[] {
    return Array.from(this.workers.values());
  }

  // ── Stats ────────────────────────────────────────────────────────────────

  getStats(): HiveStats {
    const drones = Array.from(this.drones.values());
    const workers = Array.from(this.workers.values());
    const missions = Array.from(this.missions.values());

    return {
      totalDrones: drones.length,
      activeDrones: drones.filter(d => ['active', 'scanning', 'analyzing'].includes(d.status)).length,
      idleDrones: drones.filter(d => d.status === 'idle').length,
      totalWorkers: workers.length,
      availableWorkers: workers.filter(w => w.status === 'available').length,
      totalEstates: this.estates.size,
      totalMissions: missions.length,
      completedMissions: missions.filter(m => m.status === 'complete').length,
      totalFindings: this.findings.length,
      criticalFindings: this.findings.filter(f => f.severity === 'critical').length,
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private seedWorkers(): void {
    const roles: WorkerRole[] = ['data_collector', 'pattern_matcher', 'report_generator', 'injector'];
    for (const role of roles) {
      const worker: Worker = {
        id: uuidv4(),
        role,
        status: 'available',
        tasksCompleted: 0,
        createdAt: new Date(),
      };
      this.workers.set(worker.id, worker);
    }
    logger.info({ count: roles.length }, 'Worker pool seeded');
  }
}
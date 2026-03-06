# Queen AI 👑

> Hive coordination, drone management, and estate intelligence service for the Trancendos mesh.
> Zero-cost compliant — no LLM calls, all rule-based scanning.

**Port:** `3020`
**Architecture:** Trancendos Industry 6.0 / 2060 Standard

---

## Overview

Queen AI orchestrates a swarm of drones to scan, analyze, and validate external estates (GitHub, GitLab, Notion, Linear, Google Drive, etc.). It generates intelligence reports from findings and coordinates worker processes within the hive.

---

## Core Concepts

| Concept | Description |
|---------|-------------|
| **Estate** | An external platform to be scanned (GitHub repo, Notion workspace, etc.) |
| **Drone** | An autonomous scanning unit (scanner / analyzer / validator / enricher) |
| **Mission** | A scan operation targeting a specific estate |
| **Finding** | An intelligence item discovered during a mission |
| **Worker** | A persistent background process within the hive |

---

## Drone Types

| Type | Description |
|------|-------------|
| `scanner` | Discovers and enumerates estate contents |
| `analyzer` | Analyzes patterns and extracts insights |
| `validator` | Validates compliance and correctness |
| `enricher` | Enriches findings with additional context |

---

## Estate Types

`github` · `gitlab` · `bitbucket` · `vercel` · `notion` · `linear` · `google_drive` · `onedrive` · `dropbox`

---

## API Reference

### Health

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |
| GET | `/metrics` | Runtime metrics + hive stats |

### Estates

| Method | Path | Description |
|--------|------|-------------|
| GET | `/estates` | List estates (filter by type) |
| GET | `/estates/:id` | Get a specific estate |
| POST | `/estates` | Add an estate |
| DELETE | `/estates/:id` | Remove an estate |

### Drones

| Method | Path | Description |
|--------|------|-------------|
| GET | `/drones` | List drones (filter by status) |
| GET | `/drones/:id` | Get a specific drone |
| POST | `/drones` | Summon a drone |
| PATCH | `/drones/:id/recall` | Recall a drone |

### Missions

| Method | Path | Description |
|--------|------|-------------|
| GET | `/missions` | List missions (filter by estateId) |
| GET | `/missions/:id` | Get a specific mission |
| POST | `/missions` | Launch a scan mission |
| POST | `/missions/:id/complete` | Complete a mission with findings |

### Findings

| Method | Path | Description |
|--------|------|-------------|
| GET | `/findings` | List findings (filter by category, severity, estateId) |

### Intelligence

| Method | Path | Description |
|--------|------|-------------|
| GET | `/intelligence` | Generate intelligence report |

### Workers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/workers` | List all hive workers |

### Stats

| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats` | Hive statistics |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3020` | HTTP server port |
| `HOST` | `0.0.0.0` | HTTP server host |
| `LOG_LEVEL` | `info` | Pino log level |
| `HIVE_INTERVAL_MS` | `900000` | Periodic hive status interval (ms) |

---

## Development

```bash
npm install
npm run dev       # tsx watch mode
npm run build     # compile TypeScript
npm start         # run compiled output
```

---

*Part of the Trancendos Industry 6.0 mesh — 2060 Standard*
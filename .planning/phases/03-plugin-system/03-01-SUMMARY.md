---
phase: 03-plugin-system
plan: 01
subsystem: database
tags: [sqlite, drizzle, worker-threads, plugin-system, manifest]

# Dependency graph
requires:
  - phase: 02-chest-scanner
    provides: [extended schema patterns, db import conventions]
provides:
  - plugins table with id, name, version, description, author, enabled, settings
  - pluginSettings composite PK table for per-plugin key-value config
  - plugin-manifest.js utility for parsing and validating plugin.json
  - PluginLoader service for scanning, syncing, and managing plugin workers
affects: [03-02, 03-03, 03-04]

# Tech tracking
tech-stack:
  added: []
  patterns: [worker-threads-per-plugin, manifest-based-plugin-discovery]

key-files:
  created:
    - backend/src/utils/plugin-manifest.js
    - backend/src/services/plugin-loader.js
  modified:
    - backend/src/db/schema.js

key-decisions:
  - "Worker threads per plugin for isolation (not child_process)"
  - "Composite PK on pluginSettings (pluginId + key) for upsert patterns"

patterns-established:
  - "Plugin manifest: plugin.json with id, name, version, entry fields"
  - "Plugin discovery: scan data/plugins/ subdirectories for valid manifests"

requirements-completed: []

# Metrics
duration: 1min 44s
completed: 2026-07-26
---

# Phase 03 Plan 01: Plugin Schema & Core Loader Summary

**Plugin database schema (plugins + pluginSettings tables) with drizzle relations, manifest parser utility, and PluginLoader service using worker_threads for isolated plugin execution**

## Performance

- **Duration:** 1min 44s
- **Started:** 2026-07-26T05:59:15Z
- **Completed:** 2026-07-26T06:00:59Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Added plugins and pluginSettings tables to drizzle schema with relations
- Created plugin manifest parser with validation (parseManifest, validateManifest)
- Built PluginLoader service: scan → DB sync → worker thread spawn → hot-reload toggle

## Task Commits

Each task was committed atomically:

1. **task 1: Add plugin database schema** - `3f85857` (feat)
2. **task 2: Create plugin manifest parser** - `cfad51f` (feat)
3. **task 3: Create PluginLoader service** - `e6d23f7` (feat)

## Files Created/Modified
- `backend/src/db/schema.js` - Added plugins, pluginSettings tables + primaryKey import + relations
- `backend/src/utils/plugin-manifest.js` - parseManifest and validateManifest utilities
- `backend/src/services/plugin-loader.js` - PluginLoader class with worker thread management

## Decisions Made
- Worker threads per plugin for process isolation without full child_process overhead
- Composite primary key (pluginId + key) on pluginSettings for clean upsert patterns
- Native fs/promises throughout (no fs-extra dependency)
- PluginLoader exported as singleton for global access

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Known Stubs
None - all exports are fully functional.

## Threat Flags
None - no new network endpoints or auth paths introduced.

## Self-Check: PASSED

---
*Phase: 03-plugin-system*
*Completed: 2026-07-26*

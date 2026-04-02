# Future-State Runtime Call Stack

- Ticket: `linux-appimage-memory-dir-startup`
- Version: `v2`
- Design Basis: `tickets/in-progress/linux-appimage-memory-dir-startup/proposed-design.md`
- Last Updated: `2026-04-02`

## Use Case Index

| use_case_id | Source Type | Maps To | Primary | Fallback | Error |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001, R-002 | Yes | N/A | Yes |
| UC-002 | Requirement | R-003, R-004 | Yes | N/A | Yes |
| UC-003 | Requirement | R-003 | Yes | N/A | No |
| UC-004 | Requirement | R-005 | Yes | N/A | Yes |
| UC-005 | Requirement | R-006 | Yes | N/A | No |

## UC-001 Bootstrap Resolves Effective Config Before Runtime Import

```text
[ENTRY] Electron launcher executes dist/app.js --port ... --data-dir <user-app-data-dir>
  -> src/app.ts parses CLI args
  -> appConfigProvider.initialize({ appDataDir: <user-app-data-dir> })
  -> AppConfig constructed with effective app data dir already known
  -> AppConfig.initialize()
  -> dynamic import("./server-runtime.js")
[EXIT] imported runtime graph only sees effective startup config
```

## UC-002 Runtime Graph Imports After Bootstrap

```text
[ENTRY] src/server-runtime.ts import after provider bootstrap
  -> startup modules import services/resolvers/providers
  -> touched modules resolve config-derived paths lazily
  -> migrations / Fastify / background tasks start
[EXIT] no startup-sensitive module binds filesystem paths from stale pre-bootstrap config
```

## UC-003 Team Member Projection Still Computes Member Memory Dir

```text
[ENTRY] TeamMemberRunViewProjectionService.getProjection(teamRunId, memberRouteKey)
  -> resolve member metadata
  -> lazily resolve TeamMemberMemoryLayout from appConfigProvider.config.getMemoryDir()
  -> build metadata.memoryDir = <memoryRoot>/agent_teams/<teamRunId>/<memberRunId>
  -> delegate projection resolution
[EXIT] runtime/history contract remains intact with configured memory root
```

## UC-004 Packaged Linux Executable Validation

```text
[ENTRY] local Stage 7 executable validation
  -> build Linux AppImage from patched worktree
  -> launch AppImage under timeout
  -> embedded server starts
  -> logs show APP DATA DIRECTORY + MEMORY DIRECTORY under ~/.autobyteus/server-data
[EXIT] packaged startup path is validated end-to-end
```

## UC-005 Regression Provenance Capture

```text
[ENTRY] investigation phase
  -> git blame identifies eager layout line
  -> git show captures introducing commit/message/date
  -> ticket artifacts record commit 03b8f9a (2026-03-30)
[EXIT] regression origin is traceable for future release/debug follow-up
```

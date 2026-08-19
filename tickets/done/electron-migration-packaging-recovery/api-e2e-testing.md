# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current validation round: `4`
- Trigger: `UV-002` Team history discoverability re-entry
- Latest authoritative round: `4`
- API/E2E revision: `API-REV-004`
- Upstream basis: requirements through `AC-MIG-020`; design/runtime v8; `SR-005`; `ARCH-REV-008`; `IR-003`; `CRR-007`
- Result / confidence: `Pass / 98.7%`

## Testing Scope

- Backend: validated TeamRun roots, deterministic Team history projection, strict index snapshot, preservation, backup, atomic/no-op persistence, catalog and GraphQL.
- Persisted lifecycle: copied operational DB/index/tree state, retry at attempt 5, restart idempotence.
- Packaging: production dependency boundary, current embedded server staging, exact personal Linux x64 builder, packaged lifecycle, actual AppImage readiness.
- Data safety: operational `~/.autobyteus/server-data` was never mutated.

## Acceptance Coverage

| Acceptance | Scenario | Status |
| --- | --- | --- |
| `AC-MIG-001`–`014` | preserved cumulative migration suites | Passed |
| `AC-MIG-015`–`020` | reconciler tests, mixed integration, copied 8/5 lifecycle, GraphQL, restart | Passed |
| `AC-PKG-001`–`005` | boundary test/guard, canonical build, artifact, lifecycle, AppImage | Passed |
| `AC-TEST-001` | durable and executable validation | Passed |

## Current Execution Evidence

- 11 migration/run-history files: `68/68` tests passed after Prisma generation in the fresh recovered clone.
- Electron package-boundary integration: `2/2` passed; guard, production list, symlink, and diff audit passed.
- Copied operational retry: V1 `FAILED/4 -> SUCCEEDED/5`; exact eight Team rows, exact five superrepo rows, preserved summaries, no standalone Agent duplication.
- Copied GraphQL: exact five expected Team run IDs.
- Second copied startup: unchanged index hash, attempt count, backup inventory, memory inventory, and GraphQL result.
- Canonical personal Linux x64 build: passed.
- Artifact: 533,488,451 bytes; SHA-256 `ceb3a04a015075cd4fba01c1a8469965cdaff61720715d6f6a43503f8bf66b9e`.
- Packaged server: all 21 Prisma migrations, health pass, clean SIGTERM close.
- Actual isolated AppImage: all migrations applied; `ServerStatusManager: Server is ready`; no scoped TeamRun/migration failure.

## Environment Incident And Recovery

The assigned SSD twice returned kernel `EIO`, lost `ata3`, and aborted its ext4 journal during canonical build I/O. This was not an `ENOSPC` or application failure. The candidate was reconstructed on `/home/ryan-ai/miniHDD/autobyteus-history-build-20260816` from hash-verified tracked/untracked recovery archives over exact base `840fa0d2443f624a36a507905540164f80c7640e`, then the complete affected test set and canonical build were rerun successfully.

## Cleanup And Residual Risk

- Owned server processes stopped; ports 29695 and 29795 are free.
- Lifecycle harness removed its temporary data; isolated AppImage home moved to trash.
- Fresh AppImage retained for user verification.
- Live migration remains terminal at its existing success record and will not automatically rerun; changing live state is outside this handoff.
- The SATA path remains a real machine-level reliability risk. It does not reduce confidence in the recovered candidate but must be repaired before the SSD is trusted.

## Gate Decision

- Stage 7: `Pass`.
- Final confidence: `98.7%`.
- Critical criteria directly proven: `Yes`.
- Next stage: Stage 8 proportional review of the two changed durable test files.

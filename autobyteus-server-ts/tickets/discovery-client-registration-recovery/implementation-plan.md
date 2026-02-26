# Implementation Plan - discovery-client-registration-recovery

## Small-Scope Solution Sketch
- Add registration state + in-flight guard in discovery client.
- Run heartbeat through recovery wrapper that ensures registration and handles unknown-node responses.
- Parse heartbeat/register JSON payloads for `accepted=false` to avoid false-success behavior.
- Add unit coverage for startup register failure retry and unknown-heartbeat re-registration.
- Add e2e startup-order coverage (client-first).

## Tasks
1. Update `src/discovery/services/discovery-registry-client-service.ts` for single-flight registration + unknown-heartbeat recovery.
2. Add unit tests in `tests/unit/discovery/services/discovery-registry-client-service.test.ts`.
3. Extend discovery e2e in `tests/e2e/discovery/discovery-process-smoke.e2e.test.ts` with client-first startup.
4. Run targeted verification suites sequentially (shared SQLite test DB lock risk).

## Requirement Traceability
| Requirement | Design Basis | Use Case | Planned Changes | Verification |
| --- | --- | --- | --- | --- |
| `AC-001` | Small-scope solution sketch | `UC-001` | `discovery-registry-client-service.ts` registration recovery path | unit + e2e |
| `AC-002` | Small-scope solution sketch | `UC-002` | heartbeat rejection handling + re-register/heartbeat retry | unit |
| `AC-003` | Small-scope solution sketch | `UC-001`/`UC-003` | discovery smoke test client-first startup scenario | e2e |
| `AC-004` | Small-scope solution sketch | `UC-001`/`UC-002` | dedicated unit coverage | unit |

## Verification
- `pnpm vitest run tests/unit/discovery/services/discovery-registry-client-service.test.ts`
- `pnpm vitest run tests/e2e/discovery/discovery-process-smoke.e2e.test.ts`

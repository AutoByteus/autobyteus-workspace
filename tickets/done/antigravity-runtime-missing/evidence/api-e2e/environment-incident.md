# API-ENV-001 — Inherited SQL target during initial browser setup

Owner/preliminary origin: API/E2E execution setup (Local Fix), NOT Antigravity implementation. Detected independently during startup log review in round 1.

Expected: owned data root and database only, backend port 30697; production app/backend and data untouched.
Observed: `--data-dir /tmp/agy-api-e2e.agNVix/data` isolated filesystem repositories, but ambient `DATABASE_URL=file:/Users/normy/.autobyteus/server-data/db/production.db`, `APP_ENV=production`, and `AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:29695` won over its `.env`. Initial owned PID 12928 connected to production SQL. `backend-inherited-env.log` records the resolved target and `No pending migrations to apply.` A startup app may read/write SQL beyond migrations; no pre-start DB snapshot was taken, so absence of changes cannot be established. Do not infer data loss or no impact. The logged settings initialization registers in-memory predefined settings (server-settings-service.ts), not itself proof of SQL writes.

Operations before stop: normal server startup/cache preload; read-only availability/model/health queries; create one synthetic Agent and Team using public GraphQL (these definition stores are filesystem-backed under the temporary data root); browser read surfaces and team launch draft (no Run Team submission or AGY run launched by this backend). User CLI live tests independently use disposable memory/workspaces. No production database copied, reset or deliberately mutated; no installed app/backend process restarted or binary patched.

Containment: stopped only PID 12928 immediately on discovery, preserved log and informed user. No rollback/repair against production DB attempted because unrelated active writes cannot be distinguished. Restart PID 28810 explicitly supplied APP_ENV=test, DB_TYPE=sqlite, AUTOBYTEUS_SERVER_HOST=http://127.0.0.1:30697 and DATABASE_URL=file:/tmp/agy-api-e2e.agNVix/data/db/validation.db. Verified actual startup log target and creation of validation.db before subsequent API/browser execution. `backend.log` is the corrected run; earlier API responses superseded.

Residual: safety/no-production-data-impact proof is unresolved even if AGY behavior passes. Request focused failure-origin review of this API-owned environment incident and the appropriate recovery/acceptance gate; do not attribute it to the product patch. A safe rerun proves behavior, not that the earlier accidental connection had zero effect. No automatic release/delivery sign-off.

## API-REV-002 / CRR-001 Reconciliation — Current Status
Origin confirmed **Local Fix — API/E2E-owned environment/execution/reporting** by CRR-001 (cc001b07c). Source and matching built startup independently re-read. No new production inspection, secret access/copy, process launch or recovery performed. Incident remains **open, impact unknown**.

### Reached Startup Boundaries (not proof of actual conditional mutation)
| Path | Source-supported operation | Available evidence / missing fact |
| --- | --- | --- |
| server-runtime.ts:118–179; dist/server-runtime.js | Schema migration → Prisma → token-usage coverage → vault bootstrap → app-data runPending, before listening | Initial log reaches listening; these phases were reached. Log's schema 'No pending migrations' addresses only first phase. |
| token-usage/repositories/sql/token-usage-analytics-repository.ts:36–43 | Coverage upsert creates a row if absent; empty update if existing | Prior row existence and actual creation unknown. No per-operation audit or baseline in retained evidence. |
| secret-management/bootstrap/secret-vault-bootstrap.ts | Existing vault verification or missing metadata/key initialization, with possible degraded health | Prior metadata/key state and taken branch unknown. Boundary includes production.db.secret.key next to SQL DB, not only temp-root files. No claim of key creation/alteration/disclosure. No key was opened by this investigation. |
| app-data-migrations/app-data-migration-runner.ts:56–79 | Successful records skipped; other required definitions can execute and write records/payloads | Prior app-data records and exact branches unknown. Schema migration message does not cover these application-data operations. No particular migration or changed payload attributed. |

The retained startup log has no independent pre-state, operation-level audit, or detailed completion evidence sufficient to establish the relevant branches. Original temporary internal state/logs were removed by recorded cleanup; do not reconstruct/fabricate them. Recorded listening interval 2026-09-27 09:08:47–09:12:01 from log timestamps bounds listening, not all pre-listen startup. No source change to these paths introduced by AGY patch. This is bounded source/log reconciliation, not exhaustive forensics.

### Resolution Split
- Containment/corrected functional execution: supported by retained original/corrected logs and cleanup; reused without full rerun.
- Reporting correction: now explicitly covers conditional coverage-row, vault/key and app-data effects.
- Recurrence prevention: `prelaunch-isolation-checklist.md` requires a checked, explicitly constructed child environment and resolved SQL/key/data/memory ownership BEFORE launch. No claim it was run retroactively; post-start target-log checking is too late to prevent writes.
- Prior-impact closure: **not established**. Neither data loss nor non-impact is proven. Current timestamps or a new safe run would not recover missing prior state.

No additional production inspection/copy, recovery, migration or rollback is authorized by CRR-001 or performed here. An informed user disposition through Solution Designer is required before release progression if technical closure evidence is unavailable. Acceptance of residual uncertainty must remain labelled acceptance, not 'production untouched'. The existing functional Pass evidence remains valid; overall technical validation remains Fail, 92.1% / environment 75%. Separate proportional durable-test review remains pending per CRR-001 after successful resolution.

## API-REV-004 / SR-007 — User-Accepted Residual Uncertainty
Current administrative disposition: **accepted for progression**, per user-continuation-disposition.md exact user continuation after incident disclosure. Pending user-decision hold is resolved. This supersedes the earlier pending-disposition wording, not the incident facts.
Technical effects remain unknown; neither non-impact nor loss proven. Confidence unchanged92.1% / environment75%; no clean technical Pass or claim of production untouched. No new production inspection/secret copying/recovery performed. Another user-requested preflight-isolated browser Team response passed (API-009), which is current functionality proof, not historical non-impact proof. Continue to CRR-001 proportional durable-test review without duplicate origin inquiry or another acceptance request. No automatic release/installation authorization.

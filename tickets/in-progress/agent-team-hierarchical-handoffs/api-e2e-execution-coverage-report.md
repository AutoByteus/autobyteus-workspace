# API/E2E Execution Coverage Report

## Execution Round Meta

- Current revision: `API-REV-036`
- Date: 2026-08-13
- Current HEAD: `6b578235917700584a6b559cd58763bd3bba9b38`
- Production correction under recheck: `IR-042` / `50ae8244872502623b3ab19e5ab81bd5e06875c9`
- Trigger: `CRR-078 Pass / 92.5%`
- Result: **Pass**
- Final confidence: **98%**
- Broader-validation decision: **Required and completed**

## Prior Failure Resolution

| Prior finding | API-REV-035 result | API-REV-036 resolution |
| --- | --- | --- |
| `API-F-024`: actual AutoByteus content does not repeat `segment_type`, causing visible Team rejections | Fail / 80% | Actual native START/CONTENT/END now passes the run-owned lifecycle into Team/standalone/application. Fresh AutoByteus Team has zero segment rejection cards; Codex and Claude also pass. |
| `CR-F-043`: API/E2E-owned disposable journal residue | API-REV-035 cleanup incomplete | Before configured/live execution, metadata-only verification proved the exact owned residue; API/E2E removed only it. Fresh cleanup leaves no API-REV-036 owned runtime/database/vault/sidecar. Operational database action/inspection remained none. |

## Durable Coverage Maintenance

The coverage investigation was refreshed before edits. Currentized boundaries include:

- actual native provider converter behavior across AutoByteus, Codex, and Claude;
- run-owned START/CONTENT/END lifecycle, missing identity, mismatch, replay, post-end, typed state, turn isolation, and recovery;
- Codex reasoning block lifecycle without generated identity;
- Team, standalone WebSocket, application, memory, compaction, external-channel, and snapshot consumers of already-canonical output;
- browser `{turnId,id}` lookup with exact stored `segmentType`, typed-late creation, mismatch/no-mutation, and type-less END;
- strict four-field execution-address parsing without retired route/path selectors;
- replacement of stale Team cases formerly located at a standalone mapper owner;
- removal of two obsolete pre-SR-018 integration fake architectures only after explicit coverage decisions and current replacement proof.

Cumulative durable package:

- total paths: `109`;
- status: `4 added / 97 updated / 8 removed`;
- scope: `53 server / 56 web`;
- active paths: `101`;
- inventory/patch path and status equality: Pass;
- reverse-apply check: Pass;
- missing active paths: zero;
- missing relative imports: zero;
- active `.skip/.only/.todo`: zero;
- diff hygiene: Pass.

Authoritative inventory and patch:

- `api-e2e-evidence-sr020/api-rev-036/investigation/cumulative-durable-coverage-inventory.tsv`
- `api-e2e-evidence-sr020/api-rev-036/investigation/cumulative-durable-diff.patch`

## Repository And Build Execution

| Selection | Result | Evidence |
| --- | --- | --- |
| Browser segment handler currentization | `1 file / 22 tests` Pass | `repository/segment-handler-currentized-final.log` |
| Actual converter -> AgentRun lifecycle -> Team/standalone/application | `1 file / 9 tests` Pass | `repository/segment-lifecycle-team-focused-round1.log` |
| Provider converters | `3 files / 115 tests` Pass | `repository/provider-converters-currentized-final.log` |
| Codex reasoning lifecycle | `2 files / 61 tests` Pass | `repository/codex-reasoning-currentized-final.log` |
| Runtime memory lifecycle | `1 file / 21 tests` Pass | `repository/runtime-memory-currentized-round1.log` |
| Compaction/external consumers | `2 files / 16 tests` Pass | `repository/downstream-output-consumers-currentized-final.log` |
| Standalone/Team websocket mappers | `2 files / 11 tests` Pass | `repository/websocket-mappers-currentized-round1.log` |
| SR-020 affected server aggregate | `14 files / 291 tests` Pass | `repository/sr020-server-affected-currentized-round1.log` |
| Web segment/tool handlers | `10 files / 86 tests` Pass | `repository/web-segment-tool-handlers-final.log` |
| Current broad server | `67 passed files / 1 capability-gated skipped`; `622 passed / 9 skipped` tests | `repository/current-server-selection-final3.log` |
| Current broad web | `73 files / 540 tests` Pass | `repository/current-web-selection.log` |
| Server production build | production TypeScript, assets, sanitized no-DB bootstrap Pass | `repository/server-build-full.log` |
| Nuxt production build | Pass; 15 routes prerendered | `repository/web-production-build.log` |

The declared skipped Claude integration suite is excluded from provider proof. Fresh configured Claude Team and standalone browser execution below directly covers that runtime.

## Checked Disposable Environment

- Protected-port checks were metadata-only; no action was taken on `60004/31004`.
- Configuration-only preflight proved the exact absent target `autobyteus-server-ts/db/api-rev-036-live-20260813-1.db`, rejected any operational-path match, excluded ambient database selectors, materialized the exact runtime `.env`, and did not initialize a database.
- Prisma migrations ran only against that exact worktree database.
- Actual TTY `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:///.../api-rev-036-live-20260813-1.db` accepted `IMPORT` and configured nine identifiers only in the disposable vault; no secret values were logged.
- Server startup used `test-support/live-e2e/test-runtime-bootstrap.mjs` / `startBuiltTestServer` only. PID `lsof` showed the exact disposable database and no operational path.
- Nuxt bound at `127.0.0.1:31236` only to the checked server at `127.0.0.1:60236`.
- The private Nested Classroom fixture was copied and overlaid only inside the disposable runtime; before/after source hashes match.

## Fresh Real Browser / Provider Matrix

### Imported Nested Classroom Team

| Runtime / model | Result | Direct evidence |
| --- | --- | --- |
| AutoByteus / `gpt-5.6-luna` | Pass | distinct root; one nested task; exact peer request/reply; exact submission/acceptance; four rooted messages; active/awaiting-review/accepted; refresh/cleanup/termination; zero protocol or console errors |
| Codex App Server / `gpt-5.6-luna` / `medium` | Pass | same exact lifecycle on a distinct root; zero protocol or console errors |
| Claude Agent SDK / `sonnet` | Pass | same exact lifecycle on a distinct root; zero protocol or console errors |

Evidence: `live/browser/{autobyteus,codex,claude}-browser-row.json`, screenshots, provider traces, and exact public task/message/metadata records.

### Standalone Agent

AutoByteus, Codex, and Claude each pass fresh first-send, exact live output, persisted reload/restore, exact resume runtime/model, zero console errors, and termination. Two initial AutoByteus temporary-script attempts exposed only stale GraphQL/locator authoring seams; both runs terminated cleanly, the script was currentized, and the final three rows are fresh passes.

Evidence: `live/browser/standalone-{autobyteus,codex,claude}.json` and screenshots.

### Desktop / Mobile / Restore

One fresh rooted AutoByteus Team passes active desktop and paired-mobile exact communication/reference count, content, open/back behavior, and selected-Team read-only configuration. After termination, the identical exact root passes persisted history selection and desktop/mobile reference restore with zero console errors.

Evidence: `live/browser/active-desktop-mobile-reference.json`; `live/browser/persisted-desktop-mobile-reference.json`; screenshots.

## Cleanup And Safety

- Provider traces and public records were copied before cleanup.
- Owned server/frontend stopped; `60236/31236` closed.
- Checked cleanup removed the disposable runtime, database, vault key, WAL/SHM/journal candidates, and only those owned paths.
- Operational database action: **NONE**.
- Operational database inspection: **NONE**.
- Protected `60004/31004` action: **NONE**.
- Four stashes, delivery backup, rollback, and repair action: **NONE**.
- Both historical operational-database incident disclosures remain preserved.

## Confidence Scorecard

| Category | Score | Evidence |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | Every critical SR-020 lifecycle and retained SR-018 Team/standalone/mobile/restore surface is directly proven. |
| Changed-boundary execution directness | 99% | Actual provider converters traverse the real run-owned lifecycle and strict consumers; browser invariant behavior is directly covered. |
| Cross-boundary integration realism and mock gap | 98% | Real Chrome, WebSocket, GraphQL, persistence, restore, mobile pairing, imported package, and all three providers. |
| Environment, configuration, identity, and fixture fidelity | 99% | Exact disposable target, real TTY vault import, PID lsof, public import, canonical roots/addresses, and checked cleanup. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Missing identity, before-start, mismatch, replay, post-end, type surplus, turn isolation, later recovery, termination, and restore. |
| User-surface, browser, and desktop-shell confidence | 97% | Desktop-equivalent browser and responsive mobile pass; no Electron-shell-specific behavior changed or claimed. |
| Durable regression coverage quality and relevance | 98% | Current owner seams, actual native sequences, strict negative cases, complete inventory/patch, no missing imports or skipped active paths. |

Overall simple average: **98%**. No critical criterion is missing or failing, and no applicable category is below 90%.

## Outcome And Routing

API-REV-036 result: **Pass / 98%**. Broader validation was required and completed. Because repository-resident durable coverage was added, updated, and removed, route the complete cumulative artifact package to `code_reviewer` for proportional test-code review before delivery.

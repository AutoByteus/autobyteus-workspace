# API/E2E Execution Coverage Report

## Execution Round Meta

- Current revision: `API-REV-038`
- Date: 2026-08-13
- Current HEAD: `258d18cdba0bf7ae08bde134fe09586a8906870d`
- Production correction under recheck: unchanged `SR-024` / `ARCH-REV-018` / `IR-044`; durable-test correction only
- Trigger: `CRR-082 Fail — Local Fix` / `TR-F-006`
- Result: **Pass**
- Final confidence: **98%**
- Broader-validation decision: **Not Required for the bounded test-only correction; API-REV-037 live evidence retained unchanged**

## API-REV-038 Local-Fix Result

CRR-082 accepted API-REV-037's product/runtime **Pass / 98%** and seven of its nine durable updates, but found that the two Codex converter suites still structurally bypassed the thread-owned nominal boundary. API-REV-038 corrected only that durable-test construction at unchanged production/runtime HEAD.

### Corrected durable boundary

- Added `autobyteus-server-ts/tests/fixtures/codex-thread-event-harness.ts`, a real production-composition driver using `CodexThread`, actual public notification/request operations, the real listener, lifecycle snapshot projector, and `CodexThreadEventConverter`.
- Updated `codex-reasoning-block-converter.test.ts` so every retained native case crosses `handleAppServerNotification()`. The missing-turn scenario observes zero listener and zero converted-event effect. Local completion/approval cases use only thread-owned supported operations, and a retired multi-turn direct-converter expectation was currentized to exact active-turn inheritance.
- Updated `codex-thread-event-converter.test.ts` consistently: 57/57 cases consume only actual thread-emitted listener messages; MCP completion and approval facts are materialized through their production thread operations.
- No changed suite or harness imports/constructs/casts an opaque thread-event type, accesses its brand, or calls `.convert({ ... })` with a structural literal.

Focused execution:

| Selection | Result | Evidence |
| --- | --- | --- |
| Current Codex thread/converter/reasoning selection | `3 files / 147 tests` Pass | `api-e2e-evidence-sr024/api-rev-038/repository/codex-thread-focused.log` |
| Focused changed-test TypeScript | Pass | `repository/focused-test-typecheck.log` |
| Production TypeScript | Pass | `repository/production-typecheck.log` |
| No-fabrication/static/diff audit | Pass | `repository/codex-no-fabrication-audit.log` |

The generic repository `pnpm typecheck` remains the already-disclosed TS6059 `rootDir/include` configuration failure before useful test diagnostics; it is not claimed as a Pass. A temporary build-config-derived focused TypeScript config directly checked the new fixture and two suites and passed, then was removed.

### Corrected package accounting

The complete SR-024 delta is now exactly `10` paths = `1 added / 9 updated / 0 removed`. Inventory/patch path equality, reverse application, active-file existence, and diff hygiene pass. The added path is the shared Codex real-thread fixture; the two reviewed-failing suites are updated; the other seven API-REV-037 paths are unchanged and retain CRR-082's acceptance.

Authoritative delta evidence:

- `api-e2e-evidence-sr024/api-rev-038/investigation/cumulative-durable-coverage-inventory.tsv`
- `api-e2e-evidence-sr024/api-rev-038/investigation/cumulative-durable-diff.patch`
- `api-e2e-evidence-sr024/api-rev-038/investigation/cumulative-durable-inventory-audit.log`
- `api-e2e-evidence-sr024/api-rev-038/api-rev-038-handoff-check.log`
- `api-e2e-evidence-sr024/api-rev-038/final-evidence-manifest.sha256`

### Confidence and broader validation

API-REV-037's source, runtime configuration, checked environment, and real browser/provider state are unchanged. Its fresh `8/8` functional matrix remains authoritative. Repeating external-provider/browser execution would not improve evidence for this nominal test-code issue, so broader validation is **Not Required**.

| Category | Score | Evidence |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | R-053/AC-049 now has durable real-thread entry plus retained API-REV-037 system proof. |
| Changed-boundary execution directness | 99% | Actual `CodexThread` public boundaries, listener, and converter are composed in 109 maintained converter/reasoning cases. |
| Cross-boundary integration realism and mock gap | 98% | Real nominal thread boundary plus unchanged API-REV-037 Chrome/provider evidence. |
| Environment, configuration, identity, and fixture fidelity | 99% | No environment change; retained checked-disposable proof and exact active-turn thread fixtures. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Missing-turn reject-before-listener, native/local separation, lifecycle, MCP, approval, and recovery cases. |
| User-surface, browser, and desktop-shell confidence | 97% | Unchanged fresh API-REV-037 desktop-equivalent/mobile matrix; no shell-specific claim. |
| Durable regression coverage quality and relevance | 98% | No nominal bypass, fake brand, cast, or direct structural converter input; exact package audit passes. |

Overall confidence remains **98%**. Result: **Pass**. Return the corrected ten-path package to `code_reviewer` for proportional re-review before delivery.

## Prior Findings And Cleanup Resolution

| Finding / prior state | API-REV-037 disposition |
| --- | --- |
| `CR-F-046`: Claude delta boundary formerly altered raw string bytes | Resolved downstream. Current durable converter and lifecycle coverage preserves leading/trailing spaces, whitespace-only content, newlines, repeated values, and overlap-shaped values exactly. |
| `CR-F-047`: direct/Team collectors formerly reconciled equality/prefix/suffix/overlap/final output | Resolved downstream. Every accepted canonical string delta is appended exactly once; resulting direct and Team output is exactly `" hello  \nfoo\nxxabbc"`. |
| `CR-F-043`: API/E2E-owned disposable cleanup/evidence residue | Resolved locally before configured/live execution. Only the verified API-REV-029/API-REV-035 disposable secret keys were removed; the named API-REV-035 journal was already absent. The unrelated test-runtime journal and operational data were untouched. |
| API-REV-036 / CRR-079 | Historical pre-SR-024 evidence only. It informed selection/harness reuse but did not substitute for API-REV-037 execution. |

## Durable Coverage Maintenance

The canonical investigation was refreshed before edits. Nine current repository-resident server tests were updated; no durable path was added or removed:

- Claude raw-delta fidelity;
- external direct/Team exact append semantics;
- lifecycle-faithful Claude native -> AgentRun -> direct/nested Team exact bytes;
- current AutoByteus missing-identity rejection;
- current Codex reasoning identity and active-turn fixtures;
- current Codex governed event turn identity;
- exact external-channel delta fixture without retired overlap reconciliation.

Current API-REV-037 delta:

- total paths: `9`;
- status: `0 added / 9 updated / 0 removed`;
- scope: `9 server / 0 web`;
- path/status equality: Pass;
- patch reverse-apply check: Pass;
- missing active files: zero;
- missing relative imports: zero;
- active `.skip/.only/.todo`: zero;
- diff hygiene: Pass.

The previously reviewed API-REV-036 package (`109` paths) remains in the current committed baseline and passed `CRR-079`. API-REV-037's exact nine-path delta is authoritative at:

- `api-e2e-evidence-sr024/api-rev-037/investigation/cumulative-durable-coverage-inventory.tsv`
- `api-e2e-evidence-sr024/api-rev-037/investigation/cumulative-durable-diff.patch`
- `api-e2e-evidence-sr024/api-rev-037/investigation/cumulative-durable-inventory-audit.log`

## Repository And Build Execution

| Selection | Result | Evidence |
| --- | --- | --- |
| IR-044 exact Claude/direct/Team delta fidelity | `3 files / 48 tests` Pass | `repository/ir044-currentized-focused-round1.log` |
| SR-024 provider/lifecycle/consumer affected aggregate | `12 files / 256 tests` Pass | `repository/sr024-affected-server-round2.log` |
| External-channel exact direct/no-new-inbound coordinator deltas | `1 file / 1 test` Pass | `repository/external-channel-exact-deltas.log` |
| Current broad server selection | `67 passed files / 1 capability-gated skipped`; `620 passed / 9 skipped` | `repository/current-server-selection-clean.log` |
| Current broad web selection | `73 files / 540 tests` Pass | `repository/current-web-selection-exact.log` |
| Server production build | production TypeScript, managed assets, sanitized no-database bootstrap Pass | `repository/server-build-full.log` |
| Nuxt production build | Pass; fifteen routes prerendered | `repository/web-production-build.log` |

The declared capability-gated Claude integration suite is excluded from repository proof; fresh configured Claude Team and standalone browser execution directly covers the provider below.

## Checked Disposable Environment

- Configuration-only preflight proved the exact absent target `autobyteus-server-ts/db/api-rev-037-live-20260813-1.db`, excluded ambient `DATABASE_URL` and `DATABASE_URL_TEST`, materialized the exact runtime `.env`, rejected any operational-target match, and did not initialize a database.
- Prisma migrations ran only against that disposable worktree target.
- Actual TTY `pnpm secrets:import` used `/Users/normy/.autobyteus/server-data/.env` only as the secret source, accepted the explicit `IMPORT` confirmation, and configured nine identifiers only in the disposable vault. No secret values were logged.
- Server startup used `test-support/live-e2e/test-runtime-bootstrap.mjs` / `startBuiltTestServer`; PID `lsof` proved the exact disposable SQLite path and no operational path.
- Nuxt bound at `127.0.0.1:31237` only to the checked server at `127.0.0.1:60237`.
- The private Nested Classroom fixture was copied and overlaid only inside the disposable runtime. Before/final source hashes are identical.
- The first AutoByteus navigation attempt was discarded because Nuxt's dependency optimizer reloaded the development server and returned `504 Outdated Optimize Dep`. No Team was allocated. The stable warmed-server rerun is the authoritative row and passed.

## Fresh Real Browser / Provider Matrix

### Imported Nested Classroom Team

| Runtime / model | Result | Direct evidence |
| --- | --- | --- |
| AutoByteus / `gpt-5.6-luna` | Pass | distinct canonical root; exact persistent send/reply/reference; one nested task Team; exact task-peer request/reply; exact submission and accepted review; refresh; termination; zero `SEGMENT_START/CONTENT/END` admission rejection; zero console errors |
| Codex App Server / `gpt-5.6-luna` / `medium` | Pass | same rooted task/message/reference/acceptance/refresh/termination lifecycle on a distinct root; zero segment or console errors |
| Claude Agent SDK / `sonnet` | Pass | same rooted task/message/reference/acceptance/refresh/termination lifecycle on a distinct root; zero segment or console errors |

Authoritative evidence: `live/browser/{autobyteus,codex,claude}-browser-row.json`, screenshots, exact task/message records embedded in those rows, and `live/browser-matrix-audit.log`.

The AutoByteus row visibly recorded generic error cards after one provider-generated tool attempt was rejected before the later exact peer exchange succeeded and after a duplicate post-accept review attempt. This is retained as a nonblocking model/tool-election observation under `CR-PREM-032`: the exact bound request/reply, submission, accepted review, completion, restore, and termination all succeeded, and no segment admission rejection occurred. It is not hidden or counted as a protocol Pass condition.

### Standalone Agent

AutoByteus, Codex, and Claude each pass a fresh browser first-send, exact visible response token, persisted reload/restore, exact resume runtime/model, zero browser console errors, and termination.

Evidence: `live/browser/standalone-{autobyteus,codex,claude}.json` and screenshots.

### Desktop / Mobile / Restore

A fresh AutoByteus Team passes active desktop and paired-mobile exact message/reference count, content, open/back behavior, exact rooted records, and selected-Team read-only configuration. After termination, the identical canonical root passes persisted desktop/mobile history selection and reference restore with zero console errors.

Evidence:

- `live/browser/active-desktop-mobile-reference.json`
- `live/browser/persisted-desktop-mobile-reference.json`
- `live/browser-provider-matrix-summary.json`
- screenshots under `live/browser/`

## Cleanup And Safety

- Owned server/frontend stopped; ports `60237/31237` closed.
- Checked cleanup removed only the disposable runtime, database, vault key, and WAL/SHM/journal candidates.
- Private source fixture remained byte-identical.
- Operational database action: **NONE**.
- Operational database inspection: **NONE**.
- Protected `60004/31004` action: **NONE**.
- Stashes, delivery backup, rollback, and repair action: **NONE**.
- Both historical operational-database incident disclosures remain preserved.

Evidence: `environment/final-cleanup-verification.log`, `environment/server-pid-lsof.log`, and `environment/safe-server-output.log`.

## Confidence Scorecard

| Category | Score | Evidence |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | Exact delta fidelity plus retained Team/standalone/mobile/restore acceptance surfaces are directly proven. |
| Changed-boundary execution directness | 99% | Real Claude native conversion traverses AgentRun into direct and nested Team collectors with exact bytes; external output uses exact append semantics. |
| Cross-boundary integration realism and mock gap | 98% | Real Chrome, WebSocket, GraphQL, persistence, restore, mobile pairing, imported package, and three configured providers. |
| Environment, configuration, identity, and fixture fidelity | 99% | Checked disposable target, actual TTY vault import, PID lsof, canonical roots/addresses, public import, and exact cleanup. |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Missing identity, whitespace-only/newline/repeated/overlap-shaped deltas, typed lifecycle, refresh, termination, and model-tool rejection observation are retained. |
| User-surface, browser, and desktop-shell confidence | 97% | Desktop-equivalent browser and responsive mobile pass; no Electron-shell-specific claim. |
| Durable regression coverage quality and relevance | 98% | Current provider/lifecycle/consumer seams, strict negatives, nine-path inventory/patch, no missing imports or skipped active delta paths. |

Overall simple average: **98%**. No critical criterion is missing or failing, and no applicable category is below 90%.

## Outcome And Routing

API-REV-037 result: **Pass / 98%**. Broader validation was required and completed. Because nine repository-resident durable tests were updated, route the complete cumulative artifact package plus the exact API-REV-037 delta to `code_reviewer` for proportional test-code review before delivery.

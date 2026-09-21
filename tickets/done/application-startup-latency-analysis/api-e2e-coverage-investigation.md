# API/E2E Coverage Investigation — APP-STARTUP-LATENCY-20260918-001

## Investigation Meta

- Current round: `API-REV-002`, recovery rerun of historical `API-REV-001` P01.
- Authority: approved requirements `SR-010`; recovered design `SR-011`; `ARCH-REV-007` Pass; cumulative implementation `IR-001`–`IR-005`; source review `CRR-005` Pass.
- Prior authoritative API/E2E result: `API-REV-001` **Fail / 95.0% confidence**. P01 proved the then-approved persistent-data contract contradictory because the failed migration retried and rewrote its ledger on every start.
- Current reviewed behavior: the existing failed record may execute once under corrected code; missing required Team trees and explicitly typed malformed/conflicting token attribution are warning-eligible only under their approved safeguards; a warning-only result is terminal `SUCCEEDED_WITH_WARNINGS`; later starts must not rewrite attempts/timestamps/log path/targets. Structural, SQL, precondition, reread, dependency and unknown failures remain fatal and fatal wins over warnings.
- Canonical ledger: `api-e2e-test-case-ledger.md`.

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Route: reviewed implementation → API/E2E → Code Reviewer.
- Proportional test-code review: required by route, but expected `Not Applicable` because API/E2E changed no durable repository test.

## Changed Boundary And Required Proof

| Surface | Current risk | Required executable proof |
| --- | --- | --- |
| Persisted migration lifecycle | One corrected retry must become truthful terminal warning without source/target corruption | Rerun P01 first on a fresh owned clone; inspect exact ledger/log/root/target/SQLite effects; then three later fresh starts |
| Warning/fatal classification | Only missing-tree and typed token-data conditions may warn | Real coordinator/SQLite repository tests for typed rollback, local readiness rejection, unrelated-root usability, fatal categories and precedence |
| Startup/readiness | Terminal starts must remain fast and avoid trace payload reads | Three full compiled-server starts, process observer, first health, readiness and fetch/read attribution |
| Browser history/attachment continuity | Migration correction must not make retained user data unusable | Normal Chrome through actual Team and AgentOrg history, actual attachment Open, exact stored URLs and rendered dimensions |
| Persisted-data preservation | First correction may change only authorized migration ledger state; subsequent reads/starts must be stable | Whole-profile SHA-256 snapshots, logical SQLite table comparison, root byte/stat comparison, final read-only browser comparison |
| External provider | Startup/history reads must not execute inference | Fetch observer and no Send action; report background MCP/cache registration separately, not as inference |

## Project And Environment Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis`
- Instructions read: `autobyteus-server-ts/AGENTS.md`, server `README.md`, `autobyteus-web/AGENTS.md`, web `README.md`, package scripts and `validation/README.md`.
- Stack: Node/TypeScript Fastify server, SQLite/Prisma, Nuxt 3, browser-equivalent Electron renderer.
- Current build command: `pnpm -C autobyteus-server-ts build`.
- Focused executable command: `pnpm -C autobyteus-server-ts exec vitest run --no-watch` over the flat-family coordinator, token transition/repository/classification and shared runner suites.
- Full server execution: compiled `dist/app.js` on API/E2E-owned loopback ports with explicit owned `DB_NAME`, `DATABASE_URL`, `AUTOBYTEUS_MEMORY_DIR` and data root.
- Browser execution: normal Nuxt and Chrome against that owned backend.
- Profile: `.local/api-startup-profile-r2`, created as a fresh copy-on-write clone of the prior API/E2E-owned representative clone. It is not the user's live profile.
- Secrets/provider credentials: not needed; no Send or provider invocation is part of the acceptance path.

## Durable Coverage Decisions

| Existing coverage | Decision | Basis |
| --- | --- | --- |
| Flat-family real coordinator regression with eight missing-tree roots | Still Valid | Directly proves all eight identities/reasons, failed count, zero writer calls, unchanged sources and no targets |
| Token transition and repository SQLite tests | Still Valid | Direct real-transaction rollback and classification boundary; destructive/corrupt states cannot be safely authored through frontend |
| Shared migration runner terminal-skip tests | Still Valid | Directly proves `SUCCEEDED_WITH_WARNINGS` is terminal |
| Readiness/attachment owner and REST suites from API-REV-001 | Still Valid | Production files preserved; prior browser/live REST evidence remains relevant and is proportionately rechecked |
| API/E2E-owned new durable tests | Not Required | Reviewed durable tests cover the stable logic; the missing evidence is representative persisted-process and browser execution |

No stale coverage was removed. The lifecycle observer, profile snapshot/comparison scripts and browser proof are temporary validation artifacts rather than repository test-suite additions.

## API-REV-002 Execution Plan And Outcome

| Case | Expected | Current result | Evidence |
| --- | --- | --- | --- |
| P01 | First correction reaches terminal warning; eight exact roots/reasons; failed8; sources unchanged; zero targets | Pass | `validation/api-e2e-r2/p01-result.json` and referenced root/ledger/log/SQLite evidence |
| L01 | Three later fresh starts under 10s with zero readiness trace reads and exact terminal ledger/target stability | Pass | `p01-stable-{1,2,3}-summary.json`, `p01-terminal-stability.json` |
| E01 | Typed token data rolls back/warns/blocks locally; unrelated root usable; structural/SQL/unknown remain fatal; fatal precedence | Pass | `token-warning-fatal-executable.log` — 5 files / 66 tests |
| H01/A01 | Retained Team and AgentOrg histories and actual attachment Open remain usable | Pass | `browser-history-attachment-proof.json` plus screenshots |
| D01 | First authorized change limited to migration ledger; subsequent processes and browser reads are byte-stable | Pass | `p01-db-logical-comparison.json`, `p01-terminal-stability.json`, `browser-readonly-preservation.json` |
| C01 | Owned tabs/processes/ports/generated outputs cleaned | Pass | `cleanup-process-check.txt` and empty tab list |

## Evidence Reconciliation

- First corrected start: health at **6425.083 ms**; flat-family record `FAILED` attempts 27 → `SUCCEEDED_WITH_WARNINGS` attempts 28; summary `Scanned 526; migrated 0; skipped 518; failed 8.`
- The durable terminal warning log contains every one of the eight sorted source identities and every corresponding missing-tree reason. All eight source directory snapshots are exact and no target exists.
- Logical SQLite comparison across 21 tables found only `app_data_migration_records` changed. The corrected flat-family record became terminal, and a separate previously `NOT_RUN` history-summary migration recorded a first successful no-op result. All other 20 tables were exact.
- Three later fresh starts reached health in **3210.487 / 2555.660 / 2562.309 ms**, each with zero raw-trace reads and zero external fetches. Attempts, timestamps, log path, targets and all tracked profile category hashes remained exact.
- Typed-token/fatal execution passed **5 files / 66 tests** and includes real SQLite rollback/local readiness rejection, unrelated-root usability, SQL/structural/unknown fatal handling, dependency behavior and fatal precedence.
- Normal Chrome rendered the retained `Software Engineering Team` history and exact 3024×1886 Team image, then the retained AgentOrg `/StudentStudyGroup/student_one` conversation and exact 3012×1892 Org image. The Org Open action created a normal browser tab on the exact REST URL.
- The final browser/backend read-only journey left definitions, 6,577 raw traces, 1,107 context files, 5,618 history/runtime files, database and configuration byte-exact relative to the terminal baseline.
- No provider/inference Send occurred. The server's normal background MCP/cache registration is not counted as inference execution.

## Confidence And Broader-Validation Decision

| Category | API-REV-001 final | API-REV-002 final | Basis / residual |
| --- | ---: | ---: | --- |
| Requirement and AC proof | 96% | 98% | Every current critical criterion has direct executable evidence |
| Changed-boundary directness | 98% | 98% | Actual migration runner, SQLite, compiled startup and exact stored data |
| Cross-boundary integration realism | 96% | 96% | Real backend/Nuxt/Chrome; corrupt negative states appropriately remain executable fixtures |
| Environment/config/identity fidelity | 90% | 95% | Fresh clone of the already-owned representative profile with explicit owned paths |
| Failure/edge/lifecycle/recovery | 94% | 97% | First correction, terminal skip, typed warning, rollback and fatal precedence |
| User-surface/browser/desktop | 95% | 95% | Normal web-equivalent renderer; no Electron-shell code changed |
| Durable regression relevance | 96% | 97% | Current reviewed suites plus retained prior owner/access evidence |

- Final confidence: **96.6%** (simple mean; rounded from 676/7).
- Any category below 90%: `No`.
- Critical criterion missing or failing: `No`.
- Broader validation: **Required and completed** because the prior defect existed only in representative persisted startup lifecycle and the ticket also preserves browser-visible history/attachments.
- Residuals: the <10s threshold is representative-profile acceptance, not a universal SLA; deliberately corrupt token/SQL states are proven at the real SQLite/manager boundary rather than by unsafe UI manipulation; browser evidence covers web-equivalent renderer behavior, not Electron window/preload behavior; two unrelated historical nested-Team fixture failures remain outside this ticket.
- Latest result: **Pass / 96.6% confidence**.
- Durable test delta by API/E2E: none.

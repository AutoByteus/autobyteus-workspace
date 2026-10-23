# API/E2E Coverage Investigation

Ticket `seal-migrations-per-folder` (autobyteus-280). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/seal-migrations-per-folder`, branch `codex/seal-migrations-per-folder`, head received `6170227e3b`; code commit `9b013fcc09` (`6170227e3b` adds only ticket documents). Paths below are relative to `tickets/in-progress/seal-migrations-per-folder/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; REQ-001..REQ-011, AC-001..AC-007)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-003)
- Design Spec: `design-spec.md` (SR-003, incl. DI-001)
- Supplemental Task Artifacts: `frozen-layer-record.md`, `release-notes.md`, `follow-ups.md` (FU-001)
- Design Review Report: `design-review-report.md`; Architecture Review Revision Record: `architecture-review-revision-record.md` (ARCH-REV-002, ARCH-REV-003)
- Implementation Handoff: `implementation-handoff.md` (IR-002); Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass 9.45/10); Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review CRR-002 Pass → API/E2E (message from `/software_engineering_team/code_reviewer`)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

- All 31 app-data migrations are sealed in their own folders over one frozen layer; no import crosses between production and migration code, in either direction, enforced by an architecture test (REQ-001..REQ-005, AC-001).
- Every migration behaves exactly as before (REQ-007, AC-002).
- Production asks the runner about capabilities instead of migration ids (REQ-006). There are two such capabilities:
  - **G-2 (`token_usage_history`)** keeps its codes: history reads refuse with `TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED`, and existing-run restore with `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED` (AC-003).
  - **G-1 (`custom_llm_providers`)** is narrowed (DEC-003). The server starts while the custom-provider readable-identity migration is pending, and every custom-provider read and write refuses with `CUSTOM_PROVIDERS_MIGRATION_PENDING`. Listing shows built-ins only, and a custom-model run is refused while a built-in run starts (AC-004).
  - A non-failed manual retry of any migration rebuilds run-package admission and refreshes capabilities, so its effect needs no restart (DS-003).
- The 205 repair (REQ-008): `server_helper` alone no longer marks a helper run. A beta.5-era compactor run survives with its history row (AC-005).
- The library's `memory/migration/` moved into the migration area (REQ-009, AC-006).
- Not yet proven at the system boundary (handoff "Downstream Coverage Hints", code review "Residual Risks"):
  - the G-1 journey on a real server, including a Settings → Migrations retry without a restart;
  - the G-2 journey on a real server;
  - the compactor run in the 205 startup e2e.

## Supported Scenarios And Real Usage

- Designer scenarios covered: UC-001 (startup runs pending migrations), UC-002 (G-1, G-2 gated features), UC-003 (Settings → migrations list and manual retry). UC-004 is structure only (AC-001, AC-007).
- Real-use scenarios added from investigating the implemented behavior:
  - **How the custom-provider migration really fails.** `CustomProviderReadableIdAppDataMigration` ends `FAILED` only on a fatal error. That is a failure to publish the empty V3 file, or a lock, `lstat` or other exception (`execute` → `sanitizedFatal`). An invalid file or a name collision ends `SUCCEEDED_WITH_WARNINGS` and is not a failure. The real-use cause of a failure is therefore a provider folder (`<data>/llm/`) the server cannot write to, for example after a permission change. The user's fix is to restore write access and retry in Settings → Migrations, which is allowed because the migration's `executionPolicy` defaults to `ANYTIME`, so `canRetry` is true.
  - **A fresh `RUNNING` record**, the case the existing e2e covers. Under the old G-1 the server refused to start; under the narrowed gate it starts and serves while the record is fresh. This is the existing durable case whose assertion became obsolete (below).
  - **G-2 recovery is a restart.** The token-usage migration is `STARTUP_ONLY`, so `RESTART_TO_RETRY` applies and a Settings retry is refused.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 sealed migration area, same results | Changed (structure) / Preserved (results) | REQ-001..005, 007, 011 | Architecture test (reused), every migration suite and every startup e2e, rerun on the current code |
| BEH-002 G-2 by capability | Changed (mechanism) / Preserved (codes) | REQ-006, AC-003 | Real-server e2e (`team-run-v1-production-upgrade`), rerun |
| BEH-003 G-1 narrowed | Changed | REQ-006, DEC-003, AC-004 | New real-server journey; the obsolete existing e2e case updated |
| BEH-004 205 repair | Changed | REQ-008, AC-005 | Compactor run added to the 205 startup e2e |
| DS-003 retry refreshes capabilities | Changed | REQ-006 | The AC-004 journey retries through the real GraphQL mutation Settings uses |
| REQ-009 library move | Changed | AC-006 | Library build and unit, rerun |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | runner capability readiness, gates, every migration's imports | Unit (IMP-03 on `8b091176bf`), migration suites (IMP-08 on `9b013fcc09`) | The unit suite ran before IR-002 | Rerun on the current code |
| API / transport / contract | Yes | GraphQL retry mutation; error codes | `tests/unit/api/graphql/types/app-data-migrations.test.ts` | Not exercised through a running server | Real-server e2e |
| Frontend component / state | No | no web change | — | — | — |
| Browser integration / user journey | No (the existing error path shows the new code) | — | — | — | Not required (rationale in the report) |
| Desktop shell / Electron | No | — | — | — | — |
| Process / lifecycle | Yes | both startup hosts; startup no longer blocked by G-1 | Host unit tests | Real startup with the migration failed or `RUNNING` | Built-server e2e |
| Persisted-data transition | Yes | every migration relocated; 205 repair | Migration suites, IMP-06 startup e2e (on `8b091176bf`) | Startup e2e after IR-002; compactor at a real startup | Built-server e2e |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No | the custom provider is a local discovery fixture | — | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/seal-migrations-per-folder`
- Project type and stack: pnpm monorepo; Fastify/GraphQL server (`autobyteus-server-ts`), core library (`autobyteus-ts`), Nuxt web.
- Project testing guideline: `TESTING.md` (root). No closer `TESTING*.md`. It changed since my last ticket (`bf81ce2a0f`, plus `d60d4a60e5` naming the per-migration test folders). New rules applied here:
  - One heavy run at a time, across all worktrees. Another worktree's vitest was running when I started, so I wait before each heavy run.
  - One run per case per round.
  - Rebuild after code changes.
  - Migrations are a shared foundation (rule 4).
- Conflicting or unclear instructions: none.
- Secrets: `N/A` (local discovery fixture, no real providers).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Server unit, integration, e2e commands; `env -i PATH HOME=<temp> TMPDIR` for e2e; synthesized data only; rerun by impact (rule 4: migrations are a shared foundation); one heavy run at a time |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Built-server e2e harness | `startBuiltTestServer`, `materializeTestRuntime`, `executeGraphql` (hides error text, so a raw request is used for codes) |
| `autobyteus-server-ts/tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts` | The custom-provider migration's startup e2e | V1/V2 fixtures, discovery fixture, provider listing, `createCustomProvider` |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Full-registry upgrade e2e | G-2 on a real server (history refused, restore refused, new run admitted, restart retry) |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-skill-improvement-data-startup.e2e.test.ts`, `tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts` | 205 startup e2e and fixtures | `COMPACTOR_RUN` exists in the fixture module but only the unit test writes it |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`, except REQ-008, which narrows a same-ID repair: the 205 migration deletes less, never more.
- Evidence planned:
  - every migration suite and every migration startup e2e on the current code (unchanged results);
  - the 205 startup e2e with the compactor run (survival with its history row; Skill Improvement data still deleted).
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `custom-provider-readable-id-startup-migration.e2e.test.ts` › "blocks a fresh recent RUNNING record, then converges through the ordinary stale retry" | The server refuses to start (`exitCode 1`, `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED:RUNNING:`, no "Server listening on") while the readable migration's record is a fresh `RUNNING` | Old G-1 | **Needs Update** | DEC-003 / REQ-006 / AC-004 narrow G-1: the server starts and only custom providers are unavailable. `CUSTOM_PROVIDER_READABLE_ID_STARTUP_BLOCKED` no longer exists in `src` (removed per the handoff's Legacy Removal Check). The implementation's e2e runs (IMP-06, IMP-08) did not include this file | Rewrite to the narrowed gate: the server serves while the record is fresh; custom providers refuse with `CUSTOM_PROVIDERS_MIGRATION_PENDING`; the V2 file is untouched; once stale, the next start converges (the convergence assertions are unchanged) |
| Same file, the three other cases | V1/V2 → empty V3 transitions, selectors, secrets | AC-002 | Still Valid | — | Rerun |
| `remove-skill-improvement-data-startup.e2e.test.ts` SID-1..3 | Exact deletion, byte identity, second start, retry | AC-002, AC-005 | Still Valid, missing the compactor | REQ-008 | **Add**: a compactor run (`launchPurpose: "server_helper"`, its own definition, a history row) survives byte-identical with its row |
| `team-run-v1-production-upgrade.e2e.test.ts` "keeps the server healthy after failed consolidation…" | G-2 on a real server | AC-003 | Still Valid | IMP-06 (`8b091176bf`) | Rerun |
| Migration startup e2e suites and the other e2e folders | Startup through the real runner and registry; features whose production code changed paths | AC-002 | Still Valid | IMP-06 ran 14 files | Rerun (the whole `tests/e2e` folder, which also covers the suites the implementation did not run, e.g. secret-management, llm-management, token-usage GraphQL) |
| Server unit, integration; library | — | AC-001..006 | Still Valid | IMP-03, IMP-05, IMP-07 on `8b091176bf` | Rerun (TESTING.md rule 4: a migration changed in IR-002) |
| Typecheck, architecture boundary test | — | AC-001 | Still Valid | IMP-01 r2, IMP-02 r2 on `9b013fcc09` = current code | Reuse |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 (REQ-003, 006) | server typecheck | Reused | IMP-01 (r2) | `9b013fcc09` = current code |
| API-02 | AC-001 | architecture boundary test incl. negative case and unused-frozen report | Reused | IMP-02 (r2) | same; FU-001 is its only failure, pre-existing |
| API-03 | AC-002 (REQ-007) | assertion preservation | Reused | IMP-04 | IR-002 only added assertions (CRR-002) |
| API-04 | — | server build | Existing Test | `pnpm -C autobyteus-server-ts build` | `dist` predates `9b013fcc09` |
| API-05 | AC-002..005 | server unit (incl. `tests/app-data-migrations`) | Existing Test | `pnpm -C autobyteus-server-ts test:unit` (clean env) | rule 4 |
| API-06 | AC-002 | server integration | Existing Test | `test:integration:prepare`, `test:integration` | rule 4 |
| API-07 | AC-006 | library build and unit | Existing Test | `pnpm -C autobyteus-ts build`; `pnpm -C autobyteus-ts exec vitest run tests/unit` | rule 4 |
| API-08 | — (baseline of the obsolete case) | the existing custom-provider e2e file before the update | Existing Test | `env -i … vitest run tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts -t "fresh recent RUNNING"` | Proves the old assertion fails under the narrowed gate (evidence for the update) |
| API-09 | AC-004, DS-003 | built server, real startup, GraphQL | Durable (new case in the custom-provider e2e) | Released V2 file and a read-only `llm/` folder. The readable migration ends `FAILED`, then:<br>1. the server serves (`/rest/health`);<br>2. the migration lists `FAILED`, `canRetry`;<br>3. provider listing shows built-ins only;<br>4. `createCustomProvider` and `deleteCustomProvider` are refused with `CUSTOM_PROVIDERS_MIGRATION_PENDING`;<br>5. `createAgentRun` with a custom model is refused with the code, while a built-in model run starts;<br>6. write access is restored and `runAppDataMigration` (the Settings retry) succeeds;<br>7. without a restart, the file is V3 and a custom provider is created and listed | The G-1 journey on a real server |
| API-10 | AC-004 | built server, fresh `RUNNING` record | Durable (updated case) | As in the inventory | The obsolete assertion, replaced |
| API-11 | AC-005 | built server, 205 startup | Durable (SID-2 extended) | The compactor run and its history row are byte-identical and listed after the first and second start | REQ-008 at a real startup |
| API-12 | AC-002..005 (all) | every non-gated server e2e on the current build | Existing Test | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e --no-watch` (gated suites skip) | Startup and migration e2e (IMP-06 set) on the current code; G-2 on a real server; the e2e the implementation did not run; and the new and updated cases (API-09..API-11) as recorded |

- Test progress log needed: `Yes`.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-09 | `autobyteus-server-ts/tests/e2e/secret-management/custom-provider-readable-id-startup-migration.e2e.test.ts` (new case) | The narrowed G-1 and the retry refresh exist only in unit tests; this migration's startup e2e is their natural home |
| API-11 | `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-skill-improvement-data-startup.e2e.test.ts` (SID-2) | REQ-008 at a real startup |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-10 | `custom-provider-readable-id-startup-migration.e2e.test.ts` › "blocks a fresh recent RUNNING record…" | Replace the startup-block assertions with the narrowed gate; keep the convergence assertions | Obsolete assertion: "the server does not start while the migration is RUNNING". Evidence: DEC-003, REQ-006, AC-004; the code was removed in this ticket |

## Durable Coverage To Remove

None (the obsolete assertions are replaced in place, see above).

## Desktop Application Validation Plan

- No desktop or web change. The gates are server-side, and the web shows the new code through its existing GraphQL error path. The built server (`dist/app.js`), the artifact the desktop embeds, is exercised through its real entrypoint.

## Live Environment And Fixture Plan

- Order: build → unit → integration → library → API-08 → durable updates (developing the new cases runs only those cases) → API-12, the full e2e folder, once, as the record. Each heavy run waits until no other heavy run is active on the machine.
- Data: synthesized only. Released V2 provider file, a local `/v1/models` discovery fixture, an owned temp runtime root and database per test, and the 205 fixture module.
- The read-only folder is a mode-bit block (non-root POSIX), like SID-3. The test skips on root and on Windows, with that reason in the test name.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| The Settings page rendering the new code | No web change; the existing error path renders any GraphQL error message | Low | No | None |
| A packaged desktop startup | The same `dist` entrypoint; no shell change | Low | No | None |
| FU-001 | Pre-existing failing architecture assertion | None for this ticket | No | follow-up |

## Ambiguities Or Reroute Triggers

None. The obsolete e2e assertion is a coverage update owned by API/E2E: it asserts the behavior DEC-003 removed.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (one added case, one updated case, one extended case)
- Reroute Required: `No`

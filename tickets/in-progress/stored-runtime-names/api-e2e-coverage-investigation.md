# API/E2E Coverage Investigation — autobyteus-343 (stored-runtime-names)

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-002); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`; Design Spec: `design-spec.md`
- Supplemental Task Artifacts: `task-brief-from-316.md` (context only), `follow-ups.md` (FU-001)
- Design Review Report / Architecture Review Revision Record: `design-review-report.md` (ARCH-REV-001 Pass; ARCH-F-001/002/003) / `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md`; Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- Code Review Report / Revision Record: `code-review-report.md` / `code-review-revision-record.md` (CRR-001 Pass, no findings)
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current ID: `API-REV-001`
- Current Investigation Round: 1; Trigger: code review pass (CRR-001) requesting the runs the implementer was not allowed to do; Prior investigation: `N/A`

## Current Requirement And Design Basis

One spelling for the runtime in `segments[].runtime_kind` of `raw_traces_manifest.json`: writers (Claude, Codex, Antigravity, Grok payloads, recorder, native library store) write the `RuntimeKind` value (REQ-001); a sealed startup migration `20261030_raw_trace_manifest_runtime_names` converts this node's own manifests once, keeping unusable ones byte-identical and reported, ending `SUCCEEDED` / `SUCCEEDED_WITH_WARNINGS` / `FAILED` by the policy of ARCH-F-001 (REQ-002…004, 007); imports and the old in-record label copies are untouched (DEC-2, DEC-4); no old label or mapping in current source (REQ-005). Persisted-data transition: `Migration Required`. Implementation evidence: unit/focused suites, a runner-level isolated run on 962 real-shaped manifests (825 converted, 0 differences, second run no-op), no real server start (TESTING.md). Not yet run by anyone (the review request): a real startup of the built server on a synthetic root; compaction on a scripted runtime writing the new value into payload **and manifest**; the changed gated live suites; Memory Sync of a converted manifest.

## Supported Scenarios And Real Usage

- Covered: SCN-001 (compaction writes the new value), SCN-002 (first start after the update), SCN-003 (nothing to do), SCN-004 (interrupted attempt; unit level), SCN-006 (unusable manifest kept and reported).
- Added from investigating the implementation (real trigger in brackets):
  - SCN-A1: the same start also runs the two layout migrations the new one depends on, in order, on a modern layout [app start].
  - SCN-A2: the user restarts the app after the update; the migration is not run again and no file changes [second app start].
  - SCN-A3: a node that holds both convertible manifests and unusable ones ends `SUCCEEDED_WITH_WARNINGS`, converts the rest, and the app is available [app start].
  - SCN-A4: a source node configured for Memory Sync uploads its converted manifest once, and does not upload it again on the next sync [app start, then the user's sync]; imports on the hub keep what they mirror.
- `Technically Possible but Unsupported/Contrived`: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change | Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 writers | Changed | REQ-001 | Unit per runtime exist (IMP-03); add payload **and manifest** on the real server for scripted AGY and Grok replay; Claude/Codex/native at converter/library level (no scripted E2E exists) |
| BEH-002 migration | Added | REQ-002…004, 007 | Unit fixtures exist; add the built server startup (registry wiring, runner records, GraphQL status, prerequisites) |
| BEH-003 no mapping | Added | REQ-005 | `runtime-labels-source-check.test.ts` exists; reviewed |
| Side effects: Memory Sync upload, journal pass | Added (one-time) | design F-09 | Hub behavior never exercised live: add a two-process sync case |

## Changed Surface And Boundary Classification

| Surface | Affected? | Actual Changed Boundary | Repository Evidence | Risk Not Exercised | Candidate Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | Yes | writers, recorder, native store | unit | real compaction on a real server | scripted AGY + Grok replay (server E2E) |
| API / transport | Yes | GraphQL `getAppDataMigrations` shows the record | unit-level runner only | the real GraphQL status after a real start | built-server startup E2E |
| Frontend / browser / desktop | No | Settings page lists migrations generically (not changed) | — | none | not required |
| Process / lifecycle | Yes | startup migration, restart | runner tests | real start/stop/restart | built-server startup E2E |
| Persisted-data transition | Yes | `raw_traces_manifest.json` rewritten in place | fixtures; IMP-04 runner-level | real runner wiring + prerequisites + second start | built-server startup E2E |
| Distributed coordination | Yes (indirect) | Memory Sync scanner sees changed manifests | none | upload of the converted manifest | two-process hub+source E2E |
| External integration | Yes (indirect) | real AGY/Grok compaction payloads | recorded-fixture and scripted | live | gated live suites (credits) |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names`, branch `codex/stored-runtime-names`; TypeScript pnpm monorepo, vitest.
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names/TESTING.md` (no closer `TESTING*.md`). Also `AGENTS.md`, `DESIGN.md`, `autobyteus-server-ts/docs/data_migration_guideline.md` (cited by the design).
- Conflicts: TESTING.md "Migrations and upgrades are tested on small synthesized data... never run a migration, startup or conversion on real user data or a copy of it" — my journeys use only synthesized roots in released shapes (a manifest shape learned from the implementation's read-only census); I do not touch `~/.autobyteus`.
- Secrets: none needed for the deterministic cases; the live suites use the host `agy` login and the host `grok` login (TESTING.md).
- Rule applied: built-output proof needs a current build of this worktree: `pnpm -C autobyteus-server-ts build` ran at `dd56f6de6c` (exit 0, `/tmp/stored-runtime-names-build.log`), before any case that starts `dist/app.js`.

| Instruction | Learned |
| --- | --- |
| `TESTING.md` | server E2E clean env (`env -i`); one heavy run at a time; build before dist-based suites; Rule 9 (every failure has a cause); live suites gated; isolated HOME |
| `tests/e2e/app-data-migrations/remove-work-trace-exports-startup.e2e.test.ts` | pattern for startup journeys on a synthesized root via `dist/app.js` and `getAppDataMigrations` |
| `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | pattern for a test-owned hub plus source, both real server processes |
| gated runtime suites (file headers) | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`; `GROK_BUILD_COMMAND` for replay; `RUN_AGY_COMPACTION_E2E=1`, `RUN_GROK_E2E=1` for live |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (design-spec; handoff Persisted Data Transition Check).
- Representative setup: a synthesized memory root with released-shape manifests (each old label, null, absent key, already current, pending segment, extra key) under `agents/`, `agent_teams/*/*`, `agent_orgs/*/*/*`, plus an `imports/` manifest with its `sync-manifest.json`, a wrong-depth manifest, a legacy `.backup-*` file, and (second root) unusable manifests.
- Evidence planned: record in Settings status, converted values with every other key/order intact, unusable and out-of-scope files byte-identical, second start does not run it again (attempts unchanged, no file changes), and no leftover `.tmp`; completion/recovery (interrupted attempt, failed write) is covered by IMP unit tests and reused.
- Ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| `tests/app-data-migrations/raw-trace-manifest-runtime-names/…-migration.test.ts` (367 lines) | every fixture shape, status policy, idempotence, runner order | AC-002…004, 007 | Still Valid | reuse IMP-03 |
| `tests/architecture/runtime-labels-source-check.test.ts` | no label/mapping outside migrations | AC-005 | Still Valid | reuse IMP-03 |
| converter tests per runtime, `runtime-memory-event-accumulator.test.ts`, library `run-memory-file-store.test.ts`, `raw-trace-archive-manager.test.ts` | writers write the `RuntimeKind` value | AC-001 | Still Valid | reuse IMP-03/05 |
| `tests/e2e/runtime/agy-compaction-rotation-transport.e2e.test.ts` (gated, scripted AGY) | payload `runtime_kind: "antigravity_cli"`; does not read the manifest | AC-001 | Needs Update (add the manifest assertion) | run, then extend |
| `tests/e2e/runtime/grok-build-compaction-replay.e2e.test.ts` (gated, recorded real traffic) | payload `runtime_kind: "grok_build"`; manifest not read | AC-001 | Needs Update if a segment is archived there | run, then extend |
| `agy-compaction-rotation-live`, `grok-build-compaction-live` (gated live) | payload value only | AC-001 | Still Valid | candidate live runs |
| `tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | sync of seeded memory between two real processes | preserved Memory Sync | Still Valid, but seeds after start: cannot cover a converted manifest | rerun as a regression; add a sibling file |
| `tests/e2e/app-data-migrations/*-startup.e2e.test.ts` | other migrations' startup journeys | pattern | Out Of Scope | none |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…005, 007, 008 | migration unit suites, source check, writers (server + library), web fixture | Reused | IMP-02/03/05 (same code: `git diff --name-only f5f9ee3221 HEAD -- autobyteus-server-ts autobyteus-ts autobyteus-web` is empty; later commits are docs/evidence) | TESTING.md rerun-by-impact; I rerun only the migration folder as a sanity base |
| API-02 | AC-002…004, 007, REQ-004 | built server startup on a synthesized root (clean) + status in Settings API + second start | Durable | new `tests/e2e/app-data-migrations/raw-trace-manifest-runtime-names-startup.e2e.test.ts`; needs `dist/` | the missing journey |
| API-03 | AC-004, SCN-A3 | same, second root with unusable manifests: `SUCCEEDED_WITH_WARNINGS`, app available | Durable | same file | the warning status through the real runner/API |
| API-04 | AC-001, BEH-001 | scripted AGY compaction through the real server: payload and manifest | Existing Test + Update | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-compaction-rotation-transport.e2e.test.ts --no-watch` | requested; add the manifest assertion |
| API-05 | AC-001 | Grok recorded-traffic replay through the real server | Existing Test (+Update) | `GROK_BUILD_COMMAND=<fake cli>` per the file header | same |
| API-06 | preserved Memory Sync, F-09 | two real server processes: converted manifest uploaded once; hub import mirrors it; second sync uploads nothing | Durable | new `tests/e2e/memory-sync/raw-trace-manifest-runtime-names-sync.e2e.test.ts` (hub test-owned, loopback) | requested, never exercised |
| API-07 | preserved Memory Sync | existing multiprocess suite | Existing Test | `pnpm exec vitest run tests/e2e/memory-sync --no-watch` (env -i) | regression of the sync path |
| API-08 | AC-001 on real providers | gated live AGY compaction and live Grok compaction | Journey (live, credits) | decided after the deterministic cases; real credits and the host logins | requested "if the environment allows" |
| API-09 | AC-001 Claude, Codex, native | converters/library only | Reused | IMP-03/05 | no scripted compaction E2E exists for them; `codex-interrupted-compaction.e2e` is a live-gated suite |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-02, API-03 | `autobyteus-server-ts/tests/e2e/app-data-migrations/raw-trace-manifest-runtime-names-startup.e2e.test.ts` | the real startup, status and restart of the registered migration |
| API-06 | `autobyteus-server-ts/tests/e2e/memory-sync/raw-trace-manifest-runtime-names-sync.e2e.test.ts` | upload of a converted manifest, never exercised |

## Durable Coverage To Update

| Case ID | Existing Path | Update | Notes |
| --- | --- | --- | --- |
| API-04, API-05 | `agy-compaction-rotation-transport.e2e.test.ts`, `grok-build-compaction-replay.e2e.test.ts` | assert the manifest's `segments[].runtime_kind` next to the payload value | only if the run archives a segment there |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

Not applicable: no desktop-shell or renderer behavior changed; the Settings page lists migrations generically and is not changed.

## Live Environment And Fixture Plan

- Order: build (done) → API-01 sanity → API-02/03 → API-04/05 → API-06/07 → API-08 (live, last).
- Each server process: own temp data dir (`--data-dir`), private HOME and database, ephemeral port, `env`-controlled; stopped by the test.
- Fixtures: synthesized manifests in the released compact JSON shape (keys read from the implementation's census, not copied data).
- Evidence: vitest logs (`evidence/API-*.log`), the migration record as returned by GraphQL, before/after manifests of one run per shape.
- Owned processes/state: server child processes, temp roots (removed by the tests); live suites create AGY/Grok conversations in the CLIs' own history (recorded).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| The user's real data | TESTING.md forbids startup/conversion on real data or a copy; the implementation measured the runner on real-shaped manifests | the real node holds a shape the 962-manifest census missed (it found only 4 labels, 1 shape) | Yes (his own first start after update, with his own backup if he wants one — DEC-3) | delivery release notes |
| Claude/Codex/native compaction through a running server | no scripted/zero-cost E2E; Codex/Claude need paid logins and large contexts | converter tests prove the value written; same recorder | No | decided in the report |

## Ambiguities Or Reroute Triggers

None found yet.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`; durable coverage added/updated: `Yes`; reroute before execution: `No`.

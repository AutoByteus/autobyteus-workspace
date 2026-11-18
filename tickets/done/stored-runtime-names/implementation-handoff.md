# Implementation Handoff — autobyteus-343 (stored-runtime-names)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (`High`): ARCH-REV-001 `Pass`; the Solution Designer released the build hold after the user's approval of the design (2026-10-30).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names/tickets/in-progress/stored-runtime-names/requirements-doc.md`
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md` (SR-002)
- Design spec: `.../design-spec.md`
- Supplemental task artifacts: `.../task-brief-from-316.md` (context only)
- Design review report: `.../design-review-report.md`; Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`; revision record `.../implementation-revision-record.md`; current revision `IR-001`.
- Related solution revision IDs: SR-002; architecture-review ARCH-REV-001; code-review `N/A`; API/E2E `N/A`; delivery `N/A`. Triggering finding IDs: N/A.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/stored-runtime-names`, branch `codex/stored-runtime-names`. Code commits `feea67f8e2` (writers, migration) and `9d6552c5a3`, `f5f9ee3221` (tests, docs); evidence commits after them (the head is named in the message).

Built:

1. **Writers (REQ-001).** Claude, Codex (two sites), Grok and Antigravity payload builders write `RuntimeKind.<X>`; `ProviderCompactionBoundaryPayload.runtime_kind` is `RuntimeKind`; `ProviderCompactionBoundaryRecorder.parseProviderCompactionBoundary` uses `runtimeKindFromString`, so a payload whose runtime is not a `RuntimeKind` (an old label included) is not recorded as a boundary; the native store (`autobyteus-ts`) writes `'autobyteus'` through one constant at both archive sites.
2. **Migration (REQ-002…004, 007).** `raw-trace-manifest-runtime-names` (id `20261030_raw_trace_manifest_runtime_names`): `-files.ts` holds the frozen old-label table and current set, fixed-depth discovery (`agents/*`, `agent_teams/*/*`, `agent_orgs/*/*/*`), the pure `decideManifest`, and `migrateManifest` (fixed-name `raw_traces_manifest.json.tmp`, fsync, re-read and validate, rename); `-migration.ts` holds the definition (`STARTUP_ONLY`, `requiredOnStartup`, prerequisites `20260617_raw_trace_rotation_layout` and `20260707_raw_trace_active_file_name` by id string) and the status policy: any failed item or a thrown walk error → `FAILED`; else any preserved exclusion → `SUCCEEDED_WITH_WARNINGS` (also when nothing converted); else `SUCCEEDED` (ARCH-F-001). Registered last.
3. **Docs (REQ-006).** `agent_memory.md` (field value, the migration, its limits and the rollback fact), `grok_build_runtime.md:285`, `antigravity_cli_runtime.md:395`.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec § Task Size And Architectural Risk (confirmed by ARCH-REV-001)
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the change rewrites persisted user data in place at startup (825 manifests here); size stayed Medium (two new files, one registry line, seven writer edits, test updates, three doc edits). No escalation trigger fired: no reader of the stored label was found by the grep or the tests; the real manifests held only the four known labels and one shape; no Memory Sync change was needed.
- Selected route: `Code Review` (Large or High → independent source review; rule from `get_handoff_rules`).
- Lightweight self-review: `Not Applicable` (independent review route); done anyway, below.
- New design impact or escalation trigger: `None`

Self-review notes: no old label or mapping in current source outside `src/app-data-migrations/` (checked by the new `tests/architecture/runtime-labels-source-check.test.ts` over `autobyteus-server-ts/src` and `autobyteus-ts/src`); the migration imports only `domain/` and `frozen/` (boundary test passes); no dead code left (no helper existed only for the labels); new files 180 and 74 lines.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, AC-001) | Compaction writes the `RuntimeKind` value, payload and manifest agree | Payload builders → `ProviderCompactionBoundaryRecorder` (`runtimeKindFromString`) → `rotateActiveRawTracesBeforeBoundary` → manifest; native `run-memory-file-store.ts` | Done; converter tests per runtime, `runtime-memory-event-accumulator.test.ts` (new test: values stored; old labels and garbage not recorded), library `run-memory-file-store.test.ts` (`runtime_kind: 'autobyteus'` at both native sites) |
| BEH-002 (REQ-002, AC-002) | Old labels converted; other keys, order, values unchanged | `raw-trace-manifest-runtime-names-files.ts` `decideManifest` / `migrateManifest` | Done; each label, mixed manifest, extra unknown key and nested value, key order, compact form (`…-migration.test.ts`) |
| BEH-002 (REQ-003, AC-003) | Idempotent, restart-safe, ordered after the layout migrations | temp file + rename; current manifests skipped; prerequisites by id | Done; twice-run test (no byte or mtime change), partial-attempt test, leftover-temp test, runner test with the two real layout migrations |
| BEH-002 (REQ-004, AC-004) | Unusable content kept and reported; status policy | `execute` | Done; ten unusable fixtures (unknown, empty, number, object, non-object entry, no/invalid `segments`, root not an object, invalid JSON, empty file) plus unreadable; warning even when nothing converted; `SUCCEEDED` otherwise; failed write → `FAILED` and a retry succeeds; walk error → `FAILED` |
| BEH-002 (REQ-007, AC-007) | Fixed depths, only manifests, no re-audit | `discoverRunFolders`; runner record | Done; wrong-depth, imports, other folders and legacy archive-manifest files stay byte-identical; a second runner start does not run it |
| BEH-003 (REQ-005, AC-005) | No label or mapping in current code | n/a | Done; source check test; AC-005 exemptions below |
| REQ-006 (AC-006) | Isolated run | `evidence/IMP-04-*` | Done; below |
| AC-008 | Existing suites | n/a | `test:unit` (see Checks Run) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

New: `src/app-data-migrations/migrations/raw-trace-manifest-runtime-names/{…-files.ts,…-migration.ts}`, `tests/app-data-migrations/raw-trace-manifest-runtime-names/…test.ts`, `tests/architecture/runtime-labels-source-check.test.ts`. Edited: the writers, the type and the recorder (above), `app-data-migration-registry.ts` (one line, last), updated expectations in the tests that asserted the labels (listed in notes F-11) plus `memory-sync-source-id-names`, `collaborators-to-delegated-runs-v1`, `delegated-copy-own-file-complete-v1`, `remove-skill-improvement-data` (they pin the tail of the registry).

## Important Assumptions

- **Leftover temporary file:** a leftover `raw_traces_manifest.json.tmp` is removed at the start of every run folder the migration meets (convertible, current or unusable), not only overwritten by a conversion; AC-003 says "replaced or removed and never left behind". Only this migration writes that name and nothing runs during the startup run.
- **AC-005 exemptions** (fixtures of another field, not the manifest's runtime): `autobyteus-web/stores/__tests__/runHistoryStore.spec.ts:68` (team launch configuration, in the design), and, found by the check, `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts:1040,1047` and `autobyteus-server-ts/tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts:142,253` (team member `runtimeKind` in run-history fixtures). They were left unchanged; the reviewer can ask for them to move to the `RuntimeKind` values.
- A manifest whose layout migration prerequisites failed is not converted (the runner does not run it until they succeed); on this node both succeeded earlier.
- Nothing was started on real data: the isolated run drives the real runner with two stub prerequisites, because the real layout migrations need segment files, which were not copied.

## Known Risks

- High because it rewrites user data in place; contained by per-file validation, atomic rename, preserved exclusions, and `FAILED` retried at the next start.
- No per-file backup (DEC-3, the user): the rename keeps the old file valid until it is replaced; the conversion is invertible by the frozen table.
- One-time side effects: memory search runs one journal pass per migrated run; Memory Sync uploads each migrated manifest of `agents/` and `agent_teams/` once when a source is configured (design F-09; the Memory Sync hub's behavior on those uploads was verified by the architecture review in code, not by a live sync here).
- Not touched on purpose: the 7,532 label copies inside old trace records, Memory Sync imports (DEC-2), the seven `raw_traces_archive_manifest.json.backup-*` files.
- Gated live suites whose assertions changed (`agy-compaction-rotation-live`, `grok-build-compaction-live`, and the skipped `agy-compaction-rotation-transport`) were not run.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup. Root cause: Legacy Or Compatibility Pressure. Refactor decision: Refactor Needed Now (small). Implementation matched the reviewed assessment: `Yes`. Routed as `Design Impact`: `N/A`.
- Evidence: seven writer edits, no reader, one migration.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the recorder accepts only a valid `RuntimeKind`; no reader accepts an old label; the frozen table lives only in the sealed migration).
- Legacy old-behavior retained in scope: `No`. Dead code in touched files removed: `Yes`. Dead code found elsewhere: none. Shared structures tight: `Yes`. Size guardrails: `Yes`.
- Notes: the frozen target set equals `Object.values(RuntimeKind)` by a test, so the copy cannot drift.

## Persisted Data Transition Check

- Approved decision: `Migration Required` (design-spec § Persisted Data / State Transition Decision). Implementation follows it without an unapproved fallback: `Yes`.
- Migration implementation and focused checks: above; `data_migration_guideline.md` §2 shape inventory covered by fixtures (design table): every row has a test, plus ARCH-F-003's non-string `runtime_kind` and extra-unknown-key fixtures.
- Direct-use/rebuild result: not applicable.
- Deviation from the reviewed decision: `None`.

## Environment Or Dependency Notes

`pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild` (Prisma client and shared packages), `pnpm -C autobyteus-web exec nuxt prepare` for the web spec; a fresh clone in `/tmp` reproduced the checks.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts typecheck` in a clean clone | `f5f9ee3221` | macOS Darwin 25.5.0, fresh clone | all `src` | all | Pass | `evidence/IMP-01-server-typecheck-clean-clone.log` | `typecheck exit 0` |
| IMP-02 | `pnpm -C autobyteus-server-ts test:unit` (worktree) | `9d6552c5a3` | same | all unit suites incl. `tests/app-data-migrations`, `tests/architecture` | AC-008 and all | Pass after one fix: 3 failed on the first run (tests pinning the registry tail), fixed in `f5f9ee3221`; `tests/app-data-migrations` reran green (67 files, 585 tests) | `evidence/IMP-02-server-unit-suite.log` | `Test Files  3 failed \| 880 passed` then the folder rerun `585 passed` |
| IMP-03 | focused server and library suites in a clean clone (`tests/app-data-migrations tests/architecture tests/unit/agent-memory tests/unit/agent-execution/backends tests/unit/services/agent-streaming`; library `tests/unit/memory`) | `f5f9ee3221` | same | writers, recorder, migration, boundary and source checks | AC-001…AC-005, AC-007 | Pass | `evidence/IMP-03-focused-clean-clone.log` | `Tests 2076 passed \| 6 skipped`; `Tests 312 passed` |
| IMP-04 | Isolated run: `rsync` of the real `raw_traces_manifest.json` files only (962 manifests, 5.3 MB; no traces, no journals) to `/tmp`, driven through the real runner (probe `evidence/IMP-04-isolated-run.probe.test.ts`), then a second run; copy deleted | `9d6552c5a3` | same | migration, runner | AC-002, AC-003, AC-006, AC-007 | Pass | `evidence/IMP-04-isolated-run-report.json` | `"status": "SUCCEEDED"`; `"summary": "Scanned 825; migrated 825; skipped 0; failed 0."`; census after: agents `{codex_app_server 49, claude_agent_sdk 12, autobyteus 58, antigravity_cli 2}`, agent_teams `{3386, 68, 3}`, agent_orgs `{213, 3}`; `contentDiffersFromExpected 0`; `importsChanged 0`; `secondRunMigrated 0`; `secondRunFilesChanged 0`; `leftoverTemp 0`; 6.4 s |
| IMP-05 | library `tests/unit`; web `agentStatusHandler.spec.ts`; narrow e2e (clean env) | `f5f9ee3221` | same | native writer; web fixture; recent-run projection, grok replay | AC-001, AC-008 | Pass | `evidence/IMP-05-other-layers.log` | `Tests 2090 passed`; `Tests 30 passed`; `Tests 12 passed \| 1 skipped` |

- Not run, and why: server integration suites, the gated live suites named above, the full e2e folders and the full web suite (left to API/E2E); a real server start on a copy (TESTING.md forbids running a startup on real data or a copy of it; the runner-level run above is the nearest check); the Memory Sync upload path.

## Frontend Rendered-Result Check

`Not Applicable`: one web spec fixture changed; no rendered frontend behavior.

## Downstream Coverage Hints / Suggested Scenarios

- For source review: `decideManifest` and `migrateManifest` (every branch is a fixture); the status policy in `execute`; the recorder change; that nothing outside the sealed area spells a label.
- For API/E2E: a startup of a worktree build on a synthetic memory root with manifests of the old shapes (never the real data), the migration record in the Settings status, then a compaction on a scripted runtime writing the new value; a Memory Sync source with a converted manifest (one upload) if a sync hub is available.
- For delivery (release notes, from the Solution Designer's message): a rollback to the previous release works (older builds do not read the field); after a rollback and a later re-upgrade, entries the older build wrote keep the old spelling (the terminal migration does not run again; autobyteus-316 reads them as "runtime unknown"); imports keep the old spelling until their own node refreshes them; the old label copies inside old trace records stay.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required (independent route: after source review): the startup journey on a synthetic memory root and a scripted-runtime compaction as above; implementation checks are not API/E2E sign-off.

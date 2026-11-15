# Implementation Handoff — memory-sync-large-files (Project Task autobyteus-workspace-7)

## RELEASE ORDER (REQ-010)

**This change must be released before or with `autobyteus-workspace-6`** (2 GiB context-file uploads). Without it, one large attachment stops all Memory Sync. The same sentence is in `autobyteus-server-ts/docs/features/memory_sync.md` ("Update every node together, and release order"). `autobyteus-web/generated/graphql.ts` changed (a fresh-start build input, TESTING.md "Fresh-start build"): delivery runs the fresh-start build. Source and hub nodes must be updated together (`DESIGN.md` rule 9).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review ARCH-REV-003 Pass (SR-004); this route is `Code Review` (Large / High)
- Requirements doc: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files/tickets/in-progress/memory-sync-large-files/requirements-doc.md` (SR-003, Approved)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md`
- Design spec: `.../design-spec.md` (SR-004, Ready)
- Supplemental task artifacts: `.../probes/large-file-sync-probe.e2e.test.ts.txt` (reproduction; turned into the durable e2e below)
- Design review report: `.../design-review-report.md`
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-004
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review / API/E2E / delivery revision IDs: N/A
- Triggering finding IDs: N/A
- Worktree: `/Users/normy/autobyteus-org/autobyteus-task-worktrees/memory-sync-large-files`, branch `task/memory-sync-large-files`, base `origin/personal` @ `3d738de6e`; code commit `3a78c3eee`; no release (stop at merge-ready).

Built exactly as the design sequence: shared limits/hash/types; hub staged store, verify-all-then-write commit, ingestion + sweep owner, routes; source scanner/change planner/batch planner/transfer/stager/failure policy/service; GraphQL; web; tests; doc; replaced code removed.

The reviewed points kept as designed: hub commit order inside the manifest lock (batchId check, verify every operation with staged ops grouped by SHA-256 and each content verified once, refuse the batch before any write, write, manifest); `placeStagedFile` copies to a `.tmp` sibling of every extra target and renames, the last target takes the staged file by rename; the sweep is started only by `MemoryHubIngestionService.requestStagingSweep()` (at most hourly, never two at once, not awaited, rejection logged, start time recorded before starting); run gate (background joins, Sync now during a run queues exactly one manual run, trigger passed as data to `isDue`); outcomes recorded after each batch; stager hashes the received prefix locally and reads exactly `size` bytes; network errors and lost connections are run-level; no test-only parameters.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the implementation touched the same three subsystems and ~32 files (+1,444/-231 lines in src/web) with a new node-to-node contract, new hub persistence area, additive persisted source-state field and a changed run lifecycle. Nothing discovered raises or lowers either value.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` for the design. One item for the reviewer's judgement: cold first-sync source RSS growth with a 2 GiB file was 264 MiB against QR-002's 200 MiB (see Known Risks). Verification time (R-AR-1) is far inside the 300 s timeout.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | All changed, due files per run; batches by count, inline bytes, staged bytes; per-file outcomes recorded after each batch | `memory-sync-service.ts` `runOnce` -> `memory-file-change-planner.ts` -> `memory-sync-batch-planner.ts` -> `memory-sync-batch-transfer.ts` -> `recordOutcomes` | Done. Unit: batch planner (examples of the design), run outcomes; e2e AC-001/AC-002 (10 files, 2+ batches, every request < 50 MiB) |
| BEH-002 | A file > 8 MiB is uploaded in pieces and committed by reference | `memory-file-stager.ts`, `memory-hub-client.ts` (GET/PUT), REST staged routes, `memory-hub-staged-file-store.ts`, `local-file-memory-import-store.ts` | Done. e2e: 40 MiB + 20 MiB files identical on the hub |
| BEH-003/004 | Files >= 384 MiB / >= 2 GiB work | `memory-sync-file-hash.ts` streaming hash; stager 8 MiB piece buffer; hub `hashFile` stream | Done. Measured with 2 GiB and 4 GiB (IMP-05) |
| BEH-005 | Unchanged files (size + mtime) not read | `memory-file-change-planner.ts` `matchesSyncedRecord`; scanner lists stat only | Done. Unit AC-011 (listed path unreadable, still "unchanged"); e2e second run sends no request |
| BEH-006 | Count and list of files not synced; one log line per new failure/reason | `memory-sync-service.ts` `recordOutcomes`; GraphQL `fileFailureCount`/`fileFailures`; `MemorySyncCard.vue` block; en + zh-CN | Done. Web spec (3 tests), e2e status + log line |
| BEH-007 | Staged-file routes; nothing partial visible; same-release contract | REST `api/rest/memory-sync.ts` (scoped octet-stream parser, 8 MiB limit); staging under `memory/memory-sync-staging/`, outside `imports/` | Done. Unit staged store/commit; e2e: partial 8 MiB on the hub not in `imports/` nor the manifest |
| BEH-008 | Hub refuses/unreachable -> run error as before | `memory-hub-response-parser.ts` `MemoryHubRequestError` (gate refusal texts unchanged); `isFileLevelHubError` (400/409/413/422 file-level; everything else, network errors included, run-level) | Done. Unit batch transfer; existing parser test unchanged |
| AR-001..AR-008 | As the review resolution table | `local-file-memory-import-store.ts` `verifyOperations`/`writeOperations`; staged store `placeStagedFile`/`sweepStale`; ingestion `requestStagingSweep`; service `startSync(trigger)` | Done, each with a test (see Checks Run) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New: `src/memory-sync/shared/{memory-sync-transfer-limits,memory-sync-file-hash}.ts`; `src/memory-sync/hub/memory-hub-staged-file-store.ts`; `src/memory-sync/source/{memory-sync-batch-planner,memory-sync-batch-transfer,memory-file-stager,memory-sync-file-failure-policy}.ts`; `src/startup/memory-hub-staging-sweep-loader.ts`.
- Rewritten: scanner (stat only), change planner, `memory-sync-service.ts` (run gate + per-batch recording), `local-file-memory-import-store.ts` (verify-all-then-write), ingestion service, REST routes, state store projection, response parser (`MemoryHubRequestError`).
- Added shared helpers `resolveMemorySyncImportRootDir`/`resolveMemorySyncManifestPath` in `memory-sync-manifest.ts` so the staged store can take the manifest lock without importing the import store.
- Web: `MemorySyncCard.vue`, `memorySyncStore.ts`, query/mutation documents, localization (en, zh-CN), `generated/graphql.ts` (regenerated from the built server schema; diff is only this ticket's fields).
- Removed: `sha256Buffer` whole-file reads, `buildReplaceOperation`, `maxOperations` and "batch limit reached", `chunkOperations`, `MemoryFileDescriptor`, the literal `50 * 1024 * 1024`, the scanner `deferred` list (a vanished file is skipped; changed-while-read is now decided by the change planner).

## Important Assumptions

- A file's size + mtime fully identify "unchanged" (ASM-001). A record with no mtime is treated as changed once.
- `sweepStale` skips taking the manifest lock for a source folder that has no `imports/<id>` yet: taking it would create an empty `imports/<id>` that the imported-source list would show. A source with no imports folder has no commit to order against (a commit creates the folder first, then verifies), so the only exposure is a partial older than 24 h being committed in the same instant the first-ever commit of that source starts.
- The hub's `appendPiece` is not mutex-protected: two concurrent pieces at one offset could both pass the length check; the commit's hash verification then fails and the file is retried (self-healing, not a supported scenario: one source sends one piece at a time).

## Known Risks

- **QR-002 / AC-003 memory (reviewer / API-E2E please judge):** with a 2 GiB file, source RSS grew 264 MiB and hub 191 MiB on the first sync of fresh processes (QR-002 says < 200 MiB). A cold 30 MiB control already grows the source by 116 MiB; with a warm-up sync the 2 GiB transfer adds 84 MiB (source) and 74 MiB (hub); 4 GiB peaks at the same RSS as 2 GiB, so memory does not grow with file size (REQ-002). I did not treat this as a Design Impact; if the cold figure must meet 200 MiB, that is a design question. Evidence `evidence/IMP-05-ac003-measurement.md`.
- **R-AR-1 outcome:** hub verification of a staged 2 GiB file inside the commit request took 5.7 s (6.3 s warm), 12.8 s for 4 GiB, against the 300 s fetch timeout: about 2 %. No Design Impact.
- A source sends all changed files in one run: a run with a 2 GiB file lasts about half a minute locally, minutes over a home network (the run gate coalesces; Sync now queues one run).
- Mixed versions are unsupported by rule (an older hub answers 404 to staged routes).
- Source files near the guardrail: none above 500 lines; largest changed `local-file-memory-import-store.ts` 310 lines (+123 lines; one concern).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix` with `Larger Requirement`
- Reviewed root-cause classification: `Missing Invariant` plus `File Placement Or Responsibility Drift`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the planner/service split in the design worked as specified; no boundary was bypassed.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (operation union discriminated by `contentEncoding`; `MemoryFileEntry` / `ChangedMemoryFile` replace `MemoryFileDescriptor`)
- Canonical shared design guidance reapplied; no file-level design weakness needed routing: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (no file over 500; `memory-sync-service.ts` 174 -> 217 as a rewrite of its run sequence; `local-file-memory-import-store.ts` +123 as the design's one commit owner)
- Notes: existing tests changed because the code they observed changed (run-gate test now asserts the new queued-manual rule; scanner result has no `deferred`; the background-tasks list test names the new loader).

## Persisted Data Transition Check

- Approved decision: source state `Directly Usable — No Migration`; hub staging `Not Affected`; manifest `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without a migration or version-specific fallback: `Yes`
- Direct-use evidence: `memory-sync-file-failures-state.test.ts` (a state file without `fileFailures` reads as `{}`; invalid records dropped; exact written keys)
- Deviation: `None`

## Environment Or Dependency Notes

- No `pnpm` on this machine's PATH; I ran vitest, tsc and graphql-codegen directly from `node_modules` (the codegen check test used the existing `pnpm` shim at `/tmp/msync-bin`). Server e2e runs use the TESTING.md `env -i` recipe and build `dist` themselves.
- `autobyteus-web` needed `nuxt prepare` once for its vitest.
- The untracked `autobyteus-application-*-sdk/dist/` folders in the worktree are not mine and are not committed.

## Checks Run

Code commit tested: `3a78c3eee` (evidence/documents committed after it). Evidence in `tickets/in-progress/memory-sync-large-files/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `vitest run tests/unit/memory-sync` + architecture `tracked-imports`, `application-framework-boundaries`, `web-generated-graphql-current` | 3a78c3eee | macOS, Node v26.12.0, env -i | whole memory-sync unit surface, background task list, committed `generated/graphql.ts` against the built schema | all AC with unit rows; AC-011, AC-009 | Pass | `evidence/IMP-01-unit-and-architecture.log` | `Test Files  17 passed (17)`, `Tests  91 passed (91)` |
| IMP-02 | `vitest run tests/e2e/memory-sync` (two real built servers + counting proxy) | 3a78c3eee | same | whole sync path | AC-001, AC-002, AC-004, AC-005, AC-008, AC-009, AC-010 (GraphQL), AR-001 | Pass | `evidence/IMP-02-e2e-memory-sync.log` | `Test Files  5 passed (5)`, `Tests  8 passed (8)`; the four `memory-sync-large-files` tests |
| IMP-03 | `node scripts/typecheck.mjs` (server) | 3a78c3eee | same | src + tests | all | Pass | `evidence/IMP-03-server-typecheck.log` | `production errors: 0; test-file errors: 1180 in 364 files (baseline 1180 in 364 files)` and `PASS` |
| IMP-04 | `vitest run components/settings/__tests__/MemorySyncCard.spec.ts` | 3a78c3eee | jsdom | card, store types | AC-010 | Pass | `evidence/IMP-04-web-memory-sync-card.log` | `Tests  7 passed (7)`; the three "files that could not be synced" tests |
| IMP-05 | one measured 2 GiB (and 4 GiB, warm, 30 MiB control) run, RSS sampled every 250 ms | 3a78c3eee | same | stager, hub store, commit | AC-003, QR-002, R-AR-1 | Pass with a note (cold source growth 264 MiB > 200) | `evidence/IMP-05-ac003-measurement.md` (+ raw json) | table rows "Cold 2 GiB", "Warm 2 GiB"; hub commit request `5661 ms` |

- Not run, and why: the full server unit suite end to end (it exceeded my time limit; only the memory-sync, node-access, architecture and migration-gate subsets ran; `tests/unit/memory-search/memory-search-store.test.ts` and `tests/architecture` memory-search cases fail in this environment with `RangeError: Value is too large to be represented as a JavaScript number` from the SQLite store, which this change does not touch); the web typecheck gate (`node scripts/typecheck.mjs` in `autobyteus-web` reports 6 more test-file errors than baseline in files this change does not touch (`layouts/__tests__/default-drawer.spec.ts`, `test-support/*`) and none in changed files; I did not run `prepare:shared-types`) and two web specs (`DisplaySettingsManager`, `LanguageSettingsManager.integration`) that fail here on `localStorage.clear` under Node 26, unrelated; `agent-semantic-memory.e2e.test.ts` (edited for the removed `deferred` field; type-checks; needs its own environment); fresh-start desktop build and `pnpm release:test` (delivery).

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Nodes -> Memory Sync card, status block under `Current job` / `Last sync`.
- Approved UI/UX references: none (requirements "UI" section: warning-coloured count line, then a list of at most 20 rows `path · size · reason · next attempt`, then "and N more"; en + zh-CN).
- Existing design system reviewed: the card's own amber/red/green Tailwind pattern (`connectionTestToneClass`, the amber `secureTransportWarning` paragraph).
- Surface used: component render under jsdom in `MemorySyncCard.spec.ts` only.
- States inspected: no failures (nothing extra), 23 failures with 2 listed (title, rows with GB/KB size, "and 21 more"), single failure ("1 file"); sizes now format as GB.
- Issues found and corrected: sizes above 1 GB showed as `1900.0 MB` -> added GB.
- Limitation: not rendered in a browser or the desktop app; no screenshot, no check of long paths wrapping (`break-all` set) or the zh-CN catalog in the real UI. API/E2E should do the visual check.

## Downstream Coverage Hints / Suggested Scenarios

- Real card with a failing file (corrupt a piece through a proxy as the e2e does) in en and zh-CN; Sync now while a background run uploads a large file (queued manual run); 2 GiB run recorded again by the API/E2E engineer; a hub restart during an upload; two nodes where the hub is the user's own node.
- Check `memory_sync.md` reads correctly for AC-007/AC-012.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Independent executable validation remains with `api_e2e_engineer` (AC-003 independent run, rendered card check, any broader environment). Source review first (Large / High).

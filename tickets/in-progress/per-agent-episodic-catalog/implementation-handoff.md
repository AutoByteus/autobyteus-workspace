# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog/tickets/in-progress/per-agent-episodic-catalog`
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog`, branch `codex/per-agent-episodic-catalog` (base `origin/personal` at `2b73308ce5`). Commits: see § Checks Run.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High → independent architecture review selected and passed (ARCH-REV-002; contract addendum ARCH-REV-004; SR-003 revision ARCH-REV-005); source review next, by `get_handoff_rules`
- Requirements doc: `requirements-doc.md` (SR-002, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-003, Ready; its § "SR-003 Revision" governs where it differs)
- Supplemental task artifacts: `episodic-catalog-contract.md` (SR-002, behavior-defining), `follow-ups.md`
- Design review report: `design-review-report.md` (ARCH-REV-005, `Pass`; notes N-6, N-7 applied)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `code-review-report.md` CRR-002 CR-001 (from `api-e2e-execution-coverage-report.md` API-REV-001: API-09/EC-06, API-15), resolved through SR-003 / ARCH-REV-005
- Code review: CRR-001 `Pass`; CRR-002 `Design Impact` (CR-001). CF-11 (orphaned `noWorkGuard` doc comment) is fixed in IR-002
- Code review of IR-002: CRR-003 `Pass` (full re-audit; CR-001 and CF-11 resolved). CF-14 (non-blocking): for package-level diagnostics the `record` label names the tree file while `reason` carries the true code

## Current Implementation Summary

A new server subsystem, `src/agent-episodic-catalog/`, keeps one Markdown catalog per agent definition with runs on the node (`<memory>/episodic/<encoded definition id>/catalog.md`) and the overview `<memory>/episodic/index.md`, rendered exactly as `episodic-catalog-contract.md` gives them. `EpisodicCatalog` builds every catalog in the background at start from one full run-folder discovery, follows journal changes (debounced queue of roots: 5 s quiet, 30 s at most) and committed deletes of agent, team and org runs, and writes only files whose content changed (temporary file + rename). The run-folder discovery moved from memory search to `agent-memory` and reports three more facts (root, agent definition, recorded start); memory search maps it to its unchanged `MemoryRun`. The journal service gained a header-only span read; `ProjectTaskService` gained `taskTitleOf`. Both composition roots create the catalog after steps 1–2, pass it to the three run services, start it after step 8 and stop it at close.

IR-002 (SR-003) makes "unreadable" an explicit outcome. Discovery gives each run an `attribution`: `attributed`, `unattributed`, or `unreadable(record, reason)`. That covers a team or org root the run-package readiness index did not admit, and a standalone run's unreadable metadata with no history row naming the definition. Discovery logs `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE` once per root, record and reason per instance. `readJournalSpans` returns `none` / `unreadable` / `spans`; the catalog leaves out a run whose manifest cannot be read and logs `EPISODIC_CATALOG_RUN_LEFT_OUT` once per run and reason.

- Implementation cycle: `Rework`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-002` (with the contract addendum), `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-002`, `ARCH-REV-004`, `ARCH-REV-005`
- Related code-review revision IDs: `CRR-001`, `CRR-002`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: CRR-002 CR-001 (CF-12); API-09 / EC-06 (AC-009); API-15; CF-11

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Large`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: as designed: a new subsystem with a background lifecycle and derived files beside user data, a privacy boundary, the discovery ownership move, wiring in two composition roots and two steps; about 20 source files over seven subsystems.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. AC-010 measured well under the 2-minute trigger (§ Checks Run, IMP-07 and, for IR-002, IMP-14: 12.5 s); no write in a run folder, no journal rendering, no change to memory search's stored model.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Folder + catalog per definition (REQ-001…003, REQ-010, REQ-011) | `AgentMemoryLayout.getAgentEpisodicDirPath` (one `definitionFolderName` helper with the semantic folder) → `EpisodicCatalogStore.writeCatalog` → `renderCatalog`; attribution by `DiscoveredRun.attribution` (`RunFolderDiscovery`; only `attributed` runs get entries, `switch` on the kind) | Implemented; renderer tests compare against contract §2.5 byte for byte; a definition whose runs are gone keeps a `0 runs.` catalog named by its decoded id (N-2, contract §2.3) |
| BEH-002 | Entry current ≤ 60 s after a journal change; bursts merged (REQ-005, REQ-012) | `WorkJournalService.onJournalChanged` → `EpisodicCatalog.journalChanged` → `RunFolderDiscovery.rootOf` → queue → pass (`findRunsOfRoot` → `readJournalSpans` → `buildCatalogEntry`) → write-if-changed | Implemented; 5 s quiet / 30 s max wait; unit tests prove one root refresh per burst and the max-wait bound. IR-002 (REQ-012, AC-009): an unreadable record → `attribution.kind: "unreadable"`, left out, `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE` from discovery (once per root/record/reason per instance); an unreadable manifest → left out, `EPISODIC_CATALOG_RUN_LEFT_OUT` (once per run/reason per catalog) |
| BEH-003 | Delete removes entries ≤ 60 s; archive nothing (REQ-006) | `AgentRunHistoryService.deleteStoredRun`, `TeamRunHistoryService.deleteStoredTeamRun`, `AgentOrgRunService.deleteStoredRun`: after `result.success` → `episodicCatalog.runDeleted(root)` → queued drop → write | Implemented; guards, results and messages unchanged; a refused delete and archive call nothing (unit) |
| BEH-004 | Background rebuild at start, read-only, no delay (REQ-007, REQ-008, REQ-010) | composition root → `EpisodicCatalog.start({ taskTitles })` → start pass: one `findRuns()` + `listCatalogDefinitionIds()` → spans per attributed run → every catalog + `index.md`, written only when changed | Implemented; `start` returns at once; unit test counts one `findRuns`, no `findRunsOfRoot`, one span read per attributed run; AC-010 probe: second start rewrites nothing, nothing outside `episodic/` changes |
| BEH-005 | No conversation text; About = Task title only (REQ-004) | `buildCatalogEntry` takes only the `DiscoveredRun`, the spans and the title; title from `DelegationIndex.currentTaskOf(root)` → `ProjectTaskService.taskTitleOf` (title only; null for no Project / gone / unreadable) | Implemented; marker checks in the builder test; the run-history summary is not an input |
| BEH-006 | `index.md` overview (REQ-009) | `renderIndex` (contract §3, by agent name then folder) → `EpisodicCatalogStore.writeIndex` at the end of every pass | Implemented; test compares against the contract §3 example |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New subsystem `autobyteus-server-ts/src/agent-episodic-catalog/`:
  - `services/episodic-catalog.ts`: `EpisodicCatalog` (start, runDeleted, stop; queue and timer; start and refresh passes; containment) and `createEpisodicCatalog`
  - `services/catalog-entry-builder.ts`: entry fields and the privacy rule
  - `rendering/catalog-markdown-renderer.ts`: `catalog.md` and `index.md` exactly as the contract
  - `store/episodic-catalog-store.ts`: folder listing, write-if-changed with atomic rename
  - `domain/episodic-catalog-models.ts`: `CatalogEntry`, `CatalogJournalFile`, `AgentCatalog`
- `src/agent-memory/`: `store/agent-memory-layout.ts` (episodic root and folder), `services/run-folder-discovery.ts` (moved from `memory-search/runs/memory-run-discovery.ts`; `findRunsOfRoot`, `rootOf`, three new facts; IR-002: `attribution` from `readMetadataState`, the history row and the package catalogs' diagnostics (`teamPackages` / `orgPackages` collaborators, read after the sources: N-7; team `*` only: N-6), log-once `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE`), `domain/discovered-run.ts` (`DiscoveredRun`, `RunAttribution`, `MemoryRunSubject` moved here: N-1)
- `src/agent-work-journal/`: `readJournalSpans` (service), `readJournalHeaderTimeRange` (reader; replaces the old `HEADER_FIRST_DAY`), `readJournalFileHead` and `readManifestJournalFileNames` (store; IR-002: `none` for ENOENT, `unreadable` for any other read error, non-JSON or no file list), `WorkJournalFileSpan`, `WorkJournalSpans` (models)
- `src/memory-search/`: `runs/memory-run-mapping.ts` (`toMemoryRun`), pipeline and boundary use `RunFolderDiscovery`; `domain/memory-search-models.ts` and `api/graphql/types/memory-search.ts` import `MemoryRunSubject` from `agent-memory` (no re-export)
- Delete notification: `run-history/services/agent-run-history-service.ts`, `run-history/services/team-run-history-service.ts`, `agent-org-execution/services/agent-org-run-service.ts`
- `projects/services/project-task-service.ts`: `taskTitleOf`
- Wiring: `agent-execution/runtime/general-process-run-supervisor-input.ts` (required `episodicCatalog`), `general-process-run-supervisor.ts`, `compositions/collaboration-composition.ts`, `compositions/build-studio-server.ts`, `standalone-application-host/start-standalone-application-host.ts`
- Docs: new `docs/modules/agent_episodic_catalog.md`; `agent_memory.md`, `agent_work_journal.md`, `memory_search.md`, `docs/modules/README.md`; `GLOSSARY.md` § Memory (Episodic catalog, catalog entry, Discovered run)
- Tests: `tests/unit/agent-episodic-catalog/*` (4 files, new), `tests/unit/agent-memory/run-folder-discovery.test.ts` (moved and extended), `tests/unit/agent-memory/agent-memory-layout.test.ts`, `tests/agent-work-journal/services/work-journal-reading.test.ts`, `tests/unit/run-history/services/run-delete-episodic-catalog.test.ts` (new), `tests/unit/projects/ad-hoc-tasks.test.ts` (`taskTitleOf`), `tests/helpers/no-delegations.ts` (`noEpisodicCatalog`) and the call sites that construct the run services or the supervisor input
- Probe: `probes/ac010-start-build-probe.mjs` in the ticket folder

## Important Assumptions

- A run's "start" for ordering is the first journal file's header start (UTC minute), else its recorded start; both are rendered as `YYYY-MM-DD HH:MM`, which also orders lexically.
- The "newest run" that names a catalog (contract §2.3) is the last entry in contract order that has a start; when no entry has one, the last entry.
- A manifest that lists no file (or whose files are all gone) is rendered as "no journal yet", like a run with no manifest.
- Index order "by agent name" uses plain code-point comparison (locale-independent), which gives the contract's example order.

## Known Risks

- **Found during implementation (fixed, `0be36462ef`):** on the founder's data most journal manifests are an older shape (runtime once per manifest, not per entry). The journal store's full projection drops those entries (so they are rendered again at the next `ensureCurrent`), which made 3,490 of 3,788 entries "no journal yet". `readJournalSpans` now reads the file names the manifest lists (`WorkJournalStore.readManifestJournalFileNames`, a names-only read); the projection used for rendering decisions is unchanged and nothing is rendered or written. It stays inside the journal owner and the design's `readJournalSpans` contract ("per manifest file"), so it is recorded here, not routed as a Design Impact; the code reviewer may judge it.

- Node start-pass time on the founder's data is measured on an APFS clone without Task title lookups (the clone holds no Task records): each distinct Task id costs one `ProjectStore.findTask` (lists projects, reads one file per project) per pass. Not expected to be material, not measured.
- The Task title is the root's current Task (design Risks, N-4).
- `stop()` during the start pass drops it unwritten (the next start rebuilds); a shutdown waits at most for the run read in flight.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature
- Reviewed root-cause classification: File Placement Or Responsibility Drift (discovery placement)
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: discovery moved to `agent-memory/services/run-folder-discovery.ts` with no re-export; the catalog imports nothing from `memory-search`; memory search maps `DiscoveredRun` to an unchanged `MemoryRun` (pinned by the moved test).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. Public `folderRun`, `runKeyOf` and exported `nameFromFolder` are private now and `folderRun` left the pipeline's `Pick` (AR-006); `HEADER_FIRST_DAY` replaced by `readJournalHeaderTimeRange`; an unused `createRootExecutionIdentity` import in `team-run-history-service.ts`; two orphan doc comments in the moved discovery test.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Deviations from a design principle decided during implementation, each with the principle and why the reason holds for this case:
  - **`createEpisodicCatalog({ memoryDir, journals, tasks })` beside the class** (design: inline `new EpisodicCatalog({ layout, discovery, journals, tasks })` in each root). Reason: the inline form took `build-studio-server.ts` from 492 to 506 effective lines, over the 500-line guardrail, and repeated the same layout/discovery construction in both roots. It is a construction function, not an interface or wrapper: the roots still pass the process journal service and the Task side's tree in, and nothing is looked up inside the catalog (Principle 16 holds).
  - **The studio stops the catalog first in `closeProcessResources`** (design: inside `closeStudioProcessResources`, beside `shutdownMemorySearch()`). Same file-size reason; it still stops before the Task service and run services are released.
  - **`CatalogEntry` carries `agentName` and `memoryDir`** (not in the design's type): the header name rule (§2.3) needs each run's name, and "no journal yet" needs the run folder. Neither is rendered in an entry beyond what the contract shows.
  - **Discovery's warning code renamed** `MEMORY_SEARCH_DISCOVERY_SOURCE_FAILED` → `RUN_FOLDER_DISCOVERY_SOURCE_FAILED` (the owner is no longer memory search; Principle 15). No doc or other code named it.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. Largest: `build-studio-server.ts` 499 effective lines (was 492); `project-task-service.ts` 467; `general-process-run-supervisor.ts` 441. Largest change delta: `run-folder-discovery.ts` (a rewrite of the moved file, ~210 lines).
- Notes: no `?.`/fallback on a required collaborator; `episodicCatalog` is required in the three services, the supervisor input (validated in `requireGeneralProcessRunSupervisorInput`) and `composeCollaboration`.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Discard or Rebuild` for `<memory>/episodic/**`; `Not Affected` for every existing file
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Direct-use evidence or discard/rebuild result, when applicable: the catalog never reads its own files back; every start renders from records and journal headers; the AC-010 probe shows no file outside `episodic/` changes and a second start writes nothing (IMP-07)
- Migration implementation and focused checks, only when `Migration Required`: N/A
- Deviation from the reviewed transition decision: `None`
- Existing journal manifests are read as they are: `readManifestJournalFileNames` projects only each entry's `journal_file` (a recognized field, any manifest shape), with no version branch; nothing is migrated or rewritten (Principle 5's version-agnostic reader).

## Environment Or Dependency Notes

- macOS (Darwin 25.5), Node v22.23.1, pnpm workspace install `--frozen-lockfile`; no dependency or build-input change.
- `pnpm -C autobyteus-server-ts build` is needed before the AC-010 probe (it imports `dist/`).

## Checks Run

Code commits: `1bb4a44e83` (steps 1–3), `00bb99fe77` (steps 4–6), `0be36462ef` (span-read fix found by IMP-07); IR-002: `159286c1c1` (SR-003). IMP-01…IMP-09 ran on `0be36462ef` unless the row says otherwise; IMP-10…IMP-15 are IR-002's and ran on `159286c1c1`; evidence is in `evidence/`, probes in `probes/`. The host is shared and ran at a load average of 64–173 throughout.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | New and changed unit tests: `tests/unit/agent-episodic-catalog/*` (renderer vs contract §2.5/§3, entry builder privacy and AC-013 fields, store write-if-changed, `EpisodicCatalog` start/restart/debounce/delete/containment/stop), `run-folder-discovery.test.ts`, `agent-memory-layout.test.ts`, `work-journal-reading.test.ts`, `run-delete-episodic-catalog.test.ts`, `ad-hoc-tasks.test.ts` | `0be36462ef` | macOS 26.5.2, Node 22.23.1 | `src/agent-episodic-catalog/**`, discovery, layout, journal spans, the three deletes, `taskTitleOf` | BEH-001…006; AC-001, AC-002, AC-004 (unit), AC-005 (unit), AC-007, AC-008, AC-009, AC-013 | Pass | `IMP-06-targeted-unit-rerun.log` (contains them) | `Tests  854 passed \| 2 skipped (856)` |
| IMP-02 | `pnpm -C autobyteus-server-ts typecheck` | `0be36462ef` | same | server `src` and tests | — | Pass | `IMP-02-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)` |
| IMP-03 | `pnpm -C autobyteus-web typecheck` (TESTING.md: both typechecks) | `0be36462ef` | same | server source through the web's cross-package tests | — | Pass | `IMP-03-web-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` |
| IMP-04 | `pnpm -C autobyteus-server-ts test:unit` (whole suite) | working tree of `00bb99fe77` before the lifecycle test fix | same, load 64–125 | everything | AC-011 | Fail → 6 failures, each resolved or explained below | `IMP-04-server-unit-suite.log` | `Tests  6 failed \| 8319 passed \| 9 skipped (8334)` |
| IMP-05 | The four load-sensitive files of IMP-04 again, `--testTimeout=60000` | `0be36462ef` | same, load 77–91 | tracked imports, native command shutdown, package and skill folder watchers | — | Partly: tracked-imports and native shutdown pass; the two watcher files still fail | `IMP-05-load-sensitive-rerun.log` | `Tests  5 failed \| 26 passed (31)`; failures are `Timed out waiting for the monitor.` / `Hook timed out in 10000ms.` |
| IMP-06 | Targeted rerun of every touched area: `vitest run tests/unit/agent-episodic-catalog tests/unit/agent-memory tests/agent-work-journal tests/unit/memory-search tests/unit/run-history tests/unit/agent-org-execution tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts tests/unit/standalone-application-host tests/unit/projects/ad-hoc-tasks.test.ts` | `0be36462ef` | same | as IMP-01 plus memory search, run history, org services, supervisor input, standalone host lifecycle | AC-011 (touched areas) | Pass | `IMP-06-targeted-unit-rerun.log` | `Test Files  125 passed \| 1 skipped (126)` |
| IMP-07 | AC-010 probe: `cp -cR ~/.autobyteus/server-data/memory <test folder>` (APFS clone; source only read), then `node probes/ac010-start-build-probe.mjs <clone> <json>` (built `dist/`; two starts) | `0be36462ef` (and before the fix, `00bb99fe77`) | same, load 88–115 | `createEpisodicCatalog`, `RunFolderDiscovery`, `readJournalSpans`, store, renderer | AC-010; AC-006 and AC-007(a) on real data; QR-002, QR-004 | Pass | `IMP-07-ac010-start-build.log` / `.json`; `IMP-07-ac010-start-build-before-span-fix.log` / `.json` | first start `"passMs": 9910`, second start `"passMs": 3381`, `"catalogs": 124`, `"catalogedRuns": 3788`, `"rewrittenAtSecondStart": []`, `"changedOutsideEpisodic": 0` (36,990 files compared) |
| IMP-08 | `python3 -I probes/imp08-summary-privacy-check.py <clone>`: every run-history summary of ≥ 25 characters searched in all episodic files | `0be36462ef` | same | entry builder, renderer | REQ-004 / AC-003 (supporting) | Pass | `IMP-08-clone-privacy-check.log` | `summaries found in episodic files: 0` (638 checked) |
| IMP-09 | `env -i PATH HOME=<temp> TMPDIR vitest run` the three e2e files whose imports moved with discovery | `0be36462ef` | same | memory search GraphQL, journal vocabulary, semantic memory e2e | AC-011 (memory search, semantic memory) | Pass | `IMP-09-memory-e2e.log` | `Tests  9 passed \| 7 skipped (16)` (7 are live-gated) |
| IMP-10 | IR-002 targeted rerun: `vitest run tests/unit/agent-episodic-catalog tests/unit/agent-memory tests/agent-work-journal tests/unit/memory-search tests/unit/run-history tests/unit/agent-org-execution tests/unit/agent-execution/general-process-run-supervisor-ownership.test.ts tests/unit/standalone-application-host tests/unit/projects/ad-hoc-tasks.test.ts tests/unit/api/graphql/types`. New cases: each attribution outcome for each family, the whole-scan `*`, log-once (and again for a new reason, again per instance), diagnostics read after the sources (N-7), memory search's runs unchanged; unreadable manifests (not JSON, no file list, EISDIR) vs none; the catalog leaves an unreadable-manifest run out with one `EPISODIC_CATALOG_RUN_LEFT_OUT` per reason and reads no unattributed/unreadable run | `159286c1c1` | macOS 26.5.2, Node 22.23.1, load 64–83 | discovery attribution, journal spans result, catalog switch, memory search | REQ-012, AC-009, AC-011 (touched areas) | Pass | `IMP-10-targeted-unit-rerun.log` | `Test Files  140 passed \| 1 skipped (141)`, `Tests  924 passed \| 2 skipped (926)` |
| IMP-11 | the three memory e2e files (their discovery fakes now give `readMetadataState`), `env -i` as IMP-09 | `159286c1c1` | same | memory search GraphQL, journal vocabulary, semantic memory | AC-011 | Pass | `IMP-11-memory-e2e.log` | `Tests  9 passed \| 7 skipped (16)` |
| IMP-12 | `pnpm -C autobyteus-web typecheck` | `159286c1c1` | same | server source via cross-package tests | — | Pass | `IMP-12-web-typecheck.log` | `production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` |
| IMP-13 | `pnpm -C autobyteus-server-ts typecheck` | `159286c1c1` | same | server `src` and tests | — | Pass | `IMP-13-server-typecheck.log` | `production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)` |
| IMP-14 | AC-010 probe again on a fresh APFS clone of the founder's memory (the IMP-07 command; stderr kept) | `159286c1c1` | same, load 87–119 | the IR-002 discovery over real records | AC-010, REQ-012 on real data | Pass | `IMP-14-ac010-start-build.log` / `.json`, `IMP-14-ac010-warnings.log` | first start `"passMs": 12532`, second `"passMs": 12064`, `"rewrittenAtSecondStart": []`, `"changedOutsideEpisodic": 0`; `6 RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE` = 3 team roots with `ROOT_RUN_PACKAGE_MISSING_TREE` (9 member folders) × 2 starts (one discovery instance each); no `EPISODIC_CATALOG_RUN_LEFT_OUT` |
| IMP-15 | privacy check on the IMP-14 clone (`probes/imp08-summary-privacy-check.py`); clone removed afterwards | `159286c1c1` | same | entries | REQ-004 (supporting) | Pass | `IMP-15-clone-privacy-check.log` | `summaries found in episodic files: 0` (641 checked) |

IMP-04 failures, one by one (TESTING.md Rule 9):

- `standalone-application-host-lifecycle.test.ts` "runs phases 5-10 in order": **caused by this change** (it pinned the exact supervisor input, and it ran the real catalog over `/tmp/standalone-lifecycle/memory`). Fixed in the test (`00bb99fe77`): it fakes `createEpisodicCatalog` and now asserts the catalog is created before step 3, passed to steps 3–8, started with the Task service after `composeCollaboration` and stopped before the run services close. Passes in IMP-06.
- `tracked-imports.test.ts`: first failure **caused by this change's then-uncommitted new files** (the check reads `git ls-files`); after the commit the script reports `Tracked-import check passed. Tracked files scanned: 97072`; the test then only hit its 5 s timeout at load ~125 and passes with a longer timeout (IMP-05).
- `native-command-shutdown.test.ts`: `ps -axo …` and "Command control deadline exceeded" under load; passes alone (IMP-05). Its code does not reach any changed file.
- `skill-folder-watcher.test.ts` (CR-005) and `agent-package-folder-watcher.test.ts` (2–4 tests): **not caused by this change.** Their import closure (`chokidar` and their own `skill-update-notices` / `agent-package-definitions` files) contains no changed file. They wait on fixed internal timeouts (`waitFor` 5 s, a 10 s hook) for macOS file events; the file itself notes "under load the watcher arms late". They fail here at a load average of 77–125 even with `--testTimeout=60000` (IMP-05). To re-check on a quiet host.

- Not run, and why:
  - Server `test:integration` and the whole server E2E suite: left to API/E2E (only `tests/integration/api/run-file-changes-api.integration.test.ts` and four e2e files changed, by adding the no-op catalog to their run services; they compile, IMP-02).
  - A real-app journey on an isolated instance (AC-004, AC-005 live; AC-003 with marker strings; AC-006 listing on a server start): API/E2E. IMP-07 runs the production owners on real data, without a server start or migrations.
  - The whole server unit suite was not rerun for IR-002: the rerun plan (TESTING.md "Rerun by impact") covers every file IR-002 changed and every consumer of discovery, the journal span read and the catalog (IMP-10, IMP-11); no shared foundation changed.
  - EC-06 again: API/E2E (design SR-003 § Tests).
  - Nothing ran against the founder's own memory folder; it was only read by `cp -c` (the clones were removed after IMP-08 and IMP-15). The delivery gates (his approval and a backup before the first start on his node; release only on his word) are untouched.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: backend files only; the Memory page and every UI are unchanged (requirements: no UI).

## Downstream Coverage Hints / Suggested Scenarios

- **AC-003 privacy markers:** runs whose user message, tool call, tool result, journal line, Task description and run-history summary carry unique markers; grep every file under `<memory>/episodic/`. A run with a Project Task shows `- About: <title>`; a delegated copy with an ad-hoc Task (no Project) and an org run show no About line.
- **AC-004 live:** a turn of a live run → its entry's last activity and file lines change within 60 s; a new run's first turn → a new entry. A burst of turns gives at most a few rewrites (a pass 5 s after the last change, at most 30 s after the first).
- **AC-005:** archive and delete one standalone, one team and one org run through GraphQL/UI; deleted entries leave within 60 s, archived ones stay, other catalogs keep their modification time; a delete refused by the guard (a delegated child working) changes nothing.
- **AC-006 / AC-007 on a server:** start on a memory folder with no `episodic/`; compare a before/after listing (path, size, mtime) of every file outside `episodic/`; restart with no change → no catalog file's mtime changes; remove one run folder and all runs of one agent while stopped → the entry leaves and that agent's catalog becomes `0 runs.`.
- **AC-009:** edit a catalog by hand → rewritten at the next change of that agent or the next start; make `<memory>/episodic` unwritable → `EPISODIC_CATALOG_WRITE_FAILED` in the log, runs and journals continue.
- **Older journal manifests (found in IMP-07):** runs whose `work_journal_manifest.json` has the runtime once per manifest must list their journal files, not "no journal yet". Synthesize that shape (see the new case in `work-journal-reading.test.ts`), never copy real data into a test.
- **Both composition roots:** the standalone application host also keeps catalogs for its own memory folder.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Server E2E for AC-003, AC-004, AC-005, AC-006, AC-007, AC-009 over a real server and test-owned memory folder (design: `tests/e2e/memory/episodic-catalog.e2e.test.ts`, owned by API/E2E).
- The whole server unit, `test:integration` and E2E suites (AC-011), and a re-run of the two folder-watcher files on a quiet host.
- The real-app proof on an isolated instance (TESTING.md) as the design's step 7 describes; AC-010 is measured here (IMP-07) on an APFS clone without a server start; a measurement inside a started instance on a clone is API/E2E's call. Note TESTING.md's rule "never run a migration, startup or conversion on real user data or a copy of it": IMP-07 ran no startup and no migration, only the catalog build over the clone, writing only under the clone's `episodic/`; a full server start on a clone of the founder's memory would conflict with that rule and needs the owner's decision.

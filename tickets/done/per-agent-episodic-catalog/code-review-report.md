# Code Review Report

## Latest Round: Implementation Review Round 3 (CRR-005)

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-005` (prior: CRR-004 `Fail`, test review TR-001, implementation-owned `Local Fix`)
- Current Review Round: 3
- Trigger: IR-003, the TR-001 Local Fix
- Code reviewed: `1324c3e8f4`; handoff and evidence in `809ba8e697`. Delta: `git diff 63fa073eb8 1324c3e8f4` (three files).
- Review Scope: `Targeted Delta Review`. The change stays within TR-001's files and behavior: `run-folder-discovery.ts` `agentRuns`, its unit test, and `agent_episodic_catalog.md`. No shared shape, interface or spine owner changes. Every other check and score is carried forward from CRR-003, whose evidence is still valid.
- Checks not rerun (they ran on `1324c3e8f4`):
  - IMP-16: discovery, memory search, catalog and journal unit tests, 407 passed.
  - IMP-17: memory e2e passed.
  - IMP-18: server and web typechecks at baseline.

### TR-001: resolved

- **Source.** `agentRuns` now takes the definition from the metadata state alone: present → `attributed`; unreadable → `unreadable` (`run_metadata.json`); missing → `unattributed`. The row fallback and its false comment are gone. The row still supplies the name, workspace and created time for admitted runs, and the new comment states why: a row exists only for an admitted run.
- **Memory search.** The `AGENT` subject's `agentDefinitionId` comes from the same attribution. Because rows exist only for runs with present metadata, `MemoryRun` is unchanged in practice. The test pins the field set and the row-supplied name ("Meta Agent").
- **Unit test.** The `row_only` case, which faked a row for an unadmitted run, is replaced by the real shape: a row only for the admitted `with_meta`.
- **Docs.** `agent_episodic_catalog.md` § Which runs now says that a history row never decides the definition, and that unreadable metadata is `unreadable` with or without a row.
- **Design wording.** The departure from SR-003 decision 1's wording is recorded in the handoff with its reason (unreachable, Core Principle 7). `Pass — deviation recorded, reason holds.`

### Observation

| Candidate ID | Observation | Disposition | Reason |
| --- | --- | --- | --- |
| CF-17 | The definition is now `state.metadata.agentDefinitionId.trim()`, not `optional(...)`. A whitespace-only id in present metadata would become `attributed` with `""`, then fail in the layout. | Reject (Technically Possible but Unsupported/Contrived) | `readMetadataState` rejects a falsy id, and only the product writes this file. No supported path writes a blank id. |

## Prior Round: Implementation Review Round 2 (CRR-003)

- Review Entry Point: `Implementation Review`
- Current Code Review Revision ID: `CRR-003` (prior: CRR-002 `Fail`, `Design Impact`)
- Current Review Round: 2
- Trigger: IR-002, which implements SR-003 (passed in ARCH-REV-005, notes N-6 and N-7). It resolves CR-001 and covers API-15 and CF-11.
- Code reviewed: `159286c1c1`, with docs and evidence in `f621b5864a`. Delta: `git diff 0be36462ef 159286c1c1`. The API/E2E commits `ba427ab13d` and `4e8a8b3263` in between add only tests and docs, and IR-002 does not change the E2E test file.
- Review Scope: `Full Re-Audit`.
  - Why: the delta changes a shared data shape (`DiscoveredRun.agentDefinitionId` becomes `attribution`, which memory search also consumes) and a shared interface's result (`readJournalSpans` now returns a three-way result). It also touches the spine owner, `EpisodicCatalog.buildEntries`.
  - Every structural check was rerun against the changed files. Results for files the delta does not touch are carried forward from CRR-001 (evidence still valid: their code is unchanged).
- Design basis: design-spec § SR-003 Revision (requirements and contract unchanged at SR-002); `design-review-report.md` ARCH-REV-005.
- Checks not rerun: no code changed after `159286c1c1`, the commit IMP-10…IMP-15 ran on.
  - IMP-10: 924 unit tests passed.
  - IMP-11: memory e2e passed.
  - IMP-12/13: web and server typechecks at baseline.
  - IMP-14: on a fresh clone, first start 12.5 s, second start 12.1 s (load average about 119), nothing rewritten, nothing outside `episodic/` changed; 6 `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE` lines.
  - IMP-15: 0 of 641 summaries found in any catalog.

### Prior finding CR-001: resolved

- **Team and org.** A member folder that `listAgents` did not locate is now `unreadable` when its root has a readiness diagnostic. The diagnostics are read through two new narrowed collaborators, `Pick<TeamRunPackageCatalog,"getDiagnostics">` and `Pick<AgentOrgRunPackageCatalog,"listDiagnostics">`. They are read *after* the sources (`run-folder-discovery.ts` `discover`, the N-7 order, pinned by the test's `order` assertion). Team `*` covers a failed whole scan; there is no org `*` branch (N-6, which matches `root-run-package-readiness-index.ts:85`).
- **Standalone.** Discovery now uses `readMetadataState`: present, missing or unreadable (`agent-run-metadata-store.ts:105-132`). A history row naming the definition still attributes the run. Otherwise an unreadable state gives `unreadable`.
- **Logging.** One `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE { root, record, reason, runFolders }` per `(root, record, reason)` per discovery instance; a changed reason logs again (tested).
- **Catalog.** It switches exhaustively on `attribution.kind`, with no `=== null` test. After the switch TypeScript narrows to `attributed`, so `agentDefinitionId` needs no non-null assertion.
- **Memory search.** `MemoryRun` is unchanged: `subject.agentDefinitionId` comes from the same `definitionId` as before, and the field set is pinned by the new test.
- **EC-06 itself** is for API/E2E to rerun.

### API-15: resolved in behavior

- `WorkJournalStore.readManifestJournalFileNames` returns `none` only for `ENOENT`. Any other read error, non-JSON content or a missing `files` list is `unreadable`, with a reason.
- `readJournalSpans` passes that result through. The catalog leaves the run out and logs `EPISODIC_CATALOG_RUN_LEFT_OUT { root, run, reason }`, once per run and reason.
- A live refresh cannot read a half-written manifest, because `writeManifest` writes atomically (`work-journal-store.ts:126`, `writeAtomically`). An "unreadable" result is therefore a real defect, not a race.
- The rendering projection `readManifest` is untouched.
- `agent_episodic_catalog.md` and `agent_work_journal.md` now describe both codes and the three outcomes.

### CF-11: resolved

`noWorkGuard`'s doc comment sits above `noWorkGuard` again (`tests/helpers/no-delegations.ts`).

### Re-audit observations (CRR-003 candidates)

| Candidate ID | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| CF-13 | Discovery now depends on two run-history package catalogs | Principle 9 / 16 | Reject | It already depended on run-history (location services, history catalog service, metadata store). The new collaborators are passed in as narrowed `Pick`s, with defaults that construct the real owners, the same as the existing collaborators. No process lookup and no cycle. They read the existing per-memory-folder readiness state. |
| CF-14 | The `record` label is fixed per family (`team_run_execution_tree.json` / `agent_org_run_execution_tree.json`). For a diagnostic about the package itself (`ROOT_RUN_PACKAGE_MANIFEST_INVALID`, `…_NOT_DIRECTORY`, `ROOT_RUN_FAMILY_CONFLICT`, `FAILED_ATTEMPT`), the label names the tree although the tree is not the broken record | DESIGN.md rule 7 ("names the run and the reason") | Non-blocking note | Rule 7 is still met: the warning names the root and carries the diagnostic's code and reason, `${code}: ${reason}`, which identifies the real cause. The label follows the design's decision. It could read "run package" at a later touch; that would be a wording change in the design. |
| CF-15 | IMP-14's second start (12.1 s) is no faster than the first (12.5 s), while IR-001's second start was 3.4 s | QR-002 / AC-010 (well under the 2-minute escalation) | Reject (no correctness consequence) | Measured at a load average of about 119 versus 88–115, on a fresh clone. The second start still writes nothing. The delta adds no per-run I/O beyond `readMetadataState`, which replaces `readMetadata`'s same read. If API/E2E measures it, a quieter-host figure would be useful. |
| CF-16 | The team `*` diagnostic marks every *unlocated* team member folder unreadable, including old-format folders that were `unattributed` before | SR-003 decision 4; DESIGN.md rule 7 | Reject | This is designed and tested. It applies only when the whole scan failed, and then nothing was located. |

## Prior Round: API/E2E Failure-Origin Review (CRR-002), resolved by IR-002 (see CRR-003)

- Review Entry Point: `API/E2E Failure-Origin Review`
- Current Code Review Revision ID: `CRR-002` (prior: CRR-001 `Pass`)
- Review Scope: `N/A` (failure-origin round). The rest of this report is the CRR-001 implementation review. It still stands except where this section updates it: finding CR-001, CF-12, the Runtime Correctness score and the Latest Authoritative Result.
- Trigger: API-REV-001 `Fail`
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md` (§ Preliminary Classification, the API-09 and API-15 rows, Acceptance-Criteria Proof)
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001
- Failing Scenario IDs: API-09 = EC-06 (AC-009 / REQ-012, "a run's records are damaged")
- Exact Failing Command / Execution Mode: `env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<worktree>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory/episodic-catalog.e2e.test.ts --no-watch` after `pnpm -C autobyteus-server-ts build`. It starts the built `dist/app.js` on a test-owned data folder.
- Failure Evidence Paths: `evidence/API-04-10-episodic-catalog-e2e.log` (run 9, authoritative), `evidence/API-04-10-run9-excerpt.md` (`"t3Lines": []`), `evidence/API-09-EC06-rebuilt-catalogs.md`
- Code under test: `0be36462ef`, unchanged. `ba427ab13d` and `4e8a8b3263` add only the test, reports and evidence.
- Testing guideline read: `TESTING.md` (§ Rules, § Environments, credentials and data)

### Failing scenario still represents approved behavior

- Yes. REQ-012 says "a run whose records cannot be read is left out with a logged warning naming it (DESIGN.md rule 7)". AC-009 says "a run's records are damaged → left out with a warning naming it, others catalogued". DESIGN.md rule 7 adds: "Record it with a logged warning that names the run and the reason … at the boundary of one run: a startup admission check, or a lookup or scan across many runs that skips the unreadable run."
- Scenario validity: `Supported Explicit Edge Scenario`. The governing contract is REQ-012/AC-009 and DESIGN.md rule 7. Corruption is normally out of scope (Principle 6), but here the approved requirement names it explicitly.
- The test is valid. Truncating `agent_teams/<T3>/team_run_execution_tree.json` while the server is stopped damages the run's record, and that is exactly AC-009's precondition. The server starts through its real entry (`dist/app.js`). The assertion looks for a line that names the run anywhere in stdout and stderr, which is the weakest form rule 7 allows. The rest of EC-06 passes: T3's member is left out, everything else is rebuilt byte for byte, and nothing outside `episodic/` changes.

### Production path of the failure (confirmed in code)

1. The start pass calls `RunFolderDiscovery.findRuns()`, which gets team members from `TeamRunExecutionTreeLocationService.listAgents()` (`run-folder-discovery.ts` `teamMembers`). That method waits for the shared `RootRunPackageReadinessIndex` and skips every root that is not admitted (`team-run-execution-tree-location-service.ts:86`). The org service does the same (`agent-org-execution-tree-location-service.ts:80`).
2. When the readiness index scans the packages, a root it cannot read only becomes an in-memory diagnostic (`root-run-package-readiness-index.ts:93-94`). It logs only when the whole scan fails (`:83-89`). In `src`, nothing outside run-history reads those diagnostics. `TeamRunPackageCatalog.getDiagnostics()` and `AgentOrgRunPackageCatalog.listDiagnostics()` have no reader on this path; the only other reader is one app-data migration.
3. T3's member folder still has raw traces, so discovery's folder rule adds it as `folderRun` with `agentDefinitionId: null`. The catalog skips such folders without a word: "uncatalogued = `agentDefinitionId` null (one rule)", which is DEC-007 for folders no record attributes.
4. So the damaged record never reaches `RUN_FOLDER_DISCOVERY_SOURCE_FAILED` (the source call succeeds) or `EPISODIC_CATALOG_REFRESH_FAILED` (no run fails). The member is left out silently. That is Principle 13's "behavior by absence": an outcome the requirement names happens only because a lookup finds nothing, and "unreadable" cannot be told apart from "never attributed".
- The same holds for an org run's damaged tree (same filter), as API/E2E traced by reading. A standalone run whose `run_metadata.json` is damaged is caught by `readMetadata(entry).catch(() => null)` in `agentRuns`. It is attributed by its history row when there is one, and otherwise it is also left out silently.

### Origin classification

- Origin: **design gap, carried into the implementation.** It is not a bad test, a fixture problem or the environment.
  - The design put rule-7 containment in two places: the catalog refresh (`EPISODIC_CATALOG_REFRESH_FAILED`) and discovery's guarded sources. It defined "uncatalogued" by one rule (definition id null).
  - It never traced the damaged-record path for team and org roots, which the shared admission index filters out first, without a log. Design-spec § Guidance For Implementation and the Hidden-dependency / Several-kinds triggers cover a journal or Task that cannot be read, but not a run record that cannot be read.
  - The implementation follows the design faithfully.
- Earlier review gap: **yes, this was reasonably detectable in source review.** In CRR-001 I read the `isAdmitted` filter in `listAgents` and the shared readiness index (CF-06). But I judged the admission index only for *new* runs and traced REQ-012 only through the journal-read failure path. I should have traced AC-009's damaged-record path through the same filter: `isAdmitted` → diagnostic only → `folderRun` with a null definition id → silent skip. I have corrected the BEH-002/REQ-012 confirmation and the Runtime Correctness score.
- Kind (ticket-scope): **this ticket.** Applying the two questions:
  - Can the ticket reach its goal safely as is? No: AC-009 fails.
  - Whose functionality is it? This ticket's. Run attribution for the catalog is the discovery this ticket moved and extended. The fix can stay inside the Change Scope: discovery (or the catalog) can tell an unreadable root apart from an unattributed one and warn once, naming the run, using the location services' existing package-catalog diagnostics. It does not have to change the run-history admission index.
  - The admission index's own silence is a separate, older rule-7 gap. The run-history lists also hide such a root without a log. The ticket works without fixing it, so it is recorded as follow-up FU-004.
- Classification: **`Design Impact`**, owned by the Solution Designer. It is not a bounded `Local Fix`, because the correction needs design decisions:
  1. **Discovery's contract.** "Unattributed" (DEC-007, silent) and "records unreadable" (REQ-012, warned) need separate explicit outcomes. That changes `DiscoveredRun` or adds a discovery query, and discovery is shared with memory search, whose behavior is preserved.
  2. **Who logs.** Discovery, the catalog, or the admission index. The admission index is run-history, outside the Change Scope; choosing it would make that change a prerequisite.
  3. **Repeats.** Whether the warning repeats on every start and refresh, and the warning's code.
  4. **All three families.** The same rule must apply to team trees, org trees and standalone metadata.
- Requirement Gap? No. REQ-012 and AC-009 already state the outcome.
- Task size / risk: unchanged (`Large` / `High`).

### Secondary note (docs, for the same revision)

- API-15 reports that `agent_episodic_catalog.md:104` says a run "whose journal cannot be read … is left out". But an unreadable journal manifest gives "no journal yet": `readManifestJournalFileNames` returns null, and `buildCatalogEntry` renders no journal.
- The contract (§2.2) and the implementation's stated assumption treat "no manifest" and "manifest lists no file" as "no journal yet". The contract does not cover an *unreadable* manifest, so the doc sentence and the behavior disagree.
- The Solution Designer should settle this in the same revision: either the behavior (left out with a warning, as REQ-012 for a damaged record) or the doc wording. It is not a separate finding.

### CR-001 (new, CRR-002): a damaged team or org run record is left out without the warning REQ-012 requires

- Basis: REQ-012, AC-009, DESIGN.md rule 7. Scenario: Supported Explicit Edge (governing contract). Candidate: CF-12 below, `Promote`.
- Evidence: the production path above, and EC-06 run 9 (`"t3Lines": []`).
- Required response: the Solution Designer revises the design (decisions 1–4 above), then implementation, source review and API/E2E follow again.

## Review Round Meta (CRR-001, implementation review)

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (through the design spec's citations)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed As Context: `episodic-catalog-contract.md` (SR-002, behavior-defining), `follow-ups.md` (FU-001, FU-002)
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004, `Pass`; notes N-1…N-5)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation ready for source review (Large / High route)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Code reviewed: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/per-agent-episodic-catalog`, branch `codex/per-agent-episodic-catalog`, base `origin/personal` `2b73308ce5`, code at `0be36462ef` (`df6a5137f8` adds only the ticket folder and a docs note)
- Failure-origin fields: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none. The implementation matches the design's classification: a new subsystem with a background lifecycle, derived files written beside user data, a privacy boundary, the discovery moving to another subsystem, and wiring in two composition roots. It touches 27 source files across seven subsystems.

## Review Scope

- Changed implementation and behavior reviewed: the whole source diff `origin/personal...HEAD` under `autobyteus-server-ts/src` (33 files), the changed and new tests, the docs and `GLOSSARY.md` diff, and the AC-010 probe and evidence.
- Files / areas reviewed: `src/agent-episodic-catalog/**` (all five files, line by line); `agent-memory/services/run-folder-discovery.ts`, `agent-memory/domain/discovered-run.ts`, `agent-memory/store/agent-memory-layout.ts`; `agent-work-journal` (`work-journal-service.ts` `readJournalSpans`, `work-journal-store.ts` `readManifestJournalFileNames`/`readJournalFileHead`, `journal-entry-reader.ts` `readJournalHeaderTimeRange`); memory search (`memory-run-mapping.ts`, pipeline, boundary, models, GraphQL import); the three run services' deletes; `ProjectTaskService.taskTitleOf`; the supervisor input, the supervisor and `composeCollaboration`; `build-studio-server.ts`; `start-standalone-application-host.ts`. Existing code read to judge the change: the team and org location services' `listAgents` filters and the shared readiness index (`root-run-package-readiness-index.ts`), the run-history catalog services' delete and cancel paths, the journal store's manifest projection, and the journal renderer's header line.
- Explicit exclusions: the API/E2E suites and the real-app journey (owned by API/E2E). Recorded checks were not rerun: no source changed after `0be36462ef`, the commit on which IMP-01…IMP-09 ran.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: an episodic folder per agent definition. Its `catalog.md` follows the contract exactly: run entries, privacy (Task title only), live upkeep within 60 s, delete removes entries and archive changes nothing, a background rebuild at every start, writes only under `<memory>/episodic/`, and a node `index.md`.
- Design-spec behavior map verified against the implementation: yes. DS-001…DS-004 match the code (below).
- Design review report and round confirmed: ARCH-REV-004 `Pass`. N-1 is applied: `MemoryRunSubject` lives in `agent-memory/domain/discovered-run.ts`, memory search imports it from there, there is no re-export, and the `AGENT` subject and the top-level id come from one `definitionId`. N-2 and N-5 are applied (decoded id for a catalog with no runs, nullable `startedAt`, full date on both sides, no trailing separator, the contract's index order).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none. The span-read fix (`0be36462ef`) is judged under CF-01 below: it is the design's own `readJournalSpans` contract, not new behavior.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `AgentMemoryLayout.getAgentEpisodicDirPath` shares `definitionFolderName` with the semantic path (`agent-memory-layout.ts:35-36, 78-90`). `EpisodicCatalogStore.writeCatalog` and `renderCatalog` render contract §2 (renderer test compares §2.5 byte for byte). Attribution comes only from `DiscoveredRun.agentDefinitionId` (`episodic-catalog.ts` `buildEntries` skips `null`). | — |
| BEH-002 | Confirmed | `start` subscribes through `journals.onJournalChanged`, then `journalChanged` → `discovery.rootOf(change.memoryDir)` → `request` → `schedule` (5 s quiet, 30 s max) → `refreshPass` → `findRunsOfRoot` → `readJournalSpans` → `buildCatalogEntry` → `write` (write-if-changed). Runs created after start are seen: the location services' admission is the process-wide readiness state per memory folder (`root-run-package-readiness-index.ts:10-19`), which the run services admit into. | — |
| BEH-003 | Confirmed | `AgentRunHistoryService.deleteStoredRun:250-255`, `TeamRunHistoryService.deleteStoredTeamRun:122-130` and `AgentOrgRunService.deleteStoredRun:238-247` call `runDeleted(root)` only after `result.success`. Guards, results and messages are unchanged. These are the only callers of the three catalog deletes (`api/graphql/types/run-history.ts:334`, `team-run-history.ts:170`, `agent-org-run.ts:241`). Archive has no call. | — |
| BEH-004 | Confirmed | Both roots call `createEpisodicCatalog` after `composeTaskSide` and `start({ taskTitles: collaboration.tasks })` after `composeCollaboration`. `start` returns at once. `startPass` makes one `findRuns()`, then `listCatalogDefinitionIds()`, then spans per attributed run, then `write(all)`. IMP-07: 9.9 s first, 3.4 s second, nothing rewritten at the second start, 0 of 36,990 files outside `episodic/` changed. | — |
| BEH-005 | Confirmed | `buildCatalogEntry` takes only `DiscoveredRun`, the spans and a title. The title comes from `currentTaskOf(root)` → `taskTitleOf` (title only, `project-task-service.ts:115-128`). The run-history summary is not an input. IMP-08: 0 of 638 summaries found. | — |
| BEH-006 | Confirmed | `renderIndex` orders by code-point agent name, then folder name. `writeIndex` runs at the end of every pass. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-005, BEH-006 | User | Memory-analysis agent | Read one agent's history in order | File tool on `<memory>/episodic/…` | Normal | Files written by DS-004 | Contract-exact files | requirements SCN-001; contract | Supported Normal Scenario | Use |
| SCN-002 | BEH-002 | System | Journal service | A journal is written | Turn end / compaction; memory search Journals step | Normal | DS-001 → DS-004 | Entry current within 60 s | requirements SCN-002; INV-C3 | Supported Normal Scenario | Use |
| SCN-003 | BEH-003 | Operational | User / history tools | Delete a run | GraphQL delete of agent, team and org runs | Normal | DS-002 | Entries removed within 60 s | requirements SCN-003 | Supported Normal Scenario | Use |
| SCN-004 | BEH-004 | System | Server start | Catalogs rebuilt | Composition root | Normal | DS-003 | Background, read-only, write-if-changed | requirements SCN-004; IMP-07 | Supported Normal Scenario | Use |
| SCN-005 | BEH-002, BEH-004 | System | Server start / journal change on a node with older journal manifests | List the journal files of runs whose manifest entries carry no per-entry runtime | DS-003 / DS-004 over the founder's real data shape | Normal | `readJournalSpans` → `readManifestJournalFileNames` | Those runs list their files instead of "no journal yet" | IMP-07 before/after the fix: 3,490 of 3,788 runs said "no journal yet" before it | Supported Normal Scenario (the founder's existing data) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CF-01 | Span-read fix: `readJournalSpans` reads the file names the raw manifest lists (`readManifestJournalFileNames`), not the full projection, which drops entries without a per-entry `runtime_kind` | SCN-005; design `readJournalSpans` "per manifest file" (design-spec Interface table) | Server start / journal change on existing data | Without the fix, most of the founder's runs render "no journal yet" although their files exist, so REQ-002 fails on real data | `work-journal-store.ts:24-38, 78-96`; IMP-07 before/after; new test `work-journal-reading.test.ts:148` | Reject (as a defect or Design Impact) | — | Within the contract. The reader projects one recognized field (`journal_file`), validated by the same `JOURNAL_FILE_NAME` pattern, so no path escapes `work_journal/`. It has no version branch, writes nothing and leaves rendering decisions unchanged (Principle 5's version-agnostic reader, not compatibility code). Files listed but missing are skipped (`readJournalFileHead` → null). It stays inside the journal owner. A later `ensureCurrent` re-renders the file and emits a change, which refreshes the entry. |
| CF-02 | `createEpisodicCatalog({ memoryDir, journals, tasks })` instead of an inline `new EpisodicCatalog({ layout, discovery, … })` in each root | Principle 13 empty indirection / Principle 16; handoff deviation | — | — | `episodic-catalog.ts:241-246`; `build-studio-server.ts` 499 effective lines (inline: 506) | Reject | — | A construction function, not an interface or wrapper. It builds the two memory-folder owners once for both roots, removing a repeated construction. The roots still pass in the collaborators that hold state (journal service, Task tree). The deviation is recorded and its reason holds. |
| CF-03 | Studio stops the catalog first in `closeProcessResources`, not inside `closeStudioProcessResources` | Design Dependency Rules step 6; handoff deviation | Server close | It still stops before the Task service and run services are released | `build-studio-server.ts:353` | Reject | — | Same order guarantee. The deviation is recorded and its reason holds. |
| CF-04 | `CatalogEntry` carries `agentName` and `memoryDir` | Contract §2.3 (header name), §2.2 ("no journal yet" names the run folder) | — | Neither is rendered beyond the contract | `episodic-catalog-models.ts:21-26`; renderer | Reject | — | Both are needed by the contract. One meaning each, no overlap with `journal.folder` (null in the no-journal case). |
| CF-05 | Warning code renamed to `RUN_FOLDER_DISCOVERY_SOURCE_FAILED` | Principle 15 | — | No other code or doc names the old code (grep) | `run-folder-discovery.ts:232` | Reject | — | The code now names its real owner. |
| CF-06 | A team or org run created after start might not be "admitted" for the discovery's own stored location service, so new members would appear unattributed | SCN-002 (AC-004 new run) | A new team run's first turn | — | `root-run-package-readiness-index.ts:10-19`: admission state is shared per memory folder; `TeamRunPackageCatalog.admit` → `admitCurrent` | Reject (not reachable) | — | The discovery's location services read the same process-wide admission set the run services admit into. |
| CF-07 | A team or org delete could cascade to delegated `agents/<child>` folders, leaving their entries | SCN-003 | Delete of a team or org run | — | `team-run-history-catalog-service.ts:133-163` removes only the team package. The delegated work guard waits for children; it does not delete them. | Reject (not reachable) | — | A delegated child keeps its own agent root, and its own delete notifies the catalog. |
| CF-08 | Other paths that remove run folders bypass `runDeleted` | SCN-003 | — | — | Only other remover: `cancelPreparedRun` (`agent-run-history-catalog-service.ts:310-360`), for unactivated prepared runs, which have no raw traces and so are never run folders | Reject (not reachable) | — | — |
| CF-09 | `write()` builds `all` (for `index.md`) outside `guardedWrite`; a definition id whose encoded folder name the layout rejects (`".."`) would throw and skip `index.md` | — | Requires an agent definition id such as `".."` | — | — | Reject (Technically Possible but Unsupported/Contrived) | — | Definition ids are product-made slugs. The pass's own catch logs it anyway. |
| CF-10 | `stop()` during the start pass waits for an uninterruptible `findRuns()` (about 3 s on the founder's data) | SCN-004 + shutdown | Shutdown within seconds of start | Shutdown waits a few seconds once | IMP-07 second-start pass 3.4 s; handoff Known Risks | Reject | — | Bounded and rare. No correctness consequence (the next start rebuilds). |
| CF-12 (CRR-002) | A damaged team or org tree is filtered out by the shared admission index (`isAdmitted` skip, diagnostic kept in memory only). The member folder then becomes an unattributed `folderRun` and is skipped with no warning | REQ-012 / AC-009 / DESIGN.md rule 7 (governing contract; Supported Explicit Edge) | Server start (or a refresh of that root) on a node where one run's stored tree is unreadable | start pass → `findRuns` → `listAgents` skips root → `folderRun` (definition id null) → `buildEntries` skips silently. The run is left out, but no log names it, so AC-009 fails | Code path in § Production path of the failure; EC-06 run 9 `"t3Lines": []` | Promote | This ticket (`Design Impact`) | Separate "unreadable" from "unattributed" in discovery's contract and warn once, naming the run, for all three families (see CR-001) |
| CF-11 | The orphaned doc comment in `tests/helpers/no-delegations.ts`: the new `noEpisodicCatalog` sits between `noWorkGuard`'s comment ("An archive and delete guard…") and `noWorkGuard` | Readability of a touched test helper | — | A reader sees two stacked comments, the first describing the next-but-one export | `git diff … tests/helpers/no-delegations.ts` | Promote as a non-blocking note (test code, no behavior) | This ticket (cosmetic) | Move the new helper (with its comment) below `noWorkGuard`, or above the guard's comment, at the next touch. It does not fail the review. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Discovery moved to `agent-memory/services/run-folder-discovery.ts`; old file deleted, no re-export; the catalog imports nothing from `memory-search` | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Renderer tests compare §2.5 and §3 exactly; absent forms, ordering and sizes are tested; store writes temp + rename only on change | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001…DS-004 map 1:1 to `journalChanged`/`runDeleted`/`startPass`/`refreshPass` + `write` | — |
| Ownership boundary preservation and clarity | Pass | `EpisodicCatalog` is the only writer under `episodic/` (through its store); discovery is the only attribution owner; spans come from `WorkJournalService`; the catalog never calls `ensureCurrent` | — |
| Off-spine concern clarity | Pass | Builder (privacy), store (files), renderer (format), spans (journal owner) each serve the catalog | — |
| Existing capability/subsystem reuse check | Pass | Reuses discovery, `onJournalChanged`, the layout's encoding helper, `currentTaskOf`, `references.byId` | — |
| Reusable owned structures check | Pass | `DiscoveredRun` is shared by memory search (`toMemoryRun`) and the catalog; `definitionFolderName` is shared by the semantic and episodic paths | — |
| Shared-structure/data-model tightness check | Pass | `DiscoveredRun` adds three fields with single meanings; `MemoryRun` unchanged by mapping; `CatalogEntry` additions justified (CF-04) | — |
| Repeated coordination ownership check | Pass | The debounce/queue policy has one owner; delete notification is one line per service | — |
| Empty indirection check (Core Principle 13) | Pass | No port, adapter or wrapper; consumers take `Pick<…>` of real owners; `createEpisodicCatalog` judged in CF-02 | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Five catalog files, one concern each | — |
| Ownership-driven dependency check | Pass | catalog → agent-memory, agent-work-journal, agent-collaboration (type), projects (type); run services → catalog only via `Pick<EpisodicCatalog,"runDeleted">`; memory search → agent-memory | — |
| Visible dependencies check (Core Principle 16) | Pass — deviation recorded, reason holds | `taskTitles` connected at `start` (design-recorded; nothing refreshes before it, `schedule` returns while `taskTitles` is null; second `start` throws). `episodicCatalog` is a required parameter in the three services, the supervisor input (validated in `requireGeneralProcessRunSupervisorInput`) and `composeCollaboration`. No `?.`/fallback on a required collaborator. `episodicCatalog?.stop()` in the roots is the established nullable-lifecycle pattern for a partial startup | — |
| Authoritative Boundary Rule check | Pass | No caller uses both `EpisodicCatalog` and its store/renderer; the catalog uses `RunFolderDiscovery`, not its location services | — |
| File placement check | Pass | `src/agent-episodic-catalog/{services,store,rendering,domain}` mirrors `agent-work-journal/` | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `runDeleted(root)`, `findRunsOfRoot(root)`, `rootOf(path)`, `readJournalSpans(dir)`, `taskTitleOf(taskId)`: one subject, explicit identity | — |
| Naming quality and naming-to-responsibility alignment (Core Principle 15) | Pass | "Episodic catalog", "catalog entry", "discovered run" added to `GLOSSARY.md`; `runDeleted` keeps `DelegationIndex.runDeleted`'s meaning; warning code renamed to its owner | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Two manifest reads in the store serve different queries (full projection for rendering; names-only for spans), CF-01 | — |
| Patch-on-patch complexity control | Pass | The span fix replaces one call (`readManifest` → `readManifestJournalFileNames`) in `readJournalSpans`; no layering | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Pass | `folderRun`/`runKeyOf`/`nameFromFolder` private; `folderRun` left the pipeline's `Pick`; `HEADER_FIRST_DAY` replaced; unused `createRootExecutionIdentity` import removed from `team-run-history-service.ts` | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Catalog tests name ACs; delete tests cover committed, refused and archive for all three kinds; discovery test pins `MemoryRun` unchanged; older-manifest span case synthesized | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `noEpisodicCatalog` helper; `FakeNode` in the catalog test. One misplaced comment (CF-11, non-blocking) | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Old discovery test moved (`git mv` rename), not duplicated | — |
| API/E2E readiness for the next workflow stage | Pass | Debounce values are constructor options; the handoff lists AC-003…AC-009 scenarios and the older-manifest case; both roots wired | — |

## Source File Size And Structure Audit

| Source File | Before (base) | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-episodic-catalog/services/episodic-catalog.ts` | 0 | 247 (CRR-003; 223 at CRR-001) | Pass | New file: one owner (lifecycle, queue, passes, writes, left-out logging); cohesive | Pass | Pass | — | — |
| `agent-memory/services/run-folder-discovery.ts` | 0 (moved from 161) | 294 (CRR-003; 216 at CRR-001) | Pass | Pass | Pass | Pass | — | — |
| `compositions/build-studio-server.ts` | 492 | 499 | Pass (under 500) | Pass | Pass | Pass | — | — |
| `projects/services/project-task-service.ts` | 453 | 467 | Pass | Pass | Pass | Pass | — | — |
| `agent-execution/runtime/general-process-run-supervisor.ts` | 439 | 441 | Pass | Pass | Pass | Pass | — | — |
| `standalone-application-host/start-standalone-application-host.ts` | 380 | 391 | Pass | Pass | Pass | Pass | — | — |
| `memory-search/pipeline/memory-index-pipeline.ts` | 327 | 328 | Pass | Pass | Pass | Pass | — | — |
| `agent-org-execution/services/agent-org-run-service.ts` | 303 | 308 | Pass | Pass | Pass | Pass | — | — |
| `agent-work-journal/services/work-journal-service.ts` | 267 | 296 (CRR-003) | Pass | Pass | Pass | Pass | — | — |
| Remaining 18 changed source files | ≤ 275 | ≤ 275 | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No re-export of the old discovery or of `MemoryRunSubject` |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | See structural row |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Discard or Rebuild` for `episodic/**`; the catalog never reads its own files back; nothing outside `episodic/` written (IMP-07) |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | `readManifestJournalFileNames` is a generic names-only projection with no version branch (CF-01) |
| Approved transition mechanics match the reviewed design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: a new subsystem, a new folder in the memory layout, a new journal read, discovery moved.
- Files or areas likely affected: already updated in this change: `docs/modules/agent_episodic_catalog.md` (new), `agent_memory.md`, `agent_work_journal.md`, `memory_search.md`, `docs/modules/README.md`, `GLOSSARY.md` § Memory. For delivery's docs sync: `agent_episodic_catalog.md` cites the contract by its ticket path (`episodic-catalog-contract.md of autobyteus-493`). Check that the reference still resolves once the ticket folder moves to `done/`.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | `taskTitleOf` is reached through `DelegationIndex.currentTaskOf` (any role), `episodic-catalog.ts` `taskTitleOf` |

No new or reclassified premises beyond the candidate gate above.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10` (simple average for trend only)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.6 | The four spines are visible in the code; one pass at a time with ordered requests | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.6 | One writer under `episodic/`; discovery has one owner; journal format stays with its owner (the span fix too) | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Small, subject-explicit methods; narrowed `Pick` types | `start({ taskTitles })` connects one collaborator after construction (design-recorded) | — |
| `4` | `Separation of Concerns and File Placement` | 9.5 | Five single-concern files mirroring `agent-work-journal/` | `episodic-catalog.ts` at 223 lines holds queue and passes together, still cohesive | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | `DiscoveredRun` shared, `MemoryRun` unchanged | `subject.agentDefinitionId` repeats the top-level id for `AGENT` runs (accepted N-1; set from one value) | — |
| `6` | `Naming Quality and Local Readability` | 9.4 | Domain names match the glossary | CF-11 orphaned comment in a test helper | Move it at next touch |
| `7` | `API/E2E Readiness` | 9.4 | Tunable timings, clear AC hints, both roots wired | The real-app proof on a clone needs the owner's call against TESTING.md's real-data rule (handoff notes it) | — |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.4 (CRR-003; CRR-002 8.6) | Lifecycle unchanged and rechecked. REQ-012 is now met for all three families, and for unreadable manifests, through explicit outcomes logged once each. The manifest write is atomic, so there is no false "unreadable" | `stop()` may wait one `findRuns()` (CF-10, bounded). Record label (CF-14, cosmetic) | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.6 | No re-exports or version branches | — | — |
| `10` | `Cleanup Completeness` | 9.5 | The dead public surface of the moved file is removed; old file deleted | — | — |

## Findings

- **CR-001**: resolved in CRR-003 (IR-002 / SR-003). It was opened in CRR-002 as `Design Impact`: a damaged team or org run record was left out without the warning REQ-012/AC-009 requires.
- No open findings. CF-14 (the record label) is a non-blocking note.

CRR-001 had no blocking findings. CF-11 (resolved in CRR-003) (orphaned doc comment in `tests/helpers/no-delegations.ts`) is a non-blocking readability note.

## Follow-ups

- Follow-ups this review added: FU-004 (CRR-002: the run-history admission index keeps an unreadable root as an in-memory diagnostic with no log)

## Classification

- CRR-005: N/A (Pass). CRR-004 (test review) TR-001 is resolved. CRR-002 was a `Design Impact` (CR-001, resolved in CRR-003).

## Recommended Recipient

- CRR-005: API/E2E (primary pass rule), with an informational notice to implementation.

## Residual Risks

- **Real-data rule for the real-app proof:** AC-010 calls for a copy-on-write clone of the founder's memory on an isolated instance. TESTING.md says never to run a startup on real user data or a copy of it. The handoff flags this conflict, and API/E2E or the Solution Designer must settle it before any server start on a clone. IMP-07 ran only the catalog build, which writes under `episodic/` alone.
- **Task-title lookups were not measured on real data** (the clone had no Task records): one `findTask` per distinct Task id per pass.
- **Older journal files:** a header line that does not match `HEADER_TIME_RANGE` gives a file line with no range, and the entry falls back to the recorded start. IMP-07 shows every run catalogued, but it does not count how many file lines have no range. Worth a glance in API/E2E's real-app check.
- **Folder-watcher unit failures under load** (IMP-04/05): their imports include no changed file. A rerun on a quiet host belongs to API/E2E.

## Latest Authoritative Result

- Review Decision: `Pass` (CRR-005, implementation review round 3, Targeted Delta Review: TR-001 resolved). Round 2 (CRR-003, Full Re-Audit) also passed.
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: every category ≥ 9.4 (Runtime Correctness back to 9.4); average 9.5
- Failure Origin: N/A. CRR-002's origin (a design gap) is resolved by SR-003 / IR-002.
- Recommended Recipient: API/E2E (rerun the discovery unit tests and EC-06; then the proportional test review again)
- Notes: CF-14 (record label) is non-blocking. CF-15: rerun the AC-010 timing on a quieter host if it is measured again.
- CRR-001 notes (still valid):
- Notes: the span-read fix (`0be36462ef`) is within the journal owner's `readJournalSpans` contract and is not a Design Impact (CF-01). The four recorded deviations hold (CF-02…CF-05).

# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md`, ARCH-REV-002 pass and ARCH-REV-004 (contract addendum) | N/A | `Initial Baseline` | SR-002, ARCH-REV-002, ARCH-REV-004 | Implemented design steps 1–6 and the AC-010 measurement of step 7; ready for code review |
| IR-002 | Architecture reviewer, `design-review-report.md` ARCH-REV-005 (SR-003, after CRR-002) | CRR-002 CR-001 (CF-12); API-REV-001 API-09/EC-06, API-15; CF-11 | `Design Impact` (resolved by SR-003) | SR-003, ARCH-REV-005, CRR-002, API-REV-001 | Unreadable records and manifests are explicit outcomes with one warning each; ready for code review |
| IR-003 | Code reviewer, `api-e2e-test-review-report.md` / `code-review-report.md` CRR-004 (post-API/E2E test review) | TR-001 | `Local Fix` | SR-003, CRR-004, API-REV-002 | The unreachable history-row fallback for an agent run's definition is removed; ready for code review |

## Revision Entries

### IR-001 — Episodic catalog per agent definition (initial implementation)

- Triggering role, report path, and round: architecture reviewer (`/architecture_reviewer`), `design-review-report.md`, ARCH-REV-002 (`Pass`) and ARCH-REV-004 (`Pass`, contract addendum)
- Triggering finding IDs: N/A (review notes N-1, N-2 applied)
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented; implementation-scoped checks recorded in `implementation-handoff.md` § Checks Run
- Related solution revision IDs: SR-002 (with the contract addendum)
- Related architecture-review revision IDs: ARCH-REV-002, ARCH-REV-004
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first implementation of the approved package
- Approved behavior or requirement IDs affected: BEH-001…BEH-006; REQ-001…REQ-013
- Implementation delta: see `implementation-handoff.md` § Reviewed Behavior Implementation Trace and § Key Files Or Areas
- Commits: `1bb4a44e83`, `00bb99fe77`, `0be36462ef`
- Changed files or areas: `src/agent-episodic-catalog/` (new); `src/agent-memory/` (layout, moved run-folder discovery, `DiscoveredRun`); `src/agent-work-journal/` (spans); `src/memory-search/` (mapping, imports); `src/api/graphql/types/memory-search.ts` (import); run services' delete (three files); `ProjectTaskService.taskTitleOf`; supervisor input and `composeCollaboration`; both composition roots; docs and `GLOSSARY.md`; tests
- Local validation and result: `implementation-handoff.md` § Checks Run. The AC-010 probe on the founder's memory clone (IMP-07) found that older journal manifests left most runs "no journal yet"; fixed in the same round (`0be36462ef`, `readManifestJournalFileNames`), then measured again: first start 9.9 s, second 3.4 s, nothing rewritten, nothing changed outside `episodic/`
- Next recipient or routing: Code Reviewer (Large / High route), by `get_handoff_rules`
- Remaining limitations or risks: `implementation-handoff.md` § Known Risks

### IR-002 — Unreadable run records and journal manifests are explicit outcomes (SR-003)

- Triggering role, report path, and round: architecture reviewer (`/architecture_reviewer`), `design-review-report.md` ARCH-REV-005 (SR-003), after the code reviewer's failure-origin round CRR-002 (`code-review-report.md`) on API/E2E round API-REV-001 (`api-e2e-execution-coverage-report.md`)
- Triggering finding IDs: CRR-002 CR-001 (CF-12); API-09 / EC-06 (AC-009 not proven: a damaged team record left out with no warning); API-15 (an unreadable manifest gave "no journal yet"); CF-11 (non-blocking)
- Classification: `Design Impact` (resolved upstream by SR-003; implemented here)
- Prior authoritative result: IR-001 (CRR-001 Pass; API-REV-001 Fail on EC-06)
- Current authoritative result: implemented; checks IMP-10…IMP-15 pass
- Related solution revision IDs: SR-003
- Related architecture-review revision IDs: ARCH-REV-005 (notes N-6, N-7)
- Related code-review revision IDs: CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: a run whose records cannot be read must be left out with a warning naming it (REQ-012, AC-009, DESIGN.md rule 7). Before, "unreadable" and "no record names an agent" collapsed into one `null`.
- Approved behavior or requirement IDs affected: REQ-012, AC-009 (BEH-002, BEH-004); nothing else changes (the contract, the entry fields, memory search's runs)
- Implementation delta:
  - `DiscoveredRun.attribution` replaces `agentDefinitionId` (clean cut): `attributed` / `unattributed` / `unreadable(record, reason)`.
    - Team and org member folders no tree locates are `unreadable` when their root has a readiness diagnostic. The diagnostics are read after the sources (N-7). The team `*` diagnostic marks every such team folder; there is no org `*` branch (N-6).
    - A standalone run: `readMetadataState`. A history row naming the definition attributes the run; otherwise unreadable metadata makes it `unreadable`.
    - `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE { root, record, reason, runFolders }`, logged once per (root, record, reason) per discovery instance.
  - `readJournalSpans` returns `none` / `unreadable` / `spans`. The store's `readManifestJournalFileNames` returns `none` only for ENOENT.
  - The catalog `switch`es on `attribution.kind` (no null test). It leaves out an unreadable-manifest run and logs `EPISODIC_CATALOG_RUN_LEFT_OUT { root, run, reason }` once per run and reason.
  - Docs name both codes. CF-11: comment order in `tests/helpers/no-delegations.ts`.
- Commits: `159286c1c1`
- Changed files or areas: `agent-memory/domain/discovered-run.ts`, `agent-memory/services/run-folder-discovery.ts`, `agent-work-journal/{store/work-journal-store.ts, services/work-journal-service.ts, domain/work-journal-models.ts}`, `agent-episodic-catalog/services/episodic-catalog.ts`, `memory-search/runs/memory-run-mapping.ts` (comment only), `docs/modules/agent_episodic_catalog.md`, `agent_work_journal.md`, `GLOSSARY.md`; tests: discovery, journal reading, catalog, builder, memory search, two memory e2e fakes, `tests/helpers/memory-search-fixtures.ts` (`metadataStateOf`), `tests/helpers/no-delegations.ts`
- Local validation and result: `implementation-handoff.md` § Checks Run IMP-10…IMP-15. On the founder's data (clone): 3 team roots with a missing tree (9 member folders) are now named once per discovery instance; start 12.5 s; nothing outside `episodic/` changed
- Next recipient or routing: Code Reviewer (Large / High), by `get_handoff_rules`
- Remaining limitations or risks: the run-package readiness index's own silence toward the history lists stays FU-004. A start logs a damaged root once per discovery instance: the catalog's and memory search's, so up to two lines per start (design decision 3)

### IR-003 — An agent run's definition comes from its metadata alone (CRR-004 TR-001)

- Triggering role, report path, and round: code reviewer (`/code_reviewer`), CRR-004 (post-API/E2E test-code review), `api-e2e-test-review-report.md`, `code-review-report.md`
- Triggering finding IDs: TR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-002 (CRR-003 Pass; API/E2E round 2 Pass; CRR-004 Fail on TR-001)
- Current authoritative result: fixed; checks IMP-16…IMP-18 pass
- Related solution revision IDs: SR-003 (this departs from decision 1's wording; see below)
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-004
- Related API/E2E revision IDs: API-REV-002
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: `agentRuns` attributed an agent run by its history row when its metadata was missing or unreadable. That branch can never decide anything:
  - `listCatalogRows` keeps admitted runs only (`agent-run-history-catalog-service.ts:141`);
  - an agent run is admitted only when `readMetadataState` is `present` (`root-run-package-current-validator.ts:146-154`);
  - present metadata always names `agentDefinitionId` (`agent-run-metadata-store.ts:118-127`).

  EC-06 shows the real outcome (a run with a row and damaged metadata is `unreadable` and warned). IR-002 had turned this dead fallback into stated behavior in a comment, the module doc and a unit case.
- Departure from SR-003 decision 1's wording ("a history row naming a definition → attributed"): the row never decides the definition. Reason: the case is unreachable (Core Principle 7, dead code in touched files). Observable behavior and memory search's `MemoryRun` are unchanged.
- Approved behavior or requirement IDs affected: none (no observable change); REQ-012 / AC-009 as proven by EC-06
- Implementation delta: the definition comes from the metadata alone. Present → `attributed`; unreadable → `unreadable` (`run_metadata.json`); missing → `unattributed`. The row still gives an admitted run's name, workspace and creation time. The `row_only` unit case is replaced by the real shape: a row offered only for the admitted run. `agent_episodic_catalog.md` § Which runs is corrected.
- Commits: `1324c3e8f4`
- Changed files or areas: `agent-memory/services/run-folder-discovery.ts`, `tests/unit/agent-memory/run-folder-discovery.test.ts`, `docs/modules/agent_episodic_catalog.md`
- Local validation and result: IMP-16 (407 passed), IMP-17 (memory e2e pass), IMP-18 (both typechecks at baseline)
- Next recipient or routing: Code Reviewer (Large / High), by `get_handoff_rules`; then API/E2E (discovery unit tests and EC-06; the E2E file needs no change)
- Remaining limitations or risks: none new

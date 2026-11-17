# Docs Sync Report: autobyteus-493 (per-agent episodic catalog)

## Scope

- Ticket: `per-agent-episodic-catalog` (Project Task `autobyteus-493`)
- Trigger: code review CRR-006 `Pass` (test-code review of the API/E2E round-3 test) after API/E2E `API-REV-003` `Pass` (final confidence 95%). `task_size` Large, `architectural_risk` High; route Reviewed (architecture review ARCH-REV-005 `Pass`, source review CRR-005 `Pass`, test-code review CRR-006 `Pass`).
- Bootstrap base reference: `origin/personal` @ `2b73308ce5`
- Integrated base reference used for docs sync: `origin/personal` @ `c0869d58e9` (53 new commits: native tool search, native command start limits, phone Settings for every run, Server Docker build speed, release v1.5.13-beta.9 records), merged as `90f1d79d12` with no conflict, before any delivery edit. `GLOSSARY.md` changed on both sides; git merged it cleanly and both sets of entries are present.
- Post-integration verification reference: both typechecks, the branch's unit files, the three memory E2E files and the gated episodic-catalog E2E on `90f1d79d12` (`evidence/DEL-01…DEL-06`, listed in `release-deployment-report.md`).

## Why Docs Were Updated

- Summary: the ticket added a new node-level artifact (`<memory>/episodic/<encoded agent definition id>/catalog.md` and `index.md`), a module that keeps it (`src/agent-episodic-catalog`), a shared owner of "which run folders exist and whose are they" (`RunFolderDiscovery`, moved from memory search to `agent-memory`), journal span reads, and a delete hook in the three run-delete owners. The implementation already wrote the module doc, the glossary entries and the memory docs. Delivery checked them against the final state (IR-003) and the final integrated state, and fixed what was left: the module doc cited its contract by a bare name that does not resolve once the ticket is archived, the doc did not say how the record label of a package-level diagnostic reads (the reviewer's CF-14), the formatting rules (title on one line, size units, a file with no time range, the `index.md` header) lived only in the contract, and `run_history.md` did not say that a committed delete now tells the catalog.
- Why this should live in long-lived project docs: agents and skills (the reflection skill, the observer team, a future dream pass) read the catalog's path rule and format from the docs (REQ-013); a maintainer of run delete or run-folder discovery has to know that the catalog follows them. The rules stay with the code and survive the archive of the ticket.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The change follows rules 3, 5, 7, 8 and 10 as the design spec records. It adds no new project rule: the contained unreadable-record handling is rule 7 applied; the "one owner for a fact" shape is Core Principle practice. Its "Project-specific design documents" list names areas with a canonical contract; the episodic catalog's contract is a module doc (`agent_episodic_catalog.md`), listed in the modules README, like the other memory modules. The reviewers recorded no design mistake of the kind `docs/design-cases.md` keeps (CR-001 was a design gap the Solution Designer fixed in SR-003, with its own record); adding a case is the Solution Designer's (`DESIGN.md` § Design cases) |
| `TESTING.md` | Project testing guideline | No change | The new durable E2E file uses the scripted AGY CLI and its gate, both already a rule ("Runtimes without a model"). The real-data rule it met (never a startup or conversion on real user data or a copy of it) held: AC-010's build ran as a read-only library probe on an APFS clone (`IMP-14`), no server started on it. No command in the ticket's reports stopped working; the failing suites on this host (FU-003, FU-005) fail without this change and are follow-ups |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed. The base's copy (with the v1.5.13-beta.9 and Server Docker changes) is what this delivery followed |
| `autobyteus-server-ts/docs/modules/agent_episodic_catalog.md` | The new module doc | Updated | See Docs Updated |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Describes the memory folder layout and run-folder discovery | No change | Already holds the episodic folder (not a run folder; unrelated to the retired `episodic.jsonl` rows), `run-folder-discovery.ts` and `discovered-run.ts`, and a link to the module doc |
| `autobyteus-server-ts/docs/modules/agent_work_journal.md` | Journal reader and listeners | No change | Already holds `readJournalSpans` (`spans` / `none` / `unreadable`), `readJournalHeaderTimeRange` and that the catalog follows `onJournalChanged` and never calls `ensureCurrent` |
| `autobyteus-server-ts/docs/modules/memory_search.md` | Memory search's run discovery | No change | Already says the runs come from `RunFolderDiscovery` and map to `MemoryRun`; `runs/memory-run-discovery.ts` is gone from its file list |
| `autobyteus-server-ts/docs/modules/README.md` | The module index | No change | Already lists the new module doc |
| `autobyteus-server-ts/docs/modules/run_history.md` | Delete semantics of run history | Updated | See Docs Updated |
| `GLOSSARY.md` | Domain words | No change | Already defines **Episodic catalog** (and **catalog entry**) and **Discovered run**, with the retired `episodic.jsonl` rows named as a different thing. Its link to the module doc resolves |
| `autobyteus-server-ts/docs/modules/agent_orgs.md`, `agent_team_execution.md` | The org and team delete owners | No change | They describe delete through the run-history services (`TeamRunHistoryService.deleteStoredTeamRun` delegates physical removal to the history catalog) and name no hook; the hook is a one-line dependency of three services, documented where delete is (`run_history.md`) and in the module doc |
| Source comments naming `episodic-catalog-contract.md` (`catalog-markdown-renderer.ts`, `episodic-catalog.e2e.test.ts`) | They point at the contract by name | No change | The name still finds the file in the archived ticket; the module doc now gives the path. Delivery does not edit validated source for a comment |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_episodic_catalog.md` | Reference | (1) The contract is cited as a link to its archived path (`tickets/done/per-agent-episodic-catalog/episodic-catalog-contract.md`), with the rule that a change to a line is a change of behavior (renderer, tests and section change together). (2) New "Lines" bullet: a Task title on one line (line breaks become one space, ends trimmed), a journal file line without a time range, the size units, a run without a workspace. (3) The `index.md` bullet now gives its title and fixed line. (4) The unreadable-record paragraph says what `record` names and that for a package-level diagnostic (`ROOT_RUN_PACKAGE_MANIFEST_INVALID`, `…_NOT_DIRECTORY`, `ROOT_RUN_FAMILY_CONFLICT`, `FAILED_ATTEMPT`) it still names the tree file while `reason` starts with the diagnostic's code (CF-14). (5) The tail of that bullet is its own paragraph: it was set as a lazy continuation without indentation | The link would not resolve from a bare name once the ticket is archived (the reviewer's note); the rest is what a reader of a warning or of `catalog.md` needs and the contract alone held |
| `autobyteus-server-ts/docs/modules/run_history.md` | Reference | One paragraph after the permanent-delete text: the three delete owners (`AgentRunHistoryService`, `TeamRunHistoryService`, `AgentOrgRunService`) tell the episodic catalog `runDeleted(root)` after a committed delete; a refused or failed delete tells it nothing; archive never does | The ticket changed those three services; a reader of run delete would not otherwise learn that the catalog follows it |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The catalog's files, format and privacy rule | One `catalog.md` per agent definition under `<memory>/episodic/<same folder name as the semantic folder>/`, one `index.md`; the exact lines; no text of any conversation, no Task key, no run-history summary | `episodic-catalog-contract.md`, `requirements-doc.md` REQ-001…004, REQ-009, DEC-013 | `agent_episodic_catalog.md` (Files, Format, Privacy), `GLOSSARY.md` |
| Run attribution has one owner with three outcomes | `RunFolderDiscovery` gives each run `attributed`, `unattributed` or `unreadable`; one warning per unreadable record (discovery) and one per unreadable journal manifest (the catalog); a history row never decides the definition | `design-spec.md` (SR-003), `design-review-report.md`, `code-review-report.md` CR-001, TR-001 (CRR-004) | `agent_episodic_catalog.md` (Which runs), `agent_memory.md`, `GLOSSARY.md` (Discovered run) |
| How the catalog is kept current | Journal changes queue the run's root; 5 s after the latest request, at most 30 s after the oldest, one pass at a time; a delete tells it, an archive does not; the start pass is one discovery and writes only catalogs whose content changed; it never reads its own files back | `design-spec.md`, `requirements-doc.md` REQ-005…REQ-007, REQ-010 | `agent_episodic_catalog.md` (Keeping It Current), `run_history.md` (delete) |
| Containment | A catalog failure is logged and never reaches a run, a journal update or a delete (`EPISODIC_CATALOG_*`, `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE`) | REQ-012; `code-review-report.md` | `agent_episodic_catalog.md` (Keeping It Current) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `memory-search/runs/memory-run-discovery.ts` (`MemoryRunDiscovery`) | `agent-memory/services/run-folder-discovery.ts` (`RunFolderDiscovery`, `DiscoveredRun`), shared by memory search and the episodic catalog; memory search keeps only `runs/memory-run-mapping.ts` (`MemoryRun`) | `memory_search.md`, `agent_memory.md`, `GLOSSARY.md` (Discovered run) |
| The run-history row as a second source of an agent run's definition (the fallback in `agentRuns`, removed by IR-003) | The run's metadata alone; the row supplies name, workspace and created time for admitted runs | `agent_episodic_catalog.md` (Which runs) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: two long-lived docs changed.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001…FU-005 of this ticket are in `follow-ups.md`; the Solution Designer sends them. Delivery found no new problem outside the ticket's scope, apart from the follow-up numbering (below).
  - `follow-ups.md` had two rows numbered FU-004 (the code reviewer's admission-index row, CRR-002, and API/E2E's round-2 suite-failure row). Delivery renumbered API/E2E's row FU-005 and corrected its citations in `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` and `api-e2e-test-review-report.md`, so the Solution Designer sends two distinct follow-ups. It is a factual ID correction; no finding changed.

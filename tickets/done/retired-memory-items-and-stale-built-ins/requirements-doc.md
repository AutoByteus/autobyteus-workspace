# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `retired-memory-items-and-stale-built-ins` (autobyteus-491)
- Request / ticket: Project Task autobyteus-491 (part 1: the old compactor's episodic/semantic memory items; part 2: the stale built-in Skill Self-Evolver; dispatched 2026-11-18)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`)
- Date: 2026-11-18
- Approved by and reference: `User`, in the Solution Designer's conversation on 2026-11-18: "I don't understand what is a 12 older files … the memory compactor agents data leave it if it doesn't influence us … 104 old memory compactor runs if it doesn't hurt us … if it's just data doesn't hurt us"; with the founder's words relayed by the PM on 2026-11-18 ("let's remove the dead code, we should do that now") and in the Task (Self-Evolver: "that one should be removed"). DEC-005 applies his rule "leave it if it doesn't influence us" (the Memory Compactor is listed to every agent as `/memory_compactor`), and he was told so with the option to keep it
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: the words "episodic" and "semantic" now name the founder's memories (the work journal and the per-agent episodic catalog; each agent's semantic folder). Dead library code still names the retired compactor's "episodic" and "semantic" memory items, and readers trip on it. Separately, two retired built-in agents are still installed on every machine that ran an older build and are offered to agents: the Skill Self-Evolver (it edits skills directly, against the founder's rule that skill changes go only through the Agent Package Creator) and the Memory Compactor (compaction no longer uses it).
- Desired outcome: no live code, test or doc names the retired items (frozen migration code aside); the retired built-ins are removed from every machine by the repository's app-data migration framework; the founder decides what happens to the old item files on his disk.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Contract (library) | `autobyteus-ts` still defines and exports `EpisodicItem`, `SemanticItem`, `MemoryType.EPISODIC/SEMANTIC`, `Retriever`, `MemoryBundle`, the file names and read branches; no writer, no production caller (INV-1…3) | Removed (clean cut) with their tests; docs updated | Raw-trace memory, working-context snapshots, compaction, the work journal, semantic folders, episodic catalogs |
| BEH-002 | User | The Memory page shows no episodic/semantic data for any run (INV-4) | Unchanged | The Memory page for current and old runs |
| BEH-003 | System | `agents/autobyteus-skill-evolver/` (with its skill) is installed and listed (INV-8, 9, 11) | Removed at the next start on every machine by a startup migration | Every other agent folder, all runs |
| BEH-004 | System | `agents/autobyteus-memory-compactor/` is installed and listed to every agent as `/memory_compactor` (INV-10, 11, 16) | Removed at the next start on every machine, in the same migration (DEC-005) | Its 104 old runs |
| BEH-005 | Data | 12 old `episodic.jsonl`/`semantic.jsonl` files on the founder's disk, unread (INV-7) | Unchanged: kept (DEC-004) | The files, byte-identical |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case |
| --- | --- |
| UC-001 | Remove the retired memory item code, tests and docs from live code (not frozen migration code) |
| UC-002 | Remove the Skill Self-Evolver definition (and its own skill) from every machine at startup |
| UC-003 | Remove the Memory Compactor definition from every machine at startup (DEC-005) |

### Out Of Scope

- Frozen migration code and released migrations (`src/app-data-migrations/frozen/**`, the v5 migration): untouched.
- The work journal, the semantic folders, the episodic catalog.
- Any run's folder or file, including the 12 old item files (DEC-004) and the 104 old Memory Compactor runs (DEC-006): just data, unread, kept.
- Imported memory (`memory/imports/`), which mirrors another node.

### Preserved Behavior Boundary

BEH-001 and BEH-002 preserved columns; every agent folder other than the removed ones stays byte-identical; startup never fails because of this cleanup (a failed removal retries at the next start).

### Prerequisites

None.

## Requirements

| Requirement ID | Requirement | Behavior | Source |
| --- | --- | --- | --- |
| REQ-001 | No live source, test-support or doc file names the retired items (`EpisodicItem`, `SemanticItem`, `MemoryType.EPISODIC/SEMANTIC`, `Retriever`, `MemoryBundle`, `COMPACTED_MEMORY_CATEGORY_*`, `EPISODIC_/SEMANTIC_MEMORY_FILE_NAME`), except frozen migration code and released migrations. Tests may name the old file names only to prove old files on disk are ignored or kept (they stay on disk, DEC-004). Docs that mention the old files say they are retired, unread and kept | BEH-001 | Task; DEC-001 |
| REQ-002 | Nothing visible changes in the app for current or old runs | BEH-002 | DEC-002 |
| REQ-003 | At the first start of the new version, `agents/autobyteus-skill-evolver/` is removed (its skill `retrospective-skill-coach` is inside it). Not present → nothing to do. A failure is reported and retried at the next start; startup and other agents are unaffected | BEH-003 | Founder 2026-11-14; DEC-003 |
| REQ-004 | The same for `agents/autobyteus-memory-compactor/`, in the same startup step | BEH-004 | DEC-005 |
| REQ-005 | Nothing in any run folder is touched: the old item files and the old compactor runs stay byte-identical | BEH-005 | DEC-004, DEC-006 |
| REQ-006 | Tests that assert the Self-Evolver is kept (20261020 tests and fixtures, the web E2E case) are rewritten to the new behavior; tests of removed code are removed | BEH-001, BEH-003 | ticket-scope (stale tests) |
| REQ-007 | On the founder's node: his approval and a backup before the first start that runs the removal (delivery gate); release only on his word | — | His standing rule |

## Acceptance Criteria

| AC | Requirement | Expected outcome | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | A grep for the retired names over live code, tests, test-support and docs finds only frozen/migration code and "retired" doc notes | Command |
| AC-002 | REQ-001, REQ-002 | `autobyteus-ts`, server and web typechecks, builds and the memory, compaction and Memory page suites pass | Suites |
| AC-003 | REQ-003, REQ-004 | A start on test-owned data with the stale folders removes exactly them; every other agent folder and every run is byte-identical; a second start does nothing | API/E2E |
| AC-004 | REQ-003 | `list_available_agents` and the Agents page no longer show the removed agents | API/E2E |
| AC-005 | REQ-005 | In AC-003's start, run folders with `episodic.jsonl`/`semantic.jsonl` and old compactor runs are byte-identical | API/E2E |

## Decisions

| Decision ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Clean cut of the library code | Nothing writes or reads the items (INV-2); keeping reading code would be a compatibility shim. Remove. | Solution Designer | Decided |
| DEC-002 | Does removing the reading code hide something he wants? | No: the server and the Memory page already show nothing from these files for any run (INV-4). The files stay on disk unless DEC-004 says otherwise. | Solution Designer (user informed) | Decided |
| DEC-003 | Why did the 20261020 removal keep the Self-Evolver? | Not an oversight: that Task said it stays (INV-9). The founder's word of 2026-11-14 reverses it. Remove by a startup migration like 20261006 (INV-13). | Founder (2026-11-14) | Decided |
| DEC-004 | The 12 old item files (159 KB; INV-7) | Summaries the retired compactor wrote; nothing reads them. The Solution Designer recommended deleting them on every machine; the user decided: just data that doesn't hurt: **keep (a)**. | User (2026-11-18) | Decided |
| DEC-005 | Remove the Memory Compactor definition too? | The user's rule: "leave it if it doesn't influence us". It does: it is listed to every agent as `/memory_compactor` (INV-16) and can be delegated to, though compaction no longer uses it. So it is removed with the Self-Evolver; its runs stay (DEC-006). The user was told and may keep it by saying so. | User's rule, applied by the Solution Designer (user informed) | Decided |
| DEC-006 | The 104 old Memory Compactor runs (12.5 MB, in run history; INV-12)? | Just data; the user decided: **leave them**. | User (2026-11-18) | Decided |

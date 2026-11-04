# Design Spec — autobyteus-381 (remove the last traces of read_media_file)

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001 (Solution Designer within the direction; user informed 2026-11-04)
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-read-media-file-381/tickets/in-progress/remove-read-media-file-381/investigation-notes.md`
- Authorities read (2026-11-04): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (read in this conversation; rules 7 and 10 checked: no data change, no permanent mapping).
- Conflicts or discrepancies: None.

## Current-State Read

Investigation notes, Current Source:
- the helper lives in `autobyteus-ts/src/tools/file/read-file-media.ts`;
- the journal converter lives in `autobyteus-translation.ts` L114-121, L207, with its fixtures and tests;
- the "launch fallback" is not product code: it is the general unknown-tool rule (resolver L133-137) plus the default tools (`autobyteus-runtime-tool-exposure.ts` L8-31), asserted by one test.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`. One rename, one converter removal with its fixtures, tests and doc lines, one test removal, one doc sentence.
- Architectural risk: `Low`. No runtime owner, contract, persistence, security or concurrency change; no data touched. The renderer revision is deliberately unchanged (DEC-001).
- Escalation trigger: if the regenerated golden differs in anything other than the removed call's lines and shifted `rt_NNN` numbers, or any other journal test output changes, stop and report a Design Impact.

## Intended Change

Rename one function; delete one converter and every test, fixture and doc trace of it; delete one test and one doc sentence. No product behavior changes besides how a historical call reads when its journal file is rendered again.

## Change Scope (Mandatory)

- In scope: UC-001..UC-003. Files:
  - `autobyteus-ts/src/tools/file/read-file-media.ts`, `read-file.ts`;
  - `autobyteus-ts/docs/tool_schema_and_configuration.md`;
  - `autobyteus-server-ts/src/agent-work-journal/rendering/runtimes/autobyteus-translation.ts`;
  - `autobyteus-server-ts/tests/agent-work-journal/rendering/runtime-translations.test.ts`, `synthetic-run-traces.ts`;
  - `autobyteus-server-ts/tests/fixtures/agent-work-journal/work-journal-builtin-tools.json`, `unchanged-groups-before.json`;
  - `autobyteus-server-ts/docs/modules/agent_work_journal.md`;
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts`.
- Derived consumers:
  - `work-journal-builtin-tools.json` is read by `runtime-translations.test.ts` L9 and `tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts` L48; the entry is removed from the oracle and the table together;
  - `SYNTHETIC_TRACES` feeds `unchanged-lines.test.ts` and other journal tests, which must pass after the golden regeneration;
  - memory search and the entry reader read journal text: no change to existing files, no revision change.
- Deliberately left alone:
  - `WORK_JOURNAL_RENDERER_REVISION`;
  - `mediaReadRecorded` (`read_file` uses it, L102);
  - the file name `read-file-media.ts` (`read_file`'s media branch);
  - resolver code;
  - stored definitions, journals and raw traces;
  - historical records (DEC-003).
- Follow-ups: None.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Requirement / AC | Trigger | Change | Target Path |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001 / AC-001 | `read_file` on media | Rename only | `ReadFile._execute` → `readMediaAsContextFile` → ContextFile |
| BEH-002 | REQ-002 / AC-002, AC-003 | Journal render | Converter removed; a recorded call falls to the generic rule | `toolCallLine` → built-in table (no entry) → `genericToolLine` (`rendering/tool-call-line.ts` L35) |
| BEH-003 | REQ-003 / AC-004 | Agent launch | None (test and doc only) | Exposure defaults + resolver general rule (unchanged) |

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup`
- Current design issue found: `No`
- Structural triggers: Legacy cleanup (Principle 8) fires: the converter exists only for a removed tool's history, and the user accepts generic rendering. Persisted-data transition does not fire: no stored shape changes (Principle 5, `Not Affected`). Vocabulary drift does not fire: the new helper name says what it does.
- Root cause classification: `No Design Issue Found` (planned removal after a tool's retirement).
- Refactor needed now: `No`
- Evidence: investigation notes.
- Design response: remove and rename.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths in scope: the `read_media_file` converter, its oracle entry, synthetic row, test lines and doc sentence; the AC-006 resolver test; the tool-schema doc sentence.
- Compatibility kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected` (user: "do NOT touch existing data").
- Existing journal files are reused as written, because the renderer revision stays 2 (DEC-001). Stored definitions keep `read_media_file`, which the general rule skips (DEC-002). Raw traces are untouched.

## Data-Flow Spine Inventory

| Spine ID | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-002 | Journal render request | Journal markdown | `toolCallLine` | Where a recorded call now falls to the generic rule |

## Primary Execution Spine(s)

- DS-001: `WorkJournalService.ensureCurrent → runtime translation (AutoByteus) → toolCallLine → built-in table lookup (no read_media_file entry) → genericToolLine → markdown`

## Removal / Decommission Plan (Mandatory)

| Item | Why Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `readMediaFile` converter and `["read_media_file", readMediaFile]` (`autobyteus-translation.ts` L114-121, L207) | The tool was removed in v1.5.11; the user accepts generic rendering of historical calls | `genericToolLine` | Keep `mediaReadRecorded` |
| `"read_media_file": "Command"` in `work-journal-builtin-tools.json` L48 | The oracle mirrors the table | — | |
| The synthetic row at `synthetic-run-traces.ts` L286 | Only exercised the converter | — | Regenerate the golden (DEC-004) |
| `runtime-translations.test.ts` L278-283 lines; trim the title at L263 | Only exercised the converter | — | Keep the read_file media assertions |
| Resolver test L135-157 | Duplicates the general rule's sibling tests for one removed name | Sibling tests (L126-132, `create_or_update_task`) | |
| Doc sentences (`agent_work_journal.md` L203-204; `tool_schema_and_configuration.md` L153-156) | Describe removed code or a removed tool | The general-rule paragraph (tool_schema L158-162) | |

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided | Why |
| --- | --- | --- | --- |
| Golden fixture | Regenerate from `fe351591f2`'s renderer with the row removed; check that the diff is only the call's lines plus link numbers | Hand-editing link numbers, or regenerating from the new renderer without checking the diff | Keeps the "byte-identical to revision 1" claim honest |
| Docs | One general sentence in "Changing The Wording": removing the converter of a tool that no longer exists needs no revision, because it only changes how older calls read when their file is rendered again for another reason | Naming `read_media_file` again in the docs | REQ-004 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep the converter so historical lines stay unchanged | PM's fallback if a bump were forced | Rejected (no bump is forced; the user accepts generic lines) | Generic rule |
| Map `read_media_file` → `read_file` in the resolver | Stored definitions | Rejected (DESIGN.md rule 10; the general rule already works) | General rule + defaults |

## Change / Refactor Sequence

1. Rename the helper; run the autobyteus-ts read_file tests.
2. Remove the converter, table entry, oracle entry, synthetic row and test lines.
3. Regenerate the golden (DEC-004) and check its diff.
4. Run `tests/agent-work-journal` (and `tests/unit/memory-search` for safety).
5. Do one ad-hoc render of a recorded `read_media_file` call and save it as evidence (AC-003).
6. Remove the resolver test; run the resolver unit tests.
7. Edit the docs: remove the two sentences and add the general sentence.
8. Check `git grep` (AC-005) and both type checks (AC-006).

## Key Tradeoffs

Not bumping leaves already-written journals with the old `Command: cat …` wording for those calls until they are rendered again for another reason. That is accepted by the user's decision, and it saves a full re-render and re-embedding (about 22 minutes last time).

## Risks

R-01 (golden regeneration): mitigated by the diff check in step 3.

## Guidance For Implementation

- Reproduction to start from: `None` (removal and rename).
- Touch no data folder, no Docker node, and no package root; tests use synthetic records only.
- Commit only this ticket's files; never `git add -A`.

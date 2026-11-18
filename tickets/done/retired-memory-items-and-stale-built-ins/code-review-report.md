# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-002, approved by the user 2026-11-18)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (through the design's INV citations)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-003, Ready)
- Supplemental Task Artifacts Reviewed As Context: none exist
- Relevant Solution Revision IDs: SR-002, SR-003
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 `Pass`; notes N-1, N-2, R-1)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: implementation ready for source review (Medium / High route)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Code reviewed:
  - worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins`, branch `codex/retired-memory-items-and-stale-built-ins`, base `origin/personal` `2e9ac1e65b`;
  - code commits `9f9ad727b5`, `25a7ad3940`, `ef0e56caf3`, `ae5f267d2e`, `91ee1603a5`; `3f43a9f876` holds the ticket folder and evidence only.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: none.
  - The size matches: deletions inside one library subsystem, one migration that copies a pattern, and test and doc rewrites.
  - The risk matches: a startup migration deletes app data on every machine, and public `autobyteus-ts` exports are removed.

## Review Scope

- Changed implementation and behavior reviewed: the whole diff `origin/personal...HEAD` outside `tickets/` (47 files), covering:
  - `autobyteus-ts/src/memory/**`;
  - the new migration and its registry entry;
  - every changed test in autobyteus-ts, server, web and test-support;
  - the docs;
  - `typecheck-baseline.json`.
- Existing code read to judge the change:
  - `RunMemoryFileStore.appendJsonlRecord`: the damaged-end check before the first append to a path;
  - `BUILT_IN_AGENT_DEFINITIONS`: only Daily Assistant and Model Router, so nothing reinstalls the removed folders;
  - the 20261006 precedent migration;
  - `server-settings-service.test.ts:129`: `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` is already gone from the code.
- A repository grep for any remaining use of `readMemoryDicts`, `getFilePath(Memory…`, `.memoryType`, `MemoryType`, `MemoryItem` and `memoryTypes` outside frozen code and `dist` found nothing.
- Explicit exclusions:
  - API/E2E-owned runs: the web probe case, `list_available_agents` and the Agents page, the whole server E2E and integration suites, and the fresh-start build.
  - Recorded checks were not rerun: no code changed after `91ee1603a5`, the commit IMP-01…IMP-08 ran on.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood:
  - remove the retired item model from live code (REQ-001), with nothing visible changing (REQ-002);
  - remove the two retired built-in agent folders at startup on every machine, with failures retried (REQ-003, REQ-004);
  - touch no run folder (REQ-005);
  - rewrite the stale tests (REQ-006).
- Design-spec behavior map verified against the implementation: yes.
- Design review report and round confirmed:
  - ARCH-REV-002 `Pass`;
  - AR-001 (remove `MemoryType` and `MemoryItem`) is implemented;
  - N-2 is applied (the agent-id exceptions are in AC-001's expected grep, IMP-02);
  - R-1 is in Known Risks.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none
- Remaining material ambiguity: none

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Files deleted: `episodic-item.ts`, `semantic-item.ts`, `memory-types.ts`, `retrieval/`. `index.ts` drops every export of them. The stores are typed on `RawTraceItem`. `getFilePath(memoryType)` and `readMemoryDicts` became `getRawTracesPath()` and a private `readRawTraceRecords()`, which keeps `repairJsonlDamagedEnd` and the `verifiedEndPaths` marking. `add` appends to the active raw-trace file through `appendJsonlRecord`, which checks a damaged end before the first append (`run-memory-file-store.ts:476-483`). `appendRawTrace` is kept. The grep for leftover uses is empty. | — |
| BEH-002 | Confirmed | No server or web source read the removed code (typechecks at baseline, IMP-04). `MemoryInspector.spec.ts` keeps the two-tab assertion and drops only the word match, since those words now name current features (IMP-05). | — |
| BEH-003 | Confirmed | Path: registry, then `RemoveRetiredBuiltInAgentsMigration`, then `lstat` and `fs.rm(recursive, force)` per folder, then a per-item report, then the ledger. The paths come from `config.getAgentsDir()` in the registry, and the migration is `STARTUP_ONLY` / `requiredOnStartup`, last in the list. `FAILED` when any item fails makes the framework retry at the next start. The bootstrapper registry has no entry for either id, so nothing reinstalls them. Evidence: IMP-08 unit tests, IMP-07 RRB-1/RRB-2. | — |
| BEH-004 | Confirmed | Same migration, item `memoryCompactorDir` | — |
| BEH-005 | Confirmed | The migration resolves only the two paths it is given. The unit test and RRB-1 keep run folders with `episodic.jsonl`/`semantic.jsonl` and the old compactor runs byte-identical. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior | Kind | Actor / Initiator | Goal / Event | Entry | Shape | Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-A | BEH-003, BEH-004, BEH-005 | System | Server start after the upgrade | Retired built-ins are removed on every machine | Startup app-data migrations | Normal | DS-001 | Both folders gone, everything else unchanged, a second start skips | REQ-003/004, IMP-07 | Supported Normal Scenario | Use |
| SCN-B | BEH-003 | System (failure) | Server start | A folder cannot be removed | Startup | Explicit Edge (REQ-003: "a failure is reported and retried") | `FAILED` result, retried next start | Startup and other agents unaffected | REQ-003; unit test; SID-3 pattern | Supported Explicit Edge Scenario | Use |
| SCN-C | BEH-001, BEH-002 | Contract | Library build and import | The removed API has no consumer | Build | Normal | — | Typechecks and suites pass | IMP-03, IMP-04 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation | Scenario / Contract | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- |
| CF-01 | Test reads moved from `list(MemoryType.RAW_TRACE)`, which returned every record including system instructions, to `listTurnRawTracesOrdered()`, which excludes system-instruction records. Could an assertion have been weakened? | REQ-006; design removal plan | Each changed test keeps its assertion and passes (IMP-03). A count or order that included system-instruction records would now fail, not pass. The one golden snapshot that includes them (`agent-loop-event-sequence`) uses `listRawTraceDicts()` mapped through `RawTraceItem.fromDict`, which is exactly what `list` did. | Reject | No assertion can pass now that would have failed before. |
| CF-02 | The damaged-end test "checks each memory file separately" became "checks a damaged end before a batch appended through add" | AC-004 of the earlier ticket (damaged end) | With one memory file left, the per-file case has no subject. The new case proves `add` repairs the damaged end before a batch (`appendJsonlRecord`). | Reject | A faithful rewrite |
| CF-03 | The new migration exports no id constant (precedent 20261006 exports one) | DESIGN.md rule 11 | The tests use the literal id. A recorded deviation. | Reject (`Pass — deviation recorded, reason holds`) | Production keeps nothing that only tests read |
| CF-04 | The Docker README removes the `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` block, which is not on the design's doc list | Doc accuracy | `server-settings-service.test.ts:129` asserts the setting is gone. The block described syncing the agent this ticket removes. | Reject (deviation recorded, reason holds) | Stale doc in the ticket's own subject |
| CF-05 | Registry-tail pins: 20261020's unit test pins only the released migrations after it, while two other tests and one E2E list every later migration | Tests' own intent | The comments state each choice | Reject | Each test keeps its stated purpose |
| CF-06 | `typecheck-baseline.json` shrank by one (a build input) | TESTING.md § Fresh-start build | The change only shrinks it; the typed `add` removed a clash in a fixture | Reject as a finding; residual for API/E2E or delivery | The fresh-start build check belongs downstream (the handoff flags it) |
| CF-07 | The live- and LM Studio-gated integration tests (`memory-llm-flow`, `memory-tool-call-flow`, `openai-read-file-strict-live`) did not run | AC-002 | The typecheck covers them. Their assertions filter by trace type (`tool_call`), which `listTurnRawTracesOrdered` keeps. | Reject; residual | Running them is a gate decision for API/E2E |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Legacy cleanup with no shim or deprecated re-export | — |
| Implementation matches approved behavior-defining supplemental artifacts | N/A | None exist | — |
| Data-flow spine inventory clarity | Pass | DS-001 matches the registry, the migration and the ledger | — |
| Ownership boundary preservation | Pass | The migration touches only the paths the registry passes; the bootstrapper is unchanged | — |
| Off-spine concern clarity | Pass | — | — |
| Existing capability reuse | Pass | Copies the 20261006 pattern (migrations do not share code, by repository rule) | — |
| Reusable owned structures | Pass | — | — |
| Shared-structure tightness | Pass | `MemoryType` and `MemoryItem` are removed; the stores are typed on the one item, `RawTraceItem` | — |
| Repeated coordination ownership | Pass | — | — |
| Empty indirection check (Core Principle 13) | Pass | No layer added; `appendRawTrace` predates the change and its server caller stays | — |
| Separation of concerns and file responsibility | Pass | — | — |
| Ownership-driven dependency check | Pass | The migration imports only the framework's domain types | — |
| Visible dependencies (Core Principle 16) | Pass | Folder paths are constructor input from the registry | — |
| Authoritative Boundary Rule | Pass | — | — |
| File placement | Pass | `migrations/remove-retired-built-in-agents/` | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface boundary clarity | Pass | `add(items: Iterable<RawTraceItem>)`, `getRawTracesPath()`, `new RemoveRetiredBuiltInAgentsMigration(folders)` | — |
| Naming and one vocabulary (Core Principle 15) | Pass | "Episodic" and "semantic" lose their second meaning in live code and docs. The glossary and docs call the old files "retired, unread, kept". | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | — | — |
| Dead code removed in touched files (Core Principle 7) | Pass | `list`, `deserialize`, `memoryTypes`, the selector, the empty `retrieval/` folder | — |
| Test scenarios and assertions requirement-aligned | Pass | Migration unit tests: both present, one, none, idempotent, failure and retry, inspection failure, symlink, everything else byte-identical. Startup E2E RRB-1/RRB-2 run through a real built start. | — |
| Test fixtures and structure coherent | Pass | — | — |
| No stale, duplicated or compatibility-only tests | Pass | Tests of removed code deleted; the 20261020 tests and the web case rewritten to the new behavior (REQ-006) | — |
| API/E2E readiness | Pass | The handoff lists the probe case, AC-004 surfaces, whole suites and the fresh-start build | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` Check | `>220` Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `remove-retired-built-in-agents-migration.ts` | 0 | 76 lines (total) | Pass | Pass | Pass | Pass | — | — |
| `run-memory-file-store.ts`, `file-store.ts`, `base-store.ts`, `memory-file-names.ts`, `raw-trace-item.ts`, `memory-manager.ts`, `index.ts` | — | each shrinks | Pass | Pass | Pass | Pass | — | — |
| `app-data-migration-registry.ts` | — | +7 | Pass (not grown over the limit) | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No deprecated re-export, no read branch for the old files |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files | Pass | — |
| Approved persisted-data transition followed | Pass | Old item files `Not Affected` (kept); built-in folders `Migration Required` (removal) |
| No version-specific dual reads or old-shape fallback | Pass | — |
| Migration mechanics match the design | Pass | `STARTUP_ONLY`, required, last; per-item `SKIPPED`/`MIGRATED`/`FAILED`; `FAILED` retries; the description as designed; idempotent through the ledger and the "not present" skip |

## Dead / Obsolete / Legacy Items Requiring Removal

None remaining.

## Docs-Impact Verdict

- Docs impact: `Yes`, already updated in the change: `agent_memory_design.md`, server `ARCHITECTURE.md`, `codex_raw_event_mapping.md`, `agent_memory.md`, `agent_definition.md`, `docker/README.md`, web `settings.md`, `GLOSSARY.md`. Mentions of the retired agents that remain say they are removed.

## Additional Material Premise Validation

None new. R-1 (a user-made team or org naming a retired agent stops admitting) is confirmed as a design-accepted risk: not the case on the founder's node.

## Review Scorecard (Mandatory)

- Overall score: `9.5/10` (simple average, for trend only)

| Priority | Category | Score | Why | Weak | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | One spine, visible in the registry and migration | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.6 | The migration owns only its two given paths | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | The stores are typed on the real item; the one-value selector is gone | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | — | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.6 | `MemoryType` and `MemoryItem` removed rather than kept with one value | — | — |
| 6 | Naming Quality and Local Readability | 9.5 | The vocabulary is cleaned of the second meanings | — | — |
| 7 | API/E2E Readiness | 9.3 | Hints and open runs are listed | Gated live tests and the fresh-start build are still open | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | The damaged-end repair is kept on read and append; failures retry; nothing reinstalls the folders | — | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.7 | A clean cut | — | — |
| 10 | Cleanup Completeness | 9.5 | Dead members, exports, the folder, stale tests and docs removed | — | — |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None

## Classification

N/A (Pass).

## Recommended Recipient

API/E2E (primary pass rule), with an informational notice to implementation.

## Residual Risks

- **Fresh-start build:** `typecheck-baseline.json` changed (a build input under TESTING.md); a fresh-clone build check is still due.
- **Gated tests not run:** the live- and LM Studio-gated memory integration tests did not run. They compile, and their trace-type filters are unaffected.
- **Not yet exercised:** the web probe case (SIR-002), AC-004 through `list_available_agents` and the Agents page, and the whole server E2E and integration suites (autobyteus-ts is a shared foundation, TESTING.md rerun rule 4).
- **Accepted risks:** R-1 (a user-made team or org naming a retired agent stops admitting) and the loss of a customized retired built-in are design-accepted.
- **Delivery gate:** REQ-007 requires the founder's approval and a backup before the first start on his node.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.5/10 average; every category ≥ 9.3
- Failure Origin: N/A
- Recommended Recipient: API/E2E
- Notes: the two recorded deviations (no id constant; the Docker README setting) hold.

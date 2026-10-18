# Code Review Report — Append-Only Message Logs

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-004)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (used through the design's evidence rows)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-005)
- Design Spec Reviewed As Context: `design-spec.md` (SR-005, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `implementation-design-impact-di-001.md`; probes (evidence only)
- Relevant Solution Revision IDs: SR-004, SR-005
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-004, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003, ARCH-REV-004
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff IR-001 from `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A
- Code reviewed: branch `codex/append-only-message-logs`, source `65cf41c6b4..201a4933c6` (95 files, server source, tests, docs). Ticket docs at `1633e5cf62`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The change replaces the persistence format of every message log in three run families plus task agents. It changes the commit and crash semantics, adds a one-way startup migration and alters four released migrations. No correction needed.

## Review Scope

- Changed implementation and behavior reviewed: `MessageLog` (append, tail repair, rotation, `writeInitial`, `appendBatch`, read, exists); the three family stores, `TaskAgentMessageLogs`, `TaskAgentOwnFiles.writeTeam`; the append stage unions in the atomic writer; the commit path (engine, two adapters, team append plan); the tolerant message validator; readiness (`root-run-package-current-validator.ts`); the migration `20261018_append_only_message_logs_v1` (gate, dispositions, conversion, aggregate); the frozen JSON module; the frozen append-only reader; repairs R-A..R-D; the registry; the repointed released migrations; docs.
- Files / areas reviewed: every source file in the diff (see the size audit), the new and changed tests at structure level, and the docs diff of `run_history.md`.
- Explicit exclusions: E2E suites, AC-008 and AC-009 (left to API/E2E, as the handoff records). The released migrations' unchanged internals were read only where the repairs or the gate depend on them.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. REQ-001..REQ-010, AC-001..AC-010, DEC-001..DEC-008 at SR-004.
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: ARCH-REV-004 Pass (SR-005). MP-001, MP-002 and MP-004 are Reachable and addressed; MP-003 is Not Reachable.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: none.
- Remaining material ambiguity: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `RootCommunicationEngine.deliver` validates the new message once (`root-communication-engine.ts:59`). The adapters and append plan build `next` by appending, with no history validation. The in-memory id conflict check is kept. The coordinators are unchanged and call `store.appendMessage` → `appendMessageToOwnerLogs` (receiver first; a later non-commit becomes indeterminate) → `MessageLog.append` (one line plus fsync). IMP-07: 123,099 bytes written, 1 byte read, on a 22 MB log. | — |
| BEH-002 | Confirmed | `MessageLog.read` reads sealed files then the active file, keeps the first occurrence of each id and sorts by `createdAt` with stable ties. `composeMessageLogs` is unchanged and re-sorts stably, so the composed list equals the previous one (IMP-05 compares before and after conversion). | — |
| BEH-003 | Confirmed | No code change: references resolve over the same composed list. AC-008 is left to API/E2E. | — |
| BEH-004 | Confirmed | Readiness requires the tree plus `store.hasLog` → `MessageLog.exists`. JSON log names are retired. IMP-04 covers admission, a missing log, JSON residue and an invalid line. | — |
| BEH-005 | Confirmed | `append`: `repairTail` cuts an unterminated tail. A failed write truncates back (`append_line`, not committed); a truncate failure is `restore_size` (indeterminate); a sync failure is `sync_file` / `sync_directory` (indeterminate). Read ignores an unterminated last line and stays strict otherwise. | — |
| BEH-006 | Confirmed | The migration is registered last. It reads the ledger once per start. The gate covers a missing tree, a `not_input` tree, and an org folder holding retired team authorities (SR-005). A not-ready or unreadable log waits while a predecessor is pending and is preserved after. Conversion steps 1–5 delete the JSON only after an equal read-back. The aggregate is non-terminal while any item failed or a predecessor is pending. Repairs: R-A (`released-run-package-file-readers.ts`), R-B (`hasAuthority`), R-C (`message-lines`), R-D (own-run reads through R-A). | — |
| BEH-007 | Confirmed | `TaskAgentOwnFiles.writeTeam` → `createTeamLogIfMissing` → `exists` / `writeInitial([])`. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-007; REQ-001..003 | System | agent | deliver a message | `send_message_to`, handoff, Task message | Normal | DS-001 as traced above | one synced line per owner log, receiver first | requirements; 8641c0ac DS-005 | Supported Normal Scenario | Use |
| SCN-002 | BEH-002; REQ-004 | User | user | see the full history | open, restart, restore | Normal | DS-002 | same list as before | requirements | Supported Normal Scenario | Use |
| SCN-003 | BEH-004, BEH-006; REQ-006, REQ-009 | Operational | startup | bring data current | app start after upgrade | Normal | DS-005 → DS-004 | logs converted; runs admitted | requirements; Data Migration Guideline | Supported Normal Scenario | Use |
| SCN-004 | BEH-003; REQ-008 | User | user | open a referenced file | message reference link | Normal | composed list → resolve | as before | requirements | Supported Normal Scenario | Use (API/E2E) |
| SCN-005 | BEH-005; REQ-002, REQ-005 | System | crash or I/O failure | survive interruption | append in flight | Explicit Edge | append → restart → read → next append | earlier messages intact; tail ignored and repaired | coordinators' fail-stop contract | Supported Explicit Edge Scenario | Use |
| SCN-006 | BEH-006; REQ-007 | Operational | upgrade from an old release | finish pending migrations | app start | Explicit Edge | predecessors → ours; predecessor retried after ours | nothing lost | 8641c0ac REQ-017; runner retry contract | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | In start N+1, locators-v1 (R-C) converts a root JSONL log. Own-run's retry then rewrites a task-agent JSON log from it with converted locators, while the task agent's JSONL copy is unconverted. Ours' read-back would see unequal values, FAIL, and stay non-terminal forever. | SCN-006, REQ-007 | locators-v1 blocked in start N while ours converts | Task-agent logs exist only after own-run reduced the coordinating tree to links (`coordinating-run-migration.ts:79-99`: reduce, then `mergeLogs`). Locators-v1 admits packages only through the frozen pre-own-run validator. Its parser requires full task records (`run-execution-tree-shared-record-schemas.ts:184-210`), and links lack `platformAgentRunId` / `members` (`task-agent-own-records.ts:39-44`). So it never converts the root log of a run whose task agents have logs. | code read | Reject (`Not Reachable`) | — | Drives nothing. |
| C-02 | `MessageLog.read` could miss a sealed file if it reads a live run's log during a rotation. | SCN-002 | stored-view read | Stored views are read only when no managed run exists (`team-communication-projection-service.ts:69-70`; the managers answer from memory). Appends happen only under a live coordinator's lock. | code read; ASM-001 | Reject (`Technically Possible but Unsupported/Contrived`) | — | No concurrency machinery required. |
| C-03 | An unterminated tail in a sealed file is ignored silently. A rotation does not fsync the tail truncate before the rename, so a crash can leave the old torn tail in a sealed file. | SCN-005, REQ-005 | crash during append or rotation | The tail belongs to an append that never returned success (DEC-004). Ignoring it loses nothing that was reported delivered. | `message-log.ts:109-110, 156-164` | Reject (consistent with DEC-004) | — | Correct as is. |
| C-04 | `standalone-root-tree.ts:29` doc comment still names `…/collaboration/communication_messages.json` for the in-memory `StandaloneRootMessagesFile`. | engineering contract (docs accuracy) | this change retired the file name | A reader is misled about the on-disk name. No behavior is affected. | grep | Promote (non-blocking) | This ticket | CR-001. It protects no REQ or AC, so under Review Authority it is non-blocking. |
| C-05 | Unused import `buildTeamCommunicationMessageId` in `team-communication-projection-address-migration.ts:5` (found by the implementer). | Core Principle 7 | — | Untouched released-migration file | `tsc --noUnusedLocals` (handoff) | Promote | Follow-up | FU-CR-1 |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Physical log IO is now owned once by `MessageLog`. The stores keep location and envelope only, and no `fs` access to log files remains outside it in current runtime. | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None are behavior-defining. DI-001 is implemented as SR-005 decided (`gate`, lines 173-185). | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-005 are traceable one-to-one in the code. | — |
| Ownership boundary preservation and clarity | Pass | `MessageLog` knows nothing about runs. The stores choose folder and base name. The coordinators are unchanged. JSON shapes exist only in the frozen module and the migration. | — |
| Off-spine concern clarity | Pass | Frozen JSON module, frozen append-only reader, conversion helper. | — |
| Existing capability/subsystem reuse check | Pass | Reuses `writeSerializedText`, `RunPackageFileWriteResult`, `appendMessageToOwnerLogs`, `composeMessageLogs`, own-run's tree reader and ledger pattern. | — |
| Reusable owned structures check | Pass | Four copies of the read-validate-rewrite IO are now one owner. About ten migration imports are repointed to one frozen module. | — |
| Shared-structure/data-model tightness check | Pass | A line is exactly the seven fields (`encodeLine`). No header or version on disk. In-memory envelopes are unchanged (REQ-010). | — |
| Repeated coordination ownership check | Pass | The owner order stays in `appendMessageToOwnerLogs`. | — |
| Empty indirection check | Pass | `TaskAgentMessageLogs` maps an owner to a folder and base name; that is a real responsibility. | — |
| Scope-appropriate SoC and file responsibility clarity | Pass | Migration orchestration (gate, dispositions) is split from per-log conversion. | — |
| Ownership-driven dependency check | Pass | Runtime imports no `app-data-migrations/legacy/**` (the only importer is the migration-only `context-file-record-locators.ts`, as designed; FU-3). | — |
| Authoritative Boundary Rule check | Pass | No caller uses both a store and `MessageLog` for the same log. Readiness goes through `store.hasLog`. | — |
| File placement check | Pass | `run-history/store/message-log.ts`; the frozen modules sit under `legacy/released-run-package-shapes/`. | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API boundary clarity | Pass | `MessageLog(dir, baseName)` with `exists`, `read`, `writeInitial`, `append`, `appendBatch`, as specified. | — |
| Naming quality | Pass with one stale comment | Names follow DESIGN.md rule 8. See CR-001 for the stale comment. | CR-001 (non-blocking) |
| No unjustified duplication of code | Pass | The frozen reader duplicates `MessageLog.read` on purpose (released code must not follow current code; design R-A). | — |
| Patch-on-patch complexity control | Pass | — | — |
| Dead code removed in touched files and modules | Pass | Envelope validators, JSON names and path helpers, per-log id checks, `merge`, `exactKeys`, and the `null` result of the owner-log callback are removed. | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | `message-log.test.ts` covers every outcome stage, tail repair, rotation and writeInitial. The migration tests run the fixture table in real runner order. The commit-path tests cover AC-002 and ARCH-F-002/004. | — |
| Test fixtures/helpers reusable and coherent | Pass | `migration-start-harness.ts`, `append-only-message-log-startup.ts`, `message-log-fixtures.ts`. | — |
| No stale, duplicated, or compatibility-only tests retained | Pass | Tests of the removed modules were rewritten. The changed released-migration assertions still prove non-admission, now by the manifest reason. | — |
| API/E2E readiness | Pass | E2E fixtures were switched to the JSONL layout. The coverage hints for AC-008/AC-009 are concrete. | — |

## Source File Size And Structure Audit

Effective non-empty lines (base `65cf41c6b4` → `201a4933c6`). Only files with material change are listed; all other changed source files are below 200 lines.

| Source File | Before | After | `>500` Check | `>220` Delta Check | SoC / Ownership | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-org-execution/services/agent-org-run-manager.ts` | 472 | 466 | Pass | Pass (shrunk) | Pass | Pass | — | — |
| `run-history/store/message-log.ts` | 0 | 246 | Pass | Above 220 as a new file, but it is the single owner the design planned (DS-003) and is cohesive | Pass | Pass | — | — |
| `legacy/.../released-message-logs-before-append-only.ts` | 0 | 242 | Pass | Above 220 as a new file; a frozen copy | Pass | Pass | — | — |
| `legacy/.../released-root-packages-before-task-agent-own-run.ts` | 301 | 314 | Pass | Pass | Pass | Pass | — | — |
| `append-only-message-logs-v1-app-data-migration.ts` | 0 | 174 | Pass | Pass | Pass | Pass | — | — |
| `context-file-record-locators.ts` | 115 | 138 | Pass | Pass | Pass | Migration-only file in `src/context-files/` (FU-3, known) | — | — |
| `root-run-package-current-validator.ts` | 232 | 233 | Pass | Pass | Pass | Pass | — | — |
| three family stores, `task-agent-message-logs.ts` | 83–164 | 72–125 | Pass | Pass (shrunk) | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Current runtime reads only JSONL. A leftover JSON file is ignored (IMP-03b) or rejected as residue (readiness). |
| No legacy old-behavior retention | Pass | — |
| Dead code removed in touched files and modules | Pass | — |
| Approved persisted-data transition decision followed | Pass | `Migration Required`; one owner, registered last, startup only. |
| No version-specific dual reads/writes or request-time fallback | Pass | The dual-format readers (R-A, R-B) exist only in frozen migration code, as approved. |
| Transition mechanics match the reviewed design | Pass | Gate, steps 1–5, dispositions, the aggregate clause, and JSON removal plus directory fsync after an equal read-back. |

## Dead / Obsolete / Legacy Items Requiring Removal

None in this ticket's scope. FU-CR-1 is an untouched file (follow-up).

## Docs-Impact Verdict

- Docs impact: `Yes`, and it is done in `265ad100ce` (`run_history.md` has a new "Message logs" section, plus module docs and web `agent_artifacts.md`).
- Why: the on-disk file names and the format changed.
- Remaining: the stale code comment CR-001.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | R-A..R-C implemented. F-LOCATORS-AFTER-OURS and F-SUMMARY-AFTER-OURS pass (IMP-06). |
| MP-002 | Confirmed | `writeInitial` replaces; the coordinator retry tests pass (IMP-08). |
| MP-003 | Confirmed (`Not Reachable`) | The per-log id check is removed; the reader de-duplicates. |
| MP-004 | Confirmed | `RETIRED_TEAM_AUTHORITIES` gate; F-GATE-FLAT-PARTIAL-TARGET passes (IMP-06). |

New or reclassified premises: none. C-01..C-03 are rejected in the candidate gate.

## Review Scorecard (Mandatory)

- Overall score: 9.4 / 10 (94 / 100). This is a simple average, for trend visibility only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every design spine maps directly onto the code; the local spine of `append` reads top to bottom. | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One file owner; no bypass; the frozen code is isolated. | The migration-only `context-file-record-locators.ts` lives outside `app-data-migrations` (known, FU-3). | FU-3 |
| 3 | API / Interface / Query / Command Clarity | 9.5 | A small, explicit `MessageLog` API; store APIs kept. | — | — |
| 4 | Separation of Concerns and File Placement | 9.5 | Conversion is split from orchestration; stores are thin. | — | — |
| 5 | Shared-Structure / Data-Model Tightness | 9.5 | Seven-field lines; no envelope on disk. | — | — |
| 6 | Naming Quality and Local Readability | 9.0 | Clear names and doc comments. | One stale comment (CR-001). | Fix CR-001. |
| 7 | API/E2E Readiness | 9.0 | E2E fixtures switched; scenarios hinted. | E2E, AC-008 and AC-009 not yet run. | API/E2E. |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Outcome mapping, tail repair and rotation are correct; the gate holds back every predecessor-touched shape I traced. | Rotation does not fsync the tail truncate before the rename. This is harmless because read ignores the tail (C-03). | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut; JSON only in migration code. | — | — |
| 10 | Cleanup Completeness | 9.5 | Removals as planned; docs synced. | CR-001. | — |

## Findings

### CR-001 — Stale on-disk name in a doc comment (Low, non-blocking)

- Where: `autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-root-tree.ts:29`. The comment ``/** `memory/agents/<hostRunId>/collaboration/communication_messages.json`. */`` sits on `StandaloneRootMessagesFile`.
- Basis: engineering contract (docs accuracy; C-04). This change retired that file name, so the comment now misdescribes the storage.
- Why non-blocking: it protects no approved REQ, AC or BEH (Review Authority), and behavior is unaffected.
- Proportionate response: replace it with something like "the host's message log in `…/collaboration/` (in memory; on disk a `MessageLog`, `communication_messages`)" at the next implementation touch or during delivery's docs sync. No re-review is needed for this alone.

## Follow-ups

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-CR-1 | `autobyteus-server-ts/src/app-data-migrations/migrations/team-communication-projection-address-migration.ts:5` imports `buildTeamCommunicationMessageId` and never uses it. | `tsc --noUnusedLocals` (reported in the implementation handoff) | The file is not touched by this change, and everything this ticket delivers works without fixing it. | "Remove the unused import `buildTeamCommunicationMessageId` from `team-communication-projection-address-migration.ts`; verify with typecheck." |

- Sent to: `/project_task_manager` (one message, CRR-001). It was recorded as item 3 of the existing dead-code Task `autobyteus-125`. Design follow-ups FU-1..FU-4 belong to the Solution Designer's own follow-up list and are not repeated here.

## Classification

N/A: Pass.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer`

## Residual Risks

- R-2 (accepted): a permanently failed log-writing predecessor keeps the conversion non-terminal. Each start re-lists the folders.
- R-3 (accepted): a run kept on JSON (waiting or preserved) is not admitted, or a hub shows no messages, until it is converted.
- DEC-008: R-C may rewrite a sealed file once on installs where locators-v1 is pending.
- Not yet exercised: the E2E suites (including the changed `team-run-v1-production-upgrade`, memory-sync and context-file-startup fixtures), AC-008 (references and attachments resolve, all families, migrated and new) and AC-009 (isolated desktop instance, synthesized released-format data, never user data).

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4/10. Every category is at least 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: CRR-001; task_size `Large`, architectural_risk `High` (confirmed). One non-blocking finding (CR-001) and one follow-up (FU-CR-1).

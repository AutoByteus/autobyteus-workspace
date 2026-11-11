# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-004 baseline, wording at SR-005, REQ-007/AC-009 restated at SR-008)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (A-1 … A-8, B-1 … B-8), the sections the design cites
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001 … SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008, commit `ebe9646c12`)
- Supplemental Task Artifacts Reviewed As Context: `evidence/unlink-cases-2026-11-10.txt`, `evidence/links-without-task-2026-11-10.txt`, `evidence/team-tab-messages-2026-11-10.txt` (as cited); `follow-ups.md`
- Relevant Solution Revision IDs: SR-005 … SR-008
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-005, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-005
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff IR-001 from Implementation Engineer (Large / High → code review)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin fields: N/A

All paths below are under `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469/`; server paths under `autobyteus-server-ts/src/`. Base `bff4faa6f6`; code commits `832f0a4572` (implementation and unit tests), `42652879b3` (integration tests only); `7ec463393b` touches ticket documents only.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. The change crosses run storage, Projects, the task lifecycle, three roots, GraphQL, a contract package and the web; it changes what tree files hold (persistence) and adds steps inside each root's queue and persistence lock (concurrency). No correction.

## Review Scope

- Changed implementation and behavior reviewed: composition of a top run's tree from the Task records (D-1, D-2); the save rule (D-3, SR-008); `readOwnParts` for admission and repair (D-11); the drop/add steps and their order in the root queue (D-4); run-ID routing for closed copies; the view rule and validators (D-5); `ClosedDelegatedRunReader`, `CoordinatingRunPresence`, the standalone token total (D-6, D-7); web identity `past` and unknown-"reopened" reload (D-8); docs.
- Files / areas reviewed: every changed source file of `832f0a4572` (60 server source files, the contracts DTO, 7 web source files, 7 docs); the new test files and the changed migration, store, membership and Task-side tests; evidence `IMP-01` … `IMP-07`.
- Explicit exclusions: regenerated contract `dist/` (checked only as rebuilt output); `typecheck-baseline.json` (one line removed). No check was rerun: no code changed after the recorded checks (`7ec463393b` is docs only; `42652879b3` changed integration tests only and IMP-06/07 ran on it).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: a top run stores no list of local delegated runs; its tree is built from the open Task entries naming it (REQ-001 … REQ-003), with the Team tab, Memory page, token totals and attachments unchanged (REQ-004, REQ-005), all three root kinds (REQ-006), no migration and a save that never deletes facts stored nowhere else (REQ-007).
- Design-spec behavior map verified against the implementation: yes, path by path below.
- Design review report and round confirmed: ARCH-REV-005, Pass on SR-008.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: none.
- Remaining material ambiguity, if any: none.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `splitTaskExecutions` (`run-history/store/task-execution-tree-split.ts:152-185`) writes changed own files, keeps stored remote links in place and appends new ones; no local link writer remains (`taskExecutionLinkOf` removed from `task-agent-own-records.ts`). | — |
| BEH-002 | Confirmed | Read: `TaskExecutionResourceService.openDelegatedRunsOf` (`projects/services/task-execution-resource-service.ts:224-232`) from `openByHostRootKey`, maintained in `deriveCurrent`/`unindexByHostRoot` (`:345-367`); stores call it through `openRunsOf` (three stores). Loaded: `releaseTaskExecutions` (`agent-collaboration/execution/task/root-task-execution-lifecycle.ts:258-265`) runs `membership.dropStopped` in the same queue step; `dropStopped` filters `stopped && !isOpen && contains` (`task-execution-tree-membership.ts:35-46`); adapters drop through the root's tree commit and discard released authority in `commitAfterDurability`. Not-accepting release drops nothing. | — |
| BEH-003 | Confirmed | `composeTreeFile` reads own files only of `open` runs (`task-execution-tree-split.ts:245-253`); message stores read only the composed tree's owners' logs. Read-count test: `open-delegated-run-trees.test.ts:189`. | — |
| BEH-004 | Confirmed | Router → `hasAgentExecution` (three roots) ORs `knowsRunId` → `reactivateClosedTarget` finds the closed copy by ingress (`root-task-execution-lifecycle.ts:306-324`) → `assertReopenable` → queue step `inTreeAtHead` adds from the own file, runs resume preparation and the commit, undoes the add on failure (`:227-232`). Follow-up Task: `resolveExistingCopy` with `closedCopyOf` (`existing-copy-target.ts:23-43`), then `assertAssignable` and the same step. `teamCoordinatorOf` answers for a closed Team. | — |
| BEH-005 | Confirmed | `isMessageOfView` (`task-agent-message-logs.ts:138-143`) used by the three stored views (`messageViewOfTree`) and by the loaded roots' trim (`retainMessages`); validators keep "distinct endpoints" and "one endpoint is an agent of this run"; GraphQL reader adds `pastParticipants` from `ClosedDelegatedRunReader.forAgentRunIds` (`api/graphql/types/collaboration-participant-messages.ts:67-80`); web names a `past` counterpart (`participantMessageRows.ts:36-58`). | — |
| BEH-006 | Confirmed | `CoordinatingRunPresence.exists` replaces the link check in both memory sources. | — |
| BEH-007 | Confirmed | Standalone total = tree agents ∪ `ClosedDelegatedRunReader.agentRunIds` (`token-usage-stats.ts:335-343`); attachments unchanged (message kept by the view rule); admission via `readOwnParts` (`root-run-package-current-validator.ts:189-218`) and repair (`collaboration-run-history-index-repair.ts:55-64`). | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-002 | Contract | Agent with `update_task`; user on Task page | A Task's work ends | Task set DONE/CANCELLED | Normal | DS-003 as traced above | Run stopped, out of the loaded tree; not in a later compose | Requirements SCN-001; CM-6 | Supported Normal Scenario | Use |
| SCN-002 | BEH-004 | Contract | The assigner | Continue closed work | Task reopened; `send_message_to` by run ID | Normal | DS-004 | Run continues and is in the tree; web reloads | `docs/modules/projects.md` "Reactivation" | Supported Normal Scenario | Use |
| SCN-003 | BEH-004 | Contract | The assigner | Another Task for the same run | `delegate_task` with run ID | Normal | DS-004 (assign) | As today; in the tree again | CM-6 | Supported Normal Scenario | Use |
| SCN-004 | BEH-005 … BEH-007 | User | The user | Look at a run and its history | Tree, Team tab, Memory page, token total, attachments | Normal | DS-005 … DS-007 | Same rows, names, totals | Task "must keep working" | Supported Normal Scenario | Use |
| SCN-005 | BEH-003 | Operational | The node | Load a top run | First use, restore, open | Normal | DS-001, DS-008 | Reads only open runs' files; admission without Task records | Notes BEH-003 | Supported Normal Scenario | Use |
| SCN-006 | REQ-007 | Operational | The node | Use existing data after upgrade | Load and save of an older tree file | Normal | DS-001 + split | Old local links ignored; only exact links with an own file left out | Data Migration Guideline | Supported Normal Scenario | Use |
| MP-002 (arch) | REQ-007 | Operational | First start of a release with v1 | Interrupted `20261017` with nested record | Startup migration + app save in between | Explicit Edge | Split keeps full records unchanged | Next start completes the nested run | ARCH-REV-005 MP-002 | Supported Explicit Edge Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `RootTaskExecutionLifecycle.knowsRunId` is documented as "an agent of this root's tree, or the ingress of a closed copy" and the design's interface table says the same, but it returns only the closed-copy answer (`root-task-execution-lifecycle.ts:234-235`). Every caller ORs it with its own tree lookup (three `hasAgentExecution`, `isDelegatedRun`). | Principle 15 (a name says more than it does); design Interface Boundary Mapping | Engineering contract | Behavior is correct today; a later caller trusting the name would miss tree agents | Code at the cited lines; callers `agent-org-run.ts:232-234`, `root-team-run.ts:264-266`, `standalone-agent-run-root.ts:286-289` | Promote | This ticket (non-blocking) | Cannot block: it protects no REQ/AC (requirements "Review Authority"). Recommended: rename to what it answers (e.g. `isClosedCopyIngress`) or have it include the tree, when the file is next touched. Recorded as CR-001, non-blocking. |
| C-02 | For an inactive run, the poll's closed-set digest comes from the Task index while the stored view's closed list is now always empty, so the client re-reads an opened stopped run once per digest value. | SCN-004 | User opens a stopped run with closed history | `agentRunCollaborationStore.ts:229-235`; one extra view read, which itself reads no closed run's file | Code; handoff "Known Risks" | Reject (as a finding) | — | No REQ/AC is affected (AC-010 still holds for both reads); bounded to one re-read per digest value; it also keeps detecting closures made while the run was inactive. Kept as a residual risk. Active roots are not affected: their digest is filtered by the loaded tree (`standalone-agent-run-root-manager.ts:167-173`). |
| C-03 | A message from a run already stopped and dropped is refused at identity authorization, not with the Task-closed text. | SCN-001 | None | A confirmed-stopped run runs no tools | Handoff "Known Risks"; drop only after a confirmed stop | Reject | — | Not reachable through a supported workflow (a closed run is not openable from the Task page, REQ-005). |
| C-04 | The compose consistency loop leaves out an open run whose delegator sits in a closed run. | REQ-003 | None | Sub-work joins its delegator's Task, so a nested run is never open while its delegating run is closed | Notes A-3 (`Measured`: 0 cases) | Reject | — | Not reachable. |
| C-05 | A drop where a nested copy's stop is unconfirmed while its parent's is confirmed may fail validation and leave both hidden. | SCN-001 | Same-Task release with a partial stop | Membership logs and keeps both hidden; the next closure request or a reload resolves it | `task-execution-tree-membership.ts:41-45` | Reject | — | Matches the approved "unconfirmed stop stays, hidden" outcome (AC-001 alternate). |
| C-06 | Team-tab rows of a just-dropped counterpart may be hidden while the rebuilt view's participant list re-fetches (`pastParticipants` of the previous list are empty). | SCN-004 / AC-011 | View rebuild after a closure | Transient until the fetch returns; every rebuild calls `reloadRoot` | `participantMessageRows.ts:56-58`; `agentRunCollaborationStore.ts:84-87` | Reject (as a finding) | — | No lasting difference; listed for the AC-011 rendered check. |
| C-07 | Lines merged in place in files already near or over 500 lines (e.g. `teamExecutionViewState.ts:426-427`, `root-team-run.ts:149,154-155`) to keep them from growing. | Principle 12; FU-002 | Engineering contract | Slightly denser code; no file grew past the limit | Effective line counts below | Reject (as a finding) | — | Within the design's guidance ("no line added to a file over 500"); the split is FU-002. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Shared Structure Looseness → stored copy removed; Task records the one source | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No supplement; evidence inventories reflected in fixtures (`open-delegated-run-trees.test.ts`) | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001 … DS-008, DS-R1 each traced to code above | — |
| Ownership boundary preservation and clarity | Pass | Which runs: Task side only (`openDelegatedRunsOf`); compose/split: stores; step order: lifecycle; when to drop/add: `TaskExecutionTreeMembership`; tree mechanics: adapters | — |
| Off-spine concern clarity | Pass | `OpenDelegatedRunSource` binding, `composeTaskExecution` (one mapping for load and add), `isMessageOfView`, `ClosedDelegatedRunReader` each serve one owner | — |
| Existing capability/subsystem reuse check | Pass | Existing `commitTreeMutation` / `commitExecutionTreeMutation(requiresWrite:false)`, existing closed index, existing reload paths | — |
| Reusable owned structures check | Pass | `composeTaskExecution` shared by compose and `readTaskExecutionRecord`; `messageViewOfTree` shared by stores and adapters | — |
| Shared-structure/data-model tightness check | Pass | `OpenDelegatedRun {run, started}`, `ClosedTaskExecution {execution, ingressAgentRunId}`, DTO `{agentRunId, address}`; link types removed | — |
| Repeated coordination ownership check | Pass | Drop/add policy in one class; adapters hold only root mechanics (standalone and Org bodies are parallel because their mutators and shapes differ, as designed) | — |
| Empty indirection check | Pass | `TeamTaskExecutionService.knowsRunId` forwards, as its sibling methods do (existing facade) | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New logic in four new files; large files got calls only | — |
| Ownership-driven dependency check | Pass | `run-history/store` defines the source and imports nothing from `projects/`; `projects` implements; `compositions` binds | — |
| Authoritative Boundary Rule check | Pass | Lifecycle reaches the tree only through the adapter; readers ask the port and own files, not Task files | — |
| File placement check | Pass | Files at the design's paths | — |
| Flat-vs-over-split layout judgment | Pass | No new folders | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `closedTaskExecutionOf(hostRoot, by)` takes an explicit `{ingressAgentRunId}` or a typed reference | — |
| Naming quality and naming-to-responsibility alignment check | Pass (with CR-001, non-blocking) | Vocabulary updated in `collaboration_model.md` §1 ("In the tree", "Closed delegated run"); `knowsRunId` says more than it answers (C-01) | Optional rename, CR-001 |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | `refuseCopyOutsideTree` and the link round-trip removed rather than wrapped | — |
| Dead code removed in the touched files and modules | Pass | `taskExecutionLinkOf`, link types, `parseTaskExecutionLink`, `withoutRemoteEntries`, `TaskAgentLinkChecker`, `refuseCopyOutsideTree`, endpoint loops removed; `grep` finds no remaining reference | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Tests named by AC (AC-004, AC-005, AC-009, AC-010, DEC-006, D-11) and assert byte identity, read counts and in-place order | — |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `tests/fixtures/open-delegated-run-sources.ts` (fixed source, every-own-file source, product source in root harnesses) | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Link-asserting tests rewritten; `storedLocalLink` helper removed | — |
| API/E2E readiness for the next workflow stage | Pass | Handoff lists AC-001 … AC-012 isolated-instance journeys, AC-008 server start, AC-011 rendered check | — |

## Source File Size And Structure Audit

Effective non-empty lines, base `bff4faa6f6` → head.

| Source File | Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` | 494 | 492 | Pass | Pass | Pass | Pass | — | — (FU-002) |
| `agent-team-execution/domain/root-team-run.ts` | 500 | 500 | Pass (not grown) | Pass | Pass | Pass | — | — (FU-002) |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | 495 | 495 | Pass | Pass | Pass | Pass | — | — (FU-002) |
| `autobyteus-web/services/teamExecution/teamExecutionViewState.ts` | 499 | 499 | Pass | Pass | Pass | Pass | — | — |
| `agent-org-execution/services/agent-org-task-execution-adapter.ts` | 424 | 452 | Pass | Pass | Pass | Pass | — | — |
| `standalone-agent-run-root/services/standalone-root-task-execution-adapter.ts` | 413 | 441 | Pass | Pass | Pass | Pass | — | — |
| `agent-team-execution/task-delegation/team-task-execution-adapter.ts` | 342 | 370 | Pass | Pass | Pass | Pass | — | — |
| `projects/services/task-execution-resource-service.ts` | 331 | 363 | Pass | Pass | Pass | Pass | — | — |
| `run-history/store/task-execution-tree-split.ts` | 305 | 312 | Pass | Pass | Pass | Pass | — | — |
| New: `task-execution-tree-membership.ts` (60), `closed-delegated-run-reader.ts` (79), `coordinating-run-presence.ts` (38), `open-delegated-run-source.ts` (30) | — | small | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The reader ignores every local entry; no old-shape read path |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead code removed in the touched files and modules | Pass | See structural check |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration`; nothing runs at startup |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | The save's exact-key test (`isTaskExecutionLinkEntry`) only decides what may be left out; it reads nothing of the entry and is the approved D-3 rule |
| Approved transition mechanics match the reviewed design | Pass | D-3: link by exact key set and own file at the standard place (`TaskAgentOwnFiles.exists`, existence only); full records and links without own file kept byte-for-byte and in place (test `open-delegated-run-trees.test.ts:237-252`); interrupted `20261017` completes after a save in between (migration test, AR-002 case) |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes`, done in this change.
- Why: CM-8 and the vocabulary changed.
- Files or areas: `docs/design/collaboration_model.md` (§1 terms, CM-6, CM-8, §3 layout, §5 row) and six module docs. Read: consistent with the code.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-002 (ARCH-REV-005) | Confirmed | Implemented as designed and covered by the AR-002 migration test |

No new or reclassified premise.

## Review Scorecard (Mandatory)

- Overall score: `9.4`
- Score calculation note: simple average; not the decision rule.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Every spine of the design is visible in code with one owner per node; the reopen and release steps read in queue order | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | One source for tree membership; policy in `TaskExecutionTreeMembership`, mechanics in adapters, released authority discarded after the tree commit | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | Explicit identity shapes for the port and source | `knowsRunId` answers less than its name (CR-001) | Rename or widen |
| 4 | Separation of Concerns and File Placement | 9.4 | New concerns in new files at the designed paths | Merged lines in files at the limit (C-07) | FU-002 split |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.5 | Link types gone; one compose mapping for load and add | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | Vocabulary updated in the model doc; clear names elsewhere | CR-001; a few densely merged lines | As above |
| 7 | API/E2E Readiness | 9.4 | Unit/integration green; handoff lists every AC journey still needing an isolated instance | AC-008 full start and AC-011 rendered check not yet run | API/E2E |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.4 | Index maintenance, drop-after-confirmed-stop, undo on failed reopen, run-ID routing and save rule all traced correct | Inactive-digest re-read (C-02), accepted risk | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Old local entries ignored, not interpreted | — | — |
| 10 | Cleanup Completeness | 9.4 | Removal plan fully executed | — | — |

## Findings

### CR-001 — `knowsRunId` answers less than its name and doc say (non-blocking)

- Location: `agent-collaboration/execution/task/root-task-execution-lifecycle.ts:234-235`.
- Basis: C-01; Principle 15; design Interface Boundary Mapping (`knowsRunId`: "true for an agent in the tree or the ingress of a closed run").
- Evidence: the method returns `membership.closedExecutionFor({ ingressAgentRunId }) !== null`. Its doc says "an agent of this root's tree, or the ingress of a closed copy". All four callers add their own tree lookup, so behavior is correct.
- Consequence: maintainability only; a later caller trusting the name would miss tree agents.
- Proportionate response: rename to what it answers (e.g. `isClosedCopyIngress`) or make it include the tree. Not blocking: it protects no REQ/AC (requirements "Review Authority"). Take it up at the next implementation change of this file in this ticket, if any.

## Follow-ups

- Follow-ups this review added: None (FU-001 … FU-003 already recorded by the Solution Designer).

## Classification

- None (Pass).

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer` (implementation review passes).

## Residual Risks

- **Inactive closed-set digest (C-02):** opening a stopped run with closed history triggers one extra view read per digest value. Bounded; the extra read reads no closed run's file. Worth observing in the isolated-instance journeys.
- **Team-tab transient (C-06):** after a closure and view rebuild, rows with the dropped counterpart may be absent until the participant list re-fetch returns. Include in the AC-011 rendered check.
- **Not run here:** AC-008 full server start on data with Team and Org runs whose trees list local runs; AC-001 … AC-012 on an isolated instance, per root kind; AC-011 rendered; the fresh-start build (contract `dist/` and `typecheck-baseline.json` changed).
- **Older build:** cannot be used on the same data afterwards; release notes must say so.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 average; every category ≥ 9.2
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: one non-blocking naming finding (CR-001); task size `Large`, architectural risk `High` preserved.

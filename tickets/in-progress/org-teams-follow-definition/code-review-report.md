# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-007; REQ-001..REQ-009, AC-001..AC-008, DEC-001..DEC-006)
- Investigation Notes Reviewed As Context: `investigation-notes.md`, through the design's citations
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-014)
- Design Spec Reviewed As Context: `design-spec.md` (SR-010 base; § SR-013 Revision R-8 reach; § SR-014 Revision, the relation of the delegation-chain case)
- Supplemental Task Artifacts Reviewed As Context: `org-container-storage-contract.md` (§2.3, §5, §6, §11 row for R-8/SR-014), `follow-ups.md` (FU-001), `release-notes.md`; autobyteus-22's approved behavior
- Relevant Solution Revision IDs: SR-007, SR-010, SR-012, SR-013, SR-014
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-005, ARCH-REV-007, ARCH-REV-009 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-005, ARCH-REV-007, ARCH-REV-008, ARCH-REV-009
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (§ IR-002, § Recorded Deviations)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Review Scope: `Full Re-Audit`
- Review Scope Evidence (round >1): CR-001 was `Design Impact`, and its fix (R-8, SR-014) changes step-2 reach, cross-run admission and the delegation index. Those are shared messaging paths, so a delta review would not be enough. I re-read the IR-002 diff in full (`46e53e9ed0..5545e20f3a`, 24 source/doc/test files). I re-traced the messaging, admission and history paths it touches from their entry points, and re-ran the gate over every affected suite.
- Trigger: IR-002 ready for source review (implementation engineer), covering CRR-001 and ARCH-REV-009
- Prior Review Round Reviewed: CRR-001 (round 1, Fail)
- Latest Authoritative Round: 2
- API/E2E and delivery records: N/A (implementation review)

Code reviewed: worktree `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition`, branch `codex/org-teams-follow-definition`, commit `5545e20f3a` (IR-002 delta `46e53e9ed0..5545e20f3a`; cumulative base `9f6add773b`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None (unchanged from CRR-001).

## Review Scope

- Changed implementation reviewed:
  - R-8 reach: `collaboration-tree.ts` (`stepTwo`, `containerReach`, `delegationPlacementAt`, `reachingAddressOf`).
  - SR-014 admission: `delegation-index.ts` (`chainContainerOf`, `relatedThroughContainer`) and `cross-run-message-delivery.ts` (`route`, `chainedUnitOf`, `deliverToUnit`, `admit`).
  - CR-002 removals: `agent-org-run-history-catalog-service.ts`, `collaboration-root-history-service.ts`, the two deleted hosting modules, `team-run-membership.ts`.
  - CR-003 split: `agent-run-history-catalog-state.ts` and the registry import.
  - CR-004: `peer-gateway.ts`.
  - Docs: `agent_orgs.md` § Addresses And Handoffs, `collaboration_model.md` CM-5.
  - Tests: the new `org-delegated-run-messaging.test.ts`, `collaboration-tree-reach.test.ts` B-4, e2e OF-06, the catalogue M-15 withdrawal, the rewritten history tests, `peer-run-members.test.ts`.
  - The handoff's Recorded Deviations.
- Paths traced from their real triggers:
  - A delegated run's `send_message_to(<Org address>)`: own-root miss, then `SendMessageToDispatcher.beyondOwnRun`, then `CollaborationTree.resolve` and `stepTwo` (contained assigner contributes `containerReach`), then `GlobalAgentRunMessageRouter.deliver`, then `CrossRunMessageDelivery.route`, then `chainedUnitOf` and `deliverToUnit(…, "related")`.
  - A unit's `send_message_to(target_agent_run_id=<a run a unit delegated>)`: router, then `route`, then `admit` (`canMessage ‖ relatedThroughContainer`), then `exchange`, then the gate head `assertStillOpen`. The open case and the **closed-Task case** are both traced (CR-005).
  - Org archive, delete and history projection against readiness admission.
- Gate run by me (not only the recorded evidence):
  - `node scripts/typecheck.mjs`: production 0 errors; tests 974 in 300 files, equal to the baseline. PASS.
  - `vitest run tests/unit/agent-org-execution tests/unit/agent-collaboration tests/unit/run-history tests/unit/remote-collaboration tests/unit/agent-communication tests/app-data-migrations tests/architecture`: 256/258 files, 1867/1869 tests.
    - `web-generated-graphql-current` failed only because `pnpm` is missing from my shell. With `pnpm` from corepack it passes.
    - `projects-boundaries` fails because of this change (CR-007).
  - A scratch test through `send_message_to` (not committed; deleted after the run) shows CR-005. It fails as IR-002 stands, and passes when only the new `relatedThroughContainer` clause in `admit` is removed.
- Explicit exclusions: I did not rerun the built-server e2e (OF-01..OF-06, AOML). No finding depends on it.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: as in CRR-001. The preserved boundary includes "delegation from Org units … Tasks … look and work as today". CM-5 also states: "a run whose Tasks are all closed takes input only from its assigner after a reopen".
- Design-spec behavior map verified against the implementation: Yes for R-8. SR-014 is partly contradicted. It says "a unit's message to such a delegated run by run ID is related **as today through the Task**". The implementation relates the pair without the Task's state, and this pre-empts the assigner's continuation (CR-005).
- Design review report and round confirmed: ARCH-REV-009 (SR-013, SR-014).
- Behavior-basis status: `Contradicted` (one preserved behavior, by the implementation, not the design).
- Remaining material ambiguity: None. The design text already gives the correct behavior.

| Behavior ID | Status | Current Implementation Path And Lifecycle Evidence | Contradicting Evidence |
| --- | --- | --- | --- |
| S-08 / R-8 reach (CR-001) | Confirmed | `stepTwo`: a contained assigner, or the container itself, contributes `containerReach(orgRunId, null)` at rank `configured`, first wins and in assigner order. A Team unit's team-space standing is never exposed (a contained assigner with no placements contributes nothing, `continue`). `delegationPlacementAt` answers through `delegationSourceAt`. `reachingAddressOf` names a unit sender by its Org address only when step 2 maps that address to the sender (`:242-244`) | — |
| SR-014 delegated run → unit | Confirmed | `route`: `same_container` first, then `chainedUnitOf` (`chainContainerOf(sender)` → `unitOfAgent`), then `deliverToUnit(…, "related")`. The receiver is restored. `counterpart` is null on both lines (`exchange :266`). Tested through `send_message_to` for all three senders and all three address forms, stopped and live; e2e OF-06 | — |
| SR-014 unit → delegated run, open Task | Confirmed | `admit :293` → `related` (restore, no counterpart). Tested | — |
| Preserved: the assigner's continuation for a run an Org unit delegated (autobyteus-461; CM-5 "takes input only from its assigner after a reopen") | **Contradicted** | `admit :293` returns `related` from `relatedThroughContainer` **before** the reopen branch (`:297-307`). `relatedThroughContainer` follows `chainOf`, which uses `parentOf` (the newest entry, **open or closed**, `delegation-index.ts:224-226`). So for a closed delegation the pair is `related`, `exchange`'s gate head `assertStillOpen` refuses it, and the reopen is never tried | Scratch test through `send_message_to`: the Team unit member that delegated `pdp_copy`, and the agent unit that delegated `writer_copy`, each set the Task back to TODO and message the run by ID. Result: `TASK_AGENT_RESOURCE_CLOSED`, "Only the agent that assigned the Task can continue it…" (and that sender is the assigner). Without the clause, both are reopened and delivered. At base (the Org member was the delegator in the Org run) and at IR-001 the reopen worked. CR-005 |
| CR-002 history paths | Confirmed | Archive and delete of a non-container answer "not found"; the history projection gives `null` for a non-container. Readiness never admits one (`root-run-package-current-validator.ts:212-215`) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor / Initiator | Goal / Event | Entry Surface | Shape | Forward Path | Outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-01..S-07 | As CRR-001 | — | — | — | — | Normal | Unchanged by IR-002 apart from the paths below | As CRR-001 | CRR-001; gate suites pass | Supported Normal Scenario | Use |
| S-08 delegation from an Org unit (reach and messages) | Preserved boundary; R-8; SR-014 | System | Task agent of a run a unit delegated | Hand off to the Org's units by Org address | `send_message_to` | Normal | Traced above | Delivered as related, receiver restored | New test (7 cases), B-4, OF-06 | Supported Normal Scenario | Use |
| S-09 continue a closed delegation from an Org unit | Preserved boundary ("delegation from Org units … Tasks … as today"); autobyteus-461 assigner's continuation; CM-5; `ASSIGNER_ONLY_REACTIVATION_MESSAGE` | User/System | The unit agent that delegated (agent unit, or a Team unit member) | After the Task was closed, set it to TODO/IN_PROGRESS and message the task agent's run ID to continue it | `update_task`, then `send_message_to(target_agent_run_id)` | Normal | Router → `route` (no unit target, no chain container for a unit sender) → `admit` → `relatedThroughContainer` true (closed links count) → `related` → `exchange` → `assertStillOpen` throws | Refused as closed. Expected: reopened and delivered | Scratch test + control (above); the refusal text names exactly this action | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope, if promoted | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-13 | `admit` treats the container relation as `related` whatever the Task's state, ahead of the assigner's-continuation branch | S-09; SR-014 "related as today through the Task"; CM-5 | The delegating unit agent messages its closed delegation by run ID after setting the Task to TODO | `TASK_AGENT_RESOURCE_CLOSED`; the Task cannot be continued from an Org unit at all. Today's `canMessage` counts open entries only (`delegation-index.ts:347-355`), and that is why the reopen branch is reachable for every other run | Scratch test, with control | **Promote** | This ticket (IR-002 introduced it) | CR-005 |
| C-14 | `delegation-index.ts` goes from 492 to 515 effective lines (538 → 563 raw) with `chainContainerOf` and `relatedThroughContainer` | Size rule (> 500, this change takes it over) | — | — | Size audit | **Promote** | This ticket | CR-006 |
| C-15 | `compositions/remote-collaboration-composition.ts` imports `projects/services/task-execution-resource-service.js` (FU-003 wiring, IR-001 `f69004e722`). The project architecture test allows only `collaboration-composition.ts` and `project-run-links-composition.ts` to know both sides | `tests/architecture/projects-boundaries.test.ts:69-72` (REQ-012, SR-021/SR-023) | — | The test fails (3 files found, 2 allowed). Neither handoff ran `tests/architecture` (part of `test:unit`). I missed it in CRR-001 because I did not run the suites then | `vitest run tests/architecture` | **Promote** | This ticket (this change caused it) | CR-007 |
| C-16 | The live `run-history/store/agent-org-run-execution-tree-store.ts` remains with no production importer (the migrations use the frozen copy). Four test files this ticket rewrote still import it unused: `root-run-package-readiness-index.test.ts:10`, `agent-org-memory-explorer-service.test.ts:15`, `memory-view-member-resolver.test.ts:7`, `collaboration-root-history-readiness.test.ts:11`. Two older test cases exercise only that store: `agent-org-run-execution-tree-tolerance.test.ts` "writes the exact current shape…", and the Org cases of `removed-skill-access-mode-record-tolerance.test.ts` | Principle 7; CRR-001 Dead/Obsolete row "Remove with them, unless another current reader remains" | — | Dead runtime file kept alive only by tests; stale imports in touched tests | `grep` over `src` and `tests` | **Promote** | This ticket | CR-002 (remaining part) |
| C-17 | The catalog test's package-removal-failure case was dropped, and container delete has no compensation when a folder removal throws | Infrastructure failure | Disk error | Out of scope by default (Principle 6). The released branch's compensation went with that branch. Container delete is unchanged from IR-001, which CRR-001 accepted | Code read | Reject | — | — |
| C-18 | At depth ≥ 2 the chain relation makes a delegated run's message to a unit `related` | SR-014 ("`chainOf`, assigners upward") | — | As designed. It also matches base: sub-work joins the delegating run's open Task (CM-6), whose assigner was the Org, so base `canMessage` related it too | Design; CM-6 | Reject | — | No difference from base |
| C-19 | FU-001 (memory sync excludes unit runs), challenged under the follow-up rule | `follow-ups.md` FU-001; `local-memory-export-scanner.ts:36-49` | — | Deferring it does not weaken this design. Syncing unit runs without their container (`agent_orgs/` is no sync root) would put orphan units on the other node. Syncing Org memory means also syncing containers: a new feature the requirements do not ask for. The exclusion keeps the Org whole and unsynced, as today | Code read | Reject (follow-up holds) | Follow-up | — |
| C-20 | M-15 withdrawn from the result catalogue | `result-catalogue.test.ts` | — | Only the deleted registry produced it (`grep`: no other source) | `grep` | Reject | — | Correct withdrawal |

## Structural / Design Checks

| Check | Result (`Pass`/`Pass — deviation recorded, reason holds`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | R-8 and SR-014 implemented in the owners the design names | — |
| Implementation matches approved behavior-defining supplemental artifacts | Fail | SR-014 says a unit's message to a delegated run is related "as today through the Task". The implementation ignores the Task's state (C-13) | CR-005 |
| Data-flow spine inventory clarity and preservation | Pass | The relation is decided once in `route`/`admit`, in the order the design gives | — |
| Ownership boundary preservation and clarity | Pass | Reach in `CollaborationTree`; the chain fact in `DelegationIndex` over `OrgContainerPort`; delivery in `CrossRunMessageDelivery` | — |
| Off-spine concern clarity | Pass | — | — |
| Existing capability/subsystem reuse check | Pass | `containerReach` shared by units and delegated runs; `deliverToUnit` shared by both relations | — |
| Reusable owned structures check | Pass | — | — |
| Shared-structure/data-model tightness check | Pass | No new persisted shape | — |
| Repeated coordination ownership check | Pass | One chain-container fact (`chainContainerOf`) used by `route` and `admit` | — |
| Empty indirection check | Pass | — | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Fail | `delegation-index.ts` over 500 (C-14) | CR-006 |
| Ownership-driven dependency check | Fail | A composition outside the allowed pair depends on a Projects service (C-15) | CR-007 |
| Authoritative Boundary Rule check | Pass | Readers ask `OrgContainerPort`; no caller reads the container file and a unit file side by side | — |
| File placement check | Pass | `agent-run-history-catalog-state.ts` beside its service | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass — deviation recorded, reason holds | `OrgContainerPort`'s nine read-only methods, now recorded in the handoff with their reason (N-1 a) | — |
| Naming quality and naming-to-responsibility alignment (Principle 15) | Pass | CR-004 fixed; the `team-run-membership.ts` doc corrected | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | The `stepTwo` branch is compact (`containedIn ‖ container` → placements, else standing) | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Fail | C-16 | CR-002 |
| Relevant test scenarios and assertions are clear and requirement-aligned | Fail | The new file enters through `send_message_to` and covers the design's list. It has no closed-Task case, so CR-005 passed unnoticed | With CR-005 |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The contract fixtures (`org-container-contract/`) are reused | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Fail | Unused store imports in four rewritten tests; store-only cases (C-16) | CR-002 |
| API/E2E readiness for the next workflow stage | Fail | CR-005 (a preserved behavior broken), CR-007 (a project architecture test red) | CR-005, CR-007 |

## Source File Size And Structure Audit (If Applicable)

Effective non-empty lines [raw `wc -l`], base `9f6add773b` → IR-001 `46e53e9ed0` → IR-002 `5545e20f3a`:

| Source File | Before | After | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-collaboration/delegation/delegation-index.ts` | 490 [536] → 492 [538] | **515 [563]** | **Fail — this change takes it over** | Pass | Pass | Pass | Local Fix | CR-006 |
| `run-history/services/agent-run-history-catalog-service.ts` | 491 [532] → 504 [546] | 470 [507] | Pass (CR-003 resolved) | Pass | Pass | Pass | — | — |
| `run-history/services/agent-run-history-catalog-state.ts` (new) | 0 | 41 [47] | Pass | Pass | Pass | Pass | — | — |
| `agent-collaboration/delegation/collaboration-tree.ts` | 260 → 360 | 378 [412] | Pass | Pass | Pass | Pass | — | — |
| `agent-collaboration/communication/cross-run-message-delivery.ts` | 256 → 292 | 307 [322] | Pass | Pass | Pass | Pass | — | — |
| `run-history/services/agent-org-run-history-catalog-service.ts` | 245 → 320 | 204 [215] | Pass | Pass | Pass | Pass | — | — |
| `remote-collaboration/channel/peer-gateway.ts` | 323 → 348 | 348 [386] | Pass | Pass | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | The released-tree branches are gone from both services |
| No legacy old-behavior retention in changed scope | Fail | The released Org tree store stays in `src`, used only by tests (C-16) |
| Dead code removed in the touched files and modules (Core Principle 7) | Fail | CR-002 (remaining part) |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | Unchanged; the migrations read the frozen store |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | The converted chain line equals the live line (tested through `planLogSplit`) |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `src/run-history/store/agent-org-run-execution-tree-store.ts` | DormantPath | No importer in `src` outside itself; `task-agent-own-run-v1` imports the frozen copy (`frozen/server/run-history/store/…`) | Current runtime is current-schema-only (Principle 5/8); CRR-001 asked for its removal once no current reader remained, and none does | Delete. `agent-org-run-execution-tree-path.ts`, `-schema.ts` and `agent-org-run-file-commit-writer.ts` stay: the container store and the planner use them |
| Unused imports of that store in `tests/unit/run-history/services/root-run-package-readiness-index.test.ts:10`, `tests/unit/agent-memory/agent-org-memory-explorer-service.test.ts:15`, `tests/unit/api/graphql/types/memory-view-member-resolver.test.ts:7`, `tests/unit/run-history/services/collaboration-root-history-readiness.test.ts:11` | StaleImport | No use in each file (`grep`) | Dead code in files this ticket touched | Remove |
| `tests/unit/run-history/agent-org-run-execution-tree-tolerance.test.ts` "writes the exact current shape and reads back the same tree"; `tests/unit/run-history/removed-skill-access-mode-record-tolerance.test.ts`, the Org-tree cases (`:130-153`) | StaleTest | They test only the dead store | They would keep a dead file alive | Remove these cases, or keep what they prove about the live schema through `validateAgentOrgRunExecutionTreePayload`, which the planner still uses |

## Docs-Impact Verdict

- Docs impact: `Yes`, done. `agent_orgs.md` § Addresses And Handoffs and `collaboration_model.md` CM-5 describe R-8 and SR-014.
- After CR-005, CM-5's "a run whose Tasks are all closed takes input only from its assigner after a reopen" holds again, so no docs change is needed for it. The `agent_orgs.md` sentence "A unit's message to such a run, by run ID, is related the same way" should say "while its Task is open", as CM-5 says of the Task rule.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-CR-01 (step 2 for a run delegated by an Org unit) | Confirmed resolved | R-8 implemented; tests through `send_message_to` (three senders × three address forms × stopped/live); B-4; OF-06 |
| ARCH-REV-009 notes (view rule: the delegating unit's view only when it is a party) | Confirmed | `MessageViewScope` cases in the new test |

### `MP-CR-02` — the container relation and closed Tasks

- Origin: `New`
- Related approved requirement or established contract: preserved boundary ("delegation from Org units … Tasks … as today"); SR-014 ("related as today through the Task"); CM-5; autobyteus-461 assigner's continuation (`admit :296-307`; `ASSIGNER_ONLY_REACTIVATION_MESSAGE`)
- Relevant behavior ID(s): S-09
- Coherent product goal or governing event: the agent that delegated a Task continues it after it was closed
- Scenario validity: `Supported Normal Scenario`
- Initiating basis kind: `User` / `System`
- Independent product-supported initiating trigger: `update_task` (TODO/IN_PROGRESS) by the delegating unit agent, then `send_message_to(target_agent_run_id)`
- Support evidence: the refusal text tells agents to do exactly this; CM-5; base and IR-001 behavior
- Forward path: router → `route` → `admit` → `relatedThroughContainer` (chain through `parentOf`, open or closed) → `related` → `exchange` → `assertStillOpen` → `TASK_AGENT_RESOURCE_CLOSED`
- Lifecycle preconditions and material consequence: the Task's last entry is `assigned` and closed, and the sender is its delegator. The delegated work cannot be continued from inside an Org, and the refusal names the sender as the one who may.
- Reachability: `Reachable` (shown through `send_message_to`, with control)
- Review consequence: CR-005 (`Local Fix`)

## Review Scorecard (Mandatory)

- Overall score: `9.1/10` (simple average; not the decision rule). Pass bar for this review: at least 9.4 in every category (user's standing instruction, above the template's 9.2).

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.4 | R-8 and SR-014 sit on the existing spine: one step-2 contribution, one relation decision in the order the design gives | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.4 | The chain fact is in the index over the container port; delivery in one owner; the Team-unit standing never exposed | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.4 | Port deviation recorded with a reason that holds | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.0 | CR-003 resolved cleanly | `delegation-index.ts` taken over 500 (CR-006) | CR-006 |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.4 | `containerReach` and `deliverToUnit` shared; no new persisted shape | — | — |
| `6` | `Naming Quality and Local Readability` | 9.4 | Doc comments corrected; clear comments on the relation order | — | — |
| `7` | `API/E2E Readiness` | 8.8 | Strong new coverage through `send_message_to`, and OF-06 | A project architecture test is red (CR-007); no closed-Task case, so CR-005 passed unnoticed | CR-007; the CR-005 tests |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 8.6 | R-8 reach and SR-014 delivery correct and restored-on-message | Continuing a closed delegation from an Org unit is refused (CR-005) | CR-005 |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.2 | Released-tree branches removed | The released Org tree store remains in the runtime tree (C-16) | CR-002 |
| `10` | `Cleanup Completeness` | 9.0 | Hosting modules, branches and M-15 gone | Dead store, four stale imports, store-only test cases | CR-002 |

## Findings

| ID | Finding | Evidence | Required Action | Classification | Owner |
| --- | --- | --- | --- | --- | --- |
| CR-002 (remaining) | The live released-Org-tree store `run-history/store/agent-org-run-execution-tree-store.ts` remains with no production importer. Four tests this ticket rewrote import it unused, and two test cases exercise only it. | C-16; Dead / Obsolete table | Delete the store; remove the four imports; remove the store-only cases, or move what they prove about the live schema onto `validateAgentOrgRunExecutionTreePayload` | `Local Fix` | Implementation engineer |
| CR-005 | A unit agent cannot continue a closed Task it delegated. `admit` relates the pair through `relatedThroughContainer`, which follows `chainOf` over closed entries too, before the assigner's-continuation branch. The gate head then refuses with `TASK_AGENT_RESOURCE_CLOSED` ("Only the agent that assigned the Task can continue it…") although the sender is that agent. This breaks the preserved boundary and CM-5, and departs from SR-014's "related as today through the Task". IR-002 introduced it: IR-001 and base reopen. | C-13, MP-CR-02; `cross-run-message-delivery.ts:293`, `:297-307`; `delegation-index.ts:224-226`, `:361-380`; scratch test with control | Apply the container relation under the Task rule's own condition: the delegated run's Task entry is open, as `canMessage` counts. A closed delegation then follows today's rule: its delegator's message reopens and delivers it, and any other unit gets the closed refusal. Mind the other direction too (`chainedUnitOf`), so one rule decides both. Add tests through `send_message_to`: (a) the agent unit and (b) a Team unit member each continue their closed delegation after setting the Task to TODO (reopened, delivered, restored); (c) a non-delegating unit gets `TASK_AGENT_RESOURCE_CLOSED`. Adjust the `agent_orgs.md` sentence (Docs-Impact) | `Local Fix` | Implementation engineer |
| CR-006 | `delegation-index.ts` taken over 500 effective lines (492 → 515) by `chainContainerOf` and `relatedThroughContainer` | C-14 | Put the container-chain relation in an owned file (for example beside the index, taking `chainOf` and the container port), or move another cohesive block out, so the index is back under 500. The CR-005 fix will touch this code anyway | `Local Fix` | Implementation engineer |
| CR-007 | `compositions/remote-collaboration-composition.ts` imports `projects/services/task-execution-resource-service.js` (FU-003 wiring, IR-001), and `tests/architecture/projects-boundaries.test.ts` fails | C-15 | Type the dependency by the receiver's own port: declare it in `remote-collaboration` (for example a `PeerRunMembersTasks` type that `PeerRunMembersReceiver` exports), and have the composition use that. Or build the receiver in `collaboration-composition.ts`, which may know both sides. Do not widen the test without a design reason. Include `tests/architecture` in the implementation's suite runs | `Local Fix` | Implementation engineer |

CR-007 was already present at IR-001. I missed it in CRR-001 because I did not run the suites in that round. From this round on I run the gate, including `tests/architecture`.

## Follow-ups

- Follow-ups this review added: None.
- FU-001 challenged (C-19): it holds as a follow-up. Deferring it does not weaken the delivered design; doing it needs Org container sync, a new feature.

## Classification

- CR-002 (remaining), CR-005, CR-006, CR-007: `Local Fix`. The design already states the behavior; no upstream change is needed.

## Recommended Recipient

Implementation engineer (`get_handoff_rules`: implementation-owned Local Fix before executable coverage). After the fix: implementation review again. A targeted delta review is enough if the fix stays within `admit`/the relation, the store removal, the composition typing and the file split. Then API/E2E.

## Residual Risks

- Real-runtime, two-node and rendered-view proof is pending (API/E2E per the Verification Intent).
- AC-006 is proven on hand-built fixtures only (correct by the guideline).
- FU-001 remains (memory sync of contained runs).

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Fail` (S-09 contradicted)
- Material-Premise Gate: `Fail` (MP-CR-02); MP-CR-01 resolved
- Score Summary: 9.1/10 average. Below the 9.4 bar: Separation of Concerns 9.0, API/E2E Readiness 8.8, Runtime Correctness 8.6, Legacy 9.2, Cleanup 9.0
- Failure Origin: N/A (implementation review)
- Recommended Recipient: Implementation engineer
- Notes: CR-001, CR-003, CR-004 and N-1 are resolved. R-8 reach and SR-014 delivery are correct and well tested. The remaining work is bounded: one admission-order fix with its tests, one file split, one store removal and one composition typing.

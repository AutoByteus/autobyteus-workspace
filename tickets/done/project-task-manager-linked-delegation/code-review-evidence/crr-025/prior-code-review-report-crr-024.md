# Code Review Report — CRR-024 (User-Requested Independent Review)

## Latest Authoritative Result (summary)
**Fail — Design Impact (ownership/authority), plus bounded Local Fixes. Score 8.8/10 (88/100).** The business spine matches the approved REQ-BL-008 / SR-014 basis: saved-Task delegation, exact linkage, DONE fence and scoped release, helper ownership, and business-only tool output. I found no runtime-correctness defect on a supported scenario.

Ownership/authority review was done against `.claude/skills/code-reviewer/design-principles.md` (Principle 3, Authoritative Boundary Rule, Derived Checks on dependency direction and removal) and repo `DESIGN.md` (rule 5 "New owners/state must have concrete responsibilities and lifecycle semantics"; §3 "avoid duplicate state owners"). Primary authority lines are sound: Task authority, the root release entry point, and the runtime → neutral port direction. But lifetime closure and membership have more than one owner, unused gate machinery remains, and Projects ⇄ runtime roots depend on each other through repeated service-locator defaults.
- **Design Impact → Solution Designer:**
  - **CR24-F04:** lifetime-closure state has three holders; the design forbids per-root duplicate fences.
  - **CR24-F05:** unused admitted-count/drain machinery diverges from the designed DS-003 drain.
  - **CR24-F06:** two-way Projects ⇄ runtime-root dependency, with the default binding repeated in three root builders.
  - **CR24-F07:** lifetime membership has two sources of truth, unioned at release.
  - **CR24-F08:** `delivered` is rewritten to projects.json on every accepted message; the business only needs the first acceptance.
- **Bounded Local Fixes carried in the same package:**
  - **CR24-F01:** 64 generated `dist/` files committed.
  - **CR24-F02:** lifecycle mechanics in the shared delegate_task/collaboration LLM contract.
  - **CR24-F03:** test-only dead `resolveInRunRecipient`.

Prior CRR-022 report archived unchanged at `code-review-evidence/crr-024/prior-code-review-report-crr-022.md`.

## Review Round Meta
- Review Entry Point: `Implementation Review` (independent, user-requested at the delivery/user-verification hold; not a team-routed handoff)
- Requirements Doc Reviewed As Context: requirements-doc.md (REQ-BL-008, SD-AP-001 + scoped SD-AP-002)
- Investigation Notes Reviewed As Context: by reference through requirements/design evidence IDs
- Solution Revision Record Reviewed As Context: solution-revision-record.md (SR-014 semantic; SR-015–020 evidence)
- Design Spec Reviewed As Context: design-spec.md (incl. SR-014 Business Role / Ordinary Results contract and Final File Responsibility Mapping)
- Supplemental Task Artifacts Reviewed As Context: solution-scope-clarification.md (SR-015/E-056); none behavior-defining
- Relevant Solution Revision IDs: SR-014 (semantic), SR-015–020 (evidence only)
- Design Review Report / Architecture Review Revision Record: design-review-report.md, architecture-review-revision-record.md (ARCH-REV-005)
- Implementation Handoff / Revision Record: implementation-handoff.md, implementation-revision-record.md, implementation-evidence/ir-009-source-inventory.md; current IR-011
- Code Review Revision Record: code-review-revision-record.md
- Current Code Review Revision ID: **CRR-024**. Current Review Round: 24
- Review Scope: **Independent Targeted Business-Spine Review**. Not a re-run of CRR-022's 257-file audit. Scope evidence: a user-requested independent second opinion after CRR-022 Pass, API-REV-017 Pass and DR-002 integration. I traced the business spine end to end and audited the whole branch diff (305 files) for responsibility and hygiene. I did not re-trace provider-private (Claude/Codex/ACP/AGY) teardown internals line by line.
- Trigger: user request "do an independent review of the ticket."
- Prior Review Rounds Reviewed: CRR-022 (source Pass 9.20), CRR-023 (test-code Pass)
- Delivery Revision Record Reviewed: delivery-revision-record.md (DR-001 checkpoint commit `028cca231`, DR-002 HEAD `ccb5fbe3`); handoff-summary.md
- Reviewed HEAD `ccb5fbe3ca63b3542fa6538e035a4b1428c80788`; merge-base = origin/personal `10fb69504f99a615e0728ffdd6c1fcab0104ff05`
- Failure-origin fields: N/A

## Routing Classification Review
- Task size **Large**, architectural risk **High**, route **Reviewed**, independent source review required. Confirmed: persisted lifetime fence, multi-root admission/release and provider teardown justify it. No correction.

## Review Scope
- Reviewed:
  - Manager template/config.
  - Native/MCP Project Task tools (business DTOs, error facade).
  - delegate_task parser/schema/LLM contract.
  - `ProjectTaskService`: lookup, saved payload, lifetime open/close, reservation/dispatch/cleanup recording.
  - `ProjectStore` + current-array schema.
  - `ProjectTaskRuntimeRelease`.
  - `RootTaskExecutionLifecycle`, `dispatchTaskCopy`, `RootTaskLifetimeScope`, `TaskLifetimeOperationGate`.
  - Task-scoped message-recipient resolution.
  - Team adapter ownership/release.
  - GraphQL status-write parity.
  - Public tree DTO projection.
  - `autobyteus-ts` AgentFactory failed-stop retry change.
  - Uncommitted long-lived docs/TESTING.md.
  - Whole-branch inventory and changed-source size pressure.
- Executed: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools/project-tasks tests/unit/agent-tools/task-delegation tests/unit/agent-collaboration/collaborators`: **15 files / 143 tests Pass**.
- Exclusions:
  - Line-level re-audit of provider-private acquisition/teardown. CRR-022 and API-REV-017 controlled evidence remain its basis.
  - Paid/model/app journeys.
  - Test-code review (CRR-023 stands).

## Upstream Behavior And Production-Path Basis Confirmation
- Approved basis: a Manager plans and delegates saved Tasks by ID. Explicit DONE is a business decision that atomically closes the Task's execution lifetime and starts platform-owned release of only that Task's owned runtime forest. Ordinary tool output stays business-facing. No completion notifier.
- Behavior-basis status: **Confirmed**. No contradicted, unclear or newly discovered behavior.

| Behavior ID | Status | Current implementation path / lifecycle evidence |
| --- | --- | --- |
| BEH-001 | Confirmed | `built-in-agents/templates/project-task-manager/{agent.md,agent-config.json}`: ordinary Agent; prompt is business-only. |
| BEH-002 | Confirmed | Tool manifest → `ProjectTaskService.createTask/listTasks`; explicit project_id; ID collision check includes retained lifetime taskIds. |
| BEH-003 | Confirmed | `parseDelegateTaskInput` picks the strict Linked or Described schema by key presence; `RootTaskExecutionLifecycle.delegate` re-checks allowed keys; `resolveDelegationWork` → `uniqueTask` (ambiguous/unknown/DONE fail before spawn). |
| BEH-004 | Confirmed | Saved description + `context.savedFile` paths resolved under the state lock → `validateTaskReferenceFiles` → work-packet snapshot. |
| BEH-005 | Confirmed | `dispatchTaskCopy`: plan → begin (queue) → `reserveExecution` → prepare → commit → stamp/link check → `admitted` → guarded seed → `delivered`. Tool read exposes non-helper `assignments` (root/execution/ingress/dispatchOutcome). |
| BEH-006 | Confirmed | `updateTask` DONE: status + `closeTaskLifetimes` in one `updateState`; commit callback latches gates; `releaseEffect.initiate`. GraphQL `updateTask` uses the same service (UI parity). |
| BEH-007 | Confirmed | `RootTaskLifetimeScope.release`: assertClosed → cancel registered + owned → exact per-reference release → outcomes recorded. Repeat DONE resets non-released to pending and retries. Restore/input fenced via `acquireForAgent`/`assertInputAllowed`. |
| BEH-008 | Confirmed | Task/Project delete via `updateRecords` preserves the lifetime collection (full-state spread). |
| BEH-009 | Confirmed | `resolveMessageRecipient`: own Team instance → lifetime helper → unowned outside run (other-lifetime-owned skipped) → `ensureLifetimeHelper` (deduped per lifetime+address). |
| BEH-010 | Confirmed (drag F02) | Task tool DTOs omit executionLifetimes/cleanup/errors; mutation ack `{projectId,taskId,status}`. The shared delegate_task LLM text still states lifecycle mechanics (F02). |

## Supported Product Scenario And Reachability Gate
| Scenario ID | Related | Kind | Actor | Goal / event | Entry | Shape | Forward path | Expected outcome | Evidence | Validity | Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-002 | BEH-003–005 | User | Manager | Start saved Task work | delegate_task(task_id) | Normal | BEH-005 path | exact linked copy; IN_PROGRESS after success | REQ-003–005 | Supported Normal | Use |
| SCN-005 | BEH-006–007 | User | Manager/User | Complete Task | create_or_update_task / UI status | Normal | BEH-006/007 path | owned forest released; Manager/others live | REQ-007–009 | Supported Normal | Use |
| SCN-008/009 | BEH-009 | System | Task-owned worker | Bring helper by address | send_message_to(address) | Normal | BEH-009 path | per-lifetime helper; borrowed run not adopted | REQ-012 | Supported Normal | Use |
| SCN-011 | BEH-010 | User | Manager | Business-only role context | prompt + tool descriptions | Normal | catalog → tool manifest description → LLM | no platform/resource mechanics in LLM contract | REQ-013, AC-014, DEC-007; design Final File Mapping ("no internal resource/lifecycle explanation in the LLM contract") and SR-014 ("Tool descriptions describe business actions/identities/status, not resource mechanics") | Supported Normal | Use |
| CT-REPO | contract | Contract | Maintainers | Generated build output is not source | origin/personal tree | Normal | branch → target merge | only source/ticket changes land | base tracks no `dist/` for these two packages; both build `dist` via `tsc` | Established engineering contract | Use |
| CT-CLEAN | contract | Contract | Maintainers | No dead/duplicate code in changed scope | design Legacy Removal Policy; reviewer cleanup rule | Normal | n/a | superseded helper removed | same | Established engineering contract | Use |
| CT-OWN | contract | Contract | Maintainers | One authoritative owner per state/invariant | design-spec Ownership Map + Reusable Owned Structures; design-principles P3/Authoritative Boundary Rule; DESIGN.md rule 5 and §3 | Normal | DONE → closure → release; admission → membership | each runtime fact has one owner; others derive from it | same | Established engineering contract | Use |
| CT-DEP | contract | Contract | Maintainers | Dependency direction follows ownership | design-spec Dependency Rules; design-principles Derived Checks | Normal | composition of roots and Task service | one-way dependency; one composition binding | same | Established engineering contract | Use |

### Candidate Finding And Mechanism Gate
| Candidate ID | Observation | Scenario / Contract | Trigger | Path / consequence | Evidence | Disposition | Reason / response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CR24-CAND-01 | 64 generated `dist/` files added (`autobyteus-application-sdk-contracts/dist/*` 52, `autobyteus-application-backend-sdk/dist/*` 12) | CT-REPO | DR-001 checkpoint commit `028cca231` | merge lands unreviewed, ticket-unrelated build output. Both packages' `main`/`types` resolve to `dist`, so committed output drifts from `src` and workspace consumers can load stale code without a rebuild | `code-review-evidence/crr-024/committed-dist-files.txt`; absent from `git ls-tree origin/personal`; ir-009 inventory files them under "other" | **Promote → CR24-F01** | Untrack (`git rm -r --cached`) before finalization |
| CR24-CAND-02 | Lifecycle sentences added to `DELEGATE_TASK_LLM_DESCRIPTION` and `AGENT_TEAM_COLLABORATION_LLM_INSTRUCTION` | SCN-011 | every LLM with delegate_task (incl. Manager); every Team member's rendered instruction | reintroduces the platform/lifetime explanation SD-AP-002 removed from agent.md into the Manager's context, and adds global tokens to unrelated runs | `agent-team-collaboration-llm-contract.ts` diff; consumers `task-delegation-tool-manifest.ts:37`, `member-collaboration-instruction-renderer.ts:47` | **Promote → CR24-F02** | Drop the mechanics sentences, keep business wording |
| CR24-CAND-03 | `resolveInRunRecipient` has no production caller; its logic is re-implemented inline in `resolveMessageRecipient`; only tests call it | CT-CLEAN | structural | two sources of truth; tests certify non-production code; stale JSDoc | `grep resolveInRunRecipient` → definition + `message-recipient-resolution.test.ts` only | **Promote → CR24-F03** | Reuse it or remove it and retarget the tests |
| CR24-CAND-04 | Each accepted Task-owned message rewrites projects.json (sender + target `delivered` record) even when already `delivered` | SCN-008 | ordinary Task-team messaging | write amplification only; no evidenced latency/contention at realistic file sizes | `withLiveLease`/`recordMessageAccepted`; outer lease at `root-team-run.ts:323` | **Promote → CR24-F08** (re-judged on business purpose, not measured cost: no approved scenario uses repeat `delivered` writes, and DESIGN.md rule 5 says "Remove unnecessary work before adding complexity") | Record `delivered` only on first acceptance |
| CR24-CAND-05 | Owned sender's failed helper spawn throws a raw `Error` rather than the structured `COLLABORATOR_ADD_FAILED` | SCN-008 | helper spawn failure | LLM still receives a tool error; shape differs | `task-scoped-message-recipient.ts` `bringIn` | **Reject** (no material consequence) | Optional parity |
| CR24-CAND-06 | `TaskLifetimeOperationGate.states` never evicts | — | process lifetime | bytes per lifetime | gate source | **Reject** (contrived scale) | None |
| CR24-CAND-07 | `agent-run.ts` 507 nonempty / 496 non-comment (base 540 raw); factory 485; skill materializer 463 | size contract | n/a | pre-existing pressure, small deltas | line counts | **Reject** as finding | Pressure noted |
| CR24-CAND-09 | "Is this lifetime closed?" has three holders: durable `completedAt` (ProjectState); `TaskLifetimeOperationGate` instantiated inside `ProjectTaskService`; and per-root `RootTaskLifetimeScope.closed` Set + `fences` Map | CT-OWN (design Ownership Map row "TaskLifetimeOperationGate"; Reusable Owned Structures row: "Shared no-escape/close/drain semantics; **no per-root duplicate fence implementation**"; design-principles P3; DESIGN.md §3 "avoid duplicate state owners") | DONE / input / restore admission | closure is decided durably, latched in the Task service, then cached again per root. Correctness currently relies on every path keeping three holders in step, and a business service owns a runtime latch | `project-task-service.ts:51,114,185-203`; `root-task-lifetime-scope.ts:8-9,16-27,56` | **Promote → CR24-F04 (Design Impact)** | Designer to name one runtime closure owner and remove the duplicate holders |
| CR24-CAND-10 | `TaskLifetimeOperationGate` keeps per-lifetime admitted counts and a `drain()`, but no production code calls `drain()`. DS-003 says release "drains finite admitted continuations"; `RootTaskLifetimeScope.release` cancels and force-stops instead | CT-OWN / DESIGN.md rule 5 | DONE | count/drain state has no consumer, so either it is unnecessary machinery or the design's drain step was never implemented. Either way design and code disagree | `task-lifetime-operation-gate.ts` (`count`, `drained`, `drain`); grep: no `.drain(` caller on the gate | **Promote → CR24-F05 (Design Impact)** | Designer to decide whether drain is required. If not, remove count/drain from the design and code; if so, specify where release awaits it |
| CR24-CAND-11 | `projects/` imports runtime internals (`TaskLifetimeOperationGate` class, the `getActiveCollaborationRootDirectory()` singleton, root identity/reference types). Runtime-root builders (`team-root-materializer.ts:1,123`, `agent-org-execution-scope-builder.ts:1,191`, `standalone-root-builder.ts:1,135`) each import `getProjectTaskService()` as a `??` default | CT-DEP (design Dependency Rules: "Task service implements injected port; root construction binds it at composition boundary"; design-principles Derived Checks "dependency direction follows ownership") | composition / startup | subsystems depend on each other in both directions; service-locator defaults are repeated three times inside runtime subsystems instead of one composition binding; Projects reaches a global runtime registry directly | import greps recorded in this report | **Promote → CR24-F06 (Design Impact)** | Designer to define one composition root for the lifetime port and release request, and move neutral types/gate to the owner the design names |
| CR24-CAND-12 | Lifetime membership has two sources of truth: durable link records (Task service) and lifetime stamps in root execution trees (root index). `release()` unions `requested` + `registeredActivations` + `ownedExecutions`, and only durable references are reported back | CT-OWN (design-principles P3 "If a concern has no clear owner, the boundary is wrong"; DESIGN.md §3) | DONE / admission | neither record is the sole membership authority. Release correctness depends on the union, and unreserved-but-registered or stamped-but-unlinked executions are stopped but invisible to Task diagnostics | `root-task-lifetime-scope.ts` `release()`; `dispatchTaskCopy` link/stamp cross-check; `assertExecutionLinked` | **Promote → CR24-F07 (Design Impact)** | Designer to state which record is authoritative for membership and how the other is derived or reconciled, or justify the dual record explicitly with its reconciliation contract |
| CR24-CAND-08 | Uncommitted TESTING.md section uses ticket-workflow vocabulary ("Delivery-owned rerun evidence", "API-owner ledger", "explicit user verification for finalization") in a repo-wide guide | docs | Delivery docs sync | docs clarity, not source | `git diff TESTING.md` | **Reject** for source scoring; Delivery observation | Delivery may trim before finalizing |

## Structural / Design Checks
| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health preserved | Pass | Task authority / root lifecycle / adapters split as designed | — |
| Behavior-defining supplements | Pass | none | — |
| Data-flow spine clarity | Pass | DS-002 in `dispatchTaskCopy`; DS-003 in `updateTask` → `ProjectTaskRuntimeRelease` → `RootTaskLifetimeScope.release` | — |
| Ownership boundary preservation | **Fail** | Primary lines sound (Task service → root `releaseTaskLifetime`; no `ProjectStore` bypass). But closure state has three holders (F04) and membership has two sources (F07) | F04, F07 |
| Authoritative Boundary Rule (dual-dependency bypass) | Pass | no caller depends on both an outer owner and its internals: tools/GraphQL/REST → TaskService only; roots → port only; release → root facade only | — |
| Dependency direction | **Fail** | Projects ⇄ runtime roots both ways; `getProjectTaskService()` default repeated in 3 runtime builders; Projects imports the runtime gate class and registry singleton | F06 |
| Unused state / machinery | **Fail** | gate count/drain never consumed | F05 |
| Off-spine concern clarity | Pass | schema, gate, release effect are off-spine owners | — |
| Existing capability reuse | Pass | `updateJsonFile` lock/atomic commit; existing queue/idle lifecycle | — |
| Reusable owned structures | Pass | lifetime types/reducers in projects/domain; neutral port in agent-collaboration | — |
| Data-model tightness | Pass | tagged `TaskExecutionReference`; strict input union | — |
| Repeated coordination ownership | Pass | one shared lifecycle for Agent/Team/Org roots | — |
| Empty indirection | Pass | — | — |
| SoC / file responsibility | Pass | — | — |
| Ownership-driven dependencies | Pass | projects imports only neutral agent-collaboration types | — |
| Authoritative Boundary Rule | Pass | tools call TaskService only | — |
| File placement / layout | Pass | — | — |
| Interface/command clarity | Pass with drag | LLM-facing contract overreaches | F02 |
| Naming | Pass | — | — |
| No unjustified duplication | **Fail** | inline copy of `resolveInRunRecipient` | F03 |
| Patch-on-patch control | Pass | — | — |
| Dead/obsolete cleanup | **Fail** | F03 dead helper; F01 committed generated output | F01, F03 |
| Tests clear / requirement-aligned | Pass with note | tests target dead helper | F03 |
| Fixtures coherent | Pass | CRR-023 | — |
| No stale tests | Fail (minor) | same as F03 | F03 |
| API/E2E readiness | Pass | API-REV-017 passed; fixes are text/dead-code/untracking → proportionate recheck | — |

## Source File Size And Structure Audit
| Source File | Effective Non-Empty Lines | >500 | >220 Delta | SoC | Placement | Classification | Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| agent-execution/domain/agent-run.ts | 496 non-comment (507 nonempty) | borderline, pre-existing (base 540 raw) | 32 | Pass | Pass | Pressure | split on next growth |
| backends/autobyteus/autobyteus-agent-run-backend-factory.ts | 485 | No | 50 | Pass | Pass | Pressure | watch |
| backends/shared/workspace-skill-materializer.ts | 440 (463 nonempty) | No | 133 | Pass | Pass | OK | — |
| agent-execution/services/agent-run-manager.ts | 350 raw | No | 299 (net −171) | Pass | Pass | OK (activation moved to `agent-run-activation-operation.ts`) | — |
| projects/services/project-task-service.ts | 273 raw | No | 125 | Pass | Pass | OK | — |
| other changed sources | ≤492 raw | No | — | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict
| Check | Result | Notes |
| --- | --- | --- |
| No backward-compat mechanisms | Pass | single current-array decoder |
| No legacy retention | Pass | unshipped converter removed |
| Dead/obsolete cleanup | **Fail** | F03 |
| Persisted-data decision (No Migration) followed | Pass | Project rows unchanged; optional collection |
| No dual reads/writes | Pass | — |
| Transition mechanics match design | Pass | downgrade over lifetime facts explicitly out of scope (stopped single writer) |

## Dead / Obsolete / Legacy Items Requiring Removal
| Item / Path | Type | Evidence | Why | Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-collaboration/collaborators/message-recipient-resolution.ts` → `resolveInRunRecipient`, `InRunRecipientResolution` | UnusedHelper | test-only callers | duplicated inline; tests certify non-production logic | reuse or remove; retarget 3 test cases |
| `agent-collaboration/execution/task/task-lifetime-operation-gate.ts` `count` / `drained` / `drain()` | UnusedHelper / DormantPath | no production `drain()` caller | state without consumer; design/code divergence | per designer decision (F05) |
| `RootTaskLifetimeScope.closed` / `fences` per-root cache | duplicate state owner | design forbids per-root duplicate fence | duplicates closure authority | per designer decision (F04) |
| `autobyteus-application-sdk-contracts/dist/**` (52), `autobyteus-application-backend-sdk/dist/**` (12) | ObsoleteFile (generated) | added in `028cca231`; absent on base | unrelated build output; drifts from src | `git rm -r --cached` both dirs |

## Docs-Impact Verdict
- Docs impact: Yes. Delivery has synced 8 docs (uncommitted). No synced doc quotes the F02 text. TESTING.md wording is the CAND-08 Delivery observation (non-blocking).

## Additional Material Premise Validation
None new or reclassified.

## Review Scorecard
- Overall: **8.8 / 10 (88 / 100)**, simple average; not the decision rule. Scored against design-principles.md and repo DESIGN.md.

| Priority | Category | Score | Why | Weakness | Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.2 | reserve-before-prepare, commit-then-seed explicit in one function | dense style | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 8.6 | Task authority and root release entry point clean; no dual-dependency bypass | closure has three holders (F04); membership has two sources (F07); a business service owns a runtime latch | F04, F07 |
| 3 | API / Interface / Query / Command Clarity | 8.7 | strict union, tagged refs, compact DTOs | LLM contract states platform mechanics | F02 |
| 4 | Separation of Concerns and File Placement | 8.9 | sensible placement | `ProjectTaskService` combines Task metadata, the lifetime port and runtime-gate ownership; gate class sits in agent-collaboration but is owned by projects | F04, F06 |
| 5 | Shared-Structure / Data-Model Tightness | 8.8 | invariant-validated lifetime/link model on every write | duplicate closure/membership representations (F04, F07) | F04, F07 |
| 6 | Naming Quality and Local Readability | 8.8 | accurate names | very long single lines/chained ternaries in `project-task-service.ts`, `root-task-lifetime-scope.ts`, `project-state-schema.ts` | optional reformat |
| 7 | API/E2E Readiness | 9.0 | API-REV-017 Pass; scoped 143/143 green | fixes need proportionate recheck | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.2 | no supported-scenario defect on traced spine | provider internals not re-traced this round | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.0 | clean no-migration realization | — | — |
| 10 | Cleanup Completeness | 7.6 | — | F01, F03, unused gate machinery F05 | fix F01/F03/F05 |

## Findings
### CR24-F01: Generated SDK `dist/` output committed to the ticket branch (Local Fix, Medium; finalization blocker)
- Contract: CT-REPO / CR24-CAND-01.
- Evidence:
  - 64 files added by DR-001 checkpoint `028cca231`, listed in `code-review-evidence/crr-024/committed-dist-files.txt`.
  - origin/personal tracks no `dist/` for either package. Both build `dist` with `tsc`, and their `main`/`types` resolve there.
  - Unrelated to Project Tasks.
  - CRR-022 reviewed HEAD `028cca231` and excluded "generated/dist" only from size checks, without flagging their presence (review gap).
- Consequence: the final merge would add unreviewed generated artifacts to origin/personal. They go stale against `src`, and workspace consumers can silently use outdated contract code.
- Action: `git rm -r --cached autobyteus-application-sdk-contracts/dist autobyteus-application-backend-sdk/dist` and commit before finalization. No source or test change.

### CR24-F02: Platform lifecycle mechanics in the shared delegate_task / collaboration LLM contract (Local Fix, Low–Medium)
- Scenario: SCN-011 / CR24-CAND-02 (REQ-013, AC-014, DEC-007; design Final File Mapping and SR-014 tool-description rule).
- Evidence: `agent-collaboration/domain/agent-team-collaboration-llm-contract.ts` adds two passages:
  - delegate_task description: "Task-owned follow-on copies inherit the lifetime. DONE permanently fences and releases all owned copies/helpers, not the Manager, borrowed runs, other Tasks or durable files."
  - Collaboration instruction rendered for every Team member: "Task-owned workers reuse lifetime-local helpers before borrowing existing unowned runs; helpers inherit ownership."
- Consequence: the Manager's tool context carries the platform/lifetime explanation that SD-AP-002 removed from agent.md. Every unrelated agent run also pays tokens for internal mechanics.
- Action: keep the work-source rule ("task_id alone … / description required without task_id …") and the business note that run-ID follow-up is rejected after its Task is DONE. Remove the inherit/fence/release/helper-ownership sentences. Update any unit assertions that pin the exact text.

### CR24-F03: Superseded `resolveInRunRecipient` retained as a test-only duplicate (Local Fix, Low)
- Contract: CT-CLEAN / CR24-CAND-03.
- Evidence: `resolveMessageRecipient` now inlines the own-instance loop and the run-wide lookup. `resolveInRunRecipient` has zero production callers, while `tests/unit/agent-collaboration/collaborators/message-recipient-resolution.test.ts` still exercises it. Its JSDoc ("Steps 1–2 of DS-002") describes code that no longer runs.
- Action: either call `resolveInRunRecipient` from `resolveMessageRecipient` for the instance step, or remove it and move its three assertions onto `resolveMessageRecipient`.

### CR24-F04: Lifetime-closure state has three holders (Design Impact)
- Contract: CT-OWN / CR24-CAND-09. The design's Reusable Owned Structures row requires "Shared no-escape/close/drain semantics; **no per-root duplicate fence implementation**". Design-principles P3 requires each fact to have one owner, and DESIGN.md §3 says to avoid duplicate state owners.
- Evidence: the closure fact is held in three places.
  - Durable `completedAt` in ProjectState.
  - `TaskLifetimeOperationGate` instantiated privately in `ProjectTaskService` (`project-task-service.ts:51`). It is closed in the commit callback (114), `assertOpen` (185) and `assertClosed` (191).
  - Per-root `RootTaskLifetimeScope.closed` Set and `fences` Map (`root-task-lifetime-scope.ts:8-9`, set at 18 and 56, read at 16 and 25-27).
- Consequence: no single runtime owner for "is this lifetime closed". Each new input/restore/release path must remember to consult the right holder, and the business Task service owns a runtime admission latch, mixing business authority with runtime admission.
- Required design response: name one runtime closure owner (e.g. a root-neutral lifetime gate owned at the runtime side and fed by the Task boundary's durable closure), make the others derive from it, and remove the duplicate per-root cache. Synchronous input checks must keep working, so exactly one in-memory synchronous latch is legitimately needed (input fences run synchronously while durable closure is read asynchronously). The simplification is "durable fact + one latch", not zero latches.

### CR24-F08: Unnecessary `delivered` rewrite on every accepted message (Design Impact — unnecessary work; simplification)
- Contract: business meaning of `delivered` (BEH-005 / AC-002 / design §SR-014: `delivered` → business "accepted" means the worker accepted its initial work; for a seedless lifetime helper, its first ordinary message proves delivery). DESIGN.md rule 5 / §6: remove unnecessary work before adding complexity.
- Evidence:
  - `RootTaskExecutionLifecycle.withLiveLease(agentRunId, op, recordMessage = true)` calls `recordMessageAccepted` after every accepted operation. It records `delivered` for the agent's chain link via `ProjectTaskService.recordDispatch`, which always performs a locked whole-file `projects.json` rewrite, even when the link is already `delivered`.
  - Each Task-owned `send_message_to` passes through two leases: the outer sender lease (e.g. `root-team-run.ts:323`, `agent-org-run.ts:226`, `standalone-agent-run-root.ts:270`) and the inner target lease (e.g. `team-run-message-delivery.ts:67,82`).
  - Result: ordinary Task-team messaging writes the Projects file twice per message, including for the sender's own already-delivered link.
- Consequence: durable writes with no business purpose. The repeat writes change nothing a business reader sees, and they couple every inter-agent message to the Projects store.
- Required response: record `delivered` only on the first transition (seed acceptance, or a helper's first accepted message). Drop the per-message recording from the sender lease. Make `recordDispatch` a no-op when the state is unchanged, or skip calling it when the link is already `delivered`.

### CR24-F05: Unused admitted-count/drain machinery; design and code disagree on the DS-003 drain (Design Impact)
- Contract: CT-OWN / CR24-CAND-10; DESIGN.md rule 5 ("New owners/state must have concrete responsibilities and lifecycle semantics"); design-principles Derived Checks ("Removal is first-class").
- Evidence: `TaskLifetimeOperationGate` maintains `count`, a `drained` set and `drain()`, but no production caller invokes the gate's `drain()`. The DS-003 narrative and the gate's Ownership Map row promise that release "drains finite admitted continuations". `RootTaskLifetimeScope.release` instead cancels registered/owned executions and force-releases them.
- Consequence: state with no consumer. Either the drain step is unnecessary (remove it from design and code) or it was intended and never wired.
- Required design response: decide. Prefer removing count/drain if cancel + exact force release is the real guarantee, and update DS-003/Ownership Map to match.

### CR24-F06: Two-way Projects ⇄ runtime-root dependency with repeated service-locator defaults (Design Impact)
- Contract: CT-DEP / CR24-CAND-11. Design Dependency Rules: "Task service implements injected port; root construction binds it at composition boundary." Design-principles: dependency direction follows ownership; name allowed directions and forbidden shortcuts.
- Evidence:
  - `projects/services/project-task-service.ts` imports the runtime gate class.
  - `projects/runtime/project-task-runtime-release.ts` imports and calls the `getActiveCollaborationRootDirectory()` singleton as its default.
  - Runtime subsystems import `getProjectTaskService()` as a `??` default in `team-root-materializer.ts:1,123`, `agent-org-execution-scope-builder.ts:1,191` and `standalone-root-builder.ts:1,135`.
- Consequence: the two subsystems depend on each other in both directions. The lifetime-port binding is duplicated in three runtime builders rather than made once at a composition root. The Task service reaches a global runtime registry directly, and the allowed direction is not enforceable.
- Required design response: one composition point binds the lifetime port into roots and the release request into the Task service. Runtime subsystems stop importing Projects, and the gate/neutral types live with the owner chosen in F04.

### CR24-F07: Lifetime membership has two sources of truth (Design Impact)
- Contract: CT-OWN / CR24-CAND-12. Design-principles P3: "If a concern has no clear owner, the boundary is wrong."
- Evidence: durable link records (Task service) and stamps in root execution trees (root index) both describe membership. `RootTaskLifetimeScope.release` unions `requested` durable refs, `registeredActivations` and `ownedExecutions` (stamps), then reports only the durable subset. Admission cross-checks the two (`dispatchTaskCopy` link/stamp comparison, `assertExecutionLinked`).
- Consequence: neither record is the sole membership authority. Release correctness relies on the union, and some executions can be stopped without appearing in Task diagnostics. Every future membership change must update both records consistently.
- Required design response: state which record is authoritative for membership and how the other is derived or reconciled. Alternatively, keep both but document the reconciliation contract and diagnostics visibility explicitly (the no-cross-store-lock rule may justify keeping both).

## Classification
**Design Impact** (F04–F08: ownership/authority, dependency direction and unnecessary work, where design and implementation disagree or the design leaves the authority implicit). F01–F03 are bounded **Local Fixes** carried in the same package, so the revised implementation round handles all seven.

## Recommended Recipient
- `/solution_designer` (Design Impact rule). The designer revises the ownership/dependency sections of the design (closure owner, drain decision, composition root, membership authority), then routes implementation, including F01–F03, through the normal reviewed route: architecture review as applicable → implementation → source re-review → API/E2E.
- The user explicitly authorized this routing on 2026-10-05 ("Send to Solution Designer").

## Residual Risks
- Provider-private teardown was not independently re-traced this round. CRR-022 and API-REV-017's controlled evidence remain its basis. Paid per-actor PID/IO proof remains Not Tested.
- Internal cleanup records stay `pending` (`TASK_ROOT_RELEASE_UNAVAILABLE` / `EXACT_RELEASE_AUTHORITY_UNAVAILABLE`) when the root or host Team is no longer registered, e.g. after a server restart or an idle-shut-down owned host. This is truthful and has no business impact, but such records never self-resolve to `released`.
- DR-002's five-commit refresh has not been rebuilt into a packaged app, as the handoff summary already states.

## Latest Authoritative Result
- Review Decision: **Fail — Design Impact** (F04–F08), plus Local Fixes F01–F03
- Review Entry Point: Implementation Review (independent, user-requested)
- Supported Product Scenario Gate: Pass
- Material-Premise Gate: Pass (none new)
- Score Summary: 8.8/10 (88/100). Cleanup 7.6, Ownership 8.6, API/Interface 8.7, Shared-structure 8.8, Readability 8.8, SoC 8.9; others ≥9.0.
- Recommended Recipient: `/solution_designer` (user-authorized)
- Notes: no runtime-correctness defect found in the traced business spine. CRR-022 Pass 9.20, CRR-023 test Pass and API-REV-017 Pass95.00 remain historical results on their own scopes; this round adds findings and does not invalidate their executable evidence.

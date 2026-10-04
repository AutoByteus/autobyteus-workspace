# Design Review Report — standalone-agent-run-root

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/requirements-doc.md` (Approved, SR-002; SR-005 added factual workspace and terminology notes only)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/investigation-notes.md` (E-01–E-21)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/solution-revision-record.md` (SR-001–SR-005)
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed: predecessor UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (VIS-013, RD-004). Unchanged.
- Relevant Solution Revision IDs: SR-002 (requirements basis), SR-004 (design passed in ARCH-REV-002), SR-005 (base refresh, deltas D-R1–D-R7)
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3 (delta review)
- Trigger: SR-005. The branch was rebased from `2d3b66005` onto `origin/personal` @ `b37d7a934`, and the design was revised with deltas D-R1–D-R7.
- Prior Review Round Reviewed: Round 2 (`ARCH-REV-002`, Pass on SR-004)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `codex/standalone-agent-run-root`, head `b26f6436c` on base `b37d7a934`. Code read this round:
  - `agent-execution/services/agent-run-identity-allocator.ts`. Its options are now only `agentDefinitionService?` and `createToken?`.
  - The allocator's construction sites: `application-execution-scope-kernel-builder.ts:146` and `general-process-run-supervisor.ts:212`. Both inject `agentDefinitionService` only.
  - `tests/architecture/application-framework-boundaries.test.ts:356-364`. The AFB-004 obligation still requires `agentRunManager`, `agentRunMetadataService`, `teamRunExecutionTreeLocationService` and `memoryDir`.
  - The same test at lines 2029–2121 (tool-registration readiness). The expected `agent-tool-loader.ts` spec list lacks `project_tasks`.
  - `startup/agent-tool-loader.ts:46`. Upstream `560a51129` registers `registerProjectTaskTools` through the single readiness owner, as the first `serverOwnedSpecs` entry.
  - `git diff -M origin/personal HEAD` over the four relocated integration files under `tests/integration/standalone-agent-run-root/`.
  - `agent-execution/prompt/standalone-collaboration-instruction.ts`. It imports and renders `WORK_REQUEST_EXECUTION_LLM_INSTRUCTION` under "Work Requests and Outcomes".
  - A search for `containsRunId` in server `src` and `tests` found no references.

## Routing Classification Review

- Task size: `Large`. Architectural risk: `High`. Both unchanged and still justified: SR-005 alters neither the ownership refactor nor its blast radius.
- Independent Architecture Review required: `Yes`. The selected gate is consistent.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`.
- The approved intent (SR-002) is unchanged. The SR-005 edits to `requirements-doc.md` are factual: the new base, and "Daily Assistant" now being "General Agent" (ID `autobyteus-daily-assistant`). Neither changes a REQ or AC.
- Eligibility does not depend on the definition name (E-18). The REQ-001 blast radius is therefore the same set of runs.
- The upstream changes in the new base do not alter any BEH path in the design's map:
  - Identity allocation (E-16) sits before root ownership and never touched the binding, the root or the coordinator.
  - The instruction's work-request section (E-17) is additive text that REQ-005 builds on.
  - The web drift (E-19) does not touch the REQ-007 or REQ-008 owners. I relied on E-19 for this and did not re-read the web diff.

| BEH | Alignment | Evidence | Target Path | Status | Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001 Standalone command | Pass | Pass | Pass (unchanged since ARCH-REV-002) | Confirmed | — |
| BEH-002 Child → host | Pass | Pass | Pass | Confirmed | — |
| BEH-003 Stop/delete/archive/shutdown | Pass | Pass | Pass. In the fixture, cleanup through `endRoot` and Stop through `stopRoot` match the design (D-R7). | Confirmed | — |
| BEH-004 Team collaborator agent | Pass | Pass | Pass | Confirmed | — |
| BEH-005 Self-delegation | Pass | Pass | Pass | Confirmed | — |
| BEH-006 Delivery text | Pass | Pass | Pass. REQ-005 is applied on top of the upstream work-request section (D-R2). | Confirmed | — |
| BEH-007 Token totals | Pass | Pass | Pass | Confirmed | — |
| BEH-008 Earlier events | Pass | Pass | Pass. The doc target moved to line 295 (D-R6). | Confirmed | — |
| BEH-009 Host label | Pass | Pass | Pass | Confirmed | — |
| BEH-010 Preserved | Pass | Pass | Pass | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose | Linked | Complete | Consistent | Status | Action |
| --- | --- | --- | --- | --- | --- | --- |
| Predecessor UI/UX spec (VIS-013, RD-004) | Pass | Pass | Pass | Pass | Pass (Approved, unchanged) | — |

## Task Design Health Assessment Verdict

Pass, unchanged:
- The root cause is a `Boundary Or Ownership Issue` plus `File Placement Or Responsibility Drift`, as in E-01–E-03.
- The refactor is required now.
- SR-005 adds no new root cause. The guard drift is a stale test inventory, not production design drift (see D-R3 below).

## Spine Inventory Verdict

All spines pass unchanged since ARCH-REV-002: DS-001–DS-006, plus the bounded host-readiness and lock-order spines. D-R1 removes nothing these spines used, because the design never called `containsRunId`.

## Boundary / Dependency / Interface Verdicts

Unchanged from ARCH-REV-002 (Pass). The SR-004 editorial note now names `AgentRunService`'s injected `StandaloneRunLifecyclePort`. This resolves the prior non-blocking dependency-rule note at the design level. Whether the code honors the rule is for code review to verify.

## SR-005 Delta Verdicts

| Delta | Verdict | Notes |
| --- | --- | --- |
| D-R1: no `containsRunId` | Pass | Verified absent from `src` and `tests`. Not reintroducing it is consistent with upstream's identity contract (E-16). No SR-004 decision depended on it. |
| E-16 effect on REQ-010 | Pass | Run creation no longer reads standalone packages, which removes one more read path. The REQ-010 "no change" classification (Q-4) is reinforced, not reopened. |
| D-R2: work-request section kept | Pass | Verified at the moved path. Because the shared contract's "return the result … to the requesting agent" relies on an addressable sender, REQ-005 is complementary. The prompt snapshots for REQ-005 must be layered on top of it. |
| D-R3: guard drift handled as REQ-009 maintenance | Pass | See the analysis below. |
| D-R4: 26 base failures out of scope | Pass (see residual risk) | Not fixing unrelated base failures is the right scope decision. The "same tests fail on a clean base" comparison must be by test identity, not count. |
| D-R5: terminology | Pass | Naming only. Eligibility does not depend on the name or ID. |
| D-R6: `chat.md` line 295 | Pass | — |
| D-R7: fixture ownership | Pass | See the analysis below. |

### D-R3 analysis: guard maintenance, not a boundary question

- **AFB-004, `AgentRunIdentityAllocator`.**
  - The guard's purpose (AFB-004) is "inject the named application-scoped dependency" at named construction sites.
  - After upstream `b5715ea5b`, the allocator's constructor accepts only `agentDefinitionService` (plus the `createToken` test seam).
  - Both production construction sites inject `agentDefinitionService`.
  - The four other required inputs name options that no longer exist. The obligation therefore cannot be satisfied by any correct code, so it is stale rather than revealing a violation.
  - Reducing `requiredInputs` to `["agentDefinitionService"]` keeps the rule at full strength for the allocator's only remaining application-scoped dependency.
  - It does **not** weaken the rule, provided the obligation entry stays and keeps requiring that input. Deleting the obligation entry would weaken the rule.
- **Tool-registration readiness, `registerProjectTaskTools`.**
  - The test's rule is "required tool registration stays behind the single lifecycle readiness owner".
  - Upstream `560a51129` registers project task tools *through* that owner (`agent-tool-loader.ts:46`), not around it. That is compliant, so the expected inventory is a stale snapshot.
  - Add `{ key: "project_tasks", name: undefined, modulePath: "../agent-tools/project-tasks/project-task-native-tools.js", exportName: "registerProjectTaskTools" }` to the expected list.
    - It goes in source order: after `core` and before `browser`.
    - The comparison is a strict `toEqual` on an ordered array.
  - The other assertions in that test (no direct `registerTools`, `registerProvisionedSearchTool`, or `loadAllAgentTools` callers) stay as they are.
- **Scope basis.**
  - REQ-009 already authorizes "the guard is updated deliberately with a recorded reason".
  - AC-009 requires the suite to be green, and the suite cannot be green on the new base without these two updates.
  - Neither update touches production code or the boundary model, so neither is a Requirement Gap or a new obligation.
  - D-R3's escape clause (a real violation → Design Impact) is the right safeguard. I found no evidence it applies.

### D-R7 analysis: fixture conflict resolution against the AC-001 gate

- Upstream's owned-resource cleanup is preserved:
  - the `close` aggregation and the setup-failure cleanup are kept;
  - the cleanup test's assertions and structure are unchanged (4 lines changed: import and spy target).
- The other changes are the API substitutions that AC-001 itself requires (`AgentRunCollaborationRootManager` must no longer exist):
  - `terminateRoot` → `endRoot`, for idempotent final cleanup;
  - `terminateRoot` → `stopRoot(...)` matched with `{ rootEnded: true }`, for user Stop;
  - `ensureRoot(metadata)` → `resolveRoot(HOST)`;
  - `resolveCommandReadyAgentRun` → `activateHost`/`terminateHost`;
  - the `getInstance` spy → `bind`/`releaseProcessStandaloneAgentRunRootManager`.
- The behavioral assertions are unchanged. This includes "dormant/stored reads never activate the host" (`restoreHost` not called), which is consistent with `resolveRoot` not starting the host.
- I read "pass unchanged" in AC-001 as "assertions and observable outcomes unchanged". It cannot mean "zero API edits", because AC-001 mandates the removal. This is consistent with ARCH-REV-002.
- Code review should still confirm that no assertion was relaxed in the other relocated predecessor tests. `native-root-termination` changed its wiring (17 lines), but not visibly its assertions.

## Existing Capability Reuse / Allocation / Structures / File Mapping / Placement

Pass, unchanged. The file-size target is still required: `standalone-agent-run-root.ts` is 413 lines and `standalone-agent-run-lifecycle-service.ts` is 450. This is remaining implementation work (E-21), not a design change.

## Removal / Legacy Verdict

Pass, unchanged. No `agent-run-collaboration/` or `containsRunId` references remain in server `src`/`tests` (E-15, verified).

## Persisted-Data Transition Verdict

Pass: `Not Affected`. The rebase changes no format. Upstream's identity change does not alter stored package or metadata shapes that this design reads.

## Change / Refactor Safety Verdict

Pass. A backup branch and a backup folder exist.

Remaining implementation order:
1. D-R3 guard maintenance, together with the model-save cause record, to get a green REQ-009 baseline;
2. the REQ-003 size target;
3. REQ-005–REQ-008;
4. the docs and live checks.

The escalation triggers are unchanged.

## Example Adequacy Verdict

Pass. D-R3 names both concrete inventory edits.

## Material Premise Validation

There are no new material premises in SR-005. P-001–P-003 from ARCH-REV-002 remain resolved or dispositioned.

The one candidate premise considered this round, *"the AFB-004 failure hides a real production injection violation"*, is `Not Reachable`:
- both construction sites inject the allocator's only application-scoped dependency;
- the stale inputs do not exist on the constructor type.

It drives no finding.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. The prior findings AR-001, AR-002 and AR-003 remain Resolved (ARCH-REV-002).

## Classification

N/A (Pass).

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- **Base-failure masking (D-R4).**
  - `agent-run-manager` has 16 base failures and sits on the REQ-001 host lifecycle path.
  - Downstream must compare failing *test names and failure messages* against the clean base, not counts.
  - A base-failing test that now fails differently is this branch's responsibility.
- **Upstream may fix the same guard drift.**
  - If `origin/personal` corrects the AFB-004 or readiness inventories before this branch merges, there will be a trivial conflict. Take upstream's version if it is equivalent.
  - Record the reason for each guard edit in the implementation handoff, as REQ-009 requires.
- **Model-save root cause.** The suite now passes on the branch, but the cause is unrecorded. If the cause turns out to be a production defect that changes behavior, it still returns as a Design Impact.
- **Unchanged since ARCH-REV-002:**
  - the REQ-001 blast radius (General Agent and every eligible run);
  - host activation under the root gate;
  - the REQ-005 header change on every runtime, with the web parser accepting both header forms.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. No new premises; one candidate is classified `Not Reachable`.
- Notes:
  - The SR-005 package, on base `b37d7a934`, is ready for the implementation engineer to finish the remaining E-21 work.
  - D-R3 is sound guard maintenance under REQ-009, provided the obligation entry is narrowed rather than deleted and the registration spec is added in source order.

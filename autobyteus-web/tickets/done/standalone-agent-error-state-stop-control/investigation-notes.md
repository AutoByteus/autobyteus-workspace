# Requirements Investigation Notes

## Investigation Meta

- Package identifier: `REQPKG-standalone-agent-error-state-stop-control-20260903`
- Request / ticket: Standalone agent error-state Stop control
- Workspace root: `/home/autobyteus/workspace/autobyteus-workspace`
- Repository mode: `Git`
- Task worktree / branch: `/home/autobyteus/workspace/autobyteus-workspace` / `req/agent-error-state-stop-control`
- Base or reference revision: `5fb16658e7bd2aefd750f99eb596a17382e161ac` (`docs(delivery): record v1.4.66 release completion`)
- Bootstrap result: Dedicated task branch created from the available workspace revision; working tree was clean before artifact creation.
- Bootstrap blocker: None.
- Current requirements revision ID: `RER-002`
- Investigation status: Requirements approved; readiness gate passed; Architecture Design Routing Assessment complete with `Approved Direct-Implementation` outcome.

## Initial Request And Clarifications

- Original request: “currently for independent or single agent run, when its in error state, there is no stop button. i think we need to have the stop button even in errors state … in error state, i can not terminate. i think this is incomplete.”
- Clarifications received: The user supplied two screenshots contrasting a standalone run in Error without Stop and a healthy standalone run with the small Stop control next to the relative time.
- User-supplied facts and constraints: Scope was stated as independent/single-agent runs. The requested control is the existing Stop/Terminate button; no redesign or Product Design & Prototyping request was stated.
- Initial ambiguity: “Error state” could mean either a still-managed current runtime reporting an error or an inactive historical record with past error evidence. Code evidence supports treating the reported current error case as still termination-eligible while excluding genuinely inactive history.

## Product And Domain Understanding

- Product area: AutoByteus Web workspace history/navigation for standalone agent runs.
- Affected actors or systems: User, standalone agent history row, live run context/status projection, existing termination action and backend managed-run lifecycle.
- Existing user or operational purpose: The left workspace history list is the supported place to locate, select, stop, archive, or delete runs according to their lifecycle state.
- Relevant terminology:
  - “Standalone,” “independent,” or “single-agent” run: an agent run outside an Agent Team execution.
  - “Error”: a displayed agent runtime status; it is not by itself proof that the managed runtime has been terminated.
  - “Termination-eligible”: the run is current/managed or otherwise still valid for the existing Stop workflow and has not been authoritatively confirmed inactive.
  - “Confirmed inactive”: the authoritative lifecycle no longer presents a manageable active run, including after confirmed successful termination.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Runtime`/`Data`/`Contract`/`Web`/`User`/`Command`/`Other`) | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-09-03 | User | Initial request in this thread | Establish desired outcome and scope | User explicitly wants Stop/Terminate available for independent/single-agent runs in Error. | Present bounded requirements for approval. |
| 2026-09-03 | User | Approval response “approve” in this thread | Capture explicit approval | User approved the bounded RER-001 behavior, including standalone-only scope, reuse of the existing Stop control, lifecycle truth, and exclusion of inactive historical error rows and Agent Teams. | Mark package approved, complete readiness and routing assessment, and hand off through configured rules. |
| 2026-09-03 | User | `/home/autobyteus/data/memory/agent_teams/software_development_department_03636d7482c04940987839d4fb0868a6/requirements_engineer_3bce6dff03fa4f379b8a458ec801ff6e/context_files/ctx_5e5231e89f96__image.png` (3024×1900; SHA-256 `db3f09f4de96b7937cbdfbc36cf2b09534439e820c7a8d4d0a9146004d8d19f1`) | Inspect reported error state | Selected standalone Codex row has a red status indicator; header says Error; Stop is absent; inactive-style row actions are visible. Conversation shows an access-token refresh error, but provider-specific text is not required behavior. | Treat names, timestamps, and error copy as illustrative. |
| 2026-09-03 | User | `/home/autobyteus/data/memory/agent_teams/software_development_department_03636d7482c04940987839d4fb0868a6/requirements_engineer_3bce6dff03fa4f379b8a458ec801ff6e/context_files/ctx_09ce9b073f2e__image.png` (720×1342; SHA-256 `f79da3cc4dea24924bb4c3684d29a5861ae35a3b2854ef57e8f7ac046afc5210`) | Compare healthy state | Selected standalone Daily Assistant row has a green indicator and the small square Stop control next to “now.” | Reuse existing control; no new visual design needed. |
| 2026-09-03 | Code | `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Identify row action rendering behavior | Standalone Stop renders only for `run.isActive`; inactive draft/history branches render removal/archive/delete actions. Stop click already isolates row selection and uses pending disablement. | Require truthful eligibility and mutually coherent actions. |
| 2026-09-03 | Code | `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | Trace current error-state projection | `AgentStatus.Error` is explicitly converted to `isActive: false`, overriding a matching persisted history row with live context. | Direct explanation for reported missing Stop. |
| 2026-09-03 | Code | `autobyteus-web/stores/runHistoryReadModel.ts` | Inspect local/current run projection | The shared local conversion also maps `Error` to inactive, whereas initializing/running/idle map active. | Error health and lifecycle eligibility are currently conflated in more than one frontend projection path. |
| 2026-09-03 | Code | `autobyteus-web/stores/agentRunStore.ts` lines 366–440 | Verify supported standalone termination behavior | Existing `terminateRun` validates backend success, tears down local runtime, marks history inactive only on success, and returns false on failure; temp runs stop locally. `closeAgent` reuses the same owner. | Preserve behavior; no new termination contract required by product request. |
| 2026-09-03 | Code | `autobyteus-web/composables/useWorkspaceHistoryMutations.ts`; `WorkspaceAgentRunsTreePanel.vue` | Verify UI orchestration and feedback | Existing row action has a per-run pending guard and shows a user-visible failure toast on false/exception. | Apply unchanged to error-state Stop. |
| 2026-09-03 | Contract | `autobyteus-server-ts/src/agent-execution/services/agent-run-status-projection-service.ts` | Determine whether Error is necessarily inactive | For a manager-owned active run, the server returns the runtime status (including `error`) with `isActive: true` and `shouldConnectStream: true`; error only changes `lastKnownStatus`. | Requirements distinguish status health from lifecycle activity. |
| 2026-09-03 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`; `agent-run-manager.ts`; Codex backend | Verify termination feasibility | Termination looks up a manager-owned active run, delegates runtime termination/cleanup, and records successful termination. Codex termination removes the managed thread. | No backend API change appears necessary; route formally only after approval. |
| 2026-09-03 | Test | `autobyteus-web/utils/__tests__/runTreeLiveStatusMerge.spec.ts` | Check encoded current behavior | Existing test explicitly expects an error live context to produce `isActive: false`, confirming the reported behavior is intentional in current projection code rather than a screenshot-only inference. | Expected test will need revision downstream if route is approved. |
| 2026-09-03 | Test | `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Check current Stop interaction coverage | Tests cover active Stop dispatch without selection, failure toast, and active/inactive action rendering, but not the standalone error-state visibility/success/failure matrix. | ACs require targeted error-state regression coverage. |
| 2026-09-03 | Command | `./node_modules/.bin/vitest run utils/__tests__/runTreeLiveStatusMerge.spec.ts components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` from `autobyteus-web` | Validate the inspected baseline | 2 files and 60 tests passed on the current base. Warnings were non-blocking (KaTeX quirks mode and stale Browserslist data). | Retain as baseline evidence; downstream runs revised tests. |
| 2026-09-03 | Command | `pnpm test:nuxt ... --run` | Attempt documented test command | Could not execute because `pnpm` is not installed on PATH; direct checked-in Vitest binary succeeded instead. | Not a requirements blocker. |
| 2026-09-03 | Doc | `autobyteus-web/tickets/history-run-termination-boundary-refactor/*` | Understand prior termination intent | Prior work established a single frontend termination owner, active-row Stop, exact-run pending lock, history preservation, failure feedback, and tests. | Preserve these boundaries; do not reopen architecture in requirements. |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | User views a current standalone run in Workspaces history and the run reports Error | The live context's Error status is merged into the row and also forces its `isActive` projection false; the row renders its red/error state but the `isActive`-gated Stop action disappears. For a persisted row, inactive archive/delete actions can appear. | User cannot invoke supported termination from this row even though a manager-owned error-status runtime can still be active. | Supplied error screenshot; `runTreeLiveStatusMerge.ts`; `WorkspaceHistoryWorkspaceSection.vue`; status projection service | High |
| BEH-002 | User | User activates Stop on a healthy active standalone row | Row action sends the exact run ID through the existing mutation workflow, blocks duplicate action while pending, does not select the row, marks inactive only on confirmed success, keeps history, and shows a failure toast otherwise. | Stop action is safe and already supports success/failure lifecycle semantics. | Healthy screenshot; panel/component/store code and passing tests | High |
| BEH-003 | Contract | Backend projects status for a manager-owned active standalone run | Manager-owned runtime status is returned independently from lifecycle flags; `status: error` may coexist with `isActive: true` and `shouldConnectStream: true`. | Error is not authoritative evidence of termination. | `agent-run-status-projection-service.ts` | High |

No current supported behavior lets the user Stop a termination-eligible error-state standalone row once the frontend live-context projection has hidden the Stop control. The desired behavior is an explicit extension of the supported BEH-002 workflow, not a new termination mechanism.

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question Deferred Downstream |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/WorkspaceHistoryWorkspaceSection.vue` | Renders standalone row status and mutually branches Stop versus inactive controls primarily from `run.isActive`. Stop uses a native button and stops click propagation. | Error-state termination eligibility must reach the rendering boundary without producing contradictory Stop/archive/delete actions. | Which existing view-model/lifecycle field should authoritatively drive eligibility is downstream-owned. |
| `autobyteus-web/utils/runTreeLiveStatusMerge.ts` | Overlays live context status on persisted history rows and currently sets Error to inactive. | Error health and lifecycle activity cannot remain conflated for the approved scenario. | Whether to preserve canonical row activity or evolve the view-model mapping is downstream-owned. |
| `autobyteus-web/stores/runHistoryReadModel.ts` | Builds persisted and local run projections; maps local Error to inactive. | Current/draft standalone error cases need consistent product behavior. | Exact projection-boundary correction is downstream-owned. |
| `autobyteus-web/stores/agentRunStore.ts` | Owns standalone termination, backend success validation, runtime cleanup, and history inactivity marking. | Reuse the existing observable termination contract; no new API behavior is authorized. | Downstream verifies whether any eligibility source is missing; requirements do not prescribe structure. |
| `autobyteus-web/composables/useWorkspaceHistoryMutations.ts` | Owns per-run pending UI guard and termination failure toast for the history panel. | Existing pending and feedback behavior applies to the new error-state entry. | None expected beyond implementation mapping. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-status-projection-service.ts` | Projects an active managed runtime with `isActive: true` regardless of whether its health status is `error`. | Supports the requirement that Error does not itself mean stopped. | No contract change requested; downstream should preserve this semantic. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` and `agent-run-manager.ts` | Terminate only a manager-owned active run, then record termination. | Stop must remain available only while the run is truthfully termination-eligible; failure must not be treated as success. | None unless implementation discovers current frontend lacks enough authoritative state. |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: No new or changed payload/content is requested. Existing localized Stop and failure-toast strings are intended to be reused.
- Existing readers, writers, or contracts that consume them: Workspace history UI and existing localization catalog.
- Evidence paths: `WorkspaceHistoryWorkspaceSection.vue`; `useWorkspaceHistoryMutations.ts`; localization keys referenced by those components.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: Frontend standalone run view-model/status projection, history row conditional actions, existing termination store/composable boundary; backend status/termination contracts consulted as evidence.
- Existing structural surfaces that can support the approved behavior: Existing `RunTreeRow` contains `currentStatus` and `isActive`; existing Stop action, pending lock, mutation result handling, toast, and backend managed-run termination already exist.
- Evidence paths: `runTreeProjection.ts`, `runTreeLiveStatusMerge.ts`, `runHistoryReadModel.ts`, `WorkspaceHistoryWorkspaceSection.vue`, `useWorkspaceHistoryMutations.ts`, `agentRunStore.ts`, backend status projection and termination service.

### Potential Architecture-Design Triggers

- API or external-contract change: No requirement calls for one; existing contracts appear sufficient.
- Persistence schema or invariant change: None requested or evidenced.
- Security or privacy boundary change: None.
- Concurrency or lifecycle change: Product behavior extends an existing lifecycle action into a currently misclassified health state. The termination contract and pending semantics are to remain unchanged; formal structural-impact classification is deferred until after approval.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: None requested or currently evidenced.
- Confirmed absent, present, or unknown: Preliminary evidence suggests a bounded frontend status/eligibility correction using existing boundaries. Formal routing assessment is intentionally pending user approval.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| Visual comparison of supplied screenshots | Error versus healthy standalone row | Error row lacks Stop while healthy row shows it next to time; error row remains selected and exposes an error card. | The missing control is user-visible and state-specific. | Two supplied PNG paths in Supplemental Artifact Inventory |
| Source-supported state trace | Live standalone context changes to `AgentStatus.Error` | Live merge converts Error to inactive, and row conditional no longer renders Stop. | Desired behavior must separate status display from termination eligibility. | `runTreeLiveStatusMerge.ts`; `WorkspaceHistoryWorkspaceSection.vue` |
| Targeted Vitest baseline | Existing projection and workspace history behavior | 60/60 tests pass; one test explicitly codifies Error→inactive and other tests cover existing Stop safety/failure. | Downstream must revise/add coverage rather than relying on an untested visual change. | Command recorded in Source Log |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Requesting user | Must be able to Stop an independent/single-agent run even when it is in Error. | Direct and explicit | REQ-001 is mandatory. | Approval of the bounded interpretation. |
| Requesting user screenshots | Existing row control location/pattern is adequate; only error-state availability is incomplete. | Direct visual current-state evidence | Reuse existing control and preserve error display. | None material. |
| Existing product behavior | Stop is a non-selecting exact-row action with pending guard and failure feedback. | Code and test evidence | Preserve BEH-002 across error state. | None material. |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| GraphQL `terminateAgentRun` | Current repository contract at base revision | Returns success/message; UI must validate success before marking inactive. | Frontend mutation/store; backend resolver/service | No change authorized. |
| Server active-runtime status projection | Current repository contract at base revision | Error health can coexist with active/reconnectable lifecycle. | `agent-run-status-projection-service.ts` | Frontend overlay currently contradicts lifecycle truth. |
| Vue native button semantics | Existing component pattern | Error-state Stop should retain keyboard operation, tooltip/accessible label, and disabled pending state. | `WorkspaceHistoryWorkspaceSection.vue` | No new dependency. |

## Persisted Data And State Facts

- Affected stored or external subject: Existing agent run history metadata/catalog only insofar as current termination already records success.
- Location and representative shape: `RunHistoryItem` contains `runId`, `status`, `isActive`, timestamps, and termination metadata; `RunTreeRow` adds current presentation fields.
- Approximate volume: Not relevant to a per-row UI behavior; no bulk operation.
- Current readers and writers: Backend run history/status services; frontend run history store/read model/tree projection; termination store action.
- Current unknown/extra-field behavior: Not applicable.
- Required semantics or data that must be preserved: History row and content persist through termination; only confirmed success changes lifecycle presentation.
- Acceptable loss, reset, rebuild, or regeneration: No new loss, reset, or migration authorized.
- Privacy, retention, compliance, downtime, or operational constraints: None identified.
- Remaining evidence gap: None material to requirements. Downstream must verify authoritative eligibility state in implementation tests.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- User's requested outcome, in the user's own terms: Have the Stop/Terminate button for an independent/single-agent run even when it is in Error.
- Requirement / behavior IDs involved: BEH-001, BEH-002; REQ-001–REQ-007.
- Product decision, uncertainty, or experience to understand or evolve: No separate design exploration requested; the desired experience reuses the existing healthy-state row action.
- Critical journey and states: Error/termination-eligible → Stop pending → success/inactive or failure/error/retryable.
- Known constraints and non-goals: Standalone runs only; no error recovery redesign, no Agent Team change, no new Stop location.
- Relevant existing-product or frontend context supplied or established: Paired screenshots and current workspace history row implementation.
- Product Design request artifact / message reference: N/A — not requested.
- Established separate prototype repository/root and ticket reference, when applicable: N/A — not applicable.

## Product Design Findings

- Product Design package path (external Product Design & Prototyping repository): N/A — not requested.
- Visualizer or prototype source path: N/A — not applicable.
- Approved UI/UX specification path, when applicable: N/A — not applicable.
- Review URL: N/A.
- Explicit user-confirmation reference: No Product Design package applies; requirements approval was recorded from the user's “approve” response on 2026-09-03.
- Journeys and scenarios validated: N/A through Product Design; requirements scenarios supported by direct user evidence.
- Final visual-reference paths: N/A; supplied screenshots are current-state evidence, not future normative prototypes.
- Product decisions supported by evidence: Reuse the existing row-level Stop control in the error state.
- Alternatives rejected or still open: A new header-level Stop button or broader row redesign is out of scope.
- Mocked boundaries and production gaps: N/A.
- Requirements sections affected: UI, Interaction, And Experience Requirements; REQ-001, REQ-006, REQ-007.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_03636d7482c04940987839d4fb0868a6/requirements_engineer_3bce6dff03fa4f379b8a458ec801ff6e/context_files/ctx_5e5231e89f96__image.png` | User | Current Error-state visual evidence | Standalone row and conversation header | REQ-001, REQ-006 / AC-001 | Retained evidence | Informational; not normative future UI |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_03636d7482c04940987839d4fb0868a6/requirements_engineer_3bce6dff03fa4f379b8a458ec801ff6e/context_files/ctx_09ce9b073f2e__image.png` | User | Current healthy-state Stop comparison | Existing standalone row control | REQ-001, REQ-007 / AC-001, AC-007 | Retained evidence | Informational; not normative future UI |

## Assumptions, Unknowns, And Risks

| ID | Type (`Assumption`/`Unknown`/`Risk`) | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| ASM-001 | Assumption | “Independent/single agent” excludes Agent Team runs and member executions. | Prevents unrequested team behavior changes. | User approval / Requirements Engineer | Accepted by approval on 2026-09-03 |
| ASM-002 | Assumption | Existing row Stop is the desired control and no new location is required. | Avoids unnecessary UI design. | User approval / Requirements Engineer | Accepted by approval on 2026-09-03 |
| ASM-003 | Assumption | Only current/managed or otherwise termination-eligible Error rows should show Stop; past Error evidence on confirmed-inactive history is insufficient. | Preserves truthful lifecycle actions. | User approval plus downstream verification | Accepted by approval on 2026-09-03; verification pending |
| RISK-001 | Risk | A simplistic UI condition based only on displayed `Error` could expose Stop for a genuinely inactive historical row. | Would create repeated “not found” failures and misleading UI. | Downstream must use or preserve authoritative lifecycle eligibility and cover AC-006. | Mitigated by requirements |
| RISK-002 | Risk | Adding Stop without maintaining mutual exclusion could leave archive/delete visible beside it. | Contradictory/destructive actions could be offered for a current runtime. | AC-001, AC-005, and REQ-006. | Mitigated by requirements |

## Requirement Implications

- The defect is not merely missing icon rendering: frontend projections currently use Error as if it were confirmed inactivity, while the backend active-runtime contract keeps lifecycle activity independent from status health.
- Requirements therefore define a termination-eligibility outcome rather than requiring Stop for every historical error record.
- Existing exact-run termination, pending guard, history preservation, failure toast, and native button pattern are stable behavior to reuse.
- Product-visible scope is limited to standalone run rows; error cause/recovery and Agent Teams remain unchanged.

## Notes For Downstream Architecture Design Or Direct Implementation

- Approved product scenarios: SCN-001 and SCN-002.
- Preserve the product-level sequence: current Error row remains visibly errored and offers Stop → exact-run pending state → confirmed success makes it inactive, or failure leaves it errored and retryable with a toast.
- Verified current fact: the backend already distinguishes an active managed runtime from its Error status. The frontend live-context/read-model conversion and row `isActive` conditional are the observed mismatch.
- Verify all standalone sources represented by current context/history projection, including draft/local versus persisted rows, without expanding scope to Agent Teams.
- Do not introduce a new termination API, persistence change, automatic stop, error-recovery behavior, or visual redesign without a requirement revision.
- Architecture Design Routing Assessment completed after approval: preliminary `Small` task size, `Low` architectural risk, no structural-impact trigger found, direct Implementation Engineer route selected. This is a requirements-owned preliminary route, not a final architecture classification.

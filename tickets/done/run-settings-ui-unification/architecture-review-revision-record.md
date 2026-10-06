# Architecture Review Revision Record — run-settings-ui-unification

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-10-05) | SR-006, SR-007 | N/A | Fail | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / revised design (SR-008) | SR-006, SR-008 | Fail | Pass | AR-001..AR-004 resolved |
| ARCH-REV-003 | Round 3 / revised design after CRR-002 CR-001 (SR-009) | SR-006, SR-009 | Pass | Pass | None (CR-001 design coverage verified) |
| ARCH-REV-004 | Round 4 / revised design after CRR-004 DI-001..DI-006 (SR-010) | SR-006, SR-010 | Pass | Pass | None (DI-001..DI-006 decisions verified) |

## Revision Entries

### ARCH-REV-001 — Initial review baseline: first-message mention eligibility gap

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/design-review-report.md`
- Review round and trigger: Round 1. `Architecture Design Complete` from `/software_engineering_team/solution_designer` (`architecture-handoff.md`).
- Triggering role, report path, and finding IDs: Solution Designer; `architecture-handoff.md`; N/A.
- Relevant solution revision IDs: SR-006 (requirements), SR-007 (design).
- Prior authoritative decision: N/A.
- Current authoritative decision: `Fail` (Design Impact).
- What changed in the review result or what baseline was established:
  - The behavior basis is confirmed, and the classification (Large/High) is confirmed.
  - The ownership model, removal plan, persisted-data decision and spine inventory pass.
  - One blocking issue was found. For a Team target, the New chat `@` candidates diverge from the server's admission eligibility. The rejection then happens after the Team run is launched (AR-001, premise P-001 Reachable).
  - Three low-severity clarifications were found: the tree "+" entry point (AR-002), the ⚙ on a failed `temp-*` context (AR-003), and the workspace-shape conversion boundaries (AR-004).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Medium, blocking), AR-002 (Low), AR-003 (Low), AR-004 (Low).
- Material classification changes: N/A.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - AF-009 still needs API/E2E proof.
  - P-002 is Not Reachable, so no rejection-recovery machinery is required.
  - Org schema-state gating is removed in favor of server authority.

### ARCH-REV-002 — Re-review after SR-008: all findings resolved

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/design-review-report.md`
- Review round and trigger: Round 2. `Architecture Design Complete (revised)` from `/software_engineering_team/solution_designer` (`architecture-handoff.md` §Re-review (SR-008)).
- Triggering role, report path, and finding IDs: Architecture Reviewer, ARCH-REV-001 report; AR-001..AR-004, R-1, R-2.
- Relevant solution revision IDs: SR-006 (requirements, unchanged), SR-008 (design revision).
- Prior authoritative decision: `Fail` (ARCH-REV-001).
- Current authoritative decision: `Pass`.
- What changed in the review result: every finding was verified against the current `design-spec.md`, the investigation notes (AF-013..AF-016) and the code. The basis and classification are unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium, blocking) | Resolved | SR-008; design §Off-Spine Concerns, §Guidance; AF-013/014 | The rule mirrors `collaborator-candidate-policy.ts` (shared scope, built-ins excluded, root + recursive tree placements excluded). The built-in ids match `built-in-agent-registry.ts:5-7`. Frontend `sharedAgentDefinitions` filters on ownership scope, and team `nodes`/`ref` are available. Example, unit and API/E2E tests are specified. P-002 is Not Reachable, so no machinery is added. |
| AR-002 | Open (Low) | Resolved | SR-008; §Interface Boundary Mapping, §Boundary Encapsulation Map; AF-015 | `newChatInWorkspace` keeps the `startNewChat(preset)` rule. `WorkspaceAgentRunsTreePanel.startPresetChat` is a listed caller. |
| AR-003 | Open (Low) | Resolved | SR-008; §Risks, §Removal Plan; AF-016 | ⚙ is hidden via `isTemporaryRunId` in the `AgentWorkspaceView` header (ungated today at `AgentWorkspaceView.vue:79`). The notice and retry are kept, with a test. |
| AR-004 | Open (Low) | Resolved | SR-008; §Workspace Representation Conversion Boundaries | Converters are named in `runWorkspaceChoice.ts` with their only callers. Views and `runMemberTree` are kept free of the older shapes. |
| R-1 | Recommendation | Adopted | §Guidance (saved runs) | `reloadCanonical` re-runs the existing loader. |
| R-2 | Recommendation | Adopted | investigation-notes inventory | The Product package is listed as Final and user-confirmed. |

- New or remaining finding IDs: none.
- Material classification changes: none (Large/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - AF-009 API/E2E proof is still required.
  - The frontend built-in id mirror needs manual upkeep.
  - Org schema gating is replaced by server authority.

### ARCH-REV-003 — Re-review after SR-009: Agent "+" copy subject for collaborator views

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/design-review-report.md`
- Review round and trigger: Round 3. `Architecture Design Complete (revised)` from `/software_engineering_team/solution_designer` (`architecture-handoff.md` §Re-review (SR-009)), answering Code Review CRR-002 CR-001 (Design Impact).
- Triggering role, report path, and finding IDs: Code Reviewer, `code-review-report.md` (CRR-002); CR-001 (Design Impact). CR-002 and CR-003 are Local Fixes.
- Relevant solution revision IDs: SR-006 (requirements, unchanged), SR-009.
- Prior authoritative decision: `Pass` (ARCH-REV-002).
- Current authoritative decision: `Pass`.
- What changed in the review result:
  - Verified that `copyAgentFromConfig(config: AgentRunConfig)` restores the base copy subject, the agent on screen (host, collaborator child, or a team-member collaborator's member agent), and adds the REQ-013 settings copy.
  - Child configs carry the required fields (`createChildContext`).
  - The boundary and dependency rules hold.
  - The CR-002/CR-003 guidance matches the design rules.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001..AR-004 | Resolved (ARCH-REV-002) | Still resolved | SR-008, SR-009 | Unaffected by the SR-009 delta |
| CR-001 (code review, Design Impact) | Open in CRR-002 | Design coverage verified; implementation pending | SR-009; design §Interface Boundary Mapping, DS-003, §Conversion Boundaries, §Guidance; AF-017 | Base `AgentWorkspaceView.startNewChatForRun` used `target.context.config`. Child contexts live in `agentRunCollaborationStore`, and their configs hold model, `llmConfig`, approval and workspace. A test is specified. |

- New or remaining finding IDs: none.
- Material classification changes: none (Large/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - The AF-009 API/E2E proof is still required.
  - The built-in id mirror needs manual upkeep.
  - A child with unresolved workspace metadata copies to the temp workspace, as at base.

### ARCH-REV-004 — Re-review after SR-010: CRR-004 design-improvement decisions

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-settings-ui-unification/tickets/in-progress/run-settings-ui-unification/design-review-report.md`
- Review round and trigger: Round 4. `Architecture Design Complete (revised)` from `/software_engineering_team/solution_designer` (`architecture-handoff.md` §Re-review (SR-010)).
- Triggering role, report path, and finding IDs: Code Reviewer, `code-review-report.md` (CRR-004); DI-001..DI-006, raised at the user's direction.
- Relevant solution revision IDs: SR-006 (requirements, unchanged), SR-010.
- Prior authoritative decision: `Pass` (ARCH-REV-003).
- Current authoritative decision: `Pass`.
- What changed in the review result: verified design-spec §"SR-010 Addendum" against the code at `c37b81de5` and the evidence (AF-018..AF-020).
  - DI-001: the AppLeftPanel bypass is confirmed and closed by `useRunStart.newChat()`; `RemoteAgentCard` is unrendered.
  - DI-002: deferring the server query is correct, since it is a server API change needing approval; the contract checks are adopted.
  - DI-003: AF-009 is retired by server unit and live N02/N03 evidence.
  - DI-004: one readiness rule, with no new policy or copy.
  - DI-005: slices map to ACs.
  - DI-006: accept/adopt/defer decisions are proportionate and justified.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001..AR-004 | Resolved | Still resolved | SR-008..SR-010 | AR-001 is now also live-proven (N03 `@` list matches the server policy, AF-020) |
| CR-001 (code review) | Design coverage verified (ARCH-REV-003) | Implemented at `c37b81de5` (IR-002); design unchanged | SR-009, SR-010 DI-001 audit row | Audit row: Agent header "+" → `copyAgentFromConfig(target.context.config)` |
| DI-001..DI-006 (code review CRR-004) | Raised | Design decisions verified | SR-010 Addendum; AF-018..AF-020 | See the report's Round 4 Assessment |

- New or remaining finding IDs: none.
- Material classification changes: none (Large/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`; informational notice to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - The client `@` mirror remains until FU-001, guarded by N03 and the contract pin.
  - The readiness consolidation must be validated in S1/S2.
  - There are 11 baseline web-suite failures.
  - FU-002..FU-004 are deferred.

# Architecture Review Revision Record — run-settings-ui-unification

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-10-05) | SR-006, SR-007 | N/A | Fail | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / revised design (SR-008) | SR-006, SR-008 | Fail | Pass | AR-001..AR-004 resolved |

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

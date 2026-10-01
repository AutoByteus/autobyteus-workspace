# Architecture Review Revision Record — cross-scope-agent-mentions

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review (SR-005 package, superseded mid-review by SR-006) | SR-004, SR-005, SR-006 | N/A | Fail | AR-001, AR-002, AR-003, AR-004, AR-005 |
| ARCH-REV-002 | Round 2 / SR-007 answers ARCH-REV-001 | SR-007 | Fail | Pass | AR-001, AR-002, AR-003, AR-004, AR-005 (all resolved) |
| ARCH-REV-003 | Round 3 / SR-009 after SR-008 requirements change, RD-004, CRR-004 DI-001 | SR-008, SR-009 | Pass | Fail | AR-006, AR-007, AR-008 (new) |
| ARCH-REV-004 | Round 4 / SR-010 answers ARCH-REV-003 | SR-010 | Fail | Pass | AR-006, AR-007, AR-008 (all resolved) |

## Revision Entries

### ARCH-REV-001 — Initial baseline: sound architecture; Agent-root command entry and context-file ownership missing

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/design-review-report.md`
- Review round and trigger:
  - Round 1. The Solution Designer sent SR-005 as `Architecture Design Complete`.
  - SR-006 (Agent-root lifetime and host wake) arrived before the SR-005 result was complete, so the baseline reviews SR-006.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `architecture-design-handoff.md`; N/A.
- Relevant solution revision IDs: SR-004, SR-005, SR-006.
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact).
- Baseline established:
  - Behavior basis confirmed against the code at `8caa610ff`.
  - SR-006's DS-009 host wake and its lock order were accepted.
  - Two reachable gaps block the review:
    - AR-001: no owner to re-create the Agent root when a child command arrives after a Stop or restart;
    - AR-002: no context-file owner for Agent-root members, and root-kind switch sites missing from E-11.
  - Three Low clarifications: AR-003, AR-004, AR-005.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Medium), AR-002 (Medium), AR-003 (Low), AR-004 (Low), AR-005 (Low).
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - AGY/ACP live tool exposure (escalation trigger);
  - the prompt change for all standalone agents;
  - downgrade (out of supported scope);
  - token roll-up deferred.

### ARCH-REV-002 — SR-007 resolves all ARCH-REV-001 findings; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/design-review-report.md`
- Review round and trigger: Round 2. The Solution Designer sent the revised SR-007 package in answer to ARCH-REV-001.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `design-review-report.md` (ARCH-REV-001); AR-001–AR-005.
- Relevant solution revision IDs: SR-007 (requirements basis SR-004 unchanged).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed: the behavior basis was re-confirmed; BEH-005, BEH-006 and BEH-010 are now Confirmed. All failing verdict rows were re-checked against the SR-007 design text and the cited code precedents.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium, blocking) | Resolved | SR-007; design § "Agent-root command entry and stream (AR-001)", Boundary Encapsulation Map, Interface Boundary Mapping, tests | `resolveCommandReadyRoot(hostRunId)` is the single owner. The lane is released before the root gate. `connect` uses it, mirroring `AgentTeamStreamHandler.connect` → `resolveActiveTeamRun` (verified at lines 58–59 and 213). `agentRunCollaboration` serves the stored view and never restores. The new member-view projection mirrors the existing `agent-org-member-run-view-projection-service.ts`. Client connect triggers (a) and (b) are defined. A Stop → reopen → send-to-child test is added. |
| AR-002 | Open (Medium, blocking) | Resolved | SR-007; design § "Context files for Agent-root members (AR-002)", switch-site row, E-18 | Owner kinds `agent_collaboration_member_{draft,final}` `{hostRunId, agentRunId}` with exact-key parsing. The resolver uses the three-family location lookup plus host readiness. The draft layout is new; the final layout uses the existing generic `<memoryDir>/context_files` (verified). Parsers are extended. Web builders cover the new target kinds. E-18 gives each missing switch site a branch or a reason it is unchanged. `RootTaskPersistenceFinalizationIndeterminateError.rootSubjectKind` is widened. |
| AR-003 | Open (Low) | Resolved | SR-007; Intended Change 5, DS-005 | One rule via `MemberExecutionContext.teamScoped`: Team/Org members and task-Team members in any root. The Agent-root host and task Agents directly under it are excluded. This is consistent with REQ-012, and tests are added. |
| AR-004 | Open (Low) | Resolved | SR-007; `collaborator-candidate-policy.ts` row | "In the run" requires at least one task execution at the collaborator's address. An entry with no runs stays offerable and is reused. Tests are added. |
| AR-005 | Open (Low) | Resolved | SR-007; investigation notes § Supplement Inventory; design supplemental table | The inventory is filled in. The `mock-boundaries.md` path is `/Users/normy/autobyteus_org/autobyteus-web-prototype/mock-boundaries.md` (verified to exist). |

- New or remaining finding IDs: none.
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/software_engineering_team/implementation_engineer`, then an informational notice to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - AGY/ACP live tool exposure (escalation trigger);
  - the prompt change for all standalone agents;
  - host-restore latency under the root gate;
  - downgrade (out of supported scope);
  - token roll-up deferred.

### ARCH-REV-003 — SR-009 collaborator-instance model: direction sound; Team-root routing to hosted collaborators missing

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/design-review-report.md`
- Review round and trigger: Round 3. SR-009 is a revised package after:
  - the approved requirements change SR-008 (single collaborator instance reached with `send_message_to`);
  - RD-004 (REQ-014/AC-016);
  - code review CRR-004 (DI-001 Design Impact; CR-003 and CR-004 local fixes released with the package).
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `architecture-design-handoff.md` (SR-009 section); upstream `code-review-report.md` DI-001.
- Relevant solution revision IDs: SR-008, SR-009.
- Prior authoritative decision: Pass (ARCH-REV-002, on SR-007).
- Current authoritative decision: Fail (Design Impact).
- What changed:
  - The behavior basis was re-established against SR-008 and the SR-008 UI/UX spec (VIS-001–015) and checked at `5dcc5dc82`.
  - Confirmed: the lazy-start and restore planner, `validateMany`, the `prepareConfigured` backends, the inter-agent metadata keys and the host's live `INTER_AGENT_MESSAGE` path.
  - New gap: the Team root has no host model for root-hosted collaborator executions, and the `CollaboratorExecutionHost` API has no command, input or liveness operations (AR-006).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved (ARCH-REV-002) | Still resolved | SR-009 keeps `resolveCommandReadyRoot` unchanged | Design § SR-009 delta "Everything else unchanged" |
| AR-002 | Resolved | Still resolved | Context-file kinds unchanged; location families now index collaborator executions | Design § shared records row |
| AR-003 | Resolved | Still resolved | `teamScoped` unchanged; collaborator Team members are Team-scoped | Intended Change 7 |
| AR-004 | Resolved | Obsolete (superseded by SR-008) | The in-run rule is now "every entry counts", because entries exist only after a successful add | Policy row; AC-011 |
| AR-005 | Resolved | Still resolved | — | Supplement table |

- New or remaining finding IDs: AR-006 (Medium, blocking), AR-007 (Low), AR-008 (Low).
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - admission validation inside the root gate;
  - RD-004 per-runtime `senderId` recording (escalation trigger);
  - replay of cross-root direct deliveries;
  - E-20 non-goal;
  - the risks carried from earlier rounds.

### ARCH-REV-004 — SR-010 resolves the ARCH-REV-003 findings; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/design-review-report.md`
- Review round and trigger: Round 4. The SR-010 revised package answers ARCH-REV-003.
- Triggering role, report path, and finding IDs: `/software_engineering_team/solution_designer`; `design-review-report.md` (ARCH-REV-003); AR-006–AR-008.
- Relevant solution revision IDs: SR-010 (requirements basis SR-008 unchanged).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed: BEH-004, BEH-011 and DS-002 were re-checked against the new "Collaborator Hosting And Routing (AR-006)" section and the Team-root local execution code at `5dcc5dc82`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-006 | Open (Medium, blocking) | Resolved | SR-010; design § "Collaborator Hosting And Routing (AR-006)", Boundary Map, Dependency Rules | `CollaboratorExecutionHost` is dropped. Org and Agent root use `rootAgents`/`teams` with `hostKind`. In the Team root, `addCollaboratorAgent` reuses the root TeamRun's `ConfiguredAgentExecutionRegistry`, so `executeDirectAgentCommand`, `reserveDirectAgentInput`, `deliverToDirectAgent` and termination over `configured.listHandles()` reach collaborators (verified in `flat-team-execution-manager.ts`). `CollaboratorTeamExecutionRegistry` TeamRuns are registered with `teamRunResolver`, and `requireTeamRun` has a fallback. New index kinds cover `isLiveAgent` and authorization. The extra-copy host rule is stated. Tests are listed. |
| AR-007 | Open (Low) | Resolved | SR-010; DS-008 and the web Send row | The hold applies only to sends with `mentions`; AC-013 is preserved |
| AR-008 | Open (Low) | Resolved | SR-010; requirements-doc lines 205, 256 and the Readiness Check | VIS-001–015 are normative; F-003 is superseded; readiness is updated. Line 22 is the historical SR-004 reference. |

- New or remaining finding IDs: none.
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/software_engineering_team/implementation_engineer`, then an informational notice to `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty:
  - implementation notes on registering member contexts and the activation-mode source;
  - admission validation inside the gate;
  - RD-004 per-runtime `senderId`;
  - the risks carried from earlier rounds.

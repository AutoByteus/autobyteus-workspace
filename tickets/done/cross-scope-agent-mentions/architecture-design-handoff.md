# Architecture Design Complete — cross-scope-agent-mentions

- Result: `Architecture Design Complete`
- Package ID: `cross-scope-agent-mentions`; current SR: `SR-007` (requirements basis SR-004)
- SR-007 answers ARCH-REV-001 (AR-001–AR-005); see `solution-revision-record.md` SR-007 and the design-spec sections
  "Agent-root command entry and stream (AR-001)" and "Context files for Agent-root members (AR-002)".
- Revision note (SR-006): the Agent-root lifetime now follows an explicit Stop, not host runtime liveness. New DS-009 wakes
  a crashed host through `StandaloneAgentRunLifecycleService.resolveCommandReadyAgentRun` when a child messages it. See
  design-spec DS-004, DS-009, the bounded spine, Ownership Boundaries and Risks.
- From: `/software_engineering_team/solution_designer`, 2026-09-30
- task_size: `Large`; architectural_risk: `High` (see `design-spec.md` § Task Size And Architectural Risk)

## Approval State
- Requirements: **Approved** (SR-004).
  - The user replied "Yeah, I completely agree with you." to an explicit approval request covering REQ-001–012,
    AC-001–014, DEC-U1 (always-on tools including Daily Assistant; internal helpers excluded), OQ-1 (`@` works in a
    collaborator's composer), OQ-2 (collaborators use the run's root settings) and OQ-3 (application-owned runs excluded).
- Behavior-defining supplement: Product Prototyper's `ui-ux-spec.md` with VIS-001–014.
  - User-confirmed: "Okay, finally I confirm now. All good now."
  - SHA-256 of all 14 references verified by the Solution Designer.
- Design-shape decisions confirmed by the user in conversation: see `design-spec.md` § Solution And Approval Basis.

## Original Request (summary)
The user starts a standalone Agent or Team, later needs another Team (e.g. Product Team), but cannot reach it without having
launched an Org. The user proposed a hidden global Org. Analysis replaced it with per-run growth: `@` in a live run brings a
shared Agent or Team into the current run as a delegated collaborator.

## What To Review
- `design-spec.md`. Key decisions:
  - `collaborators` entries in the Team, Org and new Agent-root trees;
  - the split between message-recipient and delegation-placement resolution;
  - per-root task source resolvers;
  - moving the Org hosting classes to root-neutral backends;
  - the new `agent` root kind and the `agent-run-collaboration` module;
  - always-on tools through the host member context and `launchPurpose`;
  - server-owned candidate policy and mention note;
  - persisted-data decision: Directly Usable, No Migration.
- Open risks to scrutinize:
  - AGY/ACP standalone tool exposure (unverified live);
  - the prompt change for every eligible standalone agent;
  - downgrade dropping `collaborators`;
  - gate and termination ordering in the Agent root.

## Artifacts (absolute paths)
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/requirements-doc.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/investigation-notes.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/design-spec.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/solution-revision-record.md
- /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions/tickets/in-progress/cross-scope-agent-mentions/product-design-request-handoff.md (earlier Product request)
- Product (external, read-only): /Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions/ (ui-ux-spec.md, visual-references/, prototype-ticket.md, ui-behavior-test-matrix.md); repo /Users/normy/autobyteus_org/autobyteus-web-prototype @ personal (c4d4764, record 9ca5651); source pin e9aa4a74c
- Prior independent review artifacts: N/A — not applicable (first review)

## Workspace
- Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/cross-scope-agent-mentions, branch `codex/cross-scope-agent-mentions`,
  base `origin/personal` @ `8caa610ff`, finalization target `personal`. Ticket files are uncommitted in the worktree.

## Expected Output
An independent architecture review of the package. On Pass, route to implementation according to the reviewer's rules. On
Fail or Blocked, send the findings to the Solution Designer.

## Route
Matched rule: Architecture Design Complete with task_size=Large or architectural_risk=High →
`/software_engineering_team/architecture_reviewer` (2026-09-30). Delivered (run `architecture_reviewer_26751e7c7a32456f994126bc9f016678`).
No other rule applies: there is no Product request and no marketing need, and the direct-implementation rule requires Small/Medium and Low.

- SR-006 revision sent to `/software_engineering_team/architecture_reviewer` on 2026-09-30 (same matched rule).
- SR-007 revision (ARCH-REV-001 response) sent to `/software_engineering_team/architecture_reviewer` on 2026-09-30.
- ARCH-REV-002 Pass on SR-007 recorded 2026-09-30; implementation handoff delivered by the reviewer.

---
## SR-009 revised package (2026-10-01)
- Current SR: `SR-009`. Requirements: SR-008, Approved by the user ("approved. ask product prototyper to update UI thanks");
  RD-004 is recorded as REQ-014/AC-016 (user: "okayyyy. agreed").
- Supplement: `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md`
  (VIS-001–015), confirmed by the user on 2026-10-01 and hash-verified. It supersedes the 2026-09-30 spec.
- Design: `design-spec.md` (SR-009; see "SR-009 delta versus the implemented SR-007"). Prior design: `design-history/design-spec-SR-007.md`.
- Downstream findings addressed:
  - DI-001 (code review CRR-004), resolved by construction;
  - CR-003 (identity-keyed Team send settle) and CR-004 (F-02/F-03/F-04) are released to implementation as part of this
    package (file mapping and tests).
- Implementation starting point: `5dcc5dc82` on `codex/cross-scope-agent-mentions`. The API/E2E durable test changes and
  evidence are uncommitted in the worktree.
- task_size: Large; architectural_risk: High. Prior review artifacts: `design-review-report.md` (ARCH-REV-001 Fail,
  ARCH-REV-002 Pass on SR-007) and `architecture-review-revision-record.md`.
- Route: Architecture Design Complete (Large/High) → `/software_engineering_team/architecture_reviewer`.

## SR-010 (2026-10-01)
Revision for ARCH-REV-003 (AR-006/007/008). See `design-spec.md` § "Collaborator Hosting And Routing (AR-006)" and SR-010
in `solution-revision-record.md`. Large/High → `/software_engineering_team/architecture_reviewer`.
- ARCH-REV-004 Pass on SR-010 recorded 2026-10-01; implementation handoff delivered by the reviewer.

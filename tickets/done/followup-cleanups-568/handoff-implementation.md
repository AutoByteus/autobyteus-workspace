# Handoff: followup-cleanups-568 → Implementation

- **Result:** `Architecture Design Complete`, `task_size = Medium`, `architectural_risk = Low`. Rule: Small/Medium and Low → `/implementation_engineer` (direct route).
- **Task:** autobyteus-568 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, part of 530); SR-001.
- **Ticket folder:** `/Users/normy/autobyteus_org/autobyteus-worktrees/followup-cleanups-568/tickets/in-progress/followup-cleanups-568/`
- **Worktree / branch / base:** `/Users/normy/autobyteus_org/autobyteus-worktrees/followup-cleanups-568`, `codex/followup-cleanups-568`, `origin/personal` `01ebb4ddce`. Finalization target: `origin/personal`. The ticket documents are uncommitted; commit them with your change.

## Original request

The PM's Task, five non-urgent follow-ups:
- 279 FU-002: unused GraphQL documents, plus unused server resolvers;
- 279 FU-003: the `PortOwnerInspectorFaults` load flake;
- 279 FU-005: the iOS symlink-path test;
- 279 FU-006: `ServerSettingsBasicsPanel.spec` failing on personal;
- 571 FU-001 (Task comment): an exact simulator choice in one shared place.

## Approval basis

Requirements were approved by the Solution Designer within the direction (requirements-doc.md, Document Status, DEC-001…004). Two decisions differ from the Task's wording, with evidence:
- **DEC-001:** "wait for the pid receipt" cannot fix FU-003. The child is killed before its first statement, so the fixture's interpreter changes to sh instead.
- **DEC-002:** only the server's `approveToolInvocation` mutation is unused. `restoreAgentRun` and `agentRunCollaborationMemberProjection` are test-only, which makes them follow-up FU-001.

## What to build

design-spec.md D-1…D-5 and its Change / Refactor Sequence:
- **D-1:** remove the three documents, the server mutation with its types and unit-test case, and the demo-list entries plus the "unused" reason; run `codegen:local`.
- **D-2:** a sh fixture with `exec sleep 5` in the deadline case.
- **D-3:** `resolvingSymlinksInPath()` on the root and each URL.
- **D-4:** stub and assert `ShowInternalAgentsCard` and `UpdateChecksCard`.
- **D-5:** a new `autobyteus-ios/scripts/select-ios-simulator.py`:
  - it chooses the exact name on the newest runtime that is not above the selected Xcode's simulator SDK, with an explicit any-iPhone fallback and a notice;
  - the workflow and the smoke script both call it;
  - the contract check guards it.

## Proof required

AC-001…AC-005:
- `codegen:check`, both typechecks, the server `agent-run` unit tests, the web unit suite, the Electron suite plus the deadline test 20× under CPU load, and the demo build check;
- the iOS core tests from a plain path and from `/tmp`;
- the chooser locally, including the fallback;
- a build-only `release-ios.yml` run of the branch (`publish_app_store_connect=false`) logging iPhone 17 on iOS 27.2 (DESIGN.md rule 12).

## Constraints

- No upload, tag or release.
- Tests on isolated nodes only; no real provider quotas.

## Documents

- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`
- `follow-ups.md` (FU-001, FU-002: not in scope)

## Route record

Sent to `/implementation_engineer`, 2026-11-20.

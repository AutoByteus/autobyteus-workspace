# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: first review after SR-004 raised risk to High | SR-001..SR-004 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2: SR-005 re-review limited to AR-001/AR-002 | SR-005 | Fail | Pass | AR-001, AR-002 (resolved) |

## Revision Entries

### ARCH-REV-001 — Baseline: cumulative package passes except the SR-004 admission-caller inventory

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control/tickets/in-progress/claude-anthropic-effort-control/design-review-report.md`
- Review round and trigger: Round 1. Solution Designer `Architecture Design Complete` SR-004 (Medium/High).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff.md` "SR-004 revision"; upstream DI-1/DI-2 (implementation engineer).
- Relevant solution revision IDs: SR-001..SR-004
- Prior authoritative decision: N/A
- Current authoritative decision: Fail, Design Impact
- What changed or what baseline was established:
  - The behavior basis is confirmed.
  - DS-001..DS-003, the owned-key projection, the catalog, the one-list web and the gen-4 removal pass, and so does the persisted-data decision (Directly Usable).
  - The SR-004 server-validator placement is sound.
  - Its caller inventory and its claim that "the runtime ignores undeclared keys" are incomplete. Org launch and launch-usability discard the canonical config, and non-Anthropic adapters forward extras raw.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001 (Medium, blocking), AR-002 (Low)
- Material classification changes: None (Medium/High confirmed).
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: nested-key rejection kept; typo keys silently dropped (inherent in DEC-011 B); FU-001/FU-003.

### ARCH-REV-002 — SR-005 resolves AR-001/AR-002; Pass

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control/tickets/in-progress/claude-anthropic-effort-control/design-review-report.md`
- Review round and trigger: Round 2. Solution Designer SR-005 (docs `4eb5d87f7`).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff.md` "SR-005 revision"; AR-001, AR-002.
- Relevant solution revision IDs: SR-005
- Prior authoritative decision: Fail (ARCH-REV-001)
- Current authoritative decision: Pass
- What changed:
  - DS-004 was added.
  - The 10-caller inventory, with a decision per caller, was verified against the code.
  - The canonical-only rule was added. Org launch and launch-usability are marked as changes.
  - FU-004 records the paths that bypass the validator.
  - AC-013 was added.
  - The stale SR-002/SR-003 text was corrected and the examples table added.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Medium, blocking) | Resolved | SR-005; design-spec "SR-005 Delta"; AC-013; FU-004 | Inventory rows checked against `standalone-stopped-run-model-config-updater.ts` L66-91, `team-run-delegated-launch-plan.ts` L95-98, `agent-org-run-manager.ts` L316-320, `agent-org-run-service.ts` L99-112, `launch-usability-check.ts` L138-163, `model-routing-settings.ts` L136-143, `delegated-launch-selection-service.ts` L141-156 |
| AR-002 | Open (Low) | Resolved | SR-005 | design-spec diff 7bfed6427..4eb5d87f7; requirements AC-012 verification intent |

- New or remaining finding IDs: None. Non-blocking implementation guidance IG-1 (Org launch: build from the resolved, canonicalized plan) and IG-2 (inherited collaborator launch: return or record).
- Material classification changes: None (Medium/High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: nested-key rejection; silent drop of typo keys; FU-001/003/004.

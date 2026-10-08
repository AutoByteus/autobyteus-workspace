# Code Review Revision Record

Canonical reports:
- `code-review-report.md` (implementation review / failure-origin review)
- `api-e2e-test-review-report.md` (successful API/E2E test-code review; not yet created)

| CRR ID | Entry Point | Trigger | Prior Result | Linked Revisions | Result | Classification / Recipient |
| --- | --- | --- | --- | --- | --- | --- |
| CRR-001 | API/E2E Failure-Origin Review | API/E2E Fail API-REV-001, FAIL-001 (PMU-018 G, DSK-001 run-4) | N/A — no prior code review (direct route) | SR-003/SR-004; ARCH-REV N/A; IR-001; API-REV-001; DR N/A | Fail — origin confirmed: CR-001 | Local Fix → `/software_engineering_team/implementation_engineer` |

## CRR-001 — Failure-origin baseline: reveal not gated on "run shown"

- Scope: `useRevealSelectedTreeRow` (D-4), tree selection markers, D-2 `isWorkspacesActive`.
- Finding: CR-001. On a no-run page with a stale `selectionStore` Team/Agent selection, the reveal scrolls to and focuses that row. This breaks REQ-009 (focus stays on the Workspaces section) and REQ-006.
- Rejected: changing the tree's route-aware selection (pre-existing, out of scope, insufficient for `/agents`/`/projects`). No code-review gap, because no source review was selected.
- Prior-finding resolution: N/A (baseline).
- Next: implementation fix (IR-002), then API/E2E rerun of PMU-018 (incl. G) and DSK-001.

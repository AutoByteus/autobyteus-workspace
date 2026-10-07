# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (2026-10-07) | SR-003 (requirements), SR-004 (design) | N/A | Fail | AR-001, AR-002, AR-003, AR-004 |
| ARCH-REV-002 | Round 2 / SR-005 design revision (2026-10-07) | SR-003 (requirements), SR-005 (design) | Fail | Pass | AR-001..AR-004 resolved |

## Revision Entries

### ARCH-REV-001 — Initial review of live Projects pages, Task roots and Temp tasks

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-review-report.md`
- Review round and trigger: Round 1; the Solution Designer's `Architecture Design Complete` (`handoff-architecture-review.md`)
- Triggering role, report path, and finding IDs: `/solution_designer`; `handoff-architecture-review.md`; N/A
- Relevant solution revision IDs: `SR-003`, `SR-004`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail` (Design Impact)
- What changed in the review result or what baseline was established:
  - First baseline. The behavior basis was confirmed against the requirements, the UI/UX spec rounds 1–2 and the current code.
  - The structure passes.
  - Two blocking gaps:
    - **AR-001:** no defined read moment or per-Task ordering for publications. A status read during the event dispatch returns the handle's stale overlay (P-001, Reachable).
    - **AR-002:** the openable rule is wider than REQ-009: `starting` roots and roots whose host chat was deleted.
  - Two non-blocking items: AR-003 (`load()` publishes) and AR-004 (stale investigation inventory and metadata).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: AR-001, AR-002 (blocking); AR-003, AR-004 (non-blocking)
- Material classification changes: None (`Large` / `High` confirmed)
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: org navigation (the actions exist); publication volume; Project count recomputation cost. See the report's Residual Risks.

### ARCH-REV-002 — SR-005: publication contract and openable rule

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-manager-ux/tickets/in-progress/project-manager-ux/design-review-report.md`
- Review round and trigger: Round 2; SR-005 `Architecture Design Complete` (`handoff-architecture-review.md`, "SR-005 changes for re-review"). Limited to AR-001..004 and the sections they touch.
- Triggering role, report path, and finding IDs: `/solution_designer`; `handoff-architecture-review.md`; AR-001..AR-004
- Relevant solution revision IDs: `SR-003` (requirements, unchanged), `SR-005` (design)
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result: The behavior basis is unchanged (SR-003). The new Publication Contract and presentation rule were verified against the code facts behind P-001..P-005. No new findings.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (blocking) | Resolved | SR-005; design-spec "Publication Contract" | Triggers only mark. The read runs in a `setImmediate` flush, after the overlay is cleared (`configured-agent-execution-handle.ts:383-384`, cleared synchronously after publish). Builds are serialized and coalesced per subject, removal takes precedence, failures are logged, and tests are named |
| AR-002 | Open (blocking) | Resolved | SR-005; presentation rule | Openable = started ∧ ¬closed ∧ host run in the run-history state; `starting` and deleted-host cases are tested; non-openable roots are not focusable |
| AR-003 | Open (non-blocking) | Resolved | Publication Contract step 6 | `load()` swaps do not notify |
| AR-004 | Open (non-blocking) | Resolved | Investigation meta and inventory; spec SR-005; SR record note | Corrected. Trivial leftovers: the handoff's "(SR-001..SR-004)" label; a stale investigation-status sentence |

- New or remaining finding IDs: None
- Material classification changes: None (`Large` / `High`)
- Recommended recipient: `/implementation_engineer` (primary); `/solution_designer` (informational)
- Remaining risks or uncertainty: Publication volume (measure in E2E); Project count recomputation, O(Tasks in the Project) per change; org-hosted root opening is not in the step-8 E2E list (optional)

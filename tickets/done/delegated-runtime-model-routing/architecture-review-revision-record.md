# Architecture Review Revision Record — autobyteus-32 (Model Router core)

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 — SR-014 Architecture Design Complete (Large/High), 2026-10-26 | SR-012, SR-013, SR-014 | N/A | Fail (Design Impact) | AR-001, AR-002 |
| ARCH-REV-002 | Round 2 — SR-015, 2026-10-26 | SR-015 | Fail | Pass | AR-001, AR-002 resolved; none open |
| ARCH-REV-003 | Round 3 — SR-016 delta (one routing request at a time), 2026-10-26 | SR-016 | Pass | Pass | none |
| ARCH-REV-004 | Round 4 — SR-017/SR-018 (no confinement, user), 2026-10-26 | SR-017, SR-018 | Pass | Pass | AR-002 obsolete; none open |

## Revision Entries

### ARCH-REV-001 — Router run's tool set and Claude confinement

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/design-review-report.md`
- Review round and trigger: Round 1, SR-014 from the Solution Designer. The SR-010 review was held before any result for the UI design; my preliminary points of 2026-10-26 were taken into design § SR-012 and verified here.
- Triggering role, report path, and finding IDs: Solution Designer; `handoff-architecture-review-router-sr014.md`; N/A
- Relevant solution revision IDs: `SR-012`, `SR-013`, `SR-014`
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`, classification `Design Impact`
- Baseline established: the behavior basis is confirmed. The spine, ownership, time contract, persistence and UI contract pass. The design fails on two points:
  - AR-001: the router run is collaboration-eligible and gets automatic `delegate_task` / `send_message_to` (MP-001).
  - AR-002: the Claude write confinement relies on `canUseTool`, which the loaded settings' allow rules can bypass (MP-002).

#### Prior Finding Resolution

None

- New or remaining finding IDs: AR-001 (High), AR-002 (Medium)
- Material classification changes: none (Large/High confirmed)
- Naming: the SR-014 rename (`ModelRouterRun`, `ModelRouterWorkspace`) arrived during the round. No effect on the findings; AR-001's owner is `ModelRouterRun`.
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: report § Residual Risks (decision record on B before the work packet; Codex temp roots; tool-call time-outs verified in API/E2E; FU-002 text; the Done-when desktop check).

### ARCH-REV-002 — SR-015: system-owned router run and hook-based Claude confinement

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/design-review-report.md`
- Review round and trigger: Round 2, SR-015 (`handoff-architecture-review-router-sr015.md`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` SR-015 (diff against `history/design-spec-sr014.md`); AR-001, AR-002
- Relevant solution revision IDs: `SR-015`
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed:
  - AR-001 is resolved by `systemRunOwner` (non-collaborative router run).
  - AR-002 is resolved by setting sources `["user"]`, disallowed shell tools and a `PreToolUse` write hook. A-32 confirms the SDK's order, and the scope was widened to the workspace's own settings.
  - The residual points are resolved.
  - Vocabulary: "conversation" removed (`ModelRouterAgent`, `openModelRouterAgent`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High) | Resolved | SR-015; A-32 | `systemRunOwner` set only by `ModelRouterAgent`, read by `isCollaborationEligibleStandaloneRun`, kept on restore; MCP without member context; per-runtime tool-set test |
| AR-002 | Open (Medium) | Resolved | SR-015; A-32 | Confined Claude run: `["user"]` setting sources, shell tools disallowed, `PreToolUse` deny outside the workspace; live checks with a user allow rule and workspace config files |

- New or remaining finding IDs: none
- Material classification changes: none (Large/High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: report § Residual Risks (stale names in two design rows; Codex workspace config beyond the sandbox; tool-call time-outs verified in API/E2E; FU-004, FU-005; the Done-when desktop check).

### ARCH-REV-003 — SR-016: one routing request at a time

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/design-review-report.md`
- Review round and trigger: Round 3. The SR-016 delta after the ARCH-REV-002 Pass (`handoff-architecture-review-router-sr016.md`).
- Triggering role, report path, and finding IDs: Solution Designer; `design-spec.md` (diff against `history/design-spec-sr015.md`); N/A
- Relevant solution revision IDs: `SR-016`
- Prior authoritative decision: `Pass` (ARCH-REV-002)
- Current authoritative decision: `Pass`
- What changed:
  - A-33 is verified in code: only Codex and Claude append to a running turn.
  - The user's one-at-a-time rule is designed with one owner: `RoutingRequestQueue` under `ModelRouter`, released on the run going idle, with the wait inside the 40 s budget and an explicit "busy" failure.
  - Review gap acknowledged: the earlier rounds accepted A-21's "appended to the active turn" without tracing each runtime (Principle 1, several kinds).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001, AR-002 | Resolved | Resolved, unaffected by SR-016 | SR-016 diff | The diff touches routing request delivery only |

- New or remaining finding IDs: none
- Material classification changes: none (Large/High)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: report § Residual Risks ("idle" from run state; burst/user-talk fallback "busy", visible; earlier notes).

### ARCH-REV-004 — SR-018: confinement removed by the user; SR-017 record tightening

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing/tickets/in-progress/delegated-runtime-model-routing/design-review-report.md`
- Review round and trigger: Round 4. SR-018 (`handoff-architecture-review-router-sr018.md`), answering code review CRR-003 (CR-003, CR-004 Design Impact; CR-005 Local Fix); SR-017 included.
- Triggering role, report path, and finding IDs: code reviewer via the Solution Designer; `code-review-report.md` § API/E2E Failure-Origin Review; CR-003, CR-004, CR-005
- Relevant solution revision IDs: `SR-017`, `SR-018`
- Prior authoritative decision: `Pass` (ARCH-REV-003)
- Current authoritative decision: `Pass`
- What changed:
  - The user removed the router's workspace confinement (requirements SR-018), so `toolConfinement` and the Codex/Claude confinement changes are removed as a clean cut.
  - `systemRunOwner` is kept (AR-001).
  - CR-005 is carried as a Local Fix.
  - SR-017's single representation of skipped defaults and router failure passes.
  - The confinement-related residual notes no longer apply.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Resolved | Resolved, kept | SR-018 | `systemRunOwner` and the eligibility rule remain; AC-011 tests no collaboration tools |
| AR-002 | Resolved (SR-015) | Obsolete | SR-018 (requirement change by the user); A-34 | REQ-003 no longer requires Claude write confinement; the mechanism is removed |

- New or remaining finding IDs: none
- Material classification changes: none (Large/High; scope reduced)
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer
- Remaining risks or uncertainty: report § Residual Risks (CR-005 status code; normal tests; "idle" from run state; Done-when desktop check).

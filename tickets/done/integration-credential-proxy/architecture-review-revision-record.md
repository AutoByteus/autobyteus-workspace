# Architecture Review Revision Record — integration-credential-proxy (autobyteus-311, step 1)

The latest `design-review-report.md` is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / SR-003 design handed for independent review | SR-002, SR-003 | N/A | Fail (Unclear + Design Impact) | AR-001…AR-006 |
| ARCH-REV-002 | Round 2 / SR-004 revision + SR-005 user decision DEC-011 | SR-004, SR-005 | Fail | Pass | AR-001…AR-006 resolved; AR-007, AR-008 new (non-blocking) |

## Revision Entries

### ARCH-REV-001 — Baseline: Codex sandbox reach, revocation on failed activation, upstream target rules

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy/tickets/in-progress/integration-credential-proxy/design-review-report.md`
- Review round and trigger: Round 1. Solution Designer handoff of `design-spec.md` at SR-003 (Large / High).
- Triggering role, report path, and finding IDs: Solution Designer, `handoff.md`; no prior findings.
- Relevant solution revision IDs: SR-002, SR-003
- Prior authoritative decision: N/A
- Current authoritative decision: Fail
- What baseline was established:
  - Basis confirmed against code at `8760c83788`.
  - All five runtime delivery seams were traced.
  - The release paths, the loopback gate and the logging policy were read.
  - The core shape is sound.

#### Prior Finding Resolution

None.

- New or remaining finding IDs:
  - Blocking: AR-001 (Codex `workspace-write` sandbox network reach is unmeasured; P-001), AR-002 (a pass leaks when activation fails before attachment; P-002), AR-003 (upstream origin check and no redirect following; git-route `Location`; P-003).
  - Fix in the same revision: AR-004 (no access-log policy on the proxy listener; the path carries the pass), AR-005 (a testable meaning for AC-006 "another run's pass").
  - Optional: AR-006 (`401`→`403` on the git route only).
- Material classification changes: None (Large / High).
- Recommended recipient: Solution Designer
- Remaining risks or uncertainty: P-001 `Unclear` until measured; R-1…R-5 as stated in the design.

### ARCH-REV-002 — Re-review of SR-004/SR-005: Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy/tickets/in-progress/integration-credential-proxy/design-review-report.md` (section "Round 2")
- Review round and trigger: Round 2. SR-004 addresses AR-001…AR-006; SR-005 records the user's DEC-011 (Codex sandbox network, option a, automatic).
- Relevant solution revision IDs: SR-004, SR-005
- Prior authoritative decision: Fail
- Current authoritative decision: Pass
- What changed: DS-002 (Codex), DS-004 and DS-005 were redrawn in call order. M-5 and the auto-execute defaults were checked. DEC-011 is accepted as the user's decision.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (High, Unclear) | Resolved | SR-004 M-5; SR-005 DEC-011; design "Codex Sandbox" | Measured: blocked in `workspace-write`; works with per-thread `network_access` or full access; network added automatically for integration runs in `workspace-write` |
| AR-002 | Open (Medium) | Resolved | DS-004 | Both release points call `revokeForRun` (idempotent) |
| AR-003 | Open (Medium) | Resolved | DS-005; shell variables; tests | Path normalization, origin check, `redirect: "manual"`, same-origin `Location` rewrite, `GIT_TERMINAL_PROMPT=0` |
| AR-004 | Open (Low) | Resolved | Dependency Rules | No access-log policy on the proxy listener |
| AR-005 | Open (Low) | Resolved | requirements AC-006 | Testable cases; a copied live pass is R-1 |
| AR-006 | Open (Low) | Resolved | DS-005 step 6 | 401→403 on the git route only |

- New or remaining finding IDs: AR-007 (stale `handoff.md` and requirements L6; artifacts), AR-008 (document that `read-only` Codex runs can't reach integrations). Both are Low and non-blocking.
- Material classification changes: None (Large / High).
- Recommended recipient: Implementation Engineer; informational notice to the Solution Designer.
- Remaining risks or uncertainty: DEC-011 gives unrestricted network to `workspace-write` Codex integration runs (the user's choice); R-1…R-5 as stated.

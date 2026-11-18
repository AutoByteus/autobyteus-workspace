# Handoff — autobyteus-311 step 1: credential proxy (round 2, after ARCH-REV-001)

- From: Solution Designer (run `solution_designer_9a83b5676cdb4488a7e25094626f527c`)
- To: Architecture Reviewer
- Date: 2026-10-30
- Task: `autobyteus-311` (step 1), Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/integration-credential-proxy`
- Branch: `codex/integration-credential-proxy`; base `origin/personal` @ `8760c83788`; nothing committed yet

## What is asked

Re-review `design-spec.md` at **SR-005**, which addresses AR-001…AR-006. The classification is unchanged: Large / High.

| Finding | Resolution | Where |
| --- | --- | --- |
| AR-001 | Measured **M-5**: in `workspace-write`, curl to 127.0.0.1 fails (exit 7). With per-thread `sandbox_workspace_write.network_access=true`, or in `danger-full-access`, it works. Codex's `network_proxy` allow-list is experimental and off. **The user decided DEC-011:** apply (a) automatically. Auto-execute is on by default for new runs (cited), which means full access. For a `workspace-write` Codex run with integration variables, the bootstrapper adds `network_access: true` to the same thread config. `read-only` is unchanged | design "Codex Sandbox (AR-001, DEC-011)", Per-Runtime table; requirements DEC-011; notes M-5 |
| AR-002 | Revoke at both release points: `AgentRunResourceManager.release`, and the failed-activation `deactivateMcp` hook (`agent-run-activation-operation.ts` L95-100, `agent-run-manager.ts` L164) | DS-004 |
| AR-003 | Upstream URL built on the route's fixed origin, with path normalization (`\`, `..`, encoded dots and empty segments refused) and `upstream.origin === route.origin`. `redirect: "manual"`; a same-origin `Location` is rewritten through the proxy, any other passes through. `GIT_TERMINAL_PROMPT=0` in the run's variables | DS-005; Interface (shell variables) |
| AR-004 | No `registerHttpAccessLogPolicy` on the proxy listener | Dependency Rules |
| AR-005 | AC-006 restated as testable cases; the same-user copy of a live pass is R-1 | requirements AC-006 |
| AR-006 | 401 → 403 on the git route only; the API passes 401 through | DS-005 |
| Status line | Fixed | requirements L6 |

## Documents

- `requirements-doc.md`
- `investigation-notes.md`: M-1…M-5
- `design-spec.md`
- `solution-revision-record.md`: SR-001…SR-005
- `follow-ups.md`
- your `design-review-report.md` and `architecture-review-revision-record.md`

## Constraints

Unchanged from round 1:
- never print or store a secret;
- test vault and dummy values only;
- never touch the user's data or node containers;
- autobyteus-integrations-1 is not touched;
- no release unless asked;
- no "user has verified" in Done-when.

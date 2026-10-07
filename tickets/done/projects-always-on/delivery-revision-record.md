# Delivery Revision Record — projects-always-on

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | API-REV-001 Pass from `/api_e2e_engineer` (direct route) | N/A | Base current; docs synced; waiting for user verification and the `82960e903` decision | `docs-sync-report.md`, `handoff-summary.md`, `release-notes.md`, `release-deployment-report.md` |
| DR-003 | User request: stable release | DR-002 | Stable `v1.4.96` published and verified | `release-notes-1.4.96-stable.md`, `release-deployment-report.md`, `delivery-evidence/dr-003/` |
| DR-002 | User verification + beta request; follow-up `0446c378c` | DR-001 | Finalized (`395d0840c`), beta `v1.4.96-beta.5` published and verified, cleaned up | `user-verification-record.md`, `release-deployment-report.md`, `handoff-summary.md`, `delivery-evidence/dr-002/` |

## Revision Entries

### DR-001 — Initial delivery baseline: base current, docs synced, awaiting verification

- Delivery round and trigger: initial delivery after API-REV-001 Pass (95%). Direct Medium/Low route, so test-code review is `Not Required`.
- Triggering upstream report, verification, or evidence: `api-e2e-execution-coverage-report.md` (API-REV-001)
- Prior authoritative result: N/A
- Current authoritative result:
  - The branch was already current with `origin/personal@93d1b18b4`.
  - Checkpoint `8a1ed4647`.
  - Docs sync is `Updated`: the stale MCP flag wording fixed, and PMU-015/016 documented.
  - Smoke: 149 files / 1294 tests; probes OK; hygiene check passes.
  - Waiting for explicit user verification and a decision on product baseline fix `82960e903` (recommendation: keep).
- Docs sync report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/docs-sync-report.md`
- Handoff summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/handoff-summary.md`
- Release/publication/deployment report: `/Users/normy/autobyteus_org/autobyteus-worktrees/projects-always-on/tickets/in-progress/projects-always-on/release-deployment-report.md`
- Integration and post-integration verification: already current; smoke as above.
- User verification/finalization state: pending.
- Terminal return to `/solution_designer`: `Not yet eligible`
- Terminal return message/reference: —
- Why this baseline was recorded: the first completed delivery-stage result.
- Next recipient/action: the user verifies, decides on `82960e903`, and decides whether to release.
- Remaining blockers, rollback concerns, or untested scope:
  - No blockers.
  - The 49 server baseline failures are reported (recommended for a separate baseline-repair ticket).
  - The PT-E2E-005/006 timing flake is contained.

### DR-002 — Verified, finalized, beta.5 released, cleaned up

- Delivery round and trigger: "finalze and release a new beta." (2026-10-07). The user-requested follow-up `0446c378c` (drop the "Show" picker label) was included.
- Current authoritative result: finalized and beta released.
  - Merge `395d0840c`.
  - Release commit `5316a0cad`, tag `v1.4.96-beta.5`. The hygiene check passed before tagging.
  - All 4 workflows succeeded. 17 assets, updater metadata at `1.4.96-beta.5`, Docker digest `sha256:09b3919b…` on both tags.
  - Worktree and branches removed.
- Baseline fix `82960e903`: kept, since the user did not ask to remove it after the keep recommendation.
- Terminal return to `/solution_designer`: deferred. The user then requested a stable release (DR-003), and the terminal package is sent after it.
- Next action: stable `v1.4.96`.

### DR-003 — Stable v1.4.96

- Trigger: user request "now release a stable version please" (2026-10-07), after beta.5.
- Curated notes: `release-notes-1.4.96-stable.md`, covering every ticket since `v1.4.95`.
- Release: the hygiene check passed, then `bash scripts/desktop-release.sh release 1.4.96 --release-notes …` exited 0. Release commit `446379c90`, tag `v1.4.96`.
- The pre-release receipt push `a12eed0cc` hit GitHub "Internal Server Error" 3 times. Isolation pushes showed it was transient: every file pushed individually, and the retry succeeded. The temporary probe branches were deleted.
- Workflows, all Success: Desktop 37655939932, Android 37655940214, iOS 37655940419, Server Docker 37655940222.
- GitHub release: non-draft, not a prerelease, and it is `releases/latest`. 17 assets, none empty.
- Updater metadata: all four `latest*.yml` files report `1.4.96`.
- Docker `:1.4.96` and `:latest` share digest `sha256:3fe40835fa9302ea40067de051e0057b134a97f5941fb8b213adf2ca75daba36` (amd64 and arm64).
- Terminal return to `/solution_designer`: sent after this receipt is pushed.
- Rollback: revert on `personal` and cut 1.4.97. Never move published tags.

# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / Architecture Design Complete (SR-003) | SR-002, SR-003 | N/A | Fail (Design Impact) | ARCH-001, ARCH-002, ARCH-003, ARCH-004 |
| ARCH-REV-002 | Round 2 / SR-004 re-review | SR-002, SR-004 | Fail | Pass | ARCH-001..004 (resolved), ARCH-005 (new, non-blocking) |
| ARCH-REV-003 | Round 3 / SR-005 re-review (CR-002 / API-F-001) | SR-002, SR-005 | Pass | Pass | ARCH-001 (reopened downstream as CR-002; re-resolved) |

## Revision Entries

### ARCH-REV-001 — Initial review of the Stable/Beta channel design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md`
- Review round and trigger: Round 1. Initial architecture review after the `/solution_designer` handoff (Medium / High).
- Triggering role, report path, and finding IDs: `/solution_designer`, `handoff-solution-designer.md`; no prior findings
- Relevant solution revision IDs: SR-002 (approved requirements), SR-003 (design)
- Prior authoritative decision: N/A
- Current authoritative decision: `Fail`
- Baseline established:
  - The behavior basis is confirmed for all BEH IDs.
  - The electron-updater and electron-builder claims were verified against the installed sources.
  - Structure, ownership, boundaries and the persistence decision pass.
  - Two blocking gaps remain: the `downloaded`-state opt-out (ARCH-001) and the undefined tag grammar against the real tag inventory (ARCH-002).

#### Prior Finding Resolution

None.

- New or remaining finding IDs: ARCH-001 (blocking), ARCH-002 (blocking), ARCH-003 (non-blocking), ARCH-004 (non-blocking)
- Material classification changes: None
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: RSK-001 (accepted); the first real beta CI run must confirm UNK-001; release-window race frequency for beta users; Android patch ≤ 99 limit

### ARCH-REV-002 — Re-review of SR-004

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md`
- Review round and trigger: Round 2. SR-004 re-review request from `/solution_designer`.
- Triggering role, report path, and finding IDs: `/solution_designer`, `handoff-solution-designer.md` (SR-004 section); ARCH-001..004
- Relevant solution revision IDs: SR-002 (requirements, unchanged), SR-004
- Prior authoritative decision: `Fail` (ARCH-REV-001)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - All prior findings are resolved and verified against the current design spec, the investigation notes and the Docker workflow job structure.
  - The canonical grammar was checked against the real tag list: 301 of the 310 `v*` tags match, and the 9 excluded tags are exactly the rc, e2e and voice tags.
  - One new non-blocking implementation note: ARCH-005.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-001 | Open (blocking) | Resolved | SR-004 | design-spec DS-003 chain and narrative; Interface Mapping (`accepted:false` in `downloaded`); About file row (disabled plus hint); Guidance step 1; Key Tradeoffs; AC-008 validation note |
| ARCH-002 | Open (blocking) | Resolved | SR-004 | Terminology canonical grammar; `next-beta`/`is-newest` rows (out-of-grammar candidate gives `false`); real-inventory fixture row and example; investigation-notes line 172; grammar verified against `git tag -l` (301 of 310) |
| ARCH-003 | Open (non-blocking) | Resolved | SR-004 | DS-005 moved to a post-push step with `git fetch --tags --force`, `is-newest` and `imagetools create`; the build-and-push job already has the full-history checkout, buildx and login; residual documented in Risks |
| ARCH-004 | Open (non-blocking) | Resolved | SR-004 | `AppUpdateChannelChangeResult {accepted, persisted, state}`; store row (save-failed toast on `persisted:false`); no new state error fields |

- New or remaining finding IDs: ARCH-005 (Low, non-blocking): run the helper from `$GITHUB_SHA`, not from the `release_ref` checkout, so manual re-publishes of pre-change tags do not fail the run.
- Material classification changes: None
- Recommended recipient: `/implementation_engineer`; informational notification to `/solution_designer`
- Remaining risks or uncertainty: RSK-001; confirming UNK-001 on the first real beta run; the failed-newer-build `:beta` lag; the Android patch ≤ 99 limit

### ARCH-REV-003 — Re-review of SR-005 (sticky staged-update lock)

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-beta-update-channel/tickets/in-progress/desktop-beta-update-channel/design-review-report.md`
- Review round and trigger: Round 3. SR-005 re-review from `/solution_designer` after code-review failure-origin finding CR-002 / API-F-001 (CRR-003).
- Triggering role, report path, and finding IDs:
  - `/code_reviewer`, `code-review-report.md` (CR-002)
  - `/api_e2e_engineer`, `api-e2e-execution-coverage-report.md` (API-F-001)
  - Evidence: `api-e2e-evidence/harness-results/E2E-07b-downloaded-then-check-then-opt-out.json`
- Relevant solution revision IDs: SR-002 (requirements, unchanged), SR-005
- Prior authoritative decision: `Pass` (ARCH-REV-002 on SR-004)
- Current authoritative decision: `Pass`
- What changed in the review result:
  - The design resolution for ARCH-001 accepted in round 2 was insufficient. `downloaded` is a transient status, and a preserved manual check or a failed check unlocks it. That is premise P-006, confirmed at runtime.
  - SR-005 replaces it with a sticky per-process `updateStaged` fact and one shared `isAppUpdateChannelLocked(state)` rule, and removes the status-only set.
  - Verified: `applyState` merges partial state, so the flag persists. `update-downloaded` is the only staging event. Clearing happens only in the download-failure path, which leads to a safe over-lock (P-007).
  - Preserved behavior is untouched: the Check button, the `checkForUpdates` guard and `autoInstallOnAppQuit`.
  - Rejected alternatives (b) and (c) were correctly rejected, because both change preserved behavior.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-001 | Resolved (ARCH-REV-002) | Reopened downstream (CR-002 / API-F-001), now re-resolved | SR-005 | DS-003 chain and narrative; Interface Mapping refusal rule; Shared Structure row defining `updateStaged`; About row (hint whenever staged); Removal plan entry for `APP_UPDATE_CHANNEL_LOCKED_STATUSES`; Guidance step 1; example row; E2E-07b evidence of the prior bypass |
| ARCH-002..004 | Resolved | Resolved (unaffected) | SR-004 | Unchanged sections |
| ARCH-005 | Open (non-blocking, implementation) | Applied | CRR-003 behavior-basis note | `git show "$GITHUB_SHA:scripts/release_versions.py"` per code-review report |

- New or remaining finding IDs: None
- Material classification changes: None
- Recommended recipient: `/implementation_engineer`; informational notification to `/solution_designer`
- Remaining risks or uncertainty:
  - Install on quit has not been observed live (ad-hoc signing). The consequence rests on library source.
  - Over-lock after a failed replacement download (P-007): accepted.
  - RSK-001; confirming UNK-001 on the first real beta run (CI-01, delivery); Android patch ≤ 99 limit

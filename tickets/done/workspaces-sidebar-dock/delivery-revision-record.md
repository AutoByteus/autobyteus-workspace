# Delivery Revision Record — workspaces-sidebar-dock

Latest docs-sync, handoff-summary and release-deployment reports are authoritative. No prior Delivery result is inferred from an absent record.

## Revision Index
| ID | Trigger | Prior result | Current result | Affected canonical artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | API-REV-001 Pass / initial delivery | N/A | Blocked — integrated source verified/docs synced; affected-client user-only gate open | docs-sync-report.md, handoff-summary.md, release-deployment-report.md, evidence/delivery/, workspace_layout.md |
| DR-002 | R2/SR-003 explicit source-only continuation | DR-001 Blocked | Verification complete; finalization/cleanup in progress | current reports, verification-r2.json, archive/finalization/cleanup receipts |

## DR-001 — checked integration and truthful runtime boundary
- Round/trigger: first Delivery round, API/E2E 95% Pass, Medium / Low Direct Low-Risk; R1/SR-001, SR-002, IR-001 unchanged. Independent reviews and Product supplements N/A — not applicable.
- Prior authoritative result: **N/A**. Current authoritative result: **Blocked**, not Delivery Completed/Terminal.
- Initial refresh integrated advanced origin/personal `e22245f097c208e66065302cfc30814cc5ffd14f` into ticket at `4127815cd5383e055ff430674691e59f47742238`, before docs edits; no conflicts, checkpoint not needed. Relevant integrated 146 tests and browser4/4 pass, guard/licensing/artifact hygiene pass. Only incoming product delta is package beta.3→beta.4.
- Evidence judgement: actual critical AC JSON/log/screenshots and old-source/restored proof sufficient for changed-source AC-001–006, including real native data/worker preservation. Native beta.3 identity not rewritten to beta.4 or user's installed binary. AC-007 affected-client/user-only portion unresolved; direct factual/release questions submitted, no reply yet. No further API evidence needed.
- Canonical docs sync: `docs-sync-report.md`, Pass/Updated; policy capacity/raw preference vs measured drag/browser and conditional930/1210 bounds promoted into `autobyteus-web/docs/workspace_layout.md`.
- Canonical handoff: `handoff-summary.md`; canonical delivery/publication report: `release-deployment-report.md`; proof/cleanup/request in `evidence/delivery/`.
- Release: default No release under RELEASE.md; no user chosen publication/install/update authority. Missing release choice is not itself a blocker.
- Finalization: **Not executed**; no archive/final ticket commit/push/target merge/push/tag/release. Worktree/branch/builds retained for unfinished gates, generated dist excluded. Temporary Delivery probe cleaned, user app/data/8001 untouched.
- Terminal return to Solution Designer: **Not yet eligible**. Blocker route: non-deployment Unclear affected-runtime verification context; rule selection and confirmed send recorded in the delivery report/receipt when available. No successful Terminal message/reference.
- Rationale: record the initial integrated delivery result and precise open gate, rather than infer delivery completion from API Pass or source version.
- Next: Solution Designer resolves affected-client/acceptance context with the user's reply; Delivery resumes remaining verification/finalization and any explicitly chosen release/runtime work, refreshing target again. No replay of completed integration/validation solely to resend a receipt.
- Residual scope: unknown installed macOS client, unchanged native updater/OS-dialog paths not certified; compact-header polish remains separate. Rollback no deployed change yet; eventual release fix-forward policy applies.

## DR-002 — R2 source-only acceptance continuation (round in progress)
- Trigger: Solution Designer solution-delivery-continuation.md / SR-003, R2 Approved, exact user's “continue” in evidence/solution-acceptance-r2.md. Prior authoritative result DR-001 Blocked.
- Source behavior/design/classification unchanged; existing source proof sufficiently verified. Affected client facts Unconfirmed and installed/macOS verification Deferred — user-approved source-only, never Passed/Updated. No release/install/update/restart authority.
- Fresh target unchanged e22245f09; source/probe/fixture hashes and primary browser/native results rechecked. No acceptance-only test/implementation/review replay; no new product integration needed. Prior delivery edits preserved.
- Docs-sync Pass/Updated, latest handoff-summary.md and release-deployment-report.md own gate state. User-only acceptance blocker resolved, repository/archive/push/cleanup unfinished at round start.
- Current round result is not yet Delivery Completed; final index/entry will reflect actual completion or owning-gate blocker. DR-001 preserved without rewriting history.

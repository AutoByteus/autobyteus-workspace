# Delivery Revision Record — token-meter-accuracy

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | CRR-003 Pass (code reviewer) | N/A | Integrated, docs synced, waiting for user verification | `docs-sync-report.md`, `handoff-summary.md`, `release-notes.md`, `release-deployment-report.md` |
| DR-002 | User verification + "finalize and release a new beta" (2026-10-11) | DR-001 waiting for verification | Blocked: re-integration found a native-compaction reading conflict (Design Impact) | `release-deployment-report.md`, `handoff-summary.md`, `docs-sync-report.md` |
| DR-003 | CRR-009 Pass after the SR-008–SR-014 rework | DR-002 Blocked | Current with base, docs synced, checks pass; waiting for renewed user verification (AC-011, AC-012) | `docs-sync-report.md`, `handoff-summary.md`, `release-notes.md`, `release-deployment-report.md` |
| DR-004 | User sign-off: "finalize no need to release a new version" (2026-10-12) | DR-003 waiting for verification | Finalized into `personal`, no release, cleaned up | `release-deployment-report.md`, `handoff-summary.md`, `docs-sync-report.md` |

## Revision Entries

### DR-001 — Initial integrated delivery baseline

- Delivery round and trigger: round 1, after CRR-003 Pass on HEAD `2acf9b394`.
- Triggering upstream report, verification, or evidence: `api-e2e-test-review-report.md` (CRR-003), `api-e2e-execution-coverage-report.md` (API-REV-001 Pass, 95%), SR-006 / AF-16.
- Prior authoritative result: N/A.
- Current authoritative result: the branch is merged with `origin/personal` @ `46e94fdea`. Docs are synced, and the integrated checks pass. User verification (AC-010) and the release decision are pending.
- Docs sync report: `docs-sync-report.md`
- Handoff summary: `handoff-summary.md`
- Release/publication/deployment report: `release-deployment-report.md`
- Integration and post-integration verification:
  - Checkpoint `313684d16`.
  - Merges `fdf0dd3f0` and `ce6adb3a7`, with one predicted conflict resolved for the branch.
  - Upstream AGY result-path tests were adapted to per-step usage (converter ×2, fold ×2, upgrade-continuation E2E ×2, fake-CLI transport E2E).
  - Typechecks are clean, and the scoped server, core and web suites pass.
- User verification/finalization state: waiting for the user.
- Terminal return to `/solution_designer`: `Not yet eligible`
- Terminal return message/reference: —
- Why this baseline or delivery revision was recorded: first completed delivery-stage result.
- Next recipient/action: the user (desktop verification of fixes A/B plus runtime spot checks, and the release decision). Then finalize, release if requested, clean up, and return to `/software_engineering_team/solution_designer`.
- Remaining blockers, rollback concerns, or untested scope:
  - No blockers.
  - The adapted upstream AGY E2E expectations differ from upstream for the cache-miss catch-up, as the design intends.
  - The live AGY suites were not rerun by delivery; API-REV-001 LIVE covered AGY on the pre-merge branch.

### DR-002 — Finalization re-integration blocked by a native-compaction reading conflict

- Delivery round and trigger: finalization after the user's verification on 2026-10-11 ("i have verified. lets finalize and release a new beta").
- Triggering upstream report, verification, or evidence: `origin/personal` advanced to `beb6b3b49` (116 commits, including compaction-prompt-cache-reuse).
- Prior authoritative result: DR-001, waiting for user verification.
- Current authoritative result: `Blocked`.
  - Re-integrated locally (checkpoint `ea4e8fa5c`, merge `168900db7`). Typechecks and builds are clean; the scoped suites pass except the upstream `token-usage-compaction-ingestion.test.ts`.
  - That test expects the latest-prompt reading to become unknown after a native compaction call. This branch keeps the last reading (D-1/D-9).
- Docs sync report: `docs-sync-report.md` (TESTING.md note updated for the upstream rewrite).
- Handoff summary: `handoff-summary.md` (user verification recorded).
- Release/publication/deployment report: `release-deployment-report.md` § Finalization Re-Integration (DR-002).
- Integration and post-integration verification: see the report.
- User verification/finalization state: verified. Finalization and the beta release are held.
- Terminal return to `/solution_designer`: `Blocked` (blocker routed, not a terminal package).
- Why this delivery revision was recorded: the re-integration changes effective behavior relative to an approved upstream design, so delivery may not choose.
- Next recipient/action: `/software_engineering_team/solution_designer` decides (a) keep this branch's rule and adapt the upstream test, or (b) clear the reading on native compaction. Delivery then resumes finalization and the beta release, and gets a renewed user check if (b) changes what the meter shows.
- Remaining blockers, rollback concerns, or untested scope: the blocker above. The live suites were not rerun on the re-integrated state.
- Solution Designer decision (2026-10-11): option (b), recorded as SR-008 / D-11.
  - A native compaction call sets an explicit `context_reading_reset` fact, which resets the latest reading to unknown. The call still counts as a model call, with its tokens and cost.
  - The package goes to architecture re-review and then the normal route.
  - New AC-011: the user checks a native compaction in the desktop app before release.
- Delivery holds finalization and the beta release until the package returns. The local integration (`168900db7`, `15bdb2d62`) stays unpushed as the base. The next delivery round will be DR-003.
- Update (2026-10-12, SR-009): the user withdrew D-11; the context reading stays unchanged during compaction.
  - The ticket is paused until the team removing the AutoByteus (native) runtime finishes, because that removal takes away the native compaction path behind this blocker.
  - On resumption, Solution Designer will re-base the package on the then-current `origin/personal`, re-scope it without the native-only items, and send it back through the normal route.
  - Delivery keeps holding finalization and the beta. `168900db7` and `15bdb2d62` stay local and unpushed.
- Update (SR-010 / D-12): the SR-009 pause is lifted. The other team is removing the remote provider, not the native runtime.
  - D-11 is withdrawn. A native compaction call counts as a model call with its tokens and cost, and the latest reading is kept until the next real reading (option (a) of DR-002).
  - IR-003 is reverted, and the upstream compaction test is adapted to "reading kept".
  - The package goes to architecture re-review and then the normal route back to delivery. Delivery keeps holding finalization and the beta; `168900db7` and `15bdb2d62` stay local and unpushed as the base. The next delivery round is DR-003.

### DR-003 — Resumed delivery after the D-12 / D-13 rework

- Delivery round and trigger: round 3, after CRR-009 Pass (test-code review of API-REV-003).
- Triggering upstream report, verification, or evidence: `api-e2e-test-review-report.md` § Round 2, `api-e2e-execution-coverage-report.md` (API-REV-003 Pass, 94%), `solution-revision-record.md` SR-008–SR-014.
- Prior authoritative result: DR-002 Blocked (native-compaction reading conflict).
- Current authoritative result:
  - The DR-002 blocker is resolved by D-12: a native compaction call keeps the reading.
  - The branch is current with `origin/personal` @ `beb6b3b49`; docs are synced (`0ba052b0f`); the integrated checks pass.
  - Waiting for renewed user verification of AC-011 and AC-012.
- Docs sync report: `docs-sync-report.md` § DR-003.
- Handoff summary: `handoff-summary.md` (renewed verification requested).
- Release/publication/deployment report: `release-deployment-report.md` § Resumed Delivery (DR-003).
- Integration and post-integration verification: no new base commits; checkpoint `23cf64003`; checks as recorded in the report.
- User verification/finalization state: AC-010 verified on 2026-10-11, and the user asked for a beta. AC-011 and AC-012 are pending.
- Terminal return to `/solution_designer`: `Not yet eligible`.
- Why this delivery revision was recorded: delivery resumed with a changed user-facing package.
- Next recipient/action: the user (AC-011, AC-012). Then finalize, release the next beta after 1.5.1, clean up, and return to `/software_engineering_team/solution_designer`.
- Remaining blockers, rollback concerns, or untested scope:
  - No blockers.
  - Residual risks as listed in API-REV-003 and in `handoff-summary.md` § Follow-Ups.

### DR-004 — Finalization, no release

- Delivery round and trigger: the user's sign-off on 2026-10-12, "finalize no need to release a new version".
- Triggering upstream report, verification, or evidence: the user verification above; `origin/personal` advanced to `3514fe48e`.
- Prior authoritative result: DR-003, waiting for renewed verification.
- Current authoritative result:
  - Re-integrated (merge `0c1c60a5c`, no conflicts); checks pass.
  - Archived to `tickets/done/token-meter-accuracy/`, then merged into `personal` and pushed.
  - No release. The worktree and local branch are removed.
  - Exact commits and push results are in `release-deployment-report.md` § Repository Finalization.
- Docs sync report: `docs-sync-report.md` (TESTING.md rule `99e5e1e05` recorded).
- Handoff summary: `handoff-summary.md`.
- Release/publication/deployment report: `release-deployment-report.md`.
- User verification/finalization state: verified; finalized; release `Not required`.
- Terminal return to `/solution_designer`: sent after this record is pushed.
- Why this delivery revision was recorded: final completion of delivery.
- Next recipient/action: `/software_engineering_team/solution_designer` verifies the terminal package.
- Remaining blockers, rollback concerns, or untested scope: none blocking. Residual risks and follow-ups are listed in `handoff-summary.md`.

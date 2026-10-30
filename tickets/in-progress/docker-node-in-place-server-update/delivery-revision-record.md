# Delivery Revision Record — autobyteus-305 (docker-node-in-place-server-update)

The latest docs sync report, handoff summary and release/deployment report are authoritative. This record keeps one entry per delivery round. Each build step of the ticket is delivered on its own.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Build step 1 (signed server package): CRR-002 Pass | N/A | Delivery Completed for step 1: merged into `personal`, no release | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `evidence/DEL-01-*`, `evidence/DEL-02-*` |
| DR-002 | Build step 2 (starter and server-packages volume): CRR-004 Not Applicable after API-REV-002 Pass | DR-001 Delivery Completed (step 1) | Delivery Completed for step 2: merged into `personal`, no release | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md` (rewritten for step 2; step-1 versions in git at `77fb8bf2d1`), `evidence/DEL-03-*` |
| DR-003 | Build step 3 (in-place update by command): CRR-006 Not Applicable after API-REV-003 Pass; the user asked for a beta | DR-002 Delivery Completed (step 2) | See the DR-003 entry | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md` (rewritten for step 3; step-2 versions at `6b34f900b6`), `release-notes.md`, `evidence/DEL-04-*`, `evidence/DEL-05-*` |
| DR-004 | Build step 4 (desktop: node version and "Update to <version>"): CRR-008 Not Applicable after API-REV-004 Pass | DR-003 Delivery Completed (step 3, beta v1.5.11-beta.6) | See the DR-004 entry | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md` (rewritten for step 4; step-3 versions at `1bed6deeaf`), `release-notes.md`, `evidence/DEL-11-*` |

## Revision Entries

### DR-001 — Build step 1 merged into `personal` without a release

- Delivery round and trigger: first delivery round, build step 1. Code reviewer CRR-002 Pass (test-code review of `4c356d69b7`) after API-REV-001 Pass (95%).
- Triggering upstream report, verification, or evidence: `api-e2e-test-review-report.md`, `api-e2e-execution-coverage-report.md`, `code-review-report.md` (CRR-001, notes CR-N1..CR-N3).
- Prior authoritative result: `N/A`
- Current authoritative result: verified from the evidence; docs synced (CR-N2, CR-N3, docs side of CR-N1); finalized into `personal`; no release (RELEASE.md default).
- Docs sync report: `docs-sync-report.md`
- Handoff summary: `handoff-summary.md`
- Release/publication/deployment report: `release-deployment-report.md`
- Integration and post-integration verification: checkpoint `44620de716`; merge of `origin/personal` @ `e4bebdc858` as `a85cf65c52` (autobyteus-284 brought in, no overlap); DEL-01 checks and DEL-02 integrated-state image start passed.
- Verification and finalization state: see the Finalization Record below.
- Terminal return to the Solution Designer: see the Finalization Record below.
- Why this baseline was recorded: first completed delivery of the ticket (step 1 of 5).
- Next recipient/action: Solution Designer (terminal return for step 1); the ticket continues with step 2 on the same branch.
- Remaining blockers, rollback concerns, or untested scope: AC-011's GitHub part is open until the first release after this merge (the check is in `handoff-summary.md`). CR-N1 code side goes to step 2. Steps 2–5 are not built.

#### Finalization Record

- Delivery commit on the ticket branch: `a23ab2cbe2` (docs sync, delivery records, DEL evidence).
- Secret Gate: `origin/personal..codex/docker-node-in-place-server-update` PASS (10 commits) before the first push; PASS again on the merged state (11 commits).
- Ticket branch pushed: `origin/codex/docker-node-in-place-server-update` @ `a23ab2cbe2` (new branch).
- Target re-fetched after verification: `origin/personal` still `e4bebdc858`, the base integrated in `a85cf65c52`. No re-integration needed; the merged tree equals the verified ticket branch tree.
- Merge: `finalize/docker-node-in-place-server-update` from `origin/personal`, `git merge --no-ff` → `eec6522b27`; re-fetched before the push, `origin/personal` unchanged.
- Push: `origin personal` `e4bebdc858..eec6522b27`. A branch push starts no workflow (all release workflows trigger on `v*` tags or by hand).
- Release: none (RELEASE.md default; the user did not ask).
- Cleanup: worktree and `codex/docker-node-in-place-server-update` kept for steps 2–5; ticket folder kept in `tickets/in-progress/`. The local `finalize/…` branch is deleted after this record is pushed.
- Terminal return to the Solution Designer: sent after this record is on `personal`.

### DR-002 — Build step 2 merged into `personal` without a release

- Delivery round and trigger: second delivery round, build step 2. Code reviewer CRR-004 `Not Applicable` (no durable test changed) after API-REV-002 Pass (94.7%) and CRR-003 Pass.
- Triggering upstream report, verification, or evidence: `api-e2e-test-review-report.md` (CRR-004), `api-e2e-execution-coverage-report.md` (API-REV-002), `code-review-report.md` (CRR-003, note CR2-N1).
- Prior authoritative result: DR-001, Delivery Completed for step 1 (`personal` @ `77fb8bf2d1`).
- Current authoritative result: verified from the evidence; docs synced (`remote_access.md` owner route); finalized into `personal`; no release.
- Docs sync report / handoff summary / release report: rewritten for step 2 (step-1 versions in git at `77fb8bf2d1`).
- Integration and post-integration verification: base `77fb8bf2d1` unchanged, already current; DEL-03 confirmation checks passed.
- Decisions recorded: CR2-N1 accepted as an interim (a release may fall between step 2 and step 3); RU-23 passed to the Solution Designer for the step-3 design and the step-3 release notes; FU-006 stays a follow-up; 94.7% confidence accepted (the gap is FU-006's pre-existing PowerShell coverage).
- Next recipient/action: Solution Designer (terminal return for step 2); the ticket continues with step 3.
- Remaining blockers, rollback concerns, or untested scope: the step-1 first-release checks (AC-011 GitHub part) are still open, since no release has been cut since step 1. Steps 3–5 are not built.

#### Finalization Record

- Delivery commit on the ticket branch: `095240268b` (docs sync, delivery records, DEL-03, the code reviewer's CRR-003/CRR-004 records).
- Secret Gate: `origin/personal..codex/docker-node-in-place-server-update` PASS (6 commits) before the push; PASS again on the merged state.
- Ticket branch pushed: `origin/codex/docker-node-in-place-server-update` @ `095240268b`.
- Target re-fetched after verification: `origin/personal` still `77fb8bf2d1`; no re-integration needed; the merged tree equals the verified ticket branch tree.
- Merge: `finalize/docker-node-in-place-server-update` from `origin/personal`, `git merge --no-ff` → `a0f4b491f7`; re-fetched before the push, unchanged.
- Push: `origin personal` `77fb8bf2d1..a0f4b491f7`. A branch push starts no workflow.
- Release: none (RELEASE.md default; the user did not ask).
- Cleanup: worktree and branch kept for steps 3–5; ticket folder kept in `tickets/in-progress/`; the local `finalize/…` branch is deleted after this record is pushed.
- Terminal return to the Solution Designer: sent after this record is on `personal`.

### DR-003 — Build step 3 merged into `personal`; beta v1.5.11-beta.6

- Delivery round and trigger: third delivery round, build step 3. Code reviewer CRR-006 `Not Applicable` (no durable test changed) after API-REV-003 Pass (94.7%) and CRR-005 Pass. During delivery the user asked: "if everything is fine after your auditing. lets release a new beta".
- Prior authoritative result: DR-002, Delivery Completed for step 2 (`personal` @ `6b34f900b6`).
- Integration and post-integration verification: checkpoint `fed31bb5fb`; merge of `origin/personal` @ `a8d7c87564` as `f0b2b43dbc` (autobyteus-343); DEL-04 checks and DEL-05 integrated image (incl. real GitHub source) passed.
- Verification: from the evidence, sufficient (release-deployment-report.md).
- Decisions recorded: CR3-N1 for implementation with step 4; the two API/E2E observations noted, not findings; RU-23 in `release-notes.md`; release notes added to the beta's generated notes (deviation recorded); FU-006 stays a follow-up.
- Next recipient/action: finalize, release the beta per RELEASE.md, then terminal return to the Solution Designer.

#### Finalization And Release Record

- Ticket branch: delivery commit `d5a9024922`, pushed (Secret Gate PASS).
- Merge: `--no-ff` into `personal` as `0a223aa397`, pushed `a8d7c87564..0a223aa397` (target unchanged at both fetches).
- Release smoke: Grok refused by its free-tier quota (run 1: 1 of 3 scenarios; run 2: 3 of 3); **the user waived Grok** ("waive grok"). All other runtimes passed both runs.
- Build-only run 1 (`41121610105`) failed: the `macos-14` brownout, plus a transient npm 404 (tslib 2.9.1 minutes after publish). FU-007 and FU-008 were recorded.
- **On the user's instruction**, delivery moved the desktop macOS jobs to `macos-15` (merge `f6a5c85175`); FU-007 is resolved. Build-only run 2 (`41124044082`) succeeded.
- Release: `scripts/desktop-release.sh beta` → `35d33852ef` + tag `v1.5.11-beta.6`; pushed `personal` and the tag.
- All four workflows succeeded: Desktop `41127864410`, Android `41127864415`, iOS `41127864440`, Docker `41127864490` incl. both Publish Server Package jobs.
- Published: 23/23 assets, pre-release, "Latest" stays v1.5.10; Docker `:1.5.11-beta.6` = `:beta`, `:latest` unchanged.
- AC-011 GitHub part proven: production-key signatures, archive SHA-256, byte-identical to the image's package (45,360 entries); the published starter reads real GitHub.
- Release body: the ticket's `release-notes.md` added above the generated notes (deviation recorded).
- Cleanup: worktree and ticket branch kept for steps 4–5; local finalize branch deleted; delivery's test artifacts and pulled image removed.
- Terminal return to the Solution Designer: sent after this record is on `personal`.

### DR-004 — Build step 4 merged into `personal` without a release

- Delivery round and trigger: fourth delivery round, build step 4. CRR-008 `Not Applicable` (no durable test changed) after API-REV-004 Pass (94.7%) and CRR-007 Pass.
- Prior authoritative result: DR-003, Delivery Completed for step 3 and beta v1.5.11-beta.6 (`personal` @ `1bed6deeaf`).
- Integration: base `1bed6deeaf` unchanged, already current; DEL-11 confirmation checks passed.
- Verification: from the evidence, sufficient. Every row state is settled by the design or ARCH-REV-005 N-4.
- Docs: `autobyteus-web/docs/settings.md` (server line, polling) and `remote_access.md` (`POST /rest/node-update`). `release-notes.md` rewritten for the release that ships step 4.
- Decisions recorded:
  - N-4 visibility, CR4-N1 and the zh-CN English reasons passed to the Solution Designer as product choices;
  - the user's nodes run the pre-step-1 `:beta` (read-only check), so they will show "Not reachable." until the reinstall and `upgrade --all`;
  - CR3-N1 is fixed in step 4's code.
- Release: none (RELEASE.md default; not requested for step 4).
- Next recipient/action: finalize, then terminal return to the Solution Designer; step 5 waits for autobyteus-285/287.

#### Finalization Record

- Delivery commit on the ticket branch: `5c545a7bc8`, pushed (Secret Gate PASS).
- Target re-fetched: `origin/personal` still `1bed6deeaf`; no re-integration; the merged tree equals the ticket branch.
- Merge: `--no-ff` into `personal` as `db0881a96e`; Secret Gate PASS on the merged state; pushed `1bed6deeaf..db0881a96e`.
- Release: none. Cleanup: worktree and branch kept for step 5; the local `finalize/…` branch is deleted after this record is pushed.
- Terminal return to the Solution Designer: sent after this record is on `personal`.

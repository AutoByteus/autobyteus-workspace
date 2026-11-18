# Delivery Revision Record — release v1.5.12-beta.3 (autobyteus-397)

The release/deployment report is the authoritative record.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release request from the user, made directly to the delivery engineer ("please release a new beta thanks") | N/A | Released `v1.5.12-beta.3` on `2f2a361aac` (+ version bump `dad7a89c95`) | `release-deployment-report.md`, `evidence/REL-01…05` |

## Revision Entries

### DR-001 — Beta v1.5.12-beta.3

- Delivery round and trigger: release request with no software change. The user's own words are in the report. The Project Task Manager recorded it afterwards as autobyteus-397.
- Prior authoritative result: N/A.
- Current authoritative result: **released**.
  - Checks before tagging pass.
  - Release smoke 10/13. All three Codex cases were refused by the account quota. The user waived Codex and Grok ("wavie codex and grok please"); Grok passed 3/3 anyway.
  - Build-only run `42213150758`: success.
  - Tag `v1.5.12-beta.3`; 4/4 workflows succeeded; 23/23 assets.
  - Docker `:beta` moved; `:latest` unchanged.
  - Generated notes only, because no carried ticket has a user action.
- Interim state: before tagging, paused once on the Codex quota and reported to the user. Resumed on the user's waiver.
- Guide note: `RELEASE.md` `7e87db8026`, which removed the per-tag build-only run, reached `personal` after this tag. This release followed the earlier rule.
- Release/publication/deployment report: `release-deployment-report.md`.
- Report and cleanup sent to the Project Task Manager (autobyteus-397), which verifies and closes the Task.
- Remaining blockers, rollback concerns or untested scope: Codex smoke did not run (waived). No other gap.

# Delivery Revision Record — beta-release-1-5-12-beta-8 (autobyteus-431)

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release Requested from the Solution Designer | N/A | Delivery Completed: `v1.5.12-beta.8` released | release-deployment-report.md, evidence/DEL-01…03 |

## Revision Entries

### DR-001 — beta v1.5.12-beta.8 released

- Delivery round and trigger: the Solution Designer's `Release Requested` handoff for Task autobyteus-431.
- Triggering upstream report, verification, or evidence: `handoff-release-requested.md`; the user's "we need a new beta now. If any runtime has token limit, I waive for that".
- Prior authoritative result: N/A.
- Current authoritative result:
  - Pre-tag checks pass on `d785ded109`. In the release smoke, Codex was refused by its usage limit and waived; every other runtime passed.
  - Release commit `a1ea19c0eb` and tag `v1.5.12-beta.8` pushed.
  - 4/4 workflows succeeded; the GitHub pre-release has 23/23 assets.
  - createdAt check: every `latest*.yml` (03:25:17Z) is newer than all six server package files (≤ 03:24:46Z).
  - Docker `:beta` = `1.5.12-beta.8`; `:latest` = `1.5.11`.
  - The notes carry the node-update line and 416's `AUTOBYTEUS_ALLOWED_HOSTS` / `AUTOBYTEUS_ALLOWED_ORIGINS` actions.
- Docs sync report: N/A (release request).
- Handoff summary: N/A (release request).
- Release/publication/deployment report: [release-deployment-report.md](release-deployment-report.md)
- Integration and post-integration verification: base `d785ded109`, unchanged until the push.
- Verification (evidence judgement or user check) and finalization state: the release guide's checks; finalized on `personal`.
- Terminal return to the Solution Designer: `Sent`
- Terminal return message/reference: `Delivery Completed` to `/software_engineering_team/solution_designer`
- Why this baseline or delivery revision was recorded: first and only delivery round.
- Next recipient/action: Solution Designer verifies and reports to the PM. The new `:beta` image is published, so the PM or the user can update the user's Docker nodes.
- Remaining blockers, rollback concerns, or untested scope: none. Signing, notarization and the Windows/Linux builds ran only on the release runners (as always).

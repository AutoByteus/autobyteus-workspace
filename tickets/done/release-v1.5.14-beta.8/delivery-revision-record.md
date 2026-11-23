# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Solution Designer: `Release Requested`, beta v1.5.14-beta.8, on the founder's word (2026-11-23) | N/A | Released: tag `v1.5.14-beta.8` on `807d501cec`, four workflows green (Desktop on attempt 2), 27 of 27 assets, iOS 1.5.14 (354) on TestFlight, Docker `:beta` moved and `:latest` unchanged, system level 2 | `release-deployment-report.md`, `release-notes.md`, `follow-ups.md` |

## Revision Entries

### DR-001 — Release of beta v1.5.14-beta.8

- Delivery round and trigger: first and only delivery round; a release request with no software change (`handoff-release.md`).
- Triggering upstream report, verification, or evidence: the request file; RELEASE.md's checks as the verification (no validated package, so docs sync, the handoff summary and Verify From Evidence do not apply).
- Prior authoritative result: N/A
- Current authoritative result: released and verified (see the report).
- Docs sync report: Not applicable (a release request)
- Handoff summary: Not applicable (a release request)
- Release/publication/deployment report: `release-deployment-report.md`
- Integration and post-integration verification: the base `origin/personal` @ `dad158474c` did not move from the start of delivery to the push; the ticket branch was current. The checks before tagging ran on that state (licensing, hygiene, secrets over 216 commits, system level, signing trust, a live release smoke 13 of 13).
- Verification (evidence judgement or user check) and finalization state: RELEASE.md's checks passed; the release smoke passed Grok without a waiver. No user check was needed.
- Terminal return to the Solution Designer: `Sent` after the record commit, the founder's checkout update, the cleanup and the record copy.
- Terminal return message/reference: `send_message_to` the Solution Designer, Delivery Completed, 2026-11-23.
- Why this baseline or delivery revision was recorded: the release record.
- Next recipient/action: the Solution Designer verifies the package and returns the result to the PM. It decides FU-001 (the macOS notarization retry in `release-desktop.yml`) and may tell autobyteus-551's owner that this smoke is its DEC-006 check (load 28 to 42, Grok 3/3, start-ups at most 181 ms).
- Remaining blockers, rollback concerns, or untested scope: none blocking. The release carries a one-way data conversion (autobyteus-29), so it cannot be rolled back after the first start; the notes say so. Autobyteus-29 was not named in the Task's list but is on `origin/personal`.

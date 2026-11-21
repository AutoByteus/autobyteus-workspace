# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Solution Designer: Release Requested (2026-11-21) | N/A | Delivery Completed: v1.5.14-beta.6 released (4/4 workflows, 27/27 assets, iOS 1.5.14 (352) in TestFlight) | `release-deployment-report.md`, `release-notes.md`, `evidence/delivery/` |

## Revision Entries

### DR-001 — The release

- The founder's word: "Yeah releaser ask the previous team which released that I mean did the Mac the iOS app just do the ask to release a beta".
- Checks before tagging passed; smoke 13/13, no waiver. Cut `9c5f85f92f`, tag `v1.5.14-beta.6`, pushed 12:00Z.
- All four workflows succeeded; iOS 1.5.14 (352) uploaded, the icon check passed, no ITMS message; verified assets, order, Docker and notes (one Full Changelog line).

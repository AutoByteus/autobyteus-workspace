# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Solution Designer: Release Requested (2026-11-21) | N/A | Delivery Completed: v1.5.14-beta.5 released (4/4 workflows, 27/27 assets, iOS 1.5.14 (349) in TestFlight) | `release-deployment-report.md`, `release-notes.md`, `evidence/delivery/` |

## Revision Entries

### DR-001 — The release

- The founder's word: "Anyway I think that IOS a problem is fixed right we can release a new version now".
- Checks before tagging all passed; the release smoke 13 of 13 (Grok included, no waiver).
- Cut `b4723d0bb7`, tag `v1.5.14-beta.5`, pushed 08:39Z; all four workflows succeeded on attempt 1.
- iOS uploaded to TestFlight with Xcode 27.2 / SDK 27.2 and no warning; nothing to App Store review.
- Verified: 27 assets, `latest*.yml` after the server packages, Docker `:beta` moved and `:latest` unchanged, notes prepended.

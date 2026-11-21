# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Solution Designer: Release Requested (2026-11-21) | N/A | Delivery Completed (partial release): v1.5.14-beta.4 tagged and published; iOS failed (ours), fixed forward by a prerequisite Task and beta.5 | `release-deployment-report.md`, `release-notes.md`, `follow-ups.md`, `evidence/delivery/` |

## Revision Entries

### DR-001 — The release

- The founder's words: "Let's first the release on new version a new beta" (the request); "Waive for grok" (to delivery directly, after the smoke).
- Checks before tagging: all passed except Grok (waived; FU-2); the signing trust check passed with the official HTTPS URL (FU-1).
- Cut: `90c4958a35`, tag `v1.5.14-beta.4`, pushed 06:54Z.
- Workflows: Desktop, Docker, Android success; iOS failed (ours: the demo build's operation coverage after 554), nothing uploaded.
- Verified: 27 of 27 assets, `latest*.yml` after the server packages, Docker `:beta` moved and `:latest` unchanged, notes prepended without the iOS line.
- Next: the Solution Designer's prerequisite Task for the demo coverage and its local check; beta.5 on the founder's word.

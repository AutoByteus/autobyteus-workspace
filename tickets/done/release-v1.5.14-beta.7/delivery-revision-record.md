# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Solution Designer: Release Requested (2026-11-22) | N/A | Delivery Completed: v1.5.14-beta.7 released (4/4 workflows, 27/27 assets, iOS 1.5.14 (353) in TestFlight, Docker system level 2) | `release-deployment-report.md`, `release-notes.md`, `follow-ups.md`, `evidence/delivery/` |

## Revision Entries

### DR-001 — The release

- The founder's words: "I think we can create a new beta version now" (the request); "Waive for grok thanks" (Grok, beta.7 only, after two smoke runs).
- Checks before tagging passed (system level 2 unchanged); Grok waived; FU-1 (Grok AC-104).
- Cut `df00f97aaa`, tag `v1.5.14-beta.7`, pushed 07:30Z. iOS attempt 1 failed on the hosted simulator (platform), rerun at once; attempt 2 succeeded.
- Verified: 27 assets, `latest*.yml` after the server packages, Docker `:beta` moved, `:latest` unchanged, level 2 in the images and packages, notes prepended with one Full Changelog line.

# Delivery Revision Record — beta-release-v1.5.12-beta.1 (autobyteus-383)

The latest `release-deployment-report.md` remains authoritative.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | Release Requested (Solution Designer, 2026-11-04) | N/A | Stopped before tagging: build-only run `41853372496` had both macOS jobs cancelled for lack of hosted runners; no tag | `release-deployment-report.md` (placeholders) |
| DR-002 | The user's beta for autobyteus-384 (2026-11-05), carried out on the tip holding 381 and 384 | DR-001 stopped | `v1.5.12-beta.1` released: 4/4 workflows, 23/23 assets, Docker `:beta`; Codex waived by the user | `release-deployment-report.md`, `evidence/REL-01-release-smoke.txt` |

## Revision Entries

### DR-001 — The next beta after v1.5.11

- Delivery round and trigger: round 1; `/software_engineering_team/solution_designer` sent `Release Requested` with `handoff.md`.
- Prior authoritative result: N/A.
- Current authoritative result, checks, release and cleanup: `release-deployment-report.md`.
- Next recipient/action: `/software_engineering_team/solution_designer` after the release completes.

### DR-002 — Released on 2026-11-05

- The first attempt (DR-001) stopped because GitHub could not acquire macOS runners; no tag was made.
- The delivery engineer for autobyteus-384 cut `v1.5.12-beta.1` from `d09985c561`:
  - checks: licensing, hygiene and Secret Gate pass; build-only run `41980791585` 5/5; release smoke 10/13, with Codex refused by quota and waived by the user;
  - release: tag on `f10c45aab8`; all four workflows succeeded; 23 assets.
- This fulfils autobyteus-383's request.

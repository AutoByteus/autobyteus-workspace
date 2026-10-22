# Delivery Revision Record — remote-run-title (autobyteus-269)

The latest docs sync report, handoff summary and release/deployment report remain authoritative.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | API-REV-002 Pass (direct route); the user's "finalize and release a stable version now" (2026-10-22) | N/A | Integrated with `ca1f09e52a` and rechecked; docs verified; AC-601 … AC-604 verified; AC-605 open (user); FU-001 recorded; archived, finalized, released as stable `v1.5.8` with curated notes | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `release-notes.md`, `delivery-revision-record.md`, `follow-ups.md`, `evidence/delivery/` |

## Revision Entries

### DR-001 — Verified, finalized and released as stable v1.5.8; AC-605 open with the user

- Delivery round and trigger: API/E2E's Pass on the direct route. The user then decided to finalize ("but it reaches your place now") and to release a stable version.
- Prior authoritative result: N/A.
- Current authoritative result:
  - Checkpoint `89aeb8f5d8`; merge of `ca1f09e52a`; DEL-01/02 pass.
  - Docs verified, with no edit; FU-001 recorded.
  - AC-605 is the user's check, after release.
  - Stable `v1.5.8` (`release-deployment-report.md`).
- Terminal return to the Solution Designer: after the release and cleanup, stating AC-605 as open.
- Remaining blockers, rollback concerns, or untested scope: AC-605. The release notes state that going back to an earlier version is not supported, because of the Skill Improvement data deletion and the new remote-collaboration fields.

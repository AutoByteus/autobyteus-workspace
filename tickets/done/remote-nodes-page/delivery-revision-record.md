# Delivery Revision Record — remote-nodes-page (autobyteus-267)

The latest docs sync report, handoff summary and release/deployment report remain authoritative.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | API-REV-002 Pass (direct route); the user's beta request (2026-10-21) | N/A | Integrated with `00d8a7ce62` and rechecked (DEL-01 … DEL-06 pass); docs synced (in-flight rule); AC-501/502/504/505/507 verified; AC-506 open (user, on the beta); archived, finalized, released as `v1.5.8-beta.8` | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `delivery-revision-record.md`, `evidence/delivery/` |

## Revision Entries

### DR-001 — Integrated, verified, finalized and released as a beta; AC-506 open with the user

- Delivery round and trigger: API/E2E's Pass on the direct route (API-REV-002), then the user's "could you please release a new beta" during delivery.
- Prior authoritative result: N/A.
- Current authoritative result:
  - Checkpoint `186e487af1`; merge `534ae78028` (remote-node-runtime-sign-in, `1.5.8-beta.7`).
  - DEL-01 … DEL-06 pass.
  - Docs: the in-flight rule was added to `settings.md`.
  - Verification from the evidence; AC-506 is the user's, on the beta.
  - Archived, finalized and released (`release-deployment-report.md`).
- Verification and finalization state: AC-506 open (user check pending on `v1.5.8-beta.8`).
- Terminal return to the Solution Designer: after the release and cleanup, stating AC-506 as open.
- Remaining blockers, rollback concerns, or untested scope: AC-506; RSK-501.

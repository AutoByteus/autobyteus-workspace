# Delivery Revision Record — remote-discovery (autobyteus-261)

The latest docs sync report, handoff summary and release/deployment report remain authoritative.

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | CRR-002 Pass after API-REV-001 Pass; the user's decision to release a beta (2026-10-21) | N/A | AC-401 … AC-407 verified from the evidence; AC-408 open (the user checks on the beta); archived, finalized, released as `v1.5.8-beta.6` | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `delivery-revision-record.md` |

## Revision Entries

### DR-001 — Verified, finalized and released as a beta; AC-408 open with the user

- Delivery round and trigger: the code reviewer's validated package (CRR-001, API-REV-001, CRR-002), then the user's "now release a new beta thanks" after delivery asked how to run AC-408.
- Prior authoritative result: N/A.
- Current authoritative result:
  - The base was current; checkpoint `b90e531506`.
  - Docs verified, with no edit.
  - AC-401 … AC-407 proven from the evidence (95%).
  - AC-408 is the user's check; the user chose to run it on the beta, so finalization came before it, by the user's decision.
  - Archived, finalized, released as `v1.5.8-beta.6` (`release-deployment-report.md`).
- Verification and finalization state: evidence sufficient for AC-401 … AC-407; AC-408 open (user check pending on the beta).
- Terminal return to the Solution Designer: after the release and cleanup, stating AC-408 as open with the user.
- Remaining blockers, rollback concerns, or untested scope: AC-408; RSK-401/402; the older-peer 404 path is unit-only.

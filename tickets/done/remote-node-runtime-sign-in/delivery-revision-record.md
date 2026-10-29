# Delivery Revision Record — remote-node-runtime-sign-in

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | API/E2E Pass (API-REV-001, `591a72fbc`), direct Medium/Low route | N/A | Finalized into `personal` and released as beta `v1.5.8-beta.7` (complete); user check open on the beta by the user's choice | `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `evidence/DR-*` |

## Revision Entries

### DR-001 — Integrated delivery baseline, user check pending

- Delivery round and trigger: first delivery round, after the API/E2E Pass. Resumed after a power-off; the worktree was intact at `591a72fbc`.
- Triggering upstream report, verification, or evidence: `api-e2e-execution-coverage-report.md` (Pass, 95%)
- Prior authoritative result: N/A
- Current authoritative result: integrated with `origin/personal` `9e7a45880` as `ec4dcb177`; DR-01…DR-06 pass; docs synced; evidence sufficient except AC-001/AC-002 end and AC-007, which only the user can check
- Docs sync report: `docs-sync-report.md`
- Handoff summary: `handoff-summary.md`
- Release/publication/deployment report: `release-deployment-report.md`
- Integration and post-integration verification: merge, no conflicts; DR-01…DR-06 pass
- Verification and finalization state: verified from evidence except the user-only parts. The user was asked how to sequence their check and answered "release a new beta please". Merged `6d0898586`, released `v1.5.8-beta.7` (`d2ef61aff`): four of four workflows succeeded, 17 assets, Docker `:beta` moved. The user check of AC-001/AC-002 end and AC-007 is open on the beta.
- Terminal return to the Solution Designer: `Sent`
- Terminal return message/reference: `Delivery Completed`, 2026-10-21, after the records push
- Why this baseline was recorded: to keep the integrated, verified-from-evidence state across interruptions while the user check is outstanding
- Next recipient/action: the Solution Designer (terminal). The user updates the app and nodes to `1.5.8-beta.7` and checks sign-in and a Codex chat.
- Remaining blockers, rollback concerns, or untested scope: the open user check. R-02: update the app and the nodes together. Rollback: revert the merge and cut a new release; there is no data migration.

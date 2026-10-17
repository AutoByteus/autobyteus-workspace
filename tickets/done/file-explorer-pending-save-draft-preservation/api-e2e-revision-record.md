# API/E2E Revision Record

## Revision Index
| Revision ID | Trigger | Upstream Revisions | Prior | Current |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Complete IR-001 | SR-001, IR-001 | N/A | Pass / 95% |

## Revision Entries
### API-REV-001 — Real-Monaco pending-Save draft validation baseline
- Trigger: implementation handoff /Users/normy/autobyteus_org/autobyteus-worktrees/file-explorer-pending-save-draft-preservation/tickets/in-progress/file-explorer-pending-save-draft-preservation/implementation-handoff.md, round 1
- Findings: RSK-001 (real Monaco) assigned to API/E2E
- Related revisions: SR-001, IR-001 (dev commit 50f25f68d9)
- Why: baseline validation of AC-001..AC-008
- Coverage decisions / durable paths: unit regressions Still Valid; added autobyteus-web/tests/e2e/file-explorer-pending-save-draft-probe.mjs, fixtures/file-explorer-pending-save-draft.page.vue, package.json script
- Cases: PSD-001..PSD-011 added
- Commands/environment: see report; two fix runs and one base-store run; PSD-010/011 added after the first runs to cover pending-then-fail; Monaco `Canceled` rejection classified as pre-existing noise (reproduced on base)

#### Prior Failure Resolution
None.

- Canonical artifacts updated: investigation, report, ledger
- Prior result: N/A
- Current result: Pass, 95%
- Failure IDs: none
- Recommended owner: N/A
- Remaining risks: Electron shell not run (no shell code touched); probe depends on CDN Monaco and a current server build; probe files uncommitted

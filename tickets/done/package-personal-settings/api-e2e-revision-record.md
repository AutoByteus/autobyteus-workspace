# API/E2E Revision Record — package-personal-settings (autobyteus-95, stage 1)

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-001 (implementation review pass) | SR-006, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.0% |

## Revision Entries

### API-REV-001 — Baseline: personal-settings server E2E, runs and members, packaged-instance journeys on real GitHub

- Triggering role, report path, and round: code reviewer, `tickets/in-progress/package-personal-settings/code-review-report.md`, CRR-001
- Triggering finding or case IDs: the reviewer's items 1–9:
  - AC-002/003 by click and automatically, with records, backups and effective tools;
  - AC-004 (unavailable installed revision, legacy record);
  - AC-006 (Team and Org members, delegated copies, running agents);
  - AC-001 (clean local checkout);
  - AC-005 (reset);
  - AC-007 (unreadable file);
  - AC-008 (en/zh-CN texts);
  - the runtime/model mark and reset;
  - built-ins across a restart.
- Related revision IDs: SR-006, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first API/E2E round of this ticket
- Coverage decisions or durable test paths changed:
  - **Added:** `autobyteus-server-ts/tests/e2e/personal-settings/package-personal-settings.e2e.test.ts` (ungated, 7 cases).
  - **Added:** `autobyteus-server-ts/tests/e2e/personal-settings/personal-tools-in-runs.e2e.test.ts` (gated scripted AGY, 7 cases).
  - Existing tests reused unchanged (IMP-01..IMP-09).
- Cases:
  - reused: API-R01..R05, API-R07;
  - run: API-01, API-02..08, API-10a..10g, API-11, API-M1..M4, API-20 (click and automatic), API-21, API-22.
- Environment delta:
  - fresh-clone release build of `4e7c74b274`;
  - an isolated instance on an own data root, with a scripted `codex` through its `.env`;
  - the real public repository `AutoByteus/autobyteus-agents` (old commit `83531bb`, HEAD `45012f0`).

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation (added execution-time rows API-10f/g, API-11, API-M1..M4), execution coverage report, test progress log
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.0%
- New or remaining failure IDs: None
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks (low):
  - AC-004's download failure is emulated (fake 404);
  - AC-002's skill and avatar edits were proven with fake GitHub, not repeated on real GitHub;
  - the Org editor's runtime/model mark with a captured Org value was not rendered in the instance (design R-1);
  - FU-003 (known).

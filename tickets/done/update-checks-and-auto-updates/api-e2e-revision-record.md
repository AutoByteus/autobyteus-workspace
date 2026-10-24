# API/E2E Revision Record — update-checks-and-auto-updates

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 (implementation review pass) | SR-005, ARCH-REV-002, IR-002, CRR-002 | N/A | Pass / 94.7% |

## Revision Entries

### API-REV-001 — Baseline: SR-005 server E2E (revised and new), stale suites repaired, packaged-instance journeys

- Triggering role, report path, and round: code reviewer, `tickets/in-progress/update-checks-and-auto-updates/code-review-report.md`, CRR-002
- Triggering finding or case IDs:
  - the 209 E2E suite needing revision (C-07);
  - the design's isolated-instance checks (AC-001, 006, 007, 010, 012, 013, 018, 020, 022);
  - the `net.isOnline()` escalation trigger;
  - the CR-001 live check.
- Related revision IDs: SR-005, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002
- Why recorded: first API/E2E round of this ticket
- Coverage decisions or durable test paths changed:
  - **Added:** `tests/e2e/helpers/github-head-read-stub.ts` and `tests/e2e/update-notifications/agent-runtime-update-notifications.e2e.test.ts`.
  - **Rewritten:** `tests/e2e/update-notifications/update-notifications-live.e2e.test.ts`.
  - **Stubs updated:** `github-skill-sources-graphql`, `skill-name-catalog-graphql`, `agent-packages-graphql`, `agent-package-definitions-live-refresh`, the `agent-runtimes-e2e-harness`.
  - **Baseline fix (own commit):** RA-04 of `agent-runtimes-running-agents` (pre-existing race, fails on the base 2/5).
- Cases: API-R01..R06 reused; API-01a..f, API-02..13, API-17, API-18, API-20..22, API-30..37 run; API-38 not tested.
- Environment delta:
  - packaged build `48fe98d65d`;
  - isolated instance on an own data root, with scripted runtime CLIs through its `.env`;
  - generic test feed;
  - real public repositories `AutoByteus/autobyteus-agents` and `blader/humanizer`;
  - standalone remote node from the worktree `dist`.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: coverage investigation, execution coverage report, test progress log
- Prior result and confidence: N/A
- Current result and confidence: Pass, 94.7%. The 95% default is not met; the gap is bounded:
  - real git-endpoint throttling (API-38);
  - the app schedule's busy/offline skips live;
  - the running-agent skill notice live.
- New or remaining failure IDs: None
- Recommended owner: code reviewer (proportional test-code review)
- Remaining risks:
  - API-38 not tested.
  - Product observation: a remote node's card keeps the "each runtime's own update command" contact line, as in VIS-037.

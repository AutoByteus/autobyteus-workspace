# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`; `CRR-002`; round 1 | `SR-001`–`SR-003`, `ARCH-REV-003`, `IR-001`, `IR-002`, `CRR-002` | N/A | Pass / 97% |

## Revision Entries

### API-REV-001 — Initial application-execution-scope API/E2E baseline

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/code-review-report.md`; round 1.
- Triggering finding or scenario IDs: `CR-001` resolved by IR-002; validation scenarios `APIE2E-REPO-SCOPE-001`, `APIE2E-REPO-AFFECTED-001`, `APIE2E-REPO-RETAINED-001`, `APIE2E-DUALHOST-001`, `APIE2E-PUBLICATION-001`, `APIE2E-SCOPE-IDENTITY-001`, `APIE2E-REENTRY-001`, `APIE2E-SHUTDOWN-001`, `APIE2E-PARITY-001`.
- Related revisions: `SR-001`–`SR-003`, `ARCH-REV-003`, `IR-001`, `IR-002`, `CRR-002`.
- Why recorded: first completed API/E2E result for the ticket; establishes the authoritative current-HEAD coverage and realistic-system baseline.
- Coverage decisions or durable test paths changed: none. Existing exact durable coverage remained valid; no repository-resident API/E2E test was added, updated, or removed.
- Scenarios added/rechecked: exact scope/unwind/lifecycle/architecture; complete 90-test affected selection; retained standalone/MCP/task/nested-history matrix; real standalone Socratic; Studio Brief/Socratic; real Brief publication and `/writer` handoff; real private Nested Classroom team messaging/delegation; watcher remount; active shutdown; same-data restart; package/source parity.
- Commands/environment delta: frozen installation and current prerequisite builds; unique ports 43351/43360/31360; isolated SQLite/vault roots; user-authorized supported secret import; installed Chrome; real Codex `gpt-5.6-luna`; owned cleanup.

#### Prior Failure Resolution

None. There was no prior task-local completed API/E2E result. The broad `APIE2E-REPO-005` stale-fixture characterization remains separately `Unclear` and is neither a prior ticket failure nor current Pass evidence.

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-execution-scope-boundary-hardening/tickets/in-progress/application-execution-scope-boundary-hardening/evidence/api-e2e/`
- Prior result and confidence: N/A.
- Current result and confidence: **Pass / 97%**.
- New or remaining failure IDs: none for the current ticket. `APIE2E-REPO-005` remains separately historical/unattributed.
- Recommended recipient: `/code_reviewer` for proportional durable-test review (`Not Applicable`, no durable coverage delta).
- Remaining risks: unchanged Electron shell remains delivery-owned; broad historical repository stale-fixture debt remains separate; AutoByteus DeepSeek and a second live standalone publication were not necessary for this scope-owner refactor.

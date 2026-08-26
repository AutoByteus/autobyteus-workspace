# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer`, `code-review-report.md`, round 1 | SR-002, ARCH-REV-002, IR-002, CRR-002 | N/A | Fail / 93% |
| API-REV-002 | `/code_reviewer`, `code-review-report.md`, round 2 | SR-003, ARCH-REV-003, IR-003, CRR-004 | Fail / 93% | Pass / 98% |

## Revision Entries

### API-REV-001 — Logical-address contract baseline and cold-reentry failure

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification/code-review-report.md`; round 1.
- Triggering finding/scenario IDs: CR-001 resolved in source; `APIE2E-LOGICAL-ROOT-MEMBER-001`, `APIE2E-SOCRATIC-STANDALONE-001`, `APIE2E-SOCRATIC-STUDIO-001`, `APIE2E-BRIEF-STUDIO-001`, `APIE2E-BRIEF-STANDALONE-001`, `APIE2E-RECOVERY-001`, `APIE2E-F001`.
- Related revisions: SR-002, ARCH-REV-002, IR-002, CRR-002.
- Why recorded: initial required API/E2E baseline after source review Pass.
- Coverage/durable paths changed: none.
- Scenarios added/rechecked: exact repository matrix; real root/member WebSockets; both maintained apps/hosts; publication/handoff; remount/restart; parity/cleanup.
- Environment delta: isolated SQLite/vault roots, supported credential import, real Chrome, Codex `gpt-5.6-luna`, ports 43951/43952/43960/31960.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this record, `evidence/api-e2e/`.
- Prior result/confidence: N/A.
- Current result/confidence: **Fail / 93%**.
- New failure: `APIE2E-F001` — cold provider-backed app mutation returns worker-timeout HTTP 500 at ~30 seconds but may complete later.
- Recommended recipient: `/code_reviewer` for focused failure-origin review.
- Remaining risk: user-visible error plus later side effect can cause a duplicate retry; Electron shell remains downstream and unrelated.

### API-REV-002 — Completion-coupled real-system rerun

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification/code-review-report.md`; round 2.
- Triggering finding/scenario IDs: `CR-002` / `APIE2E-F001`; cold Brief standalone launch, Socratic standalone same-data reentry, Studio cold same-data RequestHint.
- Related revisions: SR-003, ARCH-REV-003, IR-003, CRR-004.
- Why recorded: IR-003 removes live-work request deadlines while retaining the bounded control-operation deadline; source review required exact real-system confirmation.
- Coverage/durable paths changed by API/E2E: none.
- Scenarios rechecked: all three exact F001 witnesses first; logical root/member WebSockets; real dual-host Socratic/Brief; publication, named handoff, projection, remount; same-data recovery; package parity; cleanup.
- Environment delta: new isolated `/private/tmp/api-rev-002-logical-addressing` roots and ports 44951/44952/44960/32960; supported credential import; installed Chrome; package-owned Codex `gpt-5.6-luna`.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-F001` — 30-second HTTP 500 followed by a later side effect | `Unclear`, confirmed by CRR-003 as implementation-source completion-boundary defect | **Resolved** — exact cold Brief mutation returned HTTP 200 after 64,394 ms; both cold Socratic restart mutations returned 200 and saved exactly one next turn | `api-rev-002-brief-standalone.json`, `api-rev-002-socratic-standalone-restart.json`, `api-rev-002-studio-socratic-restart.json` |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this record, and `evidence/api-e2e/api-rev-002-*`.
- Prior result/confidence: **Fail / 93%**.
- Current result/confidence: **Pass / 98%**.
- New or remaining failure IDs: none.
- Recommended recipient: `/code_reviewer` for the required proportional durable-test review (`Not Applicable` for API/E2E-owned durable changes).
- Remaining risk: Electron shell packaging remains downstream and unchanged; provider latency remains externally variable but is no longer bounded by the removed live-work deadline.

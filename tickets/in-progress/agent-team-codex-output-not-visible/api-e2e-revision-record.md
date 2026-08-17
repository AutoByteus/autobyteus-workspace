# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` / initial post-CRR-002 round | SR-001–SR-003; ARCH-REV-003; IR-001–IR-002; CRR-002 | N/A | Pass / 98% |
| API-REV-002 | user-expanded all-runtime real-browser matrix | API-REV-001; CRR-003 | Pass / 98% | Fail / 88% |
| API-REV-003 | `code_reviewer` / CRR-005 / targeted post-IR-003 rerun | API-REV-002; IR-003; CRR-005 | Fail / 88% | Pass / 98% |

## Revision Entries

### API-REV-001 — Real Codex Team output, continuity, recovery, and reopen baseline

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/code-review-report.md`; initial API/E2E round after `CRR-002`.
- Triggering finding or scenario IDs: `BEH-001`–`BEH-005`; UC-001–UC-006; AC-001–AC-016; historical `CR-F-001` resolved upstream.
- Related revisions: `SR-001`–`SR-003`, `ARCH-REV-003`, `IR-001`–`IR-002`, `CRR-002`.
- Why recorded: establish the first complete post-fix repository and realistic-system acceptance baseline; prior reproduction was pre-fix and non-authoritative.
- Coverage decision/durable path changed: `autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts` currentized from retired segment fixtures to the canonical current AgentRun lifecycle. Delta: 0 added / 1 updated / 0 removed.
- Scenarios added/rechecked: exact snapshot/live status contracts; contiguous Team sequence; stale-gap nonmutation/once-only recovery/persistent retry; real imported Classroom Team Codex output; refresh/history reopen; process reopen/direct-use persistence; supported inactive-Team restore; provider-neutral and standalone regression; cleanup.
- Commands/environment/broader-validation delta: 4-file/20-test server selection, 11-file/159-test web selection, 4-file/124-test provider-neutral selection, 10-test Team admission, 7-test updated standalone integration, production server/Nuxt builds, checked-disposable server 60418/web 31418, supported secret import to isolated DB, real imported package, Codex/`gpt-5.6-luna`, AutoByteus `open_tab`, WebSocket/API correlation, process restart and cleanup.

#### Prior Failure Resolution

None. No prior completed API/E2E result exists; this is the required `API-REV-001` baseline. The historical pre-fix live-output reproduction and `CR-F-001` source-review finding are upstream context, not prior API/E2E results.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, `api-e2e-evidence/api-rev-001/`.
- Prior result and confidence: `N/A`.
- Current result and confidence: **Pass / 98%** (98.3% calculated; all applicable categories >=96%).
- New or remaining failure IDs: none.
- Recommended recipient: `code_reviewer` for proportional review of the one updated durable test.
- Remaining risks/untested scope: deliberate sequence loss is proven deterministically at the actual production state/service boundary rather than injected into a credentialed live provider stream; Electron shell is unchanged/out of scope. Neither is material to Pass.

### API-REV-002 — Expanded real runtime matrix exposes shared Team FILE_CHANGE admission defect

- Triggering role, report path, and round: user expansion after API-REV-001/CRR-003; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/api-e2e-execution-coverage-report.md`; Round 2.
- Triggering scenario IDs: `API-RUNTIME-TEAM-009A`–`009C`, `API-RUNTIME-NESTED-010A`–`010C`, `API-RUNTIME-AGENT-011A`–`011C`.
- Related revisions: API-REV-001; CRR-003.
- Why recorded: the user required direct real-browser validation of Classroom, Nested Classroom, and standalone Daily Assistant across Codex/`gpt-5.6-luna`, AutoByteus/`deepseek-v4-flash`, and Claude Agent SDK/configured `deepseek-v4-flash`.
- Coverage decision/durable path changed: no repository-resident durable changes in this round (`0 added / 0 updated / 0 removed`).
- Execution delta: supported secret import into a new checked-disposable database, supported package import, nine real `open_tab` journeys, inspected screenshots, exact run/config/public-projection capture, exact owned cleanup.
- Results: seven capability rows passed; Classroom AutoByteus and Claude exposed the same red `Rejected FILE_CHANGE: file_change_id is required` Team error. All three standalone Agent rows passed. Exact nested delegation/peer/reverse-reply capability passed in all runtimes.

#### Prior Failure Resolution

API-REV-001 had no open product failure and remains the historical Pass for the original Codex Team visibility, continuity, recovery, refresh, process reopen, and restore scope. Round 2 does not invalidate those proofs; it adds a broader provider/file-change finding.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, `api-e2e-evidence/api-rev-002/`.
- Prior result and confidence: **Pass / 98%**.
- Current result and confidence: **Fail / 88%**.
- New failure ID: `API-F-001` on `API-RUNTIME-TEAM-009B` and `API-RUNTIME-TEAM-009C`.
- Preliminary classification: shared implementation Team adapter mismatch. The current internal `AgentRunFileChangePayload` uses `id`/`type`; the adapter requires wire-shaped `file_change_id`/`file_type` before the existing wire projector. Focused failure-origin review is required.
- Non-finding: Claude provider-native `TaskOutput` unknown-ID behavior is recorded as a model/provider observation only; exact product collaboration succeeded and the user explicitly excluded it from product-failure classification.
- Recommended recipient: `code_reviewer` for focused API-F-001 failure-origin review.
- Remaining requirement: after source resolution and review, rerun the failing AutoByteus and Claude Team file-change browser rows and add/currentize durable exact-boundary regression coverage as appropriate.

### API-REV-003 — Targeted Team FILE_CHANGE closure

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-codex-output-not-visible/tickets/in-progress/agent-team-codex-output-not-visible/code-review-report.md`; targeted rerun after `CRR-005` accepted IR-003.
- Triggering finding and scenarios: `API-F-001`; `API-RUNTIME-TEAM-009B` and `API-RUNTIME-TEAM-009C`.
- Related revisions: `API-REV-002`, `IR-003`, `CRR-005`.
- Why recorded: close the only prior API/E2E product failure without repeating unaffected matrix rows, as explicitly directed by the user.
- Coverage decision/durable path changed: no API/E2E-owned repository coverage changes (`0 added / 0 updated / 0 removed`). The implementation-owned exact builder -> Team adapter -> strict projector regression coverage was already reviewed in CRR-005.
- Scenarios rechecked: exact affected 3-file/24-test repository selection; real imported Classroom Team AutoByteus/`deepseek-v4-flash` file write; real imported Classroom Team Claude Agent SDK/configured `deepseek-v4-flash` file write; browser rendering, public file-change projection, server error audit, and owned cleanup.
- Commands/environment/broader-validation delta: sanitized checked-disposable server `60420`, web `31420`, isolated runtime/database, supported secret and package import, real AutoByteus `open_tab`, two visually inspected screenshots, exact GraphQL/run/file projection correlation, and exact cleanup.

#### Prior Failure Resolution

`API-F-001` is resolved downstream. Both previously failing Team rows now produce one exact available file-change projection with the correct AgentRun, file type, source tool, nonempty invocation identity, and expected isolated-file content. The former `file_change_id is required` error and `TEAM_AGENT_EVENT_ADMISSION_FAILED` both occur zero times.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, and `api-e2e-evidence/api-rev-003/`.
- Prior result and confidence: **Fail / 88%**.
- Current result and confidence: **Pass / 98%** (98.3% calculated; all applicable categories >=96%).
- New or remaining failure IDs: none.
- Recommended recipient: `code_reviewer` for the required proportional test-code review disposition; expected `Not Applicable` because no durable repository test changed in this round.
- Remaining risks/untested scope: no post-fix repetition of unaffected provider, lifecycle, restore, or standalone rows because IR-003 changed only Team FILE_CHANGE admission and those direct historical results remain valid. Claude's unrelated provider-selected `Read` errors are a nonblocking model/provider observation under the user's prior clarification.

# API/E2E Test Review Report — autobyteus-638 A restart keeps a person's runs running

## Review Meta

- Review Round: 1
- Trigger: `/api_e2e_engineer`, API/E2E round 1 Pass (API-REV-001, 95%); tests `b61a71452e`, documents and evidence `82a790f721`
- Requirements Doc Reviewed As Context: [requirements-doc.md](requirements-doc.md) (SR-002)
- Investigation Notes Reviewed As Context: [investigation-notes.md](investigation-notes.md)
- Solution Revision Record Reviewed As Context: [solution-revision-record.md](solution-revision-record.md)
- Design Spec Reviewed As Context: [design-spec.md](design-spec.md) (SR-003; walks 1-9, 4b)
- Supplemental Task Artifacts Reviewed As Context: [follow-ups.md](follow-ups.md) (FU-001, FU-002); `evidence/API/` (RUN-03.json, RUN-04.json, API-03 per-case JSON, API-04, API-05)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-001/002 (the reviewer's uncommitted edits)
- Implementation Revision Record Reviewed As Context: IR-001
- Original Code Review Report: [code-review-report.md](code-review-report.md) (CRR-001 Pass)
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md)
- Execution Coverage Report: [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md)
- API/E2E Revision Record Reviewed As Context: [api-e2e-revision-record.md](api-e2e-revision-record.md) (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none (CRR-001 had no findings)
- Project testing guideline(s) applied: TESTING.md: built-server suites need a current build; Docker server nodes (a test-owned container, the server package mounted read-only, loopback, removed with its volumes); external runtime isolation (a throwaway HOME, `CLAUDE_CONFIG_DIR`, `CODEX_HOME` with a symlink to `auth.json`, TESTING.md:279-280); the vault key reaches the CLI child only. No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` for SCN-001/SCN-002 on each runtime, Docker, W-4b and REQ-005. The Codex READY cases are a test-only state, judged below.

No `src/` change since `ae1e36cded`: `git diff dc5605c1bd..b61a71452e` touches only the four test files below.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/restart-resume/running-runs-built-server.e2e.test.ts` | Updated: RUN-03, RUN-04 | W-4b (AR-001), REQ-001 | A stop or kill during the restore keeps every run not yet handled; the next start brings all back | The scripted model can hold its model-list answer |
| `autobyteus-server-ts/tests/e2e/restart-resume/running-runs-external-runtimes.e2e.test.ts` | Added | SCN-001/002 (AC-001/002) on AGY (scripted), Claude (real) and Codex (real; inference cases blocked by the account limit, READY cases without inference) | One restart case per runtime and signal: recorded, running again, nothing posted, same session, next message answered (the codeword for Claude/Codex) | Gated per runtime |
| `autobyteus-server-ts/tests/e2e/restart-resume/running-runs-docker-node.e2e.test.ts` | Added | SCN-001/002 on a Docker node (`docker stop`/`start`, `docker kill`/`start`), the incident's kind | One journey: recorded → stop/kill → record read from the stopped container's volume → "1 brought back" → running before input, same session → answered | Gated; the summary line exists only in this branch's code, which proves the mounted package runs |
| `autobyteus-server-ts/tests/e2e/restart-resume/restart-reminder-built-server.e2e.test.ts` | Updated: RR-01 | AC-005 "plus one case" (REQ-005) | Both runs are running idle before any input; the restore woke nothing (request count) and the reminder still rides the next input | +1 assertion and its header line |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs (RUN-03/04, RUN-X-<runtime>-<TERM/KILL>, RUN-X-CODEX-READY-*, RUN-D-01) in the headers, with gates and commands |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Each case asserts four things: the record after the end, the exact summary line, that the run is active before any input, and the same `platformAgentRunId`. The conversation is asserted unchanged (nothing posted), and the next message is answered; Claude names the codeword from before the restart (the same conversation). RUN-03/04 assert that the record still holds all seven runs after an interrupted restore, and "7 brought back" on the next start. RR-01 asserts `runningBeforeInput {busy: true, quiet: true}` with the model request count unchanged |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `liveNode` builds one node per runtime with a shared `restartCase`. The tests reuse `startBuiltTestServer`, `attachOwnerCredential`, `agentStreamFramesOf`, `sendE2eSendMessageCommand` and the scripted AGY fixture |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each test has its own runtime root and database, and each runtime its own HOME (Claude: `CLAUDE_CONFIG_DIR`, API-key mode; Codex: a throwaway `CODEX_HOME` with a symlink to `auth.json`, as TESTING.md:279-280 prescribes). The Docker container has a random name, fresh anonymous volumes and loopback only, and is removed with `-v`. Waits use `until` with deadlines |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | 252 and 150 lines, one responsibility each |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Gated skips only; RR-10 stays as is (FU-001) |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | API-01…API-05 map to these cases. RUN-03.json: `restoreDoneWhenStopped: false`, all seven runs kept, then "7 brought back". The Codex inference cases are reported `Not Tested` (usage limit), not as passed |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass, one note | All cases but READY are requirements scenarios. The Codex READY cases create a run through `createAgentRun` and never message it. The product doesn't produce that state: desktop and mobile keep a `temp-*` ID until the first message creates the run. So these cases are a no-inference stand-in for the blocked inference cases: they prove the Codex restore path, with no input and no model call. They don't establish a product scenario, and FU-002 rests on them (see Follow-ups) |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass — deviation recorded, reason holds | Entry is GraphQL plus the run's WebSocket (on Docker, through the node's setup code, as the desktop does). The restarts are real: SIGTERM/SIGKILL of the built server, `docker stop`/`kill`. RUN-03/04 hold the scripted model's model-list answer for 4 s to keep the restore busy, a timing aid only. Its comment credits the restore with the first model-list request; the startup cache preloader also fetches the list, so that attribution is not proven. What the test asserts still holds: the node stopped before the restore's summary, while the taken runs were pending. The mixed state (some restored, some pending) is covered by the restorer unit test |

Non-blocking observations (no action required):

- RUN-D-01 (Docker) asserts the same session and an answer, but not "conversation unchanged" as the other runtime cases do. Nothing posted is still evidenced, because the run is active before any input and the summary line is exact.
- The Codex inference cases RUN-X-CODEX-TERM/KILL are in the suite, but their evidence is missing until the account has credits again (the API/E2E residual risk).

## Findings

None.

## Follow-ups

- Follow-ups this review added: None.
- **FU-002** (API/E2E's): checked with the three questions and kept as a follow-up. I added two facts to its row in `follow-ups.md`:
  1. **Introduced by this change?** Partly. Without 638 the renewal line appears once, at the first message. With 638 it appears at each restart while the run stays unmessaged, because each renewal is keyed by its own lost session ID (`buildSessionRenewal`, `runtime-switch.ts`).
  2. **In functionality this ticket changes?** No. The cause is autobyteus-599's renewal of an empty Codex thread. The state is reachable only by calling `createAgentRun` directly: the desktop and mobile clients create the run with its first message. No product scenario reaches it.
  3. **In a file this ticket edits?** No.

  So the ticket's goal works without it. It stays a follow-up, not urgent.
- FU-001: unchanged (RR-10, pre-existing on the base).

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the four above
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: residual risk: Codex conversation continuity across a restart on real inference is unproven until the account has credits (cases RUN-X-CODEX-TERM/KILL exist). The architecture reviewer's two files stay uncommitted.

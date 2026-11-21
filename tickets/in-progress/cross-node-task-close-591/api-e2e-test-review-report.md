# API/E2E Test Review Report: cross-node-task-close-591 (autobyteus-591)

The latest result is **CRR-004: Pass**.

## API-REV-002 (CRR-004)

### Review Meta

- Trigger: API/E2E round 2 (API-REV-002) Pass, 95%, on CRR-003 (head `81a504de13`, code `a811f94348`). Docs are in `0a0d711259`.
- Scope:
  - `52a1507b80` (round 1);
  - `00851c5c8d` (round 2, against SR-010).
- Context read: `requirements-doc.md` (SR-010, with AC-004's alternate aligned at `f39a92d5d3`), `design-spec.md` DN-1 … DN-9, `code-review-report.md` (CRR-001 … CRR-003), `api-e2e-execution-coverage-report.md`, and `API-r2-runs.txt`.
- Project testing guideline: `TESTING.md` (the two-node surface; tests that wait for OS events). No conflicts.
- Supported scenario basis confirmed: `Yes`.

### Changed Durable Test Scope

| Path | Change | Covers |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated and added | RC-09, RC-10, RC-11, RC-23, RC-35, RC-20, RC-49 (made untrue by REQ-001), the header and `:756`; new RC-51, RC-52, RC-53; `CapturingProxy.answerWith` (an older beta answering 404) |
| `autobyteus-web/tests/e2e/mobile-closed-delegation-cases.mjs` | Added | MSP-93 (AC-006: phone and desktop) |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | MSP-93's registration and its catalogue line |

### Proportional Test-Code Checks

| Check | Result | Evidence |
| --- | --- | --- |
| Names and intent clear | Pass | Each case's title names its ACs and REQ-IDs. One catalogue line is stale (note below). |
| Assertions prove the requirement | Pass | Positive and specific. **RC-51:** from the captured proxy traffic, the `open: true` notice comes before the message and is confirmed by beta, and beta's record is cleared. Also: A's entry open; nothing owed; the Task page `{closed: true, status: "offline"}` (F-1, as locally); the exact local refusal for the same Task; `TASK_AGENT_RESOURCE_CLOSED` for another sender; the run's earlier conversation. **RC-11:** asserts the closed run left the delegator's tree (local rule). **RC-52:** asserts REQ-002 as corrected (rf stopped after a Task reopen alone; rg's continuation keeps "open" owed and is never recorded closed), the retry delivered after either restart, and the older beta (404) keeping the notice owed. **RC-53:** asserts the same for the Team coordinator. |
| Fixtures and helpers reused | Pass | `CapturingProxy` extended with `answerWith` rather than a new proxy. Shared `owedMarks`, `closedOnBeta`, `betaListed`, `taskOnAlpha`, `noticeRecords`. |
| Isolation and determinism | Pass | The fixed waits are bounded windows for things that must not happen: 3 s ("a reopen sends nothing"), 5 s (another open Task sends nothing), 2 s (a refused peer changes nothing), and 32 s to span one 30 s retry tick (logged once; the older beta stays owed). Everything else waits on conditions. |
| Large file coherent | Pass | The two-server suite is one surface (the link between two nodes); the new cases sit with their area's existing RC cases. |
| No stale, disabled or compatibility-only tests | Pass | Round 1's old expectations (the saved-Task refusal to existing remote runs, the `FENCED_REMOTE` log, "keeps running on beta", round 1's delegator text) are replaced. No skips beyond the file's env gate. |
| Coverage agrees with the evidence | Pass | 53/53 (r6); MSP-93 on phone and desktop (row back in 2.1 s, drop within one 5 s re-read); CPW 14/14. |
| Real triggers | Pass | Two built nodes paired by invite; `update_task` and `send_message_to` through real agent tool calls; restarts of either node; the phone bundle and the desktop window. |

### Findings

None.

### Notes (non-blocking)

- **`mobile-shell-probe.mjs:192-194`:** MSP-93's catalogue line still says the row "returns when beta gives it the Task again" (round 1's wording). The case file itself says "Its message to the run continues it (SR-010)". It's a one-line comment for delivery's sync.
- **API/E2E's residual list is stale on two items:**
  - AC-004's alternate was aligned with REQ-002 at `f39a92d5d3`;
  - `team-remote-delegation.test.ts`'s title was fixed in `a811f94348`; the remaining "fence" words name the member's input fence, a real concept.

### Result

- **Pass.** No findings. Recipient: `/delivery_engineer`.

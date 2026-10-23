# API/E2E Test Review Report — remote-runs-in-tree (autobyteus-278)

## Review Meta

- Review Round: 1
- Trigger: API-REV-003 Pass (95%), round 4, on code `580e1cac5b` (docs `59d63920ed`); API/E2E commit `5635f96c55`. Large/High, so a proportional test-code review is required.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (AC-801 … 807, REQ-808)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-008)
- Design Spec Reviewed As Context: `design-spec.md` (DS-001 … 006, DS-004a, Window Retry Rule)
- Supplemental Task Artifacts Reviewed As Context: the UI/UX spec (row and view states), `follow-ups.md`
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-005
- Implementation Revision Record Reviewed As Context: IR-005
- Original Code Review Report: `code-review-report.md` (CRR-007 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-008`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (round 4)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001 … 003)
- API/E2E Result: Pass.
  - Browser probe 7/7 in two consecutive runs (`API-02-run21`, `API-02-run22`), with `browserErrors: []` and complete cleanup.
  - Two-server E2E run 4: 37/37 (the server is unchanged since `e37ad88b98`).
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: the worktree's `TESTING.md` (as the coverage investigation records it). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs` | Added (518 lines) | AC-801 … 806, REQ-808, CRR-001 F-001, CRR-003 F-003, CRR-006 F-006 | The window's view of remote runs, against two test-owned servers, in a real browser | RTP-01 … RTP-07 |
| `autobyteus-web/package.json` | Updated (one script) | — | `test:e2e:remote-runs-in-tree` | — |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (+373) | AC-801 … 806, DS-004a/N-405, DS-006, security | Remote collaboration between two real server processes | RC-31 … RC-37; the proxy's WebSocket forwarding; `sentRequests`; RC-20's new routes |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each RC/RTP names its ACs and outcome; the probe's header lists its cases |
| Assertions prove approved requirements | Pass | **RC-31:** the snapshot row's exact DTO; the summary's title and statuses; live output (`liveSeen`); the owner entry's exact content with the heading (DS-004a) and exactly one user message on both nodes (N-405); no message-log line on either node (REQ-803); interrupt from running to not running; Stop to a final offline summary. **RC-32:** B's own terminate reaches alpha's view without a refresh (DS-006). **RC-35:** REMOTE_TARGET_NOT_PERMITTED on the projection, command and observation routes, both for a third registered peer and for alpha naming beta's own run; summaries omit runs the caller didn't start; "INTRUDER" never reaches beta's run. **RC-37:** `reachable:false` within the bound, the projection error bounded, the rest works, Retry recovers. **RTP-04:** per family, chip, ⚙/＋ hidden, placeholder, Files note, no Context Files, upload or `@` menu, with a positive control (`@` opens on this node's own run). **RTP-07:** exactly one red line on the row (the CRR-006 regression) |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | `remoteSummariesIn`, `liveIn`, `rootCommand`, `ackOf`, `ownerText`, `sentRequests` (E2E); `rowInfo`, `rowStateOf`, `openedView`, `mentionMenuShown`, and the families table driving RTP-06/07 (probe) |
| Isolation and determinism | Pass | RC-35 removes gamma and stops it in `finally`. RC-37 restarts beta in `finally`. The probe kills its frontend group and servers and removes its temp root (`cleanup` recorded). Waits are bounded; a `.catch(() => undefined)` on a wait is always followed by an explicit assertion of the recorded state. The tree helper's clicks are bounded (1.5 s each, a run row at most once per 5 s) to avoid toggle races. It is complex but documented, and two consecutive runs gave identical results |
| Large files coherent and navigable | Pass | The E2E remains one surface (two real nodes); the probe is one surface (the window), organised by case |
| No stale/duplicated/compat-only tests | Pass | The "nothing sent" checks moved from all remote requests to `sentRequests` (starts, messages, owner commands). Since autobyteus-278, an open root view reads summaries, which is read-only. The switch-off checks stay strict |
| Coverage agrees with investigation/evidence | Pass | Receipts for RC-31 … 37 in `API-01-run4*`; probe JSON in `API-02-run21/22` |
| Callers exercise an established scenario | Pass | Delegations are the agents' own `delegate_task` calls; owner commands use the window's root-stream protocol; RC-32 is beta's own GraphQL terminate; the probe drives the real UI |
| Real trigger, no setup real use doesn't produce | Pass | RC-35's forged requests stand for a registered peer, whose identity is claimed rather than proven until S6, and that is exactly the threat the check covers. The proxy's raw TCP forwarding of the upgrade is transport only and changes nothing in the frames |

## Findings

None.

Non-blocking notes (no action required):
- **Probe RTP-04:** it records `ownerHeadingShown` without asserting it. RC-31 asserts the heading exactly on the server side; asserting it in the probe would pin the window rendering too.
- **RC-35:** the variable `beltaLocal` is a typo for "betaLocal" (cosmetic).
- **RC-35:** the unpaired-agent refusals assert `accepted: false` only, not the code. That's acceptable, because DS-006 / N-304 name the paired-agent check without fixing a code.

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-web/tests/e2e/remote-runs-in-tree-probe.mjs`;
  - `autobyteus-web/package.json`;
  - `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`.
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The probe needs the server build first (`pnpm -C autobyteus-server-ts build`) and a Chrome executable.
  - The E2E suite needs `test:integration:prepare` (Brief Studio's package, from 261).
  - AC-807 is the user's desktop ↔ Docker check.

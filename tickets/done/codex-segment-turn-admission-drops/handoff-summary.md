# Handoff Summary — codex-segment-turn-admission-drops

## What Was Asked

Project Task autobyteus-165 (FU-001 of autobyteus-143): the user's `server.log` has 1,963 `[CodexSegmentTurnAdmissionRejected]` warnings. Find out why, whether agent output is lost, fix it if it is a product bug, and bound the gate's per-event logging.

## Answer And Outcome

- **Content loss — already fixed earlier.** 88% of the lines and all 1,269 rejected text deltas are from 31 Aug – 2 Sep. A Codex `willRetry: true` error ended the turn in AutoByteus while Codex kept running it. This was fixed on 2026-09-02 (`fb65f564f6`, shipped in v1.4.67). No text delta has been rejected since. The lost content of those two runs is not recovered (DEC-004; it can be its own Task).
- **The other 130 lines** are tool items that Codex finishes after their turn ended, mostly after Stop. Dropping them is correct; admission is unchanged.
- **This ticket's change:** the gate's logging is now bounded and informative. Per run thread, each turn id (plus one "no turn id" account) gets one detailed line naming the item type, the event's turn id and the active turn id. Later rejections are counted and written as summaries at `turn/started`, `turn/completed`, client close and thread release. No item content is logged. One rejected turn of 438 events now writes 1 line plus 1 summary per boundary instead of 438 warnings.

## Classification And Route

- `task_size: Small`, `architectural_risk: Low`, route: direct low-risk (architecture review, code review and test-code review `Not Applicable`)
- Solution SR-001, implementation IR-001, API/E2E API-REV-001, delivery DR-001

## Code And Tests

- Source: `dedaf77fba` — `codex-segment-turn-rejection-accounts.ts` (new), `codex-segment-turn-admission.ts`, `codex-thread.ts`, `codex-thread-manager.ts`, `codex-thread-event-debug.ts`; unit tests for AC-001..AC-008.
- Durable integration coverage: `696da0ec43` — `autobyteus-server-ts/tests/integration/agent-execution/codex-segment-turn-rejection-logging.integration.test.ts` and `autobyteus-server-ts/tests/fixtures/codex-scripted-notification-cli.mjs` (real `CodexAppServerClient` over stdio to a scripted app-server child).
- Docs: `autobyteus-server-ts/docs/design/codex_raw_event_mapping.md` § Exact-Turn Admission Rejections.

## Integration And Verification

- Delivery refresh: `origin/personal` advanced `cba6b85122` → `20c91afd4d` (one commit, another ticket's delivery docs only). Merged into the ticket branch as `e6a5adc58b`.
- Post-integration rerun on `e6a5adc58b`: Codex thread unit suites and the new integration file, 8 files / 88 tests passed; server typecheck exit 0 (`evidence/DR-001-post-integration-*.log`).
- Verification from the evidence: every acceptance criterion AC-001..AC-008 is directly proven (details in `release-deployment-report.md` § Verification). API/E2E final confidence 95.5%, lowest category 92% (scripted app-server). No user check needed: the change is server-log only and is fully reachable in isolation.

## Release

- Decision: no release (RELEASE.md default; the user did not ask for one). The change is not user-visible and ships with the next release.

## Follow-Ups (not in this ticket)

- FU-001: Codex tool calls that finish after their turn ended are not shown in chat or kept in history.
- FU-002 (watch): the `lastTerminalTurnId` guard can keep a wrongly ended running turn from being re-adopted.
- Implementation observation: the `CODEX_SEGMENT_TURN_OMISSION_UNLISTED` branch is unreachable from the product.
- Optional: recovering the 31 Aug – 2 Sep lost content into run history (DEC-004).

## Residual Risks

- The Codex app-server in the integration test is scripted from documented v2 shapes. If a future Codex stopped sending the item's own `turnId`, the detailed line would show `turnId: null` (visible); admission is unaffected.

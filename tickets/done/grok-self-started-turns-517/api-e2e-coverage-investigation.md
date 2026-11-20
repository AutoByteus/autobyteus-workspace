# API/E2E Coverage Investigation — grok-self-started-turns-517

## Investigation Meta

- Requirements Doc: `tickets/in-progress/grok-self-started-turns-517/requirements-doc.md` (approved SR-001; AC-006 added in SR-003)
- Investigation Notes: `tickets/in-progress/grok-self-started-turns-517/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/grok-self-started-turns-517/solution-revision-record.md` (SR-001..SR-005)
- Design Spec: `tickets/in-progress/grok-self-started-turns-517/design-spec.md` (SR-005)
- Supplemental Task Artifacts: `evidence/grok-acp-probe.jsonl`, `evidence/grok-acp-probe2.jsonl` (probes 1 and 2), `evidence/IMP-01-sdk-delivery-order.log`
- Design Review Report: `tickets/in-progress/grok-self-started-turns-517/design-review-report.md` (ARCH-REV-005 Pass)
- Architecture Review Revision Record: `tickets/in-progress/grok-self-started-turns-517/architecture-review-revision-record.md`
- Implementation Handoff: `tickets/in-progress/grok-self-started-turns-517/implementation-handoff.md` (IR-003)
- Implementation Revision Record: `tickets/in-progress/grok-self-started-turns-517/implementation-revision-record.md`
- Code Review Report: `tickets/in-progress/grok-self-started-turns-517/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `tickets/in-progress/grok-self-started-turns-517/code-review-revision-record.md`
- API/E2E Revision Record: `tickets/in-progress/grok-self-started-turns-517/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review pass (CRR-002), reviewed route Medium/High
- Prior Investigation Reviewed: None
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001/002 (AC-001): when Grok starts a prompt itself while the run is idle (`_x.ai/queue/changed` with a running prompt id), the run opens a provider turn with a `SYSTEM_TASK_NOTIFICATION` (`system.grok_provider_turn`, Grok's reminder text), streams content, tool cards and usage, and ends on Grok's `turn_completed`.
- REQ-003 (AC-002, AC-006): the run reads busy during that turn; a user message is held and sent after it; Stop sends `session/cancel` and ends it interrupted; at the hand-over from an input turn (job ending mid-turn) the held message stays held, never fails, and no second `session/prompt` goes out while one is outstanding.
- REQ-004 (AC-003): the notice is in the run's memory/history after reload.
- REQ-005 (AC-004): client-sent Grok turns, DeepSeek and every other runtime unchanged. The ACP connection now delivers notifications in wire order itself (SDK dispatch bypassed for notifications, RSK-004).
- AC-005 (live Grok): waived without credits; it was run and passed (IMP-04).
- Persisted data: `Not Affected` (one more recorded sender id).

## Supported Scenarios And Real Usage

- Designer scenarios: (a) wake after an input turn (probe 1); (b) a job ending during an input turn with a held message (probe 2 A); (c) Stop of Grok's own prompt (probe 2 B).
- Added from investigating the implementation: (b') the user's message arrives in the gap between Grok's `turn_completed(input)` + `queue/changed(provider)` and the `session/prompt` response (the session has already marked the input prompt completed and holds a pending provider prompt). Real: a user typing while Grok finishes its answer. Flagged by the implementation and the code review; the E2E sent the message earlier.
- Not tested as contrived/unsupported: RSK-001 (a client prompt at the instant Grok wakes) is recorded by the design as not designed for.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| ACP connection inbound order (Grok, DeepSeek) | Changed | design item 0, IMP-01 | connection unit (IMP-05); every ACP E2E suite on the branch (Grok replay incl. permission request, Grok compaction replay, DeepSeek scripted provider) |
| Provider-started turn, hand-over, cancel | Added | items 1–3 | session unit (IMP-05/07); Grok replay E2E orders a–c; new gap variant b' |
| Notice recorded | Added | item 4 | memory unit; projection after reload in the E2E |
| Web rendering | Preserved (no web change) | design "Derived consumers" | same event shapes as Claude's provider turns; `SystemTaskNotificationSegment.vue` special-cases only skill/tool-list/runtime-switch senders, so the Grok notice renders like Claude's |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | ACP session turn lifecycle | unit 9/9 over the real connection | the gap variant through AgentRun | E2E (scripted Grok) |
| API / transport / contract | Yes | ACP inbound frame stage; WebSocket stream events (existing types) | connection unit; replay E2E | DeepSeek and Grok suites on HEAD | rerun the ACP E2E suites |
| Frontend / browser | No code change | generic notice rendering | Claude provider turns already rendered | — | Not required (same shapes) |
| Process / lifecycle | Yes | Stop during a provider turn; held input | E2E order c, order b | gap | E2E b' |
| External integration | Yes | real Grok CLI | IMP-04 live pass (Grok 1.0.89) | — | Reused |
| Persisted data | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517`, branch `codex/grok-self-started-turns-517`, HEAD `cc2701af8a` (the code reviewer's report edits are uncommitted in the worktree; left alone).
- Testing guideline: `TESTING.md` (root): server E2E for runtime behaviour, gated suites with their gates; scripted Grok fixture; "File watching on a busy Mac" (in-process `afterAll` close stalls, autobyteus-517 FU-002).
- Changed build-input paths: None → no fresh-start build.
- Secrets: none for scripted suites; live Grok reused (IMP-04).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/runtime-management/acp/acp-client-connection.test.ts` | wire order, foreign responses, permission requests, malformed frames, handler errors | AC-004, item 0 | Still Valid | IMP-05 | Reused |
| `tests/unit/agent-execution/backends/acp/acp-provider-started-turns.test.ts` | session rules over the real connection | AC-001/002/006 | Still Valid | IMP-07 on HEAD | Reused |
| `tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` | 6 existing + 3 provider-turn cases | AC-001..004, AC-006 | Still Valid; gap variant missing | IMP-02 on `39686a67ac` | rerun on HEAD (API-01) and add b' (API-02) |
| `grok-build-compaction-replay.e2e`, `deepseek-harness-scripted-provider.e2e` | ACP suites | AC-004 | Still Valid | IMP-03 | Reused (no connection or session behaviour change since; HEAD's only later product change removes an unused type) |
| `grok-build-live-runtime.e2e` AC-005 case | live provider turn | AC-005 | Still Valid | IMP-04 | Reused (Grok usage) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | AC-004, items 0–3 (unit) | connection, session, profile, memory | Reused | IMP-05, IMP-07 | HEAD differs only by the removed type export (IMP-07 reran the session cases and the typecheck on it) |
| API-R2 | AC-004 | Grok compaction replay, DeepSeek scripted provider | Reused | IMP-03 | same code paths |
| API-R3 | AC-005 | live Grok | Reused | IMP-04 | costs Grok usage; code unchanged since |
| API-01 | AC-001, AC-002, AC-003, AC-004, AC-006 | real server, scripted Grok CLI | Existing Test | `vitest run tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` (with API-02's case) | rerun on HEAD |
| API-02 | AC-006 (b') | real server, scripted Grok CLI | Durable (add) | new script order and E2E case: the message is sent after `turn_completed(input)` and `queue/changed(provider)`, before the response | hint from the handoff and code review |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-02 | `autobyteus-server-ts/tests/e2e/helpers/grok-fake-cli.ts` (order b'), `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` | the hand-over's narrowest window, through AgentRun's real input holding |

## Desktop / Browser

Not required: no web code changed; the stream events are the existing types; Claude's provider turns already render the same way; the notice's sender is not special-cased in the web.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| RSK-001 | recorded by the design as not designed for | Low (narrow race) | No | — |
| RSK-003 (provider content before the input response) | not produced by Grok (≥1 s gap in probes and live) | Low | No | — |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (API-02)
- Reroute Required: `No`

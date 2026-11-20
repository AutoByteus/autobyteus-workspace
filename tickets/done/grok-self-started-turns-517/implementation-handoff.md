# Implementation Handoff — grok-self-started-turns-517

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-self-started-turns-517`, branch `codex/grok-self-started-turns-517`, base `origin/personal` @ `ca4317a386`. Paths are relative to the worktree; server paths are relative to `autobyteus-server-ts/`.

## Upstream Artifact Package

- Upstream review and handoff rule: `task_size=Medium`, `architectural_risk=High`, so the package went through architecture review. ARCH-REV-005 passed on SR-001…SR-005. This round → `get_handoff_rules` → `/code_reviewer`.
- Requirements doc: `tickets/in-progress/grok-self-started-turns-517/requirements-doc.md` (approved at SR-001; AC-006 added in SR-003)
- Investigation notes: `tickets/in-progress/grok-self-started-turns-517/investigation-notes.md`
- Solution revision record: `tickets/in-progress/grok-self-started-turns-517/solution-revision-record.md`
- Design spec: `tickets/in-progress/grok-self-started-turns-517/design-spec.md` (SR-005)
- Design review report / architecture review revision record: `design-review-report.md` (ARCH-REV-005), `architecture-review-revision-record.md`
- The documents commit also includes the Solution Designer's and reviewer's latest edits to these files, which were uncommitted in the worktree.

## Current Implementation Summary

- Revision record `implementation-revision-record.md`: IR-001 (Design Impact, resolved by SR-004/SR-005), IR-002 (SR-005 implemented) and IR-003 (CRR-001 CR-001, this round).
- Commits:
  - `dd79100fbb`: SR-003 items 1-3 and the notice converter.
  - `3076e1d6fb`: ticket documents and the IMP-01 evidence.
  - `0401d75bf3`: item 0, wire-order delivery.
  - `eb7dcef228`: items 4-6 and the Grok signal tests.
  - `39686a67ac`: item 7, scripted Grok, E2E and the live case.
  - `5ab411af71`: documents (IR-002).
  - Then the IR-003 commit: CR-001.

### Item 0: wire-order delivery (`src/runtime-management/acp/acp-client-connection.ts`)

- `inboundFrameStage` (:224) replaces `filterForeignResponses`. For each frame, in wire order and synchronously:
  - A notification (no `id`, a `method`) goes to `deliverNotification` (:240):
    - `session/update` that passes `isSessionNotification` (:91: params with a non-empty `sessionId`, an `update` object with a string `sessionUpdate`) → `routeUpdate`;
    - a malformed `session/update` is dropped and logged `ACP_FRAME_DROPPED`;
    - any other method → `routeExt` with its method string unchanged.
  - Each delivery runs inside its own `try/catch`, which logs `ACP_FRAME_HANDLER_FAILED` with the method and session id. The stage never throws.
  - Notifications do not reach the SDK, except `$/` protocol notifications (`isProtocolNotification`, :95), which still go to the SDK as before. That is the reviewer's optional MP-005, taken.
  - Responses and agent-to-client requests (permission requests) pass on unchanged; foreign responses are dropped as before.
- The SDK `Client.sessionUpdate` / `extNotification` (:113-116) are no-ops, with a comment saying where delivery happens.
- `registerSession` buffering is unchanged; the stage calls the same route methods.

### Items 1-3: the provider-started turn (`src/agent-execution/backends/acp/…`, `src/agent-execution/backends/grok/…`)

- Profile contract `acp-agent-session-profile.ts`: `prompt_running {promptId, notice}` and `prompt_completed {promptId, stopReason}`, with `AcpPromptNotice = {content, senderId}`.
- `grok-build-prompt-signals.ts` (new) interprets the two Grok signals:
  - `_x.ai/queue/changed` with a non-empty `runningPromptId` → `prompt_running`. The notice is `runningText` with the `<system-reminder>` wrapper removed and trimmed, or `null` when there is no text.
  - `_x.ai/session_notification` `turn_completed` → `prompt_completed`.
- `grok-build-session-profile.ts` routes both signals; `turn_completed` is checked before `response_completed`.
- `session/acp-agent-session.ts`:
  - One opening step `openTurn` (:347) serves both origins. `openProviderTurn` (:360) uses `randomUUID()` and emits the notice in the same batch.
  - `onPromptRunning` (:372):
    - in `ready` → opens a provider turn;
    - an input turn's first id is its own;
    - a different id after the input prompt completed → pending (latest wins);
    - before that → ignored.
  - `onPromptCompleted` (:390):
    - a provider turn ends on its own id (`cancelled` → interrupted);
    - a matching input id is marked completed;
    - a matching pending prompt is dropped.
  - `finishTurn` (:407): when a provider prompt is pending at the input response, it emits **one batch** with the input end, the provider `TURN_STARTED` and the notice, and stays `prompting`.
  - The two origins are named once, in `ActivePrompt` and its doc (IR-003, CR-001: the unused exported `AcpTurnOrigin` is removed; line numbers below are from before that change, about 4 lines lower now).
  - `close`/`fail` clear the prompts (`clearPrompts`, :422). The two effects are handled in `applyEffects` before the `!isInTurn()` filter (:290-292).
- Converter `acp-session-update-converter.ts`: `notice(content, senderId)` → `SYSTEM_TASK_NOTIFICATION {turn_id, sender_id, content, message_id}`.

### Items 4-6

- `GROK_PROVIDER_TURN_NOTICE_SENDER_ID = "system.grok_provider_turn"` is defined in `src/agent-execution/domain/system-task-notification-senders.ts` and added to `RECORDED_SYSTEM_NOTICE_SENDER_IDS` (`src/agent-memory/services/runtime-memory-event-accumulator.ts`).
- The backend comment in `acp-agent-run-backend.ts` now says the session allocates provider turn ids. No backend logic changed.
- `GLOSSARY.md` has a new "Provider-started turn" entry.

### Item 7: scripted Grok

- `tests/fixtures/grok-acp/fake-acp-agent.mjs` gains a `{"dir":"pause","ms":N}` row, so a test can act while the agent "thinks". No other behaviour changed.
- `tests/e2e/helpers/grok-fake-cli.ts` adds `grokProviderTurnScript(sessionId)`, which builds the probes' frame orders after the recorded `prompt` fixture's session opening:
  - (a) wake after an input turn (probe 1), including a finished tool's late `tool_call_update` before the wake;
  - (b) a job ending during an input turn, with probe 2 A's hand-over order: `turn_completed(input)` → `queue/changed(provider)` → `prompt_complete(input)` → response → content;
  - (c) cancel of Grok's own prompt (probe 2 B).
  - `heldMessage(id)` answers a held message.

### Beyond the design (flag)

- **A durable live case**, gated by `RUN_GROK_E2E=1`, in `tests/e2e/runtime/grok-build-live-runtime.e2e.test.ts`. AC-005 asked for a live run with the attempt recorded; I made it a repeatable case, using the probe's prompt wording.
- Web: no change. The web's `systemTaskNotificationHandler` / `SystemTaskNotificationSegment.vue` render any sender generically, with the content as markdown and no label, the same as Claude's background-task notice. That matches design-spec "Derived consumers".

## Routing Classification (Mandatory)

- `Medium` / `High` (design-spec): `Confirmed`. The change is the shared ACP connection's inbound ordering and the shared session's turn lifecycle, as classified.
- Escalation triggers checked:
  - Grok's frames differ from the probes: no. The live run (Grok 1.0.89) went through order (a) as probe 1.
  - RSK-003, provider content before the input prompt's response: not observed in the probes, the scripted orders or the live run.
  - A held message failing in the hand-over: no (AC-006 case).
- Selected route: `/code_reviewer`. Self-review: `Yes`.

## Reviewed Behavior Implementation Trace

| Behavior | Requirement / AC | Path / Files | Result |
| --- | --- | --- | --- |
| BEH-001 Grok's own turn shown | REQ-001, REQ-002 / AC-001 | Grok signals → profile effects → session `onPromptRunning`/`openProviderTurn` → converter `notice` → AgentRun → WebSocket | unit 9/9 (IMP-05); replay E2E (IMP-02); live (IMP-04) |
| BEH-001 notice kept | REQ-004 / AC-003 | `RECORDED_SYSTEM_NOTICE_SENDER_IDS` → run memory → `getRunProjection` | memory unit (Claude + Grok); replay E2E projection check; live projection check |
| BEH-002 held input | REQ-003 / AC-002, AC-006 | session stays `prompting` during the provider turn; one-batch hand-over (`finishTurn`) | replay E2E: held during Grok's turn; held through the hand-over, 2 `session/prompt` only, no failures |
| BEH-003 stop | REQ-003 / AC-002 | `cancel` → `session/cancel` → `turn_completed(cancelled)` → `TURN_INTERRUPTED` | unit + replay E2E (order c) |
| Preserved | REQ-005 / AC-004 | wire-order delivery for Grok and DeepSeek | units 299/299; replay 6 existing cases; Grok compaction replay 3/3; DeepSeek scripted provider (real dsh) 6/6 |

- Scope Guardrail kept: `Yes`. Product code is the connection, the ACP session, the profile contract, the Grok profile and signals, the converter, the sender ids and memory set, and one comment. AgentRun, the backend logic, the Grok prompt section and the SDK are untouched.

## Legacy / Compatibility / Size

- `filterForeignResponses` is replaced (renamed and extended). No compatibility paths. The SDK notification handlers stay as required no-ops (SR-005).
- Persisted data: `Not Affected`. The notice is recorded like other system notices, with no schema change.
- Product source roughly +300 lines: the session +127 and the connection +69 are the largest (`git diff --stat ca4317a386`).

## Checks Run

Evidence: `tickets/in-progress/grok-self-started-turns-517/evidence/`. macOS 26.5.2, Node 22.23.1. The machine carried load from other processes throughout (load average 42–93; `fseventsd` ~195% CPU).

| Check ID | Command Or Steps | Commit | Code It Exercises | Criteria | Result | Evidence | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | SDK delivery-order diagnostic (round 1) | `ca4317a386` + wt | SDK frame order | IR-001 | Measured | `IMP-01-sdk-delivery-order.log` | `ORDER: … u4 \| ext 2 \| RESPONSE handled \| ext 3` |
| IMP-02 | `vitest run tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts --reporter=verbose` (final); a control run of the six existing cases only | `39686a67ac` | the whole Grok runtime path, scripted | AC-001, 002, 003, 006, 004 | Pass (9/9); `afterAll` timeout, environmental | `IMP-02-grok-replay-e2e.log` | `Tests  9 passed (9)`; the three `turns Grok starts itself > …` ✓; control `6 passed`, same hook timeout |
| IMP-03 | Grok compaction replay; `RUN_DEEPSEEK_HARNESS_SCRIPTED_E2E=1` DeepSeek scripted provider (real dsh 0.2.2-rc.5) | `eb7dcef228` + tests | the connection change on Grok and DeepSeek | AC-004 | Pass | `IMP-03-acp-scripted-suites.log` | `3 passed`; `Tests  6 passed (6)` |
| IMP-04 | `RUN_GROK_E2E=1 … grok-build-live-runtime.e2e.test.ts -t "autobyteus-517 AC-005"` (isolated server, real Grok 1.0.89, grok-4.7 low) | `39686a67ac` content | live provider-started turn | AC-005 | Pass (attempt 3) | `IMP-04-grok-live-provider-turn.log` | notice `sender_id system.grok_provider_turn`, "Background task … completed (exit code: 0)", text contains `BGDONE-bd8ab412`, `end TURN_COMPLETED`; ✓ |
| IMP-05 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck`; unit suites acp/grok/deepseek/connection/runtime-management grok/agent-memory | `39686a67ac` content | all TS; session rules over the real connection | — | Pass | `IMP-05-typechecks-and-units.log` | `(baseline 1006 in 315 files)` PASS; web `(baseline 86 in 36 files)` PASS; `Tests  299 passed (299)` |
| IMP-06 | discovery called directly on branch and base connection; raw `initialize`; Grok's own startup log | — | why live attempts 1-2 failed | — | Diagnosed: Grok startup, not this change | `IMP-06-grok-discovery-startup.log` | base and branch both `ACP_DISCOVERY_TIMEOUT`; `bootstrap elapsed_ms 34384` |
| IMP-07 | CR-001 recheck: `acp-provider-started-turns.test.ts`; `pnpm -C autobyteus-server-ts typecheck`; grep for `AcpTurnOrigin` | IR-003 commit | the session after the type removal | CR-001 | Pass | `IMP-07-cr001-recheck.log` | `Tests  9 passed (9)`; `(baseline 1006 in 315 files)` PASS; no matches |

- Earlier in this round: the connection's wire-order cases were run against the old `filterForeignResponses` code, and 7 of them failed.
- Not run:
  - `deepseek-harness-standalone-host.e2e` (gated): it tests the standalone application host, not the ACP session.
  - Live DeepSeek: no change in DeepSeek behaviour beyond wire order, which the scripted suite covers.

## Known Environment Findings (not this ticket)

- Every in-process E2E file's `afterAll` timed out in `app.close()` under the FSEvents backlog. This happens with the existing cases alone too (IMP-02 control); the close stall was already timed in `followups-483-517` IMP-04.
- **Candidate follow-up for the Solution Designer:** Grok 1.0.89's own bootstrap takes 4–35 s on this machine today, against the 15 s discovery bound (`acp-discovery-handshake.ts:8`). Over the bound, the catalog says "model discovery timed out" on base and branch alike (IMP-06).

## Frontend Rendered-Result Check

`Not Applicable`: no web code changed. The notice goes through the existing generic `SYSTEM_TASK_NOTIFICATION` handler and segment, the same as Claude's background-task notice.

## Downstream Coverage Hints

- An AC-006 variant where the user's message arrives in the narrow gap between Grok's `turn_completed(input)` and the response. The session unit cases cover the session's side (one batch, no idle in between); the scripted E2E sends the message earlier, during the input turn's pause.
- RSK-001 (a client prompt sent at the instant Grok wakes) is recorded but not designed for.

# Implementation Handoff — claude-sdk-streaming-input-session

Status: **Design Impact (IMP-DI-001)**. The implementation is halted before completion; this is not a downstream-ready package.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High. The independent architecture review passed (ARCH-REV-003) and the architecture reviewer routed the package to `/implementation_engineer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/requirements-doc.md` (SR-006)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-spec.md` (SR-009)
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/probe-evidence/`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial round)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related revision IDs: SR-009; ARCH-REV-003. CRR, API-REV and DR are N/A.
- Triggering finding IDs: IC-1 and IC-2 (implemented). New finding: IMP-DI-001.
- Checkpoint commit: see branch `codex/claude-sdk-streaming-input-session` ("wip(claude): streaming-input session … [Design Impact IMP-DI-001]").

## IMP-DI-001 — AgentRun FIFO blocks active-turn append for the normal busy-agent scenario (escalation trigger)

- **Requirement impact.** Blocks REQ-004 / BEH-002 / AC-003 / AC-004 ("input accepted while a Claude turn is active is delivered into the running Claude session"). This hits the design escalation trigger "AgentRun needs a contract change beyond declaring append support".
- **Code evidence.** `src/agent-execution/input/agent-run-input-admission-state.ts` `claimNext` (L154-157):
  - `const entry = this.entries.find((c) => c.state !== "terminal"); if (!entry || entry.state !== "queued" …) return null;`
  - The entry whose `start_turn` opened the active turn stays `forwarded` until that turn's canonical terminal (`observeTurnTerminal` → `finishEntry`).
  - So a later queued input is never claimed while that turn runs, even though `activeTurnAppend: "supported"` and the turn is `IDENTIFIED`.
  - Append is only chosen when the active turn has no forwarded FIFO entry ahead of the new input, for example a provider-initiated turn or a turn started outside AgentRun. That is the shape every existing AgentRun append unit test uses (`tests/unit/agent-execution/agent-run.test.ts`, "claims exact active Codex append…", with the snapshot pre-seeded to IDENTIFIED and an empty FIFO).
- **Reproduction.**
  - Setup: a throwaway AgentRun unit test with `append: "supported"`. `postUserMessage("A")` is forwarded with `turnId: "turn-A"`; then `postUserMessage("B")`.
  - Result: B returns `{accepted: true, turnId: null}`, and `dispatchUserInput` is called once (`start_turn` only). B waits for A's terminal.
  - The same happens end to end: `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` "delivers a message sent to a busy agent into the running turn (AC-003)" fails. The second SEND_MESSAGE is acknowledged `accepted` but never reaches the session.
- **Scope note.** This is shared AgentRun behavior. The repro ran with `runtimeKind: codex_app_server`, so Codex `turn/steer` is not reached in this scenario either. The Codex claim in `docs/modules/agent_execution.md` "Active Input And Interrupt Command Results" is only true when the active turn has no forwarded entry ahead.
- **Why not patched locally.** The Claude backend can't change it: the input never reaches the backend. The owner is AgentRun input admission (`agent-execution/input`), which the design declares "reused unchanged". Changing it alters the canonical input contract for every append-capable runtime (Codex included), for ordering, exactly-once, interrupt reservation and termination quiescence. That is a design/ownership decision, not an implementation detail.
- **Possible direction (for the designer, not implemented).**
  - In `claimNext`, when append is supported and the active turn is IDENTIFIED: skip non-terminal entries that are `forwarded` and associated with (or awaiting association to) that active turn, and claim the first `queued` entry after them as `append_to_active_turn`.
  - FIFO order among undispatched entries stays unchanged.
  - Needs new AgentRun tests. Codex behavior changes too (it would then steer, as its docs claim).
  - Requirement owner: confirm whether the Codex behavior change is in scope, or whether it must stay Claude-only through a capability detail.

## Routing Classification

- Task size / architecture risk: `Large` / `High` (carried from design-spec "Task Size And Architectural Risk")
- Classification confirmed or changed: `Confirmed`
- Selected route: `Solution Designer` (Design Impact)
- Lightweight self-review: `Not Applicable` (Large/High; the Code Reviewer route applies after the design question is resolved)
- New design impact: IMP-DI-001

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change | Implemented Path / Key Files | Result |
| --- | --- | --- | --- |
| BEH-004 (REQ-001/006) | One process per run, lazy open, lives until terminate/close/shutdown | `ClaudeSession.submitInput` → `ClaudeSessionProcess.ensureOpen` → `ClaudeSdkClient.openStreamingSession` (`claude-sdk-client.ts`, `claude-sdk-streaming-session.ts`, `claude-session-process.ts`) | Done. Unit: 3 turns on one process. Live: manager integration (9/9) and client integration |
| BEH-007 | Restored run resumes once per process open | `ClaudeProviderSessionLifecycle.buildOpenBinding/noteProcessOpened/noteProcessClosed` | Done (unit + live restore tests) |
| BEH-002 (REQ-004) | Mid-turn delivery by uuid | Backend `activeTurnAppend: "supported"`; `ClaudeTurnTracker.registerInput` (append/join) | Session and backend done (unit AC-003 at session level). **Blocked at AgentRun: IMP-DI-001** |
| BEH-001/008 (REQ-002/003/009) | Background tasks enabled; completion → notice + provider-initiated turn | Policy env removed; `ClaudeBackgroundTaskRegistry` + tracker opener; `SYSTEM_TASK_NOTIFICATION` session event → converter | Done: unit, tracker probe sequences, fake-CLI websocket E2E (AC-002). Live AC-002 not yet run |
| BEH-003 (REQ-005) | Stop ends the turn only; `interrupt({cancelQueued:true})`; IC-1 | `ClaudeSession.interrupt` → `ClaudeTurnTracker.requestInterrupt` (IC-1 rule) → `ClaudeSdkStreamingSession.interruptAndCancelQueued` | Done: unit (P cq, P-prewait, provider turn, race, unsent-at-open), fake-CLI websocket E2E, **live step-1 check passed on PATH 2.1.282 and bundled 2.1.280** |
| BEH-006 (REQ-007) | Terminate closes the process | `ClaudeSession.closeProcess` via manager `terminateRun` / cleanup | Done (unit + live terminate test) |
| REQ-008 | Unexpected exit fails the turn; next input resumes | `ClaudeSessionProcess.runPump` → `onExit` → `tracker.processExited` | Done (unit) |
| BEH-005 (REQ-011) | Inline images | `claude-user-message-builder.ts`, `shared/context-image-source.ts` (Codex mapper migrated) | Done (unit AC-012/013 at session level) |
| REQ-003 history | Notice trace + replay | `runtime-memory-event-accumulator.ts` (sender-scoped), `RawTraceItem.senderId`, replay kind `system_task_notification`, web hydration mapping | Implemented; dedicated unit tests still to add |

Implementation notes for review:
- IC-2: I chose option (b). Completions recorded before `interruptRequested` are announced as "stopped" and carried over. Later ones stay pending for the CLI's own turn.
- Registry refinement: a `result` with `origin.kind === "task-notification"` inside a continuation CLI turn consumes the completions recorded before that CLI turn. This avoids stale notices at a later provider turn.
- RSK-007: a non-success result whose `modelUsage` rows are all zero is not emitted as usage, so the reconciler's cumulative baseline isn't reset.
- The "turn completed without provider UUID confirmation" guard was dropped. Every frame carries `session_id`, and a conflicting id is fatal for the process.
- The event-monitor active-trace page has no system-notice visual, so notices replay only in the run-history conversation.

## Local Implementation Checks Run

- `tsc -p tsconfig.build.json --noEmit`: pass.
- Unit, new or rewritten, all passing:

  | Suite | Result |
  | --- | --- |
  | `claude-session.test.ts` | 34 |
  | `claude-turn-tracker.test.ts` (probe frame sequences, I-1..I-3, IC-1, IC-2) | 26 |
  | `claude-session-tool-gating` | 13 |
  | `claude-sdk-client` + `claude-sdk-streaming-session` | 36 |
  | backend | 4 |
  | manager | 9 |
  | router Claude admission | 1 |

- Full `tests/unit`: 59 failed / 3369 passed, in 24 files outside the changed areas. The same 24 files give the identical result on base `6f7b5e371` (59 failed / 111 passed within them).
- Live (`RUN_CLAUDE_E2E=1`):
  - `claude-sdk-client.integration.test.ts`: 6/6, including the design step-1 `cancelQueued` check on both CLIs.
  - `claude-session-manager.integration.test.ts`: 9/9. These live tests previously called the non-existent `session.sendTurn`; they are now ported.
- Fake-CLI websocket E2E: AC-005 and AC-002 pass. AC-003 fails because of IMP-DI-001.

## Remaining Work (independent of IMP-DI-001 unless noted)

- Docs: `agent_execution.md` (lifecycle, append, interrupt, images, notice) and a `token_usage.md` note.
- Tests still to do:
  - replace `tests/e2e/runtime/claude-agent-background-bash-policy.e2e.test.ts` with a background-task E2E;
  - migrate `tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` (it still calls `startQueryTurn`);
  - add memory-accumulator scoping (ARCH-F-004), replay, builder/image-source and web hydration unit tests;
  - run the live factory/team E2E suites.
- AC-003/AC-004 end to end: depends on the IMP-DI-001 resolution.

## Frontend Rendered-Result Check

- The only web change is a small hydration mapping (`runProjectionConversation.ts`), which makes a replayed notice render with the existing notice segment.
- The rendered check is not done yet. It is pending the remaining work after the design decision.

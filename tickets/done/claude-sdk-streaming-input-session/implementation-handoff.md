# Implementation Handoff — claude-sdk-streaming-input-session

Status: **SR-012 implemented (IR-004)**. Ready for code review (Large / High).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Large / High. The independent architecture review passed (ARCH-REV-004), and the architecture reviewer routed the package to `/implementation_engineer`. IMP-DI-001 is resolved by SR-011.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/requirements-doc.md` (Approved, SR-011)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-spec.md` (SR-011)
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/solution-handoff.md`
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/probe-evidence/` (evidence only)
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/design-review-report.md` (Pass, ARCH-REV-004; binding constraints IC-1..IC-4)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/architecture-review-revision-record.md`
- Triggering rework report: ARCH-REV-004 (resume after IMP-DI-001)

## Current Implementation Summary

Claude runs now use one long-lived Claude CLI process per AgentRun in SDK streaming-input mode.
- **Process lifetime.** The process opens lazily on the first input (`create`, then `resume` for later opens) and lives until terminate/close/shutdown. An unexpected exit fails the active turn and the next input resumes.
- **Canonical turns.** `ClaudeTurnTracker` derives them from the stream plus per-input uuids. This covers turns spanning several CLI turns, turns the CLI starts itself, and uuid-accounted settlement.
- **Background tasks.** They are enabled; the v1.4.78 policy env is removed. Completions are announced with `SYSTEM_TASK_NOTIFICATION` before a Claude-started turn, recorded in memory, and replayed in history.
- **Stop.** It uses `Query.interrupt({cancelQueued:true})` under IC-1 and ends only the turn.
- **Images.** Image context files are sent inline.
- **Shared AgentRun claim rule (SR-011).** Input posted while an earlier input's turn runs is now appended into that turn, for Claude and Codex. A proven-undelivered append (`undeliveredRetryAsStart`) is requeued and starts the next turn instead of failing.

- Implementation cycle: `Rework` (IR-003: CRR-001 Local Fix CR-001; a requeued append clears the targeted turn's `pendingTerminal`/`observedTurnId`)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-streaming-input-session/tickets/in-progress/claude-sdk-streaming-input-session/implementation-revision-record.md`
- Current implementation revision ID: `IR-004` (SR-012 usage accounting across process generations, IC-5, OBS-2; see the revision record)
- Related revision IDs: SR-011; ARCH-REV-004; CRR-001. API-REV and DR are N/A.
- Triggering finding IDs: CR-001 (fixed); IMP-DI-001 (resolved by design); IC-1..IC-4 (implemented)

## Routing Classification

- Task size / architecture risk: `Large` / `High` (design-spec "Task Size And Architectural Risk"; SR-011 "Classification impact")
- Classification confirmed or changed: `Confirmed`
- Selected route: `Code Review`
- Lightweight self-review: `Not Applicable` (Large/High)
- New design impact: `None`

## Binding Constraint Implementation

| ID | Implementation | Evidence |
| --- | --- | --- |
| IC-1 | `ClaudeTurnTracker.requestInterrupt`: unsent uuids are cancelled locally. `sdkInterruptRequired = anySent \|\| cliTurnOpen`. `ClaudeSession.interruptActiveTurn` calls `interruptAndCancelQueued` when required | Tracker tests "provider-initiated turn…", "start_turn raced…", "only-unsent…"; session tests for the provider turn, the race, and unsent-at-open |
| IC-2 | Option (b): `registry.announceStopped(stopSequence)` carries over only completions recorded before `interruptRequested`. Later ones stay pending for the CLI's own turn | Tracker test "keeps a completion recorded after the Stop pending…" |
| IC-3 | The pre-RPC check throws the distinct `CODEX_TURN_STEER_TURN_NOT_ACTIVE`. The Codex backend maps only that code to `undeliveredRetryAsStart`. Post-RPC `CODEX_TURN_STEER_ID_MISMATCH` and `CODEX_TURN_STEER_REJECTED` stay visible failures | 3 Codex backend tests + 1 thread test |
| IC-4 | Left as-is and documented as a claim-time hint (`AgentRun.postUserMessage` doc comment and `agent_execution.md`). No consumers were added | — |

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change | Implemented Path / Key Files | Result |
| --- | --- | --- | --- |
| BEH-004 (REQ-001/006) | One process per run, lazy open, no idle close | `ClaudeSession.submitInput` → `ClaudeSessionProcess.ensureOpen` → `ClaudeSdkClient.openStreamingSession` → `ClaudeSdkStreamingSession` | Unit (3 turns, 1 process) + live manager/client integration |
| BEH-007 | Restore resumes once per open | `ClaudeProviderSessionLifecycle.buildOpenBinding/noteProcessOpened/noteProcessClosed` | Unit + live restore tests |
| BEH-002, BEH-009 (REQ-004, REQ-012) | Mid-turn delivery; shared claim rule; undelivered requeue | `AgentRunInputAdmissionState.claimNext` walk + `notInto`; `applyDispatchResult` requeue; Claude `registerInput` append/join; Codex `turn/steer` | AgentRun + admission unit (AC-015/016, IMP-DI-001 repro); Claude websocket fake-CLI AC-003; router AC-004 through AgentRun |
| BEH-001/008 (REQ-002/003/009) | Background tasks; notice + provider-initiated turn | Policy env removed; `ClaudeBackgroundTaskRegistry`; tracker opener; `SYSTEM_TASK_NOTIFICATION` | Unit, probe-sequence tests, fake-CLI websocket, **live AC-002 on PATH and bundled CLIs** |
| BEH-003 (REQ-005) | Stop ends the turn only | `ClaudeSession.interrupt` → tracker (IC-1) → `interruptAndCancelQueued` | Unit, fake-CLI websocket, live websocket interrupt test, **live cancelQueued check on both CLIs** |
| BEH-006 (REQ-007) | Terminate closes the process | `ClaudeSession.closeProcess` via manager `terminateRun`/cleanup | Unit + live terminate tests |
| REQ-008 | Exit fails the turn; resume on next input | `ClaudeSessionProcess.runPump` → `onExit` → `tracker.processExited` | Unit |
| BEH-005 (REQ-011) | Inline images | `claude-user-message-builder.ts`; shared `context-image-source.ts` (Codex mapper migrated with no behavior change) | Builder + source unit tests; session AC-012/013 |
| REQ-003 history | Notice trace and replay | Accumulator (sender-scoped); `RawTraceItem.senderId`; replay kind `system_task_notification`; conversation entry `senderId`; web hydration → notice segment | Memory/replay unit tests (incl. ARCH-F-004 scoping); web spec |

## Key Files Or Areas

- **Client**: `runtime-management/claude/client/claude-sdk-client.ts` (`openStreamingSession`; `startQueryTurn`, `closeQuery` and the policy env are removed) and `claude-sdk-streaming-session.ts` (new; input channel, `cancelQueued` adapter, capability snapshot).
- **Session**: `backends/claude/session/`
  - `claude-session.ts` (rewrite);
  - `claude-session-process.ts`, `claude-turn-tracker.ts`, `claude-background-task-registry.ts`, `claude-user-message-builder.ts` (new);
  - `claude-provider-session-lifecycle.ts`, `claude-session-manager.ts`, `claude-session-cleanup.ts`, `claude-session-state-input.ts`, `claude-session-token-usage.ts`;
  - `claude-selected-model-binding.ts` (renamed);
  - `claude-active-turn-execution.ts` (deleted).
- **Backend and events**: `backends/claude/backend/claude-agent-run-backend.ts` (append supported; undelivered mapping) and `backends/claude/events/*` (notice event).
- **Shared AgentRun input**: `agent-execution/input/agent-run-input-admission-state.ts` and `agent-run-input-contract.ts`; `domain/agent-run.ts` (IC-4 doc comment only).
- **Codex**: `codex-thread.ts`, `codex-input-submission-error.ts`, `codex-agent-run-backend.ts`, `codex-user-input-mapper.ts`.
- **Shared domain and image source**: `agent-execution/shared/context-image-source.ts`; `domain/system-task-notification-senders.ts`.
- **Memory and history**: `agent-memory/*` (trace type, writer, normalizer, accumulator); `run-history/projection/*` (replay kind, conversation, event-monitor no-visual branch).
- **Other packages**: `autobyteus-ts` `RawTraceItem.senderId` (additive); `autobyteus-web` `runProjectionConversation.ts`.
- **Docs**: `docs/modules/agent_execution.md` (active input claim rule, streaming lifecycle, interrupt, images, notice) and `docs/modules/token_usage.md` (streaming cumulative note, zeroed crash results).
- **Tests**: new or rewritten unit, integration and E2E suites, listed below. The helper is `tests/helpers/fake-claude-streaming-sdk.ts`.

## Implementation Notes For Review

- **Registry refinement.** A `result` with `origin.kind === "task-notification"` in a continuation CLI turn consumes completions recorded before that CLI turn, which avoids stale notices at a later provider turn.
- **RSK-007.** A non-success result whose `modelUsage` rows are all zero is not emitted as usage.
- **Provider UUID guard.** The old "completed without provider UUID confirmation" turn guard was dropped. Every frame carries `session_id`, and a conflicting id is fatal for the process.
- **Rejection codes.** A `start_turn` that races into an interrupting turn is rejected with `CLAUDE_TURN_INTERRUPTING` (not retried). Only the append mismatch `CLAUDE_APPEND_TURN_MISMATCH` sets `undeliveredRetryAsStart`.
- **History surfaces.** The event-monitor active-trace page has no system-notice visual; notices replay only in the run-history conversation.
- **Pre-existing test bugs fixed.**
  - Two E2E harnesses passed the SDK client as the workspace manager argument of `ClaudeSessionManager`, so the "mocked" tests launched a real CLI.
  - The live manager tests called a non-existent `session.sendTurn`.
  - The live factory tests treated the backend as an AgentRun and used an unnamed agent definition.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There is no single-message fallback or flag (DEC-005).
- Legacy behavior retained: `No`. The policy env, per-turn query, `AbortController` interrupt path, `activeQueriesByRunId`, `startQueryTurn`, `closeQuery` and client auto-approve are removed.
- Dead code and obsolete tests removed: `Yes`.
  - `claude-sdk-client-runtime-policy.integration.test.ts` is deleted.
  - The background-bash policy E2E is replaced by `claude-agent-background-task.e2e.test.ts`.
- Shared structures tight: `Yes`. The dispatch-result flag is optional and its validity is documented.
- Changed source files within size guardrails: `Yes`.
  - `claude-session.ts` 477, `claude-sdk-client.ts` 471, `claude-turn-tracker.ts` 368, `agent-run-input-admission-state.ts` 418, `agent-run.ts` 464.
  - `codex-thread.ts` stays at its base size of 500; `claude-session-event-converter.ts` is 497.

## Persisted Data Transition Check

- Approved decision: `Directly Usable — No Migration`. The trace type is additive; `sender_id` is an optional field and older traces lack it.
- Implementation follows it: `Yes`.

## Environment Or Dependency Notes

- Worktree setup:
  - `pnpm install --frozen-lockfile`;
  - `pnpm exec prisma generate` and `pnpm prepare:shared` in `autobyteus-server-ts` (rerun `prepare:shared` after `autobyteus-ts` changes);
  - `pnpm exec nuxt prepare` in `autobyteus-web` before web vitest.
- Claude CLIs used for live checks: PATH `claude` 2.1.282 and SDK-bundled 2.1.280 (SDK 0.3.280).

## Local Implementation Checks Run

- `tsc -p tsconfig.build.json --noEmit`: pass.
- Unit, new or changed, all passing:

  | Suite | Result |
  | --- | --- |
  | `claude-session.test.ts` | 34 |
  | `claude-turn-tracker.test.ts` (probe frame sequences, I-1..I-3, IC-1, IC-2) | 26 |
  | `claude-user-message-builder.test.ts` | 3 |
  | `context-image-source.test.ts` | 1 |
  | `claude-session-tool-gating` | 13 |
  | `claude-sdk-client` + `claude-sdk-streaming-session` | 36 |
  | Claude backend | 5 |
  | Claude manager | 9 |
  | `agent-run-input-admission-state.test.ts` | 11 (incl. CR-001 completed/failed-during-claim) |
  | `agent-run.test.ts` | 34 (incl. CR-001 terminal-during-append-dispatch) |
  | Codex backend + thread | 50 (+4) |
  | memory notice / replay | 2 |
  | router AC-004 | 1 |
  | web `runProjectionConversation.spec.ts` | 12 |
  | `autobyteus-ts` memory | 246 |

- Full server `tests/unit`: 59 failed in 24 files, all outside the changed areas. The same 24 files give the identical result on base `6f7b5e371` (verified with a tracked-only stash).
- Fake-CLI websocket E2E (`claude-agent-websocket-interrupt-resume.e2e.test.ts`): AC-005, AC-003 and AC-002 pass.
- Live (`RUN_CLAUDE_E2E=1`):

  | Suite | Result |
  | --- | --- |
  | `claude-sdk-client.integration.test.ts` (incl. step-1 `cancelQueued` on both CLIs) | 6/6 |
  | `claude-session-manager.integration.test.ts` | 9/9 |
  | `claude-agent-background-task.e2e.test.ts` (AC-002, both CLIs) | 2/2 |
  | `claude-agent-websocket-interrupt-resume.e2e.test.ts` (incl. the live interrupt case) | 4/4 |
  | `claude-agent-run-backend-factory.integration.test.ts` | 6/8 |

- Live suites not passing (pre-existing, unrelated):
  - The 2 `claude-agent-run-backend-factory.integration.test.ts` Agent Tools MCP browser cases stub `activateForRun` as `not_exposed`, so they cannot pass without a real Agent Tools MCP harness.
  - `claude-team-inter-agent-roundtrip.e2e.test.ts` (5) fails at team-definition setup on the removed GraphQL field `refType`, before any Claude code runs.

## Frontend Rendered-Result Check

- Affected surface: run-history conversation hydration of a replayed Claude background-task notice. Live notices already rendered through the existing `SystemTaskNotificationSegment`.
- Change: `runProjectionConversation.ts` maps a `system_task_notification` entry to that existing segment type.
- Verified: by unit spec only. The rendered UI was not inspected; that needs a server, the web app and a Claude run with a notice in its history. This remains unverified and is left for API/E2E or delivery user verification.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-014 (new production path):** gated live Codex check. Send a message to a busy Codex agent (user and teammate) and confirm `turn/steer` into the same turn id with no new turn.
- **AC-001 / AC-006:** confirm the same pid across 3 messages and after idle (`ps`).
- **AC-007:** server restart, then resume and recall.
- **AC-008:** terminate with a running background task and check for no orphans with `ps`.
- **AC-009:** kill the CLI mid-turn, then the next message works with context.
- **AC-012:** a live screenshot question without a `Read` call.
- **AC-004:** live team `send_message_to` to a busy Claude member and a busy Codex member (the team E2E harness needs its GraphQL setup updated first).
- **RSK-007:** usage totals after a crash reopen.

## API / E2E / Executable Coverage Still Required

- Everything in the list above, plus the pass/fail classification. `api_e2e_engineer` owns this.

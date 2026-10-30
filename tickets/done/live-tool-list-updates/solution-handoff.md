# Solution Handoff — `live-tool-list-updates`

- Result: **Architecture Design Complete** (SR-001), `task_size=Large`, `architectural_risk=High`.
- Origin: Project Task `autobyteus-324` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`) from `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-10-29. Design first; build only after the user approves.

## Request summary

When an agent definition's tool list changes (an edit, a package update or an auto-refresh), every running run of it gets the change without a stop and resume. The new tool becomes callable, a removed tool is refused, and the agent gets one short notice. The user sees a "Tools updated" card in the run. In the user's words: "user does not have to stop manually the agent or team, they send message directly and it will work".

## Approval

The user approved SR-001 on 2026-10-29, in the Solution Designer conversation.
- DEC-001 (a): Codex and Grok reopen their runtime session by themselves at the next message, with the same conversation. The restart button appears only when a reopen fails.
- DEC-004: build Codex without a real run (the account's usage limit runs until 2026-11-04). A real Codex run happens if the limit is back before merge, otherwise as a check afterwards.
- FU-001 (Claude runs inheriting the user's own Claude settings and claude.ai connectors) is outside this ticket, as the user agreed.

## Classification evidence

- A transport change in the Agent Tools MCP endpoint: a held GET stream, `listChanged: true`, and the AGY header removed. Every external runtime's connection crosses it.
- A new `AgentRun.applyToolExposure` operation, implemented on all five runtimes. Codex and Grok reopen their session at the next input.
- A new server capability area, `tool-list-updates`, plus `Agent.replaceTools` in `autobyteus-ts` and a web card.
- The security invariant: a removed tool is refused at once, and nothing is exposed that the definition does not list.

## Measured runtime facts (investigation-notes, "Runtime Probes")

- Claude Agent SDK 0.3.280 re-reads the tool list on `list_changed`.
- AGY 1.4.10 re-reads it too, but only with a GET stream, so without our header.
- Codex 0.165 and Grok 1.0.70 never re-read it.
- Native: tools are read per LLM call (from the code).

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates/tickets/in-progress/live-tool-list-updates/follow-ups.md` (FU-001)
- Supplements: `evidence/probe/` (probe server, per-runtime drivers, logs; the reproduction for the build). Product Design: N/A. Prior reviews: none.

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/live-tool-list-updates`, branch `codex/live-tool-list-updates`.
- Base `origin/personal` @ `9f7c9c10a619fed0a819a35c70bac3631c4070d0`; target `origin/personal`.
- No source changes; the ticket docs are not committed yet.

## Open risks

- R-01: runtime versions drift; the server enforces removal regardless.
- U-01 / ASM-001: Codex `thread/resume` on a loaded thread. The design reuses the restore path, which reuses the run's Agent Tools session; verify that reopening does not try to activate that session a second time.
- AGY without the header against the product endpoint (measured only against the probe server).

## Constraints for every role

- Isolated instances and temp data for all tests; never the user's real data.
- Prove from a clean clone.
- No release unless asked.
- Use the GLOSSARY.md vocabulary.

## Next expected action

Independent architecture review, then implementation per the design's Change / Refactor Sequence.

## Route applied

`get_handoff_rules` (2026-10-29): Large / High → `/software_engineering_team/architecture_reviewer`.

## SR-002 Revision (after ARCH-REV-001, 2026-10-29)

Every finding is answered in `design-spec.md` "SR-002 Revision Summary". In short:

- **AR-001:** the session is never re-activated, and backends read the current descriptor through `describeForRun`. The reopen sequences are written out, and both were measured without a model:
  - Codex: `thread/unsubscribe` + `thread/resume` with the rebuilt config, on the same client, lease, skills and thread object. A new MCP connection was measured (E-13). A thread with no history gets `thread/start`.
  - Grok: a new process + `session/load` through the extracted `AcpSessionLauncher`. A new connection was measured (E-14); a same-process load does not reconnect.
- **AR-002:**
  - `takePreface(run, { dispatchKind })`;
  - the reopen happens only inside a `start_turn` dispatch, and appends pass through unchanged;
  - the tool notice for a run waiting for a reopen goes only on `start_turn`.
- **AR-003:** every external run always has an Agent Tools session, possibly empty; `not_exposed` and the null branches are removed. Measured: Claude and AGY accept a zero-tool server and use the first tool added later (E-15). Claude's later process generations read the current exposure and descriptor.
- **AR-004:**
  - the composite `AgentRunPlatformNotices`, with tools first, then skills;
  - one preface per dispatch (DEC-006), with per-source settle routing and lifecycle fan-out;
  - wired in `build-studio-server.ts` and `start-standalone-application-host.ts`, so the standalone host gets tool updates too.
- **AR-005:** `<memoryDir>/seen_tool_names.json` (`SeenToolNamesStore`); `Directly Usable — No Migration`; no record means "has seen the current list".
- **AR-006:** one `AgentDefinitionChangeSignal` fed by:
  - the reloader publisher, which covers shared, team-local and org-owned agents;
  - application-owned agent edits;
  - committed application package changes.

  The service re-reads each tracked run's own definition by ID.
- **AR-007:** follow-up FU-002.
- **Operation renamed:** `AgentRun.applyDefinitionTools(definition)` → `{ kind: unchanged | applied | on_next_turn, toolNames }`. The backend resolves its own runtime's tools; native adds its default tools and application tools.
- **Requirements:** DEC-006 and DEC-007, the AC-007 detail, application packages named in UC-003, persisted data `Yes`. All within the direction, user informed; the SR-001 approval stands.
- **New evidence:** E-13…E-18 in `investigation-notes.md`, plus the probe drivers `drive-codex-reopen.mjs` and `drive-grok-reopen.mjs` and the `*-empty-*` logs.
- **Route:** `get_handoff_rules` → the Large/High revised package matches the architecture-review rule → `/software_engineering_team/architecture_reviewer`.

## SR-003 Revision (after ARCH-REV-002, 2026-10-29)

- **AR-001 (Grok part), option (a):** the measured order (E-14), which is also the product's restore order.
  1. End the old process as a reopen: detach the failure and event sinks, so the exit is not a run failure and the skills are not released.
  2. Then spawn a new process and `session/load` through `AcpSessionLauncher`.
  - A failed reopen leaves the backend with no runtime session. The run stays active and idle, not failed. `reopenPending` is kept, the message is not sent (DEC-007), and the next `start_turn` retries; the restart button also works.
  - Lifecycle, dispatch, approve, interrupt, terminate and platform ID are each specified for that state (design-spec, Grok reopen sequence, step 7).
- **Recommendation adopted:** on success, `reopenPending` is recomputed (current descriptor ≠ the one opened with) for Codex step 5 and Grok step 5.
- No requirement change.
- **Route:** `get_handoff_rules` → the Large/High revised package matches the architecture-review rule → `/software_engineering_team/architecture_reviewer`.

## SR-004 Revision (after ARCH-REV-003, 2026-10-29)

- **AR-008:** the run's `AcpPreparationOwner` is the single holder of the run's ACP process, connection and session, across creation, restore and reopen.
  - `AcpSessionLauncher.open({ owner, … })` records each handle in it as soon as it exists.
  - `AcpAgentRunBackend` reads its connection and session from it, and keeps no copies.
  - A reopen clears it in step 2, fills it in step 4, and empties it on failure in step 6.
  - The unchanged, null-safe `releaseResources` therefore ends the current process.
  - Tests:
    - stop after a reopen ends the reopened process;
    - stop after a failed reopen ends nothing and releases the skills;
    - a deliberate end does not reach `handleSessionFailure`.
  - Codex is confirmed unaffected: the same `ThreadPreparation` and `CodexThread` object.
- No requirement change.
- **Route:** `get_handoff_rules` → the Large/High revised package → `/software_engineering_team/architecture_reviewer`.

- 2026-10-29: ARCH-REV-004 **Pass** on SR-004 (AR-001…AR-008 resolved). The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer`. No Solution Designer forwarding required.

## SR-005 Revision (after code review CRR-001, 2026-10-29)

- **CR-001 (Design Impact):** decided by the user (DEC-008). The "Restart this run with the new tools" button is **removed altogether**, not adapted for Teams.
  - Reasoning: the Task asked for it only where a runtime truly cannot take new tools. The investigation showed every runtime can. Stop, then send a message, already works today. For a Team member the button stopped the whole Team.
  - A failed reopen now shows a plain message: "Couldn't give this run its new tools. Send your message again to retry." The next turn-start retries, and nothing stops a Team.
  - Requirements changed: REQ-010, AC-007 (now also checked for a Team member), SCN-004, the UI section and DEC-008.
- **Code to remove,** built at code commit `5f3923c4cd` (design-spec Removal plan):
  - `restartRunWithNewTools` (`autobyteus-web/stores/agentRunStore.ts:424-452`);
  - the button and its `restart_run` handling in `SystemTaskNotificationSegment.vue`;
  - their localization strings and tests;
  - the server failure notice's `action: "restart_run"` field;
  - the button text in `autobyteus-server-ts/docs/modules/tool_list_updates.md:86-88`.
- **CR-002 and CR-003** are the code reviewer's local fixes for the same implementation round; no design change:
  - move Claude's `getAgentToolNames`/`applyToolExposure` into `ClaudeAgentToolsMcpSessionState`;
  - pass the Grok working directory as a non-null value and drop the `"."` fallback.
- **Route:** `get_handoff_rules` → the Large/High revised package matches the architecture-review rule → `/software_engineering_team/architecture_reviewer`. It is a removal-only delta, so a targeted review of SR-005 is enough. After that: implementation, code review again, then API/E2E.

## SR-006 Revision (after ARCH-REV-005, 2026-10-29)

- The user confirmed again, 2026-10-29: "The restart button should be removed … we don't need this restart button."
- **AR-009, part 1:** the failure notice has its **own sender**, `system.tool_list_update_failed` (`TOOL_LIST_UPDATE_FAILED_SENDER_ID`, beside the tools-updated sender; the web declares the same literal, as it does for both existing senders).
  - The web recognizes it **by sender only**: no content match, no `action` field.
  - Label `toolsNotUpdated`: "Tools not updated" / "工具未更新". Body `toolsReopenFailed`: "Couldn't give this run its new tools. Send your message again to retry." / "无法为此运行提供新工具。请重新发送消息以重试。"
  - It is live only, not recorded for replay: the new sender is not in `RECORDED_SYSTEM_NOTICE_SENDER_IDS`, and no turn exists at the failure. So replay can never show it as "Tools updated".
- **AR-009, part 2:** the Removal plan names every consumer:
  - `runtime-session-reopen.ts:8-27`;
  - the two reopen tests;
  - `agent_execution.md:537`, `tool_list_updates.md:84-88`;
  - `messageTypes.ts:225`, `types/segments.ts:82`;
  - the segment's `runId` prop and its callers;
  - the en and zh-CN strings and the spec key checks;
  - `agent_execution_architecture.md:1833`;
  - plus a grep for `restart_run` / `restartRunWithNewTools` / `RESTART_RUN` that must come back empty.
- **AR-009, part 3:** DEC-001's "the button stays" is marked superseded by DEC-008.
- **Route:** the architecture-review rule (Large/High revised) → `/software_engineering_team/architecture_reviewer`.

## SR-007 Revision (the user's decision; resolves ARCH-REV-006, 2026-10-29)

- The user decided (DEC-009): "If there are errors … they will just show error … the user maybe just manually click the stop and then resume. I think that's normal operation we already have."
- So there is **no failure notice at all**: no card, no own sender, no strings, no web recognition.
  - A failed reopen fails the dispatch (`RUNTIME_SESSION_REOPEN_FAILED`) with the message "Couldn't give this run its new tools (<cause>). Send your message again to retry, or stop and resume the run."
  - `AgentRunCommandCoordinator.applyInputLifecycle` marks the command failed with that message, and the web shows it like every failed message, on single runs and Team members alike.
- AR-009's Team-stream gap disappears: nothing new crosses `CollaborationAgentPresentationAdapter`.
- The Removal plan adds the failure-notice pieces (built or planned in SR-006), and the completion grep adds their names.
- **Route:** the architecture-review rule (Large/High revised) → `/software_engineering_team/architecture_reviewer`.

## SR-008 Revision (after ARCH-REV-007, 2026-10-29)

- **AR-009 (Team members), option (a):** `ConfiguredAgentExecutionHandle.postMessage` (`configured-agent-execution-handle.ts:138-150`) passes a `lifecycleObserver`. On a `failed` fact it calls the existing `publishCommandStatus("error", fact.message)` (`:461`), as admission rejections already do (`:148`).
  - The member shows `error` with the reopen message; no new UI, event or contract.
  - Teammate deliveries (`reserveInput`) are unchanged.
  - Integration test: a Team member's failed reopen shows the member error status with the message; the other members are untouched.
- This stays within DEC-009 ("just show error"). AC-007's Team clause is kept.
- **Route:** the architecture-review rule → `/software_engineering_team/architecture_reviewer`.

## SR-009 Revision (after ARCH-REV-008, 2026-10-29)

- **AR-009:** the SR-008 target `publishCommandStatus` is inert once a run exists (`:461-463`), so it is replaced.
  - The `postMessage` `lifecycleObserver` publishes a run `ERROR` `{ code, message }`, with no error evidence, through `this.options.callbacks.publishAgentEvent(this.identity, { kind: "agent_run", event })` (`:455`).
  - Path: the presentation `ERROR` (`collaboration-agent-presentation-adapter.ts:374-379`, scope and effect `null`) → the projector (`:102`) → the web `TeamStreamingService` → `dispatchAgentStreamMessage` → `handleError` (`agentStatusHandler.ts:129-167`), which adds an error segment to the member's conversation.
  - It never goes through `AgentRun.publishEvent`, so there is no single-run duplicate and no effect on the run's input lifecycle. It is live only.
  - Tests: an integration test asserts the Team stream receives `ERROR` for that member and nothing for the others; a web unit test checks the error segment.
- **Route:** the architecture-review rule → `/software_engineering_team/architecture_reviewer`.

- 2026-10-29: ARCH-REV-009 **Pass** on SR-009 (AR-001…AR-009 closed). The reviewer delivered the rework handoff to `/software_engineering_team/implementation_engineer`. No Solution Designer forwarding required.

## SR-010 Revision (after failure-origin review CRR-004, 2026-10-29)

- **Finding:** a single run's input that failed before it was sent (API-05, Grok reopen failure) is silent. The coordinator's "failed" only records it, and the web shows errors only for an `ERROR` frame or a rejected ack. SR-007 wrongly assumed otherwise.
- **Decision, option (a): one rule for both paths.**
  - `member-input-failure-observer.ts` moves to the runtime-neutral `agent-execution/input/unsent-input-failure-observer.ts` (`createUnsentInputFailureObserver`).
  - `AgentRunCommandCoordinator.post` composes it with `applyInputLifecycle`, and publishes `getAgentRunEventMessageMapper().map(errorEvent)` through `this.broadcaster.publishToRun`.
  - The Team handle imports the same observer.
  - Nothing goes through `AgentRun.publishEvent`, so there are no lifecycle or memory effects, and it is live only.
- This also ends the same silence for other undispatched post-admission failures on single runs, which is within DEC-009. FU-003 is re-checked in API/E2E.
- **Tests:** a unit test of the shared rule; a coordinator integration test (one `ERROR`, no duplicate); the API-05 e2e unchanged.
- **Route:** `get_handoff_rules` → the architecture-review rule (Large/High revised) → `/software_engineering_team/architecture_reviewer`.

- 2026-10-29: ARCH-REV-010 **Pass** on SR-010. The reviewer delivered the handoff to `/software_engineering_team/implementation_engineer`. No Solution Designer forwarding required.

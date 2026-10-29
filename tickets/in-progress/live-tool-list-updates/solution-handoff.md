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

# Implementation Handoff

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected and passed (ARCH-REV-002, SR-001..SR-003); source review next (see Routing).
- Requirements doc: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/requirements-doc.md
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/investigation-notes.md
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/solution-revision-record.md
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/design-spec.md
- Supplemental task artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/temp-task-tool-split-proposal.md
- Design review report: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/design-review-report.md
- Architecture review revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/architecture-review-revision-record.md (also /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/handoff-architecture-review.md)
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial)

## Current Implementation Summary

`create_or_update_task` is replaced by `create_task` (create mode) and `update_task` (patch mode) in one contract module, native classes and the MCP manifest. No task tool is automatic. The AutoByteus collaboration-tool filter (which dropped `create_task`) is deleted. Every collaboration text, the `@` note and the reactivation errors are tool-neutral; close/reopen guidance lives only in `update_task`'s description. The note parser still accepts the previous release's note in every combination. Docs, tests, probes and ticket `release-notes.md` updated.

- Implementation cycle: `Initial`
- Implementation revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/implementation-revision-record.md
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: SR-001..SR-003
- Related architecture-review revision IDs: ARCH-REV-002
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Triggering finding IDs: N/A

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: public agent tool contract changes (a name disappears, two appear), default exposure changes, agent configs naming the old tool silently lose task tools. No persistence, runtime-owner or concurrency change; ~60 files but mostly mechanical test/doc edits. One detail the design did not anticipate: a custom (non-first-party) tool registered with `TASK_MANAGEMENT` category and configured by an agent is no longer dropped for member contexts (only the removed filter did that; no first-party or registered tool relies on it). No change to the classification.
- Selected route: `Code Review` (Medium + High)
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | No task tool automatic; `send_message_to`, `delegate_task`, `get_handoff_rules` stay | `runtime-agent-tool-exposure.ts#automaticCollaborationToolNames`; AutoByteus `autobyteus-agent-tool-resolver.ts` iterates `requestedToolNames`; filter file deleted; Codex/Claude read `enabledProjectTaskToolNames` | Done. Parity test `task-tool-runtime-parity.test.ts` covers AutoByteus, Codex(MCP catalog), Claude |
| BEH-002 | Delegation texts neutral; guidance in `update_task` | `agent-team-collaboration-llm-contract.ts` (SEND_MESSAGE_TO / DELEGATE_TASK descriptions, collaboration instruction); `update_task` description in contract; `docs/modules/prompt_engineering.md` example synced; pinned hashes updated | Done; `task_id` still in the delegate result (DEC-003) |
| BEH-003 | Two tools, same results/errors | contract parsers `parseCreateTaskInput`/`parseUpdateTaskInput`; manifest `executeProjectTaskTool` (`update_task` → `updateTaskById`, else `createTaskWithLocalContextFiles`); `CreateTaskTool`/`UpdateTaskTool` | Done; parser order of checks and error codes kept (unit table + HTTP e2e) |
| BEH-004 | Reactivation errors neutral | `task-execution-resources.ts` (2), `project-task-service.ts` (1) | Done; unit + e2e assertions updated |
| BEH-005 | `@` note drops closing sentence; old notes parse | `collaborator-mention-note.ts` (`guidanceFor(entries, delegateSentence)`, `PREVIOUS_RELEASE_NOTE_GUIDANCE`); `dist/` rebuilt | Done; parse tests for every combination (AC-008) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `src/agent-tools/project-tasks/{project-task-tool-contract,project-task-native-tools,project-task-tool-manifest}.ts`, `src/agent-execution/shared/runtime-agent-tool-exposure.ts`, `src/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.ts`, `src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`, `src/projects/domain/task-execution-resources.ts`, `src/projects/services/project-task-service.ts`. Deleted: `src/agent-execution/backends/autobyteus/autobyteus-collaboration-tool-exposure.ts`.
- Presentation contracts: `src/collaborator-mention-note.ts` + tracked `dist/collaborator-mention-note.*`.
- Tests: new `tests/unit/agent-execution/shared/task-tool-runtime-parity.test.ts`; resolver, exposure, llm-contract, tool, business-result, reactivation, standalone-root, org-collaborators unit tests; e2e/probes/fixtures; presentation-contracts `tests/collaborator-mention-note.test.mjs`. Deleted: `autobyteus-collaboration-tool-exposure.test.ts`; factory test no longer uses the fake `assign_task_to` filter case.
- Docs: server `docs/modules/{projects,agent_tools,agent_tools_mcp_server,agent_communication,agent_team_execution,standalone_agent_run_root,prompt_engineering}.md`; web `docs/{projects,chat}.md`. Release notes: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/release-notes.md.

## Important Assumptions

- `required` flags on `create_task` (project_id, description) and `update_task` (task_id) were added to the published schema (the combined tool had none); parser still owns all error codes, and the real HTTP MCP e2e (`project-task-boundaries`) shows identical errors, so error codes are unchanged.
- Fixture `tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/*` is released-data history and keeps the old name (design: history stays).
- Gated live probes that formerly relied on automatic exposure now give their agents `create_task`/`update_task` or `update_task` explicitly.

## Known Risks

- FU-1 (Project Task Manager package in `autobyteus-agents`) must ship in the same release; until then that agent has no task tools.
- Task 259ddae7 touches the same llm-contract file; whichever lands second rebases.
- Gated e2e (`RUN_AGY_FAILURE_E2E` etc.) and live web probes were edited but not executed here.
- A custom tool registered with the `TASK_MANAGEMENT` category is no longer filtered for member contexts (see classification note).
- Editorial leftovers from the package (SCN-004 row says "names update_task"; investigation notes status says SR-002) were not touched; AC-004/BEH-004 (tool-neutral) were followed.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: Boundary Or Ownership Issue
- Reviewed refactor decision: Refactor Needed Now
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: two parsers over private shared validators; guidance on the owning tool.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the frozen previous-release note sentence is a parse-only recognizer required by AC-008, never composed)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (filter file and test, `CREATE_OR_UPDATE_TASK_TOOL_NAME`, unused context description const)
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (largest touched: `project-task-service.ts` 499 effective lines, one line replaced, not grown)
- Notes: none

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision"
- Implementation follows the approved decision without an unapproved migration or fallback: `Yes`
- Direct-use evidence: an agent definition still naming `create_or_update_task` launches with a "not found in registry" warning and no task tools (resolver + parity tests, AC-007)
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree needed `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild`, `nuxt prepare`. Untracked build output (`autobyteus-application-*/dist`) is not part of the change. `autobyteus-server-ts/dist` was not built, so `projects-startup-migration` and `project-mutation-node-locality` e2e (which need it) were not run.

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts typecheck`: pass
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit`: 693 files / 5507 tests pass (7 skipped)
- `pnpm -C autobyteus-agent-presentation-contracts test`: 20/20 pass (includes AC-008 combination parse tests)
- `vitest run tests/e2e/projects`: `project-task-boundaries` (real HTTP MCP, native vs MCP errors, schemas) and `projects-graphql` pass; gated suites skipped; two files that need `dist/` not run
- `pnpm -C autobyteus-web test:nuxt` for `utils/collaborators` and `runTreeSummary.skillRequest`: pass
- Not run: live/gated AGY, Codex, Claude suites and web live probes.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable — no rendered frontend or interaction change (docs and probe scripts only in the web package).

## Downstream Coverage Hints / Suggested Scenarios

- Description-only `delegate_task` from an agent with no task tools: result has `task_id`; tool list and prompt contain no task tool or closing instruction.
- Same agent with `update_task`: sets the returned `task_id` DONE; copy stops and hides; reopen then message works; the `@` note and closed-copy error name no tool.
- PTM-style agent with `create_task` + `update_task` on AutoByteus, Codex, Claude: create, update, context files, closure, reactivation.
- An agent configured with `create_or_update_task`: launches, no task tools, warning logged.
- Replay a saved message with the previous release's `@` note: still recognized.
- Third-party MCP tool named `create_task`/`update_task` is replaced by the first-party tool.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Gated runtime suites (AGY, Codex, Claude) and web live probes edited here need execution by the API/E2E owner; `dist`-dependent e2e need `pnpm -C autobyteus-server-ts build` first.

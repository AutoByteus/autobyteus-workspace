# Implementation Handoff

Ticket `collaboration-prompt-wording` — collaboration texts written for the agent.
Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording`, branch
`codex/collaboration-prompt-wording`, base `origin/personal` `3712cd9bf0`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review not selected
  (Architecture Design Complete, Medium / Low → direct implementation); review artifacts are
  `N/A — not applicable`.
- Handoff from the Solution Designer: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/handoff-implementation.md`
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/solution-revision-record.md` (SR-001, SR-002; implemented from the SR-002 files)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/design-spec.md`
- Supplemental task artifacts (behavior-defining wording, user-approved):
  `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/wording/collaboration-prompt-wording-proposal.md`,
  `.../wording/collaboration-prompt-complete-views.md`, `.../wording/build-complete-views.py`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report: `N/A` (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Rework` (IR-002 on top of the IR-001 baseline)
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/implementation-revision-record.md`
- Current implementation revision ID: `IR-002` (baseline `IR-001`)
- Related solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Related architecture-review / delivery revision IDs: `N/A`; code-review: `CRR-001` (`code-review-report.md`); API/E2E: `API-REV-001`
- Triggering finding IDs: `F-3a`, `F-3b`, `F-1` (C-3 covered by F-3a)

What was built:

1. **Role.** `collaborationRole` (`standalone_agent` | `task_agent` | `team_member` | `org_agent`) is a
   required field of `MemberExecutionContext` (validated against the closed set). It is decided once:
   `resolveMemberCollaborationScope` (now also given the agent's run ID and the root's configured run
   IDs / configured role) and the Agent-root host builder (`standalone_agent`). A task agent placed at
   a configured address keeps that root's handoffs and Team Instruction but is a `task_agent`.
2. **One prompt file.** `agent-execution/prompt/collaboration-prompt-sections.ts` holds the wording
   §4.1, §4.2, §5.0, §5.1, §5.2, §5.3 text and `renderCollaborationSections(context)`; the composer
   renders Team Instruction (any role, when present) then those sections. The three old renderer files
   and their instruction constants are deleted. No section states the agent's own address; `Handoffs`
   only when `outgoingHandoffs.length > 0`.
3. **Tool descriptions** (wording §6): one text per tool, shared by the native tools and the Agent
   Tools MCP server (`agent-team-collaboration-llm-contract.ts`, `list-available-agents-contract.ts`,
   `get-handoff-rules-tool-contract.ts`, `project-task-tool-contract.ts`, the delegation parameter
   schemas / parsers).
4. **Messages** (§7.1, §7.2, SR-002): the task message is
   `You have a new task from <name> (ID: <id>).` + Description + Reference files; the mode-3 Task
   message has no "new task from" line; the three header builders emit
   `You received a message from sender name: X, sender id: Y\nmessage:\n…` (no address).
5. **Refusals/results** (§7.3 / T-3 / SR-002): all sites listed in the design, with the shared
   `ROOT_NOT_ACTIVE_MESSAGE` and `ASSIGNER_ONLY_REACTIVATION_MESSAGE` constants (codes unchanged).
6. **`@` note per viewer** (§8): each root passes `mentionViewerRelation(index, focusedAgentRunId)`
   (`self` by identity, `own_team`, else `other`); `CollaboratorAdmission.resolveMentions` decides the
   presence (`not_in_run | in_run | own_team | self | run_agent`); the contracts package composes
   `[Mentioned agents]` lines and parses every earlier form (`[Mentioned collaborators]`); `dist/` rebuilt.
7. **Docs** (REQ-011): `prompt_engineering.md`, `agent_communication.md`, `agent_team_execution.md`,
   `agent_execution.md`, `agent_definition.md`, `codex_integration.md`, `standalone_agent_run_root.md`,
   `design/collaboration_model.md` (one pointer), web `docs/chat.md`.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` Classification section (Medium / Low; SR-001, SR-002)
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: the change is text plus two internal facts (role, viewer relation). No tool
  behavior, exposure, storage, persisted data or migration changed; error codes unchanged; the
  contracts package change is additive (current note form composed, every earlier form still parsed).
  Blast radius is broad in files (127 files in the implementation commit, mostly tests) but each change is a text or a one-field
  addition checked by snapshots; no ownership boundary moved (the role is decided where the scope was
  already decided).
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (see below)
- New design impact or escalation trigger: `None`

Lightweight self-review: reread every changed source file against the design file mapping and
Core Principles; no dead code left in touched files (the three renderers and constants deleted; the
local `ROOT_NOT_ACTIVE` constant in the host builder removed; `carriesTeamInstruction` removed);
no new file above 500 lines; no compatibility wrapper (only the contracts parser keeps reading earlier
forms, as designed for saved history).

## IR-002 (SR-003) Delta

- **F-3a.** Task message is now `You have a new task from the agent named "<name>".` + the exact reply call with
  `target_agent_run_id "<id>"` + "`<name>` is its name, not an address or an ID."; the mode-3 body has the same reply
  line (`buildExistingCopyTaskMessage` now takes `delegatorAgentRunId`, passed from the lifecycle). The answering bullet
  of all four prompts and the §4.2 opening name `target_agent_run_id`. Snapshots regenerated and re-checked equal to the
  updated complete views (20/20).
- **F-3b.** `COLLABORATION_ADDRESS_INVALID` from the address validator carries an `agentMessage` (new optional field of
  `CollaborationContractError`); `send-message-to-dispatcher.ts` and `toTaskDelegationToolErrorPayload` convert at the
  two tool boundaries via `collaborationErrorTextForAgent`; the validator's own `message` is unchanged. Router
  `TARGET_AGENT_RUN_NOT_ACTIVE` and "did not accept the message: <reason>", engine self-target and context refusals, and
  the registry's not-running / stopped texts use the SR-003 T-3 texts.
- **F-1 / T-4.** The first `assertAllowed()` in `RootCommunicationEngine.deliver` returns
  `{accepted:false, code, message}` for `TASK_AGENT_RESOURCE_CLOSED` / `TASK_AGENT_RESOURCE_CONFLICT`; other errors and the
  later re-checks still throw. Condition unchanged.
- Tests: engine refusals (`root-communication-engine-refusals.test.ts`), `send_message_to` invalid-address envelope
  native and MCP, `delegate_task` payload, router texts, the refusal-vocabulary scan extended to the router, engine,
  registry and address validator, first-message tests. The API/E2E engineer's `CPW-R2` (cross-Task refusal through the real
  MCP tool) was skipped as a known gap; I enabled it (`it.skip` → `it`) and it passes with the full file (8/8).
- Docs: `prompt_engineering.md` and `agent_communication.md`.
- Left unchanged on purpose: `AGENT_RUN_NOT_ACCEPTING_INPUT`/teardown-internal texts in the registry, and the other
  `COLLABORATION_ADDRESS_INVALID` texts (parser, recipient resolvers), which are already specific and have a next step or are
  configuration-side.
- Not covered by me: AC-008 (`LE-A1` ≥5 per runtime, J1/J3 ≥4, branch and base) — needs real models; left to API/E2E.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Prompt chosen by role | `member-instance-scope.ts` (`resolveMemberCollaborationScope` → `role`), `member-execution-context.ts` (`collaborationRole`), builders `member-team-context-builder.ts`, `agent-org-execution-scope-builder.ts`, `standalone-root-builder.ts`, `standalone-host-member-context-builder.ts`; `collaboration-prompt-sections.ts` `renderCollaborationSections` | Done. Snapshots for all ten §3 rows on the shared (Codex/Claude) and native paths |
| BEH-002, BEH-010 | Sections are wording §4.1, §4.2, §5.0–§5.2 | `collaboration-prompt-sections.ts` (generated line by line from the proposal blocks) | Done. Snapshot equals `collaboration-prompt-complete-views.md` for 20/20 (10 views × 2 paths) |
| BEH-003 | Handoffs only with rules | `HANDOFFS_SECTION` appended when `outgoingHandoffs.length > 0` | Done; property test |
| BEH-004 | No own address in agent-facing text | sections file; task message; headers | Done; property test over every rendered view |
| BEH-005 | Task message | `task-execution-input.ts` (`buildTaskWorkText`, `buildExistingCopyTaskMessage`), `root-task-execution-lifecycle.ts` | Done (SR-002 mode-3 text) |
| BEH-006 | Header without address | `inter-agent-message-runtime-builders.ts`, `root-communication-runtime-builder.ts`, `global-agent-run-message-runtime-builders.ts` | Done |
| BEH-007 | Tool descriptions §6 | contract files listed above; native and MCP share constants | Done; hash-pinned contract test; forbidden-word test |
| BEH-008 | Refusals/results | T-3 sites (see IR-001); `refusal-texts-vocabulary.test.ts` | Done, plus the additional texts listed under Known Risks |
| BEH-009 | `@` note per viewer | `message-recipient-resolution.ts` (`mentionViewerRelation`), `collaborator-admission.ts`, root collaborators, contracts `collaborator-mention-note.ts` | Done; unit tests per root; saved forms still parse (server contracts + web) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-execution/prompt/collaboration-prompt-sections.ts` (new) and `carpenter-prompt-composer.ts`
- `autobyteus-server-ts/src/agent-collaboration/execution/domain/member-instance-scope.ts`, `member-execution-context.ts`
- `autobyteus-server-ts/src/agent-collaboration/domain/agent-team-collaboration-llm-contract.ts`
- `autobyteus-server-ts/src/agent-collaboration/execution/task/*` (task message, refusals)
- `autobyteus-server-ts/src/agent-collaboration/collaborators/*` (admission, relation, refusal texts)
- `autobyteus-agent-presentation-contracts/src/collaborator-mention-note.ts` (+ tracked `dist/`)
- Deleted: `standalone-collaboration-instruction.ts`, `member-collaboration-instruction-renderer.ts`, `team-collaboration-instruction-renderer.ts`

## Important Assumptions

- Team Instruction is rendered for every role whenever present (SR-002 item 5). A task agent at a
  configured address keeps its team's `team.md` instruction.
- Self-mention by a standalone host stays rejected by the existing eligibility policy (unchanged); the
  `self` presence is reachable for team/org members and task agents.
- `teamScoped` is unchanged and still drives tool exposure (`get_handoff_rules`); it no longer
  chooses the prompt.

## Known Risks

- **Additional agent-reachable texts found.** Per the design ("list any other agent-reachable text
  found"), the following were rewritten in the §2 vocabulary beyond the T-3 table:
  1. `global-agent-run-message-router.ts` `TARGET_IS_TEAM_RUN`: "`<id>` is a task agent team's ID, and
     send_message_to talks with agents. To talk with the team, use its coordinator's ID: `<coord>`."
     (was "is a Team run; … Message its coordinator agent run …").
  2. `root-task-execution-lifecycle.ts` `TASK_EXECUTION_RESTORE_FAILED` and the registry's cause text:
     "The task agent `<id>` could not continue with its conversation: `<reason>`" (was "The delegated
     execution for AgentRun '…' could not be restored: …").
  3. `task-delegation-tool-input-parsers.ts` parameter errors and `task-execution-input.ts` first-message text (in T-3).
  **IR-002: the texts below are now rewritten per the SR-003 T-3 rows.** Texts found in IR-001 and left unchanged then (infrastructure phrasing with no §2 forbidden word; reachable only
  through a refused/failed `send_message_to` or `delegate_task`; listed for the Solution Designer to
  decide whether to follow up): `Exact AgentRun target '<id>' is not active.` and `… rejected the
  message.` (`global-agent-run-message-router.ts`); `Root-hosted AgentRun '<id>' is not active.`,
  `Task AgentRun '<id>' is shut down.` and the teardown messages (`root-agent-execution-registry.ts`);
  `An AgentRun cannot send an ordinary collaboration message to itself.` and `Sender and receiver must
  be exact live executions in the same collaboration root.` (`root-communication-engine.ts`).
- Agents already running keep the prompt they started with (no migration; per the Scope Guardrail).
- Saved messages keep their old header/note text; the contracts parser and the web parser read both.
- Model-output quality of the new prompts (AC-008) is not proven by unit tests; see below.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: text and two internal facts; no structural refactor
- Reviewed root-cause classification: prompt chosen by a proxy flag (`teamScoped`) and text duplicated across three renderers
- Reviewed refactor decision: `Refactor Needed Now` (role + one sections file)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: role is decided in the scope resolver the design named; one owner of the text.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the contracts parser keeps parsing earlier note
  forms because saved history must display — a designed read-only path, not a dual write)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, listed as follow-up: `None new`. Pre-existing unused imports reported by
  `tsc --noUnusedLocals` in files not owned by this ticket (e.g. `PreparedTaskExecution` in the root
  registries, `AgentRun` in `global-agent-run-message-router.ts`) were left alone.
- Shared structures remain tight: `Yes` (`MemberCollaborationScope.role` and `MemberExecutionContext.collaborationRole` are single required fields)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Source file size guardrails: `Yes` (no changed source file over 500 effective lines)
- Notes: identifiers that carry the old words (`buildTaskAssigneeWorkPacket`, `broughtIn`, `copy` in type
  names) are code, not agent-facing text, and are outside the Scope Guardrail.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (prompt text and message text only; saved history parses as before)
- Design-spec decision reference: design-spec.md persisted-data section
- Implementation follows the approved decision without an unapproved migration: `Yes`
- Direct-use evidence: contracts and web tests parse the saved `[Mentioned collaborators]` note and the
  header with `sender address`; `event-monitor-active-trace-page-projection.test.ts` still uses a saved header.
- Deviation: `None`

## Environment Or Dependency Notes

- Implementation commits `290d32dd4b` (IR-001) and the IR-002 commit named in the revision record. Worktree build only; `pnpm run prepare:shared` and `prisma generate` were needed before the server
  typecheck; `pnpm test:integration:prepare` before the integration run; `pnpm exec nuxt prepare` before
  the web unit specs. No use of the user's running app or `~/.autobyteus`; the e2e run used a clean
  environment (`env -i`, temp `HOME`) with the scripted AGY CLI (`RUN_AGY_FAILURE_E2E=1`).

## Local Implementation Checks Run

Implementation-scoped checks only; not API/E2E sign-off.

- `autobyteus-server-ts`: `tsc -p tsconfig.build.json --noEmit` — clean.
- `autobyteus-server-ts`: `vitest run tests/unit` — all pass (5573 passed, 7 skipped, 706 files incl. 4 skipped).
  New/rewritten tests: `collaboration-prompt-sections.test.ts` (snapshots: 10 views × shared and native
  paths, checked equal to `collaboration-prompt-complete-views.md`; property tests for no own address,
  forbidden words, Handoffs only with rules, addressing only for team/org roles, answer-by-ID bullet,
  Team Instruction placement), `agent-team-collaboration-llm-contract.test.ts` (hash-pinned descriptions
  and forbidden words over every tool description), `refusal-texts-vocabulary.test.ts` (forbidden words
  over every text literal of the refusal sites, plus the shared messages), `member-instance-scope.test.ts`,
  `message-recipient-resolution.test.ts` (`mentionViewerRelation`), `collaborator-admission.test.ts`,
  `team-root-delegation-and-messaging.test.ts` (`@` for a teammate and a catalog unit), header and task
  message builder tests, bootstrapper / factory tests on Codex, Claude and AutoByteus.
- `autobyteus-server-ts`: `vitest run tests/integration` — all pass except two
  `agent-status-websocket.integration.test.ts` tests (`coalesces …` and `uses a changed interval …`),
  which fail identically on the untouched base (checked by stashing the change); unrelated timing tests.
- `autobyteus-server-ts` scripted-AGY server e2e files that assert collaboration texts
  (`tests/e2e/projects/*`, `agent-definitions/agent-package-definitions-live-refresh`) were updated to the
  new texts and run in a clean environment with `RUN_AGY_FAILURE_E2E=1`: see the final result in
  "Gated e2e run" below.
- `autobyteus-agent-presentation-contracts`: `pnpm test` — 17 pass; `dist/` rebuilt and committed.
- `autobyteus-web`: unit specs for the note, header and first-message summary (`utils/collaborators`,
  `utils/collaboration`, `services/agentStreaming`, `services/runSubmission`) — 53 pass, including new
  cases for every per-viewer note form and a saved `[Mentioned collaborators]` message; probe sources
  under `tests/e2e/*.mjs` updated to the new texts (not run: they need a live stack).

### Gated e2e run

Clean environment (`env -i`, temp `HOME`), `RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND` = the scripted
`tests/fixtures/agy-failure-cli.mjs`: `tests/e2e/projects` (all files) and
`tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` pass after the expected-text updates
(68 passed, 40 skipped by their own gates in the last full run; the one failure it showed,
`project-task-boundaries` CLS-API-001, was an old `update_task` description assertion and passes after
the update); `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` passes.
Scripted AGY drives real tools but not a real model, so it proves the texts and paths, not model
behavior. Other gated suites (real Codex / Claude / LM Studio) were not run.

### IR-002 local checks

- Server `tsc -p tsconfig.build.json --noEmit` clean; `vitest run tests/unit`: 5583 passed, 7 skipped.
- `vitest run tests/integration`: all pass except the same two pre-existing `agent-status-websocket` timing tests.
- Scripted-AGY e2e (clean env): `collaboration-prompt-wording.e2e.test.ts` 8/8 including `CPW-R2` (enabled); the wider
  `tests/e2e/projects` run: see the revision record for the final result.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable` — no rendered frontend change. The optional REQ-010 badge ("Delegated copy" → "Task
agent" / "Task agent team") was **not done**: the badge key is shared by agent and team rows and
relabeling it correctly touches the run-settings tree model; it is deferred as optional. Web changes are
parse-path comments, docs and tests only.

## Downstream Coverage Hints / Suggested Scenarios

- **AC-008 (live, needs a real model, not run by me):** on an isolated desktop instance of this
  worktree build — a standalone agent delegates and its task agent reports back by ID; a team member
  hands off by its rules; the Project Task Manager delegates to an organization team and the team
  coordinator reports back; inspect the stored prompts and messages for the new vocabulary.
- Rendered-prompt check on the three runtimes (AutoByteus, Codex, Claude) for each §3 row; compare with
  `collaboration-prompt-complete-views.md`.
- `@` note per viewer through the real streams: team member mentioning a teammate ("in your team", no
  `delegate_task`); org agent mentioning the Project Task Manager (talk-or-delegate); task agent in a
  standalone run mentioning the host ("you can't delegate"); self ("that is you").
- Refusals through the real tools: message to an address not in the run; delegation to own team / self;
  closed Task; non-assigner reactivation; run stopping (`ROOT_NOT_ACTIVE_MESSAGE`).
- Web: a stored run with an old `[Mentioned collaborators]` note and an old header with `sender address`
  still renders (chips, "From <Sender>:").

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes — owned by `api_e2e_engineer`: AC-008 live check with a real model on an isolated desktop instance,
the full server e2e / gated runtime suites for the collaboration paths, and web probes that need a live
stack (their expected texts were updated here but not executed).

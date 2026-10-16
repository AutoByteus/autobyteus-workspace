# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the
initial baseline and later implementation deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-004 | Solution Designer → SR-011, SR-012, SR-013, SR-014 (received after IR-003 work, before any IR-003 commit) | SD-C-010 (own team by definition); user direction (run ID term, header without name, `@` lines); SR-014 catalogue M-01..M-45 | `Local wording change` / `Design correction` within the approved direction | SR-011..SR-014 | Implemented; unit, integration and scripted-AGY e2e results in the entry |
| IR-003 | Solution Designer → SR-004, SR-005, SR-006, SR-009, SR-010 (SR-007 reverted by SR-008, never committed) | SD-C-006, SD-C-007; user review (one handle to answer with: the sender id) | `Local wording change` within the approved direction | SR-004, SR-005 (superseded by SR-006), SR-006, SR-008, SR-009, SR-010 (SR-009 addendum superseded by SR-010) | Implemented; unit, integration and scripted-AGY e2e results in the entry |
| IR-002 | Solution Designer → SR-003, from code review `code-review-report.md` CRR-001 (failure-origin round after API-REV-001) | F-3a, F-3b, F-1 (C-3 covered by F-3a) | `Design Impact` (F-3a, F-3b) / `Requirement Gap` (F-1), decided in SR-003 | SR-003; CRR-001; API-REV-001 | Implemented; unit, integration and scripted-AGY e2e pass; AC-008 repeated live samples left to API/E2E |
| IR-001 | Solution Designer handoff `handoff-implementation.md` (initial implementation, round 1) | N/A | `Initial Baseline` | SR-001, SR-002; ARCH-REV `N/A`; CRR `N/A`; API-REV `N/A`; DR `N/A` | Implemented in commit `290d32dd4b`; unit, integration (scoped) and scripted-AGY e2e checks pass; AC-008 live check left to API/E2E |

## Revision Entries

### IR-001 — Collaboration texts written for the agent (role-based prompts, no own address, per-viewer `@` note)

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/handoff-implementation.md`, round 1 (worked from the SR-002 files)
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: implementation commit `290d32dd4b` on `codex/collaboration-prompt-wording`; Medium / Low confirmed
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation of the approved requirements and design.
- Approved behavior or requirement IDs affected: REQ-001..REQ-009, REQ-011 (BEH-001..BEH-010); REQ-010 (optional UI badge) not done.
- Implementation delta:
  - `collaborationRole` on `MemberExecutionContext`, decided by `resolveMemberCollaborationScope` and the host builder.
  - `collaboration-prompt-sections.ts` replaces three renderers; composer renders Team Instruction for every role.
  - Tool/parameter descriptions per wording §6 (shared by native and MCP); hash-pinned.
  - Task message, mode-3 Task message, three header builders (no addresses).
  - T-3 refusals/results, plus `TARGET_IS_TEAM_RUN` and the restore-failure text (listed in the handoff).
  - `@` note per viewer: `mentionViewerRelation`, `resolveMentions(…, relation)`, new presences, contracts compose/parse, `dist/` rebuilt.
  - Docs and web comments/tests; web probe sources updated.
- Changed files or areas: see "Key Files Or Areas" in the handoff; 127 files in the commit (source ≈ 45, tests ≈ 70, docs 9, contracts `dist/` 4).
- Local validation and result: server `tsc` build config clean; unit 5573 passed; integration all pass except two pre-existing `agent-status-websocket` timing tests; contracts 17 pass; web specs 53 pass; scripted-AGY e2e (`tests/e2e/projects`, live-refresh, agent-initiated-collaborators) pass.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (Medium + Low direct route).
- Remaining limitations or risks: AC-008 (real model, isolated desktop instance) not run; optional REQ-010 badge not done; a few infrastructure refusal texts left unchanged and listed in the handoff for a Solution Designer decision; web probes updated but not executed.

### IR-002 — Task message labels the reply call; every refusal reaches the agent (SR-003)

- Triggering role, report path, and round: Solution Designer SR-003 in response to Code Reviewer `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/code-review-report.md` (CRR-001, failure-origin review after API-REV-001)
- Triggering finding IDs: F-3a, F-3b, F-1 (C-3 held, covered by F-3a)
- Classification: `Design Impact` (F-3a, F-3b), `Requirement Gap` decided as DEC-009 (F-1); both accepted upstream in SR-003
- Prior authoritative result: IR-001 (`290d32dd4b`) — API/E2E API-REV-001 Fail (80%)
- Current authoritative result: commit `6a3f6628b1` on `codex/collaboration-prompt-wording`; Medium / Low confirmed
- Related solution revision IDs: SR-003 (builds on SR-001, SR-002)
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this revision is recorded: live runs showed models using the delegator's bare name as an address or ID, and refusals a misled agent received had no next step; the cross-Task refusal reached agents as an MCP internal error.
- Approved behavior or requirement IDs affected: BEH-005, BEH-008; REQ-008; AC-005; DEC-008, DEC-009; wording §4.2, §7.1, §7.3, §10 (7, 7b).
- Implementation delta:
  - `task-execution-input.ts`: new first message; `buildExistingCopyTaskMessage` takes `delegatorAgentRunId`; lifecycle passes it.
  - `collaboration-prompt-sections.ts`: answering bullet (4 prompts) and the §4.2 opening name `target_agent_run_id`; snapshots regenerated (20/20 equal the updated views).
  - `collaboration-contract-error.ts` (`agentMessage`, `collaborationErrorTextForAgent`), `agent-team-address.ts`, `send-message-to-dispatcher.ts`, `task-delegation-tool-serialization.ts`: invalid-address text converted at the two tool boundaries.
  - `global-agent-run-message-router.ts`, `root-agent-execution-registry.ts`, `root-communication-engine.ts`: SR-003 T-3 texts.
  - `root-communication-engine.ts`: T-4, the first delivery-scope check returns Task-scope refusals as results.
  - Tests and docs as listed in the handoff (IR-002 delta); e2e expectations updated (`project-task-context-files-delegation`, `codex-standalone-send-message-global-routing`); `CPW-R2` enabled.
- Changed files or areas: see the commit; ~30 files (source 11, tests 12, docs 2, ticket artifacts, one web probe fixture).
- Local validation and result: server tsc clean; unit 5583 pass; integration all pass except the two pre-existing `agent-status-websocket` timing tests; scripted-AGY e2e: all of `tests/e2e/projects`, live-refresh and agent-initiated-collaborators pass after the expected-text updates (including CPW-R2 through the real MCP path).
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (Medium + Low direct route), for AC-008 as revised (LE-A1 ≥5 per runtime, J1/J3 ≥4, branch vs base, traces kept) and re-run of the failed scenarios.
- Remaining limitations or risks: AC-008 repeated real-model samples not run by me; model behaviour with the new wording is unproven until then; the API/E2E-owned untracked files (`collaboration-prompt-wording.e2e.test.ts`, `collaboration-root-harness.ts`, `api-e2e-*` reports) are left uncommitted for their owner.

### IR-003 — One handle to answer with: the sender id (SR-004, SR-006, SR-009, SR-010; SR-005 superseded, SR-007 reverted by SR-008)

- Triggering role, report path, and round: Solution Designer, `solution-revision-record.md` SR-004, SR-005, SR-006, SR-007, SR-008, SR-009 (+ addendum), SR-010 (all received before this round was committed). SR-005's two-form task message and its "reaches" helper (T-5) were replaced by SR-006 before any code was written for them; SR-007 ("copy" wording) was withdrawn by SR-008 and its partial application in the working tree was reverted before commit.
- Triggering finding IDs: SD-C-006, SD-C-007 (SR-004); user direction (SR-005, SR-006)
- Classification: wording change within the approved direction (no design impact)
- Prior authoritative result: IR-002 (`6a3f6628b1`)
- Current authoritative result: the IR-003 commit named in `implementation-handoff.md`; Medium / Low confirmed
- Related solution revision IDs: SR-004, SR-005, SR-006, SR-007, SR-008; code-review CRR-001; API/E2E API-REV-001/002 as in IR-002
- Why recorded: the task message and answering bullet changed to a single handle.
- Approved behavior or requirement IDs affected: BEH-005, BEH-006, BEH-008; REQ-004..006, REQ-008; AC-002, AC-003, AC-005, AC-008; DEC-012.
- Implementation delta:
  - Task message (`buildTaskWorkText`, SR-010): `You have a new task from the agent with sender id "<id>".` + `When you finish, or need something you can't get yourself, tell that agent using send_message_to with target_agent_run_id set to that sender id.` No name, no address. The mode-3 body (`buildExistingCopyTaskMessage`) has no reply line again; the caller no longer passes the delegator ID.
  - Prompts: the answering bullet of all four prompts is `Every message you receive, including a new task, gives its sender id. To answer it, or to report your task result, use `send_message_to` with `target_agent_run_id` set to that sender id.`; the §4.2 opening is `The task message tells you how to reach that agent; when you finish, or need something you can't get yourself, tell it using `send_message_to`.` Sections regenerated line by line from the proposal blocks; snapshots regenerated and equal to the complete views (20/20).
  - Header: unchanged (`sender name`, `sender id`; no address in any of the three builders).
  - SR-004 per-tool invalid-address refusal: `CollaborationContractError.agentMessages` (per tool) + `collaborationErrorTextForAgent(error, tool)`; `send_message_to` keeps the "answer by ID" text, `delegate_task` points to `list_available_agents`. SR-004's no-name fallback is moot (no name).
  - SR-009/SR-010 refusals: `messageTargetNotFoundMessage`, both-selector and no-selector texts (`send-message-target-selector.ts`) and the `send_message_to` invalid-address text end with `To answer a message or report your task result, use send_message_to with target_agent_run_id set to the sender id.` (not found adds ` To have a task done by a new agent, use delegate_task.`); `TARGET_AGENT_RUN_NOT_ACTIVE` ends `Use an exact ID you were given: a sender id (from a message or your new task), or an ID delegate_task returned to you.` New tests: selector refusals; contracts test for the three `@` examples of views §11.
  - No "reaches" helper built (T-5 withdrawn). Tool texts checked equal to the proposal (§6) by a throwaway comparison test.
  - Docs: `prompt_engineering.md`.
- Changed files or areas: `collaboration-prompt-sections.ts`, `task-execution-input.ts`, `root-task-execution-lifecycle.ts`, `collaboration-contract-error.ts`, `agent-team-address.ts`, `send-message-to-dispatcher.ts`, `task-delegation-tool-serialization.ts`, tests and snapshot, `prompt_engineering.md`, one web probe fixture, ticket artifacts.
- Local validation and result: see "IR-003 local checks" in `implementation-handoff.md`.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (Medium + Low direct route), AC-008 as revised (Claude and Codex decide; LM Studio informational; ≥5 LE-A1 each, J1/J3 ≥4; branch vs base; replies to the delegating agent use `target_agent_run_id`).
- Remaining limitations or risks: no real-model samples run by me; the `agent-initiated-collaborators.e2e.test.ts` edit in the working tree is not mine and is left uncommitted.

### IR-004 — "run ID" everywhere, header without a name, own team first, `@` lines, result catalogue (SR-011..SR-014)

- Triggering role, report path, and round: Solution Designer `solution-revision-record.md` SR-011, SR-012, SR-013, SR-014 (all arrived while IR-003 was uncommitted; IR-003 and IR-004 are committed together).
- Triggering finding IDs: SD-C-010 (SR-011); user direction (SR-012, SR-013); SR-014 catalogue
- Classification: `Design correction` (SR-011) and wording changes within the approved direction (SR-012..SR-014)
- Prior authoritative result: IR-003 work (SR-010 wording: "sender id")
- Current authoritative result: the IR-004 commit named in `implementation-handoff.md`; Medium / Low confirmed
- Related solution revision IDs: SR-011, SR-012, SR-013, SR-014 (SR-010 superseded by SR-013)
- Why recorded: the agent-facing ID term became "run ID" and the header carries no name; the `@` note must be right for task agent team members; every result text is catalogued once.
- Approved behavior or requirement IDs affected: BEH-005, BEH-006, BEH-008, BEH-009; REQ-005..REQ-009; AC-002, AC-003, AC-005, AC-006, AC-007; DEC-014.
- Implementation delta:
  - SR-013 texts: prompts (answering bullet, §4.2 opening, "run ID" throughout), tool and parameter descriptions (regenerated from the wording file; checked equal), task message `You have a new task from the agent with sender run ID "<id>".` + reply line, header `You received a message from the agent with sender run ID "<id>".` + `message:` in all three builders, refusal texts ("run ID"), `@` lines ("returns a run ID").
  - Web: `interAgentDelivery.ts` only separates header and body and reads the sender run ID (new form and every earlier form); `InterAgentMessageSegment.vue` labels from the run-ID lookup, else a readable form of the run ID (hex tail dropped); `senderName` / `senderAddress` removed from the inter-agent segment and its three builders; the label never reads the header text.
  - SR-011: `mentionViewerOf` (relation + own team instance by definition), `MessageRecipientIndexPort.instanceDefinitionsOf` / `agentAddressOf` in the three roots, `ownTeamMention` in `collaborator-admission.ts` (self / member / the team itself before the configured and catalog paths).
  - SR-012: contracts compose the new catalog-only and organization lines; parse still reads every earlier form (including the two intermediate composed lines); `dist/` rebuilt.
  - SR-014: catalogue changes M-10, M-24, M-31, M-42, M-45 in `task-execution-resources.ts`, `project-task-service.ts`, `task-delegation-tool-input-parsers.ts`; `reactivat…` is forbidden, so the deleted-Task text became "The Task was deleted, so its task agent cannot continue." (not in the catalogue; flagged); new `result-catalogue.test.ts` (every catalogue text's fixed parts must be in the source; forbidden-word check over all 45).
- Changed files or areas: see the commit; server source ≈ 35 files, tests ≈ 40, web 8 + specs, contracts `src` + `dist`, docs 4, ticket artifacts.
- Local validation and result: see "IR-004 local checks" in `implementation-handoff.md`.
- Next recipient or routing: `/software_engineering_team/api_e2e_engineer` (Medium + Low direct route).
- Remaining limitations or risks: no real-model samples run by me (AC-008); views §10a result shapes, journeys J6–J10 and §12 are covered through the catalogue test and existing journey tests, not each replayed; the `zz-keep-agent-initiated-collaborators.e2e.test.ts` and `agent-initiated-collaborators.e2e.test.ts` edits in the working tree are not mine (their fixture prompts still say "sender id").

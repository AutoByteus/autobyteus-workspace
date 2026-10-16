# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates the
initial baseline and later implementation deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
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

# Implementation Revision Record — run-settings-ui-unification

The current code on `codex/run-settings-ui-unification` and `implementation-handoff.md` remain
authoritative. This record holds only the initial baseline and later implementation deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-002 Pass | N/A | `Initial Baseline` | SR-006, SR-008, ARCH-REV-002 | Implementation complete; local checks pass with no new failures; sent to code review |
| IR-002 | Code Reviewer CRR-001/CRR-002 + Architecture Reviewer ARCH-REV-003 (SR-009) | CR-001, CR-002, CR-003 | `Design Impact` (CR-001, resolved by SR-009) / `Local Fix` (CR-002, CR-003) | SR-009, ARCH-REV-003, CRR-002 | Fixed; local checks pass with no new failures; back to code review for a delta review |

## Revision Entries

### IR-001 — Initial implementation of the run-settings UI unification

- Triggering role, report path, and round: Architecture Reviewer
  (`/software_engineering_team/architecture_reviewer`), `design-review-report.md`, ARCH-REV-002 (Pass).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: the implementation described in `implementation-handoff.md`
  (classification `Large` / `High`, confirmed).
- Related solution revision IDs: SR-006 (requirements), SR-008 (design).
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: the first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001..BEH-009 (REQ-001..REQ-022, AC-001..AC-019).
- Implementation delta:
  - One start intent, `useRunStart`. It covers Run, "+", the heading switcher and the tree "+".
  - Two draft owners: `chatDraftStore` (Agent/Team, now with Team member overrides) and the new
    `agentOrgLaunchDraftStore` + `agentOrgLaunchService` (Org).
  - New `components/run-settings/*` built on the chat controls:
    - the settings card, member rows/section and the member settings drawer;
    - the members line, the target switcher and the subject header;
    - the Org launch page and the saved-run settings view.
  - Mention-only `@`. Draft candidates come from `draftMentionEligibility`, which mirrors the
    server's CollaboratorCandidatePolicy.
  - First-send mentions are kept for Agent and Team.
  - Other model settings (Codex Fast mode `service_tier`) are a chip or row, separate from thinking.
  - Start-surface tools toggle.
  - The old launch forms, panels, projections, types, dead copy and their specs are removed.
  - The e2e probes that used the removed forms or the `@` target picker are migrated.
- Changed files or areas: `autobyteus-web` only. See `implementation-handoff.md` → Key Files.
- Local validation and result:
  - Full web suite: no new failing files against the recorded baseline.
  - Targeted specs pass; vue-tsc shows no production errors in touched files.
  - The localization audit and both boundary guards pass.
  - Mobile specs: only the baseline-failing `MobileUxRefinement` remains failing.
  - Mocked-boundary probes pass: `fresh-run-auto-approval` (8/8) and `existing-run-model-config` (6/6).
  - Real-server visual checks are recorded in `evidence/implementation/`.
- Next recipient or routing: Code Reviewer (Large/High route).
- Remaining limitations or risks: see `implementation-handoff.md` → Known Risks. In particular,
  first-message mention admission for an Agent first send and a Team first send still needs API/E2E
  with real runtimes.

### IR-002 — Agent "+" copies the agent on screen; Org store decoupled from chat store; blocked topology logged once

- Triggering role, report path, and round:
  - Code Reviewer, `code-review-report.md` / `code-review-revision-record.md`, CRR-001, corrected by CRR-002.
  - Architecture Reviewer, `design-review-report.md`, ARCH-REV-003 (SR-009 design for CR-001).
- Triggering finding IDs: CR-001, CR-002, CR-003. Also the non-blocking size-note correction.
- Classification: CR-001 `Design Impact`, resolved upstream by SR-009. CR-002 and CR-003 `Local Fix`.
- Prior authoritative result: IR-001, commit `d45fe62bc`.
- Current authoritative result: IR-001 plus this delta. Commits `396591a37` (CR-002/CR-003) and the IR-002 commit on top.
- Related solution revision IDs: SR-009.
- Related architecture-review revision IDs: ARCH-REV-003.
- Related code-review revision IDs: CRR-001, CRR-002.
- Related API/E2E and delivery revision IDs: N/A.
- Why recorded: rework after code review.
- Approved behavior or requirement IDs affected: BEH-007 (REQ-013), plus the design §Dependency Rules.
- Implementation delta:
  - **CR-001:**
    - `useRunStart.copyAgentRun(runId)`, which looked the run up in `agentContextsStore`, is replaced by `copyAgentFromConfig(config: AgentRunConfig)`. It builds the copy synchronously from the config, with no lookup by run id; it returns only the navigation promise.
    - `AgentWorkspaceView` passes `target.context.config`: the host agent, a task child (`agent_run_task_agent`) or a task team's member (`agent_run_task_team_member`).
    - New chat opens for `config.agentDefinitionId` with the workspace from its root path (temp when there is none), runtime, model, `llmConfig` and approval.
    - The view still reaches neither `chatDraftStore` nor the router.
  - **CR-002:**
    - `RunStartSettings` (on `RunSettingsValues`, plus the optional Team overrides) is in `types/runSettings/RunSettings.ts`; it replaces `ChatStartSettings`.
    - `explicitChatModelConfig` moved to `utils/runSettings/explicitModelConfig.ts`.
    - `chatDraftStore`, `agentOrgLaunchDraftStore` and `useRunStart` import them from there. `agentOrgLaunchDraftStore` has no chat-store import.
  - **CR-003:**
    - A blocked Org topology is logged once when detected, by a watch on the member tree's diagnostic.
    - The unreachable `blocked` branch in `launch` is removed, and the `readiness` comment is corrected.
  - **Handoff:** the file-size note is corrected.
- Changed files or areas (`autobyteus-web/`):
  - `composables/runSettings/useRunStart.ts`, `components/workspace/agent/AgentWorkspaceView.vue`
  - `stores/chatDraftStore.ts`, `stores/agentOrgLaunchDraftStore.ts`
  - `types/runSettings/RunSettings.ts`, `utils/runSettings/explicitModelConfig.ts` (new)
  - specs `useRunStart.spec.ts`, `AgentWorkspaceView.spec.ts`, `agentOrgLaunchDraftStore.spec.ts`
- Local validation and result:
  - Specs:
    - The new `useRunStart` cases cover a host copy and a collaborator-child copy (no workspace → temp).
    - `AgentWorkspaceView` covers the host, task-child and task-team-member "+".
    - `agentOrgLaunchDraftStore` covers a blocked topology: unavailable reason, one warning, no launch.
  - Full web suite: 11 failing files, all baseline; no new failures. 3,608 tests pass.
  - vue-tsc: no errors in touched production files (output unchanged).
  - The localization audit and both boundary guards pass. A direct catalog import in the new spec was replaced, so the guard passes again.
  - Mobile specs: only the baseline-failing `MobileUxRefinement` still fails.
- Next recipient or routing: Code Reviewer (targeted delta review), then API/E2E.
- Remaining limitations or risks:
  - Unchanged from IR-001. The first-message mention API/E2E proof (AF-009) is still mandatory.
  - The built-in id constant mirrors the server registry by hand.

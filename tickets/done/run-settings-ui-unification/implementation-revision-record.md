# Implementation Revision Record — run-settings-ui-unification

The current code on `codex/run-settings-ui-unification` and `implementation-handoff.md` remain
authoritative. This record holds only the initial baseline and later implementation deltas.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-002 Pass | N/A | `Initial Baseline` | SR-006, SR-008, ARCH-REV-002 | Implementation complete; local checks pass with no new failures; sent to code review |
| IR-002 | Code Reviewer CRR-001/CRR-002 + Architecture Reviewer ARCH-REV-003 (SR-009) | CR-001, CR-002, CR-003 | `Design Impact` (CR-001, resolved by SR-009) / `Local Fix` (CR-002, CR-003) | SR-009, ARCH-REV-003, CRR-002 | Fixed; local checks pass with no new failures; back to code review for a delta review |
| IR-003 | Code Reviewer CRR-004 + Architecture Reviewer ARCH-REV-004 (SR-010) | DI-001, DI-002, DI-004, DI-006(b), DI-006(e) | `Design Impact` (decided upstream by SR-010) | SR-010, ARCH-REV-004, CRR-004 | Implemented; local checks by slice S1–S6 pass with no new failures; back to code review, then API/E2E |
| IR-004 | Code Reviewer CRR-006 (failure-origin review of API-REV-001) | CR-004 | `Local Fix` | CRR-006, API-REV-001 | Fixed; specs prove availability and catalogs load on copied/carried starts; back to code review, then API/E2E rerun |
| IR-005 | Code Reviewer CRR-008 (failure-origin review of API-REV-002, F-3) | CR-005 | `Local Fix` | CRR-008, API-REV-002 | Fixed; New chat footer and card rows measured clean at 804/880/390/1512; back to code review, then API/E2E rerun |

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

### IR-003 — SR-010: one New chat intent, built-in id contract pin, one readiness rule, start orders and model options in utils

- Triggering role, report path, and round:
  - Code Reviewer, `code-review-report.md` / `code-review-revision-record.md`, CRR-004 (DI-001..DI-006).
  - Architecture Reviewer, `design-review-report.md`, ARCH-REV-004 (SR-010 decisions; design-spec §"SR-010 Addendum").
- Triggering finding IDs: DI-001, DI-002, DI-004, DI-006(b), DI-006(e).
  - Not implemented by decision: DI-003 resolved; DI-006(a) and (d) accepted; FU-001..FU-004 deferred.
- Classification: `Design Impact`, decided upstream by SR-010. Requirements SR-006 unchanged; Large/High unchanged.
- Prior authoritative result: IR-002, head `c37b81de5`.
- Current authoritative result: IR-002 plus this delta (the IR-003 commit on top of `c37b81de5`).
- Related solution revision IDs: SR-010.
- Related architecture-review revision IDs: ARCH-REV-004.
- Related code-review revision IDs: CRR-004.
- Related API/E2E revision IDs: the API/E2E round in progress resumes on the new head. Delivery: N/A.
- Why recorded: rework decided by SR-010 after code review CRR-004.
- Approved behavior or requirement IDs affected: BEH-001/002 (REQ-005, 021; AC-001, 002), BEH-003 (AC-002), BEH-006 (AC-007, contract pin), BEH-009 (structure only).
- Implementation delta:
  - **DI-001:**
    - `useRunStart.newChat()` starts a fresh plain New chat (`chatDraftStore.startNewChat()`), then routes to `/chat`.
    - `AppLeftPanel` uses it for both the Chat nav click and the pencil, and keeps `beginSelectionIntent()`. It no longer reaches `chatDraftStore` or pushes `/chat` itself.
  - **DI-002:** `utils/agents/__tests__/builtInAgentDefinitionIds.contract.spec.ts` reads `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts`. It asserts that the exported `*_AGENT_DEFINITION_ID` values, the ids listed in `BUILT_IN_AGENT_DEFINITIONS`, and the web mirror all match.
  - **DI-004:** a pure rule, `utils/runSettings/launchReadiness.ts` → `resolveScopesReadiness(input, copy)`.
    - It checks the effective scopes: root plus every member, nested included.
    - Blocking order: target unavailable or Org topology blocked → a scope's runtime disabled → a scope without a model.
    - The caller supplies runtime availability and localized copy, so the rule stays pure.
    - `resolveChatLaunchReadiness`: a Team builds `buildTeamMemberTree(team, root, draft.teamAgentOverrides)`; an Agent uses one scope.
    - `agentOrgLaunchDraftStore.readiness` uses the same rule. `OrgLaunchReadiness` is an alias of `LaunchReadiness`.
    - The copy and AC-002 order are unchanged.
  - **DI-006(b):**
    - `definitionStartOrder` and `chatNavStartOrder` (candidate lists) are in `utils/runSettings/startModelDefaults.ts`.
    - `chatDraftStore` keeps only the staleness/generation handling and applies the result.
    - The Org page uses `definitionStartOrder` too: the same REQ-021 order as before.
  - **DI-006(e):**
    - `components/chat/chatModelOptions.ts` moved to `utils/runSettings/modelOptions.ts` (`git mv`, spec moved with it); components import it from utils.
    - Its one component dependency, the pure `humanizeThinkingValue`, moved to `utils/llmThinkingConfigAdapter.ts`, and `chatThinkingMenu.ts` imports it from there.
    - Nothing in `utils/runSettings/` imports `components/`.
- Changed files or areas (`autobyteus-web/`):
  - Production:
    - `composables/runSettings/useRunStart.ts`, `components/AppLeftPanel.vue`
    - `services/chat/chatLaunchService.ts`, `stores/agentOrgLaunchDraftStore.ts`, `stores/chatDraftStore.ts`
    - `utils/runSettings/{launchReadiness (new),startModelDefaults,modelOptions (moved),memberOverrides,runMemberTree}.ts`
    - `utils/llmThinkingConfigAdapter.ts`, `components/chat/chatThinkingMenu.ts`
    - import-path updates in `ChatModelOptionControl.vue`, `ChatNewSurface.vue`, `RunSettingsCard.vue`, `RunMemberRow.vue`, `useRunSettingsPresentation.ts`
  - Specs:
    - new: `launchReadiness.spec.ts`, `builtInAgentDefinitionIds.contract.spec.ts`, `OrgLaunchPage.spec.ts`
    - updated: `useRunStart.spec.ts`, `AppLeftPanel_v2.spec.ts`, `chatLaunchService.spec.ts`, `startModelDefaults.spec.ts`, `modelOptions.spec.ts` (moved)
- Local validation and result (by slice; see the handoff's Local Implementation Checks):
  - Full web suite: 11 failing files, all baseline (AF-020); no new failures; 3,619 tests pass.
  - vue-tsc: no errors in touched files; output unchanged at 552 lines.
  - Localization audit and both guards exit 0.
  - Mobile specs: only the baseline `MobileUxRefinement` fails.
  - Probes: `fresh-run-auto-approval` 8/8 and `existing-run-model-config` 6/6.
- Next recipient or routing: Code Reviewer (targeted review of IR-003), then API/E2E resumes on the new head.
- Remaining limitations or risks:
  - FU-001..FU-004 are deferred.
  - The built-in id mirror is still by hand, but drift now fails a unit test, and live N03 is required in S4.
  - The `tests/e2e/cross-scope-agent-mentions-live-probe.mjs` working-tree change (N02/N03) belongs to API/E2E and is not part of this commit.

### IR-004 — Copied and carried starts load their runtimes' availability and catalogs (CR-004)

- Triggering role, report path, and round:
  - Code Reviewer, `code-review-report.md` §API/E2E Failure-Origin Review, CRR-006.
  - It was triggered by API/E2E round 1 (API-REV-001) failures R04, R05 and R10 at `81f9ff178`.
- Triggering finding IDs: CR-004 (Medium). Also the CRR-005 non-blocking note on the contract pin's path.
- Classification: `Local Fix`. No design or requirement change; Large/High unchanged.
- Prior authoritative result: IR-003, head `81f9ff178`.
- Current authoritative result: IR-003 plus this delta (the IR-004 commit).
- Related code-review revision IDs: CRR-006 (and CRR-005 for the note).
- Related API/E2E revision IDs: API-REV-001. Solution, architecture and delivery: N/A.
- Why recorded: an implementation defect found by API/E2E.
  - A copied or carried start returned before the only start-time availability/catalog load.
  - So model labels, Thinking/Fast chips and the readiness rule had no data after a fresh load.
- Approved behavior or requirement IDs affected: BEH-002, BEH-003, BEH-007 (REQ-013, REQ-019, AC-002, AC-008, AC-019).
- Implementation delta:
  - `utils/runSettings/startModelDefaults.ts`: new `loadStartRuntimes(runtimeKinds, catalog)`.
    - It loads availability first, then the catalog of each distinct enabled runtime.
    - It never changes values; a disabled runtime is left to the readiness rule.
  - `stores/chatDraftStore.ts`: `startForDefinition` with copied or carried settings now runs `loadCarriedStart` in the background.
    - It loads the root's and each Team member override's runtimes, plus the target's definitions.
    - It refreshes the agent identity under the same generation guard as the default path.
    - `definitionDefaultLaunchConfig` now reuses a small `ensureTargetDefinitions`.
  - `stores/agentOrgLaunchDraftStore.ts`: `prepare` awaits `loadCarriedRuntimes` (root, team overrides and agent overrides) for copied and carried settings before the page becomes ready.
    - The default path still runs `applyDefaultModel`.
  - `utils/agents/__tests__/builtInAgentDefinitionIds.contract.spec.ts`: the server registry path is now relative to the spec file (CRR-005 note).
- Changed files or areas (`autobyteus-web/`):
  - production: `utils/runSettings/startModelDefaults.ts`, `stores/chatDraftStore.ts`, `stores/agentOrgLaunchDraftStore.ts`
  - specs:
    - new `services/chat/__tests__/chatCopiedStartReadiness.spec.ts`
    - updated `stores/__tests__/chatDraftStore.spec.ts`, `stores/__tests__/agentOrgLaunchDraftStore.spec.ts`, `utils/runSettings/__tests__/startModelDefaults.spec.ts`, the contract pin
  - evidence: `evidence/implementation/25-cr004-org-plus-fresh-load-804.png`
- Local validation and result:
  - The new cases pass and fail with the fix removed (6 store/integration cases checked).
  - Full suite: 11 baseline failing files, no new failures, 3,629 tests pass.
  - vue-tsc output unchanged; audit and guards exit 0; mobile specs unchanged.
  - Rendered: an Org "+" after a fresh load resolves the copied model, Thinking and the member override.
- Next recipient or routing: Code Reviewer (targeted delta), then the API/E2E rerun (full `run-settings-live`, web suite, N01–N03, the repaired probes).
- Remaining limitations or risks:
  - New chat loads in the background. In the brief window before availability arrives, Send is enabled and the launch re-checks readiness with what is known.
  - The R04/R05 rendering after a fresh load from a live Agent/Team run is to be confirmed by the API/E2E rerun.
  - F-2 (the A01 collaborator placeholder) is outside this ticket, per CRR-006.

### IR-005 — The model trigger stays bounded by its wrapper at every width (CR-005)

- Triggering role, report path, and round:
  - Code Reviewer, `code-review-report.md` §API/E2E Failure-Origin Review (CRR-008).
  - It was triggered by API/E2E round 2 (API-REV-002) F-3: R12/R04 footer overlap at 804 and 880 px.
- Triggering finding IDs: CR-005 (Medium).
- Classification: `Local Fix`. No design or requirement change; Large/High unchanged.
- Prior authoritative result: IR-004, head `83ab477e4`.
- Current authoritative result: IR-004 plus this delta (the IR-005 commit).
- Related code-review revision IDs: CRR-008. Related API/E2E revision IDs: API-REV-002.
- Why recorded: a rendered defect introduced by the IR-001 fix for the 390 px footer overflow.
  - At ≥ sm, `sm:max-w-[20rem]` replaced the trigger's `max-w-full`.
  - The flex row shrank the `min-w-0` wrapper below 20rem, and the trigger overflowed onto Thinking and Fast.
- Approved behavior or requirement IDs affected: BEH-005, BEH-009 (AC-014, AC-019; VIS-020/021/042).
- Implementation delta:
  - `components/chat/ChatModelMenu.vue`: the wrapper is `relative min-w-0 max-w-[20rem]`, and the trigger is `max-w-full` at every breakpoint.
  - `components/chat/ChatNewSurface.vue`: Thinking and the other-setting chips are `flex-shrink-0`.
- Changed files or areas (`autobyteus-web/`): `components/chat/ChatModelMenu.vue`, `components/chat/ChatNewSurface.vue`.
  - Evidence: `evidence/implementation/26..29-cr005-*.png`.
- Local validation and result:
  - Rendered on the dev stack with the real Codex catalog: long name with Thinking and Fast at 804/880/390/1512, plus Thinking-only and model-only at 804/880. No overlaps, nothing outside the composer, and the label truncates.
  - Card uses (member-drawer row at 880, Org card at 804) stay inside their rows.
  - Full suite: 11 baseline failures only, 3,629 tests pass.
  - Audit exits 0; mobile specs unchanged.
- Next recipient or routing: Code Reviewer (targeted delta), then the API/E2E rerun (R12/R04 first, the web suite, N01–N03).
- Remaining limitations or risks:
  - The saved-run card shares the measured card rule but was not rendered with a long model name (the dev data's saved run uses a short one).
  - C05 (Codex client cleanup on the server) is outside this ticket, per CRR-008.

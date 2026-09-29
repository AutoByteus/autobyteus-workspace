# Implementation Revision Record

The current code on `codex/chat-interface-entry` and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | architecture_reviewer / `architecture-review-handoff.md` / ARCH-REV-003 pass | N/A | `Initial Baseline` | SR-003, SR-004 (R2 UI supplement), SR-007; ARCH-REV-003; CRR N/A; API-REV N/A; DR N/A | Implemented per design D-01..D-13; ready for code review |
| IR-002 | architecture_reviewer / `architecture-review-handoff.md` / ARCH-REV-005 pass (after API-REV-001 and CRR-002) | CR-002 (F-01), CR-003 (F-02), CR-004 (F-03), AR-008, IC-1, IC-2 | `Local Fix` (CR-002) + design execution (D-15) + `Design Impact` (D-14) | SR-008, SR-009; ARCH-REV-004, ARCH-REV-005; CRR-001, CRR-002; API-REV-001; DR N/A | CR-002 and D-15 complete and validated; D-14 guard implemented but shown insufficient → Design Impact to solution designer |
| IR-003 | architecture_reviewer / `architecture-review-handoff.md` / ARCH-REV-006 pass (SR-010) | CR-003 (F-02), IR-002 D-14 Design Impact, R-2 (optional) | Design execution (revised D-14) | SR-010; ARCH-REV-006; CRR-002; API-REV-001; DR N/A | D-14 activation-pending marker implemented; stale first-send and Offline-resume reproductions fail without it and pass with it; resend ×14 with 0 losses; R-2 included |
| IR-004 | architecture_reviewer / `architecture-review-handoff.md` / ARCH-REV-008 pass (SR-012; user verification UVF-001, DR-002) | UVF-001 | Design execution (D-16; delta Small/Low, package Large/High) | SR-011, SR-012; ARCH-REV-008; CRR-003; API-REV N/A; DR-002 | Chat model labels follow the shared policy; V-L1 to V-L5 pass |
| IR-005 | architecture_reviewer / `architecture-review-handoff.md` / ARCH-REV-010 pass (SR-013/SR-014; UVF-002) | UVF-002 (R3), AR-010, AR-011 | Design execution (D-17; delta Medium web-only, package Large/High) | SR-013, SR-014; ARCH-REV-010; CRR-005; API-REV N/A; DR N/A | Chat run view is the product agent run view in the workspace frame; draft ⚙ editor; `/` in the product box; shared panel state and contextual-tab rule; removals; live checks A–K pass |
| IR-006 | code_reviewer / `code-review-report.md` / CRR-008 Fail (round 5) | CR-005, CR-006 | `Local Fix` | SR-014; ARCH-REV-010; CRR-008; API-REV N/A; DR N/A | Run settings scoped to their run in Chat; Team quick path opens on its conversation; agentInput free of `composables/chat` imports (neutral popover and skill-tag helpers) |

## Revision Entries

### IR-001 — Chat entry, skillScope and built-in Daily Assistant (initial implementation)

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-handoff.md`, ARCH-REV-003 (pass).
- Triggering finding IDs: N/A
- Classification: Initial Baseline
- Prior authoritative result: N/A
- Current authoritative result: Implementation complete on branch `codex/chat-interface-entry` (base `origin/personal@fcd3e83a4`), commits `770b14651`, `b7336203a`, `3655bd20a`, `49b0ef457`, `360de94a9`, `797d49d6a`. Classification Large / High confirmed.
- Related solution revision IDs: SR-003, SR-004, SR-007
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation handoff baseline.
- Approved behavior or requirement IDs affected: BEH-001, 003, 004, 005, 007, 008, 009, 010, 011, 012, 013, 014; REQ-007 (system); REQ-017; REQ-001..020 through the R2 UI supplement.
- Implementation delta (by design change sequence):
  1. Server `skillScope` + `SkillService.listInstalledSkillRecords()` / ALL_INSTALLED record bindings / `hasEffectiveSkills` (D-10, D-11).
  2. Server built-in Daily Assistant with `seedIfMissing` sync policy (D-09).
  3. Web `skillScope` contract and agent editor/card/detail (D-10).
  4. Behavior-preserving refactor: `ComposerTarget`, voice-input request by target, extracted `VoiceInputButton`/`VoiceInputStatusRow`/`MessagePrimaryActionButton`, `AgentEventMonitor #composer` slot, scoped `useRightPanel`, `WorkspaceToolShell` (D-01, D-02, D-03). Landed with team/org/agent tests passing before any Chat code (RSK-004).
  5. Skill-request instruction codec, `requestedSkillNames`, message chips (D-06, D-07).
  6. Chat draft store, `registerDraftRun`, `chatLaunchService` (agent + team quick path), chat routing (`buildAgentRunChatRoute`, `resolveSelectionRoute`), `useChatRouteRunSync` (D-04, D-05, D-12, D-13).
  7. Chat components (New chat surface, composer, menus, run header/view, run model controls by id — D-08), `pages/chat.vue`, `/` redirect, `/workspace` selection-change redirect, left-panel Chat item and pencil, tree `+`.
  8. Removal of `AgentWorkspaceView`, `runHistoryDraftActions`, `runHistoryStore.createDraftRun`, the standalone branch of `WorkspaceAdaptiveLayout`, and their i18n keys and tests.
  9. Chat/shell localization (en, zh-CN), audit scope M-016, docs (web `chat.md`, layout, execution, agent management, skills; server `agent_definition.md`, `skills.md`).
- Changed files or areas: see `implementation-handoff.md` → Key Files Or Areas.
- Local validation and result: server unit tests for skills/agent-definition/built-in-agents/backends pass except the baseline `codex-tool-log-correlation`; the agent-definitions GraphQL e2e passes; `pnpm build:full` (typecheck + built-in smoke) passes. `pnpm test:nuxt run` shows only the 4 baseline failing files (3320 passed) and `pnpm test:electron run` passes (177); web vue-tsc shows no new errors versus the base commit (per-file/message comparison); boundary/localization/literal guards pass. Rendered self-validation at 1440×900 and 390×844 (details in handoff).
- Next recipient or routing: per `get_handoff_rules` (code review for Large/High).
- Remaining limitations or risks: see handoff Known Risks (AGY ALL_INSTALLED name collisions with workspace skills; AGY/Claude and voice not exercised live; base branch advanced by 6 unrelated AGY commits — trial merge clean).

### IR-002 — CR-002 footer thinking, D-15 skill request strength, D-14 guard (Design Impact)

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-handoff.md`, ARCH-REV-005 (pass). The round follows API/E2E API-REV-001 (`api-e2e-execution-coverage-report.md`) and code review CRR-002 (`code-review-report.md`).
- Triggering finding IDs: CR-002 / F-01; CR-003 / F-02; CR-004 / F-03; AR-008; IC-1; IC-2. CR-001 (a stale mock) was fixed by API/E2E in their uncommitted test change.
- Classification:
  - CR-002: `Local Fix`.
  - D-15: design execution.
  - D-14: implemented as designed. The required evidence then disproved its premise, so it is classified `Design Impact`.
- Prior authoritative result: IR-001 (commits through `717603e61`). API-REV-001 failed on F-01, F-02 and F-03.
- Current authoritative result: commit `da1033860`.
  - CR-002 and D-15 are complete, and validated live on Claude, Codex, Grok (ACP) and AGY.
  - The D-14 guard is in place but does not close the reproduced race. The design needs revision; see the D-14 evidence.
- Related solution revision IDs: SR-008, SR-009
- Related architecture-review revision IDs: ARCH-REV-004, ARCH-REV-005
- Related code-review revision IDs: CRR-001, CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: this is the implementation round for the SR-009 package.
- Approved behavior or requirement IDs affected:
  - BEH-010 (REQ-011, AC-009; UXJ-007/VIS-015) for CR-002;
  - BEH-005 and REQ-017 (D-15 Direction B), plus REQ-007 (system) and AC-002, for D-15;
  - BEH-005 and REQ-003 (D-04/D-13) for D-14.
- Implementation delta:
  - **CR-002** (`autobyteus-web/components/chat/chatRunModelControls.ts`).
    - In persisted mode, the footer requests the run's runtime catalog when it is `idle`. That catalog is the thinking-schema source for a live run, whose canonical config is not loaded.
    - A failed load is not retried. DEC-009 is unchanged: a model without thinking parameters still hides the control.
  - **D-14** (`autobyteus-web/stores/runHistoryLoadActions.ts`). `reconcileDiscoveredActiveRuns` skips contexts with `submissionPending === true`, exactly as designed; no other guard was added.
  - **D-15 strength**.
    - New `backends/shared/skill-request-strength.ts` (`SkillRequestStrength`, `skillRequestStrengthForScope`, `isWeakSkillRequest`).
    - New `SkillService.resolveSkillScope(definition)`, which the service's own scope checks now use as well.
    - The Codex, Claude and ACP/Grok bootstrappers and the AGY factory pass `requestStrength` / `skillRequestStrength`. The materializers never read `skillScope`.
  - **D-15 shared materializer** (`workspace-skill-materializer.ts`).
    - Registry entries hold a `holders` map of `{runId, strength}`; `strongHolderCount`/`weakHolderCount` are derived from it.
    - Each acquisition gets its own descriptor, carrying `holderId` and `requestStrength`.
    - The acquisition outcome carries `workspace-owned` for Rule 1, so joiners apply their own strength.
    - Rule 2 Direction A: `skipped-held-by-other-run`.
    - Rule 2 Direction B: `yieldToConfigured`. The entry stays `acquiring` for the whole switch, holders are merged, `yielded-to-configured` is logged, and on failure the previous source is restored.
    - Release is keyed by holder (IC-1).
  - **Link operations** moved to the new `workspace-skill-links.ts`.
    - `replaceOwnedLink` implements IC-2: a temporary link renamed over the old one, falling back to unlink + link on EPERM/EEXIST/EACCES/ENOTEMPTY/EISDIR.
    - `removeLinkToSource` checks against the entry's current source.
  - **AGY Rule 1** (`agy-configured-skill-materializer.ts`): a weak request skips an existing `<workspace>/.agents/skills/<name>` and logs `disposition=skipped-workspace-owned`. A strong request still throws `AGY_SKILL_NAME_COLLISION`.
  - **Docs:** server `docs/modules/skills.md`, new section "Request strength".
- Changed files or areas: listed in the commit `da1033860` stat. Tests:
  - New `workspace-skill-materializer-request-strength.test.ts` (18 tests) and `runHistoryReconcilePendingSubmission.spec.ts`.
  - Updated: the materializer, AGY capsule/factory, ACP factory, Claude/Codex bootstrapper, skill-service scope and chatRunModelControls specs.
  - SkillService mocks gained `resolveSkillScope`.
- Local validation and result:
  - Server:
    - `tsc -p tsconfig.build.json` is clean, and `pnpm build:full` passes, including the built-in smoke.
    - Unit tests for agent-execution, skills, agent-definition and built-in-agents: 1038 passed. The only failures are the baseline `agent-run-provisioning` and `codex-tool-log-correlation`.
    - Touched integration tests pass, except `brief-package-team-prompt`, which needs a built application package and fails identically without these changes.
  - Web:
    - `pnpm test:nuxt run`: only the 4 baseline failing files (3324 passed).
    - `pnpm test:electron run`: 177 passed. One unrelated flake appeared once in four runs.
    - vue-tsc shows no errors in the changed files.
  - Live D-15 (`implementation-evidence/d15-skill-strength-probe.mjs`): V-A to V-E pass on Claude, Codex and Grok (ACP), and V-D (Rule 1) passes on AGY.
  - Live CR-002 (dev env, Codex `gpt-5.6-sol`): after a fresh load of a live chat, the footer shows the thinking control locked at "Low" with the lock tooltip, and the model is locked.
  - D-14:
    - The unit reproduction fails without the guard and passes with it.
    - The live deterministic reproduction fails both before and after the guard. The closer in both is `reconcileDiscoveredActiveRuns`.
    - The resend probe streamed 14/14 with 0 losses.
    - Full detail is in `implementation-evidence/README.md`.
- Next recipient or routing: `Design Impact` (D-14) → solution designer, via `get_handoff_rules`.
- Remaining limitations or risks:
  - The D-14 race remains open (RSK-007). The server sends `AGENT_STATUS offline` on connect, which clears `submissionPending` before `SEND_MESSAGE`.
  - The Codex V cases use a `resume-designer` pair, because `software-tutorial-video-maker` is natively discoverable from the user's `~/.codex/skills`.
  - The live screenshot tool failed; the CR-002 rendered check is from DOM inspection.

### IR-003 — D-14 activation-pending marker (SR-010) and R-2

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-handoff.md`, ARCH-REV-006 (pass on SR-010).
- Triggering finding IDs: CR-003 / F-02 (RSK-007); the IR-002 D-14 Design Impact (AF-33); R-2 / MP-013 (optional, included).
- Classification: design execution of the revised D-14.
- Prior authoritative result: IR-002 (`da1033860`, `46f28bb9f`). D-14's `submissionPending` guard could not close the race.
- Current authoritative result: commit `5f11d52f6`. D-14 is implemented per SR-010. CR-002 and D-15 are unchanged from IR-002.
- Related solution revision IDs: SR-010
- Related architecture-review revision IDs: ARCH-REV-006
- Related code-review revision IDs: CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: implementation of the SR-010 D-14 revision.
- Approved behavior or requirement IDs affected: BEH-005, REQ-003 and REQ-017 (D-04/D-13 first sends and catalog launches), plus resumes of Offline/Error runs.
- Implementation delta:
  - **Marker** (`stores/agentRunStore.ts`).
    - Module-level `activationPendingRunIds`, with the actions `markActivationPending`, `clearActivationPending` and `isActivationPending`.
    - `sendUserInputAndSubscribe` marks a resume of an Offline/Error run as the submission starts, and a first send with the permanent id right after `promoteTemporaryId`. Both happen before the stream connects.
    - Cleared in the `catch` path (including the connect timeout) and in `terminateRun` and `closeAgent`.
    - The service's `onSendMessageCommandAck` clears the marker when a `SEND_MESSAGE` ack is not accepted.
  - **Ack callback** (`services/agentStreaming/AgentStreamingService.ts`, `index.ts`).
    - New `onSendMessageCommandAck` option. It is called for every `SEND_MESSAGE` ack before the ack is projected; projection is unchanged.
    - `SendMessageCommandAckPayload` is re-exported.
  - **Reconcile** (`stores/runHistoryLoadActions.ts`).
    - `reconcileDiscoveredActiveRuns` skips marked runs: no disconnect, no Offline cleanup.
    - It clears the marker for every run in the snapshot's active set (`isActive || shouldConnectStream`).
    - The SR-008 `submissionPending` guard is removed. `submissionPending` is unchanged.
    - Live `AGENT_STATUS` events do not touch the marker.
  - **R-2** (`runHistoryLoadActions.ts`, `runHistoryStore.ts`): a `workspaceRequestGeneration`, checked before a workspace snapshot is applied, before it is reconciled, and before an error is recorded.
  - **Docs:** `autobyteus-web/docs/agent_execution_architecture.md`.
- Changed files or areas:
  - Tests: the `agentRunStore` spec (8 marker tests), `AgentStreamingService.spec.ts` (ack callback), and the new `runHistoryReconcileActivationPending.spec.ts` (6 tests, replacing `runHistoryReconcilePendingSubmission.spec.ts`).
  - The `runHistoryStore` and `agentOrgRetainedRecovery` spec mocks gained the new members.
- Local validation and result:
  - Web: `pnpm test:nuxt run` shows only the 4 baseline failing files (3337 passed). `pnpm test:electron run`: 177 passed. vue-tsc shows no errors in the changed files. The guards pass.
  - Five of the six reconcile tests fail against the previous `runHistoryLoadActions.ts`. The sixth (no Offline cleanup) also passes there, because the old guard covered `submissionPending === true`.
  - Live, in `implementation-evidence/`:
    - The first-send and Offline-resume stale reproductions FAIL without the marker and PASS with it.
    - The resend journey passed 14/14, with 0 losses.
    - No close of P was observed with the marker.
- Next recipient or routing: code reviewer, via `get_handoff_rules`.
- Remaining limitations or risks:
  - The marker has no timeout. It lasts until an active snapshot, a failure, a rejected ack, or terminate/close. If a send is accepted but the server never activates the run, that run is not torn down by reconcile until one of those happens (for example terminate or close).

### IR-004 — D-16 Chat model labels (UVF-001)

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-handoff.md`, ARCH-REV-008 (pass on SR-012). Origin: user verification finding `user-verification-finding-001.md`, recorded under DR-002.
- Triggering finding IDs: UVF-001. Requirements: REQ-021, AC-018, DEC-015.
- Classification: design execution of D-16. The delta is Small/Low; the package stays Large/High.
- Prior authoritative result: IR-003 (`5f11d52f6`, `e5eac067d`), merged with `origin/personal` by delivery (`7aa53519b`, `4b440e719`).
- Current authoritative result: commit `9d65adf6e`.
- Related solution revision IDs: SR-011, SR-012
- Related architecture-review revision IDs: ARCH-REV-008
- Related code-review revision IDs: CRR-003
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: DR-002
- Why this implementation revision is recorded: implementation of D-16.
- Approved behavior or requirement IDs affected: REQ-021, AC-018 (V-L1 to V-L5), and the BEH-003 model menu.
- Implementation delta:
  - **Option builder** (`composables/chat/useChatModelCatalog.ts`).
    - `ChatModelOption` is now `{ runtimeKind, llmModelIdentifier, label, secondary, recommended, providerName, displayName, canonicalName }`. The identifier-only `name` / `title` fields are gone.
    - `toChatModelOption(...)` is the single builder. It prefers the catalog record, then `existingRunChoiceLabelInput(runChoice)`, then the bare identifier.
    - `orderChatModelOptions` puts Recommended first for Claude Agent SDK only.
    - `matchesModelQuery` is the one search predicate, used by both `search` and `filterOptions`.
    - `catalogModelFor` looks up a runtime catalog record; `modelGroups` and `modelLabel` use the builder.
  - **Persisted runs** (`components/chat/chatRunModelControls.ts`): the fixed list is built with `toChatModelOption`, passing the catalog record and the run choice, and ordered with `orderChatModelOptions`. The persisted `modelLabel` uses `label`.
  - **Shared utilities.**
    - `utils/modelSelectionLabel.ts`: the new `existingRunChoiceLabelInput`, moved from the local `choiceLabel` in `RuntimeModelConfigFields.vue` (now imported there; the local copy is removed), plus an exported `ModelSelectionLabelModel`.
    - `utils/modelSelectionOptions.ts`: the new generic `compareRecommendedFirstBy`, which `buildModelSelectionGroups` now uses.
  - **Presentation.**
    - The new `ChatModelOptionLabel.vue` renders the label and the Recommended badge (the `SearchableGroupedSelect` classes) on one truncated line, with `secondary` as a gray truncated line.
    - The new `chatModelOptionText.ts` gives the full text for `title` / `aria-label`.
    - `ChatModelList.vue` and the `ChatModelMenu.vue` search rows use both. The inline fixed-list predicate in `ChatModelMenu.vue` is removed.
    - A new `chat.model.recommended` key in en/zh-CN, with the same copy as the launch form.
  - **Docs:** `autobyteus-web/docs/chat.md`, section "Model labels".
- Tests:
  - New `composables/chat/__tests__/useChatModelCatalog.spec.ts` (5 tests): V-L1, V-L3 and V-L4 labels; search on display and canonical names; the builder's fallbacks; row rendering.
  - `chatRunModelControls.spec.ts`: 2 V-L2 fixed-list tests (the choice fallback, and preferring the catalog record); the mock now keeps the real builder.
  - `modelSelectionLabel.spec.ts` / `modelSelectionOptions.spec.ts`: the moved mapping and the generic comparator.
  - `RuntimeModelConfigFields.spec.ts`: a V-L5 regression test with real Claude names. It passes both before and after the move.
- Local validation and result:
  - `pnpm test:nuxt run` with `LANG=en_US.UTF-8`: 3347 passed. The only failing files are the 4 baseline ones.
  - Under this session's current `LANG=de_DE.UTF-8`, the merged-in `TokenUsageMeterPanel.spec.ts` also fails on locale number formatting. That file is from `origin/personal` and is unrelated to this change.
  - vue-tsc: no errors in the changed files. The guards pass.
  - Live (dev env, the real catalog; server rebuilt on the merged branch):
    - **V-L1:** New chat on Claude Agent SDK lists `claude-opus-5-5` first, with "Opus 5.5 · For complex work and everyday tasks" and Recommended. After selecting it, the trigger shows `claude-opus-5-5`.
    - **V-L2:** a persisted Claude chat (Offline, reopened after terminate) shows the same fixed list, Recommended first, and the trigger shows its model's canonical name. Searching "Opus 5.5" finds `opus`.
    - **V-L3:** the Codex trigger shows "GPT-5.6-Sol (default reasoning: low)" on one 28 px line.
    - **V-L4:** AutoByteus rows show identifiers.
    - **V-L5:** gear editor labels are unchanged (the regression test above).
- Next recipient or routing: code reviewer (the package is Large/High), via `get_handoff_rules`.
- Remaining limitations or risks:
  - Two-line rows make the model lists taller; the lists already scroll.
  - Browser screenshots were not captured; the checks inspected the DOM directly.

### IR-005 — D-17: the chat run view is the product agent run view (R3)

- Triggering role, report path, and round: architecture_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-handoff.md`, ARCH-REV-010 (pass on SR-014). Origin: user verification UVF-002 (`solution-designer-result-uvf-002.md`), with the R3 UI decisions recorded as DEC-016.
- Triggering finding IDs: UVF-002, AR-010 (strip → exact tab), AR-011 (`temp-*` draft settings).
- Classification: design execution of D-17. The delta is Medium and web-only; the package stays Large/High.
- Prior authoritative result: IR-004 (`9d65adf6e`, `e9f2ce399`), plus delivery's later base merges up to `66304f510`.
- Current authoritative result: commit `1f5fd8004`.
- Related solution revision IDs: SR-013, SR-014
- Related architecture-review revision IDs: ARCH-REV-010
- Related code-review revision IDs: CRR-005
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A (delivery artifacts through DR-005 are unchanged)
- Why this implementation revision is recorded: implementation of D-17.
- Approved behavior or requirement IDs affected:
  - REQ-011 R3, REQ-012, REQ-013, REQ-016 and REQ-018;
  - AC-009, AC-010, AC-011, AC-015 and AC-018;
  - UIS-008, UIS-009 and UIS-013; UXJ-007 and UXJ-009.
- Implementation delta:
  - **Frame.**
    - `pages/chat.vue` renders `WorkspaceAdaptiveLayout` for `/chat?id`. It shares a new `useWorkspaceFileContentVisible` with `pages/workspace.vue`.
    - `WorkspaceAdaptiveLayout` restores the standalone branches (`showSelectedRunConfig`, `AgentWorkspaceView`).
    - `AgentWorkspaceView.vue` is restored (with its i18n key). ＋ calls `startNewChat({ agentDefinitionId, workspaceRootPath })` and routes to `/chat`; ⚙ calls `showConfig`. It supplies `skillTagging`.
  - **Header.** `AgentWorkspaceSurface` titles standalone targets with the new `useStandaloneRunTitle` (first message, else history summary, ≤42 characters; the full text goes in `title`). Org targets keep their titles.
  - **⚙.** `RunConfigPanel` gains a draft branch: a selected standalone `temp-*` id renders the new `DraftRunConfigEditor.vue`. That is an `AgentRunConfigForm` bound to `context.config`, with the workspace locked; it makes no `existingRunConfigStore` calls, and the back arrow does not clear that store.
  - **Box.**
    - `AgentUserInputForm`, `AgentUserInputTextArea` and `AgentEventMonitor` take an optional `skillTagging` capability.
    - It is backed by the new `useSkillTagMenu` (the `/` trigger, `ChatSkillMenu`, keyboard handling) and the new `SkillTagChips.vue`, which is also used by `ChatComposer`.
    - With the capability, a tag or an attachment makes a sendable draft, and only the Context Files area clips, so the menu can open above the box.
  - **Right panel.** `useRightPanel` returns to one shared `isRightPanelVisible = ref(true)`. The scope, `setActiveRightPanelScope` and the `WorkspaceToolShell` `scope` prop are removed.
  - **Tabs.**
    - `useRightSideTabs` owns `contextualScopeKey`, `lastAppliedScopeKey`, a pending explicit tab and a mounted-host count, plus `selectTabExplicitly` and `useContextualDefaultTab`.
    - `RightSideTabs` uses them, and its `visibleTabs` watcher is now immediate.
    - `RightSidebarStrip` clicks go through `selectTabExplicitly`.
  - **Removals.**
    - `ChatRunView.vue`, `ChatRunHeader.vue`, `chatRunModelControls.ts` and its spec. The draft-only `chatDraftModelControls.ts` is used by `ChatNewSurface`.
    - `ChatModelMenu` `fixed` / `lockedReason` / `retry-fixed`, and `ChatThinkingControl` `lockedReason`.
    - The `useChatModelCatalog` `runChoice` branch, `filterOptions` and `catalogModelFor`.
    - Ten `chat.header.*` / `chat.footer.*` / locked-aria / `runtimeFixed` keys, in en and zh-CN.
  - **Local fix within D-17** (VIS-017 fidelity): `ExistingRunConfigEditor` resolves a history-derived workspace id to the known workspace with the same root, via `workspaceStore.findWorkspaceInfoByRootPath`, so a reopened stopped run shows "Temp Workspace (Default)" rather than an empty selector.
  - **Docs:** `autobyteus-web/docs/chat.md` (Run View), `workspace_layout.md`, `agent_execution_architecture.md`.
- Tests:
  - New:
    - `AgentWorkspaceView.spec.ts` (4 tests);
    - `AgentUserInputForm.skillTagging.spec.ts` (3);
    - `useRightSideTabs.contextualDefault.spec.ts` (4);
    - `ExistingRunConfigEditor.workspace.spec.ts` (2; the first fails without the fix);
    - a `RunConfigPanel.spec.ts` draft-branch test.
  - Updated:
    - `RightSideTabs.spec.ts`, `RightSidebarStrip.spec.ts` and `useRightPanel.spec.ts`;
    - `WorkspaceAdaptiveLayout.spec.ts` (the IR-001 hunks reverse-applied, and the source check updated);
    - `pages/__tests__/chat.spec.ts` and `useChatModelCatalog.spec.ts`.
- Local validation and result:
  - `pnpm test:nuxt run` with `LANG=en_US.UTF-8`: 3369 passed. The only failing files are the 4 baseline ones.
  - vue-tsc: no errors in the changed files. The guards pass.
  - The live checks A to K pass (see `implementation-evidence/README.md` § D-17).
- Next recipient or routing: code reviewer (Large/High), via `get_handoff_rules`.
- Remaining limitations or risks:
  - The API/E2E-owned `autobyteus-web/tests/e2e/chat-entry-live-probe.mjs` targets the removed `chat-run-view`, `chat-run-status` and `chat-runtime-fixed-note` selectors and needs updating.
  - For a reopened run whose conversation starts at a Codex compaction boundary, while history is not loaded (narrow view, tree not mounted), the title falls back to the product "Agent - XXXX".
  - After a draft's first send promotes its id, or when switching between chats, the tab re-defaults to Activity. This is an accepted consequence.
  - The draft editor shows the product's "workspace is fixed for existing runs" wording.

### IR-006 — CRR-008 Local Fix: CR-005 and CR-006

- Triggering role, report path, and round: code_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-report.md`, round 5, CRR-008 (Fail, Local Fix).
- Triggering finding IDs: CR-005 (Medium), CR-006 (Low).
- Classification: `Local Fix`. The package stays Large/High.
- Prior authoritative result: IR-005 (`1f5fd8004`, `1671f722b`).
- Current authoritative result: commit `59a20f21b`.
- Related solution revision IDs: SR-014
- Related architecture-review revision IDs: ARCH-REV-010
- Related code-review revision IDs: CRR-008
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: the fix for the two blocking CRR-008 findings.
- Approved behavior or requirement IDs affected: REQ-002 / AC-002 ("streams in the chat view"), REQ-012, SCN-001/SCN-008; the design Dependency Rules (AR-002).
- Implementation delta:
  - **CR-005.**
    - `pages/chat.vue` records the context for which run settings were opened, when the global center-view mode turns to `config`. While in config mode, whenever Chat displays a different context it calls `workspaceCenterViewStore.showChat()`.
    - That covers a New chat sent from the pencil or the tree `+` (successful and failed first sends), opening another chat, and mounting with settings left open for another run.
    - A temp → permanent promotion keeps the same context object, so a draft's settings stay open.
    - `chatLaunchService.launchTeamChat` calls `showChat()` before the Team launch, so `/workspace` opens on the team's conversation.
  - **CR-006.**
    - `composables/chat/useChatPopover.ts` moves to `composables/popover/useAnchoredPopover.ts` (renamed `useAnchoredPopover`), and all Chat menus and `useSkillTagMenu` use it.
    - Optional recommendation, taken: `detectMenuTrigger`, `rankSkills` and the skill option type (renamed `SkillTagOption`) move from `components/chat/chatComposerMenus.ts` to the new `utils/skills/skillTagMenu.ts`.
    - `agentInput` now imports only the `ChatSkillMenu` and `SkillTagChips` components from `components/chat`, which D-17 permits. It imports nothing from `composables/chat`, `services/chat` or `stores/chatDraftStore`.
- Tests:
  - `pages/__tests__/chat.spec.ts` gains 3 CR-005 tests: a new chat after ⚙ on another chat; a draft keeping its settings across promotion; a mount with settings open for another run. Without the fix, the first and third fail.
  - `chatLaunchService.spec.ts`: the Team quick path resets to the conversation.
  - `chatComposerMenus.spec.ts` imports from the new util.
- Local validation and result:
  - `pnpm test:nuxt run` with `LANG=en_US.UTF-8`: 3374 passed. The only failing files are the 4 baseline ones.
  - vue-tsc: no errors in the changed files. The guards pass.
  - Live check `L` passes (`implementation-evidence/README.md` § CR-005).
- Next recipient or routing: code reviewer, via `get_handoff_rules`.
- Remaining limitations or risks:
  - The Team quick path fix is covered by a unit test, not a live team launch.
  - The design-spec file-mapping residue (the `AgentWorkspaceView` "Remove" row and the CR-002 row) is for the Solution Designer and has no code impact.


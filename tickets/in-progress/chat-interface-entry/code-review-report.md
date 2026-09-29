# Code Review Report — chat-interface-entry

## Review Round Meta

- Review Entry Point: `Implementation Review`. This is round 4 and the latest authoritative round. It covers IR-004 (D-16, Chat model labels).
  - The round-1 sections (basis, scenario gate, structural checks, size audit, legacy verdict) still hold for the unchanged IR-001 code.
  - The "Round 3 Review (IR-002 / IR-003)" section still holds for D-14 and D-15.
  - The "Round 4 Review (IR-004 / D-16)" section records this delta.
- Requirements Doc Reviewed As Context: `requirements-doc.md`. The SR-003 baseline plus the SR-011 delta (REQ-021, AC-018, DEC-015; user-approved 2026-09-29).
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (through SR-012)
- Design Spec Reviewed As Context: `design-spec.md` at SR-012 (D-16, including the AR-009 persisted-run path)
- Supplemental Task Artifacts Reviewed As Context: R2 `ui-ux-spec.md` ("model names never wrap"); `user-verification-finding-001.md` (UVF-001)
- Relevant Solution Revision IDs: SR-011, SR-012 (earlier: SR-003..SR-010)
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-008 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-007, ARCH-REV-008
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-004 (IR-001..IR-003 are the baseline)
- Delivery Revision Record Reviewed As Context: `delivery-revision-record.md` (DR-002: UVF-001 routed upstream)
- Relevant Delivery Revision IDs: DR-002
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Current Review Round: 4
- Trigger: implementation_engineer handoff for IR-004 (D-16), after the user verification finding UVF-001 (DR-002).
- Prior Review Round Reviewed: round 3 (CRR-003 Pass) and the test review CRR-004 (Pass)
- Latest Authoritative Round: 4
- Failing Scenario IDs / Commands / Evidence: N/A for this entry point.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. The diff spans a GraphQL and persisted-config contract (`skillScope`), SkillService resolution used by every runtime, the built-in bootstrap policy, shell routing (`/`, `/chat`, `/workspace` redirect), and a shared message-box refactor used by the team and org views. That is 165 files (+6581/−1412). No correction is needed.

## Review Scope

- Changed implementation and behavior reviewed: branch `codex/chat-interface-entry`, commits `770b14651`..`797d49d6a` against `origin/personal@fcd3e83a4` (steps 1–9). The ticket commit `717603e61` was read as context.
- Files and areas reviewed in depth:
  - Server:
    - `skill-service.ts`, `skill-discovery.ts`, `configured-agent-skill-resolver.ts`, `installed-skill-record.ts`.
    - The AutoByteus and AGY factories. The Codex and Claude bootstrappers were checked for their call paths.
    - The agent-definition model, config, service and GraphQL.
    - The built-in registry and bootstrapper, and the Daily Assistant template.
  - Web:
    - `chatRunModelControls.ts`, `useChatRouteRunSync.ts`, `pages/chat.vue`, `chatLaunchService.ts`, `chatTeamLaunchConfig.ts`, `chatDraftStore.ts`, `chatDraftComposerTarget.ts`, `useChatComposerOptions.ts`, `useChatModelCatalog.ts`, `ChatModelMenu.vue`, `ChatComposer.vue`, `ChatRunView.vue`, `ChatNewSurface.vue`, `skillRequestInstruction.ts`.
    - `useComposerTarget.ts`, the `agentRunStore` / `agentContextsStore` / `agentTeamRunStore` / `activeContextStore` / `agentPrimaryAction` deltas, `workspaceNavigationService.ts`, `pages/workspace.vue`, `pages/index.vue`, `AppLeftPanel.vue`, the tree panel and selection actions, `useRightPanel.ts`, `WorkspaceToolShell.vue` / `WorkspaceAdaptiveLayout.vue`, `layouts/default.vue`, and the agent editor's `skillScope`.
  - The existing owners each new path depends on were also read: `agentRunStore.sendUserInputAndSubscribe`, `existingRunConfigStore` (`canSave`/`save`/`updateAgentModelConfig`), `agentTeamRunStore.sendMessageToFocusedMember`, and the server `agent-stream-handler.handleSendMessage`.
- Explicit exclusions:
  - Pixel-level visual fidelity (AC-015) and live AGY, Claude and voice runs. These are API/E2E and validation scope.
  - Localization copy wording.
  - Pre-existing baseline test failures listed in the handoff.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. REQ-001–REQ-020 and AC-001–AC-017 against SR-003, with the R2 supplement.
- Design-spec behavior map verified against the implementation: Yes. See the table below.
- Design review report and round confirmed: ARCH-REV-003 Pass. MP-001–MP-004 and MP-006 are resolved in the design, MP-005 is handled by the change-driven redirect rule, and MP-007 is Not Reachable.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `useShellPrimaryNavigation` adds a `chat` key. In `AppLeftPanel`, the Chat item and the pencil both call `chatDraftStore.startNewChat()` before routing to `/chat`, and the collapse control sits on the first item. `pages/index.vue` redirects desktop to `/chat`. | — |
| BEH-005 | Confirmed | Send path: `ChatNewSurface` → `createChatDraftComposerTarget.send` → `launchAgentChat`, in this order: `markStarting` → resolve workspace → `registerDraftRun` (register + select) → await `sendUserInputAndSubscribe` → navigate to `/chat?id=<selected id>` → `startNewChat()`. This matches D-04/AR-007. The failure path relies on `sendUserInputAndSubscribe`, which catches and presents errors without rethrowing (`agentRunStore.ts` L239–L255), so a failed first send lands on the still-registered `temp-*` id. | — |
| BEH-003 | Confirmed | `useChatModelCatalog` loads catalogs per runtime on demand, and search loads catalogs on the first keystroke (`ChatModelMenu` `watch(query)`), satisfying RSK-001. The fallback chain in `chatDraftStore.resolveDefaultModel` is last-used (enabled runtime and model exists) → Daily Assistant `defaultLaunchConfig` → runtime default, per REQ-019. `writeChatLastModel` runs only after promotion. | — |
| BEH-004 | Confirmed | The draft workspace defaults to temp. `resolveChatWorkspace` resolves an existing workspace or a folder at send time, before registration. Folder paths are validated as absolute (`isAbsoluteFolderPath`). | — |
| BEH-007 | Confirmed | `useChatComposerOptions`: an ALL_INSTALLED agent offers the enabled `skillStore` skills; otherwise its configured names. `agentRunStore` composes the instruction with the `skillRequestInstruction` codec. `initialSummary` is the user text, falling back to the instruction for a tags-only message (AR-005). `beginLocalUserSubmission` clears the tags. `UserMessage` and `runTreeSummary` render and summarize through the codec's `parse`. | — |
| BEH-008 | Confirmed | `chatDraftStore.setTarget` rebuilds `config.agentDefinitionId` and `conversation.agentDefinitionId` (AF-27), keeps text, attachments, workspace, approval and model, and clears the tags. Tree `+` goes through `startPresetChat` → `startNewChat(preset)` → `/chat`. The `@` list excludes Daily Assistant and Agent Orgs. | — |
| BEH-009 | Confirmed | Sequence: `launchTeamChat` builds a root-only config with `buildChatTeamLaunchConfig` (no overrides) → primes the team runtime catalog → `createDraft(config, coordinator)` → selects the team draft → `sendMessageToFocusedMember(..., { attachmentDraftOwner: agent_draft(<chat draft id>) })` → navigates to `/workspace`. If the launch fails before submission, the orphan team draft is removed. | — |
| BEH-010 | Confirmed | `chatRunModelControls` chooses its mode from `isTemporaryRunId(runId)`, never from `isLocked` (D-08/MP-006). For a permanent id it loads the canonical config through `existingRunConfigStore` when Offline, locks while Running/Idle/Initializing or `draft.isActive`, limits models to the run's runtime (`fixedModels` from `modelOptionsByAddress['/']`), saves with `updateAgentModelConfig` + `save()`, and patches the context through `patchConfigOnly`. The `attemptedRunId` latch prevents a retry loop after a failed load. | — |
| BEH-011 | Confirmed | `ChatRunView` renders inside `WorkspaceToolShell scope="chat"`. `useRightPanel` keeps visibility per scope (`chat` starts collapsed, `workspace` starts docked). `resolveSelectionRoute` and `buildWorkspaceExecutionRoute` send agent runs to `/chat?id=`, and `pages/workspace.vue` redirects on selection change only. Team and org views are unchanged. | — |
| BEH-012 | Confirmed | The box pieces (`ContextFilePathInputArea`, `AgentUserInputTextArea`, `VoiceInputButton`) take an explicit `ComposerTarget`. `AgentUserInputForm` passes `useComposerTarget()`. `voiceInputStore` takes `{ source: 'composer', targetContext }`; there are no `activeContextStore` reads in the box pieces or the voice store (grep verified). `agentInput` has no imports from `chat`. | — |
| BEH-013 | Confirmed | New chats default to `autoExecuteTools: true`. The toggle is on the New chat footer only, and the setting is applied to the agent config or the team root config. | — |
| BEH-014 | Confirmed | `pages/chat.vue` either selects a mounted run or calls `openWorkspaceExecutionLink`. An unknown id shows the missing state, and an unregistered `temp-*` id goes to `/chat`. On `/chat`, the tree's selected row comes from the route id. | — |
| REQ-007 (system) | Confirmed | Daily Assistant (`autobyteus-daily-assistant`, `seedIfMissing`) is seeded only when its files are missing (checked with `lstat`); other built-ins keep `overwrite`. `listInstalledSkillRecords` keeps the original precedence and first-wins de-duplication. ALL_INSTALLED bindings are built from enabled records: `bindInstalledRecord` for the regular path, `resolveInstalledRecordDetailed` for the detailed path. The runtime factories use SkillService (`hasEffectiveSkills` in AutoByteus and AGY; the Codex and Claude bootstrappers go through `resolveConfiguredSkillBindingsForAgent`). | — |
| REQ-017 | Confirmed | `RunConfigPanel` and the catalog launch forms are unchanged. A catalog-launched standalone draft is redirected to `/chat?id=temp-*`, and `useChatRouteRunSync` follows the promotion. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, 005, 013; REQ-007 | User | Any user | Start a general chat | Chat item / pencil / `/` | Normal | DS-001 (verified above) | Daily Assistant run in the chat view; row selected | Requirements SCN-001; UXJ-001 | Supported Normal Scenario | Use |
| SCN-001-F | BEH-005 (D-04 alternate) | User | Any user | Start a chat when the first send fails | New chat send | Explicit Edge | register → send fails before promotion → `/chat?id=temp-*` with the error → resend → D-13 replace | User sees the error in context and can resend | Design D-04/AR-001; `agentRunStore` catch block | Supported Explicit Edge Scenario | Use |
| SCN-002 | BEH-003 | User | Any user | Pick runtime, model and thinking | Model menu / thinking button | Normal | DS-006 | Selection applied to the draft; last-used recorded after promotion | UXJ-002; REQ-019 | Supported Normal Scenario | Use |
| SCN-004 | BEH-007 | User | Power user | Point the agent at skills | `/` in the Chat box | Normal | DS-004 / DS-009 | Composed instruction plus chips after reload | UXJ-004; DEC-012 | Supported Normal Scenario | Use |
| SCN-005/006 | BEH-008, 009 | User | Power user | Address an agent or team | `@`, tree `+` | Normal | DS-001 / DS-002 | Agent run in the chat view / Team view | UXJ-005/006 | Supported Normal Scenario | Use |
| SCN-007 | BEH-010 | User | Any user | Change the model of an Offline chat | Terminate → footer model | Normal | DS-005 | Saved through `existingRunConfigStore`; applied on resume | UXJ-007; MP-006 | Supported Normal Scenario | Use |
| SCN-008 | BEH-011, 014; REQ-017 | User | Any user | Revisit or manage chats; open a catalog-launched run | Tree row / execution link / catalog Run | Normal | DS-003 | Chat view; missing-state handling | UXJ-009/011 | Supported Normal Scenario | Use |
| SCN-009 | BEH-012 | User | Any user | Attach or dictate in any run | Message box | Normal | DS-004 | Same box; team and org views unchanged | DEC-013/014 | Supported Normal Scenario | Use |
| SYS-001 | REQ-007 | System | Server startup / run start | Seed Daily Assistant; expand ALL_INSTALLED | Bootstrap; backend factory | Normal | DS-007 / DS-008 | Definition resolvable; runtime receives the enabled installed skills | D-10/D-11 | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | `launchAgentChat` does not clear `starting` if `sendUserInputAndSubscribe` throws, rather than handling the error itself | SCN-001 | First send | The early throws in `sendUserInputAndSubscribe` (no active agent, model, workspace root, skill access, runtime) cannot occur after readiness passes, `resolveChatWorkspace` supplies metadata, and `registerDraftRun` selects the context. Every later error is caught and presented without a rethrow. | `agentRunStore.ts` L95–L144, L239–L255; `chatLaunchService.ts` L101–L125 | Reject | Not reachable through normal execution; no machinery required |
| C-02 | The chat footer sets `schemaStateByAddress['/']` to `ready` before `save()` | SCN-007 | Offline model or thinking pick | In the chat footer, `chatRunModelControls` is the schema owner. It derives the thinking schema from the same model options, and the server validates the selection. A rejected save appears as an error toast. | `chatRunModelControls.ts` L125–L134; `existingRunConfigStore.canSave`; handoff (server-verified save) | Reject | No evidenced consequence; still guarded by the other `canSave` gates |
| C-03 | An attachments-only send sends empty content | SCN-009 | Attach, then send | R2 spec: "Send disabled until there is text, a tag or an attachment". The server `handleSendMessage` accepts empty `content`. The team and org boxes keep text-required. | `agentPrimaryAction.hasSendableDraft`; `agent-stream-handler.ts` L338 | Reject | Approved behavior; no defect |
| C-04 | `hasEffectiveSkills` plus the ALL_INSTALLED resolution scan the skill folders twice at run start | SYS-001 | Run start | Two filesystem scans per backend creation | `autobyteus-agent-run-backend-factory.ts` L419–L420 | Reject | No evidenced performance consequence; noted as a residual only |
| C-05 | `WorkspaceAgentRunsTreePanel.regressions.spec.ts` still mocks the removed `createDraftRun` | Removal plan (design) | — | A stale mock of a removed API in a baseline-failing spec; no production effect | spec L208 | Promote (Low, non-blocking) | Remove the stale mock line on the next touch of that spec |
| C-06 | Clicking a standalone run while on `/workspace` both pushes (`AppLeftPanel`) and replaces (`workspace.vue` watcher) to the same `/chat?id=` | SCN-008 | Tree click on `/workspace` | Same destination; idempotent | `AppLeftPanel.vue`; `pages/workspace.vue` | Reject | No consequence |
| C-07 | A brief `chat-opening` spinner shows between the re-key on promotion and the route replace | SCN-001-F / SCN-008 | Resend on `/chat?id=temp-*` | One flush; transient | `pages/chat.vue` template; `useChatRouteRunSync` | Reject | Cosmetic and transient |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | `ComposerTarget`, `WorkspaceToolShell`, a single route authority, and SkillService-owned effective skills are implemented as designed. Step 4 is a separate behavior-preserving commit (`49b0ef457`). | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Behavior rules match R2 (send enablement, `@` only on New chat, `/` source, footer left group only on New chat, runtime fixed on persisted runs, no Recent list). Pixel fidelity is deferred to AC-015 validation. | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001 through DS-009 are traceable in code, as listed in the basis table. | — |
| Ownership boundary preservation and clarity | Pass | `chatLaunchService` is the only Chat entry to the run, team and context stores. `chatDraftStore` neither sends nor routes. `existingRunConfigStore` is used only for permanent ids. | — |
| Off-spine concern clarity | Pass | The preference util, codec, catalog composable, route sync and composer options each serve one owner. | — |
| Existing capability/subsystem reuse | Pass | Reuses the first-send path, team send, `existingRunConfigStore`, the provider catalog store, workspace history resolution, and `buildTeamRunTemplate`. | — |
| Reusable owned structures | Pass | `ComposerTarget`, `VoiceInputButton`, `VoiceInputStatusRow`, `MessagePrimaryActionButton`, `useComposerFilePathDrop`, the codec and `InstalledSkillRecord` are each extracted once. | — |
| Shared-structure/data-model tightness | Pass | `ChatDraft` keeps runtime and model only in `context.config`. `ComposerTarget.access` is a closed union. `ChatTarget` and `ChatDraftWorkspace` are discriminated unions. `skillScope` is an enum. | — |
| Repeated coordination ownership | Pass | Route resolution is centralized in `workspaceNavigationService`; there are no literal standalone `/workspace` pushes left in the changed callers (grep). | — |
| Empty indirection | Pass | `chatDraftComposerTarget` adapts the draft into the target shape; it is not a pass-through layer. | — |
| Separation of concerns and file responsibility | Pass | Presentation lives in `components/chat`, launch in `services/chat`, bindings in `composables/chat`, and pure helpers in `utils/chat` and `utils/skills`. | — |
| Ownership-driven dependency check | Pass | `components/chat` and `composables/chat` import none of `agentRunStore`, `agentTeamRunStore`, `teamRunConfigStore` or GraphQL, and `agentInput` imports nothing from `chat` (grep verified). | — |
| Authoritative Boundary Rule check | Pass | Runtime factories use SkillService only. Chat components never bypass `chatLaunchService` into the run stores. The footer uses `existingRunConfigStore`'s public actions. | — |
| File placement | Pass | Matches the design file mapping, including `components/chat/chatRunModelControls.ts`. | — |
| Flat-vs-over-split layout judgment | Pass | The chat subsystem folders mirror the existing feature layout. | — |
| Interface/API boundary clarity | Pass | `launchAgentChat`/`launchTeamChat` are split by subject. `registerDraftRun` enforces `temp-*` and rejects duplicates. `resolveSelectionRoute` takes a typed union. | — |
| Naming quality | Pass | Names are concrete and domain-aligned. One formatting nit: `createWorkspaceExecutionLinkSignature =(link` is missing a space. | Optional |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity control | Pass | The large deltas (`AgentUserInputTextArea`, `WorkspaceAdaptiveLayout`) are extractions that shrank the files. | — |
| Dead/obsolete code cleanup completeness | Pass | `AgentWorkspaceView` and its spec, `runHistoryDraftActions`, `createDraftRun`, the standalone config mode, the agent `/workspace` link kind, `emitRunCreated`, and the voice store's active-context read are all removed. One stale test mock remains (C-05, Low). | See C-05 |
| Relevant test scenarios and assertions are clear | Pass | There are unit and spec tests for launch order, route sync, footer modes, the codec, draft store rebuilds, the redirect, ALL_INSTALLED records, and seed policy. 219 targeted web tests and 144 targeted server tests pass (rerun by the reviewer). | — |
| Test fixtures/helpers reusable and coherent | Pass | `test-support/activeComposerTargetHarness.ts` is reused across the box specs. | — |
| No stale, duplicated, or compatibility-only tests | Pass | Only C-05 remains (Low). | See C-05 |
| API/E2E readiness | Pass | The handoff lists concrete downstream scenarios (live ALL_INSTALLED per runtime, the D-13 URL checks, D-08 after reload, RSK-005). | — |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `web/stores/voiceInputStore.ts` | 500 | Pass (at limit) | 37 | Pass | Pass | No headroom | Split before adding more |
| `server/src/skills/services/skill-service.ts` | 463 | Pass | 114 | Pass | Pass | OK | — |
| `web/components/chat/ChatModelMenu.vue` | 310 (new) | Pass | 329 | Pass: one menu surface (search, runtime submenu or drill-in, keyboard); the list is extracted to `ChatModelList` | Pass | OK | — |
| `web/stores/chatDraftStore.ts` | 236 (new) | Pass | 259 | Pass: draft lifecycle and default-model chain only | Pass | OK | — |
| `web/components/chat/ChatMessageInput.vue` | 227 (new) | Pass | 244 | Pass: the textarea plus the `/` `@` bounded local spine | Pass | OK | — |
| `web/components/agentInput/AgentUserInputTextArea.vue` | 226 | Pass | 252 (shrank) | Pass: extraction | Pass | OK | — |
| `web/components/layout/WorkspaceAdaptiveLayout.vue` | < 220 | Pass | 271 (shrank) | Pass: shell extracted | Pass | OK | — |
| `web/services/chat/chatLaunchService.ts` | < 220 | Pass | 219 | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Agent `/workspace` links are no longer parsed (`parseWorkspaceExecutionLinkQuery` is team-only). |
| No legacy old-behavior retention in changed scope | Pass | The standalone view, the tree draft-create path and the standalone gear mode are all removed. |
| Dead/obsolete code cleanup completeness | Pass | C-05 is the only residue. |
| Approved persisted-data transition decision followed | Pass | Directly Usable. `normalizeAgentSkillScope` maps a missing or unknown value to `CONFIGURED`, and the writer persists the normalized value. |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | — |
| Approved transition mechanics match | Pass | No migration, as approved. |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.regressions.spec.ts` L208, `createDraftRun: vi.fn()` | UnusedTest (stale mock) | `runHistoryStore.createDraftRun` was removed in this change | Mocks a removed API | Low, non-blocking: delete the line when the spec is next touched |

## Docs-Impact Verdict

- Docs impact: `Yes` (already addressed in this change)
- Why: navigation, standalone run routing, `skillScope`, built-in sync policies, and Daily Assistant.
- Files updated: web `docs/chat.md`, `workspace_layout.md`, `agent_execution_architecture.md`, `agent_management.md`, `skills.md`; server `docs/modules/agent_definition.md`, `skills.md`.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001–MP-004 | Confirmed | Implemented as designed |
| MP-005 | Confirmed | `pages/workspace.vue` watcher without `immediate`, skipped while `rootSubjectKind=agent_org` |
| MP-006 | Confirmed | Footer mode keyed on `isTemporaryRunId`, not `isLocked` |
| MP-007 | Confirmed (Not Reachable) | `resolveInstalledRecordDetailed` reports `name_mismatch` for non-global records |

No new or reclassified premises.

## Round 3 Review (IR-002 / IR-003)

### Scope

- Commits: `da1033860` (IR-002) and `5f11d52f6` (IR-003). The ticket commits `46f28bb9f` and `e5eac067d` were read as context. That is 37 files, +1303/−379.
- The uncommitted API/E2E-owned worktree changes are out of scope here; they go to the later proportional test review:
  - `tests/e2e/chat-entry-live-probe.mjs`
  - the `package.json` script
  - the CR-001 mock removal
- Reviewed in depth:
  - Web: `chatRunModelControls.ts` (CR-002); `agentRunStore.ts`, `runHistoryLoadActions.ts`, `runHistoryStore.ts` and `AgentStreamingService.ts` (D-14, R-2).
  - Server: `workspace-skill-materializer.ts`, `workspace-skill-links.ts` (new), `skill-request-strength.ts` (new), `agy-configured-skill-materializer.ts`, `agy-run-capsule.ts`, `SkillService.resolveSkillScope`, and the Codex, Claude, ACP and AGY call sites (D-15).

### Prior-Finding Verification

| Finding | Design Basis | Verification In Code | Status |
| --- | --- | --- | --- |
| CR-002 (F-01) | REQ-011, UXJ-007, DEC-009 | `chatRunModelControls.ts` L80–L90. In persisted mode, a watcher (immediate) requests the run's runtime catalog when its state is `idle`, and `thinkingSchema` falls back to that catalog for a live run. Models with no thinking parameters still hide the control (the `ChatThinkingControl` `v-if` is unchanged). The unit test in `chatRunModelControls.spec.ts` covers it, and the live check shows "Low" locked on a fresh load. | Resolved |
| CR-003 (F-02) | D-14 (SR-010), AF-33 | See the D-14 trace below. The closer was confirmed (IR-002 stack), and the SR-008 guard was removed cleanly. The stale reproduction fails without the marker and passes with it, and the resend probe passed 14/14. | Resolved |
| CR-004 (F-03) | D-15, REQ-007, REQ-017, RSK-003 | See the D-15 trace below. V-A..V-E pass live on Claude, Codex and Grok, and V-D passes on AGY. | Resolved |
| CR-001 | Removal plan | Removed by API/E2E in the uncommitted worktree. It is verified in the later proportional test review, not here. | Resolved (pending test review) |

### D-14 Trace (Activation-Pending Marker)

- **Owner.** `agentRunStore`, the single standalone send owner, keeps a module-level `activationPendingRunIds` with mark, clear and is methods, matching D-14.
- **Set:**
  - on a first send, with the permanent id immediately after `promoteTemporaryId` (L221–L222);
  - on a resume of an Offline/Error run (`isResumeOfStoppedRun`, L120 and L174–L178).
  - Both happen before `ensureAgentStreamConnected`. A `temp-*` id is already skipped by reconcile, so the window before promotion needs no marker.
- **Cleared:**
  - in the `catch` path, which covers a failure, a cancel or the connect timeout (L259);
  - on a rejected `SEND_MESSAGE` ack, through the new `onSendMessageCommandAck`, which the service calls before dispatch (`AgentStreamingService` L207–L209);
  - in `terminateRun` → `teardownLocalRuntime` and in `closeAgent`;
  - in reconcile, for runs in the active set (`runHistoryLoadActions.ts` L257–L259).
  - Not cleared on `AGENT_STATUS`, per SR-010.
- **Reconcile.** Marked runs are skipped before the disconnect and the Offline cleanup (L242–L245). `submissionPending` semantics are unchanged.
- **R-2.** `workspaceRequestGeneration` drops a superseded snapshot before it is applied, before reconcile, and in the error path.

### D-15 Trace (Request Strength)

- **Where strength comes from:** `SkillService.resolveSkillScope` → `skillRequestStrengthForScope` at each call site (Codex, Claude, ACP/Grok, AGY). The materializers never read `skillScope`, and the parameter is required, so the type checker enforces every caller.
- **Rule 1:**
  - Shared materializer: `reconcileResolved` classifies a non-symlink or foreign link as `workspace-owned`. `descriptorForOutcome` then throws for a strong request and logs `skipped-workspace-owned` for a weak one. Each joiner applies its own strength.
  - AGY: `workspaceEntryExists` → weak requests skip, strong requests throw `AGY_SKILL_NAME_COLLISION`, as before.
- **Rule 2 A:** a weak request that meets any entry with a different source logs `skipped-held-by-other-run` and returns null.
- **Rule 2 B:**
  - A strong request that meets any strong holder throws `sourceCollisionError`.
  - If only weak holders exist, it waits while the entry is `acquiring`, then calls `yieldToConfigured`. That method keeps the entry exclusive (`acquiring`) for the whole switch, merges the holders, re-points through `replaceOwnedLink` (rename-over, with an unlink + link fallback for rename-unsupported codes), and logs `yielded-to-configured`.
  - On failure, `restorePrevious` drops the joiners and restores the previous source, releasing the entry if no holders remain.
- **Release (IC-1):** keyed by holder id and removed from the entry. The link is removed only when no holder remains, and only while it still points at the entry's current source (`removeLinkToSource`).
- **Structure:**
  - Link operations moved to `workspace-skill-links.ts`, which never decides ownership. The materializer (395 effective lines) owns the registry.
  - The strength type and mapping sit in `skill-request-strength.ts`.
  - Server docs were updated in `docs/modules/skills.md`.

### Round 3 Candidate Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-08 | The D-14 marker has no timeout; a send accepted but never activated stays shielded from reconcile | D-14 | An accepted `SEND_MESSAGE` that the server never activates | The stream stays connected and server status events still arrive. Terminate, close and failure all clear the marker. | D-14 defines the clear paths without a timeout; ARCH-REV-006 Pass | Reject | No supported scenario shows a stuck state with a consequence; design-approved |
| C-09 | The CR-002 catalog request is not retried after a catalog load error | SCN-007 | Catalog query failure | The thinking control stays hidden until the catalog loads | Code comment L83 | Reject | Infrastructure failure; out of scope by default |
| C-10 | If the `unlink` + `symlink` fallback in `replaceOwnedLink` fails partway, the path has no link while the registry says the previous source | D-15 B | A filesystem error mid re-point on Windows | Weak holders lose the path until release, which sees `missing` and does nothing | `workspace-skill-links.ts` L134–L135 | Reject | An infrastructure failure inside an explicitly exclusive phase; the restore is otherwise sound |
| C-11 | Direction A skips when the holder's acquisition later ends `absent`, so the weak run gets no copy | D-15 A | Concurrent weak and different-source acquisitions of a `reconcile-discoverable` request | Narrow timing | Code L170–L173 | Reject | Contrived timing; no independent supported workflow |
| C-12 | After merging the advanced `origin/personal`, the upstream `tests/e2e/runtime/agy-native-image-codex-skill.e2e.test.ts` needs `skillRequestStrength` to type-check | Engineering contract (build) | Finalization merge | Compile error in one upstream test only | Implementation handoff note | Promote (delivery note, non-blocking) | Delivery must add the argument when merging; runtime is unaffected |

## Round 4 Review (IR-004 / D-16)

### Scope

- Code commit `9d65adf6e` (web only; 17 files, +382/−48). The ticket commit `e9f2ce399` was read as context.
- Delivery had already merged `origin/personal` (`7aa53519b`) and applied the C-12 fix (`4b440e719`). Neither is part of this delta.
- The uncommitted docs edits owned by delivery and the upstream ticket files are out of scope.
- Classification: the delta is Small/Low, and the package stays Large/High (confirmed).

### Basis

- Behavior: REQ-021 and AC-018 (BEH-003, SCN-002).
- Scenario: a Supported Normal Scenario, confirmed by the user through UVF-001 (bare `opus` next to the launch form's `claude-opus-5-5 · Opus 5.5 · Recommended`).
- Design: D-16 at SR-012.

### D-16 Trace

| D-16 Rule | Implementation Evidence | Status |
| --- | --- | --- |
| One option builder for both paths (AR-009) | `useChatModelCatalog.toChatModelOption` is the only producer of `{ label, secondary, recommended }`. It prefers the catalog record, then `existingRunChoiceLabelInput(runChoice)`. It is used by `modelGroups` (the catalog, search, and the draft footer through `findModel` → `modelLabel`) and by `chatRunModelControls` `fixedModels`, whose persisted `modelLabel` reads `match.label`. | Confirmed |
| Shared label policy with no Chat-specific logic | `label` = `getModelSelectionOptionLabel`, `secondary` = `getModelSelectionOptionDescription` (`utils/modelSelectionLabel.ts`). `recommended` comes from `selectionPresentation.recommended` or `runChoice.recommended`. | Confirmed |
| Shared mapping moved; the local copy is removed | `existingRunChoiceLabelInput` is exported from `modelSelectionLabel.ts`. `RuntimeModelConfigFields.vue` imports it, and the local `choiceLabel` is gone. V-L5 has a regression test. | Confirmed |
| Shared order with no duplicate comparator | `compareRecommendedFirstBy<T>(labelOf)` is exported. `buildModelSelectionGroups` uses it via `compareRecommendedFirst`, and Chat via `orderChatModelOptions`. It applies to Claude Agent SDK only, per group, on both paths. | Confirmed |
| One search predicate | `matchesModelQuery` (identifier, label, display name, canonical name, secondary, provider, runtime) serves `search` and `filterOptions`. The inline predicate in `ChatModelMenu.vue` is removed. | Confirmed |
| One-line truncation plus full text | `ChatModelOptionLabel.vue` truncates the label with the badge on one line, and the secondary on its own truncated line. `chatModelOptionFullText` supplies `title` and `aria-label` for rows and search results. The trigger is `max-w-[20rem]` with truncated spans, its title is `label · runtime`, and a locked trigger keeps the UXJ-007 lock tooltip (the label stays in `aria-label`). | Confirmed |
| Badge reuses the launch-form style | The same `SearchableGroupedSelect` badge classes, with the new `chat.model.recommended` key (en, zh-CN). | Confirmed |
| Removals | `ChatModelOption.name` and `.title` are gone, with no identifier-as-label residue (grep). The inline predicate and the local `choiceLabel` are removed. | Confirmed |
| Unchanged | Selection identity (`llmModelIdentifier`), the D-08 lock, D-12 last-used, the menu structure, and launch-form and gear-editor output. | Confirmed |

### Round 4 Candidate Gate

| Candidate ID | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-13 | A locked trigger's `title` shows the lock reason rather than the full model label | UXJ-007 (lock tooltip required) | Reject | The spec requires this tooltip. The full label remains in `aria-label` and is visible unless truncated. |
| C-14 | The `{ modelIdentifier }` fallback, used when neither a catalog record nor a run choice is given | D-16 | Reject | Not reachable: both call sites always pass one of them. |
| C-15 | `findModel` and `modelCount` rebuild and sort the groups on each call | DS-006 | Reject | Trivial list sizes (10–20 models); no evidenced cost. |

### Validation

- The reviewer reran the targeted suites under `LANG=en_US.UTF-8`: 14 files, 74 tests, all passed. These include `useChatModelCatalog.spec.ts`, the V-L2 tests in `chatRunModelControls.spec.ts`, and the `modelSelectionLabel`, `modelSelectionOptions`, `RuntimeModelConfigFields` (V-L5) and `agentTeams` specs.
- Implementer evidence: live V-L1..V-L4 against the real catalog; the full suite shows the 4 baseline files; vue-tsc and the guards are clean.
- Size: `useChatModelCatalog.ts` has 167 effective lines, `chatRunModelControls.ts` 183, and `ChatModelMenu.vue` 312 (it shrank).
- The `TokenUsageMeterPanel.spec.ts` failure under `de_DE` comes from the merged `origin/personal`. It is locale-dependent and unrelated.

## Review Scorecard (Mandatory)

- Overall score: 9.3 / 10 (93 / 100). This is a simple average, shown for trend only. Rows marked (R3) were re-validated in round 3. Round 4 (D-16) re-validated priorities 3, 5, 7, 8 and 10: the shared builder, comparator and predicate remove the divergent Chat labelling without new duplication, so no score changes.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity (R3) | 9.4 | The D-14 marker lifecycle sits on the standalone send spine with explicit set and clear points. D-15 strength flows from SkillService through the runtime to the materializer. | Route sync still relies on watcher flush ordering. | — |
| 2 | Ownership Clarity and Boundary Encapsulation (R3) | 9.5 | `agentRunStore` owns the marker and reconcile only queries it. The materializer registry is the single path authority, the links class owns no policy, and runtimes never read `skillScope`. | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | `requestStrength` is a required, closed union; release is keyed by holder. | `MaterializedWorkspaceSkill.sourceRootPath` can be stale after a re-point (documented). | — |
| 4 | Separation of Concerns and File Placement (R3) | 9.2 | Link operations were extracted to `workspace-skill-links.ts`, and the materializer is 395 effective lines. | `voiceInputStore.ts` is still at 500 lines. | Split the voice store before its next growth. |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | The registry entry phases form a discriminated union, and holders carry their strength. | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | Dispositions and names match D-15. | The round-1 formatting nit (`=(link`) remains. | Fix on the next touch. |
| 7 | API/E2E Readiness (R3) | 9.3 | Unit tests cover V-A..V-E, joiner strength, the failed re-point restore, each D-14 clear path and R-2. The reviewer reran 16 server files (225 tests) and 28 web files (272 tests). | The live resend loss was intermittent before the fix; the probe should be rerun at volume. | API/E2E: rerun C05, C07 (×14) and V-A..V-E. |
| 8 | Runtime Correctness And Behavioral Fidelity (R3) | 9.2 | CR-002, CR-003 and CR-004 are resolved in code, with live evidence. The failure paths restore state. | The Windows fallback for `replaceOwnedLink` is not exercised live. | API/E2E where feasible. |
| 9 | No Backward-Compatibility / No Legacy Retention (R3) | 9.5 | The SR-008 `submissionPending` guard was removed cleanly, and the CONFIGURED fail-fast paths are unchanged. | — | — |
| 10 | Cleanup Completeness (R3) | 9.2 | The superseded guard is removed, and CR-001 was removed by API/E2E (pending test review). | The formatting nit from round 1 remains. | — |

## Findings

- CR-001..CR-004: resolved (see CRR-002..CRR-004).
- Round 4: no findings. C-13..C-15 were rejected.

## Classification

- N/A. The review passed.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer`, per the handoff rules. After that: the proportional test-code review if durable tests change, then delivery (user verification of UVF-001).

## Residual Risks

- RSK-006 (accepted): the Codex reload tooltip may include the context-file reference section.
- The D-14 marker has no timeout (design-approved).
- The Windows re-point fallback is unit-tested only.
- The hand-applied `generated/graphql.ts` delta should be reconciled by a future codegen run.
- Voice dictation is not automatable.
- The `TokenUsageMeterPanel.spec.ts` failure under non-English locales comes from upstream `origin/personal`, not from this ticket.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 4, IR-004 / D-16)
- Supported Product Scenario Gate: `Pass` (SCN-002; UVF-001 user-confirmed)
- Material-Premise Gate: `Pass` (C-13..C-15 rejected)
- Score Summary: 9.3/10, with every category at 9.2 or above.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: D-16 is implemented as designed. Chat model labels, order, badge and search now use the launch form's shared policy on both the catalog path and the persisted-run path.

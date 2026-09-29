# Code Review Report — chat-interface-entry

## Review Round Meta

- Review Entry Point: `Implementation Review`. This is round 11 and the latest authoritative round. It covers IR-010 (the CR-010 / UF-05 Local Fix). Round 10 (CRR-014) was the API-REV-006 failure-origin review; round 9 covered IR-009.
  - Earlier round sections below remain as history for unchanged areas. The D-15 Rules 2–3 content in round 3 is **superseded** by D-19.
- Requirements Doc Reviewed As Context: `requirements-doc.md`, SR-016 delta (REQ-022/023/024, AC-019/020/021, SCN-010, DEC-017, user-approved 2026-09-29), plus the earlier baselines.
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AF-36, Codex native discovery)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-015, SR-016, SR-017)
- Design Spec Reviewed As Context: `design-spec.md` at SR-017 (D-18, D-19)
- Supplemental Task Artifacts Reviewed As Context: R3 `ui-ux-spec.md` (VIS-026 for D-18). The D-19 pop-up was designed in the design spec (Product design was waived by the user).
- Relevant Solution Revision IDs: SR-015, SR-016, SR-017
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-013 Pass, after ARCH-REV-012 AR-013)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-011, ARCH-REV-012, ARCH-REV-013
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`, with `implementation-evidence/README.md` (ir8-*)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-007, IR-008, IR-009
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-015`
- Current Review Round: 11 (IR-010: `a98a15d05` code, `e58fb160a` ticket)
- Failure-origin context: API-REV-006 (Fail, 94%) at HEAD `a65f58463`; UF-05 (Low).
  - Evidence: `api-e2e-evidence/round6/probe-claude/C22e-tier4-toast.png`, `round6/probe-claude-ir9/C22e-tier4-toast.png`.
  - Command: `chat-entry-live-probe.mjs` case C22 with `--owned-codex-home` (Claude); the reports are `api-e2e-execution-coverage-report.md` ("Round 6") and `api-e2e-revision-record.md` (API-REV-006).
- Trigger: implementation_engineer handoff for IR-008 (commits `f4864638b`, `ec31ff371`, `be6c8977d`, ticket `10556948f`).
- Prior Review Round Reviewed: round 7 (CRR-010 failure-origin Fail); earlier rounds 1–6
- Latest Authoritative Round: 11
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

## Round 5 Review (IR-005 / D-17)

### Scope

- Code commit `1f5fd8004` (web only; 48 files, +1038/−912). The ticket commit `1671f722b` was read as context.
- Classification: the delta is Medium, and the package stays Large/High (confirmed).
- The API/E2E-owned `tests/e2e/chat-entry-live-probe.mjs` still targets removed selectors (`chat-run-view`, `chat-run-status`, `chat-runtime-fixed-note`); it is noted for API/E2E.

### D-17 Trace

| D-17 Element | Implementation Evidence | Status |
| --- | --- | --- |
| Frame: `/chat?id` renders `WorkspaceAdaptiveLayout`; `/chat` stays `ChatNewSurface`; D-05/D-13 routing unchanged | `pages/chat.vue` (`chat-run-frame`), with `useWorkspaceFileContentVisible` shared with `/workspace` | Confirmed |
| Restored: `AgentWorkspaceView` and the standalone branch, `showSelectedRunConfig` | Faithful to base `fcd3e83a4`. Only ＋ changed: `startNewChat({ agentDefinitionId, workspaceRootPath })` + `/chat` (UIS-013 R3). ⚙ calls `center.showConfig()`. | Confirmed |
| ⚙ on `temp-*` drafts (AR-011) | `RunConfigPanel.isDraftSelection` → `DraftRunConfigEditor` (`AgentRunConfigForm` on `context.config`, `workspace-locked`, no `existingRunConfigStore`). The back arrow skips `existingRunConfigStore.clear()` for drafts. | Confirmed |
| Existing-run workspace display (VIS-017 local fix) | `ExistingRunConfigEditor.agentWorkspaceSelection` resolves a history-derived id to the known workspace with the same root | Confirmed |
| Header: standalone run-summary title (≤42) | `useStandaloneRunTitle` (the first user message via `resolveFirstUserMessageSummary`, else the history summary). The org direct-agent title is unchanged. | Confirmed |
| Box: optional `skillTagging` (standalone only) | Wired through `AgentWorkspaceView` → `AgentWorkspaceSurface` → `AgentEventMonitor` → `AgentUserInputForm` / `AgentUserInputTextArea`. The `/` menu comes from `useSkillTagMenu` + `ChatSkillMenu`, and chips from `SkillTagChips`. Team/org pass nothing, so their root clipping and `hasDraft` rules are unchanged. | Confirmed; dependency placement is CR-006 |
| One shared right-panel visibility | `useRightPanel` has one `ref(true)`; the scope and `setActiveRightPanelScope` are removed | Confirmed |
| Tab rule (AR-010) | `useRightSideTabs`: `contextualScopeKey`, `lastAppliedScopeKey`, the pending explicit tab (consumed at mount), and a mounted-host count. `useContextualDefaultTab` runs on mount and on scope change; strip and tab-bar clicks use `selectTabExplicitly`; the `visibleTabs` watcher is immediate. | Confirmed |
| Removals | `ChatRunView`, `ChatRunHeader`, `chatRunModelControls` and its spec, the `ChatModelMenu` fixed/locked modes, the `ChatThinkingControl` locked mode, the catalog `runChoice`/`filterOptions`/`catalogModelFor`, the chat panel scope, and 10 chat keys. No source residue (grep). The New chat uses `chatDraftModelControls`. | Confirmed |

### Round 5 Candidate Gate

| Candidate ID | Observation | Scenario / Contract | Independent Trigger And Forward Path | Evidence | Disposition | Reason / Response |
| --- | --- | --- | --- | --- | --- | --- |
| C-16 | The restored global config mode (`workspaceCenterViewStore.mode`) is not reset when Chat shows a different run, so a new chat opens on its settings panel instead of its conversation | SCN-001 / SCN-008; REQ-002/AC-002 ("streams in the chat view"), REQ-012 | The user opens ⚙ on chat A (UXJ-007 R3), then starts a new chat with the Chat pencil or the tree `+` without pressing back, and sends. `launchAgentChat` → `registerDraftRun` (`selectRunWithoutShellNavigation`, no `showChat`) → first send → `/chat?id=P` → `pages/chat.vue.ensureRunOpen` (P is mounted, so selection is unchanged) → `WorkspaceAdaptiveLayout.showSelectedRunConfig` = `selectedRunId && isConfigMode` is **true** → `RunConfigPanel` (a locked `ExistingRunConfigEditor` for the live P). The same happens on a failed first send (`/chat?id=temp` → `DraftRunConfigEditor` instead of the error). | Resets exist only in `agentSelectionStore.selectRun/selectTeamDraft/clearSelection`, `RunConfigPanel.showConversationView` and the `AgentOrgWorkspaceView` identity watcher (L156). The pencil, `startPresetChat`, `launchAgentChat`, `registerDraftRun`, `ensureRunOpen` and `promoteTemporaryId` never reset `mode` (grep). This is a regression of D-17 restoring config mode onto the chat route, whose launch and open paths use `…WithoutShellNavigation`. | **Promote → CR-005** | Ordinary sequential actions, no timing. The consequence is visible: the first reply is hidden behind a locked settings form. |
| C-17 | `composables/agentInput/useSkillTagMenu.ts` imports `~/composables/chat/useChatPopover` | Design Dependency Rules (L561–L562): `composables/agentInput/*` → "Forbidden: any import from `chat` (`composables/chat`, …)" (AR-002) | Static dependency | `useSkillTagMenu.ts` L2–L3. D-17 explicitly approves reusing `ChatSkillMenu` (`components/chat`), not a `composables/chat` import. | **Promote → CR-006** | An engineering-contract violation that recreates the agentInput → chat direction AR-002 removed. |
| C-18 | The tab re-defaults to Activity after a draft's temp → permanent promotion (the scope key changes) | AR-010 | Promotion | Handoff "accepted consequence" | Reject | Follows the approved rule (scope keyed by run id). Cosmetic. |
| C-19 | `pendingExplicitTab` set while no host is mounted could apply at a later, unrelated mount | AR-010 | A strip click opens the panel in the same action, so the pending tab is consumed at once | `RightSidebarStrip.selectTab` → redock/open | Reject | No supported path leaves it pending |
| C-20 | Design-spec file-mapping residue: rows still say `AgentWorkspaceView.vue` "Remove" and keep the CR-002 run-footer row, contradicting D-17 L321–L327 | Design artifact | — | `design-spec.md` L700, L719 | Reject as a code finding | Noted to the Solution Designer (non-blocking document cleanup) |

### Validation

- The reviewer reran 58 targeted web files: 441/442 tests pass. The single failure is `pages/__tests__/org-definition-navigation.spec.ts`, one of the 4 documented baseline files.
- Implementer evidence: the full suite shows only the baseline failures (3369 passed); vue-tsc and the guards are clean; live checks A–K pass (ir5-*).
- Size (effective lines): `AgentUserInputTextArea.vue` 270, `RunConfigPanel.vue` 425, `useRightSideTabs.ts` 116, `useSkillTagMenu.ts` 89. All are under 500, and the >220 deltas are cohesive.

## Round 6 Review (IR-006 / CRR-008 Local Fix)

- Scope: `59a20f21b` (web only; 16 files, +142/−66).

| Finding | Verification In Code | Status |
| --- | --- | --- |
| CR-005: config mode leaks into the next chat | See the notes below. | Resolved |
| CR-006: `agentInput` → `composables/chat` import | `useChatPopover` became `composables/popover/useAnchoredPopover.ts`, a neutral owner used by the Chat menus and `useSkillTagMenu`. `detectMenuTrigger`, `rankSkills` and `SkillTagOption` moved to `utils/skills/skillTagMenu.ts`. A grep of `components/agentInput`, `composables/agentInput` and `voiceInputStore` finds only `components/chat/ChatSkillMenu.vue` and `SkillTagChips.vue` (the reuse D-17 permits), and no `composables/chat`, `services/chat` or `chatDraftStore` imports. `useChatPopover` has no residue. | Resolved |

CR-005 verification notes:
- `pages/chat.vue` records the context the settings were opened for when `isConfigMode` turns on. Whenever Chat displays a different context while in config mode, it calls `showChat()`; the immediate watcher also covers a mount with settings left open for another run.
- Traced paths:
  - ⚙ on A → pencil → `/chat` (no context, so no-op) → send → `/chat?id=P`, and P ≠ A → conversation.
  - A failed first send → `/chat?id=temp` → conversation, with the error visible.
  - A temp → permanent promotion keeps the same context object, so the settings stay.
  - Team quick path: `launchTeamChat` calls `showChat()` before launching.
- Tests: 3 new cases in `pages/__tests__/chat.spec.ts` (two fail without the fix, per the handoff), and a Team reset assertion in `chatLaunchService.spec.ts`. Live check L covers a successful and a failed first send.

Round 6 candidates:
- C-21 (Reject): remounting `/chat?id=A` with ⚙ left open for A resets to the conversation, because `settingsContext` is page-scoped. This is conservative, and every route back into Chat via the tree already resets through `selectRun`. No supported scenario is harmed.

Validation: the reviewer reran 42 targeted web files, and all 345 tests passed. Implementer evidence: the full suite shows only the 4 baseline files (3374 passed); vue-tsc and the guards are clean.

## API/E2E Failure-Origin Review (Round 7, API-REV-005)

### Failure Scenario Basis

| Failure | Approved Behavior / Contract | Scenario Validity | Independent Trigger And Forward Path | Still Approved? |
| --- | --- | --- | --- | --- |
| UF-04 | REQ-017/AC-014; D-15 invariant: "Configured launches therefore never regress because an ALL_INSTALLED chat is live"; the established contract that a configured skill name that cannot be resolved is "recorded as an unresolved binding for workspace reconciliation" and the run starts | Supported Normal Scenario. The user imports an agent package (Settings → Agent Packages) whose team coordinator's configured skill is bundled in a sibling member's folder. With a Daily Assistant chat live in the default temp workspace, the user starts the team (Chat `@` or catalog). This worked before the ticket, and the team starts once the Daily Assistant chat is terminated. | Codex bootstrapper → `SkillService` (CONFIGURED; name resolution misses the definition-root bundle, as in AF-26) → `reconcile-unresolved` request → `WorkspaceSkillMaterializer.reconcileUnresolved`. The registry entry for `<ws>/.codex/skills/<name>` is `ready`, held only by the weak Daily Assistant run. The code falls through to `reconcileUnavailable(…, sourceRootPath=null)` → `inspectPath` → `live-different-symlink` → `pathStateCollisionError` → prepare fails. | Yes |
| UF-03 | REQ-011 R3 / UXJ-007 R3; VIS-026 (live ⚙ shows the disabled thinking values) | Supported Normal Scenario: open ⚙ on a fresh live chat launched with the model's default thinking | New chat default thinking → `llmConfig: null` (D-16/DEC-009 "choosing a model applies that model's default thinking") → run recorded with `llmConfig: null` → live ⚙: `ExistingRunConfigEditor` → `AgentRunConfigForm` (`historical-model-config` for the unchanged model, read-only) → `ModelConfigSection.showMissingHistoricalConfig` = `readOnly && missingHistoricalConfig && modelConfig == null` → "Not recorded for this historical run". Offline, the editable section emits the defaults. | Yes |

### UF-04 — Origin: `Design Impact` (D-15 incomplete for unresolved configured requests), with an earlier review gap

- Source evidence:
  - `workspace-skill-materializer.ts` L349–L391: `reconcileUnresolved` waits only on `releasing` and `acquiring` entries. For a `ready` entry it calls `reconcileUnavailable` with no source. There, any live link that is not "same source as null" is classified as `live-different-symlink` and throws.
  - This path is unchanged from base (`fcd3e83a4` L265–L297). D-15 explicitly lists "`reconcile-discoverable` / `reconcile-unresolved` handling" as **Unchanged**.
  - ALL_INSTALLED is what makes the path reachable: a weak run now holds a registry-managed link for every installed name in its workspace, including skills bundled in agent folders that CONFIGURED name resolution cannot resolve.
  - Before the ticket no weak link existed, so the unresolved request saw `missing` and the run started.
- Why this is Design Impact and not a local fix:
  - The implementation follows the reviewed D-15 rules exactly. Rules 1 and 2 cover resolved requests only, and the design explicitly keeps unresolved handling unchanged. Yet D-15's own invariant promises configured launches never regress because of an ALL_INSTALLED run.
  - The missing piece is a policy decision: what an unresolved strong request does when the path is a materializer-owned link held only by weak holders.
    - Possible options: treat it as discoverable and skip (the configured agent then finds the same-named skill, which here is the very same bundled skill); join as a holder; or keep fail-fast, which would contradict the invariant.
    - The strong-versus-strong case (another configured run holding the name) is pre-existing and can stay unchanged.
  - Because a design invariant conflicts with the reviewed rule set, this is classified as `Design Impact`, per the review rules.
- Consequence: an imported team or agent that worked before fails to start next to a live Daily Assistant chat in the same workspace. Because the temp workspace is the Chat default, this is likely in normal use.
- Review gap: **Yes**, partial. In CRR-003 I read `reconcileUnresolved` as "unchanged per D-15" and did not check it against the new weak-held links. The throwing branch for a live link with a null source was visible in source. The architecture review had the same blind spot. The Runtime Correctness rationale is corrected below.

### UF-03 — Origin: implementation (Local Fix, Low); not a review gap

- Source evidence: `ModelConfigSection.vue` L208–L212 (`showMissingHistoricalConfig`) and `AgentRunConfigForm.vue` L27 (`historical-model-config` for an unchanged existing-run model).
  - Chat launches with `llmConfig: null` for default thinking.
  - The launch form's editable `ModelConfigSection` emits schema defaults automatically, so launch-form runs record an explicit config.
- Consequence: a fresh live chat's ⚙ labels its thinking, reasoning effort and fast mode as "Not recorded for this historical run", instead of showing the disabled values as in VIS-026. It is cosmetic and misleading, and does not affect behavior.
- Proportionate response (owner's choice): either record the model's schema defaults as an explicit `llmConfig` when a New chat launches with default thinking (matching the launch form, so the recorded config is truthful), or have the existing-run editor present schema defaults for a live run whose recorded config is `null`. Only the first keeps "historical" meaning historical.
- Review gap: No. The label rule is pre-existing editor behavior that only shows on a live run with a null recorded config; it was not reasonably detectable from the changed source.

### Affected Score Rationale (round-6 scorecard otherwise carried forward)

- Priority 8, Runtime Correctness And Behavioral Fidelity: 9.2 is corrected to 8.5 because of the UF-04 review gap (the D-15 invariant broken for unresolved configured requests) and UF-03. The other rows are unchanged.

## Round 8 Review (IR-007 / IR-008: D-18, D-19)

### Scope

- `f4864638b` (D-18 plus D-15 Rule 3, which is later removed), `ec31ff371` (server D-19; 40 files, +1596/−1187) and `be6c8977d` (web D-19; 23 files).
- The uncommitted API/E2E-owned probe edits and the ticket files are out of scope.

### D-18 Trace (CR-008 / UF-03)

- `ModelConfigSection.applyDefaultsIfNeeded`'s non-thinking default logic moved unchanged into the pure `utils/llmConfigSchema.applyModelConfigSchemaDefaults`; the equality guard is preserved.
- `llmThinkingConfigAdapter.getDefaultThinkingConfig` writes the effective default thinking keys, following the existing Claude-budget and typed-effort rules.
- `chatDraftStore.explicitChatModelConfig` stores the schema defaults plus the default thinking values on every model application. A preset's own thinking choice is kept, and a model without a schema keeps `null`.
- The team quick path reuses `context.config.llmConfig`.
- Status: CR-008 resolved (IC-3 was verified live per the handoff).

### D-19 Trace (CR-007 / UF-04; REQ-022–024; AR-013)

| D-19 Element | Implementation Evidence | Status |
| --- | --- | --- |
| Single catalog, tiers 1–4, first copy per name wins | `skill-catalog.ts`: `listSkillCatalogSources` (tier 1 skills dir; tier 2 app data dir + package roots, de-duplicated; tier 3 added folders; tier 4 runtime-default folders, always last); `buildSkillCatalog` (realpath de-duplication of folders; `conflict` vs `shadowed_runtime_default` issues). `runtime-default-skill-folders.ts` uses realpath equality and honors `$CODEX_HOME`. | Confirmed |
| One resolution for every scope | `SkillService.resolveConfiguredSkillBindingsForAgent(Detailed)`: ALL_INSTALLED takes the enabled catalog records; CONFIGURED takes `catalogLookup(records)`. The resolver's contextual lookup is kept only for `application_owned` agents. AGY detailed bindings are built from catalog records through the existing provenance checks. | Confirmed |
| Every name-based operation uses the catalog (AR-013) | `getSkill` = `resolveCatalogRecord(name)?.skill`, and `getSkills` uses the catalog map. `findGlobalSkillLocation`, `findCatalogSkillLocation`, `getGlobalSkill`, `loadSkillFromPath`, `resolveGlobalSkill`, `globalCandidatePaths` and `searchDirectoryRecursive` are removed (grep shows no residue). | Confirmed |
| Import validation before commit (REQ-023) | `validateIncomingSkills` excludes the incoming source's own folders from the existing set, so an in-place update or reload doesn't conflict with itself.<br>Callers:<br>• `addSkillSource`: asserted before persisting.<br>• Local import: asserted before registering the root.<br>• GitHub import: asserted inside the try whose catch removes the root, the record and the download.<br>• Update: the staged revision is swapped into the install path with the old revision backed up outside any catalog source; asserted, and rolled back on rejection.<br>• Reload: asserted, keeping the registration (R-3).<br>• `createSkill`: checked against tiers 1–3. | Confirmed |
| Error contract | `SkillNameConflictError` → `withSkillNameConflictMapping` → `GraphQLError` with `extensions { code: 'SKILL_NAME_CONFLICT', conflicts }` on createSkill, addSkillSource, import, update and reload. New `skillNameIssues` query. | Confirmed |
| Safety net (REQ-024) | Issues are logged at catalog load (de-duplicated by signature), and the Skills page banner shows the `skillNameIssues` rows. | Confirmed |
| Codex native discovery (AF-36) | `planWorkspaceSkillRequests` treats a skill as `reconcile-discoverable` only when every `skills/list` path for the name equals the catalog copy's realpath. Otherwise it uses `expose-resolved` and logs `codex-runtime-duplicate`. | Confirmed |
| Materializer simplification | Only Rule 1 remains (`workspaceCollisionPolicy`: `fail` for CONFIGURED, `prefer_workspace` for ALL_INSTALLED). Strength, holder counts, re-pointing, Rules 2/3, `skill-request-strength.ts` and the rename fallback are removed. `sourceCollisionError` is kept only for an out-of-band catalog change. | Confirmed |
| UF-04 resolved | `desk-alpha` (tier-2 bundle) now resolves from the catalog for the configured coordinator. Its `expose-resolved` request has the same source as the Daily Assistant link and joins its holders, so the unresolved branch is no longer reached. V-F passes live on Codex, Claude and Grok. | Confirmed (CR-007) |
| Web pop-up, notices, banner | `SkillNameConflictDialog` (on `common/Modal`, mounted once in `app.vue`); the stores rethrow `SkillNameConflictError` parsed from `extensions.conflicts`; `skillNamesStore.runWithSkillNameChecks` shows the dialog on conflict and a tier-4 toast from a before/after issues diff; `SkillNameIssuesBanner` on `SkillsList`. | Confirmed |

### Round 8 Candidate Gate

| Candidate ID | Observation | Scenario / Contract | Disposition | Reason |
| --- | --- | --- | --- | --- |
| C-22 → **CR-009** | Agent Org-owned agents' private skill folders (`agent-orgs/<org>/agents/<a>/skills/<n>`) are neither scanned into tier 2 nor resolved contextually (only `application_owned` is), so a configured name that existed only there becomes unresolved. At base it resolved through `sourceInfo.agentDirPath` (`file-agent-definition-provider.ts` L270). | Unclear: REQ-022/D-19 scope tier 2 to "agent/team packages", and no docs (`agent_orgs.md`), tests or known data use an org-agent `skills/` folder (implementer's flag 4) | **Promote (CRR-012)** | The user confirmed on 2026-09-29 that an Agent Org private agent with its own `skills/` folder is a normal, supported layout, and that orgs, which can contain agents and teams, must behave like teams. It was previously held: not scored or routed as a finding. The Solution Designer or the user should confirm whether org-owned agents may ship private skills. If yes, it is a Requirement Gap/Design Impact (add `agent-orgs/*` to tier 2); if no, it is accepted. |
| C-23 | `loadCatalog()` rescans every source on each name-based call (`getSkill`, `resolveCatalogRecord`, issues) | DS-008 | Reject | Same order of work as the pre-existing `listSkills()`; there is no evidenced latency problem at the real catalog size (78 skills). Note: caching can be considered later. |
| C-24 | A New chat sent before `resolveDefaultModel` applies the model would still record `llmConfig: null` | D-18 | Reject | Artificial timing: the model is applied before the menu shows it, and the send is enabled only once a model is set. |
| C-25 | `llmConfigSchema.ts` ↔ `llmThinkingConfigAdapter.ts` import cycle | Engineering hygiene | Reject | Function-level use only (commented); no load-time evaluation dependency. |
| C-26 | The tier-4 notice is derived from a before/after `skillNameIssues` diff, not from mutation return values (local decision 1) | D-19 ("successful mutations **may** return `skillNameNotices`") | Accept | Within the design's latitude; one extra query per import action. |
| C-27 | `createSkill` reports an existing copy in the AutoByteus skills folder as a conflict (local decision 2) | REQ-023 | Accept | Consistent with "no duplicates enter"; the error message names the folder. |

### Validation

- The reviewer reran:
  - server: 53 targeted files, 617/622 passed. The 5 failures are baseline: `codex-tool-log-correlation` (4) and `package-root-summary` (1, a pre-existing upstream field; neither file changed in this ticket; listed in the handoff baseline).
  - web: 163 files, 1176/1176 passed.
- Implementer evidence: server unit and skill integration failures equal the stashed baseline exactly (21 + 10); web 3402 passed (4 baseline files); Electron 187 passed; vue-tsc and the guards are clean; live V-F, D-19 P1/AR13/I1–I5/C1 and UI U1–U5.
- Size (effective lines): `skill-service.ts` 484 (close to the limit), `agent-package-service.ts` 455, `codex-thread-bootstrapper.ts` 401, `configured-agent-skill-resolver.ts` 335, `workspace-skill-materializer.ts` 313 (shrank), `skill-catalog.ts` 165. All are under 500.

## Round 9 Review (IR-009 / D-19 Agent Org amendment, SR-018/SR-019)

- Scope: `0be1dd47e` (server; 16 files, +572/−79). The ticket commit `a65f58463` was read as context.
- Basis: ARCH-REV-015 Pass on SR-018 (DEC-017a, the user's direction that Agent Org agents' own skills must work like teams'; skills belong to agents, with no org-level folder) and SR-019 (AR-014 option (a)); AF-37.

| D-19 Org Element | Implementation Evidence | Status |
| --- | --- | --- |
| One correlation owner (AR-014) | `agent-org-owned-definition-correlation.ts` `correlateAgentOrgOwnedMembers` is pure. It holds the `org_local` + `refType` filter, the owned-id match, exactly-one handling (a malformed member is skipped only), the seen skip and the paths. It copies `seenDefinitionIds` rather than mutating it; the readers record the returned ids, which preserves the cross-org and cross-root skip. | Confirmed |
| Async reader unchanged in behavior; new sync reader | `listAgentOrgOwnedDefinitionSources` / `findAgentOrgOwnedDefinitionSource` keep their signatures. The refactor is behavior-preserving (the same `_`/non-directory filter and name sort, skip-on-unreadable, family directory and seen semantics). `listAgentOrgOwnedDefinitionSourcesSync` mirrors only the I/O, and parity tests guard it. | Confirmed |
| Tier-2 org layouts and order | `skill-discovery.getAgentOrgSkillLocations`: per root, `agents/*` → `agent-teams/*` → `agent-orgs/*`; orgs by name, each org's agents then teams by local name. Org agents contribute `<definitionDir>/skills/*`, and org teams go through the shared `getTeamSkillLocations` (team shared skills, then `agents/*/skills`). There is no org-level `skills/`. Only correlated org-owned folders are scanned. | Confirmed |
| Org roots | The app data dir source carries `orgRoot = config.getAgentOrgsDir()`; package roots and incoming validation default to `<root>/agent-orgs`. This matches the definition providers' `getReadOrgRoots`. | Confirmed |
| AGY provenance (SR-018 table) | Org agent → `agent_private` rooted at the agent directory; org-team shared → `team_shared` rooted at the team directory; org-team agent → `agent_private` rooted at the team directory. The existing layout checks are unchanged, and a test covers CONFIGURED and AGY bindings for each layout. | Confirmed |
| Import validation (REQ-023) | It reuses the same scanner through `validateIncomingSkillNames` → `scanSkillCatalogSource(definition_root)`. An org-only duplicate import is rejected (unit test plus the live `SKILL_NAME_CONFLICT` check). | Confirmed |
| No API ripple | Only `getAgentOrgsDir` is added to the catalog/service config shape; there are no `SkillService` or caller signature changes. There is no import cycle (the org config and parser modules don't import skills). | Confirmed |

Round 9 candidates:
- **C-28 (Reject).** Added skill folders (tier 3, `skill_path`) now also scan `<folder>/agent-orgs`. This is consistent with D-19 already scanning definition layouts inside added folders, and a missing directory yields nothing.
- **C-29 (Reject).** The catalog now also reads each org's `org-config.json` / `org.md` on every scan (see C-23). The real data has about 4 orgs, with no evidenced cost.

Validation:
- The reviewer reran 32 server unit files (skills, agent-org-definition, agent-packages, collaboration-definition-admission, agent-definition, agent-team-definition): 301/302 pass. The one failure is the baseline `package-root-summary`.
- Implementer evidence: 1380 unit tests pass with the same 21 baseline failures; integration/e2e has the same 10 baseline failures; the API/E2E-owned `skill-name-catalog-graphql.e2e` is 7/7.
- Live `ir9-org-probe`: org agent and org team-local agent run with their own skills on Codex, Claude and Grok (workspace links) and AGY (capsule); a duplicate org import is rejected with `SKILL_NAME_CONFLICT`.
- Not live: the AutoByteus native runtime (unit-covered) and a rendered Skills page (the same GraphQL list).
- Size (effective lines): `skill-discovery.ts` 204, `skill-catalog.ts` 174, source index 107, correlation 81, `skill-service.ts` 485 (+1; still close to the limit).

## API/E2E Failure-Origin Review (Round 10, API-REV-006)

- **Prior failures:** UF-04 (CR-007) and UF-03 (CR-008) are confirmed resolved live. C20 and DT-51 pass (V-F under D-19). C05 records `llmConfig` equal to the catalog schema defaults, and DT-50 shows live ⚙ disabled values, never "Not recorded". D-19 AC-019/020/021, AR-013 and DEC-017a pass on the repository, live-browser and desktop surfaces.

### UF-05 — the tier-4 notice toast renders beneath the Skill sources dialog

- **Approved behavior:** REQ-023 / AC-020 alternate ("a duplicate only against a runtime default folder succeeds, with a notice that the default copy is ignored"); D-19 web ("Tier-4 notices use the existing toast").
- **Scenario:** Supported Normal Scenario. The user adds a runtime-default folder (e.g. `~/.codex/skills`, the AF-36 layout) in Skills → Manage Skill Sources. This is the main tier-4 flow, and it runs inside that dialog.
- **Forward path:**
  1. `SkillSourcesModal.vue` L133 → `skillNamesStore.runWithSkillNameChecks(addSkillSource)`.
  2. It diffs `skillNameIssues` and calls `announceShadowedRuntimeDefaults` → `useToasts().addToast(…, 'info', 6000)`.
  3. `components/common/ToastContainer.vue` L2 has `fixed … z-[100]`, which is beneath the dialog's `.dialog-overlay` (`z-index: 1000`, `SkillSourcesModal.vue` L184).
- **Consequence:** the notice appears dimmed behind the overlay and auto-dismisses after 6 s, so the AC-020 notice is effectively unseen. It is Low severity because nothing is lost; the Skills banner and the Sources text still show the state.
- **Origin:** implementation defect (Local Fix → implementation).
  - `be6c8977d` raised `SkillNameConflictDialog` to `z-index: 1100` explicitly for this stacking (its L56 comment: "sits above the Skill sources dialog (1000) that can open it").
  - The tier-4 toast raised from the same dialog flow was not considered.
  - `ToastContainer`'s `z-[100]` is pre-existing and unchanged.
- **Proportionate response (owner's choice):** make the notice visible above the dialog, preferably by lifting the global toast layer above modal overlays (toasts are transient, top-most notifications). Alternatively, show the notice inline in the Sources dialog. Add a check (unit or the probe's C22e).
- **Review gap:** yes, minor. In CRR-011 I verified the dialog stacking comment but did not check the toast raised from the same modal flow; both files were in the diff context.

### Other API/E2E notes (not implementation findings)

- RD-01 test drift: five `tests/integration/agent-execution/**` stubs lacked `hasEffectiveSkills` after `770b14651`, and API/E2E fixed them. This is test code, left to the proportional test review.
- O-4..O-7 are non-blocking observations, recorded by API/E2E for delivery. C-22 (no real org `skills/` folders) remains informational.

## Round 11 Review (IR-010 / CR-010 Local Fix)

- **Change:** `ToastContainer.vue` moves the global toast layer from `z-[100]` to `z-[10000]` and adds `data-testid="toast-container"`. The comment is inside the root, so the component stays single-root. No other source changed.
- **Verification:**
  - A grep of `components`, `pages`, `layouts` and `app.vue` finds the highest other overlay at 9999; `z-[10000]` appears only in the toast container.
  - No higher z-index exists in the `assets`/`composables`/`utils`/`stores`/`services`/`plugins` style or TS sources.
  - The Skill sources dialog is at 1000 and the conflict dialog at 1100, so the tier-4 notice raised from the dialog flow now renders above it.
- **Check:** the new `components/common/__tests__/ToastContainer.spec.ts` statically scans every `.vue` for z-indexes at or above the toast layer (it would fail against the old `z-[100]`) and renders a toast in the layer. The reviewer reran it with the skills specs: 5 files, 18/18 passed. Implementer's rendered U6: `elementFromPoint` at the toast centre is the toast over the open Sources dialog.
- **Candidate C-30 (Reject):** toasts would also render above the full-screen server loading/shutdown overlays (9999). No toast is raised there today, and a transient notice above a loading screen is harmless.

## Review Scorecard (Mandatory)

- Overall score: 9.3 / 10 (93 / 100). This is a simple average, shown for trend only. The round history is in the row labels. **Round 8 (D-18/D-19)** restores Runtime Correctness to 9.2: CR-007 is resolved by a single catalog, so the special-case machinery was removed rather than added, and CR-008 is resolved. Priority 4 notes that `skill-service.ts` is at 484 effective lines. The other rows were re-validated unchanged.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity (R3) | 9.4 | The D-14 marker lifecycle sits on the standalone send spine with explicit set and clear points. D-15 strength flows from SkillService through the runtime to the materializer. | Route sync still relies on watcher flush ordering. | — |
| 2 | Ownership Clarity and Boundary Encapsulation (R3; R5 8.9 → R6 9.3) | 9.3 | `agentRunStore` owns the marker and reconcile only queries it. The materializer registry is the single path authority, the links class owns no policy, and runtimes never read `skillScope`. D-17 keeps the frame, ⚙ and panel ownership clear. | R6: CR-006 resolved. The popover and skill-tag helpers now have neutral owners; agentInput reuses only the D-17-permitted chat components. | — |
| 3 | API / Interface / Query / Command Clarity | 9.3 | `requestStrength` is a required, closed union; release is keyed by holder. | `MaterializedWorkspaceSkill.sourceRootPath` can be stale after a re-point (documented). | — |
| 4 | Separation of Concerns and File Placement (R3) | 9.2 | Link operations were extracted to `workspace-skill-links.ts`, and the materializer is 395 effective lines. | `voiceInputStore.ts` is still at 500 lines. | Split the voice store before its next growth. |
| 5 | Shared-Structure / Data-Model Tightness | 9.4 | The registry entry phases form a discriminated union, and holders carry their strength. | — | — |
| 6 | Naming Quality and Local Readability | 9.2 | Dispositions and names match D-15. | The round-1 formatting nit (`=(link`) remains. | Fix on the next touch. |
| 7 | API/E2E Readiness (R3) | 9.3 | Unit tests cover V-A..V-E, joiner strength, the failed re-point restore, each D-14 clear path and R-2. The reviewer reran 16 server files (225 tests) and 28 web files (272 tests). | The live resend loss was intermittent before the fix; the probe should be rerun at volume. | API/E2E: rerun C05, C07 (×14) and V-A..V-E. |
| 8 | Runtime Correctness And Behavioral Fidelity (R3; R5 8.6 → R6 9.2 → R7 8.5 → R8 9.2 → CRR-012 8.6 → R9 9.2 → R10 9.0 → R11 9.2) | 9.2 | CR-002, CR-003 and CR-004 are resolved in code, with live evidence. The failure paths restore state. D-17 is faithful otherwise. | R6: CR-005 resolved (settings are tied to their run's context). The Windows `replaceOwnedLink` fallback is not exercised live. | API/E2E where feasible. |
| 9 | No Backward-Compatibility / No Legacy Retention (R3) | 9.5 | The SR-008 `submissionPending` guard was removed cleanly, and the CONFIGURED fail-fast paths are unchanged. | — | — |
| 10 | Cleanup Completeness (R3) | 9.2 | The superseded guard is removed, and CR-001 was removed by API/E2E (pending test review). | The formatting nit from round 1 remains. | — |

## Findings

- CR-001..CR-009: resolved (CRR-002..CRR-013).
- CR-010 (UF-05): resolved in IR-010 (see Round 11).
- New findings: none.

## Classification

- N/A. The review passed.

## Recommended Recipient

- `/software_engineering_team/api_e2e_engineer`. Next is a C22e rerun (the tier-4 toast above the Sources dialog), then the proportional test review of the uncommitted API/E2E test changes (the new server e2e, the probe updates and the RD-01 stub fixes).

## Residual Risks

- `skill-service.ts` is at 485 effective lines.
- Catalog rescan cost (C-23, C-29).
- AF-36: a stale Codex default copy inside Codex runs.
- Grok and the AutoByteus runtime were not run in API-REV-006.
- O-4..O-7 are with delivery.
- C-30: toasts can now render above the loading overlays; this is benign.
- Earlier residuals are unchanged.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 11, IR-010)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (C-30 rejected)
- Score Summary: 9.3/10, with every category at 9.2 or above.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: a minimal, owner-correct fix: toasts are now a top-most layer, with a guard test.

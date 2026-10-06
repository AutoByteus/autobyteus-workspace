# Code Review Report — run-settings-ui-unification

## Review Round Meta

- Review Entry Point: `Implementation Review`, round 5 (CRR-009), a targeted delta for CR-005 after the CRR-008 failure-origin review
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006, Approved)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AF-001..AF-016), as referenced by the design
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (navigation only)
- Design Spec Reviewed As Context: `design-spec.md` (SR-008)
- Supplemental Task Artifacts Reviewed As Context: Product `ui-ux-spec.md` (design repo `6718986`), used as the copy and state reference; `architecture-handoff.md`
- Relevant Solution Revision IDs: SR-006 (requirements), SR-008 → SR-009 (CR-001) → SR-010 (DI-001..006 decisions)
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002 Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001, ARCH-REV-002, ARCH-REV-003 (Pass on SR-009), ARCH-REV-004 (Pass on SR-010)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001, IR-002 (`396591a37`, `c37b81de5`), IR-003 (`81f9ff178`), IR-004 (`83ab477e4`), IR-005 (`a92004c9e`)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-009`
- Current Review Round: `5`
- Review Scope: `Targeted Delta Review`
- Review Scope Evidence (round >1): `git diff 83ab477e4..a92004c9e -- autobyteus-web` touches 2 files (`ChatModelMenu.vue` width constraint; `ChatNewSurface.vue` `flex-shrink-0` on the Thinking and option chips), entirely within CR-005. Round-4 evidence is carried forward.
- Trigger: IR-005 fixes CR-005 (CRR-008 failure origin of API-REV-002 F-3). Head `a92004c9e`.
- Prior Review Round Reviewed: round 4 (CRR-007), plus the CRR-008 failure-origin result
- Latest Authoritative Round: 5
- Coverage Investigation Reviewed (failure-origin entry point): `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed (failure-origin entry point): `api-e2e-execution-coverage-report.md` (§Failures, §Migrated Probes, §Visual Comparison), `api-e2e-test-case-ledger.md`
- API/E2E Revision Record Reviewed (failure-origin entry point): `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: API-REV-001, API-REV-002
- Failing Scenario IDs: round 1: R04, R05, R10-Team, R10-Org (F-1), A01 F-04 (F-2). Round 2: R12, R04 footer geometry (F-3).
- Exact Failing Commands / Execution Mode: `pnpm test:e2e:run-settings-live --output-dir ../tickets/in-progress/run-settings-ui-unification/evidence/api-e2e/run-settings-live` (real server, Claude SDK `haiku` + Codex; for R10, the backend restarted with `CODEX_APP_SERVER_COMMAND` pointing to a missing path); `pnpm test:e2e:cross-scope-agent-mentions --cases A01`
- Failure Evidence Paths: round 2 (F-3): `R12-footer-804.png`, `R12-footer-880.png`, `VIS-021-…-804.png`, `VIS-042-…-804.png`, R12/R04 `footer` geometry in `run-settings-live-evidence.json`; command `pnpm -C autobyteus-web test:e2e:run-settings-live --cases R12`. Round 1: `evidence/api-e2e/run-settings-live/` (`R04-failure.png`, `R05-team-copy-drawer-804.png`, `R10-team-copy-codex-member-blocked-804.png`, `R10-org-copy-codex-member-blocked-804.png`, `VIS-042-new-chat-prefilled-from-agent-run-804.png`, `run-settings-live-evidence.json`)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: confirmed. 117 production files changed in `autobyteus-web`. The launch routes and owners changed, and the Org orchestration moved out of the view. There is no server change.

## Review Scope

- **Changed implementation and behavior reviewed:** BEH-001..BEH-009 (REQ-001..REQ-022).
  - Start intents: `useRunStart`.
  - Chat draft and launch: `chatDraftStore`, `chatLaunchService`, `chatTeamLaunchConfig`.
  - Org launch: `agentOrgLaunchDraftStore`, `agentOrgLaunchService`, `OrgLaunchPage`, `pages/workspace.vue`.
  - Member projection: `runMemberTree`, `memberOverrides`, `types/runSettings/*`.
  - Mentions: `draftMentionEligibility`, `useMentionCandidates`, `ChatTargetMenu`, the first-send changes in `agentRunStore`/`agentTeamRunStore`.
  - Saved runs: `ExistingRunConfigEditor`, `existingRunConfigStore` + `existingRunConfigEditActions`, `useRunStopAction`, `RunConfigPanel`.
  - Model options: `chatModelOptions`, `ChatModelMenu`.
  - Entry-point call sites: Agents, Teams, Orgs, run views, tree "+".
  - Removal plan and localization.
- **Files and areas reviewed:** all of the above in full. Diffs of the entry-point views, layouts, pages, `ChatModelMenu` and `RightSideTabs`. A grep audit of the removed names.
- **Verification run by the reviewer:**
  - The 30 added or modified spec files: 29 pass. 1 fails, `RightSideTabs.workspaceTarget.spec.ts`, which is on the recorded baseline-failing list.
  - Plain `tsc` (`.nuxt/tsconfig.json`): no errors in touched production `.ts` files. The repo has 595 other errors.
  - `vue-tsc` could not run in this environment because of an npx/typescript export error. The `.vue` type claim rests on the handoff.
  - `audit-localization-literals`: exit 0.
- **Explicit exclusions:**
  - Visual fidelity against VIS-001..042. That is API/E2E and visual validation; the evidence screenshots were not re-judged.
  - Server code. It is unchanged; only the collaborator policy was read for comparison.
  - The mobile and Applications surfaces. They are preserved and only checked for unchanged dependencies.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. SR-006 has 22 REQs and 19 ACs; DEC-001..006 are closed and DEC-007 is out of scope.
- Design-spec behavior map verified against the implementation: Yes (DS-001..DS-008).
- Design review report and round confirmed: ARCH-REV-002 Pass. AR-001..004 are resolved in code:
  - AR-001: `draftMentionEligibility` matches `CollaboratorCandidatePolicy.isEligibleAgent`/`isEligibleTeam`.
  - AR-002: tree "+" → `useRunStart.newChatInWorkspace`.
  - AR-003: ⚙ is hidden for `temp-*` contexts.
  - AR-004: the workspace conversions are in `runWorkspaceChoice.ts`.
- Behavior-basis status: `Confirmed`.
  - NB-001 was corrected upstream in SR-009: "+" copies the agent on screen, host or `@` collaborator, via `copyAgentFromConfig(config)`. ARCH-REV-003 passed it.
  - The requirements are unchanged (SR-006). REQ-013 applies to the agent on screen, which extends the base behavior.
- Changed or newly discovered behavior: **NB-001 (provisional): "+" on a collaborator view in an Agent run.**
  - The Agent run header, with its "+", also renders when the user views a collaborator brought into the run with `@` (`agent_run_task_agent` / `agent_run_task_team_member` targets).
  - At base, "+" there opened New chat preset to the collaborator's agent and workspace.
  - Neither BEH-007/REQ-013 nor the design's "+" entry inventory (DS-003, the Boundary Encapsulation Map callers) covers this target.
  - The designed identity `copyAgentRun(runId)` resolves only top-level runs.
  - This must be corrected upstream before the review can pass.
- Also noted, not a gap: the design's recursive team-tree exclusion collapses to flat teams. The server's team domain has no `AGENT_TEAM` node kind and the docs describe flat Teams, so this is equivalent, not a contradiction.
- Remaining material ambiguity: none for this review. First-send mention admission is server-side and is the designated API/E2E proof (AF-009).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `AgentList`/`AgentDetail.runAgent` → `useRunStart.runAgent` → `chatDraftStore.startForDefinition` (REQ-021 via `resolveStartModel`) → `/chat` → `launchAgentChat` | — |
| BEH-002 | Confirmed | `AgentTeamList`/`AgentTeamDetail` → `runTeam` → draft `teamAgentOverrides` (`changeTeamMember`/`resetTeamMember(s)`) → `launchTeamChat` → `buildChatTeamLaunchConfig(…, agentOverrides)` → catalogs per effective runtime → `createDraft` + `sendMessageToFocusedMember({mentions})` | — |
| BEH-003 | Confirmed | `AgentOrgExperience.openLaunch` / Org "+" / switcher → `agentOrgLaunchDraftStore.start` → `pages/workspace.vue` `OrgLaunchPage` → `launch(navigate)` → `agentOrgLaunchService.launch` (workspace dedupe, placement serialization, `agentOrgRunStore.launch`, history refresh, last model) → `buildAgentOrgActiveRoute` | — |
| BEH-004 | Confirmed | `RunConfigPanel` (chrome) → `ExistingRunConfigEditor` (container) → `ExistingRunSettings`. Edits go through `existingRunConfigStore.update*`; Cancel → `discardChanges`; stop → `useRunStopAction` → per-kind terminate → `reloadCanonical`. Readiness is now derived in the store (`deriveSchemaStates`) instead of being pushed by the view. | — |
| BEH-005 | Confirmed | `ChatModelMenu` gains `runtimeLocked`/`lockedModels`/`align`/`placement`/`drillIn`; the other chat controls are reused by `RunSettingsCard` | — |
| BEH-006 | Confirmed (server admission pending API/E2E) | `useMentionCandidates` (draft → `draftMentionCandidates`; live → server candidates) → `ChatTargetMenu` mention-only → `requestedMentions` → first send: `agentRunStore` no longer drops mentions for a new agent; `agentTeamRunStore` takes `options.mentions` for a launch draft | — |
| NB-001 | Confirmed (SR-009) | Host or collaborator view "+" → `AgentWorkspaceView.startNewChatForRun` → `useRunStart.copyAgentFromConfig(target.context.config)` → `chatDraftStore.startForDefinition({agent: config.agentDefinitionId}, {copied})` → `/chat`. No run-id lookup. | Specs: host, task child, task-team member (`AgentWorkspaceView.spec`); collaborator config with no workspace → temp (`useRunStart.spec`) |
| BEH-007 | Confirmed | Team/Org "+" → `copyTeamRun`/`copyOrgRun`, which fall back to defaults on a failed copy. Agent "+" → `copyAgentRun(runId)` resolves only through `agentContextsStore` (see CR-001). | CR-001: an exposed "+" on a task-child view resolves nothing |
| BEH-008 | Confirmed | All the listed components, projections, types, `useRunActions`, the dead panels and the keys are gone (grep audit). Docs still reference them; see Docs-Impact. | — |
| BEH-009 | Confirmed | `chatModelOptions` (`otherModelSettingKeys`, `applyModelOption`, `withoutModelOptions`/`onlyModelOptions`); member customization by option key in `runMemberTree.customization`; thinking reset keeps the member's own options (`resetMemberOverride`) | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related IDs | Kind | Actor | Goal / Event | Entry Surface | Shape | Forward Path / Lifecycle | Expected Outcome | Independent Evidence | Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001..008 | BEH-001..009 | User | User | As approved in the requirements | As approved | Normal | Traced in the table above | As approved | requirements-doc SCN table; design DS-001..008 | Supported Normal Scenario | Use |
| CR-SCN-01 | BEH-007, REQ-013; BEH-006 (UC-005) | User | User viewing a collaborator brought into an Agent run | Start another run like the agent on screen | Agent run view → task child selected (the composer targets it) → header "+" (`WorkspaceHeaderActions`, shown whenever `showHeaderActions`) | Normal | Round 1: `copyAgentRun(child runId)` → `agentContextsStore.getRun` missed → no-op. Round 2 (SR-009): `startNewChatForRun` → `copyAgentFromConfig(target.context.config)` → `startForDefinition` → `/chat`. | New chat for the agent on screen, prefilled per REQ-013 (SR-009) | Base code `origin/personal:autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`; `stores/agentRunCollaborationStore.ts:257-283`; `stores/agentContextsStore.ts` registers only top-level runs | Supported Normal Scenario | Use |
| CR-SCN-02 | design Dependency Rules; Reusable Owned Structures | Contract | — | Draft owners do not depend on each other; the start-model rule has one owner in `utils/runSettings` | — | — | `agentOrgLaunchDraftStore` imports `explicitChatModelConfig` and `ChatStartSettings` from `~/stores/chatDraftStore` | — | design-spec §Dependency Rules ("Forbidden: `chatDraftStore` ↔ `agentOrgLaunchDraftStore` directly") and §Reusable Owned Structures | Established engineering contract | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | Agent "+" was a silent no-op on a task-child view | CR-SCN-01 / NB-001 | The user clicks the header "+" while a collaborator is selected | Round 2: opens New chat for the agent on screen | `c37b81de5`; specs for host, task child and task-team member | Promote → CR-001 (Design Impact) → **Resolved** | SR-009/ARCH-REV-003 defined the subject and identity; the implementation matches |
| C-02 | The Org draft owner imported from the chat draft store module | CR-SCN-02 | Design contract | Round 2: `agentOrgLaunchDraftStore` has no `chatDraftStore` import. `explicitChatModelConfig` is in `utils/runSettings/explicitModelConfig.ts`; `RunStartSettings` = `Readonly<RunSettingsValues & {teamAgentOverrides?}>` | `396591a37`; grep shows no `ChatStartSettings` left | Promote → CR-002 → **Resolved** | — |
| C-03 | Unreachable topology branch in `launch`; the diagnostic was never logged | Engineering contract | — | Round 2: the dead branch is removed. A store `watch` on the blocked diagnostic logs it once when found, and the readiness comment is corrected. | `396591a37`; spec "a broken topology blocks Run as unavailable and logs its diagnostic once" | Promote → CR-003 → **Resolved** | — |
| C-04 | Team readiness checks only the root runtime | SCN-002/SCN-008 | — | Bounded by the existing launch failure path | Round 1 | Reject | Unchanged |
| C-05 | Redundant `withNewRuntimeOverridePolicy` in the Org `storeOverride` | REQ-009 | — | No effective consequence | Round 1 | Reject | Unchanged |
| C-06 | The handoff size note was inaccurate | Size audit | — | Corrected in the IR-002 handoff | Handoff | Reject (note closed) | — |
| C-07 | `explicitChatModelConfig` keeps "Chat" in its name though both draft owners use it | Naming | — | Readability only | `utils/runSettings/explicitModelConfig.ts` | Reject | Kept per the design's helper name; the doc comment states shared use |

## Structural / Design Checks

Round 2 re-checked the rows CR-001..003 affected. The other rows carry forward from round 1 unchanged.

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment present and preserved | Pass | Unchanged | — |
| Matches approved behavior-defining supplements | Pass | Unchanged; visual fidelity is left to API/E2E | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-003 now follows SR-009 (`copyAgentFromConfig`) | — |
| Ownership boundary preservation | Pass | The two draft owners no longer import each other; `useRunStart` alone coordinates them | — |
| Off-spine concern clarity | Pass | `explicitModelConfig` is a pure rule under `utils/runSettings` | — |
| Existing capability reuse | Pass | Unchanged | — |
| Reusable owned structures | Pass | The shared start-model rule and carry type have one owned home each | — |
| Shared-structure tightness | Pass | `RunStartSettings` is built on `RunSettingsValues`, with no parallel shape | — |
| Repeated coordination ownership | Pass | Unchanged | — |
| Empty indirection | Pass | Unchanged | — |
| Separation of concerns and file responsibility | Pass | `chatDraftStore` 369 → 340 lines after the extraction | — |
| Ownership-driven dependency check | Pass | No forbidden shortcut remains (grep) | — |
| Authoritative Boundary Rule | Pass | `AgentWorkspaceView` still calls only `useRunStart`, never `chatDraftStore` or the router | — |
| File placement | Pass | — | — |
| Flat-vs-over-split layout | Pass | — | — |
| Interface/API boundary clarity | Pass | `copyAgentFromConfig(config: AgentRunConfig)` is an explicit snapshot identity, as in SR-009 | — |
| Naming quality | Pass | C-07 rejected | — |
| No unjustified duplication | Pass | — | — |
| Patch-on-patch complexity | Pass | Two focused commits, no layering | — |
| Dead/obsolete code cleanup | Pass | The CR-003 branch is removed | — |
| Test scenarios and assertions requirement-aligned | Pass | Host, task-child and task-team-member "+" specs; collaborator with no workspace → temp; blocked topology: unavailable reason, one warning, no launch | — |
| Test fixtures/helpers reusable and coherent | Pass | — | — |
| No stale/compat-only tests | Pass | `copyAgentRun` mocks were replaced | — |
| API/E2E readiness | Pass | The open items are explicit (AF-009 first-send admission, live probes) | — |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `components/agentOrgs/AgentOrgExperience.vue` | 500 (base 497) | At limit, not over | +3 | Call-site change only | OK | Pre-existing pressure | The next change there should split first |
| `stores/agentTeamRunStore.ts` | 489 (482) | Pass | +7 | `mentions` option | OK | Pass | — |
| `stores/existingRunConfigStore.ts` | 460 (458) | Pass | +2 | Edit actions split out | OK | Pass | — |
| `components/chat/ChatModelMenu.vue` | 396 (292) | Pass | +104 | Runtime-locked mode of one menu (designed) | OK | Pass, under watch | — |
| `stores/agentOrgLaunchDraftStore.ts` | 384 (new) | Pass | new | One Org draft owner | OK | Pass | — |
| `stores/chatDraftStore.ts` | 340 (257) | Pass | +83 | The designed chat-draft ownership | OK | Pass | — |
| `utils/runSettings/runMemberTree.ts` | 308 (new) | Pass | new | One projection | OK | Pass | — |
| `components/chat/ChatMessageInput.vue` | 270 (222) | Pass | +48 | Mention-only wiring | OK | Pass | — |
| `components/run-settings/RunSettingsCard.vue` | 249 (new) | Pass | new | Labelled rows | OK | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No alias kept for `copyAgentRun` or `ChatStartSettings` |
| No legacy old-behavior retention | Pass | — |
| Dead/obsolete code cleanup completeness | Pass | CR-003 resolved |
| Persisted-data transition decision followed | Pass | `Not Affected` |
| No version-specific dual reads/writes | Pass | — |
| Transition mechanics match the design | Pass | No migration |

## Dead / Obsolete / Legacy Items Requiring Removal

None. The round-1 item (the CR-003 branch) is removed.

## Docs-Impact Verdict

- Docs impact: `Yes`.
- Why: the long-lived docs still describe the removed owners and components.
  - `docs/agent_orgs.md:104,568,591,599`: `agentOrgRunConfigStore`, `AgentOrgRunConfigPanel`, `AgentOrgRunConfigForm`.
  - `docs/agent_execution_architecture.md:149-153,1011-1016`.
  - `docs/settings.md:903,963`: `WorkspaceSelector`, `DraftRunConfigEditor`.
- Files or areas likely affected: the three docs above, plus the New chat, Org launch page, `@` mention and Agent "+" (agent on screen) descriptions. This is for the delivery/docs-sync stage.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 (draft `@` candidates diverge from server eligibility) | Confirmed resolved | Unchanged |
| P-002 (first-send `alreadyInRun`/`invalid` after a concurrent definition change) | Confirmed Not Reachable | Unchanged; no machinery added |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score: `9.3 / 10` (`93 / 100`; round 3). This is a simple average for trend visibility only.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.3 | Every Run/"+"/switch/tree-"+" goes through `useRunStart`; DS-003 follows SR-009 | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.3 | Views are intent-only; the draft owners are decoupled; Org orchestration lives in store + service | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.2 | Kind-split intents; `copyAgentFromConfig` takes an explicit snapshot that reaches host and collaborator targets | — | — |
| 4 | Separation of Concerns and File Placement | 9.2 | The shared rules (start model config, start orders, model options, readiness) live in `utils/runSettings`, and nothing there imports `components/` | `ChatModelMenu` grew to 396 lines (coherent) | Split it if another mode is added |
| 5 | Shared-Structure / Data-Model Tightness | 9.1 | `RunStartSettings` is built on `RunSettingsValues`. The `@` eligibility mirror is now pinned by a contract test plus live N03. The server-owned query is a named follow-up (FU-001). | The mirror remains until FU-001; a Team draft still borrows Daily Assistant's identity (accepted, FU-003) | FU-001, FU-003 |
| 6 | Naming Quality and Local Readability | 9.1 | Names follow the design; comments cite REQs/CRs | `explicitChatModelConfig` name (C-07, rejected) | — |
| 7 | API/E2E Readiness | 9.2 | Open server-admission and live-probe items are explicit; mocked probes and delta specs pass | — | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.3 | REQ-021, carry/reset, thinking/option independence, saved-run discard/reload/stop and the "+" copy all trace correctly | Live probes are still to run in API/E2E | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut with no aliases | — | — |
| 10 | Cleanup Completeness | 9.2 | The removal plan is done and the dead branch is gone | The docs are stale (delivery stage) | Docs sync |

## Findings

### Design-improvement findings (CRR-004): status in round 3

Every item has a recorded SR-010 decision (ARCH-REV-004 Pass). The adopted items are verified in `81f9ff178`.

| ID | SR-010 decision | Round-3 verification | Status |
| --- | --- | --- | --- |
| DI-001 | Adopt: rendered-surface audit plus a `useRunStart.newChat()` intent | `AppLeftPanel` Chat nav and pencil → `runStart.newChat()`, still under `beginSelectionIntent()`. No production `chatDraftStore.startNewChat`/`/chat` push outside `useRunStart`. Specs: `useRunStart`, `AppLeftPanel_v2`. | Resolved |
| DI-002 | Server query deferred (FU-001); contract checks adopted | `builtInAgentDefinitionIds.contract.spec.ts` parses the server registry's exported ids and `BUILT_IN_AGENT_DEFINITIONS` and compares them with the web mirror; it passes. Live N03 is a required regression in API/E2E S4. | Resolved (follow-up FU-001 accepted) |
| DI-003 | Resolved by evidence | Per SR-010/AF-020: server unit tests 43/43 and live N02/N03 pass. The fallback if it ever breaks is recorded as a Requirement Gap. | Resolved |
| DI-004 | Adopt one readiness rule | `utils/runSettings/launchReadiness.ts` `resolveScopesReadiness` (pure; availability and copy are injected). Order: target/topology → runtime → model. `resolveChatLaunchReadiness` checks Agent (root) and Team (root plus `buildTeamMemberTree` members); `agentOrgLaunchDraftStore.readiness` uses the same rule. Copy is unchanged. Specs: `launchReadiness`, `chatLaunchService` (member on a disabled runtime blocks), `OrgLaunchPage` (ready, blocked topology, runtime named before missing model). | Resolved |
| DI-005 | Adopt slices S1–S6 | The handoff reports checks per slice | Resolved (process) |
| DI-006 | (a) accept; (b) adopt; (c) defer FU-002; (d) accept FU-003; (e) adopt | (b) `definitionStartOrder`/`chatNavStartOrder` in `startModelDefaults.ts`, used by both draft owners, with the same REQ-021 order. (e) `components/chat/chatModelOptions.ts` → `utils/runSettings/modelOptions.ts` (git mv); `humanizeThinkingValue` → `utils/llmThinkingConfigAdapter.ts`; no `utils/runSettings` → `components/` import remains. | Resolved; (a), (c) and (d) accepted or deferred with reasons |

**Non-blocking note (round 3):** the contract pin resolves the server registry with `process.cwd()`, so it assumes Vitest runs from `autobyteus-web` inside the superrepo. A path relative to the spec file would be sturdier. It fails loudly (the size > 0 checks) rather than silently passing.

### Resolved implementation findings

Round-1 findings, all resolved in round 2 (see `CRR-003`):

- **CR-001 (Medium, Design Impact):** Agent "+" was a no-op on a task-child view.
  - Resolved by SR-009 (copy the agent on screen) and IR-002 `c37b81de5`.
  - `copyAgentFromConfig(target.context.config)` has no run-id lookup.
  - Specs cover the host, a task child, a task-team member, and a collaborator with no workspace (→ temp).
- **CR-002 (Low):** the Org draft owner depended on the chat draft store module.
  - Resolved by `396591a37`.
  - `explicitChatModelConfig` → `utils/runSettings/explicitModelConfig.ts`; `ChatStartSettings` → `RunStartSettings` in `types/runSettings/RunSettings.ts`.
  - No `chatDraftStore` import remains in `agentOrgLaunchDraftStore`.
- **CR-003 (Low):** unreachable topology branch.
  - Resolved by `396591a37`: the branch is removed, and the diagnostic is logged once by a watch where it is detected.
  - A spec asserts the unavailable reason, exactly one warning, and no launch.

### Non-blocking notes

- `AgentOrgExperience.vue` is at exactly 500 effective lines. This is now tracked as DI-006(c).

## Classification

- None. The review passes.

## Recommended Recipient

- `api_e2e_engineer` (primary), resuming on head `81f9ff178`. Informational notice to `implementation_engineer`.

## API/E2E Failure-Origin Review (CRR-006)

Head `81f9ff178` (IR-003, SR-010). API/E2E round 1 (API-REV-001) failed at 86% confidence.

### Scenario basis

- **F-1 (R04/R05/R10): Supported Normal Scenario.**
  - Actor and goal: the user starts another run like an existing one (SCN-008, UC-006).
  - Entry: open or reload the app, select a run whose runtime catalog has not been loaded in this session, click "+" (Agent/Team header, Org header), or use the heading switcher.
  - Expected outcome:
    - New chat or the Org page shows the copied model by name, with its Thinking and other-setting chips (REQ-013, REQ-022, AC-008, AC-019, VIS-042).
    - A member on a disabled runtime blocks Send/Run (SR-010 DI-004, AC-002). The R10 condition, a runtime uninstalled or disabled after the run, is the case DI-004 explicitly names.
  - The evidence is independent of the probe: the code path below plus a real-server reproduction.
- **F-2 (A01 F-04): the scenario is supported** (viewing an `@` collaborator in an Agent run), but the asserted outcome is not this ticket's behavior. See below.

### F-1 → CR-004: copied or carried starts never load the copied runtimes' catalogs or availability (Medium, Local Fix → Implementation Engineer)

- **Origin:** implementation defect, plus a source-review gap. It is reproducible from the code.
- **New chat path:**
  1. `stores/chatDraftStore.ts:171` `startForDefinition` returns right after `applyCarriedModel` when copied or carried settings carry a model.
  2. Only the default path runs `resolveStartModel(…, startModelCatalog())`. That is the only start-time caller of `ensureAvailability` and `ensureCatalog` (`utils/runSettings/startModelDefaults.ts`; `services/runSettings/startModelCatalog.ts:10-12`).
  3. Nothing else on New chat loads them. `useChatDraftModelControls` only reads `catalog.modelLabel`/`schemaFor` (`components/chat/chatDraftModelControls.ts:18-20`).
  4. Result: the raw model id, no Thinking or Fast chip (R04/VIS-042), and member summaries without "Fast" and with raw ids until `RunSettingsCard` loads that row's runtime (`RunSettingsCard.vue:230`) (R05).
- **Readiness:** `resolveChatLaunchReadiness` passes `isRuntimeEnabled: null` while `!availability.hasFetched`, so the DI-004 rule cannot block a member on a disabled runtime (R10-Team).
- **Org path:**
  1. `agentOrgLaunchDraftStore.prepare` skips `applyDefaultModel`, its only availability/catalog load, when the settings are copied (`if (copied) { …; return }`) or carried (`modelCarried`).
  2. The Org readiness therefore gets `isRuntimeEnabled: null` too (R10-Org).
  3. Only the root card's `RunSettingsCard` loads the root runtime's catalog.
- **Persistence is correct:** R04's send launched with `{reasoning_effort: low, service_tier: fast}`. The defect is in display and readiness inputs only.
- **Required action (bounded; no interface or design change):**
  - When a draft owner starts from copied or carried settings, load runtime availability and the model catalog for every effective runtime: the root plus each member/team override runtime, through the existing `startModelCatalog()`/catalog store.
  - Do this without replacing the copied values. REQ-013 copies the run's settings; an unusable copy is then reported by the shared readiness rule.
  - Apply it to `chatDraftStore.startForDefinition` (Agent and Team, copied and carried) and to `agentOrgLaunchDraftStore.prepare` (copied and carried), with stale-intent guards as on the default path.
  - Add specs:
    - a copied start triggers availability plus catalog loads for the root and member runtimes;
    - a Team or Org copy with a member on a disabled runtime becomes not-ready once availability resolves.
- **Review-gap statement:** this should have been caught in source review.
  - Round 1 read the early return and its own comment ("the checked choice (availability, catalog) follows"), which states that only the default path loads them.
  - Round 3 accepted DI-004's stated outcome ("a member on a disabled runtime now blocks a Team or a '+' copy") from unit specs that inject availability, without tracing whether availability is fetched on the "+" path.
- **Affected score rationale** (the full scorecard is not repeated for a failure-origin round):
  - Runtime Correctness 9.3 → 8.6: copied and carried starts show incomplete settings, and DI-004 does not take effect on its named path.
  - API/E2E Readiness 9.2 → 8.8.

### F-2 (A01 F-04): not caused by this ticket; classified as a stale/pre-existing assertion (Local Fix → API/E2E; no product change in this ticket)

- **The placeholder logic is identical to base.** `AgentUserInputTextArea.composerPlaceholder` is unchanged: the mention placeholder wins whenever `@` is available. Mention availability is the same as base: scope from the unchanged `runMentionScope.ts`, which already covered `agent_run_task_agent`/`agent_run_task_team_member`. At base, `useRunMentionMenu.available` = scope plus context; now it is `useMentionCandidates.available` = scope, with the context always present for a target.
- **The conflict predates this branch.** The F-04 assertion (`e666d726f`, 2026-10-01) predates the mention-placeholder precedence (`006fd6928`, 2026-10-02, the mention-discoverability change), and both are on `origin/personal`.
- **Consequence:** the collaborator-view placeholder was already "Ask anything · @ for an agent or team" before this ticket. REQ-011 does not cover the placeholder, and this ticket does not change it.
- **Required action (API/E2E):**
  - Align A01 F-04 with the current base behavior, or mark that sub-assertion as a pre-existing, out-of-scope product question and record it as a residual risk.
  - If the product wants the collaborator's name back in that placeholder, it is a separate request; route it to the Solution Designer outside this ticket.

### Items API/E2E attributed to test code or the environment

Reviewed for attribution only; no source defect was found.
- `chat-entry-live` C05/C08/C16/C18 assert removed UI. The probe migration is incomplete; this is API/E2E-owned and the handoff overstated it.
- C03 model search stuck, with C04/C06/C11/C23 cascading: environmental. The search code is unchanged from base.
- menus U02/U04: the anchor assertion is stale.
- polish T02/T03/T07, menus U03: hover paths with Grok Build enabled. The hover logic is unchanged.
- `fresh-run-auto-approval` B02: the Nuxt optimized-dependency reload.
- Each goes to API/E2E for the rerun.

### Round 4: CR-004 verification (CRR-007)

- **`loadStartRuntimes(runtimeKinds, catalog)`** (`utils/runSettings/startModelDefaults.ts`) runs `ensureAvailability` first, then `ensureCatalog` for each distinct, non-empty, enabled runtime. It never changes values (REQ-013). A disabled runtime is left to the shared readiness rule.
- **New chat:** `chatDraftStore.startForDefinition` copied/carried branch → `loadCarriedStart`, with the root runtime plus each `teamAgentOverrides` runtime and the target's definitions. The identity refresh is guarded by the existing generation check. `definitionDefaultLaunchConfig` reuses the new `ensureTargetDefinitions` (no behavior change).
- **Org:** in `agentOrgLaunchDraftStore.prepare`, copied or carried settings → `await loadCarriedRuntimes` (root, team overrides, agent overrides) before `phase` becomes `ready`. A failed copy (`copied === null`, not carried) still falls back to `applyDefaultModel` (REQ-013).
- **Specs** (each reported to fail without the fix):
  - `chatDraftStore`: copied Team start; carried Agent start.
  - `chatCopiedStartReadiness.spec.ts`: real store plus real readiness; Team copy with a Codex member → not-ready once availability resolves (R10); Agent copy ready.
  - `agentOrgLaunchDraftStore`: Org copy with a member on disabled Codex blocks Run (R10); switcher carry loads the catalog without replacing the model.
  - `loadStartRuntimes`: order and de-duplication.
- **Reviewer run:** 21 spec files / 127 tests pass in the delta areas; the localization and boundary guards exit 0. `chatDraftStore` is 366 effective lines and `agentOrgLaunchDraftStore` 393; both are under 500.
- **CRR-005 note resolved:** the contract pin now resolves the server registry relative to the spec file (`import.meta.url`).
- **Residual window, rejected as a finding:** New chat loads in the background, so Send is enabled for the one availability request after a copied start. Hitting it needs artificial timing (send within that request, with a member on a runtime disabled since the run). The consequence is bounded by the existing launch failure path (draft kept, error shown). Not proportionate to add gating.
- R04/R05 rendering after a fresh load is to be confirmed by the API/E2E rerun.
- Affected scores after the fix: Runtime Correctness 8.6 → 9.2; API/E2E Readiness 8.8 → 9.1.

### Failure-origin classification and routing

- F-1 / CR-004: `Local Fix` → Implementation Engineer. **Resolved in IR-004 (CRR-007).**
- F-2 and the test-code/environment items: `Local Fix` → API/E2E, carried in the package and done on the rerun.
- Route: implementation fix → code review (targeted delta) → API/E2E rerun (full `run-settings-live`, web suite, N01–N03, then repaired probes) → proportional test-code review.

## API/E2E Failure-Origin Review (CRR-008): round 2, F-3

Head `83ab477e4` (IR-004). API/E2E round 2 (API-REV-002) failed at 92% confidence on F-3 only. CR-004 is confirmed resolved on the real server (R04, R05, R10 pass), and the repaired probes pass.

### Scenario basis

- **Supported Normal Scenario.** The user runs an Agent (R12: Agents → Run → New chat, or "+" as in R04) with a Codex model whose display name is long ("GPT-5.6-Luna (default reasoning: medium)"), with Thinking and Fast, on a desktop window of 804 or 880 px. These widths are VIS reference widths, and the label is a real catalog name.
- **Expected outcome:** the footer controls are separate and legible, with a long model name truncating (REQ-001, REQ-022, VIS-020/021/042; the Product spec's "label never wraps" truncation rule).
- **Evidence:** the screenshot `R12-footer-804.png` shows the model label running into the Thinking chip ("me.Medium" overlaid). The geometry at 804 px: model trigger x 356–676, overlapping Thinking (572–670) and Fast (672–732).

### F-3 → CR-005: the model trigger overflows its shrinking wrapper at ≥ `sm` (Medium, Local Fix → Implementation Engineer)

- **Origin:** an implementation defect introduced by this ticket.
  - At base: wrapper `relative` (no shrink), button `max-w-[20rem]`.
  - This ticket (the IR-001 fix for the 390 px footer overflow) changed it to wrapper `relative min-w-0` and button `max-w-full sm:max-w-[20rem]`, inside `ChatComposer`'s right group `ml-auto flex min-w-0 max-w-full`.
  - At ≥ `sm`, `sm:max-w-[20rem]` replaces `max-w-full`. The button is then bounded only by 20rem, not by its wrapper. The flex row shrinks the `min-w-0` wrapper below the button's intrinsic width, and the button overflows onto the next siblings (Thinking, Fast).
  - Below `sm`, `max-w-full` holds, which is why 390 px is clean. At 1512 px there is enough room.
  - It was present since `81f9ff178` (round-1 VIS-021 capture) and `d45fe62bc`, not introduced by IR-004.
- **Required action (bounded):**
  - Keep the trigger bounded by its wrapper at every width, so the label's `truncate` engages. For example, put the 20rem cap on the wrapper (`relative min-w-0 max-w-[20rem]`) and keep the button `max-w-full` at all breakpoints.
  - Thinking, Fast and Send must keep their size (no shrink) and must not overlap at 804, 880, 390 and 1512 px. Use the R12 long-name Codex case plus a model-only and a Thinking-only case.
  - Check the same pattern wherever `ChatModelMenu` is used: `RunSettingsCard` rows, Member settings rows, and the saved-run card. VIS-020/021/042 are the references.
  - A durable assertion already exists (the R12/R04 footer geometry in `run-settings-live`).
- **Review-gap statement:** this was not reasonably detectable in source review.
  - The round-1 review saw the class change (`ChatModelMenu` diff), but the defect is an emergent flex-shrink interaction. It appears only with a long label and particular widths, and it needs rendering to judge.
  - Visual fidelity was an explicit exclusion of the source review, and the rendered-result check is the right detector.
  - The IR-001 rendered check verified 390 px for the long-name case but not 804/880. API/E2E round 1 also missed it until the R12 geometry check was added.
- **Affected score rationale:**
  - Runtime Correctness stays 9.2: behavior and data are correct.
  - API/E2E Readiness 9.1 → 8.9: a visible fidelity defect on the primary start surface.
  - The full scorecard is not repeated.

### Round 5: CR-005 verification (CRR-009)

- **`ChatModelMenu.vue`:** the wrapper is `relative min-w-0 max-w-[20rem]`, and the trigger is `max-w-full` at every breakpoint. The 20rem cap now sits on the shrinking box, so the trigger always follows it and the label's `truncate` engages. The explanatory comment sits inside the single root (the earlier two-root mistake was caught by `ChatModelMenu.spec` and corrected before the commit).
- **`ChatNewSurface.vue`:** Thinking and the other-setting chips are `flex-shrink-0`, so only the model name gives way.
- **Implementation's rendered evidence** (real Codex catalog, measured geometry):
  - The long-name Codex case with Thinking and Fast is clean at 804, 880, 390 and 1512. At 804: trigger 356–570, Thinking 572–670, Fast 672–733, Send 739–771.
  - Thinking-only and model-only cases are clean at 804 and 880.
  - The member drawer row (880) and the Org card (804) with the long name stay within their rows.
  - The saved-run card shares the `RunSettingsCard` rule but was not rendered with a long name. It is left to the API/E2E rerun.
- **Reviewer check:** `26-cr005-footer-long-804.png` shows the truncated label "GPT-5.6-Luna (default… C…" with separate Medium and Fast chips and Send. The `components/chat` + `components/run-settings` specs pass (53/53); the localization audit exits 0.
- **Affected score:** API/E2E Readiness 8.9 → 9.1.

### Other round-2 residual (reviewed for attribution)

- **`chat-entry-live` C05:**
  - The migrated live-lock assertions pass.
  - The probe's own oracle query `providerModelCatalogSnapshots(codex)` then fails server-side ("Codex client generation … has unresolved cleanup", `CodexAppServerClientManager.beginAcquire`) after the earlier Codex lifecycle cases.
  - No server code changed in this ticket, and the failing call is the test's oracle, not a product path this ticket touches.
  - **Not attributable to this ticket.** It is a candidate for a separate server ticket (API/E2E to record it as a residual). It does not block this ticket.

### Classification and routing (CRR-008)

- F-3 / CR-005: `Local Fix` → Implementation Engineer. **Resolved in IR-005 (CRR-009).**
- Route: fix → code review (targeted delta) → API/E2E rerun (R12/R04 first, the web suite, N01–N03) → proportional test-code review.

## Residual Risks

- FU-001: the client mirror of server `@` eligibility remains until a server-owned draft candidate query exists. The contract pin and live N03 contain drift.
- FU-002 (`AgentOrgExperience.vue` at 500 lines), FU-003 (Team draft carrier identity) and FU-004 (unrendered `RemoteAgentCard`) are named follow-ups.
- The migrated live probes still need running with credentials (API/E2E).
- `.vue` type checking was not independently reproduced by the reviewer. The implementation reports no errors in touched files.
- The docs are stale until docs sync.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`, round 5 (Targeted Delta Review of CR-005)
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.3/10 average; every category ≥ 9.1.
- Failure Origin: CRR-008 (F-3 → CR-005, resolved; C05 not attributable to this ticket)
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer` (rerun on `a92004c9e`: R12/R04 first, then the web suite and N01–N03)
- Notes:
  - Please also cover the saved-run card with a long model name (not rendered by the implementation).

# Design Review Report — chat-interface-entry

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/requirements-doc.md` (Approved SR-003; SR-004 supplement; SR-006 editorial cleanup only)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/investigation-notes.md` (AF-01–AF-27)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed:
  - `ui-ux-spec.md` R2 + VIS-001–025 (no VIS-020) at `/Users/normy/autobyteus_org/autobyteus-web-prototype/tickets/done/chat-interface-entry/`
  - `architecture-review-handoff.md` (SR-006 and SR-007 sections)
  - The historical product request handoffs
- Relevant Solution Revision IDs: SR-003, SR-004, SR-005, SR-006, SR-007
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: Solution Designer re-review request (SR-007) for the ARCH-REV-002 findings (the remaining part of AR-001, and AR-007)
- Prior Review Round Reviewed: Round 2 / ARCH-REV-002 (Fail, Design Impact)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: the round 1 code reads (worktree `codex/chat-interface-entry` @ `origin/personal@fcd3e83a4`, no source changes), plus these round 2 reads:
  - `services/runOpen/agentRunOpenCoordinator.ts` L52–63 (`config.isLocked = resumeConfig.isActive`)
  - `services/runHydration/runContextHydrationService.ts` L165 (`isLocked: resumeConfig.isActive`)
  - `stores/agentContextsStore.ts` `lockConfig`
  - The `voiceInputStore` callers (`AgentUserInputTextArea.vue` L268, `VoiceInputExtensionCard.vue` L540)
  - `skills/services/skill-discovery.ts` `getBundledSkillDirectoriesFromDefinitionRoot` layouts
  - A folder/declared-name scan of the user's bundled skills in `/Users/normy/autobyteus_org/autobyteus-agents` (no mismatches)
- Round 3 reads:
  - `services/agent-streaming/agent-stream-handler.ts` (send path)
  - `run-history/services/studio-run-model-config-service.ts` (`updateStoppedAgentRunModelConfig` → `agentRunService.updateStoppedModelConfig`), which confirms the saved Offline config is what the existing resume uses

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged and still accurate.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes, unchanged since round 1. The SR-006 requirements edits are editorial only: the stale Recent wording and the traceability notes, which DEC-011 and DEC-013 already covered. There is no approval impact.
- Relevant existing behavior and evidence confirmed: Yes. AF-23–AF-27 match the code. There is one new relevant fact: a persisted standalone run that is opened from history while not active gets `config.isLocked === false` (AF-11 context; see MP-006).
- Scope guardrail confirmed: Yes.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass. D-04 lands a failed first send on `/chat?id=<temp>`; its order keeps the UXJ-001 starting state (AR-007 resolved) | Confirmed | — |
| BEH-007 | User | Pass | Pass | Pass (AR-003 and AR-005 resolved) | Confirmed | — |
| BEH-008 | User | Pass | Pass | Pass (the `setTarget` rebuild updates both definition ids) | Confirmed | — |
| BEH-009 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-010 | User | Pass | Pass | Pass. D-08 keys the mode on run identity; a permanent id always uses `existingRunConfigStore` (AR-001 resolved) | Confirmed | — |
| BEH-011 | User | Pass | Pass | Pass (D-13 route sync) | Confirmed | — |
| BEH-012 | User | Pass | Pass | Pass (AR-004 resolved) | Confirmed | — |
| BEH-013 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-014 | User | Pass | Pass | Pass | Confirmed | — |
| REQ-007 (system) | System | Pass | Pass | Pass (AR-003 resolved) | Confirmed | — |
| REQ-017 | User | Pass | Pass | Pass (catalog draft → chat view → promotion sync) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` R2 + VIS-001–025 (no VIS-020) | Pass | Pass | Pass | Pass | Pass | — |
| `ui-behavior-test-matrix.md` | Pass | Pass | Pass | Pass | Pass | — |
| Product request handoffs (historical) | Pass | Pass | Pass | Pass | Pass | — |
| Investigation-notes supplement inventory | Pass | Pass | Pass (refreshed in SR-006) | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Larger Requirement; Boundary Or Ownership Issue | — |
| Root-cause classification is explicit and evidence-backed | Pass | AF-03, AF-06, AF-19 (+ AF-23–AF-27) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The file mapping, the sequence, and the removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 New chat launch | Primary | Pass | Pass | Pass | Pass | Pass (D-04 destination, D-13 sync) | Pass | Pass |
| DS-002 Team quick path | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 Standalone routing / open | Primary | Pass | Pass | Pass | Pass | Pass (`useChatRouteRunSync`) | Pass | Pass |
| DS-004 Reply | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 Offline model edit | Primary | Pass | Pass | Pass | Pass | Pass (identity-keyed entry) | Pass | Pass |
| DS-006 Model catalog | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 Daily Assistant bootstrap | Primary (system) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-008 Effective skills | Primary (system) | Pass | Pass | Pass | Pass | Pass (`listInstalledSkillRecords`) | Pass | Pass |
| DS-009 Skill instruction codec | Return/Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `chatLaunchService` | Pass | Pass | Pass | Pass | — |
| `SkillService` | Pass | Pass | Pass | Pass | `listInstalledSkillRecords` is internal; `listSkills` maps from it |
| `workspaceNavigationService` + `pages/chat.vue` (`useChatRouteRunSync`) | Pass | Pass | Pass | Pass | — |
| `existingRunConfigStore` | Pass | Pass | Pass | Pass | A forbidden bypass is explicit: editing the `context.config` of a permanent-id run, or calling the store for a `temp-*` id |
| `ComposerTarget` / `voiceInputStore` | Pass | Pass | Pass | Pass | Both callers are covered (the composer and `settings-test`) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/chat/*` | Pass | Pass | Pass | Pass | — |
| `agentInput` + `voiceInputStore` | Pass | Pass | Pass | Pass | AR-002 resolved: no agentInput → chat imports |
| `chatLaunchService` | Pass | Pass | Pass | Pass | — |
| Server factories → `SkillService` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `chatDraftStore.startNewChat` / `setTarget` (rebuild) | Pass | Pass | Pass | Low | Pass |
| `chatLaunchService.launchAgentChat` / `launchTeamChat` | Pass | Pass | Pass | Low | Pass |
| `agentContextsStore.registerDraftRun` | Pass | Pass | Pass | Low | Pass |
| `agentTeamRunStore.sendMessageToFocusedMember(..., { attachmentDraftOwner })` | Pass | Pass | Pass | Low | Pass |
| `useChatRouteRunSync` | Pass | Pass | Pass | Low | Pass |
| `voiceInputStore.toggleRecording/startRecording(request)` | Pass | Pass | Pass (discriminated union) | Low | Pass |
| `chatRunModelControls` footer mode selection | Pass | Pass | Pass (keyed on run id: `temp-*` vs permanent) | Low | Pass |
| `SkillService.listInstalledSkillRecords` + ALL_INSTALLED bindings | Pass | Pass | Pass (record carries real root/origin) | Low | Pass |
| GraphQL `AgentDefinition.skillScope` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| First send / team first send | Pass | Pass | Pass | Pass | — |
| Existing-run model edit | Pass | Pass | N/A | Pass | The owner is right; the entry rule is AR-001 |
| Attachments / voice | Pass | Pass | N/A | Pass | — |
| Right tool shell / built-ins / SkillService | Pass | Pass | Pass | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Web `chat` | Pass | Pass | Pass | Pass | — |
| Web `agentInput` | Pass | Pass | Pass | Pass | — |
| Web layout / navigation / history / stores | Pass | Pass | Pass | Pass | — |
| Server built-ins / agent-definition / GraphQL / skills | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Composer target (active in agentInput; draft in chat) | Pass | Pass | Pass | Pass | — |
| Mic/send buttons, codec, tool shell, team config builder | Pass | Pass | Pass | Pass | — |
| Installed skill records | Pass | Pass | Pass | Pass | One enumeration for `listSkills` and ALL_INSTALLED |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ComposerTarget`, `ChatDraft`, `requestedSkillNames`, `skillScope` | Pass | Pass | Pass | N/A | Pass | — |
| Installed skill record `{ skill, origin, trustedRoot, configuredRoot }` | Pass | Pass | Pass | N/A | Pass | — |
| Voice recording request union | Pass | Pass | Pass | Pass | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `pages/chat.vue` + `composables/chat/useChatRouteRunSync.ts` | Pass | Pass | N/A | Pass | — |
| `components/chat/chatRunModelControls.ts` | Pass | Pass | N/A | Pass | — |
| `composables/chat/chatDraftComposerTarget.ts` | Pass | Pass | Pass | Pass | — |
| `stores/voiceInputStore.ts`, `VoiceInputExtensionCard.vue` | Pass | Pass | N/A | Pass | — |
| `src/skills/services/skill-service.ts`, `skill-discovery.ts`, `configured-agent-skill-resolver.ts` | Pass | Pass | N/A | Pass | — |
| All other mapped files | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/chat/`, `services/chat/`, `stores/chatDraftStore.ts`, `composables/chat/`, `utils/chat/` | Pass | Pass | Low | Pass | — |
| `composables/agentInput/useComposerTarget.ts` (active only) | Pass | Pass | Low | Pass | — |
| Server skill files / built-in template | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentWorkspaceView.vue`, the standalone `showSelectedRunConfig` mode, and its header actions | Pass | Pass | Pass | Pass | — |
| `createDraftRun` tree path | Pass | Pass | Pass | Pass | — |
| Direct `activeContextStore` reads in the box pieces and `voiceInputStore` | Pass | Pass | Pass | Pass | — |
| `/workspace` agent execution links; `skillNames.length` consumers; landing copy | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Standalone run view / routing | No | Pass | Pass | — |
| Voice recording source string → request union | No | Pass | Pass | — |
| Skill scope / built-in sync policy | No | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `agents/*/agent-config.json` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| `agents/autobyteus-daily-assistant/` | New data (seedIfMissing) | Pass | Pass | N/A | Pass | — |
| localStorage `autobyteus.chat.lastModel` | New data | Pass | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server skillScope (with bundled-skill tests on every runtime path) → built-ins → web contract | Pass | Pass | Pass | Pass |
| Web behavior-preserving refactors (step 4, including the voice request) before chat code | Pass | Pass | Pass | Pass |
| Chat core, routing, team quick path | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Skill instruction / New chat draft / box binding / routing | Yes | Pass | Pass | Pass | — |
| Effective skills (bundled record) | Yes | Pass | Pass | Pass | — |
| Registered-draft route transition | Yes | Pass | Pass | Pass | — |
| Footer mode by context | Yes | Pass | Pass | Pass | A reopened Offline `run-7` example is added |

## Material Premise Validation (Only When Needed)

MP-001–MP-004 from round 1 are still valid, and their consequences are now addressed by the SR-006 design (AR-003, AR-001 route/destination, AR-004). MP-005 remains `Unclear` and is handled by the SR-006 rule "change-driven redirect, never on an org route".

### MP-006 — A persisted Offline standalone run opened from history reaches the chat footer with `config.isLocked === false`

- Related approved requirement: REQ-011 / AC-009 ("runtime never changes for a run; settings apply when the next message resumes the run; server rejects edits while active"); the preserved server `runModelConfigEditability` rule; DS-005 (the existing owner is `existingRunConfigStore`).
- Relevant behavior ID(s): BEH-010.
- Initiating basis kind: `User`.
- Independent trigger: the Workspaces tree → click a stored (Offline) single-agent run or chat (UXJ-011, TR-014), or reopen the app and open an earlier chat.
- Forward path:
  1. Tree row → `resolveSelectionRoute` → `/chat?id=<runId>` → `pages/chat.vue` `ensureRunOpen` → `openAgentRun`.
  2. `agentRunOpenCoordinator` sets `config.isLocked = shouldTreatAsLive` (= `resumeConfig.isActive`, which is false for a stored run), and `runContextHydrationService` also sets `isLocked: resumeConfig.isActive`.
  3. → `ChatRunView` → `chatRunModelControls` applies D-08: `config.isLocked === false` → the "unlocked draft context" mode.
- Consequence:
  - The footer edits `context.config` directly with a **selectable runtime**, and "nothing reaches the server".
  - The next send takes the non-temp path in `sendUserInputAndSubscribe` (no `PrepareAgentRun`), so the chosen model is never persisted through `existingRunConfigStore` and does not apply at resume. AC-009 fails.
  - The runtime can appear changeable, which violates REQ-011.
  - `runModelConfigEditability` is bypassed.
  - Inconsistently, a run terminated in the same session keeps `isLocked === true` and would take the persisted path.
- Reachability: `Reachable`. This is the core SCN-007 / UXJ-011 path.
- Review consequence: AR-001 (remaining part). Resolved in SR-007 through the identity-keyed D-08 (AF-28).

### MP-007 — Bundled skill folder name differs from its declared `SKILL.md` name (AGY layout check)

- Initiating basis: data state only. No supported product action creates it, and the current CONFIGURED path already rejects such skills.
- Evidence: a scan of the user's installed package (`agents/*/skills/*`, `agent-teams/*/skills/*`, `agent-teams/*/agents/*/skills/*`) found no mismatches.
- Reachability: `Not Reachable` on current evidence.
- Review consequence: no finding. It stays covered by the RSK-003 escalation trigger.

## Unresolved Approved-Behavior Or Current-State Gaps

None

## Review Decision

- `Pass`

## Findings

None open. All findings are resolved; see `architecture-review-revision-record.md` ARCH-REV-003.

- AR-001 (High): resolved.
  - Round 2 verified the D-13 route sync and the D-04 failed-launch destination.
  - SR-007 verified the D-08 footer mode, which is now keyed on run identity: `temp-*` → `context.config`; a permanent id → `existingRunConfigStore`, whatever `isLocked` holds.
  - The design's Ownership Boundaries, Boundary Map, File Mapping row, Example and Guidance are aligned.
- AR-002, AR-003, AR-004, AR-005: resolved in round 2.
- AR-007 (Low): resolved. The D-04 order is: mark the draft `starting` → register → select → await send → route to `/chat?id=<selected id>` → reset the draft.

## Classification

N/A. The review passed with no open findings.

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- RSK-001, RSK-003 (now including bundled skills and AGY per-layout provenance; MP-007 is covered by its escalation trigger), RSK-004, RSK-005 (change-driven redirect, never on an org route) and RSK-006 (Codex reload tooltip), as stated in the design.
- The hand-off tradeoff remains: the gear editor's advanced non-thinking parameters are not exposed for single-agent runs. This is recorded in the design guidance for the user.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
  - MP-001–MP-004 and MP-006 are reachable, and their consequences are resolved in the design.
  - MP-005 is Unclear; the change-driven redirect rule handles it and it drives no machinery.
  - MP-007 is Not Reachable.
  - No in-scope machinery depends on an unsupported premise.
- Notes:
  - The design is ready for implementation.
  - Implementation should honor the escalation triggers in the design's "Task Size And Architectural Risk" section and in RSK-003.
  - The step 4 behavior-preserving refactor must land with the existing team/org/agent tests passing before any chat code (RSK-004).
  - Bundled-skill ALL_INSTALLED coverage is required on every runtime path.

# Design Review Report — chat-interface-entry

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/requirements-doc.md` (Approved SR-003; SR-004 supplement; SR-006 editorial only)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/investigation-notes.md` (AF-01–AF-31)
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/design-spec.md` (SR-010: D-14 revised to an `agentRunStore` activation-pending marker; D-15 and CR-002 unchanged, implemented and validated in `da1033860`/`46f28bb9f`)
- Supplemental Task Artifacts Reviewed:
  - `ui-ux-spec.md` R2 + VIS-001–025 (no VIS-020)
  - `architecture-review-handoff.md` (SR-008, SR-009 and SR-010 sections)
  - `implementation-evidence/README.md` (IR-002 D-14 and D-15 probe evidence), `implementation-handoff.md`, `implementation-revision-record.md`
  - The triggering downstream evidence:
    - `code-review-report.md` ("API/E2E Failure-Origin Review (Round 2)")
    - `code-review-revision-record.md` (CRR-002)
    - `api-e2e-execution-coverage-report.md` (API-REV-001)
    - `api-e2e-evidence/real-catalog-all-installed.json`
    - `implementation-handoff.md`
- Relevant Solution Revision IDs: SR-003, SR-004, SR-010, SR-011 (REQ-021 / AC-018 / DEC-015, user-approved 2026-09-29), SR-012
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-interface-entry/tickets/in-progress/chat-interface-entry/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-008`
- Current Review Round: `8`
- Trigger (round 8): SR-012, the D-16 revision for ARCH-REV-007 AR-009.
- Trigger (round 7): SR-011 D-16 (Chat model labels), from user-verification Requirement Gap UVF-001 (Delivery DR-002). REQ-021 / AC-018 / DEC-015 were approved by the user on 2026-09-29. The delta is Small/Low; the package stays Large/High.
- Trigger (round 6): Implementation Engineer IR-002 returned `Design Impact` on D-14. The closer is confirmed as `reconcileDiscoveredActiveRuns` ← `fetchRunHistoryTree`, and the `submissionPending` premise is disproved (AF-33). The Solution Designer revised D-14 in SR-010.
- Earlier trigger (round 4): the Solution Designer's post-implementation design revision SR-008. Its source is Code Reviewer CRR-002 (the API/E2E failure-origin review of API-REV-001):
  - CR-004: Design Impact, which fired the RSK-003 trigger.
  - CR-003: Unclear, reclassified by the designer as a Missing Invariant.
  - CR-002: Local Fix.
- Prior Review Round Reviewed: Round 7 / ARCH-REV-007 (Fail, AR-009)
- Latest Authoritative Round: 8
- Current-State Evidence Basis: the implemented branch `codex/chat-interface-entry` (IR-001 commits through `717603e61`, plus uncommitted API/E2E tests). Read in round 4:
  - Server:
    - `agent-execution/backends/antigravity/capsule/agy-configured-skill-materializer.ts` L125–L170: materializes into the capsule, probes the workspace `.agents/skills`, and has a case-insensitive intra-set name check.
    - `backends/shared/workspace-skill-materializer.ts`: registry `sourceCollisionError` L145–L150, path states L205–L250, `reconcileUnavailable`.
    - The `codex-workspace-skill-materializer.ts` / `claude-…` / `grok-workspace-skill-materializer.ts` profiles.
    - `acp-agent-run-backend-factory.ts` L116–L151.
    - The Codex/Claude cleanup call sites (skills are released at thread/session cleanup).
    - `skills/services/skill-service.ts` `listInstalledSkillRecords` (L150–L171) and `skill-discovery.ts` `scanSkillDirectory` (top level only).
  - Web: `stores/runHistoryLoadActions.ts` `reconcileDiscoveredActiveRuns` (L213–L245); the `submissionPending` lifecycle (`localUserSubmission.ts` L78/L114, `agentRuntimeStatusState.ts` L30–L32/L63).
  - Data:
    - The real skill roots from `real-catalog-all-installed.json` (`autobyteus-agents`, `autobyteus-private-agents`, `~/.codex/skills`, `autobyteus-skills`).
    - A name scan found seven same-name skills with different sources, including `software-tutorial-video-maker` (the agent-private copy in `autobyteus-agents/agents/software-tutorial-video-maker/skills/` and a global copy in `~/.codex/skills/`).
    - That agent's `agent-config.json` configures `skillNames: ["software-tutorial-video-maker"]`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged. The SR-008 changes touch server skill materialization for several runtimes and the shared history-reconcile lifecycle.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`. SR-008 did not change any requirement.
- Approved requirements / intended behavior understood: Yes, unchanged.
- Relevant existing behavior and evidence confirmed: Yes. AF-29 to AF-32 match the code. Round 5 also read `workspace-skill-materializer.ts` `releaseMaterializedSkill` (L329–L356: early return when `entry.descriptor !== descriptor`) and `removeOwnedLink` (L480–L500: unlinks only when the link target equals the releasing descriptor's source). These govern the implementation constraints IC-1 and IC-2 below. Windows is a supported desktop build target (`build:electron:windows`). There is one additional relevant fact: Codex and Claude materialized skill symlinks are held in a process-wide registry for each run's whole lifetime and released only at thread/session cleanup. A live (Idle) chat therefore keeps its names occupied in its workspace.
- Scope guardrail confirmed: Yes. D-14 changes pre-existing code, but it protects the in-scope REQ-003 / AC-002 first send, which the chat makes the main entry point. It is proportionate.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001, 003, 004, 007, 008, 009, 011, 012, 013, 014 | User | Pass | Pass | Pass (unchanged since ARCH-REV-003) | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass. D-14 protects the first send against the stale-snapshot teardown (AF-30) | Confirmed | — |
| BEH-010 | User | Pass | Pass | Pass. CR-002 is a local implementation fix (the live persisted footer loads the runtime schema source) | Confirmed | — |
| REQ-007 (system) | System | Pass | Pass | Pass. D-15 Rule 1, Rule 2 A/B and the ACP scope cover MP-008 and MP-009 | Confirmed | IC-1, IC-2 (implementation constraints) |
| REQ-017 / preserved run lifecycle | User | Pass | Pass | Pass. Direction B: a strong request never fails because of weak-only holders; strong vs strong is unchanged | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `ui-ux-spec.md` R2 + VIS | Pass | Pass | Pass | Pass | Pass | — |
| Code review CRR-002 / API/E2E API-REV-001 evidence | Pass | Pass | Pass | Pass | Pass | — |
| Investigation notes AF-29–AF-32 | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Unchanged; D-14 is classified as a Missing Invariant | — |
| Root-cause classification is explicit and evidence-backed | Pass | D-14: AF-30. D-15: AF-29 | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | — | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | The file mapping includes `runHistoryLoadActions.ts` and the materializers | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001–DS-007, DS-009 | as before | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 / first-send reconcile (D-14) | Primary + bounded (history poll) | Pass | Pass | Pass | Pass | Pass (single reconcile owner) | Pass | Pass |
| DS-008 Effective skills → workspace materialization (D-15) | Primary (system) | Pass | Pass | Pass | Pass | Pass (registry-authoritative weak/strong holders) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `SkillService.resolveSkillScope` → bootstrappers → materializers (`workspaceCollisionPolicy`) | Pass | Pass | Pass | Pass | Materializers never inspect `skillScope`; this is good |
| Shared `WorkspaceSkillMaterializer` registry | Pass | Pass | Pass | Pass | All transitions go through the registry phases. IC-1 binds the release semantics |
| `reconcileDiscoveredActiveRuns` | Pass | Pass | Pass | Pass | — |
| Chat-side owners | Pass | Pass | Pass | Pass | Unchanged |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime bootstrappers → `SkillService` → materializer policy | Pass | Pass | Pass | Pass | — |
| Web reconcile → contexts/run store | Pass | Pass | Pass | Pass | — |
| Other owners | Pass | Pass | Pass | Pass | Unchanged |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `requestStrength: 'all_installed' (weak) \| 'configured' (strong)` | Pass | Pass | Pass (defined over user-owned, held-by-other-run, weak-only and strong holder states) | Low | Pass |
| `SkillService.resolveSkillScope(definition)` | Pass | Pass | Pass | Low | Pass |
| The `reconcileDiscoveredActiveRuns` guard (`submissionPending`) | Pass | Pass | Pass | Low | Pass |
| All previously passed interfaces | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Collision handling | Pass | Pass (extends the existing materializers and dispositions) | N/A | Pass | The coverage gap is AR-008 |
| Reconcile invariant | Pass | Pass (reuses `submissionPending`, no new state) | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Server agent-execution materializers (AGY, shared Codex/Claude/ACP) | Pass | Pass | Pass | Pass | ACP/Grok is included |
| Web run history | Pass | Pass | Pass | Pass | — |
| Others | Pass | Pass | Pass | Pass | Unchanged |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| The collision policy value, shared by AGY and the shared materializer | Pass | Pass | Pass | Pass | — |
| Others | Pass | Pass | Pass | Pass | Unchanged |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `requestStrength` + registry `strongHolderCount` / `weakHolderCount` | Pass | Pass | Pass | N/A | Pass | IC-1: per-holder strength must be tracked for release |
| Others | Pass | Pass | Pass | N/A | Pass | Unchanged |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `stores/runHistoryLoadActions.ts` (D-14) | Pass | Pass | N/A | Pass | — |
| `agy-configured-skill-materializer.ts`, `workspace-skill-materializer.ts`, Codex/Claude bootstrappers | Pass | Pass | N/A | Pass | — |
| `acp-agent-run-backend-factory.ts` | Pass | Pass | N/A | Pass | Added in SR-009 |
| `chatRunModelControls.ts` (CR-002) | Pass | Pass | N/A | Pass | Local fix |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| All mapped paths | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Unchanged since ARCH-REV-003 | Pass | Pass | Pass | Pass | SR-008 removes nothing |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Collision policy (`fail` for CONFIGURED, `prefer_workspace` for ALL_INSTALLED) | No. These are two semantic policies, not an old/new dual path | Pass | Pass | — |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Unchanged (agent-config `skillScope`, the built-in folder, the local preference) | Directly Usable / New data | Pass | Pass | N/A | Pass | Workspace skill symlinks are run-scoped runtime state, not persisted data |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| D-14 with the evidence-gated verification (close stack, deterministic reproduction, 14× probe; return `Unclear` if the closer differs) | Pass | Pass | Pass | Pass |
| D-15 + CR-002 in the same implementation round, with validation cases V-A to V-E | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Collision precedence under ALL_INSTALLED | Yes | Pass (A, B, C with `software-tutorial-video-maker`) | Pass | Pass | — |
| Others | — | Pass | Pass | Pass | Unchanged |

## Material Premise Validation (Only When Needed)

MP-001 to MP-007 are unchanged from earlier rounds. See ARCH-REV-001 to ARCH-REV-003 in the revision record.

### MP-008 — Same-name skill held by another live run in the same workspace with a different source (Codex/Claude registry collision)

- Related approved requirement:
  - REQ-007 / AC-002: the Daily Assistant (default) chat starts, with all installed skills.
  - REQ-017 / AC-014 and the preserved normal run lifecycle: catalog and other agent launches work unchanged.
  - REQ-004: the temp workspace is the New chat default.
- Relevant behavior ID(s): BEH-005, REQ-007 (system), REQ-017.
- Initiating basis kind: `User`.
- Independent trigger: the user's real installation has seven same-name skills with different sources. One of them is `software-tutorial-video-maker`:
  - one copy is agent-private at `/Users/normy/autobyteus_org/autobyteus-agents/agents/software-tutorial-video-maker/skills/software-tutorial-video-maker`;
  - one copy is global at `~/.codex/skills/software-tutorial-video-maker`;
  - the "Software Tutorial Video Maker" agent configures `skillNames: ["software-tutorial-video-maker"]`.
- Support evidence: the supported surfaces are the Chat (`@` or tree `+`) and the Agents catalog, which launch that agent. New chat launches the Daily Assistant. Both use the temp workspace by default (REQ-004) and the Codex or Claude runtime.
- Forward path. Two data facts first:
  - ALL_INSTALLED records come from `listInstalledSkillRecords`: `scanSkillDirectory` is top-level only, so the global `~/.codex/skills` copy wins for the Daily Assistant.
  - CONFIGURED resolution for the agent picks its agent-private copy (`resolveContextualSkill`).
  - **Direction A (agent first).** The agent run is live and holds the registry entry `<temp_ws>/.codex/skills/software-tutorial-video-maker` → private source. The user sends a New chat. The Codex bootstrapper → `acquireResolved` finds `existing.sourceRootPath !== sourceRootPath` → `sourceCollisionError` → prepare fails. D-15's `prefer_workspace` does not apply, because this entry is materializer-owned, not "user-owned".
  - **Direction B (chat first).** A Daily Assistant chat is live; Idle chats stay live until terminated, so its symlinks for every installed name persist. The user launches the Software Tutorial Video Maker agent from the catalog or with `@` in the temp workspace. CONFIGURED → `acquireResolved` → `sourceCollisionError` → the agent fails to start.
- Lifecycle and consequence:
  - Direction A breaks AC-002 for the default chat.
  - Direction B is a regression of a preserved, unchanged launch that the new always-live ALL_INSTALLED holder causes.
  - Before this change, only two CONFIGURED agents sharing a name could collide. ALL_INSTALLED makes the default chat claim every installed name in the shared default workspace.
- Reachability: `Reachable`.
- Review consequence: AR-008. Resolved in SR-009 (D-15 Rule 2).

### MP-009 — ACP/Grok workspace-owned collision under ALL_INSTALLED

- Related approved requirement: REQ-007 / AC-002 on any enabled runtime; this is the same governing basis as CR-004 / F-03 and the RSK-003 trigger.
- Initiating basis kind: `User`.
- Trigger: the Daily Assistant is run on the Grok (ACP) runtime in a workspace whose `.grok/skills/<name>` matches an installed skill. This is the same user workflow that CRR-002 accepted as supported for `.agents/skills`.
- Forward path: `acp-agent-run-backend-factory.ts` L116 → the shared `materializeConfiguredWorkspaceSkills` (the `grok-workspace-skill-materializer` profile `.grok/skills`). A `non-symlink` state → `pathStateCollisionError`. D-15 and its file mapping name only AGY, Codex and Claude, so ACP keeps the `fail` behavior.
- Reachability: `Reachable` on the same basis as F-03.
- Review consequence: AR-008 (scope part). Resolved in SR-009.

### MP-010 — Case-variant installed names in one ALL_INSTALLED set (AGY intra-set check)

- Basis: data state only. The real 78-skill catalog passed the AGY capsule materialization (CAT-78), and the name scan found no case variants.
- Reachability: `Not Reachable` on current evidence.
- Review consequence: none. It stays covered by RSK-003.

### MP-011 — Stale history snapshot tears down a pending first send (D-14)

- Initiating basis kind: `System` (the supported 5 s `refreshTreeQuietly` poll in `WorkspaceAgentRunsTreePanel.vue`), during a supported New chat or resend first send.
- Forward path: the server projects a prepared-but-not-started run as not active (AF-30) → `reconcileDiscoveredActiveRuns` → `disconnectAgentStream` + Offline cleanup for a permanent-id context whose `submissionPending` is true.
- Reachability: `Reachable` in principle, and the design gates the fix on close-stack evidence.
- Review consequence: D-14 is accepted as proportionate. It adds no new state, and if the captured closer differs it returns `Unclear`.

### MP-012 — Weak request skipped (Direction A), then the strong holder releases while the weak chat is still live

- Initiating basis kind: `User`. V-A, followed by the user terminating the configured agent from the tree while the Daily Assistant chat stays live.
- Forward path: the strong entry's release brings the counts to zero → the link is removed. The weak run never held the entry, so its live runtime loses that one same-named skill until its next bootstrap (resume).
- Consequence: one duplicate-named skill (seven exist in the real catalog) is temporarily unavailable to a live chat. Nothing fails.
- Reachability: `Reachable`. The consequence is minor.
- Review consequence: non-blocking recommendation R-1 (see Residual Risks). This is not a finding.

## Round 6 — D-14 Revision Review (SR-010)

- Evidence verified:
  - IR-002 `implementation-evidence/README.md`: the closer stack is identical before and after the SR-008 guard. Frames: open +2 ms, CONNECTED +5, `AGENT_STATUS offline` +6, stale snapshot +6, close +10, with `submissionPending=false` at close.
  - Web `stores/runHistoryLoadActions.ts`:
    - `fetchRunHistoryTree`: the workspace branch has no generation guard (the org branch has one) and awaits `buildNextAgentAvatarIndex` before `reconcileDiscoveredActiveRuns`.
    - `reconcileDiscoveredActiveRuns`: inactive runs → disconnect + Offline cleanup; active runs → `connectToAgentStream` when not connected, so it self-heals.
  - `stores/agentRunStore.ts` calls `refreshTreeQuietly()` right after `SEND_MESSAGE`.
  - `services/agentStreaming/agentStreamMessageProjector.ts` already receives `AGENT_COMMAND_ACK` for `SEND_MESSAGE`.
- Verdict on D-14 (SR-010): `Pass`.
  - **Right owner.** `agentRunStore` is the single standalone send owner, and reconcile consults it through `isActivationPending`. It does not reach into the send state, so there is no boundary bypass.
  - **Right invariant.** The marker spans exactly the window that matters: from connect to server-confirmed activation. A snapshot that lists the run as active or should-connect can only be taken after the server has received `SEND_MESSAGE`. So before `SEND_MESSAGE` no snapshot can clear the marker, and the reproduced loss (MP-011 / AF-33) is fully closed.
  - **Clear paths are complete for supported flows:** active snapshot, handled failure or cancel (including the connect timeout), rejected send ack, terminate or close. Live status events are correctly excluded.
  - **Clean cut.** The SR-008 `submissionPending` guard is removed, and `submissionPending` UI semantics are unchanged for agent, team and org views.
  - **Rejected alternatives are sound.** (a) would change the send/stop UI across views. (c) would make other clients attach to prepared, possibly abandoned runs.
  - **Validation is adequate:** the deterministic `stale` probe (first send and Offline resume), a unit test per clear path, and the 14× resend probe. If a close remains, return `Unclear`.

### MP-013 — Out-of-order quiet snapshots after `SEND_MESSAGE`

- Basis: `System`.
  - A 5 s poll snapshot requested before activation, and the post-send `refreshTreeQuietly()` snapshot, can complete out of order. The workspace branch has no generation guard, and each response awaits the avatar index before reconciling.
  - If the fresh (active) snapshot clears the marker first, a later stale one would disconnect the stream and apply Offline cleanup.
- Consequence: `SEND_MESSAGE` has already been accepted, so the message is not lost. The next snapshot, within 5 s, sees the run active and reconnects (`connectToAgentStream`). The result is a transient Offline flicker at most.
- Reachability: `Reachable`, but rare. The consequence is minor and self-healing.
- Review consequence: non-blocking recommendation R-2. Give the workspace branch the same request-generation guard the org branch has (pre-existing gap), in this round or a separate ticket.

### MP-014 — A run activates and ends before any snapshot sees it active

- Basis: `System`, a runtime that fails immediately after accepting `SEND_MESSAGE`.
- Consequence: the marker stays set until terminate or close, so reconcile skips that run. Its UI state still follows the live stream (error/offline events).
- Reachability: `Unclear` / rare, and the consequence is limited.
- Review consequence: residual note only; no machinery required.

## Round 7 — D-16 Review (SR-011)

- Basis: REQ-021 / AC-018 / DEC-015 are user-approved; this is a new approved behavior, not reviewer-invented. The delta is classified Small/Low within a Large/High package, and a review is appropriate because the package is on the independent-review route.
- Evidence read in round 7:
  - `utils/modelSelectionLabel.ts`: `getModelSelectionOptionLabel` / `…Description` take a `ModelSelectionLabelModel` (`modelIdentifier`, `name`, `canonicalName`, `description`, `providerType`).
  - `utils/modelSelectionOptions.ts` L10: `compareRecommendedFirst` is private and typed on `SelectItem` (`recommended`, `name`).
  - `composables/chat/useChatModelCatalog.ts` L60–L110: the catalog rows and the cross-runtime `search`.
  - `components/chat/chatRunModelControls.ts` L92–L125: `fixedModels` and the persisted-mode `modelLabel` are built from `existingRunConfigStore.modelOptionsByAddress['/']` (`ExistingRunModelChoice`), with `name: choice.llmModelIdentifier`.
  - `components/chat/ChatModelMenu.vue` L289–L294: a second, inline search filter for the `fixed` list.
  - `types/agent/ExistingRunModelConfigDraft.ts`: `ExistingRunModelChoice` has `llmModelIdentifier`, `displayName`, `canonicalName`, `description` and `recommended`, but no `providerType`.
- Verdict on D-16:
  - The direction is sound. It reuses the shared label policy, has one owner, cleanly removes the identifier-only shape, keeps the stored identity unchanged, and keeps the single-line rule with a tooltip.
  - The coverage is incomplete (AR-009).

### MP-015 — Persisted-run model menu and footer label after D-16

- Related approved requirement: REQ-021 / AC-018 ("the persisted-run runtime-fixed list" and "the footer trigger" use the shared policy; search matches the canonical and display names).
- Initiating basis kind: `User`. Open a persisted chat on Claude Agent SDK from the tree → the chat view → open the footer model menu (Offline: the runtime-fixed list; live: the locked trigger label).
- Forward path:
  - `ChatRunView` → `useChatRunModelControls` (persisted mode, D-08) → `fixedModels` is built from `ExistingRunModelChoice` with `name = llmModelIdentifier`, and `modelLabel` returns `match.name`.
  - → `ChatModelMenu :fixed` → `ChatModelList` rows, plus the inline `fixed` search filter (`model.name`, `title`, `providerName`).
  - D-16 changes only `useChatModelCatalog`, `ChatModelMenu` and the comparator. The file mapping does not include `chatRunModelControls.ts`.
- Consequence: after the D-16 change, a persisted Claude SDK chat would still show `opus` in the fixed list and on the trigger. Searching `Opus 5.5` or `claude-opus-5-5` in the fixed list would miss. This is the exact UVF-001 symptom on the persisted path, and it fails AC-018.
- Reachability: `Reachable`; this is the normal SCN-007 / UXJ-007 journey.
- Review consequence: AR-009.

## Round 8 — D-16 Re-review (SR-012)

- Evidence verified: the existing gear-editor mapping `choiceLabel` (`components/launch-config/RuntimeModelConfigFields.vue` L218–L219) is `{ modelIdentifier, name: displayName, canonicalName, description }` and is used with the shared label functions (L223–L237). SR-012 moves it into `utils/modelSelectionLabel.ts` as `existingRunChoiceLabelInput` rather than copying it.
- Verdict: `Pass`.
  - **One owner.** `useChatModelCatalog.toChatModelOption` is the single Chat option builder for the catalog rows, search, the draft footer, and the persisted fixed list and `modelLabel` (through `chatRunModelControls.ts`). This closes MP-015.
  - **Label input.** The catalog record comes first; it carries `providerType`, and the CR-002 ensure loads it for persisted runs. The shared existing-run mapping is the fallback for models absent from the catalog. Persisted rows therefore match the launch form whenever the catalog knows the model, and otherwise match the gear editor, which is the same output the product already shows for such models.
  - **Recommended flag.** It comes from the catalog `selectionPresentation`, falling back to `choice.recommended`.
  - **Search.** One predicate (`matchesModelQuery`, via `search` / `filterOptions`) serves both lists, and the inline copy in `ChatModelMenu.vue` is removed.
  - **Order.** The generic `compareRecommendedFirstBy<T>` is exported and used by `buildModelSelectionGroups` and both Chat paths; nothing is duplicated.
  - **Removals are explicit:** the identifier-only `name` / `title` fields, the inline predicate, and the local `choiceLabel`.
  - **Validation.** V-L1 to V-L5 cover AC-018 on both paths and the gear-editor regression (V-L5).
- Residual (non-blocking): while a persisted run's catalog is still loading, rows use the fallback mapping and may relabel once the catalog arrives, which is reactive. For AutoByteus OpenAI-compatible and Qwen models absent from the catalog, the fallback shows the identifier, as the gear editor does today.

## Unresolved Approved-Behavior Or Current-State Gaps

None

## Review Decision

- `Pass`

## Findings

None open. AR-009 is resolved in SR-012 (ARCH-REV-008). AR-001 to AR-005, AR-007 and AR-008 stay resolved. D-14 (SR-010) stays passed.

## Classification

N/A. Pass.

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

- RSK-001, RSK-004, RSK-005 and RSK-006 are unchanged.
- RSK-007 (D-14 closer evidence) is correctly gated.
- RSK-003: size and time passed on four runtimes with the real catalog. The collision coverage is AR-008.
- The `/` menu description versus the workspace or held copy is a presentation note, accepted in the design.
- R-2 (non-blocking, MP-013): add a request-generation guard to the workspace branch of `fetchRunHistoryTree` so an older snapshot cannot reconcile after a newer one.
- MP-014: the marker can outlive a very short activation until terminate or close. This has limited consequence.
- R-1 (non-blocking, MP-012): in Direction A the weak request could join the existing entry as a weak co-holder instead of skipping. The link would then survive the strong holder's release, which is symmetrical with Direction B's "remaining holders accept the last source". The designer may adopt this in a later revision; the current rule is acceptable.
- CR-002 is a local implementation fix. It must keep DEC-009: hide the control when the model has no thinking parameters.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`. MP-015 is resolved by the single option builder and search predicate.
- Notes:
  - SR-012 D-16 is ready for implementation (web only): `toChatModelOption`, `existingRunChoiceLabelInput`, `compareRecommendedFirstBy`, `matchesModelQuery` / `filterOptions`, and V-L1 to V-L5.
  - D-14 (SR-010), D-15 and CR-002 are unchanged.

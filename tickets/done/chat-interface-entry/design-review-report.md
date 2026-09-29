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
- Current Architecture Review Revision ID: `ARCH-REV-015`
- Current Review Round: `15`
- Trigger (round 15): SR-019, the AR-014 resolution (option (a), a synchronous correlation core).
- Trigger (round 14): SR-018, the D-19 amendment after Code Reviewer CRR-012 CR-009 (Agent Org skill folders outside the catalog; a regression versus `personal`) and the user's direction DEC-017a.
- Trigger (round 13): SR-017, the D-19 completion for ARCH-REV-012 (AR-013; R-3 adopted).
- Trigger (round 12): SR-016, a user-approved requirements change (DEC-017; REQ-022–024, AC-019–021). D-19: one skill per name, decided at load, with duplicates blocked at import. It removes D-15 Rules 2–3. The implementation was stopped by the user at `f4864638b`.
- Trigger (round 11): SR-015 from Code Reviewer CRR-010 (the failure origin of API/E2E round 5, API-REV-005). It covers CR-007 / UF-04 (Design Impact) → D-15 Rule 3, and CR-008 / UF-03 (Local Fix, sequenced) → D-18.
- Trigger (round 10): SR-014, the D-17 revision for ARCH-REV-009 (AR-010, AR-011, AR-012).
- Trigger (round 9): SR-013, Product R3 integration (D-17), with user-confirmed R3 decisions DEC-016 (`ui-ux-spec.md` R3 @ `origin/personal@ef5f909`, 26/26 hashes). REQ-011/012/013/014/016/018 and AC-009–012 are revised. The delta is Medium and web-only.
- Trigger (round 8): SR-012, the D-16 revision for ARCH-REV-007 AR-009.
- Trigger (round 7): SR-011 D-16 (Chat model labels), from user-verification Requirement Gap UVF-001 (Delivery DR-002). REQ-021 / AC-018 / DEC-015 were approved by the user on 2026-09-29. The delta is Small/Low; the package stays Large/High.
- Trigger (round 6): Implementation Engineer IR-002 returned `Design Impact` on D-14. The closer is confirmed as `reconcileDiscoveredActiveRuns` ← `fetchRunHistoryTree`, and the `submissionPending` premise is disproved (AF-33). The Solution Designer revised D-14 in SR-010.
- Earlier trigger (round 4): the Solution Designer's post-implementation design revision SR-008. Its source is Code Reviewer CRR-002 (the API/E2E failure-origin review of API-REV-001):
  - CR-004: Design Impact, which fired the RSK-003 trigger.
  - CR-003: Unclear, reclassified by the designer as a Missing Invariant.
  - CR-002: Local Fix.
- Prior Review Round Reviewed: Round 14 / ARCH-REV-014 (Fail, AR-014)
- Latest Authoritative Round: 15
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

## Round 9 — D-17 Review (SR-013, Product R3)

- Basis: R3 and DEC-016 are user-directed and user-confirmed ("I think it looks correct", 2026-09-29). REQ-011, 012, 013, 014, 016 and 018 and AC-009–012 are revised accordingly. The reviewer does not re-judge the product decision.
- Evidence read in round 9 (branch HEAD `66304f510`):
  - `components/layout/RightSideTabs.vue` L155–L175: the contextual watcher on `activeMessagesScopeKey` is `{ immediate: true }` and sets `teamMembers` (collaboration scope) or `progress` (standalone). The `visibleTabs` validity watcher is **not** immediate.
  - `composables/useRightSideTabs.ts`: `activeTab` is module-global. `teamMembers` requires a collaboration `messages` scope, so it is invisible for standalone targets.
  - `components/layout/RightSidebarStrip.vue` L55–L68: a strip click calls `setActiveTab` and then redocks or opens.
  - `pages/workspace.vue` and `pages/chat.vue` are separate route components, so navigating between them remounts `RightSideTabs`.
  - `components/workspace/config/RunConfigPanel.vue` L115 (`isSelectionMode = !!selectedRunId`), `ExistingRunConfigEditor.vue` (`loadAgentCanonical(id)` for every agent selection) and `existingRunConfigStore.ts`: none of them handles `temp-*` ids.
- Accepted:
  - Reusing the product frame (`WorkspaceAdaptiveLayout` / `WorkspaceToolShell`) with `AgentWorkspaceView` restored; the run-summary title; ⚙ and ＋ (preset New chat).
  - The optional standalone `skillTagging` capability (team/org callers pass nothing).
  - The shared right-panel visibility, and the removal of `ChatRunView`, `ChatRunHeader`, the run-mode `ChatComposer`, the persisted `chatRunModelControls` and the fixed-list code paths.
  - D-13, D-14, D-15 and the New chat path are unchanged.
  - Fixing the strip-tab defect in the shared owner is in scope: R3 CHK-015 / VIS-018 and REQ-012 R3 require that a strip click opens exactly that tab.

### MP-016 — Right panel after navigating between Team/Org (`/workspace`) and Chat (`/chat`)

- Related approved requirement: REQ-012 R3 / AC-010 (the chat view uses the same right tabs; team/org views keep their existing view).
- Initiating basis kind: `User`. The panel is open (R3 shared default). In the Team view the Team-members tab is active. The user clicks a chat row in the Workspaces tree, and later clicks a team row.
- Forward path:
  - **Team → Chat.** The selection changes and the route becomes `/chat?id` → a new `RightSideTabs` mounts with the global `activeTab = 'teamMembers'`, which is invisible for a standalone target.
    - Today the immediate contextual watcher corrects this to `progress`.
    - Under D-17's rule ("contextual defaults apply only when the active run/scope changes (not on panel mount)"), nothing corrects it: the `visibleTabs` watcher is not immediate and visibleTabs does not change after mount. The chat's panel shows an invisible active tab (no content).
  - **Chat → Team.** `/workspace` mounts `RightSideTabs` with, for example, `activeTab = 'files'`. The Team view no longer opens on Team members as it does today.
- Consequence: a blank tool panel in the chat view (AC-010), and a change to the preserved Team/Org default tab after navigation.
- Reachability: `Reachable`; this is ordinary tree navigation.
- Review consequence: AR-010.

### MP-017 — ⚙ on a pre-first-send `temp-*` draft

- Related approved requirement:
  - REQ-011 R3 (before the first message, runtime/model/thinking are editable; persisted runs change model only in ⚙).
  - The D-04 failed-launch alternate (a resend from `/chat?id=<temp>`).
  - REQ-017 (catalog launch → chat view).
- Initiating basis kind: `User`. There are two independent starts:
  - (1) Agents catalog → RunConfigPanel "Run agent" → a registered `temp-*` draft → `/chat?id=temp-…`.
  - (2) A New chat whose first send fails (D-04) → `/chat?id=temp-…`.
- Forward path:
  - D-17 renders `AgentWorkspaceView` with ⚙ → `showSelectedRunConfig` → `RunConfigPanel` (`isSelectionMode` is true for any selected id) → `ExistingRunConfigEditor` → `existingRunConfigStore.loadAgentCanonical('temp-…')` → `refreshAgentResumeConfig` for an id the server does not know → `reconciliationRequired`, an error, and a non-editable form.
  - D-17 states "editable draft config for `temp-*` drafts, per the existing behavior". The current and base code has no such behavior.
  - D-17 also removes the run-view footer that edited `context.config` for these drafts (SR-007 D-08).
- Consequence:
  - The user cannot change model or thinking before the (re)send of a draft.
  - In case (2) that is the natural recovery when the failure was model-related.
  - ⚙ presents a broken editor.
- Reachability: `Reachable`.
- Review consequence: AR-011.

## Round 10 — D-17 Re-review (SR-014)

- Verdict: `Pass`.
  - **AR-010 is resolved.**
    - `useRightSideTabs` owns `contextualScopeKey` (the collaboration key, else `standalone:<runId>`) and `lastAppliedScopeKey`.
    - The contextual default applies on mount or on a key change whenever the key differs from the last applied one, so it now survives the `/workspace` ↔ `/chat` remounts (MP-016).
    - `selectTabExplicitly` wins within the same open action, and the validity watcher is immediate, so an invisible tab is always replaced on mount.
    - Validation covers both navigation directions, the strip Files/Terminal clicks, and reopening the same run.
    - Team/Org keys are unchanged (the collaboration scope), so the Team/Org default tab behavior is preserved.
  - **AR-011 is resolved.**
    - `RunConfigPanel` has an explicit draft branch: a standalone `temp-*` selection opens `DraftRunConfigEditor`, an editable `AgentRunConfigForm` bound to `context.config`, with the runtime selectable, the workspace locked, and no `existingRunConfigStore` calls.
    - The inaccurate "existing behavior" claim is corrected.
    - Validation covers a catalog draft and a failed New chat first send (MP-017).
  - **AR-012 is resolved.** REQ-021 / AC-018 are rescoped to the New chat menu plus the ⚙ gear-editor labels, and AC-015 now references VIS-001–027. The change is editorial, with no behavior or approval impact.
- Accepted consequences (non-blocking):
  - Because the standalone key includes the run id, the chat panel re-defaults to Activity (`progress`) when the draft id is promoted after the first send, and when switching between two different chats.
  - This is consistent with the Team/Org per-root default, and reopening the same run keeps its tab.

## Round 11 — D-15 Rule 3 and D-18 Review (SR-015)

- Evidence read in round 11:
  - `code-review-report.md` CRR-010 (UF-04, UF-03).
  - AF-35.
  - `workspace-skill-materializer.ts`: `strongHolderCount` / `weakHolderCount` (L80–L83; IC-1 is implemented) and `reconcileUnresolved` (L349).
  - `ModelConfigSection.vue` `applyDefaultsIfNeeded` (L255–L282): non-thinking schema defaults, plus the budget only when thinking is enabled; thinking keys are skipped.
  - `utils/llmThinkingConfigAdapter.ts` (`getThinkingControlState`, `applyThinkingToggle`).
- **D-15 Rule 3: `Pass`.**
  - Authority: REQ-017 / AC-014 and the D-15 invariant, plus the established contract that an unresolved configured skill is recorded as unresolved and the run starts. UF-04 is a supported normal scenario per CRR-010.
  - An unresolved strong request that meets a `ready` entry held only by weak holders skips, and logs `skipped-unresolved-held-by-weak`. It does not join and does not re-point. That is the same outcome as the configured run alone, so this is proportionate.
  - The rejected alternatives are argued correctly: joining would adopt a source the run never resolved, and fail-fast breaks the invariant.
  - The existing phase waits (`acquiring` / `releasing`) remain before the rule applies.
  - Unresolved vs any strong holder or a user-owned/foreign path keeps today's behavior (pre-existing).
  - The owner is the materializer, which already holds the registry and holder strengths.
  - V-F covers the C20 regression.
- **D-18: `Pass`, with implementation constraint IC-3.**
  - Authority: REQ-011 R3 / VIS-026 and REQ-006 ("choosing a model applies that model's default thinking").
  - Recording an explicit `llmConfig` at every draft model set, and extracting `applyModelConfigSchemaDefaults` as a pure shared function used by both `ModelConfigSection` and `chatDraftStore`, is the right single owner.
  - The team root uses the same value.
  - The historical "Not recorded" rule stays for genuinely unrecorded runs.
- **IC-3 (binding clarification).** D-18 says both that the draft `llmConfig` "equals what the launch form would record" and that it adds the model's default thinking parameters.
  - The launch form's `applyDefaultsIfNeeded` skips thinking keys. For thinking-only schemas (for example Codex `reasoning_effort`), it would therefore record no thinking values.
  - Implement: non-thinking keys = `applyModelConfigSchemaDefaults` (identical to the launch form), and thinking keys = the adapter's default thinking state written explicitly.
  - The validation should assert that non-thinking keys equal the launch form, that thinking keys equal the schema defaults, and that live ⚙ shows the VIS-026 values. It should not assert byte equality with the launch form.
  - Never record `{}` where a later sanitizer would normalize it back to `null`. The recorded config must be non-null whenever the model has a config schema.
- CRR-008 note (the stale mapping rows marked superseded by D-17): accepted.

## Round 12 — D-19 Review (SR-016)

- Basis: DEC-017 and REQ-022–024 / AC-019–021 are user-approved (2026-09-29), including the accepted consequence that a package's own copy is used only if it is the catalog's copy. The user waived Product design for the pop-up.
- Evidence read in round 12:
  - `skills/services/skill-service.ts`:
    - `findGlobalSkillLocation` (L85) searches `getAllSkillDirectories` in Settings order with `searchDirectoryRecursive`.
    - `findCatalogSkillLocation` (L95): skill directories first, then definition-root bundles.
    - `getSkill` (L189), and its callers: `getSkills` (L208), `updateSkill` (L321), `deleteSkill` (L343, `fs.rmSync(skill.rootPath)`), `disableSkill` / `enableSkill`, `getSkillFileTree`, `uploadFile`, `readFile`, `deleteFile` (L385–L423).
  - GraphQL `api/graphql/types/skills.ts`: the `skill(name)` query L136, the file tree L147, `updateSkill` L182, `deleteSkill` L189, `deleteSkillFile` L213.
  - `workspaces/skill-workspace.ts` L24.
  - The real user settings (AF-36): `AUTOBYTEUS_SKILLS_PATHS` = `autobyteus-agents`, `~/.codex/skills`, `autobyteus-skills`, … There are six duplicates between `~/.codex/skills` and `autobyteus-skills`, two of them with different content.
- Accepted:
  - The single-catalog owner (`SkillService`) with four precedence tiers, and runtime-default folders identified by realpath and always last.
  - One CONFIGURED/ALL_INSTALLED resolution from the catalog; the application-owned boundary.
  - `validateIncomingSkillNames` before commit at every import entry point, with the `SKILL_NAME_CONFLICT` error contract.
  - The `skillNameIssues` banner, the Codex `skills/list` path match, the in-design pop-up spec, and the removal of D-15 Rules 2–3 (sound now that every run resolves the same source per name).
  - Persisted data: `Not Affected` / `Directly Usable`. No stored data is rewritten; existing duplicates are handled by the load-time precedence and the banner.

### MP-018 — Skills page operations on a name with an ignored duplicate

- Related approved requirement: REQ-022 ("everything uses that copy"), REQ-024 (the used vs ignored copies are shown), AC-019.
- Initiating basis kind: `User`. With the user's real settings, open the Skills page, which lists the catalog winner. `autobyteus-skills/<name>` wins because `~/.codex/skills` is tier 4. Click the skill to view, edit, disable or delete it.
- Forward path: GraphQL `skill(name)` / `updateSkill` / `deleteSkill` / file APIs → `SkillService.getSkill(name)` → `findCatalogSkillLocation` → `findGlobalSkillLocation` iterates the skill directories in **Settings order**, recursively. It finds `~/.codex/skills/<name>` before `autobyteus-skills/<name>`. For tier-2 vs tier-3 duplicates it also returns the tier-3 folder copy before the tier-2 package bundle.
- Consequence:
  - The Skills page shows and edits the ignored copy while every run uses the catalog copy.
  - Delete removes the wrong folder (`fs.rmSync`), for example the Codex default copy.
  - Edits never affect the copy the agents use.
- Reachability: `Reachable` with the user's current data (the two differing duplicates) and any out-of-band duplicate (REQ-024).
- Review consequence: AR-013.

## Round 13 — D-19 Re-review (SR-017)

- Verdict: `Pass`.
  - **AR-013 is resolved.**
    - `SkillService.getSkill(name)` returns `resolveCatalogRecord(name)?.skill`. That covers the GraphQL `skill(name)` query (L136), the file tree, `updateSkill`, `deleteSkill`, enable/disable, `uploadFile` / `readFile` / `deleteFile`, `getSkills` (L208) and `workspaces/skill-workspace.ts` (L24).
    - `findCatalogSkillLocation`, `findGlobalSkillLocation`, `getGlobalSkill` and the resolver's global-name search (`globalCandidatePaths` / `searchConfiguredSkillCandidate` in the detailed resolver) are removed. By-name directory helpers remain only inside the catalog build or the application-owned boundary.
    - Ignored copies are read-only in the banner.
    - The file mapping (design-spec L806) and validation are added: tier-4 vs tier-3 with different contents, and tier-2 vs tier-3. Detail, file tree, read, update and delete act on the used copy, and the ignored files stay untouched.
    - Verified by grep: at HEAD `f4864638b` the only remaining by-name lookups are in `skill-service.ts` (L85–L123, L189, L259, L295) and the `skill-discovery.ts` helpers. All of them are covered by the SR-017 removal list.
  - **R-3 is adopted.** A rejected reload keeps the previous registration, and the catalog and banner reflect the on-disk state (REQ-024).
- Implementation note: implementation resumes from `f4864638b`. The committed D-15 Rule 3, Rule 2 and IC-2 code must be removed as the D-19 "Materializer simplification" section states. Rule 1 and D-18 (with IC-3) stay.

## Round 14 — D-19 Agent Org Amendment Review (SR-018)

- Basis:
  - DEC-017a (user direction, 2026-09-29) says Agent Org private agents and org-owned teams with their own `skills/` are a normal layout and must behave like agents and teams.
  - CR-009 establishes the regression: at base `fcd3e83a4` and `origin/personal` `cd4ad898b`, an org agent's `<agentDir>/skills/<name>` resolved through `resolveContextualSkill`, and D-19 removed that path.
- Evidence read in round 14 (HEAD `10556948f`):
  - `agent-org-definition/providers/agent-org-owned-definition-source-index.ts`: `listAgentOrgOwnedDefinitionSources` is **`async`** (`fs/promises` readdir/readFile). It parses `org-config.json` and `org.md` and matches the `org_local` members exactly.
  - `agent-org-definition-config.ts` L15/L90: member `refType` is only `agent` or `agent_team`, so there are no nested orgs.
  - `skills/services/skill-service.ts` (implemented D-19): `loadCatalog()` (L129) is **synchronous** and backs the synchronous `listInstalledSkillRecords` / `listSkillNameIssues` / `resolveCatalogRecord` / `getSkill`, the regular and detailed binding builders, and `validateIncomingSkillNames`.
  - Synchronous callers: GraphQL `skills.ts` L154 (`getSkill`), `workspaces/skill-workspace.ts` L24, `claude-session-bootstrapper.ts` L72, `codex-thread-bootstrapper.ts` L245, `agy-agent-run-backend-factory.ts` L40, `acp-agent-run-backend-factory.ts` L115.
  - Real data: the org packages in `autobyteus-agents/agent-orgs` and `autobyteus-private-agents/agent-orgs` (e.g. `nested-classroom-test` with `org_local` agents and teams). None ships `skills/` today.
- Accepted:
  - Tier-2 coverage of org-owned agents, org-owned teams' shared skills, and their team-local agents.
  - The within-root order `agents/*` → `agent-teams/*` → `agent-orgs/*`.
  - Exact enumeration through the org-owned source index rather than guessed paths.
  - No org-level `skills/`, since the Org format defines none.
  - AGY roots: org agent → `agent_private` with the agent dir (`skills/<n>`); org-team shared → `team_shared` with the team dir (`skills/<n>`); org team-local agent → `agent_private` with the team dir (`agents/<a>/skills/<n>`). These satisfy the existing `assertDetailedCandidateProvenance` layout checks.
  - Import validation extended to org layouts.
  - The validation cases.

## Round 15 — D-19 Agent Org Enumeration Re-review (SR-019)

- Verdict: `Pass`. AR-014 is resolved.
  - **One correlation owner.** The pure `correlateAgentOrgOwnedMembers` in `agent-org-definition/providers/agent-org-owned-definition-correlation.ts` holds the `org_local` + `refType` filter, the `candidateIds` match, the exactly-one handling (a malformed correlation skips only that member), the `seen` set and the path construction. It does no I/O.
  - **Two thin readers over it.**
    - The existing async `listAgentOrgOwnedDefinitionSources` / `findAgentOrgOwnedDefinitionSource` keep unchanged signatures for the definition providers and admission.
    - A new sync `listAgentOrgOwnedDefinitionSourcesSync` feeds the synchronous catalog.
    - Only the `readdir` / `readFile` / parse I/O is mirrored, and parity tests guard it.
  - **No API ripple.** There are no `SkillService` or catalog signature changes, so the synchronous callers (GraphQL, `skill-workspace.ts`, the four runtime call sites) are unaffected.
  - **Team-local agents.** Agents inside org-owned teams are enumerated like ordinary teams (the team dir's `agents/*` via `getAgentSkillDirectories`), consistent with the existing team scan.
  - **Mapping and tests.** The file mapping (design-spec L833–L834) is updated, with core unit tests and reader parity tests.
- The SR-018 scope, order, AGY roots, import validation and validation cases, accepted in round 14, are unchanged.

## Unresolved Approved-Behavior Or Current-State Gaps

None

## Review Decision

- `Pass`

## Findings

None open. AR-014 is resolved in SR-019 (ARCH-REV-015). AR-001 to AR-005 and AR-007 to AR-013 stay resolved or superseded as recorded. IC-3 (D-18) still applies.

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
- R-3 (adopted in SR-017): package **reload** after an out-of-band `git pull` cannot undo files already on disk. A rejected reload should show the pop-up, but the catalog already reflects the on-disk content by precedence, per REQ-024. The design could state that a reload rejection reports the conflict and keeps the previous registration, and that the banner covers the live state.
- R-1 (superseded by SR-016: D-15 Rule 2 is removed).
- R-1 (historical, MP-012): in Direction A the weak request could join the existing entry as a weak co-holder instead of skipping. The link would then survive the strong holder's release, which is symmetrical with Direction B's "remaining holders accept the last source". The designer may adopt this in a later revision; the current rule is acceptable.
- CR-002 is a local implementation fix. It must keep DEC-009: hide the control when the model has no thinking parameters.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes:
  - SR-019 (the D-19 Agent Org amendment) is ready for implementation: org layouts in tier 2 through the synchronous correlation core, the AGY roots per the SR-018 table, import validation over org layouts, and the org validation case (the CR-009 regression fix).
  - The other decisions are unchanged.

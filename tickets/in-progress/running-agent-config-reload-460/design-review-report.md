# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `tickets/in-progress/running-agent-config-reload-460/requirements-doc.md` (Approved, SR-002)
- Upstream Investigation Notes: `tickets/in-progress/running-agent-config-reload-460/investigation-notes.md`
- Upstream Solution Revision Record: `tickets/in-progress/running-agent-config-reload-460/solution-revision-record.md`
- Reviewed Design Spec: `tickets/in-progress/running-agent-config-reload-460/design-spec.md` (SR-003, status Ready)
- Supplemental Task Artifacts Reviewed: `evidence/claude-skill-hot-reload-probe.mjs`, `evidence/claude-skill-hot-reload-probe-output.txt`, `follow-ups.md`, `handoff-architecture-design-complete.md` (incl. "Round 2"); `docs/design-cases.md` Case 22 (worktree diff)
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003
- Architecture Review Revision Record: `tickets/in-progress/running-agent-config-reload-460/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: 2
- Trigger: Solution Designer round-2 handoff, 2026-11-13 (SR-003, revised for ARCH-REV-001)
- Prior Review Round Reviewed: 1 (ARCH-REV-001, Fail: AR-001 blocking; AR-002…AR-004 non-blocking)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/running-agent-config-reload-460` at `7b8bcf932f` (base `origin/personal`). Files opened: `skill-update-notices/skill-update-notices.ts`, `services/run-skill-tracker.ts`, `services/skill-update-notice-service.ts`, `services/skill-version-diff.ts`; `tool-list-updates/services/tool-list-update-service.ts:140-215`; `agent-execution/backends/shared/workspace-skill-materializer.ts` (whole file); Claude `claude-agent-run-backend-factory.ts`, `claude-session-bootstrapper.ts:42-124`, `claude-session-cleanup.ts`, `claude-session-manager.ts:126-185`, `claude-session.ts:187, 322`, `claude-session-query-options.ts`, `claude-session-tooling-options.ts:140-149`; Codex `codex-agent-run-context.ts`, `codex-agent-run-backend.ts:111-113, 224-240`, `codex-thread-manager.ts:104-150, 214, 270`, `codex-thread-bootstrapper.ts:80-125, 375-437`; ACP `acp-agent-run-backend.ts:85-95, 184-273`, `acp-agent-run-backend-factory.ts:80-175`; AGY `agy-run-capsule.ts`, `agy-configured-skill-linker.ts`; `credential-proxy/integration-run-access.ts`, `integration-access-rule.ts:61-69`, `run-pass-registry.ts` (method list); `compositions/platform-notice-sources.ts`; `agent-execution/domain/agent-run.ts:156-166`. Round 2 additionally: `codex-agent-run-backend-factory.ts:32-62`, `provider-preparation-guard.ts`, `agy-agent-run-backend.ts:79, 95-160`, and a search for every user of `materializedConfiguredSkills` / `ownSkill` (11 files, all Claude/Codex/guard, all named in the SR-003 file mapping).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three subsystems change (skill notices; `AgentRun` + backend contract + five backends + new shared per-run owner; credential proxy read), about 20 production files; a new mid-run acquisition of shared workspace links racing run release, a contract method every runtime implements, and a changed persisted seen-record reading.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: none. SR-003 keeps Large / High; the ownership move of the link holder across three runtimes strengthens it.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. DEC-001 (notice on every runtime + setup on add, REQ-008), DEC-004 (integration access only at restart, notice says so), DEC-007 (removal = message only), DEC-002 (resumed run hears added and removed), REQ-007 preserved delivery rules.
- Relevant existing behavior and evidence confirmed: Yes.
  - Definition bound once at tracking: `skill-update-notices.ts:43-50`; `run-skill-tracker.ts:8-17`.
  - Restored-run seeding of unseen names: `run-skill-tracker.ts:182`.
  - `diffSkillVersion` gives `updated` with all files `added` for an unseen current skill: `skill-version-diff.ts:15-31`.
  - Tools pattern (coalesced pass, re-read by ID, `applyDefinitionTools`): `tool-list-update-service.ts:150-210`; `agent-run.ts:163-166`.
  - Run-held link lists read live at cleanup: Claude `claude-session-cleanup.ts:31`; Codex `codex-thread-manager.ts:133` (cited as `:133`, it is the `cleanupPreparedWorkspaceSkills` line inside `releasePreparation`); ACP `acp-agent-run-backend-factory.ts:96, 154`.
  - Materializer: `onAcquired` fires synchronously in `startAcquisition`/`joinHolders` before readiness (`workspace-skill-materializer.ts:294-313`); `assertAccepting` is checked before and after each request (`:129, :134, :142`); rollback releases every receipt (`:145-153`); release is idempotent via `releasedHolders` (`:452`).
  - Integration grants issued only through `environmentForRun` (`integration-run-access.ts:27-44`); live withdrawal in `allowsCall` (`integration-access-rule.ts:61-69`).
- Scope guardrail confirmed: Yes (UC-001…003 in scope; FU-001/002/004/005/006/007 and live integration access out of scope).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (no blocking finding remains).
- Remaining material ambiguity: none at the requirements level.
- Statements about existing code the design relies on: all cited lines opened. Round 1's false safety claim is corrected in the investigation notes (Architecture Investigation Findings, "Correction (ARCH-REV-001 AR-001)") and replaced in DS-003. One stale row remains in the design's Architecture Investigation Evidence table ("Mid-run additions reuse it unchanged with an 'is active' guard"); DS-003, the Ownership Map and the Examples are authoritative and correct (residual note, not a finding).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass (DS-003 corrected in SR-003) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-003/004/006 (preserved) | — | Pass | Pass | Pass | Confirmed | — |

Overall: every row `Confirmed`.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/claude-skill-hot-reload-probe*` | Pass | Pass | Pass | Pass (the zero-skills Claude case it does not cover is now stated in Risks and given to the live check, AR-003) | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Feature; triggers listed | — |
| Root-cause classification is explicit and evidence-backed | Pass | `No Design Issue Found`: missing behavior; owners exist (tracker, service, backends, materializer) | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes: Codex planner extraction; `RunWorkspaceSkills` as the single holder of a run's links (replaces the preparation lists, `ownSkill` and the run-context lists) | — |
| Refactor decision is supported by the concrete design sections | Pass | File mapping, removal plan, sequence steps 1-2 (move first with existing tests green, then add the method) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | One Owner Per Node, In Call Order? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass (`AgentRun.applyDefinitionSkills` facade, backend owner) | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | N/A | Pass | Pass (tracker loads; service delivers, as today) | Pass | Pass |
| DS-003 | Bounded local | Pass | Pass: `closed` is set synchronously by `release()`, the only release path, before any held link is read | Pass | Pass | Pass: `RunWorkspaceSkills` drives close → await add → release; AGY's reason for no ordering holds (per-run capsule, never shared) | Pass | Pass |
| DS-004 | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `AgentRun` | Pass | Pass | Pass | Pass | Service uses public methods only |
| `RunWorkspaceSkills` (inside backends) | Pass | Pass | Pass | Pass | Only its backend calls it |
| `IntegrationRunAccess` | Pass | Pass | Pass | Pass | Service never reads `RunPassRegistry` |
| `RunSkillTracker` | Pass | Pass | Pass | Pass | Still the only writer of seen versions |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `skill-update-notices` | Pass | Pass | Pass | Pass | Same direction as tool list updates |
| Backends / `RunWorkspaceSkills` | Pass | Pass | Pass | Pass | Backends never import notice code |
| `credential-proxy` | Pass | Pass | Pass | Pass | Read-only addition |

Principle 16: `Pass`. `integrationRunAccess` is passed through `createPlatformNoticeSources` from each host; the standalone `null` is an explicit composition value matching the existing `integrationRunAccess?.environmentForRun` pattern in every backend, not a lookup. Existing materializer and `SkillService` lookups are used, not added, and the factory passes the instances into `RunWorkspaceSkills`.

## Interface Boundary Verdict

| Interface / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `AgentRunBackend.applyDefinitionSkills(definition)` | Pass | Pass | Pass | Low | Pass |
| `AgentRun.applyDefinitionSkills(definition)` | Pass | Pass | Pass | Low | Pass |
| `RunWorkspaceSkills.acquire(requests, assertPreparing)` | Pass | Pass | Pass | Low | Pass |
| `RunWorkspaceSkills.addFrom(definition)` | Pass | Pass | Pass | Low | Pass |
| `RunWorkspaceSkills.release()` | Pass | Pass | Pass | Low | Pass |
| `RunWorkspaceSkills.hasSkills()` | Pass | Pass | Pass | Low | Pass |
| `RunSkillTracker.applyDefinition(runId, definition)` | Pass | Pass | Pass | Low | Pass (defined in `skillDirs` terms) |
| `IntegrationRunAccess.integrationsStartingOnRestart(run, skillNames)` | Pass | Pass | Pass | Low | Pass |

Empty indirection check: `Pass`. `AgentRun.applyDefinitionSkills` owns the inactive check (as `applyDefinitionTools`, `agent-run.ts:163-166`). `RunWorkspaceSkills` owns applied names and the add-only policy across four runtimes. The Codex planner is a question the owner asks, not a step of another sequence.

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Definition change trigger | Pass | Pass | N/A | Pass | `AgentDefinitionChangeSignal` |
| Seen record, delivery, card | Pass | Pass | N/A | Pass | Skill notice subsystem extended |
| Link acquisition / holders | Pass | Pass | N/A | Pass | Materializer unchanged |
| Per-run add-only setup | Pass | Pass | Pass | Pass | `RunWorkspaceSkills`, four runtimes |
| Integration state | Pass | Pass | N/A | Pass | One read on `IntegrationRunAccess` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Ownership Allocation Is Clear? | Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `skill-update-notices` | Pass | Pass | Pass | Pass | Naming deviation accepted (below) |
| `agent-execution` backends + `backends/shared` | Pass | Pass | Pass | Pass | Six runtimes each mapped; every release path of Claude (cleanup `skills` stage, failed preparation), Codex (`releasePreparation` from terminate/failure, factory `releaseResources`) and ACP (`releaseResources`) calls `release()`; the zero-skills Claude run is traced in Risks |
| `credential-proxy` | Pass | Pass | Pass | Pass | — |
| `compositions` + hosts | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Add-only workspace skill setup (Claude, Codex, Grok, DeepSeek) | Pass | Pass | Pass | Pass | `backends/shared/run-workspace-skills.ts` |
| Codex request planning | Pass | Pass | Pass | Pass | Moved, not duplicated |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk Controlled? | Core vs Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `SkillChange` `added` variant | Pass | Pass | Pass | Pass | Discriminated union member |
| `ResolvedSkill.description` | Pass | Pass | Pass | N/A | Needed for the notice text |

Derived consumers listed with a decision (Principle 11): `Pass` (`seen_skill_versions.json` readers; web card driven by header + sender, unchanged).

Vocabulary (Principle 15): `Pass — deviation recorded, reason holds`. The design records that "skill update notices" now also drives setup (design Task Design Health Assessment, Deliberate deviations). Renaming the folder, sender ID `system.skill_update_notifier`, docs and imports would be churn without behavioral gain; the service still owns one sequence whose product is the notice, with setup as an ordered precondition, and the tool list subsystem already pairs apply + notify. The module doc stating the wider scope is sufficient. "Set up" (prose) vs "materialize" (code) is declared in Terminology as the same concept with the code word kept; acceptable.

## File Responsibility Mapping Verdict

| File | Singular And Clear? | Matches Owner/Boundary? | Re-tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `skill-update-notices/*` (composition, service, tracker, diff, builder, types) | Pass | Pass | N/A | Pass | — |
| `agent-run-backend.ts`, `agent-run.ts` | Pass | Pass | N/A | Pass | — |
| `backends/shared/run-workspace-skills.ts` | Pass | Pass | Pass | Pass | Holder from preparation to release |
| `backends/provider-preparation-guard.ts` | Pass | Pass | N/A | Pass | `ownSkill` removed; `ownCodexClient` stays |
| Claude / Codex / ACP / AGY / native backends + factories | Pass | Pass | N/A | Pass | — |
| `codex/codex-workspace-skill-request-planner.ts` | Pass | Pass | Pass | Pass | Needs the client manager and an optional `ownCodexClient` (today in the guard) |
| `credential-proxy/integration-run-access.ts`, `run-pass-registry.ts` | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear? | Folder Matches Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/shared/run-workspace-skills.ts` | Pass | Pass | Low | Pass | Beside its only collaborator |
| `backends/codex/codex-workspace-skill-request-planner.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RunUsedSkillsResolver` / `RunSkillSource` | Pass | Pass | Pass | Pass | Tracker holds the definition |
| Restore seeding (`run-skill-tracker.ts:182`) | Pass | Pass | Pass | Pass | — |
| Codex planner helpers in bootstrapper | Pass | Pass | Pass | Pass | Moved |
| `ProviderPreparationGuard.ownSkill`, factory `skills` arrays, ACP `owner.skills`, `materializedConfiguredSkills` in run contexts | Pass | Pass | Pass | Pass | Users found by search: Claude factory/context/bootstrapper/cleanup/query options; Codex factory/context/bootstrapper/thread cleanup/thread manager; the guard. All in the mapping |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Retention Exists? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Definition-read-once binding | No | Pass | Pass | Rejected in the log |
| Restored-run seeding flag | No | Pass | Pass | Rejected in the log |

## Persisted-Data Transition Verdict

| Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `<memoryDir>/seen_skill_versions.json` | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Shape unchanged; one writer (`RunSkillTracker`). Existing records hold every skill a run was given at its last activation (new runs record current snapshots, `run-skill-tracker.ts:174-182`; restores seeded unseen names, `:182`) or was told about. Under the new reading they announce exactly the skills added since, which is DEC-002's intent; "no record" keeps meaning "has seen its current skills". |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Planner extraction → contract → per-runtime → credential read → notices → docs → live checks | Pass | Pass (none) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Notice text | Yes | Pass | N/A | Pass | — |
| Mid-run acquisition and release | Yes | Pass | Pass | Pass | `closed` guard, per-name calls, `release()` order; avoided shapes named |
| AC-004 walk-through | Yes | Pass | N/A | Pass | Both orders walked in Guidance |
| Sequence owner, removal, native | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### `MP-001` — A mid-run skill add can still be acquiring links when the run's release reads and releases its held list

- Related approved requirement or established contract: REQ-008, AC-011 ("the link is released when the run ends"), AC-012 ("released at run end"); the established shared-link holder protocol (`WorkspaceSkillMaterializer` holders, bootstrap `assertAccepting` + receipt rollback), which the design adopts for mid-run use and names as its main risk.
- Relevant behavior IDs: BEH-001.
- Initiating basis kind: `User` (definition save) together with `System`/`User` (run release), under the `Contract` above.
- Independent product-supported initiating trigger: (1) the user adds a skill on the agents page or by package reload (SCN-001); (2) independently, the run is released: the user stops it, the idle shutdown releases it, or the runtime fails (Codex thread exit path `codex-thread-manager.ts:270`). Neither depends on the guard under review.
- Support evidence: SCN-001; existing stop / idle-shutdown lifecycle; Codex and Claude release entry points `codex-thread-manager.ts:104-111, 214, 270`, `claude-session-manager.ts:126-140, 184`.
- Forward path: save → signal → pass → `applyDefinitionSkills` → `RunWorkspaceSkills.addFrom` → `materializeConfiguredWorkspaceSkills` (Codex first awaits a `skills/list` request, seconds). Meanwhile release starts:
  - Claude `releaseExactSession` → `cleanupSessionResources`, whose `skills` stage (`claude-session-cleanup.ts:31`) runs in parallel with `process` and `listeners` and records its proof once it has iterated the list; `isRunSessionActive` stays true until the whole cleanup resolves (`claude-session-manager.ts:134-136, 183`).
  - Codex `releasePreparation` sets `owner.cancelled` first (`codex-thread-manager.ts:119`) but `isActive()` (`codex-agent-run-backend.ts:111-113`, `threads.get(runId) === codexThread`) stays true until `threads.delete` after cleanup (`:142`).
  - ACP sets `active = false` before cleanup (`acp-agent-run-backend.ts:268-272`): correct today.
- Lifecycle preconditions and material consequence: on Claude/Codex, a descriptor pushed via `onAcquired` after the held list was iterated, followed by an `assertAccepting` that still sees the run "active", is returned as success and is never released. The registry keeps a holder for the process lifetime and the link `<workspace>/.claude/skills/<x>` (or `.codex/skills`) stays after the run ends; every other run of that workspace keeps listing it (FU-001 surface). AC-011/AC-012 fail.
- Reachability: `Reachable` (the window is the duration of the add, longest on Codex because of `skills/list`; the two triggers are independent and the existing code already treats this race as a contract to uphold at bootstrap).
- Review consequence / proportionate response: round 1: AR-001. Round 2: resolved by SR-003. With `closed` set synchronously by `release()` before any held link is read, every `onAcquired` push is followed by an `assertAccepting` that reads `closed` (`workspace-skill-materializer.ts:134, 142`; the managed path returns through `:134`), so a push after release is always rolled back, and `release()` also awaits the in-flight add.

### `MP-002` — An Antigravity mid-run add can land in the capsule after the run stopped (round 2, from the SR-003 AGY reasoning)

- Related contract: AC-012 (AGY link in its run folder, kept for resume).
- Initiating basis: user save (SCN-001) and run stop/interrupt (independent).
- Forward path: `AgentRun` rejects an inactive run (`agent-run.ts` boundary); an add already past that check may finish after `terminate`/`interrupt` (`agy-agent-run-backend.ts:120-160`).
- Consequence: a link and manifest entry in the run's own capsule that match its definition; the capsule is per run, never shared, and kept for resume (`agy-run-capsule.ts:24-31, 91-118`). No leak and no other run affected. A new start removes the capsule first (`:48`); a new start racing a millisecond add needs a stop plus re-activation inside that window, which no supported workflow does (Principle 6: two supported actions do not make a supported race).
- Reachability: `Reachable` for the late link (harmless by the design's reasoning); `Not Reachable` for an overlap with a new start.
- Review consequence: none. The design's "no release ordering" reason for AGY holds.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None open. Round-1 findings and their resolution (details in `architecture-review-revision-record.md`, ARCH-REV-002):

- AR-001 (blocking, Design Impact): Resolved. `RunWorkspaceSkills` is the single holder from preparation to release; `release()` sets `closed`, awaits the in-flight add, releases; it is the only release path on Claude, Codex and ACP, including failed preparation; the guard reads `closed`. The preparation and run-context lists and `ownSkill` are removed (all users found by search are in the mapping). Required tests named per runtime, including the Claude parallel-stage and Codex `skills/list` windows.
- AR-002: Resolved. One name per materializer call with per-name catch; failed names stay out of the applied set; AGY links one binding per call and its manifest lists only successes.
- AR-003: Resolved. Zero-skills Claude behavior stated in Risks with the auto-execute citation; live check named; `hasSkills()` read per process generation.
- AR-004: Resolved. Added/removed defined in `skillDirs` terms; notice content decided by the `seen` diff at delivery; AC-004 walked through in both orders.

## Classification

N/A (Pass).

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`); informational notice to the Solution Designer.

## Residual Risks

Round 2 notes for implementation (non-blocking):
- Stale row: the design's Architecture Investigation Evidence table still says "Mid-run additions reuse it unchanged with an 'is active' guard and push into the run-held list". Follow DS-003, the Ownership Map and the Examples (`closed` guard).
- Retry wording (AR-002): `addFrom` runs only when the tracker reports added names, so a failed name is retried at the next pass that adds a name for that run (or at the next activation), not on every save. Harmless: the notice already gave the path (REQ-008 "logged").
- `release()` retry: the Claude cleanup stage and Codex `releasePreparation` retry after a failed release. `release()` must stay retryable after a failure (do not cache a rejected release; the materializer's `releasedHolders` already makes repeated holder releases safe), and `closed` stays set.
- Antigravity after an interrupt: `isActive()` is false (`agy-agent-run-backend.ts:79, 121`), so `AgentRun` rejects the setup and the capsule gets no link until a new start (resume does not re-link, FU-002). The notice still gives the path. Same as AGY tools today.

- Integration sentence timing: `environmentForRun` re-issues the pass on every Claude CLI process generation (`claude-session-query-options.ts:42-44`) and every ACP launch including the tool reopen (`acp-session-launcher.ts:118`). When one of those happens soon after the save, the pass may already hold the grant. The sentence is read from the pass when the notice is built, so it stays truthful at that moment; it can only say "starts at restart" when access started a moment later. Pre-existing grant behavior, outside this ticket; no action.
- Busy runs whose save changes both tools and skills get two system messages (tools now, skills now), as today for busy runs; AC-010 covers idle prefaces only. No action.
- Items reviewed first at the designer's request and accepted: `RunWorkspaceSkills` as the single owner of the add-only rule with the Codex planner passed in (pass); restored-run rule on existing records, `Directly Usable — No Migration` (pass); `integrationsStartingOnRestart` read-only, nothing granted (pass); naming deviation (pass, reason holds). DS-003 lifecycle: AR-001 in round 1, resolved in round 2 (SR-003).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-001 resolved by SR-003; MP-002 harmless / overlap Not Reachable)
- Notes: all round-1 findings resolved in SR-003; requirements unchanged (SR-002); classification Large / High.

# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve/requirements-doc.md` (Approved, SR-001)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve/design-spec.md` (SR-002, Ready)
- Supplemental Task Artifacts Reviewed: `probes/agy-symlink-skill-probe.py`, `probes/agy-skill-scan.mjs`, `probes/app-log-excerpt-2026-10-01.txt`; handoff `handoff-architecture-design-complete.md`; prior design `autobyteus-workspace-superrepo/tickets/done/antigravity-cli-runtime-redesign-20260924/design-spec.md` (decisions being reversed, lines 156, 175, 272)
- Relevant Solution Revision IDs: SR-001, SR-002
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: 1
- Trigger: Solution Designer `Architecture Design Complete` (Medium / High)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Worktree `codex/agy-linked-skills-always-auto-approve` @ `84224a58d`. Read: `agy-configured-skill-materializer.ts`, `agy-run-capsule.ts`, `agy-agent-run-backend-factory.ts`, `agy-stream-process.ts`, `skill-service.ts` (catalog load + binding APIs), `configured-agent-skill-resolver.ts`, `configured-agent-skill-binding.ts`, `installed-skill-record.ts`, `workspace-skill-collision-policy.ts`, `agent-run-manager.ts:355-388`, `agent-run-command-coordinator.ts:105-121`, `configured-agent-activation-planner.ts:100-125`, `memory-sync/source/local-memory-export-scanner.ts`, web `utils/agentRunRuntimeDraftPolicy.ts` and grep of `autoExecuteTools` in `.vue` components.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Classification rationale reviewed: Reverses a reviewed security decision of the 2026-09-24 AGY design (per-file containment/copy, optional permission mode); reduces shared skills-domain contracts (`ConfiguredAgentSkillBinding.source`, `InstalledSkillRecord.trustedRoot/configuredRoot`); changes restore semantics. Verified in code.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes — link skill folders into the private capsule (no copy/walk), always auto-approve for AGY (server-enforced, UI locked), ALL_INSTALLED skip vs CONFIGURED fail, restore tolerates removed skills, skill-caused start failures name skill + reason.
- Relevant existing behavior and evidence confirmed: Yes. The incident path `AgyAgentRunBackendFactory.createBackend:35 → SkillService.resolveConfiguredSkillBindingsForAgentDetailed → resolver.resolveDetailedCandidates:193-197 (assertConfiguredSkillSourceSafety) → bare Error("AGY_SKILL_SOURCE_PROVENANCE_INVALID") → AgentRunManager:384-387 generic wrap` matches the app log. Flag mapping (`agy-stream-process.ts:29`) and conditional permission check (`factory:77`) confirmed. Restore throw on missing `SKILL.md` (`agy-run-capsule.ts:88-89`) confirmed.
- Scope guardrail confirmed: Yes (in-scope UC-001..005; out of scope: non-AGY runtimes, skill content, Skills-page indicator, old-capsule migration, new sandboxing; per-file validation reintroduction is a scope change).
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable: Yes (no blocking findings).
- Remaining material ambiguity, if any: None blocking. See AR-001 (non-blocking clarification).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass (app log, resolver/materializer code) | Pass (DS-001: regular bindings → linker symlink; no walk) | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass (unresolved bindings keep warn-skip; catalog is rescanned per call so missing/malformed/mismatched named skills arrive as `unresolved`) | Confirmed | See AR-001 for workspace-collision message |
| BEH-003 | User | Pass | Pass (`workspaceCollisionPolicyForScope`) | Pass (strength applied once in linker loop) | Confirmed | — |
| BEH-004 | User | Pass | Pass (single AGY launch point `factory.launch` used by create and restore; all team/org/delegation paths go through `AgentRunManager` → factory) | Pass (DS-003 server authority; DS-004 display policy) | Confirmed | — |
| BEH-005 | User | Pass | Pass (`restoreAgyRunCapsule:85-90`) | Pass (DS-002 skip/unlink dangling link; old copied capsules pass unchanged reader) | Confirmed | — |
| BEH-006 | Operational | Pass | Pass (`AgentCreationError` passes through manager:384 and coordinator:118-121 unchanged) | Pass | Confirmed | AR-001 |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/agy-symlink-skill-probe.py` | Pass | Pass | Pass (current script records the skip-permissions variants PRB-002/003; PRB-001 no-skip variant is described in notes as the "first variant") | Pass | Pass (evidence only) | — |
| `probes/agy-skill-scan.mjs` | Pass | Pass | Pass | Pass | Pass | — |
| `probes/app-log-excerpt-2026-10-01.txt` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior change with bug-fix trigger | — |
| Root-cause classification is explicit and evidence-backed | Pass | `Duplicated Policy Or Coordination`: AGY-only detailed resolver + fingerprint + copier parallel to the regular binding/link path used by Codex/Claude/ACP — verified in resolver and materializer | — |
| Refactor decision is explicit | Pass | Refactor needed now: yes (converge + delete) | — |
| Refactor decision is supported by concrete design sections | Pass | Removal plan, file mapping, sequence; deferral of shared materializer reuse justified (workspace holder registry vs per-run private capsule) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Governing Owner Clear? | Subject Naming Clear? | Ownership Clear? | Off-Spine Concerns Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | New AGY run | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Resume AGY run | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | AGY launch permission | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Web lock display | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Linker loop (bounded local) | Per-skill exposure | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Risk Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillBindingsForAgent` | Pass | Pass | Pass | Pass | AGY stops using a second, AGY-only resolver API |
| `createAgyRunCapsule` / `restoreAgyRunCapsule` | Pass | Pass | Pass | Pass | Factory must not create links itself |
| `AgyStreamProcess.start` | Pass | Pass | Pass | Pass | Permission choice removed from input |
| Web `isAutoApproveLockedForRuntime` | Pass | Pass | Pass | Pass | Server remains the authority |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Clear? | Forbidden Shortcuts Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity` | Pass | Pass | Pass | Pass | No import of `WorkspaceSkillMaterializer`; skills must not depend on backends |
| Web components | Pass | Pass | Pass | Pass | No inline `antigravity_cli` checks for auto-approve |

## Interface Boundary Verdict

| Interface | Subject Clear? | Responsibility Singular? | Identity Shape Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `linkAgyConfiguredSkills(...) → AgySkillLink[]` | Pass | Pass | Pass | Low | Pass |
| `createAgyRunCapsule` (binding type change) | Pass | Pass | Pass | Low | Pass |
| `restoreAgyRunCapsule` | Pass | Pass | Pass | Low | Pass |
| `AgyStreamProcess.start` (no `autoExecuteTools`) | Pass | Pass | Pass | Low | Pass |
| `isAutoApproveLockedForRuntime(runtimeKind)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Skill resolution | Pass | Pass | N/A | Pass | Reuse regular bindings |
| Request strength | Pass | Pass | N/A | Pass | Reuse `workspaceCollisionPolicyForScope` |
| Directory linking | Pass | Pass | Pass | Pass | Shared materializer owns workspace holder/release lifecycle; AGY capsule is per-run and discarded with run memory |
| Error type | Pass | Pass | N/A | Pass | `AgentCreationError` already passes through |
| Web lock rule | Pass | Pass | N/A | Pass | Extend existing AGY draft policy file |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear? | Reuse/Extend/Create Sound? | Supports Right Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity` | Pass | Pass | Pass | Pass | — |
| `skills` | Pass | Pass | Pass | Pass | Reduction only |
| `autobyteus-web` launch config | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| AGY lock rule across ~9 components | Pass | Pass | Pass | Pass | One helper |
| Skill binding shape | Pass | Pass | Pass | Pass | One binding type for all runtimes |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core vs Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ConfiguredAgentSkillBinding` | Pass | Pass | Pass | N/A | Pass | `source` removed; also removes `realpathSync` throw from `bindInstalledRecord` |
| `InstalledSkillRecord` | Pass | Pass | Pass | N/A | Pass | `origin` removal conditional on compiler; acceptable (only skills-internal consumers found) |
| `AgyCapsuleManifest.skills: AgySkillLink[]` | Pass | Pass | Pass | N/A | Pass | Shape unchanged |

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `capsule/agy-configured-skill-linker.ts` | Pass | Pass | N/A | Pass | Rename + rewrite |
| `capsule/agy-run-capsule.ts` | Pass | Pass | N/A | Pass | — |
| `backend/agy-agent-run-backend-factory.ts` | Pass | Pass | N/A | Pass | — |
| `stream/agy-stream-process.ts` | Pass | Pass | N/A | Pass | — |
| skills service/resolver/domain/discovery | Pass | Pass | N/A | Pass | Removals |
| web policy + components + i18n | Pass | Pass | N/A | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear? | Folder Matches Boundary? | Mixed-Layer Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `backends/antigravity/capsule/*` | Pass | Pass | Low | Pass | No new folders |
| `skills/services/configured-skill-source-fingerprint.ts` | Pass | Pass | Low | Pass | Deleted |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Detailed resolver API and helpers | Pass | Pass | Pass | Pass | Matches code (`resolveForAgentDetailed`, `resolveInstalledRecordDetailed`, `resolveDetailedCandidates`, `bundleCandidates`, `normalizeDetailedRoot`, `assertDetailedCandidateProvenance`) |
| Fingerprint module | Pass | Pass | Pass | Pass | — |
| Snapshot copier | Pass | Pass | Pass | Pass | — |
| Provenance fields / `sourceFor` | Pass | Pass | Pass | Pass | — |
| `autoExecuteTools` on process start; conditional permission check | Pass | Pass | Pass | Pass | — |
| AGY "when off" help text | Pass | Pass | Pass | Pass | — |
| Obsolete tests + docs | Pass | Pass | Pass | Pass | Grep list in investigation notes incl. e2e `agy-native-image-codex-skill` and `agy-production-live` |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility / Dual-Path Exists? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Skill exposure (copy vs link) | No | Pass | Pass | Copy fallback explicitly rejected |
| Old copied capsules on restore | No | Pass | Pass | Unchanged generic reader (`SKILL.md` stat follows links or reads copied dir); no version branch |
| Stored `autoExecuteTools:false` | No | Pass | Pass | Ignored by AGY; no rewrite |

## Persisted-Data Transition Verdict

| Stored Subject | Approved Decision | Evidence Sufficient? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| AGY capsules (`manifest.json`, `.agents/skills/*`) | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Manifest shape unchanged; restore reader is version-agnostic |
| Run metadata `autoExecuteTools` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Ignored for AGY (user-accepted) |

Additional verification: `fs.rm(..., {recursive:true})` in capsule cleanup unlinks directory symlinks without following them; `memory-sync/source/local-memory-export-scanner.ts:63` skips symlinks, so linked skills are not exported with run memory.

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Server skills reduction → AGY linker → tests → web → docs → live check | Pass | Pass (step 1 temporary factory pointer at regular bindings) | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Linker per-skill checks | Yes | Pass | Pass | Pass | — |
| Unusable reasons / messages / logs | Yes | Pass | Pass | Pass | Add workspace-collision message (AR-001) |
| Restore tolerance | Yes | Pass | Pass | Pass | — |
| Web lock | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `PRM-001` — CONFIGURED run fails on a workspace skill-name collision and must surface skill + reason

- Related approved requirement or established contract: REQ-006; D-15 Rule 1 (`workspace-skill-collision-policy.ts`), preserved by BEH-003.
- Relevant behavior ID(s): BEH-002, BEH-006
- Initiating basis kind: `User`
- Independent product-supported initiating trigger: User launches an AGY agent/team member whose definition names skill `X` (CONFIGURED) with a selected workspace that contains its own `.agents/skills/X` (a project shipping native AGY skills).
- Support evidence: Agent/team launch form → select workspace → send first message. D-15 Rule 1 exists explicitly for this collision and is applied by the current materializer (`agy-configured-skill-materializer.ts:157-160`).
- Forward path: `AgentRunCommandCoordinator → AgentRunManager.prepareCandidateOnce → AgyAgentRunBackendFactory.createBackend → createAgyRunCapsule → linker → workspace entry exists + policy fail → throw`.
- Lifecycle preconditions and consequence: Today the throw is a bare `Error("AGY_SKILL_NAME_COLLISION: X")`, wrapped by the manager into the generic "Failed to prepare agent run". Unless the linker raises it as `AgentCreationError`, REQ-006 is unmet for this case.
- Reachability: `Reachable`
- Review consequence: AR-001 (non-blocking clarification; behavior mandated by approved REQ-006).

### `PRM-002` — Linker `missing_manifest` / `source_unavailable` for a resolved binding

- Related approved requirement: REQ-003 / AC-004 ("e.g. its folder is unreadable/vanished").
- Relevant behavior ID(s): BEH-003
- Initiating basis kind: `Contract` (approved AC-004)
- Trigger: Approved acceptance criterion. Note: `SkillService.loadCatalog` rescans disk on every call, so a skill with a missing manifest normally never becomes a `resolved` binding — it is absent from the catalog (ALL_INSTALLED) or arrives as `unresolved` (CONFIGURED → warn-skip, preserving AC-005's alternate outcome). A resolved binding whose folder/`SKILL.md` vanishes before linking is only a short scan-to-link window.
- Reachability: `Reachable` only as that narrow window; the checks are two `stat` calls required by an approved AC.
- Review consequence: No finding. The checks are proportionate. Implementation should not add further machinery for this window.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

### AR-001 — Workspace-collision failure must use the REQ-006 message path (non-blocking clarification)

- Type: Design Impact (clarification)
- Severity: Low — non-blocking
- Protected authority: REQ-006, AC-005 (BEH-006)
- Scope status: Within Approved Scope
- Changes approved behavior: No
- Affected behavior: CONFIGURED AGY run whose named skill collides with a skill in the selected workspace's `.agents/skills`.
- Evidence: `agy-configured-skill-materializer.ts:157-160` throws bare `Error("AGY_SKILL_NAME_COLLISION")`; `agent-run-manager.ts:384-387` wraps non-`AgentCreationError` into the generic message. The design's reason list (`unsafe_name`, `duplicate_name`, `source_unavailable`, `missing_manifest`, `link_failed`) says the workspace collision "keeps existing policy" but does not say how that failure is raised.
- Material premise: PRM-001 (Reachable).
- Required update: In the linker, raise the `fail`-policy workspace collision as `AgentCreationError` naming the skill and a plain reason (e.g. "Antigravity could not use skill 'X': the selected workspace already has a skill with this name."). Skip-vs-fail policy stays unchanged. Apply the same to every linker failure under CONFIGURED, including `duplicate_name` and `unsafe_name`, so no skill-caused throw remains a bare `Error`. Add one linker test.
- Why proportionate: This changes the error type and wording on an existing path. It adds no new behavior.
- Recommended recipient: `/implementation_engineer` (carried in the pass package). The Solution Designer may also fold it into the design text, but no design round is required.

## Classification

N/A — Pass. AR-001 is a non-blocking clarification required by approved REQ-006.

## Recommended Recipient

`/implementation_engineer` (primary pass handoff); `/solution_designer` (informational).

## Residual Risks

- RSK-001 (user-accepted): AGY security posture relaxation (no per-file containment; always `--dangerously-skip-permissions`). This deliberately reverses the 2026-09-24 design decisions at lines 175 and 272. Those decisions were "effective false → normal policy" and "never preserve broken/escaping links".
- ASM-001: `agy` symlinked-skill discovery is verified on the installed CLI only; the live validation in design step 6 is the gate.
- Team/org error surfacing: new member runs go through `prepareNewAgentRun` without wrapping, so `AgentCreationError` messages reach the caller. Collaboration restore failures are wrapped generically (`configured-agent-activation-planner.ts:118-124`), but restore no longer fails because of skills under this design. Keep the design's escalation trigger. API/E2E should assert the message on one team-member CONFIGURED failure.
- Restore unlinks a dangling skill link but keeps the manifest entry. The warning therefore repeats on each resume, and the skill is not re-linked if its source later reappears. This is acceptable under REQ-005, and no further machinery is needed.
- `autobyteus-web/components/agentInput/GroupedSelect.vue` has an auto-execute toggle but no consumers (unused component). It is not a product surface for AC-007. The implementer may leave it or remove it as dead code. It must not be counted as a missing surface.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: The behavior basis is confirmed against current code. Convergence on regular bindings plus a per-capsule linker is the right ownership shape. The removal set matches the code. The persisted-data decision is sound. AR-001 is a non-blocking clarification for implementation.

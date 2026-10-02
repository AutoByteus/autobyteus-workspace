# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: `SR-001` — REQ-001..006, AC-001..009, SCN-001..006; approved by user 2026-10-01 ("i approve").
- Behavior-defining supplements and their approval references: None.
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-linked-skills-always-auto-approve/tickets/in-progress/agy-linked-skills-always-auto-approve/investigation-notes.md`

## Current-State Read

An Antigravity (AGY) run is created by `AgentRunManager.prepareCandidateOnce` → `AgyAgentRunBackendFactory.createBackend`. The factory asks `SkillService.resolveConfiguredSkillBindingsForAgentDetailed` for an AGY-only "detailed" resolution: per skill, `ConfiguredAgentSkillResolver` checks provenance against trusted/configured roots, walks every file (`assertConfiguredSkillSourceSafety`), and fingerprints the whole tree (`fingerprintConfiguredSkillSource`). Then `createAgyRunCapsule` → `materializeAgyConfiguredSkills` copies every file into `<memoryDir>/agy-project/.agents/skills/<name>`, re-checking the fingerprint. Any safety-walk failure throws a bare `Error("AGY_SKILL_SOURCE_…")`, which the manager wraps into the generic `AgentCreationError("Failed to prepare agent run '<id>'.")` (BEH-001, BEH-002, BEH-006).

Codex, Claude and ACP use the regular `SkillService.resolveConfiguredSkillBindingsForAgent` (`resolved`/`unresolved` bindings) and expose each skill as one directory symlink through the shared `WorkspaceSkillMaterializer` (BEH-003).

`AgyStreamProcess.start` passes `--dangerously-skip-permissions` only when `config.autoExecuteTools`; the web defaults AGY to on but leaves the toggle editable on every launch/config surface (BEH-004). `restoreAgyRunCapsule` requires each manifest skill's `SKILL.md` to exist (BEH-005).

The verified design problem is a duplicated, AGY-only skill-exposure policy (detailed resolver + fingerprint + copier, ~600 lines plus provenance fields on shared skill types) that diverges from the shared runtime mechanism and fails closed on ordinary skill-folder contents.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: Server — AGY factory, capsule create/restore, AGY skill materializer (rewritten as linker), stream process flag, `SkillService`, `ConfiguredAgentSkillResolver`, skills domain types, skill discovery fields; deletion of `configured-skill-source-fingerprint.ts`. Web — one policy helper plus ~8 launch/config components and localization. Tests/docs updated accordingly. All within existing owners (AGY backend, skills subsystem, web launch config); no new subsystem.
- Architectural risk: `High`
- Risk rationale and supporting evidence: Deliberately reverses a reviewed security decision of the 2026-09-24 AGY design (per-file provenance/containment checks and capsule-only bytes; `tickets/done/antigravity-cli-runtime-redesign-20260924/design-spec.md` lines 156, 175, 272) and makes AGY always run with `--dangerously-skip-permissions`. Changes shared skills-domain contracts (`ConfiguredAgentSkillBinding`, `InstalledSkillRecord`) and removes an AGY-only resolver API. Changes restore semantics for missing skills.
- Escalation trigger if implementation or validation discovers new impact: The `agy` CLI fails to load a symlinked skill folder in any supported environment (ASM-001); a non-AGY consumer of the removed provenance fields or detailed APIs is found; team/org activation paths turn the named-skill `AgentCreationError` into a generic message (REQ-006).

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Incident trace | `probes/app-log-excerpt-2026-10-01.txt` | Throw at resolver safety walk via factory | Remove detailed path | — |
| Skill scan | `probes/agy-skill-scan.mjs` | Only `browser-automation/.venv` fails | REQ-001 fixture shape | — |
| AGY probes PRB-001..004 | `probes/agy-symlink-skill-probe.py`; historical `agy-skill-discovery-probe` | Symlinked skill folder works only with skip-permissions; identical to copy when on | Link + always auto-approve | ASM-001 |
| Shared link mechanism | `backends/shared/workspace-skill-materializer.ts`, `workspace-skill-links.ts`; Claude/ACP/Codex bootstrappers | Regular bindings → one dir symlink per skill; workspace-scoped registry with holders | Reuse regular bindings; AGY links into its private capsule (no registry needed) | — |
| Consumers of detailed path | grep (investigation notes, Architecture Investigation Findings) | Only AGY factory/capsule/materializer, `SkillService`, resolver, tests, `docs/modules/skills.md`, `docs/modules/antigravity_cli_runtime.md` | Clean removal | Compiler confirms |
| Provenance fields | `skills/domain/configured-agent-skill-binding.ts`, `installed-skill-record.ts`, `skill-discovery.ts` | `source`, `trustedRoot`, `configuredRoot` consumed only by the detailed path | Remove fields | `origin`: remove if compiler shows no consumer |
| Error surfacing | `agent-run-manager.ts:370-387`; `agent-run-command-coordinator.ts:118-121`; `errors.ts` | `AgentCreationError` is rethrown unchanged and its message reaches chat and the `SEND_MESSAGE … not accepted` log line | Throw `AgentCreationError` with skill + reason | Team/org wrappers (escalation trigger) |
| Auto-approve | `agy-stream-process.ts:29`, `agy-agent-run-backend-factory.ts:71,77`; no other AGY permission handling | Single launch point for AGY CLI | Enforce in AGY backend only | — |
| Web surfaces | `ChatNewSurface.vue`/`ChatApprovalToggle.vue`, `AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `TeamScopeConfigEditor.vue`, `MemberOverrideItem.vue`, `AgentOrgRunConfigPanel.vue`, `ExistingRunConfigEditor.vue`, `mobile/MobileLaunchRunOptionsCard.vue`/`MobileRunSetup.vue`; policy `utils/agentRunRuntimeDraftPolicy.ts` | Toggle editable everywhere; AGY help text keys exist | One policy helper, locked display | — |
| Restore | `agy-run-capsule.ts:70-90` | Throws on missing `SKILL.md`; manifest `skills` only read by restore | Warn + remove dangling link | — |

## Intended Change

1. AGY uses the same skill bindings as Codex/Claude/ACP and exposes each resolved skill as one directory symlink at `<capsule>/.agents/skills/<name>` → the skill's real folder. No file walk, fingerprint, or copy.
2. Unusable skills: ALL_INSTALLED → warn and skip; CONFIGURED → `AgentCreationError` naming skill and reason; `unresolved` bindings keep today's warn-and-skip.
3. AGY always launches with `--dangerously-skip-permissions` and always requires `permission_mode: always-proceed`.
4. Web shows the auto-approve control on and disabled whenever the effective runtime is AGY, with an explanation.
5. Restore skips (and unlinks) a skill link whose source no longer exists, with a warning.
6. Remove the AGY-only detailed resolution, fingerprint module, copier and provenance fields.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001, REQ-002; AC-001, AC-002, AC-003 | Chat/agent send on AGY | Investigation BEH-001 | Link skill folders; contents irrelevant | DS-001 |
| BEH-002 | User | REQ-002, REQ-003, REQ-006; AC-005 | AGY run with named skills | Investigation BEH-002 | Link; named unusable skill → clear `AgentCreationError`; semantic skips preserved | DS-001 |
| BEH-003 | User | REQ-003; AC-004 | ALL_INSTALLED AGY run | Investigation BEH-003 | Unusable skill skipped with warning | DS-001 |
| BEH-004 | User | REQ-004; AC-006, AC-007 | Any AGY launch/config | Investigation BEH-004 | Always skip-permissions; locked UI | DS-003, DS-004 |
| BEH-005 | User | REQ-005; AC-008, AC-009 | Resume AGY run | Investigation BEH-005 | Missing linked skill skipped; old copied capsules unchanged | DS-002 |
| BEH-006 | Operational | REQ-006; AC-005 | Skill-caused AGY start failure | Investigation BEH-006 | Message names skill + reason | DS-001 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/agy-symlink-skill-probe.py` | Linked vs copied AGY skill probe | REQ-002/004; AC-002/006 | Basis for link + always-on; reusable for live validation | Evidence |
| `probes/agy-skill-scan.mjs` | Skill-folder scan | REQ-001; AC-001 | Fixture shape for tests | Evidence |
| `probes/app-log-excerpt-2026-10-01.txt` | Incident trace | REQ-006 | Root cause | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (with `Bug Fix` trigger)
- Current design issue found: `Yes`
- Root cause classification: `Duplicated Policy Or Coordination` — AGY has its own skill-resolution and exposure policy parallel to the shared runtime mechanism, and it treats a weak (ALL_INSTALLED) request as hard.
- Refactor needed now: `Yes`
- Evidence: Detailed resolver/fingerprint/copier used only by AGY; regular bindings + link exposure already serve three runtimes; incident caused by the AGY-only per-file policy.
- Design response: Converge AGY on regular bindings and link exposure; delete the parallel policy and its provenance fields.
- Refactor rationale: Keeping both would require maintaining two exposure semantics and exclusion rules; the user approved link parity.
- Intentional deferrals and residual risk: AGY keeps its own small linker instead of the shared `WorkspaceSkillMaterializer`, because AGY links into a per-run private capsule (no shared workspace path, no holder registry or release needed). Residual: two small link implementations; acceptable because their lifecycles differ.

## Terminology

- **Capsule**: per-run private AGY project folder `<memoryDir>/agy-project`.
- **Skill link**: directory symlink `<capsule>/.agents/skills/<name>` → real skill folder.
- **Request strength**: from `workspaceCollisionPolicyForScope(skillScope)`: `prefer_workspace` (ALL_INSTALLED, weak) vs `fail` (CONFIGURED, explicit).

## Design Reading Order

Standard order; sections applied proportionately.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Remove the AGY detailed resolution, fingerprint module, snapshot copier, and provenance fields (see Removal Plan). Old copied capsules need no code: restore treats any existing `SKILL.md` the same whether reached through a copied folder or a link.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: AGY capsules `<memoryDir>/agy-project/{manifest.json,.agents/skills/<name>/…}`; a handful of user runs. Run metadata `autoExecuteTools`.
- Relevant code-model, serialization, semantic, or physical-store change: New capsules hold symlinks instead of copied folders; manifest shape unchanged (`skills[{name, relativePath}]`). `autoExecuteTools` ignored by AGY backend.
- Normal reader/writer behavior and representative evidence: `restoreAgyRunCapsule` reads manifest and stats `<relativePath>/SKILL.md` (follows links). `agy` reads `.agents/skills/*` (PRB-002/003/004).
- Required semantics and invariants under direct use: Manifest identity/workspace/agent-hash checks unchanged; skills resolvable by path.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: Links point outside run memory; deleting run memory removes only the link (`fs.rm` on the capsule does not follow directory symlinks).
- Decision: `Directly Usable — No Migration`
- Decision rationale: Old copied capsules satisfy the unchanged restore reader; new capsules use the same manifest. Stored `autoExecuteTools: false` is ignored rather than rewritten (user accepted).
- Acceptance criteria or design constraints supported by this decision: AC-008, AC-009.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001/002/003/006 | First send to new AGY run | `agy` init accepted | `AgyAgentRunBackendFactory` | Incident path |
| DS-002 | Primary End-to-End | BEH-005 | Send to existing AGY run | `agy --conversation` init accepted | `AgyAgentRunBackendFactory.restoreBackend` | Resume tolerance |
| DS-003 | Bounded Local | BEH-004 | AGY backend launch | CLI argv + init check | `AgyStreamProcess` / factory `launch` | Permission enforcement |
| DS-004 | Bounded Local (web) | BEH-004 | Any launch/config surface renders | Toggle state | `agentRunRuntimeDraftPolicy` helper | Locked display |

## Primary Execution Spine(s)

- DS-001: `Chat/launch send → AgentRunCommandCoordinator → AgentRunManager.prepareCandidateOnce → AgyAgentRunBackendFactory.createBackend → SkillService.resolveConfiguredSkillBindingsForAgent → createAgyRunCapsule → linkAgyConfiguredSkills → AgyStreamProcess.start (skip-permissions) → agy init`
- DS-002: `Send to existing run → AgentRunManager restore → AgyAgentRunBackendFactory.restoreBackend → restoreAgyRunCapsule (skip/unlink missing skills) → AgyStreamProcess.start (--conversation, skip-permissions) → agy init`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Factory resolves regular bindings for the definition, derives request strength from skill scope, creates the capsule; the linker validates each resolved skill minimally, links it, or applies the strength policy (skip+warn vs `AgentCreationError`); process starts with skip-permissions | AGY run, capsule, skill link | AGY backend factory | Warning logging; error message wording |
| DS-002 | Restore validates manifest identity/workspace/agent hash; for each manifest skill, if `SKILL.md` is unreachable, unlink the entry when it is a symlink, warn, continue; process resumes with skip-permissions | AGY run, capsule | AGY backend factory | Warning logging |
| DS-003 | `AgyStreamProcess.start` always includes `--dangerously-skip-permissions`; factory always requires `always-proceed` | AGY process | AGY backend | — |
| DS-004 | Every surface computes `locked = isAutoApproveLockedForRuntime(effectiveRuntimeKind)`; when locked, render checked + disabled + AGY explanation; submitted value forced `true` | Launch config | Web policy helper | Localization |

## Spine Actors / Main-Line Nodes

`AgentRunManager`, `AgyAgentRunBackendFactory`, `SkillService`, `createAgyRunCapsule` / `restoreAgyRunCapsule`, `linkAgyConfiguredSkills`, `AgyStreamProcess`.

## Ownership Map

- `AgyAgentRunBackendFactory`: AGY run create/restore lifecycle; chooses bindings + request strength; owns permission-mode invariant check.
- `SkillService` / `ConfiguredAgentSkillResolver`: the single binding resolution for all runtimes (unchanged semantics).
- `agy-run-capsule.ts`: capsule layout, manifest, restore validation incl. missing-skill tolerance.
- `agy-configured-skill-linker.ts` (renamed from materializer): per-skill exposure decision and symlink creation inside the capsule; owns unusable-skill reasons and the skip/fail policy application.
- `AgyStreamProcess`: CLI argv; always skip-permissions.
- Web `agentRunRuntimeDraftPolicy.ts`: single AGY auto-approve lock rule.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no new facades.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillBindingsForAgentDetailed` | AGY uses regular bindings | `resolveConfiguredSkillBindingsForAgent` | In This Change | — |
| `ConfiguredAgentSkillResolver.resolveForAgentDetailed`, `resolveInstalledRecordDetailed`, `resolveDetailedCandidates`, `bundleCandidates`, `normalizeDetailedRoot`, `assertDetailedCandidateProvenance`, `safetyFailure`, `contains` | Only served detailed path | Regular `resolveForAgent` / `bindInstalledRecord` | In This Change | — |
| `skills/services/configured-skill-source-fingerprint.ts` (whole file) | No walk/fingerprint | — | In This Change | Delete |
| `DetailedConfiguredSkillResolution` type | Detailed path removed | `ConfiguredAgentSkillBinding` | In This Change | — |
| `ConfiguredSkillSource` and `source` on `resolved` binding; `sourceFor` in resolver | Provenance only for AGY copy | — | In This Change | — |
| `InstalledSkillRecord.trustedRoot`, `.configuredRoot` and their computation in `skill-discovery.ts` | Only consumed by detailed path | — | In This Change | Remove `origin` too if compiler shows no remaining consumer; otherwise keep it as a plain union on the record |
| `snapshotSkill` copier, `same`, `MAX_FILE_BYTES`, fingerprint import in AGY materializer | Copy replaced by link | `agy-configured-skill-linker.ts` | In This Change | File renamed |
| `autoExecuteTools` field on `AgyStreamProcess.start` input; conditional permission check in factory | Always on | Unconditional flag/check | In This Change | — |
| AGY "When off, denied actions cannot be approved in chat" help text keys | Toggle no longer changeable for AGY | New locked explanation key(s) | In This Change | en + zh-CN |
| Tests: `agy-configured-skill-materializer.test.ts` (copy/fingerprint cases), detailed cases in `skill-service*.test.ts`, `skill-catalog-*.test.ts` provenance assertions | Behavior removed | New linker/capsule tests | In This Change | — |

## Return Or Event Spine(s) (If Applicable)

N/A — no event-flow change.

## Bounded Local / Internal Spines (If Applicable)

- Linker loop (parent: `createAgyRunCapsule`): `for binding → unresolved? warn-skip → unusable? (strength: skip-warn | throw AgentCreationError) → workspace collision? (existing policy) → symlink → record manifest entry`. Matters because it is where REQ-003 is applied exactly once.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Skip warning logging | DS-001, DS-002 | Linker / restore | One sanitized line per skipped skill: run, agent, skill, disposition, reason | Operability | Noise or leaked paths |
| User-facing reason text | DS-001 | Linker | Map reason code → plain sentence for `AgentCreationError` | REQ-006 | Raw codes in UI |
| Localization | DS-004 | Web policy | Locked explanation text | REQ-004 | Inconsistent wording |

## Ownership Boundaries

- Skill resolution stays behind `SkillService`; AGY must not read catalog records or resolver internals directly.
- AGY skill exposure stays inside the AGY capsule folder; AGY must not write into the selected workspace.
- Permission mode is decided only in the AGY backend; web locking is display/submit policy, not the enforcement authority.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `SkillService.resolveConfiguredSkillBindingsForAgent` | Resolver, catalog, disabled store, scope | All runtime factories | AGY calling catalog/resolver directly | Extend `SkillService`, not AGY |
| `createAgyRunCapsule` / `restoreAgyRunCapsule` | Linker, MCP config, manifest | AGY factory | Factory creating links itself | — |
| `AgyStreamProcess.start` | argv | AGY factory | Any caller passing a permission choice | — |

## Dependency Rules

- `backends/antigravity/*` may depend on `skills/services/skill-service`, `skills/domain/configured-agent-skill-binding`, `backends/shared/workspace-skill-collision-policy`, `agent-execution/errors`.
- `skills/*` must not depend on any runtime backend.
- AGY must not import `backends/shared/workspace-skill-materializer` (different lifecycle); importing pure helpers from `workspace-skill-links.ts` is allowed but not required.
- Web components must use the policy helper; no inline `runtimeKind === 'antigravity_cli'` checks for auto-approve.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `linkAgyConfiguredSkills({capsulePath, workspacePath, bindings, runId, agentDefinitionId, workspaceCollisionPolicy})` → `AgySkillLink[]` (`{name, relativePath}`) | Capsule skill links | Link or apply strength policy | `ConfiguredAgentSkillBinding[]` | Replaces `materializeAgyConfiguredSkills`; `AgySkillSnapshot` renamed `AgySkillLink` (same shape, manifest unchanged) |
| `createAgyRunCapsule({…, configuredSkillBindings: readonly ConfiguredAgentSkillBinding[]})` | Capsule | Unchanged otherwise | — | Type change only |
| `restoreAgyRunCapsule` | Capsule | Missing-skill tolerance | — | — |
| `AgyStreamProcess.start({capsulePath, agentName, workspacePath, model, conversationId})` | Process | Always skip-permissions | — | `autoExecuteTools` removed |
| Web `isAutoApproveLockedForRuntime(runtimeKind: string \| null \| undefined): boolean` | Launch policy | `true` for `antigravity_cli` | — | In `utils/agentRunRuntimeDraftPolicy.ts`; existing `autoExecuteForNewRuntimeSelection`/`withNewRuntimeOverridePolicy` reuse it |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `linkAgyConfiguredSkills` | Yes | Yes | Low | — |
| `restoreAgyRunCapsule` | Yes | Yes | Low | — |
| `AgyStreamProcess.start` | Yes | Yes | Low | — |
| `isAutoApproveLockedForRuntime` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| AGY skill exposure | `agy-configured-skill-materializer.ts` → `agy-configured-skill-linker.ts`, `linkAgyConfiguredSkills` | Yes | Low | Rename (snapshot semantics gone) |
| Manifest entry | `AgySkillSnapshot` → `AgySkillLink` | Yes | Low | Rename type only |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Skill resolution | `SkillService.resolveConfiguredSkillBindingsForAgent` | Reuse | Same as other runtimes | — |
| Request strength | `workspaceCollisionPolicyForScope` | Reuse | Existing weak/strong source | — |
| Directory link | `WorkspaceSkillMaterializer` | Not reused (Rejected) | Workspace registry/holders/release not applicable to a per-run private folder | Small linker in AGY capsule |
| Error type | `AgentCreationError` | Reuse | Already surfaces message | — |
| Web lock rule | `agentRunRuntimeDraftPolicy.ts` | Extend | Existing AGY policy home | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity` | Linking, restore tolerance, permission flag, error raising | DS-001..003 | AGY factory | Extend | — |
| `autobyteus-server-ts/src/skills` | Bindings (simplified) | DS-001 | All runtimes | Reduce | Removals |
| `autobyteus-web` launch config | Locked toggle | DS-004 | Users | Extend | — |

## Draft File Responsibility Mapping

See Final mapping (no extraction changed the draft).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| AGY auto-approve lock rule across 8+ components | `autobyteus-web/utils/agentRunRuntimeDraftPolicy.ts` | Web launch config | One rule | Yes | Yes | A generic runtime-capability registry |
| Skill binding shape | `skills/domain/configured-agent-skill-binding.ts` | Skills | One binding type for all runtimes | Yes (`source` removed) | Yes (detailed type removed) | — |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ConfiguredAgentSkillBinding` = `{kind:"resolved", skill}` \| `{kind:"unresolved", name}` | Yes | Yes | Low | — |
| `InstalledSkillRecord` without `trustedRoot`/`configuredRoot` | Yes | Yes | Low | — |
| `AgyCapsuleManifest.skills: AgySkillLink[]` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `server/src/agent-execution/backends/antigravity/capsule/agy-configured-skill-linker.ts` (rename + rewrite) | AGY | Capsule | Link resolved skills; reasons; skip/fail policy; warnings | One exposure concern | Bindings, collision policy, `AgentCreationError` |
| `.../capsule/agy-run-capsule.ts` | AGY | Capsule | Use linker; binding type; restore tolerance | Capsule lifecycle | — |
| `.../backend/agy-agent-run-backend-factory.ts` | AGY | Factory | Regular bindings; unconditional permission check | Lifecycle owner | — |
| `.../stream/agy-stream-process.ts` | AGY | Process | Always skip-permissions | argv owner | — |
| `server/src/skills/services/skill-service.ts` | Skills | Service | Remove detailed API | — | — |
| `server/src/skills/services/configured-agent-skill-resolver.ts` | Skills | Resolver | Remove detailed/provenance code | — | — |
| `server/src/skills/services/configured-skill-source-fingerprint.ts` | Skills | — | Delete | — | — |
| `server/src/skills/domain/configured-agent-skill-binding.ts`, `installed-skill-record.ts`, `services/skill-discovery.ts` | Skills | Domain | Remove provenance fields | — | — |
| `web/utils/agentRunRuntimeDraftPolicy.ts` | Web | Policy | `isAutoApproveLockedForRuntime`; existing helpers use it | Single rule | — |
| `web/components/chat/ChatApprovalToggle.vue` + `ChatNewSurface.vue`; `workspace/config/AgentRunConfigForm.vue`, `TeamRunConfigForm.vue`, `TeamScopeConfigEditor.vue`, `MemberOverrideItem.vue`, `AgentOrgRunConfigPanel.vue`, `ExistingRunConfigEditor.vue`; `mobile/MobileLaunchRunOptionsCard.vue`, `MobileRunSetup.vue` | Web | Components | Render locked state from helper using the effective runtime of that scope/member | — | Helper |
| `web/localization/messages/{en,zh-CN}/*.ts` | Web | i18n | Locked explanation | — | — |
| `server/docs/modules/antigravity_cli_runtime.md`, `server/docs/modules/skills.md`, web docs mentioning AGY auto-approve | Docs | — | Describe links + always auto-approve | — | — |

## Applied Patterns (If Any)

Strength-policy application (existing D-15 pattern): request strength derived from skill scope, applied at one point.

## Target Subsystem / Folder / File Mapping

Same folders as today; one file renamed (`agy-configured-skill-materializer.ts` → `agy-configured-skill-linker.ts`), one file deleted (`configured-skill-source-fingerprint.ts`). No new folders.

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `backends/antigravity/capsule` | Persistence-Provider (capsule) | Yes | Low | — |
| `skills/services` | Off-Spine Concern (shared) | Yes | Low | — |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Linker per-skill checks | `realpath(skill.rootPath)` is a directory and `<real>/SKILL.md` is a file → `symlink(real, <capsule>/.agents/skills/<name>, "dir")` | Walking or reading any other file in the skill folder | REQ-001/QR-001 |
| Unusable reasons | `unsafe_name`, `duplicate_name`, `source_unavailable` (missing/not a directory), `missing_manifest`, `link_failed`; workspace collision keeps existing policy | Re-introducing size/containment/symlink-target rules | Scope guardrail |
| Explicit failure message | `AgentCreationError("Antigravity could not use skill 'browser-automation': its folder no longer exists.")` | `Error("AGY_SKILL_SOURCE_PROVENANCE_INVALID")` | REQ-006 |
| ALL_INSTALLED skip log | `AGY configured skill skipped: run=…, agent=…, skill=browser-automation, disposition=skipped-unusable, reason=source_unavailable` | Throwing | REQ-003 |
| Restore | `SKILL.md` stat ENOENT/ENOTDIR → if `lstat(entry).isSymbolicLink()` unlink; warn; continue | Throwing `AGY_CAPSULE_INVALID: configured skill missing.` | REQ-005 |
| Web lock | `const locked = isAutoApproveLockedForRuntime(runtimeKind); checked = locked \|\| value; disabled = locked \|\| readOnly` | Per-component `runtimeKind === 'antigravity_cli'` checks | REQ-004 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep copier as fallback when linking fails | "Safety net" | Rejected | Link only; failures follow strength policy |
| Keep detailed resolver for other uses | Possible future use | Rejected | Removed; no consumers |
| Exclusion list (`.venv`, `node_modules`…) on the copier | Earlier proposal | Rejected | Superseded by linking (DEC-001) |
| Honor `autoExecuteTools:false` for AGY | Existing toggle | Rejected | Always on (DEC-002) |
| Rewrite old capsules' copied skills into links | Uniformity | Rejected | Directly usable; no migration |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Server skills: remove detailed API, provenance fields and fingerprint module; fix compile errors in AGY (temporarily point factory at regular bindings).
2. AGY: rename materializer → linker and implement linking + strength policy + `AgentCreationError`; update capsule create/restore; remove `autoExecuteTools` from process start; unconditional permission check.
3. Server tests: replace copy/fingerprint tests with linker tests (fixture skill with `.venv` symlink outside + >32 MiB sparse file; team-private skill with relative link into `shared/`; ALL_INSTALLED skip; CONFIGURED fail message; restore with missing source; restore legacy copied capsule); factory test asserting argv always contains skip-permissions.
4. Web: add helper, apply to all listed surfaces, update i18n and component tests.
5. Docs: update `antigravity_cli_runtime.md`, `skills.md`, web docs.
6. Live check (API/E2E): real `agy` with user-like skill set incl. `browser-automation` `.venv`, using `probes/agy-symlink-skill-probe.py` pattern and an actual Chat run.

## Key Tradeoffs

- Simplicity and runtime parity over run-start skill immutability and per-file containment (user-approved).
- Small AGY-local linker instead of reusing the shared workspace materializer (different lifecycle).

## Risks

- RSK-001 (accepted): Security posture relaxation for AGY.
- ASM-001: future `agy` versions changing symlink handling → caught by live validation.
- Team/org activation wrapping could hide the `AgentCreationError` message (escalation trigger).

## Guidance For Implementation

- Do not add any per-file inspection of skill folders.
- Use `fs.symlink(realSource, target, "dir")`; capsule is fresh, so `EEXIST` indicates a duplicate and maps to `duplicate_name`.
- Keep warning lines sanitized (`logIdentity`); no absolute source paths in user-facing messages beyond the skill name.
- `fs.rm(root, {recursive:true, force:true})` in capsule cleanup does not follow directory symlinks — keep it, and add a test asserting the source skill survives capsule cleanup.
- Web: the submitted config for an AGY scope must carry `autoExecuteTools: true` (helper forces it) so stored metadata stays consistent for new runs.

# Proposed Design Document

## Design Version

- Current Version: `v4`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Added a shared runtime-skill resolution boundary, Codex native skill-turn injection, and Claude selected-skill prompt injection. | 1 |
| v2 | Codex app-server follow-up hardening | Added canonical-`cwd` Codex client reuse and client-release lifecycle so the integration no longer uses one global client across unrelated workspaces. | 3 |
| v3 | Codex configured-skill live proof follow-up | Added a lightweight Codex text-path skill-reference hint so configured skills are both attached natively and explicitly referencable during live turns. | 5 |
| v4 | Raw Codex custom-skill discovery probe | Replaced Codex turn-level skill attachment design with workspace-local repo-skill materialization under `.codex/skills/`, plus `agents/openai.yaml` preservation/synthesis and cleanup ownership. | 7 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/agent-skill-runtime-support-investigation/investigation-notes.md`
- Requirements: `tickets/in-progress/agent-skill-runtime-support-investigation/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Introduce one shared runtime boundary that resolves agent instructions, configured skills, and effective skill access mode once per run creation/restore. Keep runtime-specific consumption separate: Claude continues to consume the selected skills through a generated skill-instruction block appended to the Claude turn preamble, while Codex now consumes the selected skills by materializing them as repo-scoped workspace skills under `.codex/skills/` so the app server can discover and invoke them natively. Preserve the canonical-`cwd` Codex client reuse hardening so the same workspace/worktree shares one client while unrelated workspaces do not. This keeps agent-scoped skill behavior consistent across runtimes while aligning Codex to the app server’s real custom-skill discovery contract.

## Goals

- Make `AgentDefinition.skillNames` effective for both `codex_app_server` and `claude_agent_sdk`.
- Preserve existing instruction loading behavior from `agent.md` and description fallback.
- Respect `SkillAccessMode.NONE` and continue non-fatal handling of unresolved skill names.
- Keep runtime-specific skill wiring inside the runtime-execution layer, not inside agent-definition persistence or frontend layers.
- Limit Codex workspace mutation to hidden `.codex/skills` bundles owned by the run and clean them up when the runtime session closes.
- Reuse one Codex app-server client per canonical workspace/worktree path instead of one global client for all workspaces.
- Avoid one Codex app-server process per session/thread by default.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace the current instruction-only runtime bootstrap assumption with a shared instruction+skill runtime context model.
- Gate rule: design is invalid if it depends on compatibility wrappers, dual-path behavior, or legacy fallback branches.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Resolve configured skills during runtime bootstrap. | AC-001 | Shared runtime bootstrap returns selected skills + effective access mode. | UC-001, UC-002, UC-003 |
| R-002 | Expose configured skills to Codex through repo-scoped workspace skill bundles. | AC-002 | Codex session bootstrap materializes selected skills into discoverable workspace `.codex/skills` bundles when enabled. | UC-002 |
| R-003 | Expose configured skills to Claude turn construction. | AC-003 | Claude prompt context includes selected skill instructions and root paths when enabled. | UC-003 |
| R-004 | Respect skill access rules and unresolved-skill handling. | AC-001, AC-004 | `NONE` suppresses skills; unresolved names are skipped without run failure. | UC-001, UC-002, UC-003, UC-004 |
| R-005 | Verify create/restore/turn wiring and suppression paths. | AC-005 | Tests cover both runtimes and shared resolution behavior. | UC-004 |
| R-006 | Scope Codex client reuse by canonical workspace path. | AC-006 | Same canonical `cwd` reuses one started client; different `cwd`s isolate into different clients without one-client-per-session churn. | UC-005 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Both runtime adapters resolve working directory and instruction metadata, then hand runtime options to runtime services. Codex process startup is coordinated through one process manager. | `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts`, `autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts` | Whether Codex client lifecycle should stay global or move to a narrower `cwd` boundary. |
| Current Naming Conventions | Runtime boot helpers use `resolve*`, session state lives in `*-runtime-shared.ts`, and turn-input composition stays near the runtime-specific service. | `single-agent-runtime-metadata.ts`, `codex-user-input-mapper.ts`, `claude-runtime-turn-preamble.ts` | Whether the old file name `single-agent-runtime-metadata.ts` remains accurate once it resolves skills too. |
| Impacted Modules / Responsibilities | Codex already owns turn input serialization; Claude already owns prompt preamble construction. Shared agent-definition and skill lookup already exist elsewhere. | `codex-user-input-mapper.ts`, `claude-runtime-turn-preamble.ts`, `agent-run-manager.ts`, `skill-service.ts` | Whether Claude runtime should use native SDK skills or prompt-context delivery. |
| Data / Persistence / External IO | Skill resolution relies on local filesystem-backed `SkillService`; runtime references persist `metadata`, so large skill bodies should not be stored there. Codex app-server startup currently shells out to a local process and therefore needs a stable but not over-broad reuse boundary. | `skills/services/skill-service.ts`, `runtime-adapter-port.ts`, `claude-runtime-service-support.ts`, `codex-app-server-process-manager.ts` | Exact persisted metadata shape should stay small enough for run history and restore flows. |

## Current State (As-Is)

- `single-agent-runtime-metadata.ts` resolves only instruction metadata.
- Codex adapter and Claude adapter pass only instruction metadata into runtime services.
- Codex turn mapping emits text/image inputs only.
- Claude turn construction uses only team/agent/runtime instructions.
- `skillAccessMode` is ignored by both Codex and Claude adapters.
- `CodexAppServerProcessManager` currently reuses one global client/process for all requested `cwd` values.
- Codex currently depends on turn-level native `skill` attachments and, after the `v3` follow-up, user-text mutation, but direct raw probing showed that this is not the correct custom-skill contract.

## Target State (To-Be)

- A shared runtime-context resolver returns:
  - instruction metadata,
  - resolved configured skills,
  - effective skill access mode,
  - lean persisted runtime metadata.
- Codex session bootstrap materializes selected skills into workspace-local repo skill bundles under `.codex/skills/`.
- Codex preserves source `agents/openai.yaml` when present and synthesizes a minimal Codex-facing `agents/openai.yaml` when absent.
- Codex turn input remains plain user content; configured-skill exposure is achieved through repo-skill discovery rather than turn-level `skill` attachments or user-text mutation.
- Claude session state carries selected skill descriptors and renders a selected-skill instruction block into each turn preamble.
- Persisted runtime metadata remains lean and does not include full skill bodies.
- Codex process management reuses one app-server client per canonical `cwd` and releases it when no active holder still depends on it.

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement (design and review use the same rules): use one shared runtime-skill resolution boundary plus runtime-specific consumption boundaries.
- SoC cause statement (how concerns are split and owned): agent-definition/skill lookup stays in shared runtime bootstrap; Codex owns Codex protocol serialization; Claude owns Claude prompt construction.
- Layering result statement (how layering emerges from SoC + dependency direction for this scope): adapter -> shared runtime-context resolution -> runtime-specific session/service -> runtime-specific turn construction.
- Decoupling rule statement (one-way, replaceable boundaries; no unjustified cycles): shared runtime-context code must not import Codex- or Claude-specific modules; runtime-specific modules consume shared resolved types only.
- Module/file placement rule statement (file path/folder must match owning concern or explicitly justified shared boundary): shared resolution/rendering belongs in `src/runtime-execution/`; Codex and Claude consumption stay in their respective subfolders.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add` a shared runtime-context resolver and `Keep` runtime-specific turn-consumption boundaries separate.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): this removes duplicated agent-definition/skill lookup logic, keeps Codex and Claude wiring explicit and testable, and avoids an over-generalized runtime abstraction for two materially different skill-consumption mechanisms.
- Layering fitness assessment (are current layering and interactions still coherent under emergent-layering rules?): `Yes`
- Decoupling assessment (are boundaries low-coupled with clear one-way dependency directions?): `Yes`
- Module/file placement assessment (do file paths/folders match owning concerns for this scope?): `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`
- Note: `Keep` is valid when layering and boundary interactions are already coherent.

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers (provider selection/fallback/retry/aggregation/routing/fan-out) exists | Yes | Both adapters need identical agent-definition + skill-resolution work before runtime startup. | Extract shared runtime-context boundary |
| Responsibility overload exists in one file/module (multiple concerns mixed) | Yes | `single-agent-runtime-metadata.ts` currently owns only instructions, while adapters would otherwise duplicate skill resolution. | Split shared resolution responsibility into a skill-aware runtime-context helper |
| Proposed new layer owns concrete coordination policy (not pass-through only) | Yes | The shared resolver owns instruction fallback, skill lookup, access-mode resolution, and persisted metadata shaping. | Keep layer |
| Current layering can remain unchanged without SoC/decoupling degradation | Yes | Runtime-specific consumption already lives in the right runtime folders. | Keep |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Use native vendor skill systems for both Codex and Claude. | Maximum alignment with vendor runtimes. | Claude SDK skill loading is tied to filesystem setting sources and would require workspace/home mutation or an unverified wrapper-workspace strategy. | Rejected | Too much filesystem side-effect risk for this ticket. |
| B | Use Codex workspace-local repo-skill materialization and Claude selected-skill prompt injection. | Aligns Codex to the observed app-server contract, keeps agent scoping explicit, and avoids persistent Codex config writes outside the workspace. | Codex requires hidden workspace mutation plus cleanup ownership, and Claude still does not use the SDK's native skill loader in this ticket. | Chosen | Best tradeoff between correctness, scope, and safe implementation. |
| C | Keep one global Codex client/process for every workspace. | Lowest implementation churn. | Ignores `cwd` isolation, conflicts with worktree-oriented usage, and keeps unrelated workspaces coupled. | Rejected | The global boundary is too coarse for Codex app-server usage. |
| D | Create one Codex client/process per session or thread. | Maximum isolation. | Wastes process startup cost and ignores that one app-server connection can host multiple threads for the same workspace. | Rejected | Stronger than necessary and operationally expensive. |
| E | Reuse one Codex client/process per canonical `cwd`. | Aligns with Codex `cwd` scoping and worktree guidance while keeping process count bounded. | Requires explicit acquire/release lifecycle instead of a trivial singleton. | Chosen | Best fit for the Codex follow-up hardening. |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Rename/Move | `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-metadata.ts` | `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts` | Current file name is instruction-only and becomes misleading once it resolves configured skills too. | Shared runtime bootstrap, adapter imports, tests | New API resolves instructions + configured skills + effective access mode. |
| C-002 | Add | N/A | `autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts` | Shared types and rendering helpers for selected skills belong in runtime-execution shared code. | Codex and Claude runtime consumers | Keeps skill formatting logic out of adapters. |
| C-003 | Modify | `autobyteus-server-ts/src/runtime-execution/adapters/codex-app-server-runtime-adapter.ts` | same path | Adapter must resolve and forward configured skills for Codex runs. | Codex runtime create/restore | Uses shared runtime context. |
| C-004 | Add | N/A | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts` | Codex needs a repo-scoped workspace skill materialization helper that mirrors configured skills into `.codex/skills/`. | Codex session bootstrap, restore, teardown | Must preserve full skill directories and generate missing Codex-facing metadata when required. |
| C-005 | Modify | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-shared.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-session-bootstrap.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | same paths | Codex session state must track materialized workspace skill bundles and cleanup ownership. | Codex session startup/sendTurn/close | Persisted runtime reference stays lean; cleanup stays in runtime-owned hidden workspace area. |
| C-006 | Modify | `autobyteus-server-ts/src/runtime-execution/adapters/claude-agent-sdk-runtime-adapter.ts` | same path | Adapter must resolve and forward configured skills for Claude runs. | Claude runtime create/restore | Uses shared runtime context. |
| C-007 | Modify | `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-shared.ts`, `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-session-state.ts`, `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts` | same paths | Claude session state and turn preamble must carry/render selected skills. | Claude turn construction | No filesystem-backed SDK skill loading in this ticket. |
| C-008 | Modify | `autobyteus-server-ts/tests/unit/runtime-execution/...` | same paths | Tests must cover shared skill resolution and runtime consumption. | Unit verification | Add Codex, Claude, and shared bootstrap coverage. |
| C-009 | Modify | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts` | same path | Codex client reuse must be keyed by canonical `cwd` instead of one global singleton. | Codex process lifecycle, `thread/read`, model listing | Add per-`cwd` client registry plus release lifecycle. |
| C-010 | Modify | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-session-bootstrap.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-history-reader.ts` | same paths | Runtime callers must acquire and release `cwd`-scoped clients correctly. | Codex session startup, teardown, utility calls | Prevent client leaks and preserve reuse inside one workspace. |
| C-011 | Modify | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts`, `autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts` | same paths | Remove the now-invalid Codex turn-level skill-attachment and text-hint strategy. | Codex turn delivery | Codex should send plain user content once repo-scoped workspace skills are materialized. |

## Module/File Placement And Ownership Check (Mandatory)

| File/Module | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Single-agent runtime bootstrap | `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-metadata.ts` | `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts` | Shared runtime bootstrap for member runtimes | No | Move | The current name does not fit the new concern. |
| Configured skill rendering/types | N/A | `autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts` | Shared runtime skill formatting and descriptors | Yes | Keep | Used by more than one runtime consumer. |
| Codex skill serialization | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts` | same path | Codex protocol input serialization | Yes | Keep | App-server input mapping is Codex-specific. |
| Codex process manager | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts` | same path | Codex app-server client lifecycle and reuse boundary | Yes | Keep | The file already owns Codex process lifecycle. |
| Claude skill prompt composition | `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts` | same path | Claude turn-preamble construction | Yes | Keep | Prompt construction is Claude-specific. |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Shared runtime-context resolution | Resolve instructions, configured skills, access mode, and lean persisted metadata once per run bootstrap | Agent-definition lookup, prompt fallback, skill lookup, access-mode normalization | Codex/Claude protocol formatting | Shared across member runtimes |
| Codex process-manager boundary | Reuse Codex app-server clients by canonical workspace path | client registry, startup coalescing, acquire/release lifecycle | run/session semantics above the `cwd` boundary | `cwd` is the operational reuse boundary |
| Codex runtime adapter/service boundary | Carry shared resolved skills into Codex session state and workspace-skill materialization | Codex session options, workspace skill mirror ownership, cleanup | Skill lookup from persistence or Claude prompt rendering rules | Uses repo-scoped Codex skill discovery |
| Claude runtime adapter/service boundary | Carry shared resolved skills into Claude session state and turn preamble composition | Claude session options, selected-skill prompt block rendering | Workspace mutation or filesystem skill materialization | Uses prompt-context delivery for this ticket |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep instruction-only runtime bootstrap and add one-off skill lookups in each adapter | Lowest short-term edit count | Rejected | Shared runtime-context resolver used by both adapters |
| Use Codex `skills/config/write` to mutate per-cwd enabled skills | Could mirror vendor-native skill enablement | Rejected | Workspace-local repo skill materialization avoids persistent external Codex config writes |
| Keep one global Codex process-manager singleton across all workspaces | Simplest lifecycle model | Rejected | Canonical-`cwd` client registry with per-`cwd` release |
| Materialize selected Claude skills inside workspace `.claude/skills` | Would use native Claude SDK skill loading | Rejected | Claude selected-skill prompt injection avoids workspace mutation |
| Persist full resolved skill content inside runtime-reference metadata | Simplifies restore plumbing | Rejected | Keep heavy skill bodies in in-memory session state only |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `single-agent-runtime-context.ts` | Rename/Move + Modify | Shared runtime bootstrap | Resolve instructions, selected skills, effective access mode, and lean persisted metadata | `resolveSingleAgentRuntimeContext(...)` | In: agentDefinitionId, requested skillAccessMode; Out: resolved runtime context | `AgentDefinitionService`, `PromptLoader`, `SkillService`, `resolveSkillAccessMode` |
| `configured-runtime-skills.ts` | Add | Shared runtime formatting | Shared skill descriptor types plus Claude skill-instruction rendering and Codex metadata synthesis helpers | `renderConfiguredSkillInstructionBlock(...)`, `renderCodexWorkspaceSkillOpenAiYaml(...)`, shared types | In: selected skills, access mode; Out: Claude-consumable strings / Codex-facing metadata strings | none beyond shared types |
| `codex-workspace-skill-materializer.ts` | Add | Codex runtime | Mirror configured skills into workspace-local `.codex/skills` bundles and track cleanup ownership | `materializeConfiguredCodexWorkspaceSkills(...)`, `cleanupMaterializedCodexWorkspaceSkills(...)` | In: working directory + selected skills; Out: materialized skill descriptors / cleanup handles | fs/path + shared skill helpers |
| `codex-app-server-process-manager.ts` | Modify | Codex process lifecycle | Reuse and release Codex clients by canonical `cwd` | `getClient(...)`, `acquireClient(...)`, `releaseClient(...)` | In: `cwd`; Out: live Codex client | Codex app-server client |
| `codex-user-input-mapper.ts` | Modify | Codex runtime | Map plain agent message content into Codex `turn/start` inputs after workspace skills are already materialized | `toCodexUserInput(...)` | In: user message; Out: Codex input array | shared image helpers only |
| `codex-app-server-runtime-service.ts`, `codex-runtime-session-bootstrap.ts`, `codex-thread-history-reader.ts` | Modify | Codex runtime | Carry selected skills/access mode in session state, materialize workspace skills, clean them up, and acquire/release per-`cwd` clients correctly | existing service methods | In: session options / `cwd`; Out: materialized skill state / thread reads | Codex process manager + workspace skill materializer |
| `claude-runtime-turn-preamble.ts` | Modify | Claude runtime | Compose agent/team/runtime instructions plus selected skill block | `buildClaudeTurnInput(...)` | In: session state + message content; Out: Claude prompt string | shared skill renderer |
| `claude-runtime-shared.ts` and `claude-runtime-session-state.ts` | Modify | Claude runtime | Store selected skills/access mode in session state | session-state factory helpers | In: session options; Out: enriched session state | shared skill types |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: no UI responsibility changes in this ticket.
- Non-UI scope: responsibility stays clear at file/module/service level by separating shared skill resolution from runtime-specific serialization/composition.
- Integration/infrastructure scope: Codex adapter owns Codex protocol behavior, Claude adapter owns Claude prompt behavior, and neither owns agent-definition persistence.
- Layering note: the added shared resolver exists because the same coordination policy is repeated, not because another tier is fashionable.
- Decoupling check: runtime-specific folders depend on shared resolved types; shared resolved types do not depend on runtime-specific code.
- Module/file placement check: shared runtime concern stays in `runtime-execution/`, runtime-specific behavior stays in runtime-specific subfolders.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | `single-agent-runtime-metadata.ts` | `single-agent-runtime-context.ts` | The new concern is broader than metadata; it resolves skills and persisted metadata shaping too. | Avoids misleading future readers. |
| API | `resolveSingleAgentInstructionRuntimeMetadata` | `resolveSingleAgentRuntimeContext` | Public API should reflect full responsibility. | Direct adapter call site update required. |
| File | N/A | `configured-runtime-skills.ts` | Shared name matches the cross-runtime concern. | Holds descriptor types + render helpers. |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `single-agent-runtime-metadata.ts` | Instruction lookup only today, but selected-skill resolution after this ticket | No | Rename | `C-001` |
| `codex-user-input-mapper.ts` | Codex turn input mapping | Yes | N/A | `C-004` |
| `claude-runtime-turn-preamble.ts` | Claude turn input composition | Yes | N/A | `C-007` |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Shared agent skill resolution | High | Keep lookup duplicated in each adapter | Change | Shared bootstrap logic belongs in one shared boundary. |
| Claude native skill loading | Medium | Force the design to match vendor-native `.claude/skills` loading | Change | The current repo cannot scope that cleanly without filesystem side effects. |

Rule:
- Do not keep a misplaced file in place merely because many callers already import it from there; that is structure bias, not design quality.

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Append raw skill text in each adapter without a shared renderer | Medium | One shared selected-skill rendering helper | Change | Avoids duplicated formatting drift. |
| Mutate workspace `.claude/skills` during Claude run startup | High | Runtime-scoped prompt injection | Change | Avoids persistent side effects and cleanup failure modes. |

Rule:
- A functionally working local fix is still invalid here if it degrades layering or responsibility boundaries.

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `single-agent-runtime-context.ts` | Agent-definition services, prompt loader, skill service, skill access mode enum | Both runtime adapters | Low | Keep output as plain data types only. |
| `configured-runtime-skills.ts` | none beyond shared types | Codex mapper, Claude preamble | Low | Pure formatting helpers with no runtime-service imports. |
| `codex-app-server-process-manager.ts` | Codex app-server client, path normalization | Codex runtime service, thread reader | Low | Keep the boundary narrow: process lifecycle only, no run history or skill logic. |
| Codex runtime modules | Shared runtime-context/types, Codex app-server client | Codex adapter/service/tests | Low | Do not import Claude modules. |
| Claude runtime modules | Shared runtime-context/types | Claude adapter/service/tests | Low | Do not import Codex modules. |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules (example: `API -> Application -> Domain -> Infra`): `runtime adapters/services -> shared runtime-execution helpers -> agent-definition/skill services`.
- Temporary boundary violations and cleanup deadline: none planned.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| `single-agent-runtime-metadata.ts` | Rename imports/tests to the new runtime-context file/API | Do not keep a compatibility wrapper export. | Typecheck + unit tests |
| Instruction-only adapter assumptions | Replace with shared runtime-context usage | Remove direct assumption that only instructions matter for member runtimes. | Adapter/unit tests |

## Data Models (If Needed)

- `ResolvedRuntimeSkill`
  - `name`
  - `description`
  - `rootPath`
  - `skillFilePath`
  - `content`
- `SingleAgentRuntimeContext`
  - `runtimeMetadata` (lean persisted metadata)
  - `configuredSkills`
  - `effectiveSkillAccessMode`

## Error Handling And Edge Cases

- If agent instructions are missing, continue to use description fallback exactly as today.
- If one configured skill name cannot be resolved, skip it and continue with the remaining skills.
- If no skills resolve, both runtimes continue without skill exposure.
- If `SkillAccessMode.NONE`, both runtimes suppress selected skill exposure even when `skillNames` exist.
- Persisted runtime metadata must not include full skill bodies to avoid run-history bloat.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001, R-004 | Resolve configured runtime skills at create/restore time | Yes | Yes | Yes | `future-state-runtime-call-stack.md#use-case-uc-001-resolve-configured-runtime-skills` |
| UC-002 | R-001, R-002, R-004 | Codex workspace skill exposure with configured skills | Yes | Yes | Yes | `future-state-runtime-call-stack.md#use-case-uc-002-codex-workspace-skill-exposure` |
| UC-003 | R-001, R-003, R-004 | Claude turn construction with configured skills | Yes | Yes | Yes | `future-state-runtime-call-stack.md#use-case-uc-003-claude-turn-skill-exposure` |
| UC-004 | R-004, R-005 | `NONE` mode or unresolved skills suppress exposure without failing startup | Yes | N/A | Yes | `future-state-runtime-call-stack.md#use-case-uc-004-skill-suppression-and-unresolved-skill-handling` |
| UC-005 | R-006 | Canonical-`cwd` Codex client reuse and isolation | Yes | Yes | Yes | `future-state-runtime-call-stack.md#use-case-uc-005-codex-client-reuse-by-canonical-cwd` |

## Performance / Security Considerations

- Limit Claude prompt injection to selected skills only; do not inject the full global skill catalog.
- Limit Codex workspace skill materialization to the selected skills only; do not mutate persistent Codex config outside the active workspace.
- Preserve absolute root-path guidance so skill-relative file references do not misdirect tool usage.
- Keep Codex process count bounded by `cwd` reuse instead of scaling one process per session/thread.

## Migration / Rollout (If Needed)

- No schema or frontend migration is required.
- Existing runs created before this change continue to restore because the persisted metadata contract stays lean and backward-neutral.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | IP-001 | Unit | Planned |
| C-002 | IP-001, IP-003 | Unit | Planned |
| C-003 | IP-002 | Unit | Planned |
| C-004 | IP-002 | Unit | Planned |
| C-005 | IP-002 | Unit | Planned |
| C-006 | IP-003 | Unit | Planned |
| C-007 | IP-003 | Unit | Planned |
| C-008 | IP-004 | Unit / API-E2E matrix | Planned |
| C-009 | IP-005 | Unit / API-E2E matrix | Planned |
| C-010 | IP-005 | Unit / API-E2E matrix | Planned |
| C-011 | IP-006 | Unit / API-E2E matrix | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-10 | Initial design draft | N/A | N/A | No | `v1` created | Open |
| 2026-03-10 | Codex app-server follow-up investigation | Design Impact | One global Codex client across unrelated `cwd` values is the wrong operational boundary. | Yes | `v2` created | Open |
| 2026-03-10 | Codex configured-skill live E2E rerun | Design Impact | Native Codex `skill` items alone do not drive the configured skill in live execution; the turn text hint still does not make direct path-attached custom skills invokable. | No | `v3` created | Open |
| 2026-03-10 | Raw Codex workspace-skill discovery probe | Design Impact | Codex custom skills execute when they are repo-scoped workspace skills under `.codex/skills/` with `agents/openai.yaml`; direct path attachments are the wrong contract. | Yes | `v4` created | Open |

## Open Questions

- What is the cleanest conflict-safe naming strategy for workspace-local mirrored Codex skills when the workspace already contains a repo skill with the same name?
- If Anthropic later exposes session-scoped extra skill roots, should Claude runtime switch from prompt injection to native SDK skill loading?

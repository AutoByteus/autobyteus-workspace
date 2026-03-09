# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Define a shared member-runtime instruction-source contract and move Codex/Claude to runtime-edge mapping instead of adapter-owned prompt authorship | 1 |

## Artifact Basis

- Investigation Notes: `tickets/done/team-agent-instruction-composition/investigation-notes.md`
- Requirements: `tickets/done/team-agent-instruction-composition/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Introduce one shared server-side contract for member-runtime instruction composition. Team-runtime bootstrap resolves persisted team instructions and current agent instructions once, stores them in runtime metadata, and both Codex and Claude consume that shared contract. Runtime-specific adapters remain responsible only for edge mapping into their transport fields and for factual teammate/tool constraints.

## Goals

- Make `team.instructions` and the current agent’s `instructions` the canonical sources for member-runtime instruction context.
- Stop treating Codex/Claude hard-coded guidance strings as the primary prompt source.
- Preserve `send_message_to` truthfulness, teammate visibility, and recipient restrictions.
- Keep runtime-specific mapping thin and aligned across Codex and Claude.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: replace the current hard-coded runtime-owned instruction composition as the primary path in Codex and Claude.
- Gate rule: design is invalid if it keeps dual prompt-composition paths where the old hard-coded strings remain an equal first-class behavior.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Resolve team definition instructions during member-runtime bootstrap | AC-001 | Team instructions are available in shared instruction metadata | UC-001, UC-002, UC-003 |
| R-002 | Resolve current agent instruction body during member-runtime bootstrap | AC-001 | Agent instructions are available in shared instruction metadata | UC-001, UC-002, UC-003 |
| R-003 | Build member-runtime instruction context from both sources | AC-001 | Both sources participate in the effective contract | UC-001, UC-002, UC-003 |
| R-004 | Keep teammate/tool constraints separate from canonical instruction sources | AC-002, AC-003, AC-004 | Runtime guidance stays factual and constrained | UC-002, UC-003, UC-004 |
| R-005 | Use one shared contract across Codex and Claude | AC-002, AC-003 | Cross-runtime composition logic is shared | UC-002, UC-003 |
| R-006 | Degrade deterministically when a source is absent | AC-005 | Available sources still produce deterministic output | UC-005 |
| R-007 | Remove legacy hard-coded primary prompt path | AC-006 | No dual first-class composition path remains | UC-002, UC-003 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Team runtime bootstrap owns runtime metadata assembly; Codex and Claude adapters consume that metadata later | `team-member-runtime-session-lifecycle-service.ts:createMemberRuntimeSessions`, `codex-app-server-runtime-service.ts:startSession`, `claude-agent-sdk-runtime-service.ts:executeV2Turn` | None blocking |
| Current Naming Conventions | Runtime-specific helpers live under `runtime-execution/<runtime>/`; team bootstrap services live under `agent-team-execution/services/` | current folder layout in `autobyteus-server-ts/src` | Whether new shared helper should live in `agent-team-execution` or `runtime-execution/shared` |
| Impacted Modules / Responsibilities | Session lifecycle resolves team manifest and send-message capability; Codex/Claude helpers both parse metadata and render prompt text | `team-member-runtime-session-lifecycle-service.ts`, `codex-send-message-tooling.ts`, `claude-runtime-team-metadata.ts` | Best split between metadata parsing and rendering |
| Data / Persistence / External IO | Agent instructions come from `agent.md`; team instructions come from `team.md`; team manifest already persists `teamDefinitionId` at the team-run level | `prompt-loader.ts`, `agent-team-definition-service.ts`, `team-run-mutation-service.ts:buildTeamRunManifest` | Whether restore should re-resolve or trust persisted instruction text |

## Current State (As-Is)

- Team member runtime metadata contains team routing and teammate manifest facts but not persisted instruction sources.
- Codex builds a hard-coded developer instruction block and passes it as `developerInstructions`, with `baseInstructions` left `null`.
- Claude builds a hard-coded team-context block and prepends it to each turn input.
- Claude `send_message_to` tooling already has a clean separate boundary through dynamic MCP registration and recipient validation.

## Target State (To-Be)

- Team runtime bootstrap resolves:
  - current `team.instructions`
  - current member agent instruction body
  - existing teammate manifest and send-message capability facts
- Bootstrap stores those in a shared runtime metadata contract.
- A shared member-runtime instruction composer reads that contract and produces:
  - canonical definition-derived instruction sections
  - a minimal runtime constraint section for teammate/tool facts
- Codex maps the shared output into Codex thread instruction fields.
- Claude maps the shared output into Claude turn/session input while keeping MCP tool exposure separate.

## Shared Architecture Principles (Design + Review, Mandatory)

- Principle alignment statement: design and review will treat shared instruction composition as a server orchestration concern and runtime adapters as edge translators.
- SoC cause statement: bootstrap resolves persisted definition sources, shared composer shapes canonical instruction sections, adapters map those sections to runtime APIs, tooling modules own tool exposure/validation.
- Layering result statement: layering emerges as `team bootstrap -> shared composition -> runtime adapter edge mapping`.
- Decoupling rule statement: team-definition resolution must not be duplicated in Codex/Claude adapters; adapters consume metadata/composer outputs one-way.
- Module/file placement rule statement: definition resolution belongs in `agent-team-execution/services/`; cross-runtime instruction composition belongs in a shared runtime-execution boundary, not inside runtime-specific helper files.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add shared instruction-source resolver + shared composition helper; split prompt authorship out of Codex/Claude runtime-specific files`
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): this removes duplicated prompt logic, makes the composition contract explicit, keeps runtime-specific code thin, and lowers the cost of future prompt-source changes.
- Layering fitness assessment (are current layering and interactions still coherent under emergent-layering rules?): `No`
- Decoupling assessment (are boundaries low-coupled with clear one-way dependency directions?): `No`
- Module/file placement assessment (do file paths/folders match owning concerns for this scope?): `No`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`, `Split`, `Remove`
- Note: `Keep` is invalid here because current runtime-specific files own shared composition policy.

## Layering Emergence And Extraction Checks (Mandatory)

| Check | Result (`Yes`/`No`) | Evidence | Decision |
| --- | --- | --- | --- |
| Repeated coordination policy across callers (provider selection/fallback/retry/aggregation/routing/fan-out) exists | Yes | Codex and Claude both parse team metadata and author their own instruction strings | Extract orchestration boundary |
| Responsibility overload exists in one file/module (multiple concerns mixed) | Yes | `codex-send-message-tooling.ts` and `claude-runtime-team-metadata.ts` mix metadata parsing, teammate rendering, and prompt authorship | Split + lift coordination |
| Proposed new layer owns concrete coordination policy (not pass-through only) | Yes | shared composer owns section ordering, source fallback, and runtime-constraint separation | Keep layer |
| Current layering can remain unchanged without SoC/decoupling degradation | No | runtime adapters currently own server-wide prompt policy | Change |

### Optional Alternatives (Use For Non-Trivial Or Uncertain Changes)

| Option | Summary | Pros | Cons | Decision (`Chosen`/`Rejected`) | Rationale |
| --- | --- | --- | --- | --- | --- |
| A | Resolve team/agent instructions in bootstrap, store raw sources in metadata, compose in shared helper, map at runtime edge | Clear SoC, reusable across runtimes, preserves runtime-edge flexibility | Adds one new shared boundary and metadata contract | Chosen | Best fit for cross-runtime consistency |
| B | Keep current metadata, have each runtime fetch definitions and build its own final prompt | Minimal bootstrap changes | Duplicates data access and prompt policy, worsens drift risk | Rejected | Violates shared-contract requirement |

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Add | N/A | `autobyteus-server-ts/src/agent-team-execution/services/member-runtime-instruction-source-resolver.ts` | Resolve team + agent instruction sources during team member bootstrap | team bootstrap | Depends on `AgentDefinitionService`, `AgentTeamDefinitionService`, `PromptLoader` |
| C-002 | Modify | `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-orchestrator.ts` and `.types.ts` | same | Pass team-definition context into member-runtime session bootstrap | orchestrator, mutation service | avoid re-fetching team context through runtime adapters |
| C-003 | Modify | `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts` | same | Persist shared instruction-source metadata into runtime references | bootstrap metadata | team manifest + instruction sources in one metadata contract |
| C-004 | Add | N/A | `autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts` | Produce canonical instruction sections and minimal runtime constraints from shared metadata | shared runtime execution | runtime-agnostic prompt policy |
| C-005 | Modify | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` and `codex-runtime-thread-lifecycle.ts` | same | Map shared instruction sections into Codex thread fields | Codex runtime | likely `baseInstructions` for agent layer, `developerInstructions` for team/runtime overlay |
| C-006 | Modify | `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts` and related metadata helper | same | Map shared instruction sections into Claude turn/session input | Claude runtime | keep MCP tooling separate |
| C-007 | Remove | hard-coded primary prompt authorship inside `codex-send-message-tooling.ts` and `claude-runtime-team-metadata.ts` | shared composer owns primary instruction content | eliminate duplicated prompt policy | Codex + Claude helpers | factual teammate/tool text may remain only as adjunct render support |

## Module/File Placement And Ownership Check (Mandatory)

| File/Module | Current Path | Target Path | Owning Concern / Platform | Path Matches Concern? (`Yes`/`No`) | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Rationale |
| --- | --- | --- | --- | --- | --- | --- |
| Team member session bootstrap | `autobyteus-server-ts/src/agent-team-execution/services/team-member-runtime-session-lifecycle-service.ts` | same | team-runtime bootstrap orchestration | Yes | Keep + Modify | correct owner for resolving definition sources before runtime restore |
| Team/agent instruction source resolution | N/A | `autobyteus-server-ts/src/agent-team-execution/services/member-runtime-instruction-source-resolver.ts` | team-runtime bootstrap support | Yes | Add | source resolution is team bootstrap concern |
| Shared member-runtime instruction composition | N/A | `autobyteus-server-ts/src/runtime-execution/member-runtime/member-runtime-instruction-composer.ts` | cross-runtime instruction composition policy | Yes | Add | shared concern across Codex and Claude |
| Codex prompt authorship logic | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-send-message-tooling.ts` | split between shared composer and Codex mapping files | mixed metadata + prompt + tool concern | No | Split | current file owns too many concerns |
| Claude prompt authorship logic | `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-team-metadata.ts` | split between shared composer and Claude mapping files | mixed metadata + prompt concern | No | Split | current file owns shared policy it should not own |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Team bootstrap resolver | Load team/agent instruction sources for a member runtime | definition lookup, prompt-body lookup, fallback normalization | runtime-specific field mapping | upstream of all runtimes |
| Shared member-runtime instruction composer | Convert shared metadata into canonical instruction sections and runtime-constraint sections | section ordering, source fallback, minimal factual constraint text | direct SDK/client calls | shared across Codex and Claude |
| Codex runtime adapter edge mapping | Map shared sections into Codex thread/resume request fields | Codex API field wiring | definition lookup, shared policy ownership | should become thin |
| Claude runtime adapter edge mapping | Map shared sections into Claude turn/session inputs | Claude API field wiring | definition lookup, shared policy ownership | should become thin |
| Tooling boundary | Expose `send_message_to` and validate recipients | MCP tool registration, recipient validation, approval plumbing | canonical instruction-source authorship | stays separate |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Keep old hard-coded runtime guidance as fallback primary prompt path | Quick local fix and lower initial risk | Rejected | Shared composer becomes sole primary composition path; runtime-owned text reduced to factual adjunct only |
| Add runtime-specific “if missing metadata then render old prompt” branch | Avoid touching bootstrap flow immediately | Rejected | Bootstrap always provides normalized shared metadata contract |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `member-runtime-instruction-source-resolver.ts` | Add | team bootstrap | resolve team + agent instruction sources | `resolveForMember(...)` | in: teamDefinitionId/member config, out: normalized instruction-source payload | team def service, agent def service, prompt loader |
| `team-member-runtime-session-lifecycle-service.ts` | Modify | team bootstrap | attach resolved instruction-source payload to runtime metadata | existing create/restore methods | in: member configs + team context, out: runtime reference metadata | source resolver |
| `member-runtime-instruction-composer.ts` | Add | shared runtime execution | render canonical instruction sections and minimal runtime constraints | `composeMemberRuntimeInstructions(metadata)` | in: runtime metadata, out: structured instruction sections | none runtime-specific |
| `codex-app-server-runtime-service.ts` / `codex-runtime-thread-lifecycle.ts` | Modify | Codex adapter edge | map shared sections to thread fields | existing start/resume APIs | in: metadata/sections, out: Codex request payload | shared composer |
| `claude-runtime-turn-preamble.ts` | Modify | Claude adapter edge | map shared sections to turn/session input | `buildClaudeTurnInput(...)` | in: metadata/sections + user content, out: Claude turn string | shared composer |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: N/A.
- Non-UI scope: responsibilities are separated into source resolution, shared composition, and runtime-edge mapping.
- Integration/infrastructure scope: Codex and Claude adapters remain focused on transport/API shaping.
- Layering note: layering emerges from shared composition needs, not from adding pass-through modules.
- Decoupling check: team-definition lookup stays upstream; runtime adapters no longer reach back into definition services.
- Module/file placement check: cross-runtime composition no longer lives in runtime-specific helper files.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | N/A | `member-runtime-instruction-source-resolver.ts` | names the bootstrap concern directly | team bootstrap layer |
| File | N/A | `member-runtime-instruction-composer.ts` | names the cross-runtime composition concern directly | shared runtime layer |
| API | N/A | `composeMemberRuntimeInstructions` | explicit about output purpose | shared helper entrypoint |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `codex-send-message-tooling.ts` | metadata parsing + prompt authorship + tool schema support | No | Split | C-007 |
| `claude-runtime-team-metadata.ts` | metadata parsing + prompt authorship | No | Split | C-006, C-007 |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Keep prompt composition in Codex/Claude helper files because imports already exist there | High | introduce shared composer and thin edge mapping | Change | existing layout encodes duplication, not ownership |

Rule:
- Do not keep a misplaced file in place merely because many callers already import it from there; that is structure bias, not design quality.

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Append team/agent instructions directly inside both runtime adapters with copied helper logic | High | shared resolver + shared composer + adapter edge mapping | Reject shortcut | functionally works but preserves drift |

Rule:
- A functionally working local fix is still invalid here if it degrades layering or responsibility boundaries.

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| source resolver | team/agent definition services, prompt loader | session lifecycle | Medium | keep one-way dependency from bootstrap to definition services only |
| shared composer | runtime metadata contract | Codex/Claude mapping | Low | keep pure and data-driven |
| Codex/Claude mapping files | shared composer | runtime service methods | Low | no definition-service reach-back |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `team bootstrap services -> shared member-runtime composition -> runtime-specific adapters -> external SDK/client`
- Temporary boundary violations and cleanup deadline: `None planned`

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Adapter-owned primary prompt strings | remove as primary composition path, keep only minimal factual adjunct helpers if still needed | no dual-path retained | unit tests on shared composer + adapter mapping |

## Data Models (If Needed)

- Shared runtime metadata additions:
  - `teamDefinitionId`
  - `memberInstructionSources.teamInstructions`
  - `memberInstructionSources.agentInstructions`
  - existing teammate manifest and send-message capability fields remain
- Shared composer output:
  - `agentInstructionText`
  - `teamInstructionText`
  - `runtimeConstraintText`
  - `combinedSections` or runtime-edge render helpers

## Error Handling And Edge Cases

- Missing `team.instructions`: continue with agent instructions plus factual runtime constraints.
- Missing agent instruction body: continue with team instructions plus factual runtime constraints.
- Missing both sources: emit only minimal factual runtime constraints and avoid fabricated persona text.
- Definition lookup failure during bootstrap: fail bootstrap or record explicit normalized null source rather than silently falling back to the old hard-coded full prompt.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001, R-002, R-003 | Resolve shared instruction-source metadata during team member bootstrap | Yes | Yes | Yes | `UC-001` |
| UC-002 | R-003, R-004, R-005, R-007 | Map shared contract into Codex thread instruction fields | Yes | Yes | Yes | `UC-002` |
| UC-003 | R-003, R-004, R-005, R-007 | Map shared contract into Claude turn/session path | Yes | Yes | Yes | `UC-003` |
| UC-004 | R-004 | Preserve `send_message_to` behavior after instruction refactor | Yes | N/A | Yes | `UC-004` |
| UC-005 | R-006 | Deterministic fallback when instruction sources are absent | Yes | N/A | Yes | `UC-005` |

## Performance / Security Considerations

- Resolving instruction sources during bootstrap avoids repeated definition lookup during every runtime adapter call.
- Persisting raw instruction text in runtime metadata increases metadata size modestly but avoids adapter-side service coupling.
- Teammate names and tool exposure remain factual runtime data; no broader capability claims should be synthesized.

## Migration / Rollout (If Needed)

- Single-cut migration within the member-runtime path.
- No compatibility wrapper path.
- Existing team manifests and runtime references can be enriched on restore using persisted `teamDefinitionId` plus refreshed agent/team definitions.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001 | T-001 | unit | Planned |
| C-002 | T-002 | unit/integration | Planned |
| C-003 | T-003 | unit/integration | Planned |
| C-004 | T-004 | unit | Planned |
| C-005 | T-005 | unit/e2e | Planned |
| C-006 | T-006 | unit/e2e | Planned |
| C-007 | T-007 | unit/review | Planned |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-03-09 | Initial design draft | N/A | None yet | No | Initial version created | Open |

## Open Questions

- Whether the shared composer should also centralize teammate-list formatting or only canonical instruction-section assembly.
- Whether Codex should keep `agentInstructions` and `team/runtime overlay` in separate fields for better runtime semantics.

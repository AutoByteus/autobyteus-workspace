# Design Spec

## Current-State Read

Latest `origin/personal` moved raw-trace-to-readable-work-trace projection out of self-evolution and into the shared `agent-work-traces` capability:

- Domain/context/types: `autobyteus-server-ts/src/agent-work-traces/domain/work-traces.ts`
- Projection owner: `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts`
- Renderer: `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts`
- Store: `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-store.ts`
- Projection tests: `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts`
- Shared docs: `autobyteus-server-ts/docs/modules/agent_work_traces.md`

Self-evolution is now a consumer. `SelfEvolutionService.startFromEvolutionRequest()` resolves a `SelfEvolutionTargetContext`, calls `AgentWorkTraceProjectionService.ensureCurrent(context)`, and passes only the returned manifest/root/file paths to the Skill Self-Evolver companion.

The current shared projection context contains only `target` and `memoryDir`. The target agent display name is available in `SelfEvolutionTargetContext.agentName`, but the shared projection boundary does not declare that identity. Consequently, `AgentWorkTraceRenderer` hardcodes visible labels as `worker`, `worker reasoning`, `worker tool`, and compaction `worker`.

A second current-state issue appears once labels become agent-name dependent: `AgentWorkTraceProjectionService` reuses unchanged archive-segment work trace files based only on raw `sourceFingerprint`. If an archive segment was rendered with `worker` or an older agent display name, and the raw source is unchanged, source-only reuse would keep stale rendered Markdown. The projection cache must therefore include a render-context fingerprint.

Adjacent self-evolution task/static guidance also describes the evidence actor as `target worker` / `future workers` / `worker messages`. That wording no longer matches the intended generated work trace labels. It should become `target agent` / `future agents` / `agent messages` only where it describes the retrospective evidence actor. Real runtime/application/background worker terminology remains valid and must not be broadly renamed.

## Intended Change

Generated Agent Work Trace Markdown should use the target agent display name as the subject label:

```text
[time] user:
[time] Implementation Engineer:
[time] Implementation Engineer reasoning:
[time] Implementation Engineer tool call:
```

The renderer should preserve configured display casing, trim/collapse whitespace, and fall back to `Agent` if the provided name is blank. It must not append an extra `agent` suffix.

The shared projection context should carry the target agent display name, and the projection manifest/cache should record a render context fingerprint so archive reuse remains correct.

Self-evolution companion runtime/static guidance should use target-agent terminology for the same evidence subject.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change with small shared-boundary refactor and wording cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small local refactor
- Evidence: `AgentWorkTraceRenderer` owns visible labels but lacks target display identity; `SelfEvolutionTargetContext` already has `agentName`; archive reuse uses source fingerprint only despite rendered content becoming subject-label-dependent.
- Design response: Extend the shared projection context with `agentName`, add a renderer-owned render-context/subject-label helper, pass render context through projection, use it in renderer and cache reuse, and update self-evolution prompt/static guidance terminology.
- Refactor rationale: Without the boundary change, either the renderer must keep hardcoded generic labels or self-evolution must bypass the shared projection boundary. Without render-context cache metadata, archive work traces can remain stale.
- Intentional deferrals and residual risk, if any: No broader runtime worker renaming is included. Future non-self-evolution consumers of `agent-work-traces` must provide `agentName` when they start using the shared projection; no such current production consumer was found.

## Terminology

- `Agent Work Trace`: Derived, readable Markdown projection of canonical raw trace records for one target agent run/member run.
- `Target agent display name`: The human-readable agent name resolved from the target agent definition; current self-evolution source is `SelfEvolutionTargetContext.agentName`.
- `Subject label`: The rendered label before `:`, ` reasoning:`, or ` tool call:` in Markdown work trace entries.
- `Render context`: The renderer-owned normalized subject label plus renderer/version fingerprint used to render and cache the Markdown output.
- `Worker`: Valid only where code/docs discuss actual runtime loops, application worker processes, or background workers; not the visible work-trace evidence actor.

## Design Reading Order

Read this design as:

1. Data-flow spine from self-evolution trigger through shared work-trace projection to companion evidence paths.
2. Shared projection ownership and render-context metadata.
3. Concrete file responsibility changes.
4. Self-evolver prompt/static skill wording updates.
5. Tests/docs/validation guidance.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace worker-labeled generated work traces cleanly. Do not add a compatibility flag, renderer option, or dual worker/agent output mode.
- Derived cache handling: Existing generated work trace manifests/files that lack the new render context are cache-stale and may be regenerated from canonical raw traces. This is not a data migration; raw traces remain authoritative.
- Static wording: Replace target-worker wording in self-evolver evidence guidance with target-agent wording. Do not preserve duplicate old/new terminology.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Manual self-evolution start | Companion receives path-only work trace evidence package | `SelfEvolutionService` for self-evolution orchestration; `AgentWorkTraceProjectionService` for projection segment | Shows where target agent name crosses from self-evolution context into shared projection. |
| DS-002 | Bounded Local | Raw trace source list | Work trace manifest and Markdown files | `AgentWorkTraceProjectionService` | Contains the cache reuse/rendering decision that must become subject-label-aware. |
| DS-003 | Bounded Local | Historical replay event | Markdown work trace block | `AgentWorkTraceRenderer` | Owns the visible subject labels and `tool call` wording. |
| DS-004 | Return-Event | Work trace package | Companion task message/metadata | `SelfEvolutionCompanionSessionService` / `SelfEvolutionCompanionTriggerMessageBuilder` | Ensures the companion still receives paths only and terminology is natural. |

## Primary Execution Spine(s)

`Manual Start -> SelfEvolutionService -> SelfEvolutionTargetContextResolver -> AgentWorkTraceProjectionService -> AgentWorkTraceRenderer / AgentWorkTraceStore -> SelfEvolutionCompanionTriggerMessageBuilder -> Skill Self-Evolver Companion`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A manual self-evolution request resolves the target agent context, including agent display name, asks shared projection for current work traces, then sends the path package to the companion. | `SelfEvolutionService`, `SelfEvolutionTargetContext`, `AgentWorkTraceProjectionService`, `AgentWorkTracePackage`, `CompanionTriggerMessageBuilder` | `SelfEvolutionService` coordinates; `AgentWorkTraceProjectionService` governs projection | Skill target resolution, record lifecycle, direct-message grant registration |
| DS-002 | Projection lists active/archive raw sources, decides whether cached archive Markdown is reusable, renders changed sources, writes files/manifest, and returns a summary hash. | `AgentWorkTraceProjectionService`, `AgentWorkTraceSource`, `AgentWorkTraceRenderContext`, `AgentWorkTraceStore` | `AgentWorkTraceProjectionService` | Raw trace source reader, source fingerprints, render fingerprints |
| DS-003 | Renderer converts replay events into Markdown blocks using the render context subject label and redactor. | `AgentWorkTraceRenderer`, `HistoricalReplayEvent`, `AgentWorkTraceRenderContext` | `AgentWorkTraceRenderer` | Redaction, indentation, JSON stringification |
| DS-004 | Self-evolution builds a concise path-only companion task packet and uses target-agent wording in the task prompt. | `SelfEvolutionCompanionTriggerMessageBuilder`, `AgentWorkTracePackage`, `AgentInputUserMessage` | `SelfEvolutionCompanionTriggerMessageBuilder` | Package tree rendering, metadata fields |

## Spine Actors / Main-Line Nodes

- `SelfEvolutionService`: self-evolution orchestration owner.
- `SelfEvolutionTargetContext`: resolved target identity and execution context; includes `agentName`.
- `AgentWorkTraceProjectionService`: shared projection/cache orchestration owner.
- `AgentWorkTraceRenderContext`: render subject label and fingerprint used across renderer/cache/summary.
- `AgentWorkTraceRenderer`: visible Markdown label/content owner.
- `AgentWorkTraceStore`: file/manifest persistence owner for derived work trace files.
- `SelfEvolutionCompanionTriggerMessageBuilder`: path-only companion task packet owner.

## Ownership Map

| Node | Owns |
| --- | --- |
| `SelfEvolutionTargetContextResolver` | Loading target run/member metadata, target agent definition, and human-readable `agentName`. |
| `AgentWorkTraceProjectionService` | Coordinating source reading, render-context creation, archive reuse decisions, rendering changed sources, manifest writing, and package summary hash. |
| `AgentWorkTraceRenderContext` helper | Normalizing `agentName` into subject label, declaring renderer version, and computing a stable render fingerprint. |
| `AgentWorkTraceRenderer` | Mapping replay events to Markdown labels/blocks and redacting visible content. |
| `AgentWorkTraceStore` | Writing `<memoryDir>/work_traces/` files and manifest metadata atomically. |
| `SelfEvolutionCompanionTriggerMessageBuilder` | Building the companion task prompt/metadata from a work trace package and editable skill target list. |
| Built-in Skill Self-Evolver templates | Static role/guidance language used by the companion agent and private coaching skill. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `AgentWorkTraceProjectionService.ensureCurrent(context)` | `AgentWorkTraceProjectionService` itself | Public shared projection boundary for self-evolution and future consumers. | Target resolution, self-evolution workflow policy, skill editing policy. |
| `SelfEvolutionCompanionTriggerMessageBuilder.build(...)` | Builder itself, under `SelfEvolutionCompanionSessionService` flow | Converts package/session facts into task packet. | Work trace rendering, file writing, target agent name lookup. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Hardcoded `worker` labels in `AgentWorkTraceRenderer` | Visible evidence actor should be target agent display name. | `AgentWorkTraceRenderContext.subjectLabel` used by renderer. | In This Change | Replace message/reasoning/tool/compaction labels. |
| Source-only archive reuse for rendered Markdown | Rendered content will depend on subject label. | Render fingerprint check in `AgentWorkTraceProjectionService`. | In This Change | Existing schema-1/no-render-context caches should be treated stale and regenerated. |
| `target worker` runtime companion wording | No longer matches target-agent evidence label. | `target agent` in `SelfEvolutionCompanionTriggerMessageBuilder`. | In This Change | Keep path-only packet. |
| Target-worker/future-worker wording in Skill Self-Evolver evidence guidance | Static guidance should match agent-name work traces. | Target-agent/future-agent wording in built-in templates. | In This Change | Do not rename actual worker-process concepts elsewhere. |
| Worker-centric projection test assertions | Stale behavior. | Agent display-name expectations. | In This Change | Add regression coverage for tool call and cache invalidation. |

## Return Or Event Spine(s) (If Applicable)

`AgentWorkTracePackage -> SelfEvolutionCompanionTriggerMessageBuilder -> AgentInputUserMessage(metadata + path-only content) -> Companion Run`

This return path is important because the generated trace body is not inlined. Terminology updates in the task packet should be limited to the concise prompt heading while preserving file path metadata and grant mechanics.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `AgentWorkTraceProjectionService`
  - `Read existing manifest -> Build render context -> List sources -> Check source+render fingerprints -> Render/write changed source -> Write manifest -> Build summary hash`
  - Matters because archive reuse must not bypass render-label changes.

- Parent owner: `AgentWorkTraceRenderer`
  - `HistoricalReplayEvent -> Choose label shape -> Clean/redact content -> Emit Markdown block`
  - Matters because message/reasoning/tool/compaction labels each have slightly different suffix rules.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `AgentWorkTraceSourceReader` | DS-002 | `AgentWorkTraceProjectionService` | Adapt raw trace files into projection sources. | Keeps raw trace discovery behind agent-memory boundary. | Projection would hardcode raw trace filenames and break active-file policy. |
| `buildHistoricalReplayEvents` | DS-003 | `AgentWorkTraceRenderer` | Convert raw records into generic replay events. | Shared event shaping remains display-label agnostic. | Target display names would leak into raw/history projection. |
| `AgentWorkTraceRedactor` | DS-003 | `AgentWorkTraceRenderer` | Redact backend/private/sensitive visible content. | Keeps privacy separate from label policy. | Label work could accidentally change redaction behavior. |
| `SelfEvolutionSkillPackageTreeRenderer` | DS-004 | `SelfEvolutionCompanionTriggerMessageBuilder` | Render editable package trees. | Companion needs editable package context. | Work trace projection would become mixed with skill package display. |
| Built-in coaching references | DS-004 | Skill Self-Evolver companion | Teach how to interpret work traces. | Static reusable guidance belongs in agent/skill templates. | Runtime task packet would grow long policy text again. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Render readable work traces | `agent-work-traces` | Extend | Latest base already made this the shared owner. | N/A |
| Target agent name resolution | `self-evolution` target context resolver | Reuse | Self-evolution already resolves target agent definition/name. | N/A |
| Raw trace file discovery | `agent-memory` via `RawTraceFileSourceService` | Reuse | Preserves canonical raw trace filename policy. | N/A |
| Historical replay event shaping | `run-history/projection` | Reuse | Renderer already builds on this shared transformer. | N/A |
| Companion static coaching language | Built-in `skill-evolver` templates | Extend | Existing templates own static skill-evolver guidance. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-work-traces` | Projection context, render subject label, renderer, cache reuse, manifest/package metadata | DS-002, DS-003 | `AgentWorkTraceProjectionService` | Extend | Main code change owner. |
| `self-evolution` | Target context resolution, trigger orchestration, companion task packet wording | DS-001, DS-004 | `SelfEvolutionService`, `SelfEvolutionCompanionTriggerMessageBuilder` | Extend | Consumer only; no projection ownership. |
| Built-in `skill-evolver` templates | Static companion instruction/skill wording | DS-004 | Skill Self-Evolver companion | Extend | Align target-agent terminology. |
| Docs | Module docs for projection/self-evolution | DS-001-DS-004 | Future maintainers | Extend | Delivery may also review docs; implementation can update direct behavior docs. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-work-traces/domain/work-traces.ts` | `agent-work-traces` | Shared domain types | Add `agentName` to projection context and render context metadata to manifest/package types. | Existing domain file already owns work trace DTOs. | Yes: render context type. |
| `src/agent-work-traces/services/agent-work-trace-render-context.ts` | `agent-work-traces` | Render-context helper | Normalize agent display name and compute render fingerprint. | Keeps normalization/fingerprint policy testable and out of orchestration. | New tight shared structure. |
| `src/agent-work-traces/services/agent-work-trace-projection-service.ts` | `agent-work-traces` | Projection orchestration | Build render context; pass it to renderer/store; check source+render fingerprints for archive reuse; include render fingerprint in summary hash. | Existing projection owner. | Yes. |
| `src/agent-work-traces/services/agent-work-trace-renderer.ts` | `agent-work-traces` | Renderer | Use subject label for messages/reasoning/tools/compaction; use `tool call`. | Existing visible Markdown owner. | Yes. |
| `src/agent-work-traces/services/agent-work-trace-store.ts` | `agent-work-traces` | Store | Persist manifest with render context and schema/version metadata. | Existing file persistence owner. | Yes. |
| `src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | `self-evolution` | Task packet builder | Change `target worker` to `target agent`. | Existing prompt owner. | No. |
| Built-in skill-evolver template files | Built-in agents | Static guidance | Replace target-worker/future-worker evidence terminology. | Existing static instruction owner. | No. |
| `tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Tests | Projection coverage | Update/expand coverage. | Existing projection coverage. | Yes. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Subject label normalization + render fingerprint | `src/agent-work-traces/services/agent-work-trace-render-context.ts` | `agent-work-traces` | Needed by projection reuse/summary and renderer labels; should be one policy. | Yes | Yes | A broad display-name utility for unrelated UI labels. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceProjectionContext.agentName` | Yes | Yes | Low | Field means target agent display name for rendering. |
| `AgentWorkTraceRenderContext.subjectLabel` | Yes | Yes | Low | Normalized visible label only. |
| `AgentWorkTraceRenderContext.fingerprint` | Yes | Yes | Low | Cache key for renderer version + subject label, not raw source fingerprint. |
| `AgentWorkTraceManifest.renderContext` | Yes | Yes | Low | Top-level because it applies to all files in one projection package. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-traces/domain/work-traces.ts` | `agent-work-traces` | Domain DTOs | Add `agentName` and render-context manifest/package shapes. | Existing type boundary. | Yes |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-render-context.ts` | `agent-work-traces` | Render context policy | Normalize subject label and compute render fingerprint from renderer version + subject label. | One cohesive render-cache policy. | N/A |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts` | `agent-work-traces` | Projection owner | Use render context for renderer, archive reuse, manifest writing, and summary hash. | Existing orchestration owner. | Yes |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | `agent-work-traces` | Markdown renderer | Render `Agent Name`, `Agent Name reasoning`, `Agent Name tool call`. | Existing renderer owner. | Yes |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-store.ts` | `agent-work-traces` | Derived-file persistence | Write manifest schema with render context. | Existing store owner. | Yes |
| `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts` | `self-evolution` | Companion task packet | Use target-agent wording. | Existing prompt owner. | No |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/agent.md` | Built-in agents | Skill Self-Evolver instruction | Use target-agent wording. | Static instruction file. | No |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/skills/retrospective-skill-coach/SKILL.md` | Built-in agents | Coaching skill entry | Use target-agent/future-agent/agent-message wording. | Static skill entry file. | No |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/skills/retrospective-skill-coach/references/*.md` | Built-in agents | Coaching references | Update evidence-actor examples/playbook wording. | Existing reference owners. | No |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Test suite | Projection behavior coverage | Assert labels, tool call, compaction, fallback, cache reuse/invalidation. | Existing projection coverage. | Yes |

## Ownership Boundaries

- `self-evolution` owns target resolution and companion workflow. It should not decide how work trace Markdown labels are formatted.
- `agent-work-traces` owns render subject policy because it owns generated Markdown. It should not load agent definitions or know self-evolution metadata details.
- `agent-memory` owns raw trace file discovery/normalization. It should not receive display-name policy.
- `run-history/projection` owns generic historical replay event conversion. It should remain display-label agnostic.
- Built-in skill-evolver templates own static companion guidance. Runtime task packets should remain concise and path-only.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceProjectionService.ensureCurrent(context)` | Source reader, render context, renderer, store, manifest/hash | `SelfEvolutionService`, future compaction consumer | Caller instantiates renderer/store directly or writes work trace Markdown itself. | Extend projection context/API with required identity fields. |
| `SelfEvolutionTargetContextResolver.resolve(target)` | Agent/team metadata and definition lookup | `SelfEvolutionService` | Shared projection loads agent definitions itself. | Add required context field and pass resolved context through. |
| `AgentWorkTraceRenderer` | Markdown labels and redaction | Projection service | Self-evolution post-processes generated Markdown labels. | Pass render context into renderer. |

## Dependency Rules

Allowed:

- `self-evolution -> agent-work-traces`
- `agent-work-traces -> agent-memory` raw trace source boundary
- `agent-work-traces -> run-history/projection` historical replay transformer
- Built-in template files may use natural target-agent wording but do not import code.

Forbidden:

- `agent-work-traces -> self-evolution` for agent name lookup or target metadata.
- `agent-memory -> agent-work-traces` or `agent-memory -> self-evolution`.
- Self-evolution editing generated Markdown labels after projection.
- Compatibility branch such as `useWorkerLabels` or dual worker/agent render modes.
- Broad renames of actual runtime/application worker concepts.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceProjectionService.ensureCurrent(context)` | Agent work trace projection | Produce current work trace package for one target run/member. | `{ target, memoryDir, agentName }` | `agentName` is display-name input for rendering. |
| `buildAgentWorkTraceRenderContext(agentName)` | Work trace render context | Normalize subject label and fingerprint render policy. | `agentName: string` | New helper; fallback `Agent`. |
| `AgentWorkTraceRenderer.renderSource(source, renderContext)` | Work trace Markdown rendering | Render replay events to Markdown. | `AgentWorkTraceSource + AgentWorkTraceRenderContext` | No optional worker-label mode. |
| `AgentWorkTraceStore.writeManifest({ context, files, generatedAt, renderContext })` | Work trace manifest | Persist package metadata. | Projection context + render context | Schema should expose render context. |
| `SelfEvolutionCompanionTriggerMessageBuilder.build(request, session)` | Self-evolution task packet | Build path-only task message. | Trigger request + session | Wording only changes from target worker to target agent. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ensureCurrent(context)` | Yes | Yes after adding `agentName` | Low | Add required display-name field. |
| `buildAgentWorkTraceRenderContext(agentName)` | Yes | Yes | Low | Keep only render-label/fingerprint concern. |
| `renderSource(source, renderContext)` | Yes | Yes | Low | Do not let renderer load context itself. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Visible work trace actor | Current: `worker`; Proposed: target agent display name | Yes | Low | Use `agentName` subject label. |
| Tool block label | Current: `worker tool`; Proposed: `<Agent Name> tool call` | Yes | Low | Implement exact wording. |
| Static evidence actor | Current: target worker/future workers; Proposed: target agent/future agents | Yes | Low | Update built-in templates. |
| Actual runtime/application workers | Keep worker | Yes | Low | Do not rename unrelated worker concepts. |

## Applied Patterns (If Any)

- Adapter-ish projection: `AgentWorkTraceSourceReader` adapts raw trace file sources into work trace sources.
- Renderer: `AgentWorkTraceRenderer` maps replay event structures into Markdown.
- Derived cache with fingerprints: `AgentWorkTraceProjectionService` reuses archive outputs only when source and render context match.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-traces/` | Folder | Shared work trace capability | Projection, rendering, store, domain types. | Existing shared owner from latest base. | Self-evolution workflow policy. |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-render-context.ts` | File | Render context policy | Normalize labels and compute render fingerprint. | Rendering/cache policy belongs with projection capability. | Agent definition loading or UI display helpers. |
| `autobyteus-server-ts/src/self-evolution/services/companion/` | Folder | Self-evolution companion flow | Path-only task packet wording. | Existing companion workflow owner. | Work trace rendering. |
| `autobyteus-server-ts/src/built-in-agents/templates/skill-evolver/` | Folder | Built-in Skill Self-Evolver template | Static target-agent evidence guidance. | Existing source for built-in agent sync. | Runtime dynamic target facts. |
| `autobyteus-server-ts/docs/modules/` | Folder | Durable module docs | Describe current projection/self-evolution terminology. | Existing docs location. | Historical ticket narrative rewrites. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-work-traces` | Main-Line Domain-Control + internal off-spine concerns | Yes | Low | Existing subsystem has domain/services split; adding render-context helper stays cohesive. |
| `src/self-evolution/services/companion` | Main-line consumer/task packet | Yes | Low | Only wording changes in existing builder. |
| Built-in template skill folder | Static prompt/skill assets | Yes | Low | Text changes stay where static guidance is authored. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Assistant message | `[time] Implementation Engineer:\nI will run the command.` | `[time] worker:\nI will run the command.` | Shows target role identity in evidence. |
| Reasoning | `[time] Solution Designer reasoning:\n...` | `[time] worker reasoning:\n...` | Keeps reasoning attached to the target agent. |
| Tool call | `[time] Code Reviewer tool call:\ntool: run_bash` | `[time] Code Reviewer tool:\n...` or `[time] worker tool:\n...` | `tool call` is the natural block label. |
| Cache reuse | Reuse archive only when `sourceFingerprint` and `renderContext.fingerprint` match. | Reuse archive when only source fingerprint matches. | Prevents stale labels after display-name/render-policy changes. |
| Static wording | `target agent`, `future agents`, `agent messages` | `target worker`, `future workers`, `worker messages` | Aligns companion guidance with generated trace labels. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Renderer option `useWorkerLabels` | Could preserve old outputs. | Rejected | Always render target agent display-name labels. |
| Dual manifest support that preserves archive files with old worker labels | Could avoid rewriting archives. | Rejected | Treat missing/mismatched render context as stale derived cache and regenerate from raw traces. |
| Static guidance using both `worker/agent` terms | Could avoid changing all skill wording. | Rejected | Use target-agent terminology for evidence actor; keep worker only for actual worker concepts. |
| Appending `agent` suffix to display name | Initial idea from discussion. | Rejected | Use display name only to avoid `Target Agent agent`. |

## Derived Layering (If Useful)

- Self-evolution orchestration layer resolves target context and consumes projection output.
- Agent-work-traces projection layer owns derived Markdown generation and cache metadata.
- Raw trace/run-history layers provide display-label-agnostic input transformations.
- Built-in templates provide static companion guidance.

## Migration / Refactor Sequence

1. Add `agentName: string` to `AgentWorkTraceProjectionContext`.
2. Add `AgentWorkTraceRenderContext` type and helper, e.g. `agent-work-trace-render-context.ts`:
   - `normalizeAgentWorkTraceSubjectLabel(agentName): string`
   - `buildAgentWorkTraceRenderContext(agentName): { subjectLabel, rendererVersion, fingerprint }`
   - normalize by trim/collapse whitespace, preserve casing, fallback `Agent`.
3. Update `AgentWorkTraceProjectionService.ensureCurrent(context)`:
   - build render context once per projection;
   - require archive reuse to match source fingerprint and render context fingerprint;
   - pass render context into `renderer.renderSource(source, renderContext)`;
   - pass render context into manifest writing;
   - include render context fingerprint in summary hash inputs.
4. Update `AgentWorkTraceRenderer`:
   - message: user stays `user`; non-user uses `renderContext.subjectLabel`;
   - reasoning: `${subjectLabel} reasoning`;
   - tool: `${subjectLabel} tool call`;
   - compaction: `${subjectLabel}`;
   - remove hardcoded worker labels.
5. Update `AgentWorkTraceStore` and domain types:
   - add top-level manifest `renderContext` metadata;
   - use schema version that reflects render-context metadata (recommended `2`);
   - keep paths and file names unchanged.
6. Update self-evolution task packet wording in `SelfEvolutionCompanionTriggerMessageBuilder` from `target worker` to `target agent`.
7. Update built-in Skill Self-Evolver template text and retrospective coaching references from target-worker/future-worker/worker-message wording to target-agent/future-agent/agent-message wording where it describes the evidence actor.
8. Update tests:
   - projection label assertions;
   - reasoning/tool call/compaction coverage;
   - whitespace/fallback normalization;
   - archive reuse invalidation when agent name changes and reuse when unchanged;
   - companion message target-agent wording.
9. Update module docs `agent_work_traces.md` and `self_evolution.md` for rendered agent-message terminology.
10. Run targeted tests for `agent-work-traces` and self-evolution companion/session coverage, then broader checks as implementation engineer deems appropriate.

## Key Tradeoffs

- Adding `agentName` to shared projection context makes the shared boundary slightly less minimal, but it prevents self-evolution-specific renderer bypasses and keeps label policy in the right owner.
- Manifest schema/render context metadata is more explicit than overloading `sourceFingerprint`; it preserves clear semantics and avoids stale derived files.
- Updating static self-evolver guidance increases scope slightly, but prevents a mixed `agent name` work trace paired with `target worker` coaching language.
- Preserving display casing improves trace readability and maps back to configured definitions; it means labels are not fully lowercase canonical roles, which is acceptable and user-approved.

## Risks

- If a future caller cannot supply `agentName`, the new required context field will force that integration to make an explicit target identity decision. This is preferable to silently rendering generic `worker`.
- Tests that assert manifest schema version or shape will need updates.
- Broad worker terminology search may produce many unrelated application/runtime worker hits; implementation must keep the scope targeted.

## Guidance For Implementation

- Prefer a small helper file for render context rather than scattering normalization/fingerprinting across projection and renderer.
- Do not let `agent-work-traces` import `self-evolution` to get the agent name.
- Do not change raw trace fixture file names back to `raw_traces.jsonl`; latest base uses `raw_traces_active.jsonl`.
- Include render context fingerprint in archive reuse and summary hash; source fingerprint alone is insufficient after this change.
- Update only evidence-actor wording in built-in templates/docs. Leave real worker-loop/process/background-worker terminology alone.
- Keep the companion message path-only and avoid inlining work trace content.

# Design Spec

## Current-State Read

The shared work-trace projection subsystem is `autobyteus-server-ts/src/agent-work-traces`.
Current flow:

`SelfEvolutionService -> AgentWorkTraceProjectionService.ensureCurrent(context) -> AgentWorkTraceSourceReader -> buildHistoricalReplayEvents(...) -> AgentWorkTraceRenderer -> AgentWorkTraceStore -> SelfEvolutionCompanionTriggerMessageBuilder`

Current issues found in code:

- `AgentWorkTraceProjectionContext` carries `agentName` into the work-trace projection boundary.
- `agent-work-trace-render-context.ts` normalizes that `agentName` into `renderContext.subjectLabel`, adds `rendererVersion`, and hashes both into `fingerprint`.
- `AgentWorkTraceRenderer` uses `renderContext.subjectLabel` as a body speaker/section prefix for assistant messages, reasoning records, tool calls, and compaction/provider notes.
- The readable Markdown body starts with projection bookkeeping: `# Agent Work Trace: ${source.displayName}`, `Source:`, `Records:`, `First timestamp:`, and `Last timestamp:`.
- Separate reasoning trace records are rendered into the readable body as `<agent name> reasoning:`, which exposes internal/provider model thinking and can produce very large work-trace files for reasoning-heavy LLMs.
- `AgentWorkTraceProjectionService` uses source fingerprints and render-context fingerprints to reuse generated archive Markdown. This adds compatibility/cache semantics for files that are generated Markdown artifacts and are not a stable user-facing or parser-facing contract.
- `AgentWorkTraceManifest` / `AgentWorkTracePackage` expose `renderContext` metadata whose fields are now semantically wrong for the target behavior.
- Built-in Retrospective Skill Improver guidance was written around the old mental model: `Skill Self-Evolver`, `target-agent work trace evidence`, `agent messages`, and `reasoning summaries`. Some template wording was also guardrail-heavy and negative, which distracted from the active task packet / editable-root scope.

Constraints:

- Raw trace storage remains authoritative and out of scope.
- Work trace layout under `<memoryDir>/work_traces/` remains the output location.
- Already-generated work trace files/manifests are non-contract generated artifacts; no migration, fallback, dual-rendering, or compatibility support is required.
- Source module/API names under `self-evolution` are not renamed in this ticket unless implementation intentionally expands scope. The narrower built-in agent template folder and built-in skill package id/folder are renamed to `retrospective-skill-improver`; user-facing/touched text should use `Skill Improvement` and `Retrospective Skill Improver` wording.

## Intended Change

Make generated work-trace Markdown a clean LLM-readable evidence file:

```md
# Work Trace

[<ISO timestamp>] user:
...

[<ISO timestamp>] assistant:
...

[<ISO timestamp>] tool:
name: run_bash
status: success
...

[<ISO timestamp>] trace_event:
Provider context compaction boundary recorded
```

Move target identity and projection bookkeeping into manifest/package metadata only. Remove render-context compatibility metadata (`subjectLabel`, `rendererVersion`, `fingerprint`) from the current package/manifest shape. Omit separate reasoning records from the readable body and evidence summary. Update Retrospective Skill Improver text to consume visible user/assistant/tool/trace-event evidence rather than agent-name speakers or reasoning summaries, rename the built-in agent template folder and skill package id/folder to `retrospective-skill-improver`, and keep the improver guidance concise/action-oriented instead of broad negative guardrail lists.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Shared Structure Looseness + Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, localized
- Evidence:
  - `renderContext.subjectLabel` currently carries target identity into body speaker labels.
  - `renderContext.rendererVersion` / `fingerprint` exist only to protect generated-cache compatibility.
  - `AgentWorkTraceRenderer` renders reasoning records into the body.
  - Work traces are generated Markdown files consumed by agents, not a compatibility contract.
- Design response:
  - Split target identity metadata (`targetDisplayName`) from body speaker labels (`user`, `assistant`, `tool`, `trace_event`).
  - Remove render-context compatibility structures and generated-cache reuse semantics.
  - Filter separate reasoning records out of rendered evidence.
  - Update Retrospective Skill Improver wording, narrow built-in template folder / skill package naming, and action-oriented guidance tone.
- Refactor rationale:
  - A local branch fix would still leave target identity, speaker labels, cache metadata, and body rendering coupled through `renderContext`.
  - Removing the render context and deriving labels from replay event kind/role restores the authoritative boundary: renderer owns Markdown evidence semantics; manifest owns metadata.
- Intentional deferrals and residual risk, if any:
  - Full source folder/API rename from `self-evolution` to `skill-improvement` is deferred. This ticket updates touched user/agent-facing wording and records the broader rename as out of scope unless separately approved.
  - The narrower built-in agent template folder and skill package id/folder rename to `retrospective-skill-improver` is in scope because it is localized to template/config/test/doc references and matches the worker's active responsibility better than `skill-evolver` / `coach`.

## Terminology

- `Readable work trace`: generated Markdown intended for LLM/improver-agent reading.
- `Semantic metadata`: target identity and file metadata kept in manifest/package, not the Markdown body.
- `Generated artifact`: work-trace Markdown/manifest output derived from raw traces; not a compatibility contract.
- `Visible evidence`: user messages, assistant messages, tool calls/results/errors, neutral trace events, retries/corrections, and feedback signals that are rendered or represented for the improver agent.
- `Separate reasoning record`: raw/replay reasoning event separate from ordinary assistant message content. These are omitted.
- `Retrospective Skill Improver template folder`: `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/`, replacing the stale `skill-evolver` folder name.
- `Retrospective skill package id`: `retrospective-skill-improver`, the built-in skill package used by the Retrospective Skill Improver template. The old `retrospective-skill-coach` id is removed from current template/config/docs/tests.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - Remove `AgentWorkTraceRenderContext`, `buildAgentWorkTraceRenderContext`, `normalizeAgentWorkTraceSubjectLabel`, and `AGENT_WORK_TRACE_RENDERER_VERSION` if they have no remaining clean responsibility.
  - Remove `renderContext` from `AgentWorkTraceManifest` and `AgentWorkTracePackage`.
  - Remove `subjectLabel`, `rendererVersion`, `fingerprint`, and render-context fingerprint checks from projection code/tests.
  - Remove archive generated-file reuse keyed by old render context. Regenerate current work-trace files on `ensureCurrent()` rather than adding migration/upgrade branches.
  - Remove the old `skill-evolver` built-in template folder reference in favor of `retrospective-skill-improver`; update `templateDirName`, tests, and docs.
  - Remove the old `retrospective-skill-coach` built-in skill id/folder/config references in favor of `retrospective-skill-improver`; do not keep alias package ids for compatibility.
- Decision rule: old generated work-trace files may remain on disk, be overwritten by current generation, or be ignored. Do not add compatibility reads/migrations for them.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Skill Improvement trigger | Retrospective Skill Improver reads work trace files | `AgentWorkTraceProjectionService` for projection; Skill Improvement service for trigger orchestration | Shows target run evidence packaging for the improver agent. |
| DS-002 | Bounded Local | Raw trace records | Readable Markdown content | `AgentWorkTraceRenderer` | Defines body labels, reasoning omission, tool/trace-event shape, and redaction. |
| DS-003 | Bounded Local | Projection sources + rendered content | Manifest/package summary | `AgentWorkTraceProjectionService` + `AgentWorkTraceStore` | Defines metadata/body separation and evidence summary semantics. |
| DS-004 | Return-Event | Durable skill text changes | Target run notification | Existing skill-improvement/self-evolution messaging boundary | Confirms companion/improver wording still sends final `skill_update` through existing message-type mechanics. |

## Primary Execution Spine(s)

`Skill Improvement trigger -> Target context resolution -> AgentWorkTraceProjectionService -> AgentWorkTraceSourceReader -> AgentWorkTraceRenderer -> AgentWorkTraceStore -> Trigger message -> Retrospective Skill Improver`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The product resolves a target run/member, projects current raw traces into readable work-trace Markdown and manifest metadata, then gives only paths/metadata to the Retrospective Skill Improver. | Skill Improvement service, `AgentWorkTraceProjectionService`, source reader, renderer, store, improver agent | `AgentWorkTraceProjectionService` for projection package | Target context resolution, skill target resolution, trigger message builder |
| DS-002 | The renderer converts replay events into clean Markdown: visible user/assistant messages, tools, and neutral trace events; separate reasoning records are skipped. | Historical replay event, renderer, redactor | `AgentWorkTraceRenderer` | Redaction, tool formatting, timestamp formatting |
| DS-003 | Projection stores current generated files and manifest metadata without render-context compatibility fields, then computes summary hash from rendered evidence. | Projection service, manifest/package, store | `AgentWorkTraceProjectionService` | File layout, metadata mapping, summary hashing |
| DS-004 | If the improver changes skill files, it sends a final update using the task-supplied target/message type. | Retrospective Skill Improver, send-message boundary, target run | Existing messaging boundary | Direct message grant, message type |

## Spine Actors / Main-Line Nodes

- `SelfEvolutionService` / future `SkillImprovementService`: current orchestration entry; resolves target context and calls projection.
- `AgentWorkTraceProjectionService`: authoritative projection package owner.
- `AgentWorkTraceSourceReader`: raw-trace source adapter.
- `AgentWorkTraceRenderer`: readable Markdown evidence owner.
- `AgentWorkTraceStore`: generated file layout and manifest owner.
- `SelfEvolutionCompanionTriggerMessageBuilder`: current trigger message builder; wording should be treated as improver-agent request text.
- `Retrospective Skill Improver` template files: durable worker guidance consumed by built-in agent bootstrap.

## Ownership Map

| Node | Owns |
| --- | --- |
| `AgentWorkTraceProjectionService` | projection sequencing, current package construction, evidence summary hash, no-compatibility posture for generated artifacts |
| `AgentWorkTraceSourceReader` | adapting raw trace files into ordered source records only; not body semantics |
| `AgentWorkTraceRenderer` | Markdown body title, role/event labels, reasoning omission, tool/trace-event formatting, redaction application |
| `AgentWorkTraceStore` | `<memoryDir>/work_traces/` layout, manifest writing, generated file paths |
| Retrospective Skill Improver templates | agent-facing evidence interpretation guidance, action-oriented tone, package id, and skill-improvement behavior |

If public facades exist, they are thin: self-evolution/skill-improvement orchestration asks the projection service for a package. It must not also reach into renderer/store internals.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `SelfEvolutionService.startFromEvolutionRequest()` | `AgentWorkTraceProjectionService` for work traces | Current feature entrypoint | Markdown rendering semantics, manifest schema details, body labels |
| `SelfEvolutionCompanionTriggerMessageBuilder` | Retrospective Skill Improver task packet | Sends paths/metadata to improver | Work-trace body rewriting or target identity inference from speaker labels |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceRenderContext.subjectLabel` | Duplicates target display metadata and caused agent-name speaker labels | `targetDisplayName` metadata + renderer-owned role labels | In This Change | Remove from domain/package/manifest/tests. |
| `rendererVersion` and `fingerprint` render-context fields | Generated work traces are not a compatibility contract | Clean current generation + rendered evidence summary hash | In This Change | Do not replace with new version marker. |
| `agent-work-trace-render-context.ts` helpers/constants | Only support old subject-label/render-fingerprint model | Direct projection metadata and renderer constants if needed | In This Change | Delete file if no clean responsibility remains. |
| Archive generated-file reuse keyed by source/render fingerprint | Preserves old generated artifact semantics | Regenerate current files on `ensureCurrent()` | In This Change | Simpler and aligns no-compatibility rule. |
| Markdown body source/record/timestamp header lines | Low-value bookkeeping for LLM-readable body | Manifest/file metadata | In This Change | Body title becomes exactly `# Work Trace`. |
| Reasoning event rendering | Internal model thinking; can be huge | Omitted from renderer and summary hash | In This Change | Ordinary assistant message content remains. |
| `Skill Self-Evolver` / `companion agent` touched wording | Misleading actor model | `Skill Improvement`, `Retrospective Skill Improver`, `improver agent` | In This Change for touched text | Full source/API rename deferred. |
| Guardrail-heavy negative improver wording | Distracts from the actual task packet/editable-root workflow | Concise positive write-scope and durable-improvement guidance | In This Change | Keep necessary safety boundary as active scope, not repeated unrelated prohibitions. |
| `skill-evolver` template folder | Stale filesystem owner name after worker is Retrospective Skill Improver | `retrospective-skill-improver` template folder | In This Change | Rename template folder and update `templateDirName`, docs, and tests; no compatibility alias. |
| `retrospective-skill-coach` package id/folder | Sounds advisory/passive while the package edits durable skills | `retrospective-skill-improver` | In This Change | Rename folder, `SKILL.md` name, agent config, docs, and tests; no compatibility alias. |

## Return Or Event Spine(s) (If Applicable)

The only relevant return/event path is existing skill-update notification:

`Retrospective Skill Improver file edits -> send_message_to(target_agent_run_id, message_type=skill_update) -> target run receives update`

No change to message transport is required in this ticket.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `AgentWorkTraceRenderer`

`Historical replay event -> classify visible kind -> redact/format content -> append Markdown section or skip`

Rules:

- `message` + `role=user` -> `user:` section.
- `message` + `role=assistant` -> `assistant:` section.
- `reasoning` -> skip.
- `tool` -> `tool:` section with `name`, `status`, optional arguments/result/error.
- `compaction` / provider note -> `trace_event:` section.

Parent owner: `AgentWorkTraceProjectionService`

`Source list -> render each current source -> write current file -> write manifest -> compute summaryHash from rendered evidence`

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Redaction | DS-002 | Renderer | Remove backend/protocol noise and sensitive values from rendered content | Keeps readable evidence safe | If hidden in source reader, raw source semantics and body policy blur |
| Historical replay transformer | DS-002 | Renderer | Normalize raw memory traces into replay events | Existing run-history boundary already owns trace-to-event interpretation | Reimplementing in renderer would duplicate event semantics |
| Target context resolution | DS-001 | Skill Improvement service | Resolve target identity/display name/memory dir | Projection should not know agent definition lookup | If renderer does this, metadata and body semantics couple again |
| Skill target resolution | DS-004 | Skill Improvement service | Decide editable skill roots | Orthogonal to work-trace projection | If projection owns it, capability boundaries blur |
| Built-in template wording | DS-004 | Retrospective Skill Improver | Agent-facing interpretation of work traces | Keeps worker instructions aligned with file format | If ignored, improver expects old reasoning/agent-name evidence |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Raw trace discovery | `agent-memory` / `RawTraceFileSourceService` | Reuse | Already authoritative for raw trace files | N/A |
| Replay event normalization | `run-history/projection` | Reuse | Already creates message/tool/reasoning/compaction event kinds | N/A |
| Work-trace body rendering | `agent-work-traces` | Extend/Refactor | Existing owner for shared projection | N/A |
| Skill-improver guidance | built-in `retrospective-skill-improver` template | Extend | Existing built-in worker template after rename | N/A |
| Full feature rename | self-evolution module/API | Defer | Broader than work-trace format and wording | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-work-traces` | Projection package, renderer, manifest, store | DS-001, DS-002, DS-003 | Projection service | Extend/Refactor | Main source changes. |
| `self-evolution` / future skill-improvement runtime | Triggering, target resolution, skill root resolution | DS-001, DS-004 | Feature orchestration | Reuse | Avoid broad rename unless approved. |
| Built-in agent templates | Retrospective Skill Improver guidance | DS-004 | Built-in agent bootstrap | Extend | Text updates already pre-applied for relevant files. |
| Docs | User/developer module docs | All | Delivery/docs sync | Extend | Update after implementation. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `domain/work-traces.ts` | `agent-work-traces` | Type boundary | Clean projection context, manifest/package, source/file types | Central domain type file already exists | N/A |
| `services/agent-work-trace-projection-service.ts` | `agent-work-traces` | Projection owner | Sequence current source rendering, write files/manifest, compute rendered-evidence summary hash | Existing coordinator owner | Uses source reader/renderer/store |
| `services/agent-work-trace-renderer.ts` | `agent-work-traces` | Markdown body owner | Body title, role labels, reasoning skip, tool/trace-event formatting | Existing renderer owner | Uses redactor + replay transformer |
| `services/agent-work-trace-source-reader.ts` | `agent-work-traces` | Source adapter | Provide ordered raw trace sources | Existing adapter owner | Uses raw trace service |
| `services/agent-work-trace-store.ts` | `agent-work-traces` | Generated file layout owner | Write current work trace files and manifest | Existing store owner | Domain types |
| `services/agent-work-trace-render-context.ts` | `agent-work-traces` | Old render context owner | Remove if unused | No clean target responsibility remains | N/A |
| `templates/retrospective-skill-improver/agent.md` | Built-in templates | Retrospective Skill Improver instructions | Worker agent persona and task packet rules | Renamed template file | N/A |
| `templates/.../SKILL.md` | Built-in templates | Retrospective skill package guidance | Evidence interpretation and edit rules | Existing skill entry | N/A |
| `templates/.../references/*.md` | Built-in templates | Reference examples/signals | Rephrased examples/signals | Existing references | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Role/event label strings | Local constants in `agent-work-trace-renderer.ts` | `agent-work-traces` | Only renderer uses them | Yes | Yes | Cross-subsystem generic role registry |
| Summary hash input shape | Local helper in projection service | `agent-work-traces` | Summary belongs to projection package | Yes | Yes | Hash of raw traces including omitted reasoning |
| Target display metadata | Domain field `targetDisplayName` | `agent-work-traces` | Package/manifest semantic metadata | Yes | Yes | Body speaker label |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceProjectionContext` | Yes after change | Yes | Low | Replace `agentName` with `targetDisplayName` or construct explicit projection context from self-evolution context. |
| `AgentWorkTraceManifest` | Yes after change | Yes | Low | Remove `renderContext`; keep `target`, `targetDisplayName`, generated paths/files. |
| `AgentWorkTracePackage` | Yes after change | Yes | Low | Remove `renderContext`; keep semantic metadata and `summaryHash`. |
| `AgentWorkTraceFile` | Yes after change | Yes | Medium | Remove source fingerprint fields; define `recordCount` as rendered evidence entry count or rename only if implementation chooses. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-traces/domain/work-traces.ts` | `agent-work-traces` | Public/domain type boundary | Current projection context, manifest/package/file types with semantic metadata only | Existing type owner | N/A |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-projection-service.ts` | `agent-work-traces` | Projection package owner | Always build current generated files/manifest; summary hash over rendered evidence | Existing coordinator owner | Source reader/renderer/store |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-renderer.ts` | `agent-work-traces` | Markdown body owner | `# Work Trace`, role/event labels, reasoning omission, tool/trace-event formatting | Existing renderer owner | Redactor, replay transformer |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-store.ts` | `agent-work-traces` | Store/layout owner | Write files and clean manifest without render context | Existing store owner | Domain types |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-source-reader.ts` | `agent-work-traces` | Source adapter | Source ordering and raw record access only | Existing adapter owner | Raw trace service |
| `autobyteus-server-ts/src/agent-work-traces/services/agent-work-trace-render-context.ts` | `agent-work-traces` | Old compatibility helper | Remove | Obsolete | N/A |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/agent.md` | Built-in templates | Improver agent guidance | Retrospective Skill Improver top-level instructions with positive editable-root write scope | Renamed file | N/A |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/agent-config.json` | Built-in templates | Built-in skill package list | Reference `retrospective-skill-improver` package id | Renamed config file | Old package id alias |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/SKILL.md` | Built-in templates | Skill guidance | Package id/frontmatter, visible work-trace evidence interpretation, and action-oriented durable-improvement workflow | Existing package entry | N/A |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/references/high-signal-trace-patterns.md` | Built-in templates | Evidence reference | Target-run wording and internal reasoning exclusion | Existing file | N/A |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/skills/retrospective-skill-improver/references/examples.md` | Built-in templates | Examples | Target-run wording and Skill Improvement title | Existing file | N/A |

## Ownership Boundaries

- Projection service is the authoritative public boundary for work trace package generation. Consumers call it and receive paths/metadata; they do not instantiate renderer/store directly.
- Renderer owns readable Markdown semantics. It must not depend on target display names for role labels.
- Manifest/package owns semantic metadata. It must not preserve body speaker labels or renderer compatibility details.
- Built-in improver templates own agent-facing interpretation of the generated files. They must not assume old body labels or reasoning summaries.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceProjectionService.ensureCurrent()` | source reader, renderer, store, summary hash | Skill Improvement/self-evolution orchestration | Caller constructs work-trace files or reads old manifest internals directly | Add explicit package metadata fields |
| `AgentWorkTraceRenderer.renderSource()` | event label mapping, reasoning skip, tool/trace formatting, redaction | Projection service | Projection service chooses labels or filters reasoning externally | Add renderer helpers/options |
| `AgentWorkTraceStore` | output paths, manifest writing | Projection service | Renderer writes manifests | Extend store write methods |

## Dependency Rules

Allowed:

- `agent-work-traces` -> `agent-memory` raw trace source boundary.
- `agent-work-traces` -> `run-history/projection` replay transformer.
- `self-evolution` / Skill Improvement runtime -> `agent-work-traces` projection service.
- Built-in templates/docs may describe output contract but not import runtime code.

Forbidden:

- Renderer must not depend on `agentName` / `targetDisplayName` to choose body role labels.
- Projection service must not include separate reasoning text in summary hash.
- Store/manifest must not retain `renderContext`, `subjectLabel`, `rendererVersion`, or `fingerprint`.
- Do not add fallback reads/migrations for old generated work-trace manifest/body shapes.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentWorkTraceProjectionService.ensureCurrent(context)` | Work-trace projection package | Generate current files/manifest and summary | `{ target, memoryDir, targetDisplayName? }` | Replace `agentName` input with target display metadata, or construct explicit input at caller. |
| `AgentWorkTraceRenderer.renderSource(source)` | Markdown body | Convert source records to body content | `AgentWorkTraceSource` | No render context parameter should be needed. |
| `AgentWorkTraceStore.writeManifest(...)` | Manifest | Persist clean semantic metadata | `target`, `targetDisplayName`, `files` | No renderContext. |
| `SelfEvolutionCompanionTriggerMessageBuilder.build(...)` | Improver task packet | List paths and target IDs | Existing trigger request | Wording can say Skill Improvement / Retrospective Skill Improver while class name remains. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ensureCurrent` | Yes after change | Yes | Low | Use explicit target ref and display metadata. |
| `renderSource` | Yes | Yes | Low | Remove render context argument. |
| Manifest/package | Yes after change | Yes | Low | Remove render compatibility fields. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Body role | `subjectLabel` -> `assistant` | Yes after change | Low | Remove `subjectLabel`. |
| Target display metadata | `agentName` / `subjectLabel` -> `targetDisplayName` | Yes | Low | Use metadata only. |
| Worker agent | `Skill Self-Evolver` -> `Retrospective Skill Improver` | Yes | Medium | Pre-applied template text; align registry/tests or defer full source/API rename explicitly. |
| Built-in template folder | `skill-evolver` -> `retrospective-skill-improver` | Yes | Low | Rename template folder and update `templateDirName`, bootstrap tests, docs, and path references; no alias template. |
| Built-in skill package | `retrospective-skill-coach` -> `retrospective-skill-improver` | Yes | Low | Rename package folder, `SKILL.md` frontmatter, config, tests, and docs; no alias package. |
| Capability | `self-evolution` -> `Skill Improvement` wording | Yes | Medium | Use in touched text; full module/API rename deferred. |

## Applied Patterns (If Any)

- Adapter: `AgentWorkTraceSourceReader` remains adapter from raw trace files to projection sources.
- Renderer/mapper: `AgentWorkTraceRenderer` maps replay event kinds to Markdown sections.
- Store: `AgentWorkTraceStore` persists generated files/manifest.

No new architectural pattern is introduced.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-work-traces/` | Folder | Work-trace projection capability | Shared readable projection | Existing capability owner | Self-evolution-specific policy |
| `.../domain/work-traces.ts` | File | Domain type boundary | Clean projection/manifest/package types | Existing type file | Render compatibility fields |
| `.../services/agent-work-trace-projection-service.ts` | File | Projection owner | Current generation + summary hash | Existing owner | Body label decisions, old manifest migration |
| `.../services/agent-work-trace-renderer.ts` | File | Markdown renderer | Body shape and event labels | Existing renderer | Target identity lookup |
| `.../services/agent-work-trace-store.ts` | File | Generated file store | Layout and manifest writes | Existing store | Render semantics |
| `.../services/agent-work-trace-render-context.ts` | File | Obsolete | Remove | No clean role remains | N/A |
| `autobyteus-server-ts/src/built-in-agents/templates/retrospective-skill-improver/` | Folder | Built-in Retrospective Skill Improver template | Agent, config, and skill guidance with `retrospective-skill-improver` package id | Renamed template location | Runtime source/module/API renames unless separately scoped; old template/package aliases |
| `autobyteus-server-ts/docs/modules/agent_work_traces.md` | File | Docs | Work trace contract docs | Existing docs | Old subject-label/reasoning-summary claims |
| `autobyteus-server-ts/docs/modules/self_evolution.md` | File | Docs | Current feature docs | Existing docs | Misleading companion/self-evolution wording in touched areas |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-work-traces` | Main-Line Domain-Control + generated store | Yes | Low | Existing compact subsystem is appropriate. |
| `src/self-evolution` | Feature orchestration | Medium | Medium | Naming drift exists; full rename deferred. Use improved wording in touched text. |
| `templates/retrospective-skill-improver` | Built-in agent template | Yes | Low | Text artifacts belong here after the narrow folder rename. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Markdown body | `# Work Trace\n\n[time] assistant:\n...` | `# Agent Work Trace: active raw traces\nSource: active\nRecords: 5` | Keeps body LLM-readable and uncluttered. |
| Assistant label | `[time] assistant:` | `[time] Implementation Engineer:` | Separates role from target identity. |
| Tool label | `[time] tool:\nname: run_bash\nstatus: success` | `[time] Implementation Engineer tool call:` | Tool evidence is not assistant prose and not target-name speaker. |
| Reasoning | Omit separate reasoning event | `[time] assistant reasoning:` | Avoids internal model thinking and token bloat. |
| Manifest metadata | `{ target, targetDisplayName, files }` | `{ renderContext: { subjectLabel, rendererVersion, fingerprint } }` | Keeps metadata semantic and removes compatibility cache fields. |
| Improver wording | `Retrospective Skill Improver reads the target run's work trace evidence` | `Skill Self-Evolver companion inspects agent messages and reasoning summaries` | Matches actual actor relationship and new trace content. |
| Improver tone | `Use the listed editable skill roots as your write scope` | Long repeated `Do not ...` lists | Keeps guidance focused on the actual task and avoids irrelevant negative instructions. |
| Template folder | `retrospective-skill-improver` | `skill-evolver` | The built-in worker improves skills retrospectively; `evolver` is stale. |
| Skill package id | `retrospective-skill-improver` | `retrospective-skill-coach` | The package edits durable skills; `coach` is too advisory/passive. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `rendererVersion` / `fingerprint` | Could invalidate old generated cache | Rejected | Remove render context; generated artifacts are non-contract. |
| Keep `subjectLabel` as metadata | Could preserve target name | Rejected | Add/keep `targetDisplayName` semantic metadata only. |
| Support old and new body formats | Could allow old work traces to remain parse-compatible | Rejected | No parser compatibility contract; generate clean current body only. |
| Migrate old generated manifests | Could upgrade old outputs | Rejected | Do not migrate generated artifacts. |
| Keep reasoning as `assistant reasoning` | Could expose more evidence | Rejected | Omit separate reasoning records; visible assistant content remains. |
| Keep `skill-evolver` template folder as alias | Could avoid updating registry/tests/docs | Rejected | Rename template folder cleanly to `retrospective-skill-improver`; no alias template. |
| Keep `retrospective-skill-coach` as alias | Could avoid updating config/tests/docs | Rejected | Rename cleanly to `retrospective-skill-improver`; no compatibility alias. |

## Derived Layering (If Useful)

- Source layer: raw traces via `agent-memory`.
- Projection layer: `agent-work-traces` source reader, renderer, store, package.
- Skill Improvement layer: current self-evolution orchestration and Retrospective Skill Improver templates.

Layering follows ownership; orchestration depends on projection boundary only.

## Migration / Refactor Sequence

1. Update domain types:
   - Replace projection `agentName` with `targetDisplayName` metadata or explicitly map current self-evolution `agentName` to projection `targetDisplayName` at the call boundary.
   - Remove `AgentWorkTraceRenderContext` from manifest/package types.
   - Remove `sourceFingerprint` from file metadata unless still needed for a non-compatibility purpose; do not include raw/reasoning fingerprints in summary hash.
2. Remove `agent-work-trace-render-context.ts` and all imports/usages.
3. Update `AgentWorkTraceRenderer`:
   - `renderSource(source)` no render context.
   - Title exactly `# Work Trace`.
   - Remove source/record/timestamp body header lines.
   - Render message/tool/trace-event labels as specified.
   - Skip `reasoning` replay events.
4. Update `AgentWorkTraceProjectionService`:
   - Always write current generated work trace files/manifest for listed sources; no old manifest compatibility branch.
   - Compute `summaryHash` from target identity + rendered evidence content hashes only. Exclude omitted reasoning, generated timestamps, paths, targetDisplayName if implementation wants display-name changes not to churn evidence.
5. Update `AgentWorkTraceStore`:
   - Write clean manifest metadata with `target`, `targetDisplayName`, `generatedAt`, root/manifest paths if still useful, and `files` metadata.
   - No `renderContext`.
6. Update tests:
   - Projection output shape.
   - Named and blank display name body labels.
   - Tool and trace_event shape.
   - Reasoning omission and large reasoning omission.
   - Reasoning-only summary hash stability.
   - Clean manifest metadata and no legacy compatibility fields/branches.
7. Preserve or intentionally supersede pre-applied built-in template text updates, including the template folder and package id/folder rename to `retrospective-skill-improver` and the concise action-oriented wording.
8. Rename the built-in agent template folder from `templates/skill-evolver/` to `templates/retrospective-skill-improver/`; update `templateDirName`, bootstrap tests, docs, and path references.
9. Update built-in agent config/bootstrap tests/docs references from `retrospective-skill-coach` to `retrospective-skill-improver`.
10. Update docs for `agent_work_traces.md`, `self_evolution.md`, `ARCHITECTURE.md`, and related docs/tests that still claim subject labels/reasoning summaries or stale `skill-evolver` / `Skill Self-Evolver` wording.
11. Do not add migration/fallback for existing generated files or old template/package aliases.

## Key Tradeoffs

- Always regenerating current files is simpler and cleaner than cache reuse, but may do extra work. Accepted because work traces are development-phase generated artifacts and correctness/clean code matters more.
- Removing reasoning reduces evidence detail, but protects internal model thinking, avoids token bloat, and matches the LLM-readable conversation format the feature actually needs.
- Not renaming source modules now leaves `self-evolution` naming drift in code, but avoids a large unrelated refactor in this ticket. The localized built-in skill package rename is accepted because it directly fixes the touched skill identity and is small.

## Risks

- Built-in agent registry/tests may still expect display name `Skill Self-Evolver`, old template folder `skill-evolver`, or old skill id `retrospective-skill-coach`; implementation must align template/package naming or explicitly defer only broader source/API/runtime identifier naming, not the template/package rename.
- If any hidden consumer relies on `renderContext`, it will need update; search found no source consumer beyond tests/fixtures.
- Dependency installation is absent in the new worktree, so implementation validation needs setup.

## Guidance For Implementation

- Treat the requirements doc as authoritative for exact Markdown body shape.
- Keep source changes localized to `agent-work-traces`, Retrospective Skill Improver templates/config, tests, and docs unless a deliberate broader source/module/API rename is approved.
- Do not implement old generated-file compatibility.
- Do not include separate reasoning in rendered content or evidence summary.
- Preserve pre-applied skill template wording, `retrospective-skill-improver` template folder naming, and `retrospective-skill-improver` package id unless replacing wording with clearer wording that still satisfies REQ-012/REQ-014.

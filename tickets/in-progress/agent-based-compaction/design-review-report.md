# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-spec.md`
- Current Review Round: 7
- Trigger: Design-impact rework after code-review block `CR-004-001` and user clarification that optional model-generated `reference` should also be removed from the compactor-facing schema.
- Prior Review Round Reviewed: 6
- Latest Authoritative Round: 7
- Current-State Evidence Basis: Reviewed revised requirements, investigation notes, design spec, prior design review report, implementation design-impact notes, visible-run/default-agent/prompt-ownership/tag-removal/minimal-schema solution notes, updated implementation handoff, updated code review report, and local source evidence showing implementation still has `reference` in the compactor task contract/default `agent.md`/prompt tests and still carries internal `reference`/`tags` fields in memory types.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review of approved agent-based compaction design | N/A | No blocking findings | Pass | No | Superseded by round 2 clarification review. |
| 2 | User reaffirmed no legacy/direct-model compaction compatibility paths, feature flags, or dual-path behavior | No unresolved findings from round 1 | No blocking findings | Pass | No | Superseded by round 3 design-impact rework. |
| 3 | User rejected hidden/internal compactor-run semantics and requested existing top-level normal run APIs | No unresolved findings from round 2 | No blocking findings | Pass | No | Superseded by round 4 default-compactor/E2E design-impact rework. |
| 4 | User requested a system-provided default compactor agent and real Codex-compactor E2E expectation | No unresolved findings from round 3 | No blocking findings | Pass | No | Superseded by round 5 prompt-ownership rework. |
| 5 | User requested stronger `agent.md` prompt ownership for manual compactor testing | No unresolved findings from round 4 | No blocking findings | Pass | No | Superseded by round 6 tag-removal/schema simplification. |
| 6 | User challenged compactor output `tags` and requested a simpler schema for weaker LLMs | No unresolved findings from round 5 | No blocking findings | Pass | No | Superseded by round 7 facts-only schema clarification. |
| 7 | User also challenged optional model-generated `reference`; code review blocked on schema alignment | No unresolved findings from round 6 | No blocking findings | Pass | Yes | Latest authoritative design is implementation-ready; code review remains blocked until implementation aligns. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-based-compaction/tickets/in-progress/agent-based-compaction/design-spec.md` as the authoritative target design. Requirements and investigation notes were used as supporting context only.

Round 7 specifically reviewed the mandatory `Minimal Compactor Output Schema Policy` together with the prompt-ownership split. The latest design keeps the two-layer prompt contract and tightens the compactor-facing semantic entry contract to facts-only entries:

```json
{
  "episodic_summary": "string",
  "critical_issues": [{ "fact": "string" }],
  "unresolved_work": [{ "fact": "string" }],
  "durable_facts": [{ "fact": "string" }],
  "user_preferences": [{ "fact": "string" }],
  "important_artifacts": [{ "fact": "string" }]
}
```

Free-form `tags` and optional model-generated `reference` are removed from the compactor-facing prompt/schema/default-agent/docs/tests. The category array owns classification. If source paths or artifact names are durable facts, they should be included in the `fact` text rather than emitted as a separate optional metadata field. Internal memory models may keep `tags`/`reference` for other memory sources or future controlled indexing, but the compactor agent must not generate them in this refactor.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | None | N/A | No unresolved findings to recheck. | Round 1 was a pass. | Superseded by later design-impact rounds. |
| 2 | None | N/A | No unresolved findings to recheck. | Round 2 was a pass. | Direct-model removal remains in force. |
| 3 | None | N/A | No unresolved findings to recheck. | Round 3 was a pass. | Visible normal compactor runs remain in force. |
| 4 | None | N/A | No unresolved findings to recheck. | Round 4 was a pass. | Default compactor seeding and Codex E2E remain in force. |
| 5 | None | N/A | No unresolved findings to recheck. | Round 5 was a pass. | Prompt-ownership split remains in force. |
| 6 | None | N/A | No unresolved findings to recheck. | Round 6 was a pass. | Superseded by facts-only schema clarification that also removes `reference`. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Parent compaction threshold to rebuilt compacted snapshot | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Startup/default selection to injected parent runner | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Summarizer task prompt to runner output to parser result | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Server compactor execution through visible normal run | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Run-event/output collection and parent status correlation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-006 | Parser/normalizer bounded local facts-only validation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory compaction | Pass | Pass | Pass | Pass | Owns planning, persistence, parser/normalizer, snapshot rebuild, task envelope, settled blocks, and exact facts-only output contract. |
| Selected compactor agent definition | Pass | Pass | Pass | Pass | Owns stable behavior, category meanings, preservation/drop rules, JSON-only discipline, and manual-test guidance. |
| Default compactor template/bootstrap | Pass | Pass | Pass | Pass | Seeded default `agent.md` must be manually testable and must omit `tags` and `reference` from examples/schema. |
| Compactor output schema | Pass | Pass | Pass | Pass | Category arrays plus `{ fact }` are the complete compactor-facing semantic-entry contract. |
| Internal memory model fields | Pass | Pass | Pass | Pass | Optional `tags`/`reference` may remain for non-compactor sources; not part of compactor output authority. |
| `autobyteus-ts` native runtime construction | Pass | Pass | Pass | Pass | Adds only a runner injection seam; no server/runtime-kind dependency. |
| Server settings/agent definitions | Pass | Pass | Pass | Pass | Existing settings and shared-agent storage remain reused. |
| Server normal run execution | Pass | Pass | Pass | Pass | `AgentRunService` remains the visible-run lifecycle/history owner. |
| Server compaction adapter/output collector | Pass | Pass | Pass | Pass | Runner adapter and output collector stay compaction-specific without invading backend internals. |
| Web settings and normal run history | Pass | Pass | Pass | Pass | Server Basics selects the compactor; run history inspects compactor executions. |
| API/E2E validation | Pass | Pass | Pass | Pass | Real AutoByteus-parent + Codex-compactor scenario remains required after implementation/code review, or explicitly blocked. |
| Documentation | Pass | Pass | Pass | Pass | Must document default agent behavior, prompt split, facts-only schema, visible runs, setup, and no fallback. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Compaction task/result/metadata contract | Pass | Pass | Pass | Pass | `compaction-agent-runner.ts` remains the correct memory-owned boundary. |
| Prompt output contract constant/schema text | Pass | Pass | Pass | Pass | Memory-owned task builder must emit the current exact facts-only parser contract in every automated task. |
| Semantic entry shape | Pass | Pass | Pass | Pass | Tightened to `{ fact }`; `tags` and `reference` are not compactor-facing fields. |
| Stable compactor behavior instructions | Pass | Pass | Pass | Pass | Default `agent.md` is the right editable/user-visible home for durable behavior guidance. |
| Internal memory tag/reference support | Pass | N/A | Pass | Pass | May remain on internal memory models where independently needed, but compactor output must not request or rely on it. |
| Default compactor template | Pass | Pass | Pass | Pass | File-backed template under server compaction area mirrors normal agent definitions. |
| Default compactor seeding/selection | Pass | Pass | Pass | Pass | Bootstrapper owns non-destructive seed/select behavior. |
| Selected compactor config resolution | Pass | Pass | Pass | Pass | `CompactionAgentSettingsResolver` remains distinct from bootstrap and runner execution. |
| Normal run output collection | Pass | Pass | Pass | Pass | `CompactionRunOutputCollector` centralizes event-to-final-text/failure semantics. |
| Parent status identity fields | Pass | Pass | Pass | Pass | `compaction_run_id` correlates parent compaction status with visible run history. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Parser-required compactor JSON output contract | Pass | Pass | Pass | N/A | Exact shape remains memory-owned, current in automated tasks, and excludes `tags`/`reference`. |
| Compactor semantic entry | Pass | Pass | Pass | N/A | `fact` is the only model-generated semantic item field. |
| Typed category arrays | Pass | Pass | Pass | N/A | `critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, and `important_artifacts` remain the classification mechanism. |
| Free-form tags | Pass | Pass | Pass | N/A | Removed from the compactor-facing contract because no current consumer exists and categories already classify. |
| Optional model-generated reference | Pass | Pass | Pass | N/A | Removed from the compactor-facing contract because source pointers are optional metadata and add weak-model burden. |
| Fact text containing durable source/path details | Pass | Pass | Pass | N/A | If a file path, artifact id, run id, or source note is itself durable memory, it belongs in `fact` text. |
| Human-readable output guidance in default `agent.md` | Pass | Pass | Pass | N/A | May support manual testing but is not the parser source of truth and must show facts-only entries. |
| `SemanticItem.tags` / `SemanticItem.reference` internal fields | Pass | Pass | Pass | N/A | Keeping optional internal support is acceptable if compactor prompts/contracts do not request or populate model-generated metadata. |
| Default compactor id `autobyteus-memory-compactor` | Pass | Pass | Pass | N/A | Singular normal shared agent definition id. |
| Default `agent-config.json` | Pass | Pass | Pass | N/A | Must not encode environment-specific runtime/model assumptions. |
| `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID` | Pass | Pass | Pass | N/A | Selection identity only; no duplicate runtime/model setting. |
| `CompactionAgentTask` / runner metadata | Pass | Pass | Pass | Pass | Keeps task id, parent metadata, output text, and compactor run id distinct. |
| Generic `AgentRunConfig` | Pass | Pass | Pass | N/A | Compaction-specific hidden/internal fields remain rejected. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Free-form `tags` in compactor-facing schema/prompts/docs/tests | Pass | Pass | Pass | Pass | Replaced by facts-only category arrays. |
| Optional model-generated `reference` in compactor-facing schema/prompts/docs/tests | Pass | Pass | Pass | Pass | Replaced by facts-only category arrays; durable source/path details can be included in fact text. |
| Model-generated tag/reference persistence from compactor outputs | Pass | Pass | Pass | Pass | Compactor-generated semantic memory should store fact text under category; internal fields stay empty unless populated by non-compactor paths. |
| Future arbitrary LLM-generated tag/facet/source-pointer retrieval | Pass | Pass | Pass | Pass | Rejected unless later designed with deterministic source mapping or controlled vocabulary and consumer/indexing path. |
| `LLMCompactionSummarizer` production wiring | Pass | Pass | Pass | Pass | Replaced by `AgentCompactionSummarizer -> CompactionAgentRunner`; no fallback. |
| `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER` production setting | Pass | Pass | Pass | Pass | Replaced by selected compactor agent setting. |
| Active parent model fallback | Pass | Pass | Pass | Pass | Missing selected agent or missing runtime/model must fail actionably. |
| Web “Use active run model” option | Pass | Pass | Pass | Pass | Replaced by compactor-agent selector. |
| Per-task user message as sole behavior manual | Pass | Pass | Pass | Pass | Stable behavior moves to `agent.md`; automated task keeps short envelope plus exact contract. |
| Editable `agent.md` as sole parser-compatibility owner | Pass | Pass | Pass | Pass | Explicitly rejected; memory-owned task envelope remains authoritative. |
| Hidden/internal compactor-run infrastructure | Pass | Pass | Pass | Pass | Rejected; normal visible runs remain. |
| Compaction-specific `AgentRunConfig` / `AgentRunManager` changes | Pass | Pass | Pass | Pass | Must be reverted/avoided. |
| Codex/Claude/backend compaction-specific branches | Pass | Pass | Pass | Pass | Must be reverted/avoided. |
| Silent default template overwrite | Pass | Pass | Pass | Pass | User edits win; future updates require explicit migration design. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction/compaction-agent-runner.ts` | Pass | Pass | Pass | Pass | TS-owned boundary contract; no server runtime classes. |
| `autobyteus-ts/src/memory/compaction/agent-compaction-summarizer.ts` | Pass | Pass | Pass | Pass | Summarizer adapter only. |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | Pass | Pass | Pass | Pass | Builds short task envelope, exact facts-only JSON contract, and settled blocks; must remove `reference` and `tags` from the output contract. |
| `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts` | Pass | Pass | Pass | Pass | Parser remains validation owner for facts-only contract; should not require/request model metadata. Any tolerance for extra fields must not turn them into compactor contract. |
| `autobyteus-ts/src/memory/compaction/compaction-result-normalizer.ts` | Pass | Pass | Pass | Pass | Normalizes compactor result into categorized facts; should not populate model-generated `reference`/`tags` from compactor output. |
| `autobyteus-ts/src/memory/compaction/compactor.ts` | Pass | Pass | Pass | Pass | Persists categorized semantic items; compactor-generated items should have empty/internal-default metadata unless a non-compactor source supplies it. |
| `autobyteus-ts/src/memory/models/semantic-item.ts` | Pass | Pass | N/A | Pass | Optional `reference`/`tags` can remain as internal/general memory fields, not compactor prompt/schema requirements. |
| `autobyteus-ts/src/memory/compaction/llm-compaction-summarizer.ts` | Pass | Pass | N/A | Pass | Removed/decommissioned from production. |
| `autobyteus-ts/src/memory/compaction/compaction-runtime-settings.ts` | Pass | Pass | Pass | Pass | Ratio/context/debug only; no model selector. |
| `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts` | Pass | Pass | Pass | Pass | Pending cycle owner; reports metadata but does not resolve server runtime. |
| `autobyteus-ts/src/agent/context/agent-config.ts` | Pass | Pass | Pass | Pass | Optional runner injection seam only. |
| `autobyteus-ts/src/agent/factory/agent-factory.ts` | Pass | Pass | Pass | Pass | Wires agent summarizer when runner exists; no direct LLM summarizer. |
| `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent.md` | Pass | Pass | Pass | Pass | Stable behavior/category/preservation/drop/JSON/manual-test guidance; examples must use facts-only entries. |
| `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent/agent-config.json` | Pass | Pass | N/A | Pass | Template config with no environment-specific runtime/model. |
| `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent-bootstrapper.ts` | Pass | Pass | Pass | Pass | Startup bootstrapper owns default seed/select/preserve behavior. |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts` | Pass | Pass | Pass | Pass | Server-only selected-agent/default-launch resolver. |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | Pass | Pass | Pass | Pass | Uses `AgentRunService` and normal `AgentRun` APIs. |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-run-output-collector.ts` | Pass | Pass | Pass | Pass | Normal event aggregation and failure detection. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Pass | Pass | Pass | Pass | Parent native-agent construction seam only. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-config.ts` | Pass | Pass | N/A | Pass | No compaction/internal-task fields in target. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Pass | Pass | N/A | Pass | No compaction-specific create/filter/hidden behavior in target. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/**` / `backends/claude/**` | Pass | Pass | N/A | Pass | Must remain compaction-unaware. |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | Pass | Pass | Pass | Pass | Selects compactor agent and keeps ratio/context/debug. |
| Docs | Pass | Pass | N/A | Pass | Must explain prompt ownership split, facts-only schema, and manual testing. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` memory compaction | Pass | Pass | Pass | Pass | Calls only `CompactionAgentRunner`; owns exact facts-only contract and settled-block payload. |
| Selected compactor `agent.md` | Pass | Pass | Pass | Pass | Owns stable behavior, not parser compatibility as sole source, and must not ask for `tags` or `reference`. |
| Compactor schema owner | Pass | Pass | Pass | Pass | Memory parser/task builder owns the exact schema; category arrays are the classification boundary. |
| Internal memory metadata fields | Pass | Pass | Pass | Pass | Internal `reference`/`tags` fields may exist below memory ownership but cannot be mixed into the compactor-facing contract. |
| `AgentCompactionSummarizer` | Pass | Pass | Pass | Pass | Does not import `LLMFactory`, server services, or runtime internals. |
| `DefaultCompactorAgentBootstrapper` | Pass | Pass | Pass | Pass | Server startup/setup concern; writes normal shared agent files and setting only. |
| `ServerCompactionAgentRunner` | Pass | Pass | Pass | Pass | Uses `AgentRunService` and normal `AgentRun` APIs, not manager/backends directly. |
| `AgentRunService` | Pass | Pass | Pass | Pass | Remains authoritative normal visible-run lifecycle/history owner. |
| `AutoByteusAgentRunBackendFactory` | Pass | Pass | Pass | Pass | May inject runner into parent `AgentConfig`; forbidden to own compactor execution or hidden-run policy. |
| Codex/Claude/generic backend internals | Pass | Pass | Pass | Pass | Must remain compaction-unaware. |
| `CompactionConfigCard.vue` | Pass | Pass | Pass | Pass | No runtime execution or duplicate model controls. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `CompactionAgentRunner` | Pass | Pass | Pass | Pass | Memory-to-runtime execution boundary. |
| `CompactionTaskPromptBuilder` / output contract constant | Pass | Pass | Pass | Pass | Memory-owned current schema envelope; facts-only contract; not a behavior-manual owner. |
| Default compactor `agent.md` | Pass | Pass | Pass | Pass | Editable behavior owner; explicitly not sole schema compatibility owner and must show facts-only entries. |
| Compactor semantic categories | Pass | Pass | Pass | Pass | Category arrays own classification, avoiding duplicate free-form tag classification. |
| Internal reference/tag storage | Pass | Pass | Pass | Pass | Stays below memory model ownership and must not leak upward into compactor prompt/API contract. |
| `ServerCompactionAgentRunner` | Pass | Pass | Pass | Pass | Adapter from compaction task to normal visible server run. |
| `DefaultCompactorAgentBootstrapper` | Pass | Pass | Pass | Pass | Encapsulates seed/select/cache-refresh timing; does not become runtime owner. |
| `CompactionAgentSettingsResolver` | Pass | Pass | Pass | Pass | Settings/definition/default-launch lookup stays outside memory and output collection. |
| `AgentRunService` | Pass | Pass | Pass | Pass | Runner must not bypass it by calling `AgentRunManager` or backend factories directly. |
| Agent-definition provider/cache | Pass | Pass | Pass | Pass | Seeding must happen before cache preload or refresh cache after seeding. |
| `AgentRunManager` / backend factories | Pass | Pass | Pass | Pass | Remain normal framework internals behind `AgentRunService`. |
| `Compactor` | Pass | Pass | Pass | Pass | Persistence transaction remains encapsulated. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `CompactionAgentRunner.runCompactionTask(task)` | Pass | Pass | Pass | Low | Pass |
| `AgentCompactionSummarizer.summarize(blocks)` | Pass | Pass | Pass | Low | Pass |
| `CompactionTaskPromptBuilder.buildTaskPrompt(blocks)` | Pass | Pass | Pass | Low | Pass |
| Minimal semantic entry `{ fact }` | Pass | Pass | Pass | Low | Pass |
| `CompactionResponseParser.parse(text)` / equivalent | Pass | Pass | Pass | Low | Pass |
| `DefaultCompactorAgentBootstrapper.bootstrap()` / equivalent | Pass | Pass | Pass | Medium | Pass |
| `CompactionAgentSettingsResolver.resolve()` | Pass | Pass | Pass | Low | Pass |
| `ServerCompactionAgentRunner.runCompactionTask(task)` | Pass | Pass | Pass | Medium | Pass |
| `AgentRunService.createAgentRun(input)` | Pass | Pass | Pass | Low | Pass |
| `AgentRun.postUserMessage(message)` | Pass | Pass | Pass | Low | Pass |
| `CompactionRunOutputCollector.observe(event)` | Pass | Pass | Pass | Medium | Pass |
| `CompactionRuntimeReporter.emitStatus(payload)` | Pass | Pass | Pass | Low | Pass |
| `CompactionConfigCard.save()` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/compaction` | Pass | Pass | Low | Pass | Existing memory compaction core remains cohesive; task builder/parser own the facts-only output contract. |
| `autobyteus-ts/src/memory/models/semantic-item.ts` | Pass | Pass | Low | Pass | General memory model can keep optional metadata, separate from compactor-facing prompt/schema. |
| `autobyteus-ts/src/agent/context` / `factory` | Pass | Pass | Low | Pass | Construction/config seam only. |
| `autobyteus-server-ts/src/agent-execution/compaction` | Pass | Pass | Low | Pass | Correct home for compactor setup, templates, settings resolver, runner adapter, and output collector. |
| `autobyteus-server-ts/src/agent-execution/compaction/default-compactor-agent` | Pass | Pass | Low | Pass | Template belongs near compaction bootstrap owner. |
| App-data agents home under `getAgentsDir()` | Pass | Pass | Low | Pass | Correct runtime location for normal shared editable agent definition. |
| `autobyteus-server-ts/src/agent-execution/internal-tasks` | Pass | Pass | High if retained | Pass | Revised design says remove/avoid for compaction. |
| `autobyteus-server-ts/src/agent-execution/domain` / `services` / backend internals | Pass | Pass | High if compaction-specific changes are added | Pass | Generic framework must stay compaction-unaware except normal service use. |
| `autobyteus-web/components/settings` | Pass | Pass | Low | Pass | Existing settings location is correct. |
| Existing run history UI | Pass | Pass | Low | Pass | Reused for visible compactor runs. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Parent compaction sequencing | Pass | Pass | N/A | Pass | Reuse `PendingCompactionExecutor`. |
| Persistence commit | Pass | Pass | N/A | Pass | Reuse `Compactor` and `Summarizer` seam. |
| Parser/normalizer/snapshot | Pass | Pass | N/A | Pass | Existing memory semantics are preserved while simplifying the compactor-facing schema. |
| Stable compactor behavior authoring | Pass | Pass | N/A | Pass | Reuse normal editable agent `agent.md`. |
| Automated schema envelope | Pass | Pass | Pass | Pass | Existing/new task prompt builder is justified under memory compaction because parser/persistence consume the shape. |
| Source traceability and tag/facet retrieval | Pass | Pass | N/A | Pass | Correctly deferred; requires deterministic source mapping or controlled vocabulary and a consumer path if later needed. |
| Cross-runtime run execution | Pass | Pass | N/A | Pass | Reuse `AgentRunService -> AgentRunManager -> AgentRunBackend`. |
| Default agent storage/editing | Pass | Pass | Pass | Pass | Existing shared agent definition files and editor are reused. |
| Global selection settings | Pass | Pass | N/A | Pass | Extend existing `ServerSettingsService` and settings card. |
| Final output aggregation | Pass | Pass | Pass | Pass | New collector is justified because event converters do not own final-output wait/failure semantics. |
| Hidden/internal task lifecycle | Pass | Pass | N/A | Pass | Explicitly rejected. |
| Real Codex E2E validation | Pass | Pass | N/A | Pass | Belongs to API/E2E phase after code review with environment-blocker reporting. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| `tags` in compactor prompt/schema | No | Pass | Pass | Must be removed from compactor-facing contract, default `agent.md`, docs, and tests. |
| `reference` in compactor prompt/schema | No | Pass | Pass | Must be removed from compactor-facing contract, default `agent.md`, docs, and tests. |
| Internal `SemanticItem.tags`/`reference` for other memory uses | Yes | Pass | Pass | Accepted because it is not a compactor compatibility mode or prompt/schema field. |
| Direct LLM summarizer path | No | Pass | Pass | Must not remain as fallback, compatibility mode, feature flag, or dual production path. |
| Old compaction model setting | No | Pass | Pass | Remove production reads of `AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER`. |
| Active primary model fallback | No | Pass | Pass | Missing selected agent or missing runtime/model must fail actionably. |
| Runtime/model fields in compaction settings UI | No | Pass | Pass | Runtime/model stay on selected/default agent default launch preferences. |
| Hidden/internal compactor run path | No | Pass | Pass | Explicitly rejected. |
| Default agent template overwrite | No | Pass | Pass | User edits win; future updates require explicit migration design. |
| Schema solely in editable `agent.md` | No | Pass | Pass | Explicitly rejected for parser compatibility. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Revert forbidden partial internal-task/backend changes | Pass | Pass | Pass | Pass |
| Core `autobyteus-ts` runner/summarizer refactor | Pass | Pass | Pass | Pass |
| Prompt ownership split implementation | Pass | Pass | Pass | Pass |
| Compactor facts-only schema rework | Pass | Pass | Pass | Pass |
| Default compactor bootstrap/template/selection | Pass | Pass | Pass | Pass |
| Startup cache ordering/refresh | Pass | Pass | Pass | Pass |
| Server settings resolver | Pass | Pass | Pass | Pass |
| Visible normal-run server runner | Pass | Pass | Pass | Pass |
| Web compaction card replacement | Pass | Pass | Pass | Pass |
| API/E2E Codex-compactor validation | Pass | Pass | Pass | Pass |
| Docs cleanup | Pass | N/A | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Core runner boundary | Yes | Pass | Pass | Pass | Shows `Compactor -> AgentCompactionSummarizer -> CompactionAgentRunner` vs `LLMFactory`. |
| Prompt ownership | Yes | Pass | Pass | Pass | Good/bad shapes cover two-layer split vs only per-task or only editable `agent.md`. |
| Automated task envelope | Yes | Pass | N/A | Pass | Shows short envelope, `[OUTPUT_CONTRACT]`, and `[SETTLED_BLOCKS]`. |
| Facts-only semantic entry shape | Yes | Pass | Pass | Pass | Shows `{ fact }` and explicitly avoids `{ fact, reference, tags }`. |
| Default compactor `agent.md` intent | Yes | Pass | N/A | Pass | Example includes category, preservation/drop, JSON-only, and manual-test guidance. |
| Top-level run API use | Yes | Pass | Pass | Pass | Shows `ServerCompactionAgentRunner -> AgentRunService.createAgentRun -> AgentRun.postUserMessage`. |
| Framework non-invasion | Yes | Pass | Pass | Pass | Explicitly rejects `AgentRunConfig`, `AgentRunManager`, Codex, and Claude compaction branches. |
| Default compactor seeding | Yes | Pass | Pass | Pass | Policy gives runtime path, template path, no-overwrite, cache, and blank-setting selection rules. |
| Default launch config | Yes | Pass | Pass | Pass | Explicitly rejects Codex/LM Studio/Qwen/model assumptions in seed. |
| Visible run history/correlation | Yes | Pass | Pass | Pass | Parent status includes `compaction_run_id`. |
| Tool behavior | Yes | Pass | Pass | Pass | Conservative normal launch defaults and fail-on-tool-wait remain clear. |
| Codex E2E validation | Yes | Pass | Pass | Pass | Required scenario and blocker reporting are explicit. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Future traceability/source pointers | Some users may later want source provenance beyond fact text. | Defer to a separate design with deterministic source mapping from known trace/block ids or another controlled source-pointer mechanism. | Non-blocking by design. |
| Future tag/facet retrieval | User may later want richer retrieval/indexing. | Defer to a separate design with controlled vocabulary, deterministic derivation or model policy, indexing/search consumer, and migration. | Non-blocking by design. |
| Parser behavior for unexpected `tags`/`reference` emitted by a custom/stale compactor | Stale/custom agents may emit old fields despite the new contract. | Implementation may reject or tolerate-and-ignore extras, but must not prompt, document, test as required, or persist them as compactor-generated metadata. | Non-blocking; implementation detail constrained by final contract. |
| Future parser schema changes vs user-edited default `agent.md` | User-edited prompt may contain stale human-readable output guidance. | Automated task envelope remains authoritative; future template migration/versioning must be explicit. | Non-blocking by design. |
| Manual compactor testing precision | Manual testing may not include exact automated envelope unless user supplies it. | Default `agent.md` must provide enough behavior guidance; production compatibility is enforced by automated envelope and parser. | Non-blocking. |
| Runtime/model preconfiguration for fresh installs | Environment-specific runtime availability varies by node. | Seed default with no runtime/model assumption; users/E2E configure via normal agent editor/API. | Non-blocking by design. |
| Run-history volume from frequent compactions | Visible runs may accumulate many entries. | Accept for first implementation; future filtering/archive UX can be separately designed. | Non-blocking. |
| Auto-executed tool support for compactor | Some compactor agents may eventually need tools. | Defer explicit compactor launch-policy design; first version uses normal conservative inputs and fails on tool-wait. | Correctly out of scope. |
| E2E environment availability | Real Codex + local AutoByteus model may not exist in every validation environment. | API/E2E must record explicit environment blocker instead of claiming pass. | Non-blocking for design; blocking for validation if unavailable. |

## Review Decision

- `Pass`: the revised facts-only schema and prompt-ownership design is ready for implementation.

## Findings

None.

## Classification

No blocking design findings. No requirement-gap or design-impact reroute is required.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Code review finding `CR-004-001` is resolved at the design-artifact level by this round, but remains an implementation/code-review blocker until source, tests, docs, and handoff align with the facts-only schema.
- Current local implementation evidence still shows `reference` in `CompactionTaskPromptBuilder`, the default compactor `agent.md` schema/example, and prompt-builder tests. Implementation must remove `reference` as well as any remaining `tags` requests/requirements from compactor-facing contract, docs, and tests.
- Current compaction parser/normalizer/result/compactor internals still carry `reference`/`tags`. Internal fields may remain only if compactor-generated semantic items do not request or rely on them; if stale/custom output includes old fields, implementation should reject or ignore/drop them rather than persist model-generated metadata as part of this contract.
- If current normalizer logic auto-extracts `reference` from compactor fact text, verify whether that conflicts with AC-020's “stores only the fact text” target. For this ticket, source/path details should remain part of `fact` text unless a non-compactor/internal deterministic source supplies metadata under a separate design.
- The exact parser-required JSON contract must remain in every automated compaction task even for the seeded default agent; do not move schema compatibility exclusively into editable `agent.md`.
- The default `agent.md` may include a human-readable output shape for manual testing, but docs/tests should make clear that automated task envelopes are the production compatibility source of truth and should show facts-only semantic entries.
- Tests should verify all current design-impact constraints together: default `agent.md` includes category/preservation/drop/manual-test guidance; task prompt includes exact JSON contract plus `[SETTLED_BLOCKS]` without a long duplicate behavior manual; and prompt/default/docs/tests no longer request or require `tags` or `reference`.
- API/E2E must not resume until implementation and code review clear the facts-only schema rework.
- All previous guardrails remain: no direct-model fallback, no hidden/internal compactor runs, no backend-framework invasion, non-destructive default seeding, no environment-specific default runtime/model, and real Codex-compactor API/E2E or explicit blocker.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 7 is the latest authoritative result. The facts-only schema is architecturally acceptable and improves model robustness: compactor-facing semantic entries are categorized by their surrounding arrays and contain only `fact`; memory compaction still owns the exact parser-required JSON contract in automated tasks, while the editable compactor agent owns stable behavior/manual testability. Internal `tags`/`reference` support may remain only below the compactor contract for other sources or future controlled designs.

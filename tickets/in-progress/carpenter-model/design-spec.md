# Design Spec

## Current-State Read

AutoByteus currently has three separate instruction paths. Native `AutobyteusAgentRunBackendFactory` turns `AgentDefinition.instructions` (or description fallback) into a base prompt, optionally wraps team content through `autobyteus-member-system-prompt-composer.ts`, then lets the mandatory `AvailableSkillsProcessor` append a native skill catalog. Codex independently maps agent/team content into `baseInstructions` and `developerInstructions`. Claude stores an agent-instruction fallback and rebuilds team/agent/runtime XML inside every user turn. The shared `member-run-instruction-composer.ts` is not actually a run-instruction owner: it combines authored team/agent text with generated communication/delegation policy and describes all delegation lifecycle tools when only one is configured.

The runtimes already own the authoritative workspace and provider-tool projection, but team collaboration tools currently originate only from `AgentDefinition.toolNames`. Native resolves that configured list into provider schemas; Codex and Claude carry it through their existing Agent Tools MCP configuration. Prompt composition separately checks configured/resolved names before rendering team prose. This unnecessary coupling permits a team member to exist without its basic collaboration tools. `MemberTeamContextBuilder` also converts a selected team-definition lookup error into a blank team body.

Native prompt processing is additionally open-ended: `systemPromptProcessorNames` is authorable through file config, GraphQL, agent-management tools, and UI, even though only the mandatory Skills processor remains registered. The carpenter contract makes Skills terminal, so the obsolete optional system-prompt-processor surface must be removed rather than preserved as a hidden post-composition mutation path.

The target must preserve current provider-native tool schemas and configured-skill materialization, the exact runtime workspace, source-authored agent/team bodies, and historical run/session context. Production-path evidence is in `investigation-notes.md`, especially findings 23–39 and the refreshed file/component map.

## Intended Change

Introduce one server-owned `CarpenterPromptComposer` that receives a selected `AgentDefinition`, the exact effective workspace, and optional `MemberTeamContext`. It validates and normalizes those inputs, applies deterministic authored-heading containment, invokes a team-runtime renderer over team context only, emits the approved sections once in the approved order, and rejects unresolved documentation placeholders in the carpenter portion. Native `SystemPromptProcessingStep` separately owns the actual final-payload invariant after terminal Skills processing and before configuring the LLM.

Replace the existing configured-only exposure shape with one shared runtime-tool exposure shape. It computes runtime-requested tool names as the deduplicated union of agent-configured names and `send_message_to` plus `delegate_task` whenever `memberTeamContext` is non-null. Native, Codex, and Claude then project that same resolved request through their current provider-native mechanisms. This changes no MCP session ordering or cleanup: MCP remains transport only and is not consulted during prompt composition.

Project that same composed Markdown through the supported high-authority boundary of each runtime:

- native AutoByteus: `AgentConfig.systemPrompt`, followed only by the mandatory native `## Skills` processor;
- Codex: `CodexThreadConfig.baseInstructions`, with no separately reconstructed developer/runtime fragment;
- Claude Agent SDK: query `options.systemPrompt`, while the provider `prompt` remains only the user turn.

Skills remain one ordinary configured lazy model. Native keeps the metadata/path catalog, renamed `## Skills`; Codex and Claude keep provider-native workspace materialization. The change adds no system-, operating-, or task-skill taxonomy and no skill-loading tool.

Durable conceptual and authoring documentation must be updated with the same boundary and concrete examples (`R-006`, `AC-006`): platform-owned identity/environment/Bash/file/team sections, ordinary configured lazy skills, and separately authorized provider tool contracts. Documentation must not describe the removed processor surface, a skill-loading tool, or a system-skill kind.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | System | `R-001`, `AC-001` | Every supported run bootstrap | Investigation findings 1–7, 17–19 | Compose only the minimal structured foundation; no generic fundamentals block | Runtime bootstrap -> `CarpenterPromptComposer` -> provider instruction boundary (`DS-001`) |
| `BEH-002` | System | `R-002`, `AC-002` | Configured skill becomes applicable | Findings 1, 11–14, 20 | Preserve lazy skill bodies and configured-only skill exposure | Skill resolution -> validation -> native catalog or provider materializer (`DS-003`) |
| `BEH-003` | Contract | `R-003`, `AC-003` | Runtime tool exposure resolves | Findings 4, 23, 43–45 | Preserve provider-native schema transport, add the two basic team tools for team contexts, render no tool manifest | agent-configured names + team-context defaults -> shared exposure -> native/provider-MCP projection (`DS-006`) |
| `BEH-004` | System | `R-004`, `AC-004` | Native, Codex, or Claude bootstrap | Findings 5, 24, 43–45 | Same semantic prompt and thin provider projections without making prompt composition create/inspect MCP state | Shared composition -> native/Codex/Claude instruction projection (`DS-001`); independent tool projection (`DS-006`) |
| `BEH-005` | Operational | `R-007`, `AC-007` | Run workspace differs from skill source | Findings 10–11, 18 | Bind the exact effective workspace and distinguish skill-package roots | Workspace resolver -> composer; skill source remains separately owned (`DS-001`, `DS-003`) |
| `BEH-006` | Contract | `R-008`, `AC-008` | Skills from any supported source resolve | Findings 12–14, 20 | Keep one skill model/catalog contract; no kind field | Existing `SkillService` -> runtime exposure (`DS-003`) |
| `BEH-007` | System | `R-009`, `AC-009` | Selected agent definition loads | Findings 15–16, 31 | Render name, optional description/body; no role or description fallback | `AgentDefinition` -> identity renderer (`DS-001`, `DS-004`) |
| `BEH-008` | Contract | `R-010`, `AC-010` | Final prompt assembly | Findings 19, 35–39 | Stable ordered sections, heading containment, no optional post-processors | Composer ordered assembly -> projection -> native terminal Skills (`DS-001`, `DS-004`) |
| `BEH-009` | System | `R-011`, `AC-011` | Every supported bootstrap | Findings 21–22 | Emit exact concise Bash section; do not embed former manual | Fixed content renderer (`DS-001`) |
| `BEH-010` | System | `R-012`, `AC-012` | Every supported bootstrap | Findings 26–27 | Emit exact separate file/directory section | Fixed content renderer (`DS-001`) |
| `BEH-011` | System | `R-013`, `AC-013` | Team member bootstrap | Findings 28–29, 38, 43–45 | Exact Team Instruction plus fixed team-context-derived Team Runtime; standalone omits both | `MemberTeamContext` -> team renderer -> composer (`DS-002`, `DS-001`) |
| `BEH-012` | Contract | `R-005`, `R-014`, `AC-005`, `AC-014` | Any dynamic prompt binding | Findings 30–34, binding supplement; `MP-002` | Required invalid inputs fail; optional blanks omit; invalid skill entries suppress; no unresolved placeholder in the actual provider payload | Composer assertion for its portion; native post-Skills assertion before LLM configuration; provider projection (`DS-004`, `DS-005`, `DS-001`, `DS-003`) |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `system-prompt-contract.md` | Complete ordered semantic contract | `R-001`–`R-014` | Authoritative section order and exclusions | Approved 2026-08-12 |
| `agent-identity-prompt-spec.md` | Exact identity shape/source | `R-009`, `AC-009` | Drives identity renderer | Approved 2026-08-12 |
| `working-environment-prompt-spec.md` | Exact workspace/path wording | `R-007`, `AC-007` | Drives dynamic workspace renderer | Approved 2026-08-12 |
| `bash-operating-practice-prompt-spec.md` | Exact Bash text | `R-011`, `AC-011` | Fixed composer content | Approved 2026-08-12 |
| `file-and-directory-practice-prompt-spec.md` | Exact filesystem text | `R-012`, `AC-012` | Fixed composer content | Approved 2026-08-12 |
| `team-and-runtime-prompt-spec.md` | Closed team sections and fixed collaboration protocol | `R-013`, `AC-013` | Drives team runtime renderer | Approved, clarified by user 2026-08-12 |
| `prompt-value-binding-spec.md` | Exhaustive dynamic binding/failure matrix | `R-005`, `R-014`, `AC-005`, `AC-014` | Composer and provider preconditions | Approved 2026-08-12 |
| `system-skill-decision.md` | One-skill-model rationale | `R-002`, `R-008` | Rejects skill-kind alternatives | Evidence/decision context; approval N/A |
| `classroom-simulation-composed-system-prompt.md` | Exact two-agent validation fixture | `AC-001`, `AC-004`, `AC-009`, `AC-010`, `AC-013`, `AC-014` | Golden semantic example for coverage | Validated evidence; approval N/A |

The table uses concise relative display names; the architecture-review handoff supplies the absolute canonical path for every artifact.

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` / `Behavior Change` / `Refactor`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`
- Refactor needed now: `Yes`
- Evidence: three runtimes independently construct overlapping instruction subjects; native composes before resolving workspace; Claude places persistent rules in every user turn; team prose is conditional on configurable provider tools even though the team context requires basic collaboration; team-definition lookup suppresses errors; optional system-prompt processors can violate terminal ordering.
- Design response: centralize semantic composition and validation, keep provider projections thin, give generated team policy one bounded renderer, and remove obsolete prompt-composition extension surfaces.
- Refactor rationale: adding fundamentals separately to three adapters would duplicate exact wording and preserve the defect that caused divergence. The task cannot meet cross-runtime, exact-order, and exact-binding criteria on the current fragmented boundary.
- Intentional deferrals and residual risk: author-content normalization and deletion of the external `shell-first-operating-practice` package occur in their owning external repositories. Until then, explicitly configured external content may duplicate Bash advice, but no in-scope runtime relies on that package or a compatibility prompt path.

## Terminology

- **Carpenter prompt:** the shared structured Markdown foundation, excluding provider-native tool schemas and excluding provider-native Skills representation.
- **Automatic team tools:** `send_message_to` and `delegate_task`, unioned into provider tool exposure whenever a valid `MemberTeamContext` exists; they are not prompt-rendered schemas.
- **Provider projection:** transport of the composed prompt through a runtime-supported high-authority instruction field without changing content.
- **Authored body:** agent/team Markdown supplied by definitions and nested under its owning carpenter section.

## Design Reading Order

The remainder moves from removal/state decisions to spines, owners, boundaries, files, and sequence. `system-prompt-contract.md` is the exact content authority; this file is the architecture authority.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove runtime-specific agent/team/runtime reconstruction rather than wrapping it.
- Remove the description-as-instruction fallback.
- Remove the generic `Runtime Instruction` and `Agent Instruction` renderers.
- Remove Claude XML instruction wrapping from user turns.
- Remove the optional system-prompt-processor authoring/runtime surface; keep only the mandatory native Skills processor as a platform-owned terminal representation.
- Do not reintroduce text tool manifests, skill-loading tools, skill kinds, dual prompt formats, or compatibility flags.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: file-backed agent packages (`agent.md` plus `agent-config.json`), run metadata/history, native snapshots, and provider session IDs/histories; deployment-specific volume.
- Relevant change: compose-time instruction projection changes; `systemPromptProcessorNames` is removed from the current domain/API/config representation, while historical file keys may remain physically present.
- Normal reader/writer behavior and evidence: file config is normalized into a known `AgentConfigRecord`; unknown JSON keys can be ignored. New writers omit the removed field. Existing name/description/instructions/tools/skills/workspace values remain directly readable.
- Required invariants: preserve identities, authored bodies, tool/skill configuration, workspace, conversation/session state, and historical prompts as historical evidence.
- Constraints: no bulk rewrite, downtime, or history mutation is justified; removed processor names must never execute.
- Decision: `Directly Usable — No Migration`
- Rationale: runtime correctness requires ignoring the obsolete field, not rewriting every source file or historical record. A bulk file/history transformation adds I/O and corruption risk without changing the current semantic inputs.
- Supported criteria: `AC-004`, `AC-005`, `AC-009`, `AC-010`.

### Migration Plan

N/A — no transformation is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behaviors | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001`, `004`, `005`, `007`–`012` | Resolved run config/definition | First provider request/thread | Runtime bootstrapper/factory delegating semantics to `CarpenterPromptComposer` | Carries one exact prompt across all runtimes |
| `DS-002` | Bounded Local | `BEH-011`, `012` | Validated team context | Team Runtime fragment | `TeamRuntimeInstructionRenderer` | Keeps fixed collaboration protocol and dynamic roster/targets team-owned |
| `DS-003` | Bounded Local | `BEH-002`, `006`, `012` | Configured skill names | Native Skills catalog or provider materialization | Existing skill service/materializers | Preserves lazy one-skill model and validates entries |
| `DS-004` | Bounded Local | `BEH-007`, `008`, `012` | Dynamic scalars/authored bodies | Safe carpenter portion | `CarpenterPromptComposer` + `markdown-heading-containment.ts` | Enforces omission, fail-fast, containment, and no placeholders in the shared portion |
| `DS-005` | Bounded Local | `BEH-002`, `012` | Native carpenter portion + terminal Skills output | Final native provider instruction | `SystemPromptProcessingStep` | Owns the invariant only the complete post-processor payload can prove |
| `DS-006` | Bounded Local / cross-runtime | `BEH-003`, `004`, `011` | Agent-configured names + optional team context | Provider-native tool exposure | Shared runtime tool-exposure resolver | Guarantees the two basic collaboration tools without a prompt catalog or provider-specific prompt logic |

## Primary Execution Spine(s)

- Native prompt: `AgentRunConfig -> AutobyteusAgentRunBackendFactory -> resolve workspace -> CarpenterPromptComposer -> AgentConfig -> SystemPromptPipeline(AvailableSkillsProcessor only) -> SystemPromptProcessingStep final invariant -> LLM configureSystemPrompt -> provider request`
- Codex prompt: `AgentRunConfig -> CodexThreadBootstrapper -> resolve workspace -> CarpenterPromptComposer -> CodexThreadConfig.baseInstructions -> Codex app-server thread`
- Claude prompt: `AgentRunConfig -> ClaudeSessionBootstrapper -> resolve workspace -> CarpenterPromptComposer -> ClaudeAgentRunContext -> ClaudeSdkClient.options.systemPrompt -> Claude Agent SDK query`
- Team tools: `AgentDefinition.toolNames + MemberTeamContext -> shared automatic-team-tool union -> existing native resolver OR existing Codex/Claude Agent Tools MCP projection -> provider tool schemas`; existing MCP session lifecycle is unchanged.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Each adapter resolves facts it alone owns, calls the shared composer once, and projects the returned Markdown without rewording it. | Run config, definition, workspace, team context, prompt | Runtime bootstrap lifecycle; semantic transformation owned by composer | Skills and provider tool transport |
| `DS-002` | The composer delegates generated team content to a renderer that always emits the fixed communication/assignment protocol and derives only roster/target values from validated team context. | MemberTeamContext, roster manifests | Team runtime renderer | Delivery handlers and task execution remain outside prompt generation |
| `DS-003` | SkillService resolves configured skills; invalid metadata is rejected/suppressed before catalog or materialization; bodies stay lazy. | Skill, access mode, materialized descriptor/catalog entry | Existing skill subsystem | Symlink lifecycle and native registry |
| `DS-004` | Required scalars validate, optional values omit, authored headings shift beneath wrappers, then the shared carpenter portion rejects unresolved tokens. | Agent identity, workspace, team body, Markdown | Carpenter composer | Diagnostics only |
| `DS-005` | Native terminal Skills appends validated configured metadata, then `SystemPromptProcessingStep` scans the complete string; a match fails bootstrap through the existing `AgentErrorEvent` path and the LLM is never configured with that payload. | Processed native system prompt | `SystemPromptProcessingStep` | Skill catalog renderer |
| `DS-006` | A shared resolver normalizes/deduplicates agent-configured names, then adds `send_message_to` and `delegate_task` only when `MemberTeamContext` exists. Native consumes the resulting names directly; Codex and Claude pass them through their already-working Agent Tools MCP session creation/materialization. | Agent definition, member team context, resolved tool request | Shared runtime tool-exposure resolver | Provider availability suppression/transport remains provider-owned; no prompt input |

## Spine Actors / Main-Line Nodes

`AgentRunConfig`, selected `AgentDefinition`, runtime workspace resolver/manager, `MemberTeamContext`, `CarpenterPromptComposer`, native final-prompt step, and provider instruction boundary. The parallel tool spine uses the shared exposure resolver and existing provider tool projectors.

## Ownership Map

- Runtime bootstrappers/factory own lifecycle sequencing and retrieval of effective runtime facts.
- `CarpenterPromptComposer` owns semantic section order, exact fixed content, scalar validation, authored-body wrapping, omission, and an unresolved-placeholder assertion for the shared portion.
- Native `SystemPromptProcessingStep` owns validation of the actual final post-Skills provider instruction before `llmInstance.configureSystemPrompt`; failure uses its existing critical bootstrap failure/`AgentErrorEvent` behavior and never invokes the provider.
- `TeamRuntimeInstructionRenderer` owns only framework-generated current-member, communication, roster, and delegation prose.
- The shared configured-tool exposure resolver owns normalization, deduplication, and automatic `send_message_to`/`delegate_task` union for `MemberTeamContext`; provider adapters consume that result without adding prompt logic.
- SkillService/materializers/native Skills processor own configured skill exposure; they do not own the foundation.
- Existing Codex/Claude MCP session and cleanup owners remain unchanged; this ticket changes only the names supplied to their existing exposure path.
- Provider clients own channel mapping only. They must not reconstruct prompt semantics or tool-default policy.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Native/Codex/Claude bootstrap entry | Runtime backend lifecycle | Provider startup and restoration | Prompt wording or fallback policy |
| `ClaudeSdkClient.startQueryTurn` | Claude SDK boundary | Normalize SDK query options | Carpenter section assembly |
| `AvailableSkillsProcessor.process` | Native skill catalog | Append terminal configured catalog | Agent/team/environment content |
| `SystemPromptProcessingStep.execute` | Native final instruction boundary | Run the terminal processor pipeline, validate the complete payload, then configure the LLM | Skill discovery or carpenter composition |
| Native/Codex/Claude tool projector | shared runtime tool-exposure resolver | Transport the resolved request through existing provider schemas/MCP configuration | Prompt-content decisions or provider-local default unions |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why | Replacement | Scope | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-member-system-prompt-composer.ts` | Native-only reconstruction | `CarpenterPromptComposer` | In This Change | Delete file/tests/imports |
| `member-run-instruction-composer.ts` generic composition | Mixes three subjects and boolean capabilities | `team-runtime-instruction-renderer.ts` | In This Change | Keep/reuse roster/delegation data builders |
| Codex default/team bootstrap strategies | Only reconstruct instruction sections | Direct shared composition in bootstrapper | In This Change | Delete both strategy files and injection seams |
| Claude default/team bootstrap strategies | Only pass nullable team context already on run config | Direct run-config context use | In This Change | Delete both strategy files |
| `claude-turn-input-builder.ts` XML wrapper | Repeats persistent rules as user content | SDK `systemPrompt` option | In This Change | Provider `prompt` becomes user content only |
| `agentInstruction` and `memberTeamContext` duplicate fields in `ClaudeAgentRunContext` | Parallel representation of definition/run config | Stored composed `carpenterSystemPrompt`; run config owns team context | In This Change | Avoid recomposition each turn |
| Description fallback in all adapters | Duplicates identity | Optional identity fields | In This Change | Blank body omits responsibilities |
| Roster selector footer and SW-specific handoff example | Duplicate/noisy generic content | Closed Team Runtime wording | In This Change | Preserve membership rows |
| `systemPromptProcessorNames` domain/config/GraphQL/tool/UI surface | Contradicts closed terminal order; no optional implementation remains | Platform-owned composer + terminal Skills | In This Change | Ignore historical file keys; update generated GraphQL |
| External shell-first package/consumer config | Superseded source content in other repos | Carpenter Bash/file sections | Follow-up | No runtime compatibility path |
| Existing authored-body content normalization | Content package concern | Later agent/team package revisions | Follow-up | Heading containment makes in-scope structure safe |

The native final-payload assertion is target ownership. Existing provider MCP session/client cleanup remains untouched because prompt composition no longer depends on descriptor creation.

## Return Or Event Spine(s) (If Applicable)

N/A — provider response/event projection is unchanged. This change ends at provider instruction submission.

## Bounded Local / Internal Spines (If Applicable)

- `DS-002`: `validated MemberTeamContext -> existing roster/target manifest builders -> fixed communication/assignment rendering -> Team Runtime body`.
- `DS-003`: `configured skills -> strict metadata/path validation -> native registry/catalog OR Codex/Claude materializer -> provider discovery`.
- `DS-004`: `scalar normalization -> required/optional decision -> heading containment -> ordered join -> shared-portion unresolved-placeholder assertion`.
- `DS-005`: `shared carpenter prompt -> AvailableSkillsProcessor terminal append -> complete-payload unresolved-placeholder assertion -> configure LLM or bootstrap failure`.
- `DS-006`: `configured names + optional MemberTeamContext -> normalize/deduplicate -> add send_message_to/delegate_task for team -> existing native or provider-MCP projection`.

## Off-Spine Concerns Around The Spine

| Concern | Spines | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| Tool schema/authorization transport | `DS-006` | Provider runtime | Actual callable tools and schemas | Prompt is not a schema catalog | Duplicated/stale contracts |
| Skill symlink/registry lifecycle | `DS-003` | Provider skill exposure | Make configured packages discoverable lazily | Provider-specific mechanism | Workspace/skill identity confusion |
| Markdown containment | `DS-004` | Composer | Preserve authored hierarchy under wrappers | Prevent section escape | Authored headings break contract |
| Native final-payload validation | `DS-005` | System prompt bootstrap | Validate all post-processor dynamic content | Only this point sees terminal Skills metadata | Invalid payload reaches LLM/provider |
| Existing MCP session lifecycle | N/A to carpenter prompt | Codex/Claude runtime | Preserve current session creation, client reference counting, and cleanup | Tool transport already works | Prompt change accidentally redesigns transport lifecycle |
| Diagnostics | all | Bootstrap/skill owners | Explain invalid sources before provider | Observable failure/suppression | Silent malformed prompts |
| Run history | `DS-001` | Existing history subsystem | Preserve session/snapshot history | Historical evidence | Accidental rewrite/corruption |

## Ownership Boundaries

The prompt adapter resolves only prompt values: selected definition, exact workspace, and optional validated `MemberTeamContext`. It does not wait for, inspect, or create a provider tool descriptor. In parallel, the shared tool-exposure boundary unions the two automatic team names with configured names into one runtime-requested set before existing native/Codex/Claude resolution. Because that boundary runs before all three provider projections, each runtime gets the same default without provider-local policy.

Codex and Claude continue creating, owning, and cleaning their Agent Tools MCP sessions exactly as they do on `origin/personal`. The carpenter implementation must not add session IDs to runtime contexts, move session creation earlier, change `CodexThreadCleanup`, or change reference-counted client release. Automatic team-tool names simply enter the renamed runtime-exposure input.

Native prompt authority changes after the composer: `AvailableSkillsProcessor` is the only terminal processor and may append user-authored metadata. Therefore `SystemPromptProcessingStep`, immediately after `SystemPromptPipeline.process` and before assigning `processedSystemPrompt` or calling `llmInstance.configureSystemPrompt`, runs the unresolved-placeholder matcher against the complete payload. A match throws/fails the existing bootstrap step, posts its `AgentErrorEvent`, and does not configure or invoke the LLM. The composer keeps an earlier defense for its portion, but must not call that earlier string the final provider payload.

Team definition lookup belongs to `MemberTeamContextBuilder`; it must distinguish a confirmed blank body from missing/failed definition resolution. Team runtime rendering remains within the team-execution subsystem because roster and delegation identities are team-owned. The composer owns the wrapper/order but not team topology derivation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Required Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `composeCarpenterPrompt(input)` | section renderers, normalization, heading containment, shared-portion assertion | all three runtime adapters | adapter-local headings/fallbacks | add a typed input/result, not adapter helpers |
| `renderTeamRuntimeInstruction(input)` | roster/target manifests and fixed protocol fragments | carpenter composer | boolean/tool-name trigger prose | accept only validated `MemberTeamContext` |
| shared runtime tool-exposure resolver | configured-name normalization plus automatic team defaults | native/Codex/Claude provider tool projectors | provider-local union or prompt-derived authorization | accept agent definition + optional `MemberTeamContext` |
| Existing Agent Tools MCP session descriptor | provider tool transport only | Codex/Claude bootstrap/session | prompt composition inspection or lifecycle redesign | leave current creation/cleanup ownership unchanged |
| SkillService/materializers | configured resolution and provider exposure | runtime adapters | direct directory guessing | tighten validation inside existing owner |
| `SystemPromptProcessingStep.execute` | terminal native processors + final-payload assertion + LLM configuration | native agent bootstrap | calling `configureSystemPrompt` with an unchecked post-Skills string | keep final assertion in this step, not the earlier composer |

## Dependency Rules

1. Provider adapters may depend on the shared prompt composer; the composer may depend on agent/team domain types and the team runtime renderer, never on provider adapters.
2. The team runtime renderer may reuse roster/delegation manifest builders; those builders must not depend on provider code.
3. A valid `MemberTeamContext` always adds exactly `send_message_to` and `delegate_task` to the normalized runtime-requested name set; duplicate configured entries collapse. Standalone exposure is unchanged.
4. Team Runtime derives only from validated team context. It may name the two guaranteed collaboration tools as protocol text but never renders schemas or a general catalog.
5. Codex/Claude MCP descriptors remain provider transport outputs and must not become prompt-composer inputs; their current creation and cleanup lifecycle is unchanged.
6. Skill bodies and paths may not be copied into the shared foundation. Native Skills stays terminal; Codex/Claude use native materialization only.
7. No provider adapter may fallback from blank agent instructions to description.
8. No optional system-prompt processor, compatibility wrapper, XML alternate format, or text tool manifest may remain.
9. Native final-payload validation must run after every terminal prompt processor and before the processed prompt is stored or configured on the LLM. Skill metadata validation alone is not a substitute.

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `composeCarpenterPrompt` | Carpenter prompt | Validate and compose ordered Markdown | full definition + absolute workspace + optional team context | synchronous pure transformation |
| `renderTeamRuntimeInstruction` | Generated Team Runtime | Render current member, fixed protocols, and dynamic rosters | validated `MemberTeamContext` | returns body without outer heading |
| `resolveRuntimeAgentToolExposure` (target name) | Provider tool request | Normalize/deduplicate configured names and add team defaults | agent definition tool names + optional `MemberTeamContext` | provider-neutral; replaces direct calls to configured-only resolver at runtime boundaries |
| `containAuthoredMarkdownHeadings` | Authored body hierarchy | Shift ATX headings safely | body + containing level | fence-aware; overflow becomes bold label |
| `ClaudeSdkStartQueryTurnOptions.systemPrompt` | Claude system instruction | Pass exact composed prompt | nonblank string | maps to SDK `options.systemPrompt` |
| Skills processor/materializers | Configured skill exposure | Validate and advertise/materialize | `Skill[]` + access mode + workspace | no body injection |
| `assertResolvedInstructionPayload` (internal function in `system-prompt-processing-step.ts`) | Complete native provider instruction | Reject unresolved double-brace syntax after processing | complete processed string | throws before state/LLM mutation; error names invariant, not user metadata contents |

## Interface Boundary Check

| Interface | Singular? | Explicit Identity? | Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Composer | Yes | Yes | Low | Keep inputs typed and semantic |
| Team renderer | Yes | Yes | Low | Do not re-add agent/team body parameters |
| Runtime tool exposure | Yes | Yes | Low | Resolve once before provider-specific projection; keep outside prompt composer |
| Claude SDK client | Yes | Yes | Low | Add only systemPrompt transport field |
| Native prompt pipeline | Yes after removal | Yes | Low | Mandatory Skills only; final step validates complete output |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared semantic prompt | `CarpenterPrompt` | Yes | Low | Do not rename to generic runtime instruction |
| Team generated content | `TeamRuntimeInstruction` | Yes | Low | Closed content contract |
| Automatic team collaboration set | `AUTOMATIC_TEAM_TOOL_NAMES` | Yes | Low | Exact two-name constant owned by shared runtime exposure |
| Authored body containment | `containAuthoredMarkdownHeadings` | Yes | Low | Keep Markdown-specific name |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| Agent/team domain inputs | Definition/team-execution domains | Reuse | Already authoritative | N/A |
| Roster/delegation derivation | Existing manifest builders | Extend | Data shapes are correct; rendering is noisy/boolean | N/A |
| Cross-runtime composition | None | Create New | No current shared semantic owner | `agent-execution/prompt` is cross-runtime owner |
| Skill exposure | SkillService/processors/materializers | Extend | One-skill model already correct | N/A |
| Claude system channel | Existing SDK client | Extend | SDK supports custom `systemPrompt` | N/A |
| Optional prompt processor customization | Existing legacy surface | Remove | Conflicts with closed contract and has no optional implementation | N/A |
| Native final payload invariant | Existing `SystemPromptProcessingStep` | Extend | It alone sees output after terminal Skills and before LLM configuration | N/A |
| Automatic cross-runtime team tools | Existing shared configured-tool exposure area | Replace configured-only naming with runtime exposure | All provider backends already consume this normalized structure | Rename the file/type/fields at the same boundary, add the team-context-aware resolver and exact two-name constant, and update imports atomically; do not alter provider lifecycle |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Owners Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent execution prompt | semantic composition/shared-portion validation | `DS-001`, `DS-004` | all runtime bootstraps | Create New | Small focused cross-runtime folder |
| Team execution | generated team context | `DS-002` | composer | Extend | Reuse manifests |
| Native system-prompt bootstrap | terminal Skills plus complete-payload invariant and LLM configuration | `DS-001`, `DS-005` | native backend | Extend | Actual final native instruction owner |
| Runtime tool exposure | configured names plus automatic team defaults | `DS-006` | native/Codex/Claude tool projectors | Refactor/extend | Replace configured-only names with truthful runtime-request names; provider schemas/transports stay local |
| Runtime adapters | lifecycle/value resolution/channel mapping | `DS-001` | provider backends | Extend | Thin prompt projections |
| Skills | strict lazy exposure | `DS-003` | native/Codex/Claude | Extend | No kinds or loading tool |
| Agent definition/API/UI | remove obsolete processor customization | `DS-001` | authoring/runtime | Contract | Stored file supersets remain readable |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner / Boundary | Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `carpenter-prompt-composer.ts` | prompt | composer | ordered assembly/invariants | One orchestration owner | Yes |
| `carpenter-prompt-sections.ts` | prompt | section renderer | exact fixed/dynamic section content | Keeps long exact text out of orchestration | Yes |
| `markdown-heading-containment.ts` | prompt | normalizer | authored heading algorithm | Independently testable parser-sensitive logic | Yes |
| `team-runtime-instruction-renderer.ts` | team | renderer | generated team protocol/roster prose | One closed team-specific subject | Yes |
| `system-prompt-processing-step.ts` | native bootstrap | final payload owner | post-Skills unresolved-placeholder assertion before LLM configuration | Existing singular last instruction boundary | No |
| `runtime-agent-tool-exposure.ts` | runtime tools | shared request resolver | union/deduplicate configured names with exact team defaults | Same existing cross-provider boundary with truthful target naming | Yes |

## Reusable Owned Structures Check

| Repeated Logic | Shared File | Owner | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Section order/rendering | composer/sections | prompt subsystem | Three providers need identical output | Yes | Yes | generic template engine |
| Heading containment | containment file | prompt subsystem | Agent/team bodies share algorithm | Yes | Yes | Markdown reformatter |
| Fixed team protocol fragments | team renderer | team subsystem | Three providers need exact team prose | Yes | Yes | general runtime bucket or tool catalog |
| Skill metadata validation | server loader + existing runtime owners | skill subsystem | All providers consume same model | Yes | Yes | new skill taxonomy |
| Unresolved-placeholder matcher | composer internal + native step internal | each boundary owner | Same approved invariant at two distinct payload boundaries | Yes | No | a generic validation framework or a false claim that composer sees native Skills |
| Automatic team-tool union | runtime exposure file | runtime tool exposure | Three providers need the same two defaults | Yes | Yes | provider-local policy or prompt authorization |

## Shared Structure / Data Model Tightness Check

| Structure | Clear Fields? | Redundant Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `CarpenterPromptInput` | Yes | Yes | Low | No pre-rendered agent/team instruction strings |
| Runtime requested tool names | Yes | Yes | Low | Deduplicate configured plus exact team defaults once |
| `TeamRuntimeInstructionInput` | Yes | Yes | Low | Context only |
| `Skill` | Yes for scope | Yes | Low | Strictly validate current fields; add no kind |

## Final File Responsibility Mapping

| File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Shared? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts` | prompt | public semantic boundary | typed input, validation, order, shared-portion assertion | Governing semantic owner | Yes |
| `.../prompt/carpenter-prompt-sections.ts` | prompt | internal renderer | exact Identity/Environment/Bash/File wrappers | Exact content cohesion | Yes |
| `.../prompt/markdown-heading-containment.ts` | prompt | internal normalizer | fence-aware ATX shift/overflow | Parser-specific unit | Yes |
| `.../agent-team-execution/services/team-runtime-instruction-renderer.ts` | team | internal renderer | current member + communication/delegation fragments | Closed team subject | Yes |
| Existing roster/delegation builders | team | data builders | membership/targets only | Reused structures | Yes |
| `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | runtime tools | shared provider-request boundary | normalize configured names, add/deduplicate exact team defaults, derive enabled tool groups | One truthful cross-runtime owner replaces the configured-only shape | Yes |
| `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts` | native bootstrap | final payload boundary | process terminal Skills, assert complete payload, then configure LLM | Only complete native instruction point | No |
| Native backend factory | adapter | lifecycle/projector | resolve actual facts then pass composer result | Native-specific | Composer |
| Codex bootstrap file | adapter | prompt projector/tool transport caller | compose from definition/workspace/team context; pass shared resolved tool exposure into unchanged MCP materialization | Provider-specific projection remains local | No MCP lifecycle change |
| Claude bootstrap/session/client files | adapter | lifecycle/projector | resolve actual facts then pass prompt | Provider-specific | Composer |
| Existing skill loader/processors/materializers | skills | exposure | strict fields, native heading, lazy projection | Existing owner | Shared model |
| Agent definition/API/UI files | authoring contract | definition surfaces | remove system-prompt processor field/options | Complete removal | N/A |

## Applied Patterns (If Any)

- **Semantic composer + thin adapters:** one transformation, three channel projections.
- **Manifest builder/renderer split:** keep current team topology derivation while replacing noisy output policy.
- **Strict boundary normalization:** validate required runtime facts before provider invocation.
- **Stored-superset contraction:** stop reading/writing obsolete config semantics without bulk rewrite.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/prompt/` | Folder | cross-runtime prompt subsystem | Shared semantic composition | Adjacent to all backends | provider APIs, skill bodies |
| `.../carpenter-prompt-composer.ts` | File | authoritative composer | validation/order/shared-portion invariant | Public boundary | file I/O, provider channels |
| `.../carpenter-prompt-sections.ts` | File | section content | exact approved Markdown | Content cohesion | team topology |
| `.../markdown-heading-containment.ts` | File | authored-body normalizer | fenced ATX containment | Reusable internal concern | general Markdown rewrite |
| `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-instruction-renderer.ts` | File | team runtime | exact generated team body | Team owns topology/protocol | agent identity/workspace |
| `member-team-context-builder.ts` | File | team context | fail on definition resolution failure | Existing authority | prompt formatting |
| `member-team-roster-manifest.ts` | File | roster data/render | remove duplicate selector footer | Existing structure | tool authorization |
| `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | File | cross-runtime provider-request owner | replace `ConfiguredAgentToolExposure` with `RuntimeAgentToolExposure`; expose `requestedToolNames`, enabled tool groups, and `sendMessageToEnabled`/`publishArtifactsEnabled`; add `AUTOMATIC_TEAM_TOOL_NAMES = [send_message_to, delegate_task]`; normalize/deduplicate configured names and union defaults when `MemberTeamContext` exists | Clean rename/refactor of the shared boundary already consumed by all three runtime projectors | prompt rendering, MCP lifecycle |
| `autobyteus-agent-run-backend-factory.ts` | File | native adapter | resolve workspace and shared runtime tool exposure; pass provider tools independently from context-only composer | Native lifecycle | prompt wording or provider-local defaults |
| `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts` | File | native final provider-instruction boundary | after terminal Skills processing, reject any unresolved `{{...}}` payload before storing it or configuring the LLM | Only code point that sees the complete native instruction before LLM configuration | skill discovery, carpenter composition |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | File | Codex adapter | use shared runtime exposure for existing MCP config and independently compose `baseInstructions` from definition/workspace/team context | Codex projection boundary | descriptor-to-prompt coupling or MCP lifecycle changes |
| `autobyteus-ts/tests/unit/agent/bootstrap-steps/system-prompt-processing-step.test.ts` (new) | Test | native final-payload boundary coverage | prove post-Skills placeholder rejection, `AgentErrorEvent`, and no state/LLM mutation | Exercises the actual invariant owner directly | composer-only assertions |
| Existing exposure tests renamed for runtime exposure, plus native resolver, Codex bootstrap, and Claude tooling-option unit/integration tests | Tests | automatic team-tool coverage | prove standalone unchanged; team union without configuration; deduplication; native/Codex/Claude provider projection; prompt composer needs no tool-name/descriptor input | Covers the new shared contract at each adapter | Available Tools snapshots or MCP cleanup changes |
| `claude-session-bootstrapper.ts`, `claude-agent-run-context.ts`, `claude-session.ts` | Files | Claude adapter/session | use shared runtime exposure for existing MCP transport, store composed system prompt, reuse it for every query, and pass user prompt separately | Claude lifecycle | XML wrappers, descriptor-to-prompt coupling, cleanup changes |
| `claude-sdk-client.ts` | File | SDK boundary | map `systemPrompt` to query options | Provider transport | semantic composition |
| `autobyteus-ts/.../available-skills-processor.ts` | File | native Skills | terminal `## Skills` and valid entries | Existing native pipeline | foundation/tool schemas |
| Server/core skill loaders and materializers | Files | skills | nonblank metadata/absolute manifest validation | Existing owners | skill kinds |
| Agent definition domain/config/GraphQL/tool/UI files | Files | authoring contract | remove `systemPromptProcessorNames` and option list | Clean boundary | compatibility field |
| `autobyteus-member-system-prompt-composer.ts`, old strategy files, `claude-turn-input-builder.ts`, `member-run-instruction-composer.ts` | Files | N/A | Delete | Replaced paths | N/A |

## Folder Boundary Check

| Path / Folder | Depth | Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `agent-execution/prompt` | Main-Line Domain-Control | Yes | Low | Shared semantic transformation, not provider-specific |
| `agent-team-execution/services` | Main-Line Domain-Control | Yes | Low | Team-generated runtime content belongs with team topology |
| runtime backend folders | Persistence-Provider | Yes | Low | Provider projection and provider-specific resource lifecycle remain local |
| `autobyteus-ts/src/agent/bootstrap-steps` | Main-Line Runtime Boundary | Yes | Low | Native final-payload assertion belongs beside pipeline execution and LLM configuration |
| `autobyteus-ts/agent/system-prompt-processor` | Off-Spine Concern | Yes after contraction | Low | Terminal native Skills only |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Composer input | `{ agentDefinition, workspaceRootPath, memberTeamContext }` | `{ baseAgentInstruction, runtimeInstruction, effectiveToolNames }` | Prompt semantics do not depend on provider transport state |
| Codex | one exact prompt in `baseInstructions` | Team/Agent in base plus runtime in developer | Preserves approved relative order |
| Claude | `query({ prompt: userText, options: { systemPrompt: carpenterPrompt } })` | XML instructions prepended to every `prompt` | Keeps authority and user content distinct |
| Automatic team tools | agent config `['run_bash']` + team context resolves provider request `['run_bash', 'send_message_to', 'delegate_task']`; Team Runtime renders fixed collaboration protocol | require each agent config or inspect MCP descriptor before composing | Team membership guarantees basic collaboration independently of prompt transport |
| Authored heading | `##` body heading shifts to `####` under responsibilities | raw `##` escapes beside carpenter sections | Maintains structural ownership |
| Historical config | unknown `systemPromptProcessorNames` ignored, new writes omit | compatibility execution branch | No stale prompt mutation path |
| Native terminal Skills | a configured skill description containing `{{skill_token}}` reaches terminal Skills, then `SystemPromptProcessingStep` rejects the complete string and never configures the LLM | trust only the composer assertion that ran before Skills | The actual final native payload owns `AC-014` |
| Existing Codex cleanup | keep current `startThread`/factory/session cleanup behavior unchanged | move MCP creation earlier or add a second client/session release owner | Carpenter prompt no longer creates the resource-lifecycle problem |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean Cut |
| --- | --- | --- | --- |
| Keep old composers as wrappers | Lower edit count | Rejected | Delete and call shared composer directly |
| Preserve description fallback | Existing blank-body behavior | Rejected | Optional responsibilities; description appears once |
| Keep Claude XML alongside systemPrompt | Easier rollout | Rejected | System prompt only; user prompt stays user content |
| Keep optional prompt processor field but reject at runtime | Persisted source compatibility | Rejected | Remove domain/API/UI semantics; reader ignores historical key |
| Add system/operating skill kind | Model fundamentals as skills | Rejected | Direct fixed Bash/file sections + one ordinary skill model |
| Recreate Available Tools text | Explain capabilities | Rejected | Provider-native schemas remain authoritative |
| Runtime flag for old/new prompt | Staged rollout | Rejected | No dual path |

## Derived Layering (If Useful)

`Definition/team/workspace/tool facts -> semantic composer/team renderer -> provider adapter -> provider instruction channel`, with skills and tool schemas as parallel provider-owned projections.

## Change / Refactor Sequence

1. Add pure heading-containment and exact section renderers with shared composer tests covering the approved binding matrix and Classroom shapes.
2. Replace generic member instruction composition with exact-name `TeamRuntimeInstructionRenderer`; correct team-definition failure handling and roster rendering.
3. Tighten skill loader/materializer validation; rename the native heading to `## Skills`; preserve the terminal processor and update core unit/integration coverage. This validation is a catalog defense, not the final native payload invariant.
4. Rename/refactor the shared configured-only exposure file/type/fields into `runtime-agent-tool-exposure.ts` / `RuntimeAgentToolExposure` / runtime-request terminology. Add the exact two-name automatic team union, taking optional `MemberTeamContext`, and update every native, Codex, and Claude caller/import atomically. Add standalone/team/duplicate-name tests and provider-boundary assertions. Do not retain aliases or compatibility wrappers, and do not change MCP creation, context, cleanup, or client reference counting.
5. Reorder native factory resolution so workspace precedes composition; switch to the shared context-only composer; delete native composer/fallback. In `SystemPromptProcessingStep`, validate the complete post-pipeline string before state/LLM mutation. Add focused coverage in which valid configured skill metadata contains placeholder-shaped text; assert bootstrap failure, `AgentErrorEvent`, and no LLM system-prompt configuration/provider call.
6. Refactor Codex bootstrap to set the complete context-only composed prompt as `baseInstructions` and remove instruction strategies. Continue using the shared exposure result for the existing MCP transport; do not move session creation or modify context/cleanup/factory/manager resource behavior.
7. Refactor Claude bootstrap/session to store the context-only composed system prompt, add SDK `systemPrompt` transport, pass raw user content as `prompt`, and delete XML/strategy paths. Continue using shared exposure for existing MCP transport; leave session cleanup unchanged.
8. Remove `systemPromptProcessorNames` from server domain/config/service, agent-management tools, GraphQL types/converters/options, web form/detail/store/query/generated types, built-in configs, and native registry injection. Retain only platform-owned mandatory Skills processing.
9. Update durable documentation to explain foundation versus ordinary skills, automatic team tools, and provider projections.
10. Run targeted unit/integration suites and full type/build checks; search for removed headings/files/fields, descriptor-to-prompt coupling, and unresolved placeholders.

No intermediate state should be committed with both old and new composition active.

## Key Tradeoffs

- A shared Markdown prompt gives exact cross-runtime semantics and testability at the cost of deliberately not exploiting separate provider instruction channels for individual sections. This is necessary to preserve the approved relative order.
- Claude receives a custom system prompt rather than the Claude Code preset. AutoByteus therefore owns its agent behavior explicitly; tools/settings remain separately configured.
- Historical config keys are left physically untouched but semantically dead. This avoids a destructive content migration while still removing runtime compatibility behavior.
- Authored source content is preserved even when redundant. The platform fixes structural ownership now; editorial normalization remains with source-package owners.

## Risks

- A provider adapter could accidentally re-add local automatic-tool policy or couple prompt rendering back to an MCP descriptor. The shared exposure tests and context-only composer signature prevent both.
- Claude resume semantics must receive the same system prompt on every SDK `query` invocation; unit-test query options for create and resume.
- Heading normalization must ignore fenced code blocks and preserve non-heading Markdown; focused unit coverage is mandatory.
- Removing the GraphQL field requires regenerated web types and coordinated UI/store tests.
- Invalid skill metadata suppression must not leave a materialized/catalog entry or an empty Skills heading.
- External agents that still configure the old shell-first package may see redundant advice until the external follow-up.

## Guidance For Implementation

- Copy exact fixed text from the approved prompt supplements; do not paraphrase it in source.
- Keep the composer pure and deterministic. Its unresolved-placeholder assertion covers the carpenter portion; do not describe that pre-Skills string as the final native payload.
- Normalize scalar line breaks to spaces and trim once. Apply heading containment only to authored bodies, fence-aware.
- Resolve and validate an absolute workspace that is exactly the provider/tool default directory; do not derive it from a skill path or stale metadata.
- Pass no tool names or descriptor into prompt composition. Team Runtime comes from validated `MemberTeamContext` only.
- Resolve automatic team tools once in `runtime-agent-tool-exposure.ts`; pass its result through existing native/Codex/Claude provider-tool paths. Use runtime-request names rather than leaving automatic defaults mislabeled as configured values.
- Store one `carpenterSystemPrompt` in Claude runtime context; remove duplicate agent/team instruction representations.
- Keep `AvailableSkillsProcessor` mandatory and terminal. The heading is exactly `## Skills`; Codex/Claude do not receive a duplicate Markdown catalog.
- In native bootstrap, assert the no-`{{...}}` invariant in `SystemPromptProcessingStep` after the complete pipeline and before assigning `processedSystemPrompt` or calling `configureSystemPrompt`; preserve the existing critical-error event behavior.
- Do not change Codex/Claude MCP creation, session identity, cleanup, or reference-counted client ownership for this prompt feature.
- Update at minimum the shared runtime exposure resolver and all imports, native resolver/factory/`SystemPromptProcessingStep`, Codex bootstrapper, Claude tooling/bootstrap/session/SDK client, team context/roster, skill loader/processor, agent-definition API/UI tests, plus new shared composer/containment tests. The downstream API/E2E specialist remains responsible for final coverage validity decisions and broader execution.

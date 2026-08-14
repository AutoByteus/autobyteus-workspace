# Design Spec

## Current-State Read

Server-managed native AutoByteus runs are selected by AgentRunManager and built by AutoByteusAgentRunBackendFactory. The factory loads the current AgentDefinition, calls the shared runtime-neutral exposure resolver, resolves native tool instances through resolveAutoByteusAgentTools, and passes those instances into AgentConfig before AgentFactory.createAgentWithId or restoreAgent. The current shared resolver trims/deduplicates configured names and adds send_message_to plus delegate_task when a MemberTeamContext is present. It is also used by Claude Agent SDK and Codex App Server bootstrap paths, so it cannot silently acquire native-only defaults.

The native tool registry already registers run_bash, read_file, edit_file, and write_file through registerTools() during AgentFactory initialization. The current implementation's native wrapper defaults are the previously approved three names (`run_bash`, `read_file`, and `edit_file`); this revision adds the already-registered `write_file` name to that tuple. The registry-readiness contract is the concrete current behavior supporting AC-006; the design reuses it without changing registration or schemas. Mixed native team filtering removes legacy task-management names but does not remove file/system tools. Create and restore both converge on the same native factory buildAgentConfig path, so one native exposure composition change covers standalone, team-member, and task-agent native runs.

The fixed Carpenter prompt is owned by `carpenter-prompt-sections.ts` and is composed for native, Claude, and Codex backends. Its current Bash section calls Bash primary for file reading/writing/editing, while its file/directory section recommends shell readers such as `cat`, `sed`, and `nl`; that overlaps with the exposed `read_file` tool. The tool schemas already own detailed range, line-number, patch, path, and validation semantics. The approved prompt supplement gives Bash primary ownership of navigation/search/repository/project work, gives exposed file tools primary ownership of file content, keeps edit recovery explicit, remains availability-aware for external runtimes, and preserves Bash as a fallback when file tools cannot complete the operation.

Constraints:

- Keep AgentDefinition.toolNames as persisted user configuration; do not write runtime defaults back.
- Keep the runtime-neutral exposure helper's current external-runtime contract unchanged.
- Preserve automatic team communication/delegation behavior.
- Reuse existing native registry/tool contracts and authorization/approval behavior.
- Make the native-only policy explicit rather than relying on MemberTeamContext presence.
- Keep system-prompt file-operation guidance procedural and availability-aware; it must not become a second tool-exposure or safety-policy owner.

Evidence: investigation-notes.md, BE-001 through BE-005.

## Intended Change

Introduce a native-backend-owned exposure composition boundary containing the mandatory native baseline:

    Native AgentDefinition.toolNames
      + AUTOBYTEUS_DEFAULT_TOOL_NAMES
      + existing automatic team names when MemberTeamContext exists
      -> runtime-neutral normalization/deduplication
      -> native tool resolver
      -> AgentConfig.tools

AUTOBYTEUS_DEFAULT_TOOL_NAMES is exactly run_bash, read_file, edit_file, and write_file. The native wrapper is called by the AutoByteus backend factory for both create and restore. Claude/Codex continue calling the runtime-neutral resolver directly and therefore do not receive the native baseline unless their definitions explicitly request those names under their existing provider projections.

No underlying tool implementation, registry registration, persisted model, migration, runtime event, approval, path-authorization, or external-provider protocol change is required; only the native exposure tuple and its corresponding coverage need to expand.

Add the reviewed fixed prompt guidance as a separate concern around the run-start/bootstrap spine:

    Backend bootstrap -> composeCarpenterPrompt -> fixed file-operation guidance
      -> provider/native system instructions

The prompt contract gives Bash primary ownership of navigation/search/repository/project commands and verification, while preferring exposed file tools for file content. It prefers `read_file` for reading, `edit_file` for targeted edits, and `write_file` for deliberate whole-file work when exposed. After an edit context failure, it requires rereading and reconstructing the change. If a relevant file tool is unavailable or cannot complete the operation after appropriate recovery, it permits `run_bash` fallback when exposed and appropriate. Detailed range and formatting behavior remains in the tool schemas.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BE-001 | System | REQ-001, REQ-003; AC-001, AC-003, AC-006, AC-007 | Standalone server run starts with runtimeKind=autobyteus; definition may omit toolNames. | AgentRunManager -> AutoByteusAgentRunBackendFactory -> native wrapper -> native resolver; the current wrapper adds the prior three defaults and omits `write_file`. See investigation BE-001. | Extend the native wrapper to add four defaults without mutating the definition; deduplicate and materialize registry-backed tools. | DS-001, DS-003 |
| BE-002 | System | REQ-002, REQ-003, REQ-005; AC-002, AC-003, AC-004, AC-007 | Mixed team member/task-agent launches with runtimeKind=autobyteus and valid MemberTeamContext. | Team member handle creates/restores through AgentRunManager; current native wrapper adds the prior three defaults, shared helper adds team pair, and mixed filtering removes only legacy task-plan names. See investigation BE-002. | Extend the native wrapper to add four defaults to all native team runs; preserve additive team tools and legacy filtering. | DS-002, DS-003 |
| BE-003 | Contract | REQ-004, REQ-005; AC-005 | Claude/Codex backend bootstrap/restore executes with an external runtime kind. | Claude/Codex call the shared resolver directly; manager restore also builds external contexts with it. See investigation BE-003. | Do not call native wrapper from external paths; preserve current explicit/team exposure. | DS-005 |
| BE-004 | System | REQ-005; AC-006 | Native factory creates an agent after AgentFactory initializes the registry. | AgentFactory calls registerTools; registry contains the four canonical definitions. See investigation BE-004. | Reuse current definitions and contracts; no registration/schema change. | DS-003 |
| BE-005 | Contract | REQ-006; AC-008, AC-009 | A native, Claude, or Codex run composes its fixed Carpenter prompt. | The Bash and file sections overlap on file operations; tool schemas already contain detailed file semantics and the edit-tool description contains precise fresh-context/recovery guidance. See investigation BE-005. | Give Bash primary ownership of command/search/project work with practical targeted-discovery examples, and exposed file tools primary ownership of file content; explicitly require recent relevant `read_file` content before regional `edit_file` changes, rereading after context failure, and appropriate `write_file` selection without duplicating unrelated schema details or changing tool exposure/safety contracts. | DS-006 |
| BE-006 | Contract | REQ-007; AC-010 | The implementation must be protected by proportional unit, integration, and API/E2E evidence. | Existing downstream artifacts cover the prior three-tool implementation and require new source/coverage review for the requested `write_file` default. | Update policy, materialization, create/restore, external-isolation, approval/path, and representative standalone/team coverage for the four-tool baseline without changing external defaults. | DS-001, DS-002, DS-003, DS-004, DS-005 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| runtime-tool-exposure-matrix.md | Effective exposure matrix by runtime kind/run shape and coverage intent | REQ-001 through REQ-005, REQ-007; AC-001 through AC-007, AC-010 | Design implements the four-tool native-only baseline and preserves external rows. | Approved intended-behavior supplement; keep aligned |
| system-prompt-file-operations-contract.md | Fixed system-prompt contract for file-tool choice, fresh context, recovery, verification, and Bash fallback | REQ-006; AC-008, AC-009 | Design fixes the prompt procedure without moving tool policy into the prompt; native `write_file` availability comes from the four-tool exposure baseline while external wording remains availability-aware | Approved intended-behavior supplement; architecture review remains the gate |

## Task Design Health Assessment (Mandatory)

- Change posture: Behavior Change
- Current design issue found: Yes
- Root cause classification: Missing Invariant
- Refactor needed now: No — a small native policy boundary is added, but the existing factory, resolver, registry, and lifecycle remain healthy and are reused.
- Evidence: The native path is centralized and create/restore symmetric. The requested `write_file` behavior is absent because the current native wrapper stops at the prior three-name tuple. The shared helper is consumed by external runtimes, making a global default unsafe.
- Design response: Add a dedicated native exposure wrapper. It composes the baseline, delegates trimming/deduplication and team-pair logic to the existing shared builder, and feeds the existing native resolver.
- Refactor rationale: Do not turn the shared helper into a runtime-kind switch or change registry/tool classes. A native-specific wrapper keeps policy ownership explicit and limits fanout.
- Intentional deferrals and residual risk: Direct low-level autobyteus-ts AgentFactory callers that do not pass through server RuntimeKind.AUTOBYTEUS are outside this server runtime contract; they have no runtime-kind boundary and are not changed.

## Terminology

- Native AutoByteus run: server-managed AgentRunConfig with runtimeKind=RuntimeKind.AUTOBYTEUS, built by AutoByteusAgentRunBackendFactory.
- Foundation tools: mandatory native baseline run_bash, read_file, edit_file, and write_file.
- Effective exposure: runtime-derived normalized tool-name set used for instance creation or provider projection; it is not persisted.

## Legacy Removal Policy (Mandatory)

- Policy: No backward compatibility; remove legacy code paths.
- Obsolete paths in scope: None. This is an additive default invariant; no legacy tool implementation is replaced.
- Native omission of `write_file` when `toolNames` omits it is no longer valid effective native behavior. Do not retain a native opt-out or fallback for the four-tool baseline.
- Persisted configuration remains unchanged because it is the source of optional-tool intent, not a legacy path.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: AgentDefinition.toolNames, stored in agent-definition/package configuration as a string array.
- Relevant code-model, serialization, semantic, or physical-store change: None; effective baseline is computed at native bootstrap only.
- Normal reader/writer behavior and representative evidence: AgentDefinition defaults missing names to []; the native wrapper creates a new effective iterable and never assigns to the definition.
- Required semantics and invariants under direct use: Preserve configured names; add each native baseline name exactly once.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: No storage rewrite, migration, downtime, or data-loss risk.
- Decision: Directly Usable — No Migration.
- Decision rationale: Existing definitions are directly readable. Persisting defaults would conflate runtime policy with user configuration and create unnecessary writes; runtime derivation supplies the behavior with no migration cost.
- Acceptance criteria supported: REQ-003, REQ-005, AC-007.
- Migration plan: N/A — no persisted-data migration is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BE-001, BE-004 | Server run-start request | AgentConfig.tools is delivered to the native runtime | AgentRunManager for selection; native factory for config | Shows the full native standalone lifecycle. |
| DS-002 | Primary End-to-End | BE-002, BE-004 | Team member/task-agent launch | Native member runtime receives foundation and existing team tools | MixedAgentMemberHandle for member lifecycle; native factory for config | Proves team and task-agent coverage. |
| DS-003 | Bounded Local | BE-001, BE-002, BE-004 | Definition plus optional team context | Native BaseTool[] in AgentConfig | AutoByteusAgentRunBackendFactory | Shows composition, filtering, and registry materialization. |
| DS-004 | Return-Event | BE-001, BE-002 | Native tool invocation/approval | Existing canonical event/history path | Existing native runtime/event owners | Makes preserved native event behavior explicit; no event change. |
| DS-005 | Primary End-to-End | BE-003 | External-runtime start/restore | External runtime receives its current provider/MCP tool projection | AgentRunManager for selection; Claude/Codex bootstrap for external exposure | Makes non-regression and forbidden native-wrapper dependency independently reviewable. |
| DS-006 | Bounded Local / Support | BE-005 | Runtime backend bootstrap and prompt composition | Provider/native system instructions contain availability-aware file-operation guidance | `composeCarpenterPrompt` and fixed prompt sections | Makes the requested procedure independently reviewable without changing exposure or execution. |

## Primary Execution Spine(s)

- DS-001: Run Start Request -> AgentRunManager -> AutoByteusAgentRunBackendFactory -> Native Runtime Tool Exposure -> Native Tool Resolver / Registry -> AgentConfig / AgentFactory -> Native Agent Runtime
- DS-002: Team Member Launch -> MixedAgentMemberHandle -> AgentRunManager -> AutoByteusAgentRunBackendFactory -> Native Runtime Tool Exposure -> Native Tool Resolver / Registry -> Team Member Native Runtime
- DS-005: Run Start/Restore Request -> AgentRunManager -> Claude/Codex Backend Bootstrap -> Runtime-Neutral Exposure Resolver -> Existing Provider/MCP Projection -> External Runtime Tool Surface
- DS-006: Runtime Backend Bootstrap -> `composeCarpenterPrompt` -> `BASH_OPERATING_PRACTICE_SECTION` + `FILE_AND_DIRECTORY_PRACTICE_SECTION` -> Provider/Native System Instructions

External path, intentionally unchanged:

Run Start/Restore Request -> AgentRunManager -> Claude/Codex Backend Bootstrap -> Runtime-Neutral Exposure Resolver -> Existing Provider/MCP Projection -> External Runtime Tool Surface

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A standalone request selects the native backend. The factory loads the definition/workspace, applies the baseline through the wrapper, resolves names through the registry, builds AgentConfig, and starts the explicit run id. | AgentRunManager, AutoByteusAgentRunBackendFactory, native exposure wrapper, native resolver, AgentFactory | Native factory for config; AgentFactory for lifecycle | Definition persistence, workspace/LLM/skills, compaction, and memory |
| DS-002 | A mixed member/task-agent is prepared with MemberTeamContext. The manager selects its runtime; the native factory adds foundation tools, the shared helper adds team pair tools, mixed filtering removes legacy task-plan names, and the resolver creates instances. | MixedAgentMemberHandle, AgentRunManager, native factory, native resolver | Member handle for lifecycle; native factory for policy | Roster/delivery bindings, task identity, prompts, token scope |
| DS-003 | The wrapper forms a fresh iterable from defaults/configured names, delegates normalization/team composition to the shared builder, then the native resolver creates registry-backed instances and skips stale optional names as today. | Native exposure wrapper, shared builder, native resolver, registry | Native wrapper for baseline; resolver for materialization | Logging, server-owned communication/delegation adapters |
| DS-004 | Invocation, approval, event conversion, run history, and memory recording continue through existing paths because only AgentConfig.tools input changes. | Existing native runtime/event pipeline | Existing runtime/event owners | No event/history code changes |
| DS-005 | An external run or restore selects Claude/Codex, resolves configured/team names only through the runtime-neutral helper, and projects them through the existing provider/MCP surface. The native wrapper is not imported or called. | AgentRunManager, Claude/Codex backend bootstrap, RuntimeAgentToolExposure, provider/MCP projection | External runtime backend owners | Native wrapper is a forbidden dependency; provider transport and session/MCP details remain off-spine |
| DS-006 | The backend composes the fixed prompt sections. Bash guidance owns navigation/search/repository/project work and verification, including a few practical targeted-discovery examples; file guidance owns exposed file-content tools, requires recent relevant `read_file` content before regional `edit_file` changes unless unchanged recent context exists, requires rereading after context failure, and covers selection, verification, and fallback. Detailed tool semantics remain in the schemas. | Backend bootstrap, `composeCarpenterPrompt`, `BASH_OPERATING_PRACTICE_SECTION`, `FILE_AND_DIRECTORY_PRACTICE_SECTION`, provider/native system instructions | Prompt section owner for wording; composer for assembly | Prompt must not inspect/modify tool exposure, bypass approval/path rules, or require unavailable tools |

## Spine Actors / Main-Line Nodes

AgentRunManager; MixedAgentMemberHandle for team paths; AutoByteusAgentRunBackendFactory; native exposure wrapper; Claude/Codex backend bootstrap; `composeCarpenterPrompt`; `BASH_OPERATING_PRACTICE_SECTION`; `FILE_AND_DIRECTORY_PRACTICE_SECTION`; buildRuntimeAgentToolExposure; resolveAutoByteusAgentTools; provider/MCP projection; defaultToolRegistry/AgentFactory.

## Ownership Map

| Main-line node | Ownership |
| --- | --- |
| AgentRunManager | Runtime selection, active-run lifecycle, create/restore orchestration; not tool-name policy |
| MixedAgentMemberHandle | Team member lazy create/restore and MemberTeamContext supply; not native defaults |
| AutoByteusAgentRunBackendFactory | Native AgentConfig assembly and create/restore symmetry |
| AutoByteusRuntimeToolExposure | Exact four-name native baseline without persisted-definition mutation |
| buildRuntimeAgentToolExposure | Runtime-neutral normalization, deduplication, derived flags, and current team automatic names |
| resolveAutoByteusAgentTools | Native materialization, server-owned factories, registry lookup, warning/skip, actual names |
| defaultToolRegistry / AgentFactory | Native definitions, instance creation, agent lifecycle/runtime execution |
| Claude/Codex backend bootstrap | External runtime exposure assembly and provider/MCP session/thread bootstrap; it must use the neutral helper directly and never the native wrapper. |
| Provider/MCP projection | External wire/tool-surface projection for the selected runtime; it does not own native defaults. |
| `composeCarpenterPrompt` / fixed Bash and file-operation sections | Assemble and state the availability-aware procedure; they do not decide which tools are exposed or bypass tool-level safety. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| AutoByteusRuntimeToolExposure | Native backend factory for config; shared builder for neutral mechanics | Thin native policy boundary reused by create/restore/tests | Execution, registry mutation, persistence, external policy, team delivery |
| AgentRunManager | Runtime-specific backend factories | Run lifecycle boundary | Native tool policy or direct registry access |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Native omission of foundation tools when definition omits them | Conflicts with new invariant | autobyteus-runtime-tool-exposure.ts | In This Change | No compatibility flag/fallback |
| Existing tool classes, registry entries, team tools | Still authoritative and needed | Existing owners | N/A | No removal warranted |

## Return Or Event Spine(s) (If Applicable)

DS-004: Native tool instance -> existing runtime invocation/approval -> existing event converter -> run history/memory/streaming projections. No return/event contract changes; canonical foundation names remain run_bash, read_file, edit_file, and write_file.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: AutoByteusAgentRunBackendFactory.
- Chain: AgentDefinition.toolNames + native defaults + MemberTeamContext -> buildRuntimeAgentToolExposure -> resolveAutoByteusStandaloneToolNames -> resolveAutoByteusAgentTools -> AgentConfig.tools.
- Importance: Proves defaults are added before mixed filtering and registry resolution, while stale optional names remain independently skippable.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| AgentDefinitionService/persistence | DS-001, DS-002 | Native factory | Supplies configured optional names | Separates persistence from runtime defaults | Could mutate user config |
| Workspace resolution | DS-001, DS-002 | Native factory | Supplies workspace root | Existing prerequisite | Couples tool policy to provisioning |
| AgentFactory registry startup | DS-003 | Native resolver | Registers existing definitions | Existing availability contract | Confuses policy with implementation |
| MemberTeamContext delivery/roster | DS-002, DS-003 | Shared builder/adapters | Enables team tools/routes | Separate team lifecycle | Makes native defaults incorrectly team-conditional |
| Mixed legacy task filtering | DS-002, DS-003 | Native resolver | Removes obsolete task-management names | Preserves team task contract | Could miss standalone defaults |
| Approval/path authorization | DS-004 | Existing tool/runtime owners | Governs execution safety | Existing safety contract | Duplicates/bypasses tool owners |
| External provider/MCP projection | DS-005 | Claude/Codex owners | Provider exposure | External behavior boundary | Native defaults could leak |
| Fixed Carpenter prompt sections | DS-006 | Prompt composer/section owner | Command/file-operation procedure | Cross-runtime guidance boundary | Prompt could require unavailable tools or duplicate safety policy |
| Durable prompt documentation | DS-006 | Prompt documentation / delivery docs owner | Keeps `prompt_engineering.md` aligned with fixed source sections | Prevents stale platform contract | Documentation can drift from source prompt |
| Tool schema documentation | DS-006 | AutoByteus tool-contract documentation owner | Verification-only alignment with schema authority | Avoids needless duplication | Prompt policy can leak into schema docs |

## Ownership Boundaries

AgentRunManager is authoritative for backend selection/lifecycle. AutoByteusAgentRunBackendFactory is authoritative for native AgentConfig construction; callers must not append defaults or create native tools separately. AutoByteusRuntimeToolExposure is authoritative for the native baseline but is not an execution boundary. buildRuntimeAgentToolExposure remains authoritative for neutral normalization/team names. resolveAutoByteusAgentTools is authoritative for native materialization. AgentFactory is authoritative for registry initialization and native lifecycle. Claude/Codex backend bootstrap is authoritative for external runtime exposure assembly and must call the neutral helper directly; the provider/MCP projection is authoritative for the external wire surface. `composeCarpenterPrompt` and the fixed prompt sections are authoritative only for fixed procedural guidance; they must not decide exposure or bypass tool safety. `autobyteus-server-ts/docs/modules/prompt_engineering.md` is the durable documentation owner for the fixed prompt excerpts and must be updated with the source sections. `autobyteus-ts/docs/tool_schema_and_configuration.md` remains verification-only and continues to own detailed schema semantics. External callers must not import or call AutoByteusRuntimeToolExposure.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| AutoByteusAgentRunBackendFactory.buildAgentConfig | Native wrapper, resolver, workspace/LLM/skills | AgentRunManager and native create/restore | Caller appends defaults and separately calls registry | Strengthen factory/helper input contract |
| AutoByteusRuntimeToolExposure | Baseline union and shared builder call | Native factory/tests | Claude/Codex calls native wrapper | Keep wrapper native-only |
| buildRuntimeAgentToolExposure | Trim/dedup/team pair/flags | Native wrapper, Claude/Codex, MCP | Reimplemented normalization/team logic | Extend only neutral mechanics |
| resolveAutoByteusAgentTools | Registry/server-owned factories/stale logging | Native factory | Upstream direct registry calls | Add resolver API only for a concrete family contract |
| Claude/Codex backend bootstrap | Runtime-neutral exposure helper and provider/MCP session/thread materialization | AgentRunManager and external backend factories | Importing or calling the native exposure wrapper | Keep external runtime assembly in the existing bootstrap owner and keep the native wrapper module-specific |
| `BASH_OPERATING_PRACTICE_SECTION` / `FILE_AND_DIRECTORY_PRACTICE_SECTION` | Fixed command/file-operation procedure and fallback wording | `composeCarpenterPrompt` | Runtime-kind switches, registry inspection, or mandatory claims about unavailable tools | Keep Bash focused on commands/search/project work and file guidance focused on exposed file tools; align detailed semantics with tool contracts |

## Dependency Rules

- AgentRunManager may call runtime-specific factories; it does not depend on native tool internals.
- AutoByteusAgentRunBackendFactory may call the native wrapper, shared builder through it, and native resolver.
- On DS-005, Claude/Codex bootstrap may call the runtime-neutral helper and provider/MCP materializer, but must not import or depend on the native wrapper.
- Native resolver may depend on the default registry and existing server-owned factories.
- Agent definition persistence may be read by exposure, but no runtime module writes it.
- Team code may provide MemberTeamContext, but may not decide whether native foundation tools exist.
- No upstream caller may bypass the native factory to add only some defaults or mutate AgentDefinition.toolNames.
- Prompt composition may describe exposed tool procedures but must not decide tool exposure, inspect the registry, bypass approval/path authorization, or make `write_file` mandatory where it is not exposed.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| resolveAutoByteusRuntimeToolExposure(agentDefinition, memberTeamContext) | Native exposure policy | Return effective native exposure with baseline/team names | Agent-definition-like toolNames; optional MemberTeamContext | New native-only internal function; no input mutation |
| buildRuntimeAgentToolExposure(toolNames, memberTeamContext) | Neutral exposure | Normalize/deduplicate and derive current flags | Iterable tool names; optional team context | Existing API unchanged |
| resolveAutoByteusAgentTools(input) | Native materialization | Create native instances and return actual names | Existing definition/exposure/run/team input | Existing API unchanged |
| AutoByteusAgentRunBackendFactory.buildAgentConfig(options, runId) | Native config | Build AgentConfig for create/restore | Existing AgentRunConfig and explicit run id | Existing internal boundary |
| `composeCarpenterPrompt(input)` | Prompt assembly | Include fixed platform guidance after identity/team/runtime sections | Agent definition, workspace, optional team context | Existing API; prompt text must remain availability-aware |
| `BASH_OPERATING_PRACTICE_SECTION` / `FILE_AND_DIRECTORY_PRACTICE_SECTION` | Fixed prompt contract | State command/search/project and read/edit/write selection, recovery, verification, and Bash fallback preferences | No runtime tool list input | Static guidance only; tool descriptions remain authoritative |

## Interface Boundary Check

| Interface | Singular Responsibility? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| resolveAutoByteusRuntimeToolExposure | Yes | Yes | Low | Runtime-specific name/module |
| buildRuntimeAgentToolExposure | Yes | Yes | Low | Preserve neutral API |
| resolveAutoByteusAgentTools | Yes | Yes | Low | Reuse existing identity inputs |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural/Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Native default policy | AutoByteusRuntimeToolExposure | Yes | Low | Avoid generic Helper/DefaultTools |
| Foundation names | AUTOBYTEUS_DEFAULT_TOOL_NAMES | Yes | Low | Canonical names only |
| Neutral exposure | RuntimeAgentToolExposure | Yes | Low | Preserve current name |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Normalization/team pair | Shared runtime exposure | Reuse | Already authoritative | N/A |
| Native baseline | AutoByteus execution backend | Create New file | Native-only policy must not leak; mixed-only file is too narrow | No current all-native policy owner |
| Materialization | Native resolver/registry | Reuse | Existing owner | N/A |
| Tool implementations | autobyteus-ts registry | Reuse | Requested tools already exist | N/A |
| Persistence/migration | Agent definitions | Reuse/no change | Defaults are runtime-only | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared exposure | Normalization, dedup, team names, flags | DS-003, BE-003 | Shared builder | Reuse | Remains neutral |
| AutoByteus backend | Native baseline and native materialization | DS-001, DS-002, DS-003 | Native factory/resolver | Extend | One focused policy file/call |
| Native tools | Definitions/schemas/execution/registration | DS-003, DS-004 | AgentFactory/registry | Reuse | No change |
| Team execution | Context and member lifecycle | DS-002 | Mixed handle/manager | Reuse | No change |
| Agent definition persistence | Optional configured names | DS-001, DS-002 | Definition service | Reuse | No change |
| Runtime documentation | Exposure contract and durable prompt contract | All | Delivery docs owner | Extend | Update `docs/modules/agent_tools.md` for runtime exposure and `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/docs/modules/prompt_engineering.md` for the fixed prompt sections; verify the tool-schema document without duplicating schema details |
| External runtime providers | Claude/Codex bootstrap, neutral exposure use, provider/MCP projection | DS-005 | External backend owners | Reuse | No native default policy is added here; existing explicit/team rules remain. |

## Draft File Responsibility Mapping

| Candidate File | Owner | Concrete Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- |
| src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.ts | Native backend | Default tuple and wrapper | One native policy | Existing shared exposure type/builder |
| autobyteus-agent-run-backend-factory.ts | Native backend | Call wrapper from existing build path | Existing config owner | Wrapper/resolver |
| native exposure test | Native backend tests | Empty/partial/full/team/dedup/immutability | One policy contract | Shared helper/team fixture |
| native factory test | Native backend tests | Actual registry instance materialization | Existing factory harness | Native registry |
| shared exposure test | Shared tests | Neutral external contract | Existing neutral suite | Shared helper |
| docs/modules/agent_tools.md | Docs | Runtime exposure contract | Existing doc | N/A |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/docs/modules/prompt_engineering.md | Prompt documentation owner / delivery docs owner | Replace the obsolete fixed Bash/file excerpts with the approved `BASH_OPERATING_PRACTICE_SECTION` and `FILE_AND_DIRECTORY_PRACTICE_SECTION` wording | Existing durable prompt source must remain aligned with `carpenter-prompt-sections.ts` | Required edit |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-ts/docs/tool_schema_and_configuration.md | AutoByteus tool-contract documentation owner | Verify existing file-tool schema and edit-file guidance remains authoritative and aligned; do not duplicate the system-prompt workflow | Schema documentation already owns detailed tool semantics | Verification-only; no edit required unless implementation exposes drift |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Normalized exposure/derived flags | Existing runtime-agent-tool-exposure.ts | Shared exposure | Already shared across runtimes | Yes | Yes | Runtime-kind switch with hidden defaults |
| Native mandatory tuple | autobyteus-runtime-tool-exposure.ts | Native backend | Native-only invariant | Yes, exactly four names | Yes, one tuple | General registry or persisted field |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| RuntimeAgentToolExposure | Yes | Yes | Low | Keep existing fields |
| AUTOBYTEUS_DEFAULT_TOOL_NAMES | Yes | Yes | Low | One tuple |
| AgentDefinition.toolNames | Yes | Yes | Low | Keep configured vs effective names separate |
| File-operation prompt guidance | Yes | Yes | Low | Keep one fixed section; do not duplicate provider-specific workflow rules |

## Final File Responsibility Mapping

| File | Owner | Concrete Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- |
| autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.ts | Native backend | Export default tuple and native wrapper | Isolates native policy | RuntimeAgentToolExposure/buildRuntimeAgentToolExposure |
| autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts | Native backend | Use wrapper in shared create/restore build path | One call covers both | Native wrapper/resolver |
| autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-runtime-tool-exposure.test.ts | Native tests | Policy/immutability tests | Mirrors one policy file | Shared builder/team fixture |
| autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts | Native tests | Actual instance names and team composition | Existing harness | Native registry |
| autobyteus-server-ts/tests/unit/agent-execution/shared/runtime-agent-tool-exposure.test.ts | Shared tests | No native leak | Protects external callers | Existing helper |
| autobyteus-server-ts/tests/integration/agent-execution/autobyteus-agent-run-backend-factory.integration.test.ts | Native integration tests | Create/restore registry materialization, definition immutability, approval/path preservation | Existing integration harness | Native runtime only |
| autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.integration.test.ts | Lifecycle integration tests | Standalone/team create/restore route through the native four-tool boundary | Existing manager harness | External provider policy |
| autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts | Native API/E2E tests | Representative standalone four-tool exposure and approved file-tool execution | Existing GraphQL/websocket journey | Broad auto-approval |
| autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts | Native team API/E2E tests | Representative team four-tool exposure, approval, file side effect, and restore behavior | Existing GraphQL/websocket journey | Broad auto-approval |
| autobyteus-server-ts/docs/modules/agent_tools.md | Docs | Native default and external distinction | Existing durable source | N/A |
| autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts | Prompt subsystem | Fixed availability-aware file-operation contract | Existing prompt owner | No registry/exposure/safety policy |
| autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts | Prompt subsystem | Preserve fixed-section assembly for all backends | Existing composer | No runtime-specific file-tool policy |
| autobyteus-server-ts/tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts | Prompt tests | Assert selection, recovery, fallback, and verification wording | Existing prompt test seam | No provider E2E behavior |
| system-prompt-file-operations-contract.md | Solution supplement | Approved contract and exact proposed text | Task artifact folder | Not a runtime source file |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/docs/modules/prompt_engineering.md | Prompt documentation / delivery docs | Update the durable fixed-prompt excerpt to match the approved source sections | Existing durable contract path | Required edit; no independent prompt policy |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-ts/docs/tool_schema_and_configuration.md | Tool-contract documentation | Verify schema-led file-tool guidance remains aligned | Existing schema authority | Verification-only; no edit unless drift is found |

## Applied Patterns (If Any)

- Thin runtime-specific policy wrapper: native wrapper owns only the invariant and delegates common mechanics.
- Effective runtime composition: defaults are derived at run construction, not persisted.
- Single native factory boundary: create and restore share buildAgentConfig.
- Prompt contract as fixed, availability-aware procedure: guidance reinforces tool descriptions while preserving a Bash fallback.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| autobyteus-server-ts/src/agent-execution/backends/autobyteus | Module | Native backend | Native config/exposure/materialization | Existing native owner | External policy, persistence, generic tools |
| autobyteus-runtime-tool-exposure.ts | File | Native exposure | Exact baseline and wrapper | Explicit runtime ownership | Execution, registry mutation, persistence |
| autobyteus-agent-run-backend-factory.ts | File | Native factory | Calls wrapper and builds AgentConfig | Existing entrypoint | Provider policy/direct registry |
| tests/unit/.../backends/autobyteus | Module | Native tests | Policy/materialization coverage | Mirrors ownership | API/E2E or provider implementation |
| tests/integration/agent-execution | Module | Native/lifecycle integration tests | Create/restore and manager boundary coverage | Existing integration location | Provider-specific unit policy |
| tests/e2e/runtime | Module | Native API/E2E | Representative standalone/team approval and file behavior | Existing runtime E2E location | Broad auto-approval |
| docs/modules/agent_tools.md | File | Tool docs | Durable exposure contract | Existing docs location | Unneeded implementation detail |
| src/agent-execution/prompt/carpenter-prompt-sections.ts | File | Prompt contract | Existing fixed prompt owner | No registry/exposure policy |
| tests/unit/.../prompt/carpenter-prompt-composer.test.ts | File | Prompt contract tests | Existing prompt test owner | Provider-specific prompt forks |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/docs/modules/prompt_engineering.md | File | Durable prompt contract | Existing documentation owner; update fixed prompt excerpts | Stale platform contract |
| /Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-ts/docs/tool_schema_and_configuration.md | File | Tool schema documentation | Verify-only alignment check; no planned edit | Duplicate prompt policy |

## Folder Boundary Check

| Path / Folder | Structural Depth | Ownership Clear? | Mixed/Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| src/agent-execution/backends/autobyteus | Main-Line Domain-Control | Yes | Low | Existing native backend is natural owner |
| tests/unit/.../backends/autobyteus | Mixed Justified test projection | Yes | Low | Mirrors production ownership |
| docs/modules | Off-Spine Concern | Yes | Low | Documentation remains separate |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Native-only composition | Native factory -> native exposure wrapper -> neutral builder -> native resolver | Claude/Codex -> shared helper silently appends native defaults | Prevents provider leakage |
| Persisted configuration | Fresh effective list = defaults + configured names | definition.toolNames.push(default) or JSON rewrite | Preserves user config/no migration |
| Deduplication | [read_file, defaults] -> one read_file | Materialize default/configured lists separately | Avoids duplicate definitions |
| Team filtering | defaults + team pair + config -> legacy filter -> resolver | Add defaults inside legacy task filter | Standalone coverage and ownership remain correct |
| External isolation | AgentRunManager -> Claude/Codex bootstrap -> neutral helper -> provider/MCP projection | External bootstrap -> native wrapper | Makes the forbidden dependency and preserved path concrete |
| File operation recovery | read_file recent relevant region -> regional edit_file patch -> reread/rebuild after context failure -> run_bash fallback when appropriate -> verify | Blindly retry stale edit or dead-end after a file-tool/system failure | Makes the requested recovery wording concrete without forbidding Bash; detailed patch semantics stay in the tool schema |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Persist defaults into AgentDefinition.toolNames | Simplifies resolution | Rejected | Runtime-derived native wrapper; preserve stored array |
| Add defaults unconditionally to shared helper | Small textual change | Rejected | Native-only wrapper |
| Runtime-kind switch in every shared-helper caller | Centralizes policy | Rejected | Keep native scope in native module |
| Native opt-out/fallback for old definitions | Preserves omission | Rejected | Unconditional native baseline |
| Compatibility wrapper around old resolver | Avoids test changes | Rejected | Feed existing resolver new effective exposure |

## Derived Layering (If Useful)

Run lifecycle/orchestration -> native runtime config policy -> runtime-neutral exposure mechanics -> native tool materialization -> native runtime execution.

External layering remains run lifecycle/orchestration -> provider bootstrap -> runtime-neutral exposure mechanics -> provider/MCP projection; it does not depend on the native policy layer.

## Change / Refactor Sequence

1. Add autobyteus-runtime-tool-exposure.ts with the exact native tuple and a wrapper that forms a fresh iterable from defaults plus configured names and delegates to buildRuntimeAgentToolExposure.
2. Change AutoByteusAgentRunBackendFactory.buildAgentConfig to call the wrapper. Do not change resolveAutoByteusAgentTools, the shared helper, or external bootstrap callers.
3. Add native policy tests for empty, partial, full, duplicate, team, mixed-filter, stale-name, and immutability cases.
4. Update native factory test setup to register existing foundation definitions and update exact name expectations. Add registry-backed `run_bash`, `read_file`, `edit_file`, and `write_file` instance assertions for standalone/team create and restore.
5. Retain/add neutral shared exposure tests proving empty external-style calls remain empty and team-pair behavior remains exact. Update the listed native integration and GraphQL/API-E2E journeys for four-tool exposure, approval/path behavior, file side effects, and restore; treat DS-005 as the external regression path and run Claude/Codex focused regressions where available.
6. Update both fixed Carpenter prompt sections and their unit assertions with the approved contract; keep `read-file.ts` and `edit-file-contract.ts` as schema authorities.
7. Update `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-server-ts/docs/modules/prompt_engineering.md` by replacing its obsolete fixed Bash/file excerpts with the approved sections; the prompt documentation/delivery owner owns this edit.
8. Verify `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-runtime-default-core-tools/autobyteus-ts/docs/tool_schema_and_configuration.md` remains aligned; its disposition is verification-only with no planned edit unless implementation exposes drift.
9. Update docs/modules/agent_tools.md to state native-only defaults and external-runtime isolation.
10. Run unit, integration, and focused API/E2E coverage; report missing dependency setup separately from product failures and route the new source/test state through code review before delivery.

No migration, compatibility seam, or decommissioned source path is needed.

## Key Tradeoffs

- Native wrapper vs shared runtime-kind switch: one focused file and import make ownership explicit and prevent leakage; a switch increases coupling and missed-call risk.
- Runtime-derived vs persisted defaults: preserves user configuration and avoids migration.
- Unit/materialization vs full E2E only: deterministic policy tests prove exact names; downstream API/E2E proves representative startup.
- Prompt guidance vs hard tool policy: keep the prompt explicit enough to improve model behavior, but leave availability, validation, authorization, and fallback execution to the runtime/tool owners.

## Risks

- Future native entrypoint bypassing the factory could omit the baseline. Keep the factory as the server native entrypoint and cover manager create/restore.
- Cleared registries in native factory tests may need registerTools setup. This is a test-fixture issue.
- The four tools are powerful local capabilities. Existing approval, workspace/path, shell, and auto-execution controls remain authoritative.
- Because the prompt is reused by Claude/Codex, wording that unconditionally requires `write_file` or native defaults could create an unavailable-tool loop. Keep the contract availability-aware.
- Tool schemas already own range, line-number, and patch-context semantics; avoid duplicating those details in the fixed prompt unless a concrete model failure justifies it.
- Bash fallback must remain explicit so a file-tool failure does not dead-end an otherwise recoverable run.
- The worktree lacks dependencies, so validation must install workspace dependencies.

## Guidance For Implementation

- Use a fresh iterable; never mutate AgentDefinition.toolNames.
- Keep canonical order stable: defaults first, configured names next, team pair appended by shared builder; dedup preserves first occurrence.
- Keep AUTOMATIC_TEAM_TOOL_NAMES and the native tuple separate.
- Do not add RuntimeKind branching to the neutral helper unless review identifies a concrete owner change.
- Ensure mixed legacy filtering leaves all four foundation names.
- Add prompt-composer assertions for the logical Bash/file division, practical discovery examples, explicit recent-region `read_file` before regional `edit_file`, reread-and-rebuild recovery, concise `write_file` selection, availability-aware Bash fallback, post-change verification, and the absence of contradictory instructions.
- Use existing registerTools/defaultToolRegistry definitions; do not duplicate schemas/factories.
- Do not create implementation-handoff.md; implementation_engineer owns it after implementation.

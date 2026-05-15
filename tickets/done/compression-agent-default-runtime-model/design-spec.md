# Design Spec

## Current-State Read

Memory compaction is triggered inside the `autobyteus-ts` runtime before the next LLM request when token pressure marks `memoryManager.compactionRequired`. The production compactor is a normal visible agent run created by server code, not a hidden direct model call.

Current server flow:

`Parent AgentRunConfig -> AutoByteusAgentRunBackendFactory.buildAgentConfig -> ServerCompactionAgentRunner -> CompactionAgentSettingsResolver -> AgentRunService.createAgentRun(compactor)`

The selected built-in Memory Compactor is seeded as a normal shared agent definition with `defaultLaunchConfig: null`. This was intentional to avoid hard-coding environment-specific runtime/model defaults. The current resolver, however, treats missing compactor runtime/model as fatal and has no parent launch context, so fresh default compaction fails unless the user edits the compactor agent launch config.

Ownership boundaries are mostly healthy: `CompactionAgentSettingsResolver` already owns compactor launch-setting resolution, and `ServerCompactionAgentRunner` already owns visible compactor run creation. The missing piece is that `AutoByteusAgentRunBackendFactory` has the parent effective runtime/model when it creates the parent-bound runner, but that context is not passed across the boundary.

## Intended Change

Change effective compactor runtime/model resolution from:

`selected compactor defaultLaunchConfig only -> fail if runtime/model missing`

to:

`selected compactor defaultLaunchConfig values override parent effective runtime/model fallback -> fail only when a required field is absent from both sources`.

The built-in Memory Compactor seed remains `defaultLaunchConfig: null`; that now means “inherit runtime/model from the running parent agent unless the compactor agent is explicitly configured.”

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, localized
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant with a small boundary-context gap
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, small boundary extension
- Evidence: `CompactionAgentSettingsResolver` owns compactor runtime/model resolution but only reads the selected compactor definition. `AutoByteusAgentRunBackendFactory` has parent effective runtime/model when creating the runner but does not pass it.
- Design response: Extend the parent-bound runner factory input and `ServerCompactionAgentRunner` options with parent fallback launch context; resolve explicit-over-fallback in `CompactionAgentSettingsResolver`.
- Refactor rationale: The fallback rule is an invariant of compactor launch resolution. If callers pre-filled values independently, the policy would duplicate and drift.
- Intentional deferrals and residual risk, if any: Broader launch-config inheritance for future runtime-specific fields is deferred. This scope covers required runtime/model fields only; compactor `llmConfig` remains explicit if configured.

## Terminology

- `Parent run`: the running agent run whose memory manager requested compaction.
- `Selected compactor agent`: the agent definition id from `AUTOBYTEUS_COMPACTION_AGENT_DEFINITION_ID`.
- `Explicit compactor launch value`: a non-empty value in the selected compactor's `defaultLaunchConfig`.
- `Parent fallback launch value`: the effective runtime/model from the parent `AgentRunConfig`.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: Replace the old “missing compactor runtime/model always fails” behavior with the new parent fallback rule. Do not preserve a feature flag or dual path for the old no-fallback behavior.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Parent AutoByteus run config/build | Visible compactor agent run created with effective runtime/model | Server compaction execution path | Captures where parent runtime/model must cross into compactor launch resolution. |
| DS-002 | Return-Event | Compactor run output/status | Parent memory compaction status/error metadata | `ServerCompactionAgentRunner` / `PendingCompactionExecutor` | Ensures effective runtime/model metadata remains visible after fallback. |

## Primary Execution Spine(s)

`Parent AgentRunConfig -> AutoByteusAgentRunBackendFactory -> Parent-bound ServerCompactionAgentRunner -> CompactionAgentSettingsResolver -> AgentRunService.createAgentRun(compactor)`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The parent backend factory builds an AutoByteus runtime for a parent run and creates a compaction runner bound to that parent. That runner carries the parent effective runtime/model. When compaction is required, the runner asks the resolver for effective compactor settings. The resolver overlays selected compactor explicit values over parent fallback values, then the runner creates the normal visible compactor run. | Parent run config; backend factory; compaction runner; settings resolver; agent run service | Server compaction execution path | Selected compactor definition lookup, server setting lookup, workspace selection. |
| DS-002 | The visible compactor run produces output or failure. The runner returns metadata containing the final effective compactor runtime/model. The memory compaction executor emits that metadata in compaction status/error events. | Compactor run; output collector; compaction outcome metadata; runtime reporter | Runner and pending executor | Error formatting, run termination, output parsing. |

## Spine Actors / Main-Line Nodes

- `AgentRunConfig` for parent run: carries parent effective runtime/model identity.
- `AutoByteusAgentRunBackendFactory`: builds the parent runtime and constructs the parent-bound compaction runner.
- `ServerCompactionAgentRunner`: owns creating the visible compactor run and collecting output.
- `CompactionAgentSettingsResolver`: owns effective compactor launch settings.
- `AgentRunService`: authoritative service for creating normal visible agent runs.

## Ownership Map

- `AutoByteusAgentRunBackendFactory` owns translating parent run config into runtime construction inputs and parent-bound dependencies.
- `ServerCompactionAgentRunner` owns compactor run lifecycle: create, subscribe, post task, collect output, terminate.
- `CompactionAgentSettingsResolver` owns selected compactor definition lookup and effective launch-setting precedence.
- `AgentRunService` owns validation/provisioning of normal visible agent runs.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `CompactionAgentRunner` shared interface | `ServerCompactionAgentRunner` in server production wiring | Allows `autobyteus-ts` memory code to delegate compactor execution without server imports. | Runtime/model fallback policy; that remains in server resolver. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Resolver behavior that throws solely because selected compactor runtime/model is missing | Missing selected defaults are now recoverable from parent fallback | `CompactionAgentSettingsResolver.resolve(parentFallback)` | In This Change | Still throw when selected compactor id is blank/missing or fallback is also missing. |
| Docs wording “there is no active-model fallback” | Directly contradicts new behavior | Updated docs in `autobyteus-ts/docs/agent_memory_design*.md` | In This Change | Treat prior decision as superseded. |
| UI/settings copy implying missing compactor runtime/model always means not configured/failing | Misleads operators after fallback | Updated settings copy/summary | In This Change | No new UI control required. |

## Return Or Event Spine(s) (If Applicable)

`Compactor AgentRun events -> CompactionRunOutputCollector -> ServerCompactionAgentRunner metadata -> Compactor outcome -> PendingCompactionExecutor status event`

Fallback must not break existing metadata; final effective runtime/model should be the values emitted in `compaction_runtime_kind` and `compaction_model_identifier`.

## Bounded Local / Internal Spines (If Applicable)

- Parent-bound runner construction: `buildAgentConfig -> compactionAgentRunnerFactory(input with parent fallback) -> ServerCompactionAgentRunner(options)`.
- Effective settings resolution: `selected definition launch config -> normalize explicit fields -> normalize parent fallback fields -> explicit-over-fallback merge -> validate required fields`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Server setting lookup | DS-001 | `CompactionAgentSettingsResolver` | Read selected compactor definition id. | Keeps compactor selection centralized. | Backend factory would duplicate settings policy. |
| Agent definition lookup | DS-001 | `CompactionAgentSettingsResolver` | Load fresh selected compactor definition. | Ensures user edits are respected. | Runner would mix lifecycle and definition parsing. |
| Settings/docs copy | DS-001 | Operator-facing settings/documentation | Describe fallback behavior. | Prevents confusion without owning runtime logic. | UI could become an invalid source of truth. |
| Output collection and termination | DS-002 | `ServerCompactionAgentRunner` | Collect final output and terminate visible compactor run. | Existing runner lifecycle concern. | Resolver would become lifecycle owner. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Effective compactor launch settings | Server compaction capability | Extend | Existing resolver already owns selected compactor settings. | N/A |
| Parent runtime/model source | AutoByteus backend factory | Extend | Existing factory already has parent effective config while constructing runner. | N/A |
| Visible run creation | Agent run service | Reuse | Existing visible normal compactor-run design remains correct. | N/A |
| Operator guidance | Existing docs/settings card | Extend | No new UI control needed. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/compaction` | Effective compactor launch settings and visible compactor run execution | DS-001, DS-002 | Server compaction runner/resolver | Extend | Main behavior change lives here. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus` | Parent AutoByteus run config/build wiring | DS-001 | AutoByteus backend factory | Extend | Pass parent fallback context. |
| `autobyteus-ts/src/memory/compaction` | Shared runner interface and memory compaction abstractions | DS-001, DS-002 | Memory runtime | Reuse | Avoid adding parent fallback to task payload. |
| `autobyteus-web/components/settings` and localization | Operator settings summary | DS-001 | Settings UI | Extend | Copy only. |
| `autobyteus-ts/docs` | Durable compaction design docs | DS-001 | Documentation | Extend | Remove stale no-fallback statement. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `compaction-agent-settings-resolver.ts` | Server compaction | Effective compactor settings resolver | Add parent fallback input type and explicit-over-fallback resolution. | Existing file owns this exact concern. | Uses existing `RuntimeKind`/normalizers. |
| `server-compaction-agent-runner.ts` | Server compaction | Visible compactor run lifecycle | Store parent fallback options and pass them to resolver. | Existing file owns compactor run lifecycle. | Uses resolver fallback type. |
| `autobyteus-agent-run-backend-factory.ts` | AutoByteus backend | Parent runtime factory | Extend runner factory input with parent effective runtime/model. | Existing file constructs parent-bound runner. | Uses existing `AgentRunConfig` fields. |
| Tests under `autobyteus-server-ts/tests/unit/agent-execution/compaction` | Server compaction tests | Resolver/runner behavior | Add fallback and precedence tests. | Existing test placement. | N/A |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` + tests/localization | Settings UI | Operator summary | Describe inherited runtime/model for blank selected defaults. | Existing settings card owns this display. | N/A |
| `autobyteus-ts/docs/agent_memory_design*.md` | Docs | Durable design docs | Update behavior description. | Existing docs own compaction behavior description. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Parent fallback launch context | Keep local type in `compaction-agent-settings-resolver.ts` or export from nearby server compaction file | Server compaction | Needed by resolver and runner; may also be referenced by backend factory type input. | Yes | Yes | A generic launch-preferences replacement for all run creation. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `CompactionParentLaunchFallback` (name illustrative) | Yes | Yes | Low | Fields should be only `runtimeKind`, `llmModelIdentifier`, and optionally `sourceAgentDefinitionId` for error context. Do not mirror all `AgentRunConfig` fields. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts` | Server compaction | Effective settings resolver | Resolve selected compactor id/definition; overlay explicit runtime/model over parent fallback; validate errors. | Existing owner. | Defines/exports fallback type. |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | Server compaction | Visible compactor runner | Accept parent fallback in options; call resolver with fallback; emit final effective metadata. | Existing owner. | Imports fallback type. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | AutoByteus backend | Parent-bound runtime wiring | Extend factory input and default factory to carry parent effective runtime/model. | Existing owner. | Uses fallback fields only. |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Server settings | Setting description registry | Update compactor setting description. | Existing owner. | N/A |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | Settings UI | Compaction settings card | Show missing selected runtime/model as inherited from running agent. | Existing owner. | N/A |
| `autobyteus-web/localization/messages/en/settings.ts`, `zh-CN/settings.ts` | Localization | Settings copy | Add/update strings. | Existing owner. | N/A |
| `autobyteus-ts/docs/agent_memory_design_nodejs.md`, `agent_memory_design.md` | Docs | Durable compaction behavior docs | Document explicit-over-parent-fallback behavior. | Existing owner. | N/A |

## Ownership Boundaries

- Parent backend factory may supply parent fallback identity, but must not decide whether the selected compactor is valid.
- Settings resolver decides the effective compactor runtime/model and owns all missing-field errors.
- Runner owns lifecycle and must not duplicate resolver precedence logic.
- UI/docs describe behavior only; they do not synthesize runtime/model values.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `CompactionAgentSettingsResolver.resolve(...)` | Server settings lookup, compactor definition lookup, explicit-over-fallback launch resolution | `ServerCompactionAgentRunner` | Backend factory pre-filling or mutating selected compactor definition defaults | Add fallback parameter to resolver. |
| `ServerCompactionAgentRunner` | Visible compactor run lifecycle and resolver invocation | `AgentCompactionSummarizer` through shared runner interface | Memory code passing runtime/model in every compaction task | Bind fallback at runner construction. |
| `AgentRunService.createAgentRun(...)` | Normal visible run validation/provisioning | `ServerCompactionAgentRunner` | Direct construction of compactor backend outside service | Keep using `createAgentRun`. |

## Dependency Rules

- `autobyteus-ts` memory code may depend only on the shared `CompactionAgentRunner` interface, not server resolver details.
- Server AutoByteus backend factory may depend on server compaction runner factory types.
- Server compaction runner may depend on server settings, agent definitions, and `AgentRunService`.
- UI must not duplicate fallback logic for execution; it may only summarize selected definition fields.
- Forbidden: hard-code runtime/model in the built-in compactor template to avoid fallback.
- Forbidden: preserve old no-fallback behavior behind a flag.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `CompactionAgentSettingsResolver.resolve(fallback?)` | Effective compactor launch settings | Return selected compactor id/name plus effective runtime/model/config | Selected compactor id from settings; parent fallback runtime/model context | New fallback parameter. |
| `ServerCompactionAgentRunnerOptions` | Parent-bound compactor runner construction | Carry workspace and fallback launch context | `workspaceRootPath`, `parentLaunchFallback` | Runner remains per parent config. |
| `CompactionAgentRunnerFactoryInput` | Parent-bound runner factory input | Supply parent effective values to default runner factory | `agentDefinitionId`, `workspaceRootPath`, `runtimeKind`, `llmModelIdentifier` | Existing tests updated. |
| `AgentRunService.createAgentRun(...)` | Visible run creation | Create compactor run using effective settings | Required runtime/model strings | No change to service contract. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Resolver fallback parameter | Yes | Yes | Low | Name fields as parent fallback/effective runtime/model, not generic defaults. |
| Runner factory input | Yes | Yes | Low | Keep parent values explicit instead of passing whole `AgentRunConfig`. |
| `AgentRunService.createAgentRun` | Yes | Yes | Low | No change. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Parent fallback context | `CompactionParentLaunchFallback` / `parentLaunchFallback` | Yes | Low | Avoid vague `defaults` name because selected compactor also has defaults. |
| Effective settings | `ResolvedCompactionAgentSettings` | Yes | Low | Keep existing name; semantics become explicit-over-fallback. |
| Selected compactor agent | Existing selected compactor terminology | Yes | Low | No rename. |

## Applied Patterns (If Any)

- Resolver pattern: `CompactionAgentSettingsResolver` remains the centralized policy resolver.
- Factory pattern: `AutoByteusAgentRunBackendFactory` continues creating parent-bound dependencies.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/compaction/compaction-agent-settings-resolver.ts` | File | Resolver | Effective compactor settings with parent fallback | Existing compaction execution capability | Runner lifecycle or UI copy. |
| `autobyteus-server-ts/src/agent-execution/compaction/server-compaction-agent-runner.ts` | File | Runner | Parent-bound fallback option and visible compactor run lifecycle | Existing runner | Definition parsing duplicated from resolver. |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | File | Parent runtime factory | Parent fallback context propagation | Existing parent config build owner | Resolver logic. |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | File | Settings UI | Operator summary display | Existing settings card | Execution fallback logic. |
| `autobyteus-ts/docs/agent_memory_design*.md` | File | Docs | Durable behavior contract | Existing docs | Stale no-fallback wording. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `agent-execution/compaction` | Main-Line Domain-Control | Yes | Low | Existing home for compactor execution policy. |
| `agent-execution/backends/autobyteus` | Main-Line Domain-Control | Yes | Low | Existing parent runtime creation boundary. |
| `autobyteus-web/components/settings` | Off-Spine Concern | Yes | Low | Copy-only UX update. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Resolver precedence | `effectiveRuntime = compactor.runtimeKind ?? parent.runtimeKind`; `effectiveModel = compactor.llmModelIdentifier ?? parent.llmModelIdentifier` | Writing `definition.defaultLaunchConfig = parentConfig` before running compaction | Keeps fallback runtime-only and avoids mutating user-editable definitions. |
| Parent context propagation | `compactionAgentRunnerFactory({ workspaceRootPath, runtimeKind: effectiveRuntimeKind, llmModelIdentifier })` | `runCompactionTask({ ..., runtimeKind, model })` for every task | The fallback is bound to the parent runner, not repeated in each compaction task. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Feature flag for old no-fallback behavior | Previous docs explicitly had no active-model fallback | Rejected | Replace old behavior directly; missing selected runtime/model now uses parent fallback. |
| Hard-code runtime/model in built-in compactor template | Would avoid missing defaults | Rejected | Keep seed environment-neutral and use parent fallback. |
| Caller-specific fallback before resolver | Quick local fix | Rejected | Centralize in resolver to avoid duplicated policy. |

## Derived Layering (If Useful)

- Runtime memory layer (`autobyteus-ts`) requests compactor execution through an interface.
- Server compaction layer resolves and executes visible compactor runs.
- Server backend factory layer supplies parent run identity to the compaction layer.
- UI/docs layer describes behavior but owns no execution policy.

## Migration / Refactor Sequence

1. Add a tight parent fallback type for compactor launch resolution in the server compaction area.
2. Update `CompactionAgentSettingsResolver.resolve(...)` to accept fallback context, compute explicit-over-fallback runtime/model, and improve missing-field errors.
3. Update `ServerCompactionAgentRunnerOptions` to accept fallback context and pass it to resolver in `runCompactionTask()` and `describeConfiguredCompactor()`.
4. Update `CompactionAgentRunnerFactoryInput` and the default factory in `AutoByteusAgentRunBackendFactory` to pass parent effective runtime/model.
5. Reuse a local `effectiveRuntimeKind` variable in `buildAgentConfig()` so runner fallback and resolved run config use the same value.
6. Update resolver, runner, and backend factory unit tests.
7. Update server setting description, settings-card summary/localization/tests, and compaction docs.
8. Run focused server and web tests after dependency setup.

## Key Tradeoffs

- Field-level fallback is more forgiving than requiring both runtime and model to be absent, but it can produce mixed configurations when users partially configure the compactor. This matches the nullable default-launch shape and is testable.
- Keeping fallback server-side avoids UI coupling but means the settings card can only describe inheritance, not preview the exact parent runtime/model for every future run.
- Not inheriting/merging `llmConfig` keeps the scope aligned to the requested runtime/model behavior and avoids carrying model-specific parameters across mixed configurations.

## Risks

- Tests cannot currently run in the dedicated worktree until dependencies are installed/linked.
- Docs and UI copy must both change, or operators may still believe blank compactor runtime/model is fatal.
- Future runtime-specific launch requirements may require extending the fallback context beyond runtime/model.

## Guidance For Implementation

- Do not change the built-in compactor template away from `defaultLaunchConfig: null`.
- Do not mutate selected compactor agent definitions during fallback.
- Keep effective runtime/model metadata in compaction status/events as the final values actually used.
- Prefer resolver unit tests for precedence and error messages; use runner/backend tests only to prove context propagation and `createAgentRun` inputs.

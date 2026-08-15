# Design Spec

## Status

`Design-ready proposal` — based on the approved requirements and the clarified
runtime-specific Carpenter scope. No production implementation is authorized
until architecture review passes.

## Current-State Read

`autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts`
is currently one shared composition boundary for three different backend
contracts. It renders Agent Identity, optional Team Instruction, optional team
member collaboration text under `## Team Runtime`, Working Environment, Bash
Operating Practice, and File And Directory Practice. It accepts no runtime
discriminator or prompt profile.

The three backend paths already have stable injection seams:

- Native AutoByteus composes the prompt in
  `backends/autobyteus/autobyteus-agent-run-backend-factory.ts` and supplies it
  to native `AgentConfig.systemPrompt`.
- Claude composes during
  `backends/claude/backend/claude-session-bootstrapper.ts`, stores the result in
  the Claude run context, and supplies it through the existing SDK
  `systemPrompt` field in `session/claude-session.ts`.
- Codex composes during
  `backends/codex/backend/codex-thread-bootstrapper.ts`, places the result in
  `CodexThreadConfig.baseInstructions`, and forwards it through the existing
  `thread/start` and `thread/resume` calls in `codex-thread-manager.ts`.

The structural defect is not the injection mechanism. It is that one reusable
composer conflates shared AutoByteus application context with native operating
policy. The fixed Bash/File sections explicitly name native tools that are not
necessarily present in the Claude or Codex effective tool surface. Durable
documentation also describes these sections as always-present for all runtimes.

`autobyteus-ts` is downstream of the native prompt boundary: `AgentConfig`
accepts the supplied system prompt and `SystemPromptProcessingStep` appends the
native configured-skills catalog. It does not resolve server runtime kind,
`MemberTeamContext`, Claude sessions, or Codex threads. Native tool schemas and
implementations remain its responsibility, but cross-runtime prompt selection
does not belong there.

## Intended Change

Split the server prompt composition into explicit shared and native entrypoints
while preserving the existing provider injection fields.

### Shared composition

The shared composition renders only the AutoByteus application context that is
valid for external providers as well as native agents:

1. `## Agent Identity` — selected agent name, description, and authored agent
   responsibilities.
2. Optional `## Team Instruction` — non-blank authored policy from the selected
   `team.md` body.
3. Optional `## Team Collaboration` — generated current-member identity,
   communication roster, delegation roster, and the server-owned collaboration
   protocols currently rendered by the team collaboration renderer.

The shared entrypoint does not require a workspace path and does not render
Working Environment, Bash Operating Practice, or File And Directory Practice.
The `## Team Runtime` heading and its renderer/file name are replaced by the
explicit `## Team Collaboration` terminology; no compatibility alias is kept.

### Native composition

The native entrypoint builds on the shared sections and preserves the existing
native logical order:

1. Agent Identity
2. optional Team Instruction
3. optional Team Collaboration
4. Working Environment
5. Bash Operating Practice
6. File And Directory Practice

The native `autobyteus-ts` bootstrap then appends its terminal configured-skills
catalog exactly as it does today. This preserves the earlier Carpenter ordering
and keeps native workspace, shell, and dedicated file-tool guidance coherent.

### External composition and injection

Claude and Codex call the shared entrypoint and continue using their established
injection fields:

- Claude: the shared string is supplied to the existing SDK `systemPrompt`
  option through the current session adapter.
- Codex: the shared string is supplied to the existing thread
  `baseInstructions` field through the current thread configuration and manager.

The refactor does not introduce another provider prompt path, alter provider
approval/sandbox/path settings, or rewrite provider-native tool/skill guidance.
Provider settings, provider-native skills, and provider tool schemas remain
owned by their existing adapters. The existing runtime tool projection remains
independent of prompt composition.

`send_message_to` and `delegate_task` remain shared collaboration capabilities:
native runs receive their native schemas and Claude/Codex receive the existing
MCP projection. `submit_task_result` and `review_task_result` remain
role/lifecycle-dependent task tools. Their guidance continues to come from
task packets or lifecycle notifications when applicable; they are not added as
an always-present section to the shared prompt.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BE-001 | System | Explicit shared/native prompt boundary; REQ-001, REQ-002, AC-001, AC-002 | Any native, Claude, or Codex run bootstrap | One composer appends all sections for all callers; composer has no runtime boundary | Shared entrypoint renders identity/team context; native entrypoint adds native sections in the established order | AgentRunService/Provisioning -> AgentRunManager/backend selection -> runtime factory/bootstrapper -> scoped composer; DS-001 through DS-007 |
| BE-002 | System | Preserve runtime injection fields and provider behavior; REQ-003, REQ-007, AC-004, AC-007 | Native AgentConfig creation, Claude session bootstrap, Codex thread create/restore | Existing native `systemPrompt`, Claude `systemPrompt`, and Codex `baseInstructions` seams | Keep each seam and replace only the input composition | Runtime-specific standalone/team create/restore paths; DS-002 through DS-007 |
| BE-003 | Contract | Capability-consistent prompt wording; REQ-002, REQ-004, AC-004, AC-006 | Prompt content is projected alongside runtime-specific tools | Native Bash/file tool names are in the shared output; tool exposure is separate | Native-only wording is removed from external output; shared collaboration projection remains unchanged | DS-001 bounded composition plus DS-002 through DS-007 runtime paths and off-spine exposure concern |
| BE-004 | Contract | One authoritative owner per prompt/tool concern; REQ-005, AC-005 | Source ownership for server and native projects | Server owns composition; `autobyteus-ts` owns native consumption/tools | Server owns shared/native selection and renderers; `autobyteus-ts` owns native consumption, skill append, and native tool contracts | Prompt subsystem and native runtime subsystem; DS-001, DS-002, DS-004, DS-006 |
| BE-005 | System | Preserve native Carpenter behavior while isolating external runtimes; REQ-006, AC-003, AC-004 | Standalone or team create/restore | Native order is identity/team/workspace/Bash/file, followed by native skills append; external callers receive same output | Native order and content remain; external output is reduced to shared sections | Native and external standalone/team create/restore paths; DS-002 through DS-007 |
| BE-006 | System | Preserve mixed team/task-agent context through runtime selection; REQ-001, REQ-003, REQ-007, AC-001, AC-007 | `MixedAgentMemberHandle.ensureReady` create or platform-state restore | Team context is built before backend selection, but the old shared-composer design did not show the complete path | Preserve `MemberTeamContext` into the selected native run, Claude session, or Codex thread for both lifecycle operations | DS-003, DS-005, DS-007 |

## Relevant Supplemental Task Artifacts

None. The requirements and investigation notes are sufficient authoritative
context for this prompt-boundary refactor. A separate ownership matrix is not
needed because the tables and production-path map in this design are concise and
directly actionable.

## Task Design Health Assessment

- Change posture: `Refactor` with observable behavior correction for external
  prompt scope.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` with shared-structure
  looseness.
- Refactor needed now: `Yes`.
- Evidence: one composer has three provider consumers but no runtime discriminator;
  its fixed sections name native file tools and native operating policy; the
  current injection seams are otherwise explicit and healthy.
- Design response: split shared prompt primitives from a native composition
  boundary and route each backend to the correct entrypoint.
- Refactor rationale: a runtime-profile boolean inside the existing all-purpose
  function would keep the misleading ownership boundary and make future
  accidental leakage easy. Explicit shared/native entrypoints make the intended
  scope visible at every call site.
- Intentional deferrals and residual risk: provider-specific prompt-policy
  redesign is deferred. This change preserves the current Claude/Codex field
  and adapter behavior; it does not attempt to replace provider guidance with a
  new server-authored provider contract.

## Terminology

- **Shared Carpenter composition:** AutoByteus-authored identity and team
  collaboration context that is valid for all three supported server runtimes.
- **Native Carpenter composition:** Shared composition plus AutoByteus native
  workspace, Bash, and dedicated file-operation guidance.
- **Team Instruction:** Stable authored policy from `team.md`.
- **Team Collaboration:** Generated current-run member, roster, communication,
  and delegation context. It is not provider runtime configuration.
- **Provider injection field:** The existing runtime-specific field receiving the
  composed string: native `AgentConfig.systemPrompt`, Claude SDK `systemPrompt`,
  or Codex `baseInstructions`.

## Design Reading Order

The implementation should be reviewed in this order: shared section ownership,
native suffix ordering, runtime call-site selection, provider-field preservation,
then tests and documentation. Tool exposure and provider approval/path behavior
are verification boundaries, not new prompt-composition responsibilities.

## Legacy Removal Policy

Policy: `No backward compatibility; remove legacy code paths.`

The old all-runtime `composeCarpenterPrompt` contract is removed or replaced by
the explicit shared/native entrypoints; no default profile or compatibility
wrapper may silently preserve native sections for external callers. The old
`Team Runtime` heading and `renderTeamRuntimeInstruction` naming are removed in
favor of `Team Collaboration` and the corresponding collaboration renderer.
The fixed native section constants remain, but they are no longer imported by
the shared external composition path.

No persisted data migration is introduced. Historical prompt snapshots or
provider history are not rewritten by this ticket; new/continued runtime
bootstrap calls use the new scoped composition at their existing boundary.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume:
  Agent definitions, team definitions, run configuration, and provider settings
  remain in their existing stores. No prompt schema or stored configuration field
  changes.
- Relevant code-model, serialization, semantic, or physical-store change:
  Prompt assembly and source/documentation ownership only.
- Normal reader/writer behavior and representative evidence: Existing readers
  and writers remain unchanged; prompt strings are not persisted as a new data
  model by this ticket.
- Required semantics and invariants under direct use: Preserve agent/team
  definitions, runtime selection, tool configuration, and provider settings.
- Physical-store, privacy/security, disposal/rebuild, and operational
  constraints: None introduced.
- Decision: `Not Affected`.
- Decision rationale: The change selects a different transient prompt string at
  existing bootstrap seams. Adding a migration or rewriting history would add
  I/O and recovery risk without changing persisted meaning.
- Supported criteria: REQ-006, AC-006.

### Migration Plan

`N/A` — persisted data is not affected.

## Data-Flow Spine Inventory

DS-001 is a bounded local composition spine. DS-002 through DS-007 are complete
primary create/restore spines that begin at supported run entry and end at the
meaningful native/provider runtime consequence. Team spines explicitly show where
`MemberTeamContext` is built and enters the `AgentRunConfig` before backend
selection.

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Bounded Local | BE-001, BE-003, BE-004 | Validated `AgentDefinition` plus optional `MemberTeamContext` at the prompt boundary | Shared prompt string | Server prompt subsystem | Encapsulates pure shared section rendering without pretending to be the full run lifecycle |
| DS-002 | Primary End-to-End | BE-001, BE-002, BE-005 | Standalone create or restore request -> `AgentRunService`/`AgentRunProvisioningService` -> `AgentRunManager.createAgentRun` or `restoreAgentRun` -> runtime-kind backend selection | Native `AgentRun` backed by the AutoByteus engine after `AgentConfig.systemPrompt` receives the native composition and native core appends terminal Skills | AgentRunManager plus AutoByteus backend factory/native core | Covers both supported standalone lifecycle operations through the final native run consequence |
| DS-003 | Primary End-to-End | BE-001, BE-002, BE-005, BE-006 | Mixed team member/task-agent `ensureReady` -> `MemberTeamContextBuilder` (including task-agent/task-team ingress) -> `AgentRunConfig.memberTeamContext` -> `AgentRunManager.createAgentRun` or `restoreAgentRunFromPlatformState` -> runtime-kind backend selection | Native team-member/task-agent `AgentRun` backed by the AutoByteus engine with native prompt and the built team context | Mixed member handle plus AgentRunManager plus AutoByteus backend factory | Shows exactly where team context enters both native create and restore and reaches the final run |
| DS-004 | Primary End-to-End | BE-001, BE-002, BE-005 | Standalone create or restore request -> `AgentRunService`/`AgentRunProvisioningService` -> `AgentRunManager.createAgentRun` or `restoreAgentRun` -> Claude backend selection -> session bootstrap | Claude `AgentRun` with the shared prompt in the existing SDK `systemPrompt` and a created/restored provider session | AgentRunManager plus Claude backend/session adapter | Covers both Claude standalone lifecycle operations through the final session consequence |
| DS-005 | Primary End-to-End | BE-001, BE-002, BE-005, BE-006 | Mixed team member/task-agent `ensureReady` -> `MemberTeamContextBuilder` -> `AgentRunConfig.memberTeamContext` -> `AgentRunManager.createAgentRun` or `restoreAgentRunFromPlatformState` -> Claude backend selection -> session bootstrap | Claude team-member/task-agent session using shared `systemPrompt`, built team context, and existing MCP/team projection | Mixed member handle plus AgentRunManager plus Claude backend/session adapter | Shows team context entering both Claude create and restore and reaching the final session |
| DS-006 | Primary End-to-End | BE-001, BE-002, BE-005 | Standalone create or restore request -> `AgentRunService`/`AgentRunProvisioningService` -> `AgentRunManager.createAgentRun` or `restoreAgentRun` -> Codex backend selection -> thread bootstrap/manager | Codex `AgentRun` with the shared prompt in `baseInstructions` and a created/resumed provider thread | AgentRunManager plus Codex backend/thread adapter | Covers both Codex standalone lifecycle operations through the final thread consequence |
| DS-007 | Primary End-to-End | BE-001, BE-002, BE-005, BE-006 | Mixed team member/task-agent `ensureReady` -> `MemberTeamContextBuilder` -> `AgentRunConfig.memberTeamContext` -> `AgentRunManager.createAgentRun` or `restoreAgentRunFromPlatformState` -> Codex backend selection -> thread bootstrap/manager | Codex team-member/task-agent thread using shared `baseInstructions`, built team context, and existing MCP/team projection | Mixed member handle plus AgentRunManager plus Codex backend/thread adapter | Shows team context entering both Codex create and restore and reaching the final thread |
| DS-008 | Return/Event | BE-002, BE-003 | Provider/native prompt setup and runtime tool projection | Existing runtime event/tool lifecycle | Existing backend and tool exposure owners | Confirms prompt selection does not mutate tool, approval, or path behavior |

## Primary Execution Spines

```text
Standalone request
  -> AgentRunService / AgentRunProvisioningService
  -> AgentRunManager.createAgentRun or restoreAgentRun
  -> runtime-kind backend selection
  -> AutoByteus / Claude / Codex backend factory
  -> runtime-specific bootstrap
```

```text
Mixed team member or task-agent ensureReady
  -> MemberTeamContext builder
  -> AgentRunConfig(memberTeamContext)
  -> AgentRunManager.createAgentRun or restoreAgentRunFromPlatformState
  -> runtime-kind backend selection
  -> selected runtime backend factory/bootstrapper
```

```text
Selected backend bootstrap
  -> scoped Carpenter composer
  -> existing provider/native injection field
  -> native engine, Claude session, or Codex thread
```

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | At the pure prompt boundary, the server validates the agent definition and optional member context, renders identity, authored team policy, and generated collaboration context, then returns one shared Markdown string. | AgentDefinition, MemberTeamContext, shared prompt sections, Team Collaboration renderer | `autobyteus-server-ts` prompt subsystem | Authored heading containment and unresolved-placeholder validation |
| DS-002 | A standalone create or restore reaches AgentRunManager, which selects the AutoByteus factory. The factory resolves the native workspace/tools, invokes the native composer, injects `AgentConfig.systemPrompt`, and hands the resulting configuration to the native AgentRun; native core then appends the configured-skills catalog. | AgentRunService/Provisioning, AgentRunManager, AutoByteusAgentRunBackendFactory, AgentConfig, native AgentRun | AgentRunManager for selection; AutoByteus factory for native bootstrap; `autobyteus-ts` for consumption/append | Native tool exposure, workspace, and skill registry |
| DS-003 | `MixedAgentMemberHandle.ensureReady` builds `MemberTeamContext` (including task-agent/task-team ingress), stores it in `AgentRunConfig`, and reaches AgentRunManager create or platform-state restore. Runtime selection reaches the AutoByteus factory, which composes shared/team context plus the native suffix and creates/restores the team-member native `AgentRun`. | MixedAgentMemberHandle, MemberTeamContextBuilder, AgentRunConfig, AgentRunManager, AutoByteus factory, native AgentRun | Mixed member owner for context; AgentRunManager/factory for run lifecycle | Team event publication, task lifecycle tools, native exposure |
| DS-004 | A standalone create or restore reaches AgentRunManager and the Claude backend factory. Claude session bootstrap resolves its workspace and agent definition, invokes the shared composer, stores the result, and the Claude session passes it through the existing SDK `systemPrompt` field to the created/restored provider session. | AgentRunService/Provisioning, AgentRunManager, ClaudeAgentRunBackendFactory, ClaudeSessionBootstrapper, ClaudeSession | AgentRunManager for selection; Claude adapter for session lifecycle and field projection | Claude settings, skills, MCP, permission mode |
| DS-005 | `MixedAgentMemberHandle.ensureReady` builds `MemberTeamContext` before AgentRunManager create or platform-state restore selects Claude. Claude bootstrap consumes that context in the shared composer, and the resulting collaboration-aware string reaches the existing Claude session `systemPrompt`; team tools remain projected through MCP. | MixedAgentMemberHandle, MemberTeamContextBuilder, AgentRunConfig, AgentRunManager, Claude factory/bootstrapper/session | Mixed member owner plus Claude adapter | MCP session descriptor, task lifecycle, event publication |
| DS-006 | A standalone create or restore reaches AgentRunManager and the Codex backend factory. Codex thread bootstrap invokes the shared composer, places the result in `CodexThreadConfig.baseInstructions`, and the thread manager sends it on the existing thread create/resume path to the created/resumed Codex thread. | AgentRunService/Provisioning, AgentRunManager, CodexAgentRunBackendFactory, CodexThreadBootstrapper, CodexThreadManager, Codex thread | AgentRunManager for selection; Codex adapter for thread lifecycle and field projection | Codex cwd, skills, MCP, approval, sandbox |
| DS-007 | `MixedAgentMemberHandle.ensureReady` builds `MemberTeamContext` before AgentRunManager create or platform-state restore selects Codex. Codex bootstrap consumes that context in the shared composer, and the collaboration-aware string reaches the existing Codex thread `baseInstructions`; team tools remain projected through MCP. | MixedAgentMemberHandle, MemberTeamContextBuilder, AgentRunConfig, AgentRunManager, Codex factory/bootstrapper/manager, Codex thread | Mixed member owner plus Codex adapter | MCP session descriptor, task lifecycle, event publication |
| DS-008 | Runtime tool exposure continues through its existing native/MCP projection and event lifecycle; prompt composition does not infer or alter capability. | RuntimeAgentToolExposure, native resolver, Agent Tools MCP | Existing tool exposure and provider adapters | Task lifecycle guidance and approval/path semantics |

## Spine Actors / Main-Line Nodes

- `AgentRunManager` and backend selection remain the runtime entry boundary.
- The runtime backend bootstrapper resolves the agent definition and workspace as
  it does today.
- The shared/native prompt composer owns section selection and ordering.
- The existing native/Claude/Codex injection seam remains the provider boundary.
- `autobyteus-ts` remains the native prompt consumer and terminal skill appender.

## Ownership Map

| Node | Ownership |
| --- | --- |
| Shared prompt composer | Shared section validation, normalization, heading containment, placeholder validation, and shared section order |
| Native prompt composer | Native section selection and native section order after shared context |
| Team Collaboration renderer | Generated current-run collaboration facts and fixed communication/delegation wording |
| Native backend factory | Resolves native workspace/tools and injects native prompt into AgentConfig |
| Claude session bootstrap/session | Resolves Claude workspace/configuration and injects shared prompt into the existing SDK field |
| Codex thread bootstrap/manager | Resolves Codex workspace/configuration and injects shared prompt into the existing thread field |
| Runtime tool exposure | Effective tool authorization/materialization; it must not be derived from prompt text |
| `autobyteus-ts` AgentConfig/SystemPromptProcessingStep | Native prompt consumption and terminal configured-skills catalog append |

The backend factories/bootstrapppers are provider entry boundaries, not owners of
prompt section wording. The prompt subsystem owns wording and order; each adapter
owns only the projection into its provider field.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| AutoByteus backend factory prompt call | Native prompt composer | Native bootstrap lifecycle and AgentConfig construction | Shared prompt wording or external provider policy |
| Claude session bootstrap prompt call | Shared prompt composer | Claude run lifecycle and SDK field projection | Native Bash/File sections |
| Codex thread bootstrap prompt call | Shared prompt composer | Codex thread lifecycle and `baseInstructions` projection | Native Bash/File sections |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| One all-runtime `composeCarpenterPrompt` behavior | It cannot express the ownership boundary safely | Explicit shared and native composer entrypoints in `prompt/carpenter-prompt-composer.ts` | In This Change | No compatibility default that emits native sections externally |
| `## Team Runtime` heading | It mislabels collaboration state as provider runtime configuration | `## Team Collaboration` | In This Change | Update source, tests, and docs together |
| `renderTeamRuntimeInstruction` name/path | It encodes the obsolete heading and ownership vocabulary | `renderTeamCollaborationInstruction` in the team collaboration service | In This Change | Clean rename; no alias |
| Native section imports from external composition | They make capability-specific text available to external callers | Native-only section assembly | In This Change | Keep constants, move their call boundary |
| Stale durable docs describing all sections as universal | They contradict the target contract | Updated runtime prompt documentation | In This Change | Include exact prompt engineering source |

## Team Collaboration Rename And Documentation Scope

The `Team Runtime` cleanup is scoped to the generated Carpenter prompt contract,
its renderer symbol/path, prompt assertions, and durable documentation that
describes that contract. It is not a repository-wide replacement of every use
of the words “Team Runtime”.

| Exact path | Disposition | Owner / scope | Required change or explicit no-change decision |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts` | Update | Server prompt owner | Emit `## Team Collaboration` through the renamed renderer and remove the old heading contract. |
| `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts` | Update if heading text is present | Server prompt wording owner | Keep shared/native section wording aligned with the new heading; do not move native sections into external composition. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-runtime-instruction-renderer.ts` | Rename / update | Team collaboration renderer owner | Rename the file and exported symbol to `team-collaboration-instruction-renderer.ts` / `renderTeamCollaborationInstruction`; retain the existing roster and protocol semantics with no alias. |
| `autobyteus-server-ts/tests/**` prompt/team assertions | Update | Existing test owners | Replace prompt-contract assertions for `## Team Runtime` and renderer imports; retain unrelated runtime terminology tests. |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Update | Durable prompt-contract documentation | Describe shared versus native sections and the `Team Collaboration` heading. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Update | Durable execution documentation | Describe runtime-specific prompt projection and preserve existing injection-field semantics. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Update | Codex documentation | Describe shared Carpenter context only; do not add native Bash/file policy. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Update | Team execution documentation | Rename prompt-contract references and clarify shared collaboration projection across runtime adapters. |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Update | Agent authoring documentation | Rename stale prompt-contract references; do not introduce provider policy. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Update | Agent-tools contract documentation | Replace “Team Runtime communication and delegation contract” with “Team Collaboration communication and delegation contract”; preserve the automatic `send_message_to` / `delegate_task` exposure semantics. |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | Verification-only; no edit planned | Native tool-schema documentation | Verify that its schema/exposure guidance does not describe the Carpenter heading; do not edit unless implementation evidence reveals a direct contradiction. |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | No change | Historical/decommissioned native-runtime documentation | Its `Removed Native Team Runtime Scope` terminology documents a separate historical runtime concept, not the generated Carpenter prompt contract. |

The implementation cleanup search is therefore limited to the Carpenter prompt
source/tests and the listed server prompt/team/agent-tool documentation paths.
It must distinguish prompt-contract references from unrelated historical or
runtime terminology before changing a match. The search must not perform a
global replacement across `autobyteus-ts/docs` or unrelated runtime records.

## Return Or Event Spine(s)

DS-008 is the relevant return/event boundary. Provider/native tool lifecycle,
approval, MCP routing, and task-result events remain owned by their current
adapters/services. The prompt refactor changes no event payload, tool name,
approval decision, sandbox/path setting, or result projection.

## Bounded Local / Internal Spines

The prompt composer has one bounded local spine:

```text
validate inputs -> render shared sections -> optionally render native suffix
  -> join in explicit order -> reject unresolved placeholders -> return string
```

The shared section builder and native suffix builder are pure and do not resolve
tools, invoke providers, or mutate runtime state.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Native tool exposure/materialization | DS-002, DS-003 | Runtime/tool exposure owner | Determines effective native tools | Capability is an out-of-band contract | Prompt could falsely grant or revoke capabilities |
| Claude/Codex tool and skill projection | DS-004 through DS-007 | Provider adapters | MCP/provider-native tool and skill setup | External runtimes have different surfaces | Shared prose could duplicate or conflict with provider behavior |
| Native configured-skills catalog append | DS-002 | `autobyteus-ts` core | Appends configured metadata/path catalog after supplied prompt | Native skill contract is core-owned | Server composer could duplicate or reorder the catalog |
| Task lifecycle instructions | DS-003, DS-005, DS-007 | Task delegation services | Supplies role/lifecycle-specific submit/review guidance | Not every team member has those tools | Common prompt could imply unavailable task tools |
| Durable documentation | DS-001 through DS-008 | Delivery/documentation ownership | Records authoritative section scope and injection fields | Prevents future reintroduction of shared/native confusion | Docs could preserve the old contract |

## Ownership Boundaries

The authoritative boundary is the prompt subsystem in
`autobyteus-server-ts/src/agent-execution/prompt`. It owns the semantic sections
that the server constructs and exposes two explicit composition contracts:

1. shared application context; and
2. native AutoByteus foundation.

Runtime adapters may call the appropriate composition boundary and pass its
result to their existing provider field. They must not import native-only section
constants or hand-build prompt fragments. `autobyteus-ts` may consume the native
prompt and append its terminal skills catalog, but it must not select Claude/Codex
prompt policy.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `composeSharedCarpenterPrompt(input)` | Identity/team normalization, Team Collaboration rendering, heading/placeholder validation | Claude bootstrap, Codex bootstrap, native composer | External backend importing Bash/File constants or rendering team text itself | Extend shared input only with semantically shared data |
| `composeNativeAutoByteusPrompt(input)` | Shared composition plus native workspace/Bash/File sections and native ordering | Native backend factory | Native factory assembling fixed prompt fragments itself | Keep native-specific data in the native input type |
| Existing native `AgentConfig.systemPrompt` path | Native core bootstrap and terminal skills append | Native backend factory | Server manually appending the native skills catalog | Use the existing core boundary |
| Existing Claude `systemPrompt` field | Claude session provider projection | Claude session bootstrap/session | A second user-turn or MCP prompt injection path | Extend the adapter options only if provider contract requires it |
| Existing Codex `baseInstructions` field | Codex thread create/resume projection | Codex thread bootstrap/manager | Embedding native instructions in app-server config or user input | Keep provider projection in Codex adapter |

## Dependency Rules

- `prompt/carpenter-prompt-composer.ts` may depend on shared agent-definition and
  team-context domain types and the Team Collaboration renderer.
- The native composition path may depend on native section constants; the shared
  composition path must not.
- Claude and Codex backends may call the shared composition boundary only.
- The native backend may call the native composition boundary only.
- Runtime tool exposure, MCP descriptors, approval, sandbox, and path services
  must not depend on prompt section text.
- `autobyteus-ts` remains below the native injection boundary and must not import
  server backend or provider prompt modules.
- No provider adapter may duplicate the shared identity/team rendering logic.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `composeSharedCarpenterPrompt(input)` | Shared application prompt | Render identity and optional team collaboration context | `AgentDefinition` plus optional validated `MemberTeamContext` | No workspace/native-tool input required |
| `composeNativeAutoByteusPrompt(input)` | Native AutoByteus prompt | Render shared prompt plus native operating sections | Shared input plus absolute native workspace path | Native-only entrypoint |
| Native backend factory prompt call | Native run bootstrap | Inject native string into `AgentConfig.systemPrompt` | Existing `AgentRunConfig`/run id/workspace | Existing lifecycle preserved |
| Claude session prompt call | Claude session bootstrap | Inject shared string into SDK `systemPrompt` | Existing Claude run context/session | Existing field preserved |
| Codex thread config | Codex thread bootstrap | Inject shared string into `baseInstructions` | Existing Codex thread config | Existing create/resume field preserved |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `composeSharedCarpenterPrompt` | Yes | Yes | Low | Keep it free of native workspace/tool policy |
| `composeNativeAutoByteusPrompt` | Yes | Yes | Low | Require absolute native workspace |
| Existing provider injection fields | Yes | Yes through their existing contexts | Low | Preserve fields; change only source composition |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared prompt | `Shared Carpenter Prompt` | Yes | Low | Use in types/comments where needed |
| Native prompt | `Native AutoByteus Carpenter Prompt` | Yes | Low | Make entrypoint name explicit |
| Generated team section | `Team Collaboration` | Yes | Low | Replace `Team Runtime` in source/docs/tests |
| Team authored section | `Team Instruction` | Yes | Low | Preserve existing meaning |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Shared prompt validation/rendering | Existing server prompt subsystem | Extend | It already owns Carpenter composition and heading containment | N/A |
| Team collaboration text | Existing team execution services | Rename/extend | It already owns dynamic rosters and collaboration protocols | N/A |
| Native prompt consumption and skill append | Existing `autobyteus-ts` core | Reuse | It already owns AgentConfig bootstrap and terminal catalog append | N/A |
| Runtime tool exposure | Existing shared/runtime backend adapters | Reuse unchanged | Prompt scope must not become capability scope | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Server prompt subsystem | Shared/native prompt selection, wording, ordering, validation | DS-001 through DS-007 | All runtime adapters | Extend | One source for shared and native text; two explicit entrypoints |
| Team execution collaboration services | Generated member/roster/protocol content | DS-001 | Team runtime and agent tools | Rename/extend | `Team Collaboration`, not runtime configuration |
| Native runtime core | AgentConfig consumption and terminal skills catalog | DS-002 | Native backend | Reuse | No cross-runtime policy |
| Provider runtime adapters | Injection into Claude/Codex fields and provider setup | DS-004 through DS-007 | Claude/Codex | Reuse/modify call site | No native section imports |
| Runtime tool exposure | Native/MCP tool availability and authorization | DS-008 | All runtimes | Reuse unchanged | No prompt-driven changes |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/agent-execution/prompt/carpenter-prompt-composer.ts` | Server prompt | Shared/native composition boundary | Input types, shared section builder, native suffix builder, final validation | Composition sequencing belongs together | Yes, shared section builder |
| `src/agent-execution/prompt/carpenter-prompt-sections.ts` | Server prompt | Section wording owner | Shared and native section renderers/constants | Existing file already owns fixed section text | Shared renderers reused by both |
| `src/agent-team-execution/services/team-collaboration-instruction-renderer.ts` | Team collaboration | Generated collaboration owner | Current-member/roster/protocol rendering | One generated collaboration contract | Shared by all provider adapters |
| Three backend bootstrap files | Runtime adapters | Existing provider injection owners | Select shared or native entrypoint | Each adapter owns only its provider lifecycle | Shared prompt string |
| Prompt/backend test files | Test subsystem | Existing test owners | Assert scope/order/injection | Tests follow current production boundaries | Shared test fixtures |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Agent/team normalization and placeholder validation | `carpenter-prompt-composer.ts` or existing section helpers | Server prompt | Shared and native outputs require identical safety rules | Yes | Yes | A provider-specific prompt policy bucket |
| `MemberTeamContext` | Existing domain model | Team execution | Existing authoritative identity/context shape | Yes | Yes | A second provider-specific team context model |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Shared composer input | Yes | Yes | Low | Include only AgentDefinition and optional MemberTeamContext |
| Native composer input | Yes | Yes | Low | Add only native absolute workspace path |
| `MemberTeamContext` | Yes | Yes | Medium | Reuse existing type; do not add prompt-only provider fields |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts` | Server prompt | Shared/native composition | `composeSharedCarpenterPrompt` and `composeNativeAutoByteusPrompt`, input validation, ordering, finalization | Makes runtime scope visible at the call boundary | Yes |
| `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts` | Server prompt | Section wording | Shared identity/team sections and native operating sections | Keeps semantic text centralized without sharing native imports | Yes |
| `autobyteus-server-ts/src/agent-team-execution/services/team-collaboration-instruction-renderer.ts` | Team collaboration | Collaboration contract | Dynamic member/roster/protocol rendering | Owns the generated collaboration content | N/A |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Native adapter | Native injection | Calls native composer only | Native lifecycle owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Claude adapter | External injection | Calls shared composer only | Claude lifecycle owner | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex adapter | External injection | Calls shared composer only | Codex lifecycle owner | Yes |
| `autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts` | Native core | Terminal skill append | No behavior change; verification only | Existing native owner remains intact | Native prompt string |

## Applied Patterns

- **Explicit composition boundaries:** separate entrypoints make valid reuse
  visible without using a boolean that hides ownership.
- **Pure section rendering:** section renderers remain deterministic and free of
  provider/tool side effects.
- **Provider adapter projection:** runtime adapters inject the composed string at
  their existing provider-specific field and do not own shared wording.
- **Terminal native layering:** native core continues appending the configured
  skill catalog after the server-composed native foundation.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/prompt` | Folder | Server prompt subsystem | Shared/native Carpenter composition and validation | Existing prompt boundary already has correct server context | Provider tool exposure or native core implementation |
| `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts` | Module | Shared/native composition boundary | Two explicit composition entrypoints | Centralizes order and fail-fast validation | Provider-specific wording |
| `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts` | Module | Section wording owner | Shared and native section text | Existing section source is authoritative | Tool schema definitions |
| `autobyteus-server-ts/src/agent-team-execution/services/team-collaboration-instruction-renderer.ts` | Module | Team collaboration | `Team Collaboration` generated text | Team context/roster owner already lives here | Native Bash/file guidance |
| Runtime backend bootstrap paths | Modules | Provider adapters | Choose composition and inject existing field | Keeps provider lifecycle local | Duplicated section rendering |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | File | Durable server docs | Document shared/native contract and order | It currently reproduces obsolete all-runtime sections | Implementation-only scratch notes |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | File | Durable server docs | Update runtime composition description | It currently says all runtimes receive the full foundation | New provider policy |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | File | Codex docs | Update team/prompt projection wording | It names the shared Carpenter path | Native Bash/file policy |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | File | Team docs | Rename Team Runtime and clarify shared collaboration | It documents mixed-runtime team paths | Provider-specific native prompt text |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | File | Agent authoring docs | Rename stale Team Runtime references | It describes prohibited prompt content | New runtime policy |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | File | Agent-tools contract docs | Rename the Team Runtime communication/delegation wording to Team Collaboration while preserving automatic pair exposure | It directly documents the generated collaboration contract | Changes to tool exposure, schemas, or approval semantics |
| `autobyteus-ts/docs/tool_schema_and_configuration.md` | File | Native tool docs | Verification-only; no edit planned | It already says schemas are native/out-of-band and not prompt text | Carpenter section ownership |
| `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` | File | Historical native-runtime docs | No change | Its removed-runtime terminology is unrelated to the generated Carpenter heading | Prompt-contract rename |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `server/src/agent-execution/prompt` | Main-Line Domain-Control / prompt concern | Yes | Low | Prompt composition is a compact capability area already established in the server |
| `server/src/agent-team-execution/services` | Main-Line Domain-Control / off-spine collaboration | Yes | Low | Dynamic team collaboration remains with team execution services |
| `autobyteus-ts/src/agent` | Native runtime core | Yes | Low | Only native consumption/skill append remains there |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Native standalone | `Agent Identity -> Working Environment -> Bash Operating Practice -> File And Directory Practice -> native Skills append` | `Agent Identity -> shared external prompt -> native suffix -> provider-specific duplicate skills` | Preserves the native Carpenter flow and terminal core append |
| Native team | `Agent Identity -> Team Instruction -> Team Collaboration -> Working Environment -> Bash -> File -> Skills` | `Team Runtime` plus native tool guidance hidden in a generic provider-neutral composer | Makes the intended order and naming explicit |
| Claude/Codex team | `Agent Identity -> Team Instruction -> Team Collaboration -> existing provider injection field` | External prompt containing `read_file`/`edit_file` workflows or native workspace instructions | Prevents unavailable-tool assumptions while preserving team operation |
| Boundary | Backend calls `composeSharedCarpenterPrompt` or `composeNativeAutoByteusPrompt` | Backend imports section constants and concatenates strings itself | Keeps ownership and future review obvious |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `composeCarpenterPrompt` as a default alias that emits the old full prompt | Could reduce immediate call-site edits | Rejected | Update all current consumers to explicit entrypoints; compiler/search verifies no old caller remains |
| Keep `## Team Runtime` as an alias or duplicate heading | Could preserve old prompt snapshots/tests | Rejected | Rename source/tests/docs to `## Team Collaboration`; historical persisted text is not rewritten |
| Let external adapters opt out with a boolean flag | Small code diff | Rejected | Use explicit shared/native entrypoints so native-only policy is not reachable from external calls |
| Move provider prompt composition into `autobyteus-ts` | Could centralize more code | Rejected | Keep server ownership because runtime/team/workspace/provider context is server-owned |

## Change Sequence

1. Update the prompt contract names and section classification in server prompt
   modules; rename the collaboration renderer and heading without a compatibility
   alias. Run the scoped `Team Runtime` search only across the prompt source,
   prompt/team tests, and the explicitly listed server prompt/team/agent-tools
   docs; classify the unrelated historical `autobyteus-ts` match as no-change.
2. Extract the shared section builder and add the native composer entrypoint,
   preserving normalization, heading containment, placeholder validation, and the
   native section order.
3. Change native, Claude, and Codex bootstrap call sites to the correct explicit
   entrypoint while preserving their existing injection fields and restore paths.
4. Update unit/integration/E2E prompt assertions for the new heading, shared vs
   native output, and injection-field preservation. Add negative assertions that
   Claude/Codex output contains no native Bash/File sections.
5. Run implementation-scoped checks and hand off; downstream API/E2E coverage
   investigation decides durable coverage edits after code review.
6. Update the exact durable server documentation inventory, including
   `autobyteus-server-ts/docs/modules/agent_tools.md`, and record
   `autobyteus-ts/docs/tool_schema_and_configuration.md` as verification-only
   and `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` as an
   explicit no-change historical document.

## Tradeoffs

- Explicit entrypoints add two named composition APIs instead of one function with
  a runtime flag. The additional names are intentional: they make accidental
  native prompt leakage harder and keep each adapter's ownership visible.
- The shared external prompt becomes shorter. This removes unavailable native
  tool instructions but does not attempt to recreate provider-native guidance in
  the server.
- Working Environment remains native-only in this ticket. External runtimes
  continue receiving their existing `cwd`/working-directory fields; a future
  provider-specific workspace supplement can be added only with evidence.
- Task-result lifecycle guidance remains contextual rather than becoming a
  universal prompt block. This avoids implying `submit_task_result` or
  `review_task_result` availability to every team member.

## Implementation Guidance

- Preserve the existing `assertNoUnresolvedPlaceholders` behavior for both output
  entrypoints.
- Preserve authored Markdown heading containment for Agent Identity and Team
  Instruction.
- Preserve required absolute workspace validation in the native entrypoint;
  remove that requirement from the shared external input because external
  adapters already own their working-directory field.
- Keep `MemberTeamContext` validation and the message-delivery binding check in
  the Team Collaboration renderer.
- Do not add tool names to an `Available Tools` prompt section. Schemas and
  effective availability remain out-of-band.
- Do not modify runtime exposure resolvers, MCP descriptors, approval policy,
  sandbox mode, or path authorization as part of this refactor.
- Update only prompt-contract references to `Team Runtime` in the scoped source,
  tests, and listed durable docs. Do not perform a global replacement or retain
  the old heading in newly generated prompts; unrelated historical/runtime
  terminology remains unchanged unless separately approved.

## Verification Plan

- Unit prompt tests: shared standalone/team output, native standalone/team order,
  new `Team Collaboration` heading, native-only section absence from shared
  output, optional section omission, and validation behavior.
- Native backend tests: `AgentConfig.systemPrompt` contains shared sections plus
  native sections in order; native tool exposure assertions remain unchanged.
- Claude bootstrap/session tests: shared output is stored and passed through the
  existing SDK `systemPrompt`; it excludes Working Environment/Bash/File sections
  and includes team collaboration when applicable.
- Codex bootstrap/thread tests: shared output reaches `baseInstructions` for
  create and restore; it excludes native-only sections and leaves approval,
  sandbox, workspace, and MCP configuration unchanged.
- E2E/runtime tests: create/resume paths preserve the same injected field and
  provider session/thread continuity; update stale heading assertions.
- Documentation check: `prompt_engineering.md`, `agent_execution.md`,
  `codex_integration.md`, `agent_team_execution.md`, `agent_definition.md`, and
  `agent_tools.md` describe shared/native projection and the Team Collaboration
  contract; `autobyteus-ts/docs/tool_schema_and_configuration.md` is verified
  without edit; the historical `agent_team_runtime_and_task_coordination.md`
  document is verified as no-change.

## Residual Risks

- Any untracked consumer of the old composer contract could retain native prompt
  leakage; repository-wide search and TypeScript/test compilation must catch it.
- Provider runtime behavior can evolve independently; this ticket deliberately
  keeps existing injection fields and provider adapters rather than introducing a
  new provider prompt contract.
- Historical prompt text may remain in persisted/native snapshots by design; the
  ticket changes newly composed output and does not rewrite historical records.

## Architecture Review Questions

1. Is the explicit shared/native entrypoint split preferable to a runtime-profile
   parameter for preventing future native prompt leakage?
2. Is `Working Environment` correctly classified as native-only given the
   existing external `cwd`/working-directory fields and provider skill paths?
3. Is the clean rename to `Team Collaboration` acceptable without a compatibility
   alias or historical prompt rewrite?
4. Is the documentation inventory and verification-only disposition of
   `autobyteus-ts/docs/tool_schema_and_configuration.md` complete?

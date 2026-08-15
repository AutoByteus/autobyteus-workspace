# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete — dedicated worktree and branch created from refreshed `origin/personal`; requirements refined to Design-ready.
- Current Status: Current-state investigation and ownership analysis complete; architecture rework for ARCH-DI-001 and ARCH-DI-002 is complete and the revised design package is awaiting architecture re-review.
- Investigation Goal: Trace how Carpenter/system prompts are assembled for AutoByteus, Claude Agent SDK, and Codex App Server; distinguish genuinely shared context from native/provider-specific guidance; decide whether the boundary belongs in `autobyteus-server-ts`, `autobyteus-ts`, or an explicit composition split.
- Scope Classification (`Small`/`Medium`/`Large`): Medium investigation/refactor candidate.
- Scope Classification Rationale: One server composer is reused by three runtime backends, but each runtime has a different prompt field, tool surface, and provider contract.
- Scope Summary: Investigate and design runtime-specific prompt ownership. Keep the finalized native default-tool ticket closed and avoid incidental tool-exposure changes.
- Primary Questions To Resolve: Which sections are universal; which are native AutoByteus-only; how Codex/Claude provider guidance is currently supplied; whether to pass runtime kind into the composer or split composition by backend; and which project owns each prompt/tool contract.

## Request Context

The user identified that native AutoByteus tools such as `run_bash`, `read_file`, `edit_file`, and `write_file` are not necessarily available to Codex or Claude Agent SDK runtimes. Those runtimes already have provider-native tools and prompt best practices. The current shared Carpenter prompt may therefore inject low-value or conflicting native guidance into external runtimes. The user requested a new ticket to investigate and refactor this boundary, after the previous default-tool ticket was finalized.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git monorepo.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tickets/in-progress/runtime-specific-carpenter-prompt`.
- Current Branch: `codex/runtime-specific-carpenter-prompt`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` succeeded; `origin/personal` resolved to `cd2420c60` (`chore(delivery): record finalization cleanup`).
- Task Branch: `codex/runtime-specific-carpenter-prompt`.
- Expected Base Branch (if known): `origin/personal` / local tracking branch `personal`.
- Expected Finalization Target (if known): `personal` after investigation, design review, implementation, coverage, and delivery if the user approves implementation.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: This ticket is new and independent of the finalized native-default-tool ticket. Use this dedicated worktree for all authoritative artifacts. Do not modify production source before requirements and design approval.

## Supplemental Task Artifact Inventory

No supplements yet. Add a prompt ownership matrix or runtime prompt contract only if investigation shows it materially improves reviewability.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-08-15 | Setup | `git fetch origin --prune`; `git worktree add -b codex/runtime-specific-carpenter-prompt ... origin/personal` | Bootstrap a clean ticket workspace after the prior ticket finalization | Dedicated worktree created from current `origin/personal` at `cd2420c60` | No |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts` | Trace the central prompt assembly function | Composer accepts agent definition, workspace, and optional team context, but no runtime kind; it always appends the fixed Bash and file sections | Determine whether runtime-specific input or separate composers is the correct boundary |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts` | Inspect prompt section ownership and content | Fixed sections contain Bash navigation/search/project guidance and native-style `read_file`/`edit_file`/`write_file` workflow wording | Classify each section as universal, native-only, or provider-owned |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Trace native prompt consumption | Native factory composes Carpenter prompt and passes it as the prompt argument to `AgentConfig` for native create/restore | Preserve native prompt behavior while separating external consumers |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` | Trace Claude prompt construction and provider invocation | Claude bootstrap calls the same composer; Claude session passes the result as SDK `systemPrompt` | Preserve Claude's current prompt contract and avoid native-only text leakage |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Trace Codex prompt construction and provider invocation | Codex bootstrap calls the same composer and passes it as `baseInstructions` into the Codex thread configuration/manager | Preserve Codex's current prompt contract and avoid native-only text leakage |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | Compare prompt reuse with tool exposure boundaries | Runtime-neutral tool exposure is separate from native materialization; shared helper reuse does not prove prompt guidance is universal | Keep prompt ownership and tool exposure ownership distinct |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/services/agent-run-provisioning-service.ts` | Trace supported standalone and prepared create/restore entrypoints before architecture rework | `AgentRunManager` selects the runtime backend factory for create and restore; service/provisioning facades reach that manager rather than bypassing backend selection | Primary runtime spines must include manager selection and final session/thread/native-run consequences |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts`; existing `MemberTeamContextBuilder` and `AgentRunConfig` construction | Trace team-member and task-agent create/restore ingress | `ensureReady` builds `MemberTeamContext` (including task-agent/task-team ingress), stores it in `AgentRunConfig`, and calls `AgentRunManager.createAgentRun` or `restoreAgentRunFromPlatformState` | Team primary spines must show this context entry before runtime-kind backend selection |
| 2026-08-15 | Code/Doc | `rg -l 'Team Runtime' autobyteus-server-ts/src/agent-execution/prompt autobyteus-server-ts/src/agent-team-execution autobyteus-server-ts/tests autobyteus-server-ts/docs/modules autobyteus-ts/docs` plus inspection of each match | Scope the terminology cleanup after architecture feedback | Prompt-contract matches include the Carpenter source/tests and server docs, including `autobyteus-server-ts/docs/modules/agent_tools.md`; `autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` is a separate historical/decommissioned runtime document | Update only prompt-contract references; explicitly leave the historical document unchanged |
| 2026-08-15 | Command | `rg -n -C 6 'composeCarpenterPrompt|BASH_OPERATING_PRACTICE_SECTION|FILE_AND_DIRECTORY_PRACTICE_SECTION' autobyteus-server-ts/src autobyteus-ts/src` | Enumerate all prompt consumers and fixed section definitions | Found native, Claude, and Codex consumers of one composer and no runtime discriminator | Complete consumer inventory and test coverage map |
| 2026-08-15 | History | `git show 99976b55a:tickets/in-progress/carpenter-model/system-prompt-contract.md`; `git show 99976b55a:tickets/in-progress/carpenter-model/team-and-runtime-prompt-spec.md` | Verify the original Carpenter contract and whether cross-runtime reuse was deliberate | The approved historical contract explicitly described the semantic foundation as provider-independent and mapped the complete Markdown to native `AgentConfig.systemPrompt`, Codex `baseInstructions`, and Claude SDK `systemPrompt`; it also declared Bash and File And Directory Practice always-present | Treat the current ticket as a deliberate scope correction to that earlier cross-runtime contract, not as an accidental undocumented behavior |
| 2026-08-15 | Code/Doc | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/prompt_engineering.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/agent_execution.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/docs/modules/codex_integration.md` | Compare durable documentation with current construction | Durable docs still describe one complete Carpenter foundation, including fixed Bash/File sections, as shared across all three runtimes | Documentation must be revised only after the approved runtime boundary is decided; the exact prompt-engineering document is in scope for alignment |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-setting-sources.ts` | Check whether Claude has an additional provider-owned instruction path | Server passes a string custom `systemPrompt` to the SDK while also enabling `user`, `project`, and `local` setting sources; provider settings remain a separate input, so the server must not assume the Carpenter string is the provider's complete native prompt contract | Verify SDK custom-system-prompt/preset semantics in implementation design and preserve provider-owned settings/instructions |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts` | Check Codex instruction and working-directory boundaries | Codex receives `cwd` as a thread field and the Carpenter string separately as `baseInstructions`; configured skills are discovered/materialized through Codex-specific paths | Do not duplicate Codex cwd/tool/skill best practices in a native-only Carpenter section; retain server-owned team/identity context through the appropriate Codex instruction field |
| 2026-08-15 | Code | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-ts/src/agent/context/agent-config.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-ts/src/agent/bootstrap-steps/system-prompt-processing-step.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-ts/src/agent/system-prompt/append-configured-skills-catalog.ts` | Determine project ownership of prompt composition versus native prompt consumption | `autobyteus-ts` accepts a supplied `systemPrompt` and appends the native configured-skills catalog; it does not know Claude/Codex runtime selection or team context | Keep cross-runtime selection and server-owned Carpenter rendering in `autobyteus-server-ts`; retain native prompt consumption/skill append and native tool contracts in `autobyteus-ts` |
| 2026-08-15 | Code/Test | `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/unit/agent-execution/prompt/carpenter-prompt-composer.test.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-carpenter-prompt/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts`; `rg -n 'composeCarpenterPrompt|carpenterSystemPrompt|baseInstructions|systemPrompt' autobyteus-server-ts/tests` | Inventory prompt assertions and injection coverage before design | Unit and E2E tests assert the current `Team Runtime` heading and native sections; Claude/Codex prompt consumers and the native factory already have separate prompt-field seams | Rename/update prompt assertions, add explicit shared-versus-native output tests, and preserve existing injection-field assertions without changing runtime exposure tests |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BE-001 | System | Native AutoByteus standalone create/restore with `runtimeKind=autobyteus` | `AgentRunService`/provisioning -> `AgentRunManager.createAgentRun` or `restoreAgentRun` -> AutoByteus backend factory -> scoped composer -> `AgentConfig` -> native agent runtime | Native prompt contains identity, optional team sections, native workspace/Bash/file sections, and the terminal native Skills append | `agent-run-manager.ts`; `agent-run-service.ts`; `autobyteus-agent-run-backend-factory.ts`; `carpenter-prompt-composer.ts` |
| BE-002 | System | Claude Agent SDK standalone create/restore with `runtimeKind=claude_agent_sdk` | `AgentRunService`/provisioning -> `AgentRunManager.createAgentRun` or `restoreAgentRun` -> Claude backend selection/bootstrapper -> shared composer -> runtime context -> SDK `systemPrompt` -> Claude session | Claude receives only shared Carpenter context from this server composer, alongside its provider-native tool/session configuration | `agent-run-manager.ts`; `claude-session-bootstrapper.ts`; `claude-session.ts` |
| BE-003 | System | Codex App Server standalone create/restore with `runtimeKind=codex_app_server` | `AgentRunService`/provisioning -> `AgentRunManager.createAgentRun` or `restoreAgentRun` -> Codex backend selection/bootstrapper -> shared composer -> thread config -> Codex thread manager | Codex receives only shared Carpenter context as `baseInstructions`, alongside its provider-native thread/MCP configuration | `agent-run-manager.ts`; `codex-thread-bootstrapper.ts`; `codex-thread-manager.ts` |
| BE-006 | System | Mixed team member/task-agent create/restore for any runtime kind | `MixedAgentMemberHandle.ensureReady` -> `MemberTeamContextBuilder` -> `AgentRunConfig.memberTeamContext` -> `AgentRunManager.createAgentRun` or `restoreAgentRunFromPlatformState` -> selected backend | Team context enters before backend selection and reaches the selected native run, Claude session, or Codex thread without changing tool/approval/path semantics | `mixed-agent-member-handle.ts`; `agent-run-manager.ts`; `AgentRunConfig` |
| BE-004 | Contract | `composeCarpenterPrompt` function contract | Agent definition + workspace + optional team context -> fixed ordered prompt string | No runtime kind is accepted, so the function cannot currently select runtime-specific sections | `carpenter-prompt-composer.ts` |
| BE-005 | Contract | Native tool schemas and external provider tool projections | Runtime-specific exposure/materialization -> provider/native tool surface | Tool availability differs by runtime; native file-tool guidance is not automatically valid for Claude/Codex | Native resolver, neutral exposure helper, Claude/Codex MCP/provider adapters |

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Refactor` with behavior preservation.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Boundary Or Ownership Issue`.
- Refactor posture evidence summary: The composer is a shared server helper with runtime-specific consumers, but its contract has no runtime discriminator and its fixed sections include native tool workflow guidance. Investigation must decide whether to split universal primitives from runtime-specific sections or introduce an explicit prompt profile without making one runtime own another's provider contract.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `carpenter-prompt-composer.ts` | Same fixed sections are appended for every caller | Shared implementation currently conflates reuse with shared behavior | Define prompt profile/runtime boundary |
| Claude bootstrap/session | Composer result becomes SDK `systemPrompt` | Native-only guidance can affect Claude model behavior | Preserve current Claude prompt content and isolate changes |
| Codex bootstrap/thread | Composer result becomes Codex `baseInstructions` | Native-only guidance can affect Codex model behavior | Preserve current Codex prompt content and isolate changes |
| Native backend factory | Composer result becomes `AgentConfig` prompt | Native prompt has a clear backend owner | Keep native guidance under native scope |
| Runtime tool exposure paths | Tool exposure and prompt composition are separate | Prompt content must not be used as a capability detector | Keep exposure/tool ownership independent |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts` | Assemble ordered Carpenter prompt | Shared by all three runtime backends; no runtime kind input | Candidate boundary for shared primitives plus explicit runtime-specific composition |
| `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts` | Own fixed prompt section text | Contains both general workspace context and native-style file/Bash guidance | Split ownership or classify sections before editing |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Native AgentConfig construction | Consumes Carpenter prompt for native create/restore | Native runtime prompt owner/consumer |
| `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.ts` | Claude session bootstrap | Consumes Carpenter prompt as SDK system prompt | Must retain Claude-specific prompt contract |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex thread bootstrap | Consumes Carpenter prompt as Codex base instructions | Must retain Codex-specific prompt contract |
| `autobyteus-ts/src/tools/file/*` and `autobyteus-ts/src/tools/terminal/*` | Native tool implementations and schemas | Tool contracts are separate from server Carpenter prompt text | Determine whether any universal tool guidance belongs here or remains tool-schema-owned |
| `autobyteus-server-ts/src/agent-execution/shared/runtime-agent-tool-exposure.ts` | Runtime-neutral exposure normalization | Shared tool exposure does not imply shared prompt policy | Keep capability projection separate from prompt composition |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-15 | Setup | `git fetch origin --prune`; `git worktree add -b codex/runtime-specific-carpenter-prompt ... origin/personal` | New branch starts at finalized `origin/personal` commit `cd2420c60` | Investigation is isolated from the finalized ticket |
| 2026-08-15 | Trace | Read `carpenter-prompt-composer.ts` and all `composeCarpenterPrompt` call sites | Native, Claude, and Codex all receive the same fixed section constants | Current Carpenter fixed text is cross-runtime in implementation, even though tool scopes differ |
| 2026-08-15 | Trace | Read native factory prompt construction | `resolvedPrompt` is passed to `AgentConfig` for native runtime creation/restoration | Native path has a direct prompt owner boundary |
| 2026-08-15 | Trace | Read Claude bootstrap/session | Composer output is stored in Claude context and passed as SDK `systemPrompt` | External prompt behavior is materially affected by shared composer output |
| 2026-08-15 | Trace | Read Codex bootstrap/thread manager | Composer output is passed as `baseInstructions` into Codex thread configuration | External prompt behavior is materially affected by shared composer output |
| 2026-08-15 | Trace | Read current composer section order and native `autobyteus-ts` skill append path | Current native order is Agent Identity -> optional team sections -> Working Environment -> Bash Operating Practice -> File And Directory Practice; native skills are appended later as a terminal catalog | The native target should preserve this order while moving only shared section rendering ahead of the native-only suffix |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None yet; local source is authoritative for current construction.
- Version / tag / commit / freshness: Current dedicated branch at `origin/personal` commit `cd2420c60`.
- Relevant contract, behavior, or constraint learned: Claude SDK receives a system prompt field; Codex receives base instructions; native AgentConfig receives a prompt argument.
- Why it matters: The same source text crosses different provider prompt contracts, so runtime-neutral wording cannot be assumed safe.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static prompt-path investigation.
- Required config, feature flags, env vars, or accounts: None identified.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; dedicated `git worktree add`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- Current Carpenter prompt assembly is generally applied to all three runtime backends.
- The composer is a server-side shared implementation, not evidence that all prompt content is product-wide behavior.
- Runtime tool exposure is a separate boundary: native AutoByteus materializes native tools, while Claude/Codex use their provider/MCP projections.
- The main investigation question is ownership and scope, not adding more generic prompt text.
- Existing prompt injection seams are adequate; the change should select a scoped composition before the existing field rather than introduce a new provider injection mechanism.
- The native Carpenter flow retains its logical section order by composing shared Agent Identity/Team Instruction/Team Collaboration first, then native Working Environment/Bash/File guidance, then allowing `autobyteus-ts` to append the terminal configured-skills catalog.

## User Clarification And Current Analysis

The user clarified that the Carpenter model was conceived primarily for the native
AutoByteus runtime, whose system prompt and native tool contract are authored by
AutoByteus. Claude Agent SDK and Codex App Server have their own provider-native
tools, skill mechanisms, and operating guidance. The user expects the new ticket to
separate the small application context those runtimes need from native-only
operating policy, rather than applying the native prompt foundation to every
provider merely because the server currently reuses one composer.

The current evidence supports the following preliminary classification. This is an
investigation recommendation, not yet an approved design:

| Content | Preliminary scope | Rationale / boundary |
| --- | --- | --- |
| Agent Identity, including authored agent responsibilities | Shared semantic context | The selected AutoByteus agent definition is application identity and must remain recognizable in standalone and team runs regardless of provider. |
| Team Instruction | Shared for team runs | Authored team policy is application-owned and is not supplied by Claude/Codex merely by selecting those providers. |
| Team Collaboration | Shared for team runs, with provider projection | Current member identity, roster, and `send_message_to`/`delegate_task` protocol describe server-owned collaboration tools that are projected locally for native and through MCP for external runtimes. |
| Effective workspace identity | Shared fact, not necessarily shared wording | All adapters already pass an effective working directory/cwd. The current long `Working Environment` prose also describes the native skill/tool workflow and should not be copied to external providers without a demonstrated need. |
| Bash Operating Practice | Native AutoByteus only | The current wording is platform operating policy and is coupled to the native `run_bash`/file-tool workflow; external providers already own their shell/file guidance and may not expose those names. |
| File And Directory Practice | Native AutoByteus only | The section explicitly names `read_file`, `edit_file`, and `write_file` and describes their edit workflow; these are not a valid external-runtime capability assumption. |
| Configured Skills | Runtime-specific projection | Native appends its catalog through `autobyteus-ts`; Codex and Claude use provider discovery/materialization. The server should not inject native catalog prose or skill bodies into external prompts. |
| Provider-native operating/system guidance | Provider-owned | Codex/Claude SDK or their own project/user settings remain authoritative; this ticket should remove native leakage rather than rewrite their guidance. |
| Tool schemas, availability, approval, and path semantics | Runtime/tool exposure owners | Prompt prose must not become a capability detector or alter the separate exposure/projection contract. |

`submit_task_result` and `review_task_result` belong to the same shared
AutoByteus task-lifecycle domain, but they are not universally available to
every team member. Their guidance is role- and lifecycle-dependent: task agents
or task-team ingress members submit results, while the task review owner reviews
them. The design should keep those instructions provider-neutral and project
them through the shared MCP/native tool boundary when the current context makes
the tools available, rather than putting them in native Bash/file guidance or
pretending they are always present.

The preliminary ownership conclusion is that the composition split belongs in
`autobyteus-server-ts`, because that project resolves `AgentDefinition`,
`MemberTeamContext`, workspace paths, runtime kind, and provider bootstrap fields.
`autobyteus-ts` should continue to own native `AgentConfig` prompt consumption,
native skills-catalog appending, and native tool implementations/schemas. Moving
the cross-runtime composer into `autobyteus-ts` would make the native runtime
library own Claude/Codex policy it cannot execute or validate. A likely target
shape is shared server-side identity/team renderers plus an explicit native
AutoByteus composer; external adapters would receive only the approved shared
context and keep provider-native guidance in their own instruction boundaries.

Two points remain intentionally open until requirements approval and design work:

1. whether external runs need any additional minimal workspace fact beyond their
   already-supplied `cwd`/working-directory parameter; and
2. whether Claude's custom `systemPrompt` and Codex `baseInstructions` should use
   a provider-preserving append/preset mechanism rather than replacing a provider
   default. The current local adapter accepts a plain string, so this must be
   verified against the actual provider contract before implementation.

## Terminology Finding: Current `Team Runtime` Heading

The current `## Team Runtime` heading is implementation-oriented and can be
misread as provider/runtime configuration. Its content is actually generated
team-member collaboration context: the current member alias, communication
recipient roster, exact-run messaging rules, delegation targets, and the fixed
`send_message_to`/`delegate_task` protocols. It is distinct from authored
`## Team Instruction`, which contains stable team policy from `team.md`.

Naming recommendation: rename the prompt section to `## Team Collaboration` in
the new design. The content is broader than member identity alone: it also
contains communication and delegation protocols plus the relevant rosters. The
direct collaboration wording is explicit and avoids suggesting that the section
contains provider runtime settings. The rename must be treated as a prompt
contract/documentation/test update, not as a change to team-tool exposure.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: No persisted data is expected to change.
- Relevant code-model, serialization, semantic, or physical-store change: Prompt construction only.
- Normal readers and writers, including unknown/extra-field behavior: Not applicable.
- Representative direct-read or compatibility evidence: Not applicable.
- Required semantics and invariants preserved by direct use: `Yes` — preserve agent/team/runtime configuration.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: No migration or storage rewrite expected.
- Concrete benefit, cost, and risk of migration if it remains a candidate: Migration is not applicable.
- Existing migration framework or lifecycle constraints, only if migration may be required: Not applicable.

## Constraints / Dependencies / Compatibility Facts

- The finalized native default-tool ticket must remain closed; this ticket investigates prompt ownership/refactoring separately.
- Claude/Codex provider-native prompt and tool contracts are protected compatibility surfaces.
- `autobyteus-server-ts` currently owns the shared composer and backend integration; `autobyteus-ts` owns core native tool implementations/schemas. The correct split must be evidence-backed.
- Do not infer tool availability from prompt text, and do not use prompt text to mutate runtime exposure.
- Any runtime-specific prompt selection must preserve team context and agent identity behavior where those sections are genuinely shared.

## Open Unknowns / Risks

- Architecture review should confirm the explicit shared/native entrypoint split
  instead of a runtime-profile flag.
- Architecture review should confirm that Working Environment remains native-only
  because Claude/Codex already receive their working-directory fields and
  provider-specific skill setup.
- Documentation currently describes fixed prompt sections broadly and must be
  aligned during delivery; the exact server documentation inventory is recorded
  in the design spec.

## Architecture Feedback And Rework

`ARCH-REV-001` failed before implementation with two design-impact findings.
`ARCH-DI-001` required the primary spine inventory to continue through
`AgentRunManager` backend selection and the final native/session/thread outcome,
including the `MemberTeamContext` entry for mixed team/task-agent paths.
`ARCH-DI-002` required an exact disposition for
`autobyteus-server-ts/docs/modules/agent_tools.md` and a scoped terminology
cleanup that does not rewrite unrelated historical/runtime uses of `Team
Runtime`.

The revised design resolves these findings by classifying DS-001 as Bounded
Local, expanding DS-002 through DS-007 into complete standalone and mixed
team/task-agent create/restore spines for AutoByteus, Claude, and Codex, and
adding the exact documentation disposition table. The historical
`autobyteus-ts/docs/agent_team_runtime_and_task_coordination.md` document is
explicitly no-change. No production implementation has started.

## Notes For Architecture Reviewer

The requirements remain Design-ready after user refinement. The revised design
package now includes complete AgentRunManager/backend-selection and final
runtime/session/thread spines, explicit `MemberTeamContext` ingress for mixed
team/task-agent create/restore, the `agent_tools.md` prompt-contract update, and
a scoped `Team Runtime` cleanup inventory that preserves unrelated historical
terminology. It preserves the existing native/Claude/Codex injection fields,
retains native section order, and keeps runtime tool exposure and provider
approval/path behavior unchanged. No implementation has started.

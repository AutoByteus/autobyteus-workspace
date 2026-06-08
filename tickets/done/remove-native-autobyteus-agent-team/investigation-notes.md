# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Deep investigation complete; requirements refined; design spec drafted for user review
- Investigation Goal: Determine the current ownership and code paths for AutoByteus team communication remnants, especially `send_message_to`, and design a server-owned communication layer that lets `autobyteus-ts` drop native agent-team code while preserving mixed-team communication behavior.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The behavior target is narrow, but the cleanup crosses runtime tools, server team execution, package exports, tests, and docs.
- Scope Summary: Stack a follow-up cleanup ticket on the mixed-team-manager simplification branch to move AutoByteus team communication ownership fully to `autobyteus-server-ts` and delete native `autobyteus-ts/src/agent-team/**` remnants.
- Primary Questions To Resolve:
  - How is `send_message_to` currently registered/executed for AutoByteus, Codex, and Claude members?
  - Which parts of `autobyteus-ts/src/agent-team/**` remain actively imported by source/tests/docs?
  - Where should AutoByteus server-owned `send_message_to` adapter live?
  - Which native utilities must be relocated rather than deleted?
  - How should inbound inter-agent messages be formatted once native `TeamCommunicationContext` is gone?

## Request Context

The user wants a new stacked ticket, not a boot merge into the current ticket. The base should be the current mixed-team-manager simplification branch because the cleanup depends on the current architecture where `MixedTeamManager` is the universal team manager. The user explicitly agrees with the target ownership:

```text
autobyteus-ts
  no native agent-team
  no TeamManifestInjectorProcessor
  no native TeamCommunicationContext
  no native send-message-to team routing

autobyteus-server-ts
  owns team member context
  owns team prompt construction
  owns send_message_to routing
  owns mixed team orchestration
```

The team communication capability itself must remain.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team`
- Current Branch: `codex/remove-native-autobyteus-agent-team`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team`
- Bootstrap Base Branch: `codex/mixed-team-manager-simplification-analysis`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-07; local and remote base refs both resolved to `bbd34030eb35fae528658745f1f7c9a7343f54f5`.
- Task Branch: `codex/remove-native-autobyteus-agent-team`
- Expected Base Branch (if known): `codex/mixed-team-manager-simplification-analysis`
- Expected Finalization Target (if known): stacked on `codex/mixed-team-manager-simplification-analysis`; ultimate integration target expected to follow project workflow after the base ticket lands.
- Bootstrap Blockers: None at bootstrap time.
- Notes For Downstream Agents: This is intentionally stacked on the mixed team manager simplification branch. Do not rebase to `origin/personal` without first preserving the base-ticket dependency.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-07 | Command | `git fetch origin --prune` | Refresh base refs before creating stacked task branch | Fetch completed successfully | No |
| 2026-06-07 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/mixed-team-manager-simplification-analysis status --short --branch` | Verify current base ticket worktree state | Base branch `codex/mixed-team-manager-simplification-analysis` tracks `origin/codex/mixed-team-manager-simplification-analysis` with no reported divergence | No |
| 2026-06-07 | Command | `git rev-parse HEAD` and `git rev-parse origin/codex/mixed-team-manager-simplification-analysis` | Verify local and remote base commit equality | Both resolved to `bbd34030eb35fae528658745f1f7c9a7343f54f5` | No |
| 2026-06-07 | Command | `git worktree add -b codex/remove-native-autobyteus-agent-team /Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team codex/mixed-team-manager-simplification-analysis` | Create dedicated stacked task worktree/branch | Worktree created at requested path, HEAD `bbd34030`, branch `codex/remove-native-autobyteus-agent-team` | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Pending detailed investigation.
- Current execution flow: Expected current split is server-owned communication for Codex/Claude and native AutoByteus `SendMessageTo` using native `TeamCommunicationContext` bridge back into server `MemberTeamContext`; needs confirmation on the new task branch.
- Ownership or boundary observations: The desired design has one server-owned team communication spine; native AutoByteus team communication remnants are legacy after the base branch.
- Current behavior summary: Pending detailed investigation.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / Cleanup
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; Duplicated Policy Or Coordination; Legacy Or Compatibility Pressure
- Refactor posture evidence summary: The base branch makes server `MixedTeamManager` inclusive of all team runtime combinations. Native `autobyteus-ts` team ownership should be removed to avoid duplicate communication and prompt/routing concepts.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User direction | User confirms team communication remains, but native `autobyteus-ts` ownership should go away | Confirms cleanup target and rejects capability removal | No |
| Base branch bootstrap | New branch created from mixed-team-manager simplification | Cleanup can depend on server mixed team spine | No |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent-team/**` | Native AutoByteus team package | Pending source investigation | Candidate for deletion/removal from public surface |
| `autobyteus-ts/src/agent/message/send-message-to.ts` | Native AutoByteus `send_message_to` tool | Pending source investigation | Candidate for server-side replacement/removal |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/**` | Server mixed team runtime | Pending source investigation | Expected target spine for delivery |
| `autobyteus-server-ts/src/agent-team-execution/services/**send-message**` | Server communication helpers | Pending source investigation | Candidate common parser/request-builder ownership |
| `autobyteus-server-ts/src/agent-execution/backends/{codex,claude}/team-communication/**` | Runtime-specific server adapters | Pending source investigation | Existing model for AutoByteus adapter consistency |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/**` | AutoByteus server backend | Pending source investigation | Candidate home for AutoByteus server adapter |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |

## External / Public Source Findings

No external/public sources consulted yet. This task is internal repository architecture work.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Unknown pending investigation.
- Required config, feature flags, env vars, or accounts: Unknown pending investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add -b codex/remove-native-autobyteus-agent-team ...`.
- Cleanup notes for temporary investigation-only setup: Dedicated worktree is the authoritative ticket workspace.

## Findings From Code / Docs / Data / Logs

Pending detailed investigation.

## Constraints / Dependencies / Compatibility Facts

- This ticket is stacked on `codex/mixed-team-manager-simplification-analysis`.
- Team communication capability must remain available.
- The cleanup should avoid backward-compatibility wrappers that preserve native AutoByteus team ownership, unless an explicit temporary adapter is justified and bounded.

## Open Unknowns / Risks

- Whether any downstream package/test/docs still depend on native `autobyteus-ts/agent-team` exports.
- Whether AutoByteus runtime supports a clean dynamic/server-provided tool adapter shape equivalent to Codex/Claude.
- Whether deleting native `send_message_to` requires changes in default tool registry, package exports, or prompt/tool availability configuration.
- Whether any `agent-team` utility should move to neutral/server-owned paths.

## Notes For Architect Reviewer

User approved the design direction for architecture review on 2026-06-07; package is ready for architecture reviewer handoff.

## Deep Investigation Update - 2026-06-07

### Source Log Additions

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-07 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Reload canonical design rules before target design | Confirms spine-first design, authoritative boundary rule, explicit removal policy, no compatibility wrappers | No |
| 2026-06-07 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` sections 2-4 | Reload runtime/team orchestration examples | Team orchestration example confirms `TeamRun` owns team-level coordination while member `AgentRun`s own runtime lifecycle | No |
| 2026-06-07 | Command | `rg -n "autobyteus-ts/agent-team" autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-ts/src autobyteus-ts/tests` | Find active external imports into native `agent-team` package | Active server imports are mostly `team-local-definition-id`; AutoByteus backend imports native `InterAgentMessageRequestEvent` and `TeamCommunicationContext`; tests import both utility and native event | Yes |
| 2026-06-07 | Command | `rg -n "from ['\"](\.\./)+agent-team" autobyteus-ts/src autobyteus-ts/tests` | Find runtime-package relative dependencies on native `agent-team` | `agent/message/send-message-to.ts` and `agent/pipelines/agent-input-pipeline.ts` import native team communication context/events; native team tests cover the deleted tree | Yes |
| 2026-06-07 | Code | `autobyteus-ts/src/agent/message/send-message-to.ts` | Inspect current native AutoByteus `send_message_to` implementation | Native tool validates args locally, resolves native `TeamCommunicationContext`, emits `InterAgentMessageRequestEvent`, and returns success after dispatch request | Replace with server-owned AutoByteus tool |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/codex-send-message-dynamic-tool-registration.ts` | Inspect Codex server-owned adapter | Codex already uses server parser/validator, `MemberTeamContext`, delivery request builder, and `deliverInterAgentMessage` | Reuse as pattern |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/team-communication/claude-send-message-tool-call-handler.ts` | Inspect Claude server-owned adapter | Claude already uses same parser/validator and delivery request builder, plus runtime-specific approval/event emission | Reuse as pattern |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts` | Inspect shared server argument parsing | Supports snake/camel aliases, `reference_files`, and task-agent revision fields; validation is already server-side | Reuse for AutoByteus server tool |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-delivery-request-builder.ts` | Inspect canonical delivery request construction | Resolves `recipient_name` from `MemberTeamContext.communicationRecipients`, builds sender/recipient endpoints, supports task-agent run targeting | Reuse for AutoByteus server tool |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Inspect canonical delivery spine | `deliverInterAgentMessage` normalizes runtime participants, publishes communication payload, attaches recipient input trace, dispatches to member handle, and handles parent-boundary routing | Target delivery owner confirmed |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.ts` | Inspect target member delivery | `deliverInterMemberMessage` uses `InterAgentMessageRouter` to post a server-built `AgentInputUserMessage` to the target `AgentRun` | Confirms runtime-agnostic target delivery |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-runtime-builders.ts` | Inspect runtime-visible recipient message construction | Server already builds visible content and metadata for recipient input; target AutoByteus does not need native `InterAgentMessageReceivedEvent` for server-delivered messages | Remove native resolver dependency from agent pipeline |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Inspect AutoByteus member tool/prompt construction | Current base ticket composes server prompts and skips `TeamManifestInjectorProcessor`, but still builds native-compatible `initialCustomData.teamContext` with native `communicationContext` | Refactor context shape |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` | Inspect current AutoByteus bridge | Imports native `InterAgentMessageRequestEvent` and native `TeamCommunicationContext`; converts native event back into server delivery request | Replace/delete after server-owned tool is introduced |
| 2026-06-07 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/*` | Inspect existing server-owned AutoByteus tool pattern | Task delegation tools subclass `autobyteus-ts` `BaseTool` in server code and read server-provided team context from `customData`; registered through server startup | Good model for server-owned AutoByteus `send_message_to` |
| 2026-06-07 | Code | `autobyteus-ts/src/tools/register-tools.ts` and `autobyteus-ts/src/agent/factory/agent-factory.ts` | Inspect native tool registry bootstrapping | `AgentFactory` always registers native runtime tools; native `registerTools` currently registers `SendMessageTo` | Remove native registration and add server registration |
| 2026-06-07 | Command | `find autobyteus-ts/src/agent-team -type f | wc -l` | Estimate native package removal size | Native agent-team tree has 51 source files | Delete in scope |
| 2026-06-07 | Command | `find autobyteus-ts/tests/unit/agent-team autobyteus-ts/tests/integration/agent-team -type f | wc -l` | Estimate native test removal size | Native agent-team tests have 34 files | Delete/replace with server-side tests |
| 2026-06-07 | Code | `autobyteus-ts/src/agent-team/utils/team-local-definition-id.ts` and usage scan | Determine whether anything under native tree must move | The utility is actively used by server definition providers/tests and one public-surface test; it is definition/server-owned, not runtime team-owned | Move to server definition utilities, update imports |

### Current Behavior / Current Flow - Detailed

#### Current AutoByteus send-message flow

```text
AutoByteus LLM tool call
  -> autobyteus-ts SendMessageTo BaseTool
  -> resolveTeamCommunicationContext(context.customData.teamContext)
  -> native InterAgentMessageRequestEvent
  -> server-built native-compatible communicationContext.dispatchInterAgentMessageRequest
  -> buildInterAgentMessageDeliveryRequestFromRecipientName(MemberTeamContext)
  -> memberTeamContext.deliverInterAgentMessage
  -> MixedTeamManager.deliverInterAgentMessage
```

This works, but it is architecturally split: the tool and request event live in `autobyteus-ts`, while the real recipient resolution and delivery authority are already server-side.

#### Current Codex / Claude send-message flow

```text
Codex/Claude runtime tool call
  -> runtime-specific server adapter
  -> parseSendMessageToToolArguments / validateParsedSendMessageToToolArguments
  -> buildInterAgentMessageDeliveryRequestFromRecipientName(MemberTeamContext)
  -> memberTeamContext.deliverInterAgentMessage
  -> MixedTeamManager.deliverInterAgentMessage
```

Codex and Claude already use the target ownership model. AutoByteus is the outlier.

#### Current target delivery flow after any runtime calls `deliverInterAgentMessage`

```text
MixedTeamManager.deliverInterAgentMessage
  -> resolve sender and recipient team contexts
  -> normalize sender/recipient participant runtime details
  -> publish TeamRun communication event
  -> attach recipient input trace / dedupe metadata
  -> MixedAgentMemberHandle or MixedSubTeamMemberHandle
  -> InterAgentMessageRouter / child TeamRun postMessage
  -> AgentRun.postUserMessage(AgentInputUserMessage)
```

The recipient-visible message is already built in server code by `buildInterAgentDeliveryInputMessage`, including sender metadata and reference files. Therefore server-delivered messages do not need native `InterAgentMessageReceivedEvent` or native `TeamCommunicationContext`.

### Design Health Assessment Evidence - Detailed

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Codex/Claude server adapters | Both already use server parser/validator + `MemberTeamContext` + delivery request builder | There is already one good server-owned communication contract; AutoByteus should join it | Yes |
| AutoByteus native `SendMessageTo` | It validates and dispatches through a native team context/event before returning to server | Duplicated coordination and boundary bypass: native runtime package still pretends to own team routing | Yes |
| `MixedTeamManager.deliverInterAgentMessage` | Owns canonical communication event emission, parent-boundary routing, member handle dispatch, task-agent target dispatch | This is the authoritative boundary for team message delivery | No |
| `autobyteus-team-communication-context-builder.ts` | Server constructs a native-compatible context solely so native AutoByteus tool can call back into server | Legacy compatibility pressure; should be removed rather than preserved | Yes |
| `autobyteus-ts/src/agent-team/**` source/test tree | 51 source files and 34 native tests remain, but base ticket no longer uses native team runtime for server teams | Native package is residual design debt after mixed-only server team manager | Yes |
| `team-local-definition-id` usage | Server definition providers still import the utility from native `agent-team` path | File placement drift; utility should move to server definition subsystem | Yes |
| `agent-input-pipeline.ts` | Imports native `resolveTeamCommunicationContext` only to resolve display names for `InterAgentMessageReceivedEvent` | Must be decoupled before deleting native context; server-delivered input already includes sender visible content | Yes |

### Relevant Files / Components - Detailed

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/agent/message/send-message-to.ts` | Native AutoByteus `send_message_to` tool | Runtime package tool owns team request validation and native event dispatch | Delete or remove from public exports/registry; replace with server-owned tool |
| `autobyteus-ts/src/tools/register-tools.ts` | Native tool registry bootstrap | Registers native `SendMessageTo` | Remove native registration so server owns the tool name |
| `autobyteus-ts/src/agent/message/index.ts` | Agent message exports | Exports `SendMessageTo` | Remove export |
| `autobyteus-ts/src/index.ts` | Public surface root | Exports native `agent-team` context/factory/runtime/streaming | Remove native agent-team exports |
| `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts` | Converts inbound user/inter-agent events to LLM user messages | Imports native team context for display-name lookup | Remove native dependency; rely on event/message metadata or server-formatted content |
| `autobyteus-ts/src/agent-team/**` | Native team runtime/orchestration package | No longer desired as active package | Delete in scope after moving utility |
| `autobyteus-ts/src/agent-team/utils/team-local-definition-id.ts` | Team-local definition ID parsing/building | Used primarily by server definition providers/tests | Move to server definition utilities |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` | Builds AutoByteus `AgentConfig` from server `AgentRunConfig` | Current best insertion point for per-member bound server-owned AutoByteus `send_message_to` tool | Modify to create/bind server-owned tool when configured and enabled |
| `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-team-communication-context-builder.ts` | Native-compatible bridge from server `MemberTeamContext` to native `TeamCommunicationContext` | Sole remaining server dependency on native communication context/event | Replace with server-owned managed team context builder |
| `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts` | Shared server parser/validator for send-message tool args | Already used by Codex/Claude | Reuse for AutoByteus server tool |
| `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-delivery-request-builder.ts` | Canonical server request builder | Already supports recipient roster lookup and task-agent run targeting | Reuse for AutoByteus server tool |
| `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Canonical team message delivery owner | Publishes communication event, traces recipient input, dispatches to target handle | Keep as authoritative communication boundary |
| `autobyteus-server-ts/src/agent-tools/task-delegation/*` | Existing server-owned AutoByteus tools | Demonstrates server-owned `BaseTool` subclasses registered via server startup | Use same pattern for AutoByteus send-message tool |

### Constraints / Dependencies / Compatibility Facts - Detailed

- `send_message_to` public tool name must remain stable for team members.
- Team communication capability remains required.
- Runtime-specific tool exposure mechanics may differ; ownership of parsing, recipient resolution, and delivery must not differ.
- AutoByteus `BaseTool` subclasses may live in `autobyteus-server-ts`; the server already does this for task delegation tools.
- AutoByteus tool manifest and API tool-call schemas still rely on `defaultToolRegistry`; server-owned `send_message_to` must be registered in the shared runtime registry during server startup and/or ensured by AutoByteus backend construction.
- A per-agent bound server-owned AutoByteus tool instance is cleaner than putting a full server `MemberTeamContext` or function closure in `customData`; task-delegation can keep primitive team context data in `customData`.
- `AgentInputUserMessage` server delivery already includes visible sender content and metadata; native `InterAgentMessageReceivedEvent` may remain as a generic agent event only if it no longer imports native team context.

### Open Unknowns / Risks After Deep Read

- Need implementation to verify whether deleting native `agent-team` root exports causes expected public-surface updates only, not unexpected build breaks in generated package exports.
- Need validation to confirm startup ordering always registers server-owned `send_message_to` before AutoByteus agent prompt/tool schema generation, or backend should explicitly ensure registration.
- Need tests to confirm AutoByteus `send_message_to` bound server tool emits the same Team Communication projection as Codex/Claude.

## Round 4 Design-Impact Investigation Addendum (2026-06-08)

Supersession note: the task-agent revision-state findings in this section are historical context. The later `Round 4 Simplified Task-Agent Investigation Addendum (2026-06-08)` supersedes them for task-agent design. The committed-delivery and provider same-runtime cohort findings remain current.

### Design reset trigger

API/E2E Round 4 routed this ticket back to `solution_designer` as `Design Impact / cross-cutting runtime coordination review`. The latest authoritative validation report is `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/api-e2e-validation-report.md`, and the full live matrix log is `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/validation-logs/round4-live-e2e/full-real-runtime-matrix.log`.

This supersedes the previous local-fix assumption for the remaining task-agent/Codex/Claude live-runtime failures. The original native AutoByteus team-removal direction remains correct, but the server-owned mixed-team architecture needs stronger runtime coordination owners.

### Sources consulted for the reset

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-08 | Design Reference | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Re-apply shared architecture rules after repeated E2E instability | The authoritative-boundary rule and spine inventory require explicit owners for lifecycle, sequencing, and event/return spines; false projection and hidden runtime policy are design smells | Reflected in addendum |
| 2026-06-08 | Design Reference | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` | Use runtime/event-loop/state-machine examples for clean design shape | Agent runtime examples distinguish top-level run spine from bounded runtime loops and provider adapters | Reflected in addendum |
| 2026-06-08 | Validation Report | `tickets/in-progress/remove-native-autobyteus-agent-team/api-e2e-validation-report.md` | Understand latest authoritative API/E2E route | Round 4 failed task-agent revision, all-Codex same-runtime, and all-Claude same-runtime; all-AutoByteus/mixed/nested passed | Yes: design rework |
| 2026-06-08 | Log | `validation-logs/round4-live-e2e/full-real-runtime-matrix.log` with `rg` over task-agent/Codex/Claude failure terms | Check whether failures point to local narrow defects or missing coordination semantics | Communication projection can be inserted for a concrete task-agent receiver while the target does not revise; Codex/Claude timeouts are live same-runtime coordination symptoms, not native AutoByteus cleanup problems | Yes: design rework |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Inspect delivery commit ordering | `deliverInterAgentMessage` publishes `COMMUNICATION` before calling task-agent or member handle delivery; this can make UI/projection look successful before recipient input acceptance is proven | Yes |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` and `mixed-task-agent-handle-recovery-cache.ts` | Inspect task-agent lifecycle/recovery owner | Registry owns normal members, task-agent handles, and recovery cache; awaiting-acceptance/revision lifecycle is represented as map/cache mechanics rather than a task-agent lifecycle owner | Yes |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts`, `task-delegation-ledger.ts`, `task-delegation-settlement-coordinator.ts`, `task-delegation-completion-notifier.ts` | Inspect task-agent completion/acceptance/revision state | Completion moves ledger to `awaiting_acceptance` and tells delegator to use `send_message_to` with task-agent IDs, but no explicit task-agent revision coordinator owns the awaiting/revision transition | Yes |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-manager.ts`, `codex-client-thread-router.ts`, `codex-app-server-client-manager.ts` | Inspect all-Codex same-runtime policy | Team-member Codex client sharing is hidden as `threadClientScopeKey(memberTeamContext) => null`; router drops ambiguous/unidentified provider events when multiple threads are registered unless thread/turn correlation exists | Yes |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.ts`, `claude-session.ts` | Inspect all-Claude same-runtime policy | Claude sessions share global SDK/session management; team-run multi-session cleanup is not an explicit owner and Round 4 afterEach timeout points at bounded cleanup/lifecycle gaps | Yes |

### Updated design findings

- The native AutoByteus team-removal work is not the source of the remaining failures. Passing all-AutoByteus, mixed, and nested E2E scenarios support the server-owned prompt/tool cleanup direction.
- The next design gap is **delivery/lifecycle coordination after the server receives a tool call**. The architecture currently proves that a tool call can reach `MixedTeamManager`; it does not prove that the target member or concrete task-agent is activation-ready, accepts the input, and remains lifecycle-addressable through revision/settlement.
- `MixedTeamManager.deliverInterAgentMessage` currently owns too much low-level delivery detail while also publishing communication projection before target acceptance. This violates the intended clean spine: the manager should delegate delivery commit semantics to a dedicated owner.
- Task-agent revision should not be a side effect of a registry map lookup. A task-agent instance is a concrete runtime subject with explicit lifecycle states (`active`, `awaiting_acceptance`, `revision_requested`, `settling`, `settled`).
- Same-runtime Codex/Claude execution needs provider-specific team runtime cohort owners. Hidden `null` scope sharing for Codex and global active-query/session handling for Claude are not clean enough for all-Codex/all-Claude live team execution.

### New design artifact

Created `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round4-design-impact-rework.md` with the revised data-flow spines, ownership map, target file responsibilities, dependency rules, and validation implications.


## Round 4 Simplified Task-Agent Investigation Addendum (2026-06-08)

### Trigger

After the first Round 4 design-impact rework, the user challenged the need for a separate task-agent revision lifecycle and proposed a simpler architecture: task-agents should use `send_message_to` for progress, blocker, completion, and revision communication; the original delegator should use `accept_task` when satisfied. This addendum records the reinvestigation and supersedes the earlier task-agent-specific proposal that introduced `TaskAgentRevisionCoordinator`, `mark_task_completed`, `mark_task_failed`, `awaiting_acceptance`, and `revision_requested` as target concepts.

### Sources consulted for the simplified design

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-08 | Design Reference | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Re-apply spine-first, ownership-first design guidance | The data-flow spine and authoritative-boundary rules favor one communication owner and explicit removal of redundant paths over layering more revision coordinators on legacy result tools | Reflected in updated design |
| 2026-06-08 | Design Reference | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` | Confirm runtime/team orchestration shape | Team-run examples distinguish high-level team manager from member runtime and return/event spines; bounded local owners should not become hidden peer coordinators | Reflected in updated design |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-contract.ts` | Inspect task-specific tool surface | Tool list currently includes `delegate_tasks`, `mark_task_completed`, `mark_task_failed`, `accept_task` | Remove result tools from target design |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Inspect model-facing task tool descriptions | `delegate_tasks` tells models to wait for framework terminal/completion notification; result-tool entries own completion/failure reporting | Update descriptions to send-message communication + parent acceptance |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-parameter-schemas.ts` and `task-delegation-tool-input-parsers.ts` | Inspect schemas/parsers needing removal | Dedicated schemas/parsers exist for `mark_task_completed` and `mark_task_failed`; `accept_task` assumes generated task id from completion notification | Remove result schemas/parsers; update accept/delegate descriptions |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-record.ts` | Inspect task state model and identities | Statuses are `not_started`, `queued`, `awaiting_acceptance`, `accepted`, `failed`; caller identity carries `taskAgentInstanceId`, `taskAgentRunId`, `taskId`, `logicalMemberRouteKey` | Tighten lifecycle to `not_started -> active -> accepted`; remove redundant model-facing instance id |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-ledger.ts` | Inspect transition rules | `updateStatus(completed)` maps to `awaiting_acceptance`; `acceptTask` requires `awaiting_acceptance`; active work checks are tied to queued/awaiting | Replace with `markActive` and `acceptActiveTask`; remove completed/failed transitions |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Inspect result-tool service path | `markTaskCompleted`, `markTaskFailed`, and `reportTaskAgentResult` mutate ledger and notify delegator; failure can request settlement | Remove result-tool methods and notifier dependency; keep delegate/accept only |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-completion-notifier.ts` | Inspect completion notification protocol | Notifier posts system message instructing delegator to call `send_message_to` with raw `task_agent_id`/`task_agent_run_id` for revision | Remove notifier; task-agent sends normal Team Communication messages directly |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Inspect task-agent instructions | Historical Round 4 finding: work packet instructed result tools. Round 5 later supersedes dynamic reply alias wording. | Replace result tools with `send_message_to`; Round 5 uses `target_agent_run_id` where exact task-agent addressing is required |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-run-instruction-composer.ts` | Inspect runtime prompt protocol | Prompt advertises result tools and raw task-agent revision fields | Replace with simplified task protocol: delegate, communicate, accept |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-tools/team-communication/send-message-to-parameter-schema.ts`, `send-message-to-tool-contract.ts`, and `send-message-to-tool-argument-parser.ts` | Inspect send-message task-agent selector fields | Historical Round 4 finding: raw `task_agent_run_id` / `task_agent_id` revision fields were undesirable. Round 5 refines the replacement from dynamic aliases to general `target_agent_run_id`. | Remove task-specific selector fields; expose exactly-one `recipient_name` OR `target_agent_run_id` |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-delivery-request-builder.ts` | Inspect recipient resolution boundary | Current builder resolves only static `MemberTeamContext.communicationRecipients` unless raw task-agent run id is supplied | Delivery must support dynamic task-agent aliases through a server-owned directory/resolver |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-manager.ts` | Inspect committed delivery ordering | Current delivery publishes communication payload before member/task-agent input acceptance; Round 4 showed false-success projection risk | Keep committed-delivery coordinator requirement |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/members/mixed-team-member-registry.ts` and `mixed-task-agent-handle-recovery-cache.ts` | Inspect task-agent handle lifecycle | Registry/caches can start/recover task-agent handles by run id, but no clear task-agent directory owns dynamic aliases and active/settled state | Add `TaskAgentDirectory`; cache is not authoritative lifecycle owner |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/task-agent-instance.ts` and `task-agent-instance-identity.ts` | Inspect identity shape | `taskAgentInstanceId` is `task_agent_${taskId}` while `taskAgentRunId` is the concrete runtime id; the instance id is redundant for routing | Tighten to `taskId`, `taskAgentRunId`, and dynamic `taskAgentRecipientName` |
| 2026-06-08 | Test | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Inspect failing live task delegation scenario | E2E currently expects worker to call `mark_task_completed`, coordinator to send raw `task_agent_run_id` revision, and worker to call `mark_task_completed` again | Rewrite around task-agent `send_message_to` completion/revision reports and parent `accept_task` |

### Simplified design findings

- The current result-tool protocol creates unnecessary complexity: a task-agent can already communicate with the delegator using `send_message_to`, so completion and blocker reports do not need separate task result tools.
- Parent/delegator review is the real terminal decision. Therefore `accept_task` should be the only task-specific terminal action.
- Revision is not a state machine. If the delegator wants changes, it sends a normal `send_message_to` message to the active task-agent; Round 5 refines the target selector to `target_agent_run_id` rather than a dynamic recipient alias.
- `taskAgentInstanceId` and `taskAgentRunId` are currently overlapping identity concepts. The clean model needs `taskId` for the business task and `taskAgentRunId` / model-facing `target_agent_run_id` for exact concrete runtime communication; dynamic aliases are superseded by Round 5.
- `MemberTeamContext.communicationRecipients` is static at member bootstrap, but task-agent recipients are created later by `delegate_tasks`. Therefore recipient resolution must become a committed-delivery concern that can consult both the static roster and a team-run-scoped `TaskAgentDirectory`.
- Team Communication projection must remain a committed-delivery record. Invalid, external, or settled exact-run targets must reject before projection.

### New design artifact

Created `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round4-simplified-task-agent-communication-design.md` with data-flow spines for every in-scope task-agent case, revised ownership, file mapping, dependency rules, prompt protocol, and validation plan.

## Round 5 Send-Message Addressing Investigation Addendum (2026-06-08)

### Trigger

After the simplified Round 4 task-agent design, the user raised a cleaner addressing model: `send_message_to` should support either a logical roster recipient by name or a concrete target agent run id. This avoids representing a task-agent run as a fake dynamic recipient name and makes exact-run communication a general team capability.

### Sources consulted for the Round 5 reset

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-08 | Design Reference | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/design-principles.md` | Re-apply spine-first and authoritative-boundary rules before correcting the addressing model | The selector shape must derive from ownership. Runtime adapters must not bypass the mixed-team delivery boundary or depend on AgentRun internals directly. | Reflected in Round 5 design |
| 2026-06-08 | Design Reference | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/skills/solution-designer/references/design-examples.md` | Confirm interface-boundary and runtime-flow shape | Strong examples use explicit identity shapes at boundaries and avoid overloaded/generic selector semantics. | Reflected in Round 5 design |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-contract.ts` | Inspect current model-facing send-message wording | Current contract says `recipient_name` can be a static teammate or dynamic task-agent alias such as `worker/task_0001`. | Replace with exactly-one `recipient_name` OR `target_agent_run_id` wording |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-tools/team-communication/send-message-to-parameter-schema.ts` | Inspect AutoByteus schema surface | Current schema makes `recipient_name` required and has no `target_agent_run_id`. | Make both selectors individually optional; parser enforces XOR |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts` | Inspect shared parser/validator | Current parser only returns `recipientName` and validation requires non-empty `recipient_name`. | Add `targetAgentRunId` and exactly-one selector validation |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-delivery-request-builder.ts` | Inspect request construction | Current builder falls back to a fabricated dynamic recipient participant when the name is not in the static roster. This lets invalid names travel too far. | Build unresolved delivery intent with explicit selector; stop fabricated unknown-name participant fallback |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-member-delivery-coordinator.ts` | Inspect current delivery target resolution | Current coordinator resolves task-agent recipients by `requestedRecipientName` through `TaskAgentDirectory.resolveRecipientName`. | Introduce resolver that resolves by logical name or exact reachable run id |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-directory.ts` | Inspect task-agent identity storage | Directory already tracks `taskAgentRunId` and has `resolveTaskAgentRunId`; the dynamic `taskAgentRecipientName` is not needed as the model-facing routing identity. | Use `target_agent_run_id` for active task-agent exact-run targeting; remove/demote alias helper |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-team-roster-manifest.ts` | Inspect model-facing roster instructions | Roster says `recipient_name` must exactly match allowed names, which conflicts with exact-run send-message mode. | Reframe roster as address book: recipient names plus exact-run rule |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-work-packet-renderer.ts` | Inspect task-agent work-packet instructions | Current partial implementation tells task-agents to use dynamic aliases such as `worker/task_0001`. | Replace with task-agent `target_agent_run_id` and delegator reply selector fields |

### Round 5 findings

- The clean business model has two addressing modes, not one overloaded recipient string: logical roster recipient (`recipient_name`) and exact concrete run (`target_agent_run_id`).
- `target_agent_run_id` is a general exact-run selector, not a task-only selector. Active task-agents are one concrete use case.
- Exact-run delivery must remain inside the current/reachable team communication boundary. It must not become arbitrary global AgentRun messaging.
- Runtime adapters should parse and forward the selector; they must not resolve target runs or call `AgentRunManager` directly.
- The delivery builder should construct an unresolved intent carrying a target selector. A dedicated mixed-team resolver/coordinator should perform roster/exact-run lookup and commit projection only after target input acceptance.
- Dynamic task-agent aliases such as `worker/task_0001` should not be model-facing routing identities. If retained internally at all, they are display-only and non-authoritative.
- The roster should be an address book: list valid `recipient_name` values, then explain that task packets/events/messages may provide `target_agent_run_id` for exact-run replies or feedback.

### New/updated design artifact

Created `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round5-send-message-addressing-design.md` and updated the main design spec with a Round 5 addendum. This supersedes Round 4 model-facing dynamic alias instructions while preserving the simplified task lifecycle and server-owned mixed-team communication spine.

## Round 8 CR-006 Delivery-Intent Boundary Investigation Addendum (2026-06-08)

### Trigger

Fresh code review Round 8 routed this ticket back as `Fail / Design Impact`. CR-006 found that `recipient_name` resolution still happens above the mixed delivery boundary, preserving both `request.target` and a pre-resolved `request.recipient` endpoint. CR-007 found hidden target selector aliases in the parser.

### Sources consulted for Round 8 reset

| Date | Source Type | Exact Source / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-08 | Code Review Report | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/code-review-report.md` | Understand CR-006/CR-007 failure and classification | CR-006 is Design Impact: target resolution split across request builder and mixed resolver. CR-007 parser aliases are local cleanup but part of clean target contract. | Design rework completed |
| 2026-06-08 | Review Log | `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/validation-logs/round8-fresh-code-review/fresh-review-checks.log` | Inspect evidence from source scans/tests | Scan shows builder still constructs `recipient` endpoint and parser still reads `recipientName` / `targetAgentRunId`. | Design validation plan updated |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/inter-agent-message-delivery-request-builder.ts` | Inspect current request builder | Lines 15-23 resolve `recipient_name` via `memberTeamContext.communicationRecipients`; lines 95-102 construct recipient endpoint; lines 118-132 construct placeholder exact-run participant. | Replace with unresolved intent builder |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/delivery/team-message-recipient-resolver.ts` | Inspect intended resolver owner | Resolver currently dispatches on `request.target`, but `resolveByRecipientName` then calls `memberRegistry.resolveContext(request.recipient.selector)` and builds endpoint from `request.recipient`. | Resolve directly from target selector and sender-specific roster inside mixed boundary |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/domain/inter-agent-message-delivery.ts` | Inspect request shape | `InterAgentMessageDeliveryRequest` includes both `target: TeamMessageTargetSelector` and `recipient: InterAgentMessageDeliveryEndpoint`. | Split unresolved intent from resolved request |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/send-message-to-tool-argument-parser.ts` | Inspect parser aliases | Parser reads canonical fields plus `recipient`, `recipientName`, and `targetAgentRunId` target aliases. | Remove target selector aliases |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/services/member-communication-roster-builder.ts` and `member-team-context-builder.ts` | Check how roster-name resolution can move below the boundary | Roster construction is already server-owned and can be reused/derived inside mixed delivery from sender context, current members, and parent boundary. | Resolver should own this lookup |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-parent-boundary-delivery-request.ts` | Inspect parent-boundary normalization | Current normalizer rewrites sender only, but operates on a request shape that may still contain recipient endpoint. | Adjust to normalize unresolved intent and let parent boundary resolve target |

### Round 8 findings

- CR-006 is a valid design-impact finding, not merely a local defect. The implementation still has two target representations: the approved Round 5 `target` selector and the old pre-resolved `recipient` endpoint.
- The request builder is doing policy work: roster-name lookup and placeholder exact-run participant construction. That competes with `TeamMessageRecipientResolver` and violates the Authoritative Boundary Rule.
- The correct target design is a split between unresolved intent and resolved request. Runtime adapters/builders submit only `InterAgentMessageDeliveryIntent`; `TeamMessageRecipientResolver` produces the resolved recipient endpoint inside mixed delivery.
- Parent-boundary delivery should forward unresolved intents. The child boundary can prove the parent boundary is reachable and normalize the sender, but the parent boundary must resolve the target selector in its own context.
- CR-007 should be fixed with the same cleanup because target selector aliases (`recipient`, `recipientName`, `targetAgentRunId`) create hidden compatibility/precedence paths outside the canonical `recipient_name` / `target_agent_run_id` contract.

### New design artifact

Created `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round8-delivery-intent-boundary-design.md` and updated the main requirements/design artifacts. This is the authoritative rework for CR-006/CR-007 before implementation/API-E2E can resume.

## Round 13 Task-Acceptance Tool-Choice Investigation Addendum (2026-06-08) — Superseded by Round 14

**Supersession notice:** this Round 13 analysis is preserved as historical evidence only. Its runtime `tool_choice`/`AgentTurnInputContext` design conclusion is retracted by the Round 14 correction below and must not be implemented in this ticket.

This addendum responds to Round 12 design impact: completion-report turns can execute a tool before explicit revision feedback, and the task-agent exact run can become unreachable before the E2E sends revision feedback.

### Sources consulted for Round 13 reset

| Date | Source Type | Source | What was checked | Finding |
| --- | --- | --- | --- | --- |
| 2026-06-08 | Design principle | `solution-designer/skills/solution-designer/design-principles.md` | Data-flow spine, ownership, authoritative boundary rules | Round 13 must identify all task-agent acceptance/tool-selection spines and not patch settled-run delivery around the task boundary. |
| 2026-06-08 | Evidence note | `tickets/in-progress/remove-native-autobyteus-agent-team/round12-design-impact-task-agent-auto-acceptance.md` | Round 12 failure path and design questions | Completion report committed, then coordinator executed one tool before explicit revision instruction; likely terminal acceptance caused exact-run target to become unreachable. |
| 2026-06-08 | Log | `tickets/in-progress/remove-native-autobyteus-agent-team/validation-logs/round6-live-e2e/full-real-runtime-matrix.log` around lines 2145-2181 and 4276-4277 | Runtime evidence | Completion Team Communication projection inserted, coordinator tool execution started/succeeded, later revision failed with model-facing text that the run id was no longer active/reachable. |
| 2026-06-08 | Test | `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` around coordinator config | E2E setup | Coordinator AutoByteus runtime uses `autoExecuteTools=true` and `llmConfig.tool_choice="required"`; prompt says not to auto-accept completion reports. |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-service.ts` | Acceptance owner | `acceptTask` marks ledger accepted, tombstones task-agent directory, publishes status, requests settlement. |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-agent-directory.ts` | Exact-run reachability | Active entries resolve; settled run ids reject. This invariant is correct and should not be bypassed. |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-team-execution/task-delegation/task-delegation-settlement-coordinator.ts` | Settlement path | Settlement follows acceptance/idle gates; it is not the primary bug source. |
| 2026-06-08 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts` | Tool surface | `accept_task` remains the only terminal task-specific tool; no result tools should be restored. |
| 2026-06-08 | Code | `autobyteus-ts/src/agent/pipelines/agent-input-pipeline.ts`, `autobyteus-ts/src/agent/agent-turn.ts`, `autobyteus-ts/src/agent/runtime/agent-worker.ts` | Current turn input metadata availability | The input pipeline returns `sourceEvent`, but current input origin is not stored on `AgentTurn` for later LLM/tool policy; tool continuations would otherwise look like tool-origin messages. |
| 2026-06-08 | Code | `autobyteus-ts/src/agent/loop/llm-phase.ts` and `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | Provider request assembly | `LlmPhase` currently passes tool schemas but no turn-aware `tool_choice`; request builder copies `LLMConfig.extraParams.tool_choice` and can be overridden by `kwargs.tool_choice`. |
| 2026-06-08 | Code | Codex/Claude task-delegation dynamic tool definition builders | Runtime adapter context | They call the shared task service with static member team context; no provider-native required tool choice equivalent was found in these task handlers. |

### Round 13 findings — historical / superseded

The following bullets explain the earlier reasoning path. The later Round 14 section is authoritative for implementation scope.

- The settled task-agent run rejection is correct. After a valid `accept_task`, feedback to that exact run must reject before projection.
- The failure class is earlier: provider-native `tool_choice: required` plus `autoExecuteTools=true` can turn a completion-report inter-agent input into a terminal task acceptance tool call before explicit feedback/acceptance sequencing.
- A hard rule that blocks all inter-agent-origin `accept_task` would break the simplified model. A parent agent is allowed to review a child/task-agent report and accept when satisfied, and a task-agent delegator must be able to accept child tasks in nested delegation.
- The missing invariant is therefore not “origin blocks acceptance”; it is “terminal acceptance must not be provider-forced.”
- `autoExecuteTools` is execution approval policy only. It should not be interpreted as acceptance intent.
- Current AutoByteus runtime lacks a durable first-input turn context. Adding `AgentTurnInputContext` gives LLM request assembly enough information to dampen forced tool choice for inter-agent/system/unknown turns while preserving explicit external user tool requests.
- To avoid server-runtime package coupling, the runtime package should not import `accept_task`. Instead, server managed team config should declare non-forcible tool names such as `accept_task` through generic tool-policy metadata.

### Round 13 design conclusion — retracted by Round 14

**Retracted:** do not implement this design response in the current ticket. The corrected design is Round 14 below.

Historical Round 13 design response: keep the simple task lifecycle and `accept_task` terminal owner, but introduce a turn-input-context-driven managed tool-choice policy. For non-external turns, if a non-forcible terminal tool such as `accept_task` is exposed and provider config requests `tool_choice: required`, the runtime request must downgrade/omit required forcing. This keeps task-agent runs reachable until a valid, non-forced original-delegator acceptance occurs, without breaking autonomous or nested task-agent acceptance.

## Round 14 Scope Correction - Tool Choice Is Not Task Architecture (2026-06-08)

The user challenged the Round 13 proposal to add runtime-level tool-choice dampening for `accept_task`. After re-evaluation, the corrected judgment is that Round 13 overreached.

Key corrected findings:

- `delegate_tasks`, `accept_task`, and `send_message_to` are configured agent tools. Their availability belongs to agent/member configuration and runtime adapter exposure.
- `autoExecuteTools=true` is normal for E2E validation and only means the framework executes a model-selected tool. It is not task acceptance intent and is not itself a design issue.
- Provider `tool_choice` and model reasoning quality are not part of the task-delegation architecture for this ticket. If an E2E prompt/model/tool-choice setup causes an agent to choose the wrong configured tool, that should be classified as prompt/model/test instability unless a framework invariant is violated.
- Framework invariants remain: only original delegator can accept; active task-agent exact run remains reachable until valid acceptance/team termination; reports are ordinary communication; valid `accept_task(task_id)` tombstones the run; settled run ids reject before projection.
- Therefore the Round 13 managed tool-choice policy should not be implemented in this ticket. Round 14 supersedes it with a tool-configuration boundary design recorded at `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-native-autobyteus-agent-team/tickets/in-progress/remove-native-autobyteus-agent-team/round14-task-tool-configuration-boundary-design.md`.

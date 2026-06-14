# Investigation Notes

## Investigation Status

- Bootstrap Status: Completed fresh-ticket bootstrap before this handoff; verified again on 2026-06-14.
- Current Status: Refined investigation complete for architecture review.
- Investigation Goal: Determine the correct design for expanding backend agent tools so Claude Agent SDK and Codex App Server use the unified server-hosted `autobyteus_agent_tools` MCP catalog/config instead of duplicated runtime-specific local MCP/dynamic tool projections.
- Scope Classification (`Small`/`Medium`/`Large`): Large.
- Scope Classification Rationale: The target change touches the shared Agent Tools MCP catalog/session/executor, five tool families, Claude SDK tooling setup, Codex thread config/dynamic tools, result/event/history normalization, secret handling, and executable coverage.
- Scope Summary: Fresh ticket based on the merged streamable MCP runtime tools branch. Prior `runtime-mcp-agent-tools` is lineage only; this ticket extends its route-backed `send_message_to` pattern to browser, media, task delegation, and published-artifact tools for Claude and Codex.
- Primary Questions To Resolve:
  1. Which backend agent tool families currently have duplicated Claude local MCP and/or Codex dynamic exposure paths?
  2. Which existing manifests/services can remain the authoritative behavior and schema source?
  3. What execution context does each migrated family need from an Agent Tools MCP session?
  4. What old paths must be removed rather than retained as compatibility fallbacks?
  5. What event/history/secret-normalization changes are needed once more tools use the `autobyteus_agent_tools` provider?
  6. What durable coverage must be updated or replaced downstream?

## Request Context

The user asked on 2026-06-14 to work on `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification`.

Existing draft artifacts in that folder stated the intended fresh-ticket direction: expand the merged `send_message_to` Agent Tools MCP pattern so Claude Agent SDK and Codex App Server expose configured backend agent tools through server-hosted `autobyteus_agent_tools`, while treating the prior `runtime-mcp-agent-tools` done ticket as lineage only.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification/tickets/done/runtime-agent-tools-mcp-unification`.
- Current Branch: `codex/runtime-agent-tools-mcp-unification`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification`.
- Bootstrap Base Branch: `origin/codex/streamable-mcp-runtime-tools`.
- Remote Refresh Result: `git fetch --all --prune` succeeded on 2026-06-14. Current `HEAD` equals upstream tracking ref at `9b6d8938e17f94148a4f23ab3ce04fbaaaf85014`.
- Task Branch: `codex/runtime-agent-tools-mcp-unification`.
- Expected Base Branch (if known): `origin/codex/streamable-mcp-runtime-tools`.
- Expected Finalization Target (if known): Streamable MCP runtime tools integration branch, unless user directs otherwise.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The task artifacts are currently untracked in git. Do not edit `tickets/done/runtime-mcp-agent-tools` as authoritative current work.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-14 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-agent-tools-mcp-unification status --short --branch` | Verify current branch/worktree | Branch is `codex/runtime-agent-tools-mcp-unification` tracking `origin/codex/streamable-mcp-runtime-tools`; task folder is untracked | No |
| 2026-06-14 | Command | `git fetch --all --prune` | Refresh tracked refs during bootstrap verification | Fetch succeeded; local `HEAD` and upstream tracking ref both `9b6d8938e17f94148a4f23ab3ce04fbaaaf85014` | No |
| 2026-06-14 | Doc | `tickets/done/runtime-agent-tools-mcp-unification/requirements-doc.md` | Read existing ticket intent | Draft scope asked whether browser, media, task-delegation, publish-artifacts, and other backend tools should move behind unified Agent Tools MCP for Claude and Codex | Refined into design-ready requirements |
| 2026-06-14 | Doc | `tickets/done/runtime-agent-tools-mcp-unification/investigation-notes.md` | Read existing bootstrap context | Fresh-ticket setup and prior-lineage warnings already recorded | Updated with deeper findings |
| 2026-06-14 | Doc | `tickets/done/runtime-mcp-agent-tools/requirements-doc.md` | Understand merged base lineage and prior out-of-scope boundary | Prior ticket moved `send_message_to` to Agent Tools MCP for Claude/Codex and explicitly left browser/media/task-delegation/publish-artifacts on old paths | This ticket supersedes that out-of-scope boundary for those families |
| 2026-06-14 | Doc | `tickets/done/runtime-mcp-agent-tools/design-spec.md` | Understand current send-message pattern and constraints | Claude/Codex materializers, no descriptor persistence, no Codex process-wide config, canonical event/memory spine | Reuse pattern and constraints |
| 2026-06-14 | Command | `find autobyteus-server-ts/src -maxdepth 5 -type d \( -path '*agent-tools*' -o -path '*mcp*' -o -path '*claude*' -o -path '*codex*' \)` | Inventory affected folders | Found `agent-tools/mcp`, family tool folders, Claude runtime-specific family folders, and Codex dynamic family folders | No |
| 2026-06-14 | Command | `rg -n "autobyteus_agent_tools|Agent Tools|dynamicTools|toolNames|mcp_servers|send_message_to|publish_artifacts|browser|media|task" autobyteus-server-ts/src autobyteus-server-ts/tests tickets/done/runtime-mcp-agent-tools` | Locate current exposure paths and tests | Found current send-message MCP path plus old browser/media/task/publish local/dynamic paths and tests | Yes, coverage must be refreshed downstream |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | Inspect MCP catalog ownership | Catalog defaults to one `SendMessageToMcpDefinitionProvider`; lists tools by session enabled tools | Needs multi-family adapter/definition registry |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | Inspect route executor | Executor hard-codes `send_message_to` and throws for all other tool names | Must be replaced/generalized |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session-service.ts` and `agent-tool-mcp-session.ts` | Inspect session/descriptor shape | Descriptor already has `enabledTools`; session has owner/sender/configuredExposure but no workspace execution context | Add focused execution context for workspace-root-dependent tools |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts` | Inspect JSON-RPC method dispatch | `tools/list` and `tools/call` delegate through catalog/executor; route can support more tools once catalog/executor are generalized | No route rewrite needed |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Inspect configured-tool gate | Already derives browser/media/task/send/publish exposure from `agentDefinition.toolNames` | Reuse as product gate |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-tools/browser/browser-tool-manifest.ts`, `browser-tool-parameter-schemas.ts`, `browser-tool-service.ts` | Inspect browser authoritative behavior/schema | Manifest owns names/descriptions/parse/execute; parameter schema converter exists; support is environment/service gated | MCP adapter should reuse and gate by support |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-tools/media/media-tool-manifest.ts`, `media-tool-contract.ts`, `media-tool-serialization.ts` | Inspect media behavior/schema/context | Manifest owns `generate_image`, `edit_image`, `generate_speech`; execution needs workspace root and may include run/agent id | MCP adapter should pass session execution context |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-tools/task-delegation/task-delegation-tool-manifest.ts`, `task-delegation-tool-service.ts` | Inspect task-delegation behavior/context | Manifest owns `delegate_tasks`, `submit_task_result`, `review_task_result`; service context is derived from `MemberTeamContext` | MCP adapter should enable only for team-member sessions |
| 2026-06-14 | Code | `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts`, `agent-tools/published-artifacts/publish-artifacts-tool.ts`, `services/published-artifacts/published-artifact-publication-service.ts` | Inspect published-artifact behavior/schema/context | Tool contract normalizes input; publication service publishes for active run and requires durable memory/workspace context | MCP adapter should call `publishManyForRun({ runId, artifacts })` and preserve errors |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts` | Inspect Claude allowed-tool policy | Adds Agent Tools MCP send-message wire name and old family-specific prefixes for browser/media/task/publish | Generalize to Agent Tools MCP enabled tools and remove old prefixes for migrated paths |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts` | Inspect Claude server merge | Merges `autobyteus_agent_tools` only for send-message plus old local MCP servers for other families | Target should materialize one `autobyteus_agent_tools` server for all migrated tools |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/agent-tools-mcp/claude-agent-tools-mcp-session-state.ts` | Inspect descriptor creation | Ensures descriptor only when `sendMessageToConfigured` | Must create/return descriptor for any enabled Agent Tools MCP tool |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Inspect Codex config path | Creates Agent Tools MCP app-server config only for `send_message_to`; still registers publish/media/browser dynamic tools | Must use MCP descriptor for all enabled migrated tools and remove dynamic registrations |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.ts` | Inspect Codex team task delegation | Builds task-delegation dynamic registrations when configured in member context | Must stop dynamic registration; task availability moves to MCP session adapter |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-materializer.ts` and `codex-agent-tools-mcp-event-payload.ts` | Inspect Codex materializer/name sanitizer | Thread config can carry enabled tool list, but helper/sanitizer are send-message-specific | Must generalize tool-name normalization and no-leak sanitizer |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Inspect Claude app-facing event names/results | Normalizes send-message Agent Tools MCP and old browser/media prefixes; media/browser result normalizers can parse MCP content blocks | Need generic Agent Tools MCP prefix normalization and old-prefix removal/negative tests |
| 2026-06-14 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-notification-handler.ts`, `codex-tool-approval-coordinator.ts`, `events/codex-item-event-converter.ts`, `history/codex-thread-history-item-normalizer.ts` | Inspect Codex MCP/dynamic lifecycle | Codex tracks pending MCP tool calls and bridges MCP elicitation approval; event/history normalization is send-message-specific for Agent Tools MCP | Generic MCP tool events likely reusable but must be tested with non-send tools |
| 2026-06-14 | Command | `find autobyteus-server-ts/src/agent-execution/backends/claude/{browser,media,published-artifacts,task-delegation,team-communication} ...` | Inventory removal candidates | Found active old Claude local MCP builders and Codex dynamic builders for migrated families | Removal/decommission plan required |
| 2026-06-14 | Code/Test | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Inspect current Codex expected behavior | Tests assert browser/media/publish dynamic tools and send-message MCP | Must update expectations for unified MCP |
| 2026-06-14 | Code/Test | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/build-claude-session-mcp-servers.test.ts` | Inspect current Claude expected behavior | Tests assert old server merge and old conflict behavior | Must update/replace for one Agent Tools MCP server |
| 2026-06-14 | Code/Test | `autobyteus-server-ts/tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Inspect existing MCP route coverage | Covers send-message-only tools/list and tool call, official MCP SDK client probe | Expand matrix for new providers |
| 2026-06-14 | Code/Test | `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Inspect existing media coverage | Current E2E validates AutoByteus local, Codex dynamic media, and Claude `autobyteus_image_audio` MCP projection | Must update to route-backed Agent Tools MCP for Claude/Codex |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Runtime creation resolves an `AgentDefinition`, then `resolveConfiguredAgentToolExposure(agentDefinition)` derives configured backend tool names from `agentDefinition.toolNames`.
  - Claude tooling is assembled per turn in `ClaudeSession.executeTurn`.
  - Codex tooling is assembled during `CodexThreadBootstrapper.bootstrapInternal` before `thread/start`/`thread/resume`.
- Current execution flow:
  1. `send_message_to` for Claude/Codex already uses `AgentToolMcpSessionService` -> `autobyteus_agent_tools` descriptor -> HTTP MCP route -> `AgentToolMcpToolExecutor` -> `SendMessageToDispatcher`.
  2. Claude browser/media/task/publish still use SDK-created local MCP server definitions and local handlers built from runtime backend folders.
  3. Codex browser/media/task/publish still use `dynamicTools` specs and server request handlers backed by `dynamicToolHandlers`.
  4. AutoByteus native uses the local default tool registry and bound tool wrappers.
- Ownership or boundary observations:
  - The Agent Tools MCP subsystem is the right authoritative boundary for external runtime MCP exposure, but it currently only knows `send_message_to`.
  - The family manifests/services under `agent-tools/**` and `services/published-artifacts/**` are the right behavioral owners for family logic.
  - Claude/Codex runtime backend folders currently own too much family-specific schema/execution projection logic.
- Current behavior summary:
  - The codebase is midway through unification: one family (`send_message_to`) has the correct route-backed Agent Tools MCP shape, while other server-owned external-runtime tool families remain duplicated by runtime.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature/refactor/cleanup.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination; Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Legacy Or Compatibility Pressure.
- Refactor posture evidence summary: Refactor is needed now. Extending old Claude/Codex paths would duplicate schema mapping, result wrapping, gating, and execution. Extending only the hard-coded `send_message_to` executor switch would centralize routing without a scalable owned adapter model.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `agent-tool-mcp-catalog.ts` | Catalog only defaults to `SendMessageToMcpDefinitionProvider` | Shared boundary is underpowered for the requested tool family expansion | Add multi-family adapter/provider model |
| `agent-tool-mcp-tool-executor.ts` | Executor hard-codes one send-message branch | Adding more branches directly would become a coordination blob | Delegate to owned adapters |
| Claude local MCP builders | Runtime folder converts schemas, wraps results/errors, and executes family services | Family projection duplicated outside shared MCP boundary | Remove/decommission after Agent Tools MCP adapters exist |
| Codex dynamic builders | Runtime folder duplicates schema/result/error logic for same family services | Duplicated policy/execution projection | Remove/decommission after Agent Tools MCP adapters exist |
| `configured-agent-tool-exposure.ts` | Shared configured-tool gate already covers in-scope families | Existing capability can be reused | Keep as product gate |
| Event/history normalizers | Agent Tools MCP normalization is send-message-specific | More MCP tools would leak provider names unless generalized | Add generic canonicalization/no-leak checks |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-catalog.ts` | MCP tool definition catalog | Only one default definition provider | Must become multi-family catalog/registry |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-tool-executor.ts` | MCP tools/call executor | Hard-coded `send_message_to` branch | Must delegate to adapters/handlers by tool name |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tool-mcp-session.ts` | Session/descriptor/owner identity | Missing workspace execution context | Add focused runtime tool execution context |
| `autobyteus-server-ts/src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.ts` | JSON-RPC route method dispatcher | Generic enough for more tools | Keep with minimal result-type update |
| `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Configured-tool derivation | Already derives in-scope family groups | Reuse as product gate |
| `autobyteus-server-ts/src/agent-tools/browser/**` | Browser service, manifest, parsers, schemas | Correct family owner; support-gated | Agent Tools MCP adapter should reuse |
| `autobyteus-server-ts/src/agent-tools/media/**` | Media service, manifest, parsers, schemas | Correct family owner; needs workspace context | Agent Tools MCP adapter should reuse |
| `autobyteus-server-ts/src/agent-tools/task-delegation/**` | Task delegation manifest/service | Correct family owner; needs member context | Agent Tools MCP adapter should enable only for team members |
| `autobyteus-server-ts/src/services/published-artifacts/**` | Published artifact contract/publication | Correct publication owner | Agent Tools MCP adapter should call service by run id |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-tooling-options.ts` | Claude allowed-tool list | Contains old family MCP prefixes plus Agent Tools send-message | Generalize Agent Tools names; remove old migrated prefixes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/build-claude-session-mcp-servers.ts` | Claude MCP server map composition | Merges Agent Tools send-message with old local family servers | Reduce to Agent Tools materialization for migrated tools |
| `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts` | Codex thread config and dynamic tool setup | Creates Agent Tools config only for send-message and dynamic tools for other families | Create descriptor for any enabled tool and remove migrated dynamic registrations |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-tool-approval-coordinator.ts` | Codex approvals/dynamic execution | Has generic MCP approval bridge and dynamic execution bridge | Preserve MCP approval bridge; dynamic bridge may remain generic but not used for migrated backend tools |
| `autobyteus-server-ts/src/agent-execution/backends/codex/agent-tools-mcp/codex-agent-tools-mcp-event-payload.ts` | Agent Tools event sanitizer | Send-message-specific | Make generic for all Agent Tools MCP tools |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-14 | Static probe | `rg -n "SendMessageToMcpDefinitionProvider|Unsupported Agent Tools MCP executor|enabledTools" autobyteus-server-ts/src/agent-tools/mcp ...` | Agent Tools MCP support is hard-coded to send-message provider/executor; descriptors already carry `enabledTools` | Catalog/executor can be extended without route redesign |
| 2026-06-14 | Static probe | `find autobyteus-server-ts/src/agent-execution/backends/claude/{browser,media,published-artifacts,task-delegation,team-communication} ...` | Active old Claude/Codex projection files remain | Removal/decommission must be first-class |

No live runtime services were started during solution design. Live/browser/media runtime validation belongs to downstream API/E2E after implementation.

## External / Public Source Findings

No external web/public source was needed for this design pass. The current branch and prior merged ticket artifacts provide the relevant contract basis.

## Reproduction / Environment Setup

- No runtime service setup was performed.
- No temporary external repositories were cloned.
- Commands were read-only except artifact updates in the ticket folder.

## Findings From Code / Docs / Data / Logs

1. `AgentToolMcpDescriptor.enabledTools` already supports multiple tool names, so the descriptor shape does not need a new top-level multi-server concept.
2. `AgentToolMcpSession.sender.memberTeamContext` already carries the exact context needed to derive task-delegation tool context.
3. `ConfiguredAgentToolExposure` already provides family groupings but should not become the final availability authority for browser support or team-only task delegation.
4. Browser/media/task-delegation family manifests are good shared schema/behavior sources and should prevent further schema duplication.
5. Published-artifact schema construction is partly private in `publish-artifacts-tool.ts`; implementation should extract or expose a reusable parameter schema builder instead of duplicating it in the MCP adapter.
6. Codex thread-scoped app-server config already handles `mcp_servers.autobyteus_agent_tools`; it only needs broader `enabled_tools` and creation trigger logic.
7. Claude SDK materialization already maps an Agent Tools descriptor to `{ type: "http", url, headers }`; it only needs broader descriptor creation and allowed tool names.
8. Event/history redaction and canonicalization must be generalized before more Agent Tools MCP provider names appear in raw runtime payloads.

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility fallback for migrated tool paths.
- No persisted bearer descriptors.
- No Codex process-wide launch args or trusted project config writes for session descriptors.
- AutoByteus native remains local.
- Browser support is environment-dependent and may be unavailable by default.
- Task delegation is team-context-only.
- Published artifact execution requires active run memory/workspace context.

## Open Unknowns / Risks

- Exact Codex app-server terminal MCP event payloads for non-send-message tools should be validated; current code has generic MCP pending-call tracking but historical tests are send-message-heavy.
- Claude SDK allowed-tools requirements for multiple remote MCP tools need implementation-time confirmation.
- Media and browser live tests may be environment-gated; downstream coverage should distinguish mockable route tests from live release validation.
- Some old dynamic/local builder files may only be referenced by tests; implementation should remove stale tests rather than keeping production adapters alive.

## Notes For Architect Reviewer

The recommended target is a clean-cut unification under the existing `autobyteus_agent_tools` server, not a second MCP server or a compatibility bridge. The critical review points are:

- Is the adapter/provider abstraction sufficient to avoid turning `AgentToolMcpToolExecutor` into a switch-based coordination blob?
- Are family manifests/services kept as the true behavior owners?
- Are browser availability, task member-context gating, and workspace/run context attached to the right session owner?
- Does the removal plan eliminate old Claude local MCP and Codex dynamic execution surfaces for migrated tools?
- Does event/history normalization become generic enough for all Agent Tools MCP tools without leaking secrets?

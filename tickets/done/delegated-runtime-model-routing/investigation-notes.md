# Investigation Notes

## Investigation Meta

- Package identifier: `delegated-runtime-model-routing`
- Request / ticket: Project Task **autobyteus-32** "Runtime/model routing for delegated work" (user 2026-10-09, extended 2026-10-11; priority raised 2026-10-24 for the cross-node case). Delegated by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing`, branch `codex/delegated-runtime-model-routing`
- Resolved base remote / branch / revision: `origin/personal` at `ddd6fdcdf64b1a6750415c68ccef0bbb316083d2` (fetched 2026-10-24)
- Finalization target remote / branch: `origin` / `personal` (RELEASE.md § Finalization Target)
- Bootstrap result: worktree created from freshly fetched `origin/personal`.
- Bootstrap blocker: None
- Current solution revision ID: `SR-003`
- Authorities read (requirements reading gate; 2026-10-24): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`; project `AGENTS.md`, `DESIGN.md` (head), `GLOSSARY.md` § Nodes, `autobyteus-server-ts/docs/design/collaboration_model.md` (CM-10, CM-12).
- Investigation status: Requirements-phase investigation complete; architecture investigation follows approval.

## Initial Request And Clarifications

- Original request: see `requirements-doc.md` § Problem. The Task says every delegated copy inherits the delegator's runtime/model; the user wants a runtime and model chosen per agent and per team member for the Task, possibly by a dedicated router agent.
- Clarifications received: PM message 2026-10-24: design ticket first; propose options, router inputs/outputs, place in `delegate_task`, visibility, fallbacks (clear error, no silent switch), router cost, node vocabulary; ask the user directly; build only after approval; no release unless asked; prove from a clean clone; clean up; name the Task key.
- User-supplied facts and constraints (comment 2026-10-24): cross-node delegation fails when the target node lacks the configured runtime/model or no default is set; routing must pick what the TARGET node has and the user is signed in to; the user's idea is a dedicated Model Router agent; use a cheap model and cache; no silent switch.
- Initial ambiguity: whether the router replaces or complements definition defaults; where it runs for cross-node work; behavior when it fails.

## Product And Domain Understanding

- Product area: agent collaboration (delegation), launch configuration, remote collaboration between nodes, Agent Runtimes.
- Affected actors or systems: delegating agents (PM, coordinators), the user (definition author, node owner, observer), the delegating node and the target node.
- Relevant terminology: Node, this node / remote node, Peer (GLOSSARY.md § Nodes); delegated run / copy (collaboration model § 1); launch layers `agent_default`, `team_default`, `inherited`, `configured` (`launch-configuration-source.ts`).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24 | Code | `autobyteus-server-ts/src/agent-collaboration/collaborators/collaborator-launch-resolver.ts` | How a delegated copy gets its launch | Layered: agent default → (member) team default → inherited from the run root. A layer is usable when complete, runtime available, model offered and settings valid. `defaults_only` base (peer-started runs) has no inherited layer and fails with `CollaboratorNoDefaultLaunchError` | Router hooks in where no configured layer is usable |
| 2026-10-24 | Code / git | `git show 55092536a3` ("honor agent and team launch defaults for delegated copies"), ticket `tickets/done/delegated-launch-config-defaults` | Is the Task premise "everything inherits" still true? | **No longer fully true.** Since 2026-10-12 delegated copies honor per-agent and per-team defaults; only agents without a usable default inherit the root's launch. That ticket explicitly left "Runtime/model **routing** (the platform choosing a runtime/model from the Task when nothing is configured)" out of scope as this Task | Requirements build on it; per-member defaults already exist |
| 2026-10-24 | Code | `launch-configuration-notes.ts`, `root-task-dispatch.ts`, `task-delegation-tool-serialization.ts` | Visibility today | A skipped layer becomes a `launch_notes` line in the `delegate_task` result ("X: its agent default A / m could not be used (reason); it runs on B / n (inherited from the run)") | Router choice/reason uses the same channel |
| 2026-10-24 | Code | `autobyteus-web/utils/runSettings/delegatedLaunchRows.ts`, `RunMemberRow.vue` | Visibility today | Run Settings lists every open delegated copy with runtime, model, source ("its agent default", "inherited from the run", …) and fallback notes. The run header shows no runtime/model | Add a router source and its reason |
| 2026-10-24 | Code | `remote-collaboration/inbound/remote-delegation-receiver.ts`, `remote-team-run-starter.ts`, `remote-refusals.ts` | Cross-node failure today | Target node resolves with `defaults_only`; no complete default → `NO_DEFAULT_RUNTIME` ("There is no default runtime configured for the target agent X on node N."); a default that can't run → `AGENT_CANNOT_RUN` with reason. Refused before a run is created | Router on the target node replaces the refusal when set up |
| 2026-10-24 | Doc | `collaboration_model.md` CM-10, CM-12 | Governing contract | CM-10: the node that runs a delegated run owns its runtime. CM-12: a remote run starts with each agent's own default (member → team default); a target with an agent no default covers is refused; no credential travels; peers see only name/kind/address/description | CM-12 must be amended by this ticket; routing belongs on the target node |
| 2026-10-24 | Code | `remote-collaboration/domain/remote-requests.ts` | Wire contract | `StartDelegatedRunRequest` carries address, delegator, coordinating run; the description is sent afterwards as the work packet. `StartDelegatedRunAnswer` carries run IDs only, no launch. `RemoteRunSummary` has title and statuses, no runtime/model | The router on the target needs the Task text at start; the delegating node cannot show a remote copy's runtime/model today |
| 2026-10-24 | Code | `runtime-management/runtime-availability-service.ts` | Availability input | Availability = executable/command present (Codex, Claude), model listing works (AGY), CLI probe (Grok); AutoByteus always available. It does not check sign-in | Sign-in needs its own source |
| 2026-10-24 | Code | `runtime-management/agent-runtimes/agent-runtime-sign-in-reader.ts`, `agent-runtime-status-service.ts`, `agent-runtime-types.ts` | Sign-in input | `AgentRuntimeSignInReader` is "the one owner of is this runtime signed in" for the Agent Runtimes page and application launch readiness: `signedIn` / `signedOut` / `notRequired` / `unknown` per external runtime. The status service keeps the last reading per runtime with `checkedAt` | Router input and default usability can use it (closes delegated-launch-config-defaults UNK-001) |
| 2026-10-24 | Ticket | `tickets/done/remote-node-runtime-sign-in/requirements-doc.md` | Auth evidence | A signed-out Codex on a Docker node failed at the first turn with "Reconnecting… n/5" (401 from OpenAI) | A signed-out runtime must not be chosen |
| 2026-10-24 | Code | `llm-management/services/model-catalog-service.ts`, `autobyteus-ts/src/llm/models.ts` (`ModelInfo`) | Model input | Per runtime, offered models with identifier, display name, provider, context/output limits and resolved metadata | Router input per runtime |
| 2026-10-24 | Code / git | `cec24ca484` "summarize on the agent's own model", ticket `context-compaction-simplification-analysis` | Precedent for a helper agent | A separate "Memory Compactor" agent run (selected built-in agent, structured output, own runtime/model inheriting the parent's) existed and was removed in favor of the agent's own model: launch/collection lifecycle, parser and visible-run handling were costly | Keep the router's run small: one bounded request, validated structured answer, no visible conversation |
| 2026-10-24 | Code | `agent-tools/task-delegation/*`, `agent-discovery/list-available-agents-contract.ts` | Where routing sits in `delegate_task` | `delegate_task` has no runtime/model input; `list_available_agents` returns name/kind/address/description only. Delegators do not know runtimes, models or their own launch | Explicit delegator choice would need new catalog tools; Task text is already available to a router |
| 2026-10-24 | Code | `launch-preferences/default-launch-config.ts` | Default shape | `defaultLaunchConfig` = `{ runtimeKind, llmModelIdentifier, llmConfig }`, any field may be null; runtime-only defaults are "incomplete" and skipped today | A runtime-only default can constrain the router |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | `delegate_task` to a catalog address on this node | Resolve each agent: agent default → team default → root's launch; skipped layers become notes; start | Agents without a usable default run on the delegating run root's runtime/model | resolver, ticket delegated-launch-config-defaults | High (Read) |
| BEH-002 | Contract | `delegate_task` with `node` (CM-12) | Target node resolves `defaults_only`; no default → `NO_DEFAULT_RUNTIME` refusal; unusable default → `AGENT_CANNOT_RUN` | Nothing starts; the delegator gets the refusal text | receiver, refusals, `remote-delegation-two-server.e2e.test.ts` | High (Read) |
| BEH-003 | System | Default on a signed-out runtime | Passes availability and model checks; the run fails at its first turn | Error surfaces as a run error, not as a fallback | remote-node-runtime-sign-in E-07; delegated-launch-config-defaults UNK-001 | Medium (Read; earlier ticket reproduced for Codex) |
| BEH-004 | User | Run Settings | Delegated copies listed with runtime, model, source and notes | Local copies only; a remote copy's runtime/model is not visible on the delegating node | delegatedLaunchRows.ts, remote-run-channel.ts | High (Read) |
| BEH-005 | System | Configured placement, existing copy, user-launched runs, application launches | Use their own launch choices | Unaffected by definition-default resolution | delegated-launch-config-defaults REQ-011 | High (Read) |
| BEH-006 | — | Choosing a runtime/model from the Task | No current supported behavior | — | — | — |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `CollaboratorLaunchResolver` | One owner of layered launch resolution for fresh copies (local and peer-started) | Routing is a new layer after configured layers | Router call is async and slow; batch per delegation |
| `LaunchConfigurationSource` (`origin`, `fallbacks`) persisted in run history | Records where launch values came from | New origin for router choices plus its reason | Persisted-data convention check (data_migration_guideline.md) for a new origin value |
| `AgentRuntimeSignInReader` / `AgentRuntimeStatusService` | Sign-in state per runtime | Usability and router input include sign-in | Cost of a fresh read vs. cached status |
| Remote wire contract (`remote-requests.ts`) | Start request/answer | Start request needs the Task text; answer should carry chosen launches | Both nodes run the same release (DESIGN.md rule 9) |
| Built-in agent templates (`built-in-agents/templates`) | Seeded agent definitions | A built-in Model Router definition can be seeded | Router runtime/model = its own definition default |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Run-history launch source records (origin enum, fallbacks); team/collaboration stream DTO packages (`autobyteus-team-stream-contracts`, `autobyteus-collaboration-stream-contracts`); remote wire requests/answers; a new built-in agent template.
- Readers: run restore, Settings rows, `delegate_task` serialization, peer channel.

### Structural Surfaces

- Collaboration launch resolution, remote delegation receiver, Agent Runtimes sign-in, model catalog, agent run creation for the router, web Settings rows.

### Potential Structural Impacts To Investigate

- API or external-contract change: yes (peer wire contract; contract DTO packages).
- Persistence schema or invariant change: yes (new launch origin + reason).
- Security or privacy boundary change: the Task text reaches the target node at start instead of a moment later (same data, same peer); no credential travels.
- Concurrency or lifecycle change: router call inside delegation admission (time bound).
- Confirmed absent, present, or unknown: to be settled in architecture.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| None run in this phase | — | All findings above are `Read` from source, tests and finished tickets | — | Architecture phase runs the resolver and receiver tests before design | — |

- Temporary diagnostics: None.
- Reproduction for implementation to start from: existing `tests/unit/agent-collaboration/collaborators/collaborator-launch-resolver-defaults-only.test.ts` and `tests/unit/remote-collaboration/remote-delegation-receiver.test.ts` (NO_DEFAULT_RUNTIME refusal) show today's behavior.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User 2026-10-09/11 | Different runtimes suit different work; SD on Claude, IE on Claude Sonnet or Codex | Direct | Per-agent, per-member choice | Already possible with defaults (since 2026-10-12); Task-specific choice is new |
| User 2026-10-24 | Cross-node: pick what the target node has and is signed in to; dedicated router agent; cheap model, cache; no silent switch | Direct | Router on target node; sign-in aware; visible reason; clear errors | Router on by default? Failure behavior? |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Collaboration model CM-10/CM-12 | `collaboration_model.md` | Target node owns runtime; remote default rule | Doc | CM-12 to be amended |
| Vendor CLIs sign-in status | Codex, Claude, AGY, Grok | Sign-in reading may be `unknown` | sign-in reader | `unknown` treated as usable (DEC-005) |

## Persisted Data And State Facts

- Affected stored subject: recorded launch source of delegated copies (run history), remote links.
- Required semantics: older records restore unchanged; new origin readable.
- Acceptable loss: none.
- Remaining evidence gap: repository persisted-data transition convention (architecture phase).

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Product Design Findings

- N/A — no Product Design requested.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `launch-selection-order.md` | Solution Designer | Selection order and all cases | REQ-001..REQ-009 | REQ-001..REQ-009; AC-001..AC-011 | Proposed (SR-003) | Behavior-defining; user approval applies |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| UNK-001 | Unknown | Latency of one router request on a cheap model (AutoByteus API model vs. Claude/Codex session start) | Delegation waits for it | Architecture: measure; time limit QR-001 | Open |
| UNK-002 | Unknown | Cost of a fresh sign-in read per runtime vs. the status service's last reading | Admission latency | Architecture | Open |
| RSK-001 | Risk | The router picks a poor model for a Task | Quality of delegated work | Reason is visible; user edits the router's instructions or sets a default | Accepted |
| RSK-002 | Risk | A router on an expensive model costs on every delegation of an agent without default | Cost | Router only runs when no configured layer covers an agent; user picks its model | Accepted |

## Architecture Investigation Findings

Authorities read (design gate, 2026-10-24): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `docs/design-cases.md`, `data_migration_guideline.md` §§ 2–3.

| ID | Method | Source / Command | Finding |
| --- | --- | --- | --- |
| A-01 | Read | `collaborator-launch-resolver.ts:92-230` | One owner of layer order; private batch `check` (availability once per runtime, one `validateMany`) |
| A-02 | Read | `root-team-run.ts:321-355`; `standalone-agent-run-root.ts:339-340`; `agent-org-run.ts:281-282` | Delegation and all message deliveries of a root run inside one gate; remote starts already make network calls inside it (`remote-delegation.ts:79-100`) |
| A-03 | Read | `root-task-execution-lifecycle.ts:137-173` | Placement is resolved before the saved Task is read |
| A-04 | Measured | `codex app-server generate-json-schema --out /tmp/codex-schema-probe` (codex-cli 0.164.0) | `account/rateLimits/read` returns primary/secondary windows with `usedPercent`, `resetsAt`, `windowDurationMins`, and `rateLimitReachedType`; `account/rateLimits/updated` is ignored today (`codex-client-thread-router.ts:15-19`) |
| A-05 | Read | `@anthropic-ai/claude-agent-sdk@0.3.280 sdk.d.ts:5410-5435` | `rate_limit_event` (`status`, `utilization`, `resetsAt`, `rateLimitType`) only within sessions; not read today (grep) |
| A-06 | Measured | `claude auth status --json` 0.16 s; `agy models` 1.79 s; `grok --version` 0.09 s (this Mac, 2026-10-24) | Fresh sign-in reads are affordable once per runtime per delegation |
| A-07 | Read | grep `src/` | No per-runtime record of run failures |
| A-08 | Read | `runtime-agent-tool-exposure.ts:45-79`; callers in claude, codex, autobyteus, antigravity, acp backends and restore | Tools come from the definition (plus automatic collaboration tools) in every backend |
| A-09 | Read | `skill-catalog.ts:49-90`; `built-in-agent-registry.ts`; `built-in-agent-bootstrapper.ts` | Tier-1 skills folder; built-in agents rewritten from templates at startup |
| A-10 | Read | `launch-configuration-source-schema.ts:22-40` | Origins/reasons validated against code lists; tolerant reader extends by list |
| A-11 | Read | `run-execution-tree-shared-records.ts:132-165`; DTO `remote_task_executions` in both contract packages | Remote links carry run IDs only |
| A-12 | Read | `agent-run-service.ts:27-46, 181-246` | Ordinary standalone run creation with explicit launch; lifecycle observation |
| A-13 | Read | `workspaces/temp-workspace.ts`; `node-catalog-port.ts:16` | Node temp workspace |
| A-14 | Read | `git show 480d8b3d78` (removed compactor agent runner) | A collector of final text output was used before and removed; this design takes the answer through a tool instead |
| A-15 | Measured | `evidence/limit-probes/codex-limits.mjs` | Codex limits readable live in 0.65 s, 0 tokens; on 2026-10-24 the user's Codex was 100% of its weekly window, blocked until 2026-10-30 20:57 local |
| A-16 | Measured | `evidence/limit-probes/claude-usage.mjs` | Claude limits readable live in 0.78 s, 0 tokens, via the SDK's experimental `get_usage` control request (same data as `/usage`): session, weekly, per-model weekly |
| A-17 | Measured | `agy -p "/usage" --output-format json` | Antigravity limits readable live in 2.7 s, 0 tokens, per model group (Gemini; Claude and GPT; Gemini 4 Argon) with remaining fraction and reset time |
| A-18 | Measured | `evidence/limit-probes/grok-billing.mjs` (ACP `_x.ai/billing`) | Grok limits readable in ~1 s, 0 tokens: weekly credit period and tier; `creditUsagePercent` exists in the type but was absent today (meaning when absent unverified) |
| A-19 | Measured | `evidence/limit-probes/api-limits.mjs` (test vault, 2026-10-25) | API keys: DeepSeek and Kimi balances readable (DeepSeek 0.14 USD available; Kimi 0 / cash −0.012); xAI key status only; GLM account has no Coding Plan (quota endpoint says so); OpenAI nothing readable; Anthropic API's free `count_tokens` returns "credit balance is too low"; Gemini not readable |

Temporary diagnostics: none. Probe output folder `/tmp/codex-schema-probe` (outside the repo, disposable).

## Requirement Implications

- The Task's premise is partly outdated: per-agent and per-member defaults already apply to delegated copies (local). What is missing: (1) a Task-aware choice for agents without a usable default; (2) the cross-node case, where no inheritance exists and the run is refused; (3) sign-in awareness; (4) visibility of a remote copy's launch on the delegating node.
- The existing layered resolver, launch notes and Settings rows are the natural places for routing, its reason and its fallbacks.

## Notes For Architecture Design

- Map SCN-001..SCN-006 of the requirements doc onto the resolver, the remote receiver and Settings rows.
- Verify how a server-side component can run one bounded agent request with a validated structured answer, without a visible conversation (lesson from the removed compactor agent).


## Architecture Investigation — Router Core (2026-10-26)

| ID | Method | Source | Finding |
| --- | --- | --- | --- |
| A-20 | Read | `available-agent-runtimes/available-agent-runtimes-service.ts:150-190` (autobyteus-303, merged) | `read()` is single-flight over all runtimes; report models carry `blocked` |
| A-21 | Read | `agent-execution/domain/agent-run.ts:185-215` | A posted message during an active turn is appended to that turn (`append_to_active_turn`) |
| A-22 | Read + 303 measurements | 303 evidence (2–5 s typical, ≤ 18 s); A-02 (inside the root gate) | A report read per delegation is a real latency cost → DEC-022 narrowed |
| A-23 | Read | `built-in-agents/built-in-agent-registry.ts`, bootstrapper | Built-in templates rewritten at startup; excluded from collaboration |
| A-24 | Read | `run-history/store/message-log.ts` | Append-only JSONL with rotation, one line per record |
| A-25 | Read | `services/server-settings-service.ts`, `config/*-setting.ts` | Settings pattern |
| A-26 | Read | `collaborator-launch-resolver.ts` git log | Unchanged since A-01 |
| A-27 | Read | autobyteus-308 (merged `e34321789d`) | `internal` attribute; hidden agents openable by run ID |
| A-28 | Web + Read | Codex MCP docs (`tool_timeout_sec` default 60 s, `startup_timeout_sec` default 10); `tickets/done/cross-node-agent-communication/investigation-notes.md` A-11 (our Codex config sets only `startup_timeout_sec: 5`); `remote-collaboration/channel/peer-client.ts:43-44` (20 s peer bound); Claude Code `MCP_TOOL_TIMEOUT` documented default very large, with reports of 60 s cut-offs in some hosts | A routed delegation must answer well under 60 s; Claude/Antigravity/Grok limits verified live |


## A-29 — The router's tool limits on external runtimes (2026-10-26, round 19 question)

- Codex: with auto-approve on, the thread runs with sandbox `danger-full-access` (`autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-thread-bootstrapper.ts:168-172`); Codex's own shell and patch tools are always present. The agent definition's tool list only selects which of our MCP tools are enabled.
- Claude (Agent SDK): `allowedTools` lists our MCP tools and Skill (`claude/session/claude-session-tooling-options.ts:143-155`); the SDK's built-in tools (Bash, Read, Write, Edit…) are not removed, and `canUseTool` with auto-approve permits them (`claude-session-query-options.ts:44-49`).
- Consequence: SR-012's REQ-003/QR-004 "no shell or file tools" holds only on the autobyteus runtime. On Codex/Claude the router, which also reads web pages, has shell access in the node's temp workspace. Containment needs runtime-specific settings for the router run (Codex `workspace-write` sandbox; Claude `disallowedTools`), whichever workspace it uses.

## A-30 — Would a router workspace show in the Workspaces list? (2026-10-26, round 20)

- The left tree combines the server's `workspaces` query (`workspace-manager.ts:155-162` `listVisibleWorkspaces`: every registered filesystem workspace plus transient active ones) with run history groups (`autobyteus-web/stores/runHistoryReadModel.ts:113-171, 180-223`). History already leaves out hidden internal agents' runs (`agent-run-history-service.ts:76-86`, autobyteus-308).
- So a workspace whose only runs are hidden still shows, as an empty folder. The SR-012 design avoided this only because the router ran in the node's temp workspace, which is always shown.
- A general fix without router-specific logic: mark a workspace the server creates for an internal agent as internal in its registry entry, and leave internal workspaces out of `listVisibleWorkspaces` while `InternalAgentVisibility` hides internal agents (shown with their runs when the setting is on).

## A-31 — How a system notice enters a busy run (2026-10-26, for the routing request)

- `skill-update-notices/services/skill-update-notice-builder.ts:54-60`: `new AgentInputUserMessage(text, SenderType.SYSTEM, null, { sender_id, <notice metadata>, platformInputPrefaceMetadata(...) })`; posted with `AgentRun.postUserMessage` (`skill-update-notice-service.ts:196`); the service publishes a `SYSTEM_TASK_NOTIFICATION` event for the web.
- Sender IDs live in `agent-execution/domain/system-task-notification-senders.ts`. The routing request follows the same pattern with `system.model_router`, so the router conversation shows requests with the product's existing system-notice segment (UI/UX specification: no router-specific UI).

## Supplement inventory update (SR-014)

| Artifact | Purpose | Owner | Status |
| --- | --- | --- | --- |
| `launch-selection-order.md` | Selection order and cases | Solution Designer | Approved SR-014 |
| Product UI/UX specification `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md` + `visual-references/` | Normative page and choice display | Product UI/UX Designer (linked, not copied) | Approved by the user 2026-10-26 |
| `product-design-request.md` | Brief sent to the Product Team | Solution Designer | Done |

## A-32 — ARCH-REV-001 findings verified (2026-10-26)

- AR-001: `agent-execution/services/standalone-agent-run-eligibility.ts:4-5` — eligible unless `applicationExecutionContext`; `agent-run-service.ts` activates an eligible run through its root with a host member context; `shared/runtime-agent-tool-exposure.ts:21-26` — every member context gets `send_message_to` and `delegate_task`. Confirmed.
- AR-002: `runtime-management/claude/client/claude-sdk-setting-sources.ts` — runtime sessions load `["user","project","local"]`. Claude Agent SDK permissions (code.claude.com/docs/en/agent-sdk/permissions, read 2026-10-26): evaluation order hooks → deny rules → ask rules → permission mode → allow rules (incl. settings files) → `canUseTool`; "Auto-approved tools never reach `canUseTool`"; "For checks that must run on every tool call, use a `PreToolUse` hook: hooks run before every other step, and a hook deny applies even in `bypassPermissions` mode"; a bare-name `disallowedTools` entry removes the tool from the request. Project/local settings come from the session's working directory, i.e. the router's own writable workspace (allow rules and hooks). Confirmed, and wider than reported.

## A-33 — Several routing requests at once: which runtimes can add input to a running turn (2026-10-26, user question)

- `inputCapabilities.activeTurnAppend`: `"supported"` in `backends/codex/backend/codex-agent-run-backend.ts:36` and `backends/claude/backend/claude-agent-run-backend.ts:18`; `"unsupported"` in `backends/autobyteus/autobyteus-agent-run-backend.ts:91`, `backends/antigravity/backend/agy-agent-run-backend.ts:20`, `backends/acp/backend/acp-agent-run-backend.ts:31` (Grok).
- With "unsupported", input posted during a turn is queued and starts a later turn (`input/agent-run-input-admission-state.ts:135-207`), one entry at a time in order.
- Consequence: on Codex/Claude a burst of routing requests is seen in the running turn and answered together (A-21, REQ-004); on AutoByteus/Antigravity/Grok the router answers them turn by turn, so in a burst the later requests may use up their 40 s and fall back with a note.
- Within one delegating root, delegations are serialised anyway by the root's gate (A-02, FU-002); concurrency comes from different roots (e.g. the Project Task Manager and a team member delegating at the same time).

## A-34 — API/E2E round 1 failure origin (code review CRR-003, 2026-10-26)

- L-02 (live Codex): a workspace `.codex/config.toml` with `[sandbox_workspace_write] writable_roots=["/"]` merged into the thread's `workspace-write` policy; a write to HOME succeeded (`evidence/api-e2e/L-02-codex-router-confinement.json`). Thread start pinned only the sandbox mode (`codex-thread-bootstrapper.ts:176-186,317`). Codex app-server protocol (generated with `codex app-server generate-ts`, codex-cli 0.164.0): `TurnStartParams.sandboxPolicy` ("Override the sandbox policy for this turn and subsequent turns") and `ThreadStartParams.config` exist; precedent `335f78c208` (`-c` overrides on app-server launch).
- L-01 (live Claude): confinement held (hook denied TMPDIR, HOME, symlink writes; workspace `.claude/settings.json` not loaded) but the session had the user's claude.ai connectors (`mcp__claude_ai_Claude_Docs__*`, source `claudeai`) and `Skill` (`evidence/api-e2e/L-01-claude-router-confinement.json`).
- MR-09: after a failed Antigravity turn the backend stays inactive while the run is registered; `ModelRouterAgent.ensureRun` returns it (`model-router-agent.ts:96-99`) and `isIdle()` requires `isActive()` (`:86-88`), so every later routing waits 40 s as "busy" (CR-005, implementation Local Fix: restore through `resolveCommandReadyAgentRun`).
- Outcome: the user removed confinement (SR-018), so CR-003 and CR-004 no longer apply; CR-005 stays.

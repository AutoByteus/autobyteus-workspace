# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision and user-approval reference: SR-001 requirements, approved by the user 2026-10-05 ("agreed. approve"), with DEC-001 = option A
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/investigation-notes.md`

## Current-State Read

The runtime backends own their background-task views and publish runtime-neutral `AgentBackgroundTask` snapshots (`agent-execution/domain/agent-background-task.ts`). Each snapshot travels as `BACKGROUND_TASK_UPDATED` through the server presentation projectors (agent and team streams; the strict zod contract lives in `autobyteus-agent-presentation-contracts`). On the web side, snapshots go through the streaming adapters and handler into `agentBackgroundTaskStore` (an upsert by `task_id`) and are rendered by `BackgroundTaskPanel.vue`.

- Claude: `ClaudeBackgroundTaskRegistry` owns the view. It reads task frames (`background_tasks_changed`, `task_started`, `task_updated`, `task_notification`) but ignores `tool_use_id`. The command exists only in the assistant `tool_use` block (`Bash`/`Monitor` `input.command`) whose `id` equals `task_started.tool_use_id` (probe evidence). The registry currently receives only the kind of each assistant/user frame (`observeConversationFrame(frameKind, interruptRequested)`).
- AGY: `AgyBackgroundTaskMonitor` already has `commandLine` and uses it as the description.
- Nothing is persisted. Server and web ship together.

There is no structural problem. The existing owners absorb the change.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: About 12 production files across contracts, the server (domain, Claude registry, turn tracker, AGY monitor, 2 projectors) and the web (payload type, team adapter, handler, type, panel, 2 locale files if a label is needed). All changes stay inside existing owners. Each file needs only a few lines, except the registry (a correlation map) and the panel (an expandable command line). Tests and docs are updated alongside.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: One additive nullable field on an internal live-only stream contract whose producers and consumers all live in this monorepo and ship together (the desktop bundle). Android and iOS do not consume it (grep). No persistence, security boundary, concurrency, deployment or ownership-boundary change. The Claude correlation stays inside the registry that already owns the task view, keeps the same lifecycle (`clear()`) and adds no new threads or timers. The CLI dependency (`tool_use_id`) is undocumented, but degradation is graceful by requirement (REQ-004). Shared-contract consideration: the classification standard lists shared-contract changes as High-risk examples. This change adds one nullable field to an existing event. It changes no semantics, identity, ordering or consumer behavior, and every producer and consumer is updated in the same change and validated by the contract tests. It is therefore not a material contract change, and it is classified Low on that basis.
- Escalation trigger if implementation or validation discovers new impact: (a) assistant `tool_use` frames turn out not to reach the tracker before `task_started` in some supported flow (for example subagent-owned or partial-message streaming), or (b) some consumer outside this repo validates `BACKGROUND_TASK_UPDATED` strictly. Either case → return `Design Impact` to Solution Designer.

## Architecture Investigation Evidence

- Project design guideline applied: `DESIGN.md` (root). Area contract: `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md`.
- Guideline conflicts or discrepancies: None.

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Live probe | `evidence/probe-bash-bg.log`, `evidence/probe-monitor.log` | tool_use(id, input.command) arrives before `task_started(tool_use_id)`, which arrives before tool_result | Correlate in the registry by tool_use id; release on tool_result | RSK-001 (undocumented frames) |
| Code | `claude-turn-tracker.ts:238-335` | The registry sees only the frame kind of assistant/user frames | Pass the frame to the registry | — |
| Code | `claude-background-task-registry.ts` | `descriptions`/`taskTypes` per-task maps, cleared in `clear()` | Add a `commands` map with the same lifecycle | — |
| Code | `agy-background-task-monitor.ts:55-62` | `commandLine` is known | Set `command` from it | — |
| Contract | `agent-presentation-message-dtos.ts:100` | Strict schema | Add `command: z.string().nullable()` (required key, nullable value, like `summary`) | — |

## Intended Change

Add `command: string | null` to the runtime-neutral background-task snapshot and its wire payload. The Claude registry learns commands from assistant tool_use blocks and attaches them through `task_started.tool_use_id`. AGY sets the command from the step's command line. The web panel renders `<Kind> · <command>` (monospace, truncated, tooltip, click to expand) when the command is non-null and differs from the trimmed title.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior / Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-001/002/004/005/007; AC-001/003/005/006 | Claude Bash `run_in_background` | Row shows description + "Shell" | Row adds `Shell · <command>` | DS-001, DS-003 |
| BEH-002 | User | REQ-002/005; AC-002 | Claude Monitor tool | Same as BEH-001 | Same | DS-001, DS-003 |
| BEH-003 | User | REQ-003/006; AC-004 | AGY daemon `run_command` | Title = command | Payload carries the command; no visible change (dedupe) | DS-002, DS-003 |
| BEH-004 | User | REQ-004; AC-005 | Subagent/workflow tasks | description + kind | Unchanged (`command: null`) | DS-001, DS-003 |
| BEH-005 | Contract | REQ-001/007; AC-006 | Every snapshot | No command field | `command` is always present (string or null); upsert updates the row | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `evidence/probe-bash-bg.log`, `evidence/probe-monitor.log`, `evidence/probes/claude-bg-command-probe.mjs` | Frame-order evidence | REQ-002, AC-001/002 | Basis for the correlation design; the probe can be re-run to re-check after CLI upgrades | Evidence, not behavior-defining |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`
- Current design issue found: `No`
- Root cause classification: `No Design Issue Found`
- Refactor needed now: `No`
- Evidence: The registry already owns the identity of each Claude task (description, type) from CLI frames. The command is one more identity attribute from the same CLI stream. The AGY monitor already holds the command. The contract and projectors have a single builder/parser pair.
- Design response: Extend the existing owners: the registry, the AGY monitor, the domain model and contract, and the panel.
- Refactor rationale: Not needed. Reading from `ClaudeSessionToolUseCoordinator` instead was rejected because it would couple the task view to tool-card lifecycle state that is consumed on tool_result.
- Intentional deferrals and residual risk: RSK-001 (the CLI could drop `tool_use_id`, in which case the command is absent and the row looks as it does today).

## Terminology

- *Command*: the exact shell command string the runtime executes for a background task. `null` when unknown or not applicable.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- No legacy path is replaced. The field is added clean-cut as a required nullable key on every producer and consumer. There is no optional/absent-tolerant variant.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Background-task snapshots are live-only (the web store is not persisted, and the server does not store snapshots). No history replay carries them.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001/002/004 | Claude CLI stream frames | `BACKGROUND_TASK_UPDATED` snapshot with command | `ClaudeBackgroundTaskRegistry` | Where the command is obtained |
| DS-002 | Primary End-to-End | BEH-003 | AGY turn-end open steps | Snapshot with command | `AgyBackgroundTaskMonitor` | Second producer |
| DS-003 | Return-Event | BEH-001..005 | Server snapshot | Panel row | Presentation contract → web store → `BackgroundTaskPanel` | Delivers and renders the command |
| DS-004 | Bounded Local | BEH-001/002 | assistant tool_use | per-task command | Registry | Correlation and cleanup lifecycle |

## Primary Execution Spine(s)

- DS-001: `Claude CLI → ClaudeTurnTracker.observe → ClaudeBackgroundTaskRegistry (tool_use command ↔ task_started.tool_use_id) → publish snapshot → ClaudeSession emit → event converter → AgentRunEvent BACKGROUND_TASK_UPDATED`
- DS-002: `AGY stream converter (CommandLine) → AgyBackgroundTaskMonitor.track → emit snapshot → AgyAgentRunBackend → AgentRunEvent`
- DS-003: `AgentRunEvent → presentation adapter/parse → agent or team projector → websocket → web adapter → backgroundTaskHandler → agentBackgroundTaskStore → BackgroundTaskPanel row`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The tracker passes each assistant/user frame to the registry. The registry remembers the `input.command` of each tool_use (by its id) until the tool result arrives. When `task_started` names that id, the command becomes part of the task's identity. If the task is already in the view (because `background_tasks_changed` came first), an updated snapshot is published. Otherwise the first snapshot includes the command. | Tracker, Registry | Registry | — |
| DS-002 | `track()` builds the snapshot with `command = commandLine` and leaves the description unchanged. | Monitor | Monitor | — |
| DS-003 | The command passes through every hop verbatim. The panel decides whether to display it (non-null and different from the trimmed title). | Contract, store, panel | Panel for display | Localization (none needed: the separator is a literal `·`) |

## Spine Actors / Main-Line Nodes

`ClaudeTurnTracker`, `ClaudeBackgroundTaskRegistry`, `AgyBackgroundTaskMonitor`, domain builder/parser, presentation contract, projectors, web adapter/handler/store, `BackgroundTaskPanel`.

## Ownership Map

- Registry: owns the Claude task identity (description, type, **command**) and the correlation state (tool_use id → command for in-flight tool calls).
- Tracker: owns frame classification and routing only. It passes the frame and does not interpret tool blocks.
- AGY monitor: owns AGY task snapshots, including the command.
- Domain module: owns the snapshot shape and the strict wire build/parse.
- Contract package: owns the wire schema.
- Panel: owns display rules (when to show, truncation/expansion state).

## Thin Entry Facades / Public Wrappers

N/A. No facades are introduced.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope | Notes |
| --- | --- | --- | --- | --- |
| None | Purely additive feature | — | — | No obsolete path exists |

## Return Or Event Spine(s)

DS-003 (above).

## Bounded Local / Internal Spines

- Parent owner: `ClaudeBackgroundTaskRegistry`
- `assistant frame tool_use{id, input.command:string} → pendingToolCommands.set(id, command)`
- `task_started{task_id, tool_use_id} → commands.set(task_id, pendingToolCommands.get(tool_use_id)); pendingToolCommands.delete(tool_use_id) → if task in view and its command is null → publish({...task, command})`
- `user frame tool_result{tool_use_id} → pendingToolCommands.delete(tool_use_id)`
- `enterBackground(taskId) → snapshot.command = commands.get(taskId) ?? null`
- `clear() → both maps cleared`
- Why it matters: frame ordering (tool_use → `background_tasks_changed` → `task_started` → tool_result) and memory bounding (QR-001).

## Off-Spine Concerns Around The Spine

| Concern | Spine | Serves | Responsibility | Why | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| tool_use block extraction (`input.command` from `message.content[]`) | DS-001/004 | Registry | A small pure private function inside the registry file, using the existing `asArray`/`asObject`/`asString` from `claude-runtime-shared.js` | Keeps the tracker free of content interpretation | Putting it in the tracker would mix routing with task identity |

## Ownership Boundaries

The registry's public surface stays `observeTaskFrame` + `observeConversationFrame` + turn hooks. The tracker must not reach into the registry's maps, and the registry must not depend on `ClaudeSessionToolUseCoordinator`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Mechanisms | Callers | Forbidden Bypass | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `ClaudeBackgroundTaskRegistry.observeConversationFrame(frameKind, frame, interruptRequested)` | pending tool-command map, per-task command map | `ClaudeTurnTracker` | Tracker parsing tool_use itself and pushing commands into the registry; registry reading coordinator state | Extend the registry method, not add tracker logic |
| `buildBackgroundTaskUpdatedPayload` / `parseBackgroundTaskUpdatedPayload` | wire field naming | Claude session, AGY backend, presentation adapter | Hand-built payload objects | — |

## Dependency Rules

- Allowed: tracker → registry. Registry → `claude-runtime-shared` helpers and the domain type. Monitor → domain type. Projectors → domain type and contract parse. Web panel → store → type.
- Forbidden: registry → tool-use coordinator. Web panel → raw payload. Any producer building the payload without the domain builder.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `observeConversationFrame(frameKind: "user" \| "assistant", frame: Record<string, unknown>, interruptRequested: boolean)` | Claude conversation frame | Record/release tool commands (always, even when an interrupt is requested), then the existing completion-consumption logic (unchanged; still skipped when `interruptRequested`) | tool_use `id` / tool_result `tool_use_id` | Signature change; the only caller is the tracker |
| `AgentBackgroundTask.command: string \| null` | Snapshot | Exact command or null | — | Parser: `command !== null && typeof command !== "string"` → throw "background task command is invalid" |
| Wire `command` (snake-case identical) | Payload | Same | — | Contract `command: z.string().nullable()` |
| Web `BackgroundTask.command: string \| null` | Store row | Same | — | — |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguity Risk | Action |
| --- | --- | --- | --- | --- |
| `observeConversationFrame` | Yes (conversation-frame observations owned by the registry) | Yes | Low | — |
| `command` field | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Node | Name | Natural? | Drift Risk | Action |
| --- | --- | --- | --- | --- |
| Snapshot field | `command` | Yes | Low. It is not `commandLine` (AGY-specific) or `toolInput` (too generic). | — |
| Registry maps | `pendingToolCommands` (by tool_use id), `commands` (by task id) | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why | If New |
| --- | --- | --- | --- | --- |
| Command for Claude tasks | `ClaudeBackgroundTaskRegistry` | Extend | It already owns task identity from CLI frames | — |
| tool_use parsing | `ClaudeSessionToolUseCoordinator` | Not reused | It has a different subject (tool cards) and consume-on-result timing | A tiny local extraction (about 10 lines) is clearer than a cross-owner dependency |
| Expand/collapse UI | Existing summary toggle in `BackgroundTaskPanel.vue` | Reuse the pattern | Same interaction is required by REQ-005 | — |

## Subsystem / Capability-Area Allocation

| Area | Concerns | Spines | Decision |
| --- | --- | --- | --- |
| agent-presentation-contracts | Wire schema | DS-003 | Extend |
| server agent-execution/domain | Snapshot + build/parse | DS-001..003 | Extend |
| server claude backend session | Correlation | DS-001/004 | Extend |
| server antigravity backend stream | AGY command | DS-002 | Extend |
| server agent-collaboration / services projectors | Pass-through | DS-003 | Extend |
| web streaming + store + progress panel | Transport/display | DS-003 | Extend |

## Draft File Responsibility Mapping

See Final mapping. No new files are introduced, and the draft equals the final.

## Reusable Owned Structures Check

| Structure | Shared File | Owner | Why | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Snapshot shape | `agent-background-task.ts` (existing) | server domain | Single build/parse | Yes | Yes | A bag of runtime-specific fields (no `toolUseId`, no `commandLine`) |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AgentBackgroundTask.command` | Yes: the command executed, or null | Yes | Low. For AGY, `description` and `command` hold the same text by fact, not by duplication of meaning (the description is the title the runtime gives; AGY has no other title). | The panel's dedupe rule handles display |

## Final File Responsibility Mapping

| File | Owner | Change |
| --- | --- | --- |
| `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` | Contract | Add `command: z.string().nullable()` to `BACKGROUND_TASK_UPDATED`. `dist/` is tracked in git: rebuild and commit it. Also rebuild `autobyteus-team-stream-contracts/dist` if its built output inlines the schema. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-background-task.ts` | Domain | Add the field to the type, builder and strict parser; update the doc comment |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-background-task-registry.ts` | Registry | `pendingToolCommands`, `commands`, tool_use extraction, `task_started` correlation and republish, release on tool_result, `command` in `enterBackground`, clear in `clear()` |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-turn-tracker.ts` | Tracker | Pass `frame` to `observeConversationFrame` |
| `autobyteus-server-ts/src/agent-execution/backends/antigravity/stream/agy-background-task-monitor.ts` | AGY monitor | `command: step.commandLine` |
| `autobyteus-server-ts/src/agent-collaboration/execution/events/agent-presentation-message-projector.ts` | Projector | Map `command: event.details.command` |
| `autobyteus-server-ts/src/services/agent-streaming/team-agent-event-websocket-projector.ts` | Projector | Add `command: event.details.command` to the explicit field list at :107 |
| `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts` | Web protocol type | `command: string \| null` |
| `autobyteus-web/services/agentStreaming/teamStreamDtoAdapters.ts` | Web adapter | Add `command` to the explicit field list (:162). The :86 branch spreads it. |
| `autobyteus-web/services/agentStreaming/handlers/backgroundTaskHandler.ts` | Handler | Map `command` |
| `autobyteus-web/types/backgroundTask.ts` | Web type | `command: string \| null` |
| `autobyteus-web/components/progress/BackgroundTaskPanel.vue` | Panel | Command line rendering + `expandedCommands` toggle |

## Applied Patterns

Registry (lookup by id) inside the existing registry owner, scoped to tool calls in flight.

## Target Subsystem / Folder / File Mapping

Existing paths only (above). No folders are created, moved or deleted.

## Folder Boundary Check

N/A. Existing placement is unchanged.

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Wire payload | `{task_id:"bmojuvt1t", kind:"shell", description:"Probe background sleep", command:"sleep 6 && echo BG_DONE", status:"running", summary:null, started_at:"…"}` | `command` omitted when unknown; `tool_use_id` leaked to the web | Strict, runtime-neutral contract |
| Row (Claude) | Line 1: `⟳ Wait for release workflows to complete  [Running]`. Line 2: `Shell · cd /tmp && for i in $(seq 1 110); do …` with the command part in `font-mono`, `truncate`, `title=<full command>`, rendered as a `<button aria-expanded>` that toggles `whitespace-pre-wrap break-all` | Command replacing the description; command in a separate third line when collapsed | Matches the approved REQ-005 and the chat `Bash · cmd` style |
| Row (AGY) | Line 1: `npm run dev  [Running]`. Line 2: `Shell` | Line 2 `Shell · npm run dev` | REQ-006 dedupe: show the command only if `command.trim() !== description.trim()` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Clean-Cut Plan |
| --- | --- | --- | --- |
| Optional `command` key (`.optional()`) to tolerate old servers | Mixed-version server/web | Rejected | Server and web ship in one bundle. Required nullable key everywhere. |
| Putting the command into `description` for Claude | Zero contract change | Rejected | Loses the model's human description (the preserved title) |

## Derived Layering

N/A.

## Change / Refactor Sequence

1. Contract schema (+ contract tests).
2. Server domain type/builder/parser (+ domain tests). Fix all compile errors in snapshot constructors and tests.
3. AGY monitor `command`.
4. Registry correlation + tracker frame pass-through (+ registry unit tests: Bash order `tool_use → background_tasks_changed → task_started` gives the first snapshot `command:null`, then an update with the command; `task_started(is_backgrounded:true)` with the tool_use already seen gives the first snapshot with the command; Monitor; missing tool_use_id gives null; tool_result releases the pending entry; `clear()` empties the maps; subagent task gives null).
5. Server projectors (agent + team).
6. Web types/adapter/handler/store tests.
7. Panel rendering + component tests (AC-003/004/005). Update `tests/e2e/fixtures/background-tasks-panel.page.vue` fixtures with the field.
8. Live Claude E2E (`claude-agent-background-task.e2e.test.ts`, team variant): assert `command` equals the requested command.
9. Docs: `autobyteus-server-ts/docs/modules/agent_execution.md` (payload shape + correlation), `antigravity_cli_runtime.md`, `autobyteus-web/docs/agent_execution_architecture.md` (`autobyteus-ts/docs/agent_team_streaming_protocol.md` only says autobyteus-ts emits no background tasks, so no change).

## Key Tradeoffs

- The registry correlates by itself instead of reusing the coordinator's parsed tool inputs. This duplicates about 10 lines of extraction but keeps owners independent.
- The first Claude snapshot may lack the command for a moment (from `background_tasks_changed`). This is accepted under REQ-007 because the upsert fills it in at once. Delaying publication was rejected as needless coordination.

## Risks

- RSK-001: CLI frame-shape drift. Mitigation: graceful null, a re-runnable probe, and the live E2E assertion.
- Long commands (heredocs, multi-line). Mitigation: truncation plus expansion with `pre-wrap`. No length cap is needed (it is already in the chat payload).

## Guidance For Implementation

- Record tool commands **before** the existing `interruptRequested` early return in `observeConversationFrame`.
- Extract only `block.type === "tool_use"` blocks with a non-empty string `input.command`. Tool names are not filtered (works for Bash, Monitor, and future shell tools).
- On `task_started`, consume the pending entry even if `is_backgrounded` is false, so a later move to the background keeps the command.
- Do not show the command line when `command` is null/blank or equals the trimmed displayed title.
- Keep the kind label's localized text. The separator `·` and the command are not localized.
- Follow `TESTING.md` for validation surfaces.

# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, approved by the Solution Designer within the founder's direction (Task comment 2026-11-17 "DIRECTION AND GO"); user informed in the Solution Designer's conversation 2026-11-17.
- Behavior-defining supplements and their approval references: None
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/shell-command-time-limits-483/tickets/in-progress/shell-command-time-limits-483/investigation-notes.md`
- Authorities read (2026-11-17): `references/architecture-design.md`, `references/design-principles.md`, `references/handoff.md`, `references/project-documents.md`, repository `DESIGN.md` (rules 7, 9, 11, 12; project documents list). `references/design-examples.md` not needed.
- Project design-principle conflicts or discrepancies: None.

## Current-State Read

- **Claude child environment.** `ClaudeSdkClient.resolveSpawnEnvironment` (`claude-sdk-client.ts:355-371`) calls `buildClaudeSdkSpawnEnvironment` (`claude-sdk-spawn-environment.ts:61-68`): copy `process.env`, apply the auth policy, then `applyClaudeOneHourPromptCacheDefault` (`claude-prompt-cache-setting.ts:24-34`, sets a variable only when it is undefined). The result is the SDK `env` option (`claude-sdk-client.ts:338`). AutoByteus launches the user's own `claude` (`claude-sdk-executable-path.ts:85-94`); Claude Code 2.1.325 derives all four shell limits from `BASH_DEFAULT_TIMEOUT_MS` / `BASH_MAX_TIMEOUT_MS` (investigation notes, Source Log; probe B Measured). BEH-001, BEH-002.
- **Background task end.** Runtimes publish `AgentBackgroundTask` snapshots (`agent-execution/domain/agent-background-task.ts`) as `BACKGROUND_TASK_UPDATED`; the payload has `status` and free-text `summary` only. Claude: `ClaudeBackgroundTaskRegistry.finishTask` (`claude-background-task-registry.ts:315-327`) from `task_notification` (line 155) and `task_updated` (line 151), `clear()` at process end (line 250). Native: `toAgentBackgroundTask` (`autobyteus-background-task-reporter.ts:9-25`). Antigravity: `AgyBackgroundTaskMonitor` exit (line ~108) and `stopAll()` (line 80-86). Codex: snapshot rows already carry `exitCode` (`codex-background-task-view.ts:120-171`). Web: store/handler → `BackgroundTaskPanel.vue` (exit-code line only for snapshot rows, summary button) and `MobileBackgroundTasks.vue` (`endOf()`). BEH-003.
- **No-run panel.** `useBackgroundTaskPanelView` watch (lines 85-90) sets `mode='loading'` and `refresh()` returns at once when `runId` is empty, so loading never ends. BEH-004.
- **Prompt.** `composeSharedCarpenterPrompt` (Claude, Codex, AGY, ACP) and `composeNativeAutoByteusPrompt` (native, adds Bash/File practice) in `carpenter-prompt-composer.ts`; no runtime-specific shell guidance except native's Bash practice. BEH-006.
- Constraints: absent-only defaults (REQ-002); clean-cut contract (DESIGN.md rule 9); task snapshots are not persisted.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 25 files, each a small edit inside its existing owner: one env default (Claude client), one domain type + wire payload + GraphQL type + presentation-contract schema, three runtime mappings (Claude registry with a small new summary reader, native reporter, AGY monitor), web types/handler/composable/panel/phone/localization, prompt composer + one new section file + five call sites, and the probe. No new subsystem, owner or route.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: the change rides existing owners and paths. The contract change is two nullable fields added to an existing event payload and GraphQL type, produced and consumed within one release (DESIGN.md rule 9) and never stored (investigation notes, Persisted Data). No security, concurrency, persistence or deployment surface. The Claude env change uses the same absent-only rule as the existing cache default and is measured (probe B). Prompt texts are content.
- Escalation trigger: if a runtime turns out to need its own end-reason transport beyond the existing snapshot (e.g. Codex snapshot rows need a reason), or the Claude CLI ignores the variables on the validation instance, or the settings-`env` precedence (ASM-001) fails and a new AutoByteus setting is needed, return a Design Impact / Requirement Gap to the Solution Designer.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Probe A/B | `evidence/claude-timeout-probe/` | Variables lift the foreground limit (Measured) | D-1 env defaults | Background part read, not run (AC-002 runs it) |
| Claude Code 2.1.325 strings | investigation notes Source Log | background default/max = max(code limit, variables); stop-cause texts | D-1; D-3 summary reader | wording may change (RSK-002) |
| `claude-prompt-cache-setting.ts:24-34` | code | absent-only default pattern | D-1 | — |
| `sdk.d.ts:5738-5768` | SDK types | `reason?: 'worker_restart'`; no exit code field | D-3 | — |
| `autobyteus-agent-run-backend.ts:332-349` | code | `removeAgent` runs while the reporter is subscribed | D-4 native run-end marking | — |
| `agy-background-task-monitor.ts:79-86` | code | `stopAll()` publishes `stopped` | D-4 AGY | — |
| `agent-presentation-message-dtos.ts:109` | contract | strict schema for the payload | D-2 contract | — |
| `useBackgroundTaskPanelView.ts:85-90` | web | no-run stays loading | D-6 | — |
| composer call sites | `claude-session-bootstrapper.ts:103`, `codex-thread-bootstrapper.ts:213`, `agy-agent-run-backend-factory.ts:63`, `acp-agent-run-backend-factory.ts:155`, `autobyteus-agent-run-backend-factory.ts:331` | each backend composes its own prompt | D-7 | — |

## Intended Change

1. Claude runs fill in `BASH_DEFAULT_TIMEOUT_MS=7200000` and `BASH_MAX_TIMEOUT_MS=7200000` when not set.
2. `AgentBackgroundTask` gains `endReason` (`time_limit` | `low_memory` | `run_ended` | null) and `exitCode` (integer | null), filled by the Claude, native and Antigravity mappings, carried on the stream and GraphQL, and shown as one reason line on desktop and phone.
3. The desktop panel has a no-run state; the panel probe is brought up to date.
4. Every runtime's system prompt ends with a "Long-Running Commands" section written for that runtime.

## Change Scope (Mandatory)

- In scope: UC-001..UC-006. Areas: Claude client spawn environment; background-task domain type and its producers (Claude registry, native reporter, AGY monitor), its transports (stream payload schema, GraphQL type), and its web consumers (types, handler, composable, desktop panel, phone list, localization, probe); prompt composer and backends' composer calls.
- Derived consumers of `AgentBackgroundTask` (Principle 11): `buildBackgroundTaskUpdatedPayload`/`parseBackgroundTaskUpdatedPayload` (update both); `claude-session-event-converter.ts:256` (passes through, no change); `collaboration-agent-presentation-adapter.ts:362` and `agent-presentation-message-projector.ts` (pass the parsed details through; check they copy the whole object, extend if they list fields); `delegated-run-idle-shutdown.ts:53`, `delegated-team-idle-shutdown.ts` (read `status` only, no change); `background-task-notice-*` (native notices built from `BackgroundTaskEnd`, not from this type, no change); GraphQL `AgentBackgroundTask` (add fields); web `BackgroundTask`, store, handler, `useBackgroundTaskPanelView` seed mapping (add fields); Codex `AgentBackgroundTaskViewRow` (already has `exitCode`; no `endReason`, no change).
- Deliberately left alone: Codex/Grok/Antigravity/DeepSeek/native shell limits (DEC-004); Codex snapshot rows (they already show exit code; Codex reports no stop cause); background-task notices text; native foreground default; agent skills (DEC-005); the 1-hour cache default.
- Follow-ups: None found.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger | Existing Behavior | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 | System | REQ-001, REQ-002; AC-001..AC-004 | Claude run start | 2 min / 10 min / 30 min / 2 h | All four 2 h; explicit values kept | DS-001 |
| BEH-003 | User | REQ-003, REQ-004; AC-005..AC-008 | Task ends | status + summary | + end reason + exit code, one line | DS-002, DS-003 |
| BEH-004 | User | REQ-005; AC-009 | Panel without run | loading forever | no-run state | DS-003 (local) |
| BEH-005 | System | REQ-008; AC-002 | Long command in other runtimes | not stopped | unchanged, verified | — |
| BEH-006 | System | REQ-007; AC-011, AC-012 | Run start | no guidance | per-runtime section | DS-004 |
| BEH-007 | Operational | REQ-006; AC-010 | Probe run | stale | current | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `evidence/claude-timeout-probe/` | Probe | REQ-001, AC-001 | Proves D-1's mechanism; implementation may rerun it | Final |

## Task Design Health Assessment (Mandatory)

- Change posture: `Behavior Change` (with a small feature: end reasons).
- Current design issue found: `No`.
- Structural triggers that fire, each with evidence and response:
  - *Capability-area reuse* (Principle 4): env defaults → reuse the Claude spawn-environment owner and the absent-only rule of the cache default; end reasons → extend the existing background-task vocabulary rather than a parallel "end info" type; prompt guidance → extend the composer.
  - *Shared-structure tightness* (11): `exitCode` already exists on Codex snapshot rows (`AgentBackgroundTaskViewRow.exitCode`) and on web `BackgroundTaskSnapshotRow`; the same field name and meaning (integer exit code or null) is added to the event-stream task so the panel reads one field for both. `summary` keeps its meaning (the runtime's own text).
  - *Persisted-data transition* (5): fires on the payload change → `Not Affected` (below).
  - *Several kinds or forms* (1): end reasons come from three producers (Claude, native, AGY) and Codex snapshot rows; each is traced in DS-002 with its own mapping; Codex has none.
  - *Derived data* (11): the reason line is derived once, in one web helper used by both desktop and phone (D-5), not recomputed per view.
  - *Behavior by absence* (13): "no reason reported" is not derived from a failed lookup into a fake reason; null shows the runtime's summary as today, which is the approved behavior (AC-008).
  - Ruled out: Empty indirection (no new interface/port; the summary reader is a pure function used by the registry); Hidden dependency (all new values passed as arguments/constructor fields); Ambiguous boundary, Backward dependency (none).
- Deliberate deviations: None.
- Root cause classification: `No Design Issue Found` (limits are runtime defaults AutoByteus never set; the panel lacked a field).
- Refactor needed now: `No`.
- Evidence: owners above absorb each change locally.
- Design response: extend existing owners.
- Refactor rationale: N/A.
- Intentional deferrals and residual risk: RSK-002 (Claude wording) accepted.

## Terminology

- `end reason`: why a background task ended when the runtime says so: `time_limit` (the runtime's time limit stopped it), `low_memory` (the runtime stopped it because the computer was low on memory), `run_ended` (the run or its runtime process ended). No project glossary entry needed beyond this; add "end reason" to `GLOSSARY.md` under background tasks if the glossary has such a section (implementation checks).
- `long-running command section`: the per-runtime "Long-Running Commands" prompt section.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the desktop panel's snapshot-only exit-code paragraph (`BackgroundTaskPanel.vue`, `'exitCode' in task` branch) is replaced by the shared reason line; the phone's `endOf()` exit-code branch likewise.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected`. Background task snapshots live in runtime memory and the stream; run history stores only background-task notices (`historical-replay-event-types.ts:85`, `runtime-memory-event-accumulator.ts`). No stored shape changes.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002 | Claude run start | Claude Code Bash limits | `ClaudeSdkClient` (env via `buildClaudeSdkSpawnEnvironment`) | Where the limits are set |
| DS-002 | Return-Event | BEH-003 | Runtime task end (Claude frame / native manager change / AGY exit or stop) | `BACKGROUND_TASK_UPDATED` with end reason + exit code | Each runtime's task owner (registry / reporter / monitor) | Producers of the reason |
| DS-003 | Primary End-to-End | BEH-003, BEH-004 | Stream event / GraphQL view | Reason line on desktop and phone | web store + `useBackgroundTaskPanelView` + `backgroundTaskEnd` helper | What the user sees |
| DS-004 | Primary End-to-End | BEH-006 | Backend creates/restores a run | System prompt with the runtime's section | `carpenter-prompt-composer` | Agent habit |

## Primary Execution Spine(s)

- DS-001: `Run start -> ClaudeSessionBootstrapper -> ClaudeSdkClient.resolveSpawnEnvironment -> buildClaudeSdkSpawnEnvironment (auth policy -> one-hour cache default -> shell time-limit default) -> SDK query(env) -> Claude Code Bash tool`
- DS-003: `BACKGROUND_TASK_UPDATED / AgentBackgroundTaskView -> backgroundTaskHandler / seedTasks -> agentBackgroundTaskStore -> useBackgroundTaskPanelView -> describeBackgroundTaskEnd -> BackgroundTaskPanel / MobileBackgroundTasks`
- DS-004: `Backend factory/bootstrapper -> composeSharedCarpenterPrompt({ ..., longRunningCommandSection }) | composeNativeAutoByteusPrompt -> system prompt -> runtime`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | When a Claude run starts, the client builds the CLI env; after the cache default it fills in the two shell variables if absent; Claude Code then applies 2 h to foreground and background limits | spawn env | `buildClaudeSdkSpawnEnvironment` | `claude-shell-time-limit-setting.ts` (values + absent-only rule) |
| DS-002 | When a task ends, its runtime owner sets status, summary, end reason and exit code in one snapshot; Claude reads them from the notification; native from the manager's outcome and a run-ending flag; AGY from the exit message or its stop | task snapshot | registry / reporter / monitor | `claude-background-task-end.ts` (summary reader) |
| DS-003 | The web keeps the snapshot as is; the panel and the phone ask one helper for the end line and render it in their own strings | task row | panel views | localization |
| DS-004 | Each backend passes its runtime's section; the composer appends it last | prompt | composer | `long-running-command-sections.ts` |

## Spine Actors / Main-Line Nodes

`buildClaudeSdkSpawnEnvironment`; `ClaudeBackgroundTaskRegistry`; `AutoByteusBackgroundTaskReporter`; `AgyBackgroundTaskMonitor`; `buildBackgroundTaskUpdatedPayload`/parser; GraphQL `AgentBackgroundTask`; web store/handler; `useBackgroundTaskPanelView`; `BackgroundTaskPanel`/`MobileBackgroundTasks`; carpenter composer.

## Ownership Map

- `buildClaudeSdkSpawnEnvironment`: owns the order of env policies for the CLI child.
- `claude-shell-time-limit-setting.ts` (new, beside `claude-prompt-cache-setting.ts`): owns the two variable names, the value 7,200,000 and the absent-only rule.
- `ClaudeBackgroundTaskRegistry`: owns Claude task snapshots, now including end reason/exit code.
- `claude-background-task-end.ts` (new, pure): owns reading Claude's notification (`status`, `summary`, `reason`) into `{ endReason, exitCode }`; the only place that knows Claude's summary wording.
- `AutoByteusBackgroundTaskReporter`: owns native snapshots; now knows whether the run is ending.
- `AgyBackgroundTaskMonitor`: owns AGY snapshots.
- `agent-background-task.ts`: owns the vocabulary (`AGENT_BACKGROUND_TASK_END_REASONS`) and the wire payload.
- web `utils/backgroundTaskEnd.ts` (new): owns deriving the end descriptor from a row (both views use it).
- `long-running-command-sections.ts` (new): owns the per-runtime section texts; the composer owns placement.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — none added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `BackgroundTaskPanel.vue` snapshot-only `background-task-exit` paragraph | The reason line covers exit codes for every row | shared reason line (`data-test="background-task-end"`) | keep the i18n `exitCode` key, now used by the reason line |
| `MobileBackgroundTasks.vue` `endOf()` exit-code branch | same | `describeBackgroundTaskEnd` | summary fallback stays |
| native reporter's `summary: "exit code N"` text | the exit code is now a field | `exitCode` field; summary keeps `signal X` / error text and becomes null for exit-code ends | check consumers of that summary text (tests, the notice builder uses `BackgroundTaskEnd`, not this) |
| probe expectations of pre-473 texts | stale | current texts | FU-002 |

## Return Or Event Spine(s) (If Applicable)

DS-002 per producer:
- Claude: `CLI task_notification -> ClaudeBackgroundTaskRegistry.observeTaskFrame -> readClaudeTaskEnd(status, summary, reason) -> finishTask(status, summary, end) -> publish -> converter -> BACKGROUND_TASK_UPDATED`. A preceding `task_updated` (`killed`/`failed`/`completed`) may end the task first with `endReason/exitCode` null; the later notification fills `summary`, `endReason` and `exitCode` where still null (extend the existing "fill summary when null" rule at lines 324-326). `clear()` → `stopped`, `endReason: run_ended`. `reason: 'worker_restart'` → `run_ended`.
- Native: `BackgroundProcessManager change -> reporter.publish -> toAgentBackgroundTask(change, runEnding) -> BACKGROUND_TASK_UPDATED`. `exitCode` from `outcome.exitCode`; a signal end while `runEnding` → `endReason: run_ended`. The backend calls `backgroundTaskReporter.markRunEnding()` immediately before `removeAgent(...)` (`autobyteus-agent-run-backend.ts:334`).
- AGY: exit message → `exitCode: exit.exitCode`; `stopAll()` → `endReason: run_ended`.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `claude-shell-time-limit-setting.ts` | DS-001 | spawn env | values + absent-only | one place for the policy | env builder grows Claude-specific constants |
| `claude-background-task-end.ts` | DS-002 | Claude registry | parse Claude wording | wording is CLI-specific and version-sensitive | registry mixes parsing with lifecycle |
| `backgroundTaskEnd.ts` (web) | DS-003 | both views | derive end descriptor | one derivation, two views | drift between desktop and phone |
| `long-running-command-sections.ts` | DS-004 | composer callers | section texts | texts reviewed together | texts scattered in five backends |

## Ownership Boundaries

- The Claude CLI env is built only by `buildClaudeSdkSpawnEnvironment`; no other caller sets the shell variables.
- Claude's summary wording is read only in `claude-background-task-end.ts`.
- Views never parse `summary`; they use `endReason`/`exitCode` via the helper and show `summary` verbatim as fallback.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | Fix |
| --- | --- | --- | --- | --- |
| `buildClaudeSdkSpawnEnvironment` | auth policy, cache default, shell limit default | `ClaudeSdkClient` | setting `BASH_*` in `buildQueryOptions` or elsewhere | extend the builder |
| `buildBackgroundTaskUpdatedPayload` | wire field names | every producer | building the payload by hand | use the builder |

## Dependency Rules

- `claude-sdk-spawn-environment.ts` → `claude-shell-time-limit-setting.ts` (like the cache setting). Nothing else imports the new setting file except its test.
- `claude-background-task-registry.ts` → `claude-background-task-end.ts` → domain types. No other module imports the Claude reader.
- Backends → `long-running-command-sections.ts` for their text; composer does not import runtime names (it takes the section as input).
- `AutoByteusAgentRunBackend` → `AutoByteusBackgroundTaskReporter.markRunEnding()`.
- Web views → `utils/backgroundTaskEnd.ts`; helper depends only on `types/backgroundTaskView.ts`.
- Collaborators: all passed as arguments or existing constructor fields; no new process-wide binding, registry or singleton. `None` (Principle 16).

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `applyClaudeShellTimeLimitDefaults(spawnEnv)` | Claude CLI env | fill the two variables when undefined | env record | mirrors `applyClaudeOneHourPromptCacheDefault` |
| `readClaudeTaskEnd({ status, summary, reason })` → `{ endReason, exitCode }` | one Claude notification | parse | notification fields | pure |
| `AgentBackgroundTask.endReason`, `.exitCode` | one task | why it ended / exit code | — | null when unknown or running |
| GraphQL `AgentBackgroundTask.endReason: AgentBackgroundTaskEndReason`, `exitCode: Int` (both nullable) | one task | transport | — | regenerate web `generated/graphql.ts` |
| `AutoByteusBackgroundTaskReporter.markRunEnding()` | native run | flag | — | called once at termination |
| `SharedCarpenterPromptComposerInput.longRunningCommandSection: string` (required) | run prompt | runtime section | — | required so a backend cannot forget it |
| `describeBackgroundTaskEnd(row)` → `{ kind: 'time_limit' \| 'low_memory' \| 'run_ended' } \| { kind: 'exit_code'; code } \| null` | one row | end descriptor | panel row | precedence: `endReason` first, then `exitCode`, else null |

No new interface, port, adapter or wrapper; each function above owns a translation or rule.

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| all above | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| end reason | `endReason` / `end_reason` (wire) | Yes | Yes (new) | Low | add to GLOSSARY if a background-task entry exists |
| exit code | `exitCode` / `exit_code` | Yes | Yes (same as Codex snapshot row) | Low | — |
| time limit | `time_limit` | Yes | matches Claude's "background time limit" | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| CLI env default | `runtime-management/claude` cache setting pattern | Extend (sibling file) | same rule |
| End info | `agent-background-task.ts` vocabulary | Extend | one task type |
| Exit code field | Codex snapshot row `exitCode` | Reuse name/meaning | one meaning |
| Prompt guidance | carpenter composer | Extend | owner of prompt sections |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| `runtime-management/claude` | env defaults | DS-001 | Extend |
| `agent-execution/domain` | vocabulary + payload | DS-002 | Extend |
| `agent-execution/backends/{claude,autobyteus,antigravity}` | producers | DS-002 | Extend |
| `api/graphql/types` | transport | DS-003 | Extend |
| `autobyteus-agent-presentation-contracts` | stream schema | DS-003 | Extend |
| `autobyteus-web` | views | DS-003 | Extend |
| `agent-execution/prompt` + backends | sections | DS-004 | Extend |

## Draft File Responsibility Mapping

See Final mapping (no change after the reuse check).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| End-line derivation for desktop and phone | `autobyteus-web/utils/backgroundTaskEnd.ts` | web | same fact in two views | Yes | Yes | a formatter of localized text (each view keeps its strings) |
| End-reason values | `AGENT_BACKGROUND_TASK_END_REASONS` (server) / `backgroundTaskEndReasonSchema` (contracts) | domain / contracts | one list | Yes | Yes | — |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `AgentBackgroundTask` + `endReason`, `exitCode` | Yes | Yes (native stops writing "exit code N" into `summary`) | Low | — |

## Final File Responsibility Mapping

| File | Area | Owner | Concern | Change |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-management/claude/claude-shell-time-limit-setting.ts` | claude | new | variable names, 7,200,000, `applyClaudeShellTimeLimitDefaults` | Add |
| `.../runtime-management/claude/client/claude-sdk-spawn-environment.ts` | claude | builder | call it after the cache default; doc comment | Modify |
| `.../agent-execution/domain/agent-background-task.ts` | domain | vocabulary | `AGENT_BACKGROUND_TASK_END_REASONS`, two fields, builder/parser (`end_reason`, `exit_code`, required-nullable) | Modify |
| `.../backends/claude/session/claude-background-task-end.ts` | claude | new | `readClaudeTaskEnd` | Add |
| `.../backends/claude/session/claude-background-task-registry.ts` | claude | registry | pass end info into `finishTask`; fill nulls; `clear()` → `run_ended`; new snapshots start with nulls | Modify |
| `.../backends/autobyteus/autobyteus-background-task-reporter.ts` | native | reporter | `exitCode`, `markRunEnding`, `run_ended` | Modify |
| `.../backends/autobyteus/autobyteus-agent-run-backend.ts` | native | backend | call `markRunEnding()` before `removeAgent`; pass `longRunningCommandSection` n/a (native composer owns it) | Modify |
| `.../backends/antigravity/stream/agy-background-task-monitor.ts` | AGY | monitor | `exitCode`; `stopAll` → `run_ended`; running snapshots with nulls | Modify |
| `.../api/graphql/types/agent-background-task-view.ts` | API | GraphQL | two nullable fields, enum `AgentBackgroundTaskEndReason` | Modify |
| `autobyteus-agent-presentation-contracts/src/agent-presentation-message-dtos.ts` | contracts | schema | `backgroundTaskEndReasonSchema`; payload `end_reason`, `exit_code` (nullable) | Modify |
| `.../agent-collaboration/execution/events/*` | collaboration | adapter/projector | pass the new fields if they list fields explicitly | Modify if needed |
| `autobyteus-web/types/backgroundTask.ts`, `types/backgroundTaskView.ts` | web | types | fields; snapshot row `endReason: null` | Modify |
| `autobyteus-web/services/agentStreaming/handlers/backgroundTaskHandler.ts`, `protocol/messageTypes.ts` | web | handler | map fields | Modify |
| `autobyteus-web/graphql/queries/agentBackgroundTaskQueries.ts`, `generated/graphql.ts` | web | query | select fields; regenerate | Modify |
| `autobyteus-web/composables/useBackgroundTaskPanelView.ts` | web | composable | seed mapping; `mode: 'no-run'` when `runId` is empty | Modify |
| `autobyteus-web/utils/backgroundTaskEnd.ts` | web | new | `describeBackgroundTaskEnd` | Add |
| `autobyteus-web/components/progress/BackgroundTaskPanel.vue` | web | panel | reason line; no-run state | Modify |
| `autobyteus-web/components/mobile/views/MobileBackgroundTasks.vue` | web | phone | reason line via helper | Modify |
| `autobyteus-web/localization/messages/{en,zh-CN}/workspace.ts` | web | strings | `end.timeLimit`, `end.lowMemory`, `end.runEnded`, `noRun` | Modify |
| `autobyteus-web/tests/e2e/background-tasks-panel-probe.mjs`, `tests/e2e/fixtures/background-tasks-panel.page.vue` | web tests | probe | current texts; end-reason scenario | Modify |
| `autobyteus-server-ts/src/agent-execution/prompt/long-running-command-sections.ts` | prompt | new | five section texts (Claude, Codex, Antigravity, Grok, generic ACP/DeepSeek) + native | Add |
| `.../prompt/carpenter-prompt-composer.ts` | prompt | composer | required `longRunningCommandSection` (shared); native appends its own; placed last | Modify |
| `claude-session-bootstrapper.ts`, `codex-thread-bootstrapper.ts`, `agy-agent-run-backend-factory.ts`, `acp-agent-run-backend-factory.ts` (+ `AcpAgentLaunchProfile` field set in `grok-build-launch-profile.ts` and `deepseek-harness-launch-profile.ts`) | backends | callers | pass the runtime's section | Modify |
| Tests next to each changed unit (existing test files listed in investigation; new tests for the two new server files and the web helper) | tests | — | — | Add/Modify |

## Applied Patterns (If Any)

None beyond the existing absent-only env default.

## Target Subsystem / Folder / File Mapping

As in the Final File Responsibility Mapping; every new file sits beside the owner it serves (`runtime-management/claude/`, `backends/claude/session/`, `agent-execution/prompt/`, `autobyteus-web/utils/`).

## Folder Boundary Check

| Path | Depth | Clear? | Risk | Note |
| --- | --- | --- | --- | --- |
| `agent-execution/prompt/long-running-command-sections.ts` | Off-spine (content) | Yes | Low | texts reviewed together; composer stays runtime-neutral |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Env default | `applyClaudeShellTimeLimitDefaults(env)`: `if (env.BASH_DEFAULT_TIMEOUT_MS === undefined) env.BASH_DEFAULT_TIMEOUT_MS = "7200000"`; same for MAX | Always overwriting; or setting only MAX (background default would stay 30 min) | REQ-002; DEC-001 |
| Claude reader | `status:'stopped', summary:'Background command "x" was stopped after reaching its background time limit'` → `{ endReason:'time_limit', exitCode:null }`; `status:'failed', summary:'Background command "x" failed with exit code 2'` → `{ endReason:null, exitCode:2 }`; `status:'completed', summary:'… completed (exit code 0)'` → `{ null, 0 }`; `reason:'worker_restart'` → `run_ended`; unknown text → `{ null, null }` | Views matching summary text | One place knows the wording |
| Reason line (desktop, en) | `Stopped: it reached its time limit — not a failure of the command` / `Stopped: the computer was low on memory` / `Stopped: the run ended` / `Exit code 1` | A new chip colour per reason; hiding the summary | Minimal, clear |
| No-run (desktop, en) | `Select an agent to see its background tasks.`; counts label empty | "Checking…" forever | AC-009 |
| Claude section (en) | `## Long-Running Commands` / `- A shell command may run up to 2 hours here, in the foreground or with run_in_background.` / `- Start a long build or test suite once. If you have other work, run it with run_in_background: its result reaches you automatically when it ends; act on that notice.` / `- Do not wait with loops of sleep or repeated checks, and never start a second copy of a running command or a second command that only waits for it. To look at progress, read its output file.` | Telling the agent to poll; restating Claude's whole Bash doc | REQ-007, QR-002 |
| Codex section | exec_command keeps a command running in its session when it outlasts its wait; wait on that same session (write_stdin with empty input and a long yield_time_ms) instead of starting it again; no short-poll loops; no second copy | Claiming a completion notice Codex does not give | facts (investigation notes) |
| Grok section | `run_terminal_command` with `block_until_ms: 0` for long jobs; a command that outlasts its block keeps running in the background and its completion appears in the conversation; to wait, `get_command_or_subagent_output` with a positive `timeout_ms` (at most 1 hour per call); no sleep loops; no second copy | — | facts |
| Antigravity section | `run_command` continues in the background after `WaitMsBeforeAsync` and you are notified when it finishes; do not poll or set timers; no second copy | — | facts |
| Native section | `run_bash` with `run_in_background` for long work; you are told its exit code when it ends; background commands have no time limit but stop when the run ends; a foreground command is killed at `timeout_seconds` (default 30), so give one you wait on enough time; no sleep loops; no second copy | — | facts |
| Generic (DeepSeek) | start once; use the shell tool's background option when it has one and act on its notice; otherwise wait on the same job; no sleep loops; no second copy | — | not investigated |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Optional wire fields for older clients/servers/peer nodes | additive change | Rejected (DESIGN.md rule 9) | required-nullable fields in builder, parser, schema |
| Keeping native "exit code N" summary alongside `exitCode` | old text | Rejected | field only; summary null for exit-code ends |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Server domain: end-reason vocabulary, payload builder/parser (+ tests).
2. Producers: Claude reader + registry; native reporter + backend `markRunEnding`; AGY monitor (+ tests).
3. Transports: GraphQL type; presentation-contracts schema; collaboration pass-through.
4. Claude env default (+ tests, AC-004/AC-003 unit).
5. Web: types, handler, query + codegen, composable (seed + no-run), helper, panel, phone, localization (+ component tests); probe update and run (AC-010).
6. Prompt: sections file, composer field, five call sites (+ composer/backend prompt tests).
7. DESIGN.md rule 12 check: the change touches `generated/graphql.ts` and a contracts package the web compiles; no new gate reads another package's build output; confirm the web gate's existing prepare step already builds `autobyteus-agent-presentation-contracts`.

## Key Tradeoffs

- Foreground default 2 h (RSK-001) versus the founder's explicit "both 2 hours": accepted; a new user message still moves a running command to the background.
- Reading Claude's wording (RSK-002) versus no reason at all: the reader is isolated and unit-pinned; unknown wording falls back to today's summary.
- One prompt-text file versus one per backend: one file keeps the five texts consistent; the composer stays runtime-neutral by taking the text as input.

## Risks

- RSK-001, RSK-002 (requirements).
- ASM-001 (settings `env` precedence) — AC-003 live check.
- UNK-001 — AC-002 long runs; any stop found goes back to the Solution Designer and the founder, no silent limit change.
- Live long runs cost time (≈ 35 min each, can run in parallel) and model tokens; use the test vault (AGENTS.md) and a cheap model where the runtime allows.

## Guidance For Implementation

- Reproduction to start from: `evidence/claude-timeout-probe/run-probe.sh` (run A: moved to background at 120 s; run B: completes in the foreground). After the change, a Claude run started through AutoByteus behaves like run B.
- Do not use a bare `sleep N` as a long test command: Claude Code 2.1.325 blocks it; use a script file.
- Keep the absent-only rule exactly like the cache default: `undefined` check, string values.
- Update existing tests that assert the native `summary: "exit code N"` text and the probe texts to the new behavior (DESIGN.md rule 11).

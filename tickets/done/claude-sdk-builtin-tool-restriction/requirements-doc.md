# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package identifier: `claude-sdk-builtin-tool-restriction`
- Request / ticket: Hide Claude Agent SDK's native subagent / multi-agent tools from AutoByteus Claude runs, because AutoByteus provides its own task/delegation and messaging tools.
- Requirements owner: Solution Designer
- Date: 2026-09-24
- Approval state and reference: Approved by the user in the Solution Designer conversation on 2026-09-24 ("sounds good. i approved your proposed plan. lets do it."), approving the explicit built-in `tools` list plus `disallowedTools` safety-net plan presented in the preceding turns.
- Exact approved requirements baseline / solution revision: `SR-001` (this document's REQ-001..REQ-006 / AC-001..AC-007). `SR-002` adds evidence and one evidence-driven safety-net entry (`ListAgents`) without changing intended behavior (see DEC-003).
- Behavior-defining supplements and their approved versions: None. Probe evidence under `probe-evidence/` is supporting evidence only.

## Problem And Desired Outcome

- Problem: AutoByteus launches Claude Agent SDK turns with Claude Code's default built-in tool set, minus `AskUserQuestion`. The model therefore sees and can use Claude's native `Agent` (legacy `Task`) subagent tool, `Workflow` (multi-subagent orchestration), `SendMessage` (Claude agent-team messaging) and, on SDK 0.3.280, `ListAgents`. It also sees a system-reminder listing the available Claude agent types, including project `.claude/agents/*` definitions. These compete with AutoByteus' own `delegate_task` / `send_message_to` / team tools. Native subagents run outside AutoByteus tracking, and `SendMessage` can be confused with `send_message_to`. A live probe confirmed that a forced `Agent` call launches a real background agent and a forced `Workflow` call launches a real workflow today.
- Affected actors or systems: AutoByteus users running Claude Agent SDK agents and teams; the AutoByteus Claude runtime backend (`autobyteus-server-ts`).
- Desired outcome: Claude runs see only an explicit, AutoByteus-chosen set of Claude built-in tools that contains no native subagent/multi-agent capability, plus the AutoByteus MCP tools that are configured today.
- Observable definition of success: The Messages API request that Claude Code sends for an AutoByteus turn has a tool list of exactly the approved built-ins plus the configured AutoByteus MCP tools, with no agent-type listing. A model call to any native multi-agent tool fails with "No such tool available".

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | SCN-001 | Claude built-in surface = Claude Code default preset minus `AskUserQuestion`. On 0.3.280 that is 26 built-ins, including `Agent`, `Workflow`, `SendMessage`, `ListAgents`, `TaskCreate/Get/List/Update`, `TaskStop`, `Cron*`, `ScheduleWakeup`, plan-mode, worktree and `ReportFindings`. | Built-in surface = exactly `Bash, Read, Edit, Write, Glob, Grep, NotebookEdit, WebFetch, WebSearch, Skill`. | Configured AutoByteus MCP tools remain exposed and executable. | INV probe P-2/P-3 |
| BEH-002 | Contract | SCN-001 | The model receives a system-reminder listing Claude agent types (`general-purpose`, `Explore`, `Plan`, project agents). | No agent-type listing reaches the model. | Configured-skill listing still reaches the model. | INV probe P-2/P-3 |
| BEH-003 | System | SCN-002 | Forced `Agent` / `Workflow` calls launch real background work; `SendMessage` executes. | Forced calls to `Agent`, `Task`, `Workflow`, `SendMessage`, `ListAgents` return tool errors and start nothing. | AutoByteus MCP tool calls (e.g. `send_message_to`) execute normally. | INV probe P-3/P-4 |
| BEH-004 | Contract | SCN-001 | `AskUserQuestion` hidden via `disallowedTools`. | Still hidden. | Preserved (prior ticket `claude-ask-user-question-disallow`). | code + probe |
| BEH-005 | Contract | SCN-001 | System prompt is AutoByteus' own string; `allowedTools`, `mcpServers`, `canUseTool`, `settingSources`, resume/session and env behavior as today. | Unchanged. | Preserved. | code |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| AutoByteus user running Claude agents/teams | Delegation and messaging go through AutoByteus-visible tools | Claude never spawns native subagents or uses Claude-native team messaging | Normal coding tools and skills keep working |
| AutoByteus server (Claude runtime) | Owns the Claude tool surface | One explicit, reviewable built-in tool policy | Must not affect AutoByteus MCP tool exposure |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Every normal Claude Agent SDK turn launched by AutoByteus (standalone agent or team member) uses the approved built-in tool policy.

### Out Of Scope

- Claude model-discovery / context-capacity probe queries (they already pass `tools: []`).
- Editing Claude Code's static built-in tool description text (e.g. Bash/Glob/Grep sentences mentioning "the Agent tool"). The SDK offers no option for it; see ASM-001.
- Changing AutoByteus MCP tool exposure, `allowedTools` pre-approval, permission mode or `canUseTool` behavior.
- Making the built-in list user-configurable per agent.
- Migrating `Skill` from `allowedTools` to the SDK's newer `skills` option.
- Codex or other runtimes.

### Non-Goals

- Hiding every textual mention of "agent" from the model.
- Changing the SDK version.

### Preserved Behavior Boundary

BEH-004, BEH-005; REQ-004, REQ-005; AC-004, AC-005, AC-006.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap` and needs explicit user approval before it becomes authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Normal AutoByteus Claude turns MUST expose exactly this set of Claude built-in tools: `Bash`, `Read`, `Edit`, `Write`, `Glob`, `Grep`, `NotebookEdit`, `WebFetch`, `WebSearch`, `Skill`. | BEH-001 | Must | An explicit list prevents SDK upgrades from silently adding new (multi-agent) built-ins. | User approval 2026-09-24; DEC-001 |
| REQ-002 | Normal AutoByteus Claude turns MUST disallow `AskUserQuestion`, `Agent`, `Task`, `Workflow`, `SendMessage` and `ListAgents` as a safety net. The native multi-agent tools stay unavailable even if the built-in list is later widened or replaced with the default preset. | BEH-001, BEH-003, BEH-004 | Must | Belt-and-braces; `ListAgents` is added per DEC-003. | User approval; DEC-003 |
| REQ-003 | The model MUST NOT receive Claude's agent-type listing, and calls to native multi-agent tools MUST fail without starting work. | BEH-002, BEH-003 | Must | Core goal: Claude does not know about or use native subagents. | User request |
| REQ-004 | Configured AutoByteus MCP tools (e.g. `send_message_to`, `delegate_task`, browser/media/artifact tools) MUST remain exposed, pre-approved and executable as today. | BEH-005 | Must | AutoByteus' own delegation/messaging is the intended replacement. | User request |
| REQ-005 | Configured skills MUST remain discoverable and usable through `Skill`. | BEH-002, BEH-005 | Must | Existing skills feature. | Code (`claude-session-tooling-options.ts`) |
| REQ-006 | Server docs MUST describe the new built-in tool policy. They MUST replace the previous guidance that rejected a `tools` list. | — | Should | Keep docs truthful. | `docs/modules/agent_execution.md` |

## Acceptance Criteria

| AC ID | Related REQ | Related BEH / SCN | Preconditions / Trigger | Observable Expected Outcome | Alternate / Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | `ClaudeSdkClient.startQueryTurn` builds query options | Options contain `tools` equal to the REQ-001 list, in that order. | — | Unit test |
| AC-002 | REQ-002 | BEH-001 / SCN-001 | Same | Options contain `disallowedTools` equal to the REQ-002 list. | — | Unit test |
| AC-003 | REQ-001, REQ-003 | BEH-001..003 / SCN-001, SCN-002 | Real Claude Code CLI from the pinned SDK, pointed at a fake Messages API | Captured request tools = REQ-001 built-ins + configured MCP tools. There is no agent-type listing. Forced `Agent`/`Task`/`Workflow`/`SendMessage`/`ListAgents` calls return "No such tool available". | — | Credential-free probe (see investigation notes) |
| AC-004 | REQ-004 | BEH-005 | Configured MCP tools | `allowedTools` / `mcpServers` / `canUseTool` unchanged; MCP call executes. | — | Existing unit tests + probe |
| AC-005 | REQ-005 | BEH-005 | Workspace has materialized skills | `Skill` is in the tool list and the skill appears in the model context. | — | Probe; existing tests |
| AC-006 | REQ-004 | BEH-005 | Model-discovery probe path | Still passes `tools: []` with no other change. | — | Existing unit test |
| AC-007 | REQ-006 | — | Docs | `agent_execution.md` states the new policy; no stale "do not use a tools allowlist" guidance. | — | Docs review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator | Goal / Event | Trigger | Starting Condition | Sequence | Expected Outcome | Alternate / Error | Validity | Evidence | REQ / AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | AutoByteus Claude runtime | Launch a Claude turn | User message / team message to a Claude-runtime agent | Claude runtime configured | Session builds options → SDK query → Claude Code sends Messages API request | Model sees only approved built-ins + configured MCP tools; no agent listing | — | Supported Normal Scenario | Code + probe | REQ-001..005 / AC-001..006 |
| SCN-002 | System | Claude model | Model attempts a native multi-agent tool (e.g. from a skill or project doc instruction) | Model emits `tool_use` for `Agent`/`Task`/`Workflow`/`SendMessage`/`ListAgents` | SCN-001 policy active | Claude Code resolves the tool name | Tool error "No such tool available"; nothing is spawned | — | Supported Explicit Edge Scenario | Probe P-3/P-4 | REQ-003 / AC-003 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. There are no UI changes. The prototype, UI/UX and visual-reference fields are `N/A — not applicable`.

## Quality And Non-Functional Requirements

| Quality ID | Related REQ / AC | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001 / AC-001 | Compatibility | The built-in list uses names valid for the pinned SDK (0.3.280 / Claude Code 2.1.280). | SDK upgrades | Probe on the pinned SDK |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`. The change affects per-turn launch options only. Resumed Claude sessions pick up the new tool set on their next turn (per-turn `query()` options).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `@anthropic-ai/claude-agent-sdk` 0.3.280 `Options.tools` / `Options.disallowedTools` | `tools: string[]` sets the base built-in set. `disallowedTools` removes tools from context and blocks execution. | `sdk.d.ts`; probes P-2..P-4 | Future SDKs may rename tools (as `Task`→`Agent` happened); the list must be re-verified on SDK upgrade. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related REQ / AC | Status | Approval Applicability |
| --- | --- | --- | --- | --- |
| `probe-evidence/` | Credential-free probe scripts and captured requests/results | AC-003, AC-004, AC-005 | Current | Evidence only; not behavior-defining |

## Assumptions

| ID | Assumption | Why Necessary | Validation / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Residual static sentences in the Bash/Glob/Grep/Skill descriptions that mention "the Agent tool"/"subagent" are acceptable. | The SDK cannot edit built-in descriptions. | User informed 2026-09-24 and accepted the plan | Accepted |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Explicit `tools` list versus disallow-list only | Future SDK tools leak with a disallow-only approach | Probes showed 0.3.280 added `ListAgents` | User | Resolved: explicit list + safety net |
| DEC-002 | Keep Claude's to-do tools (`TaskCreate/Get/List/Update`)? | Planning aid versus clean surface; the UI does not render them | Presented to user | User | Resolved: excluded |
| DEC-003 | Add `ListAgents` (new in 0.3.280) to the safety-net disallow list | The approved intent is "no native multi-agent tools"; `ListAgents` is one | Probe P-3 | Solution Designer (evidence-only; no intent change) | Resolved: included |
| DEC-004 | Supersede the prior ticket's "no `tools` allowlist" constraint (`claude-ask-user-question-disallow` AC-003) | The user explicitly chose the allowlist trade-off | Prior ticket requirements/design | User | Resolved: superseded |

## Traceability

| REQ | UC | BEH | AC | SCN | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-003 | SCN-001 | P-2..P-4 |
| REQ-002 | UC-001 | BEH-001, BEH-003, BEH-004 | AC-002, AC-003 | SCN-001, SCN-002 | P-3, P-4 |
| REQ-003 | UC-001 | BEH-002, BEH-003 | AC-003 | SCN-001, SCN-002 | P-2..P-4 |
| REQ-004 | UC-001 | BEH-005 | AC-004, AC-006 | SCN-001 | P-2..P-4 |
| REQ-005 | UC-001 | BEH-002, BEH-005 | AC-005 | SCN-001 | P-2..P-4 |
| REQ-006 | UC-001 | — | AC-007 | — | docs |

## Architecture Phase Input

- Approved scenario IDs: SCN-001, SCN-002.
- Constraints: preserve BEH-004/BEH-005; the policy is constant (not configurable); model discovery stays `tools: []`.
- Deferred to design: constant placement and test shape.
- Technical facts verified: the `tools` option does not filter MCP tools; `Skill` must be listed to remain available; `Glob`/`Grep` must be listed to exist on native builds.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes`
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None

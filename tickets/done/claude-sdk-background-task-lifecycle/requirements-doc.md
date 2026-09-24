# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-004`
- Package identifier: `claude-sdk-background-task-lifecycle`
- Request / ticket: User report 2026-09-24, "background bash is not able to run by our backend agent sdk support"
- Requirements owner: solution_designer
- Date: 2026-09-24
- Approval state and reference: Approved by the user on 2026-09-24 in the Solution Designer conversation: "i strongly agree with you, lets first do a temp fix using the env variable for the temp fix … after the ticket is done. we will do ticket two right?" DEC-003 (30 min ceiling) approved in the follow-up message: "I'd lean towards raising it to 30 minutes … your suggestion is good here"
- Exact approved requirements baseline / solution revision: this document at SR-004 (Option 1: BEH-001/002/003/005, REQ-001..004, AC-001..006, SCN-001..002, DEC-001..003 as decided below)
- Behavior-defining supplements: `probe-evidence/probe-results.md` (evidence only, no approval needed)

## Problem And Desired Outcome

- Problem: A Claude-runtime agent can start a Bash command "in the background". The CLI tells the model it will be notified on completion, but AutoByteus closes the Claude CLI process when the turn's `result` arrives. That kills the command (`[killed]`) and no notification ever arrives. The agent tells the user it will report back and never does. When asked later, it finds the work stopped and restarts it, repeating the failure (BEH-001, BEH-002).
- Affected actors: users of Claude-runtime agents and teams; Claude agents running long commands.
- Desired outcome: A Claude agent's command either runs to completion with its result available to the agent, or the agent is never told it can do something the runtime cannot support.
- Observable definition of success: The same "build the Electron app" request completes and the agent reports the result, with no `[killed]` task output.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Current Behavior | Desired Behavior (Option 1, recommended) | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Background Bash is killed seconds after the turn ends. The "you will be notified" promise is false | The Claude runtime does not offer background Bash. Long commands run in the foreground inside the turn and their result reaches the agent in that turn | Foreground Bash, interrupt behavior, turn completion semantics | Probe A, Probe D |
| BEH-002 | User | SCN-002 | Agent restarts killed work in later turns and loops | No orphaned background work exists to be "found stopped" | — | Transcript |
| BEH-003 | System | SCN-001 | Foreground Bash works within the Bash timeout | Unchanged | Yes | Probe D |
| BEH-005 | System | SCN-001 | A foreground Bash call that exceeds its timeout is auto-backgrounded by the CLI, then killed at turn end (tools-reference doc) | With background tasks disabled, auto-backgrounding is off. A command that exceeds its timeout ends as a visible tool timeout within the turn | — | CLI docs (SR-003) |

## Scope Guardrail

### In-Scope Use Cases

- UC-001: A Claude-runtime agent (standalone or team member) runs a long shell command (build, test suite) on the user's behalf.

### Out Of Scope

- Keeping the Claude CLI process alive between turns, provider-initiated (notification-driven) turns, and a background-task UI. This is Option 2, confirmed by the user as the **next separate ticket** (migrate the Claude backend to SDK streaming input mode). That ticket removes this switch.
- Changing `BASH_DEFAULT_TIMEOUT_MS` (the per-call default the model gets when it sets no timeout). Only the ceiling changes (DEC-003).
- Codex / AutoByteus-native runtimes.
- Changing the Bash timeout limits.
- The builtin tool allow-list (owned by `claude-sdk-builtin-tool-restriction`).

### Non-Goals

- Making detached processes (`nohup … &`) that agents start themselves manageable by AutoByteus.

### Preserved Behavior Boundary

BEH-003; existing turn start/complete/interrupt events; session resume; tool approval flow.

### Review Authority

Standard: blocking findings must cite REQ/AC/BEH IDs here. Scope-changing proposals are Requirement Gaps and need user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Claude-runtime agents must not be offered background execution of built-in Bash commands, so no command is started that the runtime will kill at turn end | BEH-001, BEH-002, BEH-005 | Must | Removes the false "you will be notified" promise and the kill, including auto-backgrounding on timeout | Probes A/D; CLI env-vars and tools-reference docs |
| REQ-002 | A shell command a Claude agent runs must either complete within the turn with its result delivered to the agent, or fail with a visible tool error/timeout. It must never be silently killed | BEH-001, BEH-003 | Must | Truthful outcome | Probe D |
| REQ-004 | A Claude agent must be able to run a single foreground command for up to 30 minutes by requesting that timeout, so long builds and test suites can complete inside one turn while background execution is disabled | BEH-003, BEH-005 | Must | Without background tasks, the ceiling becomes a hard per-command limit | DEC-003 (user decision 2026-09-24) |
| REQ-003 | The dependency on the Claude CLI switch must be documented and guarded by a check, so a CLI/SDK update that drops the switch is detected | BEH-001 | Should | UNK-001 | Investigation |

## Acceptance Criteria

| AC ID | Requirements | Scenario | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Claude session query options are built for a turn | The CLI spawn env disables background tasks | — | Unit test on query options/env |
| AC-002 | REQ-001, REQ-002 | SCN-001 | A real Claude-runtime agent is asked to run `sleep 20; echo done > marker` "in the background" | The Bash tool call has no `run_in_background`. The command completes and the marker exists. The agent reports the result in the same turn | — | Live probe / E2E through the AutoByteus server |
| AC-003 | REQ-002 | SCN-001 | Command exceeds the Bash timeout | The agent receives a timeout tool error (visible in the UI). No `[killed]`-after-turn behavior | — | Documented; optional probe |
| AC-005 | REQ-004 | SCN-001 | Claude session query options are built for a turn | The CLI spawn env sets `BASH_MAX_TIMEOUT_MS=1800000` | — | Unit test on query options/env |
| AC-006 | REQ-004 | SCN-001 | A real Claude-runtime agent runs a command with an explicit timeout above the old 10 min ceiling | The CLI accepts the requested timeout, up to 30 min, instead of capping it at 10 min | Timeout above 30 min is capped at 30 min | Live check of the Bash tool's advertised maximum, or a timeout clamp probe (no 30 min wait required) |
| AC-004 | REQ-003 | — | Docs/test | `docs/modules/agent_execution.md` notes the switch and says to re-check it after CLI/SDK bumps | — | Review |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Expected Outcome | Alternate | Validity | Evidence | Related |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User → Claude agent | Build/test something long | User asks e.g. "build the Electron app" | Claude-runtime run active | Agent runs build → waits → reports | Artifact built and path reported | Timeout → visible error | Supported Normal Scenario | Delivery transcript | REQ-001..002, AC-001..003 |
| SCN-002 | User | User | Ask about progress of earlier work | "finished building?" | Earlier turn ended | Agent answers from actual completed result | Truthful answer | — | Supported Normal Scenario | Delivery transcript | REQ-001 |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (N/A — not applicable for Option 1)

## Quality And Non-Functional Requirements

| Quality ID | Related | Area | Requirement | Conditions | Verification |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003 | Compatibility | Behavior holds with both the PATH `claude` and the SDK-bundled CLI | Executable resolution order in `claude-sdk-executable-path.ts` | Probe with both |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Claude Code CLI env `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` (officially documented) | Disables `run_in_background` on Bash and subagent tools, auto-backgrounding, and Ctrl+B | https://code.claude.com/docs/en/env-vars; Probe D on CLI 2.1.281 | Low: documented CLI contract; keep a unit check |
| Claude Code CLI env `BASH_MAX_TIMEOUT_MS` (officially documented) | "Maximum timeout the model can set for long-running bash commands (default: 600000)". Set to 1800000 per DEC-003. `BASH_DEFAULT_TIMEOUT_MS` (default 120000) unchanged | https://code.claude.com/docs/en/env-vars | Low |
| Claude Agent SDK 0.3.231 streaming-input mode | Needed for Option 2 only | Probe C, `sdk.d.ts` | RSK-002 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related | Status | Approval |
| --- | --- | --- | --- | --- |
| `probe-evidence/probe-results.md`, `probe.mjs`, `probeD.mjs` | Reproduction and option evidence | All | Final | Evidence only |

## Assumptions

| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Agent long commands (builds, tests) fit within the raised 30 min foreground ceiling when the model requests a suitable timeout | Option 1 usability | Electron build took about 6 min in the 4th attempt | Open |
| ASM-002 | The model passes an explicit `timeout` for long commands. Without one, the 2 min default applies and the command fails at 2 min with a visible timeout (no auto-backgrounding) | The default is intentionally unchanged | Observed during validation; the agent can retry with a longer timeout | Open |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options / Evidence | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Which direction? | Determines size and risk | **Designer recommendation after SR-002: Option 1 then 2**, with Option 1 as this ticket and Option 2 (migration to streaming input mode) as a separate ticket. **Option 1:** disable Claude background tasks via CLI env; commands run in the foreground. Small, low risk, fixes the kill loop now. **Option 2:** keep one streaming-input Claude process per run, handle `task_*` events and CLI-initiated follow-up turns, and surface background status in the UI. Real background support, but large and high risk (turn model, team routing, memory). **Option 1 then 2:** ship Option 1 now and open Option 2 as a separate ticket | User | **Decided 2026-09-24: Option 1 now (this ticket)**. Option 2 (streaming input mode) follows as the next, separate ticket, confirmed by the user |
| DEC-003 | Should Option 1 also raise the foreground Bash ceiling (`BASH_MAX_TIMEOUT_MS`, default 10 min), for example to 30 min, so long builds and test suites fit in one turn? | Without background tasks, 10 min becomes a hard cap per command | Keep 10 min default (no change) or set a higher ceiling in the CLI spawn env | User | **Decided 2026-09-24 by the user: raise the ceiling to 30 minutes** (`BASH_MAX_TIMEOUT_MS=1800000`). User: "I'd lean towards raising it to 30 minutes, since until Step 2 lands, a command that passes the limit simply fails. your suggestion is good here". `BASH_DEFAULT_TIMEOUT_MS` stays at the CLI default |
| DEC-002 | Also deliver the fix to the in-flight builtin-tool-restriction branch, or keep it separate? | Sequencing | Separate ticket from `origin/personal` (default) | User | **Decided: separate ticket** on `codex/claude-sdk-background-task-lifecycle` from `origin/personal`. The user asked to do the temp fix first as its own ticket; the builtin-tool-restriction branch stays unchanged |

## Traceability

| Requirement | Use Cases | Behaviors | ACs | Scenarios | Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002, BEH-005 | AC-001, AC-002 | SCN-001, SCN-002 | Probes A, D |
| REQ-002 | UC-001 | BEH-001, BEH-003 | AC-002, AC-003 | SCN-001 | Probe D |
| REQ-003 | UC-001 | BEH-001 | AC-004 | — | UNK-001 |
| REQ-004 | UC-001 | BEH-003, BEH-005 | AC-005, AC-006 | SCN-001 | DEC-003 |

## Architecture Phase Input

- Approved scenario IDs: SCN-001, SCN-002.
- Deferred to architecture: exact env injection point (turn queries only, compared with all spawns); test shape.
- Technical facts to verify: switch behavior on the SDK-bundled CLI 2.1.280; interaction with `CLAUDE_CODE_AUTO_BACKGROUND_TIMEOUT_MS`.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes` (for Option 1)
- Scope and non-goals are clear: `Yes`
- Requirements and ACs testable and traceable: `Yes`
- Scenarios covered: `Yes`
- Prototype evidence: `N/A`
- UI/UX approval: `N/A`
- Assumptions and open decisions visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-09-24, see Document Status)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None

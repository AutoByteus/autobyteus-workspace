# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `shell-command-time-limits-483`
- Request / ticket: Project Task `autobyteus-483` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), carrying the founder's decisions in the Task comments
- Requirements owner: Solution Designer
- Date: 2026-11-17
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: the Solution Designer's message to the user in its conversation on 2026-11-17 (SR-001), within the founder's final direction of 2026-11-17 in the Task comments
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: In Claude runs, a shell command longer than 2 minutes (10 minutes with an explicit timeout) is moved to the background, and a background command is stopped after 30 minutes (2 hours at most). Long builds and test suites, and the agents' waits for them, are stopped; the run must repeat them. The Activity tab then shows "Stopped" without saying why, so a waiter that hit a time limit looks like a failed job. Agents also wait with polling loops and start a second waiter for the same job.
- Affected actors or systems: agents in every runtime; the user reading the Activity tab (desktop and phone); the founder.
- Desired outcome: Claude runs allow 2 hours for both foreground and background commands by default; every other runtime's limits are verified and documented (changed only where a limit can and should be raised); the Activity tab states why each background task ended; every runtime's agent instructions teach the long-job habit with that runtime's own mechanism.
- Observable definition of success: a Claude run completes a command longer than 10 minutes in the foreground and one longer than 30 minutes in the background on an isolated instance; the panel reads e.g. "Stopped: it reached its time limit" or "Failed with exit code 1"; the system prompt of each runtime contains its long-command section.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Claude foreground Bash: default 120 s, max 600 s; on timeout the command moves to the background | Default and max 2 h (7,200,000 ms) | A command still moves to the background when a user message arrives; the model may still choose a shorter timeout | probe A/B, 2.1.325 strings |
| BEH-002 | System | SCN-002 | Claude background Bash: default 30 min, max 2 h | Default and max 2 h | Claude Code still stops a command at its limit and notifies | 2.1.325 strings |
| BEH-003 | User | SCN-003 | Ended tasks show "Stopped"/"Failed"/"Completed" and a runtime summary; no plain cause | Each ended task states its cause: time limit, low memory, run ended, or exit code; unknown causes show the summary | Status chips, counts, commands, summaries, snapshot (Codex) rows | panel code |
| BEH-004 | User | SCN-004 | No run selected → "Checking…" forever | A plain "no agent selected" state | Loading state while a selected run is being read | 473 FU-001 |
| BEH-005 | System | SCN-005 | Native, Codex, Grok, Antigravity do not stop long commands on a clock | Unchanged; verified by a long-run test per runtime | Their current limits and defaults | strings, native code |
| BEH-006 | System | SCN-006 | Only native runs get shell guidance; no guidance about long jobs | Every runtime's system prompt has a short long-command section in that runtime's terms | Existing prompt sections and their order | composer |
| BEH-007 | Operational | — | Panel probe expects pre-473 texts and stops early | Probe matches the current panel and runs its live-update scenarios | — | 473 FU-002 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Agent (any runtime) | Run long jobs to completion and act on the result | Not stopped before 2 h (Claude); knows how to wait correctly | Runtime limits outside AutoByteus' control stay as they are |
| User | Understand what the agent's background work is doing | Clear end reasons; no endless loading with no run | Read-only panel |
| Founder | Decides limits and release | 2 h defaults; facts reported where they differ | Release only on his word |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | A Claude run runs a long foreground or background shell command under 2-hour defaults | SCN-001, SCN-002 |
| UC-002 | The user reads why a background task ended (desktop Activity tab and phone) | SCN-003 |
| UC-003 | The user opens the Activity tab with no run selected | SCN-004 |
| UC-004 | Long-command limits of the other runtimes are verified and documented | SCN-005 |
| UC-005 | An agent in any runtime learns the long-job habit from its system prompt | SCN-006 |
| UC-006 | The Background Tasks panel probe exercises the current panel | — |

### Out Of Scope

- A new AutoByteus settings UI for the limits (DEC-002).
- Raising limits of Codex, Grok, Antigravity, DeepSeek harness or the native runtime (none stops a long command on a clock; DEC-004).
- Detecting or marking "waiter" tasks (DEC-003).
- A user action to stop a single background task.
- Changing the native foreground default of 30 s (DEC-004).
- Editing agent skills in the agents repository (the API/E2E skill etc.); DEC-005.
- Release (only on the founder's word).

### Non-Goals

- Making any command run longer than 2 hours in Claude runs by default.
- Recovering background commands across a restart (autobyteus-448).

### Preserved Behavior Boundary

- BEH-001..BEH-003 preserved columns; an explicit user value for `BASH_DEFAULT_TIMEOUT_MS` or `BASH_MAX_TIMEOUT_MS` (server environment or Claude Code settings `env`) is never overridden; the one-hour prompt cache default is unchanged; Codex snapshot rows keep their exit-code line; the event-stream/snapshot/unsupported/unavailable panel modes keep their behaviour.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite (Prerequisites above).
- A downstream reviewer comment does not amend this requirements basis. The Solution Designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Feasibility Evidence | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | Every Claude run starts its Claude Code process with `BASH_DEFAULT_TIMEOUT_MS=7200000` and `BASH_MAX_TIMEOUT_MS=7200000`, so the foreground default and maximum and the background default and maximum are each 2 hours. | BEH-001, BEH-002 | Must | Founder's final direction | Probe B (Measured, foreground); 2.1.325 code reading (background) | Task comment 2026-11-17 "DIRECTION AND GO" |
| REQ-002 | A value already defined for either variable (in the AutoByteus server's environment, or in the user's Claude Code settings `env`) is kept; AutoByteus only fills in a missing one. | BEH-001 | Must | User control without new UI; same rule as the one-hour cache default | Code pattern `claude-prompt-cache-setting.ts`; ASM-001 | DEC-002 |
| REQ-003 | Each background task that ended carries a runtime-neutral end reason when the runtime reports one (`time_limit`, `low_memory`, `run_ended`) and its exit code when there is one. | BEH-003 | Must | Point 2 | Claude summary wording and `reason: worker_restart` (Read, 2.1.325); native/AGY/Claude run-end paths (Read) | Task point 2 |
| REQ-004 | The desktop Background Tasks panel and the phone's background-task list show, for an ended task, one plain line saying why it ended: time limit reached (not a failure of the command), the computer was low on memory, the run ended, or the exit code; with no reported reason, the runtime's summary as today. | BEH-003 | Must | Point 2 | N/A | Task point 2; DEC-006 |
| REQ-005 | With no agent run selected, the desktop panel shows a "no agent selected" state instead of loading forever. | BEH-004 | Should | 473 FU-001 | N/A | Task comment 2026-11-12 |
| REQ-006 | The Background Tasks panel probe (`pnpm -C autobyteus-web test:e2e:background-tasks-panel`) matches the current panel (snapshot, event-stream and unsupported answers; current headers) and runs through its live-update scenarios, including an end reason. | BEH-007 | Should | 473 FU-002 | N/A | Task comment 2026-11-12 |
| REQ-007 | The system prompt of every runtime contains a short "Long-Running Commands" section in that runtime's own terms: start a long job once with the runtime's background mechanism; act on its completion notice where the runtime gives one (otherwise wait on the same job, not a new one); no polling loops of short sleeps; never start a second waiter or a second copy of a running job; and the runtime's limit where it has one (Claude: 2 hours). | BEH-006 | Must | Point 3; the cheaper half of the fix | Runtime mechanisms from strings and code (Read) | Task point 3; DEC-005 |
| REQ-008 | For Codex, Grok, Antigravity and the native runtime, no shell limit is changed; the ticket records each runtime's limits and proves by a long-run test that a background command longer than 30 minutes is not stopped. | BEH-005 | Must | Founder: "where a limit is a hard cap, say so and change nothing" and "verify each runtime by a test" | Read (strings/code); test pending (UNK-001) | Task comment 2026-11-17; DEC-004 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001, SCN-001 | Isolated instance built from the branch; Claude run; agent runs one foreground command that takes > 10 min (e.g. 11 min, a script, not a bare `sleep`) with no timeout argument | The tool result is the command's own output; it was never moved to the background | — | Live API/E2E on an isolated instance |
| AC-002 | REQ-001, REQ-008 | BEH-002, BEH-005, SCN-002, SCN-005 | Isolated instance; for Claude, Codex, Grok, Antigravity and native runs: one background command that takes > 30 min (e.g. 35 min) | Each completes with exit code 0 and is shown "Completed" in the panel (Codex: its snapshot row); Claude's is not stopped at 30 min | A runtime that stops it is recorded with its message and reported to the founder; no limit change without a new decision | Live API/E2E (runs may go in parallel) |
| AC-003 | REQ-002 | BEH-001 | Server env or Claude settings `env` sets `BASH_MAX_TIMEOUT_MS=900000` | The Claude child process sees 900000 for that variable (and AutoByteus' value for the other) | — | Unit test (server env); one live/manual check for the settings `env` (ASM-001) |
| AC-004 | REQ-001 | BEH-001 | Unit: build the Claude spawn environment with neither variable set | Both are `7200000`; existing auth and cache defaults unchanged | — | Unit |
| AC-005 | REQ-003, REQ-004 | BEH-003, SCN-003 | Claude background command stopped at its time limit (live: a command with `run_in_background` and a short explicit `timeout`, e.g. 300000 ms, that runs longer) | Panel and phone show "Stopped" and the line "Stopped: it reached its time limit — not a failure of the command" | — | Live API/E2E + unit on the summary parser |
| AC-006 | REQ-003, REQ-004 | BEH-003 | A background command that exits with 1 (Claude and native) | Chip "Failed" and the line "Exit code 1" (phone: "exit code 1") | — | Unit + live |
| AC-007 | REQ-003, REQ-004 | BEH-003 | The run is terminated while a background command runs (Claude, native, Antigravity) | The task shows "Stopped" and "Stopped: the run ended" | — | Unit per runtime mapping; one live check |
| AC-008 | REQ-003, REQ-004 | BEH-003 | A stop the runtime gives no cause for (e.g. Claude `TaskStop`, native `kill <pid>`) | "Stopped" with the runtime's summary text as today; no invented reason | — | Unit |
| AC-009 | REQ-005 | BEH-004 | Desktop Activity tab, no run selected | A "no agent selected" message; no "Checking…" and no "Current count unavailable" | — | Web component test |
| AC-010 | REQ-006 | BEH-007 | `pnpm -C autobyteus-web test:e2e:background-tasks-panel` | Passes through all its scenarios, including a task ended at its time limit | — | Run the probe |
| AC-011 | REQ-007 | BEH-006, SCN-006 | Compose the system prompt for each runtime (Claude, Codex, Antigravity, Grok/DeepSeek via ACP, native) | Each contains its "Long-Running Commands" section with that runtime's mechanism; Claude's names the 2-hour limit; no other section changes | — | Unit (composer and each backend's prompt) |
| AC-012 | REQ-007 | SCN-006 | Live Claude run asked to run and wait for a > 10 min job | The agent starts it once and acts on its completion; no second copy and no loop of short waits in its tool calls | Agent behaviour varies; one observed run is evidence, not a guarantee | Live API/E2E (observational) |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Agent in a Claude run | Run a build/test that takes > 10 min and read its result | Bash tool, foreground | Claude run started by AutoByteus | Agent calls Bash; command runs up to 2 h in the foreground | Result returned in the same tool call | A user message moves it to the background (preserved); past 2 h Claude Code moves it to the background | Supported Normal Scenario | Task incident; founder's direction | REQ-001, AC-001 |
| SCN-002 | System | Agent in a Claude run | Run a long suite in the background and continue | Bash `run_in_background` | Same | Command runs; completion notice reaches the agent | Completed, not stopped at 30 min | At 2 h Claude Code stops it and notifies | Supported Normal Scenario | Task incident (75-min suite) | REQ-001, AC-002 |
| SCN-003 | User | User | Understand why background work ended | Activity tab (desktop), phone run view | A run with ended background tasks | User opens the panel | Each ended task states its cause | Unknown cause → summary | Supported Normal Scenario | Task point 2 | REQ-003, REQ-004, AC-005..AC-008 |
| SCN-004 | User | User | Open the Activity tab before choosing a run | Activity tab | No run selected | User opens Background Tasks | "No agent selected" | — | Supported Normal Scenario | 473 FU-001 | REQ-005, AC-009 |
| SCN-005 | System | Agents in Codex/Grok/Antigravity/native runs | Run a > 30-min job | Each runtime's shell tool | Run started by AutoByteus | Job runs in the background | Completes | — | Supported Normal Scenario | Founder: verify each runtime | REQ-008, AC-002 |
| SCN-006 | System | Agent in any runtime | Know how to run and wait for a long job | System prompt | Run start | Prompt composed with the runtime's section | Agent starts the job once, waits correctly | — | Supported Normal Scenario | Task point 3, agents-107 analysis | REQ-007, AC-011, AC-012 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (text lines in an existing panel; no Product Design requested)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, design repository, UI/UX specification: N/A — not applicable
- Product ticket record and folder: N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: one reason line under an ended task, in the existing text style of the row; status chips unchanged; English and zh-CN strings (desktop); phone in English like its other strings.
- Explicitly illustrative fixture content or permitted implementation variation: exact wording may be polished if the meaning stays (time limit = not a failure of the command).
- Required screens, states, transitions: ended task with reason; no-run state.
- Product decisions that need the user: none.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-003 | Compatibility | The new fields are a clean cut on the server-to-client contract: always present (null when not known), no compatibility path for older servers or clients | Server, web and nodes from one release (DESIGN.md rule 9); task snapshots are not stored | Unit on the parser and the web handler |
| QR-002 | REQ-007 | Other | Each runtime's section is at most about 8 lines | Prompt size | Review |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (background task snapshots are in memory; history stores only notices).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Claude Code (user install, 2.1.325 observed) | Honours the two variables for foreground and background limits | strings + probe | Future CLI changes (RSK-002) |
| Codex 0.169, Grok 1.0.88, Antigravity 1.5.10 | No clock stop of long commands | strings | UNK-001, closed by AC-002 |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/claude-timeout-probe/` | Probe of the Claude foreground limit | REQ-001 | Final | Evidence, not behavior-defining |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | Claude Code applies a user's settings `env` value over the process value | REQ-002 user control | AC-003 live check (API/E2E) | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which values for Claude? | Founder: longest allowed, 2 h target | The CLI has no upper clamp (`max(value, …)`), so "longest allowed" is unbounded; background default can only be raised through `BASH_DEFAULT_TIMEOUT_MS` (`max(30 min, it)`) | Both variables 7,200,000 ms: the founder's 2-hour target for all four limits; a larger value would let a hung command block for days. Trade-off RSK-001 accepted by his "both default 2 hours". | Solution Designer | Decided |
| DEC-002 | New UI setting for the limits? | Original point 1 said "from a setting the user controls" | Later founder comments replace point 1 with 2-hour defaults; Claude Code already reads the variables from the server environment and its own settings `env` | No new UI: fill in only missing values, so the user still controls them through the environment or Claude Code settings; keeps it simple as the Task asks. | Solution Designer | Decided |
| DEC-003 | Mark tasks that only wait on another? | Task: "consider marking" | No signal tells a waiter from a job; a heuristic on the command text would mislabel | Not done: the end-reason line says "time limit, not a failure", and the habit (REQ-007) removes waiters. | Solution Designer | Decided |
| DEC-004 | Change other runtimes' limits? | Founder: raise where allowed, change nothing at hard caps | Native background unlimited, foreground model-chosen with no max; Codex/Grok/AGY move to background and do not stop on a clock | No change; verify by test (AC-002). Native foreground default 30 s stays: it is a default the model overrides per call, not a cap, and a longer default would make hung commands block native agents. | Solution Designer | Decided |
| DEC-005 | Where does the long-job habit live? | Comments: per-runtime instructions, the API/E2E skill, or both | Habit is about the runtime's tools and applies to every agent; skills live in the agents repo and are role-specific | Platform system prompt, one section per runtime family, written in that runtime's terms. Skills are not changed here; a skill may later refer to the habit. | Solution Designer | Decided |
| DEC-006 | Wording and set of end reasons | Point 2 lists time limit / failed / stopped by the user | AutoByteus has no per-task stop for the user; the user's stop is ending the run; Claude also stops on low memory; plain stops carry no cause | Reasons: time limit, low memory, run ended, exit code; otherwise the runtime's summary. "Stopped by the user" appears as "the run ended" because that is the user's only stop. | Solution Designer | Decided |
| DEC-007 | Does the cache fact change the founder's decision? | He asked to be told only if it does | Claude runs already use the 1-hour cache; after a > 1-hour wait the next call re-writes the cache once (cost, not correctness) | No: report the fact in the result, no change. | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001, AC-002, AC-004 | SCN-001, SCN-002 | probe |
| REQ-002 | UC-001 | BEH-001 | AC-003 | SCN-001 | — |
| REQ-003 | UC-002 | BEH-003 | AC-005..AC-008 | SCN-003 | — |
| REQ-004 | UC-002 | BEH-003 | AC-005..AC-008 | SCN-003 | — |
| REQ-005 | UC-003 | BEH-004 | AC-009 | SCN-004 | — |
| REQ-006 | UC-006 | BEH-007 | AC-010 | — | — |
| REQ-007 | UC-005 | BEH-006 | AC-011, AC-012 | SCN-006 | — |
| REQ-008 | UC-004 | BEH-005 | AC-002 | SCN-005 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001..SCN-006.
- Constraints to preserve: absent-only defaults; one-hour cache default; panel modes; Codex snapshot rows.
- Decisions deferred to architecture: field names and placement of the end reason; how each backend supplies its prompt section; how the summary is parsed.
- Technical facts to verify: none blocking (ASM-001 and UNK-001 are verified by API/E2E).
- Known risks: RSK-001, RSK-002.

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None

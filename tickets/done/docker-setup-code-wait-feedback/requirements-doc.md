# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `docker-setup-code-wait-feedback`
- Request / ticket: Project Task `autobyteus-workspace-3` (Project `project_3165230d-b602-4efc-ac42-fb61a03f1ed5`)
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_b9bdef7e859e4da781c68d8fa4a79061`), for the user
- Requirements owner: Solution Designer
- Date: 2026-11-09
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: SR-001 and the Solution Designer's conversation message of 2026-11-09 informing the user of the decisions DEC-001..DEC-006
- Exact approved requirements baseline / solution revision: this document at SR-001
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: `autobyteus-docker setup-code` prints nothing while it downloads a newer image, recreates the node's container and waits for the node to start answering. On 2026-11-09 this silent window (download + ~3 s recreate + ~5 s start) looked like a hang to the user. Separately, one request to the node's control socket has no time limit: a socket that accepts but never answers keeps the command waiting forever (reproduced).
- Affected actors or systems: the node owner at a terminal on the node's computer; the Docker launcher (bash and PowerShell).
- Desired outcome: while `setup-code` (and `new-container`, which shares the wait) works, the user always sees what it is doing: checking/downloading the image, recreating or starting the container, and waiting for the node to start, with time passing visible. No single request to the node can block past a fixed bound, and the whole wait stays bounded.
- Observable definition of success: no silent stretch longer than about 10 seconds in a normal run that the launcher controls; each phase announced before it starts; a stuck node answer ends one attempt within 5 seconds.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-003 | Bash: all of the image check, download, recreate/start messages are discarded; only the code is printed. PowerShell: launcher lines and the URL block show, the download does not | Every step is announced; the download shows Docker's own progress; the URL block stays out of `setup-code` | The code lines and their text; the recreate decision itself | investigation-notes Source Log (`commands.sh:186`, `Commands.ps1:137`) |
| BEH-002 | User | SCN-001 | Recreate prints nothing (bash) | A clear message that the container is being recreated, why (newer image / launcher configuration changed), and that its data is kept | Named volumes and port kept (NAS-34) | `docker-runtime.sh:322-327`; events 15:11:11–15:11:14 |
| BEH-003 | User | SCN-001, SCN-002, SCN-004 | The wait for the node is silent, up to 90 attempts | A message as soon as the first attempt finds the node not answering yet, then an update at least every 10 s with the elapsed time; nothing extra when the node answers at once | 90-second overall budget; failure hint to `logs` | `commands.sh:167-176` |
| BEH-004 | System | SCN-005 | A request to a socket that accepts but never answers never ends | Each request ends within 5 s, and the wait goes on with the next attempt | Socket protocol (NA-5) | `probes/silent-socket-attempt.sh` (UNBOUNDED) |
| BEH-005 | Contract | all | The code is printed to the terminal only (NAS-32) | Unchanged; progress and error messages never contain the code | NAS-32 | `test_nas_03_nas_32_*` |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Node owner | Connect the desktop app to a Docker node | Sees that the command is working and what it waits for; gets the code | Code printed only to the terminal |
| Node owner on Windows | Same, with `autobyteus-docker.ps1` | Same behavior as bash | PowerShell twin |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | `setup-code` on a node that must be recreated or started first | SCN-001 |
| UC-002 | `setup-code` on a running, current node | SCN-002, SCN-003 |
| UC-003 | The wait for a code after `new-container` (same wait) | SCN-004 |
| UC-004 | A node that accepts the request but does not answer, or never answers | SCN-005, SCN-006 |

### Out Of Scope

- Whether `setup-code` should download a newer image at all (FU-001 in `follow-ups.md`).
- Progress messages of other commands (`upgrade`, `workspace apply`, `reset`) beyond what they already print; they keep their output (the shared recreate message's text may read the same everywhere, see DEC-004).
- The node's server, its control socket, the node-access CLI, the node access model's rules.
- `docker exec` or the Docker daemon itself hanging (RSK-001).

### Non-Goals

- Making the node start faster or the download smaller.
- A progress bar, spinner or same-line redraw.

### Preserved Behavior Boundary

- BEH-005 (NAS-32); the recreate decision and what it keeps (NAS-34); the code lines' text and that `setup-code`'s standard output holds only them; the 90-second overall budget and the `logs` hint on failure; exit status 0 on success, non-zero on failure; `new-container`'s existing output.

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
| REQ-001 | `setup-code` announces each step it takes before the code: checking the node's image (with Docker's own download progress when it downloads), recreating the container (naming the node, the reason, and that its data is kept) or starting a stopped one, and that the node is starting. | BEH-001, BEH-002 | Must | The user's report and request | N/A | Task direction; user comment 2026-11-09; DEC-001, DEC-004 |
| REQ-002 | While waiting for the node to answer, the launcher prints a waiting message as soon as an attempt finds the node not answering yet, and then at least every 10 seconds a message showing the elapsed time. When the first attempt answers, no waiting message is printed. | BEH-003 | Must | "Not stuck" must be visible during a normal start | N/A | Task direction; DEC-002 |
| REQ-003 | `setup-code`'s standard output holds only the code lines; progress goes to standard error (bash). `setup-code` does not print the URL block. | BEH-001 | Must | Keeps the code easy to copy and script; matches today's output | N/A | DEC-003 |
| REQ-004 | One request to the node's control socket ends within 5 seconds when the node does not answer; the wait then continues with the next attempt. | BEH-004 | Must | Task "Done when" | Probe + control: 5 s timeout ends the request (investigation notes) | Task direction; DEC-005 |
| REQ-005 | The whole wait is bounded in time: the launcher stops trying 90 seconds after it began asking (one attempt in progress may finish), then fails naming the node, the last attempt's error, and the `logs` command. | BEH-003, BEH-004 | Must | 90 attempts of up to 6 s each would no longer mean 90 s | N/A | DEC-006 |
| REQ-006 | The PowerShell launcher behaves the same (REQ-001, REQ-002, REQ-004, REQ-005; progress via its host output; no URL block in `setup-code`). | BEH-001..BEH-004 | Must | Windows users run the twin | N/A | Project practice (twins kept in step) |
| REQ-007 | No progress or error message contains the setup code (NAS-32). | BEH-005 | Must | Preserved contract | N/A | NAS-32 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-003 | BEH-001, BEH-002 / SCN-001 | A managed node whose container is out of date (image or launcher configuration); run `setup-code` | Standard error shows, in order: the image check (and pull output), a recreate message naming the node, its reason and that data is kept, a started message; then the code on standard output. No URL block | A stopped current node shows a start message instead of the recreate message | Offline fake-Docker test (bash) |
| AC-002 | REQ-002 | BEH-003 / SCN-001, SCN-004 | The node does not answer the first attempts, then answers | A waiting message naming the node appears after the first failed attempt; with a wait over 10 s, at least one more message with the elapsed seconds; then the code | — | Offline test with a scripted node that answers after N attempts (a short N for the first message; the 10 s cadence checked once) |
| AC-003 | REQ-002, REQ-003 | BEH-001, BEH-003 / SCN-002 | Running, current node that answers at once | Standard output is exactly the code lines; no waiting message; no URL block | — | Offline test |
| AC-004 | REQ-004 | BEH-004 / SCN-005 | The node's socket accepts and never answers on one attempt, answers on a later one | That attempt ends within 5 s (plus process start); the command still prints the code from the later attempt | — | The launcher's real client JS run by real `node` against a real Unix socket (probe turned into a test) |
| AC-005 | REQ-005, REQ-007 | BEH-003, BEH-004 / SCN-006 | The node never answers | The command fails after about 90 s (not 90 attempts × timeout), exit non-zero; the error names the node, the last attempt's error and `autobyteus-docker logs --name <node>` | — | Offline test with a shortened budget at function level, plus a check that the budget counts seconds, not attempts |
| AC-006 | REQ-006 | all | PowerShell launcher sources | Its client JS has the 5 s timeout; its wait is time-based with waiting messages; `Show-SetupCode` shows the pull output and no URL block | — | Text contract test; `pwsh` parse when available |
| AC-007 | REQ-007 | BEH-005 | Any run above | The code appears only in the code lines on standard output; never in standard error, state files or messages | — | Assertions in the tests above |
| AC-008 | REQ-002 | BEH-003 / SCN-004 | `new-container` with a node that answers after a few attempts | The same waiting message appears; `new-container`'s other output is unchanged | — | Offline test |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Node owner | Get a code for a node whose container is out of date | `autobyteus-docker setup-code [--name]` | Newer image on the tag, or launcher updated (NAS-34) | check/download image → recreate → node starts → code | Code, every step announced | Stopped node: start instead of recreate | Supported Normal Scenario | User's 2026-11-09 run (Docker events); NAS-34 | REQ-001..003, REQ-007; AC-001, AC-002, AC-007 |
| SCN-002 | User | Node owner | Get a code for a running current node | Same | Node up and current | quick image check → code | Code at once, no waiting message | — | Supported Normal Scenario | Project Task Manager's 15:11:42 run | REQ-002, REQ-003; AC-003 |
| SCN-003 | User | Node owner | Get a code right after the node restarted by itself or was started elsewhere | Same | Node container running but server still starting | check → wait → code | Waiting message then code | — | Supported Normal Scenario | Restart policy, `docker start` | REQ-002; AC-002 |
| SCN-004 | User | Node owner | Create a node and get its first code | `new-container` | No node | create → wait → code | Waiting message then code | — | Supported Normal Scenario | `create_new_container` | REQ-002; AC-008 |
| SCN-005 | System | Node's control socket | A node process that accepts but does not answer (stuck or frozen) | Any attempt | — | attempt times out → next attempt | Attempt bounded | — | Supported Explicit Edge Scenario (Task "Done when" requires the bound) | Probe (reproduced with the real client) | REQ-004; AC-004 |
| SCN-006 | System | Node | The node never starts answering | Any wait | Server crash loop, broken image | attempts fail for 90 s | Failure with last error and logs hint | — | Supported Explicit Edge Scenario (existing failure path) | `commands.sh:176` | REQ-005; AC-005 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` (terminal output only)
- Linked UI/UX or interaction supplement: N/A — not applicable
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts: N/A — not applicable
- Product ticket record and folder (externally owned): N/A — not applicable
- Design repository revision or commit: N/A — not applicable
- UI/UX user-confirmation reference: N/A — not applicable
- Approved visual-reference baseline: N/A — not applicable
- Normative visual and interaction details: messages use the launcher's `[AutoByteus Docker] ` prefix; each names the node; recreate message says why and that data is kept; waiting messages show elapsed seconds and the 90-second limit. Indicative text (exact wording is the implementer's within these rules):
  - `[AutoByteus Docker] Checking image autobyteus/autobyteus-server:beta` (existing)
  - `[AutoByteus Docker] Recreating the container of autobyteus-server-0: a newer image was downloaded. Its named volumes are kept.`
  - `[AutoByteus Docker] Started autobyteus-server-0.` (existing)
  - `[AutoByteus Docker] Waiting for autobyteus-server-0 to start (up to 90 seconds)...`
  - `[AutoByteus Docker] Still waiting for autobyteus-server-0 to start (20 s)...`
- Explicitly illustrative fixture content or permitted implementation variation: the exact sentences above.
- Required screens, states, transitions, feedback: see REQ-001, REQ-002.
- Product decisions that need the user: None.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-002 / AC-002 | Operability | No launcher-controlled silence longer than 10 s during the wait | Normal start | Test |
| QR-002 | REQ-004 / AC-004 | Reliability | One attempt ≤ 5 s socket wait | Silent socket | Real-node test |
| QR-003 | REQ-005 / AC-005 | Reliability | Total wait ≤ 90 s + one attempt | Node never answers | Test |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`
- Data or state that must be preserved: launcher state files and named volumes are untouched by this change.
- Loss, reset, rebuild, or regeneration that is acceptable: N/A.
- Retention, privacy, compliance, volume, downtime, or operational constraints: NAS-32.
- Unknowns requiring downstream investigation: None.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Node control socket (NA-5) | Protocol unchanged | `node_access_model.md` | None |
| Docker CLI | `docker pull` progress shown as Docker prints it | Docker 29.8.1 | None |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `probes/silent-socket-attempt.sh` | Reproduction of the unbounded attempt | REQ-004 / AC-004 | Current | Evidence only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A healthy node answers within 5 s once it listens | The per-attempt bound must not cut off a real answer | Server answers synchronously; CLI and server use 5 s already | Holds |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Which phases get messages? | The user's silent window had three parts | Evidence: download, recreate, wait were all silent | Announce all three, not only the wait the Task assumed: the download was likely the longest part. Show Docker's own pull progress rather than inventing one | Solution Designer | Decided |
| DEC-002 | How often during the wait? | Avoid both silence and noise | Per-attempt dots; a line per attempt; first line + periodic lines | One line when the first attempt fails, then one every 10 s with elapsed time: readable in a terminal and in logs, works the same in PowerShell; nothing when the node answers at once | Solution Designer | Decided |
| DEC-003 | Where does progress go? | `setup-code` output may be copied or scripted | stdout (like other commands) vs stderr | stderr for progress, stdout only the code lines: keeps today's stdout of `setup-code` exactly as is while the terminal shows everything. Drop the URL block from `setup-code` (bash already hid it; PowerShell shows it today, which this aligns) | Solution Designer | Decided |
| DEC-004 | Wording: the user suggested "rebuilding container..." | One vocabulary (design principle 15) | The project's word is "recreate" (help text, `docker-runtime.sh`, node access model NAS-34). "Rebuild" would add a second word and suggest an image build | Use "Recreating the container of <node>" with the reason and "named volumes are kept"; same active, explicit style the user asked for. The shared recreate message in `start_node` is reworded once, so `upgrade` and `workspace apply` read the same | Solution Designer | Decided |
| DEC-005 | Per-attempt bound | Task "Done when" | 5 s matches the server's idle timeout and the node-access CLI's client timeout | 5 s in the client JS; Docker-level hangs stay a limitation (RSK-001) | Solution Designer | Decided |
| DEC-006 | Overall budget | Attempts can now last up to 5 s | Keep 90 attempts vs 90 seconds | 90 seconds of wall-clock time, as the existing failure message already says; add the last attempt's error to the failure (it never contains the code) | Solution Designer | Decided |
| DEC-007 | Should `setup-code` keep upgrading the image? | Found during investigation | Product decision about two commands | Outside this ticket; follow-up FU-001 | Solution Designer | Decided (follow-up) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-002 | AC-001 | SCN-001 | — |
| REQ-002 | UC-001..UC-003 | BEH-003 | AC-002, AC-003, AC-008 | SCN-001..SCN-004 | — |
| REQ-003 | UC-001, UC-002 | BEH-001 | AC-001, AC-003 | SCN-001, SCN-002 | — |
| REQ-004 | UC-004 | BEH-004 | AC-004 | SCN-005 | probe |
| REQ-005 | UC-004 | BEH-003, BEH-004 | AC-005 | SCN-006 | — |
| REQ-006 | UC-001..UC-004 | BEH-001..BEH-004 | AC-006 | all | — |
| REQ-007 | all | BEH-005 | AC-005, AC-007 | all | — |

## Architecture Phase Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001..SCN-006.
- Product and system constraints architecture must preserve: NAS-32, NAS-34, code lines, exit codes, `new-container` output.
- Decisions intentionally deferred to architecture design: how `start_node` skips the URL block for `setup-code`; test placement.
- Technical facts architecture should verify: PowerShell output streams for `docker pull`.
- Known feasibility or integration risks: no `pwsh` locally (RSK-002).

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

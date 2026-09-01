# Requirements Document

## Document Status

- Status: `Approved`
- Current requirements revision ID: `RER-002`
- Package identifier: `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901`
- Request / ticket: `codex-command-failure-detail`
- Requirements owner: Requirements Engineer
- Date: 2026-09-01
- Approval state and reference: Explicitly approved by the user on 2026-09-01: “anyways, i approved. you can route now.” The earlier question about possible alignment with the AutoByteus `run_bash` return is retained as a downstream technical consideration; it does not amend the approved product behavior or authorize a structural contract change.

## Problem And Desired Outcome

- Problem: When a Codex-runtime agent executes a Bash command that exits unsuccessfully, AutoByteus can show only `Tool execution failed.` even though Codex App Server supplied useful terminal diagnostics. The user cannot see the actual command output or exit code needed to understand the failure.
- Affected actors or systems: Users monitoring standalone or team-member Codex agent runs; Codex-runtime agent execution; AutoByteus run activity, conversation tool cards, and local replay of the tool failure.
- Desired outcome: A failed Codex `run_bash` activity shows the most useful provider-supplied failure detail available—explicit provider error when present, otherwise command diagnostic output and non-zero exit code—while retaining a generic fallback only when Codex supplied no useful detail.
- Observable definition of success: For the reproduced provider payload with `status: failed`, `aggregatedOutput: "CODEX_FAILURE_STDERR_MARKER"`, and `exitCode: 23`, AutoByteus presents a failed `run_bash` error that visibly contains the marker and exit code instead of only `Tool execution failed.`

## Relevant Current And Desired Behavior

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | Codex App Server reports a terminal failed `commandExecution` item with `aggregatedOutput` and `exitCode`; AutoByteus classifies the tool as failed but maps its error to the generic fallback because the error resolver does not consume those command fields. | The failed normalized `run_bash` event carries an actionable, readable error derived from the best available provider failure evidence. | The command remains failed; invocation identity, command arguments, working directory, ordering, and turn continuation remain unchanged. | `codex-command-failure-probe.md`; retained raw JSONL; current Codex converter and parser sources. |
| BEH-002 | User | SCN-001, SCN-002 | The Activity panel and center tool card render the failed event's `error` string faithfully, so both show the generic string received from the backend. Local replay persists the same generic tool error. | Existing error surfaces show the enriched diagnostic consistently during the live run and when the same locally recorded run is reopened. | Existing card layout, failed styling, expansion behavior, canonical streaming contract, and runtime-agnostic frontend handling remain unchanged. | User screenshot; frontend tool lifecycle handler and card components; runtime tool trace sequencer. |
| BEH-003 | Contract | SCN-003 | The provider contract permits terminal command output and exit-code fields to be absent. AutoByteus currently falls back generically for every failed command lacking an explicit `error`/`message`, even when an exit code is available. | Use an explicit provider error when available; otherwise use non-empty command diagnostic output plus the exit code when available, or an exit-code-only diagnostic; use the generic fallback only when none of those details exist. | Explicit provider errors retain precedence and are not replaced by less-specific synthesized text. | Local generated Codex 0.152.0 protocol; official App Server documentation; parser source. |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| User monitoring an agent run | Diagnose why an agent's shell command failed. | Sees the actual provider-supplied command diagnostic and exit code on the failed tool activity. | Must not need backend logs or raw Codex events. |
| Codex-runtime agent execution | Execute supported shell commands and report their outcome. | Failed command stays failed and the rest of the turn lifecycle continues according to Codex behavior. | AutoByteus must consume the current App Server command item contract rather than invent a Codex-side error field. |
| Engineering / operations | Reproduce and verify the mapping. | Provider-shaped tests and a live probe demonstrate that diagnostic evidence is not discarded. | No unrelated tool-family or frontend redesign is authorized. |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- `UC-001`: A supported standalone Codex run executes `run_bash`; the command exits non-zero with diagnostic output and an exit code.
- `UC-002`: A supported Codex team-member run executes the same failing command path and exposes the diagnostic through the team stream.
- `UC-003`: A user views the failed command in the existing center tool card or Activity panel, live or from the existing local replay path.
- `UC-004`: A failed command provides only an exit code, or provides neither output nor exit code, and AutoByteus chooses the appropriate detailed or fallback error.

### Out Of Scope

- Changing Codex CLI/App Server execution, sandboxing, approval policy, command selection, or command retry behavior.
- Adding a new frontend component, redesigning the Activity panel, or changing tool-card visual layout.
- Separating stdout from stderr when the provider supplies only combined `aggregatedOutput`.
- Adding command-output streaming support for `item/commandExecution/outputDelta`; this request concerns the terminal failure detail.
- Changing error mapping for MCP tools, dynamic tools, web search, file changes, Claude, or native AutoByteus runtimes unless needed solely to preserve their existing behavior.
- Backfilling or rewriting already-persisted historical failures whose detailed provider payload is no longer available.
- Introducing a new general output-retention, redaction, or truncation policy.

### Non-Goals

- Treating every non-zero command as a failed overall agent turn.
- Displaying raw provider envelopes or internal converter structures to the user.
- Converting diagnostic command output into a fabricated stack trace or guessed root cause.

### Preserved Behavior Boundary

- Preserve `BEH-001` invocation identity, command/cwd arguments, event ordering, failed status, and Codex turn continuation.
- Preserve `BEH-002` frontend layouts and the canonical failed-tool event shape.
- Preserve successful, denied, interrupted, and unrelated tool-family behavior under `REQ-005` and `AC-008`.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The Requirements Engineer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | When Codex App Server reports a failed `commandExecution`, AutoByteus must project a non-empty, actionable failed `run_bash` error using the best available provider failure evidence. | BEH-001 | Must | The current generic error discards evidence the provider already supplied. | User request; live probe. |
| REQ-002 | Error-detail precedence must be: an explicit provider error/message when one exists; otherwise non-empty command diagnostic output, with the provider exit code included when available; otherwise an exit-code-only diagnostic; otherwise the existing generic fallback. | BEH-001, BEH-003 | Must | Preserves specific provider intent while covering the App Server's command-specific fields and nullable contract. | Live provider payload; generated protocol. |
| REQ-003 | For the same failed command event, the existing center tool card and Activity panel must present the enriched error consistently for standalone and team-member Codex runs. | BEH-002 | Must | The screenshot is a team-member Activity failure; users should not see route-dependent diagnostics. | User screenshot; stream/adaptor code. |
| REQ-004 | Existing local recording and replay of a newly observed failed command must retain the enriched tool error so reopening the run does not regress it to the generic fallback. | BEH-002 | Should | The application-owned replay trace is the normal history display authority. | Runtime tool trace sequencer; current Codex integration docs. |
| REQ-005 | The change must preserve success, denial, interruption, invocation/turn correlation, command/cwd arguments, turn lifecycle, and non-command tool-family behavior. | BEH-001, BEH-003 | Must | Prevents a focused mapping correction from changing execution semantics or adjacent tools. | Current converter contracts. |
| REQ-006 | Failure detail must be rendered as readable diagnostic text, not as an unfiltered raw provider envelope; when output is multiline, the meaningful line structure must remain visible in the existing error surfaces. | BEH-002 | Must | The UI accepts an error string and already renders whitespace-preserving diagnostic text. | Existing frontend card components. |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002 | BEH-001 / SCN-001 | A provider-shaped terminal item has `type: commandExecution`, `status: failed`, `aggregatedOutput: "CODEX_FAILURE_STDERR_MARKER"`, and `exitCode: 23`. | The normalized failed `run_bash` error visibly includes `CODEX_FAILURE_STDERR_MARKER` and exit code `23` and is not only `Tool execution failed.` | The command remains classified as failed. | Deterministic converter test using the retained live payload shape. |
| AC-002 | REQ-003 | BEH-002 / SCN-001 | The failed event is streamed in a standalone Codex run. | Both the center tool card and Activity panel display the enriched error for the same invocation. | No raw provider envelope appears. | Frontend stream-projection/component validation. |
| AC-003 | REQ-003 | BEH-002 / SCN-001 | The failed event passes through the Codex team-member adapter/projector. | The team-member Activity panel and center tool card receive and display the same enriched error detail. | Team correlation and failed status remain valid. | Team stream contract test plus UI validation. |
| AC-004 | REQ-004 | BEH-002 / SCN-002 | A newly recorded failed command with enriched error is reopened through the normal local replay path. | The replayed tool call remains failed and shows the same actionable diagnostic rather than the generic-only fallback. | No migration/backfill is attempted for older traces. | Raw-trace and run-projection validation. |
| AC-005 | REQ-002 | BEH-003 / SCN-003 | A failed command provides an explicit provider error/message as well as command output. | The explicit provider error remains authoritative; the mapping does not replace it with a less-specific generic string. | Additional command facts may be included only without obscuring or contradicting the explicit error. | Provider-shaped precedence tests. |
| AC-006 | REQ-002 | BEH-003 / SCN-003 | A failed command has no non-empty output but has a non-zero `exitCode`. | The error visibly identifies the exit code and is more specific than the generic-only fallback. | `exitCode: 0` is not presented as a failure cause. | Nullable-field contract tests. |
| AC-007 | REQ-002 | BEH-003 / SCN-003 | A failed command has no explicit error/message, no non-empty diagnostic output, and no usable exit code. | AutoByteus still emits a valid failed event with the existing generic fallback. | The activity is not dropped and is not reclassified as success. | Fallback test. |
| AC-008 | REQ-005 | BEH-001, BEH-003 / SCN-001, SCN-003 | Existing success, denial, interruption, command/cwd correlation, and unrelated tool fixtures execute. | Their current event type, payload meaning, and visible behavior remain unchanged. | Any scope-expanding behavior change is treated as a requirement gap. | Focused regression suite. |
| AC-009 | REQ-006 | BEH-002 / SCN-001 | The provider diagnostic contains multiple lines. | Existing error surfaces preserve readable line breaks and do not expose the entire nested App Server item as JSON. | Existing UI truncation/overflow behavior remains unchanged. | Component/rendered UI validation. |

## Relevant Scenarios And Journeys

| Scenario ID | Kind (`User`/`System`/`Operational`/`Contract`) | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Codex-runtime agent; user monitors the run | Agent executes a shell operation as part of an ordinary supported run. | Codex selects its command tool in a standalone or team-member agent turn. | The run is active and terminal execution is permitted under its configured policy. | Codex executes the command; the command exits non-zero; App Server completes the command item with status and diagnostics; AutoByteus marks `run_bash` failed; the user opens the existing tool/Activity error surface. | The user sees the specific command diagnostic and exit code, while the agent turn may continue. | Explicit provider errors take precedence; absent details use the fallback defined in SCN-003. | `Supported Normal Scenario` | User screenshot and request; live App Server probe; official contract. | REQ-001, REQ-002, REQ-003, REQ-005, REQ-006 / AC-001, AC-002, AC-003, AC-005, AC-008, AC-009 |
| SCN-002 | User | User reviewing a prior run | Reopen the same supported run and understand its recorded tool failure. | Existing run-history selection/local replay surface. | A newly executed failed command was recorded after this change. | User reopens the run; local replay reconstructs the tool call and failed Activity; existing UI renders the recorded tool error. | The same actionable diagnostic remains visible. | Older traces are not backfilled when the detail was never persisted. | `Supported Normal Scenario` | Current local-replay display authority documented in Codex integration; recorder source. | REQ-003, REQ-004 / AC-004 |
| SCN-003 | Contract | Codex App Server `commandExecution` terminal-item contract | A terminal failed command may omit some nullable diagnostic fields. | `item/completed` for `commandExecution` with `status: failed`. | One or more of explicit error/message, `aggregatedOutput`, and `exitCode` is absent. | AutoByteus evaluates available provider failure evidence in the approved precedence; it produces one non-empty failed-tool error. | Use exit-code-only detail when that is the only useful fact; otherwise retain the generic fallback. | Empty output is ignored; missing/invalid fields do not drop the activity. | `Supported Explicit Edge Scenario` | Local Codex 0.152.0 generated protocol and official App Server README. | REQ-001, REQ-002, REQ-005 / AC-005, AC-006, AC-007, AC-008 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes` — existing error presentation only; no redesign requested.
- Linked UI/UX or interaction supplement: User-supplied screenshot at `/home/autobyteus/data/memory/agent_teams/software_development_department_b40dd773428c4a3fa3643158732e996b/requirements_engineer_01fcde30983a42f6983f16280a00c327/context_files/ctx_efd9a119e8ba__image.png`
- Linked runnable prototype, separate prototype repository/root, UI/UX specification, and applicable support artifacts: `N/A — not applicable`
- Product prototype ticket record and folder (externally owned): `N/A — not applicable`
- Prototype revision or commit: `N/A — not applicable`
- UI/UX user-confirmation reference: User approval of the intended diagnostic behavior on 2026-09-01; no Product Design work was requested.
- Approved visual-reference baseline: `N/A — existing UI is preserved`
- Normative visual and interaction details, including the approved final references: Preserve the current failed styling and Error section; replace the generic-only content with readable actionable diagnostic text.
- Explicitly illustrative fixture content or permitted implementation variation: `CODEX_FAILURE_STDERR_MARKER` and exit code `23` are verification fixtures. Exact punctuation/order may vary provided both facts are clearly visible and precedence requirements hold.
- Required screens, states, transitions, feedback, responsive behavior, or accessibility outcomes: Existing center tool card and Activity panel must expose the diagnostic wherever they currently expose `activity.error`/tool error. No new interaction is required.
- Explicitly unresolved product decisions: None material.

## Quality And Non-Functional Requirements

| Quality ID | Area (`Performance`/`Reliability`/`Security`/`Privacy`/`Accessibility`/`Compliance`/`Operability`/`Compatibility`/`Other`) | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- |
| QR-001 | Reliability | A provider-shaped failed command with any usable approved diagnostic evidence always produces one non-empty failed-tool error and does not lose the activity. | Codex command execution only. | Matrix tests for explicit error, output+exit, exit-only, and fallback. |
| QR-002 | Compatibility | Nullable current App Server fields and pre-existing generic fallback behavior remain accepted; no Codex-side protocol extension is required. | Codex 0.152.0 observed/generated contract and compatible payloads. | Provider-shaped fixtures and live smoke. |
| QR-003 | Operability | The error shown to a user contains enough provider evidence to distinguish the reproduced exit-23 failure without consulting server logs. | Existing live and replayed error surfaces. | Rendered UI/API assertion for marker and exit code. |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `Yes` — newly recorded local tool-result trace error content becomes more informative.
- Data or state that must be preserved: Existing run/tool/turn identity, tool arguments, order, failure status, and all pre-existing trace readability.
- Loss, reset, rebuild, or regeneration that is acceptable: No rewrite/backfill of historical generic errors is required; older traces may remain generic when provider detail was not retained.
- Retention, privacy, compliance, volume, downtime, or operational constraints: Existing command-output retention and UI presentation constraints remain authoritative; this ticket adds no new retention class or downtime requirement.
- Unknowns requiring downstream investigation: None material for requirements; implementation must confirm no duplicate detail is introduced when an explicit error already exists.

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| Codex App Server `commandExecution` item | Terminal command item exposes `status`, nullable `aggregatedOutput`, nullable `exitCode`, and other command facts; clients use them to summarize outcome. | Official App Server README: <https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md>; local `codex app-server generate-ts` output for 0.152.0. | Experimental protocol may evolve; the mapping must tolerate absent fields. |
| AutoByteus failed-tool stream contract | Failure consumers receive a failed event with a non-empty `error` string. | Server standalone/team mapping and frontend parser/handler sources. | No contract-shape change is required by these requirements. |
| Local replay trace | Newly persisted `tool_error` is the normal source for reopened failure presentation. | Runtime tool trace sequencer and Codex integration docs. | Existing historical generic values cannot be enriched without retained provider facts. |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/codex-command-failure-detail/codex-command-failure-probe.md` | Summarizes the live provider probe and identifies the loss boundary. | REQ-001, REQ-002 / AC-001, AC-005, AC-006, AC-007 | Complete evidence | Evidence only; included in approval basis. |
| `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/codex-command-failure-detail/codex-app-server-failed-command-raw.jsonl` | Retains relevant raw App Server lifecycle messages from the reproducible exit-23 command. | REQ-001, REQ-002 / AC-001 | Complete evidence | Evidence only; included in approval basis. |
| `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/codex-command-failure-detail/probe-codex-failed-command.py` | Repeats the live App Server experiment. | REQ-001, REQ-002 / AC-001 | Complete reproducibility aid | Evidence only; does not define behavior. |
| `/home/autobyteus/data/memory/agent_teams/software_development_department_b40dd773428c4a3fa3643158732e996b/requirements_engineer_01fcde30983a42f6983f16280a00c327/context_files/ctx_efd9a119e8ba__image.png` | Shows the user-visible generic-only failure. | REQ-003 / AC-003 | User evidence | Included in approval basis. |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The existing `error` string is the correct canonical product surface for failed tool diagnostics. | Standalone, team, replay, and both UI cards already consume it. | Verified by source investigation; Implementation Engineer rechecks contract tests. | Validated |
| ASM-002 | Exact punctuation/line ordering need not be prescribed if the best evidence and exit code are clearly visible. | Keeps requirements behavioral and avoids target implementation design. | User approval of this package. | Validated by approval |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | Approve the desired diagnostic precedence and live/replay scope defined here? | Explicit approval is required before downstream work. | User explicitly approved the package on 2026-09-01. | User | Approved |

## Traceability

| Requirement ID | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Prototype Evidence |
| --- | --- | --- | --- | --- |
| REQ-001 | BEH-001 | AC-001, AC-007 | SCN-001, SCN-003 | Live raw JSONL; probe summary; screenshot |
| REQ-002 | BEH-001, BEH-003 | AC-001, AC-005, AC-006, AC-007 | SCN-001, SCN-003 | Live raw JSONL; generated/official protocol |
| REQ-003 | BEH-002 | AC-002, AC-003 | SCN-001, SCN-002 | Screenshot; frontend/team stream sources |
| REQ-004 | BEH-002 | AC-004 | SCN-002 | Runtime trace sequencer; Codex integration docs |
| REQ-005 | BEH-001, BEH-003 | AC-008 | SCN-001, SCN-003 | Current converter tests/contracts |
| REQ-006 | BEH-002 | AC-009 | SCN-001 | Existing error card components |

## Downstream Architecture Input

- Approved scenario IDs and product-level behavior paths architecture must map: SCN-001 through SCN-003.
- Product and system constraints architecture must preserve: Existing failed-tool event contract, team/standalone consistency, local replay, command/cwd identity, and unrelated tool behavior.
- Decisions intentionally deferred to architecture design: None currently identified; technical placement and exact formatter ownership remain downstream decisions if architecture design is selected.
- Technical facts architecture should verify: `aggregatedOutput` is available to result parsing but not error parsing; failed terminal events publish only `error` through the canonical failure contract; downstream UI preserves that string.
- Known feasibility or integration risks: The shared payload parser serves several Codex tool families, so a broad parser change could unintentionally alter non-command errors; implementation must keep the approved command scope and preserved behavior. The user asked whether the provider item could be mapped to the AutoByteus `run_bash` return. Native AutoByteus returns structured `stdout`, `stderr`, `exitCode`, `timedOut`, `effectiveCwd`, and optional background-process data, whereas the observed Codex command item exposes combined `aggregatedOutput`, `exitCode`, and `cwd`. Downstream may reuse compatible existing projection concepts, but must not fabricate stdout/stderr separation, reclassify the approved failed state, or introduce a structural contract change without returning a `Requirement Gap` or `Design Impact`.

## Readiness Check

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Prototype and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A — no redesign/prototype requested`
- Material assumptions and open decisions are visible: `Yes`
- User approval received: `Yes`
- Requirements package ready for downstream route: `Yes`
- Remaining blocker: None.

## Architecture Design Routing Assessment

- Assessment status: `Complete`
- Assessment owner and date: Requirements Engineer; 2026-09-01
- Preliminary task size: `Small`
- Preliminary architectural risk: `Low`
- Structural surfaces reviewed: Codex converter/parser; normalized failed-tool event; standalone and team stream adapters; frontend error consumers; local raw-trace persistence and replay.
- Payload/content surfaces reviewed: App Server `commandExecution.status`, `aggregatedOutput`, `exitCode`, and `cwd`; canonical failed-event `error`; local trace `tool_error`.
- Structural-impact triggers: `None`
- Evidence paths: `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/codex-command-failure-detail/investigation-notes.md`; `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/codex-command-failure-detail/codex-command-failure-probe.md`; `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/codex-command-failure-detail/codex-app-server-failed-command-raw.jsonl`.
- Decision rationale: The approved outcome fits the existing failed-tool `error` string and existing live/team/replay consumers. No API or external-contract shape, persistence schema/invariant, security/privacy boundary, concurrency/lifecycle behavior, deployment topology, ownership boundary, migration, architectural pattern, or structural refactor is required. The change is a bounded provider-payload mapping correction with focused regression validation. Exact alignment to native AutoByteus `TerminalResult` is not an approved structural requirement and must not expand this direct route.
- Selected route: `Implementation Engineer`
- Outcome classification: `Approved Direct-Implementation`
- Direct-route conditions all satisfied: `Yes`
- Architecture design, review, and design-revision artifacts: `N/A — not applicable`
- Downstream re-entry trigger: Implementation Engineer must return `Design Impact` if production evidence shows the approved outcome requires a structural change, or `Requirement Gap` if exact native `run_bash` return parity would change the approved product contract.

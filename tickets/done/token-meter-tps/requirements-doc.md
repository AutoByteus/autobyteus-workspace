# Requirements — Token Meter output TPS

## Document Status
- Status: Approved
- Package identifier: token-meter-tps
- Request / ticket: project_task_b91ece4e-98ad-4694-b51b-4a5967905ca4
- Requested by: /project_task_manager; delegator AgentRun project_task_manager_2f7a8ea2d421446f8f22e4f616528547
- Requirements owner: Solution Designer
- Date: 2026-10-13
- Current solution revision ID: SR-002 (approved requirements baseline remains R1/SR-001)
- Exact approved baseline: R1, this document, SR-001; no behavior-defining supplements.
- Approved by/reference: Solution Designer within the user's direction. Conversation notice 2026-10-13: “I’ve approved an estimated output TPS based on token-usage reports for the selected agent only. It will update as reports arrive, include tool/wait time, and be labeled as an estimate—not model-inference speed. Until there are enough matching reports, it will show ‘Collecting’; older readings will remain clearly last-known.”
- Authorities read: installed solution-designer SKILL.md, references/requirements-engineering.md and requirements/investigation/revision templates; root AGENTS.md, DESIGN.md, TESTING.md; web/server AGENTS.md (2026-10-13).

## Problem And Desired Outcome
The user wants to watch Project Task Manager's token generation speed and inspect other selected agents, including Team members, in the existing right-hand Token tab. A rough estimate is explicitly acceptable and calculation is delegated to this team. Today the meter shows usage, context, pricing and model/runtime, but no TPS. Success is a useful, correctly attributed and honestly qualified output tokens/second observation while work proceeds, without inventing unavailable inference telemetry.

## Relevant Current And Desired Behavior
| ID | Kind | Scenarios | Current (investigation evidence) | Desired | Preserved |
|---|---|---|---|---|---|
| BEH-001 | User | SCN-001 | Token tab shows totals and latest runtime/model; no TPS (E1) | Estimated observed output TPS with explanation, timestamp and state | Existing context, cost and usage layout/values |
| BEH-002 | User | SCN-002 | Workspace target identifies exact agent, but standalone cost summary rolls up collaborators/copies (E2) | TPS always belongs to selected exact AgentRun, with sample's runtime/model | Existing cost roll-up, team rows and selection |
| BEH-003 | System | SCN-001,003 | Five runtimes expose model-call usage at report cadence, not token-by-token timing (E3–E8) | Refresh qualified estimate on compatible usage reports; no extrapolated live number | Runtime/model operation and accounting semantics |
| BEH-004 | System | SCN-003,004 | Summaries retain totals/latest timestamps, not a historical timing series; missing telemetry possible | Collecting/unavailable/last-known states and safe reset on insufficient continuity or changed identity | Stored user data and stream recovery |

## Stakeholders, Actors, And Outcomes
User watches one agent or selects another; runtimes provide telemetry; specialists implement and independently validate. No paid benchmark traffic or interference with the user's running workers/data.

## Scope Guardrail
### In-Scope Use Cases
| ID | Use case | Scenarios |
|---|---|---|
| UC-001 | Watch selected agent's estimated output TPS in Token tab | SCN-001,003 |
| UC-002 | Inspect standalone, Team, Org and delegated/collaborator agents without mixing identities | SCN-002 |
| UC-003 | Interpret insufficient, delayed, completed/historical or changed-configuration telemetry honestly | SCN-003,004 |
### Out Of Scope
Separate benchmarking/analytics service, Settings statistics TPS, provider billing corrections, tokenization changes, transcript parsing for guessed tokens, new persisted throughput history, team aggregate TPS, unrelated selection/usage bugs, runtime optimization, release-policy changes.
### Non-Goals
Exact inference speed, time-to-first-token, per-token instantaneous refresh, cross-model performance comparisons, a numeric result before evidence exists, reconstructing past TPS from lifetime totals. A turn with only one usable report has no estimate under this method.
### Preserved Behavior Boundary
BEH-001–004 / REQ-006 / AC-007: no changes to usage, cost, context, compaction, runtime lifecycle, execution, or accounting. No user-data transformation.
### Review Authority
Blocking design/implementation corrections must cite approved REQ/AC/BEH IDs. New scope, operational guarantees, persistence or policies are Requirement Gaps requiring Solution Designer recovery and user approval when scope changes. Adjacent findings become non-authoritative follow-ups; reviewer comments do not amend R1.

## Relevant Scenarios And Journeys
| ID | Kind / actor | Goal, trigger and sequence | Expected outcome / alternates | Validity / independent basis |
|---|---|---|---|---|
| SCN-001 | User / operator | Select working Project Task Manager or another agent; open Token; agent generates responses and uses tools | Collecting until enough reports, then a rate updates as further reports arrive; gaps stay visibly last-known | Supported Normal Scenario; user request, screenshot, E1/E2 |
| SCN-002 | User / operator | Switch selected AgentRun between standalone host, Team/Org member or task/collaborator copy while others also work | Each rate and runtime/model belong only to selected run; unrelated child/parent usage never supplies its rate | Supported Normal Scenario; explicit request and workspace-target variants E2/E9 |
| SCN-003 | System / runtime | Call completes and emits usage; tool work or awaiting model continues between reports; turn ends or next turn begins | Report-cadence estimate includes elapsed waits; no made-up live throughput, no cross-turn idle-period rate | Supported Normal Scenario; all five adapters and lifecycle E3–E8 |
| SCN-004 | User/system | Open saved run or reconnect/select mid-work; telemetry may be absent, delayed, missing count/model/time; user saves changed model/runtime configuration through supported controls | Unavailable/collecting until sufficient current evidence; old reading can remain only with explicit old model/runtime and last-known label; never reattribute | Supported Explicit Edge Scenario; task explicitly requires absent/delayed and selection/config change handling; E2/E9/E10 |
Unsupported/contrived: manually editing stored usage to force corruption is not a supported journey. Numeric invalid-input tests protect absent/insufficient telemetry, not a new data repair contract.

## Requirements
| ID | Requirement | Behavior / priority | Rationale / source |
|---|---|---|---|
| REQ-001 | Present output TPS within existing Token tab for selected exact AgentRun, not a root/team/collaborator roll-up; display the reading's runtime and model | BEH-001,002 / Must | User and E2 |
| REQ-002 | Estimate observed output rate from two consecutive usable model-call usage reports for the same run, turn, runtime and model: later report's normalized incremental output tokens / seconds between server observation timestamps. Exclude first report's tokens. Input is excluded; reasoning already included in reported output must not be added again | BEH-003 / Must | Actual count/time telemetry, DEC-001 |
| REQ-003 | Update on usage reports while work continues. Explicitly label rate Estimated and Last reported (or equally clear wording), show when observed, and explain report cadence, counted tokens and interval. Tools, waits, prompt processing, compaction, batching and report overhead inside the interval affect the estimate; not exact inference throughput | BEH-001,003 / Must | Avoid false live precision |
| REQ-004 | With fewer than two compatible valid reports, no positive interval, missing output/identity or discontinuity, show collecting/unavailable with reason, not invented 0/TPS. A genuine zero-output report with valid interval may show 0. Reset interval on turn/runtime/model change or lost report continuity. Duplicate/stale reports cannot alter rate | BEH-003,004 / Must | Explicit safe-evidence constraint |
| REQ-005 | Retain a usable reading only as last-known with its actual identity/time. Historical/hydrated totals alone cannot create a TPS reading. Selecting another run immediately changes scope even when usage totals are loading. Document session-local sample lifetime and each runtime's source/support limitation | BEH-002,004 / Must | Attribution and honesty |
| REQ-006 | Preserve existing cost, context, usage roll-ups and runtime behavior/data; use no extra provider calls or full-history polling for this metric | BEH-001–004 / Must | Focused extension and safety |
| REQ-007 | Provide durable arithmetic/identity/lifecycle regression tests and changed-source rendered plus realistic transport/runtime evidence. Clearly separate scripted transport from paid inference and report unrun runtime checks; clean up test-owned resources | BEH-001–004 / Must | User and TESTING.md |

## Acceptance Criteria
| ID | Requirements / scenarios | Trigger | Observable expected result / alternate | Verification intent |
|---|---|---|---|---|
| AC-001 | REQ-002,003 / SCN-001,003 | Same turn/model reports at 10:00:00 (baseline), 10:00:10 (200 output), 10:00:15 (150 output) | First collecting; then 20.0 TPS, then 30.0 TPS. Not lifetime tokens divided by time; first report tokens excluded; input/reasoning not added | Deterministic unit + rendered fixture |
| AC-002 | REQ-001,005 / SCN-002 | Concurrent host/child and Team members report; select host then member | Selected exact run's TPS/runtime/model only; host cost roll-up remains unchanged. Cover standalone host, standalone team, Org and delegated/collaborator member routing | Store/selection + real stream journey |
| AC-003 | REQ-003,005 / SCN-001,003 | No new report while generating or doing a tool; then complete/offline | Number does not extrapolate/decay as though current tokens were known; remains explicitly last-reported with observation time; collecting/no telemetry is distinguishable | Component + browser |
| AC-004 | REQ-004 / SCN-004 | Invalid/missing timestamps, count, turn/model/runtime, zero/negative interval, normalization failure or missing revision continuity | No NaN/Infinity/spike/fabricated numeric rate; invalid interval breaks measurement chain and recovers after fresh sufficient evidence. Real zero output over positive interval is 0 | Unit tables + stream fixture |
| AC-005 | REQ-004,005 / SCN-003,004 | Duplicate/out-of-order report, reading-only context update, Claude turn-end reconciliation; next turn/model/runtime; stale fetch arrives | Duplicate/stale reports never double count; non-call telemetry never supplies output; no rate bridges turn/model/runtime boundaries or fetched history. Old label cannot switch to a new model silently | Store/adapter regression |
| AC-006 | REQ-001,003–005 / SCN-004 | Open Token before any usage; open historical run; select new model/run; narrow panel and zh-CN locale | Visible collecting/unavailable explanatory state independent of totals; readable compact card, no horizontal overflow; localized accessible explanation and identity | Component/browser assertions and screenshots |
| AC-007 | REQ-006 / SCN-001–004 | Existing usage, costs, context compaction and team roll-ups run alongside rate | Existing expected values unaffected; no new provider requests, persistence/schema or analytics changes | Existing tests + diff review |
| AC-008 | REQ-007 / all | Final delivery | Runtime matrix names code-supported vs scripted/live-verified cases; changed-build evidence, commands, limitations, source finalization vs installed app state and cleanup receipt retained | API/E2E + Delivery artifacts |

## UI, Interaction, And Experience Requirements
Applicable: Yes. Add a compact, visible TPS section using existing Token Meter visual language; not a standalone dashboard. State/help available by keyboard and not solely color/hover. Label distinguishes observed output TPS from existing run-total output. Include sample model/runtime and timestamp in or immediately alongside the card. Render before/independently of totals availability. Existing section hierarchy preserved except the focused insertion. All new strings use en/zh-CN localization; format numbers consistently.
Product UI/UX package/repository/ticket/visual approval: N/A — no Product Team design request; screenshot is current-state evidence, not a prescribed final visual. No user-only product decision remains.

## Quality And Non-Functional Requirements
QR-001 (REQ-006, AC-007): O(1) arithmetic per selected incoming report and bounded per-run sample state; no new provider traffic, history scans or polling.
QR-002 (REQ-007, AC-006,008): deterministic arithmetic and accessible responsive rendering, realistic stream evidence on test-owned resources only.

## Data Continuity And Acceptable Loss
Persisted data affected: No intended change. Preserve all usage and user data. Ephemeral TPS samples may disappear on renderer reload; report unavailable rather than reconstructing unsupported timings. No durable TPS retention obligation.

## External Contracts And Dependencies
Current runtime telemetry as adapted in repo (E3–E8), server normalization and usage stream contracts (E9/E10). Exact per-token inference timing is not in the common contract. Runtime support is conditional on a stream yielding usable model-call reports; no hard-coded model allowlist or promise that every provider emits usage.

## Supplemental Artifacts
Original screenshot at /home/autobyteus/data/projects/project_f34a9537-07d7-449a-b78f-16368f1aa619/tasks/project_task_b91ece4e-98ad-4694-b51b-4a5967905ca4/context/ctx_a0fdcd22397a__ctx_473cdd5a37a6_image.png. Supporting evidence only; no behavior-defining supplement. Canonical investigation and revision record beside this file.

## Assumptions And Decisions
| ID | Question / evidence and reasoning | Recommendation / decision owner / status |
|---|---|---|
| DEC-001 | Counts arrive at completed-call/report boundaries; generic precise inference time is absent. Guessing tokens from text misses hidden reasoning/tools and varies by model/language; elapsed run lifetime mixes idle periods and model/collaborator changes. Compatible report pairs offer exact observed wall timestamps and accounted increments without new instrumentation | Use REQ-002 report-interval estimate, includes waits and excludes first report. Solution Designer / Decided within explicit authorization to determine rough calculation |
| DEC-002 | Could timer create a live value between reports? Unknown pending output means such changes imply false measurement | No numerical interpolation. Last-reported estimate with time; collecting before usable pair. Solution Designer / Decided |
| DEC-003 | Need persistence or new telemetry? User permits unavailable when evidence absent; current event stream supports rough rate | Session-local samples, no historical backfill, all five runtimes conditionally supported. Single-report turns remain unmeasurable. Solution Designer / Decided |
| DEC-004 | Which selected identity? Existing standalone totals include helpers; using them misattributes throughput | Exact AgentRun-only metric, own sample runtime/model visible even if cost summary differs. Solution Designer / Decided |
Assumption ASM-001: report timestamp interval approximates end-to-end output delivery speed, not provider inference time. Stated limitation, no unresolved approval needed.

## Traceability
REQ-001→UC-001,002 / BEH-001,002 / AC-002,006 / SCN-001,002,004.
REQ-002→UC-001 / BEH-003 / AC-001 / SCN-001,003.
REQ-003→UC-001,003 / BEH-001,003 / AC-001,003,006 / SCN-001,003,004.
REQ-004→UC-003 / BEH-003,004 / AC-004,005 / SCN-003,004.
REQ-005→UC-002,003 / BEH-002,004 / AC-002,003,005,006 / SCN-002–004.
REQ-006,007→UC-001–003 / BEH-001–004 / AC-007,008 / SCN-001–004.

## Architecture Phase Input
Map all four supported scenarios to exact stream and selection paths. Verify server count normalization, observed timestamps, duplicates/revisions, Team double-dispatch, runtime identity omitted from presentation payload, and model-change attribution. Keep timing estimator behind existing meter owner; architecture decides concrete files and integration. No target architecture was approved as a requirements substitute.

## Readiness Check
Content: current behavior evidence-backed; desired/preserved explicit; scope/ACs/scenarios/decisions traceable; UI direction coherent; no material unresolved assumptions or Needs user decisions. Product package approval N/A. Ready: Yes.
Approved basis: R1/SR-001 and conversation notice above; no supplements. Ready for architecture: Yes.

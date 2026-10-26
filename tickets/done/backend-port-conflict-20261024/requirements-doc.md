# Requirements Document

## Document Status
- Status: Approved
- Package: backend-port-conflict-20261024
- Request: project_task_8a0359c2-3b8e-47f1-a14a-d18d1459d8ca
- Requested by: /project_task_manager (run project_task_manager_603e6a7849f24400a3fe9944205f235b)
- Requirements owner: Solution Designer; date: 2026-10-24
- Current requirements baseline: R2 / SR-007 (R1 retained for original shutdown behavior)
- Approval: User explicitly confirmed application-shutdown cleanup in reply: “Of course, we should have a mechanism to stop all those background processes, because the application will shut down … Of course, we should stop these background processes.” Solution Designer approves the remaining details within the original delegated direction, informing the user in the immediately following commentary beginning “Understood. I’ll make application/backend shutdown stop …”.
- R2 approval: user on2026-10-26: “do it in this current ticket thanks”, responding to read-only Codex visibility in the existing Background Tasks panel. Exact scope in background-visibility-scope-approval.md. Solution Designer approves the bounded details below within that direction; user informed in commentary beginning “Understood—I’ll include read-only Codex background-task visibility in this ticket”.
- Approved supplements: background-visibility-scope-approval.md (scope decision only); investigation probes and historical diagnosis are evidence, not normative UI or behavior supplements.
- Authorities read: solution-designer/references/requirements-engineering.md, finding-the-cause.md, ticket-scope.md, handoff.md; repository AGENTS.md and TESTING.md, relevant package instructions.

## Problem And Desired Outcome
The reported desktop restart repeatedly failed while a Nuxt listener held backend port 29695. The user subsequently confirms that Codex launched this testing server through bash (SR-006); accept that origin, while the exact launch command, runtime version and process tree remain unestablished. The historical backend logged clean exit, which does not establish child cleanup. Isolated current-source probes also demonstrate a separate native-tool ownership gap: background children survive successful native shutdown and parent SIGTERM/exit. Provide a coherent fix for owned-background cleanup at application/backend shutdown and accurate recovery diagnosis for genuinely external listeners. Never claim this newly reproduced native path is the proven origin of the historical Nuxt process.
Success means owned processes actually disappear and release their listeners on shutdown/restart, unrelated processes and user data remain intact, and an external conflict produces actionable guidance followed by successful retry once removed.

## Actors And Outcomes
Desktop user: reliable application quit/restart with understandable failure recovery. AutoByteus-owned background commands: bounded lifetime at owning application shutdown. Other applications: no automatic interruption. Engineering/delivery: reproducible source-current tests, verified merge, safe cleanup; no release/install.

## Relevant Current, Desired And Preserved Behavior
| ID | Kind / scenarios | Current (investigation references) | Desired | Preserved |
|---|---|---|---|---|
| BEH-001 | System, SCN-001 | Port preflight emits only timeout text (E-001/P-001) | Identify conflict and available owner information accurately; actionable guidance | Never start over an unavailable required endpoint or adopt an unrelated listener |
| BEH-002 | User, SCN-002 | Restart stops managed backend only; persistent external listener survives (P-001) | Explain external ownership, do not kill it; retry after user resolves conflict | Restart control, existing healthy startup and endpoint |
| BEH-003 | System, SCN-003/004 | Native background process is detached and omitted from cleanup (E-003/P-002/003) | Application/backend shutdown stops its tracked background work, even after originating run ends | Ordinary active/idle agent and preview lifetimes are not changed by this ticket |
| BEH-004 | Contract, all | Existing data, external apps and runtime-specific owners exist | Preserve data and unrelated processes; report uncertainty rather than unsafe guesses | No reset, destructive repair, arbitrary port-based kill or installed-binary patch |

## Scope Guardrail
### In-Scope Use Cases
| ID | Use case | Scenarios |
|---|---|---|
| UC-001 | Desktop startup/restart with a conflicting backend endpoint | SCN-001/002/005 |
| UC-002 | Application/backend shutdown and restart of owned background commands | SCN-003/004 |
| UC-003 | Inspect Codex background shell work in the selected agent’s existing Background Tasks panel | SCN-006/007/008 |
### Out Of Scope
Release/publish/install; changing backend port policy; redesigning all provider runtimes; terminating unrelated processes; ordinary individual-agent stop or idle-shutdown policy; historical daemon reclamation by guessing ownership; data migrations/reset; arbitrary daemon escape/crash/OS power-loss guarantees. Existing provider-specific shutdown remains authoritative; newly discovered relevant failure must return for design refinement, not be ignored or silently broadened.
### Non-goals
No claim to reconstruct historical Nuxt ancestry or why its auxiliary port was chosen. No guarantee that a PID/command is visible under every OS permission policy. No newly promised full-Windows/Linux certification from macOS evidence.
### Preserved Boundary
BEH-002/004 and AC-005/006. All test processes, data and ports must be task-owned; the running installed app and existing previews remain untouched. Preserve unrelated shared checkout task-plans/ and other worktrees.
### Prerequisites
None currently established.
### Review Authority
Blocking corrections must cite approved REQ/AC/BEH IDs. New product policies, runtime-wide redesign, persistence changes or lifetime changes outside this boundary are Requirement Gaps; the reviewer cannot amend scope. Adjacent issues are recorded as follow-ups unless they block an approved outcome.

## Supported Scenarios And Journeys
| ID | Actor / event and goal | Supported entry and sequence | Outcome / alternate | Validity and evidence |
|---|---|---|---|---|
| SCN-001 | User opens desktop while another app occupies the backend endpoint | Launch → backend cannot start → error surface | Conflict and available PID/command, safe recovery instructions; unknown owner explicitly allowed | Supported Explicit Edge Scenario: historical report, P-001 |
| SCN-002 | User resolves external conflict and retries | Restart while occupied → still blocked; stop/reconfigure other app independently → Restart | No other process is killed; fresh retry succeeds and stale diagnostic clears | Supported Normal Recovery: report and P-001 preflight control |
| SCN-003 | Application exits or backend restarts after native background work | Agent starts long-running tool command → work continues → application quit/Restart Server | Owned background processes terminate and release listeners before successful completion | Supported Normal Scenario: exposed native tool, E-002/003, P-003, explicit user approval |
| SCN-004 | Originating agent already stopped/idle, or a tracked shell survivor remains | Start background work → agent ends / shell returns → application shuts down | Shutdown still cleans its owned remaining work; concurrent independent app stays live | Supported Explicit Edge Scenario: run_bash adoption code and current native lifetimes; user “all those background processes” at app shutdown |
| SCN-005 | Conflict diagnosis cannot inspect owner / permission denied | Startup encounters unavailable endpoint, owner lookup unavailable or races with exit | Bounded failure; no invented PID/cause, no data-reset advice; retry stays usable | Supported Explicit Edge Scenario: original “where available” requirement; OS inspection is fallible |

## Requirements
| ID | Requirement | Behavior / priority | Rationale / source |
|---|---|---|---|
| REQ-001 | Diagnose backend endpoint conflict distinctly from unrelated startup failures, showing port and available current PID/executable identity; identify unavailable or stale information honestly | BEH-001, Must | Delegation; E-001 |
| REQ-002 | Explain that Restart Server cannot release an unrelated application's listener; advise verifying and stopping/reconfiguring it, then retrying; explain resetting data is not a remedy and do not present reset as conflict recovery | BEH-002/004, Must | Delegation; historical evidence |
| REQ-003 | Application/backend shutdown must stop background processes that AutoByteus owns through its managed command lifecycles, including retained work after the originating run stops and tracked shell survivors; use bounded graceful/forced recovery and verify absence rather than equating signal delivery with exit | BEH-003, Must | User confirmation; P-003 |
| REQ-004 | Cleanup must be ownership-scoped, must not signal processes based only on a busy port, and must not report unconfirmed cleanup as clean success | BEH-003/004, Must | Explicit safety constraints |
| REQ-005 | Normal startup and restart after resolved conflict remain functional; clear stale diagnostics; keep unrelated failure handling and individual-agent/idle policy unchanged | BEH-001/002/003, Must | Original Done When; DEC-001 |
| REQ-006 | Preserve all user data and unrelated edits; validate on isolated source-current resources, record platform/failure limitations, merge to verified base, clean task-owned resources; no release/install | BEH-004, Must | Delegated constraints |

## Acceptance Criteria / Traceability
| ID | REQ / UC / BEH / scenario | Trigger | Observable result and fallback | Verification intent |
|---|---|---|---|---|
| AC-001 | 001/002; UC-001; BEH-001/002; SCN-001 | Owned external fixture occupies backend endpoint and returns 426 | Conflict visible without opening hidden technical details; correct port; actual owner identity where available; safe retry guidance, reset explicitly unsuitable | Main-process tests + isolated changed desktop |
| AC-002 | 001/004; UC-001; BEH-001/004; SCN-005 | Missing inspector, timeout, denied lookup, empty/racing result; non-address bind error | Bounded truthful diagnosis, no false owner or misclassification; no signal or data writes | Deterministic failure injection at inspector/bind boundaries |
| AC-003 | 002/005; UC-001; BEH-002; SCN-002 | Retry with fixture alive, then remove fixture and retry | First retry leaves fixture alive and remains blocked; second reaches healthy app; no stale conflict | Actual source-current desktop, HTTP and PID/port receipts |
| AC-004 | 003/004; UC-002; BEH-003; SCN-003/004 | Native tool background work, including already-ended initiating run and adopted shell child; app quit/backend restart | All registered owned work gone, ports released; TERM-resistant owned child receives bounded fallback; unrelated sentinel remains alive | Real child tests and actual server/desktop shutdown, with exact process receipts |
| AC-005 | 004/005; UC-002; BEH-003/004; SCN-003/004 | Ownership uncertain / observation fails / termination cannot confirm; ordinary agent stop | No arbitrary kill, no false clean success; normal agent-stop preview lifetime unchanged; existing provider stops preserved | Fault injection + ordinary-lifetime/control cases |
| AC-006 | 005/006; both UC; all BEH | Healthy startup and finalization | Normal startup/restart works; owned fixture data survives; no installed-app disruption; merged base evidence and cleanup receipts, no release | Isolated normal smoke, test data sentinel, Delivery receipt |

## UI And Experience
Applicable: conflict error and safe recovery within existing ServerLoading surface, plus R2 read-only Codex visibility in the existing Background Tasks panel (details below). Port, owner information (when known), explanation and retry must be readable without technical-details expansion. Long or unavailable process names must remain legible. Match existing localization/accessibility conventions. Product Design not requested; external design repo, UI/UX supplement, visual approval: N/A.

## Quality / Data / Dependencies
- QR-001 (REQ-003/004, AC-004/005): bounded shutdown with real absence checks and honest incomplete result; no sequential per-process timeout amplification that predictably outruns desktop shutdown.
- QR-002 (REQ-001, AC-002): owner inspection bounded, failure-isolated, read-only; process command text is untrusted display text, not shell input. Prefer executable name to exposing arbitrary arguments/secrets.
- Data continuity: Not Affected; no acceptable user-data loss/reset. Only transient ownership, diagnostics and the R2 runtime inspection view may change.
- Dependencies: current native shell/process lifecycle; OS inspection; desktop/main→renderer status; existing provider shutdown. Inspect concrete boundaries before architecture approval; no historical ownership inferred.

## Decisions
| ID | Reasoning and decision | Owner / status |
|---|---|---|
| DEC-001 | User confirmed app-shutdown cleanup. Apply it to backend restart/quit, not ordinary agent/idle stop; changing the latter would unexpectedly terminate active previews | User direction + Solution Designer bounded interpretation, Decided |
| DEC-002 | External port holder identity is advisory, never termination authority. Show executable identity rather than full argument dumps by default; unknown remains useful guidance | Solution Designer within direction, Decided |
| DEC-003 | Keep port policy; automatically changing ports or deleting data conceals rather than solves this failure | Solution Designer within direction, Decided |
| DEC-004 | Separate reproduced native cleanup defect from unproven historical origin and existing Codex control; preserve runtime-specific owners | Solution Designer within direction, Decided |

## Architecture Phase Input / Readiness
All BEH/SCN/REQ/AC IDs above are the approved basis. Investigate process lifetime authority, process-exit verification, desktop shutdown deadlines and main→renderer diagnostic propagation. Do not graft app-only cleanup onto every Agent shutdown. No migration or provider-wide rewrite is requested.
Readiness: problem, evidence, desired/preserved outcomes, scenarios, scope, testable traceability, data constraints and decisions complete. No Needs user decision remains. Approval basis R2/SR-007 extends R1/SR-001 with the scope approval recorded above; ready for architecture.


## R2 — Approved read-only Codex visibility (SR-007)
This extension is in the CURRENT ticket, superseding the separate FU-002 proposal. Original REQ-001..006/AC-001..006 remain unchanged. Current D3.1 and CRR-002 cover only the previous scope; affected design has been revised as D4, Ready for independent review; no D4 review pass is inferred. No new Product UI/UX service requested.

### Relevant behavior and supported scenarios
- BEH-005: currently Claude/AGY background task snapshots reach the existing per-agent panel, but Codex reports no such view. Desired: inspect provider-tracked Codex shell work that continues beyond its originating turn, with exact originating run, safe identifying label, last-confirmed state and honest unavailable/unknown states. Preserve existing Claude/AGY display and ordinary foreground Activity/transcript behavior.
- BEH-006: presentation must not grant process-control authority, change idle/shutdown decisions or expose secrets. Viewing or refreshing must never activate a stopped agent, send model input or stop a command.
- SCN-006, Supported Normal Scenario, UC-003: user asks a Codex agent to run a long-lived server; assistant finishes its turn while the command lives; user selects that agent’s Background Tasks panel → sees the tracked command still running → later natural completion/failure is reflected independently of the completed assistant turn. Basis: user direction, SR-006/P-011 and P-012. This view concerns tracked commands outliving turns, not every foreground shell or arbitrary descendant.
- SCN-007, Supported Normal Scenario, UC-003: user switches between agents, reopens the panel or reloads while the SAME backend runtime is live → selected-run view refreshes without another model call, without mixing runs or showing a stale response for a different selection. Runtime-observed terminal rows may be retained within that runtime; no durable history across server restart is promised.
- SCN-008, Supported Explicit Edge Scenario, UC-003: provider inspection unavailable, command disappears without terminal evidence, backend stops or connection is lost → UI distinguishes unknown/unavailable/last-known information from confirmed completion and from a confirmed empty tracked set. Existing preview lifetime and unrelated agent state stay unchanged. Basis: read-only runtime view and fallible dependency/transport; no arbitrary corruption or daemon-escape promise.

### Requirements and acceptance
| ID | Requirement | Trace |
|---|---|---|
| REQ-007 | Show Codex tracked background shell commands in the selected agent’s existing panel, with safe identifying description, start/observation time, confirmed running/completed/failed/stopped outcome where available; turn completion alone never means command completion | BEH-005, UC-003, SCN-006 |
| REQ-008 | Refresh the selected live runtime view on panel entry/re-entry and during observation; keep identity exact across switching/reload; distinguish unavailable/unknown and incomplete evidence from successful empty or completed results | BEH-005/006, SCN-007/008 |
| REQ-009 | Read-only visibility must not change command execution, idle timers/quiescence, turn/segment admission or existing Claude/AGY behavior; expose no raw command arguments, environment values, logs/output or OS kill authority through the new view | BEH-006, SCN-006..008 |
| AC-007 | Real Codex conversation command survives its turn; selected panel shows running on the next successful refresh; natural exit later shows completed, nonzero failure shows failed, with no model poll required and no false completion at turn end | REQ-007, BEH-005, SCN-006 |
| AC-008 | Switch between two live runs and reload panel while backend remains live; refreshed result belongs only to the selected run, delayed prior request cannot overwrite it, and live background work is rediscovered without restoring/starting any run | REQ-008/009, SCN-007 |
| AC-009 | Timeout/error/unsupported inspection, missing terminal event or runtime disappearance yields explicit unavailable/unknown/last-known presentation, not a fabricated empty set, stopped or success; retry recovers on a successful current read | REQ-007/008, SCN-008 |
| AC-010 | Preserve Claude/AGY rows, foreground command Activity and strict turn gate; viewing/refreshing does not alter idle scheduling or hasRunningBackgroundTasks behavior; commands containing secret arguments/env and output expose none of those values in new query/UI; no stop button or signal/model call | REQ-009, BEH-006, SCN-006..008 |

### Scope and detail decisions
UC-003 includes the existing panel for a live Codex run accessible on the selected server node, including local Team/Org member runs identified by their concrete agentRunId. Remote-only/unavailable runs may truthfully report unavailable rather than invent a process inventory; no new remote forwarding/restoration protocol. No global dashboard, arbitrary OS inventory, stop control, log viewer, all-provider rewrite, historical process reclamation or persistent task history. Native shutdown fixes and existing provider views remain in scope only as previously defined/preserved.
DEC-005 (User): include bounded visibility in current ticket, not separate follow-up. DEC-006 (Solution Designer within direction): identify new Codex rows with safe shell/executable label and task/time identity; omit raw arguments/output instead of claiming comprehensive secret redaction. DEC-007 (Solution Designer): unknown is distinct from stopped/failed; only actual evidence grants terminal state. DEC-008 (Solution Designer): inspect live runtime state on reopen/reload, not stored histories; absence of an active runtime is unavailable, never an invitation to restore it. DEC-009 (Solution Designer): background visibility and existing idle-shutdown work policy remain separate; changing the latter requires another explicit product decision.
Data continuity: Not Affected; runtime-only display state, no stored schema or historical trace rewrite. New view retains at most100 completed observed rows per live thread; live/unknown tasks not dropped to satisfy that history bound. UI discloses recent runtime observations, not durable/full-system history. New uncertain labels and existing panel presentation must be readable/localized in English and zh-CN. No approval question remains for these bounded details.
Readiness: approved scope, supported scenarios, preserved behavior, testable ACs and no migration/stop/idle-policy expansion are explicit. R2 Approved; proceed to affected architecture revision and independent review.

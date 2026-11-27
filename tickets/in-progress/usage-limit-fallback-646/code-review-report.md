# Code Review Report — autobyteus-646 Runtime fallback on a usage limit

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: [requirements-doc.md](requirements-doc.md) (Approved, SR-009 header; REQ-006 per SR-007)
- Investigation Notes Reviewed As Context: [investigation-notes.md](investigation-notes.md)
- Solution Revision Record Reviewed As Context: [solution-revision-record.md](solution-revision-record.md) (SR-001…SR-010)
- Design Spec Reviewed As Context: [design-spec.md](design-spec.md) (Ready, SR-010; C-1…C-8, walks 1-9, R-1…R-16)
- Supplemental Task Artifacts Reviewed As Context: [follow-ups.md](follow-ups.md) (FU-646-01, FU-646-02); `evidence/IMP-01…IMP-10`
- Relevant Solution Revision IDs: SR-004…SR-010
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-005 Pass; the reviewer's latest edits uncommitted, not committed by me)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (same)
- Relevant Architecture Review Revision IDs: ARCH-REV-001…ARCH-REV-005
- Implementation Handoff Reviewed As Context: [implementation-handoff.md](implementation-handoff.md)
- Implementation Revision Record Reviewed As Context: [implementation-revision-record.md](implementation-revision-record.md)
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: [code-review-revision-record.md](code-review-revision-record.md)
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Trigger: `/implementation_engineer`, implementation complete, IR-001, `Large`/`High`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Failure-origin / delivery fields: N/A

Reviewed: `bc4351cad7..4a4b2d7c32` (175 files; about 2,300 source lines in 81 source files, the rest tests, fixtures, docs and generated code).

## Routing Classification Review

- Task size: `Large`; architectural risk: `High`:
  - a new subsystem (`run-events/`);
  - automatic stop and switch of live runs in both root kinds;
  - new persistence;
  - the delegation layer order;
  - the built-in router's request kind and tool.
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None

## Review Scope

- Changed implementation and behavior reviewed:
  - the run event hub and log, with the shared `SealedJsonlLog` (including the routing decision log's move onto it, compared line by line: same append, same truncation of an unfinished line, same seal, no retention for decisions);
  - the detector, the per-runtime classification and `ERROR_CLASSIFIED`'s consumers;
  - the exhaustion view;
  - the switch listener and composition;
  - `FallbackChooser`, `AgentLaunchHistory`, the router's `requestSwitch`/`submitSwitch` and the `submit_runtime_switch` tool;
  - `RunRuntimeSwitcher`;
  - the Agent root's automatic switch (`StandaloneAutomaticRuntimeSwitch`, the lifecycle lane, `switchAgentRuntime`, R-15);
  - the Team member switch (`TeamMemberRuntimeSwitch`, its committer, the backend control);
  - `pendingRuntimeSwitch.cause` and its marker text;
  - `present_as_notice` (autobyteus-ts native ingest, the server accumulator);
  - the delegation changes: exhaustion on every layer, the history layer, `agent_history`;
  - the setting and its GraphQL field;
  - the web toggle and labels.
- Read for context:
  - `RootOperationGate` (a counting barrier, not a mutex);
  - `applySelectionToConfiguredMember` and `agent-run-runtime-switch-commit.ts` (both record `launchSource: settings` on a change);
  - the web's source labels (`useRunMemberFacts.ts`, `runSettings.ts`);
  - the E2E cases UL-01…UL-08 and ULP-01.
- Reviewer's own check: `vitest run tests/unit/run-events tests/unit/model-routing tests/unit/agent-team-execution tests/unit/standalone-agent-run-root tests/unit/launch-preferences tests/unit/agent-collaboration/collaborators` at `4a4b2d7c32`: 80 files, 423 tests passed.
- Explicit exclusions: live runtimes at a real limit (API/E2E); R-6's template text (pending the founder).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood:
  - A usage-limit failure is recognized (REQ-001) and published as a run event (REQ-009).
  - It is remembered until its reset (REQ-002).
  - New delegations skip an exhausted default (REQ-003).
  - The run switches to the fallback, Router first then history (REQ-004), through the existing switch and hand-over, with a continue message (REQ-005), shown plainly (REQ-006).
  - With no fallback it stays in Error with a message (REQ-007).
  - No loops (REQ-008).
  - The problem statement's outcome: "a run that hits the limit switches to the best usable runtime for that agent and continues by itself". DEC-002: "the point is that work doesn't stop".
- Design-spec behavior map verified against the implementation: DS-001…DS-005 run through the named owners, with SR-009/SR-010's replacements:
  - R-11: each root's own operation;
  - R-12: the guard reads the run's own state;
  - R-13/R-16: the per-runtime classification and `ERROR_CLASSIFIED`;
  - R-14: retention;
  - R-15: the root follows its own switch.
- Design review report and round confirmed: ARCH-REV-005 Pass.
- Behavior-basis status: `Confirmed` for the implemented paths. BEH-003/BEH-004 have the gap recorded as CR-646-02 (a scenario the requirements leave open, not a contradiction of the code with the design).
- Remaining material ambiguity: CR-646-02 (a founder decision).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / New Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Codex `codexErrorKindFields` on the `error` notification and the failed turn. AGY/ACP/Claude use `LateUsageLimitClassification` (the limits read after a terminal unclassified `ERROR`, then `ERROR_CLASSIFIED`). The detector acts once per (run, turn) and only for runs `placeOf` holds; its scope and reset come from `readRuntime`. UL-01 (three errors, one event), UL-08 (AGY) | — |
| BEH-002 | Confirmed | `RuntimeExhaustionView` loaded from the log (31 days) and kept current by the hub. `LaunchUsabilityCheck.exhaustedUntil` checks every layer, including the inherited launch. UL-06 | — |
| BEH-003 | Confirmed (with CR-646-01/02) | Listener → chooser → switcher → root. Agent root: own checks → quiet stop → `commitRunRuntimeSwitch` with `cause` → `setInheritedLaunch` → continue input. Team: own checks → handle quiet stop → tree commit → `replaceSelection` → post. Marker from `cause`; the continue input carries `present_as_notice`. UL-01/02/04, ULP-01 | The no-fallback text and the history-only safety net (CR-646-01/02) |
| BEH-004 | Confirmed (with CR-646-02) | `historyPick`: of the agent's 30-day launches usable now, most runs (ties: most recent), with the model last used there | An agent with no usable runtime in its history gets no fallback even when runtimes are usable (UL-05) |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-01 | UC-002, REQ-004/005 | System | A run whose runtime hits its limit, Model Routing off (the default) | Work continues | Terminal usage-limit error | Normal | DS-001 → DS-003 (history) | Switched, continues | Requirements problem statement, DEC-002; UL-01 | Supported Normal Scenario | Use |
| S-02 | UC-002, UC-004, REQ-004/007 | System | The same, for an agent whose last 30 days hold runs only on the exhausted runtime (e.g. an agent always run on its default), other runtimes usable on the node | Work continues, or an honest Error | Same | Normal | DS-003: `historyPick` → null → `no_fallback` → `noFallbackText` | Error notice "… No other runtime is usable." while another runtime is usable | UL-05 builds exactly this ("lonely" agent, AutoByteus usable on the node, which UL-01 switches to) and asserts the text; UL-01/04/06 each seed history first (`history(lead, …)`) | Supported Normal Scenario | Use |
| S-03 | UC-002, REQ-005, R-11 | System | A Team member hits the limit | Member switches, the Team runs on | Same | Normal | Team root switch | Member switched | UL-04 | Supported Normal Scenario | Use |
| S-04 | R-11, R-15, REQ-003 | System | An Agent root that later delegates | Delegations inherit the new launch | After the switch | Normal | `setInheritedLaunch` | Inherits the new launch | R-15; unit | Supported Normal Scenario | Use |
| S-05 | R-7/R-8, P15/P17 | Contract | Any automatic switch | The stored launch origin says where the launch came from | Commit primitive | Normal | Both commit paths record `launchSource: settings` on a change | The run's origin reads "the user's own Settings edit" | `agent-run-runtime-switch-commit.ts:36`, `runtime-selection-rule.ts:162`; vocabulary `launch-configuration-source.ts:13-16` | Supported (contract) | Use |
| S-06 | C-7, R-6 | System | Model Routing on | The router chooses | Switch request | Normal | `requestSwitch` → router turn → no tool or instructions → 40 s → history | One router turn and up to 40 s spent per event, until R-6 lands | UL-03; handoff | Supported Normal Scenario | Use (note) |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Scope | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The no-fallback notice states "No other runtime is usable." when other runtimes are usable but none is in the agent's history | S-02, REQ-007, C-5 | Default configuration, any single-runtime agent | The person is told something false and has no hint to switch manually | `noFallbackText`; UL-05 asserts the text with AutoByteus usable | Promote → CR-646-01 | This ticket (text this ticket adds) | The C-5 text is approved design wording, so its correction is the designer's |
| C-02 | With Model Routing off, an agent whose 30-day history has no usable runtime but the exhausted one is never switched, though other runtimes are usable | S-02, REQ-004 vs the problem statement and DEC-002 | Same | The run stays in Error: UC-002 doesn't happen for these agents | UL-05; the E2E cases that switch all seed history first | Promote → CR-646-02 | Requirement Gap | REQ-004 approved history-only; whether to go further is the founder's |
| C-03 | An automatic switch stores `launchSource.origin = settings`, documented as "the user's own Settings edit" | S-05, P15, P17, R-8's "no false fact" | Every automatic switch | False stored fact. The row's source label disappears after the switch (`settings` has no label), and after activation clears the pending switch, nothing on the run records that the launch came from an automatic switch | Commit paths above; handoff "Source of a switched Team member" (the Agent root's path does the same) | Promote → CR-646-03 | This ticket (introduced here; `launch-configuration-source.ts` is edited by it) | A vocabulary decision: the designer's |
| C-04 | R-6 pending: with Model Routing on, each event spends a router turn (a model call) and up to 40 s before history decides | S-06 | Model Routing on | Delay and cost, no wrong outcome | UL-03 | Reject as a finding; release condition | — | Designed and recorded (R-6). It must land, with the founder's approval, before release |
| C-05 | The Agent root's "gate" is a counting barrier, not a mutex: a person's input can activate the agent between the quiet stop and the commit | R-1/R-11 premise "no input interleaves" | Input at the switch moment | The commit refuses ("its agent is still running") → `switch_failed`; the old runtime fails again → a new event → a new switch | `RootOperationGate`; `StandaloneAutomaticRuntimeSwitch.commit` | Reject | — | Self-healing, and the person's input wins. Noted for the design's wording |
| C-06 | Codex `not_quiet` → `nextIdle` waits for an `idle` status (2 min) | R-1 retry | A switch decided while the turn ends | Unexercised end to end | Unit only | Hold for Evidence | — | API/E2E may cover it |
| C-07 | `AgentLaunchHistory.launchesOf` reads the Team index strictly; one failure empties the whole history (the chooser catches it) | DESIGN rule 7 | A bad team index | The switch falls to no fallback | No evidence that the index is ever bad | Hold for Evidence | — | Speculative |
| C-08 | Size: `standalone-agent-run-lifecycle-service.ts` 499, `root-team-run.ts` 498 | Size rule | — | No room left | Measured | Reject | — | Under 500; residual |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | The new subsystem and per-root operations as designed; the person's Save path untouched (`StoppedRunSelectionInput`/`TeamRunSelectionPatch` back at base) | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | C-1, C-2, C-5 marker, C-6, C-7 shapes as specified | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001…DS-005 exactly | — |
| Ownership boundary preservation and clarity | Pass | Classification per backend; scope from the availability service; policy in the listener; the switch in each root; persistence through the commit primitives | — |
| Off-spine concern clarity | Pass | Logging per publish, listener failure and outcome; retention in `SealedJsonlLog` | — |
| Existing capability/subsystem reuse check | Pass | `commitRunRuntimeSwitch`, `commitExecutionTreeMutation`, `replaceSelection`, `RoutingRequestQueue` (through `carry`), the hand-over and marker | — |
| Reusable owned structures check | Pass | `SealedJsonlLog` serves three logs; `automaticSwitchRefusal` is shared by both roots | — |
| Shared-structure/data-model tightness check | Fail (CR-646-03) | `launchSource.origin = settings` gets a second meaning | Designer decides the origin of an automatically switched launch |
| Repeated coordination ownership check | Pass | One listener, one chooser for the switch and the delegation history layer | — |
| Empty indirection check | Pass | The `RunRuntimeSwitcher` lookup (`placeOf` → live root) has a reason; the ports have production bindings and fakes | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | — | — |
| Ownership-driven dependency check | Pass | `run-events` imports no model-routing class (structural types); model-routing imports no listener; backends use a process port | — |
| Visible dependencies check (P16) | Pass — deviation recorded, reason holds | Process bindings (`configureRuntimeExhaustion`, `configureAgentHistoryLaunch`, `configureModelBlockedReading`) are bound by the composition, with documented "nothing" defaults on servers that don't compose them; collaboration admission is built before the hub (recorded in the code). A double bind throws | — |
| Authoritative Boundary Rule check | Pass | The listener calls the switcher → the root; never the lifecycle or tree directly | — |
| File placement check | Pass | — | — |
| Flat-vs-over-split layout judgment | Pass | — | — |
| Interface/API/query/command/service-method boundary clarity | Pass | `switchAgentRuntime(agentRunId, request)` with explicit outcomes; `submit_runtime_switch` checked against the request's usable list | — |
| Naming quality and naming-to-responsibility alignment (P15) | Fail (CR-646-03) | `settings` origin, see above. Everything else is consistent (`agent_history` in C-2, R-7 and R-8 alike) | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Decision-log file handling moved into `SealedJsonlLog`, not copied | — |
| Patch-on-patch complexity control | Pass | SR-009's replacements removed the earlier map and detector branches | — |
| Dead code removed in the touched files and modules (P7) | Pass | — | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass, one note | Unit tests per owner. E2E UL-01…UL-08, ULP-01. UL-05 asserts the false text (CR-646-01) | Follows CR-646-01 |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The scripted Codex app-server fixture | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | — | — |
| API/E2E readiness for the next workflow stage | Pass after the findings | — | — |

## Source File Size And Structure Audit

| Source File | Before | After | `>500` Check | `>220` Delta | SoC / Ownership | Placement | Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `agent-execution/services/standalone-agent-run-lifecycle-service.ts` | 487 | 499 | Pass (at the limit) | +12 | Pass | Pass | — | Residual: no room |
| `agent-team-execution/domain/root-team-run.ts` | 495 | 498 | Pass (at the limit; the leaf statuses moved out) | +3 | Pass | Pass | — | Residual |
| `agent-execution/runtime/general-process-run-supervisor.ts` | 478 | 480 | Pass | +2 | Pass | Pass | — | — |
| `compositions/build-studio-server.ts` | 464 | 473 | Pass | +9 | Pass | Pass | — | — |
| `services/server-settings-service.ts` | 465 | 473 | Pass | +8 | Pass | Pass | — | — |
| `agent-collaboration/collaborators/collaborator-launch-resolver.ts` | 321 | 366 | Pass | +45 | Pass | Pass | — | — |
| `standalone-agent-run-root/domain/standalone-agent-run-root.ts` | 331 | 365 | Pass | +34 | Pass | Pass | — | — |
| New files (largest: `usage-limit-switch-listener.ts`, `compositions/run-events-composition.ts`, `model-routing/services/fallback-chooser.ts`, `utils/sealed-jsonl-log.ts`) | 0 | ≤ 160 each | Pass | — | Pass | Pass | — | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | `cause` is optional and read strictly; no version branches |
| No legacy old-behavior retention in changed scope | Pass | "Blocked only while routing is on" replaced by exhaustion always (C-3) |
| Dead code removed in the touched files and modules (P7) | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | New logs; existing records read unchanged |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | — |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Data Contract Check (Principle 17)

- C-1: the envelope `{at, kind, agentRunId, data}` and `usage_limit_reached` data match field for field. Unknown kinds are kept and ignored; bad lines are skipped and logged.
- C-2: matches. `chosenBy` and `to` are null for `no_fallback`.
- C-3: derived, with the 1 h cooldown and the 31-day startup read.
- C-4/R-16: `error_kind`, and `ERROR_CLASSIFIED` with the consumers that drop it.
- C-5 text: CR-646-01.
- C-6: matches.
- C-7: matches, with R-6 pending.
- C-8: matches.
- R-7 `cause`: written by the automatic path only, and strictly parsed.
- One stored fact not covered by the contract: the launch origin an automatic switch records (CR-646-03).

## Docs-Impact Verdict

- Docs impact: `Yes`. New `run_events.md`; `model_routing.md`, `agent_runtimes.md`, `agent_tools*.md`, CM-12 and the web settings doc are updated.
- These follow the findings:
  - the C-5 wording wherever it is documented (CR-646-01);
  - the safety-net rule if it changes (CR-646-02);
  - the `settings` origin's documented meaning (CR-646-03).

## Additional Material Premise Validation

- AR premise "each root runs it inside its own gate, so no input or command interleaves" (R-1): `Reclassified` for the Agent root. `RootOperationGate` is a counting barrier, so input can interleave. The outcome is safe (candidate C-05), but the design's wording should not claim exclusivity.

## Review Scorecard (Mandatory)

- Overall score: 9.2 / 10 (simple average; not the decision rule)

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | Five spines exactly as designed; the hub decoupling holds | — | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | Classification, scope, policy, switch and persistence each have one owner | — | — |
| 3 | API / Interface / Query / Command Clarity | 9.4 | Explicit outcomes (`switched`/`not_quiet`/`already_switched`/`failed`); the tool checked against the usable list | — | — |
| 4 | Separation of Concerns and File Placement | 9.3 | — | Two files at 498/499 | Keep them from growing |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 8.8 | `SealedJsonlLog`, C-1/C-2 tight | CR-646-03: `settings` origin with a second, false meaning | Designer decides the origin |
| 6 | Naming Quality and Local Readability | 9.0 | `agent_history` consistent | CR-646-03 (P15) | As above |
| 7 | API/E2E Readiness | 9.3 | 8 built-server cases plus a two-server case | Not-quiet retry unexercised; live limits pending | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 8.6 | Detection, dedupe, switch, hand-over and notice rows proven | CR-646-01: false user-visible text in the default configuration's common case. CR-646-02: the switch doesn't happen for agents without other-runtime history | Designer and founder decide; then the text and, if decided, the safety net |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.6 | — | — | — |
| 10 | Cleanup Completeness | 9.4 | Earlier mechanisms removed with SR-009 | — | — |

## Findings

### CR-646-01 — The no-fallback notice says "No other runtime is usable." when other runtimes are usable (`Design Impact`, this ticket)

- **Where:** `run-events/listeners/usage-limit-switch-listener.ts` `noFallbackText`. The text comes from the approved C-5, and the C-5 text includes this clause.
- **Scenario:** S-02. Model Routing off (the default), and the agent's last 30 days hold runs only on the exhausted runtime. The chooser returns `no_fallback` because the history pick is empty, not because nothing is usable. UL-05 builds this case: AutoByteus is usable on the node, and UL-01 switches to it. UL-05 then asserts "Usage limits reached: Codex App Server until …. No other runtime is usable."
- **Consequence:** the person reads a false statement. They aren't told that a usable runtime exists and that they can switch to it by hand.
  - REQ-007 asks for a message that names each exhausted runtime and its reset time, not this claim.
  - REQ-006: "Nothing the agent is told is hidden": the person must be able to trust the notice.
- **Required action (Solution Designer):** give the C-5 no-fallback text for the case where usable runtimes exist outside the history (or for every case), consistent with CR-646-02's decision. Then the implementer updates `noFallbackText`, its unit test and UL-05.

### CR-646-02 — With Model Routing off, an agent with no other runtime in its history is not switched at all (`Requirement Gap`)

- **Behavior:** REQ-004's safety net is history only: "the agent's most-used usable runtime (last 30 days)". With Model Routing off (the default, DEC-002 (a)), an agent whose last 30 days hold runs only on its default runtime has no fallback. The run stays in Error even when other runtimes are installed, signed in and not exhausted.
  - This is common: an agent is normally run on its configured default.
  - Every E2E case that switches (UL-01, UL-04, UL-06, ULP-01) first seeds a run on the fallback runtime.
- **Why it is a gap:** the problem statement's outcome is "a run that hits the limit switches to the best usable runtime for that agent and continues by itself". DEC-002's reason is "the point is that work doesn't stop". REQ-004 doesn't say what happens when the history holds nothing usable; the result is UC-004's Error.
- **Required action (Solution Designer, the founder's decision):** decide whether, after the router and the history, a further rule applies (for example a usable runtime chosen by a stated order), or whether the run stays in Error. Record the decision in REQ-004/REQ-007. CR-646-01's text follows it.
- **Delegation:** R-2 already falls to the inherited launch after an empty history, so delegation is less affected. The same question applies there when the inherited launch is exhausted.

### CR-646-03 — An automatic switch records the launch origin `settings`, "the user's own Settings edit" (`Design Impact`, low, this ticket)

- **Where:** both commit primitives record `launchSource: SETTINGS_LAUNCH_SOURCE` on any change:
  - Agent root: `run-history/services/agent-run-runtime-switch-commit.ts:36`;
  - Team member: `run-history/domain/runtime-selection-rule.ts:162`.
- **The vocabulary:** `launch-configuration-source.ts:13-16`, a file this ticket edits, defines `settings` as "the user's own Settings edit".
- **Consequence:**
  - A false stored fact (P15, P17; the design's own R-8 rejected `inherited` because "it would store a false fact").
  - In Run Settings the row's source label disappears after the switch (`settings` has no label).
  - Once activation clears the pending switch and its `cause`, the run's own files no longer record that the launch came from an automatic switch. Only C-2 and the marker trace do.
- **Required action (Solution Designer):** decide the stored origin of an automatically switched launch.
  - Either keep `settings` and redefine it ("the run's own launch, changed after it started: a person's Settings save or an automatic switch, whose facts are on its pending switch and in the switch record"), updating its docstring;
  - or add an origin (with its label), and have the automatic paths pass it to the commit primitives.

## Follow-ups

- Follow-ups this review added: None. All three findings are this ticket's or a Requirement Gap. The probe staleness MRD-04 the implementer reported is the Solution Designer's to record.

## Classification

- `Design Impact` (CR-646-01, CR-646-03) and `Requirement Gap` (CR-646-02).

## Recommended Recipient

- `/solution_designer`. After its decision, the implementer applies the text, any added rule and the origin. This review then rechecks those items and re-audits the code they touch.

## Residual Risks

- **R-6 (release condition):** until the founder approves the template text and `submit_runtime_switch` joins the router's tools, every usage-limit event with Model Routing on spends a router turn and up to 40 s before history decides (UL-03).
- **DEC-008** still reads "Needs user" in the requirements (90 days applied as the default).
- **Codex `not_quiet` retry** (`nextIdle`) is not exercised end to end.
- **Real runtimes at a real limit:** the Claude SDK signal and non-Codex payloads are unrecorded (live API/E2E when an account is exhausted).
- **Files at the limit:** `standalone-agent-run-lifecycle-service.ts` (499) and `root-team-run.ts` (498).
- **Design wording:** the Agent root's gate is not exclusive (premise reclassified above). The behavior is safe.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (one premise reclassified, safe)
- Score Summary: 9.2 / 10; below 9.2: Runtime Correctness 8.6, Data-Model Tightness 8.8, Naming 9.0
- Failure Origin: upstream (C-5 text; REQ-004's safety net; the launch-origin vocabulary)
- Recommended Recipient: `/solution_designer`
- Notes: the implementation itself is careful and close to the design. The blocking items are a false user-visible text and an open requirement case, both in the default configuration.

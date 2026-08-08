# API/E2E Revision Record — Runtime Streaming Performance Follow-up

The latest `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` remain authoritative. This record preserves the concise completed-round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` / initial API/E2E round | `SR-001`, `ARCH-REV-001`, `IR-001`, `IR-002`, `CRR-001`, `CRR-002` | N/A | `Fail` / `77.1%` |
| API-REV-002 | `code_reviewer` / `CRR-004` / implementation-correction rerun | `IR-003`, `CRR-003`, `CRR-004`, `API-REV-001` | `Fail` / `77.1%` | `Pass` / `97.6%` |
| API-REV-003 | user frontend report / real standalone and team browser re-entry | `API-REV-002`, `IR-003`, `CRR-004` | `Pass` / `97.6%` | `Pass` / `98.0%` |
| API-REV-004 | user-authorized active Bible Study Group investigation / Round 4 | `API-REV-003`, `IR-003`, `CRR-004` | `Pass` / `98.0%` | `Fail` / `86.4%` |
| API-REV-005 | `code_reviewer` / CRR-007 / corrected future-write rerun | `IR-004`, `CRR-007`, `API-REV-004` | `Fail` / `86.4%` | `Pass` / `98.6%` |

## Revision Entries

### API-REV-001 — Real standalone socket disproves ordinary content coalescing

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/code-review-report.md`; initial API/E2E Round 1 after `CRR-002` pass.
- Triggering finding or scenario IDs: initial coverage; resulting failure `WS-EGRESS-001` against `AC-003` (and prerequisite for `AC-001`/`AC-006`).
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-001`, `ARCH-REV-001`, `IR-001`, `IR-002`, `CRR-001`, `CRR-002`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: establish the mandatory first completed API/E2E result from a coverage investigation written before durable edits/execution, and preserve the direct failure that mocked egress tests did not expose.
- Coverage decisions or durable test paths changed: updated the server GraphQL Settings E2E, standalone status/WebSocket integration, and team WebSocket integration. One obsolete immediate-content ordering assertion was corrected; no coverage was removed.
- Scenarios added, changed, removed, or rechecked: added API-SET-001, WS-EGRESS-001/002/003; updated/rechecked WS-STATUS-001; no removals. API-SET-001, WS-STATUS-001, WS-EGRESS-002, and WS-EGRESS-003 pass. WS-EGRESS-001 fails reproducibly.
- Commands, environment, fixture, or broader-validation delta: real Fastify WebSockets on free loopback ports, current production `AgentRun` lifecycle pipeline/mapper/handler/egress, deterministic 30-event same-identity source, explicit 500 ms setting, isolated GraphQL temp `.env`. Broader Chrome/Nuxt performance execution was intentionally stopped after the critical server failure.

#### Prior Failure Resolution

None — `API-REV-001` is the initial completed API/E2E result.

- Canonical artifacts and sections updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/ws-default-window-rate-failure.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/ws-default-window-rate-failure-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/api-team-live-setting-focused.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/ws-status-runtime-matrix.log`
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail`, `77.1%`.
- New or remaining failure IDs: `WS-EGRESS-001` — 30 canonical content events produce 30 ordinary client content frames after one 500 ms window; expected one exact aggregate.
- Recommended recipient: `code_reviewer` for focused failure-origin review. Preliminary classification is `Design Impact` because the reviewed all-non-content merge-barrier rule conflicts with the current canonical lifecycle transformer's per-content `running` companion.
- Remaining risks, blocked evidence, or untested scope: the required 10-minute/120k browser/runtime, exact final equality, CPU/drift/health/interactions, live/final DOM, and bound-node browser journeys remain intentionally unexecuted until WS-EGRESS-001 is corrected. The environment is not blocked.

### API-REV-002 — Corrected egress passes full runtime, browser, Settings, and live-provider validation

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/code-review-report.md`; Round 2 after CRR-004 passed IR-003.
- Triggering scenario: retained WS-EGRESS-001 had to run first, unchanged.
- Related revisions: `IR-003`, `CRR-003`, `CRR-004`, prior `API-REV-001`.
- Why recorded: preserve resolution of the critical real-socket failure and the completed repository, sustained browser/runtime, Settings, and user-requested real-provider evidence.
- Durable coverage delta: retained the three Round 1 API/WS files; updated the stale runtime-matrix aggregate expectation; added normalized database-target and production `AgentRun` adapter regressions in `live-e2e-harness.test.ts`; corrected the durable real-E2E harness in `test-support/live-e2e/live-e2e-harness.ts`. Removed none.
- Execution delta: exact WS-EGRESS-001 pass first; combined server 28/28; server affected units 141/141; web affected 140/140; builds/guards pass; 601-second Chrome production-path stream; two real Settings nodes; real DeepSeek and OpenAI agent-flow runs from a value-safe isolated vault.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| WS-EGRESS-001 / 30 source content events became 30 client content frames | Implementation/design interaction, confirmed in API-REV-001 | IR-003's state-preserving `SEND_WITHOUT_FLUSH` retains the actual same-identity pending tail; unchanged regression now emits the intended aggregate | `api-e2e-execution-evidence/ws-default-window-rate-api-rev-002.log` |
| Broader browser/runtime and bound-node evidence deferred | Deferred behind critical failure | Completed: 600.999 s, 120,220 exact chars, 1.7155 content frames/s, 95.712% reduction, all host/browser/Settings thresholds green | `api-e2e-execution-evidence/long-stream-browser-summary.json` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/`
- Prior result/confidence: `Fail`, `77.1%`.
- Current result/confidence: `Pass`, `97.6%`.
- New or remaining failure IDs: `None`. Two live-E2E test-infrastructure defects were locally corrected and rerun successfully; neither was a production implementation failure.
- Recommended recipient: `code_reviewer` for proportional review of the five updated durable coverage/test-support paths.
- Remaining risks: browser evidence does not claim unchanged Electron-shell execution; physical socket-loss replay remains intentionally unsupported; real-provider controls supplement rather than replace deterministic cadence/equality proof.

### API-REV-003 — Actual Daily Assistant and Classroom Simulation Team retain real Thinking disclosures

- Triggering role/report/round: user-reported missing Thinking disclosures in the actual frontend; Round 3 re-entry after the user clarified the concern was visible in a Bible Study Group member conversation and corrected the safe control from Nested Classroom Test Team to Classroom Simulation Team.
- Triggering scenario IDs: `BROWSER-DAILY-THINK-001`, supplemental `BROWSER-TEAM-THINK-001`, and authoritative corrected `BROWSER-CLASSROOM-THINK-001`.
- Related revisions: `API-REV-002`, `IR-003`, `CRR-004`; no implementation revision changed.
- Why recorded: Round 2's renderer fixture directly supplied reasoning and did not prove a real provider -> current packaged server -> standalone/team WebSocket -> production store/member resolver -> `ThinkSegment` DOM journey.
- Coverage/code delta: no production or repository-resident durable coverage code changed. Only the coverage investigation, execution report, revision record, structured ticket evidence, Nuxt logs, and screenshots were added/updated.
- Execution delta: started an isolated current Nuxt frontend bound to all current-server endpoints on `127.0.0.1:29695`; used the actual run forms and browser tool; selected `alibaba_cloud / deepseek-v4-flash-0731`; executed Daily Assistant, Nested Classroom Test Team (supplemental), and Classroom Simulation Team / `professor` (authoritative corrected control).

#### Prior Concern Resolution

| Concern | Current Resolution | Evidence |
| --- | --- | --- |
| Real standalone frontend might no longer receive or show provider reasoning | Daily Assistant socket carried 180 reasoning characters and the disclosure appeared live, remained after completion, and expanded non-empty | `api-e2e-execution-evidence/real-agent-team-thinking-browser-summary.json`; Daily screenshots |
| Team member projection might drop reasoning before the conversation DOM | Classroom Simulation Team socket routed 226 reasoning characters to `professor`; the correct member conversation mounted and retained the disclosure | Same structured summary; Classroom Simulation screenshots |
| Bible Study Group screenshot contains no visible disclosure | Not directly inspected or mutated at the user's request. The controls show the shared path works when a model emits reasoning; absence in a particular prior turn can still mean that its selected provider/model emitted no reasoning | Model/output-dependence recorded as residual limitation |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/real-agent-team-thinking-browser-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/real-classroom-simulation-thinking-collapsed.png`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/real-classroom-simulation-thinking-expanded.png`
- Prior result/confidence: `Pass`, `97.6%`.
- Current result/confidence: `Pass`, `98.0%`.
- New or remaining failure IDs: `None`. The generalized frontend regression was not reproduced. The Bible Study Group's prior provider/model output remains uninspected and is not represented as proven reasoning.
- Recommended recipient: `delivery_engineer`; Round 3 introduced no durable coverage/source change requiring another code-review loop.
- Remaining risks: Thinking is conditional on the selected model producing reasoning; web-equivalent browser proof does not claim Electron-shell execution; physical socket-loss replay remains intentionally unsupported.

### API-REV-004 — Native reasoning is live but is lost by raw-trace history hydration

- Triggering role/report/round: user report that active Bible Study Group / `study_leader` shows no Thinking disclosure and appears to show thought-like narration as ordinary content; Round 4 read-only active-run investigation.
- Triggering scenario/failure IDs: `BROWSER-BIBLE-LIVE-001` / `BIBLE-THINK-HYDRATE-001`.
- Related revisions: `API-REV-003`, `IR-003`, `CRR-004`; delivery artifacts were already in progress when the user report reopened validation.
- Why recorded: API-REV-003 proved live provider -> WebSocket -> member route -> ThinkSegment rendering but did not reload/reselect the completed run. FR-005 explicitly preserves history/hydration, and the user's actual active team exposed that missing boundary.
- Coverage/code delta: no production or durable repository coverage code changed in Round 4. The coverage investigation was updated before the read-only execution, and the failure is rerouted before test/source edits.
- Execution delta: identified the exact current team/member/runtime/model, queried the current team-member projection and event-monitor page, counted/hashes the actual working-context and complete active raw-trace stores without persisting private content, compared the earlier real Classroom live control after hydration, and inspected the native persistence/projection source boundary.

#### Prior Pass Correction

| Prior Claim | Round 4 Correction | Evidence |
| --- | --- | --- |
| Real team Thinking remained after completion | It remained in the same live client state only. The same control now has 226 reasoning characters in working context but zero reasoning raw traces/projection entries after hydration. | `api-e2e-execution-evidence/real-agent-team-thinking-browser-summary.json`; `real-bible-thinking-persistence-investigation.json` |
| Bible absence could mean the model emitted no reasoning | Disproved for the inspected run: 29 non-empty reasoning messages totaling 30,578 characters exist in its working snapshot. They are absent only from raw-trace replay/projection. | `real-bible-thinking-persistence-investigation.json` |
| Thought-like narration might be reasoning rendered as text | The visible narration is independently stored as assistant content. True reasoning is a separate field lost before projection; the frontend did not relabel it. | Persisted count/type comparison and native source boundary in the same evidence artifact |

- Expected: native reasoning is persisted as distinct replayable reasoning traces so standalone/team GraphQL hydration and member reselection retain Thinking.
- Observed: `MemoryManager.ingestAssistantResponse` stores reasoning in the working-context snapshot but appends only an assistant raw trace with normal content. The run-history projection receives no reasoning trace and returns no reasoning entry.
- Preliminary classification: `Implementation Defect` in native AutoByteus memory raw-trace persistence; existing external-runtime persistence and downstream projection support demonstrate intended behavior.
- Prior result/confidence: `Pass`, `98.0%`.
- Current result/confidence: `Fail`, `86.4%`.
- New failure: `BIBLE-THINK-HYDRATE-001`, affecting FR-005 / AC-005 and historical Thinking preservation under AC-007.
- Recommended recipient: `code_reviewer` for focused failure-origin review and routing to the implementation owner.
- Required post-fix evidence: durable native MemoryManager reasoning trace/provenance coverage, server standalone/team GraphQL reasoning hydration, and real browser reload/member-reselection retention.
- Canonical artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/real-bible-thinking-persistence-investigation.json`

### API-REV-005 — Corrected native reasoning survives standalone/team replay and real browser recovery

- Triggering role/report/round: `code_reviewer`; CRR-007 Pass for IR-004; API/E2E Round 5.
- Triggering scenario/failure IDs: prior `BIBLE-THINK-HYDRATE-001`; new `NATIVE-REASONING-GQL-001` and `BROWSER-NATIVE-REASONING-RELOAD-001`.
- Related revisions: `IR-004`, `CRR-007`, prior `API-REV-004` Fail.
- Why recorded: establish that IR-004 resolves the missing future-write native reasoning raw trace and the exact user-visible reload/member-reselection failure, not merely the live socket path.
- Coverage decisions/durable paths changed:
  - updated `autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` with native `MemoryManager` standalone/team GraphQL conversation and event-monitor Thinking assertions;
  - updated `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` test infrastructure to the current lifecycle snapshot, source-event batch subscription, and awaited `publishEvent` contract;
  - no durable coverage removed.
- Execution delta: native MemoryManager focused 27/27; native GraphQL full 7/7; cross-runtime 16/16; combined server 30/30; frontend Thinking/history 34/34; core/server builds and diff check pass. A current-source isolated backend/frontend plus real DeepSeek produced a 601-character Thinking segment that persisted in ordered raw traces, exactly hydrated through team GraphQL, survived hard reload/history reopen, and remained after `professor -> student -> professor` reselection.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `BIBLE-THINK-HYDRATE-001` — native reasoning existed only in working context and disappeared from raw replay/history | Implementation defect confirmed in API-REV-004 | IR-004 future writes now create ordered reasoning and assistant raw traces with shared turn/timestamp/source identity and both IDs in working-context provenance; standalone/team replay and real browser recovery pass | `api-e2e-execution-evidence/api-rev-005-native-reasoning-browser-reload-summary.json`; `api-rev-005-server-hydration-combined.log` |
| Real browser reload/member reselection unproven | Critical downstream gap | Full reload returned to no selected run; reopening the historical team run hydrated Thinking/final content, and post-reload member switch/reselection retained both | Structured browser summary and `api-rev-005-post-reload-reselection-expanded.png` |

- Canonical artifacts updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-execution-evidence/api-rev-005-native-reasoning-browser-reload-summary.json`
- Prior result/confidence: `Fail`, `86.4%`.
- Current result/confidence: `Pass`, `98.6%`.
- New or remaining failure IDs: `None` for corrected future writes.
- Recommended recipient: `code_reviewer` for proportional review of the two Round 5 durable test-file changes, then `delivery_engineer` on review Pass.
- Remaining risks: existing pre-IR-004 traces remain incomplete by the approved no-migration/no-backfill decision; Thinking remains conditional on non-empty model reasoning; unchanged Electron-shell behavior is not separately claimed.

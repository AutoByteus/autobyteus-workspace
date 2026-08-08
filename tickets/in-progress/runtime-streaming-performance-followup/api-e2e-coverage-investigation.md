# API/E2E Coverage Investigation — Runtime Streaming Performance Follow-up

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/performance-evidence.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/solution-revision-record.md` (`SR-001`)
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/implementation-revision-record.md` (`IR-001` through `IR-004`)
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/code-review-revision-record.md` (`CRR-001` through `CRR-007`)
- Delivery Revision Record: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup/tickets/in-progress/runtime-streaming-performance-followup/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-005`
- Current Investigation Round: `5`
- Trigger: `CRR-007` source-review Pass for `IR-004` (`d691736dc66a3d4323d44367d837d57405bf20b8`) after `BIBLE-THINK-HYDRATE-001`.
- Prior Investigation Reviewed: `Round 4 / API-REV-004 Fail at 86.4%.`
- Latest Authoritative Investigation: `Round 5 / API-REV-005 Pass at 98.6%; IR-004 corrects future-write native reasoning persistence and standalone/team/browser hydration.`

### Round 5 re-entry — IR-004 native reasoning persistence correction

- Trigger: `code_reviewer` reports `CRR-007` Pass with no open source findings. IR-004 now writes every non-empty native `CompleteResponse.reasoning` exactly once as an ordered `reasoning` raw trace before the related assistant/tool boundary and includes every response/tool trace ID in working-context provenance.
- Prior failure recheck: `BIBLE-THINK-HYDRATE-001` remains the first required proof. Existing pre-IR-004 Bible/Classroom raw traces are intentionally incomplete under the approved no-migration decision and cannot demonstrate the correction; create only new isolated post-IR-004 runs/evidence.
- Existing durable native coverage decision: `autobyteus-ts/tests/unit/memory/memory-manager-reasoning-persistence.test.ts` and the updated working-context persistence test are `Still Valid — run unchanged`. Together they cover reasoning-only, reasoning+assistant, reasoning+tool ordering/identity/sequence/provenance and snapshot reload.
- Existing GraphQL coverage decision: external-runtime Codex reasoning persistence/reload scenarios in `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` are `Still Valid` for the downstream replay contract but do not invoke native `MemoryManager`. Current recent standalone/team projection tests use synthetic raw rows and contain no native reasoning producer. Decision: `Add Durable Coverage` that writes through the corrected native `MemoryManager`, then proves both `getRunProjection` and `getTeamMemberRunProjection` return ordered `kind: reasoning` rows and their event-monitor pages return Thinking visuals.
- Browser gap: API-REV-003 proves the live socket/render path only. Decision: `Required` isolated current-source backend/frontend journey using a new post-fix reasoning-capable team run. Prove Thinking live, force a real page reload, reselect a different member and the original member, and verify the same non-empty Thinking disclosure is reconstructed from GraphQL history rather than preserved only in client memory.
- Environment rule: do not modify or restart the user-owned packaged server on 29695 or frontend on 3000. Use API/E2E-owned free loopback ports and isolated server data. Import authorized provider credentials value-safely from `/Users/normy/.autobyteus/server-data/.env` only into the isolated test node if the real journey requires them; never print values. Stop only owned processes and remove only owned runtime data.
- External-service rule: the two prior LM Studio timeouts are `Non-Green Environmental Attempts`; they are not proof and will not be cited as passes.
- Round 5 durable removal decision: `None`.

### Round 3 re-entry — user-reported missing real Daily Assistant thinking segment

- Trigger: the user reports that the actual conversation frontend no longer shows any thinking segment and supplied a current desktop screenshot. They explicitly requested an isolated current frontend connected to the already-running server and a real Daily Assistant turn exercised through the browser tool.
- Coverage validity correction: Round 2 BROWSER-RENDER-001 remains valid for the production `ThinkSegment` component's active/final presentation mechanics, but it used a deterministic fixture that directly supplied a reasoning segment. It did **not** prove that a real Daily Assistant/provider turn on the current server emits, transports, stores, and renders a reasoning segment. The prior final report's broad AC-007 confidence is therefore reopened for this real journey.
- Current server authority: the running packaged server is the user-owned AutoByteus process on `127.0.0.1:29695`, using `/Users/normy/.autobyteus/server-data`; `/rest/health` and GraphQL both return 200. Port 8000 is an unrelated Python `http.server` and must not be used or stopped. Port 3000 is an unrelated existing built frontend and must not be stopped.
- New executable scenario `BROWSER-DAILY-THINK-001`: start only an API/E2E-owned Nuxt frontend on a free loopback port, bind every REST/GraphQL/agent/team WS endpoint to server 29695, open it through `open_tab`, create/select a Daily Assistant run through the actual UI, send a concise prompt that asks the model to reason before answering, and inspect live plus completed DOM, production store state, console, and WebSocket-visible evidence for a non-empty reasoning/think segment.
- Expected: the server emits reasoning `SEGMENT_START`/`SEGMENT_CONTENT` (or an equivalent current projection), the frontend retains a `ThinkSegment`, and the conversation shows a Thinking disclosure during or after completion. If the server/provider produces no reasoning event, classify the first missing boundary from transport evidence rather than blaming the Vue component. If reasoning exists in state/transport but no disclosure mounts, classify as frontend implementation failure.
- Data/process safety: do not stop or reconfigure the packaged server or existing frontend; create the smallest user-authorized test run; stop only the newly owned Nuxt process. Do not print credential values or unrelated conversation contents in the durable report.

#### Round 3 scope expansion — user-reported team conversations and Nested Classroom control

- New trigger: after the standalone Daily Assistant control exposed a real non-empty Thinking disclosure, the user clarified that the missing disclosure is observed in an active Bible Study Group member conversation and explicitly requested the Nested Classroom Test Team as the reproducible team control.
- Coverage correction: `BROWSER-DAILY-THINK-001` proves the standalone agent/provider-to-DOM path only. It does not prove `TeamStreamingService`, team-member identity resolution, or the member conversation renderer used by agent-team workspaces.
- New executable scenario `BROWSER-TEAM-THINK-001`: use the same isolated Nuxt frontend and current packaged server, create a Nested Classroom Test Team run through the actual UI, post one small classroom task that elicits a member response, capture the team WebSocket segment sequence, and inspect the selected member conversation during and after completion for a non-empty Thinking disclosure. Prefer an existing team/default model configuration; if the UI requires an explicit model, record the exact selected model rather than silently substituting one.
- Expected boundary evidence: a reasoning segment for a concrete member run is visible on `/ws/agent-team/...`, is resolved to the correct member conversation by the production team streaming service, and mounts `.think-toggle-button` plus non-empty expandable content. If standalone passes but team transport has reasoning and the member DOM does not, classify as a frontend team projection/rendering failure. If team transport never carries reasoning, classify the first missing server/provider/team-egress boundary and do not blame `ThinkSegment`.
- Scope safety: create only the minimal requested Nested Classroom run and prompt; do not inspect or mutate the user's Bible Study Group history. Existing user-owned server, desktop frontend, and ports remain untouched.

#### Round 3 control correction — Classroom Simulation Team

- User correction: the intended safe control is `Classroom Simulation Team`, not `Nested Classroom Test Team`.
- New executable scenario `BROWSER-CLASSROOM-THINK-001`: repeat the actual team-run UI journey with Classroom Simulation Team, use the same reasoning-capable model selected through the UI, send one direct and non-destructive classroom question to the selected `professor` member, and correlate team WebSocket member identity/reasoning events with the live and completed Thinking disclosure.
- Decision rule: the Nested Classroom result is retained as supplemental evidence because it was a completed user-requested control at the time, but it does not substitute for this corrected Classroom Simulation Team scenario. The authoritative Round 3 conclusion must include `BROWSER-CLASSROOM-THINK-001`.

#### Round 4 re-entry — inspect the user's active Bible Study Group run

- Trigger: the user now explicitly authorizes inspection of the currently running Bible Study Group and reports that `study_leader` appears to place thought-like narration into ordinary content rather than a Thinking disclosure.
- Coverage correction: the Round 3 reasoning-capable controls prove the shared frontend can render correctly typed reasoning; they do not explain the active Bible run's exact provider/model, server event classification, persisted projection, or DOM segment types.
- New scenario `BROWSER-BIBLE-LIVE-001`: perform a read-only investigation of the current Bible Study Group run. Resolve the active team run and `study_leader` model/runtime from safe GraphQL or repository metadata; connect an API/E2E-owned current frontend to the packaged server; select the existing run without posting or interrupting; inspect its production DOM/store projection and, while it remains active, capture only Bible-team WebSocket segment type/id/member-route metadata and bounded non-sensitive previews sufficient to distinguish `reasoning` from `text`.
- Decision rule: if the server sends `segment_type: reasoning` but the store/DOM shows ordinary text, classify a frontend team projection/rendering failure. If the server sends the thought-like material under a `text` segment, classify the first upstream provider/normalization boundary; the frontend must not heuristically relabel ordinary model content. If the model emits no reasoning segment at all, record model/output dependence rather than a renderer failure.
- Safety: do not send a message, interrupt, approve, archive, delete, edit configuration, or inspect unrelated team histories. Preserve only safe metadata, counts, hashes/lengths, and the minimum bounded preview needed to identify the reported boundary.

## Current Requirement And Design Basis

IR-003 preserves routine `AGENT_STATUS running` messages as immediate, separate, client-visible events while allowing the actual pending same-identity content tail to remain mergeable. Different identities remain ordered A/B/A groups; dependent, terminal, error, and unclassified messages flush earlier content. The server is the sole timed cadence owner; the browser projects shaped messages immediately and uses cheap escaped live text/reasoning until one final rich render. The persisted bound-node interval defaults to 500 ms, accepts only integer 100–2,000 ms, applies to a new window without moving an existing timer, and needs no data migration.

Critical direct proof remains AC-001 through AC-008: real socket semantics, exact equality, default output rate/reduction, 10-minute/120k browser performance, live/final DOM behavior, Settings API/persistence/bound-node behavior, and compatibility across affected standalone/team/runtime paths.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 / sustained runtime-to-visible performance | Changed | FR-001/FR-006; AC-001/AC-006 | Measure a current candidate for at least 10 minutes and 120k characters, not historical evidence. |
| BEH-002 / cadence ownership | Removed + Added | FR-002; DS-003; IR-003 | Server real-socket cadence must pass; no frontend timer may add delay. |
| BEH-003 / WebSocket egress shaping | Added | FR-003/FR-004; AC-003/AC-004; CRR-004 | Recheck WS-EGRESS-001 first, then prove exact ordering, status visibility, and reduction. |
| BEH-004 / runtime/team compatibility | Preserved | FR-005; AC-005 | Run standalone/team and affected runtime/browser regressions; supplement with real provider control when safely available. |
| BEH-005 / active versus completed presentation | Changed | FR-007; AC-007 | Real Chrome must show escaped live text/reasoning and one safe rich completion transition. |
| BEH-006 / bound-node interval setting | Added | FR-008; AC-008 | Durable GraphQL and component coverage plus two real isolated nodes/browser binding. |
| Existing data/canonical internal events | Preserved | AC-003/AC-006; implementation handoff | Prove all source events remain internal/fine-grained and absent existing config directly uses 500 with no migration. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence | Remaining Risk Before Broader Validation | Selected Mode |
| --- | --- | --- | --- | --- | --- |
| Domain/backend | Yes | Lifecycle output through per-session egress and typed setting | Server unit/integration suites | Fake time or short duration cannot prove host performance | Real WS + sustained harness |
| API/transport | Yes | GraphQL Settings and agent/team WebSockets | Durable API/WS E2E | Bound-node browser rebinding and long open socket | Two nodes + Chrome |
| Frontend/state | Yes | Immediate projection, live/final renderer, Settings card/store | 13 web suites | Real DOM, parser transition, interaction latency | Chrome |
| Browser/user journey | Yes | Conversation rendering and Settings | Component coverage only | Long output and integration/bundling | Chrome + Nuxt |
| Auth/session | No material change | Local supported session behavior | Existing coverage | None introduced | N/A |
| Web-equivalent desktop renderer | Yes | Same Nuxt renderer used by Electron | Web tests/build | Host CPU/drift not covered by unit tests | Browser-preferred |
| Electron shell | No | No preload/IPC/window/package source changed | Diff review | Negligible unchanged-shell uncertainty | Do not launch desktop |
| Process/lifecycle | Yes | Timer/dispose/open socket/status/completion | Egress and WS suites | Real timer/process cleanup | Real WS/processes |
| Persisted data | Additive, directly usable | Existing `.env` reader/writer | GraphQL E2E | Two-node isolation | Two real isolated nodes |
| Worker/queue/distributed | No | No changed contract | N/A | None | N/A |
| External provider | Shared runtime path, not required for determinism | Provider feeds canonical AgentRun | Existing live-E2E harness | Deterministic source is not an actual provider | Supplemental DeepSeek/OpenAI agent-flow |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-streaming-performance-followup`; branch `codex/runtime-streaming-performance-followup`; implementation `d691736dc66a3d4323d44367d837d57405bf20b8`.
- Stack: pnpm monorepo, TypeScript/Fastify/Mercurius/WebSocket, Nuxt/Vue/Pinia, Vitest, Playwright Core/Chrome, Electron wrapper.
- User-owned ports 3000, 8000, and 29695 were not stopped or reused; all broader validation used free loopback ports and owned data roots.
- User explicitly authorized `/Users/normy/.autobyteus/server-data/.env` for supplementary real-provider tests. Secret values were never printed or copied to ticket artifacts. The importer and live-E2E runner's value-safe evidence scanner were used.

| Instruction / Configuration | Authority / Learned Constraint |
| --- | --- |
| Root `README.md`; server `README.md` | `pnpm test:e2e`; `pnpm test:e2e:real:preflight`; `pnpm test:e2e:real`; plaintext `.env` is not a runtime provider; use the sole importer with explicit absolute DB URL. |
| `autobyteus-server-ts/AGENTS.md` | Focused Vitest `run ... --no-watch`; server test ownership. |
| `autobyteus-web/AGENTS.md`, web README | Colocated Nuxt tests; browser probes are supported; browser is preferred for web-equivalent Electron behavior. |
| `test-support/live-e2e/run-live-e2e.mjs` | Built isolated server, sanitized environment, selected scenarios, captured output, secret leak scan, owned process stop. |
| `test-support/live-e2e/test-runtime-bootstrap.mjs` | Test DB constrained under `autobyteus-server-ts/db`; runtime roots under tests `.tmp`; free loopback ports. |
| Package scripts/configs | Server/web build, guard, unit, E2E, and real-provider commands are authoritative. |

| Component | Setup / Runtime | Readiness | Cleanup |
| --- | --- | --- | --- |
| Durable server API/WS | Vitest on real Fastify sockets and isolated settings roots | Assertions/socket open | Test `finally`/Vitest exit |
| Browser production path | Scripted production AgentRun/default pipeline/handler/egress -> real WS -> production WebSocketClient/service/renderers in Nuxt | Harness 202, WS connected, DOM signals | Close Chrome; stop owned Nuxt/harness/nodes; remove fixture and roots |
| Settings nodes A/B | Two built servers on free ports with distinct temp roots | GraphQL query/effective 500 | Reset setting, stop, remove roots |
| Live providers | Value-safe import into initially absent `autobyteus-server-ts/db/test.db`; real-E2E runner | Preflight `READY` | Remove imported DB/key and live runtime root; leave source unchanged |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`.
- Existing isolated `.env` without the interval key reports/uses 500 without rewrite; valid saves persist canonical values; invalid direct input falls back to 500; reset returns 500.
- GraphQL E2E and two browser-bound node roots directly prove the current reader/writer. No migration, compatibility wrapper, version branch, or dual read/write is present.
- Upstream ambiguity: `None`.

## Existing Durable Coverage Inventory And Decisions

| Path / Scenario | Decision | Action / Result |
| --- | --- | --- |
| `tests/unit/config/streaming-content-flush-interval-setting.test.ts` | Still Valid | Retained; affected unit run passed. |
| `tests/unit/services/agent-streaming/agent-stream-websocket-egress.test.ts` | Still Valid | Retained; cadence/boundary unit run passed. |
| `tests/e2e/server-settings/server-settings-graphql.e2e.test.ts` | Needs Update -> Updated | API-SET-001 added; combined server run passed. |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` | Needs Update -> Updated | WS-EGRESS-001/002 and current 9-message runtime matrix passed. |
| `tests/integration/agent/agent-team-websocket.integration.test.ts` | Needs Update -> Updated | WS-EGRESS-003 A/B/A passed. |
| 13 affected web service/store/component suites | Still Valid | 140 tests passed. |
| `tests/e2e/secret-management/real-e2e-provider-capabilities.e2e.test.ts` | Still Valid | Preflight and DeepSeek/OpenAI real agent-flow passed after harness repair. |
| `test-support/live-e2e/live-e2e-harness.ts` | Needs Update -> Updated | Compare normalized DB paths; wrap raw backend in production `AgentRun` facade. |
| Historical v1.4.37 evidence | Out Of Scope as current proof | Comparator only; not counted toward pass. |
| `autobyteus-ts/tests/unit/memory/memory-manager-reasoning-persistence.test.ts` and working-context snapshot persistence | Still Valid | IR-004 producer/order/provenance coverage rerun unchanged: 3 files / 27 tests passed. |
| `autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | Needs Update -> Updated | Native `MemoryManager` now feeds standalone/team GraphQL projection and event-monitor Thinking assertions; full file passed 7/7. |
| `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Needs Update -> Updated | Retained fixture was stale after tracked-base lifecycle API change; updated to canonical batched source subscription, lifecycle snapshot, and awaited `publishEvent`; 16/16 passed. |
| Five frontend hydration/render suites | Still Valid | Run projection, historical team lazy hydration, AI message, ThinkSegment, and feed: 34/34 passed. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Replacement |
| --- | --- | --- |
| Agent status runtime matrix | Expected two separate `one`/`two` client content frames and 10 messages | Current intended same-identity aggregate `onetwo`, 9 messages, four visible undeduplicated statuses. No scenario removed. |

## Durable Coverage Added Or Updated

| Scenario ID | Path | Change / Requirement | Result |
| --- | --- | --- | --- |
| API-SET-001 | `server-settings-graphql.e2e.test.ts` | Default, valid values, rejection, fallback, reset, persistence / AC-008 | Pass |
| WS-EGRESS-001/002; WS-STATUS-001 | `agent-status-websocket.integration.test.ts` | Real default aggregation, next-window setting, status/terminal order / AC-002–AC-005/008 | Pass |
| WS-EGRESS-003 | `agent-team-websocket.integration.test.ts` | Team A/B/A exact identity/order / AC-004/005 | Pass |
| LIVE-E2E-HARNESS-001 | `live-e2e-harness.test.ts`; `test-support/live-e2e/live-e2e-harness.ts` | Normalized one-DB identity and production AgentRun adapter | Pass |
| NATIVE-REASONING-GQL-001 | `autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | Corrected native producer -> standalone/team GraphQL conversations and event-monitor Thinking visuals / FR-005, AC-005/007 | Pass |
| CROSS-RUNTIME-FIXTURE-001 | `autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Bring retained executable fixture onto current lifecycle/batch/publish API without changing assertions | Pass |

Durable coverage removed: `None`.

## Repository Coverage Execution Plan And Results

| Order | Command / Scope | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm exec vitest run tests/unit/memory/memory-manager-reasoning-persistence.test.ts tests/unit/memory/memory-manager-working-context-snapshot-persistence.test.ts tests/unit/memory/memory-manager.test.ts --no-watch` | Pass, 3 files / 27 tests | `api-rev-005-native-memory-focused.log` |
| 2 | Focused new native reasoning GraphQL test | Initial API/E2E fixture path error; corrected `FileMemoryStore` root and rerun Pass, 1 passed / 6 skipped | `api-rev-005-native-reasoning-graphql-focused.log`; `...-rerun.log` |
| 3 | Full recent-run projection GraphQL file | Pass, 1 file / 7 tests | `api-rev-005-recent-projection-full.log` |
| 4 | Cross-runtime persistence regression | Retained test fixture first lacked current lifecycle snapshot, then still used removed `emitLocalEvent`; API/E2E corrected the fixture and final rerun passed 16/16 | `api-rev-005-server-reasoning-regression.log`; `api-rev-005-cross-runtime-memory-rerun.log`; `...-rerun-2.log` |
| 5 | Combined recent projection + tool-call projection + cross-runtime persistence | Pass, 3 files / 30 tests | `api-rev-005-server-hydration-combined.log` |
| 6 | Frontend run hydration, historical team lazy hydration, AIMessage, ThinkSegment, and AgentConversationFeed | Pass, 5 files / 34 tests | `api-rev-005-frontend-thinking-hydration.log` |
| 7 | `autobyteus-ts` build/runtime-dependency verification | Pass | `api-rev-005-autobyteus-ts-build.log` |
| 8 | Server build-tsconfig typecheck and full sanitized build/bootstrap smoke | Pass | `api-rev-005-server-build-typecheck.log`; `api-rev-005-server-build.log` |
| 9 | `git diff --check` | Pass | `api-rev-005-diff-check-and-status.log` |

The failed attempts above were API/E2E-owned fixture/setup corrections, not product failures. Their exact corrected commands are represented by the final green reruns.

## Post-Repository Confidence Scorecard

| Confidence Category | Score | Evidence | Remaining Uncertainty / Additional Validation |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 96% | Native exact-once/order/provenance units and standalone/team GraphQL/event-monitor assertions pass; retained performance/transport/Settings evidence remains green. | Real UI reload/reselection still required. |
| Changed-boundary execution directness | 99% | Durable tests invoke corrected native `MemoryManager`, real file store, server projection, and event-monitor transformer. | Browser rendering is the remaining boundary. |
| Cross-boundary integration realism and mock gap | 97% | Real file-backed native producer feeds actual GraphQL resolvers for standalone and team members. | Repository tests do not invoke a real provider/browser. |
| Environment/configuration/identity/fixture fidelity | 95% | Isolated real file/database roots and current source builds; fixture corrections rerun green. | Real provider and team member identity should be confirmed. |
| Failure/edge/lifecycle/recovery evidence | 95% | Reasoning-only, content, tool ordering, snapshots, cross-runtime replay, and event-monitor coverage pass. | Full browser reload recovery remains. |
| User-surface/browser/desktop-shell confidence | 90% | Existing frontend hydration/render suites pass. | Browser reload/history/member-reselection is material and required; shell is unchanged. |
| Durable regression coverage quality and relevance | 98% | New native standalone/team GraphQL regression plus IR-004 producer coverage directly guards the discovered failure. | Proportional test-code review remains. |

- Overall post-repository confidence: `95.7%` (`670 / 7`).
- Every critical acceptance criterion directly proven at repository scope: `No — real browser reload/member-reselection remained pending at this gate.`
- Applicable category below 90%: `No`.
- Default clean-confidence target met: `Yes`, but browser validation remained required by the material user-surface gap.
- Material residual risk: live native provider reasoning could still fail to persist or hydrate in the actual team UI despite repository coverage.

## Broader Validation Decision

- Decision: `Required`.
- Selected execution mode: `Browser + real provider + current-source isolated backend/frontend`.
- Gap addressed: corrected future-write native reasoning must survive actual completion, hard reload, historical team-run reopen, member switch, and original-member reselection.
- Expected final confidence: `>=98%` if the raw-trace, GraphQL, and DOM observations agree.
- Browser rationale: the original defect was user-visible only after hydration; component tests alone cannot close that gap.
- Desktop decision: browser is the supported web-equivalent renderer path. No Electron preload/IPC/window/package behavior changed, so launching the user desktop application is unnecessary and potentially disruptive.

## Live Environment And Fixture Plan / Outcome

- Current-source backend: built commit `d691736dc66a3d4323d44367d837d57405bf20b8`, isolated on `127.0.0.1:29741` with an API/E2E-owned temporary data root.
- Current-source frontend: Nuxt development frontend on `127.0.0.1:62741`, with every REST/GraphQL/agent/team WebSocket endpoint bound to the isolated backend.
- Credentials: user-authorized `/Users/normy/.autobyteus/server-data/.env` imported through the project secret importer into only the isolated database; values never entered evidence.
- Fixture: API/E2E-created two-member `API REV 005 Classroom Team`; `professor` and `student` use native AutoByteus runtime; real DeepSeek `deepseek-v4-flash` selected through the actual Run Team UI.
- Journey: send one request to `professor`; observe live Thinking/final response; switch `professor -> student -> professor`; hard reload `/workspace`; reopen `Temp Workspace -> team definition -> historical run`; expand Thinking; repeat `student -> professor` reselection.
- Outcome: Pass. New raw traces are ordered `user(1), reasoning(2), assistant(3)`; reasoning and assistant share turn/timestamp/source identity; the snapshot provenance lists both response trace IDs; team GraphQL reasoning and assistant content exactly equal raw traces; browser shows one Thinking disclosure with 601 rendered reasoning characters and the separate final answer before and after reload/reselection.
- Evidence: `api-rev-005-native-reasoning-browser-reload-summary.json`, `api-rev-005-live-team-projection.json`, current-source backend/frontend logs, and screenshots.
- Safety: user server 29695 and frontend 3000 were observed but never stopped or used as test data. All owned processes, browser tab, ports 29741/62741, and isolated data were cleaned.

## Temporary Executable Validation

| Scenario ID | Method | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| BROWSER-NATIVE-REASONING-RELOAD-001 | Actual current UI + real DeepSeek + isolated team run + hard reload/history reopen/member reselection | Corrected future-write native reasoning persists and hydrates as Thinking across the exact user-visible recovery path | Provider credentials and interactive browser state make this a ticket-specific live proof; durable native/API/frontend boundaries are already repository-covered. |

## Not Tested / Residual Scope

| Behavior | Decision / Risk |
| --- | --- |
| Existing pre-IR-004 Bible/Classroom turns | Not rewritten or backfilled by the approved no-migration decision. Their missing raw reasoning cannot be reconstructed. This is intentional and does not affect corrected future writes. |
| Electron-only shell behavior | Not executed; no shell boundary changed. Browser proves the web-equivalent renderer path. |
| Providers/models that emit no reasoning | A Thinking disclosure remains conditional on non-empty reasoning output; not a defect. |
| Two prior LM Studio timeout attempts | Non-green environmental attempts; excluded from successful proof. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Resolution |
| --- | --- | --- |
| Focused GraphQL fixture initially wrote under an extra `agents/` segment | Local Fix / API-E2E | Corrected store root; focused and full reruns pass. |
| Retained cross-runtime fixture used superseded lifecycle/event APIs | Local Fix / API-E2E | Updated only test infrastructure to current canonical API; 16/16 and combined 30/30 pass. |
| Product failure after IR-004 | None | Not reproduced; exact native persistence, API hydration, and browser recovery pass. |

## Investigation Decision

- Proceed To API/E2E Execution: `Completed`.
- Repository-resident durable coverage added/updated/removed: `Yes — two server test files updated; none removed.`
- Post-repository confidence: `95.7%`.
- Broader validation: `Required and completed — Pass`.
- Final confidence: `98.6%`.
- Reroute required before validation: `No`.
- Required next recipient: `code_reviewer` for proportional review of the two Round 5 durable test-file changes, then `delivery_engineer` if review passes.
- Latest authoritative result: `API-REV-005 Pass`.

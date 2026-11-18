# API/E2E Coverage Investigation

## Investigation Meta

- Ticket: `follow-ups-of-461-500` (Project Task `autobyteus-500`), delivery 1 + 2.
- Round: API/E2E round 1, on CRR-002 (Pass after CRR-001's Local Fix IR-002).
- Code under test: branch `codex/follow-ups-of-461-500`, head `cc8dbce099` (merge base with `origin/personal`: `9695d310c5`; 499 files changed).
- Worktree: `~/autobyteus_org/autobyteus-worktrees/follow-ups-of-461-500`.
- Classification carried: `Large` / `High`, reviewed route (implementation-handoff "Routing Classification").
- Testing guideline: `TESTING.md` (repository root). Also `AGENTS.md` (root and package), the server's `package.json` scripts, `scripts/integration-test-prerequisites.mjs`, and `docs/isolated-app-instances.md#linux` for containers.
- Out of this package: FU-035 (Grok, REQ-010, AC-007) comes as IR-003 with its own review (D-14); FU-500-08 is a follow-up.

## Current Requirement And Design Basis

- `requirements-doc.md` (SR-014, Approved): REQ-001 … REQ-016 (REQ-003 and REQ-015 dropped), AC-001 … AC-012.
- `design-spec.md` (delivery 1, delivery 2 G-1 … G-4, G-5, FU-021 at SR-014 / D-13b).
- `implementation-handoff.md` (IR-001 + IR-002): "Downstream Coverage Hints", "Known Risks", "FU-030 texts".
- `code-review-report.md` (CRR-002 Pass): residual risks and note C-6 (time both passes of the first start).

## Supported Scenarios And Real Usage

- SC-1 (code review): the first start of the release over data written before it: the attachment migration and its follow-up convert stored host-scoped links; old attachments open by the run's own link.
- SC-2: a client sends a command on a run stream before `CONNECTED`: refused with `SESSION_NOT_READY`, never dropped.
- SC-4: the user opens a stopped run whose stored model its runtime dropped: Settings marks the member; sending is refused with one clear message; an unreadable list starts as before.
- Added from my investigation:
  - SC-5: delegation refusals and notes (FU-030) are what the agent and the user read in the conversation and in Settings (the probes and e2e that read them).
  - SC-6: the whole server keeps its behavior through the renames and the composition rewiring (both hosts start; every stream, tool and migration path still works): the full server E2E folder.
  - SC-7: a team history index v2 that runs late keeps the user-started team's row (G-2) on a real server start.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Names (N2, N3, N5; GraphQL `runId`, `execution_tree.agent`) | Changed (names only) | AC-001, REQ-001/002 | Full server E2E and the touched probes must pass on the new names |
| FU-036 one attach function, `SESSION_NOT_READY` on four streams | Changed | AC-006, REQ-009 | Integration test (exists); a real-server check of the org and collaboration streams |
| FU-011 / FU-018 composition (both hosts) | Changed | AC-002 | Units (implementation); both hosts start in the full E2E (studio, application host suites) |
| FU-013 team token total by kind | Changed | AC-003 | Token e2e in the full run |
| FU-020 host-scoped owner and route removed; migration + follow-up | Removed / Added | AC-008, REQ-011, M-1 … M-10 | Migration tests (exist); a built-server startup E2E on real-flow data turned to the released shape; timing (C-6) |
| FU-030 refusal texts | Changed | AC-004 | The e2e and probe text assertions the change touched |
| FU-021 watcher test labels | Changed (test) | AC-005, D-13b | 5 of 5 on Linux inotify (gate); quiet macOS when available |
| FU-016 / FU-022 / FU-023 gates | Changed | AC-005 | Run the runtime-names test, the probe guard and the web type gate |
| G-1 recorded migration order | Added | AC-009 | Order test and recorder (exist); reuse IMP-07/IMP-09 if unchanged |
| G-2 late team index v2 repair | Changed (migration) | AC-010 | Migration test (exists); built-server LTI-1 asserts the user-started row is kept |
| G-3 SIR-002 probe data | Changed (probe) | AC-011 | Run SIR-001/002 |
| G-5 stored model not offered | Added | AC-012, REQ-016, D-12 | Browser journey: member note, refusal, no runtime; standalone restore; unreadable list |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | composition, G-5 offer check, token kind | Units (IMP-03, IMP-06, IMP-14) | Real composition of both hosts | Full server E2E |
| API / transport / contract | Yes | stream attach, GraphQL names, REST attachment routes | Integration (IMP-10) | Real handlers' timing; real routes after the migration | Built-server E2E |
| Frontend component / state | Yes | member note (G-5), names, texts | Web units (IMP-04) | Rendered member note | Browser probe |
| Browser integration / user journey | Yes | G-5 journey; refusal texts | None run (Known Risks) | All | Real-stack probes (Chrome + Nuxt + built server) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same as browser) | as above | — | — | Browser probe |
| Desktop shell / Electron-specific integration | No | no shell change | — | — | — |
| Process / lifecycle | Yes | early close ends a late session; G-5 no runtime start | Integration | Real runtime launch not started | Built-server + scripted AGY launch log |
| Persisted-data transition | Yes | FU-020 migration, G-2 repair | Migration tests (F-1 … F-9, AC-010 fixture) | Startup entrypoint on real-flow data; cost of two passes | Built-server startup E2E; timing |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes (OS file events) | watcher test | Loaded macOS only (IMP-012/013) | Where the OS delivers events | Linux container (inotify) |

## Project Execution Discovery

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Test layers, gates, isolation, evidence | Gated suites name their gate; a skip is not a pass; clean env; never the user's app or data; vault for keys |
| `autobyteus-server-ts/package.json` | Server scripts | `build`, `typecheck`, `test:integration:prepare` |
| `scripts/integration-test-prerequisites.mjs` | Integration prerequisites | Builds the server, SDKs, devkit, Brief Studio package |
| `docs/isolated-app-instances.md#linux` | Containers | Root container is fine for non-Electron tests |
| E2E file headers | Each suite's gate and command | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<server>/tests/fixtures/agy-failure-cli.mjs`; built-server suites need `pnpm -C autobyteus-server-ts build` |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Real-stack probe | `--cases`, `--output-dir`; built server, Nuxt dev, Chrome; scripted AGY whose `agy models` reads a probe-owned file |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Linux container (watcher gate) | `/tmp/api500/watch` | `docker run --rm node:22-bookworm` on a `git archive` of HEAD; `pnpm install --frozen-lockfile`; `test:integration:prepare` | arm64 linuxkit kernel, inotify; temp dirs inside the container | install/prepare exit 0 | `--rm` |
| Built server | worktree `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build` (dist is older than the last source change) | heavy; one heavy job at a time | `dist/app.js` | — |
| Probe stacks | probe-owned temp roots | the probes start and stop them | Chrome, Nuxt dev | the probes' health waits | the probes' `finally` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Released-shape attachment links | Runs and uploads through the real server, then the links turned into the released host-scoped shape while the server is down | Never the founder's data; synthesized | Test-owned temp root |
| Timing data (C-6) | Synthesized trace folders at scale | No user data; cold cache not reachable without `purge` (no sudo) | Removed |
| A retired model | the probe's `agy models` file | — | probe root |
| Live keys | test vault only (`AUTOBYTEUS_TEST_VAULT`) | for any live DeepSeek run | — |

## Persisted Data Transition Coverage Basis (When Applicable)

- Decision: `Migration Required` (FU-020, D-8), plus G-2's same-ID repair.
- Repository coverage (implementation): fixtures F-1 … F-9, retry, second start, follow-up, predecessor classification (IMP-10 "attachment-links 8/8"); G-2 fixture (IMP-10 "team-index 4/4").
- API/E2E adds the startup entrypoint through the built server, attachments opened by their converted links through the real REST routes, backups beside them, a second start, and the cost of both passes.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/integration/file-explorer/file-system-watcher.integration.test.ts` | Watcher outcomes; ENVIRONMENT / INCONCLUSIVE at the guard | AC-005, D-13b | Still Valid | IMP-012/013 | Run 5 of 5 on Linux |
| `tests/integration/agent/run-stream-not-ready.integration.test.ts` | `SESSION_NOT_READY` on the four streams; early close | AC-006 | Still Valid | IMP-10 9/9 | Rerun |
| `tests/app-data-migrations/delegated-run-own-attachment-links/*` | Migration F-1 … F-9, retry, follow-up | AC-008 | Still Valid | IMP-10 | Rerun |
| `tests/app-data-migrations/team-run-history-index-v2/*` | G-2 rule | AC-010 | Still Valid | IMP-10 | Rerun |
| `tests/e2e/app-data-migrations/late-team-history-index-v2-startup.e2e.test.ts` (LTI-1) | Logs the user-started team's row after a late v2 (base FU-029) | AC-010 | Needs Update | G-2 keeps the row | Assert the row is kept |
| `delegated-launch-config-defaults.e2e`, `collaboration-prompt-wording.e2e`, `agent-initiated-collaborators.e2e` | Texts changed by FU-030 | AC-004 | Still Valid (updated by implementation, not run) | Known Risks | Run |
| `contract-states.json` (collaboration-contract-stories) | Contract texts | AC-004 | Still Valid (updated, not run) | Known Risks | Run the stories |
| `delegated-launch-defaults-probe.mjs` DLP-003/004/005, DCP-004; `composer-context-file-removal-probe.mjs`; `skill-improvement-removal-cases.mjs` SIR-001/002 | Texts (FU-030), G-3 | AC-004, AC-011 | Still Valid (updated, not run) | Known Risks | Run |
| Full server E2E folder | Everything | SC-6 | Still Valid; any stale case is found by the run | 461 r21 886/886 on the base | Run once |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| WATCH-LINUX | AC-005 | OS file events (inotify) | Existing Test | Container: `git archive HEAD`, frozen install, `test:integration:prepare`, the watcher file ×5 | The D-13b gate |
| WATCH-MAC | AC-005 | FSEvents | Existing Test | Only if the Mac is quiet (load ≪ cores) | D-13b "when available" |
| GATES | AC-005 | gates | Existing Test | runtime-names test; the probe guard; web typecheck | AC-005's other three gates |
| NOTREADY-INT | AC-006 | streams | Existing Test | `run-stream-not-ready.integration.test.ts` | AC-006 as written |
| NOTREADY-REAL | AC-006, REQ-009 | real org and collaboration handlers | Durable | Built server; a send on open on each stream, repeated: each gets `SESSION_NOT_READY` or its command ack, never nothing | The integration test uses stand-in handlers |
| MIG-ATTACH | AC-008, M-3 … M-9 | startup migration, REST routes | Durable | Built server: real runs and uploads (agent child, team member child); links turned to the released shape; restart; backups, conversion, routes, unconvertible kept, second start | Startup entrypoint and real routes |
| MIG-COST | C-6, M-6 | first start cost | Temporary Probe | Synthesized trace folders at scale; time each pass of the first start | Not a regression test; a measurement |
| MIG-UNITS | AC-008, AC-010, AC-009 | migration code | Existing Test | the migration, team-index and order tests | Rerun on the head |
| LTI-1 | AC-010 | built-server late v2 | Durable (update) | assert the user-started team's row is kept | G-2's rule end to end |
| G5-001 | AC-012 | Settings, member activation | Durable (probe case) | Team run; a member's model retired; Settings member note; send → refusal text; no AGY launch | Browser render was not checked |
| G5-002 | AC-012 | standalone restore | Durable (probe case) | Agent run; model retired; root note; send → refusal; no launch | — |
| G5-003 | AC-012 | unreadable list | Durable (probe case) | `agy models` slower than 8 s: the run starts, at most 8 s later | D-12 "unreadable list starts as today" |
| TEXT-E2E | AC-004 | server texts | Existing Test | `delegated-launch-config-defaults`, `collaboration-prompt-wording`, contract stories (in the full run); `agent-initiated-collaborators` (live gate) | Touched, not run |
| TEXT-PROBES | AC-004, AC-011 | browser texts | Existing Test | DLP-003/004/005, DCP-004, SIR-001/002; composer-context-file-removal | Touched, not run |
| FULL-SERVER | SC-6, AC-001 … AC-003 | everything | Existing Test | The server E2E folder with the scripted gates, once | 499 files changed, composition rewired |

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| MIG-ATTACH | `autobyteus-server-ts/tests/e2e/app-data-migrations/delegated-run-own-attachment-links-startup.e2e.test.ts` | Proves the startup path and the routes, as earlier migrations do |
| NOTREADY-REAL | `autobyteus-server-ts/tests/e2e/agent/run-stream-early-command.e2e.test.ts` | No early command lost on the real handlers |
| G5-001 … 003 | `autobyteus-web/tests/e2e/stored-model-not-offered-cases.mjs`, registered in `delegated-launch-defaults-probe.mjs` | The browser journey of AC-012 |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| LTI-1 | `late-team-history-index-v2-startup.e2e.test.ts` | Assert the user-started team's row is kept (G-2) | The log line becomes an assertion |

## Durable Coverage To Remove

None planned.

## Desktop Application Validation Plan (When Applicable)

- No Electron-shell change. The renderer journeys run in the browser probes (web-equivalent). Desktop: `Not Required`.

## Live Environment And Fixture Plan (When Broader Validation Is Likely)

- Scripted runtimes for all journeys (TESTING.md). `agent-initiated-collaborators` is live-gated: run with DeepSeek from the test vault only if the full run and probes leave a text doubt (its text change is the refusal wording only).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| FU-020 on the founder's own data | Needs his approval (D-8, the founder's rule) | Data shapes not in the fixtures | Yes | Delivery takes it to the founder |
| M-6 strictly cold | No sudo for `purge` | Cold cost higher than measured | No | Recorded as a limit |
| FU-035 / AC-007 | IR-003 (D-14) | — | — | Next round |

## Ambiguities Or Reroute Triggers

- `design-spec.md` "To prove it" still names only ENVIRONMENT for loaded runs; D-13b (ENVIRONMENT or INCONCLUSIVE) and AC-005 govern (the handoff notes the designer is aligning it).

## Round 1 Updates (decisions made from the full run)

| Path / Test | Decision | Evidence | Action |
| --- | --- | --- | --- |
| projects-graphql, embedding-settings, project-task-boundaries, project-task-search, project-task-search-model-unavailable; `project-task-tool-writer.mjs` | Needs Update (FU-011: the process Task service getter throws before a composition) | full run, "The process ProjectTaskService is created by the composition" | release only a composed service; the tool-only process composes its Task side |
| append-only-message-logs-startup (hub context-file route) | Needs Update (FU-020 removed the route) | 404 instead of 200 | the own route opens; the removed route 404 |
| delegated-copy-model-change DCM-007, delegated-team-lazy-member-activation, removed-remote-provider-saved-selection | Needs Update (G-5: the refusal comes before the runtime) | expected AGY_MODEL_UNAVAILABLE / MODEL_IDENTIFIER_NOT_AVAILABLE | assert G-5's text; outcomes kept |
| remote-delegation-two-server RC-04, RC-17; probe DLP-003/004 regexes, DCP-004 match | Needs Update (FU-030 texts) | old wordings | the new wordings |
| remove-built-in-project-task-manager E-002 | Still Valid (preserved behavior) | F-1 | not changed |
| delegated-launch-config-defaults (inherited layer); probe DLP-005 | Still Valid (FU-030 table) | F-2 | not changed |
| get-project-task-worker-scope SCP-E2E-006 | Still Valid (base passes) | F-3 | not changed |
| available-agent-runtimes, configured-skill-on-demand-loading, project-task-boundaries (search_memory), terminal-websocket-lifecycle; SIR-001 | Out Of Scope (fail on the base) | base 9695d310c5 | FU-500-09, FU-500-10 |
| G5-003 (planned "starts as today, at most 8 s later") | Planned case revised | AGY needs its list to launch (its own discovery error), so "as today" is AGY's own outcome | assert no G-5 refusal; record the times |

## Round 7 Updates (the eighth merged state: 491, 492; CRR-017)

What the merge brings to this ticket's surfaces, and how it is proven:

| Path / Test | Decision | Evidence | Action |
| --- | --- | --- | --- |
| The three new startup migrations on one first start (this ticket's two `20261117`, then 491's `20261118`) | Add Durable Coverage: MO-1 in ALM-1's file (the same released-shape data, plus 491's retired copies and a real run of the Memory Compactor) | the registry order; 491's RRB-1 covers its removal alone | assert each status and summary, the start/complete order, the copies gone, the run kept and listed, its continuation refused by the runtime's own missing-definition answer, a second start unchanged |
| `list_running_agents` with the host's `PeerDiscoveryAccess` (FU-011) on the native tool and Agent Tools MCP | Add Durable Coverage: new `list-running-agents-native-and-mcp.e2e.test.ts` (LRN-1 two paired Studios; LRN-2 the application host) | 492's RC-47/48/27/28 cover the MCP route only; the native route had units only | local, `node`, switch off on both routes; the application host by the same-senders rule (492 DS-001) |
| `remote-delegation-two-server` `calls()` helper | Needs Update (test-side): the run view holds the last 100 events, so a long-lived actor's count of replies stops growing (RC-19 timed out twice with its answer in view) | API-r7-runs.txt §3 | wait for the newest reply entry not in view before the call |
| RC-47/48/49, RC-06/08/22, CPW-R2, contract U9 (492's unrelated-run delivery), RRB-1…3, ALM-1, ODM-1, RSE-1, E-002, G5-001…003, DLP-005, DCP-004, SIR-002 | Still Valid | merged tests as they are | run on the merged build |
| Probe SIR-001 | Still Valid; FU-500-10's refusal is gone (492 DEC-001 delivers unrelated runs' messages) | probe 7/7 | run; FU-500-10 resolved by 492 |
| An application's agent in the application host and the discovery tools | Out Of Scope (the same at base `53b72018ad`) | LRN-2 on base | FU-500-15 (a); LRN-2 asserts the same-senders rule only |

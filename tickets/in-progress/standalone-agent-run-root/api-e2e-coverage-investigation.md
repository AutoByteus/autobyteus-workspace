# API/E2E Coverage Investigation — standalone-agent-run-root

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress/standalone-agent-run-root/requirements-doc.md` (Approved, SR-002)
- Investigation Notes: `…/standalone-agent-run-root/investigation-notes.md` (E-01–E-21)
- Solution Revision Record: `…/standalone-agent-run-root/solution-revision-record.md` (SR-001–SR-005)
- Design Spec (required on every route): `…/standalone-agent-run-root/design-spec.md` (SR-005)
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/cross-scope-agent-mentions-sr008/ui-ux-spec.md` (the package's `autobyteus-web-prototype` path is stale)
- Design Review Report: `…/standalone-agent-run-root/design-review-report.md` (ARCH-REV-003 Pass)
- Architecture Review Revision Record: `…/standalone-agent-run-root/architecture-review-revision-record.md`
- Implementation Handoff: `…/standalone-agent-run-root/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `…/standalone-agent-run-root/implementation-revision-record.md`
- Code Review Report: `…/standalone-agent-run-root/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `…/standalone-agent-run-root/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `…/standalone-agent-run-root/api-e2e-revision-record.md` (created after the first result)
- Current API/E2E Revision ID: `API-REV-004`
- API/E2E Test-Case Ledger: `…/standalone-agent-run-root/api-e2e-test-case-ledger.md`
- Current Investigation Round: 4
- Trigger: round 1, code review pass CRR-002. Round 2, CRR-004 Pass after the F-01 fix (IR-003, `782ec9f11`).
- Prior Investigation Reviewed: round 1 (API-REV-001)
- Latest Authoritative Investigation: this file, round 4

(`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/tickets/in-progress`)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (only if durable test code changes)

## Current Requirement And Design Basis

- REQ-001 / AC-001 (critical): one `StandaloneAgentRunRoot` owns every eligible standalone run. Predecessor standalone suites must pass **unchanged**, including the opt-in live-provider suites `standalone-agent-collaborator-mention.e2e` and `agent-initiated-collaborators.e2e`. The handoff states these have never run on this branch. The design requires them on Claude and at least one other runtime.
- REQ-002 / AC-002: Team-root collaborator agents live in `TeamRootCollaboratorAgentRegistry`. There is no dedicated unit test; coverage comes from the Team-root suites (live LE-T1 includes Stop → reopen).
- REQ-003 / AC-003: file sizes at or under 400 lines (static check).
- REQ-004 / AC-004: standalone self-delegation is rejected with `COLLABORATION_SELF_TARGET_REJECTED`.
- REQ-005 / AC-005: every delivery header contains `sender address`, on every runtime. A reply by address to a Team-member sender reaches it. Stored pre-change history still renders.
- REQ-006 / AC-006: the standalone Token Meter total equals the sum of the exact-run records (collaborators, collaborator-Team members, copies). The context card stays the host's. CG-05 (freshness while only children report) is held, not required.
- REQ-007 / AC-007: the Event Monitor "earlier events" page renders "From <Sender>:".
- REQ-008 / AC-008: the host label in a collaborator's Team tab is title case.
- REQ-009 / AC-009: the guard suite and the model-save suite are green.
- AC-010: the preserved boundary, which includes SC-04/CR-001: after a host crash, child commands on the collaboration stream do not restart the host.
- Persisted data: `Not Affected`.

## Supported Scenarios And Real Usage

- Designer/reviewer scenarios covered: SC-01 to SC-07 (code review report) and BEH-001 to BEH-010.
- Real-use scenarios added from the investigation:
  - **SC-04 live:** a real runtime process dies (for example, the Codex app-server is killed), then the user commands a collaborator from its composer.
  - **Team-member reply by address:** a collaborator Team member (`/<team>/<member>`) messages the host, and the host replies by the address it read.
  - **Pre-change stored history:** a stored delivery without `sender address` is reopened.
- Not tested (contrived): CG-03 (two host reports within one round trip) and CG-04 (resolveRoot after an infrastructure fail-stop).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 standalone command through the root | Changed (owner), behavior Preserved | REQ-001, AR-002 | Live AC-001 suites; unit coordinator/root tests |
| BEH-002 child → host through `host.ensureReady` | Changed (owner) | REQ-001 | Live suites (report to host); live crash probe |
| BEH-003 Stop/delete/archive/shutdown | Changed (owner) | REQ-001 | Live suites (Stop and wake); unit/integration |
| BEH-004 Team collaborator registry | Changed (owner) | REQ-002 | Live LE-T1 (Stop → reopen); Team-root integration |
| BEH-005 self-delegation | Added | REQ-004 | Unit (root) |
| BEH-006 header `sender address` | Changed | REQ-005 | Builder units; live suites deliver through it; live reply-by-address probe |
| BEH-007 token roll-up | Added | REQ-006 | Service/store tests; live GraphQL probe |
| BEH-008 earlier events | Changed | REQ-007 | Projection/presentation units; live page query/browser |
| BEH-009 host label | Changed | REQ-008 | Web unit; browser |
| CR-001 child commands use active root | Preserved (restored) | CRR-002 | Handler unit; live crash probe |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Root, handle, manager, delivery, registry, summary service | Unit and integration | Real-runtime timing and processes | Live API (runtime E2E) |
| API / transport / contract | Yes | WS agent and collaboration streams, GraphQL token query, page visual | Integration (some) | Live socket journeys | Live API |
| Frontend component / state | Yes | Token store, page presentation, host label, header parser | Web specs | Real server payloads | Browser on dev stack |
| Browser integration / user journey | Yes | Composer send to a collaborator, Event Monitor paging | None durable | Real clicks | Browser on dev stack |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same as web) | — | — | — | Browser on dev stack |
| Desktop shell / Electron-specific | No | No shell code changed | — | — | None |
| Process / lifecycle | Yes | Host activation, crash recovery, Stop/reopen, shutdown | Unit/integration with fakes | Real runtime process death | Live probe |
| Persisted-data transition | No (`Not Affected`) | Reads only | Migration test | Stored pre-change history rendering | Live/browser check |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes | Runtime CLIs (Claude SDK, Codex, AGY, Grok) receive the new header | Builder snapshots | Real model handling of the header | Live runtime E2E |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root`
- Clean-base worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root-cleanbase` (`b37d7a934`)
- Project type: pnpm monorepo. Server: Fastify/GraphQL/WS, Prisma SQLite, Vitest. Web: Nuxt 3, Vitest. Electron shell.
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/standalone-agent-run-root/TESTING.md`. Also `AGENTS.md`.
- Unclear or stale instruction: TESTING.md cites `tests/integration/agent-run-collaboration/native-root-fixture-cleanup.integration.test.ts`. On this branch the file moved to `tests/integration/standalone-agent-run-root/` (D-R7). Docs sync belongs to delivery.
- Secrets: the runtime CLIs are logged in on this machine (`claude` 2.1.283, `codex` 0.160.0, `agy` 1.2.16, `grok` 1.0.46, `lms` present). No secret values are recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Testing guideline | Server file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; runtime live E2E gated by `RUN_*_E2E`; dev stack `pnpm dev` (8000/3000); never touch the user's AutoByteus (`~/.autobyteus`, running on :29695) |
| `autobyteus-server-ts/vitest.config.ts` | Runner | `fileParallelism: false`, forks; Prisma test DB `tests/.tmp/autobyteus-server-test.db` per worktree, so parallel live runs in one worktree are unsafe |
| E2E suite headers | Gates | `RUN_CLAUDE_E2E`, `RUN_CODEX_E2E`, `RUN_AGY_E2E`, `RUN_GROK_E2E`, `RUN_LMSTUDIO_E2E`; `AIC_ROOT_RUNTIMES` (default claude) for LE-T1/LE-O1; LE-F1 runs on Claude by default |
| Predecessor `tickets/done/agent-initiated-collaborators` | Prior evidence | Claude 6/6 in 278 s on its merged state |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Studio E2E server (in-test) | `autobyteus-server-ts` | Started by the suite helper | Temp workspaces under `$TMPDIR`; test DB | Suite `beforeAll` | The suite's `afterAll` |
| Dev stack | worktree root | `pnpm dev` | Ports 8000/3000, data under the worktree's `.autobyteus/development/server-data/` | HTTP 200 | Ctrl-C / kill the owned PIDs |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent/Team definitions for suites | Created by the suites through GraphQL | Test DB only | Suite deletes |
| Dev-stack runs and collaborators | Created through the UI/GraphQL on the dev stack | Worktree dev data, not the user's | Delete the runs I create |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`.
- Representative existing data: stored pre-change deliveries without `sender address`, and existing standalone packages (roll-up from the stored tree).
- Evidence planned: the web parser unit (both forms), migration regression test, the summary service stored-tree unit test, and a live check of an existing dev-stack run if one is available.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Req / AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | `@`, bring-in, copy, Stop and wake, collaborator Team handoff | AC-001, AC-010 | Still Valid (unchanged vs base) | `git diff b37d7a934..HEAD -- tests/e2e` is empty | Execute on Claude and Codex |
| `tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | LE-A1/A2/A3, LE-T1, LE-O1, LE-F1 | AC-001, AC-002, AC-010 | Still Valid (unchanged) | Same | Execute on Claude and Codex |
| `tests/unit/standalone-agent-run-root/**`, `tests/integration/standalone-agent-run-root/**` | Root, handle, restore, termination, fixture cleanup | AC-001, AC-004 | Still Valid | Code review compared them side by side | Execute |
| `tests/unit/services/agent-streaming/agent-collaboration-stream-handler.test.ts` | CR-001 child commands, connect | SC-04 | Still Valid | CRR-002 | Execute |
| Builder tests (root, Team, global) | Header | AC-005 | Still Valid | — | Execute |
| Token service/store tests, `TokenUsageMeterPanel.spec.ts` | Roll-up | AC-006 | Still Valid | — | Execute |
| Page projection test, `eventMonitorActiveTraceBrowsePresentation.spec.ts` | Earlier events | AC-007 | Still Valid | — | Execute |
| `agentRunCollaborationContext.spec.ts`, `memberDisplayName.spec.ts` | Host label | AC-008 | Still Valid | — | Execute |
| `tests/architecture/**`, `team-run-model-selection-save.test.ts` | Guard, model save | AC-009 | Still Valid | — | Execute |

## Durable Coverage To Add

None by API/E2E this round. The predecessor live suites already cover AC-001/AC-002 and must stay unchanged. The REQ-007 collaborator-page gap (F-01) needs durable web coverage, but as part of its fix: a test that a standalone child's browse subject uses the collaboration member page query. That is the fix owner's work, not a validation-only addition.

## Durable Coverage To Update

None. AC-001 forbids behavior edits to the predecessor suites, and none were made (`git diff b37d7a934..HEAD -- autobyteus-server-ts/tests/e2e` is empty).

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused web: `pnpm exec vitest run components/workspace/usage services/agentCollaboration services/eventMonitor utils/collaboration stores/__tests__/tokenUsage composables/__tests__ components/workspace/agent/__tests__/EventMonitor` | `autobyteus-web` | AC-005 parser, AC-006 panel/store, AC-007 presentation, AC-008 label | Pass: 231 passed. 7 failures in `useWorkspaceHistorySubjectActions.coldHistory.spec.ts`, identical on base (ZodError) | `api-e2e-evidence/ae06-web-focused.log`, `ae06-web-coldhistory-base.log` |
| 2 | Full web `pnpm exec vitest run --reporter=json`, branch and base | `autobyteus-web` | AC-010 regression | Pass: branch 3749/44 failed, base 3746/44 failed; 0 new, 0 changed | `ae06-web-{branch,base}.json`, `ae06-web-compare.txt` |
| 3 | AE-01 `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 pnpm exec vitest run tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | `autobyteus-server-ts` | AC-001 live (mention, bring-in, copy, Stop/wake, collaborator Team handoff) | Pass: 4/4 enabled (Claude 2, Codex 2) | `ae01-mention-claude-codex.log` |
| 4 | AE-02 `RUN_CLAUDE_E2E=1 … agent-initiated-collaborators.e2e.test.ts` | same | AC-001/AC-002 live (LE-A1/A2/A3/T1/O1/F1) | Pass: 6/6 | `ae02-aic-claude.log` |
| 5 | AE-03 `RUN_CODEX_E2E=1 AIC_ROOT_RUNTIMES=codex_app_server … agent-initiated-collaborators.e2e.test.ts` | same | AC-001/AC-002 on a second runtime, incl. Team and Org roots | Run 1: 4 pass, LE-O1 failed (Org terminate not accepted). LE-O1 alone: branch pass, base pass. Full rerun: branch 5/5, base 5/5. **Intermittent, 1 of 3 branch executions; not reproduced** (O-01) | `ae03-*.log` |
| 6 | Full server `vitest run tests/unit tests/integration tests/architecture --reporter=json`, branch and base in parallel | both worktrees | AC-009, AC-010, D-R4 | Pass: branch 4805/147 failed, base 4777/185 failed; **0 new failures**; 38 now pass; 7 "changed" differ only in random temp paths/run IDs; `agent-run-manager` 16 identical | `ae05-server-{branch,base-r2}.json`, `ae05-server-compare.txt`, `ae04-server-focused-from-full.txt` |
| 7 | Static: sizes and removed names | worktree | AC-001/AC-002/AC-003 | Pass: 399/347/392 lines; 0 references to removed names | `static-checks.txt` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. Multiple long-running paid live suites and live journeys, with an interruption risk.
- Canonical ledger path: `…/standalone-agent-run-root/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Scored after the repository suites and the live-provider suites (AE-01 to AE-03), before the dev-stack and probe journeys.

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | AC-001/002 live on Claude + Codex; AC-003/009 green; 0 new failures | AC-005 reply-by-address live, AC-006 live sums, AC-007 live page, SC-04 live not yet shown | Live probes, dev-stack browser |
| Changed-boundary execution directness | 85% | Real server HTTP/WS with real runtimes | Web surfaces not driven | Browser on dev stack |
| Cross-boundary integration realism and mock gap | 85% | Live runtimes, no mocks in the E2E suites | Frontend ↔ server contract for new GraphQL fields | Browser |
| Environment, configuration, identity, and fixture fidelity | 90% | Documented gates, test-owned DB and data | AGY/Grok not run | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | Stop/wake, restore in suites | Host crash live, LE-O1 intermittent | Crash probe, reruns |
| User-surface, browser, and desktop-shell confidence | 50% | Unit specs only | All four web surfaces unverified live | Browser journeys |
| Durable regression coverage quality and relevance | 88% | Predecessor suites unchanged and passing; new unit tests | Collaborator-page routing has no test | — |

- Overall post-repository confidence: 80% (simple average)
- Every critical acceptance criterion directly proven: `No`
- Any applicable category below `90%`: `Yes`. All except environment fidelity.
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: the web surfaces, live crash, live roll-up and reply by address.

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Selected execution mode: `Live API` (temporary vitest probe on the real Studio server with Claude/Codex) plus `Browser` (TESTING.md dev stack `pnpm dev` driven with Playwright `playwright-core` over CDP on an owned headless Chrome. Mouse and keyboard input are trusted, i.e. real-click equivalent).
- Specific gaps addressed: SC-04 with real process death, AC-005 reply by address to `/team/lead`, AC-006 sums with collaborator + collaborator Team + copy, AC-007 live page, AC-008 label, real-click composer, stored pre-change history.
- Why it improves confidence: it enters through the real triggers (runtime death, composer clicks, scroll intent, GraphQL) on the real server and web.
- Browser-specific decision: required, because four web surfaces changed and the implementation reported unreliable synthetic sends.
- Desktop shell: not affected (no Electron code changed). The web-equivalent renderer is proven through the dev stack.

## Live Environment And Fixture Plan

- Startup: clean-base `pnpm dev` (seed) → stop → copy base dev data into the branch dev data dir (IE data moved aside) → branch `pnpm dev` → headless Chrome `--remote-debugging-port=9333 --user-data-dir=<tmp>`.
- Pre-change fixture: a General Agent run (Claude haiku) with `@Echo Helper`, brief and report seeded on the clean base. The stored headers have no `sender address`. `run_metadata.json`'s absolute memory path was rewritten to the branch location to simulate an in-place upgrade of the same data dir.
- Identities: the logged-in local CLIs (no secrets recorded).
- Cleanup: stop the runs, the dev stacks and Chrome; restore the IE dev data; delete the base dev data, the base `dist`, temp workspaces and the Chrome profile; remove the temporary probe from the repo.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| AE-07/08/09 | `autobyteus-server-ts/tests/e2e/runtime/zz-tmp-sar-probe.e2e.test.ts` (gated `RUN_SAR_PROBE=1`; removed after the run; source kept at `api-e2e-evidence/probes/zz-tmp-sar-probe.e2e.test.ts.txt`) | SC-04 (kill host `claude` pid, child send/interrupt, child→host, host message), AC-006 sums (collaborator + copy, collaborator Team; live, child-only, stored), AC-005 reply by address on Claude and Codex | It kills OS processes by PID ancestry, which is environment-specific. The handler unit test (CR-001) and the builder/summary tests are the durable guards |
| AE-07/10/11 | `api-e2e-evidence/probes/devstack-driver.mjs`, `probes/pw.mjs` + `s01`–`s19` step files | Browser journeys and the crash through the UI | Manual live journeys on a dev stack |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| AGY, Grok, LM Studio/native AutoByteus runtimes for AC-001/AC-005 | Not required by the gate (Claude + one other). Paid or slow; Claude + Codex done | Low: the header is runtime-agnostic input text, proven on two runtimes | Optional |
| LE-F1 on Codex | Needs `CODEX_E2E_STALE_MODEL`, which is not set (as on base) | Low | — |
| Team-run (configured Team) member earlier-events page live | Not driven live; unit-covered (`getTeamMemberEventMonitorActiveTracePage` with sender resolution) | Low-medium | Recheck with the F-01 fix |
| Packaged Electron | No shell code changed | Low | Delivery |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-01: AC-007 fails on standalone collaborator (and collaborator-Team member) pages. The web fetches the earlier page through `GetRunEventMonitorActiveTracePage(runId=<child>)`, and the server rejects it ("Run package 'agent:<child>' is unavailable"). Root: `autobyteus-web/stores/agentRunCollaborationStore.ts:271` sets `browse: {kind:'run', runId: child.agentRunId}`; `eventMonitorActiveTracePageService.ts` has no subject for the existing server query `agentRunCollaborationMemberEventMonitorActiveTracePage`. Pre-existing (identical on base) | `Local Fix` (preliminary) | Browser `s08`–`s10`; GraphQL `ae10-collaborator-pages.json` (the server member query returns both deliveries as `inter_agent`, `senderAddress: /general_agent`) | `implementation_engineer`, via code-review failure-origin review |
| O-01: LE-O1 Codex intermittent Org termination not accepted (1 of 3 branch runs, under heavy concurrent load; 0 of 2 base) | Not classified as a failure; residual risk | `ae03-aic-codex.log` vs `ae03-*-rerun*`, `ae03-base-*` | Code reviewer to note in failure-origin review |
| CG-05: the roll-up panel is not refreshed by child-only usage | Held residual risk (observed) | `s14a/b/c` | `solution_designer` (if live child freshness is wanted) |

## Round 2 Delta (API-REV-002)

- **Upstream delta.** `git diff 6643297a0..HEAD` is web-only (8 files): `stores/agentRunCollaborationStore.ts`, `services/eventMonitor/eventMonitorActiveTracePageService.ts`, `eventMonitorActiveTraceBrowse.ts`, `graphql/queries/runHistoryQueries.ts`, `generated/graphql.ts`, and 3 specs. The server is unchanged, so server-side round-1 cases carry forward.
- **Planned reruns.**
  - **AE-10:** live, collaborator and host pages, with pre-change and new headers and real paging past 100 events.
  - **AE-06:** full web suites vs the clean base.
  - **Added:** a collaborator-Team member page, server query plus UI.
- **Added after reruns: O-01 frequency sampling.** O-01 was held as a residual risk, so it needed a frequency check to close the lifecycle gap. LE-O1 Codex reproduced the failure without load, so I sampled both sides and added temporary diagnostics.
  - Branch: 3 of 10 executions failed. Base: 0 of 12.
  - The failure is `AgentOrgRun` fence → `AgentRun.fenceInputAndInterruptForRootShutdown` → Codex `turn/interrupt`, which returns RPC -32600 "no active turn to interrupt". That becomes `RUNTIME_COMMAND_FAILED`, and termination is not accepted on any retry.
  - The interrupt/fence/Codex backend code is unchanged by the branch. The scope of handles fenced (Org root agents, mounted Team scopes with `TeamRootCollaboratorAgentRegistry`) and the Org delivery and admission timing (REQ-003 extraction) did change.
  - **Reclassified: O-01 → F-02.** It is a failure of the AC-001 gate (`agent-initiated-collaborators.e2e` LE-O1 must pass unchanged) and of AC-010 (Stop of an Org run).

### Round 2 Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| F-01 | Resolved (IR-003) | AE-10 round 2 Pass | — |
| F-02: Org Stop not accepted on Codex. Fence interrupt hits "no active turn to interrupt"; the run is stuck active; teardown `stopAll` fails. Branch 3/10, base 0/12 | `Unclear` (preliminary). The likely owner is implementation (REQ-002/REQ-003 changes in the fenced scope or the Org delivery timing), but the failing call is in unchanged runtime interrupt code, so the origin needs review | `r2-o01-*.log`, `ae03-aic-codex.log`, `probes/tmp-o01-diagnostic.diff` | `code_reviewer` failure-origin review |

## Round 3 Delta (API-REV-003)

- **Trigger.** CRR-006 Pass (SR-006 § 11, ARCH-REV-004, IR-004).
- **Upstream delta.** `git diff f2c32a2cc..HEAD` touches only `agent-execution/domain/agent-run-root-shutdown-fence.ts` and `agent-run.ts`, plus three unit test files. The fence now waits up to 5 s for quiescence after a rejected interrupt, latches only acceptance, and warns at rejection and at expiry (F-1 to F-4).
- **Planned reruns** (ARCH-REV-004 N-1):
  1. LE-O1 Codex, 10 consecutive passes (F-02);
  2. the AC-001 suites: the mention suite on Claude and Codex, and the agent-initiated suite on Claude and on Codex with `AIC_ROOT_RUNTIMES=codex_app_server`;
  3. full server suites vs the clean base;
  4. every `[AgentRun] root shutdown interrupt …` warning recorded with its turn state. An expiry warning with a local IDENTIFIED turn → `Design Impact`.
- **Carried forward** (web and these paths unchanged): AE-10/F-01, AE-06, AC-005, AC-006, AC-008, SC-04, AE-11.

### Round 3 Results And Decisions

- **F-02 closed.** LE-O1 on Codex passed 10/10 consecutively, plus once more in the full Codex suite: 11/11. Before the fix the branch failed 3/10. With the old rate, 11 passes in a row would happen about 2% of the time.
- **Warning census (F-4).** There were 0 `[AgentRun] root shutdown interrupt` warnings across all round-3 live logs. The rejection and expiry path did not fire live; its rules are proven by `agent-run-root-shutdown-fence.test.ts` (7), `agent-run.test.ts` and `agent-org-run-termination.test.ts`. No IDENTIFIED-turn expiry was seen, so there is no Design Impact.
- **AC-001 gate.**
  - Mention suite: Claude + Codex 4/4.
  - Agent-initiated suite: Claude 6/6 and Codex 5/5 (root cases).
  - Extra runtime: AGY mention 2/2.
- **Grok.** Model/catalog unreliable on base and branch alike; not counted (see the ledger #40–#41).
- **Server.** 0 new failures vs the clean base.
- **Durable coverage by API/E2E.** None.

## Round 4 Delta (API-REV-004, delivery re-entry DR-001)

- **Trigger.** CRR-008 (IR-005 `3c7b62f53`: one `test-support` import line). Delivery merged origin/personal@1b9739cad (`1195f4356`).
- **Premise check.** The merge is not docs-only. It brings upstream `307d0e775`, Claude compaction frame detection and raw-trace rotation: `claude-session.ts`, `claude-session-output-events.ts`, `claude-session-event-converter.ts`, the new `claude-compaction-operation-tracker.ts`, and the `agent-memory` recording models and boundary recorder, with tests.
- **Decision.** Spot-check the server, web and live Claude/Codex paths in addition to the requested `pnpm test:native-input-history`.
- **Results.**
  - Native harness: 2/2 on both sides (identical 12 warnings).
  - Server: 0 new failures vs pre-merge and vs base.
  - Web: 0 new.
  - Live mention suite: intermittent model timeouts. A same-conditions comparison with upstream `1b9739cad` reproduced both signatures without the branch, while the branch passed 3/3 in parallel.
- **Carry-forward.** API-REV-003 evidence carries forward: F-02 fix, AC-001 gate, F-01, AC-005/006/008, SC-04. No branch source changed; the merged upstream code is exercised by the server suites and the live mention suite.

## Investigation Decision

- Proceed: `Yes` (round 4 completed)
- Durable coverage added/updated/removed by API/E2E: `No`
- Final confidence: 93%
- Broader validation: `Required` (live spot-check executed)
- Reroute Required: `No`. Result `Pass` → `code_reviewer`.

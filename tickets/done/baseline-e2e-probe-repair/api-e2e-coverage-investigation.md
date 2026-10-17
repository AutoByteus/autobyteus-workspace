# API/E2E Coverage Investigation — `baseline-e2e-probe-repair`

Ticket folder `T` = `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair/tickets/in-progress/baseline-e2e-probe-repair`. Evidence `E` = `T/evidence/api-e2e/`.

## Investigation Meta

- Requirements Doc: `T/requirements-doc.md` (Approved, SR-003)
- Investigation Notes: `T/investigation-notes.md` (SR-003)
- Solution Revision Record: `T/solution-revision-record.md` (SR-001..SR-003)
- Design Spec (required on every route): `T/design-spec.md` (Ready, SR-003)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `T/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `T/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `T/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `T/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: Implementation Engineer's direct-route handoff (IR-002, SR-003 basis), 2026-10-17
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The approved requirements (SR-003) ask that every listed server e2e suite and web probe pass, or that an expectation for a removed feature is dropped with a stated reason, with no production change (REQ-010), one labelled baseline-fix commit per item (REQ-012), and a stop-and-report rule if a repaired test exposes a product defect (REQ-011).

- In scope: UC-002..UC-005 and UC-008..UC-011, repaired here.
- Verify-only: UC-001 and UC-007, fixed upstream.
- Withdrawn: UC-006/AC-006 (DEC-009).
- UC-004's warning case asserts the fail-closed contract, accepted in DEC-010.
- The design (Medium/Low) prescribes the public boundaries each fix must use: `beginActivation`, `beginPreparation`, admission via `admitCurrent`, Org APIs, and `page.route` only as R03's fallback (DEC-006).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-005 and SCN-008..SCN-012. SCN-006 is withdrawn with UC-006.
- Real-use scenarios added from investigating the implemented behavior:
  - A failure in one UC-003 test must not cascade into the next. A developer or CI meets this whenever one test fails, which is REQ-003's stated purpose. Trigger: an injected failure in test 1.
  - R03 must not touch the user's data root. Trigger: a real-identity run.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): SCN-007 (three-level released history).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 flat Team run config | Preserved (upstream fix) | SR-002; upstream `e6ba249a96`, `2e70401f18`, `57d388a7fd` | Verify 7/7 |
| BEH-002 `AGENT_STATUS` payload | Changed (test expectation) | REQ-002 | Run; review diff |
| BEH-003 Error-runtime lifecycle via `beginActivation` | Changed (harness) | REQ-003 | Run; `-t` per test; cascade check |
| BEH-004 released upgrade to the AgentOrg end state | Changed (assertions) | REQ-004, DEC-002, DEC-010 | Run; check no-loss assertions, token change against source |
| BEH-005 flat Team memory sync | Changed (fixture); nested cases removed | REQ-005, DEC-003 | Run; review the removal reason |
| BEH-006 nested history restart | Removed upstream | DEC-009 | Absence check |
| BEH-007 projection admission | Preserved (upstream fix) | SR-002; `149bce0be9` | Verify 9/9 |
| BEH-008 `beginPreparation` | Changed (harness) | REQ-008 | Run |
| BEH-009/010/011 probe harnesses | Changed (fixtures, trigger, script) | REQ-009, DEC-006, DEC-007 | Run each probe; check injected shape = real server shape |
| Production code | Preserved (no change) | REQ-010 | Diff review; typecheck; `test:unit` |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | none (test-only) | typecheck, test:unit | — | — |
| API / transport / contract | Yes (test side) | GraphQL/WS expectations in server e2e | the 7 e2e files against the built server or in-process schema | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Yes (probe side) | fixture boundaries, R03 trigger | the 3 probes | R03 injects the server result | Browser (the probes are the browser surface) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Observed only | probes render existing UI | probes | — | — |
| Desktop shell / Electron-specific | No | — | — | — | — |
| Process / lifecycle | Yes (test side) | UC-003 cleanup, UC-004 restarts, UC-005 two processes | e2e runs | — | — |
| Persisted-data transition | Asserted, not changed | UC-004 asserts the existing migration chain | e2e on synthesized released data | — | — |
| Worker / queue / distributed coordination | Yes (test side) | UC-005 two server processes | e2e | — | — |
| External integration | R03 only | signed-in `claude`/`codex` CLIs for runtime availability | R03 run | none; no inference | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair`, HEAD `3108bb9ef8`, base `516e592d7b` (the current `origin/personal`, fetched 2026-10-17)
- Project type: pnpm monorepo; TypeScript server (Node, vitest), Nuxt web, Electron shell
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair/TESTING.md` (no closer `TESTING*.md` in `autobyteus-server-ts` or `autobyteus-web`)
- Conflicting/missing instructions: none. Minor: AC-001 says the header states the nested-drop reason. The upstream file states it inline (line 107: "A team contains agents only (flat teams since v1.4.70; remove-nested-task-team)") and in commit `e6ba249a96`, not in a top-of-file header. The file is upstream-owned and AC-001 is verify-only, so this is recorded as an observation.
- Required secrets available: `N/A`. R03 uses the host's signed-in CLIs; no secret values are read or recorded.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | global testing rules | build first; clean env (`env -i PATH HOME=<temp> TMPDIR`); signed-in CLIs need the real HOME/USER/LOGNAME; probes use a fresh `--output-dir`, fail on browser errors, and leave a cleanup receipt; never touch `~/.autobyteus`; Rule 9 |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `autobyteus-web/AGENTS.md` | package notes | `vitest run --no-watch`; never `git add -A` |
| `design-spec.md` "Guidance For Implementation" | ticket commands | the exact e2e and R03 commands |
| `autobyteus-web/package.json` | probe scripts | `test:e2e:existing-run-model-config`, `test:e2e:interrupt-result-presentation` (new), `test:e2e:run-settings-live` |
| `run-settings-live-probe.mjs` header | R03 prerequisites | built server, Chrome, logged-in `claude` and `codex`; R03 has no producer case |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | `autobyteus-server-ts` | `pnpm prebuild && pnpm build` | serialized, nothing else built in this worktree meanwhile | exit 0 + bootstrap smoke | n/a |
| Server e2e | `autobyteus-server-ts` | `env -i … pnpm exec vitest run --no-watch <files>` | test-owned runtime roots and DBs | vitest summary | suites remove their own roots |
| Probes | repo root | `pnpm -C autobyteus-web test:e2e:<name> --output-dir <fresh>` | each owns free ports, Nuxt dev, Chrome (and backend for R03) | probe's own readiness | probe cleanup receipt |

Another worktree's Nuxt dev server (`agent-definition-reconnect-ui`, port 3291) was running. It was not touched; the probes choose free ports.

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Released TeamRun V1 data | suite-synthesized released-shape records | test-owned runtime root | removed by the suite |
| Current packages, definitions | suites' current stores and builders, GraphQL | test-owned | removed by the suite |
| R03 definitions and Org | probe setup through GraphQL | probe temp root `/var/folders/…/run-settings-live-*` | removed (receipt) |
| Signed-in CLI identity | host login via the real HOME/USER/LOGNAME | `~/.autobyteus` mtime recorded before and after | unchanged |

## Persisted Data Transition Coverage Basis (When Applicable)

- Approved decision: `Not Affected`. The tests only assert the existing chain; no product reader or writer changed.
- UC-004 still proves on synthesized released data that the existing migration chain works:
  - conversion to the AgentOrg end state, with no loss of members, configs, tasks, messages, memory bytes or token accounting;
  - a second start changes nothing;
  - warning, failure and retry behavior.
- That suite is the release-continuity evidence the requirements call Critical (REQ-004).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-config-graphql.e2e.test.ts` | flat Team config persist/restart/restore + 6 runtime rejections | REQ-001/AC-001 | Still Valid | upstream fix; 7 tests | Run ×2 |
| `…/tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` | offline → initializing → running with current payload | REQ-002/AC-002 | Still Valid (updated in `6d106cb2e4`) | diff: exact `toEqual` kept, `recoverableBlock: null` added; double gains the required members | Run ×2 |
| `…/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` | Error runtime list/terminate/history; rejected termination stays active | REQ-003/AC-003 | Still Valid (updated in `5f812baa57`) | `beginActivation({kind:"new"…}).prepare()` + `commitPublication()`; cleanup registered per resource | Run ×2, `-t` each, injected-failure check |
| `…/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | released upgrade to the AgentOrg end state; no loss; warning/failure/retry/overlap | REQ-004, REQ-011/AC-004 | Still Valid (updated in `dc4110b1c6`) | see notes below | Run ×2 |
| `…/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` | standalone + flat Team sync between two processes; IMPORTED read-back | REQ-005/AC-005 | Still Valid (updated in `42965d5043`); nested-layout cases removed with reason | header comment lines 13-23 | Run ×2 |
| `…/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | projection/paging/cursor/archive on admitted packages | REQ-007/AC-007 | Still Valid | upstream `149bce0be9` | Run ×2 |
| `…/tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | native tools + explicit skill reads | REQ-008/AC-008 | Still Valid (updated in `3aa6eaa717`) | `beginPreparation(...).prepare()`; release asserted `{kind:"released"}`, backend inactive | Run ×2 |
| `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` | API-E2E-004-A..F | REQ-009/AC-009 | Still Valid (updated in `3052b836ad`) | answers the 2 missing operations plus `selectionPresentation`/`closedTaskExecutions`, health and the definitions feed; gate extended to `console:error` (stronger) | Run |
| `autobyteus-web/tests/e2e/interrupt-result-presentation-probe.mjs` + `fixtures/interrupt-result-presentation.page.vue` | SR008-BR-001..004 | REQ-009/AC-010 | Still Valid (updated in `c2347175ae`) | tree parsed by `teamRunExecutionTreeDtoSchema`; Team frames by `parseTeamStreamServerMessage`; strict operation map fails on an unexpected operation; `layout:false` | Run via the new script |
| `autobyteus-web/tests/e2e/run-settings-live-probe.mjs` R03 | Org launch failure presentation | REQ-009/AC-011 | Still Valid (updated in `40e39d7235`) | DEC-006 fallback; injected body equals the server's real failure shape (`agent-org-run.ts:203`: `{success:false, message, agentOrgRunId:null}`); operation name `CreateAgentOrgRun` matches `graphql/mutations/agentOrgRunMutations.ts:4`; AC-003 assertions kept, plus a new "exactly one launch request" assertion | Run with real identity |

UC-004 review notes (source checks behind each changed assertion):

- Token rows: the supported case now expects `root_team_run_id: null` and `root_attribution_status: "unknown"`.
  - This is explicit migration behavior, at `src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-token-attribution-repository.ts:74-85`. It only rewrites `single`-status rows of that Org, then re-reads them to confirm.
  - The accounting is unchanged: 13/8/21, served through `getAgentOrgMemberTokenUsageSummary`. This is not loss (ASM-001/REQ-011).
- Content: no loss of released content is asserted byte-for-byte or field-for-field on the Org package:
  - the tree, with members, configs and task executions;
  - messages with reference files;
  - task records with every update;
  - the memory sentinel bytes.
- Relaunch immutability: the ledger and package are unchanged on the second start.
- Warning case: the original "history and relaunch available" assertions are replaced by the fail-closed contract, which the Solution Designer accepted in DEC-010. Health, new work, warning isolation and retry are still asserted. The broader impact is follow-up FU-4.

## Durable Coverage To Add

None. The ticket is itself the durable coverage change, and the Scope Guardrail excludes new coverage for behavior these suites did not cover before.

## Durable Coverage To Update

None by API/E2E. The implementation's updates are reviewed above and judged valid.

## Durable Coverage To Remove

The removals were made by implementation and are reviewed here:

| Existing Path / Test | Obsolete Assertion And Why | Requirement / AC / Design Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| `memory-sync-multiprocess` MP_001 (flat residue vs canonical child-Team conflict) | needs a Team inside a Team; current Team V2 rejects it | REQ-005, DEC-003, flat-agent-organization-model REQ-002 | No replacement: a flat Team member's canonical directory is the flat one, so this conflict cannot occur. Recorded in the file header. |
| `memory-sync-multiprocess` MP_002 (relocation re-sync, second `startMemorySync`) | the relocation is nested-layout specific | as above | No replacement for the relocation. Side effect: no e2e now covers a second, incremental cross-process sync. That was incidental to MP_002, not its subject; recorded as a non-blocking observation (OBS-2). |
| `run-history/nested-team-history-restart.e2e.test.ts` | removed upstream by `remove-nested-task-team` (merge `8a8d322144`, user DEC-008) | DEC-009 | Covered elsewhere per UC-006 |

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 0 | `pnpm prebuild && pnpm build` | `autobyteus-server-ts`, HEAD `3108bb9ef8` | current `dist/app.js` | Pass | `E/server-build-3108bb9ef8.log` |
| 1 | `env -i PATH HOME=<tmp> TMPDIR pnpm exec vitest run --no-watch <7 files>` (run 1) | `autobyteus-server-ts` | AC-001..005, 007, 008 | Pass 26/26 | `E/server-e2e-run1.plain.log` |
| 2 | same (run 2, new temp HOME) | same | QR-001 twice | Pass 26/26 | `E/server-e2e-run2.log` |
| 3 | same, UC-003 with `-t "<name>"` per test | same | AC-003 alone | Pass ×2 | `E/uc003-each-test-alone.log` |
| 4 | temporary copy with an injected throw in test 1 | same | REQ-003 "cannot cascade" | Pass (test 1 fails as injected, test 2 passes) | `E/uc003-injected-failure-no-cascade.log` |
| 5 | `env -i PATH HOME=<tmp> TMPDIR pnpm -C autobyteus-web test:e2e:existing-run-model-config --output-dir E/probes/existing-run-model-config` | root | AC-009 | Pass | `E/probes/existing-run-model-config/` |
| 6 | `env -i … pnpm -C autobyteus-web test:e2e:interrupt-result-presentation --output-dir E/probes/interrupt-result-presentation` | root | AC-010 | Pass | `E/probes/interrupt-result-presentation/` |
| 7 | `env -i PATH HOME=$HOME USER LOGNAME TMPDIR pnpm -C autobyteus-web test:e2e:run-settings-live --cases R03 --output-dir E/probes/run-settings-live-R03` | root | AC-011, QR-002 | Pass | `E/probes/run-settings-live-R03/` |
| 8 | `git diff/log/ls-tree 516e592d7b..HEAD` | root | AC-006, AC-012 | Pass | `E/ac012-diff-and-commit-review.txt` |
| 9 | `pnpm -C autobyteus-server-ts typecheck` | root | AC-012 | Pass | `E/server-typecheck.log` |
| 10 | `pnpm -C autobyteus-server-ts test:unit` | root (suite isolates its env) | AC-012 | Pass 5811/5811 (7 skipped) | `E/server-test-unit.summary.txt` |

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are 14 independent cases, some lasting minutes, across server, browser and repository surfaces.
- Canonical ledger path: `T/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 97% | every in-scope AC executed directly: AC-001..005, 007..011 by their exact commands; AC-003 alone and cascade-checked; AC-006/AC-012 by repository review | AC-001's reason is inline, not a header (upstream file, verify-only) | none material |
| Changed-boundary execution directness | 97% | the changed artifacts are the tests themselves, run through their real entry points (vitest, `pnpm test:e2e:*` scripts) | — | — |
| Cross-boundary integration realism and mock gap | 93% | built-server suites (UC-001, UC-004, UC-005) and a real backend for R03 | R03 injects the launch result at the GraphQL boundary (DEC-006 fallback). Its body was checked against the server's real failure shape. Server-side validation of an Org launch is not R03's subject. | none in scope |
| Environment, configuration, identity, and fixture fidelity | 96% | clean env with a fresh temp HOME for every e2e/probe run; real identity only for R03; fresh output dirs; build at HEAD | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | UC-003 rejected termination and cascade isolation; UC-004 warning/fail-closed, consolidation-failure retry, overlap refusal, relaunch immutability; UC-010 failed/accepted/lost-socket stop | incremental second sync no longer has an e2e (OBS-2) | — |
| User-surface, browser, and desktop-shell confidence | 95% | three probes in headless Chrome, 0 page/console errors, DOM/state assertions, screenshots | no desktop-shell change, so N/A for the shell | — |
| Durable regression coverage quality and relevance | 95% | assertions updated to current shapes, not weakened: exact `toEqual` kept; UC-008 release now asserted; UC-009 gate extended to console errors; UC-010 fixtures validated by the contract parsers | memory-sync coverage narrowed by design (DEC-003) | — |

- Overall post-repository confidence: **95.4%** (simple average of 7 categories)
- Every critical AC directly proven: `Yes` (AC-004, AC-012)
- Any applicable category below 90%: `No`
- Default 95% target met: `Yes`
- Material residual risks: none blocking; observations OBS-1..OBS-3 in the report

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`
- Selected execution mode: `None` beyond the probes. The browser probes are themselves the browser surface for UC-009..UC-011 and already ran.
- Rationale: the change is test-only. Each changed artifact ran through its own real entry point, server suites against the built server and probes in real Chrome. No product code changed, so a desktop or isolated-instance journey would prove nothing about this change.
- Browser-specific decision: covered by the three probes. The Electron shell is untouched.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Full `run-settings-live` probe (other cases) | Non-goal: needs paid inference | none for this ticket | No | — |
| SCN-007 three-level history | Unsupported (SR-003) | — | No | — |

## Ambiguities Or Reroute Triggers

None. FU-1..FU-5 are already recorded by the Solution Designer for `/project_task_manager`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-resident durable coverage will be added, updated or removed by API/E2E: `No`
- Post-repository confidence: 95.4%
- Broader validation decision: `Not Required`
- Reroute required before validation execution: `No`

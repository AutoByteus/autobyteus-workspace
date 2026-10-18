# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/requirements-doc.md` (`Approved`, SR-001)
- Investigation Notes: `…/remove-create-or-update-project/investigation-notes.md`
- Solution Revision Record: `…/remove-create-or-update-project/solution-revision-record.md`
- Design Spec (required on every route): `…/remove-create-or-update-project/design-spec.md` (SR-002)
- Supplemental Task Artifacts: `tickets/done/project-tool-split/` (read-only; its API/E2E journey script and test package are the starting point for AC-006)
- Design Review Report: `…/remove-create-or-update-project/design-review-report.md` (ARCH-REV-001)
- Architecture Review Revision Record: `…/remove-create-or-update-project/architecture-review-revision-record.md`
- Implementation Handoff: `…/remove-create-or-update-project/implementation-handoff.md` (IR-002)
- Implementation Revision Record: `…/remove-create-or-update-project/implementation-revision-record.md`
- Code Review Report: `…/remove-create-or-update-project/code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `…/remove-create-or-update-project/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `…/remove-create-or-update-project/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `…/remove-create-or-update-project/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code review CRR-002 pass (head `4807095aed`)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: 1

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` only if I change durable test code; otherwise `Not Applicable`

## Current Requirement And Design Basis

`create_or_update_project` is removed from the contract, native registration, MCP manifest and first-party protection, and from the picker (REQ-001). A definition that still lists it launches normally: the name is skipped (an AutoByteus warning, filtered on Codex/Claude), and every other listed tool is given (REQ-002). `create_project` and `update_project` are unchanged (REQ-003). References remain only where REQ-004 allows them. The release note announces the removal (REQ-005), and the web probe list is cleaned (REQ-006). Persisted data: `Not Affected` (definitions are not rewritten).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001, SCN-002, SCN-003.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 (from SCN-002): the real older definition is the PTM package. It lists the old name together with the new tools and others, and it reaches the app as an **agent package**. Trigger: LOCAL_PATH package import, then launch. Covered with a package agent of that shape.
  - SCN-A2 (from SCN-002): a definition whose only Project mutation tool is the old name. Trigger: launch and ask it to change a Project. Expected: it launches, has no mutation tool, and the change is not made. This is the accepted design risk that the release note covers.
  - SCN-A3: an agent whose skill still names the old tool calls it after upgrade. Trigger: a call by name. Expected: the call is refused as not enabled or unknown, and nothing is created.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 old tool registration (native, MCP, protection, picker) | Removed | REQ-001, design | exact-set unit; packaged-server registry probe; real-app MCP `tools/list` and picker names |
| BEH-002 old name in a definition | Changed (now an unknown name → skipped) | REQ-002 | unit skip tests (resolver, runtime parity); real app on the AGY (scripted) and Claude Agent SDK (Haiku 5.5) runtimes; packaged-server resolver probe for AutoByteus |
| `create_project` / `update_project` | Preserved | REQ-003 | unit, boundaries + node-locality e2e, AGY-gated projects e2e, real-app create/update |
| docs, release note, probe list | Changed | REQ-004..006 | review + `git grep`; probe run |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | contract name set and parsers' dispatch on `name` | unit | — | — |
| API / transport / contract | Yes | native registry, MCP manifest | unit, boundaries e2e | packaged server resources | packaged build + probe |
| Frontend component / state | No (picker lists the registry) | — | — | old name must be gone from the real picker | real app |
| Browser integration / user journey | No source change | probe list only | probe | regression | `team-status-live` probe |
| Authentication / session / permissions | Yes (scoped MCP session tool set) | enabled tools per run | unit | real launch with the old name in the list | real app |
| Desktop shell / Electron | No | — | — | — | isolated instance |
| Process / lifecycle | Yes (launch with an unknown name) | run launch | unit | real launch errors | real app |
| Persisted-data transition | No (`Not Affected`) | stored definitions listing the old name | — | real stored package shape | real app with a package |
| External integration | Yes (a third-party MCP tool named `create_or_update_project` is no longer shadowed) | catalog collision set | unit (exact set) | negligible | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project` (branch `codex/remove-create-or-update-project`, head `4807095aed`)
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL/MCP server; Nuxt/Electron desktop
- Project testing guideline path(s): `…/remove-create-or-update-project/TESTING.md` (current: includes Rule 9 "find the cause and fix" and the "Rerun by impact" ledger rule from `dbf6b0a118` / `7b02d49bae`)
- Conflicting, missing, or unclear project instructions: as in project-tool-split. Isolated instances get only a baseline environment, so the scripted AGY CLI is set with the server's own `updateServerSetting`, followed by `isolated-app restart`.
- Required environment variables or secrets available: `Yes`. No provider keys are needed: AGY is scripted, and Claude Agent SDK uses the host Claude login.
- Real-model runs: Claude Agent SDK with Haiku 5.5 (the user's standing direction from the previous ticket; no ChatGPT/Codex quota).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | global strategy | clean env for E2E; scripted AGY gate; isolated instances with `--build`; Rule 9; every case recorded with its passing commit |
| `docs/isolated-app-instances.md` | isolated instances | start/restart/stop; browser automation on the control port |
| probe header `team-status-live-probe.mjs` | probe | `pnpm -C autobyteus-web test:e2e:team-status-live --output-dir <fresh>`; scripted AGY; owns its stack |
| `tickets/done/project-tool-split/evidence/api-e2e/{app-journey.mjs,test-package}` | prior method | adapted into this ticket's evidence |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| server build | worktree | `pnpm -C autobyteus-server-ts build` | dist predates the head commit | `exit 0` | — |
| packaged worktree app | worktree | `pnpm --silent isolated-app start --build` | after e2e/probe (it rebuilds server resources) | start JSON | `isolated-app stop <id>` |
| scripted AGY | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | wrapper `evidence/api-e2e/agy-scripted.sh` | `AGY_FAKE_CASE=linked_skills` | `CALLED:` / `SKILLS:` replies | — |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| test agent package | LOCAL_PATH folder `evidence/api-e2e/test-package/`, imported with `importAgentPackage` | instance-owned data root | kept as evidence; data root removed at stop |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Representative existing data: a package agent definition listing the old name with the PTM's other tools (`agent-config.json` shape)
- Evidence planned: real-app launch of that agent (APP-OLD-MIXED, REAL-OLD-MIXED)
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-tools/project-tasks/project-task-tools.test.ts` | exact-set (six names) across contract, adapters, registry; new tools' results and errors | AC-001, AC-003 | Still Valid | diff read | run |
| `tests/unit/agent-execution/shared/project-tool-runtime-parity.test.ts` | skip on AutoByteus/Codex/Claude, Team member and standalone host; `/_project$/` filter | AC-002 | Still Valid | diff read | run |
| `tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` | resolver warning names the old tool, other tools kept, no error | AC-002 | Still Valid | diff read | run |
| `tests/unit/agent-tools/mcp/*` | catalog and collision policy over manifest names | AC-001 | Still Valid | — | run |
| `tests/e2e/projects/project-task-boundaries.e2e.test.ts` | real HTTP MCP on the new tools; old-tool cases removed | AC-003 | Still Valid | diff | run |
| other `tests/e2e/projects/*` (AGY-gated, node-locality) | Project/Task journeys with `create_project`/`update_project` | AC-003 regression | Still Valid | — | run the folder with the gate |
| `autobyteus-web/tests/e2e/team-status-live-probe.mjs` | Team status; the manager list changed | REQ-006 | Still Valid | diff | run |
| `project-manager-ux`, `task-closure-tree` probes | Projects UI and Task tree, with managers listing the new tools | regression | Still Valid | unchanged files; the contract they exercise changed | run (rerun by impact) |
| `tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/*` | historical data | DEC-002 | Out Of Scope | — | none |

## Durable Coverage To Add

None planned. The repository already has durable cases for every AC at unit and HTTP level. The real-app checks need a packaged instance and stay ticket-owned.

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None. The implementation already removed the old-tool tests; that removal is reviewed by CRR-001/002.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 0 | server build; nuxt prepare | worktree | current build | Planned | server-build.log, nuxt-prepare.log |
| 1 | `vitest run` on the three changed unit files + `tests/unit/agent-tools/mcp` | worktree | AC-001..003 | Planned | unit-changed.log |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | worktree | src | Planned | server-typecheck.log |
| 3 | `pnpm -C autobyteus-server-ts test:unit` | worktree | regression | Planned | server-unit-full.log |
| 4 | clean env `vitest run tests/e2e/projects` with `RUN_AGY_FAILURE_E2E=1` | clean env | AC-003, regression | Planned | server-e2e-projects-agy.log |
| 5 | `test:e2e:team-status-live` | worktree | REQ-006 regression | Planned | probe-tsl/ |
| 6 | `test:e2e:project-manager-ux`, `test:e2e:task-closure-tree` | worktree | regression (contract exercised) | Planned | probe-pmu/, probe-tct/ |
| 7 | AC-005 resolution probe (from the split ticket) on the worktree server and the packaged build | throwaway HOME | AC-001/002 module level on the shipped resources | Planned | resolution-probe-*.txt |
| 8 | `git grep -n create_or_update_project -- ':!tickets'` | worktree | AC-004 | Planned | ac004-grep.txt |

- `test:integration`: Not run. No integration test references the project tools or their contract (`grep` of `tests/integration`), so nothing it exercises changed (TESTING.md "Rerun by impact").

## Test-Case Ledger Decision

- Ledger required: `Yes`. It holds multiple long suites and real-app sessions, and TESTING.md requires every case to be recorded with its passing commit.
- Canonical ledger path: `…/remove-create-or-update-project/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

Results of orders 0–8 are in the ledger and the execution report. In summary: unit, typecheck, grep and resolution probe pass. The E2E folder and the TCT probe each failed first, and each was fixed from its cause as a baseline fix (`c740d16b3c`, `d1796f010d`).

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 90% | unit + e2e + module probe | AC-001 picker and AC-006 not yet in the app | packaged instance |
| Changed-boundary directness | 92% | real scoped MCP in e2e | packaged resources | packaged instance |
| Integration realism / mock gap | 88% | scripted AGY | no real model; no package import | Haiku 5.5; LOCAL_PATH package |
| Environment / fixture fidelity | 92% | clean env | — | — |
| Failure / edge / lifecycle | 92% | skip tests | launch on real runtimes | real app |
| User-surface / desktop | 85% | probes | real picker | real app |
| Durable regression quality | 90% | suites fixed with causes | — | — |

- Overall post-repository confidence: 90%. Not every critical AC is proven yet (AC-006, and AC-001 picker), so broader validation is required. Final: 96% (execution report).

## Broader Validation Decision (Mandatory)

- Decision: `Required` (AC-001 picker names and AC-006 name a real-app check)
- Selected execution mode: `Project Desktop Validation`, an isolated instance of the worktree's packaged build with a LOCAL_PATH test package
- Specific confidence gap: the packaged app's registry, picker and run launch with the removed name in a stored definition
- Why the selected mode can materially improve confidence: it runs the shipped server resources, the real package import, the real run sessions and real inference
- Expected confidence after the selected validation: ≥ 95%
- Browser-specific decision and rationale: no renderer change. The renderer is used only to read the picker and the Projects page.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron (packaged)
- Chosen validation approach: `pnpm --silent isolated-app start --build`; scripted AGY via `updateServerSetting` + `restart`; package import; `evidence/api-e2e/app-journey.mjs`
- Effect on any already-running desktop application: None
- Behavior not directly proven: see Not Tested.

## Live Environment And Fixture Plan

- Test package `evidence/api-e2e/test-package/`:
  - `PTS Old Listed` — the PTM-like list: `list_projects`, `create_or_update_project`, `create_project`, `update_project`, `read_file`, `list_project_tasks`, `create_task`, `update_task`
  - `PTS Old Alone` — `create_or_update_project` only
  - `PTS New Tools` — `list_projects`, `create_project`, `update_project`
- Journeys:
  - APP-OLD-MIXED: launches; exposed tools contain no old name and all other listed project/task tools; a call by the old name is refused; `create_project` and `update_project` work.
  - APP-OLD-ALONE: launches; no project mutation tool; a call by the old name is refused; nothing is created.
  - APP-NEW: create, update, workspace replace/`[]`, error codes.
  - REAL-OLD-MIXED, REAL-OLD-ALONE, REAL-NEW: Claude Agent SDK Haiku 5.5, plain requests.
  - NATIVE-LAUNCH: an AutoByteus-runtime launch of `PTS Old Listed`, to see the resolver warning in the instance log, if the launch builds the agent without inference.
  - UI: picker names (GraphQL `availableToolNames` and the Create Agent form).
- Evidence: journey JSON and logs, `tools/list` per run, GraphQL projects, instance log excerpt, screenshots
- Owned processes and temporary state: one isolated instance and its data root

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| RES-PROBE-* | split ticket's resolution probe on the worktree and packaged servers | registry and skip at module level | ticket method on shipped resources |
| APP-* / REAL-* / NATIVE-LAUNCH / UI-* | isolated packaged instance + `app-journey.mjs` | AC-001, AC-002, AC-003, AC-006 in the real app | needs a packaged build; the repository has no durable desktop journey layer for this |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Codex runtime in the real app | no ChatGPT/Codex quota (user) | low: unit parity covers Codex; the MCP server path is shared | No | none |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`, updated. These are two baseline fixes, `c740d16b3c` (`task-copy-idle-lifetime.e2e.test.ts`) and `d1796f010d` (`task-closure-tree-probe.mjs`).
- Post-repository confidence: 90%; final 96%
- Broader validation decision: `Required`; executed
- Reroute Required Before Validation Execution: `No`
- Notes: result in `api-e2e-execution-coverage-report.md`.

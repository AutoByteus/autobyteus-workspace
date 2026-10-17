# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/requirements-doc.md` (`Approved`, SR-001)
- Investigation Notes: `…/project-tool-split/investigation-notes.md`
- Solution Revision Record: `…/project-tool-split/solution-revision-record.md` (SR-001, SR-002)
- Design Spec (required on every route): `…/project-tool-split/design-spec.md` (SR-002, `Ready`)
- Supplemental Task Artifacts: precedent `tickets/done/task-tool-split/` (read-only; its API/E2E report was used for execution recipes)
- Design Review Report: `…/project-tool-split/design-review-report.md` (ARCH-REV-001 Pass)
- Architecture Review Revision Record: `…/project-tool-split/architecture-review-revision-record.md`
- Implementation Handoff: `…/project-tool-split/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/project-tool-split/implementation-revision-record.md`
- Code Review Report: `…/project-tool-split/code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `…/project-tool-split/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `…/project-tool-split/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `…/project-tool-split/api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: code review CRR-001 pass (commits `285acae39a`, `79c5d2c5ef`)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` if I change durable test code; otherwise `Not Applicable` (see Investigation Decision)

## Current Requirement And Design Basis

Two single-meaning tools, `create_project` (`{name, description?, workspaces?}`, `project_id` rejected) and `update_project` (`{project_id, name?, description?, workspaces?}`, at least one change), with today's results and error codes (REQ-001/002). Neither is automatic. Both are protected first-party names on native and Agent Tools MCP (REQ-003). `create_or_update_project` stays registered with its byte-identical name, description and schema. It dispatches on `project_id` presence onto the new tools' parsers and execution (REQ-004, DEC-002). A configuration listing old and new names launches without error in v1.5.5-beta.2 (old tool only) and in the new build (all three) (REQ-005). Docs and release notes describe the split and the deprecation (REQ-006). Persisted data: `Not Affected`.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-005, all `Supported Normal Scenario`.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-A1 (from SCN-005): the real transition reaches users as an **agent package** (`autobyteus-agents` PTM `agent-config.json`). Real trigger: the user imports a package from a local path, then launches its agent. AC-005/AC-006 are proven with a LOCAL_PATH package import, not hand-made definitions.
  - SCN-A2 (from SCN-003): an agent configured with only the new tools tries the old name, and an agent with only the old tool tries a new name. Real trigger: an agent calling a tool its skill names but its configuration lacks. Expected: the call is refused as not exposed, and no Project is created.
  - SCN-A3 (from DS-001): both transports in the real app. The native AutoByteus runtime (local LM Studio model, real inference) and an MCP runtime (AGY with the repository's scripted CLI) both call the tools.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 `create_project` | Added | REQ-001, DS-001 | unit (parser/tool/parity), HTTP MCP e2e, AGY e2e (`project-change-feed`), real app on both transports |
| BEH-002 `update_project` | Added | REQ-002 | unit, HTTP e2e (boundaries, node-locality), real app |
| BEH-003 exposure of new names | Changed (name set grows) | REQ-003 | unit parity (3 runtimes), collision unit + e2e, real app (an agent without the tool is refused) |
| BEH-004 old tool kept; unknown names skipped | Preserved | REQ-004/005 | unit byte pins and parity, boundaries e2e old-name calls, AC-005 probes of both versions, real app on v1.5.5-beta.2 and the new build |
| `parseProjectMutation` | Removed | design Removal Plan | covered by the parity tests that pin old-tool errors |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | contract parsers, manifest dispatch | unit (107 cases) | none material | — |
| API / transport / contract | Yes | native tool classes; Agent Tools MCP manifest | unit native/MCP parity; HTTP MCP e2e | native transport is driven only by unit tests and no real model ever calls it | real app with the native runtime |
| Frontend component / state | No | tool picker lists registry names (unchanged) | — | the new tools must appear in the picker | real app (observe picker) |
| Browser integration / user journey | No source change | web probes only change configured lists | probes | regression only | browser probes (regression) |
| Authentication / session / permissions | Yes (MCP run sessions scope tools) | `enabledProjectTaskToolNames` | unit, boundaries e2e | — | real app |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | packaged server resources carry the new tools | isolated desktop instance |
| Process / lifecycle | Yes (cross-version transition) | release vs new build tool resolution | AC-005 module probe | the probe imports modules; it does not launch an agent in the release app | isolated instance of v1.5.5-beta.2 itself |
| Persisted-data transition | No (`Not Affected`) | — | — | existing definitions naming the old tool keep working | real app: old-only package agent |
| Worker / queue / distributed coordination | No | — | node-locality e2e | — | — |
| External integration | Yes (third-party MCP name collision) | `protect_static_adapter` | unit + e2e collision | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split` (branch `codex/project-tool-split`)
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL/MCP server (`autobyteus-server-ts`), Nuxt/Electron desktop (`autobyteus-web`)
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/TESTING.md` (no closer `TESTING*.md` on the changed paths)
- Conflicting, missing, or unclear project instructions: (1) Isolated instances pass only a system-baseline environment, so `ANTIGRAVITY_CLI_COMMAND` cannot be exported. It can be set through the server's own settings API (`updateServerSetting`, persisted in the instance's data-root `.env`, loaded before `server-runtime.js` is imported) and applied with `isolated-app restart`. (2) Rule "never use an installed app as proof of current source": the release app is used only as proof of release behavior (AC-005), never of this source.
- Required environment variables or secrets available: `Yes` for what is needed (no provider keys: the AGY CLI is scripted; LM Studio is local and needs no key)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | global testing strategy | layers and commands; clean env for E2E (`env -i PATH HOME=<temp> TMPDIR`); AGY scripted CLI with `RUN_AGY_FAILURE_E2E=1`; isolated instances with `--build`; never touch the user's app or data; local models: one run at a time, unload JIT models |
| `AGENTS.md`, `autobyteus-server-ts/AGENTS.md` | repo rules | stage paths explicitly; build outputs untracked |
| `docs/isolated-app-instances.md` | isolated desktop instances | `start --build`/`--app`, `restart`, `stop`; data root and log; browser automation via the control port |
| gated e2e headers (`tests/e2e/projects/*.e2e.test.ts`) | gates | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` |
| probe headers (`autobyteus-web/tests/e2e/*-probe.mjs`) | browser probes | need a current server build and Chrome; `--output-dir` fresh |
| `src/agent-packages/types.ts`, `src/api/graphql/types/agent-packages.ts` | package import | `importAgentPackage(input:{sourceKind: LOCAL_PATH, source})` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| server build | worktree | `pnpm -C autobyteus-server-ts build` | before e2e | log `exit 0` | — |
| packaged desktop build of the worktree | worktree | `pnpm --silent isolated-app start --build` | serialized after e2e (it rebuilds server resources) | start JSON `ok:true` | `isolated-app stop <id>` |
| v1.5.5-beta.2 release app | own temp dir `/tmp/pts-release-beta2.*` | `gh release download` (arm64 zip), unzip, `isolated-app start --app <.app>` | read-only release; never the user's installed app | start JSON | `stop`, then delete the temp dir |
| scripted AGY CLI | `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | wrapper script setting `AGY_FAKE_CASE=linked_skills` with an absolute node path | the instance's baseline PATH may lack node | agent replies `CALLED:` | wrapper is ticket evidence |
| LM Studio | host service (not mine) | already running, `qwen/qwen3.6-35b-a3b` | one local-model run at a time | `/v1/models` | unload a model only if my run loaded it JIT |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| test agent package (agents with new-only, old-only, mixed, none tool lists) | a LOCAL_PATH folder in the ticket evidence, imported with the public `importAgentPackage` mutation | instance-owned data root only | the package folder is kept as evidence; the data root is deleted at `stop` |
| Projects | created by the agents themselves through the tools | instance-owned | deleted with the data root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`
- Design-spec and implementation-handoff references: design §Persisted Data / State Transition Decision; handoff §Persisted Data Transition Check
- Representative existing-data setup and required behavior: an agent definition whose `toolNames` lists only `create_or_update_project` (the PTM package shape) keeps working in the new build
- Evidence planned: real-app old-only package agent (APP-OLD), boundaries e2e old-name calls
- Upstream ambiguity or reroute required: None

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/project-tasks/project-task-tools.test.ts` | new tools' schemas, results, errors by code and message; native/MCP parity; old tool's byte-pinned description and schema; old tool equals effective tool | AC-001, AC-002, AC-004, AC-007 | Still Valid | read; reviewer rerun | run |
| `autobyteus-server-ts/tests/unit/agent-execution/shared/project-tool-runtime-parity.test.ts` (new) | exposure on AutoByteus, Codex and Claude for none, new-only, old-only and mixed lists | AC-003, AC-005 (new side) | Still Valid | read | run |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` | first-party names win over same-named third-party MCP tools | AC-003 | Still Valid (generic over manifest names) | precedent COL-001 | run within the full unit suite |
| `tests/e2e/projects/project-task-boundaries.e2e.test.ts` | real HTTP MCP: new tools, old-name calls per mode, old-tool error parity, collision for new names | AC-001..AC-004 | Still Valid | read diff | run |
| `tests/e2e/projects/project-mutation-node-locality.e2e.test.ts` + `tests/fixtures/project-mutation-http-node.mjs` | node-local project mutation on two built nodes with the new names | AC-001, AC-002 | Still Valid | read diff | run (needs dist) |
| `tests/e2e/projects/project-change-feed.e2e.test.ts` | AGY manager issues `create_project`; feed publishes | AC-001 | Still Valid | read | run (AGY gate) |
| `tests/e2e/projects/{project-task-context-files-delegation,task-closure-root-visibility,task-existing-copy-assignment,task-reactivation-root-visibility}.e2e.test.ts` | Task journeys; only the manager's configured list changed | regression | Still Valid | diff | run (AGY gate) |
| other `tests/e2e/projects/*.e2e.test.ts` (unchanged) | Project/Task journeys | regression | Still Valid | — | run with the same gate |
| `tests/fixtures/codex-native-multi-agent-system.mjs` via `tests/e2e/runtime/codex-native-multi-agent-disabled.e2e.test.ts` | an ungranted project tool is disabled (`create_project`) | AC-003 | Still Valid | diff | Not run: live Codex gate (`RUN_CODEX_NATIVE_POLICY_LIVE`, paid). Edit is a one-name swap in an assertion. The same "not exposed" behavior is proven on real runtimes in APP-NONE and APP-OLD/APP-NEW cross-calls |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs`, `task-closure-tree-probe.mjs` | Projects UI and Task tree journeys; the manager's list changed | regression | Still Valid | diff | run |
| `tests/fixtures/app-data-migrations/retired-built-in-project-task-manager/*` | released-data history | — | Out Of Scope (records history; design leaves alone) | design Change Scope | none |

## Durable Coverage To Add

None planned. The repository already has durable cases for every AC at unit and HTTP level. The real-app journeys (AC-005, AC-006) need a packaged desktop instance and a downloaded release, which the repository's durable suites do not own. They stay ticket-owned temporary probes (see Temporary Executable Validation Plan).

## Durable Coverage To Update

None planned.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 0 | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web exec nuxt prepare` | worktree | current build | Pass | `evidence/api-e2e/server-build.log`, `nuxt-prepare.log` |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-tools/project-tasks/project-task-tools.test.ts tests/unit/agent-execution/shared/project-tool-runtime-parity.test.ts tests/unit/agent-tools/mcp --no-watch` | worktree | AC-001..AC-004, AC-007 (texts) | Pass (9 files, 167 tests) | `evidence/api-e2e/unit-changed.log` |
| 2 | `pnpm -C autobyteus-server-ts typecheck` | worktree | production src | Pass | `evidence/api-e2e/server-typecheck.log` |
| 3 | `pnpm -C autobyteus-server-ts test:unit` | worktree | regression | Pass (709 files, 5744 tests) | `evidence/api-e2e/server-unit-full.log` |
| 4+5 | one clean-env run of `vitest run tests/e2e/projects` with `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture>` (the ungated files run too) | clean env | HTTP MCP, node-locality, graphql, startup migration, AGY-gated journeys incl. the five edited files | Fail then Pass. Run 1: 16/17, `task-closure-root-visibility` 2/3 (test race, see below). After baseline fix `0205b9ed79`: 17/17, 82 passed | `server-e2e-projects-agy.log`, `server-e2e-projects-agy-2.log` |
| 6 | `pnpm -C autobyteus-web test:e2e:project-manager-ux --output-dir <fresh>` | worktree | Projects UI regression | Fail then Pass. 23/25 (PMU-008 stale fixture, PMU-021 unsettled baseline). After `50f228811f` and `dec87a3915`: 25/25 | `probe-pmu*/` (final `probe-pmu-5/`) |
| 7 | `pnpm -C autobyteus-web test:e2e:task-closure-tree --output-dir <fresh>` | worktree | Task tree regression | Pass (16/16) | `probe-tct/` |
| 8 | `node evidence/ac-005-tool-resolution-probe.mjs <server dir>` on the v1.5.5-beta.2 release's server, the worktree server and the packaged worktree build | throwaway HOME | AC-005 module-level resolution on the exact release | Pass | `ac005-probe-*.txt` |

Failure handling, per the user's direction and the corrected TESTING.md Rule 9: find the cause on the worktree and fix it, with no base comparison.

- `task-closure-root-visibility`: the wait was weaker than the assertion. Reproduced deterministically by delaying the second message. This was found before the direction, in my own base worktree.
- PMU-008: stale after `938933d8e2` removed the Team's `/worker` member.
- PMU-021: the center baseline was read before the host conversation settled, and the keyboard check reused it.
- TESTING.md "Known baseline exception" (`agent-status-websocket` integration, 2/7): traced to a product defect, `AGENT_INPUT_STATE` flushing the egress cadence window. Reported to `/project_task_manager`, which tracks it as PB-001; the exception note was removed.

## Test-Case Ledger Decision

- Ledger required: `Yes`. There are many independently meaningful cases, including long gated suites and real-app sessions on two app builds, and the run may be interrupted.
- Canonical ledger path: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-tool-split/tickets/in-progress/project-tool-split/api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | unit + HTTP/MCP e2e for AC-001..004; module probe of the exact release for AC-005 | AC-005/006 not yet in real apps | isolated instances of both versions |
| Changed-boundary execution directness | 92% | real scoped MCP sessions in e2e | packaged server resources not exercised | packaged build |
| Cross-boundary integration realism and mock gap | 85% | scripted AGY over real MCP | no real model, no packaged app | real Haiku 5.5 runs in the app |
| Environment, configuration, identity, and fixture fidelity | 90% | clean env, own data roots | package import path not exercised | LOCAL_PATH package import |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | error codes pinned; old-name calls | refusals in the release not seen | release instance |
| User-surface, browser, and desktop-shell confidence | 85% | probes pass after fixes | picker in the packaged app not seen | packaged app UI |
| Durable regression coverage quality and relevance | 92% | three suite defects fixed with causes | — | — |

- Overall post-repository confidence: 89% (simple average)
- Every critical AC directly proven, apart from parts only the user can check: `No` (AC-005 real-app side, AC-006)
- Any applicable category below `90%`: `Yes`. Integration realism and user surface are at 85%.
- Default clean-confidence target of `95%` met: `No`. That makes broader validation required. Final scores are in the execution report (95%).
- Material residual risks: listed in the execution report.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (fixed by AC-005's "real-app check in an isolated instance" and AC-006)
- Selected execution mode: `Project Desktop Validation`. These are isolated desktop instances of (a) the worktree build and (b) the published v1.5.5-beta.2 release, both with a LOCAL_PATH test package.
- Specific confidence gap: the new tools are never called by a real agent in the packaged app. The native transport is never called by a real model. The release side of AC-005 is proven only at module level.
- Why the selected mode can materially improve confidence: it runs the packaged server resources, the real exposure and resolver, real run sessions and the real package import, with real tool calls on both transports.
- Expected confidence after the selected validation: ≥ 95%
- Browser-specific decision and rationale: no renderer change. The renderer is used only to observe the tool picker, the conversation and the Projects page. Assertions come from GraphQL and the tool results.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron (packaged `AutoByteus.app`)
- Testing guideline used: `TESTING.md`, `docs/isolated-app-instances.md`
- Web-equivalent behavior: tool calls and results (server), Projects page
- Shell-specific or lifecycle behavior: packaged embedded server carries the new contract; release app launch
- Chosen validation approach: `pnpm --silent isolated-app start --build` (worktree) and `start --app <downloaded v1.5.5-beta.2>`
- Effect on any already-running desktop application: None. The user's app and another engineer's instance (`iso-54255-c1c9`) are left alone.
- Behavior not directly proven: see Not Tested.

## Live Environment And Fixture Plan

- Startup order: repository orders 0–8 → `isolated-app start --build` → `updateServerSetting(ANTIGRAVITY_CLI_COMMAND=<wrapper>)` → `restart` → import package → journeys → `stop`. Then `start --app <beta.2>` → same setting/restart/import → journeys → `stop`.
- Environment choices: AGY runtime with the scripted CLI (`AGY_FAKE_CASE=linked_skills`, MCP transport). For real inference, the user directed the Claude Agent SDK runtime with Haiku 5.5 (instance catalog id `haiku`), because there is no ChatGPT/Codex quota. This replaces the planned LM Studio native run.
- Health / readiness checks: start JSON `ok:true`, `/rest/health`, the agent's `CALLED:` reply
- Seed data / fixtures: package `evidence/api-e2e/test-package/` with four agents: `PTS New Tools` (`list_projects`, `create_project`, `update_project`), `PTS Old Tool` (`list_projects`, `create_or_update_project`), `PTS Transition` (all three plus `list_projects`), and `PTS No Project Tool` (`list_projects`).
- Requirement-linked journeys:
  - APP-NEW (AC-006, AC-001/002): the new-tools agent creates and updates a Project.
  - APP-OLD (AC-006, AC-004): the old-only agent creates and updates through the old tool.
  - APP-MIX (AC-005 new side): the transition agent launches and calls all three.
  - APP-NONE and the cross-calls (AC-003, SCN-A2): a tool that is not listed is refused.
  - APP-NATIVE (DS-001 native): native runtime, real model, new tools and old tool.
  - REL-MIX, REL-OLD and REL-NEW (AC-005 release side, on v1.5.5-beta.2): the transition agent launches without error and has only the old tool. The old-only agent works. The new-only agent launches without error and has no project mutation tool.
- Evidence to capture: GraphQL query results (agent definitions, `projects`, run conversation), tool-call results, server log excerpts, screenshots of picker/conversation/Projects page
- Owned processes and temporary state: the two isolated instances and their auto-created data roots; the release download dir

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| AC5-PROBE-REL / AC5-PROBE-NEW | existing ticket probe `evidence/ac-005-tool-resolution-probe.mjs` on the exact v1.5.5-beta.2 server resources and on the worktree | module-level tool resolution in both versions | it tests a released binary, which no repository suite can own |
| APP-* / REL-* | isolated desktop instances driven through GraphQL and the window (`evidence/api-e2e/app-journey.mjs`) | real-app AC-005/AC-006 | needs a packaged build and a downloaded release; the transition contract is removed in FU-2 |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| live Codex native-policy e2e (`codex-native-multi-agent-disabled`) | paid live gate; the edit swaps one tool name in a "disabled" assertion | low; the same refusal is proven on real runtimes in APP-NONE | No | none |
| Codex runtime in the real app | no ChatGPT/Codex quota (user). Claude (Haiku 5.5) and AGY ran in the app; the per-runtime catalog is covered by unit parity | low | No | none |
| AutoByteus-native agent run in the real app | the user directed real-model runs to Claude Agent SDK. Native registration is proven in the packaged server and native/MCP parity by unit tests | low | No | none |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`, updated. These are three baseline fixes (`0205b9ed79`, `50f228811f`, `dec87a3915`) and TESTING.md (`1c7eb70151`, `7af116e8de`), all listed in the execution report.
- Post-repository confidence: 89%; final 95% (execution report)
- Broader validation decision: `Required`; executed
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the result is in `api-e2e-execution-coverage-report.md`.

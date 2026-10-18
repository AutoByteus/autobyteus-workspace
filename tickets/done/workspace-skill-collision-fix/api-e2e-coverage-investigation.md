# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `tickets/in-progress/workspace-skill-collision-fix/requirements-doc.md` (SR-002, approved by the User 2026-10-18)
- Investigation Notes: `investigation-notes.md` (SR-001-only parts superseded per AR-001)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-002)
- Supplemental Task Artifacts: none behavior-defining; user evidence (read-only) `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/skill-path-collision-evidence/`
- Design Review Report: `design-review-report.md` (ARCH-REV-001, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- Current Investigation Round: 1
- Trigger: CRR-001 Pass from `/software_engineering_team/code_reviewer`, commit `810408bcee` on `codex/workspace-skill-collision-fix` (base `1c718202b2`)
- Prior Investigation Reviewed: N/A (first round)
- Latest Authoritative Investigation: this file, round 1

## Routing Classification

- Task size: `Large`
- Architectural risk: `Low`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the durable test changes)
- Proportional test-code review decision: `Required`

## Current Requirement And Design Basis

Exact restore of v1.5.6-beta.1 skill exposure for Claude, Codex and Grok on every workspace (REQ-101): the shared
`WorkspaceSkillMaterializer` links configured skills into `<workspace>/.<runtime>/skills/<name>`, accepts an existing
link to the same skill, repairs broken links, refuses a different workspace-owned entry for configured-skill agents and
prefers it for all-installed agents; Codex first runs its `skills/list` preflight and leaves natively discovered skills
alone. A brand-new run no longer depends on the member memory folder (REQ-102). The NFS-only private profile path is
removed (REQ-103). Antigravity, AutoByteus and non-skill NFS removals are unchanged (REQ-104). Regression tests cover
the user's setup (REQ-105). DEC-103: beta.1 quirks F2 (adopted same-skill link removed at run end) and F3 (AGY
`.agents/skills` refusal) ship unchanged, so no test asserts or forbids F2's removal at run end. QR-101: tests use only
test-owned workspaces, packages and app data.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-101 (new run in a workspace with same-skill links), SCN-102 (continue/restore),
  SCN-103 (brand-new run, member memory folder absent), SCN-104 (different same-named workspace skill).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-101/102 per runtime through the real server (GraphQL `createAgentRun` / `terminateAgentRun` /
    `restoreAgentRun`, agent WebSocket `SEND_MESSAGE`) with the real Claude, Codex and Grok CLIs, the agent being a
    package-imported agent whose configured skill lives at `<package>/agents/<agent>/skills/<skill>` (the user's shape),
    and the workspace holding absolute links to that folder in `.claude/skills`, `.codex/skills`, `.grok/skills`.
  - SCN-103 through a real team run: `createAgentTeamRun`, then the first message to a not-yet-started member that has
    configured skills (lazy member activation; the member memory folder does not exist before the message).
  - Codex `skills/list` against a real absolute link to the configured skill (user shape) → preflight classifies it
    `reconcile-discoverable`; the link is left untouched.
  - The user's journey in an isolated desktop instance: import package, start a run per runtime in the linked workspace,
    then "continue" after stopping.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-101 workspace-link exposure (Claude/Codex/Grok) | Changed (restored to beta.1) | REQ-101, AC-101..104 | Live runs per runtime with links (new + restore); collision refusal; all-installed preference |
| BEH-102 no memory-folder dependency | Changed | REQ-102, AC-105 | Brand-new single run and brand-new team member run, live |
| BEH-103 NFS private profile removed | Removed | REQ-103, AC-106 | Code search + typecheck (re-run) |
| BEH-104 AGY/AutoByteus/non-skill NFS unchanged | Preserved | REQ-104, AC-107 | AGY scripted linked-skills smoke; full unit/integration suites; diff check |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | materializer callers, bootstrappers, ACP factory, guard, wiring | unit regression (15 cases), restored beta.1 unit/integration tests | none material | — |
| API / transport / contract | Yes (indirect) | run create/restore through GraphQL/WebSocket reaches the restored preparation | bootstrapper-level E2E with fake Codex client | full server path with real runtimes not run | Live server E2E (gated) |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | Yes (journey) | user's run/continue journey | none | real app path | Isolated desktop instance |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No change | — | — | — | — |
| Desktop shell / Electron-specific integration | No change; embedded server env differs (only `CODEX_HOME` passes) | — | — | runtime discovery inside the packaged server | Isolated desktop instance |
| Process / lifecycle | Yes | run end/restore release of links; preparation failure release | unit tests | real CLI processes | Live server E2E |
| Persisted-data transition | No (`Not Affected`) | beta.2 leftover `runtime-skill-profiles` folders inert (F4) | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | Claude SDK project skill load, Codex `skills/list`, Grok `.grok/skills` discovery | mocked only | real CLI discovery of a linked skill | Gated live suites + new live E2E |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix`
- Project type: pnpm monorepo; Node/TypeScript Fastify server (`autobyteus-server-ts`), Nuxt/Electron desktop (`autobyteus-web`)
- Project testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/TESTING.md`; no closer `TESTING*.md`
- Conflicting instructions: none
- Required environment: real CLIs signed in on the host (`claude` 2.1.302, `codex` 0.163.0, `grok` 1.0.62, `agy` 1.4.2) — available; no secret values recorded

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | global test strategy | server unit/integration/typecheck; gated live suites with `RUN_*`; clean env `env -i PATH HOME USER LOGNAME TMPDIR` (real HOME for signed-in CLIs); never edit `~/.codex`/`~/.claude`/`~/.grok`; isolated instance via `pnpm --silent isolated-app start --build`; only `CODEX_HOME` reaches the embedded server; stop what you start |
| `docs/isolated-app-instances.md` | isolated desktop instance | start/list/stop/restart JSON; control port for browser automation; never touch other instances |
| `AGENTS.md`, `DESIGN.md` | repo rules | test file header documents gate/command/cases |
| `autobyteus-server-ts/tests/e2e/runtime/grok-build-live-runtime.e2e.test.ts`, `claude-agent-auth-marker-reply.e2e.test.ts` | live E2E patterns | `startStudioE2eRuntimeServer`, GraphQL run lifecycle, WebSocket stream |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | package-import pattern | `importAgentPackage(LOCAL_PATH)`, `agents/<id>/agent-config.json` `skillNames`, package-private skill folder |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Test-owned server (in-process) | `autobyteus-server-ts` | `vitest run <file>` | temp data dir, port 0 | GraphQL `runtimeAvailability` | `afterAll` closes app, removes temp dirs |
| Real CLIs | host | — | host login, real HOME | catalog query | runs terminated by test |
| Isolated desktop instance | repo root | `pnpm --silent isolated-app start --build` | own data root/ports | `start` JSON | `pnpm --silent isolated-app stop <id>` |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent package with configured skill | written to OS temp, imported via GraphQL `importAgentPackage` | test-owned only (QR-101) | removed in `afterAll` |
| Workspace with `.claude/.codex/.grok/skills/<s>` absolute links | created in OS temp | never the user's repos | removed in `afterAll` |
| App data / DB | temp data dir / isolated instance data root | never `~/.autobyteus` | removed |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/backends/workspace-skill-link-regression.test.ts` | user-shape links, brand-new member folder, collision, all-installed, per runtime (mocked Codex `skills/list`) | AC-101..105 | Still Valid | code read; reviewer rerun | Run |
| `tests/unit/agent-execution/backends/{claude,codex,grok,acp,shared}/**` | restored beta.1 tests | AC-103/104/107 | Still Valid | restore proof | Run |
| `tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` (RUN_CODEX_E2E) | real `skills/list`: repo-local skill discovered, broken link repaired, missing skill materialized | AC-101/103 | Still Valid | beta.1 file | Run live; add user-shape case |
| `tests/integration/agent-execution/claude-session-manager.integration.test.ts`, `claude-agent-run-backend-factory.integration.test.ts` (RUN_CLAUDE_E2E) | real Claude session create/restore through the restored session manager/cleanup (no configured skills) | AC-107 regression | Still Valid | — | Run live |
| `tests/integration/agent-execution/codex-agent-run-backend-factory.integration.test.ts` (RUN_CODEX_E2E) | real Codex backend turns | AC-107 regression | Still Valid | — | Run live (selected) |
| `tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts` | imported package skills reach Codex/Claude bootstrappers; brand-new run with/without links | AC-101/105 | Still Valid | — | Run |
| `tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts` | GitHub skill sources through runtime preparation | AC-107 | Still Valid | — | Run |
| `tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` (RUN_AGY_FAILURE_E2E, scripted) | AGY capsule linked skills | AC-107 (BEH-104) | Still Valid | — | Run (AGY smoke) |

## Durable Coverage To Add

| Case ID | Behavior / Boundary | Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-03 | Codex `skills/list` on a real absolute link to the configured skill → `reconcile-discoverable`, link untouched | AC-101, design DS-101 Codex preflight | new case in `tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | the unit regression test fakes the `skills/list` path report; only a real Codex proves how it reports a linked skill |
| API-05..API-08 | real server + real CLIs: new run and restore with links per runtime, skill used; collision refusal; all-installed preference; brand-new team member | AC-101, 102, 104, 105 | new gated file `tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` (RUN_CLAUDE_E2E / RUN_CODEX_E2E / RUN_GROK_E2E per runtime) | the bugs shipped because no test ran the user's setup through the real run path; this is the release-smoke shape requested in F6 |

## Durable Coverage To Update

None.

## Durable Coverage To Remove

None (implementation already removed the private-path-only tests; reviewed in CRR-001).

## Repository Coverage Execution Plan And Results

See the execution coverage report and the ledger for results.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts typecheck` + AC-106 search | worktree | REQ-103/104 | see report | `evidence/` |
| 2 | `vitest run` regression + backends unit | server | AC-101..105 (mocked runtimes) | see report | `evidence/` |
| 3 | `test:unit`, `test:integration` | server | AC-107 | see report | `evidence/` |
| 4 | E2E private skills + GitHub skill sources (clean env) | server | AC-101/105 server import path | see report | `evidence/` |
| 5 | RUN_CODEX_E2E bootstrapper integration (+ new case) | clean env, real HOME | AC-101 real `skills/list` | see report | `evidence/` |
| 6 | RUN_CLAUDE_E2E session manager/factory integration | clean env, real HOME | AC-107 Claude restored session path | see report | `evidence/` |
| 7 | new live E2E per runtime | clean env, real HOME | AC-101, 102, 104, 105 | see report | `evidence/` |
| 8 | RUN_AGY_FAILURE_E2E linked skills (scripted) | clean env | BEH-104 | see report | `evidence/` |

## Test-Case Ledger Decision

- Ledger required: `Yes` — many independent live cases across three paid runtimes and a desktop instance; interruption-prone.
- Canonical ledger path: `tickets/in-progress/workspace-skill-collision-fix/api-e2e-test-case-ledger.md`

## Broader Validation Decision

- Decision: `Required`
- Selected execution mode: Live API (real server + real CLIs) and Project Desktop Validation (isolated instance)
- Gap: real runtime discovery of a linked skill, the full server run path (create/restore/team lazy activation), and the
  packaged embedded server environment
- Desktop: no shell change; the instance proves the user's journey on the packaged worktree build with its reduced
  server environment. The user's running AutoByteus and other instances (e.g. `iso-54255-c1c9`) are not touched.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| F2 removal of a user-created same-skill link at run end | DEC-103: beta.1 quirk ships unchanged; deliberately not asserted | known, accepted | No | F2 |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added: `Yes` (API-03 case, new live E2E file)
- Post-repository confidence / broader validation: recorded in the execution coverage report (final 95%, broader validation executed)
- Revisions during execution: restored live gated tests were found stale. Codex bootstrapper and Claude fixtures were baseline-fixed (`1f9aae5817`). The older Codex live suites and the Claude browser-tool cases are out of scope (stale since before beta.1). Grok native discovery observation → follow-up F7.
- Reroute Required Before Validation Execution: `No`

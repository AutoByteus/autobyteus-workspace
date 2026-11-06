# API/E2E Coverage Investigation

The plan. Results, confidence and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, approved within the direction)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001, Small / Low)
- Supplemental Task Artifacts: none
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation IR-001 handed to API/E2E on the direct route
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-version-prerelease-compare`, branch
`codex/runtime-version-prerelease-compare`, code under test `b472fae14a` (head `d75db79bf5`), base `origin/personal`
`b78fd86fe4`.

## Current Requirement And Design Basis

`extractRuntimeVersion` keeps a SemVer prerelease and drops build metadata (REQ-001, AC-001);
`compareRuntimeVersions` orders by SemVer 2.0.0 precedence (REQ-002, AC-002/003) wherever runtimes are compared: the
Agent Runtimes status service (update available `:200`/`:299`, update succeeded `:341`, AC-005) and the Grok and AGY
minimum-version gates (BEH-003, AC-004). Observable success: Settings → Agent Runtimes shows `0.2.2-rc.1` for dsh and
reports an update when the latest is `0.2.2`. No web change; persisted data not affected.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (page), SCN-002 (Update button), SCN-003 (gates).
- Added: a prerelease installed that is newer than the latest stable (e.g. `0.171.0-rc.1` installed, `0.170.0`
  latest): the page must not offer an "update" to an older release. Real trigger: a user on a runtime's preview channel.
- Contrived / not tested: none recorded.

## Changed Behavior Summary

| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 full version shown, precedence for update state | Changed | REQ-001/002 | GraphQL E2E with a scripted runtime; real dsh row; rendered page |
| BEH-002 update outcome by precedence | Changed | REQ-002, AC-005 | GraphQL E2E Update journey `prerelease → release` |
| BEH-003 gates use the shared rule | Changed | DEC-002, AC-004 | unit (IMP-02); real runtimes' versions read on the page (AC-001 real texts) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `runtime-version.ts`, two gates | unit (IMP-00/02) | — | — |
| API / transport / contract | Yes (values only) | `agentRuntimes` GraphQL `installedVersion`, `updates.latestVersion/state`, `operation.fromVersion/toVersion` | none end to end | rows through the real server and CLI process boundary | server E2E |
| Frontend component / state | No code change | renders strings as given | — | page shows the new string | desktop instance |
| Desktop renderer | Yes (displayed value) | Agent Runtimes row | — | — | isolated desktop instance |
| External integration | Yes | real `--version` texts of installed runtimes, npm registry for dsh | unit with copied texts | real CLIs' texts | real server reading real CLIs |
| Others (auth, persistence, workers, shell) | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root); no closer guideline.
- Conflicts / gaps: none.
- Changed build-input paths (TESTING.md Fresh-start build): none (`git diff --name-only b78fd86fe4...HEAD` = server `src`, server unit tests, a server doc and ticket files; new tests are in an existing project but compile with the existing server type check, which IMP-01 ran). No fresh-start case.
- Secrets: test vault READY with `provider.deepseek.api-key` (only the dsh row's key state uses it; no model call).

| Instruction / Configuration Path | Authority | Learned |
| --- | --- | --- |
| `TESTING.md` | testing rules | server E2E under `env -i … HOME=<temp>`; isolated instance via `pnpm --silent isolated-app start --build`, data root `.env` for runtime overrides |
| `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` header | scripted runtime CLIs, stubbed vendor sources | `codex-version`, `codex-update-to` state files; Codex latest from the stubbed release redirect |
| `tests/e2e/runtime/deepseek-harness-live.e2e.test.ts` header | real dsh | gate `RUN_DEEPSEEK_HARNESS_E2E=1`, `DEEPSEEK_HARNESS_COMMAND`, test vault |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| `tests/unit/runtime-management/agent-runtimes/runtime-version.test.ts` (new) | AC-001/002/003 | REQ-001/002 | Still Valid | Reuse IMP-00/02 |
| `agent-runtime-status-service.test.ts` (+cases) | AC-002, AC-005 | REQ-002 | Still Valid | Reuse IMP-02 |
| Grok and AGY capability tests (+cases) | AC-004 | BEH-003 | Still Valid | Reuse IMP-02 |
| `tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` AR-01…AR-13 | rows, update, sign-in with release versions | AC-004 (preserved) | Still Valid | Run; add a prerelease case |
| `tests/e2e/runtime/deepseek-harness-live.e2e.test.ts` case 1 | dsh row installed + key state | SCN-001 | Needs Update | assert the full installed version and the update state |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | AC-001…AC-005 (unit) | server unit, typecheck | Reused | IMP-00, IMP-01, IMP-02 at `b472fae14a` | Same commit (head adds docs only) |
| API-01 | AC-002, AC-005, AC-004, REQ-001 | real GraphQL API, real CLI process (scripted Codex) | Durable | `agent-runtimes-graphql.e2e.test.ts` with new AR-14: installed `0.170.0-alpha.2`, latest `rust-v0.170.0` → full version, Update available; Update → "Updated from 0.170.0-alpha.2 to 0.170.0", re-check Up to date; installed `0.171.0-rc.1` vs latest `0.170.0` → Up to date | Proves the status service's three comparisons end to end |
| API-02 | AC-001, SCN-001 | real dsh `0.2.2-rc.1`, npm registry, real server | Durable (updated live case) | live suite `-t 'is available'` asserting `installedVersion` = dsh's own `--version`, update state from the registry | Real version text and real latest source |
| API-03 | SCN-001, AC-001 (real texts) | Settings → Agent Runtimes in an isolated instance of this worktree's build | Journey | `pnpm --silent isolated-app start --build --data-root <own>` (`.env`: `DEEPSEEK_HARNESS_COMMAND`), open the page, read every row, screenshot | The success definition is the page; also reads the other four real CLIs' texts |

| API-04 | AC-004, REQ-002 | other E2Es on the status service (update notifications, running agents, available runtimes) | Existing Test | `vitest run` of the three files | Added during the round: they compare runtime versions through the same service |
| API-05 | gate | server typecheck with the changed tests | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | Added during the round |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update

| Case ID | Path | Change |
| --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts` | Add AR-14; baseline fix: five runtimes, the fifth pinned not installed (found in API-01 run 1) |
| API-02 | `autobyteus-server-ts/tests/e2e/runtime/deepseek-harness-live.e2e.test.ts` | Case 1 asserts the full version and the update state |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Web-equivalent behavior only (row text); no shell change. Isolated instance of this worktree's build, own data root,
  the user's running app untouched.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? | Follow-up |
| --- | --- | --- | --- | --- |
| A real Update of dsh from the page | Would change the machine's dsh install (not test-owned) | Low: the outcome comparison is proven with the scripted CLI | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable coverage added / updated: `Yes`
- Reroute Required: `No`

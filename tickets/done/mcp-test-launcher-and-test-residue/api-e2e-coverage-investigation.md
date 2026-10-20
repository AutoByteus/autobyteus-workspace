# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (`SR-002`, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (`SR-001`, `SR-002`)
- Design Spec (required on every route): `design-spec.md` (`SR-002`, D-1…D-6; Small / Low)
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (architecture review not selected, Small / Low)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-002, Checks Run IMP-01…IMP-09)
- Implementation Revision Record: `implementation-revision-record.md` (IR-001, IR-002)
- Code Review Report: `N/A — not applicable` (direct low-risk route, no source review)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation engineer's direct-route handoff, 2026-10-20 (HEAD `7c9cadba2f`)
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

All paths are relative to the ticket folder `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue/tickets/in-progress/mcp-test-launcher-and-test-residue/`.

## Current Requirement And Design Basis

Test-only change (13 test files, no product `src`). What must be proven:

- REQ-001 / AC-001 / AC-002: the Python MCP test server is launched as `/usr/bin/env UV_PROJECT_ENVIRONMENT=… UV_CACHE_DIR=… PYTHONDONTWRITEBYTECODE=1 <uv> run …`; the stdio config `env` carries none of these; if product env delivery is lost, `uv` still uses the temp venv and writes nothing into `autobyteus-ts/tests/fixtures/mcp-test-server/`.
- REQ-002 / AC-003 (preserved): the env/cwd and pid-file cases still prove product env delivery for both implementations, and fail when delivery is removed.
- REQ-003 / AC-004: the skip reason carries uv's whole error block (offline case: up to the `.whl` URL); `uv` missing still reports `uv unavailable (not on PATH)`; a preparation failure is a skip, never a pass.
- REQ-004 / REQ-005 / REQ-006 / AC-005: the core library, server unit and server e2e runs leave no new `git status --ignored` entry except build outputs and `autobyteus-server-ts/tests/.tmp/`; the touched tests create their dirs under the OS temp dir and remove them in teardown.
- AC-006 / QR-001: every touched test passes as before, same counts, no new skips, no material slowdown.
- REQ-007 / AC-007: each `TASK_EXECUTION_STARTED` rejection payload in the contract e2e case differs from a valid payload only in its named field, shown by two mutations.

Architecture review and code review were not selected (direct Small / Low route); the design spec and its classification are present.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (MCP integration run), SCN-002 (preparation failure skip), SCN-003 (core library and server unit runs), SCN-004 (server e2e run), SCN-005 (Team stream contract rejection).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-001-R (regression sensitivity): a developer's run after a product regression that drops stdio env delivery. Trigger: the documented MCP command with the product transport mutated. Needed because REQ-001's whole point is the outcome under that regression; a negative control on the base launcher shows the check can see the old failure.
  - SCN-003/004-T (temp-dir teardown): the same documented suite runs, observed on the OS temp side. Trigger: the documented commands with a run-owned `TMPDIR`. Needed because REQ-004/REQ-005 require removal in teardown, which a worktree-only `git status` diff does not show.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): None recorded. Out of scope per the Scope Guardrail: gated `RUN_*` suites, the opt-in `real-user-kind-mcp-server.test.ts` (DEC-004), web/Electron tests.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 launcher `serverCommand('python')` | Changed | D-1; launcher diff | Inspect config; probe the command with a minimal env; mutate product env delivery |
| BEH-001 product env delivery assertions | Preserved | REQ-002 | Run env/cwd and pid cases; prove they fail under the mutation |
| BEH-002 `uvError` | Changed | D-2 | Force offline failure; force `uv` absent |
| BEH-003 five core test files + agent-runtime case | Changed | D-3, D-4 | Residue diff around `pnpm -C autobyteus-ts test`; leftover check in a run-owned `TMPDIR` |
| BEH-004 five server e2e files | Changed | D-5 | Residue diff around `pnpm test:e2e` (server built); leftover check in a run-owned `TMPDIR` |
| BEH-005 server unit leaves nothing | Preserved | probe P-5 | Residue diff around `test:unit` |
| BEH-006 contract rejection payloads | Changed | D-6 | Run the file; two mutations |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? (`Yes`/`No`) | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | — | — | — | — |
| API / transport / contract | Yes (test side) | Test launcher → product `StdioManagedMcpServer` → SDK `StdioClientTransport` → `/usr/bin/env` → `uv run`; contract test payloads vs `parseTeamStreamServerMessage` | MCP integration folder (real Python and Node servers, real product client); contract e2e file against the built contracts package | Whether the location really is independent of env delivery: needs a mutation, not only a pass | Temporary product mutation + negative control (CLI) |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No | — | — | — | — |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | Yes (test side) | `/usr/bin/env` execs `uv` in place (pid identity for pid-file / kill cases); test teardown of temp dirs; e2e `afterAll` order after `app.close()` | pid-file cases in the MCP folder; full suite runs | Leftover temp dirs outside the worktree are invisible to `git status` | Run-owned `TMPDIR` leftover check (CLI) |
| Persisted-data transition | No (`Not Affected`) | — | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | Yes | `uv` 0.10.2 CLI (error format, env handling) | Real `uv` in the MCP folder; forced offline failure | Error format across uv versions (design accepts; fallback = last line) | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue`, branch `codex/mcp-test-launcher-and-test-residue`, HEAD `7c9cadba2f` (base `origin/personal` `aac5da3112`)
- Project type and runtime stack: pnpm monorepo; TypeScript, vitest 4.0.18; node v22.23.1; uv 0.10.2 (Homebrew); macOS Darwin 25.5.0
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue/TESTING.md` (root). No closer `TESTING*.md` under `autobyteus-ts/` or `autobyteus-server-ts/`.
- Conflicting, missing, or unclear project instructions: None. TESTING.md "Rerun by impact" would let IMP-01…IMP-06 stand for most files; I rerun them on HEAD anyway because they are cheap and this round is the independent check (see Planned Cases).
- Required environment variables or secrets available: `N/A` (credential-free suites)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing guideline | Core MCP: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp`; core: `pnpm -C autobyteus-ts test`; server unit: `pnpm -C autobyteus-server-ts test:unit`; e2e: `pnpm test:e2e` after `pnpm -C autobyteus-server-ts build`; one file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`; clean env with resolved temp `HOME`; Rule 9 (no "pre-existing/flaky" without cause); Rerun by impact; serialize builds |
| `AGENTS.md` (root), `autobyteus-server-ts/AGENTS.md` | Repository / package instructions | Use `--no-watch`; TESTING.md authoritative |
| `package.json` (root) | Scripts | `test:e2e` = `pnpm --filter autobyteus-server-ts test --run tests/e2e` |
| `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts` header | Fixture launch contract | Venv/cache default under `os.tmpdir()`; caller may set `UV_PROJECT_ENVIRONMENT` / `UV_CACHE_DIR`; preparation failure = skip with reason |
| `autobyteus-server-ts/vitest.config.*` (per investigation notes) | Runner | `pool: forks`, per-file isolation, `fileParallelism: false` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree root | `pnpm -C autobyteus-server-ts build` on HEAD | Writes `dist/` (build output, excluded from AC-005) | exit 0, `dist/app.js` present | Left in place (build output) |
| Python MCP fixture | `autobyteus-ts/tests/fixtures/mcp-test-server` | Launcher's `uv sync --frozen` | Venv under the run's `TMPDIR`; cache: existing `/var/folders/…/T/autobyteus-mcp-test-server-uv-cache` passed as `UV_CACHE_DIR` where a run-owned `TMPDIR` is used | `[mcp-test-server] python: used: …` | Run-owned `TMPDIR` removed after evidence is taken |
| Test-owned servers / DB | `autobyteus-server-ts` | Started by the e2e suites themselves | `tests/.tmp/autobyteus-server-test.db` (designated, DEC-005) | suite output | Suites stop their own servers |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Clean HOME per run | `HOME="$(cd "$(mktemp -d)" && pwd -P)"` | Never the user's `~/.autobyteus`; `env -i` drops inherited `AUTOBYTEUS_*` | Removed after the run |
| Run-owned `TMPDIR` per suite (leftover check) | `mktemp -d`, resolved path | Isolates temp leftovers of this run from other work | Listed, then removed |
| Offline-failure state (AC-004) | `UV_OFFLINE=1`, empty `UV_CACHE_DIR`, fresh `UV_PROJECT_ENVIRONMENT` | Temp dirs only | Removed |
| Mutations (AC-002, AC-007) | Uncommitted edits, reverted with `git checkout -- <file>` | `git status` checked clean afterwards | Reverted; diffs kept as evidence |

## Persisted Data Transition Coverage Basis (When Applicable)

Not applicable: design decision `Not Affected` (test artifacts only).

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/tools/mcp/stdio-managed-mcp-server.test.ts` | Product stdio client against real Python and Node servers: tools, env/cwd delivery, pid-based close, exit-at-start, hang | REQ-001, REQ-002; AC-001, AC-003 | Still Valid | unchanged file; uses the changed launcher | Run (API-01) and under mutation (API-03) |
| `autobyteus-ts/tests/integration/tools/mcp/{http-managed-mcp-server,tool-registrar}.test.ts` | HTTP launch and registrar `stdio_params` via the same launcher | REQ-001 | Still Valid | unchanged; `startHttpTestServer` gets the new command | Run (API-01, API-03) |
| `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts` | Shared launcher (D-1, D-2) | REQ-001, REQ-003 | Still Valid (changed as designed) | diff reviewed | Exercised by API-01…API-06 |
| Five core files (`config-service`, unit+integration `edit-file`, `read-file`, `write-file`) | Tool / service assertions; now temp dirs under `os.tmpdir()` + `afterEach` removal | REQ-004; AC-005, AC-006 | Still Valid | diff: only location + teardown, no `it(` changed | API-08 |
| `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts` | Runtime cases; "Agent facade" case now sets `memoryDir` | REQ-004 | Still Valid | diff | API-08 |
| Five server e2e files (`file-explorer/*` ×4, `workspaces/workspaces-graphql`) | GraphQL/WebSocket workspace behavior; now temp app data dir | REQ-005; AC-005, AC-006 | Still Valid | diff: `beforeAll` / `afterAll` only | API-08 |
| `autobyteus-server-ts/tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` | Current contract accepts current shapes; rejects retired event and fields | REQ-007; AC-007 | Still Valid (fixed as designed) | diff: `source` added to two payloads | API-07, API-08 |
| `autobyteus-ts/tests/integration/tools/mcp/real-user-kind-mcp-server.test.ts` | Opt-in user-style server check | DEC-004 | Out Of Scope | requirements Out Of Scope | Stays skipped (gate unset) |

## Planned Cases

All run on HEAD `7c9cadba2f` (code identical to `9a1f560454`). The implementation's IMP-01…IMP-09 would mostly hold under Rerun by impact (no `src` change since `dc530fdcb0`; the launcher and core files are unchanged since IMP-01…IMP-06). I rerun them independently on the final commit rather than reuse them, because each is cheap and AC-005's full e2e residue diff has not run on the rebased commit.

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-003; REQ-001, REQ-002 | MCP client ↔ real Python/Node servers, stdio + HTTP + registrar | Existing Test | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp --reporter=verbose`; list fixture folder before/after | Documented layer; final commit |
| API-02 | AC-001, AC-002; REQ-001 | Launcher config → `/usr/bin/env` → `uv run` → Python | Temporary Probe | Throwaway vitest file next to the launcher: print the Python stdio config (command, args, env) for a pid-file + env case; spawn its command/args with env `{PATH, HOME}` only, running `python -c` that prints `sys.prefix`, `sys.dont_write_bytecode` and the three variables seen by Python; list the fixture folder; delete the probe | Probing the config shape and a minimal-env launch is a one-off check, not a durable assertion (the design forbids a product hook; a durable test asserting launcher internals would pin implementation detail) |
| API-03 | AC-002, AC-003; REQ-001, REQ-002 | Product env delivery removed | Temporary Probe (mutation) | Remove `env: config.env` in `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts`; run the whole MCP folder (clean env); list fixture folder and `git status` of it; revert | Mutation is by definition temporary |
| API-04 | AC-002 (sensitivity) | Same, with the base launcher | Temporary Probe (negative control) | Same mutation + launcher file from `aac5da3112`; run `stdio-managed-mcp-server.test.ts`; expect `<fixture>/.venv` to appear; revert both files and remove that `.venv` | Shows the API-03 check can detect the old dependency |
| API-05 | AC-004; REQ-003 | `preparePython` / `uvError` with real uv failure | Existing Test (forced env) | `env -i … UV_OFFLINE=1 UV_CACHE_DIR=<empty> UV_PROJECT_ENVIRONMENT=<fresh> pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp/stdio-managed-mcp-server.test.ts --reporter=verbose` | Real uv error output |
| API-06 | AC-004 alternate | `preparePython` without uv | Existing Test (forced env) | Same file with `PATH` minus every dir containing `uv` (keeping node/pnpm) | Alternate outcome |
| API-07 | AC-007, AC-006; REQ-007 | Contract parser via the e2e file | Existing Test + Temporary mutations | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts --no-watch --reporter=verbose` (clean env); then mutation A (remove `settled_at: null`), mutation B (add `delegator_agent_run_id`), one at a time, each reverted | Mutations are temporary by definition |
| API-08 | AC-005, AC-006, QR-001; REQ-004, REQ-005, REQ-006 | Full suites vs worktree and OS temp | Existing Test (full suites) | Build server on HEAD; snapshot `git status --ignored --porcelain --untracked-files=all` (minus `node_modules`, `?? tickets/`); run `pnpm -C autobyteus-ts test`, `pnpm -C autobyteus-server-ts test:unit`, `pnpm test:e2e`, each with clean env and its own run-owned `TMPDIR`; snapshot after each; diff; list leftovers in each `TMPDIR` for the touched files' prefixes; compare counts and durations with the base logs | AC-005 on the final commit, plus the teardown half of REQ-004/REQ-005 |
| API-09 | AC-006; REQ-004, REQ-005, REQ-007 | The 12 touched files | Existing Test (added during execution) | 6 core and 6 e2e touched files with `--reporter=verbose`, clean env; declaration counts at `aac5da3112` vs HEAD | API-08's full-suite default reporter prints no per-file lines for fast files; AC-006 needs per-file counts |

- Test progress log needed (more than one case, or a long case): `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

None. The change is itself durable test code; the remaining proofs are mutations and probes that cannot be durable without a product hook (forbidden by the design's Dependency Rules) or that measure the suite run itself (residue).

## Durable Coverage To Update

None planned. If a case shows a touched test is wrong, it is a `Local Fix` routed back, not edited here.

## Durable Coverage To Remove

None.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Linux (`/usr/bin/env` present) and Windows (Python impl skips) | Only macOS available | Low: `/usr/bin/env` is POSIX; Windows path unchanged (no `uv` lookup) | No | None |
| Other uv versions' error format | Only uv 0.10.2 installed | Low: no line counting; fallback = last line | No | None |
| Gated `RUN_*` suites, opt-in real-user MCP test | Out of scope (requirements) | — | No | None |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: mutations are reverted and checked with `git status` before the next case.

# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/design-spec.md`
- Supplemental Task Artifacts: `evidence/` (baseline inventories, implementation evidence), `handoff-architecture-design-complete.md`
- Design Review Report: `N/A — not applicable` (direct route)
- Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (same folder)
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md` (same folder)
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 from `implementation_engineer` (direct Medium/Low route)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

The deliverable is a green, reproducible, environment-isolated server test baseline: `tests/unit` 0 failures (AC-001), the same with the agent shell's inherited live-app variables (AC-002), `tests/integration` 0 failures from a fresh worktree via the documented prepare/check commands with one clear prerequisite message when artifacts are missing (AC-003), no writes to user data under inherited env (AC-004), a real `typecheck` of production `src` that fails on a type error (AC-005), traceable test changes with no new skips/deletions (AC-006), product defects fixed only if small and clearly intended, otherwise reported to the user before Done (AC-007), and docs + latest-base re-run at delivery (AC-008). REQ-005 (user-approved) allows a test that cannot be fixed within this ticket to stay failing as a documented exception, not skipped. No production `src` may change except under REQ-005. Design: DS-001 (isolation setup first in `setupFiles`, scoped to `tests/unit/` and `tests/integration/` by `expect.getState().testPath`), DS-002 (`integration-test-prerequisites.mjs` `check`/`prepare`), DS-003 (`tsc -p tsconfig.build.json --noEmit`).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (unit run), SCN-002 (integration run with prerequisites), SCN-003 (typecheck), SCN-004 (agent shell with inherited live-app variables).
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-002a: a developer/agent on a brand-new worktree runs `test:integration` before ever preparing (real trigger: the documented command); must get the single prerequisite message.
  - SCN-001a: unit suite on a worktree that has only `install` + `prebuild` (the TESTING.md order runs `test:unit` before `test:integration:prepare`), so the unit suite must not depend on prepare-only artifacts.
  - SCN-004a: an agent sets an opt-in gate (`RUN_*`) in its inherited-env shell; the gate must still enable the gated tests after isolation.
  - SCN-004b: the documented `pnpm` scripts (not a raw `vitest` invocation) run from the agent shell: the vitest main process and `globalSetup` keep the inherited environment; only workers are isolated.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 unit suite green | Changed | U1–U13, E1 fixes | Full unit runs (clean ×2, sentinel ×1) on a fresh worktree |
| BEH-002 integration prerequisites | Added | `scripts/integration-test-prerequisites.mjs`, package scripts | Fresh-worktree check-before-prepare, prepare, then run |
| BEH-003 integration suite green | Changed | I1–I15 fixes | Full integration runs (clean ×2, sentinel ×1) |
| BEH-004 typecheck | Changed | `typecheck` script | Run + negative probe |
| BEH-005 env isolation | Added | `tests/setup/test-environment-isolation.ts`, `vitest.config.ts` | Sentinel inherited-env runs; gate-activation probe |
| PB-001 (product, `src` unchanged) | Preserved (defect reported) | handoff § PB-001 | Independent cause confirmation; documented exception under REQ-005 |
| Production `src` | Preserved | `git diff ebf68c4af..HEAD -- autobyteus-server-ts/src` empty | Diff check |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No | Tests only; `src` unchanged | Suites | — | None |
| API / transport / contract | No (tests of it changed) | Integration tests of REST/GraphQL/WebSocket | Integration suite | — | None |
| Frontend component / state | No | — | — | — | N/A |
| Browser integration / user journey | No | — | — | — | N/A |
| Authentication / session / permissions | No | — | — | — | N/A |
| Desktop renderer / web-equivalent UI | No | — | — | — | N/A |
| Desktop shell / Electron-specific integration | No | — | — | — | N/A |
| Process / lifecycle | Yes (developer tooling) | Test-run process env, prerequisite build pipeline, typecheck script | The documented commands themselves are the real surface | Fresh-worktree behavior; inherited agent-shell env; gate activation | CLI (documented `pnpm` scripts on fresh worktrees, clean + inherited env) |
| Persisted-data transition | No | `Not Affected` | — | User data must stay untouched | Sentinel + read-only `~/.autobyteus` watch |
| Worker / queue / distributed coordination | No | — | — | — | N/A |
| External integration | Partially | Opt-in gated live suites keep their gate variables | Gate activation probe | Live provider suites not run (paid/credentialed) | One cheap loopback-only gate |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green` (branch `codex/base-test-suite-green`, HEAD `0e56d0a9f`)
- Project type and runtime stack: pnpm workspace; `autobyteus-server-ts` Node 22 / TypeScript / Vitest 4 (`pool: forks`, `fileParallelism: false`), Prisma SQLite test DB under `tests/.tmp`
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/TESTING.md` (root; includes the new "Server unit and integration baseline" section). No closer `TESTING*.md` under `autobyteus-server-ts`.
- Conflicting, missing, or unclear project instructions: TESTING.md lists `prebuild` → `test:unit` → `test:integration:prepare` → `test:integration` → `typecheck`. Followed that order on FRESH2 for the unit suite; FRESH runs prepare first for the integration path. No conflict with this skill.
- Required environment variables or secrets available: `N/A` (no secrets needed; the gate probe uses a loopback capture and a disposable `CODEX_HOME`)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Server unit and integration baseline, § Rules 2, 9 | Testing guideline | Commands above; never touch `~/.autobyteus`; fix base failures as labelled commits |
| `AGENTS.md` (root) | Repo instructions | Read DESIGN.md/TESTING.md |
| `autobyteus-server-ts/package.json` | Scripts | `prebuild` = `prepare:shared` + `prisma generate`; `test:unit`, `test:integration` (check && vitest), `test:integration:prepare`, `typecheck` (`pretypecheck` = `prepare:shared`) |
| `autobyteus-server-ts/vitest.config.ts` | Runner config | isolation setup first, then `prisma-env`; `globalSetup` resets the test DB in the main process with `DATABASE_URL` overridden |
| `autobyteus-server-ts/tests/setup/test-environment-isolation.ts` | Isolation policy | allowlist; scope by test path |
| `autobyteus-server-ts/scripts/run-sanitized-built-in-agents-bootstrap-smoke.mjs` | Part of `build` (run by prepare) | spawns the smoke with only PATH/HOME/TMP vars, so prepare is safe from an agent shell |
| `evidence/run-suite-{clean,sentinel}-env.sh` | Implementation wrappers | env -i + disposable HOME; sentinel re-pointing with refusal |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| FRESH worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green-apie2e` | `git worktree add --detach … 0e56d0a9f`; `git merge --no-ff --no-commit origin/personal`; `pnpm install --frozen-lockfile` | owned by this validation | install exit 0 | `git worktree remove --force` at the end |
| FRESH2 worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green-apie2e-unit` | same + `pnpm -C autobyteus-server-ts prebuild` | owned | prebuild exit 0 | same |
| Test DB | `<worktree>/autobyteus-server-ts/tests/.tmp` | `globalSetup` | per worktree, no collision with other work | — | removed with worktree |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Inherited agent-shell env | `evidence/api-e2e/run-cmd-sentinel-env.sh` (adapted from the implementation wrapper to run documented `pnpm` scripts in any worktree) | data/memory/DB/package/skill/definition/app roots re-pointed at `/tmp/apie2e-sentinel-*`; refuses if anything still points at `~/.autobyteus`; read-only post-run watch of `~/.autobyteus` | sentinel folders in `/tmp` removed at the end |
| Clean env | `evidence/api-e2e/run-cmd-clean-env.sh` (env -i + disposable HOME) | — | `/tmp/apie2e-home-*` removed at the end |
| Gate probe | the gated test's own disposable `HOME`/`CODEX_HOME` and loopback server | no login, no paid inference (file header) | test-owned temp dirs |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| 31 changed test files under `autobyteus-server-ts/tests/{unit,integration}` (U1–U13, I1–I15, E1) | Each per the handoff fix log | REQ-001/002, AC-006 | `Still Valid` (as updated) | Diff audit V-15; per-file `expect(` deltas explained; implementation's per-test trace | Execute |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` — two content-cadence cases | Fine-grained content coalesces into one cadence-window frame; a changed interval applies to the next window | Original intent of d1c48db5a; REQ-005 | `Still Valid` — the assertion represents intended product behavior; failure is PB-001 (product) | code read: `agent-run.ts` L277/L406 publishes `AGENT_INPUT_STATE` after every batch regardless of signature change; scheduler L16–30 classifies it `FLUSH_THEN_FORWARD`; V-13 | Keep failing as REQ-005 documented exception; report to user (AC-007) |
| I7 trace filter excluding `AGENT_INPUT_STATE` | Status/content trace contract | REQ-002 | `Still Valid` — `AGENT_INPUT_STATE` is a separate input-queue projection added by 6908ccff4; the status/content contract is unchanged | diff | none |
| U12 removed `initialize` assertion | — | Design § Legacy Removal Policy | `Still Valid` (mechanism assertion replaced by current guarantee: created once, returned, cached) | diff | none |
| I11 relative `INVALID_REFERENCE_PATH` assertion | Moved to `unit/services/team-communication/team-communication-content-service.test.ts` | REQ-006 | `Still Valid` (relocated, not dropped) | diff; unit test count +1 | none |
| Opt-in gated suites (`RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, `RUN_LMSTUDIO_E2E`, `AGY_LIVE`, Google MCP, `RUN_GITHUB_AGENT_PACKAGE_E2E`, `RUN_CODEX_NATIVE_SURFACE_TESTS`) | Skip unless gate set | ASM-002, REQ-004 | `Still Valid`; activation path checked with one cheap gate (V-12) | allowlist `/^RUN_/` | Probe |
| `tests/e2e/**` | E2E | Out of scope (DEC-003 A) | `Out Of Scope` | — | Not run |

## Durable Coverage To Add

None. The change is itself a test-suite repair; the documented commands are the surface under test.

## Durable Coverage To Update

None by API/E2E.

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

See the ledger for case-level execution. Planned order: V-01 install → V-02 check-before-prepare → V-03 prepare → V-04/V-05 integration clean ×2 → V-06/V-07 unit clean ×2 (FRESH2, install + prebuild only) → V-08/V-09 sentinel inherited-env unit/integration → V-10/V-11 typecheck + negative probe → V-12 gate activation → V-13 PB-001 confirmation → V-14 per-test comparison with the base inventory → V-16 latest-base parity. Results are recorded in the execution coverage report.

## Test-Case Ledger Decision

- Ledger required: `Yes` — 16 cases, several long full-suite runs, interruption risk.
- Canonical ledger path: `api-e2e-test-case-ledger.md`

## Post-Repository Confidence Scorecard (Mandatory)

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | AC-001/002/004/005 direct; AC-003 direct with PB-001 REQ-005 exception (cause confirmed V-13); AC-006 diff audit | AC-007/008 are delivery's | Delivery |
| Changed-boundary execution directness | 95% | Documented scripts on fresh worktrees, clean + inherited env | Sentinel re-points data vars (safety) | — |
| Cross-boundary integration realism and mock gap | 95% | Real Vitest main/globalSetup/workers, real builds, real Codex CLI gate | — | — |
| Environment, configuration, identity, and fixture fidelity | 95% | Real agent-shell env (23 `AUTOBYTEUS_*`, 13 provider keys); latest base | HOME retained by design | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | Missing-prereq, negative typecheck, gate on/off, static allowlist inventory (V-12b), PB-001 probes | Paid live gated suites not run (ASM-002) | Credentialed live runs (out of scope) |
| User-surface, browser, and desktop-shell confidence | N/A | No UI/desktop surface changed | — | — |
| Durable regression coverage quality and relevance | 95% | Per-test base comparison (V-14); assertion-delta audit and focused I7/I8/I11/U12 review (V-15); QR-002 identical runs | No CI (RISK-002); test files not type-checked (DEC-001 A) | Separate tickets |

- Overall post-repository confidence: 95% (simple average of 6 applicable categories)
- Every critical acceptance criterion directly proven: `Yes` (AC-003 via the approved REQ-005 exception path for PB-001)
- Any applicable category below `90%`: `No`
- Default clean-confidence target of `95%` met: `Yes`
- Material residual risks: PB-001 open pending user decision; live gated suites not exercised; no CI.

## Broader Validation Decision (Mandatory)

- Decision: `Not Required` beyond the CLI runs above.
- Selected execution mode: `CLI` (the documented `pnpm` commands are the real changed surface).
- Specific confidence gap or residual risk addressed: fresh-worktree behavior, inherited agent-shell env, gate activation, typecheck enforcement.
- Browser-specific decision and rationale: no browser, desktop or live-provider surface changed; production `src` is unchanged.
- If `Not Required`, evidence proving the real changed boundary without broader execution: the changed boundary is the developer test-run surface, exercised directly by running its documented commands on fresh worktrees in both environments.

## Temporary Executable Validation Plan

| Case ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| V-11 | Temporary type error in `src/file-explorer/file-explorer.ts` on FRESH, then revert | `typecheck` fails on a real type error | Mutation probe of a script |
| V-12 | Gated file run with `RUN_CODEX_NATIVE_SURFACE_TESTS=1` under inherited env + ungated control | Gate variables survive isolation | Uses installed external CLI |
| V-13 | One-line safe-companion change in the cadence scheduler on FRESH, run I7 file, revert | PB-001 root cause | Product fix is a separate decision |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Paid/credentialed live gated suites (Codex/Claude/LM Studio/AGY live, Google MCP) | Need real providers/credentials; out of scope (ASM-002) | Allowlist gap for a specific gate's auxiliary variable (e.g. inherited `LMSTUDIO_HOSTS` is now dropped) | Noted in handoff known risks |
| Merge-time latest-base re-run | Owned by delivery (REQ-009, AC-008) | Base may move | Delivery |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| PB-001 two cadence cases fail on a product defect | Not a reroute: handled under approved REQ-005 (documented exception, reported to user before Done, AC-007) | handoff § PB-001; V-13 | Delivery reports to user; Solution Designer/user decide fix ticket |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Post-repository confidence: 95%
- Broader validation decision: `Not Required` (CLI surface is the changed boundary)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: all runs avoid `~/.autobyteus`; inherited-env runs use the sentinel wrapper.

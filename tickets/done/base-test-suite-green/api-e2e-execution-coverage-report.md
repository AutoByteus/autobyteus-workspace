# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/requirements-doc.md` (SR-002, Approved)
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/solution-revision-record.md`
- Design Spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/design-spec.md`
- Supplemental Task Artifacts: `evidence/` (baseline inventories, implementation evidence), `evidence/api-e2e/` (this round), `handoff-architecture-design-complete.md`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/base-test-suite-green/tickets/in-progress/base-test-suite-green/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct route)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: implementation handoff IR-001
- Prior Round Reviewed: none
- Latest Authoritative Round: 1

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes` (no durable coverage changes were made)
- Investigation plan followed: `Yes`. Additions: V-12b static allowlist inventory; V-13c stale-double masking probe; focused reviews of the I7/I8/I11/U12 assertion deltas.
- Existing coverage decisions revised during execution: none.
- Reroute required before or during execution: `No`
- Execution surface: two fresh detached worktrees at `0e56d0a9f` merged (uncommitted) with the latest `origin/personal` `048ea6cec`. FRESH ran the integration path, typecheck, gates and PB-001 probes. FRESH2 ran the unit suite with install + prebuild only, as documented. All commands are the documented `pnpm -C autobyteus-server-ts …` scripts. Each ran either in a clean env (`env -i`, disposable HOME) or with the inherited agent-shell env, using `evidence/api-e2e/run-cmd-{clean,sentinel}-env.sh`. In the inherited runs, 23 `AUTOBYTEUS_*` variables and 13 provider `*_API_KEY` variables were present. The data, memory, DB, package, skill, definition and application roots were re-pointed at a seeded sentinel, and the wrapper refuses to run if anything still points at `~/.autobyteus`.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`
- Every completed case recorded immediately: `Yes`. The parallel V-06/V-07/V-08 and V-09..V-13 results were recorded as they completed.
- Long-running case checkpoints recorded when needed: `Yes`
- Ledger reconciled into this report: `Yes`
- Last durably recorded event: see ledger (V-16)
- Cases still running, interrupted, or not started: none
- Interruption note: none

| Case ID | Final Result | Last Event | Evidence / Artifact Path | Reconciled Result / Follow-Up |
| --- | --- | --- | --- | --- |
| V-01 | Pass | Completed | `evidence/api-e2e/v01-*`, `v20-*` | — |
| V-02 | Pass | Completed | `v02-fresh-test-integration-before-prepare.log` | — |
| V-03 | Pass | Completed | `v03-fresh-test-integration-prepare.*` | — |
| V-04 | Pass (PB-001 exception) | Completed | `v04-integration-clean-r1.{log,json}` | PB-001 → user (AC-007) |
| V-05 | Pass (PB-001 exception) | Completed | `v05-integration-clean-r2.{log,json}` | — |
| V-06 | Pass | Completed | `v06-unit-clean-r1.{log,json}`, `v21-fresh2-prebuild.*` | — |
| V-07 | Pass | Completed | `v07-unit-clean-r2.{log,json}` | — |
| V-08 | Pass | Completed | `v08-unit-sentinel.*` | — |
| V-09 | Pass (PB-001 exception) | Completed | `v09-integration-sentinel.*` | — |
| V-10 | Pass | Completed | `v10-typecheck.log` | — |
| V-11 | Pass | Completed | `v11-typecheck-negative-probe.log` | — |
| V-12 | Pass | Completed | `v12-gate-codex-native-surface-{on,off}.*`, `v12b-allowlist-static-inventory.txt` | — |
| V-13 | Pass (defect confirmed) | Completed | `v13a/b/c-pb001-*.log` | PB-001 → user |
| V-14 | Pass | Completed | `v14-*-vs-base.txt` | — |
| V-15 | Pass | Completed | ledger | — |
| V-16 | Pass | Completed | ledger | Delivery re-runs at merge (REQ-009) |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`. Production `src` is unchanged (`git diff ebf68c4af..HEAD -- autobyteus-server-ts/src` is empty). The tests assert current contracts; for example, I11's legacy-flat case asserts strict rejection.
- Approved persisted-data transition followed: `N/A` (`Not Affected`)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Upstream recipient notified: N/A

## Changed Boundary And Evidence Matrix

| Case ID | Behavior / Requirement / AC IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| V-02 | BEH-002, REQ-003, AC-003 (alternate) | prerequisite `check` | `pnpm … test:integration` on a never-built fresh worktree, clean env | Durable (script) | Pass: one message naming all 6 missing artifacts and `pnpm -C autobyteus-server-ts test:integration:prepare`, exit 1, vitest not started | `v02-…log` |
| V-03 | BEH-002, REQ-003 | prerequisite `prepare` | `pnpm … test:integration:prepare`, inherited env | Durable (script) | Pass: 4 ordered steps; the Brief Studio pack works without a re-install (devkit CLI used directly); check passes; exit 0, 221 s; sentinel unchanged | `v03-…` |
| V-04, V-05 | BEH-003, REQ-002, AC-003, QR-002 | integration suite | `pnpm … test:integration`, clean env ×2 | Durable | 338 passed / 68 skipped / 2 failed ×2. 0 per-test differences between runs and vs the implementation's runs. The only failures are the 2 PB-001 cases. No suite errors elsewhere. | `v04-*`, `v05-*` |
| V-06, V-07 | BEH-001, REQ-001, AC-001, QR-002 | unit suite | `pnpm … test:unit` on install + prebuild only (no server/SDK `dist`), clean env ×2 | Durable | 5,084 passed / 6 skipped / 0 failed ×2; identical outcomes | `v06-*`, `v07-*` |
| V-08 | BEH-005, REQ-004, AC-002, AC-004, QR-001 | env isolation (unit) | `pnpm … test:unit`, inherited agent-shell env + sentinel | Durable | 5,084 / 6 / 0, identical to V-07; E1 flush-interval (22/22) and E2 Gemini (5/5) pass with the inherited live values present; sentinel byte-identical | `v08-*` |
| V-09 | BEH-005, REQ-004, AC-004, QR-001 | env isolation (integration) | `pnpm … test:integration`, inherited env + sentinel | Durable | 338 / 68 / 2, 0 per-test differences vs V-05; sentinel byte-identical | `v09-*` |
| V-08, V-09 watch | AC-004 | user data | read-only `find ~/.autobyteus -newer <start>` | Live (read-only) | Only live-app files changed during the runs (`logs/app.log`, the live DB, and memory of the live `project_task_manager` agent run). No test-signature paths. | `*.home-autobyteus-watch.txt` |
| V-10, V-11 | BEH-004, REQ-007, AC-005 | `typecheck` | `pnpm … typecheck`, clean env; temporary `const x: number = "…"` in `src/file-explorer/file-explorer.ts` | Durable + Temporary | exit 0. Probe: exit 2, `TS2322` at the probe line. Reverted; `git status` clean. | `v10-*`, `v11-*` |
| V-12 | REQ-004 (gates keep working), ASM-002 | allowlist | `RUN_CODEX_NATIVE_SURFACE_TESTS=1 pnpm exec vitest run <gated file>` under inherited env; control without the gate | Temporary run of durable gated test | Gate set: 4/4 ran and passed (real `codex-cli 0.161.0`, loopback capture). Unset: 4 skipped. Sentinel unchanged. | `v12-*` |
| V-12b | REQ-004 | allowlist completeness | static inventory of every `process.env.X` read in `tests/{unit,integration,helpers,fixtures,setup}` | Static | 73 names: 50 allowlisted. The other 23 are set by the test or setup itself. The 2 apparent exceptions (`AUTOBYTEUS_STREAM_PARSER_SUFFIX`, `QWEN_BASE_URL` in `app-config.test.ts`) are assertions on values production code writes, not inputs. | `v12b-allowlist-static-inventory.txt` |
| V-13 | REQ-005, AC-007 (PB-001) | websocket content cadence | I7 file on FRESH: (a) current src; (b) temporary `AGENT_INPUT_STATE` safe companion in the scheduler; (c) temporary removal of `compactionRecovery` from the test double | Temporary | (a) 2 failed / 5 passed: `expected [SEGMENT_CONTENT] to have a length of +0 but got 1` (content flushed before the window). (b) 7/7 pass. (c) 6 pass / 1 fail. The cadence cases "pass" again only because publication crashes (`failed to publish runtime events … reading 'kind'`), so base's "pass" was masking. All reverted. | `v13a/b/c-*.log` |
| V-14 | REQ-001/002/006, AC-001/003 | per-test outcomes vs base | `compare-runs.py` | Analysis | Unit: 0 base-passing regressions, 0 new skips. Integration: 0 new skips. 3 team-communication cases skipped on base (suite error) now run and pass. The only base-"passing" cases now failing are the 2 PB-001 cases (masked on base, see V-13c). All 68 integration skips are opt-in/live/WSL gates. The 6 unit skips are `AGY_LIVE` (5) and win32 `runIf` (1). | `v14-*.txt` |
| V-15 | AC-006, REQ-006 | diff | `git diff ebf68c4af..HEAD` | Static | No added or removed `skip`/`only`/`todo`/`skipIf`/`runIf`; no deleted or renamed files. Two `expect(` deltas, both explained: U12 −1 (removed `initialize` mechanism → created once, returned, cached) and I11 −1 (relocated to the content-service unit test, +1 there). I11's address assertions were replaced by current `senderAgentRunId`/`receiverAgentRunId`. I8's busy-ACK rewrite follows 1e7837929, which removed `RUN_COMMAND_IN_PROGRESS` from the server. | ledger |
| V-16 | REQ-009 (pre-delivery) | latest base | `git fetch`; FRESH/FRESH2 contained `origin/personal` `048ea6cec` (docs-only) | Static | `origin/personal` still `048ea6cec` at the end of the round | ledger |

## Additional Repository Coverage Execution

None beyond the matrix.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 95% | — | AC-001, AC-002, AC-004 and AC-005 are proven directly on a fresh worktree on the latest base. AC-003 is proven directly, with 2 failures limited to PB-001, a REQ-005 documented exception (not skipped; cause confirmed). AC-006 is covered by the diff audit (V-15). | AC-007 (report PB-001 to the user) and AC-008 (merge, latest-base re-run) belong to delivery |
| Changed-boundary execution directness | 95% | 95% | — | The documented `pnpm` scripts were run exactly as written on fresh worktrees: install + prebuild for unit; never-built → check → prepare → run for integration | The sentinel re-points data variables instead of leaving the real `~/.autobyteus` values (a safety rule). Isolation is shown to drop non-allowlisted variables by E1/E2 passing with the inherited live values, and by the implementer's worker-env probe. |
| Cross-boundary integration realism and mock gap | 95% | 95% | — | Real Vitest main process, `globalSetup`, forked workers, real builds, real installed Codex CLI for the gate | The suites' own doubles are what they are; that is not part of this change |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | — | Clean env and the real agent-shell env (23 `AUTOBYTEUS_*` and 13 provider keys inherited); fresh worktrees; latest base | HOME is retained by design; home-based paths (`~/.claude`, `~/.gemini`, Downloads) are pre-existing and not AutoByteus app data. Grep found no `~/.autobyteus` resolution from `os.homedir()`. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | — | Missing-prerequisite path, negative typecheck, gate on/off, static allowlist completeness, PB-001 cause probes (a/b/c) | Paid or credentialed live gated suites were not run (ASM-002). The static inventory shows their gate variables are allowlisted. |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | — | No UI, browser or desktop surface changed; production `src` is unchanged | — |
| Durable regression coverage quality and relevance | 95% | 95% | — | Per-test base comparison; assertion-delta audit; focused review of the I7/I8/I11/U12 rewrites; two consecutive green runs with identical outcomes | No CI runs these suites (RISK-002). Test files are not type-checked (DEC-001 A, deferred). |

- Overall post-repository confidence: 95%
- Overall final confidence: 95%
- Calculation method: simple average of the 6 applicable categories
- Confidence change produced by broader validation: none (broader validation not required)
- Every critical acceptance criterion directly proven: `Yes`. AC-003's two PB-001 failures are the user-approved REQ-005 documented-exception path, and their cause is independently confirmed. AC-007 and AC-008 are delivery obligations.
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: PB-001 stays open until the user decides; live gated suites were not run; no CI gate.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Not Required`; mode `CLI`
- Material deviation from the planned mode or rationale: none
- Confidence gap or residual risk actually addressed: fresh-worktree, inherited-env and gate-activation behavior were exercised on the documented CLI surface itself
- If `Not Required`, direct evidence that made broader validation unnecessary: the changed boundary is the developer test-run surface (scripts, Vitest setup, typecheck), and it was exercised directly. No runtime, API, browser or desktop behavior changed.
- Startup order, commands, and readiness results: see the matrix
- Environment choices that materially affected the run: clean vs inherited-with-sentinel; FRESH2 without prepare-only artifacts
- Seed data, fixtures, identities: sentinel folders with marker files; no credentials used

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | Evidence | Result |
| --- | --- | --- | --- | --- |
| SCN-002a: fresh worktree, `test:integration` before prepare | One clear message, exit 1 | As expected | `v02` | Pass |
| SCN-002: prepare, then run | Green except the documented exception | 338/68/2 (PB-001) | `v03`–`v05` | Pass |
| SCN-001a: unit on install + prebuild only | Green | 5,084/6/0 | `v06`, `v07` | Pass |
| SCN-004/004b: documented scripts from the agent shell | Same results; user data untouched | Identical per-test; sentinel unchanged; no test writes under `~/.autobyteus` | `v08`, `v09` | Pass |
| SCN-004a: opt-in gate set in the agent shell | Gated tests run | 4/4 ran and passed; 4 skipped without the gate | `v12` | Pass |
| SCN-003: typecheck | exit 0; a type error fails it | exit 0 / exit 2 TS2322 | `v10`, `v11` | Pass |

## Platform / Runtime Targets

- Operating system / platform: macOS (Darwin 25.5.0)
- Runtime and relevant framework versions: Node v22.23.1 (shell `node`), pnpm 10.28.2, Vitest 4 (`pool: forks`, `fileParallelism: false`), TypeScript per lockfile, `codex-cli 0.161.0`
- Browser / engine: N/A

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`
- Representative existing data exercised: N/A
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (API/E2E made no repository changes; the implementation's 31 test-file changes were validated as listed)
- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route)
- Diff or repository evidence supplied for removed paths: N/A

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `evidence/api-e2e/run-cmd-clean-env.sh`, `run-cmd-sentinel-env.sh` | Run wrappers for documented commands | Retained (ticket evidence) | Sentinel wrapper refuses `~/.autobyteus`; records a read-only watch summary |
| `evidence/api-e2e/compare-runs.py` | Per-test JSON comparison | Retained | |
| `evidence/api-e2e/v*.log/json/txt` | Case evidence | Retained | |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Type error appended to `src/file-explorer/file-explorer.ts` (FRESH) | AC-005 negative probe | exit 2 TS2322 | Restored from backup; `git status` clean |
| `AGENT_INPUT_STATE` added to `SAFE_COMPANION_TYPES` (FRESH) | PB-001 cause | 7/7 pass | Restored; clean |
| `compactionRecovery` removed from the I7 double (FRESH) | Prove that base's "pass" was masking | Cadence cases pass, publication crashes | Restored; clean |
| FRESH and FRESH2 worktrees (`…/base-test-suite-green-apie2e`, `…-apie2e-unit`) | Fresh-worktree AC-001/AC-003 | — | `git worktree remove --force` + prune |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| User app data roots | Sentinel folder | Rule 2 forbids touching `~/.autobyteus` | None material; isolation deletes these variables anyway |
| Codex model provider (gate probe) | The test's own loopback capture | Test design: no paid inference | — |

## Result Summary

| Result | Case IDs | Summary / Reason |
| --- | --- | --- |
| Pass | V-01..V-16 | All acceptance evidence obtained. Integration's only failures are PB-001 (REQ-005 documented exception, cause confirmed). |
| Not Tested | Paid or credentialed live gated suites | ASM-002; gate mechanism proven with one real gate plus the static inventory |
| Out Of Scope | `tests/e2e`, web, other packages | Requirements § Out Of Scope |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| FRESH, FRESH2 worktrees | This validation | `git worktree remove --force`, `git worktree prune` | Removed |
| `/tmp/apie2e-home-*`, `/tmp/apie2e-sentinel-*`, `/tmp/apie2e-mark-*` | This validation | `rm -rf` | Removed |
| Temporary `src`/test edits | This validation | Restored from backups before worktree removal | Clean |
| Implementation worktree | Implementation | Not modified, except new ticket artifacts under `tickets/in-progress/base-test-suite-green/` | — |

## Preliminary Classification

Not applicable (no failure). PB-001 is a product defect handled under REQ-005. It is a separate-ticket candidate, or a user-approved addition: preferably option (b), publish `AGENT_INPUT_STATE` only on a signature/revision change, possibly with (a). The user decides.

Adjacent observation (non-blocking, out of scope): `autobyteus-web/services/agentStreaming/protocol/agentCommandTypes.ts` and its spec still name `RUN_COMMAND_IN_PROGRESS`, which the server no longer emits (1e7837929).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Not Required` (the CLI surface is the changed boundary and was exercised directly)
- Critical acceptance criteria lacking direct proof: none. AC-003 has 2 failures, the PB-001 REQ-005 documented exception. AC-007 and AC-008 are delivery obligations.
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer` (direct Medium/Low pass)
- Notes: Delivery must report PB-001 to the user before Done (AC-007). Keep the TESTING.md "Known exception" note until it is fixed. Re-run AC-001/003/005 on the latest base at merge (REQ-009). Do not commit the SDK/devkit/Brief Studio `dist/` folders.

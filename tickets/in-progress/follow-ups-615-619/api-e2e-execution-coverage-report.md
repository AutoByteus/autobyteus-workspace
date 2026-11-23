# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (Medium / Low, direct route)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why: none.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/follow-ups-615-619/tickets/in-progress/follow-ups-615-619/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `233f813d19`, HEAD `99a45cc1a0` | macOS 26.5.2 ARM64, load 9–17 | Node v22.23.1; server `dist/` removed and rebuilt at API-00 | `env -i PATH HOME=<temp> TMPDIR USER` for every run (the agent shell's `AUTOBYTEUS_*` roots and `DATABASE_URL` never reach a test, FU-003); scripted AGY CLI where gated |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | fresh server build | `rm -rf autobyteus-server-ts/dist; env -i … pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build-fresh.log` | `exit 0` | — |
| API-01 | AC-001…AC-005 | the implementation's checks | Reused: IMP-01…IMP-15 (`233f813d19`; the server built from `36102a28f3`, the last commit changes only a test helper) | — | Pass (reused) | handoff IMP-01…15 | IMP-02 SR-016 both forms; IMP-03/08/09/10 controls fail; IMP-04 the migrations of the start under test, all `SUCCEEDED`, none reran; IMP-13 and IMP-13b whole server suites (clean), `scoped-org-history-graphql` `✓` in both; IMP-13b `Test Files  1291 passed` | IMP-13's 20 failures were the missing Brief Studio package |
| API-02 | — (TESTING.md) | the faithful-ledger rule | the data rule's new sentences (`99a45cc1a0`, `docs(testing): …`, on its own) | — | Pass | the commit | "A startup test that places data a released build wrote … faithful-upgrade-ledger.ts …" | the remaining empty-ledger startup files: FU-004 |
| API-03 | AC-001, AC-002, AC-003 | the files the changes reach, one clean run on the fresh build | `env -i PATH HOME=<temp> TMPDIR USER pnpm -C autobyteus-server-ts exec vitest run <12 files>`; then the three gated ones with `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs> RUN_ORG_CONVERSION_COST_E2E=1 RUN_CONTEXT_FILE_PROCESS_E2E=1` | ENV-1 | Pass | `API-03-changed-files-clean-env.log` | `Test Files  8 passed \| 4 skipped (12)`; then `Test Files  3 passed (3)`, `Tests  6 passed (6)` | passed: both AC-001 files, the other two faithful-ledger users, `memory-collaboration-graphql`, six `restoreByMemberMessage` users incl. `scoped-org-history-graphql`; not run: `agy-runtime-stop-recovery-live` (live CLI) |
| API-04 | AC-005 | design cases | `grep "^### Case" docs/design-cases.md` | ENV-1 | Pass | (command) | 30 headings, no repeated number | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part: What You Tried And Why It Could Not Be Proven Here |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-03, API-01 (IMP-04/05 statuses, IMP-03 control) | Proven | — |
| AC-002 | Yes | API-03 (`memory-collaboration-graphql`), API-01 (IMP-08 unit red/green) | Proven | — |
| AC-003 | Yes | API-01 (IMP-13, IMP-13b whole suites), API-03 | Proven | — |
| AC-004 | Yes | API-01 (IMP-01/02) | Proven | — |
| AC-005 | No | API-04 | Proven | — |
| AC-006 | — | — | Delivery's (its own whole-suite run on the final state) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | every criterion proven, each fix with a failing control | — | — |
| Changed-boundary execution directness | 95% | 95% | the GraphQL lists and the startup paths on a fresh built server | — | — |
| Cross-boundary integration realism and mock gap | 94% | 95% | real server and migrations; scripted AGY to create runs | the live AGY user not run | — |
| Environment, configuration, identity, and fixture fidelity | 95% | 96% | every run under `env -i`, fresh HOME | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | no released migration reruns; a second start changes nothing; restore waits | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | server lists only; the web reads the same fields | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | the helper shared by four files; the TESTING.md rule | older startup files not yet on the helper (FU-004) | FU-004 |

- Overall final confidence: 95.3% (simple average of the six applicable categories)
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`: the product change is the server's team-root lists, exercised directly through GraphQL by `memory-collaboration-graphql` on a built server; the web renders the same fields unchanged

## Persisted-Data Transition Checks

- `Not Affected` (product); the tests now model the persisted ledger faithfully

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `TESTING.md` (test data: faithful migration ledger) | Updated (`99a45cc1a0`) | API-02 | — |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI | scripted fixture | creates runs; no inference | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| temp HOMEs, the suites' data roots | Yes | the suites' cleanup, `rm -rf` | removed |

## Earlier-Stage Environment Check

The implementation found that agent shells carry the founder's `AUTOBYTEUS_*` roots and `DATABASE_URL` (FU-003). My shell carries them too. Every test run of this stage used `env -i`. My rendered probes in autobyteus-554, -576 and -579 ran without it; their evidence shows their servers used probe-owned roots, and a read-only name search of `~/.autobyteus/server-data` and its `memory/` for the names those probes create (`probe-researcher`, `long-archive-team`, `semantic_ws_probe`, `Research Assistant`, the live-probe run names) found nothing.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk (IDs, with `DEC-*`): `None` (AC-006 is delivery's)
- Evidence decisions requested: `None`
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (direct route, Medium / Low)
- Notes: follow-ups FU-001…FU-003 (the implementation's; FU-003 urgent), FU-004 (mine).

# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: 1, implementation IR-001 complete (direct low-risk route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: API-06 was planned as new durable coverage. It failed for a pre-existing reason, so it is kept as evidence instead (investigation "Execution findings"). API-07 (AC-005 desktop journey) was deferred until the failure-origin decision.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder/tickets/in-progress/imported-app-codex-runtime-folder/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery` (not reached: result `Fail`)
- Proportional test-code review decision: `Not Applicable` (Fail: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `8ab3a2129a` (code `1d49973440`) | macOS 26.5.2, Node v22.23.1 | Server E2E from source (vitest), real studio server over HTTP; scripted runtime CLIs (`agent-runtimes-fake-cli.mjs`) | `env -i PATH HOME=<resolved temp> TMPDIR`; test-owned data dirs; Brief Studio `applications/brief-studio/dist/importable-package` |
| ENV-1-base | ENV-1 with `application-catalog-transition-service.ts` and `build-application-platform-runtime.ts` replaced by `1138e8fbef`'s for one probe run | same | same | Restored with `git checkout -- autobyteus-server-ts/src`; `git diff` empty afterwards |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, REQ-001…003 | real server: import → readiness → launch | Reused: IMP-01, IMP-00 | — | Pass | — | — | Ran on `1d49973440`; only ticket files changed since. The temporary probe run of the same file with an appended step (`API-06-probe-active-reload-repair.log`) passed IC-01 and IC-02 again: `✓ IC-01 …`, `✓ IC-02 …` |
| API-02 | AC-003 (order), AC-004 | transition order, lifecycle, assembly | Reused: IMP-02 | — | Pass | — | — | Proves the ordering with fakes; the reentry recovery's worker start is not exercised by it |
| API-03 | AC-004 | startup-loaded app runs | Reused: IMP-03 | — | Pass | — | — | — |
| API-04 | AC-004 | server typecheck | Reused: IMP-04 | — | Pass | — | — | — |
| API-05 | AC-004 (guard) | architecture guard failure cause | Reused: IMP-05; `git log -S "AgentDefinitionService.getInstance" -- autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts`; `git merge-base --is-ancestor 3e3a7b08cc 1138e8fbef`; `git diff --name-only 1138e8fbef 1d49973440` | ENV-1 | Pass (failure out of scope, cause confirmed) | `IMP-05-architecture-boundaries.log` | `3e3a7b08cc fix: Memory page shows a task-agent group's definition name`; it is in base; the ticket's diff touches neither file | FU-001 (out of scope, recorded by implementation) |
| API-06 | AC-003, REQ-001 (reload), UC-002, SCN-003; SCN-001b | real server: package reload and app-scoped repair of Brief Studio | (1) Draft E2E `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-import-signed-out-recovery.e2e.test.ts --no-watch` (file now in evidence). (2) Temporary stack diagnostic in `requireApplicationActive` (removed). (3) Temporary probes: startup-quarantined repair; signed-out import + package reload; reload + repair of the ACTIVE imported app after IC-01/IC-02; startup-loaded ACTIVE app reload + repair on base sources and on the fix. (4) Asserting reproduction `evidence/API-06-repro-reload-reentry.e2e.test.ts` run on the fix | ENV-1, ENV-1-base | **Fail** | `API-06-repro-reload-reentry.e2e.test.ts`, `API-06-repro-reload-reentry-on-fix.log`, `API-06-probe-base-startup-reload.log`, `API-06-probe-fix-startup-reload.log`, `API-06-probe-active-reload-repair.log`, `API-06-cause-stack-diagnostic.log`, `API-06-probe-startup-quarantine.log`, `API-06-probe-package-reload.log`, `API-06-draft-signed-out-recovery-run.log`, `API-06-draft-signed-out-recovery.e2e.test.ts` | Reproduction on the fix: `[AB238-PROBE] after package reload 503 {"detail":"Application '<id>' is currently quarantined: Application '<id>' is currently reentering. Please retry after repair/reload completes." … "availabilityState":"QUARANTINED"`; base and fix probe logs show identical lines for `after package reload`, `repair` (`"state":"QUARANTINED"`) and `after repair`; stack: `ApplicationOrchestrationHostService.listRunBindings (…application-orchestration-host-service.ts:269:5)` ← `ApplicationEngineClient.handleWorkerRequest (…application-engine-client.ts:255:23)`, refused `REENTERING` | Expected (AC-003): after a reload the application stays usable. Observed: a package reload of an ACTIVE imported Brief Studio (and of a startup-loaded one), and the documented repair, leave it QUARANTINED. Not caused by this change (identical on base). Cause: during reentry `ApplicationReentryService.recoverParticipants` (`application-reentry-service.ts:150-151`) calls `engineLauncher.ensureReady`; the started worker calls the host's `listRunBindings`, whose `requireApplicationActive` refuses while the application is REENTERING; the error quarantines it (`:158-172`). Also: an application imported while Codex is signed out cannot be brought back without a restart (repair → same refusal; package reload → prior quarantine kept by policy) |
| API-07 | AC-005 | isolated desktop instance, real `codex` | — | — | Not Tested | — | — | Deferred to the next round: a rework of the reentry path would change `recoverParticipants`, which import also uses, and the journey includes a reload |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IC-01: import → ACTIVE, `RUNNABLE`, `ATTACHED`, Codex thread; fails on base, IMP-00) | Proven | — |
| AC-002 | Yes | API-01 (IC-02) | Proven (on the implementation's reading: signed out after import; signed out at import gives the generic quarantine, FU-002) | — |
| AC-003 | Yes | API-02 proves the order only; API-06 shows the observable outcome fails end to end | **Not Proven** (the application does not stay usable after a reload, for a pre-existing reason) | — |
| AC-004 | Yes | API-02, API-03, API-04, API-05 | Proven (guard failure out of scope, FU-001) | — |
| AC-005 | No | — | Not Proven (API-07 deferred) | Optional user check after the next round |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 50% | AC-001/002/004 proven; AC-003 fails end to end (API-06) | AC-003 outcome | Rework or a scope decision on reload/repair |
| Changed-boundary execution directness | 90% | 90% | Import path through the real server (API-01); reload path through the real server (API-06) | — | — |
| Cross-boundary integration realism and mock gap | 75% | 90% | API-06 exposed what the unit fakes skip (worker start during reentry) | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | Clean env, test-owned data, scripted CLIs | Real `codex` binary not run (API-07 deferred) | API-07 |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 50% | Signed-out text (IC-02); reload/repair recovery fails (API-06) | Recovery paths | Rework |
| User-surface, browser, and desktop-shell confidence | N/A | 50% | — | AC-005 not run | API-07 |
| Durable regression coverage quality and relevance | 85% | 75% | IC-01/IC-02 strong; reload covered by fakes only | No durable reload E2E (it would be red today) | Add `API-06-repro-reload-reentry` as durable once fixed |

- Overall post-repository confidence: 82%
- Overall final confidence: 64%
- Calculation method: simple average of the applicable final scores (50, 90, 90, 90, 50, 50, 75)
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-003)
- Any final applicable category below `90%`: `Yes`: requirement proof, failure/recovery, user surface, durable coverage
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: AC-003 outcome; AC-005 not run

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Project Desktop Validation` (isolated instance) for AC-005; deferred this round
- Confidence gap: the real packaged server and real `codex` at import; deferred because the round already fails and the likely rework touches the same recovery path
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`
- Compatibility-only behavior observed: `No`
- Durable coverage for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (see Deviations; drafts kept in evidence)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Codex/Claude/AGY CLIs | scripted `agent-runtimes-fake-cli.mjs` | Deterministic sign-in states, no account use | The real `codex` `account/read` in the folder (API-07) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Stack diagnostic in `application-availability-service.ts` | Yes | `git checkout` right after the run | `git status` clean for `autobyteus-server-ts/src` |
| Base swap of the two source files | Yes | `git checkout -- autobyteus-server-ts/src` | `git diff` empty |
| `zz-probe-ab238-*` test files, temporary IC-03 in `application-import-codex-launch.e2e.test.ts` | Yes | Deleted / original restored from a copy | `git status` shows no test-tree change |
| Draft durable test and reproduction | Yes | Moved into the ticket evidence folder | Not in the test tree |
| Test servers, data dirs, scripted CLIs | Yes | Test teardown | — |

## Preliminary Classification (On `Fail`)

- Preliminary classification: `Design Impact` (pre-existing origin). The ticket's change is correct for what it does, and it does not cause the failure (identical on base). AC-003's observable outcome ("the application stays usable" after a reload) and UC-002 depend on a reentry path that quarantines Brief Studio for another reason. The design assumed the missing folder was the only gap (its escalation trigger: "another missing prerequisite" → Design Impact).
- Recommended owner after failure-origin review: Solution Designer, to decide one of two:
  - (a) the reentry admission fix is in this ticket: the host must let the application's own worker read its bindings during REENTERING, or recovery must not start the worker before ACTIVE, as `docs/modules/applications.md:111` describes;
  - (b) it is a separate Task: AC-003 is narrowed to the order proof, and a follow-up is recorded, together with the signed-out-import recovery consequence.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-003 (fails end to end), AC-005 (deferred)
- Preliminary classification and recommended owner: `Design Impact` (pre-existing origin), Solution Designer after failure-origin review
- Next recipient from `get_handoff_rules`: Code Reviewer (failure-origin review)
- Notes: AC-001, AC-002 and AC-004 are proven and need no rerun unless the rework touches their paths.

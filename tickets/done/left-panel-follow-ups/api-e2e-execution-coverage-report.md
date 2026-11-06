# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups/tickets/in-progress/left-panel-follow-ups/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- Revision record and current ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2. The chain:
  - API-REV-001 Fail (API-04);
  - CRR-001 CR-001 `Design Impact`;
  - SR-002: the Projects view reads every run;
  - IR-002 (`1112f13de1`), head `5731da6f95`.
- Prior round reviewed: round 1 (API-REV-001: Fail on API-04, AC-003). Rechecked first: API-04 passes (reused IMP-11).
- Deviations from the plan, and why:
  - API-03 and API-04 reuse the implementer's IMP-11. It is a full run of my unchanged probe on the code commit, with clear evidence.
  - API-06 is added for the new uncapped poll in the Projects view.
- Evidence folder: `evidence/api-e2e/`

## Routing Classification

- Task size `Small`; architectural risk `Low`; input route `Direct Low-Risk`; successful-output route `Delivery` (not reached: this round fails); test-code review `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | round 1: `dda6ba59cf` (code `ee1178617c`, `2903fba48a`, `00339421ed`) plus PLN-11; round 2: IMP-11 on `1112f13de1` (the implementer's run of the same probe) | macOS 26.5.2, Node v22.23.1, pnpm 10.28.2 | `projects-left-navigation-probe.mjs`: headless Chrome → Nuxt dev → `autobyteus-server-ts/dist/app.js` (built after the last code commit; server source identical to the base), scripted AGY | Probe-owned data root, ports, processes; removed (`dataRootRemoved: true`); load average ~100 |
| ENV-2 | `dda6ba59cf` | same | Server vitest files | `env -i PATH HOME=<fresh temp> TMPDIR` |
| ENV-4 | `5731da6f95` (code `1112f13de1`) | same | `run-history-read-budget-probe.mjs`: seed through public APIs (40 Agent, 200 Team, 10 Org runs), then 40 poll reads per window over HTTP on this worktree's `dist/app.js` | Owned data roots, removed; load average 17–28 |
| ENV-3 | `dda6ba59cf` | same | Fresh clone, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64`, verify steps (TESTING.md Fresh-start build) | No signing secrets; clone removed |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 (web), AC-002, AC-003 (store and host window) | web | Reused: IMP-01…IMP-05 (round 1); IMP-08 (host spec red on SR-001), IMP-09 (web suite 5168), IMP-10 (typecheck, guards) (round 2) | — | Pass | `evidence/implementation/IMP-01*…IMP-05*`, `IMP-08*`, `IMP-09*`, `IMP-10*` | (implementation rows) | Only ticket documents after `1112f13de1` |
| API-02 | AC-001 (server) | server | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/stopped-run-model-config-graphql.e2e.test.ts tests/e2e/run-history/removed-remote-provider-saved-selection-graphql.e2e.test.ts tests/unit/agent-execution/agent-run-create-service.test.ts tests/unit/agent-execution/agent-run-create-undo.test.ts tests/integration/agent-execution/agent-run-service.integration.test.ts --no-watch` | ENV-2 | Pass | `evidence/api-e2e/API-02-server-createAgentRun.log` | `Test Files  5 passed (5)`, `Tests  23 passed (23)`, `exit=0` | The probes also call GraphQL `createAgentRun` live, dozens of times |
| API-03 | AC-003 (start elsewhere, view open), preserved Projects behavior, zh-CN after the rename | live browser | `pnpm -C autobyteus-web test:e2e:projects-left-navigation --output-dir <fresh>` | ENV-1 | Pass (round 1 run; round 2 reused IMP-11) | round 2: `evidence/implementation/IMP-11-pln-sr002.log`, `IMP-11-pln-sr002/evidence.json`; round 1: `evidence/api-e2e/API-03-04-pln/` | PLN-01…10 `Pass`; PLN-08 `lateProjectListedMs` 4321 (round 2), 4360 (round 1) | PLN-09 (this window's archive, delete, stop) and PLN-10 (zh-CN, narrow) ran on this change for the first time |
| API-04 | AC-003 (removed elsewhere; hidden) | live browser | Same run, PLN-11 | ENV-1 | Pass (round 2, IMP-11); round 1 Fail | round 2: `evidence/implementation/IMP-11-pln-sr002/evidence.json` (`cases.PLN-11`), fails on SR-001's host: `IMP-12-pln11-sr001.log`; round 1: `evidence/api-e2e/API-03-04-pln/` | Round 2: `nListedMs` 3990, `nUnlistedMs` 4981, `readsWhileHidden` 0, `mUnlistedMs: true`, `readsAfterOlderArchive` 5 | Round 1 failure: the older run was outside the 6-per-agent poll |
| API-06 | SR-002 risk: the Projects view now polls every run (design Risks of 385: 250 ms per poll read) | server GraphQL over HTTP | `node autobyteus-web/tests/e2e/run-history-read-budget-probe.mjs --seed-to <dir>`, then `--from-seed <dir> --label sr002 --output-dir …/API-06-read-budget` | ENV-4 | Pass | `evidence/api-e2e/API-06-read-budget/evidence.json`, `API-06-read-budget.log`, `API-06-seed.manifest.json` | window `null` poll p50 157.6 / p95 194.5 / max 302.4 ms; window 6 p50 146.8 / p95 169.6 ms; RB-C1…C4, RB-B1, RB-B2 `Pass` | The uncapped read costs ~11 ms (p50) more than the capped one on this set |
| API-05 | AC-004; fresh-start (`autobyteus-web/generated/**` changed) | release build | `evidence/api-e2e/API-05-fresh-start.sh`, then the job's verify steps | ENV-3 | Pass (round 1; still valid: no build input changed in round 2) | `API-05-fresh-start.log`, `API-05-fresh-build.full.log.gz`, `API-05-fresh-verify.log` | `build exit=0`; `test-file errors: 99 in 43 files (baseline 99 in 43 files)`, `[typecheck] PASS`; dmg and zip; `prisma-verify=ok`, `ok: node-pty spawn probe`, `exit=0` | Signing and notarization: Not Tested (runner secrets) |

### Prior Failure Resolution

- API-04 (round 1, AC-003): a Project run older than its folder's 6 newest, archived elsewhere, did not unlist its Project. Resolved by IR-002: the Projects view polls every run, so the removal changes the watched set. PLN-11 passes on `1112f13de1` (5 Project reads after the archive) and fails on SR-001's host (IMP-12).

### Observations

- The extra Project read moves (implementer's note): Workspaces → Projects reads every shown Project once more, at most once per switch. Runs → Projects no longer does. It is bounded and not a criterion.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IMP-04 grep and codegen), API-02, live `createAgentRun` use in API-03 | Proven |
| AC-002 | Yes | API-01 (IMP-02, IMP-03), grep outside ticket history, API-03 PLN-10 (zh-CN) | Proven |
| AC-003 | Yes | API-03 (start elsewhere), API-04 (removed elsewhere incl. an older run, hidden), API-01 (IMP-01, IMP-08), API-03 PLN-09 (own actions), API-06 (the poll's cost) | Proven |
| AC-004 | Yes | API-01, API-05; finalization is delivery's | Proven up to finalization |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 85% | 95% | Every AC proven live or at the repository layer | — | — |
| Changed-boundary directness | 80% | 95% | Live view, real poll, requests counted | — | — |
| Integration realism and mock gap | 70% | 95% | Another client is the real API; the store spec mocks the history | — | — |
| Environment and fixture fidelity | 85% | 95% | Fresh-start build; probe-owned stack | Signing on the runner | — |
| Failure, edge-case, lifecycle | 70% | 90% | Restart (PLN-08), hidden, the window edge | — | — |
| User surface | 80% | 90% | Projects view in Chrome, zh-CN, narrow | Electron shell not run (same renderer) | — |
| Durable coverage | 85% | 95% | PLN-11 added | — | — |

- Overall post-repository: 80%; overall final: 94%; simple average (round 1: 87%)
- Every critical AC directly proven: `Yes`
- Any final category below `90%`: `No`
- 95% target met: `No` (94%). The remaining gaps are bounded: the live rows run in Chrome, not the Electron shell, and signing is left to the runner.
- Residual risks: the Projects view's poll is now uncapped (measured within budget, API-06)

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed. Mode: `Browser` on a live stack. The store spec mocks the history, so it cannot show which runs the real 6-per-agent poll contains.

## Persisted-Data Transition Checks

- `Not Affected`.

## Compatibility / Legacy Scope Check

- `No` compatibility scope. The web document is removed without a wrapper. The server mutation is unchanged, as required.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/projects-left-navigation-probe.mjs` | PLN-11 added (388 AC-003): start and archive elsewhere with the view open, the hidden view, and a run older than its folder's 6 newest | API-04 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Another client | the public GraphQL API (`createAgentRun`, `archiveStoredRun`) from the probe | It is how another window, the phone or an application reaches the server | — |
| Model provider | scripted AGY | No provider proof needed | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stack | Yes | removed by the probe | Done |
| Fresh clone (incl. the unsigned dmg) | Yes | removed | Done |

## Preliminary Classification (On `Fail`)

N/A: this round passes. Round 1's classification (`Design Impact`, confirmed by CRR-001) is kept in the revision record.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none
- Test-code review: `Not Required — direct low-risk route`
- Next recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The Projects view's poll now reads every run, as the Runs view does. It was measured within the 250 ms budget (API-06).
  - The extra Project read on Workspaces → Projects is bounded.

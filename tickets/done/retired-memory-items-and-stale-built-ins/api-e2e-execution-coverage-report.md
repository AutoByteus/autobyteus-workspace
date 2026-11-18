# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review CRR-001 `Pass` (Medium / High)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - Three stale tests failed on the base for causes outside this ticket. Each was fixed as its own labelled baseline-fix commit (TESTING.md Rule 9): `cbdf02f15a` (SIR-002 probe fixtures), `24582b576c` (LM Studio helper and `memory-llm-flow`), `0a7993c227` (`openai-read-file-strict-live` tool search). SIR-001 (stale since autobyteus-461) is follow-up FU-001 (investigation § Ambiguities).
  - RRB-3 runs the built-in Daily Assistant, whose configuration enables `list_available_agents` (opt-in per definition).
  - API-02 (server typecheck) was rerun because RRB-3 is TypeScript.
  - API-12a's first run passed hollow (both tests returned in 1–2 ms because the helper found no model). It is not counted; the baseline fix made the tests call the model.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/retired-memory-items-and-stale-built-ins/tickets/in-progress/retired-memory-items-and-stale-built-ins/evidence/`

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`: RRB-3 (`remove-retired-built-in-agents-startup.e2e.test.ts`), SIR-002 (`skill-improvement-removal-cases.mjs`) and the three baseline-fix commits

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `91ee1603a5` (HEAD `53eb3521f1` docs only) plus this round's test commits, final `984e04707f` | macOS 26.5.2 (Darwin 25.5), shared host, load 45–110 throughout | Node v22.23.1; `dist/app.js` built at API-00 | `env -i PATH HOME=<resolved temp> TMPDIR USER`; RRB-3 `RUN_AGY_FAILURE_E2E=1` + scripted AGY CLI; test-owned data roots |
| ENV-2 | same | same | SIR-002 probe: real Chrome (playwright-core) → Nuxt dev → built backend, scripted AGY, owned temp root and HOME | probe defaults |
| ENV-3 | same | same | autobyteus-ts gated tests: LM Studio on this machine (`google/gemma-4-26b-a4b`, loaded by this run and unloaded after); OpenAI `gpt-5.4-mini` through the test vault | `RUN_LIVE_PROVIDER_TESTS=1`, `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` |
| ENV-4 | fresh clone of `984e04707f` | same | `pnpm install --frozen-lockfile`, then `build:electron:mac --arm64` as `release-desktop.yml` | `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=… CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log` | `Built-in agents bootstrap smoke check passed.` | for RRB/SID/TAU and SIR-002 |
| API-01 | AC-001 | repository grep | IMP-01's `git grep -nE` and pattern on HEAD `984e04707f`, each hit classified | — | Pass | `API-01-ac001-grep.log` | `# total hits: 37`; `## doc mention of the old files: 8`, `## frozen or released migration code: 12`, `## test naming the old file names (kept/ignored data): 17`; no `UNCLASSIFIED` group | the doc hits say retired, unrelated or removed |
| API-02 | AC-002 | typechecks | server: `pnpm -C autobyteus-server-ts typecheck` (rerun with RRB-3); web: reused IMP-04 | ENV-1 | Pass | `API-02-server-typecheck.log`; handoff IMP-04 | `test-file errors: 1011 in 316 files (baseline 1011 in 316 files)` / `[typecheck] PASS` | the web typecheck compiles no server E2E file; the probe is `.mjs` |
| API-03 | AC-002 | autobyteus-ts suite | Reused: IMP-03 | — | Pass (reused) | handoff IMP-03 | `Tests  1 failed \| 2492 passed` (the `run-bash-wrapper` case explained there) | autobyteus-ts `src` unchanged since `9f9ad727b5`; this round changed only gated integration tests and a helper, which the default suite skips |
| API-04 | REQ-002 | Memory page spec | Reused: IMP-05 | — | Pass (reused) | handoff IMP-05 | `Tests  7 passed (7)` | HEAD |
| API-05 | AC-002, REQ-003…006 | server unit suite | Reused: IMP-06 + IMP-08 | — | Pass (reused) | handoff IMP-06, IMP-08 | IMP-06 `8342 passed`; the 2 failures caused by this change were fixed and pass in IMP-08 | later commits changed only tests IMP-08 reran; the folder-watcher files are API-13 |
| API-06 | AC-003, AC-004 (GraphQL), AC-005, REQ-006 | built-Studio startup | `env -i … vitest run` RRB, SID, TAU startup files (`--reporter=verbose`) | ENV-1 | Pass | `API-06-07-startup-e2e.log` | `Test Files  3 passed (3)`, `Tests  9 passed (9)` (RRB-1…3, SID-1…3, TAU-1…3) | run 1 found the RRB-3 test bug; run 2 stopped at `AgyDiscoveryError: Antigravity model discovery timed out` (load); run 3 is the result |
| API-07 | AC-004 (`list_available_agents`) | an agent's real tool call after the upgrade start | RRB-3 (gated): both retired folders installed → built start → Daily Assistant run → `CALL_TOOL list_available_agents` | ENV-1 | Pass | `API-06-07-startup-e2e.log`, `API-07-rrb3-list-available-agents.json` | `structuredContent":{"agents":[{"name":"My Agent","kind":"agent","address":"/my_agent"}]}`: no Skill Self-Evolver, no Memory Compactor, no `/memory_compactor` | DEC-005's reason for removing the compactor (offered to every agent) is gone |
| API-08 | AC-003, AC-004 (Agents page), REQ-004, REQ-006 | browser (real Chrome) | `node tests/e2e/delegated-launch-defaults-probe.mjs --cases SIR-002 --output-dir evidence/API-08-sir-probe` | ENV-2 | Pass | `API-08-sir-probe.log`; `API-08-sir-probe/delegated-launch-defaults-evidence.json`, `SIR-002-agents-page-1280.png` | `SIR-002 Pass`; `"agentsPage": {"selfEvolver": 0, "memoryCompactor": 0, …}`, `"stillThere": []`, `"changed": []` | SIR-002 now installs the Memory Compactor too. Runs 1–2 (`API-08-run1-*`, `API-08-run2-*`) failed on stale base fixtures, fixed in `cbdf02f15a`. SIR-001 fails on its own stale expectation (FU-001) |
| API-09 | AC-002 | server integration | `test:integration:prepare`, `test:integration`; the two failing files alone | ENV-1 | Pass for this change (watcher failures, FU-003) | `API-09-server-integration.log`, `API-09b-watcher-integration-rerun.log` | `Tests  11 failed \| 495 passed`; alone `Tests  8 failed \| 21 passed (29)`, a different set | all in `file-system-watcher` (no changed file in its closure) and `package-auto-refresh` (imports the memory store only along its import chain; creates no run); `Timed out waiting for event`, `expected 6375 to be less than 5000` |
| API-10 | AC-002 | whole server E2E | `env -i … pnpm test:e2e`; failing files alone (10b); on base `2e9ac1e65b` in an own worktree (10c); the five branch-only ones on both (10d); `request-origin` twice each (10e) | ENV-1 | Pass for this change (29 failing files, each explained) | `API-10-server-e2e-suite.log`, `API-10b-…`, `API-10c-failing-e2e-on-base.log`, `API-10d-five-files-*.log`, `API-10e-request-origin-timing.log` | full `Test Files  29 failed \| 99 passed \| 148 skipped (276)`; 10b `16 failed \| 13 passed (29)`; 10c (base) `11 failed \| 6 passed (17)`; 10e: branch `Tests  11 passed (11)` ×2, base `2 failed` / `1 failed` | **13** pass alone; **11** fail on the base too (FU-002: `dsh` on the host, the base's prompt section, built-server start/stop timeouts); **5** failed twice here and passed alone (`agent-semantic-memory`, `project-task-search`, `context-file-size-limits`, `removed-skill-access-mode`, `request-origin`): in 10d the first two failed on base instead, and `request-origin` passed 2/2 here and 0/2 on base. Cause: timing against 5 s/10 s limits under load |
| API-11 | build input (`typecheck-baseline.json`) | fresh-start desktop build | fresh clone of `984e04707f` → `pnpm install --frozen-lockfile` → `build:electron:mac -- --arm64` → the job's verify steps; then the server typecheck in the same clone | ENV-4 | Pass (signing Not Tested) | `API-11-fresh-start-build.log`, `API-11b-fresh-clone-server-typecheck.log` | `[typecheck] PASS` (web, `87 in 37`), `build exit 0`, `engines ok`, `client ok`, `[terminal-runtime] ok: node-pty spawn probe`; clone server typecheck `1011 in 316 files (baseline 1011 in 316 files)` | the signing-policy step fails on the unsigned local build (`code has no resources but signature indicates they must be present`), which needs the runner's identity; the Docker image is not built here (its inputs that changed, install and server build, ran); clone removed |
| API-12 | AC-002 | gated memory flows (reads moved to `listTurnRawTracesOrdered()`) | LM Studio: `LMSTUDIO_HOSTS=… LMSTUDIO_TARGET_TEXT_MODEL=google/gemma-4-26b-a4b vitest run memory-llm-flow memory-tool-call-flow`; live: `AUTOBYTEUS_TEST_VAULT=… RUN_LIVE_PROVIDER_TESTS=1 OPENAI_STRICT_LIVE_RECORD=… vitest run openai-read-file-strict-live` | ENV-3 | Pass | `API-12a-lmstudio-memory-flows.log`, `API-12b-openai-strict-live.log`, `API-12b-openai-strict-live-record.jsonl` | LM Studio `✓ … 10881ms`, `✓ … 12204ms`, `lms ps after unload: No models are currently loaded.`; live `Tests  2 passed (2)`, the record shows `read_file` with `{"path": …}` and `write_file` with an absolute path | the earlier runs (`API-12a-run1-hollow`, `run2-model-not-found`, `run3-reasoning-trace`; `API-12b-run1/run2`) found the stale tests fixed in `24582b576c` and `0a7993c227`. Measured: the third record was a `reasoning` trace, present both in the turn read and in every record on file, so the read change was not the cause |
| API-13 | AC-002 | folder-watcher unit files | `vitest run` the two watcher files | ENV-1 | Pass for this change (agent-package watcher fails under load, FU-003) | `API-13-folder-watcher-units.log` | `Tests  4 failed \| 23 passed (27)`; skill watcher passes | no quiet host was available (load 45–80); the agent-package watcher's closure holds no changed file (IMP-06) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 | Proven | — |
| AC-002 | Yes | API-02, API-03, API-04, API-05, API-09, API-10, API-12, API-13, API-11 | Proven: no regression from this change; every failing test has a cause outside this change (FU-001…FU-003) | — |
| AC-003 | Yes | API-06 (RRB-1/2, SID), API-08 (SIR-002: desktop-like upgrade around real runs) | Proven | — |
| AC-004 | Yes | API-07 (`list_available_agents`), API-08 (Agents page, both retired agents), API-06 (GraphQL catalog) | Proven | — |
| AC-005 | Yes | API-06 (RRB-1: old item files and old compactor runs byte-identical, runs still listed) | Proven | — |
| REQ-007 (delivery gate) | — | — | Only The User Can Check | The founder's node: his approval and a backup before the first start that runs the removal. Not run on his data or a copy (TESTING.md); the migration is proven on released shapes |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | AC-001…AC-005 proven directly, including both AC-004 surfaces | — | — |
| Changed-boundary execution directness | 90% | 96% | real built starts, a real tool call, a real browser page, real model calls through the changed raw-trace reads | Docker image not built | release run |
| Cross-boundary integration realism and mock gap | 90% | 95% | only the AGY CLI is scripted; LM Studio and OpenAI real | — | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 94% | released shapes, test-owned roots, fresh clone with frozen install | loaded host (45–110); signing needs the runner | quiet host; release run |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 95% | failure/retry and idempotent second start (unit, SID-3, RRB-1), skipped-when-absent (RRB-2) | — | — |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | SIR-002 in real Chrome (Agents, Memory, Settings pages), fresh-clone desktop packaging with the spawn probe | signing | release run |
| Durable regression coverage quality and relevance | 90% | 95% | RRB-3 and SIR-002 cover both retired agents on both surfaces; three gated tests made to run again | RRB-3 and the probe are gated / slow | — |

- Overall post-repository confidence: 90%
- Overall final confidence: 95% (97 + 96 + 95 + 94 + 95 + 95 + 95 = 667 / 7)
- Calculation method: simple average of the seven applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the removal on the founder's node (REQ-007, delivery gate); signing and the Docker image (release run); R-1 (a user-made team or org that lists a retired agent stops admitting; not the case on his node); FU-001…FU-003 suite failures that are not caused by this change

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed
- Execution mode: `Lifecycle` (built starts), `Live API` (tool call), `Browser` (SIR-002), fresh-start build, gated live providers
- Confidence gap it addresses: AC-004's two surfaces, the upgrade path on a desktop-like stack, the shared-foundation suites and the build input
- Browser validation needed: yes, for the Agents page (AC-004); done in SIR-002

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (removal of the two folders); `Not Affected` for every run file
- Representative existing data used: both folders (the evolver with its skill), the compactor's old runs, a run with old `episodic.jsonl`/`semantic.jsonl`, a Memory Sync import, user agents; SIR-002's upgrade around real runs
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the outcome: API-06 (RRB-1/2, SID-1…3), API-08
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: the founder's node (delivery gate)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (AC-001: no live reader of the old item files)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/remove-retired-built-in-agents-startup.e2e.test.ts` (RRB-3) | Added (commit `984e04707f`) | API-06, API-07 | — |
| `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs` (SIR-002: Memory Compactor) | Updated (`984e04707f`) | API-08 | — |
| same file (baseline fix: released session shapes; `memory/episodic/` left out of the byte check) | Updated (`cbdf02f15a`) | API-08 | — |
| `autobyteus-ts/tests/integration/helpers/lmstudio-llm-helper.ts`, `autobyteus-ts/tests/integration/agent/memory-llm-flow.test.ts` (baseline fix) | Updated (`24582b576c`) | API-12 | — |
| `autobyteus-ts/tests/integration/agent/openai-read-file-strict-live.test.ts` (baseline fix) | Updated (`0a7993c227`) | API-12 | — |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI | `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`): real tool calls via `CALL_TOOL` | no inference needed for a tool call | none for this boundary |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| temporary probes in `autobyteus-ts/tests/integration/agent/zz-ec491-*.test.ts` (LM Studio discovery, trace types, one tiny OpenAI request) | Yes | deleted after each run, never committed | removed (`git status` clean) |
| a temporary `console.error` in `autobyteus-ts/src/agent/events/notifiers.ts` (to read the live test's error) | Yes | `git checkout --` the file right after the run | removed; `src` unchanged |
| a mistaken vitest run with `--root /` | Yes | stopped its processes (`pkill` of its own command line) within minutes | stopped |
| base worktree `ec491-api-e2e-base` (`2e9ac1e65b`) | Yes | `git worktree remove --force` | removed |
| fresh clone, build scripts | Yes | `rm -rf` | removed |
| LM Studio model `google/gemma-4-26b-a4b` (none loaded before) | Yes | `lms unload` | `No models are currently loaded.` |
| built servers, probe stack, temp HOMEs and data roots | Yes | tests' and probe's own cleanup; `rm -rf` | removed (probe cleanup receipt in its evidence JSON) |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): REQ-007, the removal on the founder's node (delivery gate)
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/code_reviewer` (Medium / High: proportional test-code review)
- Notes: follow-ups FU-001 (SIR-001 stale since autobyteus-461), FU-002 (E2E files failing on the base too; same family as FU-004 of autobyteus-493), FU-003 (load-sensitive watcher tests; same as FU-003 of autobyteus-493).

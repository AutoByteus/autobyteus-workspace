# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, CRR-002 `Pass` (Large / High)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - **The round ends in `Fail` (API-10, AC-001 / REQ-001).** API-08 (live SML), API-11 (fresh-start build) and the four stale E2E tests below are `Next Round`: the fix changes server code they exercise, and the stale tests wait for it.
  - API-09 found three integration tests that this change made untrue: their workspace doubles lack the new run-workspace methods. They are updated in `e571b1dd9e` (API-09b).
  - API-10e (not planned): `package-personal-settings` failed only in its teardown with no cause found in the diff, so it ran on a base worktree as TESTING.md rule 9 asks.
  - The rendered probe's CR-001 check needed two navigation corrections (runs 1–2 in `evidence/API-07-run1-*`) before run 3.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/tickets/in-progress/semantic-memory-for-every-agent/evidence/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: not this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `cd26f4d913` (HEAD `2e5f786091` records) plus this round's test edits (final `e571b1dd9e`) | macOS 26.5.2, shared host, load 45–125 | Node v22.23.1; `dist/` built at API-00 | `env -i PATH HOME=<temp> TMPDIR USER`; scripted AGY CLI where gated |
| ENV-2 | same | same | rendered probe: built server + Nuxt dev + Chrome (Playwright), probe-owned data root | 1440×900 and 390×844, en and zh-CN |
| ENV-3 | base `8430d9ef12` in an own worktree (removed after) | same | built `dist/` | comparison runs only (API-09c/d, API-10c, API-12) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log` | `Sanitized built-module/bootstrap smoke passed` | — |
| API-01 | AC-002 | grep | Reused: IMP-12 | — | Pass (reused) | handoff IMP-12 | only the retired-key drop list | no code with the switch's names changed since `cff2a6596a` |
| API-02 | AC-002 (types) | typechecks | server: reused IMP-10 and rerun with the double edits (API-02b); web: reused IMP-15 | ENV-1 | Pass | `API-02b-server-typecheck.log` | `test-file errors: 1006 in 315 files (baseline 1006 in 315 files)` / `[typecheck] PASS` | — |
| API-03 | all (units) | server unit suite | `pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass for this change | `API-03-server-unit-suite.log` | `Tests  2 failed \| 8515 passed \| 9 skipped (8526)` | both failures in `agent-package-folder-watcher.test.ts` (load; its closure holds only `agent-definition/domain/models.ts`, the removed field), as on autobyteus-491/493 |
| API-04 | AC-004…AC-010 (web) | web units | Reused: IMP-11, IMP-11b, IMP-14, IMP-15 | — | Pass (reused) | handoff | — | by impact |
| API-05 | AC-001, AC-003, AC-008, AC-009, AC-011 | scripted-AGY e2e | `RUN_AGY_FAILURE_E2E=1 … vitest run agent-semantic-memory internal-agents memory-explorer-graphql`; reruns | ENV-1 | Pass | `API-05-scripted-agy-e2e.log`, `API-05b-…`, `API-05c-semantic-memory-e2e-rerun.log` | 05c `Tests  9 passed (9)`; IA 5/5 (IA-02 alone `✓`); explorer 3/3 | first run: SM-04 `AgyDiscoveryError: Antigravity model discovery timed out`, IA-02 the 5 s default (load). SM-04 cannot run alone (it uses earlier cases' definitions), so the whole file reran |
| API-06 | AC-011 (S-1) | `createAgentRun` with a semantic workspace id | temporary probe (in-process Studio, scripted AGY; not committed) | ENV-1 | Pass (observation recorded) | `API-06-semantic-workspace-run-probe.log` | blank root + `semantic_ws_…`: `"success": false, "message": "Error: workspaceRootPath is required when preparing a run."`; the same for `semantic_global_ws` | Observation: the folder's **path** as `workspaceRootPath` gives an ordinary `filesystem` workspace (`agent_ws_…`), listed like any folder the user chooses; the view's own `semantic_ws_` workspace is never used or listed. REQ-007 is about the view's workspace |
| API-07 | AC-004…AC-011, REQ-007 (CR-001) | rendered probe | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir evidence/API-07-probe` with SMV-090/091; negative control on the pre-CR-001 component | ENV-2 | Pass | `API-07-rendered-probe.log`, `API-07-probe/evidence.json`, `API-07-probe/CR-001-chat-workspace-menu-after-leaving-1440x900.png`; `API-07nc-negative-control.log` | `Pass (35/35 checks)`; in `API-07-probe/evidence.json` SMV-091 `"pass": true`, `"menuOptions": [{"id": "chat-workspace-option-temp", …}]` (only the Temp workspace); negative control `Fail (30/31 checks)`, `SMV-091 False` with `chat-workspace-option-semantic_ws_probe-researcher` "Research Assistant" | the component file was restored after the control (`git diff` empty) |
| API-08 | AC-001, AC-009 (real runtimes) | live SML (Codex, Claude, native) | — | — | Next Round | — | — | the fix changes `prepareForRun`, which every live case runs |
| API-09 | all | server integration | `test:integration:prepare`, `test:integration`; the three stale files after the double update; file-system watcher branch vs base | ENV-1, ENV-3 | Pass for this change (after updating stale doubles) | `API-09-server-integration.log`, `API-09b-stale-doubles-fixed.log`, `API-09c-file-system-watcher-branch-vs-base.log`, `API-09d-watcher-three-tests.log` | `Tests  9 failed \| 505 passed`; 09b `Tests  17 passed (17)`; 09c base `6 failed` / `4 failed`, branch `6` / `7`; 09d, the 3 tests that failed only on the branch at first, three runs each: branch `1 failed`, `3 passed`, `3 passed`; base `1 failed`, `2 failed`, `3 passed` | 4 tests in 3 files (`agent-run-manager.memory-layout.real`, `agent-run-prompt-fallback`, `agent-tools-mcp-routes`) were made untrue: `this.workspaceManager.getRegisteredWorkspaceRootPath is not a function`, `getOrCreateRunWorkspace is not a function`. The watcher (changed code: it now passes `followSymlinks`, `true` for ordinary workspaces as chokidar's default) fails `INCONCLUSIVE` on base too |
| API-10 | **AC-001 / REQ-001 (application-owned runs)** | whole server E2E | `env -i … pnpm test:e2e`; failing files alone; three files on base; RE-05 with a temporary print of the launch response (reverted) | ENV-1, ENV-3 | **Fail** | `API-10-server-e2e-suite.log`, `API-10b-failing-e2e-rerun.log`, `API-10c-three-files-branch-vs-base.log`, `API-10d-re05-launch-error.log`, `API-10e-personal-settings-alone.log` | `Test Files  14 failed \| 114 passed \| 154 skipped (282)`; 10d `RE05DIAG {"result":{"data":null,"errors":[{"message":"ENAMETOOLONG: name too long, mkdir '<TMP>/application-reload-repair-e2e-…/data/memory/semantic/team-local-agent%3Abundle-team__6170706c6963…%3Aresearcher'` (folder name 439 bytes); 10b `Test Files  3 failed | 4 passed (7)` with RE-05 failing alone | **Product failure:** `agent-runtimes-running-agents` RA-04, `application-import-codex-launch` IC-01 and `application-reload-repair` RE-05 (Brief Studio `launchDraftRun`) fail on it. **Stale tests (Next Round, after the fix):** `agent-package-private-skills` and `configured-skill-on-demand-loading` (workspace doubles as in API-09), `memory-sync-multiprocess` (queries the removed `AgentWithMemorySummary.memory`), `memory-sync-api` (`EPISODIC_CATALOG_NOT_COMPOSED`: its schema-only server sets no catalog binding). **Load, pass alone:** `agent-package-definitions-live-refresh`, `integrations-graphql`, `peer-host-refused`, `request-origin-and-phone-routes`; `embedding-settings` and `project-task-boundaries` pass on base and on the branch in API-10c. **Pre-existing (FU-005):** `package-personal-settings`: 7/7 tests pass, the `afterAll` `app.close()` times out (`Hook timed out in 10000ms`) on the branch 2/2 and on base 1/2 (API-10e) |
| API-11 | build inputs | fresh-start desktop build | — | — | Next Round | — | — | after the fix |
| API-12 | S-4 (AC-012 residual) | imported team and org cards, base vs branch | temporary script over the dist services of each build, on an APFS clone of `~/.autobyteus/server-data/memory/imports` (read only, no server, clone removed) | ENV-1, ENV-3 | Pass (pre-existing, FU-004) | `API-12-imported-team-org-cards.log` | base and branch: `"teamFolders": 113`, `"total":0` team cards; `"orgFolders": 0`, 0 org cards | not caused by this change |
| API-13 | — | folder-watcher units | within API-03 | ENV-1 | Pass for this change (load) | `API-03-server-unit-suite.log` | as API-03 | no quiet host (load 45–125) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 (standalone, team member, coordinator, delegated copy, team-local member, scripted AGY), units (reused) | **Not Proven**: an application-owned run of a bundled team-local agent cannot start (API-10, `ENAMETOOLONG`); live runtimes Next Round | — |
| AC-002 | Yes | API-01 | Proven | — |
| AC-003 | Yes | API-05 (SM-01/02) | Proven | — |
| AC-004 | No | API-07, IMP-13 | Proven | — |
| AC-005 | Yes | API-07 | Proven | — |
| AC-006 | Yes | API-05 (SM-11), API-07 (SMV-040…043, 080) | Proven | — |
| AC-007 | No | web units (reused) | Proven | — |
| AC-008 | Yes | API-05 (internal-agents) | Proven | — |
| AC-009 | Yes | API-05 (SM-04/05/07), units | Proven on the scripted runtime; live Next Round | — |
| AC-010 | Yes | API-07 (Global), API-05 | Proven | — |
| AC-011 | Yes | API-06, API-07 (SMV-040, SMV-090/091 + negative control), API-05 (SM-11) | Proven | — |
| AC-012 | Yes | IMP-09 (reused), API-12 | Proven (imported team cards at 0: pre-existing, FU-004) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 70% | AC-002…AC-012 proven | AC-001 fails for application-owned runs | the fix, then API-10 and API-08 |
| Changed-boundary execution directness | 90% | 90% | real server, real page, real runs (scripted), node refusals at the boundary | live runtimes not run this round | API-08 |
| Cross-boundary integration realism and mock gap | 85% | 85% | the whole suites found the failure | live CLIs next round | API-08 |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | test-owned data; founder's data read only through a clone | load 45–125 | — |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 70% | CR-001 timing path with negative control; links; refusals | run start fails hard on a folder it cannot create | the fix |
| User-surface, browser, and desktop-shell confidence | 92% | 92% | rendered probe 35/35 | fresh-start build next round | API-11 |
| Durable regression coverage quality and relevance | 88% | 88% | probe extended; stale doubles fixed | four stale E2E tests wait for the fix | next round |

- Overall final confidence: 84% (simple average of the seven categories)
- Every critical acceptance criterion directly proven: `No` (AC-001)
- Any final applicable category below `90%`: `Yes` (requirement proof, integration realism, failure evidence, durable coverage)
- Default target met: `No`

## Broader Validation Decision (Mandatory)

- Decision: `Required`, partly executed (rendered probe, scripted runtimes, whole suites); live runtimes and the fresh-start build wait for the fix
- Browser validation needed: yes; done (API-07)

## Persisted-Data Transition Checks

- Approved decision: stored `semanticMemoryEnabled` `Directly Usable — No Migration`
- Cases: API-05 SM-01/SM-02
- Version-specific branch or fallback observed: `No`
- Note: the same folder-name rule is used by the existing semantic folders and the episodic catalog (`AgentMemoryLayout` `definitionFolderName`); the over-long name is not new data, it is the first time every agent's folder is created

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` (SMV-090/091) | Updated (`e571b1dd9e`) | API-07 | — |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts`, `agent-run-prompt-fallback.integration.test.ts`, `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` (doubles) | Updated (`e571b1dd9e`) | API-09 | — |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI | scripted fixture | no inference needed for run starts | live runtimes next round |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| API-06 probe test file | Yes | deleted after the run, never committed | removed |
| API-07 negative control (component from `cff2a6596a`) | Yes | `git checkout --` the file | restored (`git diff` empty) |
| RE-05 `console.log` of the launch response | Yes | file copied back | restored (`git diff` empty) |
| base worktree `ec554-api-e2e-base` (made twice: API-09c/d/10c/12, then API-10e) | Yes | `git worktree remove --force`, `git worktree prune` | removed |
| APFS clone of the founder's `imports/` (read only) | Yes | `rm -rf` | removed |
| servers, probe stack, temp HOMEs | Yes | own cleanup | removed |

## Preliminary Classification (On `Fail`)

- **Failing cases:** API-10: `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` RA-04, `tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` IC-01, `tests/e2e/runtime/application-reload-repair.e2e.test.ts` RE-05. Criterion: AC-001 / REQ-001 ("every run kind … application-owned").
- **Reproduction:** `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" USER="$USER" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-import-codex-launch.e2e.test.ts --no-watch` (after `pnpm -C autobyteus-server-ts build`). It fails at `expect(launched.body.result.errors).toBeUndefined()`; the error is the `ENAMETOOLONG` below. The base was not run for these three: the cause is found (TESTING.md rule 9), and the failing `mkdir` is the folder this change creates at every run start.
- **Expected:** launching a Brief Studio draft run attaches its team (`launchDraftRun.status === "ATTACHED"`).
- **Observed:** `ENAMETOOLONG: name too long, mkdir '<memory>/semantic/team-local-agent%3Abundle-team__6170706c69636174696f6e2d6c6f63616c3a…__62726965662d73747564696f__62726965662d73747564696f2d7465616d%3Aresearcher'`. The folder name is 439 bytes; macOS and Linux allow 255.
- **Why (read):** `AgentSemanticMemory.prepareForRun` now creates `<memory>/semantic/<encodeURIComponent(agentDefinitionId)>` for every run (REQ-001). An application-bundled team-local agent's id embeds the application source hex-encoded (`bundle-team__<hex of "application-local:" + the package path>__<hex app id>__<hex team id>`, then `:<member>`), so the encoded name exceeds the limit whenever the package path is longer than about 100 characters, which every real install path is. Before this change, the folder was created only for agents with the switch on, which bundled application agents did not have. The `mkdir` failure aborts the run start, so the launch fails.
- **Related, not a failure here:** the episodic catalog (autobyteus-493) names its folders with the same helper (`AgentMemoryLayout` `definitionFolderName`); its writes are contained (logged, `EPISODIC_CATALOG_WRITE_FAILED`), so a bundled team-local agent's catalog would be missing, not a failed start.
- **Preliminary classification:** `Design Impact`. The design keeps the semantic folder name `encodeURIComponent(definition id)` (the existing rule, shared with the episodic catalog) and makes its creation mandatory at every run start. A name rule that fits 255 bytes for every id (for example a bounded name with a hash), and what a start does when the folder cannot be prepared, are design decisions. The rule is also the agent's prompt path, the Memory page's folder lookup, and the catalog's folder.
- **Recommended owner:** failure-origin review by `/code_reviewer`; then the Solution Designer if confirmed.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-001 (application-owned runs). Next Round: API-08, API-11, and the four stale E2E tests (API-10 notes)
- Preliminary classification and recommended owner: `Design Impact`, failure-origin review by `/code_reviewer`
- Next recipient from `get_handoff_rules`: `/code_reviewer`
- Notes: everything else proven this round holds: the read-only view and its node refusals, CR-001 (with a negative control), owner Browse, stored keys, the scripted run kinds. Follow-ups FU-004 (imported older-layout team cards) and FU-005 (personal-settings E2E teardown timeout), both pre-existing.

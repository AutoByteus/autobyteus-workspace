# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history (round 1: `API-REV-001`, Fail).

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (round 2 section "Round 2")
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-003` (round 3: merged state, LF-1…LF-4; round 2: `API-REV-002`)
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 3, CRR-006 `Pass` (Targeted Delta Review) of the delivery Local Fixes LF-1…LF-4 (IR-004, `27498a16ac`) on the merged state (`7ac6b392c1`); round 2: CRR-004 after IR-003 (SR-009)
- Prior round reviewed: round 1 (`API-REV-001`, Fail: `ENAMETOOLONG` for bundled team-local agents). Prior failure resolved: RA-04, IC-01, RE-05 pass (API-15) and the whole suite shows no `ENAMETOOLONG` (API-10)
- Deviations from the investigation's plan, and why:
  - IC-03 needed two corrections found by running it: this Codex run is not `workspace-write`, so Codex gets no writable roots (the live suite proves them, API-08); and the scripted Codex never ends a turn, so the catalog had nothing to follow. The fixture got an opt-in `codex-turn complete` (a turn ends as a real one does) and records the prompt.
  - The whole E2E suite's first start ran a wrong command (`pnpm -C <package> test:e2e`, no such script; nothing ran); it was restarted with round 1's root `pnpm test:e2e`.
  - The host was loaded by other worktrees' runs throughout (load 45–157, `fseventsd` 108–179% CPU), so every failure was rerun alone and, where it still failed, compared with a built base worktree under the same conditions (TESTING.md rule 9).
  - Added API-07 rerun (round 2) so the rendered evidence for AC-013 is this round's own, not only IMP-21.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/semantic-memory-for-every-agent/tickets/in-progress/semantic-memory-for-every-agent/evidence/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: requested (changed durable test code below)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `f393f403d5`; tests at `5edda27b2d` (stale rewrites) and `42c2f5189b` (IC-03, SM-12, fixture) | macOS 26.5.2 ARM64, shared host, load 45–157 | Node v22.23.1; server `dist/` built at API-00 round 2 | `env -i PATH HOME=<temp> TMPDIR USER`; scripted CLIs where the file uses them |
| ENV-2 | same | same | real CLIs: codex-cli 0.171.0, Claude Code 2.1.328, native AutoByteus (Anthropic, test vault) | live suite's own data root under `~/.autobyteus-e2e` (removed by the suite; 0 left) and its own `CODEX_HOME` linking the host `auth.json`; the user's CLI config untouched |
| ENV-3 | same | same | rendered probe: built server + Nuxt dev + Chrome (Playwright), probe-owned data | 1440×900, 390×844, en and zh-CN |
| ENV-4 | base `8430d9ef12`, own worktree (built), removed after | same | built `dist/` | comparison runs only (API-09, API-10) |
| ENV-6 | round 3: `b4561b0b6d` (code `27498a16ac`, merged state) | same | server `dist/` rebuilt at API-00 round 3 | scripted AGY CLI |
| ENV-5 | `42c2f5189b`, fresh `git clone --no-local` | same | `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` | the release job's env (`NO_TIMESTAMP`, `AUTOBYTEUS_BUILD_FLAVOR=personal`, `PRISMA_CLI_BINARY_TARGETS`, `CSC_IDENTITY_AUTO_DISCOVERY=false`, `GITHUB_REPOSITORY`); clone removed |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build-round2.log` | `Sanitized built-module/bootstrap smoke passed`, `exit 0` | round 1: `API-00-server-build.log` |
| API-01 | AC-002 | grep | Reused (round 1 / IMP-12) | — | Pass (reused) | handoff IMP-12 | — | no switch code changed since |
| API-02 | AC-002 (types) | typechecks | server with this round's test code; web: in API-11's build | ENV-1, ENV-5 | Pass | `API-02c-server-typecheck-round2.log`, `API-11-fresh-start-desktop-build.log` | `test-file errors: 1006 in 315 files (baseline 1006 in 315 files)` / `[typecheck] PASS`; web `87 in 37 files (baseline 87 in 37 files)` / `PASS` | round 1: `API-02b-…` |
| API-03 | all (units) | server unit suite | Reused: round 1 full suite + IMP-17/IMP-18 (SR-009 impact set at `f393f403d5`) | — | Pass (reused) | `API-03-server-unit-suite.log`; handoff IMP-17/18 | round 1 `8515 passed`; IMP-18 `2,449 tests passed` | the files changed since round 1 are in IMP-18's impact set |
| API-04 | AC-004…AC-010 (web) | web units | Reused (IMP-11/11b/14/15) | — | Pass (reused) | handoff | — | no web source change since |
| API-05 | AC-001, AC-003, AC-008, AC-009, AC-011, AC-014 | scripted-AGY e2e | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs SEMANTIC_MEMORY_E2E_EVIDENCE_DIR=… vitest run agent-semantic-memory internal-agents memory-explorer-graphql` | ENV-1 | Pass | `API-05r2-scripted-agy-e2e.log`, `API-05r2-sm-evidence/` | `Tests  18 passed (18)`; SM-04…SM-12 `✓` | round 1: `API-05*` |
| API-06 | AC-011 (S-1) | `createAgentRun` with a semantic workspace id | Reused (round 1 probe) | — | Pass (reused) | `API-06-semantic-workspace-run-probe.log` | `workspaceRootPath is required when preparing a run.` | workspace code unchanged since |
| API-07 | AC-004…AC-011, AC-013 (Semantic tab), REQ-007 (CR-001) | rendered probe | `node autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs --output-dir evidence/API-07r2-probe` | ENV-3 | Pass | `API-07r2-rendered-probe.log`, `API-07r2-probe/evidence.json`, `API-07r2-probe/SR-009-long-id-semantic-file-open-1440x900.png`, `…/CR-001-chat-workspace-menu-after-leaving-1440x900.png` | `Pass (38/38 checks)`; SMV-100 `"encodedBytes": 220`, folder `…-long-#ff378f3f1036d2a8`; SMV-101 the tab finds it; SMV-102 the file opens; SMV-091 menu only `chat-workspace-option-temp` | round 1 negative control for CR-001: `API-07nc-*` |
| API-08 | AC-001, AC-009, REQ-011 (real runtimes) | live SML | `env -i PATH HOME USER LOGNAME TMPDIR <gate> AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault SEMANTIC_MEMORY_LIVE_E2E_EVIDENCE_DIR=… vitest run tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts`, each runtime alone (`RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`, `RUN_AUTOBYTEUS_SEMANTIC_MEMORY_E2E`) | ENV-2 | Pass | `API-08-live-sml-codex.log` (+ `API-08-codex/`, `-run2/`, `-run3/`), `API-08-live-sml-claude.log` (+ `API-08-claude/`), `API-08-live-sml-autobyteus.log` (+ `API-08-autobyteus/`) | Codex run 3 `Tests  5 passed | 1 skipped`; Claude `4 passed | 2 skipped`; native `3 passed | 3 skipped`; `SML-WRITE-codex.json` `"writable_roots": [<agent folder>, <semantic-global>]`, the file holds the codeword, `"approvals": []` | Codex runs 1–2 failed after the memory proof held: run 1 `terminateAgentRun` answered `success: false` before the restore step (not reproduced in run 3, which printed `"Agent run terminated successfully."` with a temporary print, reverted); run 2 the model answered "permission denied" without running the control command (`"tools": []`). Terminate and the control are unchanged code; recorded as residuals |
| API-09 | all | server integration | `test:integration:prepare`, `test:integration`; failing files alone; `package-auto-refresh` alternated with base | ENV-1, ENV-4 | Pass for this change | `API-09r2-server-integration.log`, `API-09r2b-watcher-files-alone.log`, `API-09r2c-host-load-snapshot.log` | `Tests  13 failed \| 501 passed`; all 13 in OS folder-watcher files; skill-update-notice alone `30 passed`; package-auto-refresh branch `4 failed` / `1 failed`, base `3 failed` / `1 failed`, AC-012 in all four; snapshot `fseventsd` 157.6% | file-system-watcher fails alike on base (round 1 API-09c/d). Watcher code unchanged since round 1 |
| API-10 | all | whole server E2E | root `env -i … pnpm test:e2e`; the 12 failing files one at a time; the 7 left on base; three alternations; embedding-settings 3+3 | ENV-1, ENV-4 | Pass for this change | `API-10r2-server-e2e-suite.log`, `API-10r2b-failing-files-rerun.log`, `API-10r2c-seven-files-base.log`, `API-10r2d-three-files-branch-vs-base.log` | `Test Files  12 failed \| 116 passed`, `ENAMETOOLONG` count 0; 10r2b `5 passed (12)`; 10r2c base: node-locality, request-origin, Grok compaction, update-notifications fail; 10r2d node-access passes 2/2, request-origin fails on base too, embedding base `3 failed` once like the branch | **Fails on base alike:** node-locality (`NodeFixture.stop`), request-origin, Grok compaction (hook), update-notifications (hook), embedding-settings. **Pass on rerun:** IC file (IC-01…03), memory-sync-held-back, Grok runtime replay, task-search, websocket-lifecycle, live-refresh, node-access. The IC file failed in the suite at import ("Codex exact process exit could not be confirmed": Brief Studio quarantined before launch), as RE-01…05 once did in API-15 under load |
| API-11 | build inputs (`autobyteus-web/package.json`, `generated/graphql.ts`) | fresh-start desktop build | fresh clone of `42c2f5189b`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the job's env, then "Verify bundled Prisma ARM64 engine target" and "Verify packaged terminal runtime ARM64" from the workflow | ENV-5 | Pass | `API-11-fresh-start-desktop-build.log` | `build exit 0`; `prisma verify ok`; `[terminal-runtime] ok: node-pty spawn probe`; `AutoByteus_personal_macos-arm64-1.5.14-beta.1.dmg`; `clone removed: yes` | signing, notarization, x64, Linux, Windows need the runner: Not Tested |
| API-12 | S-4 | imported team and org cards | Reused (round 1) | — | Pass (pre-existing, FU-004) | `API-12-imported-team-org-cards.log` | base and branch `"teamFolders": 113`, 0 cards | — |
| API-13 | — | folder-watcher units | within API-03 | — | Pass for this change | — | — | no quiet host this round either (see API-09) |
| API-17 | merged state: LF-2, LF-3 (AC-001 prompt sections; AC-012 closed runs on the Memory page) | the two changed test files | each alone, twice: `env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run <file>`; LF-1/LF-4 reused IMP-23/IMP-24; merged-state reruns of the other durable files reused from DEL-11/14/16 | ENV-6 | Pass | `API-00-server-build-round3.log`, `API-17-lf2-lf3-files.log` | `collaboration-prompt-wording` `Tests  14 passed (14)` twice (CPW-P1…P3 `✓`); `open-task-tree-upgrade-startup` `Tests  3 passed (3)` twice, OT-1 68081ms and 21176ms (within its 60 s wait) | comment fix `d0770bcb5b` |
| API-14 | the four stale E2E files | rewrites (made untrue by this change) | each file after its rewrite, one run: `env -i … vitest run <4 files>` | ENV-1 | Pass | `API-14-stale-e2e-rewrites.log` | `Test Files  4 passed (4)`, `Tests  12 passed (12)` | commit `5edda27b2d` |
| API-15 | **AC-013**, prior failure recheck | IC-03 + RA-04, IC-01, RE-05 | `env -i … vitest run agent-runtimes-running-agents application-import-codex-launch application-reload-repair`; RE file alone; negative control (layout prefix 100) | ENV-1 | Pass | `API-15-ac013-and-round1-failures.log`, `API-15nc-ic03-negative-control.log` | IC-01…03 `✓`, RA-04 `✓`, no `ENAMETOOLONG`; RE alone `Tests  5 passed (5)`; control `× IC-03`, `AssertionError: Brief Studio Researcher: expected '/private/var/folders/…' to be '/private/var/folders/…'` (the layout's 100-byte name against the decision's 120-byte one) | in the joint run RE-01…05 failed at import (Codex app-server exit not confirmed, quarantine), passing alone; the layout file restored (`git diff` empty) |
| API-16 | **AC-014** | SM-12 | inside API-05 | ENV-1 | Pass | `API-05r2-scripted-agy-e2e.log`, `API-05r2-sm-evidence/SM-12-log.json`, `…/SM-12-prompt-unprepared-folder.md` | `✓ SM-12 (AC-014, DEC-015)`; the log `["SEMANTIC_MEMORY_PREPARE_FAILED", {"definitionId": …, "folder": "agent", "reason": "EACCES…"}]`; the prompt ends with the Global section and has no `## Semantic Memory` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 (SM-04…07: standalone, Project, team member, delegated copy, team-local), API-08 (Codex, Claude, native), API-15 (IC-03: an application-owned bundled member's run is told both folders; RA-04, IC-01, RE-05 launch) | Proven | — |
| AC-002 | Yes | API-01 (reused) | Proven | — |
| AC-003 | Yes | API-05 SM-01/02 | Proven | — |
| AC-004 | No | API-07 | Proven | — |
| AC-005 | Yes | API-07 | Proven | — |
| AC-006 | Yes | API-05 SM-11, API-07 | Proven | — |
| AC-007 | No | API-04 (reused) | Proven | — |
| AC-008 | Yes | API-05 (internal-agents 5/5) | Proven | — |
| AC-009 | Yes | API-05 SM-04/05/07, API-08 SML-GLOBAL on Codex, Claude and native | Proven | — |
| AC-010 | Yes | API-07 (Global), API-05 | Proven | — |
| AC-011 | Yes | API-06 (reused), API-07 SMV-090/091 (round 1 negative control), API-05 SM-11 | Proven | — |
| AC-012 | Yes | IMP-09 (reused), API-12 | Proven (imported team cards at 0: pre-existing, FU-004) | — |
| AC-013 | Yes | API-15 IC-03 (+ negative control): the Memory page's member lookup gives `<memory>/semantic/<DEC-016 name>`, the started member's folder exists, its prompt has both sections naming it, its episodic catalog folder has the same name, every folder name ≤ 255 bytes; API-07 SMV-100…102: the Semantic tab finds the shortened folder and opens a file in it; ids that fit keep `encodeURIComponent(id)`: API-05 (`folderOf` = full encoded name) | Proven | — |
| AC-014 | Yes | API-16 SM-12 (real run start), units IMP-17 (reused) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | every AC directly proven; AC-013 end to end at the server and in the rendered page; AC-014 at a real run start | the Codex restore step passed in 1 of 3 runs (the other two stopped before it for reasons outside the change) | — |
| Changed-boundary execution directness | 94% | 96% | real server over HTTP/GraphQL/WebSocket; real Codex, Claude and AutoByteus CLIs/providers; real page | Grok, DeepSeek harness and Antigravity not live (same composer; unit and scripted-AGY proof) | live runs of those runtimes |
| Cross-boundary integration realism and mock gap | 92% | 95% | scripted CLIs only where the file needs no inference; live suites cover the real sandbox roots and `--add-dir`; IC-03 uses the real application import and launch | IC-03's Codex run is not `workspace-write`, so it proves no roots for a bundled member (the roots are the same list, proven live for a normal agent) | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 93% | clean env runs, own data roots, test vault, own `CODEX_HOME`; base comparisons in a built worktree; fresh clone build | the host was loaded by other worktrees all round (`fseventsd` up to 179%): watcher- and timing-sensitive files could only be classified by comparison, not run clean | a quiet host |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 95% | DEC-015 contained at a real run start; DEC-016 negative control; restore with the same roots (Codex run 3); prior failure rechecked | Codex run 1's `terminateAgentRun` `success: false` once, not reproduced; CF-11 (stale `catalog.md` when runs are removed while the server is stopped, documented) | — |
| User-surface, browser, and desktop-shell confidence | 94% | 96% | rendered probe 38/38 this round, incl. the shortened folder and CR-001; fresh-start packaged build with Prisma and terminal verify steps | the packaged app was built and verified, not launched on a user's data (TESTING.md: no start on real data) | — |
| Durable regression coverage quality and relevance | 94% | 95% | IC-03 (independent DEC-016 oracle, negative control), SM-12, the four stale files follow the change, fixture options opt-in | IC-03's member selection depends on Brief Studio's bundled team, the sample application the suite already uses | — |

- Overall final confidence: 95.1% (simple average)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default target met: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed: live runtimes (Codex, Claude, native AutoByteus), rendered probe, fresh-start desktop build
- Residual risk: Grok, DeepSeek and Antigravity live; signing and other platforms (release runner)
- Browser validation needed: yes; done (API-07)

## Persisted-Data Transition Checks

- Approved decision: stored `semanticMemoryEnabled` `Directly Usable — No Migration`; DEC-016 names: ids that fit keep their names, over-long ids never had a folder (no migration)
- Cases: API-05 SM-01/02; API-15 IC-03 (fit/short rule from the decision); API-07 SMV-100
- Version-specific branch or fallback observed: `No`
- Delivery note (CF-13): ids of 201–255 encoded bytes, which had a full-name folder before, get the shortened name now; the founder's node has none (IMP-22, names only)

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/semantic-memory-view-probe.mjs` (SMV-090/091) | Updated (round 1, `e571b1dd9e`) | API-07 | — |
| `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts`, `agent-run-prompt-fallback.integration.test.ts`, `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | Updated (round 1, `e571b1dd9e`): doubles made untrue | API-09 | — |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts`, `tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts` | Updated (`5edda27b2d`): run-workspace doubles; expected headings include both sections | API-14 | — |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts`, `memory-sync-multiprocess.e2e.test.ts` | Updated (`5edda27b2d`): removed card field no longer queried; memory-sync-api binds the episodic catalog | API-14 | — |
| `autobyteus-server-ts/tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` (IC-03) | Added (`42c2f5189b`) | API-15 | — |
| `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs` | Updated (`42c2f5189b`): records `thread/start` prompts; opt-in `codex-turn complete` | API-15 | — |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` (SM-12) | Added (`42c2f5189b`) | API-16 | — |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` (LF-2 by delivery, `27498a16ac`; its comment `d0770bcb5b`), `tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts` (LF-3 by delivery, `27498a16ac`) | Updated | API-17 | — |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI (API-05) | scripted fixture | run starts need no inference | AGY live not run |
| Codex app-server in IC-03 | scripted fixture | the launch needs no inference; real Codex proven in API-08 | IC-03's run is not `workspace-write` |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| IC-03 diagnostic print | Yes | file copied back | removed (`grep -c IC03DIAG` 0) |
| negative control (layout prefix 100) | Yes | `git checkout --` | restored (`git diff` empty) |
| live suite terminate print (Codex runs 2–3) | Yes | file copied back | removed (`git diff` empty) |
| base worktree `ec554-api-e2e-base` | Yes | `git worktree remove --force`, `prune` | removed |
| fresh-start clone | Yes | `rm -rf` in the script | `clone removed: yes` |
| sampling and fresh-start scripts in `/tmp` | Yes | `rm` | removed |
| live data roots under `~/.autobyteus-e2e` | the suite | the suite removes them | 0 left |

## Latest Authoritative Result

- Result: `Pass` (round 3 on the merged state: API-17; confidence unchanged at 95.1%: the fixes touch two test files, a comment and the web demo, all rerun or reused at their commit)
- Prior failure: resolved (API-15, API-10)
- Next recipient from `get_handoff_rules`: `/code_reviewer` (proportional test-code review, Large / High)
- Residuals: Codex run 1's `terminateAgentRun` `success: false` once after a denied approval (not reproduced; unchanged code); CF-11; CF-13 (delivery note); Grok/DeepSeek/Antigravity live and signing/other platforms not tested; host load. Follow-ups FU-003…FU-005 (pre-existing).

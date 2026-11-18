# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`; the history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-007`
- Test progress log: `api-e2e-test-progress.md`
- **Round 7, the eighth merged state (CRR-017; head `2037a3be5a`, merge `5eb8246076` of `53b72018ad`: 491, 492; test fix `8e8c21c2c4`):**
  - The migration order on one first start (new MO-1 in ALM-1's file): this ticket's two `20261117` migrations, then 491's `20261118`, each with its status; the retired copies gone, the compactor's run kept and listed; a second start unchanged.
  - `list_running_agents` on the native tool and Agent Tools MCP (new LRN-1/LRN-2): local, `node`, switch off; the application host by the same-senders rule.
  - 492's messaging through the two-server suite (49/49 after a test-helper fix for RC-19), prompt wording, the contract stories, the MCP routes.
  - This ticket's merged cases and the browser probes 7/7 (SIR-001 now passes: FU-500-10 resolved by 492).
  - Evidence: `evidence/api-e2e/API-r7-runs.txt`; raw logs `/tmp/api500/r7`. **Result: `Pass`, 95%.** FU-500-15 (two observations, both the same at base).
- **Round 6, the seventh merged state (CRR-015; head `94376f166d`, merge `bb42531c7d` of `75048cbaf4`: the v1.5.13 records, 517's FU-002/FU-003):**
  - AC-005's gate on the merged commit: the watcher file 5 of 5 on Linux (14/14, 0 labels). Quiet macOS: Not Tested.
  - The merge's touched suites pass in Linux, or on the Mac where a root container can't run them.
  - The base's own rename timeouts on a loaded macOS are FU-500-14.
  - Evidence: `evidence/api-e2e/API-r6-runs.txt`. **Result: `Pass`, 95%.** No test change by me.
- **Round 5, the fourth merged state (CRR-013; head `d141a2e783`, merge `eecb228bd6` of `24d438fa31`: beta.10, 517, 524 round 2, 526):** proportional to its two conflicts.
  - A built server's stop with 524's file-watch stop: 3 clean SIGTERM stops; compositions 17/17.
  - Restart resume with 526's notice: RR-01…06 and RR-10, plus new RR-12 (a Team member woken once with the update notice); DRO 3/3.
  - This ticket's merged cases, the background counts and rows, and the G-5 browser cases: all pass.
  - SIR-002 now leaves 448's `restart-resume/` runtime records out of its byte-identity check.
  - Evidence: `evidence/api-e2e/API-r5-runs.txt`. **Result: `Pass`, 95%.**
- **Round 4, the third merged state (CRR-010; head `44fec882bc`, merge `e93671cce0` of `0570c47fd9`, fix `4db98c6d1a`):**
  - the merge's focus: background-task counts on every status route, the peer path, the Org rows (new TS-009), and 493's episodic catalog;
  - this ticket's cases and the browser cases;
  - the full server folder to the end, every failing file alone, the Linux container and base `0570c47fd9`; integration; AC-005 on Linux.
  - Evidence: `evidence/api-e2e/API-r4-runs.txt`; raw logs `/tmp/api500/r4`.
  - First result: `Fail` on one finding, **F-4**. `open-task-tree-upgrade-startup` OT-2/OT-3: the start writes 493's episodic catalog files inside the "a read writes nothing" window. Everything else passes, or is load, the merged base's own, or FSEvents.
  - F-4 resolved (CRR-011): test-side, and present on base too (my base pass was timing). OT-2 leaves the derived `memory/episodic/` out; OT-1 … OT-3 3/3. FU-500-13 is for 493's area. **Final round-4 result: `Pass`, 95%.**
- **Round 3, the merged state (the Delivery Engineer's request after DEL-01; head `2f10dbe1bb`, code `eb741a097e` = the merge of `origin/personal` `ff13782f36`):**
  - the full server E2E folder once, run to the end (detached);
  - every failing file alone on the branch and on base `ff13782f36` (its own worktree);
  - the integration suites;
  - AC-005 on Linux again, and the browser probes on the merged web.
  - Evidence: `evidence/api-e2e/API-r3-runs.txt`; raw logs `/tmp/api500/r3`.
  - Result: `Pass` after one test fix of mine (E-007); every other failure is load or the merged base's own (FU-500-12).
- **Round 2 (CRR-004 Pass; head `c22af3b892`, code `7eb78a701b`, IR-003):** F-1 … F-3 rerun; AutoByteus models loaded on demand across real restarts (new ODM-1); a retired agent on the member path; G5-001 … 003 and DLP-005 again; LE-F1 live; the static-check exemption for RSE-1. Evidence: `evidence/api-e2e/API-r2-runs.txt`; raw logs `/tmp/api500/r2`. Round 1's text below is kept where round 2 did not change it; the Findings table carries both rounds.
- Round and trigger (round 1): round 1, on CRR-002 (Pass after CRR-001's Local Fix IR-002). Code under test: `cc8dbce099` (merge base `9695d310c5`), plus this round's test-only changes. Server `dist` rebuilt from `cc8dbce099`.
- Scope: the code reviewer's list (AC-005 on Linux, FU-020 on real-shaped data and C-6, G-5 with its browser render, FU-036 on the org and collaboration streams, the FU-030 text assertions, G-1/G-2), plus the full server E2E folder (499 files changed, composition rewired) and the touched browser probes.
- Out of this package: FU-035 / AC-007 (IR-003, D-14).
- Evidence: `evidence/api-e2e/API-r1-runs.txt` (§1 … §6) and its screenshots; raw logs `/tmp/api500`.

## Routing Classification

- Task size: `Large`; Architectural risk: `High`; Input route: `Reviewed`.
- Result route (round 7): `Pass` → Code Reviewer, proportional test-code review of round 7's test changes (MO-1, LRN-1/2, the RC suite's `calls()`), then delivery.
- Result route (round 6): `Pass` → Code Reviewer (no test change of mine), then delivery.
- Result route (round 5): `Pass` → Code Reviewer, proportional test-code review of RR-12 and the SIR-002 change, then delivery.
- Result route (round 4, final): `Pass` → Code Reviewer, proportional test-code review of round 4's test changes (TS-009, SIR-002, OT-2), then delivery. First result `Fail` (F-4) → failure-origin review CRR-011 (test-side). Round 3: `Pass` (E-007 reviewed with it).
- Result route (round 3): `Pass` → Code Reviewer, proportional test-code review of round 3's test change (E-007), then delivery. Round 2: `Pass` (CRR-005, CR-500-006 fixed); round 1: `Fail` (CRR-003).
- Proportional test-code review decision: `Required` (`c0770ea7b0`, `a7e76ca248`, `73bfba186c` reviewed; round 3's test commit).

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `cc8dbce099` + test changes | macOS 26 (Darwin 25.5.0), arm64, load average 60–100 all day (other worktrees) | Server E2E, built server, scripted AGY / Grok | `env -i`, throwaway HOME; never the user's app or `~/.autobyteus` |
| ENV-2 | as ENV-1 | Docker `node:22-bookworm`, Linux 6.12 (linuxkit) arm64, 10 vCPU, load ~6–12 | A tarball of the worktree; `pnpm install --frozen-lockfile`; `test:integration:prepare` | Real inotify; used for the AC-005 gate and to separate load from defects |
| ENV-3 | as ENV-1 | as ENV-1 | Probe stacks: built server, Nuxt dev, headless Chrome | Probe-owned roots, ports and HOME |
| ENV-B | base `9695d310c5` | as ENV-1 | Its own worktree, install and build | For comparisons only |
| ENV-M (r3) | merged `eb741a097e` (head `2f10dbe1bb`) | macOS as ENV-1, load 5–12 (fseventsd ~170%, an unrelated VM ~210%) | Server E2E, integration, probes; dist built by delivery | `env -i`, throwaway HOME, LANG |
| ENV-MB (r3) | base `ff13782f36` | as ENV-M | Its own worktree `500-base-ff13782f`, install and build | Comparisons only |
| ENV-M7 (r7) | merged `5eb8246076` + `8e8c21c2c4` (head `2037a3be5a`) and this round's test changes | macOS as ENV-1, load 35–73 | autobyteus-ts and server dist rebuilt from the head; built Studio nodes, the standalone application host, Nuxt dev + headless Chrome for the probes | `env -i`, throwaway HOME; scripted AGY; emulated LM Studio |
| ENV-B7 (r7) | base `53b72018ad` | as ENV-M7 | Its own worktree `500-base-53b72018`, install and build; removed after | Comparisons only (LRN) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WATCH-LINUX | AC-005 | OS file events | `file-system-watcher.integration.test.ts` ×5 after `test:integration:prepare` | ENV-2 | Pass | API-r1-runs.txt §1 | "Tests 14 passed (14)" ×5; 0 ENVIRONMENT / INCONCLUSIVE lines | D-13b gate |
| WATCH-MAC | AC-005 | FSEvents | — | — | Not Tested | — | — | No quiet macOS (load 60–100 all day) |
| GATES | AC-005 | gates | probe guard scan; `agent-runtime-names.test.mjs`; web typecheck from a fresh `.nuxt`; server typecheck | ENV-1 | Pass | §2 | "duplicates 0"; "pass 2"; "production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)" | |
| MIG-UNITS | AC-008, AC-009, AC-010, AC-006 | migrations, order, streams | the migration, team-index, order and not-ready tests | ENV-1 | Pass | §2 | 8/8, 3+1, 6/6, 9/9 | Recorder gated: IMP-07 reused |
| NOTREADY-REAL (RSE-1) | AC-006, REQ-009 | real org and collaboration handlers | new `tests/e2e/agent/run-stream-early-command.e2e.test.ts` | ENV-1 | Pass | §4 | org: 6 SESSION_NOT_READY + 2 acks; collaboration: 8 SESSION_NOT_READY | Every command answered once |
| MIG-ATTACH (ALM-1) | AC-008, M-3 … M-9 | startup migration, REST routes | new `delegated-run-own-attachment-links-startup.e2e.test.ts` | ENV-1 | Pass | §4 | "Scanned 3; migrated 2; …", follow-up "migrated 0", both SUCCEEDED_WITH_WARNINGS in one start | Bytes, backups, routes, second start |
| MIG-COST | C-6, M-6 | first start | synthesized 8.66 GB / 7523 files / 84 convertible; built server first start | ENV-1 | Measured | §5 | pass 1 14.3 s, follow-up 12.3 s; backups 182 MB | Warm cache only |
| LTI-1 | AC-010 | late v2 on a real start | updated `late-team-history-index-v2-startup.e2e.test.ts` | ENV-1 | Pass | §4 | "the user-started team's row after v2: true" | Now asserted |
| FULL-SERVER | SC-6, AC-001 … AC-004 | the server E2E folder | `vitest run tests/e2e` with `RUN_AGY_FAILURE_E2E=1`, then reruns, Linux, base | ENV-1, 2, B | Fail | §3 | three branch-caused failures (F-1 … F-3) | Stale tests fixed; base-side: FU-500-09 |
| E-002 | REQ preserved behavior; AC-012 | standalone restore of a retired agent | `remove-built-in-project-task-manager-startup` E-002 | ENV-1, B | Fail (F-1) | §3 a | `"code":"ACTIVATION_FAILED","message":"autobyteus-project-task-manager can't start: its saved model …"` | Base: RUN_NOT_FOUND, "AgentDefinition … not found" |
| DLC-INHERITED / DLP-005 | AC-004, REQ-007 | delegation refusal, inherited layer | `delegated-launch-config-defaults` (Agent root, inherited layer); probe DLP-005 | ENV-1, 3 | Fail (F-2) | §3 b, §6; API-r1-F2-DLP-005-inherited-text.png | "Plain 7eee can't be delegated to: 'dlc-retiring-model' is no longer offered by Antigravity CLI." (no next step) | Branch 3/3 + probe |
| SCP-E2E-006 | REQ preserved behavior | native member after restart | `get-project-task-worker-scope` SCP-E2E-006 | ENV-1, 2, B | Fail (F-3) | §3 c | "Timed out waiting for mate native get_project_task result"; no frame or log line for the mate | Branch 0/6; base 2/2 |
| G5-001 | AC-012 | Settings member note; member refusal | probe `--cases G5-001` | ENV-3 | Pass | §6; API-r1-G5-001-*.png | manager row note; worker none; "manager can't start: …"; launches 1 → 1 | |
| G5-002 | AC-012 | standalone restore | probe `--cases G5-002` | ENV-3 | Pass | §6; API-r1-G5-002-*.png | "writer-9c6a can't start: …"; launches 1 → 1 | |
| G5-003 | AC-012, D-12 | unreadable list | probe `--cases G5-003` | ENV-3 | Pass | §6; API-r1-G5-003-*.png | no G-5 refusal; AGY's own errors after 23.5 s (hang) and 0.7 s (fail) | AGY needs its list to launch |
| TEXT-E2E | AC-004 | server texts | DCM, DTL, removed-remote-provider, remote-delegation RC-04/RC-17, collaboration-prompt-wording, contract stories (full run) | ENV-1, 2 | Pass (after stale updates), except F-2 | §3 | RC 46/46; DCM 11/11 | |
| TEXT-PROBES | AC-004, AC-011 | browser texts | DLP-003, DLP-004, DCP-004, SIR-002, composer probe | ENV-3 | Pass | §6 | "DLP-003 Pass", "DLP-004 Pass", "DCP-004 Pass", "SIR-002 Pass", composer 12/12 | SIR-001 fails on base too (FU-500-10) |
| LE-F1 (Claude, live) | AC-004 | live refusal text | r2: `RUN_CLAUDE_E2E=1 CLAUDE_E2E_STALE_MODEL=claude-sonnet-4-5-20250929 … -t LE-F1` | ENV-1 + Claude login | Pass | API-r2-runs.txt §4 | "Tests 1 passed" | The default stale model is in Claude's catalog today (precondition) |
| ODM-1 (r2) | AC-012, SR-015 R1, CR-500-003/004 | on-demand AutoByteus models, real restarts | new `tests/e2e/llm-management/on-demand-stored-models-startup.e2e.test.ts` | ENV-1, 2, B | Pass (base: false note) | API-r2-runs.txt §2 | restart answers + options name the model; host down: "MODEL_IDENTIFIER_NOT_AVAILABLE", no G-5; read and missing: G-5 text, 0 chats; removed agent: "AgentDefinition with ID … not found." | |
| F-1 … F-3 rerun (r2) | as above | as above | E-002, DLC (F-2 case), SCP-E2E-006; G-5-touched e2e; probes | ENV-1, 2, 3 | Pass | API-r2-runs.txt §1, §3 | E-002 4/4; SCP 6/6; DLC F-2 case ✓; DLP-005 Pass | DTL's batch failure was load (rerun 2/2) |
| STREAM-CHECK exemption (r2) | — | static check | `team-stream-clients-wait-for-connected.test.ts` | ENV-1 | Pass | §5 | 3/3 | RSE-1 sends early on purpose |
| MO-1 (r7) | AC-009, AC-008; 491 | the three new startup migrations on one first start; the removed agent's run | ALM-1's file, `RUN_AGY_FAILURE_E2E=1` | ENV-M7 | Pass | API-r7-runs.txt §1 | three records in order (12.669→.701, .703→.706, .707→.710); removal "Scanned 2; migrated 2"; `ACTIVATION_FAILED` "AGY_AGENT_DEFINITION_MISSING: autobyteus-memory-compactor"; second start unchanged | First attempt: my assertion took E-002's AutoByteus answer; AGY's own answer is base behavior (FU-500-15 b) |
| MIG-ORDER (r7) | AC-009; 491 | registry order, both migrations' units; 491's startup E2E | units chain; RRB-1…3 alone | ENV-M7 | Pass | §1 | units 487/487; RRB 3/3 | RRB-3 in the chain: AGY discovery 15 s at load (alone Pass) |
| LRN-1 (r7) | AC-002 (FU-011), 492 AC-001/AC-004 | native tool and MCP on two paired Studios | new `list-running-agents-native-and-mcp.e2e.test.ts` | ENV-M7, B7 | Pass | §2 | the same lists on both routes; `node: "beta-node"`; "Remote collaboration is turned off on this node, …" on both | Base the same |
| LRN-2 (r7) | AC-002 (FU-011), 492 DS-001 | the standalone application host | the same file | ENV-M7, B7 | Pass | §2 | native "not found or configured", MCP "not enabled" for both tools: the same outcome | Base the same; FU-500-15 (a) |
| MSG-492 (r7) | 492 DEC-001 with this ticket's names and owners | unrelated-run delivery, not running, Task-related, the peer receiver | `remote-delegation-two-server` (whole), CPW, contract stories, MCP routes integration, units | ENV-M7 | Pass (after a test fix) | §3 | 49/49 (RC-47/48/49/06/08/22/10/11/23/27/28/19 ✓); CPW 14/14; §5.1–5.3 ✓; 14/14; 487/487 | RC-19 timed out twice in the whole file: the `calls()` helper counted replies in a view capped at 100 events; fixed, 740 ms |
| MERGED-CASES (r7) | AC-006, AC-008, AC-011, AC-012 | this ticket's cases | ALM-1, ODM-1, RSE-1, E-001…004; probe G5-001…003, DLP-005, DCP-004, SIR-001, SIR-002 | ENV-M7 | Pass | §1, §4 | focus 6/6; "Summary: 7 Pass, 0 Fail" | SIR-001 passes for the first time (492) |
| GATES (r7) | — | typecheck, static check | `pnpm -C autobyteus-server-ts typecheck`; CONNECTED check | ENV-M7 | Pass | §5 | "1006 in 315 files (baseline 1006 in 315 files)"; 3/3 | |

### Findings

| ID | What | Expected | Observed | Base | Preliminary classification |
| --- | --- | --- | --- | --- | --- |
| F-1 | Restoring a run whose agent definition was removed (the retired built-in Project Task Manager, E-002) | Refused as before: `RUN_NOT_FOUND`, "AgentDefinition with ID … not found" (preserved behavior) | Refused with G-5's `ACTIVATION_FAILED` text: "… can't start: its saved model '…' is not offered by AutoByteus now. Stop it, then choose a runtime and model … in Settings." — the wrong reason and a repair that cannot help | Pass 1/1 | `Design Impact`: G-5's check runs in `restoreStarted` before `buildConfig` (design G-5), so it answers before the missing definition is found |
| F-2 | Delegation refusal when the run's own (inherited) model was retired (DLP-005, DLC) | FU-030 DLP-005: "… can't be delegated to: its default model cannot be used: '…' is no longer offered by …. Choose another model for … in its settings, or delegate to another agent." (the updated tests and the handoff's table) | "… can't be delegated to: 'dlc-retiring-model' is no longer offered by Antigravity CLI." — no next step (REQ-007) | (old text) | `Local Fix`: `collaborator-launch-resolver.ts:173` throws `CollaboratorAddError(plan.name, verdicts.inherited.detail)` with no FU-030 wording; only `:328` (own default layer) has it. If the design meant another text for the inherited layer, `Unclear` |
| F-3 | After a restart with one copy's Task file damaged, the native mate (AutoByteus on emulated LM Studio, on no Task) is sent get_project_task through the team view (SCP-E2E-006) | Answered as on base | No answer within 90 s and no model request. Correction (CRR-003): it did get a `RUN_MODEL_NOT_OFFERED` ERROR frame; my helper waited for a tool result and printed only the last frames | Pass 2/2 | Origin (CRR-003): G-5 read the AutoByteus list before the on-demand provider was loaded (CR-500-003) |

- **Round 3, the merged state:**
  - FULL-SERVER-M: 275 files, 167 passed, 78 skipped, 30 failed (38 tests), run to the end in 7186 s.
  - Alone on the branch and on base: 19 files pass on both (load); five branch-only failures pass in a second alone run (load); the package watcher passes alone (FSEvents).
  - The merged base fails the same way in collaboration-prompt-wording, configured-skill-on-demand-loading, agent-semantic-memory (6), request-origin-and-phone-routes (2) and available-agent-runtimes (4): FU-500-12, FU-500-09.
  - One branch-only failure was mine: project-task-boundaries E-007. Its mid-test "release and build again" relied on the lazy process getter FU-011 removed; my round-1 update released without composing a new one. Fixed: the Task side is composed again from disk, 18/18.
  - INTEGRATION-M: 503 passed, 2 failed (both FSEvents on macOS; the base fails package-auto-refresh the same way). WATCH-LINUX-M 5/5. Probes on the merged web: 8/8 and the composer 12/12.
- **Round 2: F-1, F-2 and F-3 are resolved** (IR-003: CR-500-004, CR-500-005, CR-500-003). E-002 4/4; the DLC F-2 case and probe DLP-005 pass with "… it would use this run's model '…', which … no longer offers. Set a model for … in its settings, or change this run's model, then delegate again."; SCP-E2E-006 6/6; ODM-1 covers the cause of F-3 directly.

- Stale tests this ticket made untrue, updated (Durable Coverage below) and passing.
- Not this ticket (fail on the base too): FU-500-09, FU-500-10.
- Load only: the remaining full-run failures pass alone, in batch 2 or in Linux (§3). `removed-remote-provider-saved-selection` after its second G-5 update: 2/2 in Linux (on the Mac its server stops and hooks timed out at load 65–90).

## Acceptance-Criteria Proof

| AC | Critical | Proven By Case IDs | Result | Note |
| --- | --- | --- | --- | --- |
| AC-001 (names) | Yes | FULL-SERVER (renamed contracts in every suite), code review's greps | Proven | No failure traces to a rename |
| AC-002 (composition) | Yes | FULL-SERVER (both hosts start); IMP-06 units; r7: LRN-1, LRN-2 | Proven | The stale harnesses (FU-011) show the getters now refuse before composition; r7: `list_running_agents` reads the host's discovery on both routes |
| AC-003 (token totals) | Yes | FULL-SERVER (token suites) | Proven | |
| AC-004 (refusal texts) | Yes | TEXT-E2E, TEXT-PROBES, DLC-INHERITED, LE-F1 | Proven (r2) | F-2 resolved; live on Claude |
| AC-005 (gates) | Yes | WATCH-LINUX (r1, and r3 on the merged state: 5/5), GATES | Proven (quiet macOS Not Tested) | D-13b: Linux is the gate. r3's macOS at load 5–7 with fseventsd busy: 1/5, every failure INCONCLUSIVE (evidence only) |
| AC-006 (not ready) | Yes | NOTREADY-INT, NOTREADY-REAL | Proven | |
| AC-007 (Grok) | — | — | Out of this package | IR-003 |
| AC-008 (attachments) | Yes | MIG-ATTACH, MIG-UNITS, MIG-COST | Proven (the founder's own data: Only The User Can Check) | Needs his approval (D-8) |
| AC-009 (order) | Yes | MIG-UNITS (order test), IMP-07, IMP-09; r7: MO-1, MIG-ORDER | Proven | With 491's `20261118` after both on one first start; the release-commit part is delivery's |
| AC-010 (late v2) | Yes | LTI-1, MIG-UNITS | Proven | |
| AC-011 (SIR-002) | Yes | TEXT-PROBES (SIR-002) | Proven | |
| AC-012 (stored model) | Yes | G5-001 … G5-003 (r1, r2), ODM-1 (r2), E-002 (r2) | Proven (r2) | Includes on-demand AutoByteus models after restarts and a removed agent on both paths; FU-500-11 is a Settings observation outside it |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 96% | r2: every in-package AC proven directly (AC-007 out of the package) | the founder's own data (his approval) | — |
| Changed-boundary execution directness | 92% | 96% | built server, real streams and routes, real restarts, browser | — | — |
| Cross-boundary integration realism and mock gap | 90% | 94% | emulated on-demand hosts over real HTTP; LE-F1 live on Claude | LM Studio and Ollama are emulated, not real hosts | a real local model host |
| Environment, configuration, identity, and fixture fidelity | 85% | 92% | Linux container separated load; base compared; LE-F1's stale model by override | the Mac's load; warm-cache cost only; quiet macOS not available | a quieter machine |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 96% | host down, read-and-missing, removed agent on both paths, second starts, early close | — | — |
| User-surface, browser, and desktop-shell confidence | 88% | 95% | G5 and DLP-005 rendered (r2) | no desktop shell (no shell change) | — |
| Durable regression coverage quality and relevance | 90% | 95% | ALM-1, RSE-1, ODM-1, G5 probe cases; 13 stale tests updated; the static check's exemption | — | — |

- Overall (round 2): 95% (simple average; round 1: 86%). Every critical in-package AC directly proven: `Yes`. No category below 90%. Target met: `Yes`.

## Broader Validation Decision (Mandatory)

- `Required` and executed: the full server folder, a Linux container, the base comparison and the browser probes (§3, §6).

## Desktop Application Validation (When Applicable)

- `Not Required`: no Electron-shell change; the renderer journeys ran in the browser (web-equivalent).

## Persisted-Data Transition Checks (When Applicable)

- `Migration Required` (FU-020): ALM-1 proves the startup path, conversion, backups, routes and a second start on data the product wrote and then gave the released shape; MIG-COST measures both passes. The founder's own data is not touched (his approval, D-8).
- G-2: LTI-1 on a real start; its unit fixture (IMP-10).

## Compatibility / Legacy Scope Check

- Compatibility-only behavior observed or covered: `No`. The removed host route answers 404 (ALM-1, AOML).

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | Note |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/delegated-run-own-attachment-links-startup.e2e.test.ts` | Added | MIG-ATTACH | |
| `autobyteus-server-ts/tests/e2e/agent/run-stream-early-command.e2e.test.ts` | Added | NOTREADY-REAL | |
| `autobyteus-web/tests/e2e/stored-model-not-offered-cases.mjs`; `delegated-launch-defaults-probe.mjs` (registration, `agy models` hang/fail modes, reads log) | Added / Updated | G5-001 … 003 | |
| `late-team-history-index-v2-startup.e2e.test.ts` | Updated | LTI-1 | the user-started row is asserted (G-2) |
| `append-only-message-logs-startup.e2e.test.ts` | Updated | FULL-SERVER | own route 200, the removed route 404 (FU-020) |
| `projects-graphql`, `embedding-settings`, `project-task-boundaries`, `project-task-search`, `project-task-search-model-unavailable` (`.e2e.test.ts`); `tests/helpers/explicit-host-collaborators.ts` (`releaseComposedProjectTaskService`); `tests/fixtures/project-task-tool-writer.mjs` | Updated | FULL-SERVER | FU-011: release only a composed Task service; the tool-only process composes its Task side |
| `delegated-copy-model-change`, `delegated-team-lazy-member-activation`, `removed-remote-provider-saved-selection-graphql` | Updated | TEXT-E2E | G-5 refusal replaces the runtime's `AGY_MODEL_UNAVAILABLE` / `MODEL_IDENTIFIER_NOT_AVAILABLE`; outcomes kept |
| `remote-delegation-two-server` RC-04, RC-17 | Updated | TEXT-E2E | FU-030: the peer's reason only |
| `delegated-launch-defaults-probe.mjs` DLP-003/004 reason regexes, DCP-004 Save-text match | Updated | TEXT-PROBES | FU-030 texts |

| `autobyteus-server-ts/tests/e2e/llm-management/on-demand-stored-models-startup.e2e.test.ts` (r2) | Added | ODM-1 | |
| `autobyteus-server-ts/tests/unit/e2e-helpers/team-stream-clients-wait-for-connected.test.ts` (r2) | Updated | STREAM-CHECK | a named exemption for RSE-1, which sends early on purpose; a case keeps each exemption current |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/delegated-run-own-attachment-links-startup.e2e.test.ts` (r7) | Updated | MO-1 | 491's retired copies and a compactor run in the same data; the third ledger row; order, statuses, the run kept, its continuation's answer |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/list-running-agents-native-and-mcp.e2e.test.ts` (r7) | Added | LRN-1, LRN-2 | |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` `calls()` (r7) | Updated | MSG-492 | waits for the newest reply entry not in view before the call (the view holds the last 100 events); no assertion changed |

- Not changed by me: E-002, DLC and SCP-E2E-006's assertions (they stated the behavior F-1 … F-3 broke; they pass in round 2). The DLP-005 e2e and probe assertions of the new text are the implementation's (IR-003).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Run models | Scripted AGY CLI, recorded Grok fixture, emulated LM Studio | Deterministic (TESTING.md) | Live refusal text (LE-F1) next round |
| Founder-sized data | Synthesized | His data needs his approval | Shapes beyond IMP-005's scan |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Docker containers `api500-watch`, `api500-c2`, `api500-c3`, `api500-c4`, `api500-c5` | Yes | `--rm` (c3 was removed by `docker rm -f`) | Removed |
| Base worktrees `500-base-9695d310` (r1, r2) and `500-base-ff13782f` (r3) | Yes | `git worktree remove` after this round | Removed (see Latest Authoritative Result) |
| Temporary base copy of ODM-1 (r2) | Yes | deleted after the run | Removed |
| Base worktree `500-base-9695d310` | Yes | kept for the next round's comparisons | Kept |
| Temporary cost test, E-002 and SCP-006 debug lines | Yes | deleted / reverted | Removed (git diff clean for those) |
| Synthesized 8.6 GB data, archives | Yes | `rm -rf` | Removed |
| `/tmp/api500` logs, probe outputs | Yes | kept; extracts committed | Kept |
| Base worktree `500-base-53b72018` (r7) | Yes | `git worktree remove --force` | Removed |
| Temporary `diag-lrn-host` and `diag-gate` test copies (r7) | Yes | deleted | Removed |

## Preliminary Classification (On `Fail`, round 1)

- F-1 `Design Impact` (G-5's check order in the standalone restore path) → Solution Designer, via the Code Reviewer.
- F-2 `Local Fix` (the inherited-layer refusal path missed FU-030) → Implementation, via the Code Reviewer; `Unclear` if the design meant another text.
- F-3 `Unclear` (a branch regression with no visible error) → the Code Reviewer's failure-origin review.

## Latest Authoritative Result

- Result (round 7, the eighth merged state `5eb8246076` + `8e8c21c2c4`): `Pass`, 95%.
  - The migration order on one first start, `list_running_agents` on both routes (local, peer, off; the application host), 492's messaging (49/49), this ticket's cases and the probes (7/7) pass.
  - Test changes: MO-1 (ALM-1's file), LRN-1/LRN-2 (new), the RC suite's `calls()` (a test-side defect RC-19 exposed).
  - FU-500-15: an application's agent gets neither discovery tool (native or MCP), and runtimes word a deleted agent differently; both the same at base. FU-500-10 is resolved by 492.
- Result (round 6, the seventh merged state `bb42531c7d`): `Pass`, 95%. AC-005 5/5 on Linux on the merged commit; the merge's touched suites pass; FU-500-14 records the base's own macOS rename timeouts.
- Result (round 5, the fourth merged state `eecb228bd6`): `Pass`, 95%. The merge's two paths (a built server's stop; restart resume with its notice, the Team member included) and this ticket's cases pass; no finding. Test changes: RR-12 (new), SIR-002 (`restart-resume/` left out).
- Result (round 4, the third merged state `e93671cce0` + `4db98c6d1a`), final: `Pass`, 95%. F-4 resolved (CRR-011: test-side and on base too; OT-2 leaves the derived `memory/episodic/` out, OT-1 … OT-3 3/3; FU-500-13). First result: `Fail` on F-4, 90%:
  - **F-4:** `open-task-tree-upgrade-startup` OT-2 fails ("reading the trees wrote nothing"), and OT-3 with it.
    - On the branch, the start over the upgraded data root changes `memory/episodic/index.md` and writes four agents' `catalog.md` (493).
    - It fails on the Mac and in Linux; base `0570c47fd9` passes 3/3.
    - Origin `Unclear`: either the merged code lets the catalog see these runs (then the check should leave the derived `memory/episodic/` out), or the merge changed what the catalog reads.
  - Passed:
    - the background counts (BTS-01…03, 06; PBS-01), the Org rows (TS-009), the episodic catalog 7/7;
    - this ticket's cases, and the G-5 / FU-030 / SIR-002 browser cases (SIR-002 after a test fix for 493's derived catalog);
    - the watcher gate on Linux, 5/5.
  - Test changes this round: `team-status-live-probe.mjs` (TS-009); `skill-improvement-removal-cases.mjs` (SIR-002 leaves `memory/episodic/` out).
- Result (round 3, the merged state `eb741a097e`): `Pass`. Confidence 95% (unchanged).
  - The full server folder ran to the end; every failure is load (passes alone), the merged base's own (FU-500-12, FU-500-09), or FSEvents on macOS.
  - One test fix of mine (E-007, `project-task-boundaries`).
  - Integration 503 passed; AC-005 on Linux 5/5; the merged web's probes 8/8 and 12/12.
  - Round 2: `Pass` 95%; round 1: `Fail` 86%.
- Residual risks:
  - quiet macOS for the watcher (Not Tested; the Mac's fseventsd stayed busy even at load 5–7; Linux 5 of 5 is the gate);
  - M-6 cold-cache cost (warm only);
  - the founder's own data (only he can approve);
  - on-demand hosts emulated (LM Studio, Ollama);
  - FU-500-09, FU-500-11 … 15 outside this ticket (FU-500-10 resolved by 492);
  - the host's "turned off" discovery answer is reached by units only (FU-500-15 a).
- Next recipient from `get_handoff_rules` (round 7): the Code Reviewer, for the proportional test-code review of round 7's test changes, then delivery.
- Next recipient from `get_handoff_rules` (round 6): the Code Reviewer (no test changes to review this round), then delivery.
- Next recipient from `get_handoff_rules` (round 5): the Code Reviewer, for the proportional test-code review of round 5's test changes, then delivery.
- Next recipient from `get_handoff_rules` (round 4, final): the Code Reviewer, for the proportional test-code review of `696acc408c` and the OT-2 change, then delivery.

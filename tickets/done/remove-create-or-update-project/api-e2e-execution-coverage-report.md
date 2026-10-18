# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/requirements-doc.md` (SR-001)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md`
- Design Spec: `…/design-spec.md` (SR-002)
- Supplemental Task Artifacts: `tickets/done/project-tool-split/` (read-only)
- Design Review Report / Revision Record: `…/design-review-report.md`, `…/architecture-review-revision-record.md` (ARCH-REV-001)
- Implementation Handoff / Revision Record: `…/implementation-handoff.md`, `…/implementation-revision-record.md` (IR-002)
- Code Review Report / Revision Record: `…/code-review-report.md`, `…/code-review-revision-record.md` (CRR-002 Pass)
- Delivery Revision Record: N/A
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `…/api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: code review CRR-002 pass
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1
- Commits: reviewed head `4807095aed`. API/E2E added two baseline fixes: `c740d16b3c` (server E2E test) and `d1796f010d` (web probe). Branch head is `d1796f010d`.

## Routing Classification

- Task size: `Small`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (two durable test files changed, below)

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`, written before execution and updated with results
- Plan followed: Yes
- Existing coverage decisions revised during execution: two existing tests outside this change failed and were fixed from their causes (TESTING.md Rule 9). They are the only durable changes.
- Reroute required: No

## Rerun-By-Impact Plan (TESTING.md)

- Validated commit for repository cases: `4807095aed` (unit, typecheck, AC-004 grep, resolution probe). E2E-PROJECTS, WEB-TSL and WEB-PMU passed at `c740d16b3c`. WEB-TCT and the real-app cases passed at `d1796f010d`.
- `git diff --name-only 4807095aed d1796f010d`: two files.
  - `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts`: affects only the E2E folder, which was rerun twice after the change.
  - `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs`: affects only WEB-TCT, which was rerun after the change.
- Unit, typecheck, grep, resolution probe, WEB-TSL and WEB-PMU do not exercise those files, so they stay **Still valid**.

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`. Initialized before execution: Yes. Reconciled: Yes. Cases not started or interrupted: none.

| Case ID | Final Result @ commit | Evidence (under `evidence/api-e2e/`) |
| --- | --- | --- |
| BUILD | Pass @4807095aed | server-build.log, nuxt-prepare.log |
| UNIT-CHG | Pass (10 files, 173 tests) @4807095aed | unit-changed.log |
| TYPECHECK | Pass @4807095aed | server-typecheck.log |
| AC004-GREP | Pass @4807095aed | ac004-grep.txt |
| UNIT-ALL | Pass (720 files, 5841 tests) @4807095aed | server-unit-full.log |
| RES-PROBE-SRC / RES-PROBE-PKG | Pass @4807095aed / @d1796f010d | resolution-probe-worktree.txt, resolution-probe-packaged.txt |
| E2E-PROJECTS | Pass ×2 (18/18 files, 88 tests) @c740d16b3c. The first run @4807095aed had 17/18 (`task-copy-idle-lifetime`); fixed | server-e2e-projects-agy-fixed-{1,2}.log; server-e2e-projects-agy.log; tcil-diag/ |
| WEB-TSL | Pass 7/7 @c740d16b3c | probe-tsl/ |
| WEB-PMU | Pass 25/25 @c740d16b3c | probe-pmu/ |
| WEB-TCT | Pass 16/16 @d1796f010d. The first run had 11/16 (BR-012..016); fixed | probe-tct-2/; probe-tct/; tct-diag/ |
| APP-OLD-MIXED, APP-OLD-ALONE, APP-NEW | Pass @d1796f010d | app/journey/*.json, journey.log |
| REAL-OLD-MIXED, REAL-OLD-ALONE, REAL-NEW (Claude Agent SDK, Haiku 5.5) | Pass @d1796f010d | app/journey/REAL-*.json |
| NATIVE-LAUNCH | Pass @d1796f010d | app/journey/NATIVE-LAUNCH.json, app/instance-log-excerpt.txt |
| UI-PICKER | Pass @d1796f010d | app/picker-available-tool-names.json, app/ui-tool-picker-task-management.png |
| DOC-REVIEW | Pass | release-notes.md, docs diff |

## Compatibility / Legacy Scope Check

- Requirements/design introduce backward compatibility: No. The old name is handled only by the existing unknown-name skip; there is no alias, rewrite or warning to agents.
- Compatibility-only behavior in implementation: none observed. In the real app the old name reaches no tool, and calling it fails with `Unknown MCP tool`.
- Persisted-data decision (`Not Affected`) followed: Yes. A stored package definition that still lists the old name launches with every other listed tool.
- Durable coverage for compatibility-only behavior: none. The skip tests prove REQ-002 (DEC-003).

## Acceptance-Criteria Proof

- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-create-or-update-project/tickets/in-progress/remove-create-or-update-project/evidence/api-e2e/`

| AC | Critical | Proven By | Evidence Files | Result |
| --- | --- | --- | --- | --- |
| AC-001 no old tool in native, MCP or picker | Yes | Exact-set unit test. Resolution probe on the worktree server and on the **packaged** server: native and MCP serve only `create_project`, `update_project`. Real app: the picker's `availableToolNames` and the Create Agent form's Task Management list have no `create_or_update_project`; each run's scoped MCP `tools/list` has no old tool | unit-changed.log, resolution-probe-*.txt, app/picker-available-tool-names.json, app/ui-tool-picker-task-management.png, app/journey/APP-*.json | Proven |
| AC-002 a definition listing the old name launches without it, with every other tool | Yes | Unit skip tests (AutoByteus, Codex, Claude; resolver warning, no error). Real app with the packaged LOCAL_PATH agent `PTS Old Listed` (PTM shape): on AGY the run launches, all 7 other listed project/task tools are exposed, the old one is not, and a call to it fails with `MCP error -32602: Unknown MCP tool`. On Claude Agent SDK (Haiku 5.5) it launches and uses `create_project`/`update_project`. On AutoByteus native it launches successfully, and the instance log shows `Tool 'create_or_update_project' defined in agent definition 'PTS Old Listed' not found in registry. Skipping.` `PTS Old Alone` launches with no Project mutation tool and creates nothing | app/journey/APP-OLD-*.json, REAL-OLD-*.json, NATIVE-LAUNCH.json, app/instance-log-excerpt.txt | Proven. Codex is covered at unit level only (see Residual) |
| AC-003 new tools unchanged | Yes | Unit (byte comparison in the handoff; exact results and errors); boundaries, node-locality and AGY-gated E2E. Real app (APP-NEW): create with a workspace; rename keeps workspaces; a supplied list replaces all links; `[]` unlinks all; `project_id` → `PROJECT_TOOL_ARGUMENT_INVALID`; no change → `PROJECT_PATCH_REQUIRED`; missing id → `PROJECT_TOOL_ARGUMENT_INVALID`; blank name → `PROJECT_NAME_REQUIRED`. REAL-NEW: Haiku 5.5 creates and updates | server-e2e-projects-agy-fixed-*.log, app/journey/APP-NEW.json, REAL-NEW.json | Proven |
| AC-004 only allowed references | No (review) | `git grep -n create_or_update_project -- ':!tickets'`: resolver and runtime-parity skip tests, exact-set test (DEC-003), migration fixture (DEC-002), `.github/release-notes/release-notes.md` (DEC-004, replaced at release). The probe list (REQ-006) is clean | ac004-grep.txt | Proven |
| AC-005 release note | No (review) | The ticket's `release-notes.md` announces the removal, names `create_project`/`update_project`, says old lists are skipped, and notes the third-party MCP name | release-notes.md | Proven |
| AC-006 real-app check with a test data package | Yes | Isolated instance of the worktree's packaged build. Package `test-package/` (3 agents) imported via `importAgentPackage(LOCAL_PATH)`. Old-name agents launch and work without the old tool; the new tools create and update Projects, scripted and with Haiku 5.5 | app/ | Proven |

## Changed Boundary And Evidence Matrix

| Case ID | IDs | Boundary | Surface | Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-CHG / UNIT-ALL | AC-001..003 | contract, registry, exposure, resolver | vitest | Durable | Pass | unit-*.log |
| E2E-PROJECTS | AC-003 + regression | real HTTP/WS/scoped MCP | vitest e2e | Durable | Pass ×2 | server-e2e-projects-agy-fixed-*.log |
| WEB-TSL / PMU / TCT | REQ-006 + regression | renderer + real backend | probes | Durable | Pass | probe-*/ |
| RES-PROBE-* | AC-001/002 | worktree and packaged server resources | node probe | Temporary | Pass | resolution-probe-*.txt |
| APP-* / REAL-* / NATIVE-LAUNCH / UI-PICKER | AC-001..003, AC-006 | packaged app: package import, launch, scoped MCP, picker, runtimes | isolated instance | Temporary | Pass | app/ |

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Change | Support | Residual |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 90% | 97% | +7 | every critical AC directly proven, AC-006 in the packaged app | — |
| Changed-boundary directness | 92% | 96% | +4 | packaged registry, picker, real run sessions on three runtimes | Codex runtime not live |
| Integration realism / mock gap | 88% | 95% | +7 | real Haiku 5.5 inference; real package import; native launch | scripted AGY for deterministic cases |
| Environment / fixture fidelity | 92% | 96% | +4 | isolated instance, own data root, clean-env E2E | — |
| Failure / edge / lifecycle | 92% | 96% | +4 | refused old-name calls; all error codes in the real app; launch with an unknown name on three runtimes | — |
| User-surface / desktop | 85% | 96% | +11 | real picker in the packaged app; probes 7/7, 25/25, 16/16 | — |
| Durable regression quality | 90% | 95% | +5 | two long-standing suite defects fixed with causes | — |

- Overall post-repository confidence: 90%
- Overall final confidence: **96%** (simple average 95.9)
- Every critical AC directly proven apart from user-only parts: Yes
- Any final category below 90%: No
- Default 95% target met: Yes
- Residual risks: the Codex runtime was not run live (no ChatGPT quota). Its exposure is covered by the unit runtime-parity skip test, and it uses the same MCP server path as AGY and Claude.

## Broader Validation Decision And Execution

- Decision: `Required`; `Project Desktop Validation` (isolated instance `iso-50482-7d19` of the worktree's packaged build)
- Setup:
  1. `pnpm --silent isolated-app start --build`.
  2. `updateServerSetting ANTIGRAVITY_CLI_COMMAND=evidence/api-e2e/agy-scripted.sh`, then `isolated-app restart`.
  3. `importAgentPackage(LOCAL_PATH test-package)`.
  4. `node evidence/api-e2e/app-journey.mjs --real-model haiku --native-model claude-haiku-5-5`.
  5. Browser automation attached to the control port for the picker.
- Environment: no provider keys imported. The Claude Agent SDK used the host Claude login, model `haiku` = "Haiku 5.5" (the user's direction). NATIVE-LAUNCH sent no message, so no inference ran. The user's app and data were not touched.
- Observation: in REAL-OLD-ALONE, Haiku replied that `create_or_update_project` "has been removed". That knowledge came from the test package's own agent description, which I wrote, not from product text; no agent-facing product text names the removed tool.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0) arm64; Node 22.23.1; packaged AutoByteus (worktree, enterprise flavor); Claude Code (Claude Agent SDK, Haiku 5.5); scripted AGY fixture; AutoByteus native runtime (launch only); headless Chrome for probes.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Persisted-data decision: `Not Affected`. A stored package definition listing the old name launches unchanged on AGY, Claude and AutoByteus native. An instance restart applied the server setting. No version-specific branch or fallback was observed.

## Durable Coverage Changed In The Codebase

Both are baseline fixes (TESTING.md Rule 9), each its own commit; neither failure is caused by this change.

| Path | Commit | Change | Cause | Result |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` | `c740d16b3c` | process scan made asynchronous with one batched `lsof`; sampler skips while a scan runs; the wake assertion shows the result; a failed GraphQL fetch reports its cause | The scan used `pgrep` plus one synchronous `spawnSync("lsof")` per matching process, every 2 s and every 50 ms while waiting for exits. The server under test runs in the same process, so each scan froze it and its timers. With the full folder running, `pgrep` matches every fixture process on the host. One instrumented run had 90 scans over 1 s (max 2.07 s, 14–15 pids). It failed in 2 of 3 full-folder runs (refused wake; `fetch failed` to its own server) and passed alone | full folder 18/18 twice |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | `d1796f010d` | records each created Task's `taskKey` and expects `New Task assigned to you: <taskKey>` | since task-keys (REQ-018), agent-facing texts name Tasks by key. BR-012..014 waited for the taskId and timed out on every run (shown by a temporary center-text dump), and BR-015/016 then failed for lack of predecessors. The server E2E `task-existing-copy-assignment` already expects keys | 16/16 |

- Attached for test-code review: Yes. Removed paths: none.

## Other Execution Artifacts

| Path | Type | Retained / Temporary |
| --- | --- | --- |
| `evidence/api-e2e/app-journey.mjs`, `test-package/`, `agy-scripted.sh` | real-app method and data | Retained |
| `evidence/api-e2e/tcil-diag/`, `tct-diag/` | diagnostic runs (temporary instrumentation, reverted) | Retained |

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| resolution probe (split ticket) on two servers | module-level registry and skip | Pass | throwaway HOMEs removed |
| `app-journey.mjs` on the isolated instance | AC-001/002/003/006 in the real app | Pass | instance stopped, data root removed |
| temporary diagnostic edits (wake print, scan/loop instrumentation, TCT center dump) | find the two failures' causes | causes found | reverted; `git status` clean for those paths before each fix |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| AGY CLI | repository scripted fixture | deterministic real tool calls | not model behavior; the Haiku 5.5 cases cover that |

## Failures And Out-Of-Scope Observations

| Item | Result | Cause | Owner / Follow-up |
| --- | --- | --- | --- |
| `task-copy-idle-lifetime` (2 of 3 full-folder runs) | Fixed `c740d16b3c` | synchronous host-wide process scan blocking the in-process server | done |
| TCT BR-012..016 | Fixed `d1796f010d` | probe stale after task-keys | done |
| instance log | Info | first-launch "memory file missing" notices; the expected skip warning (on stderr, so tagged `[ERROR]` by the log wrapper) | not failures |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| isolated instance `iso-50482-7d19` | mine | `isolated-app stop` | stopped; data root removed; ports released |
| probe stacks | probe-owned | cleanup receipts | all terminated, data roots removed |
| throwaway HOMEs, temp backups | mine | deleted | removed |
| user's app/data; other instances | not mine | untouched | — |

## Preliminary Classification

Not applicable (Pass).

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: 96%
- Default 95% target met: Yes
- Any final category below 90%: No
- Broader validation decision: Required; executed
- Critical acceptance criteria lacking direct proof: None
- Behavior only the user can check: None. The release type is the user's decision at release time (RELEASE.md), and the PTM package PR runs in parallel under the PM.
- Next recipient from get_handoff_rules: `/software_engineering_team/code_reviewer` (proportional test-code review)

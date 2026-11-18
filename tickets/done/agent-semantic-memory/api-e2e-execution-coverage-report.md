# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, code review pass CRR-001
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - The scripted-AGY capsule's main agent file is the composed prompt followed by the capsule's own `## Working Environment` block (`agy-run-capsule.ts:52-56`). The deterministic suite compares the composed part (cut before that block). The section correctly comes before it (contract §4).
  - Grok ran on `grok-4.5`: the pin `grok-4.7` is not offered by the installed CLI (the suite falls back to the first offered model, as the existing live suites do).
  - The native AutoByteus cells ran twice: the second run only added the instruction excerpt to the kept evidence (no assertion changed). The recorded result is the second run.
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/agent-semantic-memory/tickets/in-progress/agent-semantic-memory/evidence/` (sub-folders `API-*`; the implementation's `IMP-*` files sit beside them)

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review of the added suites)
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | source `578ac778b` (= `7e5f90d7f` source; ticket docs only after it), test file as committed in `595990347` | Linux 6.12 aarch64 container, root, Node v22.23.3, pnpm 10.28.2 via corepack | in-process Studio server; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | test-owned temp data dir and disposable HOME; no inference |
| ENV-2 | as ENV-1 (live suite as committed in `595990347`; native evidence excerpt added before the commit) | as ENV-1 | real CLIs: codex-cli 0.167.0 (`gpt-6.1-terra`, low), Claude Code 2.1.322 (`haiku`), grok 1.0.77 (`grok-4.5`), agy 1.5.4 (`gemini-3.8-flash-low`), native AutoByteus with `claude-haiku-5-5` (Anthropic key from the test vault) | data root `/root/.autobyteus-e2e/semantic-memory-live-*` (outside `/tmp`, AF-03), removed after each run; throwaway `CODEX_HOME` with a link to `auth.json`; recorder wrappers for Codex/Claude/Grok; AGY with a throwaway HOME holding a copy of its sign-in token (removed) |
| ENV-3 | `595990347` fresh clone | as ENV-1 | release job `build-linux-arm64` commands (Electron 42.11.16, AppImage) | `/root/.autobyteus-e2e/fs-clone`, `GITHUB_REPOSITORY` set as on the runner |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-005..AC-008 unit, QR-001..003 | server unit suite | Reused IMP-02 | — | Pass | — | — | `git diff --name-only 0fa12575c 578ac778b` touches only `tickets/`; nothing it exercises changed |
| API-R2 | AC-007 component | web specs | Reused IMP-04 | — | Pass | — | — | as API-R1 |
| API-R3 | AC-007 browser journey | form/detail in Chromium | Reused IMP-08 | — | Pass | — | — | as API-R1 |
| API-R4 | REQ-006 (Codex sandbox mechanism) | Codex CLI sandbox | Reused IMP-09 | — | Pass | — | — | as API-R1; API-11 now proves it through the app-server |
| API-01 | AC-007, REQ-001/002 | GraphQL (renderer documents) + `agents/<id>/agent-config.json` | `env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<wt>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs SEMANTIC_MEMORY_E2E_EVIDENCE_DIR=<evidence>/API-SM-deterministic pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts --no-watch` (case SM-01) | ENV-1 | Pass | `API-SM-deterministic/API-SM-deterministic-run.log`, `API-SM-deterministic/SM-01-agent-config.json` | `Tests  9 passed (9)`; JSON: `afterOn` = `before` + `"semanticMemoryEnabled": true`, `afterOff` = `before` | an update without the field keeps it; reads never create `memory/semantic` |
| API-02 | AC-007, DEC-012 | GraphQL + package files + `personal-settings.json` | same run (SM-02) | ENV-1 | Pass | `API-SM-deterministic/SM-02-personal-settings.json` | `afterOn` holds one `"semanticMemoryEnabled": true` for the package agent; `afterReset` has none; `packageFilesBefore` = `packageFilesAfter` | a package declaring `true` reads on; personal off + reset returns to on |
| API-03 | AC-005, REQ-008, QR-003 | scripted AGY run, Project A | same run (SM-03) | ENV-1 | Pass | `API-SM-deterministic/SM-03-prompt-without-setting.md` | prompt's Project section is followed only by the capsule's `## Working Environment`; no `Semantic Memory` | `memory/semantic` did not exist afterwards |
| API-04 | AC-001 | scripted AGY run, Project A | same run (SM-04) | ENV-1 | Pass | `API-SM-deterministic/SM-04-prompt-project-a.md` | `## Project` paragraph, empty line, `## Semantic Memory` + the §2 paragraph with `…/memory/semantic/sm-scout-<id>` | folder exists; not inside the workspace, package or `memory/agents`; equals GraphQL `semanticMemoryPath` |
| API-05 | AC-003, AC-004 | scripted AGY: Project B run, shared team member, delegated copy | same run (SM-05) | ENV-1 | Pass | `API-SM-deterministic/SM-05-prompts.json` | `projectB`, `teamMember` and `delegatedCopy` each end with the same section and folder | delegated copy made by a real `delegate_task` call; the coordinator and the delegating host (no setting) have no section |
| API-05b | AC-005 | existing `collaboration-prompt-wording.e2e.test.ts` | `env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `API-05b/API-05b-collaboration-prompt-wording.log` | `Tests  11 passed (11)` | compares every prompt from the first collaboration heading up to the capsule block with the approved views: an extra section would fail it |
| API-06 | AC-006, AC-007 alternate | scripted AGY: package team with a team-local member of the same local name | same run (SM-06) | ENV-1 | Pass | `API-SM-deterministic/SM-06-team-local-member-prompt.md` | folder `…/semantic/team-local-agent%3A…%3Asm-scout-<id>` | differs from the shared `…/semantic/sm-scout-<id>`; enabled by the package's own `agent-config.json` |
| API-07 | AC-008, REQ-007/009 | scripted AGY + GraphQL | same run (SM-07) | ENV-1 | Pass | `API-SM-deterministic/SM-07-off-on.json` | `offPrompt` has no section; `onPrompt` ends with the same folder; `filesBefore` = `filesAfter` | |
| API-08 | REQ-007 | GraphQL delete | same run (SM-08) | ENV-1 | Pass | `API-SM-deterministic/API-SM-deterministic-run.log` | `Tests  9 passed (9)` | folder tree hash unchanged after `deleteAgentDefinition` |
| API-10 | AC-001 (not listed) | Memory page GraphQL, `MemoryRunDiscovery`, `LocalMemoryExportScanner` over the suite's real data dir | same run (SM-10) | ENV-1 | Pass | `API-SM-deterministic/SM-10-listings.json`, `SM-10-memory-page-agents.json` | `memoryPageAgents` lists only `sm-manager-…`, `sm-scout-…` run owners; `memorySearchRuns` all under `memory/agents/…`; `memorySyncFiles` has no `semantic` entry | three semantic folders present at the time |
| API-09 | REQ-002 regression | existing `package-personal-settings.e2e.test.ts` | `env -i PATH HOME=<resolved temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/personal-settings/package-personal-settings.e2e.test.ts --no-watch --reporter=verbose` | ENV-1 | Pass | `API-09/API-09-package-personal-settings.log` | `Tests  7 passed (7)` | |
| API-11 | AC-001, AC-002, AC-003 (Codex), QR-002, REQ-009 | real Codex app-server, auto-execute off | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CODEX_E2E=1 SEMANTIC_MEMORY_LIVE_E2E_EVIDENCE_DIR=<evidence>/API-SML-codex pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts --no-watch --reporter=verbose` (SML-WRITE, SML-READ) | ENV-2 | Pass | `API-SML-codex/API-SML-codex-run.log`, `SML-WRITE-codex.json`, `SML-WRITE-codex-control.json`, `SML-WRITE-codex-restore.json`, `SML-READ-codex.json` | `Tests  5 passed \| 1 skipped (6)`; wire `"sandbox": "workspace-write", "approvalPolicy": "on-request"`, `"sandbox_workspace_write": {"writable_roots": ["…/memory/semantic/sm-live-keeper-codex-…"]}`; `"approvals": []`; file `deploy-codeword.md` with the codeword; control: one `run_bash` approval `denied`, `"exists": false` | write made by the agent's own shell, path taken from its instructions only; `thread/resume` after restore carries the same root and section; Project B run replied the codeword with no approval |
| API-12 | AC-005 (Codex) | real Codex, agent without the setting | same run (SML-CODEX-OFF) | ENV-2 | Pass | `API-SML-codex/SML-CODEX-OFF.json` | `"configKeys": ["mcp_servers"]`, `"sandbox_workspace_write": null`, `"semanticSection": null`, `"folderExists": false` | instructions end with the Project section |
| API-13 | AC-004 (Codex) | real Codex shared team member | same run (SML-CODEX-TEAM) | ENV-2 | Pass | `API-SML-codex/SML-CODEX-TEAM.json` | reply = the codeword; member `thread/start` ends with the section, same root | |
| API-14 | AC-002 (Codex + integration variables) | real Codex, imported `github` integration skill (no token) | same run (SML-CODEX-INTEGRATION) | ENV-2 | Pass | `API-SML-codex/SML-CODEX-INTEGRATION.json` | `"sandbox_workspace_write": {"network_access": true, "writable_roots": [...]}`; config keys `mcp_servers`, `sandbox_workspace_write`, `shell_environment_policy`; file `proxy-probe.md`: `proxy probe SMNET-… returned 403`; `"approvals": []` | `403` is the loopback credential proxy's answer (no token connected): the sandboxed shell reached it, so network access survived the merge |
| API-15 | AC-001, AC-002, AC-003 (Claude) | real Claude Code via the SDK | same command with `RUN_CLAUDE_E2E=1` (SML-WRITE, SML-READ) | ENV-2 | Pass | `API-SML-claude/API-SML-claude-run.log`, `SML-WRITE-claude.json`, `SML-READ-claude.json` | `Tests  3 passed \| 3 skipped (6)`; `"addDirArgs": [["--add-dir", "…/memory/semantic/sm-live-keeper-claude-…"]]`; `"instructionsHaveSection": [true]` | |
| API-16 | AC-002, REQ-006 (Claude, auto-execute off) | real Claude approvals | same run (SML-CLAUDE-APPROVALS) | ENV-2 | Pass | `API-SML-claude/SML-CLAUDE-APPROVALS.json` | reads: `"approvals": []` for both the workspace and the memory file; writes: one `Write` approval `workspace` and one `Write` approval `semantic`; outside read: one `Read` approval `outside`, `denied` | the memory behaves like the workspace; a third folder asks (control) |
| API-17 | AC-001, AC-002, AC-003 (native AutoByteus) | real native runtime, Anthropic | same command with `RUN_AUTOBYTEUS_SEMANTIC_MEMORY_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` | ENV-2 | Pass | `API-SML-autobyteus/API-SML-autobyteus-run.log`, `SML-WRITE-autobyteus.json`, `SML-READ-autobyteus.json` | `Tests  2 passed \| 4 skipped (6)`; `instructionsExcerpt`: `## Project` … `## Semantic Memory` … `## Working Environment` (contract §5.1 order) | provider request body recorded in-process (no headers kept) |
| API-18 | AC-001, AC-002, AC-003 (Grok Build, ACP) | real Grok | same command with `RUN_GROK_E2E=1` | ENV-2 | Pass | `API-SML-grok/API-SML-grok-run.log`, `SML-WRITE-grok.json`, `SML-READ-grok.json` | `Tests  2 passed \| 4 skipped (6)`; `write_file` into `…/semantic/sm-live-keeper-grok-…/deploy-codeword.md`; reply ends with the codeword | model `grok-4.5` (pin not offered) |
| API-19 | AC-001, AC-002, AC-003 (Antigravity) | real `agy` | same command with `RUN_AGY_E2E=1`, HOME = throwaway with a copied sign-in token, `SEMANTIC_MEMORY_LIVE_E2E_ROOT=/root/.autobyteus-e2e` | ENV-2 | Pass | `API-SML-agy/API-SML-agy-run.log`, `SML-WRITE-agy.json`, `SML-READ-agy.json` | `Tests  2 passed \| 4 skipped (6)`; `write_file` into `…/semantic/sm-live-keeper-agy-…/deploy_codeword.md`; reply `SMCODE-AGY-…` | capsule prompt has the section |
| API-20 | AC-002 alternate (DeepSeek harness) | dsh | `command -v dsh`; test vault status; docs | ENV-1 | Not Tested | `API-20/API-20-deepseek-harness-not-installed.log` | `exit=1` for `command -v dsh`; `MISSING provider.deepseek.api-key`; docs line 90–92 | ACP backend wiring proven by API-18 (Grok, same ACP backend) and the ACP unit test; the escalation prompt with auto-execute off is the documented alternate outcome (FU-007) |
| API-FS | build input `autobyteus-web/generated/graphql.ts` | fresh clone + release job `build-linux-arm64` | `git clone --no-local <worktree> /root/.autobyteus-e2e/fs-clone`, checkout `595990347`, `pnpm install --frozen-lockfile`, `cd autobyteus-web && GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace AUTOBYTEUS_BUILD_FLAVOR=personal pnpm build:electron:linux:arm64`, then the job's three verify steps (AppImage + updater metadata, Prisma engines, packaged server startup) from the clone root | ENV-3 | Pass | `API-FS/API-FS-fresh-start-build.log` (excerpt), `API-FS/API-FS-build-full.log`, `API-FS/API-FS-verify-full.log` | `[typecheck] PASS`; `AutoByteus_personal_linux-arm64-1.5.13-beta.2.AppImage`; `Packaged server startup validation passed` | Attempt 1 without `GITHUB_REPOSITORY` (the runner sets it; TESTING.md) stopped at packaging with `Unable to resolve GitHub updater repository`, which is environment, not code; attempt 2 used a new clean clone. The macOS jobs (signing, notarization) and the x64 jobs need the runner: Not Tested |
| API-TC | durable test code | server typecheck | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-TC/API-TC-server-typecheck.log` | `test-file errors: 1181 in 365 files (baseline 1181 in 365 files)` and `[typecheck] PASS` | the two new suites add no errors |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-04, API-11, API-15, API-17, API-18, API-19, API-10 | Proven | — |
| AC-002 | Yes | API-11, API-14, API-15, API-16, API-17, API-18, API-19; alternate API-20 | Proven (every installed runtime); DeepSeek harness reported, not run | dsh is not installed here and the vault has no DeepSeek key; its behavior (escalation approval with auto-execute off) is documented and FU-007; not a user-only check of this ticket |
| AC-003 | Yes | API-05, API-11, API-15, API-17, API-18, API-19 | Proven | — |
| AC-004 | Yes | API-05 (team member + delegated copy, instructions), API-13 (real Codex member reads the document) | Proven | — |
| AC-005 | Yes | API-03, API-05b, API-12, API-R1 | Proven | — |
| AC-006 | No | API-06, API-R1 | Proven | — |
| AC-007 | Yes | API-01, API-02, API-R2, API-R3 | Proven | — |
| AC-008 | Yes | API-07, API-08 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 97% | every AC has direct cases; API-01..API-19 | DeepSeek harness not runnable here | a machine with dsh + key |
| Changed-boundary execution directness | 85% | 97% | wire capture of `thread/start`/`thread/resume`, `--add-dir`, provider body, AGY capsule; files on disk | — | — |
| Cross-boundary integration realism and mock gap | 80% | 96% | real CLIs and models for 5 runtimes; only the deterministic suite scripts AGY | dsh | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | data root outside `/tmp`; auto-execute off for Codex/Claude; integration variables; package/user/team-local definitions | live runs as root in a container (Codex sandbox via Linux landlock) | a non-root desktop host |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 95% | off/on, delete, restore (`thread/resume`), negative controls (Codex write outside, Claude read outside) | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 90% | IMP-08 browser probe reused; GraphQL with the renderer's documents | no Electron shell run (not affected); narrow viewports not inspected | isolated desktop instance (not required: no shell change) |
| Durable regression coverage quality and relevance | 85% | 95% | two new suites; deterministic one runs without inference | live suite needs paid gates | — |

- Overall post-repository confidence: 86%
- Overall final confidence: 95% (simple average 95.0)
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: DeepSeek harness not run (FU-007); runs as root in a Linux container.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (in-process Studio server over HTTP/GraphQL/WebSocket with real runtime CLIs and providers)
- Confidence gap it addressed: repository tests mock every runtime; REQ-006 (write access) and the Codex `writable_roots`/`network_access` merge could only be proven by real runtimes.
- Browser validation needed: No new browser run. The UI change is small and was covered by IMP-08 on the same source; API-01/API-02 exercise the renderer's own GraphQL documents against the real server.
- If `Not Required`: N/A
- If `Blocked`: N/A (DeepSeek harness: not installed; reported under AC-002's alternate outcome)

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: a package `agent-config.json` without the field and one with `true`; a user agent's file as created by the base-shaped create; `personal-settings.json` written by the service.
- Approved transition followed without an unnecessary migration: `Yes`
- Cases: API-01 (absent → off; key only when on; removed when off; other fields kept), API-02 (personal record only when it differs; reset removes it; package files unchanged).
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (API-14 shows the integration builder no longer emits `sandbox_workspace_write`: one object from one builder)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Removal rationale |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-semantic-memory.e2e.test.ts` | Added | API-01..API-08, API-10 | — |
| `autobyteus-server-ts/tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts` | Added | API-11..API-19 | — |

- Added or updated paths attached for proportional test-code review: `Yes` (commit `595990347`)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI in the deterministic suite | scripted `agy-failure-cli.mjs` | instruction capture of every start path without inference | none for the composer/start path; real AGY covered by API-19 |
| GitHub behind the credential proxy (API-14) | no token connected; the proxy answers 403 | `test.github.token` missing from the vault; the case needs only the shell → loopback proxy connection | GitHub's own answer not exercised (not in scope) |
| Wire recorders | test-owned wrappers run the real CLI unchanged and copy stdin/stdout | to read exactly what the server sent | none |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Deterministic suite data dir, package folder, disposable HOME (`/tmp/sm-e2e-*`) | Yes | suite `afterAll` | removed |
| Live data roots `/root/.autobyteus-e2e/semantic-memory-live-*` (with throwaway `CODEX_HOME`, recorders, wire logs, workspaces) | Yes | suite `afterAll` | removed (`/root/.autobyteus-e2e/` empty after the live runs) |
| AGY throwaway HOME with a copied sign-in token | Yes | `rm -rf` after the run | removed |
| Runs, Projects, definitions on the test servers | Yes | terminated with the server; data dirs removed | done |
| `pnpm` shim `/tmp/sm-shim/` | Yes | — | kept for the run (`corepack pnpm` wrapper and log header helper) |
| Fresh clones `/root/.autobyteus-e2e/fs-clone` (two attempts) | Yes | `rm -rf` after API-FS | removed; `/root/.autobyteus-e2e` removed |
| User data (`~/.autobyteus`, `~/.codex`, `~/.claude`, `~/.grok`, `~/.gemini`) | No | untouched (CLI homes only read for login; `auth.json` linked, AGY token copied) | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None. AC-002's DeepSeek harness cell is reported as not installed (its documented alternate outcome, FU-007).
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: code reviewer (proportional test-code review)
- Notes: pre-existing failures FU-010..FU-012 were not hit by these runs.

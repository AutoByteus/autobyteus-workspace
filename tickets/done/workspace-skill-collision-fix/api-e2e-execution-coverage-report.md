# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `requirements-doc.md` (SR-002, approved by the User 2026-10-18)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-002)
- Supplemental Task Artifacts: none behavior-defining; user evidence (read-only) `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/skill-path-collision-evidence/`
- Design Review Report: `design-review-report.md` (ARCH-REV-001, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001; updated by the implementation engineer for merge `c59da62e70` and the v1.5.6-beta.4 target)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- API/E2E Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: 1
- Trigger: CRR-001 Pass (commit `810408bcee`)
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

All paths are in `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/tickets/in-progress/workspace-skill-collision-fix/`.

Commits:
- Validated implementation commit: `810408bcee`.
- Branch head after this round: `1c69409a85`, which contains:
  - `c59da62e70`, the implementation engineer's merge of the v1.5.6-beta.3 base;
  - `1f9aae5817`, the baseline test fix;
  - `1c69409a85`, the new coverage.

## Routing Classification

- Task size: `Large`
- Architectural risk: `Low`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. One deviation: the gated live suites restored from beta.1 turned out to be stale. Some were fixed as a baseline test fix; the rest are out of scope (see below).
- Existing coverage decisions revised during execution:
  - `codex-thread-bootstrapper.integration` case 1: `Still Valid` → `Needs Update`. It asserted the behavior from before D-19. D-19 (`ec31ff371a`) is in beta.1 and is restored unchanged.
  - Claude backend-factory and session-manager live fixtures: `Needs Update`. They call removed APIs and their stubs are incomplete.
  - Codex backend-factory, thread-manager, thread and client-manager live suites, and the Codex live memory-persistence and interrupted-compaction E2E: `Out Of Scope`. They use stale models and removed APIs, and the same staleness is in v1.5.6-beta.1.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger path: `api-e2e-test-case-ledger.md`
- Ledger initialized before execution: `Yes`, with case IDs from the investigation. Events were written as cases completed.
- Every completed case recorded: `Yes`
- Ledger reconciled into this report: `Yes`
- Cases still running or not started: none

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`
- Compatibility-only or legacy-retention behavior observed: `No`. The isolated instance log has 0 hits for `runtime-skill-profiles`. The AC-106 code search is clean; its only hit is an unrelated local variable.
- Persisted-data transition: `Not Affected`; followed. Runs restored through the normal reader.
- Durable coverage for compatibility-only behavior: `No`

## Acceptance-Criteria Proof

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/workspace-skill-collision-fix/tickets/in-progress/workspace-skill-collision-fix/evidence/`

| AC | Proof | Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| AC-101 (new run with same-skill links) | Claude, Codex and Grok each start a new run in a workspace whose `.claude/.codex/.grok/skills/<s>` are absolute links to the package skill. The link is still in place and points at the package skill while the run holds it. The agent answers with the code from the skill: Claude used the `Skill` tool, Codex read `.codex/skills/<s>/SKILL.md`, and Grok found the skill by searching (see F7). Real Codex `skills/list` reports the linked skill at its real path, so nothing is materialized and the link is untouched. Desktop app: the same journey works on all three runtimes. | live server + real CLIs; real `codex app-server`; isolated desktop instance | Pass | `07-live-skill-links-claude.log`, `08-live-skill-links-codex.log`, `09-live-skill-links-grok.log`, `06-codex-live-bootstrapper.log`, `16-desktop-03/04/05-*.png` |
| AC-102 (continue) | Live server: terminate → `restoreAgentRun` → the agent answers a question only the skill folder answers (`restore-code.md`), on all three runtimes. Desktop: after the app restarts, each run is opened from history and "continue" returns `DESKTOP-CONT-9K2` on all three runtimes. | live server; isolated desktop instance | Pass | `07/08/09-*.log`, `16-desktop-06/07/08-*.png` |
| AC-103 (no workspace entry: linked for the run, removed at release) | Restored beta.1 unit tests and the regression test. Live Codex: a missing skill is materialized and removed at cleanup. | unit; real Codex | Pass | `03-unit-backends.log`, `06-codex-live-bootstrapper.log` |
| AC-104 (different skill with the same name) | Configured-skill agent: `createAgentRun` fails with "Workspace skill path collision for <Claude/Codex/Grok Build> skill …", and the user's folder is unchanged, on all three runtimes. All-installed agent: it answers with the workspace copy's code (`OWNCODE`), not the package's. | live server + real CLIs | Pass | `07/08/09-*.log` (`SKILL_LINKS_LIVE_COLLISION`, `SKILL_LINKS_LIVE_ALL_INSTALLED`) |
| AC-105 (brand-new run, member memory folder absent) | Team run with lazy member activation. Before the first message the team memory folder holds only `team_communication_messages.json` and `team_run_execution_tree.json`; the member folder is absent. The member starts, answers from the skill, and its folder exists afterwards. This held on all three runtimes. Also: the non-gated E2E brand-new run with and without links, and the unit regression. | live server + real CLIs; server E2E | Pass | `07/08/09-*.log` (`SKILL_LINKS_LIVE_TEAM_MEMORY_BEFORE`, `SKILL_LINKS_LIVE_TEAM_MEMBER`), `15-post-merge-e2e-skills.log` |
| AC-106 (private path removed) | Code search over `src` and typecheck | repo | Pass | `02-ac106-search.log`, `01-typecheck.log` |
| AC-107 (suites, typecheck; Antigravity unchanged) | Typecheck. Full unit: 716 files / 5,830 tests. Integration: 76 files / 396 tests. Antigravity linked-skills smoke (scripted CLI): 8/8. Post-merge: typecheck, unit subsets (168 files / 1,800 tests) and skills E2E (35/35). | repo; server E2E | Pass | `01`, `04`, `05`, `11`, `14`, `15` |

## Changed Boundary And Evidence Matrix

| Boundary | Evidence | Directness |
| --- | --- | --- |
| Materializer callers (Claude/Codex bootstrappers, ACP factory) | unit regression + restored beta.1 tests | direct (runtimes mocked) |
| Codex `skills/list` preflight | real `codex app-server` (API-03) | direct |
| Run create/restore/terminate, team lazy activation → preparation → runtime | real Studio server + real Claude/Codex/Grok CLIs (API-05..07) | direct |
| Packaged embedded server environment and the user's journey | isolated desktop instance of the worktree build (API-13) | direct |
| Antigravity unchanged | scripted AGY server E2E (API-08); no source diff under `antigravity/` | direct for the transport; the AGY model was not run |

## Additional Repository Coverage Execution

Commands were run from `autobyteus-server-ts`. Live runs used `env -i PATH HOME USER LOGNAME TMPDIR`. Codex used a throwaway `CODEX_HOME` holding only a link to the host `auth.json`.

| Case | Command | Result |
| --- | --- | --- |
| API-01 | `pnpm typecheck`; grep for private-path symbols | Pass |
| API-02 | `vitest run tests/unit/agent-execution/backends`; `pnpm test:unit`; `pnpm test:integration` | Pass. The first integration run collided with my own parallel gated run on the shared test DB (`05a-…contended-run.log`). I removed the worktree-owned `tests/.tmp` DB and reran the suite alone: green. |
| API-03 | `RUN_CODEX_E2E=1 vitest run tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | Pass, 4/4, after the baseline test fix |
| API-04 | `vitest run tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts` | Pass, 35/35 |
| API-05..07 | `RUN_{CLAUDE,CODEX,GROK}_E2E=1 vitest run tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` (each runtime run separately; models haiku, gpt-5.6-luna, grok-4.7) | Pass, 3/3 per runtime |
| API-08 | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` (empty `HOME`) | Pass, 8/8 |
| API-09 | `RUN_CLAUDE_E2E=1 vitest run` on the Claude session-manager integration, backend-factory integration and websocket interrupt/resume E2E | After the baseline test fix: 24/26 pass. The 2 browser-tool cases are out of scope (see Result Summary). |
| API-10 | `RUN_CODEX_E2E=1` on the Codex backend-factory, thread-manager, thread and client-manager integration suites, plus the Codex live memory-persistence and interrupted-compaction E2E | Out of scope: stale tests, the same in beta.1. None of them reach the skill code. |
| API-12 | Post-merge on `c59da62e70`: typecheck, unit (`agent-execution`, `skills`, `skill-update-notices`, `runtime-management`), skills E2E | Pass |

### Rerun-by-impact after merge `c59da62e70`

`git diff --name-only 810408bcee c59da62e70` lists the following non-ticket changes:
- `autobyteus-server-ts/src/skill-update-notices/{domain/skill-update-notice-types.ts, services/skill-update-notice-builder.ts, services/skill-version-diff.ts}`: the text of a skill-update notice, built only when a skill file changes during an active run;
- the docs and tests for that feature;
- `autobyteus-web/SystemTaskNotificationSegment.spec.ts`;
- the `autobyteus-web/package.json` version bump.

There is no change to dependencies, the lockfile, the schema, `autobyteus-ts`, contracts, the harness or the build config.

What stays valid:
- API-03 and API-05..11 are **Still valid**. None of them changes a skill file during a run, and none exercises notice text.

What was rerun on `c59da62e70`:
- API-01, API-02 (unit subsets) and API-04, as a sanity check: green.
- API-13, the desktop journey, ran entirely on the merged build.

## Validation Confidence Scorecard

| Category | Score | Support | Remaining Uncertainty |
| --- | --- | --- | --- |
| Requirement and AC proof | 95% | AC-101..107 each proven directly, on all three runtimes | Grok sees the skill only by searching (F7); that is beta.1 behavior and outside REQ-101's exact-restore scope |
| Changed-boundary execution directness | 95% | real server, real CLIs, real Codex `skills/list`, packaged app | Antigravity proven via the scripted CLI only (its code is unchanged) |
| Cross-boundary integration realism and mock gap | 95% | no mocks in API-05..07 or API-13 | — |
| Environment, configuration, identity and fixture fidelity | 95% | the user's package shape `agents/<agent>/skills/<skill>`, absolute links, test-owned data (QR-101), packaged build with the reduced server environment | the CLIs use host sign-ins; Claude and Grok wrote sessions to the host CLI homes (no setting changed) |
| Failure, edge-case, lifecycle and recovery | 95% | collision refusal, all-installed preference, restore after terminate, app restart and continue, lazy team member | the F2 quirk observed and deliberately not asserted |
| User-surface / desktop shell | 95% | isolated desktop instance: import, new run and continue on all three runtimes | the workspace was registered through the instance's GraphQL API, because "Add workspace" opens the macOS folder picker, which automation cannot drive safely |
| Durable regression coverage quality | 95% | new gated live E2E (the F6 release-smoke shape) and the Codex user-link case; stale gated tests fixed | several older gated Codex suites remain stale (follow-up) |

- Overall final confidence: **95%** (simple average)
- Every critical AC directly proven: `Yes`
- Any category below 90%: `No`
- 95% target met: `Yes`

## Broader Validation Decision And Execution

- Decision: `Required`. Executed as a live API run (real server and CLIs) and a project desktop validation (isolated instance).
- Gap closed: real runtime discovery of a linked skill, the full server run path, and the packaged embedded server.
- Startup: in-process Studio server per test file (port 0, temp app data). Isolated instance: `CODEX_HOME=<throwaway> pnpm --silent isolated-app start --build` → `iso-60176-ff92` (control 60176, server 60177), restarted twice, then stopped.

## Desktop Application Validation

- Approach: packaged worktree build of the merged HEAD; browser automation attached to the control port.
- Journey steps:
  1. Settings → Agent Packages: import `/private/tmp/skill-links-desktop/package` (`16-desktop-01`).
  2. Register the workspace `/private/tmp/skill-links-desktop/workspace`, which holds the `.claude/.codex/.grok/skills/desktop-link-probe` absolute links. This was done through the instance's GraphQL `createWorkspace`. The sidebar "Add workspace" opens the macOS folder picker; I closed it with an accessibility Cancel click on the instance's own process, because the instance window could not be brought to the front, so typed keys could have reached the user's app.
  3. Agents → Run on each runtime (Claude haiku-5-5, Codex GPT-5.6-Luna, Grok 4.7): each answered `DESKTOP-NEW-7Q4` (`16-desktop-03/04/05`).
  4. Restart the app, open each run from history and send "continue": each answered `DESKTOP-CONT-9K2` (`16-desktop-06/07/08`).
- Instance log: 0 × `ENOENT`, 0 × `Workspace skill path collision`, 0 × `ACTIVATION_FAILED`, 0 × `runtime-skill-profiles` (`16-desktop-instance-log-excerpt.txt`).
- Effect on the user's running app and other instances (`iso-54255-c1c9`): none.

## Platform / Runtime Targets

- macOS (Darwin 25.5.0, arm64)
- claude 2.1.302, codex-cli 0.163.0, grok 1.0.62, agy 1.4.2 (scripted CLI used for Antigravity)
- Node via pnpm 10; vitest 4.0.18

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Decision: `Not Affected`. Runs were restored after terminate and after an app restart through the normal reader.
- No version-specific branch observed.

## Durable Coverage Changed In The Codebase

- Added or updated: `Yes`. These paths are attached for test-code review.
- `1c69409a85`, new coverage:
  - `autobyteus-server-ts/tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` (new, gated per runtime);
  - `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` (new case: the user's absolute link).
- `1f9aae5817`, baseline test fix (test-only):
  - `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts`: `getClient` → lease; guard passed; case 1 aligned with D-19;
  - `autobyteus-server-ts/tests/integration/agent-execution/claude-agent-run-backend-factory.integration.test.ts`: `beginPreparation(...).prepare()`; skill-service stub gains `resolveSkillScope` and `hasEffectiveSkills`; MCP stub gains `deactivateForRun`;
  - `autobyteus-server-ts/tests/integration/agent-execution/claude-session-manager.integration.test.ts`: MCP stub gains `deactivateForRun`.
- Removed: none.

## Other Execution Artifacts

Evidence files `01`–`16` are in the evidence folder; `validated-commit*.txt` records the commits.

## Temporary Execution Methods / Scaffolding

- API-11 Grok skill-list probe (`evidence/10-grok-skills-list-probe.mjs.txt`). It is not durable because it checks Grok's own discovery, which is the subject of follow-up F7.
- Desktop driver scripts under `/tmp`, removed after the run.

## Dependencies Mocked Or Emulated

- Antigravity CLI: scripted fixture, per TESTING.md.
- Nothing else was mocked in the live and desktop cases.

## Result Summary

All in-scope cases pass.

Observations and out-of-scope items:
- **F7 (follow-up sent to `/project_task_manager`):** Grok 1.0.62 does not list workspace `.grok/skills` skills itself. This applies to plain folders as well as links (`_x.ai/skills/list`, `grok inspect`: "Project trusted: no"). Grok agents still reached and used the skill by searching the workspace. The Grok skill code is the same as beta.1's, so this is not caused by this change.
- **F2 observed, not asserted (DEC-103):** after the app restart, the user-created Claude link was gone; the next Claude run recreated it.
- **Out-of-scope stale gated tests** (same in beta.1; cause recorded; outside the Scope Guardrail):
  - Claude backend factory: the `open_tab` / full browser-surface cases time out. The fixture never exposes Agent Tools MCP (`activateForRun → not_exposed`), and the agent in that fixture has no skills.
  - Codex backend-factory, thread-manager, thread and client-manager live suites: hard-coded retired models (`gpt-5.4-mini`, `gpt-5.4`, `gpt-5.3-codex`) and removed APIs (`createBackend`, `acquireClient`, `getClient`).
  - Codex live memory-persistence and interrupted-compaction E2E: they use the `prepareNewAgentRun` API, which was removed in `028cca2312` (before beta.1).
  - These are reported to `/project_task_manager` as a follow-up.

## Cleanup Performed

- The isolated instance was stopped; its data root was removed and its record cleared (`list` no longer shows it).
- Temp package, workspace, `CODEX_HOME` homes and probe folders were removed. The live E2E `afterAll` removes its own temp roots.
- The corrupted worktree-owned `tests/.tmp` test DB was removed; it is recreated on every run.
- Host CLI histories: Claude and Grok sessions from these runs remain in the host `~/.claude` and `~/.grok` session stores. No configuration was changed.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 95%
- Default 95% target met: `Yes`
- Any category below 90%: `No`
- Broader validation decision: `Required`; executed (live API and isolated desktop instance)
- Critical ACs lacking direct proof: none
- Behavior only the user can check: `None`
- Next recipient: per `get_handoff_rules` (Pass on the reviewed route → test-code review)

## Evidence Index

> Delivery note (DR-001): this section was added unchanged from the durable index at `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/workspace-skill-collision-fix/EVIDENCE-INDEX.md`, at the request of the user through the Project Task Manager. At delivery, `16-desktop-page-checks.txt` (E16p) was also copied into this ticket's `evidence/` folder. The other archived evidence files have no `#` header; the headed copies are in `/Users/normy/autobyteus_org/autobyteus-delivery-receipts/workspace-skill-collision-fix/evidence/`.

Commits:
- `810408bcee`: the validated implementation.
- `c59da62e70`: merge of the v1.5.6-beta.3 base at 11:21:39. Its source is the same as `810408bcee` apart from the skill-update-notice text.
- `1f9aae5817` and `1c69409a85`: the API/E2E test commits, made at 11:33:09. Earlier runs used those test edits while they were still uncommitted.

Live runs:
- `cd autobyteus-server-ts`
- environment: `env -i PATH HOME USER LOGNAME TMPDIR`, with the real HOME for the CLI logins
- Codex used a throwaway `CODEX_HOME` holding only a link to the host `auth.json`.

| ID | File (`evidence/…`) | Case / AC | Command or step | Commit | Proves | Key line |
| --- | --- | --- | --- | --- | --- | --- |
| E01 | `01-typecheck.log` | API-01 / AC-106, AC-107 | `pnpm -C autobyteus-server-ts typecheck` | 810408bcee | production src typechecks | `exit=0` |
| E02 | `02-ac106-search.log` | API-01 / AC-106 | grep over `src` for the private-profile/NFS skill symbols | 810408bcee | no private-path code left; the only hit is the unrelated local variable `privateSkill` in `configured-agent-skill-resolver.ts` | `configured-agent-skill-resolver.ts:129: const privateSkill` |
| E03 | `03-unit-backends.log` | API-02 / AC-103..105 | `vitest run tests/unit/agent-execution/backends` | 810408bcee | restored beta.1 backend tests and the 15-case regression test pass | `Test Files 85 passed`, `Tests 1070 passed` |
| E04 | `04-test-unit.log` | API-02 / AC-107 | `pnpm test:unit` | 810408bcee | full unit suite green | `Test Files 716 passed`, `Tests 5830 passed` |
| E05 | `05-test-integration.log` | API-02 / AC-107 | `pnpm test:integration`, run alone | 810408bcee (merge landed mid-run; irrelevant to these suites) | full integration suite green | `Test Files 76 passed`, `Tests 396 passed` |
| E05a | `05a-test-integration-contended-run.log` | API-02 / diagnostic | first integration run, in parallel with my gated run | 810408bcee | the discarded run failed from shared test-DB contention I caused, not from the change | `database is locked` |
| E06 | `06-codex-live-bootstrapper.log` | API-03 / AC-101, AC-103 | `RUN_CODEX_E2E=1 vitest run tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | 810408bcee + test edits | real Codex `skills/list` reports the user's absolute `.codex/skills` link at its real path; new and restored runs materialize nothing; the link is untouched | `CODEX_LIVE_USER_LINK_SKILLS_LIST […"path":"…/package/agents/solution-designer/skills/…/SKILL.md","scope":"repo"…]`, `Tests 4 passed` |
| E07 | `07-live-skill-links-claude.log` | API-05..07 / AC-101, 102, 104, 105 | `RUN_CLAUDE_E2E=1 vitest run tests/e2e/runtime/workspace-skill-links-live.e2e.test.ts` (haiku) | 810408bcee + test edits | Claude answers from the linked skill on a new run and after restore; a brand-new team member starts; a same-named workspace skill is refused for configured skills and used for all-installed | `SKILL_LINKS_LIVE_NEW_RUN claude …"tools":["Skill"]`, `…TEAM_MEMORY_BEFORE…"memberFoldersBefore":["team_communication_messages.json","team_run_execution_tree.json"]`, `…COLLISION…Workspace skill path collision`, `…ALL_INSTALLED…OWNCODE` |
| E08 | `08-live-skill-links-codex.log` | API-05..07 / same | same test, `RUN_CODEX_E2E=1` (gpt-5.6-luna) | 810408bcee + test edits | same as E07 on Codex | `SKILL_LINKS_LIVE_*` lines, `Tests 3 passed` |
| E09 | `09-live-skill-links-grok.log` | API-05..07 / same | same test, `RUN_GROK_E2E=1` (grok-4.7) | 810408bcee + test edits | same as E07 on Grok; Grok reached the skill by searching (see E10) | `SKILL_LINKS_LIVE_NEW_RUN grok …"tools":["grep","run_bash","read_file"]`, `Tests 3 passed` |
| E10 | `10-grok-native-skill-discovery-probe.txt` | API-11 / AC-101 Grok fidelity, follow-up F7 | temporary probe: `grok agent --no-leader stdio` ACP `_x.ai/skills/list` and `grok inspect` | n/a (Grok CLI 1.0.62 only) | Grok does not list workspace `.grok/skills` skills itself, whether they are folders or links; this is beta.1-level behavior | `probe rows []`, `scopes ["user","bundled"]`, `Project trusted: no` |
| E10s | `10-grok-skills-list-probe.mjs.txt` | API-11 | probe source | n/a | the exact probe used for E10 | — |
| E11 | `11-agy-linked-skills-smoke.log` | API-08 / AC-107 (BEH-104) | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=…/agy-failure-cli.mjs vitest run tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts` (empty HOME) | 810408bcee | Antigravity skill behavior unchanged | `Tests 8 passed` |
| E12 | `12-claude-gated-suites.log` | API-09 / AC-107 | `RUN_CLAUDE_E2E=1` session manager, backend factory, websocket interrupt/resume | 810408bcee + test edits | after the baseline fix, the restored Claude session and cleanup path pass live | `claude-session-manager… (9 tests)` ✓, `…interrupt-resume… (9 tests)` ✓ (backend-factory failures here came before the stub fix; superseded by E12b) |
| E12b | `12b-claude-backend-factory-gated.log` | API-09 / AC-107 | `RUN_CLAUDE_E2E=1 vitest run …claude-agent-run-backend-factory.integration.test.ts` | c59da62e70 + test edits | 6/8 pass; the 2 browser-tool cases are out of scope (their fixture never exposes Agent Tools MCP; same in beta.1) | `Tests 2 failed / 6 passed`, `Condition not met within 90000ms` |
| E13 | `13-codex-gated-integration.log` | API-10 / out of scope | `RUN_CODEX_E2E=1` Codex backend-factory, thread-manager, thread and client-manager integration | c59da62e70 + test edits | stale before any skill code runs (retired models, removed APIs; same in beta.1); follow-up sent | `did not return gpt-5.4-mini`, `manager.getClient is not a function` |
| E13b | `13b-codex-live-e2e.log` | API-10b / out of scope | `RUN_CODEX_E2E=1` Codex memory-persistence and interrupted-compaction E2E | 1c69409a85 | stale: they call the removed `prepareNewAgentRun` (removed in 028cca2312); follow-up sent | `manager.prepareNewAgentRun is not a function` |
| E14 | `14-post-merge-typecheck-unit.log` | API-12 / AC-107 | `pnpm typecheck && vitest run tests/unit/{agent-execution,skills,skill-update-notices,runtime-management}` | c59da62e70 + test edits | rerun by impact after the merge: green | `Test Files 168 passed`, `Tests 1800 passed` |
| E15 | `15-post-merge-e2e-skills.log` | API-04, API-12 / AC-101, 105, 107 | `vitest run tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts` (clean env) | c59da62e70 + test edits | non-gated skills E2E, including a brand-new run with and without same-skill links | `Tests 35 passed` |
| E16p | `16-desktop-page-checks.txt` (receipts only) | API-13 / AC-101, AC-102 | browser-automation page checks on isolated instance `iso-60176-ff92` | build of c59da62e70 | in the packaged app, new runs and post-restart "continue" answer from the linked skill on Claude, Codex and Grok; written afterwards from the live check results | `DESKTOP-NEW-7Q4` ×3, `DESKTOP-CONT-9K2` ×3 |
| E16-01..08 | `16-desktop-01-package-imported.png` … `16-desktop-08-grok-continue.png` | API-13 / AC-101, AC-102 | screenshots, one per journey step (import, run config, three new runs, three continues) | build of c59da62e70 | visual support for E16p | the code under each answer |
| E16l | `16-desktop-instance-log-excerpt.txt` | API-13 / AC-101, AC-102 | counts over the instance log | build of c59da62e70 | no ENOENT, collision, `ACTIVATION_FAILED` or `runtime-skill-profiles` in the desktop run | `ENOENT: 0`, `Workspace skill path collision: 0` |
| — | `validated-commit.txt`, `validated-commit-post-merge.txt` | — | `git rev-parse HEAD` at the start of each phase | — | commit anchors | `810408bcee…`, `c59da62e70…` |

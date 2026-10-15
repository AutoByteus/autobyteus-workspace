# API/E2E Test-Case Ledger

## Ledger Meta

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract
- Coverage investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/api-e2e-coverage-investigation.md
- Execution coverage report: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/api-e2e-execution-coverage-report.md
- API/E2E revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/api-e2e-revision-record.md
- Scope: many independent suites, long live runs. **Written during execution from the saved logs; not initialized before the first run.**
- All paths under `evidence/` are relative to /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/evidence/
- Server commands run from `autobyteus-server-ts`; scripted AGY form: `env -i PATH="$PATH" HOME="$HOME" TMPDIR=<tmp> RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run <files> --no-watch`; live form adds `USER LOGNAME RUN_CLAUDE_E2E=1` or `RUN_CODEX_E2E=1`.

## Cases And Terminal Results

| Case | What | Command / entry | Result | Evidence |
| --- | --- | --- | --- | --- |
| BASE-ALL | full e2e tree, scripted AGY, base 8878625d94 | tests/e2e | 8 files / 27 tests fail (pre-existing), 426 pass | server-e2e-agy-scripted-all-base.log |
| BRANCH-ALL-0 | same on the branch before my edits | tests/e2e | 20 files / 51 tests fail (24 extra) | server-e2e-agy-scripted-all-branch.log |
| NINE-FILES | the 9 base-failing files, ungated | named files | 28 fail on branch, same on base (`refType` etc.) | server-e2e-ungated-all.log, base-e2e-nine-failing-files.log |
| FIX-1 | agy-linked-skills-transport, agent-package-definitions-live-refresh | those files | Fail then Pass (E06 needed `llmConfig: null`) | fix-agy-transport-and-live-refresh.log, fix-agy-transport.log |
| FIX-2 | task-closure, task-reactivation, task-existing-copy, task-copy-idle, project-change-feed | those files | Fail, then Pass after Team = manager only + catalog addresses | fix-closure-reactivation.log, fix-task-suites-round2.log, fix-task-suites-round3.log |
| FIX-3 | ad-hoc-task-delegation, delegated-copy-model-change, delegated-launch-config-defaults, delegated-team-lazy-member-activation, controlled-org-publication-http, delegated-copy-member-contact-host, task-copy-idle-lifetime | those files | Fail then Pass (controlled-org needed its own mounted Team refusal) | fix-round4.log, fix-round5.log |
| CM-E2E | new collaboration-model-contract e2e, 3 cases | collaboration-model-contract.e2e.test.ts | Pass 3/3 | fix-round6-cm-e2e.log |
| CM-E2E-NEG | same file on base | copied into the base worktree, removed after | Fail 3/3 (bring-in delivered, teammate copy started) | negative-control-cm-e2e-on-base.log |
| STARTUP | startup migration on synthesized released-shape data through dist/app.js | collaborators-to-delegated-runs-startup.e2e.test.ts | Pass (after two harness corrections: current trace file names; Org run needs its messages file) | startup-e2e-synthesized.log |
| LIVE-CLAUDE-1 | live suite, Claude haiku | agent-initiated-collaborators, RUN_CLAUDE_E2E=1 | **Blocked/env fault**: all 6 stalled; `claude` "Not logged in" without USER/LOGNAME | live-claude-run1-not-logged-in-env-fault.log |
| LIVE-CLAUDE-2 | same with USER/LOGNAME | same | Pass 6/6 (A1, A2, A3, T1, O1, F1) | live-claude-agent-initiated-collaborators.log |
| LIVE-CLAUDE-FINAL-A | final pass | same | 5/6; LE-O1 failed: my refusal wait caught the previous delegation's completion (race) | final/live-claude-run-before-race-fix.log |
| LIVE-CLAUDE-FINAL-B | after matching the call's own arguments | same | Pass 6/6 | final/live-claude.log |
| LIVE-CODEX-1 | live suite, Codex | RUN_CODEX_E2E=1 | LE-A1, A2 pass; LE-A3 fail: Codex shows the refusal message, not the code | live-codex-run1-refusal-code-assertion.log |
| LIVE-CODEX-2 | after accepting code or guidance text | same | Pass LE-A1, A2, A3 (root cases run on Claude only) | live-codex-agent-initiated-collaborators.log |
| FINAL-ALL | full e2e tree, scripted AGY, branch final | tests/e2e | **8 files / 27 tests fail, identical to base**; 429 pass | final/server-e2e-agy-scripted-all.log |
| TYPECHECK | production src | pnpm typecheck | Pass | final/typecheck.log |
| UNIT | server unit | pnpm test:unit | Pass 693 files / 5501 tests | final/unit.log |
| INTEG | server integration | pnpm test:integration | 73 files pass; 2 `agent-status-websocket` cases = documented baseline exception | final/integration.log |
| CONTRACTS | presentation, team-stream, collaboration-stream | pnpm test in each | Pass 20 / 16 / 27 | final/autobyteus-*-contracts.log |
| PMU-1 | project-manager-ux probe, all 25 | pnpm test:e2e:project-manager-ux | 5 fail (Team-host delegations) | probes/pmu-run1.log |
| PMU-2 | after edits: PMU-003, 007, 010, 016, 020 | --cases | Pass 5/5 (PMU-010 returns a recorded skip) | probes/pmu-run2.log |
| CLOSURE-TREE | task-closure-tree probe | pnpm test:e2e:task-closure-tree | Fail all (bring-in), then Pass 16/16 | probes/task-closure-tree.log |
| COLLAPSE | delegated-team-default-collapse probe | pnpm test:e2e:delegated-team-default-collapse | Fail at setup (`collaborators`), then Pass 7/7 | probes/delegated-team-default-collapse.log |
| DLP-1 | delegated-launch-defaults probe all | pnpm test:e2e:delegated-launch-defaults | 11 pass, 4 fail (DLP-003..006) | probes/dlp-run1.log |
| DLP-2 | DLP-003..006, SSR-001 after edits | --cases | Pass 5/5 | probes/dlp-run2.log |
| XSCOPE-CLAUDE | cross-scope-agent-mentions probe, Claude | --runtime claude_agent_sdk | 18 pass + S01 fail (my field-name bug), then S01 Pass; 2 N/A (host crash) | probes/cross-scope-claude.log, cross-scope-claude-S01.log |
| XSCOPE-CODEX | same, Codex | --runtime codex_app_server | 18 pass; S01 text not shown by Codex (probe made runtime-aware; server facts hold) | probes/cross-scope-codex.log |
| RSL-FULL | run-settings-live probe, real Codex | pnpm test:e2e:run-settings-live | 12 pass; R03 fails (identical on base); R09, R04 pass | probes/run-settings-live-full.log, run-settings-live.log (first run: R09/R04 model chose not to delegate) |
| BASE-PROBES | existing-run-model-config, interrupt-result-presentation, run-settings-live R03 on base | same commands | all fail the same way as on the branch | probes/base/ |

## Re-entry And Reconciliation

- Last completed case: RSL-FULL. Cases not started or interrupted: none. Reconciled into the execution report: Yes.

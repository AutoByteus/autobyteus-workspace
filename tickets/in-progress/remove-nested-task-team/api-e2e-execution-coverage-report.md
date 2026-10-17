# API/E2E Execution Coverage Report — remove-nested-task-team

## Execution Round Meta
**Round 1 / API-REV-001 / Pass / 93%.**
- Trigger: `code_reviewer` CRR-002 pass.
- Commits under test: `065430dd61`, `66c61595d2`, `4ec3dd9eb3`, `cbecdc076d`; base `db00ba16a9`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-nested-task-team`, branch `codex/remove-nested-task-team`.

Canonical ticket directory: `tickets/in-progress/remove-nested-task-team` (artifact names below resolve against it).

Authorities read:
- requirements-doc.md (SR-006), investigation-notes.md, design-spec.md, solution-revision-record.md;
- design-review-report.md and architecture-review-revision-record.md (ARCH-REV-002 Pass);
- implementation-handoff.md and implementation-revision-record.md;
- code-review-report.md and code-review-revision-record.md (CRR-002).

Current validation artifacts: api-e2e-coverage-investigation.md, api-e2e-test-case-ledger.md, this report, api-e2e-revision-record.md.

## Routing Classification
- **Size and route:** Large / High; Reviewed input.
- **Successful output:** Code Review, for a proportional test-code review of the durable test changes listed below. They are uncommitted, kept in the worktree for review.
- **Production:** no production source changed in this stage.

## Investigation And Execution Basis
The investigation and ledger were written before any coverage change. Rules followed:
- root AGENTS.md, TESTING.md and DESIGN.md (rule 7);
- e2e run in a clean env: `env -i PATH HOME=<tmp> TMPDIR`, with the scripted AGY actor (`RUN_AGY_FAILURE_E2E=1`, `ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs`);
- desktop checks on isolated instances (`pnpm isolated-app`) with owned data roots. Never the user's app or `~/.autobyteus`; the user's `.env` was only imported into the test vaults with `pnpm secrets:import`, as the user instructed.

Builds were serialized. One earlier branch Electron build failed only because it ran at the same time as an integration prepare; rebuilt alone, it passed (`electron-build-branch-2.log`).

## Acceptance-Criteria Proof
Evidence folder: `evidence/api-e2e/`.

| AC | Proven by | Evidence | Result |
| --- | --- | --- | --- |
| AC-001 (no nested task-team representation; typecheck) | R1 typecheck; review's source search, rechecked by the R0/R2 suites on the narrowed contracts | R1-typecheck.log, R0-*.log, R2-unit.log | Proven |
| AC-002 (unreadable standalone tree contained) | UC-1 running server; UC-2 a new server process (`dist/app.js`) started with the bad tree present. Runs come from real Agent roots. The 2 readable runs keep file changes, member conversation, the Token Meter summary and `agentRunCollaboration`. A warning names the skipped run and none names the readable runs; opening the bad run errors; every collaboration file's sha256 is unchanged. On the base the readable runs' lookups fail ("Unterminated string in JSON") — the negative control | UC-run3.log, BASE-UC-DF.log | Proven |
| AC-003 (organization teams and delegation behave as before) | (a) DF-1..3 e2e, scripted: Team, Agent and Org roots build a delegation forest; trees list agents only; Stop → reopen restores the same forest; the deepest task agent is reached by run id; the Org's mounted team is unchanged. Passes on branch and base. (b) Desktop DJ-1..5, branch vs base, real models (below). (c) Probes WP-4/WP-5 (task-closure-tree; Org tree with a task team inside a task team) | DF-run2.log, BASE-UC-DF.log, DF-rerun-crr003-*.log, desktop/*.png, probes/* (DF-run1.log is an authoring run on the earlier harness without the Org restore mutation; see the ledger DF row) | Proven |
| AC-004 (web build, tests, localization) | Web 627 files / 4382 tests; guards; localization audit zero findings; no nested-team string in `autobyteus-web/localization`; the branch Electron build runs the guards and audit again | R5-web.log, R5-guards.log, electron-build-branch-2.log | Proven |
| AC-005 (DESIGN.md rule 7) | Documentation review owned by code review; rule 7 is the behavior UC-1/UC-2 prove | — | Review-owned |

## Changed Boundary And Evidence Matrix
| Case | Boundary | Result | Command / evidence |
| --- | --- | --- | --- |
| R0 | contracts | Pass | `pnpm test` in both contract packages; R0-*.log |
| R1 | server typecheck | Pass | R1-typecheck.log |
| R2 | server unit | Pass, 5716 | R2-unit.log |
| R3 | server integration | Pass except the 2 known `agent-status-websocket` base failures. AC-012 failed only during a concurrent rebuild; alone it passes 14/14 | R3-integration.log, R3b-auto-refresh-rerun.log |
| R5 | web unit, guards, localization | Pass | R5-web.log, R5-guards.log |
| R6 | scripted e2e, 29 files, first run | 26 pass; 3 files fail with the same 17 failures as the base | R6-scripted-e2e.log, BASE-R6-three-files.log |
| R6a | `team-run-config-graphql` (was `hierarchical-team-run-config-graphql`; renamed in `2e70401f18`) | It seeded the retired shape and already failed on the base. Rewritten flat with the same lifecycle intent → 7/7 | HTRC-flat-run4.log |
| R6b | `recent-run-projection-graphql`, base issue | Test fix (rule 9) → 9/9 on branch and base | R6b-*.log, BASELINE-FIX-recent-run-projection.diff |
| R6c | `task-closure-root-visibility`, base issue, flaky | Test fix (rule 9) → 3/3 in 3 consecutive runs | TCRV-run3..5.log, BASELINE-FIX-task-closure-root-visibility.diff |
| R7 | scripted e2e, final, all fixes in place | 27/29 files, 116 tests pass; the 17 earlier failures are gone. 2 fail: ad-hoc Org case (test race, baseline fix `623d34eabc` → 3/3) and `task-copy-idle-lifetime` (intermittent on branch and base; follow-up) | R7-scripted-e2e-final.log, R7b-*.log, R7c-ad-hoc-fixed.log |
| DF-1..3, UC-1/2 | new e2e | Pass | see AC table |
| DJ-0..5 | desktop branch vs base | Pass, identical | ledger, desktop/ |
| WP-1..5 | web probes | Pass (WP-5 after a baseline probe fix) | probes/ |
| WP-6 | `team-reload-member-freshness` E-005 | Fails identically on the base; follow-up | probes/, probes-base/ |

## Broader Validation And Actual Journeys
Decision: **Required — completed** (Project Desktop Validation).

Setup:
- Two isolated instances: the branch build and the base build (`db00ba16a9`), each on its own data root.
- Credentials: `pnpm secrets:import -- --source ~/.autobyteus/server-data/.env --database-url file:<instance db>`, with the TTY confirmation answered by `import-secrets.exp`. 9 secrets configured in each vault; only ids and statuses were printed. Then each instance was restarted.
- Definitions seeded through public GraphQL with `seed-forest-journeys.mjs`.
- The UI was driven over the instance's own CDP port.

Journeys:
- **Team forest, Claude Agent SDK Haiku 5.5 (`haiku`).** Forest Team lead → research squad (task team) → its squad lead → build crew (task team) → result back to the user. Sidebar, status, Team tab, Token Meter, Settings ("Delegated copies": research_squad, build_crew, "Inherited from the run"), then Stop → app restart → restore through crew builder (the deepest agent). Squad lead was reached by run id after restore. All identical on branch and base.
  - Model behavior on both builds: crew builder answered as text instead of calling `send_message_to`, and on the base the squad lead first answered itself instead of delegating. The same one-line nudge was given where needed. This is prompt/model behavior, not in this ticket's scope.
- **Org Studio, AutoByteus `deepseek-v4-flash`.**
  - The manager delegated `/research_squad` (a copy of the mounted team); its squad lead delegated `/build_crew`. The result reached the manager on both builds without nudges.
  - Sidebar: manager, the mounted research squad (grey, no stop button) with its members, the research squad copy, and build crew.
  - Stop → app restart → identical tree. A stopped delegated member has no composer; the base is the same.
  - The manager restores the Org; the round trip manager → squad lead → crew builder → back worked.
  - Settings show members (manager, mounted research_squad) and delegated copies (research_squad, build_crew). The Task panel shows Open 2 on both.
  - All identical on branch and base.

## Confidence Scorecard
| Category | Post-repository | Final | Basis |
| --- | --- | --- | --- |
| Requirement and AC proof | 75% | 95% | AC-002 with branch/base discrimination; AC-003 by e2e + desktop + probes; AC-004 suites |
| Changed-boundary execution directness | 80% | 95% | restore, stop set, launch selection, standalone scan all driven through real roots and GraphQL |
| Cross-boundary realism | 70% | 95% | real HTTP/WS/GraphQL/MCP; packaged desktop with real inference on the user's two judging runtimes |
| Environment / identity fidelity | 80% | 95% | clean env, owned data roots, branch and base builds side by side, vault import through pnpm |
| Failure / edge / lifecycle | 80% | 95% | truncated tree, new-process restart, Stop → restart → restore at depth for Team, Agent and Org |
| User / desktop | 60% | 90% | real app journeys branch vs base; LLM delegation needed nudges on both builds (model behavior) |
| Durable regression quality | 80% | 90% | 2 new e2e + harness; rewritten stale test; 3 baseline test fixes; awaiting test-code review |

Overall about **93%**. Not 100% because:
- WP-6 and `task-copy-idle-lifetime` remain unrelated base failures;
- the durable test changes are not yet reviewed;
- desktop delegation relied on model compliance, which needed nudges on both builds.

## Compatibility / Persistence / Lifecycle
- No migration is in scope (DEC-008: no install holds the retired shape).
- Persisted collaboration files are never rewritten by the containment path: UC checks sha256 of every file.
- Stop/restore is proven at three levels for each root kind.

## Durable Coverage Changes
| Path | Change | Result |
| --- | --- | --- |
| autobyteus-server-ts/tests/e2e/projects/delegation-forest-restore.e2e.test.ts | Added (DF-1..3) | 3/3 branch, 3/3 base |
| autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts | Added (UC-1/2) | 2/2 branch; base fails (control) |
| autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts | Updated: `attachRoot`, `reopenRoot` (restore per kind), `stopServer`, exports `liveTree` | used by DF/UC |
| autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-config-graphql.e2e.test.ts | Rewritten flat (`e6ba249a96`), renamed to flat names (`2e70401f18`, `57d388a7fd`, CRR-003/004 TR-003) — baseline fixes | 7/7 |
| autobyteus-server-ts/tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts | Baseline fix commit `149bce0be9` | 9/9 branch and base |
| autobyteus-server-ts/tests/e2e/projects/task-closure-root-visibility.e2e.test.ts | Baseline fix commit `ac3f6267ac` (race) | 3/3 ×3 |
| autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts | Baseline fix commit `623d34eabc` (temp-file race) | 3/3 |
| autobyteus-web/tests/e2e/agent-org-task-team-disclosure-probe.mjs | Baseline fix commit `3f54e8eaae` (row selector, feed route) | pass branch and base |

The five baseline fixes are committed one per commit, labelled, as TESTING.md rule 9 requires. The three new-coverage paths above are uncommitted, for test-code review.

## Follow-Ups (outside this ticket's scope)
1. **`team-reload-member-freshness` E-005.** The definitions change feed reloads the loaded Team list after a failed Agent read. The probe's exact request sequence predates the feed. Owner of the live definitions feed (`f7fcf9055a`) to decide the expected request policy.
2. **`task-copy-idle-lifetime` (idle-shutdown feature), intermittent on branch and base.** Three causes found:
   - stop took 17.3 s against the 15 s limit, under load;
   - the shutdown lower bound is too tight: the test measures from its own observation of the step exit, giving 58 954 ms against 59 000 ms;
   - a delegation was refused "model not available on antigravity_cli" although the scripted CLI always lists the model. The server's `agy models` discovery returned empty transiently; the reason is not established and it may be a product race.

   For the idle-shutdown and AGY model-discovery owners.
3. **`agent-status-websocket` integration (2).** Known base failures.
4. **Desktop delegation prompts.** Haiku 5.5 sometimes replies in text instead of calling `send_message_to` / `delegate_task`. This is prompt or model behavior, for the prompt owners.

## Cleanup
- Both isolated instances stopped; their data roots, including the test vaults holding the imported credentials, deleted. The registry no longer lists them and no instance process remains. The copied instance logs contain no key-like strings.
- Every e2e run used a temporary HOME, removed afterwards. The probes removed their own Nuxt servers, browsers and routes.
- The base check worktree `rnt-base-check` is removed after this report.
- Nothing touched the user's running app or `~/.autobyteus`, apart from reading `.env` for the vault import.

## Latest Authoritative Result
**Pass — 93%, Large/High, broader validation completed.** It goes to code review for a proportional review of the durable test changes. This is not Delivery Completed.

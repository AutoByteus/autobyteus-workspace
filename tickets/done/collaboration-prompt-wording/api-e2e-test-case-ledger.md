# API/E2E Test-Case Ledger — `collaboration-prompt-wording`

Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-prompt-wording/tickets/in-progress/collaboration-prompt-wording/evidence/` (paths below are relative to it).
Results: `Pass` / `Fail` / `Blocked` / `Not Tested` / `Unresolved`. Every case was recorded right after its attempt; this is the final reconciled state of round 1.

| Case ID | Behavior / AC | Command or Surface | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | typecheck | `pnpm -C autobyteus-server-ts typecheck` | clean | clean (exit 0) | Pass | R1-typecheck.log |
| R2 | all server unit | `vitest run tests/unit` | pass | 702 files / 5573 tests pass, 4 files / 7 tests skipped (equals the handoff) | Pass | R2-unit.log |
| R3 | server integration | `test:integration:prepare`, `test:integration` | pass except the 2 known | 73 files pass; only the 2 agent-status-websocket cadence tests that TESTING.md lists as the known baseline exception fail | Pass (known baseline exception only) | R3-integration.log |
| R4 | contracts | `pnpm -C autobyteus-agent-presentation-contracts test` | pass | 17/17 | Pass | R4-contracts.log |
| R5 | web specs and guards | `test:nuxt` (changed areas), 3 guards | pass | 43 files / 326 tests pass; guards exit 0 | Pass | R5-web-specs.log, R5-web-guards.log |
| R6 | scripted-AGY e2e (updated suites) | `vitest run tests/e2e/projects tests/e2e/agent-definitions/agent-package-definitions-live-refresh…` clean env | pass | 17/18 files first run; `task-copy-idle-lifetime` timed out once waiting for an agent to go idle under load and passed alone (169 s) | Pass (1 timing flake, rerun green) | R6-agy-e2e.log, R6b-rerun.log |
| D1 | AC-001/002: role from the real roots, prompt = approved view for the ten §3 rows, no own address, no forbidden word | new `collaboration-prompt-wording.e2e.test.ts` CPW-P1..P3 | equal views | all ten rows equal; negative control (one sentence of the views altered) fails | Pass | D-final-collaboration-prompt-wording-e2e.log, D1-negative-control.log |
| D2 | AC-005: refusals through the task agent's own scoped tools | CPW-R1 | new texts reach the agent | task_id refusal, unknown ID, task agent team's ID (coordinator named) pass | Pass | D-final-collaboration-prompt-wording-e2e.log |
| D2b | AC-005: a message to an agent of a different Task (and of a closed Task) | CPW-R2 (skipped, asserts the approved text) | the design's text | agent gets `MCP error -32603: Internal error`; identical on the base build | Fail (finding F-1, pre-existing) | D2-run8.log, F1-base-cross-task.log |
| D3 | AC-006: `@` note per viewer through real WebSocket send | CPW-M1..M3 | wording §8 lines | self, teammate, catalog-only, standalone task agent → host, org sibling lines as specified | Pass | D-final-collaboration-prompt-wording-e2e.log |
| P1 | cross-scope-agent-mentions probe (real Claude haiku) | `test:e2e:cross-scope-agent-mentions --cases A01,A02,T01,O01` | pass | first run 0/4: probe still expected the old note shape `(Agent)`; fixed (stale expectation, Local Fix by me); rerun 4/4 | Pass (after fixing the stale probe) | probes/P1-cross-scope-agent-mentions.log, probes/P1b-cross-scope-agent-mentions.log |
| P2 | project-manager-ux probe | `test:e2e:project-manager-ux` | pass | PMU-008 and PMU-021 fail; the same two fail on the untouched base | Fail on branch and base (pre-existing, finding F-2) | probes/P2-project-manager-ux.log, probes/base-P2-project-manager-ux.log |
| P3 | task-agent-monitor-visibility probe | `test:e2e:task-agent-monitor-visibility` | pass | API-E2E-TMV-002 fails; the same on the base | Fail on branch and base (pre-existing, F-2) | probes/P3-task-agent-monitor-visibility.log, probes/base-P3-task-agent-monitor-visibility.log |
| P4 | task-closure-tree probe | `test:e2e:task-closure-tree` | pass | all cases pass | Pass | probes/P4-task-closure-tree.log |
| L1 | live collaboration suite on Claude (haiku) | `RUN_CLAUDE_E2E=1 vitest run agent-initiated-collaborators` | pass | LE-A2, A3, T1, O1, F1 pass; LE-A1 timed out waiting for the copy's report | Fail (LE-A1; finding F-3) | L1-agent-initiated-collaborators-claude.log |
| L1x | LE-A1 on Claude, repeated | same, `-t 'claude_agent_sdk: LE-A1'` | pass | branch: fail, fail, fail, fail, pass (1/5); base: pass, pass, pass (3/3) | Fail (F-3) | L1b-…, L1c-…, L1-branch-…run3/run4, L1-base-…, L1-base-…run2/run3 |
| L2 | LE-A1 on Codex | `RUN_CODEX_E2E=1 … -t 'codex_app_server: LE-A1'` | pass | branch 2/2 pass; base 2/2 pass | Pass | L2-*.log |
| L3 | LE-A1 on native AutoByteus over LM Studio (qwen) | `RUN_LMSTUDIO_E2E=1 … -t 'autobyteus: LE-A1'` | pass | branch: timed out waiting for the copy's report (run 2), failed a later step (run 1); base: pass (1/1) | Fail (F-3 signature) | L3-*.log |
| J1 | AC-008 standalone agent delegates, task agent reports by ID (real Claude, desktop UI) | isolated instance, UI | report by delegator ID | lead delegated; helper reported by ID (after one refused call carrying both selectors); lead told the user | Pass | screenshots/07, 13; execution report |
| J1s | J1 repeated 4× on the branch and 4× on the base (same sampler, haiku) | `live-sample.mjs` | report by ID, no address | branch 4/4 by ID, 2/4 first call also carried an address (refused, recovered); base 1/4 by ID (3 plain answers), 1/4 address | Pass for ID reporting; address use not zero (F-3) | S-branch-j1b.log, S-base-j1.log |
| J2 | AC-008 team member hands off by its rules (real Claude, desktop UI) | isolated instance, UI | `get_handoff_rules` → send_message_to the rule's `recipient_address` | writer: `get_handoff_rules` then `send_message_to /reviewer`; reviewer got the new header; reviewer answered APPROVED as plain text (no reply by tool) | Pass (hand-off); observation on the reviewer reply | screenshots/10; execution report |
| J3 | AC-008 organization direct agent delegates to the organization's team, coordinator reports by ID (real Claude, desktop UI) | isolated instance, UI | coordinator reports by the PTM's ID | PTM delegated; the coordinator answered in plain text without calling send_message_to (UI run) | Fail for that sample | screenshots/12; execution report |
| J3s | J3 repeated: branch 3×, base 4× (same sampler) | `live-sample.mjs` | report by ID | branch 3/3 by ID, no address; base 4/4 | Pass | S-branch-j3.log, S-base-j3.log |
| J4 | AC-001 on Claude and Codex: what each real runtime was supplied | SYSTEM_INSTRUCTIONS_SUPPLIED in the stored traces vs the approved views | equal | 27 runs (Claude; Codex for the standalone row) equal the views; rows: standalone, task agent, member with and without handoffs, organization direct agent, member of a task agent team in an organization | Pass | J4-supplied-prompts-vs-views.txt, J4-prompt-quote.jsonl |
| J4q | Claude quotes its own instructions verbatim | `prompt-quote.mjs` | exact | paragraph and bullet exact on Claude | Pass | J4-prompt-quote.jsonl |
| F1 | AC-003, §10.11: stored earlier forms (header with `sender address`, `Task delegator address` task message, `[Mentioned collaborators]` note), written by the base build, open in this build | isolated instance on the base-written data | render as before | "From Research Helper:" without the raw header; the earlier note hidden and the `@Research Helper` chip shown; sidebar summary shows the user's words | Pass | screenshots/20, 21, 22 |

## Round 2 (API-REV-002, IR-002 / SR-003)

Evidence: `evidence/round2/`. Same case IDs as round 1; results below replace the round-1 results of the same ID.

| Case ID | Behavior / AC | Command or Surface | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | typecheck | `typecheck` | clean | clean | Pass | round2/R1-typecheck.log |
| R2 | unit | `vitest run tests/unit` | pass | 703 files / 5583 tests pass (= handoff) | Pass | round2/R2-unit.log |
| R3 | integration | `test:integration` | pass except the 2 known | only the 2 known baseline-exception tests fail | Pass | round2/R3-integration.log |
| R4 | contracts | contracts `test` | pass | 17/17 | Pass | round2/R4-contracts.log |
| R5 | web specs + guards | `test:nuxt`, guards | pass | 326 tests; guards exit 0 | Pass | round2/R5-*.log |
| R6 | scripted-AGY e2e + agent-initiated-collaborators | clean env | pass | 18 files / 87 tests pass, 40 gated skips; no flake this time | Pass | round2/R6-agy-e2e.log |
| D1, D3 | AC-001/002/006 | `collaboration-prompt-wording.e2e.test.ts` | pass | pass (rows equal the updated views) | Pass | round2/D-final-…log |
| D2 / D2b | AC-005 | CPW-R1 (extended with SR-003 refusals), CPW-R2 | texts reach the agent | pass, incl. cross-Task refusal as `{accepted:false}` over real MCP | Pass (F-1 resolved) | round2/D-final-…log, D2-CPW-R1-extended.log |
| P1 | cross-scope probe, real Claude | `--cases A01,A02,T01,O01` | pass | 4/4 | Pass | round2/probes/P1.log |
| P3 | task-agent-monitor-visibility | probe | pass | only API-E2E-TMV-002 fails (pre-existing, same on base) | Fail (F-2, out of scope) | round2/probes/P3.log |
| P4 | task-closure-tree | probe | pass | pass | Pass | round2/probes/P4.log |
| L1 | LE-A1 Claude (haiku), 5 per side | `le-a1-batch.sh` | branch ≥ base | branch 5/5, base 5/5 (round 1: 1/5 vs 3/3) | Pass | round2/LE-A1-*-claude-run*.log, traces/ |
| L2 | LE-A1 Codex (gpt-5.5), 5 per side | same | branch ≥ base | branch 5/5, base 5/5 (run 1 of each rerun after a harness collision) | Pass | round2/LE-A1-*-codex-* |
| L3 | LE-A1 LM Studio (qwen), 20 per side | same | branch ≥ base | branch 7/20, base 14/20; helper by ID 19/20 vs 18/20; delegating agent's unprompted acknowledgement in 12/20 vs 4/20; all 19 failing samples explained (see report) | Fail (F-4) | round2/LE-A1-*-lmstudio-*, LM-trace-analysis.txt |
| J1 | AC-008 standalone → task agent, isolated instances, 5 per side | `live-sample.mjs` | report by ID | branch 5/5, base 2/5 | Pass | round2/S-*-j1.log, traces/journeys |
| J2 | AC-008 team hand-off (UI) | desktop | by the rule | `get_handoff_rules` → `/reviewer` delivered | Pass | round2/screenshots, traces/j2-team |
| J3 | AC-008 PTM → squad, isolated instances, 5 per side | `live-sample.mjs` | report by ID | branch 5/5, base 5/5 | Pass | round2/S-*-j3.log |
| J4 | AC-001 supplied prompts vs updated views | `check-supplied-prompts.py` | equal | 24/24 real runs equal (Claude, Codex) | Pass | round2/J4-supplied-prompts-vs-views.txt |

## Round 3 (API-REV-003, IR-003 + IR-004 / SR-004..SR-014; CRR-002 fix)

Evidence: `evidence/round4/` (folder numbering is mine). LM Studio is excluded by the user. Results replace the earlier results of the same ID.

| Case ID | Behavior / AC | Command or Surface | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | typecheck | `typecheck` | clean | clean | Pass | round4/R1-typecheck.log |
| R2 | unit | `vitest run tests/unit` | pass | 705 files / 5681 tests (= handoff) | Pass | round4/R2-unit.log |
| R3 | integration | `test:integration` | pass except the 2 known | only the 2 known | Pass | round4/R3-integration.log |
| R4 | contracts | contracts `test` | pass | 19/19 | Pass | round4/R4-contracts.log |
| R5 | web specs + guards | `test:nuxt` (changed areas), guards | pass | 327 tests; guards exit 0 | Pass | round4/R5-*.log |
| R6 | scripted-AGY e2e | `tests/e2e/projects` + live-refresh | pass | 18 files / 89 tests | Pass | round4/R6-agy-e2e.log |
| D1–D3 | AC-001/002/005/006 | `collaboration-prompt-wording.e2e.test.ts` incl. new CPW-M4, CPW-R3 | pass | 10/10 (19 catalogue entries through the real MCP path; M-27 trailing period observation) | Pass | round4/D-run3.log |
| L1 | LE-A1 Claude (haiku), 5 per side | `le-a1-batch.sh` | branch ≥ base | 5/5 vs 5/5; no loops | Pass | round4/LE-A1-*-claude-*, traces/ |
| L2 | LE-A1 Codex (gpt-5.5), 15 per side | same | branch ≥ base | branch 10/15, base 15/15; the 5 failures are runaway echo loops (86–92 sends) | Fail (F-5) | round4/LE-A1-*-codex-*, LE-A1-analysis.txt |
| L3 | LE-A1 native runtime (DeepSeek), 5 per side | same | informational | branch 3/5, base 4/5; failures are provider errors | Inconclusive | round4/LE-A1-*-deepseek-* |
| J1/J3 | AC-008 journeys, Claude and native, 5 per cell, isolated instances | `live-sample.mjs`, `analyze-journeys.py` | first send by run ID | branch 20/20 by run ID, 0 addresses; base 7/20 | Pass | round4/journeys-analysis.txt, traces/journeys |
| J2 | team hand-off (UI) | desktop, real Claude | by the rule | `get_handoff_rules` → `/reviewer`; "From Reviewer: APPROVED" | Pass | round4/screenshots/j2-writer-handoff.png |
| U1 | chat "From <name>" for a new header | desktop | name shown, no raw header | "From Research Helper:" | Pass | round4/screenshots/new-header-from-name-lead.png |
| U2 | chat for stored earlier headers | desktop on base-written data | name shown, no raw header | "From Coordinator:", "From Research Helper:" | Pass | round4/screenshots/old-header-*.png |
| U3 | stored earlier task message | desktop | shown as stored | shown as stored | Pass | round4/screenshots/old-task-message-helper.png |
| P1 | cross-scope probe, real Claude | cases A01 A02 T01 O01 | pass | 3/4; T01 failed once (model did not delegate); reruns: 1 pass, 1 harness failure on the branch, 1 pass, 1 harness failure on the base | Fail/flaky (inconclusive) | round4/probes/P1.log, T01-*.log |
| P2 | project-manager-ux | probe | pass | PMU-008, PMU-021 (FU-CPW-1) | Fail (known) | round4/probes/P2.log |
| P3 | task-agent-monitor-visibility | probe | pass | TMV-002 only (known) | Fail (known) | round4/probes/P3.log |
| P4 | task-closure-tree | probe | pass | pass | Pass | round4/probes/P4.log |

## Round 4 (API-REV-004, IR-005 / SR-015, SR-016; CRR-005)

Evidence: `evidence/round5/`. Judging runtimes by the user's decision: Claude Sonnet and DeepSeek flash. Codex excluded (usage limit until Oct 22, 2026).

| Case ID | Behavior / AC | Surface | Expected | Observed | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R1 | typecheck | `typecheck` | clean | clean | Pass | round5/R1-typecheck.log |
| R2 | unit | `vitest run tests/unit` | pass | 5687 pass | Pass | round5/R2-unit.log |
| R3 | integration | `test:integration` | 2 known only | one ENFILE load failure; that suite rerun alone shows only the 2 known | Pass | round5/R3-integration.log, R3b-agent-status-rerun.log |
| R4 | contracts | contracts `test` | pass | 18/18 | Pass | round5/R4-contracts.log |
| R5 | web specs + guards | `test:nuxt`, guards | pass | 327; guards 0 | Pass | round5/R5-*.log |
| R6 | scripted e2e | projects + live-refresh | pass | 90 pass | Pass | round5/R6-agy-e2e.log |
| D | CPW suite incl. new CPW-H1 (T-5) | e2e | pass | 11/11 | Pass | round5/D-final.log |
| L1 | LE-A1 Claude Sonnet, 10 per side | live | branch ≥ base; no unprompted send | 10/10 vs 10/10; 0 vs 0 unprompted; 0 loops | Pass | round5/LE-A1-*-sonnet-*, LE-A1-analysis.txt |
| L2 | LE-A1 DeepSeek flash, 15 valid per side | live | same | 15/15 vs 15/15 valid; 3 provider rollbacks replaced; 0 vs 0 unprompted | Pass | round5/LE-A1-*-deepseek-* |
| LX | LE-A1 Codex | live | — | not run: usage limit (4 started runs failed at the first model call, both sides) | Not Tested (user decision) | round5/codex-usage-limit-probe.txt |
| J1/J3 | journeys, Sonnet and DeepSeek, 5 per cell | isolated instances | report reaches the delegator; correct handles | branch 20/20, base 20/20; branch: 0 both / name / non-reaching; delegator headers run id only, 0 sends after a report | Pass | round5/journeys-analysis.txt, traces/journeys |
| J2 | team handoff, UI, Sonnet | desktop | rule followed; teammate header with address | as expected; no reply to the result | Pass | round5/j2-team-trace.txt, screenshots/j2-writer-handoff.png |
| U | stored base-written data in the branch app | desktop | earlier header, task message, `[Mentioned collaborators]` render | "From <name>", stored task text, chip | Pass | round5/screenshots/old-*.png |
| P1 | cross-scope probe, Claude Sonnet | browser | pass | 4/4 | Pass | round5/probes/P1.log |
| P4 | task-closure-tree probe | browser | pass | first try ENFILE (no test ran), rerun pass | Pass | round5/probes/P4-rerun.log |
| D (CRR-006) | suite after T-1 fixture and T-2 comment fixes | e2e | pass | 11/11 | Pass | round5/D-final-after-CRR-006.log |

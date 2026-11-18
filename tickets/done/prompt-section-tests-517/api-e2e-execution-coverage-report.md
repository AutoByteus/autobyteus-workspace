# API/E2E Execution Coverage Report — prompt-section-tests-517

## Round

- Coverage investigation: `tickets/in-progress/prompt-section-tests-517/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/prompt-section-tests-517/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/prompt-section-tests-517/api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (direct route, Small/Low)
- Prior round reviewed: None
- Deviations from the investigation's plan: API-01 found one more stale suite (`collaboration-prompt-wording.e2e.test.ts`, CPW-P1..P3); I fixed it inside REQ-002 (test-only, the same kind of fix) and reran it. API-03 rewrote the TESTING.md row (my document). API-04 added both typechecks for the test edit.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/prompt-section-tests-517/tickets/in-progress/prompt-section-tests-517/evidence/` (API-* files and folders)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `68190d46fa` (+ this round's test edit, committed after) | macOS 26 arm64, load average ~50 | Node 22.23.1; in-process studio servers; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (no inference) | `env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture>` |
| ENV-2 | same | same | real `codex` 0.169.0 (`gpt-6.1-terra`), throwaway `CODEX_HOME` linking the host login (the suite's own setup) | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CODEX_E2E=1` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-002 (unit) | prompt unit, five backend prompt tests, parity | Reused: IMP-04 | — | Pass | (handoff) | (handoff) | no source or unit-test change since |
| API-R2 | — | typechecks of the implementation's edits | Reused: IMP-05, IMP-06 | — | Pass | (handoff) | (handoff) | superseded by API-04 for this round's edit |
| API-01 | AC-001, AC-002 / REQ-002 | every suite that reads a run's prompt and runs without a provider (16 files: the three changed ones, 9 more scripted-AGY suites, 4 ungated e2e/integration) | `vitest run <16 files>` (list in the log header) in ENV-1; then `collaboration-prompt-wording.e2e.test.ts` again before and after the fix | ENV-1 | Pass (prompt suites) | `API-01-prompt-reading-suites/vitest.log`, `collaboration-prompt-wording-before-fix-rerun.log`, `collaboration-prompt-wording-after-fix.log` | first run: `configured-skill-on-demand-loading (4 tests)` ✓ (AC-001), `agent-semantic-memory (9 tests)` ✓, 9 other files ✓; CPW-P1/P2 diff `+ ## Long-Running Commands` at the end of the collaboration part; after the fix `Tests  14 passed (14)` | Two failures not about prompts: DCF-E2E-002 `expected 9992 to be less than 5000` (a file-event budget) and `grok-build-runtime-replay` `afterAll` `Hook timed out in 10000ms` (its 6 tests ✓) — FU-001, same kind as the "tests under load" item; `history-list-read-timing` skipped by its own gate |
| API-02 | REQ-002 (live) | real Codex `baseInstructions` | `vitest run tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts -t 'SML-WRITE\|SML-CODEX-TEAM\|SML-CODEX-OFF'` | ENV-2 | Pass | `API-02-semantic-memory-live-codex/vitest.log`, `SML-*.json` | `Tests  3 passed \| 3 skipped`; recorded `baseInstructions` `…how you organize them is up to you and your skills.\n\n## Long-Running Commands\n\n- Start a long build or test sui…` | SML-WRITE runs first because SML-CODEX-TEAM reads its codeword |
| API-03 | AC-003 | TESTING.md row | review; compare its search terms with this round's search | — | Pass (rewritten) | `TESTING.md` (commit after this round) | row "A runtime's system prompt…" | The implementation's terms do find the missed suite (`promptOf`), but it was read as valid; the row now says to run every file that reads a run's composed prompt, names `systemPrompt` and `_meta.rules` too, and says why reading is not enough |
| API-04 | — | typechecks after the test edit | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | ENV-1 | Pass | `API-04-typechecks.log` | `(baseline 1012 in 316 files)` `PASS`; `(baseline 87 in 37 files)` `PASS` | — |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (`configured-skill-on-demand-loading` 4/4), IMP-01 | Proven | — |
| AC-002 | Yes | API-R1 (unit 164/164), API-01 (every provider-free suite that reads a prompt passes after the fix), API-02 (the changed live assertions) | Proven | — |
| AC-003 | No | API-03 | Proven (row rewritten and committed on its own as `docs(testing): …`) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 80% | 97% | API-01..04 | live suites that read prompts only with `toContain` were not run | — |
| Changed-boundary execution directness | 80% | 97% | every changed test ran; the search's suites ran | — | — |
| Cross-boundary integration realism and mock gap | 85% | 95% | real server, scripted AGY, real Codex | other runtimes' live prompt suites not run (no structure assertions) | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | clean env, test-owned data roots, Codex throwaway home | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | N/A | N/A | test maintenance only; no lifecycle behaviour changed | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI change | — | — |
| Durable regression coverage quality and relevance | 80% | 95% | four prompt-reading suites match the product; the TESTING.md row names the search and the reason | the row is a rule, not an automatic check (DEC-001) | — |

- Overall post-repository confidence: 83%
- Overall final confidence: 95.8%
- Calculation method: simple average of the five applicable final scores.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: live suites that read prompts only through `toContain` (no section list or ending) were not run; by reading they cannot go stale from an added last section.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (real Codex), `Other` (scripted-runtime E2E suites)
- Gap addressed: the implementation ran only the files it changed; a full run of every provider-free suite that reads a prompt found a fourth stale suite.
- Browser validation needed: No.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`; compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` (`collaborationPart`) | Updated: the collaboration part ends at `## Working Environment` or `## Long-Running Commands`, whichever comes first | API-01 | — |
| `TESTING.md` "Choosing the path" row for a system-prompt change | Updated (rewritten) | API-03 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct route)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY CLI in API-01 | the repository's scripted AGY CLI | those suites are built on it; the prompt is composed by the real server either way | none for prompt structure |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process servers, data roots, throwaway `CODEX_HOME` | Yes | each suite's own teardown | no process left |
| Codex sessions of API-02 | Yes | in the throwaway home the suite removes | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: None.
- Next recipient from `get_handoff_rules`: `/delivery_engineer`
- Notes:
  - For the Solution Designer: REQ-002's finding ("there is none") no longer holds. Four suites were stale from autobyteus-483 and now match the product: `configured-skill-on-demand-loading`, `agent-semantic-memory`, `agent-semantic-memory-live` (implementation) and `collaboration-prompt-wording` (this round).
  - FU-001: two timing failures under load, added to the "tests under load" item.

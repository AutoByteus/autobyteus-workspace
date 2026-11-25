# API/E2E Execution Coverage Report — remove-long-running-prompt-649

## Round

- Coverage investigation: `tickets/in-progress/remove-long-running-prompt-649/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `tickets/in-progress/remove-long-running-prompt-649/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/remove-long-running-prompt-649/api-e2e-test-progress.md`
- Round and trigger: round 1; implementation handoff IR-001 (direct route, Small/Low)
- Prior round reviewed: None
- Deviations from the investigation's plan:
  - API-02's model turns were refused by the Codex account's usage limit ("try again at Nov 27th, 2026 7:43 AM"). The instructions had already reached Codex on `thread/start`, and the suite records them; the changed ending assertion was checked offline against that recorded wire (API-02b).
  - SML-CODEX-OFF no longer exists (removed by autobyteus-554); nothing to run.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-long-running-prompt-649/tickets/in-progress/remove-long-running-prompt-649/evidence/` (API-* files and folders; IMP-* from implementation)

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `bb9834f1e2` (code `92d9b01ef3`) | macOS arm64, Node 22.23.1 | in-process studio servers; scripted AGY CLI; fake Grok CLI | `env -i`; `test:integration:prepare` run once for the Brief Studio package |
| ENV-2 | same | same | real `codex` (gpt-6.1-terra), throwaway `CODEX_HOME` linking the host login (the suite's own setup) | Codex account at its usage limit |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R1 | AC-001 (unit), REQ-002 | composer, semantic memory section, five backends, parity; typechecks | Reused: IMP-01, IMP-02 | — | Pass | (handoff) | (handoff) | same code |
| API-R2 | AC-002 | live Claude prompt | Reused: IMP-04 | — | Pass | (handoff) | (handoff) | `"instructionsHaveLongRunningCommands":[false]`, ends with `## Global Semantic Memory` |
| API-01 | AC-001 | every provider-free test that reads a run's prompt (18 files; TESTING.md "A runtime's system prompt") | `env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<fixture> pnpm exec vitest run <18 files>`; Brief Studio file again after `pnpm -C autobyteus-server-ts test:integration:prepare` | ENV-1 | Pass | `API-01-prompt-reading-suites/vitest.log`, `brief-package-after-prepare.log` | 16 files ✓ (incl. `collaboration-prompt-wording (14 tests)`, `agent-semantic-memory (10 tests)`, `configured-skill-on-demand-loading (4 tests)`, `grok-build-runtime-replay (11 tests)`); `brief-package-team-prompt` first `Standalone package root is not a directory` (build output not prepared), then `Tests  1 passed (1)`; `history-list-read-timing` skipped by its own gate | the setup failure is the documented once-per-worktree prepare step |
| API-02 | AC-001, AC-002 (Codex) | live Codex `thread/start` instructions | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CODEX_E2E=1 … vitest run tests/e2e/runtime/agent-semantic-memory-live.e2e.test.ts -t "SML-WRITE\|SML-CODEX-TEAM\|SML-CODEX-OFF"` | ENV-2 | Not Tested (turn) / prompt verified | `API-02-semantic-memory-live-codex/vitest.log`, `SML-WRITE-codex.json`, `SML-CODEX-TEAM.json` | SML-WRITE summary `"instructionsHaveLongRunningCommands":[false]`, `"instructionsLastHeading":["## Global Semantic Memory"]`; both cases failed with `You've hit your usage limit … try again at Nov 27th, 2026 7:43 AM` | the turn refusal is the account's quota, not this change; the model turns (codeword read) are behaviour this ticket does not touch |
| API-02b | AC-001, AC-002 (Codex), the changed live assertion | the recorded Codex wire | `python3` rebuild of the test's `section(folder, globalFolder)` compared with each recorded `thread/start` tail | — | Pass | `API-02-semantic-memory-live-codex/API-02-wire-ending-check.txt` | `tail == section(folder, globalFolder): True` ×3 (standalone and both team requests); `contains Long-Running Commands: False` ×3 | proves SML-CODEX-TEAM's rewritten `endsWith` assertion holds on what Codex really received |
| API-03 | AC-003 | repository search | `grep -rn "Long-Running Commands\|LONG_RUNNING_COMMAND\|longRunningCommandSection\|long-running-command-sections" autobyteus-server-ts` (and web, core, root docs) | — | Pass | (this row) | 9 files, all tests, every match a `not.toContain("Long-Running Commands")` absence assertion or its comment (AC-001 requires them); no source or doc; nothing outside `autobyteus-server-ts` | — |
| API-04 | AC-004 | `~/.autobyteus/server-data/memory/semantic-global/best-practice-long-running-commands.md` | read the file; compare with DEC-003 | — | Pass | (this row) | body word for word DEC-003's text; title "Best practice: long-running commands (2026-11-25)" as DEC-003 records | the Solution Designer's file |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-R1, API-01, API-02b | Proven | — |
| AC-002 | Yes | API-R2 (Claude), API-02/API-02b (Codex wire) | Proven | — |
| AC-003 | No | API-03 | Proven (absence assertions only, as AC-001 requires) | — |
| AC-004 | No | API-04 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 97% | every AC directly | — | — |
| Changed-boundary execution directness | 92% | 96% | units per backend; every provider-free prompt-reading suite; two live runtimes' received instructions | Codex's model turn not run (quota), not affected by the change | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | real Claude and Codex wires; scripted AGY and Grok through the real server | live Grok/AGY/DeepSeek/native prompts not run (units cover them) | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 95% | clean env, prepared build output, host logins | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | N/A | N/A | a removal with no lifecycle change | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI change | — | — |
| Durable regression coverage quality and relevance | 93% | 95% | absence assertions per backend, the composer and the live suites | — | — |

- Overall post-repository confidence: 91.8%
- Overall final confidence: 95.6%
- Calculation method: simple average of the five applicable final scores.
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Live API` (Codex), `Other` (scripted-runtime E2E suites)
- Gap addressed: TESTING.md requires every test that reads a run's prompt to run after a prompt change; the implementation ran three of them.
- Browser validation needed: No.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No` (the profile field and composer input removed, no alias).
- Compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No` (the implementation rewrote the 18 test files; none needed a further change)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| AGY and Grok CLIs (API-01) | the repository's scripted CLIs | those suites are built on them | prompt composition is the real server's |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process servers, data roots, throwaway `CODEX_HOME` | Yes | each suite's teardown | none left |
| `applications/brief-studio/dist/` (prepared build output) | Yes | untracked build output, left for later runs | not committed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk: None
- Evidence decisions requested: None
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: `/delivery_engineer`
- Notes: the Codex account on this machine is at its usage limit until 2026-11-27 07:43; a release smoke before then would hit it.

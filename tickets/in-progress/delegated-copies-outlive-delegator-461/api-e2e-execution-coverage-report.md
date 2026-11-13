# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds the per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-007`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 7, on CRR-029. The code under test is the merged state `a529abcbdd` (origin/personal at `3d738de6e6`: autobyteus-460, -23, -24); head `71ba8aaab8`, docs only after the code.
- Prior round reviewed: API-REV-006 (round 6, `Fail`: F-37 … F-46, K-14).
- Merge handling (TESTING.md "Rerun by impact" step 5):
  - `pnpm install --frozen-lockfile`, the server build and the phone bundle were redone (`/tmp/api461/r7-build.log`, all exit 0);
  - the server typecheck passes at baseline;
  - every case this round ran on the merged build.
- Order of work, following the reviewer's list:
  1. the rechecks of round 6 and the decided items;
  2. the phone (MSP-53 … 55);
  3. the merge's skill reload;
  4. the Next Round list.
- Deviations from the plan, and why:
  - **Product failures remain** (F-43 a third time, and F-47 new), so under the agreed rule these wait for the fix:
    - the deeper stale rewrites (the migration-startup group and the suites listed in the investigation, each with its cause);
    - API-P03, API-P04;
    - DS-15 restart resume, C15-03 rendered;
    - API-B03;
    - API-E01 in full, API-F01.
  - **Rewritten and passing this round (8 suites):** controlled-org-publication, stopped-org-workspace, team-run-config, stopped-run-model-config, standalone-error-termination, append-only logs, anthropic-stored-config, project-task-boundaries (17/18).
  - **The peer suite and API-L01 were rerun on the merged state** for AC-016 and AC-001.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/` (round 7 files carry `r7`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `a529abcbdd` (install, server `dist/` and phone bundle rebuilt, `/tmp/api461/r7-build.log`) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1; built server per test-owned data root, or the in-process Studio server; scripted AGY CLI (`agy-failure-cli.mjs`, and `agy-shell-env-probe-cli.mjs` for the skill suite) | Clean env `env -i PATH HOME=<new temp> TMPDIR USER`. Fresh temp data roots, removed after. Never the user's app or `~/.autobyteus` |
| ENV-2 | as ENV-1 | as ENV-1 | Probe-owned stack: built server, Nuxt dev, headless Chrome | Desktop viewport |
| ENV-3 | as ENV-1 | as ENV-1 | Probe nodes, production phone bundle at `/mobile`, headless Chrome 390×844 | Owned by the probe |
| ENV-4 | as ENV-1 | as ENV-1 | Two to five built-server nodes through capturing proxies | Owned by the suite |
| ENV-5 | as ENV-1 | as ENV-1 | Scripted delegator; delegated runs on the AutoByteus runtime over DeepSeek (`deepseek-v4-flash`) | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault` (read-only; key values never printed) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 / R02 | unit parts, type gates | Server unit, contracts, web specs | Reused: IR-021/022 checks; the server typecheck rerun after the merge and this round's edits: PASS at baseline | — | Pass (reused) | IMP rows | as recorded there | — |
| R7-A rechecks | F-37, F-38, F-39, F-40, F-41, F-42 (+TDR-001), F-43; SR-075, SR-076; Team tab | In-process and built servers | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run <9 files> --no-watch --no-file-parallelism --reporter=verbose` | ENV-1 | **Fail** (F-47, F-43) | `API-E01-r7-batches-A-B.txt`, `API-E01-r7-F47-unknown-task-by-run-id.txt`, `API-E01-r7-F43-org-copy-idle.txt` | `Tests 4 failed \| 39 passed` | Pass: F-37, F-38, F-42 with TDR-001, F-39, F-40, F-41, the Team tab, the change feed |
| R7-B stale and confirm | the rewritten stale suites; F-43 alone | In-process and built servers | as R7-A, 19 files | ENV-1 | **Fail** (F-43; stale suites listed) | `API-E01-r7-batches-A-B.txt` | `Tests 16 failed \| 56 passed` | 8 rewritten suites pass. E-007 (needs a restart, not a reset), TAU-2 (question) |
| API-B01 phone | AC-007, REQ-002 (once) | Phone shell | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/mobile-shell-probe.mjs --output-dir=<dir> --cases=MSP-53,MSP-54,MSP-55` | ENV-3 | Pass | `API-B01-r7-phone-MSP-53-55-evidence.txt`, `API-B01-r7-phone-MSP-54-worker-answered.png` | each `Pass`; `workerTopLevelRows: []` before and after | F-44 resolved |
| API-B01 desktop | AC-007; C3-06 | Browser, desktop | `cd autobyteus-web && env -i PATH HOME=<temp> TMPDIR USER node tests/e2e/stopped-delegator-views-probe.mjs --output-dir <dir>` | ENV-2 | Pass | `API-B01-r7-SDV-evidence.txt` | SDV-01 … 04 `Pass` | F-46 resolved (CR-461-057) |
| API-E02 | AC-001 … AC-006, AC-011, AC-015; SR-075 K-14; CR-461-063 | Built servers, two nodes for §5.1 | as round 6 | ENV-1 | **Fail** (model, K-15) | `API-E02-r7-contract-stories-5.1.txt`, `-5.2.txt`, `-5.3.txt` | §5.2 `12 of 12`; §5.3 `9 of 9`; §5.1 `27 of 28`, differ `S26` | S27 matches: K-14 and F-45 resolved. S26 is refused as decided; the differences are the model's (K-15). The driver now hands the mutation's refusal to the harness |
| Merge regression (autobyteus-460) | 460 AC-009 on a delegated run | In-process server, scripted AGY | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-shell-env-probe-cli.mjs pnpm exec vitest run tests/e2e/runtime/agy-skill-definition-changes-transport.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-E01-r7-merge-skill-reload.txt` | API-05a, API-05b `✓`; API-05c gated | A delegated copy gets its own capsule link and notice. The merged suite read the copy through its delegator (peer runs only under rule 2): it reads the copy by its own run now |
| API-P01, API-P02 | AC-016, AC-008 (peer) | Two to five built-server nodes | as round 5 | ENV-4 | Pass | `API-P01-P02-r7-peer-suite.txt` | `Tests 44 passed (44)` | On the merged state |
| API-L01 | AC-001 (real runtime) | Real inference for the delegated runs | as round 6 | ENV-5 | Pass | `API-L01-r7-live-deepseek.txt` | `Tests 2 passed (2)`; `finishedAfterMs` 9886 (agent), 17551 (team) | On the merged state |
| API-E01 full, API-F01, API-B03, API-P03, API-P04, DS-15 restart, C15-03 rendered, the remaining stale suites | as planned | — | — | — | Next Round | — | — | After the fix |

### Findings

Round 6's findings, rechecked on `a529abcbdd`:
- **Resolved:** F-37, F-38, F-41 (the card on the team's own stream), F-42 and TDR-001 (SR-076), F-44, F-45 (S27), F-46, K-14.
- **Behaving as decided:** F-39 (DCM, EX-03), F-40.
- **F-43 remains.**

| ID | Case | Expected (authority) | Observed (`a529abcbdd`) | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-43 (remains) | `delegated-team-lazy-member-activation` DTL-005, Org path (`API-E01-r7-F43-org-copy-idle.txt`) | REQ-002: a quiet delegated run is shut down after the idle grace (CR-461-061: the Org's delegated team idles out despite an error member) | After the writer's failed start (`error`), the Org's delegated team is still not shut down within grace + 45 s, in both R7-A and R7-B (and twice in round 6) | `Local Fix` (server) |
| F-47 | `task-existing-copy-assignment` EXC-E2E-001 … 003 (`API-E01-r7-F47-unknown-task-by-run-id.txt`) | REQ-009, base. Base's own EXC test (`origin/personal`) expects `delegate_task(target_team_run_id, task_id: <unknown>)` → `{delegated:false, message:"Task '…' must identify exactly one current node-local Task (found 0)."}`. Base answered the `recipient_address` path with `{error:{code:"TASK_DELEGATION_ERROR",…}}` (TKD, which passes) | `{error:{code:"TASK_DELEGATION_ERROR", message:<the same text>}}` on the run-ID path too: the F-38 fix (CR-461-059) reached the run-ID path | `Local Fix` (server) |
| K-15 | API-E02 §5.1 S26 | Contract model: M is deleted while running and the refusal carries code `RUN_DELEGATED_WORK_ACTIVE` | The product, as at base, refuses deleting a running run ("Run is active. Terminate it before deleting history"), so the driver stops M first (`terminatedAt` set). The delete mutation's result carries `success` and `message` only, as at base; no such code exists | Contract model (Solution Designer) |
| Q-1 (question) | `task-agent-own-run-startup` TAU-2 | The released test edited a task agent's model while an earlier migration had failed | Before 461's migration (registered last) runs, the copy is not a run of its own: its own save answers `NOT_FOUND` "Run 'nd-copy' was not found." | `Unclear` (whether a not-yet-converted copy must be editable while an earlier migration fails) |

Observation: the merged-in autobyteus-460 suite needed a rule-2 read (the copy by its own run). The behavior itself holds.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-L01 (real runtime, merged state); API-E02 | Proven | — |
| AC-002 … AC-006 | Yes | API-E02 (§5.2 12/12, §5.3 9/9, §5.1 27/28 with only K-15); Team tab; R7-A | Proven (the S26 difference is the model's, K-15) | — |
| AC-007 | Yes | Desktop SDV-01 … 04; phone MSP-53 … 55 | Proven | — |
| AC-008 | — | RC-44 (peer); S26 (local, refused as decided) | Proven | — |
| AC-009 … AC-013 | mixed | R7-A, R7-B, CPW (round 6), EXC, DCM, I01 (round 6) | Not Proven (F-43, F-47) | — |
| AC-014 | Yes | API-E03 (round 6), SID-2 (round 6) | Proven for the 461 migration's own data; the earlier migrations' startup suites are stale tests (Next Round) | — |
| AC-015 | — | API-E02 | Proven (K-15 is the model's) | — |
| AC-016 | Yes | RC-43 (merged state) | Proven (scripted runtime) | — |
| DS-15 (SR-070) | — | DS-15 suite (round 6) | Proven for the user's message; restart resume Next Round | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 85% | AC-001, AC-002 … AC-008, AC-015, AC-016 proven on the merged state | F-43, F-47; AC-014 earlier migrations | The fix round |
| Changed-boundary execution directness | 90% | 90% | Built servers, peers, own streams, browser desktop and phone, real inference | Peer rows not rendered | API-P03 |
| Cross-boundary integration realism and mock gap | 82% | 82% | A real model across the delegator's Stop, on the merged state | One provider live | — |
| Environment, configuration, identity, and fixture fidelity | 88% | 88% | Frozen install, rebuilt outputs after the merge, clean env, the test vault | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 78% | 78% | Closure races, refusals, peer offline | F-43; DS-15 restart | The fix; the restart case |
| User-surface, browser, and desktop-shell confidence | 90% | 90% | Desktop and phone journeys all pass | Peer rows rendered | API-P03 |
| Durable regression coverage quality and relevance | 78% | 78% | 8 stale suites rewritten and passing; the merged suite adapted | The remaining stale suites (listed with causes) | The rewrite |

- Overall post-repository confidence: 84%
- Overall final confidence: 84%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No` (AC-014's earlier-migration part; AC-009 … AC-013)
- Any final applicable category below `90%`: `Yes`
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-43, F-47; the stale suites; the Next Round cases

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Lifecycle`, `Worker or Distributed`, `Live provider`
- The confidence gap it addresses, and the expected gain: the phone, desktop, peer and live journeys on the merged state (done: pass).
- Browser validation needed, and why or why not: yes, done. The rows and the openings are visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack, desktop (ENV-2) and phone (ENV-3). No shell-specific behavior changed.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: peer rows rendered (API-P03).

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Cases proving the migration outcome:
  - API-E03 and SID-2 (round 6);
  - append-only logs AOML-1/2 pass on the merged state.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk:
  - the earlier migrations' startup suites (TAU-1/3, collaborators-to-delegated, team-run-v1, open-task-tree) assert pre-461 end states: stale tests, Next Round;
  - Q-1.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`.
  - **Decided expectations:**
    - DCM and EX-03 (F-39: members keep their own launch; EX-03 sends member patches as the editor's planner);
    - member-contact list (F-40);
    - lazy DTL-003 card on the team's own stream (F-41);
    - TDR-001 and TDR-003 (SR-076);
    - step 12 hard with a team member (F-37);
    - the stories fixture regenerated, and S26's refusal handed to the harness.
  - **Stale, rewritten and passing:**
    - controlled-org-publication (a member's message restores);
    - stopped-org-workspace (no stored `taskExecutions`);
    - append-only logs (TC-13 path);
    - anthropic-stored-config (send after the stored view's snapshot);
    - standalone-error-termination (the process history service registered);
    - project-task-boundaries (the composed Task service kept);
    - the restore helper (a restored run whose first turn fails is restored);
    - TAU-2 (the run's own save);
    - the merged `agy-skill-definition-changes-transport` (the copy read by its own run).
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The delegator's and most runs' model | Scripted AGY CLI | Deterministic tool calls (TESTING.md) | — |
| The delegated runs' model (API-L01) | Real: DeepSeek via the test vault | — | One provider |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built and in-process servers, data roots, probe stacks, peer nodes | Yes | Each suite's `afterAll`, the probes' `finally` | Removed |
| `/tmp/api461/` logs, homes and probe output | Yes | Kept; excerpts committed. Peer receipts and node logs (peer signatures) stay in `/tmp` | Kept |

## Preliminary Classification (On `Fail`)

- `Local Fix` (server): F-43, F-47.
- Contract model (Solution Designer): K-15.
- `Unclear`: Q-1.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-009 … AC-013 (F-43, F-47), and AC-014's earlier-migration part (stale suites). Every other criterion is proven on the merged state.
- Preliminary classification and recommended owner:
  - Implementation Engineer: F-43, F-47;
  - Solution Designer: K-15, Q-1;
  - each confirmed by failure-origin review.
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes for the next round:
  - First: the remaining stale suites (the investigation lists each with its cause).
  - Then: API-P03, API-P04, DS-15 restart resume, C15-03 rendered, API-B03, API-E01 in full and API-F01.

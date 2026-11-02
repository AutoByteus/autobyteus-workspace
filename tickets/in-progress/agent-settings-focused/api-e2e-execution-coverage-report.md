# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused/tickets/in-progress/agent-settings-focused/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- Revision record and current ID: `api-e2e-revision-record.md` / `API-REV-003`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 3. Implementation IR-003 (`38f5a1eb1c`, CRR-002's Local Fix of SSR-003), then IR-004: the merge `58fdf50f33` of `origin/personal` @ `84ea944ac5` (autobyteus-348 landed). Validated on the merged head `ebf20e056f`.
- Prior round reviewed: round 2 (API-REV-002: Fail on SSR-003)
- Deviations from the plan, and why:
  - A round-3 run on the pre-merge head was stopped at the implementer's request, because the merge overlapped the code under test. Seven cases had passed (SSR-003, AFS-001…003, SSR-001/002/004). The full set then ran on the merged head.
  - The merge brought autobyteus-348's `runtime-switch-members-probe.mjs`, which read the removed list. It was reworked here and run (RSM-01…07).
  - R07 and R08 are still not run (provider runs; no provider proof is needed for this web-only change; see round 2).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused/tickets/in-progress/agent-settings-focused/evidence/api-e2e/`

## Routing Classification

- Task size `Medium`; architectural risk `Low`; input route `Direct Low-Risk`; successful-output route `Delivery`; test-code review `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | round 3: `ebf20e056f` (the merged head; code `38f5a1eb1c` + merge `58fdf50f33`) plus this round's RSM rework; round 2: `5e77712afc` (code `2dd3c665f5`) plus this round's probe rework; round 1: `243baa36ca` | macOS (Darwin 25.5.0), Node v22 | `delegated-launch-defaults-probe.mjs` stack: headless Chrome → Nuxt dev → `autobyteus-server-ts/dist/app.js` (current), scripted AGY (argv log per launch) and Grok | Clean env; probe-owned data root, HOME, SQLite, ports, removed after each run; machine load 10–235 from other teams (timings not asserted) |
| ENV-2 | round 1 | same | Isolated app built from this worktree (folder-picker probe) | Owned data, stopped afterwards |
| ENV-3 | round 3: `ebf20e056f`; round 2: `5e77712afc` | same | `model-routing-decisions-probe.mjs`: two probe-owned nodes (alpha, beta), scripted CLI, no inference | Owned processes and temp root, removed |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-006 (suites), all at the repository layer | web | Reused: `evidence/IMP-13-merge-checks.log` on the merged tree (install, typecheck PASS = baseline, guards, web suite 5,053 passed plus the fixed 348 spec, server build), and IMP-IR003 | — | Pass | (implementation rows) | (implementation rows) | Merge and clean clone at `personal` are delivery's part of AC-006 |
| API-02 | AC-001, AC-003, AC-005; D-IMP-1, D-IMP-3 | browser, hub | `pnpm -C autobyteus-web test:e2e:agent-settings-focused --output-dir <fresh>` (AFS-001) | ENV-1 | Pass (rounds 1–3) | `API-r3-merged-head-all-cases.json`, `API-02-AFS-001-*.png` | `results.AFS-001` "Pass"; `aStored` `dlc-alt-model`, `bStored` null; `aResumed` `["dlc-alt-model"]` | |
| API-03 | AC-002, AC-003, AC-005, REQ-004; D-IMP-1, D-IMP-2 | browser, Org | AFS-002 | ENV-1 | Pass (rounds 2–3; round 1 Fail) | `API-r3-merged-head-all-cases.json` (AFS-002), round 1: `API-03-org-findings.log` | `settingsClosedBy: []`, `pendingEditKept: true`, the stopped Org copy "Saved." on its saved model | |
| API-04 | AC-004, AC-005 (Team) | browser, Team | AFS-003 | ENV-1 | Pass (rounds 1–3) | same, `API-04-AFS-003-team-wide-saved.png` | `followerResumed` `["dlc-alt-model"]`, `pinnedResumed` `["dlc-retiring-model"]` | |
| API-05 | AC-003, AC-005; the old journeys per focused copy; the Save contract | browser | DLP-003…007, DCP-001…005, DCR-001…003, SSR-001…004 (with AFS) in one stack; RSM-01…07 (`pnpm -C autobyteus-web test:e2e:runtime-switch-members --output-dir <fresh>`) | ENV-1 | Pass (round 3; round 2 Fail on SSR-003) | `API-r3-merged-head-all-cases.json` (`results`: 20 "Pass"), `API-r3-SSR-003-saved-refresh-needed.png`, `API-r3-SSR-003-refresh-recovered.png`, `API-r3-runtime-switch-members.log`, `API-r3-RSM-04-copy-saved.png` | SSR-003 "committed read failure locks, read-only Refresh reconciles" Pass; RSM-01…RSM-07 "Pass" | SSR-003 resolved by IR-003. RSM came with the merge and was reworked: its member steps use the group view; its copy steps focus the copy |
| API-06 | Remote copy; routing facts on a copy's card | browser, two nodes | `node autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs --output-dir=<fresh>` | ENV-3 | Pass (rounds 2–3) | `API-r3-model-routing-decisions.json`, `API-06-MRD-04-run-settings.png` | MRD-01…08 "Pass"; the remote copy's card read-only with "beta-node" | |
| API-07 | AC-002, Org workspaces; AC-004 | isolated app | folder-picker probe (rounds 1 and 3); R07, R08 | ENV-2 | Pass (folder picker); R07, R08 Not Tested | `API-r3-folder-picker.json`, `API-07-folder-picker.json` | FP-P01, 02, 04…08 "Pass" on the merged head | R07, R08: provider runs, not needed (see Deviations); FP-P03 needs the native dialog |

### Prior Failure Resolution

- Round 1 (API-03): an Org's focus change closed Settings and lost the pending edit; a stopped Org copy's Save stuck in refresh-required. Resolved by IR-002, proven since round 2 (AFS-002).
- Round 2 (API-05, SSR-003): a committed Save whose read-back failed showed "Saved." with a stale card. Resolved by IR-003: the read is fresh and rejects on failure, so the editor shows "saved, but could not be refreshed" and locks, and Refresh re-reads and shows the saved model. SSR-003 passes on the pre-merge and the merged head.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-02, API-05 (DLP-003: the run's Settings show no list, the hint), API-06 | Proven |
| AC-002 | Yes | API-03, API-04, API-02 | Proven |
| AC-003 | Yes | API-02, API-03, API-04, API-05 (DCP-001…005, DCR, SSR-001…004, RSM-04/06), API-06 (remote copy) | Proven |
| AC-004 | Yes | API-04, API-05 (SSR-002, DCP-002, RSM-05) | Proven |
| AC-005 | Yes | API-02, API-03, API-04 | Proven |
| AC-006 | Yes | API-01 | Suites pass; clean clone and merge are delivery's |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 85% | 95% | API-01…API-07 on the merged head | — | — |
| Changed-boundary directness | 80% | 95% | real browser, server, launches, two nodes, isolated app | — | — |
| Integration realism and mock gap | 75% | 90% | scripted runtimes over real tools, streams, saves and reads | No provider model (not needed: settings and launch arguments do not depend on the model) | R07, R08 with signed-in CLIs |
| Environment and fixture fidelity | 85% | 95% | probe-owned stacks; merged-head build | — | — |
| Failure, edge-case, lifecycle | 75% | 95% | write failure and read-back failure (SSR-003), refused Save while woken and restart (DCP-004), stop and resume, runtime switch and undo (RSM-07) | — | — |
| User surface | 75% | 90% | hub, Team, Org, copies, remote copy | FU-001 (an Org stopped elsewhere) | — |
| Durable coverage | 80% | 95% | AFS-001…003; five reworked probes, all passing | R07, R08's edit not run | — |

- Overall post-repository: 79%; overall final: 94%; simple average
- Every critical AC directly proven: `Yes`
- Any final category below `90%`: `No`
- 95% target met: `No` (94%). The gap is the provider runs R07, R08 and FU-001, both outside what this web-only change needs; no further validation of this ticket would close it without provider usage
- Residual risks: R07, R08 not run; FU-001

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed. Mode: `Browser` (and a two-node stack). Browser validation was needed: the round-1 findings and SSR-003 are invisible to specs that mock the reads.

## Persisted-Data Transition Checks

- `Not Affected`. Saves write the existing fields, read back from the server. No compatibility branch.

## Compatibility / Legacy Scope Check

- Upstream, implementation and coverage: `No` compatibility scope.

## Durable Coverage Changed In The Codebase

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/agent-settings-focused-cases.mjs` | Added (round 1) | API-02…API-04 |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated: registration (round 1). Round 2: focus helpers (`focusedCard`, `groupRow`, `cardSummary`); `delegatedRows` walks a root's copies in the tree; the shared `chooseCopyModel` and `backToConversation` follow the new UI; DLP-003…007 and DCP-001…005 on the focused card | API-05 |
| `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` | Updated: DCR-001…003 on cards and the group view | API-05 |
| `autobyteus-web/tests/e2e/settings-saved-model-refresh-cases.mjs` | Updated: SSR-001…004 on cards and the group view | API-05 |
| `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs` | Updated: MRD-04 reads each copy's card | API-06 |
| `autobyteus-web/package.json`, `workspace-folder-picker-probe.mjs` | Updated (round 1) | API-02…04, API-07 |
| `autobyteus-web/tests/e2e/runtime-switch-members-probe.mjs` (from autobyteus-348) | Updated (round 3): member steps through the group view; copy steps on the focused copy's card | API-05 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model providers | scripted AGY and Grok | No provider proof needed | R07, R08 |
| A failed read after a Save (SSR-003) | Playwright route answers one read with 503 | Forces the failure on demand | — |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks, nodes, isolated apps | Yes | stopped and removed by the probes | Done |
| A temporary case for the FU-001 observation | Yes | removed from the module after the run, never committed | Done |
| The MRD probe's output written into `autobyteus-web/test-results/` | Yes | moved to `/tmp/ab366e2e/mrd-result` | Done |

## Preliminary Classification (On `Fail`)

N/A: this round passes.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none
- Test-code review: `Not Required — direct low-risk route`
- Next recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - FU-001 (open Settings of an Org stopped by another client keep showing "active").
  - R07, R08 not run: they need signed-in `claude` and `codex` and spend provider usage; their criteria are proven by AFS-003, AFS-002 and DCR-002.
  - Delivery: the branch carries autobyteus-348 already (merged from `personal`).

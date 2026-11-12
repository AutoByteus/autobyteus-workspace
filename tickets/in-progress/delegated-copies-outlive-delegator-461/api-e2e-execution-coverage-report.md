# API/E2E Execution Coverage Report

This report records what ran and the result. The plan is in `api-e2e-coverage-investigation.md`, which also holds round 2's per-file test plan. The history is in `api-e2e-revision-record.md`.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, the code review pass CRR-011 at `f75cf6b96b` (code `9f4709571b`).
- Prior round reviewed: API-REV-001 (round 1, at `bc223a8ae0`, `Fail`: F-1 … F-5).
- Deviations from the plan, and why:
  - The rewrites of the stale suites and probes are `Next Round` (skill, autobyteus-agents-107). This round ends at a product `Fail`, so they wait for the fix and come first in the next round. The investigation lists each file with its decision.
  - API-I01, API-L01 and API-F01 are `Next Round` too: they run on the fixed code.
  - A power-off interrupted the first story run of round 2; it was rerun.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/evidence/api-e2e/` (round 2 files carry `r2`).

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable` this round (`Fail`: failure-origin review requested)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `f75cf6b96b` (code `9f4709571b`); server `dist/` rebuilt from it (`pnpm prebuild && pnpm build`) | macOS 26.5.2 (Darwin 25.5.0), arm64 | Node v22.23.1; built server `dist/app.js` per test-owned data root; scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (`AGY_FAKE_CASE=linked_skills`) | Clean env `env -i PATH HOME=<new temp> TMPDIR USER`. Fresh temp data roots, removed after. No provider keys. Never the user's app or `~/.autobyteus`. |
| ENV-2 | as ENV-1 | as ENV-1 | ENV-1 server, Nuxt dev frontend and headless Chrome 157.0.8103.51, owned by the probe | Desktop viewport |
| ENV-3 | as ENV-1; phone bundle from `pnpm -C autobyteus-web build:mobile-web` | as ENV-1 | The mobile-shell probe's node `eta` serves the production phone bundle at `/mobile`. A headless Chrome of its own maps `192.168.77.31` to 127.0.0.1. The phone pairs through Phone Access. | 390×844 phone viewport, touch. Run from a temporary probe copy with the base's duplicate `MSP-32` renamed (FU-016); the copy is deleted after. |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | all (unit parts) | Server unit tests | Reused: the implementation's latest unit run (IR-005 … IR-007 Checks Run) | — | Pass (reused) | IMP rows | as recorded there | Ran on the code under test |
| API-R02 | — | Type gates, contracts, web specs | Reused: IMP-32 (web type gate at baseline 93, 5636 specs) and the server type gate of IR-006 | — | Pass (reused) | IMP rows | `[typecheck] PASS` | Same |
| API-E02 | AC-001 … AC-006, AC-011, AC-015 data; design Validation | Built servers (two paired nodes for §5.1), real GraphQL, WebSocket and scoped MCP; files compared with the contract model (regenerated from the SR-054 model, `--check` matches) after every step | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 CONTRACT_STORIES_CONTINUE=1 CONTRACT_STORIES_EVIDENCE_DIR=<dir> ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts --no-watch`. Then `-t "5.3"` with `CONTRACT_STORIES_LOG_LEVEL=DEBUG` for O6. | ENV-1 | **Fail** | `API-E02-r2-summary.txt`, `API-E02-r2-contract-stories-5.1.txt`, `-5.2.txt`, `-5.3.txt`, `API-E02-r2-O6-diagnostic.txt` | `✓ §5.2 U0 … U8`. 5.1 S4: `"result[0].message: expected \"Message delivered.\", got \"Delivered message to solution_designer_…\""`. 5.3 O6: `"no result of send_message_to by dev_lead_9a01; its conversation ends: …get_handoff_rules…"` | §5.2 9/9 Pass. F-1 (O5) and F-4/F-5 (texts, S17, S25) are resolved. 5.1 has 12/26 clean. Failing: F-6 (S4, S7, S9). The rest is model notes and test artifacts, classified K-1 … K-12, and S14, a test binding error fixed after the run. 5.3 has 6/9: F-7 (O6, O7; O8 follows) |
| API-E03 | AC-014 | Built server, faithful upgrade on hand-built data | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs DRO_E2E_EVIDENCE_DIR=<dir> pnpm exec vitest run tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-E03-r2-delegated-runs-own-runs-startup.txt` | `"Scanned 14; migrated 14; skipped 0; failed 0."`, `"changed": []` | Rerun: the migration code is unchanged since round 1, but the team-run reads it checks changed (`team-run-service.ts`, `team-member-run-view-projection-service.ts`) |
| API-B01 | AC-007, REQ-002, REQ-004 (SCN-005); O-1 | Browser, desktop: a stopped delegator's view (agent, team, org) | `pnpm -C autobyteus-web test:e2e:stopped-delegator-views --output-dir <dir>` (run 1: all cases; run 2: `--cases SDV-02`; runs 3a/3b: `--cases SDV-02,SDV-03`) | ENV-2 | **Fail** | `API-B01-r2-SDV-1-evidence.txt` … `-4-evidence.txt`, `API-B01-r2-SDV-02-message-lost.png`, `API-B01-r2-SDV-01-worker-answered.png`, `API-B01-r2-SDV-03-org-restored.png` | SDV-01 `"Pass"`. SDV-03 `"Pass"` ×3. SDV-02 `"Timed out: worker reply live"`, `"sentMessages": []` in 3 of 4 runs | SDV-01 (agent) passes and SDV-03 (org) passes: F-2 and F-3 are resolved. SDV-02 (team) fails: F-8. O-1 on desktop: the stopped agent root's dot is `bg-gray-400` in all 14 samples (open view; 15 s after a child command); the stopped org's is `bg-gray-300` in every sample |
| API-B01 (phone) | AC-007; O-1 | Phone shell (production bundle) | `node tests/e2e/<temporary mobile-shell-probe copy> --output-dir=<dir> --cases=MSP-37,MSP-38,MSP-39` (the copy renames the base's second `MSP-32`, FU-016; deleted after) | ENV-3 | **Fail** | `API-B01-r2-phone-MSP-37-39-evidence.txt`, `API-B01-r2-phone-MSP-37-worker-answered.png`, `API-B01-r2-phone-MSP-37-root-started.png`, `API-B01-r2-phone-MSP-38-worker-row-missing.png` | MSP-37 `"Pass"`, `"rootRowStatus"` all `"offline"`, `"markerInWorkerRun": true`, `"rootActiveAfterChild": false`. MSP-38/39 `"Timed out waiting for the worker's row under the team root"` | MSP-37 (agent root) passes twice. MSP-38/39 fail: F-10. In an earlier run their rows were recorded: the team and org list only `manager` |
| API-B02 | C3-06 | Browser: the agent-run view after a WebSocket 1000 close | SDV-01 in API-B01 run 1 | ENV-2 | Pass | `API-B01-r2-SDV-1-evidence.txt` | `"streams": [{"closed": true, "frames": 6}, {"closed": false, "frames": 5}]` | As round 1, on the new code |
| API-E01 | AC-001 … AC-013 (regressions) | Whole server E2E | `cd autobyteus-server-ts && env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs pnpm exec vitest run tests/e2e --no-watch`; `file-explorer-websocket-lifecycle` rerun alone twice | ENV-1 | Next Round (stale suites wait for the fix) | `API-E01-r2-full-run-summary.txt`, `API-E01-r2-file-explorer-isolated.txt` | `Test Files  47 failed \| 138 passed \| 71 skipped (256)`; `Fixed since the round-1 baseline:` 9 files | The run included the stale files, so most of its failures are known stale tests. Those files are now listed one by one in the investigation's plan and are rewritten first in the next round. `file-explorer-websocket-lifecycle` passes alone (3/3, twice) and is not stale |
| API-I01 | AC-005, AC-009, AC-012 | Server integration | `test:integration:prepare`, `test:integration` | — | Next Round | — | — | Runs on the fixed code |
| API-B03 | AC-005, AC-012 | Web probes naming the removed events | per probe (investigation, "Web probes") | — | Next Round | — | — | Stale probes: rewritten first in the next round |
| API-L01 | AC-001 (real runtime) | Real runtime, test vault | — | — | Next Round | — | — | Runs on the fixed code |
| API-F01 | build inputs | Fresh clone, the release job's install and build | TESTING.md "Fresh-start build" | — | Next Round | — | — | Runs on the fixed code |

### Findings

Round 1's findings:
- F-1 (a delegated team's outside handoff): resolved. 5.3 O5 passes.
- F-2 (the team view's child selection read through the team): resolved for reading. The child's conversation opens; sending is F-8.
- F-3 (the org inspection with delegated children): resolved. SDV-03 passes ×3.
- F-4 and F-5: settled in the contract (SR-054). 5.2 U2 passes; 5.1 S17 and S25 pass.

| ID | Case / Contract Case | Expected (authority) | Observed | Preliminary Classification |
| --- | --- | --- | --- | --- |
| F-6 | API-E02 §5.1 S4 (R-1), S7 (R-3, R-4), S9 | Contract §2 (line 413, SR-054): a delivered message returns today's text; "by run ID on this node: `\"Message delivered.\"`". Today's text for these sends (the delegated run was hosted in the sender's root) was the same-root default `"Message delivered."` (`send-message-to-tool-result-contract.ts:32`) | A message by run ID to another run on this node returns `"Delivered message to <run ID>."`. `cross-run-message-delivery.ts:103` falls back to `` `Delivered message to ${input.shownAs ?? input.targetAgentRunId}.` `` also when no address was given | `Local Fix` (server): an agent-facing text changed (REQ-009) |
| F-7 | API-E02 §5.3 O6 (B-5), O7 (B-4); O8 follows | Contract §5.3 O6: the copy's dev lead sends to `/ceo_agent`; "Step 2 finds it, because T4's assigner is the org. One line in the copy's log and in the org's log", with a delivered result | The message reaches the org: its log has both messages, and the org's Teacher starts on O7's. But the sender's `send_message_to` never returns: no result after 90 s, and the dev lead's conversation ends at its `get_handoff_rules` result. The copy's own log stays empty (`expected 2 items, got 0`). Nothing is logged at DEBUG. Route: `send-message-to-dispatcher` → `beyondOwnRun` → `GlobalAgentRunMessageRouter.deliver` → `CrossRunMessageDelivery.route`. The receiver's `acceptFromRun` wrote the org's log; then either it or the sender root's `commitSentToRun` never completes. The same route works when a delegated team's member sends to its delegating agent run (S3, by address), so the org as receiver is the difference | `Local Fix` (server; exact cause to locate in failure-origin review) |
| F-8 | API-B01 SDV-02 (AC-007, REQ-002, SR-048) | In a stopped team's view, the user selects the delegated worker's row and sends a message: the worker gets it and answers live | In 3 of 4 runs, the conversation shows the worker's, the composer is emptied, and nothing is sent. There is no `SEND_MESSAGE` frame on any socket (`"sentMessages": []`) and no page error. The message is lost without notice (`API-B01-r2-SDV-02-message-lost.png`). In the 4th run it was sent on `/ws/agent-team/<team>` to the worker and everything passed, so it is timing-dependent. In the same view the Team tab shows `"These messages can't be shown … is not a participant of agent_team run …"` for the selected worker (F-9) | `Local Fix` (web) |
| F-9 | API-B01 SDV-02 (secondary) | The Team tab of a selected delegated worker shows its messages, or nothing, without an error | `collaborationParticipantMessages` is asked with the team's identity and the worker's ID and refused (`… is not a participant of agent_team run …`), shown as an error panel | `Local Fix` (web), minor |
| F-10 | API-B01 phone MSP-38, MSP-39 (AC-007, REQ-002) | On the phone's run list, a stopped team's and a stopped org's delegated runs are listed under them, as a stopped agent root's are (MSP-37) and as the desktop's open team view lists them. Design DS-8: the history poll reads children for every view kind (`RunViewChildren`) | The stopped team and org list only their own `manager` row (no fold toggle). The delegated worker is never listed (rows recorded in the run 4 evidence), so the user cannot reach the delegated work from the phone. The phone's team rows come from `entry.team.executionRows` (`utils/mobile/mobileRunTreeProjection.ts`, `teamRowsOf`), the team's own members; an agent root's children come from the history poll's statuses (`taskRowsOf`) | `Local Fix` (web/server; owner per failure-origin review) |

O-1 (round 1 observation, held in CRR-008): **Not a finding.** In the rendered run list, the stopped delegator shows as stopped while its view is open and after a child command loaded its root:
- desktop agent root: `bg-gray-400` in 14 of 14 samples;
- desktop org root: `bg-gray-300` in every sample;
- phone agent root: `offline` in 14 of 14 samples.

`agentRunCollaborationStatuses.isActive` answers `true` in that state, but the list does not show it as running.

Contract-model notes, to the Solution Designer. The test lists each with its reason and matches it exactly:
- K-1 … K-8, K-10 as in round 1 (see API-REV-001).
- K-9: S11's reopened-Task text. The product keeps today's `"Delivered message to X. X continues with its conversation."`; the SR-054 model writes `"Message delivered."`.
- K-11: S23 … S25. A run's agent acts only on input, so the test's input restores E.
- K-12: S17 … S25. Node B's peer run works in node B's temp workspace (REQ-205, unchanged); the model gives it A's folder.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-E02 (§5.1 S5–S9 delegated runs keep working; §5.2 U3–U5), API-R01 | Not Proven: real runtime is API-L01 (Next Round) | — |
| AC-002 … AC-006 | Yes | API-E02 (§5.2 9/9; §5.1, §5.3 per state) | Not Proven (F-6, F-7) | — |
| AC-007 | Yes | API-B01 SDV-01 (agent: Pass), SDV-03 (org: Pass), SDV-02 (team: F-8), phone MSP-37 (agent: Pass), MSP-38/39 (F-10); API-B02 | Not Proven | — |
| AC-008 … AC-013 | mixed | API-R01; API-E01 (Next Round) | Not Proven | — |
| AC-014 | Yes | API-E03 (rerun on the round-2 code) | Proven | — |
| AC-015 | — | API-E02 | Not Proven (F-6, F-7) | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 55% | 55% | API-E02 (27 of 44 states clean, §5.2 full), API-E03, SDV-01/03, MSP-37 | F-6, F-7, F-8, F-10 | The fix round |
| Changed-boundary execution directness | 75% | 75% | Built servers, two nodes, real streams, browser and phone | Stale suites | Their rewrite |
| Cross-boundary integration realism and mock gap | 70% | 70% | Real HTTP/WS/MCP; scripted AGY only | Real runtime | API-L01 |
| Environment, configuration, identity, and fixture fidelity | 85% | 85% | Clean env, fresh data roots, production phone bundle | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 60% | 60% | API-E03, API-B02, stopped-root journeys | Stop/idle/restart suites stale | API-E01 rewrite |
| User-surface, browser, and desktop-shell confidence | 60% | 60% | SDV-01/03, MSP-37, O-1 samples | F-8, F-10 | The fix round |
| Durable regression coverage quality and relevance | 55% | 55% | New stories, probe, phone cases, helpers | 45 stale files | The rewrite (planned per file) |

- Overall post-repository confidence: 66%
- Overall final confidence: 66%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `No`
- Any final applicable category below `90%`: `Yes`: all seven
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-6, F-7, F-8, F-10; the stale suites (Next Round)

## Broader Validation Decision (Mandatory)

- Decision: `Required`
- Execution mode: `Browser`, `Lifecycle`, `Worker or Distributed`, phone shell
- The confidence gap it addresses, and the expected gain: rendered stopped-delegator journeys (desktop and phone), the contract stories on two nodes, the O-1 rendered status. Ran this round: it found F-8, F-10 and settled O-1.
- Browser validation needed, and why or why not: yes; selection, sending and listing are visible only in the rendered app.

## Desktop Application Validation

- Approach executed: probe-owned real stack, desktop (ENV-2) and phone (ENV-3).
- Cases: API-B01, API-B02, MSP-37 … MSP-39. No shell-specific behavior changed.
- Effect on any already-running desktop application: `None`.
- Behavior not directly proven: the team and org journeys past F-8 and F-10.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DS-10)
- Representative existing data used: as round 1 (hand-built released shapes)
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the migration outcome: API-E03 (rerun on the round-2 code), API-R01
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: the migration-startup suites of earlier migrations still assert their pre-461 end state (Next Round rewrite)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`. The coverage investigation lists every path, done and Next Round.
- Added or updated paths attached for proportional test-code review: `Not Applicable` (Fail round)

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| The agent runtime's model | Scripted AGY CLI | Deterministic, no provider keys (TESTING.md) | A real model's turn (API-L01) |
| In-process suites' delegation tree | `noDelegations()` and readers over it | Those suites start no delegated run | None for their subjects |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Built server processes and data roots | Yes | Each suite's `afterAll` | Removed |
| Probe stacks (desktop and phone) | Yes | The probes' `finally` | Removed |
| `autobyteus-web/tests/e2e/tmp-461-mobile-shell-probe.mjs` (the probe with the base's second `MSP-32` renamed) | Yes | Deleted after each run | Removed (FU-016 records the duplicate ID) |
| `/tmp/api461/` logs | Yes | Kept; excerpts committed | Kept |
| Three waiter shell tasks of this run that only watched for the suite's end | Yes | They reached their time limit; no restart | Stopped (reported to the Project Task Manager: autobyteus-483, autobyteus-agents-106) |

## Preliminary Classification (On `Fail`)

- `Local Fix` (server): F-6, F-7.
- `Local Fix` (web): F-8, F-9.
- `Local Fix` (web/server): F-10.
- Contract-model notes for the Solution Designer: K-9, K-11, K-12.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-001 … AC-013, AC-015. AC-014 is proven.
- Preliminary classification and recommended owner: `Local Fix` → Implementation Engineer (F-6 … F-10)
- Next recipient from `get_handoff_rules`: `/software_engineering_team/code_reviewer` (failure-origin review)
- Notes:
  - Next round, first: the stale-suite and probe rewrites, file by file per the investigation's plan.
  - Then API-E02, API-B01 (desktop and phone), API-E01, API-I01, API-L01 and API-F01 on the fixed code.

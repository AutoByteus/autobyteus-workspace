# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused/tickets/in-progress/agent-settings-focused/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- Revision record and current ID: `api-e2e-revision-record.md` / `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, implementation IR-002 (`2dd3c665f5`; the Local Fix of CRR-001's CR-001, CR-002)
- Prior round reviewed: round 1 (API-REV-001: Fail on API-03)
- Deviations from the plan, and why:
  - R07 and R08 (`run-settings-live-probe.mjs`) are not run. They need signed-in `claude` and `codex` CLIs and spend provider usage, and this web-only change needs no provider proof. AC-004 is proven by AFS-003, the Org model change by AFS-002 and DCR-002. Their implementation-side edit stays unverified (residual).
  - The four probes that read the removed list were reworked: API-05, API-06.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused/tickets/in-progress/agent-settings-focused/evidence/api-e2e/`

## Routing Classification

- Task size `Medium`; architectural risk `Low`; input route `Direct Low-Risk`; successful-output route `Delivery`; test-code review `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | round 2: `5e77712afc` (code `2dd3c665f5`) plus this round's probe rework; round 1: `243baa36ca` | macOS (Darwin 25.5.0), Node v22 | `delegated-launch-defaults-probe.mjs` stack: headless Chrome → Nuxt dev → `autobyteus-server-ts/dist/app.js` (current), scripted AGY (argv log per launch) and Grok | Clean env; probe-owned data root, HOME, SQLite, ports, removed after each run; machine load 10–235 from other teams (timings not asserted) |
| ENV-2 | round 1 | same | Isolated app built from this worktree (folder-picker probe) | Owned data, stopped afterwards |
| ENV-3 | round 2: `5e77712afc` | same | `model-routing-decisions-probe.mjs`: two probe-owned nodes (alpha, beta), scripted CLI, no inference | Owned processes and temp root, removed |

## Cases

| Case ID | Criteria | Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-006 (suites), all at the repository layer | web | Reused: IMP-01…07 (round 1) and `evidence/IMP-IR002-checks.log` (typecheck PASS, web 5,044 passed, guards) | — | Pass | (implementation rows) | (implementation rows) | Merge and clean clone are delivery's part of AC-006 |
| API-02 | AC-001, AC-003, AC-005; D-IMP-1, D-IMP-3 | browser, hub | `pnpm -C autobyteus-web test:e2e:agent-settings-focused --output-dir <fresh>` (AFS-001) | ENV-1 | Pass (rounds 1, 2) | `API-r2-afs-and-reworked-probes.json`, `API-02-04-afs-browser-probe.json` (round 1), `API-02-AFS-001-*.png` | `aStored` `dlc-alt-model` / `bStored` null; `aResumed` `["dlc-alt-model"]`; `bResumedAgyLaunches` `[]` | |
| API-03 | AC-002, AC-003, AC-005, REQ-004; D-IMP-1, D-IMP-2 | browser, Org | AFS-002 | ENV-1 | Pass (round 2; round 1 Fail) | `API-r2-afs-and-reworked-probes.json` (AFS-002), round 1: `API-03-org-findings.log` | `settingsClosedBy: []`, `pendingEditKept: true`, the stopped Org copy's Save "Saved." and its card on the saved model, `writerResumed` `["dlc-alt-model"]` | CR-001 and CR-002 resolved |
| API-04 | AC-004, AC-005 (Team) | browser, Team | AFS-003 | ENV-1 | Pass (rounds 1, 2) | same, `API-04-AFS-003-team-wide-saved.png` | `followerResumed` `["dlc-alt-model"]`, `pinnedResumed` `["dlc-retiring-model"]` | |
| API-05 | AC-003, AC-005; the old journeys per focused copy | browser | reworked DLP-003…007, DCP-001…005, DCR-001…003, SSR-001…004 in the same stack | ENV-1 | **Fail** (SSR-003); all others Pass | `API-r2-afs-and-reworked-probes.json` (`finalResults`), `API-05-r2-SSR-003-readback-failure.log`, `API-05-r2-SSR-003-saved-with-stale-card.png` | `finalResults`: 19 "Pass", SSR-003 "Fail"; the log: `UpdateDelegatedLaunchSelections 200 "success": true`, then `GetAgentRunCollaboration 503`, then the screen "Saved." with the old model | See Failure Detail. The rework's own issues were fixed and rerun: the focus restore after a walk, the hub refocused before messaging a copy, SSR-004 run apart from DLP-007 (whose Agents-editor edit changes the shared engineer's runtime), DCR-001's member row |
| API-06 | Remote copy; routing facts on a copy's card | browser, two nodes | `pnpm -C autobyteus-web test:e2e:model-routing-decisions --output-dir=<fresh>` | ENV-3 | Pass | `API-06-model-routing-decisions.json`, `API-06-MRD-04-run-settings.png` | MRD-01…08 "Pass"; `settingsCards.hub` `list: 0, hint: 1`; `writer` `model_router`, "View decision"; `remote` header "beta-node", `controls: 0` | The remote copy's card is read-only with its node chip |
| API-07 | AC-002, Org workspaces; AC-004 | isolated app | folder-picker probe (round 1); R07, R08 | ENV-2 | Pass (folder picker); R07, R08 Not Tested | `API-07-folder-picker.json` | FP-P01, 02, 04…08 "Pass" | R07, R08: see Deviations |

### Failure Detail (API-05, SSR-003)

- Scenario: a stopped hub's copy is saved; the write commits, and the read that follows fails, such as a dropped connection or a server hiccup. SSR-003 emulates the failed read with a 503 on `GetAgentRunCollaboration`.
- Expected (AC-003; the preserved Save contract the case comes from): the Save is not presented as complete. The editor shows "Settings were saved, but could not be refreshed", the copy's fields lock until Refresh, and Refresh reconciles.
- Observed: the request log shows `UpdateDelegatedLaunchSelections` 200 `"success": true`, then `GetAgentRunCollaboration` 503, then `GetAgentRunResumeConfig` 200. The screen says "Saved. Changes apply when this run resumes." while the copy's card still shows its old model ("Alt test model"); the server stored the new one. The case waits for `refresh-required` and times out. Reproduced in 2 of 2 runs.
- Where: D-IMP-3 (this ticket) makes a stopped hub's Save call `useAgentRunCollaborationStore().inspect(runId)` before `draftStore.reloadCanonical(true)` (`ExistingRunConfigEditor.vue` `save`). The inspection is the request that fails. Its failure does not reach the Save's outcome, and the reload then reuses the published, stale view: a false "Saved." with the stale card D-IMP-3 was meant to remove.
- Before this change, that read was not made at all (the reused view, autobyteus-358), so this case had no read to fail. The failure handling belongs to the code this change adds.
- Preliminary classification: `Local Fix`, implementation.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-02, API-05 (DLP-003: the run's Settings show no list, the hint) | Proven |
| AC-002 | Yes | API-03, API-04, API-02 | Proven |
| AC-003 | Yes | API-02, API-03, API-04, API-05 (DCP-001…005, DCR, SSR-001/002/004), API-06 (remote copy) | **Not Proven** for a Save whose read-back fails (SSR-003): a false "Saved." with a stale card. Proven otherwise |
| AC-004 | Yes | API-04, API-05 (SSR-002, DCP-002) | Proven |
| AC-005 | Yes | API-02, API-03, API-04 | Proven |
| AC-006 | Yes | API-01 | Suites pass; clean clone and merge are delivery's |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 80% | 85% | API-01…API-07 | SSR-003 | Fix, rerun SSR-003 |
| Changed-boundary directness | 75% | 95% | real browser, server, launches, two nodes | — | — |
| Integration realism and mock gap | 70% | 90% | scripted runtimes; real tools, streams and saves | No provider (not needed) | — |
| Environment and fixture fidelity | 85% | 90% | probe-owned stacks | Shared definitions across cases (SSR-004 after DLP-007) | — |
| Failure, edge-case, lifecycle | 70% | 80% | refused Save while woken (DCP-004), restart (DCP-004), write failure (SSR-003 first half), restore | the read-back failure (SSR-003) | Fix |
| User surface | 70% | 85% | hub, Team, Org, remote | SSR-003's false "Saved."; FU-001 | Fix |
| Durable coverage | 75% | 95% | AFS-001…003; four probes reworked and passing | — | — |

- Overall post-repository: 75%; overall final: 89%; simple average
- Every critical AC directly proven: `No` (AC-003, the read-back failure)
- Any final category below `90%`: `Yes`: requirement proof, failure evidence, user surface
- 95% target met: `No`
- Residual risks: SSR-003; R07, R08 not run; FU-001

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

- SSR-003: `Local Fix`, implementation (the read-back failure of D-IMP-3's re-read must reach the Save's outcome).

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-003 (a Save whose read-back fails)
- Recommended owner: implementation engineer, via the code reviewer's failure-origin review
- Next recipient: `/software_engineering_team/code_reviewer`
- Notes: round 1's two findings are resolved. FU-001 is recorded (an Org stopped by another client leaves open Settings showing "active").

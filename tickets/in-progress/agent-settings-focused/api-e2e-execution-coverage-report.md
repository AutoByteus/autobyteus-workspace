# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused/tickets/in-progress/agent-settings-focused/` unless absolute.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- Revision record and current ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct low-risk route)
- Prior round reviewed: none
- Deviations from the plan, and why:
  - API-05 and API-06 (reworking the four probes that read the removed list) were not done this round. API-03 fails, and the fix touches the selection path those Org journeys use. They run in the next round.
  - R07 and R08 of API-07 were not run: `run-settings-live-probe.mjs` needs signed-in `claude` and `codex` CLIs and spends provider usage. Next round, on the fixed code. AC-004 is proven without them by AFS-003.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-settings-focused/tickets/in-progress/agent-settings-focused/evidence/api-e2e/`

## Routing Classification

- Task size: `Medium`; architectural risk: `Low`; input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `243baa36ca` (code `cba2e085e7`) plus this round's probe files | macOS (Darwin 25.5.0), Node v22 | `delegated-launch-defaults-probe.mjs` stack: headless Chrome → Nuxt dev → `autobyteus-server-ts/dist/app.js` (current), scripted AGY with an argv log per launch, scripted Grok | Clean env; probe-owned temp data root, HOME, SQLite and ports, removed after each run; 1512×952, `en-US`; machine load 80–120 from other teams, recorded because timings were not asserted |
| ENV-2 | same | same | Isolated app built from this worktree (`isolated-app start --build`), owned by the folder-picker probe | Owned data root, stopped afterwards; never the user's app |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-006 (suites), all at repository layer | web | Reused: IMP-01…IMP-07 at `cba2e085e7` | — | Pass | (implementation rows) | (implementation rows) | Nothing after it touches code. Merge and clean clone are delivery's part of AC-006 |
| API-02 | AC-001, AC-003, AC-005; D-IMP-1, D-IMP-3 | browser, hub | `pnpm -C autobyteus-web test:e2e:agent-settings-focused --output-dir <fresh>`, AFS-001 | ENV-1 | Pass | `API-02-04-afs-browser-probe.json`, `API-02-AFS-001-*.png` | `hubStopped`: root card, hint, `list: 0`; `aRunning`: locked, "Stop this copy to change its model"; `bWhileAPending.saveText` names only Alpha; `aStored` `dlc-alt-model`, `bStored` null; `bRuntimeStored` `grok_build`; `aResumed` `["dlc-alt-model"]`; `bResumedAgyLaunches` `[]` with the Grok reply shown | D-IMP-3 holds on a real server. In this seed the Team copy's members appear as cards, with the switch and group rows |
| API-03 | AC-002, AC-003, AC-005, REQ-004; D-IMP-1, D-IMP-2 | browser, Org | `--cases AFS-002` | ENV-1 | **Fail** | `API-03-org-findings.log`, `API-02-04-afs-browser-probe.json` (AFS-002), `API-03-AFS-002-org-copy-save-failed.png`, `API-03-AFS-002-org-group-view.png`, `API-03-AFS-002-running-org-copy.png` | `settingsClosedBy` lists every Org row clicked; `pendingEditKept: false`; `copySaveFailed.state: "refresh-required"`, note "Settings were saved, but could not be refreshed."; `copyStored` `dlc-alt-model` | See Failure Detail. Passing in this case: one card per agent, no list, "Organization settings", locks and stops, the group view, Save of a member, the stopped copy's gear and "+", `writerResumed` `["dlc-alt-model"]` |
| API-04 | AC-004, AC-005 (Team) | browser, Team | AFS-003 | ENV-1 | Pass | `API-02-04-afs-browser-probe.json` (AFS-003), `API-04-AFS-003-team-wide-saved.png` | `followerResumed` `["dlc-alt-model"]`; `pinnedResumed` `["dlc-retiring-model"]`; the screenshot shows pinned "Customized" | A Team-wide Save does work in this stack (the scripted runtime has model schemas) |
| API-05 | AC-003, regression of the old journeys | browser | DLP-003/004/006/007, DCP-001…005, DCR-001…003, SSR-* after rework | — | Not Tested | — | — | Those cases still read the removed list and fail until reworked. Next round |
| API-06 | Remote copy; routing facts on the card | browser | MRD-04 after rework | — | Not Tested | — | — | Next round |
| API-07 | AC-002, Org workspaces; AC-004 | browser, isolated app | `pnpm -C autobyteus-web test:e2e:workspace-folder-picker --output-dir <fresh>` | ENV-2 | Pass (folder picker); R07, R08 Not Tested | `API-07-folder-picker.json` | FP-P01, P02, P04…P08 "Pass"; FP-P03 "Not Tested" (it needs the native file dialog) | The first run failed FP-P07 on a strict-mode locator, probe-side, fixed. The group view's workspace edit and Save work |

### Failure Detail (API-03)

1. **Every focus change in an Org closes Settings, and a pending edit is lost** (AC-005, REQ-005; D-IMP-1).
   - Expected: "Editing A, focusing B: A's edit stays pending and the save bar names A."
   - Observed: with Settings open in an Org, clicking any row (direct agent, placed Team, placed Team member, copy) returns to the conversation. After editing the writer and focusing the analyst, reopened Settings show no save bar, and the edit is gone. No warning.
   - Cause: `useWorkspaceHistorySubjectActions.execute` calls `selection.clearSelection()` for `select` and `inspect`, and `agentSelectionStore.clearSelection` calls `showChat()` unconditionally. The change covered `selectRun` and the Org view's watcher, not this path, and `AgentOrgWorkspaceView.spec` exercises only the watcher.
   - Hub and Team runs keep Settings open and the edit pending (API-02, API-04).
2. **A stopped Org's copy: Save is stored, but the editor is stuck** (AC-003, REQ-003; D-IMP-2).
   - Expected: "Saved.", and the card shows the saved model.
   - Observed: the server stores the choice (`copyStored` `dlc-alt-model`). Settings then show "Settings were saved, but could not be refreshed. Refresh before making more changes."; the card shows the old model, locked, `state: refresh-required`. Pressing Refresh does not change it within 2.5 s.
   - No GraphQL error or console error around the Save: `UpdateDelegatedLaunchSelections`, `AgentOrgRunConfig` and `DelegatedLaunchModelOptions` all succeed, so the failure is on the client, after the reads. D-IMP-3's re-read is only for `draft.kind === 'agent'`. Root cause not established.
   - D-IMP-2 made this path reachable from the copy's own Settings. Whether it also fails on `3261712e06` through the old list was not checked.

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02 | Proven | — |
| AC-002 | Yes | API-03 (Org cards), API-04, API-02 (Team copy member) | Proven | — |
| AC-003 | Yes | API-02, API-04 | Proven for hub copies, Team members and Org members. **Not Proven** for a stopped Org's copy (finding 2). Remote copy: API-06, next round | — |
| AC-004 | Yes | API-04 | Proven | — |
| AC-005 | Yes | API-02, API-04 | Proven for hub and Team. **Not Proven** for an Org (finding 1) | — |
| AC-006 | Yes | API-01 | Suites at the implementation commit pass; the clean clone and merge are delivery's | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 75% | 50% | API-01…API-04, API-07 | AC-003 and AC-005 fail on Org paths | Fix, rerun API-03 |
| Changed-boundary directness | 70% | 90% | real browser, server, launches | — | — |
| Integration realism and mock gap | 60% | 90% | scripted runtimes, real tools and streams; specs mocked what failed | — | — |
| Environment and fixture fidelity | 85% | 90% | probe-owned stacks | — | — |
| Failure, edge-case, lifecycle | 70% | 75% | Cancel, stop, resume | Refused Save while woken, restart: API-05 | Rework |
| User surface | 60% | 50% | hub, Team, Org | Two Org failures | Fix |
| Durable coverage | 70% | 75% | AFS-001…003 | Four probes still read the removed list | Rework |

- Overall post-repository confidence: 71%; overall final: 76%; simple average
- Every critical AC directly proven: `No` (AC-003, AC-005 on Org paths)
- Any final category below `90%`: `Yes`: requirement proof, failure evidence, user surface, durable coverage
- 95% target met: `No`
- Residual risks: the two findings; API-05, API-06, R07, R08 not run

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed in part
- Mode: `Browser`
- Gap and gain: Org, running states, Team-wide Save and real launches, none of which had been rendered
- Browser validation needed: yes; both findings are invisible to specs that mock the path

## Persisted-Data Transition Checks

- Decision: `Not Affected`. Saves write the existing fields, read back from the server in API-02. No compatibility branch observed.

## Compatibility / Legacy Scope Check

- Upstream backward-compatibility scope: `No`; observed in implementation: `No`; durable coverage only for it: `No`.

## Durable Coverage Changed In The Codebase

- Changed this round: `Yes`

| Path | Change | Cases |
| --- | --- | --- |
| `autobyteus-web/tests/e2e/agent-settings-focused-cases.mjs` | Added (AFS-001…003) | API-02…API-04 |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Updated: registration | same |
| `autobyteus-web/package.json` | Updated: `test:e2e:agent-settings-focused` | same |
| `autobyteus-web/tests/e2e/workspace-folder-picker-probe.mjs` | Updated: FP-P07's toggle locator | API-07 |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Model providers | scripted AGY and Grok | No provider proof needed for settings and launch arguments | Real CLIs: R07, R08 |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| Probe stacks, isolated app instances | Yes | stopped and removed by the probes (receipts in the evidence JSON) | Done |
| `/tmp/ab366e2e/` scratch logs | Yes | evidence copied into the ticket | Kept (scratch) |

## Preliminary Classification (On `Fail`)

- Finding 1: `Local Fix`, implementation. The design's rule is clear; `clearSelection` in the Org path must not leave Settings for a focus change inside the same run.
- Finding 2: `Local Fix`, implementation, cause to be established; `Unclear` if it also fails on the base.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-003 (a stopped Org's copy), AC-005 (Org)
- Recommended owner: implementation engineer, via the code reviewer's failure-origin review
- Next recipient: `/software_engineering_team/code_reviewer`
- Notes:
  - Observation, not investigated: in a first tab left open while the Org was stopped by another client, the group view's header still read "Running" with its stop icon, though the tree's dots had gone grey (`API-03-observation-first-tab-org-running-badge.png`). To recheck next round.
  - The implementation's Known Risk that a Team-wide Save cannot be driven was specific to its seed; AFS-003 drives it.

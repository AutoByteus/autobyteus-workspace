# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after code review CRR-003 passed (implementation `1f0aad498b`, review records `818e950d53`)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - The user stopping one unit (DEC-006) is driven through the unit run's own terminate mutation. The web Org tree has no per-unit Stop button: only delegated rows and the Org run have one (`AgentOrgRunMemberTree.vue`, `WorkspaceAgentOrgHistoryCollection.vue`).
  - Three existing tests asserted behavior this ticket changed on purpose, so I updated them (see Durable Coverage). In `stopped-org-workspace-graphql`, the update exposed a product failure later in the same test (ORG-E2E).
  - Before RC-56 can run, the two-server suite needs `pnpm -C autobyteus-server-ts test:integration:prepare` (the Brief Studio package).
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/evidence/api-e2e/round-1/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `818e950d53` (implementation `1f0aad498b`) + this round's test files | Linux aarch64 container, root, Node 22.23.3 | built server `autobyteus-server-ts/dist` (`pnpm -C autobyteus-server-ts build`), scripted AGY CLI `linked_skills` | clean env `env -i PATH HOME TMPDIR`; temp data roots; a local package written by the suite |
| ENV-2 | same | same | two built servers (alpha, beta) paired, capturing proxies | the two-server suite's own roots |
| ENV-3 | `818e950d53`, fresh `git clone --no-local` | same | release job `build-linux-arm64` (parsed from `.github/workflows/release-desktop.yml`), go1.27.4 | build-only trust; `libz.so` on `LD_LIBRARY_PATH` (FU-004 of autobyteus-22) |
| ENV-4 | same as ENV-1 | same | built server + Codex `gpt-6.1-terra` (low) + native AutoByteus `claude-haiku-5-5` (test vault) | data root `$HOME/.autobyteus-e2e/…` (outside /tmp); throwaway `CODEX_HOME` |
| ENV-5 | same as ENV-1 | same | built server + `nuxt dev` + Chromium 153 headless | probe root `$HOME/.autobyteus-e2e/org-container-ui-probe-*`, removed |

## Cases

Evidence paths are relative to `evidence/api-e2e/round-1/`. Every vitest command runs from the worktree root as `env -i PATH HOME=<temp> TMPDIR … pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`, with the gates named in each file's header.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BLD-01 | all | build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | (console) | `Sanitized built-module/bootstrap smoke passed` | dist for every built-server case |
| OF-01..06 | AC-001..AC-004, AC-008, R-8 | built server, GraphQL editor | `tests/e2e/agent-org-runs/org-follows-definition.e2e.test.ts` | ENV-1 | Pass | `OF-01-06/vitest.log`, `OF-01..06.json` | `Tests  6 passed (6)` | rerun on IR-003, as requested |
| AOML-1/2 | AC-006 | built server startup conversion | `tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` | ENV-1 | Pass | `AOML-MIG/vitest.log` | `Tests  2 passed (2)` | released Org converted, resumed, messaged across units |
| MIG | AC-006 | migration suites | `tests/app-data-migrations/{agent-org-units-own-runs-v1,agent-org-flat-team-families-v1,agent-org-history-first-message-summary-v1}` | ENV-1 | Pass | `AOML-MIG/migration-suites.log` | `Tests  93 passed (93)` | every released shape, retry, follow-ups |
| TC-01 | all | typecheck | `node autobyteus-server-ts/scripts/typecheck.mjs` | ENV-1 | Pass | `TC-01/server-typecheck.log` | `production errors: 0; test-file errors: 974 in 300 files (baseline 974 in 300 files)` | rerun after the last test edit: same |
| FSB-01 | build | release job, fresh clone | `/tmp/oc-job.sh` (every `run:` step of `build-linux-arm64`, emulated `RUNNER_TEMP`/`GITHUB_ENV`) | ENV-3 | Pass | `FSB-01/fresh-start-build-summary.txt` | `Packaged server startup validation passed`, `FRESH_START_JOB_DONE`, `exit 0` | the units step fails 27 root-only tests (`# fail 27`, uid 0 refused), known |
| TF-REG | REQ-002 preserved | standalone Team follows | `tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` | ENV-1 | Pass | `ORG-E2E-TF-REG/tf.log` | `Tests  12 passed (12)` | |
| ORG-E2E | REQ-005, REQ-006 | stopped Org settings, scoped history, publication | the other three `tests/e2e/agent-org-runs/*` files | ENV-1 | Fail | `ORG-E2E-TF-REG/org-e2e.log`, `ORG-E2E-TF-REG/stopped-org-workspace.log` | `"outcome":"PERSISTENCE_INDETERMINATE"` | **F-3.** The file-shape assertion this ticket made untrue is updated (container + unit files). After that, the second stopped-settings save (`/team` workspace plus a `/team/lead` model change in one command) returns `PERSISTENCE_INDETERMINATE`, although the readback equals the expected tree (diffed: no difference outside `taskExecutions`). The other two files pass. |
| OC-01 | AC-001, REQ-001, REQ-006 | package Org start | `tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` | ENV-1 | Pass | `OC-01-11/OC-01.json` | units `[["/concierge","agent"],["/team","agent_team"]]`; snapshot statuses all `offline`; rows `org_agent`, `org_team`, `team_member`×3; units absent from `listWorkspaceRunHistory` | |
| OC-02 | AC-003, REQ-003 | unit → Team member → back | same | ENV-1 | Pass | `OC-01-11/OC-02.json` | both lines with `counterpart {address:"/team/writer"}` / `{address:"/concierge"}`; one `communication` event per message | no Org-level log file |
| OC-03 | AC-002 | `team-config.json` gains a member | same | ENV-1 | Pass | `OC-01-11/OC-03.json` | lead input `Your team changed: its definition was updated.\nJoined: editor at /team/editor.`; editor `offline` | |
| OC-04 | AC-002, AC-004 | busy member removed | same | ENV-1 | Fail | `OC-01-11/OC-04.json`, `OC-01-11/vitest.log` | `the Org's row of the leaving member is tagged: expected [] to deeply equal [ Array(1) ]`; `allRowsWhileLeaving` lacks the reviewer | **F-1.** Everything else holds: the stored `leaving` marker, the teammate's refusal `reviewer (/team/reviewer) is no longer a member of your team…`, `RULES_CHANGED` to the concierge, the rule left out, the late send delivered, the release. The Org agent's own send to `/team/reviewer` gets the generic `No agent or agent team you can talk with has the address /team/reviewer…` (Ambiguity A-1). |
| OC-05 | AC-004 | member re-added | same | ENV-1 | Pass | `OC-01-11/OC-05.json` | same run ID; `RULES_CHANGED`; rule `Ask the reviewer for reviews.` back | |
| OC-06 | DEC-006, REQ-005 | unit stopped alone | same | ENV-1 | Pass | `OC-01-11/OC-06.json` | `"code":"DELIVERED","message":"Delivered message to /team/lead."` after `terminateAgentTeamRun`; the agent unit answers the user after `terminateAgentRun` | the web app has no per-unit Stop button (stop driven by the unit's own mutation) |
| OC-07 | S-09, CR-005 | closed delegation | same | ENV-1 | Pass | `OC-01-11/OC-07.json` | other unit `TASK_AGENT_RESOURCE_CLOSED`; after TODO `…continues with its conversation.`; the first `OK` still in the copy's conversation | |
| OC-10 | AC-005, REQ-005 | Stop, change, reopen, restart | same | ENV-1 | Pass | `OC-01-11/OC-10.json` | after stop every unit agent `offline` (5/5, `/ws/run-status` on the unit runs); reopen `Joined: helper at /team/helper.` once; after restart `Left: helper (/team/helper)…` once | |
| OC-08 | AC-008, REQ-009 | mount a Team, add an agent | same | ENV-1 | Pass | `OC-01-11/OC-08.json` | units `["/concierge","/team","/team2","/scribe"]`; `Joined: scribe at /scribe.`, `Joined: team2 at /team2.` | |
| OC-09 | AC-008, REQ-009 | unmount a busy Team, remove an agent | same | ENV-1 | Pass | `OC-01-11/OC-09.json` | formerUnits `{"/team",leaving:true}`, `{"/scribe",leaving:false}`; `Left: team (/team); messages to it are no longer delivered.`; refusals by name; late send delivered; released | |
| OC-11 | AC-006, REQ-007 | released Org converted at startup | same (second suite, own root, ledger rows from the migration onward removed) | ENV-1 | Pass | `OC-01-11/OC-11.json` | `"status":"SUCCEEDED","summary":"Scanned 1; migrated 1; skipped 0; failed 0."`; converted Team unit `Joined: editor at /team/editor.` | hand-built fixture only |
| RC-56 | AC-007, REQ-008 | two nodes, FU-003 | `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | ENV-2 | Pass | `RC-run3/vitest.log`, `RC-run3/rc-cases-extract.json` | `✓ RC-56` | notice: auditor in alpha's Task entry and rows, reached by run ID; removal follows; with alpha down, reconciled once a window holds the copy (`/ws/run-status`) |
| RC (file) | AC-007, regression of Org delegation | two nodes | same, whole file | ENV-2 | Fail | `RC-run3/vitest.log`, `RC-no56/vitest.log`, `RC-run1/`, `RC-run2/` | run 3: `Tests  4 failed \| 52 passed (56)`; without RC-56: `Tests  1 failed \| 54 passed \| 1 skipped (56)` | **F-2** RC-47: `list_running_agents` lists an Org's agent unit (`delegator_…` of RC-07) as a top-level running agent. **F-4** RC-12/13/24, only after RC-56: `{"accepted":false,"code":"REMOTE_TARGET_NOT_FOUND","message":"That run no longer exists on node \"beta-node\"."}` for the delegator's follow-up to the idle-stopped Studio copy; alpha's link is intact. RC-07 and RC-20 updated (intended change). |
| OCL-01 | AC-003, REQ-003 | real Codex + native AutoByteus | `tests/e2e/runtime/org-container-live.e2e.test.ts` | ENV-4 | Pass | `OCL-01-02/OCL-01.json`, `OCL-01-02/vitest-run1.log` | toLead `counterpart {"address":"/team/lead"}`, fromLead `The team code is TEAMCODE-4064a3c2.`; lead launch `autobyteus`/`claude-haiku-5-5` | |
| OCL-02 | AC-002 | real Codex member leaving with an approval | same, `-t OCL-02` rerun with stream diagnostics | ENV-4 | Fail | `OCL-01-02/OCL-02.json`, `OCL-01-02/OCL-02-run1.json`, `OCL-01-02/vitest-ocl02.log` | `{'ran': True, 'delivered': False, 'released': False}`; `orgWriterEvents` end at `TOOL_APPROVAL_REQUESTED … run_bash`; `teamWriterFrames` go on: `TOOL_APPROVED`, `TOOL_EXECUTION_SUCCEEDED`, `TOOL_APPROVAL_REQUESTED … get_handoff_rules` | **F-1 (event part).** Failed the same way twice. |
| OCU-01 | AC-001, REQ-006 | rendered Org tree | `node probes/org-container-ui-probe.mjs --output-dir …/OCU-01-05` | ENV-5 | Pass | `OCU-01-05/OCU-01-org-tree.png`, `org-container-ui-evidence.json` | rows concierge, team, lead, writer; status `offline` | |
| OCU-02 | AC-003 | rendered Org messages | same | ENV-5 | Pass | `OCU-01-05/OCU-02-org-messages.png` | Org tab `2 Messages`: `from writer UI-BACK-…`, `to writer UI-THERE-…` | |
| OCU-03 | AC-002 | rendered new member | same | ENV-5 | Pass | `OCU-01-05/OCU-03-new-member.png` | `editor` row, `offline`, without a reload | |
| OCU-04 | AC-002, REQ-002 | rendered busy leaving member | same | ENV-5 | Fail | `OCU-01-05/OCU-04-a-while-leaving.png`, `org-container-ui-evidence.json` | `"writerRow": null`; the `team` row reads `Team status: Offline` while the writer works | **F-1 (rendered).** |
| OCU-05 | AC-008, REQ-009 | rendered mount and busy unmount | same | ENV-5 | Pass | `OCU-01-05/OCU-05-a-mounted.png`, `OCU-05-b-unit-leaving.png`, `OCU-05-c-released.png` | `team Leaving`, `lead Leaving`; `team2` row; the row goes after the release | |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only / Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | OF-01, OC-01, OCU-01 | Proven | |
| AC-002 | Yes | OF-03, OC-03, OC-04, OC-05, OCL-02, OCU-03, OCU-04 | Not Proven | F-1: a busy member removed from a Team unit is not shown Leaving in the Org view, and its later events (for example an approval request) never reach the Org view; with a real runtime it never finishes |
| AC-003 | Yes | OF-02, OC-02, OCL-01, OCU-02 | Proven | |
| AC-004 | Yes | OF-04, OC-04 (rule parts), OC-05 | Proven | the rule part holds; OC-04 fails only on the row (F-1) |
| AC-005 | Yes | OC-10 | Proven | |
| AC-006 | Yes | AOML-1/2, MIG, OC-11 | Proven | conversion of the user's own run is checked only on upgrade (never on real data, by requirement) |
| AC-007 | Yes | RC-56 | Not Proven | RC-56 passes (notice, run-ID message, reconcile at next contact). F-4: after those member changes, beta cannot restore the peer copy for the delegator's follow-up, a direct consequence of the AC-007 trigger |
| AC-008 | Yes | OF-05, OC-08, OC-09, OCU-05 | Proven | |
| REQ-006 (preserved) | Yes | OC-01, ORG-E2E, RC-47 | Not Proven | F-2 (Org units listed as running agents), F-3 (stopped Org settings save) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 70% | 65% | all cases | AC-002, AC-007 and REQ-006 not proven (F-1..F-4) | the fixes, then a rerun of OC-04, OCL-02, OCU-04, RC file, ORG-E2E |
| Changed-boundary execution directness | 90% | 92% | OC, RC-56, OCL, OCU | — | — |
| Cross-boundary integration realism and mock gap | 85% | 90% | OCL (real models), RC (two processes), OCU (rendered) | scripted AGY in most cases | — |
| Environment, configuration, identity, and fixture fidelity | 90% | 90% | package edits on disk, hand-built released fixture, test vault | Linux only; macOS file events not exercised | — |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 75% | OC-06/07/09/10, RC-56 offline | F-1 lifecycle (leaving never ends), F-4 restore | rerun after fixes |
| User-surface, browser, and desktop-shell confidence | 80% | 80% | OCU-01..05 | F-1 rendered | rerun OCU-04 |
| Durable regression coverage quality and relevance | 90% | 92% | new OC suite, RC-56, OCL, updated RC-07/RC-20/stopped-org | — | — |

- Overall post-repository confidence: 83%
- Overall final confidence: 83%
- Calculation method: unweighted mean of the seven categories, then capped by the unproven critical criteria
- Every critical acceptance criterion directly proven: `No`
- Any final applicable category below `90%`: `Yes`. Requirement proof 65%, failure/lifecycle 75%, user surface 80%.
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-1..F-4 below; A-1 (unspecified cross-unit refusal text)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (done)
- Execution mode: `Live API`, `Browser`, `Worker or Distributed` (two nodes), `Lifecycle` (restart)
- Confidence gap or residual risk it addresses: the real runtimes, the rendered Org view, two real nodes, restarts
- Browser validation needed: yes, for the Org view's rows (it found F-1 visually)

## Desktop Application Validation

- Approach executed: the web-equivalent renderer (`nuxt dev`) against the built backend, and the release job's packaged-server startup check (FSB-01)
- Effect on any already-running desktop application: `None` (own ports, own roots; the user's app on :8000 untouched)

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DEC-001)
- Representative existing data used: hand-built released Org trees (migration suites, AOML, OC-11), never user data
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the migration outcome: MIG (every shape, retry, follow-ups), AOML-1 (repeat start), OC-11 (converted, opened, Team follows)
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: the user's real run converts on upgrade (by requirement, not on a copy)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` | Added | OC-01..OC-11 | file-event waits use `OS_FILE_EVENT_WAIT_MS`; busy members held by `untilFile` gates; timeouts from `FILE_EVENT_TEST_TIMEOUT_MS` |
| `autobyteus-server-ts/tests/e2e/runtime/org-container-live.e2e.test.ts` | Added | OCL-01, OCL-02 | live-gated (`RUN_CODEX_E2E`, `RUN_AUTOBYTEUS_ORG_CONTAINER_E2E`, test vault). OCL-02 also reads the Team unit's own stream (diagnostics only) |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated | RC-56 (added), RC-07, RC-20, RC-13, RC-12 | RC-07 now expects the delegation from the Org lead's unit run and no link naming the container. RC-13's `linksNow` reads the unit's links. RC-20 allows `/rest/remote/peer-run-members` with its exact keys. RC-12's assertion message now carries the result and the link. |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts` | Updated | ORG-E2E | it compared the stored Org file to the composed tree; now it checks the container's units, the Team unit's own file (workspace saved), the sibling unit unchanged, and unit-file bytes after refused saves. The mixed-save assertion message carries the result and the expected tree. |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model runtime (most cases) | scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` | deterministic tool calls, no inference cost (TESTING.md) | covered by OCL with real models |
| Release runner | the job's steps run locally from a fresh clone | no runner here | macOS/x64 jobs not run |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `probes/org-container-ui-probe.mjs` | Yes | kept with the ticket (journey record) | committed |
| Suite temp roots, `$HOME/.autobyteus-e2e/org-container-live-*`, probe root | Yes | removed by each suite/probe | removed (checked) |
| `/root/.autobyteus-e2e/oc-fs-job` (fresh clone) | Yes | `rm -rf` | removed |
| `*/dist/` from `test:integration:prepare` (Brief Studio, SDKs) | Yes | left in the worktree, not staged | untracked, not committed |
| Two-server receipts and server logs | Yes | case extracts kept (`rc-cases-extract.json`); full receipts and logs removed (peer secrets, size) | done |

## Preliminary Classification (On `Fail`)

- **F-1** (OC-04, OCL-02, OCU-04; AC-002, REQ-002): an Org's view and rows drop a Team unit's member as soon as it is removed, while it is still leaving.
  - Rows: `run-history/store/run-own-agents-reader.ts:108` (`containerTreeOf`) builds a Team unit's members from `tree.rootTeam.members` only. The standalone Team path (`ownTreeOf`, `agent_team`) also adds the `formerMembers` marked `leaving`, which `teamMemberRowsOf` then shows while the run is live.
  - Events: the Org view composition stops relaying the leaving member's events. In OCL-02 the Team run's own stream still publishes `TOOL_APPROVED`, the command's result and a second `TOOL_APPROVAL_REQUESTED`, none of which reach the Org view.
  - Consequence: the user cannot see or answer the leaving member's approval, so it never finishes and is never released.
  - `Local Fix` (implementation).
- **F-2** (RC-47; REQ-006 / design R-5): `list_running_agents` lists an Org's agent unit as a top-level running agent. `RunningAgentsListing.list` excludes `agent_org` roots only, and a unit run has no `delegatedFrom`, so `startedByPerson` is true; `containedIn` runs need excluding. A Team unit would be listed the same way. `Local Fix`.
- **F-3** (ORG-E2E; REQ-006): the second stopped-settings save (a workspace and a model patch in one command) returns `PERSISTENCE_INDETERMINATE`, although the files hold the expected values. Suspects: `ContainerConfigTrees.write`'s outcome, or the manager's `isDeepStrictEqual(readback, expected)` on a field the readback drops (for example a `pendingRuntimeSwitch` on a Team member). Unverified. `Local Fix`.
- **F-4** (RC-12/13/24 after RC-56; AC-007): a peer-started Team copy whose members changed (one started, then removed; one added and removed unstarted) cannot be restored on beta for the delegator's follow-up after its idle shutdown (`REMOTE_TARGET_NOT_FOUND`, "That run does not exist on this node"). Alpha's link is intact. Without RC-56 the same cases pass. Origin not yet clear: it could be this ticket (FU-003, the readers and validators it changed) or autobyteus-22's restore of a Team with former members. `Unclear`; failure-origin review requested.
- **A-1** (OC-04, ambiguity): an Org agent addressing a Team unit's removed member by its Org address gets the generic not-found, while a teammate gets the exact former-member refusal. The design does not say which text another unit should get. `Requirement Gap` (minor), for the Solution Designer if the reviewer agrees.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: AC-002 (F-1), AC-007 (F-4), REQ-006 preserved (F-2, F-3)
- Evidence decisions requested: `None`
- Preliminary classification and recommended owner: F-1, F-2, F-3 `Local Fix` (implementation engineer); F-4 `Unclear` (failure-origin review); A-1 `Requirement Gap` (minor)
- Next recipient from `get_handoff_rules`: `/code_reviewer` (failure-origin review)
- Notes:
  - Rerun after the fixes: OC file, OCL-02, OCU-04 (probe), the two-server file (including RC-56), and `stopped-org-workspace-graphql`. If build inputs change, also FSB-01.
  - FU-001 (memory sync of contained runs) stays a follow-up.

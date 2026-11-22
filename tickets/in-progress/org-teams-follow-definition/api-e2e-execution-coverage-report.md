# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 2, after code review CRR-005 passed IR-004 (`cd6a777b24`, review records `c6db4fe7ca`), which fixes round 1's F-1..F-4 and adds SR-015 (DEC-007)
- Prior round reviewed: round 1 (API-REV-001, Fail: F-1..F-4, A-1). Round-1 evidence stays in `evidence/api-e2e/round-1/`.
- Deviations from the investigation's plan, and why:
  - OC-12 is added at the reviewer's recommendation (F-4 in its Org form).
  - OC-13 is added after round 2's first attempt found F-5.
  - OC-04 now asserts the DEC-007 text for another unit.
  - FSB-01 is carried over: IR-004 changes no build input (only `autobyteus-server-ts/src`, tests and docs, per `git diff --name-only fa1f957778..HEAD`).
  - The user stopping one unit (DEC-006) is still driven through the unit run's own terminate mutation; the web app has no per-unit Stop button.
- Evidence folder: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition/tickets/in-progress/org-teams-follow-definition/evidence/api-e2e/round-2/`; `evidence/api-e2e/round-1/` for FSB-01 and round 1.

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `c6db4fe7ca` (implementation `cd6a777b24`) + this round's test edits | Linux aarch64 container, root, Node 22.23.3 | built server `autobyteus-server-ts/dist`, scripted AGY CLI `linked_skills` | clean env `env -i PATH HOME TMPDIR`; temp data roots; a local package written by the suite |
| ENV-2 | same | same | two built servers (alpha, beta) paired, capturing proxies | after `pnpm -C autobyteus-server-ts test:integration:prepare` |
| ENV-3 | `818e950d53`, fresh `git clone --no-local` (round 1) | same | release job `build-linux-arm64`, go1.27.4 | build-only trust; `libz.so` on `LD_LIBRARY_PATH` |
| ENV-4 | same as ENV-1 | same | built server + Codex `gpt-6.1-terra` (low) + native AutoByteus `claude-haiku-5-5` (test vault) | data root under `$HOME/.autobyteus-e2e/` (outside /tmp); throwaway `CODEX_HOME` |
| ENV-5 | same as ENV-1 | same | built server + `nuxt dev` + Chromium 153 headless | probe root under `$HOME/.autobyteus-e2e/`, removed |

## Cases

Evidence paths are relative to `evidence/api-e2e/round-2/` unless they start with `round-1/`. Every vitest command runs from the worktree root as `env -i PATH HOME=<temp> TMPDIR … pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`, with the gates named in each file's header.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BLD-01 | all | build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | (console) | `Sanitized built-module/bootstrap smoke passed` | |
| TC-01 | all | typecheck | `node autobyteus-server-ts/scripts/typecheck.mjs` | ENV-1 | Pass | (console; round 1: `round-1/TC-01/`) | `production errors: 0; test-file errors: 974 in 300 files (baseline 974 in 300 files)` | after the last test edit |
| FSB-01 | build | release job, fresh clone | round 1's run | ENV-3 | Reused | `round-1/FSB-01/fresh-start-build-summary.txt` | `Packaged server startup validation passed`, `FRESH_START_JOB_DONE` | Still holds: no build input changed in IR-004. The source change is covered by BLD-01 and TC-01. |
| OF-01..06 | AC-001..AC-004, AC-008, R-8 | GraphQL editor | `org-follows-definition.e2e.test.ts` | ENV-1 | Pass | `OF-01-06/vitest.log` | `Tests  6 passed (6)` | OF-04 now checks the SR-015 text |
| AOML-1/2 | AC-006 | startup conversion | `append-only-message-logs-startup.e2e.test.ts` | ENV-1 | Pass | `AOML/vitest.log` | `Tests  2 passed (2)` | |
| MIG | AC-006 | migration suites | round 1 | ENV-1 | Reused | `round-1/AOML-MIG/migration-suites.log` | `Tests  93 passed (93)` | IR-004 touches no migration code |
| ORG-E2E | REQ-005, REQ-006 | the other three Org e2e files | `stopped-org-workspace-graphql`, `scoped-org-history-graphql`, `controlled-org-publication-http` with `RUN_AGY_FAILURE_E2E=1` and the scripted CLI | ENV-1 | Pass | `ORG-E2E/org-e2e.log` | `Tests  3 passed (3)` | F-3 fixed. Without the AGY gates (`org-e2e-nogates.log`) the publication test is skipped and scoped history differs on one summary (`"Continue."` vs `""`). That depends on the environment, not on this change. |
| TF-REG | REQ-002 preserved | standalone Team | round 1 | ENV-1 | Reused | `round-1/ORG-E2E-TF-REG/tf.log` | `Tests  12 passed (12)` | IR-004 leaves the standalone Team path alone, apart from the validator counting former members (covered by RC-12/13/24 and OC-12) |
| OC-01 | AC-001, REQ-001, REQ-006 | package Org start | `org-container-package.e2e.test.ts` | ENV-1 | Pass | `OC-01-13/OC-01.json` | units `[["/concierge","agent"],["/team","agent_team"]]`; statuses `offline`; units absent from `listWorkspaceRunHistory` | |
| OC-02 | AC-003, REQ-003 | unit → Team member → back | same | ENV-1 | Pass | `OC-01-13/OC-02.json` | `counterpart {address:"/team/writer"}` / `{address:"/concierge"}`; one `communication` event per message | |
| OC-03 | AC-002 | Team gains a member | same | ENV-1 | Pass | `OC-01-13/OC-03.json` | `Joined: editor at /team/editor.` | |
| OC-04 | AC-002, AC-004, DEC-007 | busy member removed | same | ENV-1 | Pass | `OC-01-13/OC-04.json` | `rowsWhileLeaving` `[{kind:"team_member",address:"/team/reviewer",…}]`; from the Org agent `reviewer (/team/reviewer) is no longer a member of your team: it was removed from the team definition…` | F-1 and A-1 resolved |
| OC-05 | AC-004 | member re-added | same | ENV-1 | Pass | `OC-01-13/OC-05.json` | same run ID; `RULES_CHANGED`; rule back | |
| OC-06 | DEC-006 | unit stopped alone | same | ENV-1 | Pass | `OC-01-13/OC-06.json` | `"code":"DELIVERED"` after `terminateAgentTeamRun` | |
| OC-07 | S-09 | closed delegation | same | ENV-1 | Pass | `OC-01-13/OC-07.json` | `TASK_AGENT_RESOURCE_CLOSED`; `…continues with its conversation.` | |
| OC-10 | AC-005 | Stop, change, reopen, restart | same | ENV-1 | Pass | `OC-01-13/OC-10.json` | after stop 5/5 `offline`; `Joined: helper at /team/helper.` once; after restart `Left: helper (/team/helper)…` once | |
| OC-12 | AC-005, AC-002 (F-4 Org form) | handed-off member removed, Org stopped and reopened | same | ENV-1 | Pass | `OC-01-13/OC-12.json` | lead input `Left: writer (/team/writer); messages to it are no longer delivered.` … `ECHO_INPUT`; the hand-off line in both logs (`counterpart /concierge`, `/team/writer`); `{"address":"/writer","leaving":false}` former | new; the first round-2 attempt had a test error (`OC-01-12-attempt1/`: the Team's own rule to `/writer` kept, so the definition was invalid) |
| OC-13 | REQ-009, DEC-005, REQ-004 | Org edit while an Org rule names a removed Team member | same | ENV-1 | Fail | `OC-01-13/OC-13.json`, `OC-01-13/vitest.log` | `"followed": false`; `AGENT_ORG_DEFINITION_NOT_FOLLOWED: AgentOrg '…' keeps its units: Org definition 'oc-org-…' cannot be used (AgentOrg endpoint '/team/writer' was not found.).` | **F-5** (new). Its `finally` adds the writer back, so OC-08/09 run from a consistent state. |
| OC-08 | AC-008, REQ-009 | mount a Team, add an agent | same | ENV-1 | Pass | `OC-01-13/OC-08.json` | units `["/concierge","/team","/team2","/scribe"]`; `Joined: scribe at /scribe.`, `Joined: team2 at /team2.` | |
| OC-09 | AC-008, REQ-009 | unmount a busy Team, remove an agent | same | ENV-1 | Pass | `OC-01-13/OC-09.json` | `{"/team",leaving:true}`; `Left: team (/team); messages to it are no longer delivered.`; released | |
| OC-11 | AC-006, REQ-007 | released Org converted at startup | same (second suite) | ENV-1 | Pass | `OC-01-13/OC-11.json` | `"status":"SUCCEEDED","summary":"Scanned 1; migrated 1; skipped 0; failed 0."`; `Joined: editor at /team/editor.` | hand-built fixture only |
| RC (file) | AC-007, REQ-006, Org delegation regression | two nodes | `remote-delegation-two-server.e2e.test.ts` (whole file, RC-56 first) | ENV-2 | Pass | `RC/vitest.log`, `RC/rc-cases-extract.json` | `Tests  56 passed (56)` | RC-56; RC-12/13/24 after RC-56 (F-4 fixed); RC-47 (F-2 fixed); RC-07, RC-20 |
| OCL-01 | AC-003 | real Codex + native AutoByteus | `org-container-live.e2e.test.ts` | ENV-4 | Pass | `OCL-01-02/OCL-01.json` | toLead `counterpart {"address":"/team/lead"}`; fromLead `The team code is TEAMCODE-…` | |
| OCL-02 | AC-002 | real Codex member leaving with approvals | same | ENV-4 | Pass | `OCL-01-02/OCL-02.json` | `'ran': True, 'delivered': True, 'released': True`; 3 approvals answered in the Org view; `rowsWhileLeaving` `/team/writer` | F-1 fixed with a real runtime |
| OCU-01..05 | AC-001, AC-002, AC-003, AC-008 | rendered Org view | `node probes/org-container-ui-probe.mjs --output-dir …/OCU-01-05` | ENV-5 | Pass | `OCU-01-05/org-container-ui-evidence.json`, `OCU-04-a-while-leaving.png`, `OCU-05-b-unit-leaving.png` | console `OCU-01 Pass` … `OCU-05 Pass`; screenshot: `writer Leaving` under `team` | |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only / Accepted-Risk Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | OF-01, OC-01, OCU-01 | Proven | |
| AC-002 | Yes | OF-03, OC-03, OC-04, OC-05, OC-12, OCL-02, OCU-03, OCU-04 | Proven | |
| AC-003 | Yes | OF-02, OC-02, OCL-01, OCU-02 | Proven | |
| AC-004 | Yes | OF-04, OC-04, OC-05 | Proven | |
| AC-005 | Yes | OC-10, OC-12 | Proven | |
| AC-006 | Yes | AOML-1/2, MIG, OC-11 | Proven | the user's own run converts on upgrade only (never on real data, by requirement) |
| AC-007 | Yes | RC (RC-56, then RC-12/13/24) | Proven | |
| AC-008 | Yes | OF-05, OC-08, OC-09, OCU-05 | Proven | |
| REQ-009 with DEC-005 / REQ-004 | Yes | OC-13 | Not Proven | F-5: while an Org rule names a member removed from its Team, the Org stops following its Org definition |
| REQ-006 (preserved) | Yes | OC-01, ORG-E2E, RC-47 | Proven | |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 88% | 88% | all cases | F-5 (REQ-009 combined with REQ-004) | the fix, then OC-13 and the OC file |
| Changed-boundary execution directness | 95% | 95% | OC, RC, OCL, OCU | — | — |
| Cross-boundary integration realism and mock gap | 92% | 94% | OCL (real models), RC (two processes), OCU (rendered) | scripted AGY in most cases | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 92% | package files edited on disk, hand-built released fixture, test vault | Linux only (macOS file events not exercised) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 90% | OC-06/07/09/10/12, RC-56 offline, RC-12/13/24 | F-5 | rerun after the fix |
| User-surface, browser, and desktop-shell confidence | 95% | 95% | OCU-01..05 | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | OC (13 cases), RC-56, OCL, updated RC-07/RC-13/RC-20/stopped-org | — | — |

- Overall post-repository confidence: 91%
- Overall final confidence: 91%
- Calculation method: unweighted mean of the seven categories, capped by the unproven critical requirement
- Every critical acceptance criterion directly proven: `No` (F-5, REQ-009 with REQ-004)
- Any final applicable category below `90%`: `Yes`. Requirement proof 88%.
- Default final confidence target of `95%` met: `No`
- Confidence-limiting residual risks: F-5

## Broader Validation Decision (Mandatory)

- Decision: `Required` (done)
- Execution mode: `Live API`, `Browser`, `Worker or Distributed` (two nodes), `Lifecycle` (stop, reopen, restart)
- Confidence gap or residual risk it addresses: real runtimes, the rendered Org view, two real nodes, restarts
- Browser validation needed: yes (Org rows and the Leaving tag)

## Desktop Application Validation

- Approach executed: the web-equivalent renderer (`nuxt dev`) against the built backend; the packaged-server startup check of the release job (FSB-01, round 1)
- Effect on any already-running desktop application: `None` (own ports, own roots; the user's app on :8000 untouched)

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Migration Required` (DEC-001)
- Representative existing data used: hand-built released Org trees (MIG, AOML, OC-11), never user data
- Approved transition followed without an unnecessary migration: `Yes`
- Cases proving the migration outcome: MIG (round 1), AOML-1/2, OC-11
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: the user's own run converts on upgrade (by requirement)

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` | Updated | OC-04, OC-12 (added), OC-13 (added) | OC-04 asserts the DEC-007 refusal from the Org agent. OC-12 is the hand-off, removal, stop, reopen sequence. OC-13 is the Org edit while an Org rule names a removed member; its `finally` restores the writer. Waits for file events use `OS_FILE_EVENT_WAIT_MS`; `caseTimeout` derives from `FILE_EVENT_TEST_TIMEOUT_MS`. |
| round 1 (still current) | Added / Updated | see `api-e2e-revision-record.md` API-REV-001 | `org-container-live.e2e.test.ts`, RC-56, RC-07/RC-12/RC-13/RC-20, `stopped-org-workspace-graphql` |

- Added or updated paths attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model runtime (most cases) | scripted AGY CLI | deterministic tool calls (TESTING.md) | covered by OCL with real models |
| Release runner | the job's steps from a fresh clone (round 1) | no runner here | macOS/x64 jobs not run |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| `probes/org-container-ui-probe.mjs` | Yes | kept with the ticket | committed (unchanged in round 2) |
| Suite and probe temp roots | Yes | removed by each suite or probe | removed |
| `*/dist/` from `test:integration:prepare` | Yes | left untracked, not staged | not committed |
| Two-server receipts and server logs | Yes | case extract kept (`RC/rc-cases-extract.json`); full receipt and logs removed | done |

## Preliminary Classification (On `Fail`)

- **F-5** (OC-13; REQ-009 with DEC-005 / REQ-004), new in round 2, reachable only now that round 1's blockers are fixed.
  - What happens: while an Org rule names a Team-unit member that was removed from its Team (here `/team/writer → /concierge`), every Org-definition change is ignored for the running Org. The container keeps its units and rules. The only trace is a log warning: `AGENT_ORG_DEFINITION_NOT_FOLLOWED: … Org definition 'oc-org-…' cannot be used (AgentOrg endpoint '/team/writer' was not found.)`. The same happened silently in OC-04's window for `/team/reviewer`.
  - Why it matters: DEC-005 / REQ-004 say such a rule is only left out until the member returns. Design DS-006 has the planner filter Org rules to the current units and members.
  - Where: `agent-org-execution/membership/org-membership-planner.ts:46-55` builds the definition view with `AgentOrgRunPlanner.resolveConfiguration`, which compiles every Org handoff strictly (`collaboration-handoff-compiler.ts`, "AgentOrg endpoint '…' was not found"). The catch turns that into "not followed". The presence filter exists only in `org-container-directory.ts` (`orgRulesFrom`).
  - Proposed: `Local Fix` (implementation engineer), subject to the failure-origin review.
  - Also unchecked: whether a new Org run can even be started from such a definition (the launch path uses the same strict compile). That may be intended for launches; it is the Solution Designer's call if the reviewer thinks it matters.

## Latest Authoritative Result

- Result: `Fail`
- Criteria not proven: REQ-009 combined with REQ-004 / DEC-005 (F-5). Every acceptance criterion AC-001..AC-008 is proven.
- Evidence decisions requested: `None`
- Preliminary classification and recommended owner: F-5 `Local Fix` (implementation engineer)
- Next recipient from `get_handoff_rules`: `/code_reviewer` (failure-origin review)
- Notes: after the fix, rerun the OC file (OC-13 and the rest). If the planner change touches launches: OF, `stopped-org-workspace`, and the probe's OCU-05. The two-server file and OCL only if the fix reaches remote or view code.

# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision go in the execution coverage report.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-007, approved; REQ-001..REQ-009, AC-001..AC-008, DEC-001..DEC-006)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (through SR-014)
- Design Spec (required on every route): `design-spec.md` (with R-1''', R-2, R-3'', R-7, R-8, SR-014), `org-container-storage-contract.md`
- Supplemental Task Artifacts: `contract-validation.md`, `release-notes.md`, `follow-ups.md`; autobyteus-22's archived behavior (`tickets/done/team-run-follows-definition/` on `personal`)
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001..IR-003)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-003 pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: 3 (round-2 additions: OC-12, OC-13; OC-04 asserts DEC-007; round 3 reruns OC, OF, OCU on IR-005, the rest reused)
- Trigger: code reviewer, CRR-003 pass on implementation head `1f0aad498b` (review records `818e950d53`)
- Prior Investigation Reviewed: none (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

An Org run is now a container (`agent_orgs/<orgRunId>/agent_org_run_execution_tree.json` with `rootOrg.units`, `formerUnits`, Org-level `handoffs`); each mounted Team is a Team run (`agent_teams/<id>/`) and each direct agent an agent run (`agents/<id>/`), each with `containedIn {orgRunId, address}`. Units message each other by Org address through `CrossRunMessageDelivery` (`same_container`, both logs with `counterpart`); a Team unit's one address boundary (`ContainedTeamAddressSpace`) shows Org addresses to its agents. A unit not live is restored by a message, also when the user stopped it alone (DEC-006). Org rules are merged into a unit's `get_handoff_rules` and left out while a named member is gone (REQ-004). Team units follow their Team definition with every autobyteus-22 behavior (REQ-002); the container follows its Org definition (REQ-009: new units Offline; removed units leave, a busy one tagged Leaving until it finishes). Stop stops every unit; reopen restores units on demand, following definitions (REQ-005). Stored Org runs are converted at startup by `20261122_agent_org_units_own_runs_v1` (REQ-007). FU-003: a peer Team copy's members on the delegating node follow by a signed notice and are reconciled at the next contact (REQ-008). The Org view and rows look as before (REQ-006, DEC-004); a delegated run of an Org unit keeps its Org reach (R-8, SR-014); a closed delegation continues only for its assigner (S-09, CR-005).

## Supported Scenarios And Real Usage

- Designer scenarios covered: UC-001..UC-006, S-09 (CR-005: continuing a closed delegation from an Org unit).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - A package author (or the Agent Package Creator's file tools) edits the package's `team-config.json` / `org-config.json` on disk while the Org runs (package folder watcher), not only the GraphQL editor the existing OF suite uses.
  - A Team member is mid-turn when it is removed; its Org-level peer refuses it by Org address; its pending send still lands.
  - A mounted Team is unmounted while one of its members is mid-turn (Org-level Leaving row).
  - The user stops one unit (unit run's own terminate mutation, as a row Stop sends) and another unit then hands off to it (DEC-006).
  - The user stops the whole Org, edits the Team on disk, then reopens by sending in the Org view; and again across a server restart.
  - The delegating node is shut down while beta's Team copy changes, then started again.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): Orgs inside Orgs, placement copies (none exist), application-bound Org following (application-owned units are not followed, as before).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Org = container of unit runs | Changed | REQ-001, DS-001 | Container file + unit runs at start; Offline members; not top-level |
| BEH-002 Org Teams follow their Team definition | Added | REQ-002 | Package-file edits: gain, busy removal (Leaving), refusal by Org address, release |
| BEH-003 Messages across unit runs by Org address | Changed | REQ-003, R-2 | Both directions, both logs, Org view frames exactly once |
| BEH-004 Org rules merged, presence-filtered | Changed | REQ-004 | Rule out/in with notices (OF-04 by editor; again by package edit) |
| BEH-005 Peer Team copy members follow | Added | REQ-008, DS-007 | Two real nodes: notice; delegating node offline then reconcile |
| BEH-006 Stored Org runs converted | Changed | REQ-007, DEC-001 | AOML + migration suites; plus a converted Org's Team following its definition |
| DEC-006 user-stopped unit woken by a message | Added | REQ-005 | Unit stopped alone; another unit's message and a user message restore it |
| REQ-009 Org follows Org definition | Added | DS-006 | Mount a Team, add/remove an agent, unmount a busy Team (Leaving), notices |
| S-09 continuing a closed delegation | Preserved (re-implemented) | CR-005 | DONE → refused for others; TODO → assigner continues |
| Org view / rows / Memory page | Preserved | REQ-006 | Rendered probe: rows, Leaving tag, new member Offline, messages |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | container, planner, delivery, address boundary | unit tests (2591), OF-01..06 | package-file trigger, busy members, DEC-006, S-09 end to end | built-server e2e |
| API / transport / contract | Yes | Org stream composition, GraphQL Org reads, peer route `/remote/peer-run-members` | OF suite, in-process peer tests | real two-node notice + reconcile | two-server e2e |
| Frontend component / state | Yes | `AgentOrgRunMemberTree.vue` Leaving tag | 20 web specs | real backend data | rendered probe |
| Browser integration / user journey | Yes | Org view over the container | none | the user's Org view on real data | rendered probe (Chromium) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same web app) | as above | — | — | rendered probe (web-equivalent) |
| Desktop shell / Electron-specific integration | No | — | — | packaging | fresh-start build |
| Process / lifecycle | Yes | Stop/reopen, restart, idle units | OF none | restart and reopen following | built-server e2e with restart |
| Persisted-data transition | Yes | migration | migration suites, AOML | Team following after conversion | built-server e2e on hand-built released fixture |
| Worker / queue / distributed coordination | Yes | peer notice, reconcile | in-process | real nodes, offline node | two-server e2e |
| External integration | Yes | real runtimes (Codex, native AutoByteus) | scripted AGY only | real model calls `send_message_to` by Org address, approval while leaving | live e2e (test vault) |

## Project Execution Discovery

- Assigned task worktree / workspace: `/home/autobyteus/workspace/.codex/worktrees/org-teams-follow-definition`, branch `codex/org-teams-follow-definition`
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL server (`autobyteus-server-ts`, TypeScript, Prisma/SQLite), Nuxt web app (`autobyteus-web`), Electron desktop
- Project testing guideline path(s): `TESTING.md` (root), `autobyteus-server-ts/AGENTS.md`
- Conflicting, missing, or unclear project instructions: none
- Changed build-input paths: `autobyteus-server-ts/typecheck-baseline.json` → fresh-start build of the release job (`build-linux-arm64`, the aarch64 host) from a clean clone of `818e950d53`
- Required environment variables or secrets available: `Yes` — test vault (`provider.anthropic.api-key`), signed-in Codex CLI (throwaway `CODEX_HOME` with the auth link); no values recorded

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | testing rules | built server per suite, scripted AGY CLI, clean env, one heavy run at a time, file-event waits from `os-latency-under-load.ts`, never the user's app/data, fresh-start build rule |
| `AGENTS.md` | provider keys | `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`; never `.env` keys |
| requirements Verification Intent | evidence plan | isolated instances, package Org edited while running, hand-built fixtures, two paired instances, real runtimes, web app against the instance |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built server | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build`; suites spawn `dist/app.js --data-dir <tmp> --port 0` | own data root per suite | "Server listening" + GraphQL probe | SIGTERM, root removed |
| Two nodes | same | the two-server suite's `NodeServer` | fixed ports, pairing invite | `/rest/health` | suite teardown |
| Nuxt dev + Chromium | `autobyteus-web` | `nuxt dev` with `BACKEND_NODE_BASE_URL`; `/usr/bin/chromium` via playwright-core | probe-node-access fixture | page loads | kill process group |
| Codex CLI | — | throwaway `CODEX_HOME` | `gpt-6.1-terra`, effort low | — | folder removed |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Local agent package with agents, Teams, Org | written by the suite into its temp root, imported `LOCAL_PATH` | test-owned only | removed after the suite |
| Released Org run (pre-change shape) | hand-built in the test from the frozen released shape (contract §1), referencing the suite's own package definitions | never user data; the conversion runs only on the test root | removed |
| Two paired nodes | the two-server suite's pairing | test roots | removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (DEC-001, design § Migration Plan)
- Design-spec and implementation-handoff references: design § Migration Plan, R-4, R-1' (team space); handoff § Migration; contract §1..§11
- Representative existing-data setup and required behavior: hand-built released Org trees (agents only, Teams only, both; delegation; logs) converted; conversations, messages, references, Task links, history kept; converted Org resumes; its Teams follow their definitions
- Evidence planned: rerun of `tests/app-data-migrations/agent-org-units-own-runs-v1` (+ predecessors) and the AOML built-server e2e (released Org converted at startup, resumed, messaged across units); new OC-11: a hand-built released Org run converted at startup by the built server, then its Team definition edited on disk → the converted Team unit follows
- Migration-specific completion/recovery scenarios: retry/partial, repeat startup, reader-wait follow-ups: covered by the migration suites (rerun); repeat startup also in AOML-1
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/agent-org-runs/org-follows-definition.e2e.test.ts` OF-01..06 | container, one-way message, Team gains a member, Org rule out/in, delegated reach, Org definition edit (GraphQL editor) | AC-001..AC-004, AC-008, R-8 | Still Valid | rerun on IR-003 build | Rerun (not rerun after IR-003) |
| `tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts` AOML-1/2 | released Org converted at startup, resumed, messaged across units | AC-006 | Still Valid | rerun | Rerun |
| `tests/app-data-migrations/agent-org-units-own-runs-v1/*`, `agent-org-flat-team-families-v1`, `agent-org-history-first-message-summary-v1` | conversion of every released shape, retry, follow-ups | AC-006 | Still Valid | rerun | Rerun |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` RC-07, RC-34, RC-43, RC-51 | Org member delegates to a peer; Team copy follows its definition on beta | AC-007 (base), REQ-006 | Still Valid; RC-51 extended by RC-56 | Org delegation now from unit runs | Rerun the whole file; add RC-56 |
| `tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts`, `scoped-org-history-graphql.e2e.test.ts`, `controlled-org-publication-http.e2e.test.ts` | stopped Org workspace config, scoped history, publication | REQ-005, REQ-006 | Still Valid | Org readers changed | Rerun |
| `tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` TF-01..12 | standalone Team follows (autobyteus-22) | REQ-002 preserved | Still Valid | Team root changed (`containedIn`, boundary) | Rerun |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| BLD-01 | all | build | Existing Test | `pnpm -C autobyteus-server-ts build` | dist for the built-server suites |
| OF-01..06 | AC-001..AC-004, AC-008, R-8 | built server | Existing Test | OF suite (scripted AGY) | not rerun after IR-003 |
| AOML-1/2, MIG | AC-006 | built server startup, migration | Existing Test | AOML e2e; migration suites | conversion proof |
| ORG-E2E | REQ-005/006 | built server | Existing Test | the three other `agent-org-runs` e2e files | Org readers moved to the container |
| TF-REG | REQ-002 preserved | built server | Existing Test | TF suite | Team root changed |
| OC-01 | AC-001, REQ-006 | package Org started from the package; container, units, Offline, rows | Durable | new `org-container-package.e2e.test.ts` | the package path is the Verification Intent's |
| OC-02 | AC-003 | unit → Team member → back, by Org address | Durable | same | both directions, both logs, Org view frames once each |
| OC-03 | AC-002 | `team-config.json` edit: Team unit gains a member (Offline at its Org address; lead told) | Durable | same | package-file trigger |
| OC-04 | AC-002, AC-004 | busy Team member removed by package edit: Leaving (stored, Org rows), refused by Org address, its pending send to the Org agent delivered, released; the Org rule to it out, its sender told | Durable | same (gate) | busy path is untested at Org level |
| OC-05 | AC-004 | the removed member added back: the Org rule is back, its sender told; same run continues | Durable | same | rule return by package edit |
| OC-06 | DEC-006, REQ-005 | a unit stopped alone (its own terminate) is woken by another unit's message; an agent unit stopped alone is woken by the user's Org-view message | Durable | same | new rule |
| OC-07 | S-09, CR-005 | a Team unit member delegates (ad-hoc Task); DONE: the copy stops, another unit refused; TODO: the assigner's message continues it | Durable | same | E2E of CR-005 |
| OC-08 | AC-008, REQ-009 | `org-config.json` edit: mount a second Team (Offline), add an agent (Offline), notices | Durable | same | package-file trigger |
| OC-09 | AC-008, REQ-009 | `org-config.json` edit: unmount a Team while its member is mid-turn (formerUnits leaving, Org rows Leaving, refused by name), its send lands, then released; remove an agent unit | Durable | same | busy unit leaving |
| OC-10 | AC-005, REQ-005 | Stop the Org (every unit stopped); edit the Team on disk; reopen by a message in the Org view → current members; again across a server restart | Durable | same | stop/change/reopen |
| OC-11 | AC-006 | hand-built released Org run (Team + agent, messages) in the data root before start; converted; opens; its Team unit follows a package edit | Durable | same suite, own data root | "its Teams follow their definitions" after conversion |
| RC-56 | AC-007, REQ-008 | beta's Team copy (delegated by alpha's Team member) gains a member: alpha's Task-entry members and rows follow, alpha messages the new member by run ID; it loses it: alpha follows; alpha down while beta's copy changes, alpha restarted: reconciled at next contact | Durable | `remote-delegation-two-server.e2e.test.ts` new case after RC-51; whole file run | real two-node proof of FU-003 |
| OC-12 | AC-005, AC-002 | a Team-unit member that took a hand-off from another unit is removed; the Org is stopped and reopened and its Team unit messaged | Durable | same OC file | round 2: F-4 in its Org form (CRR-005 recommendation) |
| OC-13 | REQ-009, DEC-005 | an `org-config.json` edit while an Org rule names a removed Team member | Durable | same OC file | round 2: found while building OC-12 |
| OCL-01 | AC-003 (real runtimes) | Org with a Codex agent unit and a native AutoByteus Team; each hands off by Org address to the other; both logs | Durable (live-gated) | new `tests/e2e/runtime/org-container-live.e2e.test.ts` | real models choose the Org addresses |
| OCL-02 | AC-002 (real runtime) | a Codex Team member waiting on a tool approval is removed by a package edit: Leaving; the approval is answered; it finishes and is released | Durable (live-gated) | same | approval while leaving |
| OCU-01..04 | AC-001, AC-002, AC-003, AC-008, REQ-006 | the Org view in the web app: unit rows, a new member Offline, Leaving tag on a busy leaving unit and member, messages in the Org view | Temporary Probe | ticket probe `probes/org-container-ui-probe.mjs` (Nuxt dev + built backend + Chromium) | the web needs a running Nuxt + backend; the probe keeps the journey and screenshots |
| TC-01 | all | typecheck | Existing Test | `node autobyteus-server-ts/scripts/typecheck.mjs`; `pnpm -C autobyteus-web typecheck` | new test files typecheck |
| FSB-01 | build | release job | Journey | `/tmp/oc-job.sh` (parsed `build-linux-arm64` job, fresh clone of `818e950d53`) | `typecheck-baseline.json` is a build input |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| OC-01..OC-11 | `autobyteus-server-ts/tests/e2e/agent-org-runs/org-container-package.e2e.test.ts` | package-file trigger, busy units/members, DEC-006, S-09, Stop/reopen/restart, converted Org following: none of these is in a durable system test |
| RC-56 | `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | FU-003 is proven in-process only |
| OCL-01, OCL-02 | `autobyteus-server-ts/tests/e2e/runtime/org-container-live.e2e.test.ts` | real runtimes reaching Org addresses across unit runs; approval while leaving |

## Durable Coverage To Update

Found during execution (tests this ticket's change made untrue; updated, not weakened):

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| ORG-E2E | `tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts` | the stored Org file is the container: check its units, the Team unit's own file, the sibling unit unchanged, unit-file bytes after refused saves | the composed config reads stay compared exactly |
| RC (file) | `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` RC-07, RC-13 | an Org member's delegation names its unit run (contract §6); no link names the container | |
| RC (file) | same, RC-20 | the new signed peer request `/rest/remote/peer-run-members` (FU-003) with its exact keys | every other check unchanged |

## Durable Coverage To Remove

None.

## Live Environment And Fixture Plan

- Startup order and commands: build server → built-server suites (one at a time) → two-server suite → live suite (`RUN_LIVE…` gate, vault path passed through `capturedTestVaultSetting()`) → rendered probe (backend then Nuxt dev then Chromium).
- Environment choices that materially affect the run: clean env (`env -i PATH HOME TMPDIR`), scripted AGY `linked_skills`; live: Codex with auto-execute off for OCL-02 (data root outside `/tmp`), native AutoByteus `claude-haiku-5-5`.
- Health / readiness checks: server "listening" + GraphQL probe; Org view snapshot frame.
- Seed data / fixtures: suite-written package and released-shape fixture (hand-built).
- Test identities: none beyond the node credential the launch helper sets.
- DOM, screenshot, log, API, process evidence: JSON receipts per case, server output, probe screenshots; scanned for credentials before commit.
- Owned processes and temporary state to clean up: every spawned server, Nuxt, Chromium; temp roots.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Memory sync of contained runs | FU-001 (follow-up, excluded by design) | Low | No | FU-001 |
| macOS / x64 release jobs | need the release runner | Low | No | release runner |
| Conversion of the user's real Org run | never on real data (requirements) | Medium (shape coverage) | Yes (on upgrade) | release notes; fixtures modelled on the shapes |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| None found before execution | — | — | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the user stopping one unit is exercised through the unit run's own terminate mutation (what a unit row's Stop sends, REQ-006); the probe records whether the Org view offers a Stop on unit rows.

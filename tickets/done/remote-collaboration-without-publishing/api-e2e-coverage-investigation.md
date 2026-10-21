# API/E2E Coverage Investigation — autobyteus-245 (Remote Collaboration Without Publishing)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing/tickets/in-progress/remote-collaboration-without-publishing`

## Investigation Meta

- Requirements Doc: `…/requirements-doc.md` (approved SR-002/SR-003; text aligned at SR-005)
- Investigation Notes: `…/investigation-notes.md`
- Solution Revision Record: `…/solution-revision-record.md` (SR-005)
- Design Spec: `…/design-spec.md` (SR-005)
- Supplemental Task Artifacts: `…/follow-ups.md` (FU-001, sent)
- Design Review Report: `…/design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `…/architecture-review-revision-record.md`
- Implementation Handoff: `…/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `…/implementation-revision-record.md`
- Code Review Report: `…/code-review-report.md` (CRR-001, Pass, no findings)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `…/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: CRR-001 pass of IR-001 (code `e5d0405aef`), Medium / High
- Prior Investigation Reviewed: none for this ticket. The durable E2E comes from autobyteus-191 (its investigation and report are archived with that ticket).
- Latest Authoritative Investigation: this document, round 1

## Current Requirement And Design Basis

- Publishing is removed. With the switch on, every Agent that local `delegate_task` may target as a catalog copy is available to registered peers, at its catalog address (REQ-201).
- B resolves the target through `CollaboratorAdmission` with `NodeCatalogPort`, deciding the kind first:
  - nothing eligible at the address → `AGENT_NOT_FOUND`: "Node "<node>" has no Agent at <address> that can be delegated to.";
  - a shared Agent Team → `REMOTE_TEAMS_NOT_SUPPORTED`: "<Team> on node "<node>" is an Agent Team; Agent Teams on another node are not supported yet.";
  - an Agent with no complete default → `NO_DEFAULT_RUNTIME`: "There is no default runtime configured for the target agent <name> on node "<node>".";
  - a default that can't run there → `AGENT_CANNOT_RUN`: "The Agent <name> on node "<node>" cannot run there: <reason>".
  - Every refusal comes before `prepareAgentRun`.
- A remote run gets the Agent's default runtime, model and settings, B's temp workspace and `autoExecuteTools: true` (REQ-202, 205, 206).
- Contract: `address` replaces `publishedAddress` (DEC-206; the old field is a 400); refusals may carry `targetName`.
- A leftover `published-agents.json` is neither read nor written (REQ-208, DEC-204).
- Everything else in slice 1 is preserved (AC-208).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-201 … SCN-203.
- Real-use scenarios added:
  - RU-1: the owner of B changes or clears an Agent's default after a remote run started. New delegations follow the new default (or are refused), and the run already started keeps working. This replaces slice 1's unpublish case and is the real way an owner withdraws an Agent now.
  - RU-2: a node that ran slice 1 still has its `published-agents.json` (test and development machines, DEC-204).
- Contrived scenarios: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-201 no publish step | Changed | REQ-201, 207, 208 | E2E: no publishing set-up; leftover file ignored; publish API gone |
| BEH-202 target by catalog address | Changed | REQ-201 | E2E: eligible Agent found; built-in, Org, team-local, unknown → not found; shared Team → not supported |
| BEH-203 launch from the default; temp workspace; auto-approve | Changed | REQ-202, 205, 206 | E2E: B's `run_metadata.json` |
| BEH-204 refusals | Changed | REQ-203, 204 | E2E: the four texts; nothing on either node |
| Slice 1 behavior | Preserved | AC-208 | The rest of the two-server E2E, unchanged |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | resolver `defaults_only`, receiver, admission | IMP-02 (153 tests), IMP-03 | real catalog on a real node; real runtime availability | Two-server E2E |
| API / transport / contract | Yes | `address`, `targetName`, codes | IMP-07 (curl smoke) | the full flow through two servers | Two-server E2E |
| Frontend component / state | Yes | Remote Collaboration card | IMP-05, IMP-06 | — | Reuse; browser optional (AC-206) |
| Browser integration | Yes (card only) | the availability note | IMP-06 (observed) | none material | — |
| Persisted data | Yes (a file stops being used) | `published-agents.json` | IMP-07 (only `peers.json` written) | a leftover file on a node that has one | E2E with a leftover file |
| Distributed coordination | Yes | B's receiver | in-process A↔B (unit) | two processes | Two-server E2E |
| Desktop shell, auth, workers | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing`, branch `codex/remote-collaboration-without-publishing`
- Testing guideline: `/TESTING.md` (unchanged since autobyteus-191; same rules: current build for `dist/app.js` suites, clean environment, own data roots and ports, scripted AGY CLI)
- Required secrets: N/A (scripted runtime)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/TESTING.md` | layers and rules | build before `dist` suites; `env -i` clean environment; temp `HOME`; `RUN_AGY_FAILURE_E2E=1` with `ANTIGRAVITY_CLI_COMMAND` |
| `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | file-authored Team with a team-local Agent | `agent-teams/<id>/team.md`, `team-config.json` (`refScope: "team_local"`), `agents/<id>/agent.md`, `agent-config.json` |
| `src/agent-definition/providers/agent-definition-config.ts` | `agent-config.json` shape | `defaultLaunchConfig: {runtimeKind, llmModelIdentifier, llmConfig}` |
| `tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts` | defaults through GraphQL; unavailable runtime | `defaultLaunchConfig` on create and update; `CODEX_APP_SERVER_COMMAND` pointing at a missing file |

| Component / Dependency | Start / Setup | Readiness | Stop / Cleanup |
| --- | --- | --- | --- |
| Server build | `pnpm -C autobyteus-server-ts build` | `exit=0` | — |
| Nodes alpha and beta + proxies | spawned by the E2E (unchanged harness); beta also gets `CODEX_APP_SERVER_COMMAND=<missing path>` | `/rest/health` | `afterAll` |

| Data / Fixture Need | Creation Method | Notes | Cleanup |
| --- | --- | --- | --- |
| Shared Agents on B: Publisher (AGY default), Blank Slate (no default), Half Set (runtime only), Codex Writer (Codex default; Codex unavailable on B), Fragile (AGY with a model AGY does not offer) | GraphQL `createAgentDefinition` with `defaultLaunchConfig` | real definitions on a real node | temp root removed |
| A shared Team "Review Squad" and an Agent Org "Remote Org B" on B | GraphQL | — | — |
| A file-authored Team on B with a team-local Agent "Local Scout" (complete default) | files written into B's data root before B starts (the supported authoring path; test-owned data) | the default is complete, so a refusal can only come from eligibility | — |
| A leftover `published-agents.json` on B (publishing Blank Slate with full settings, and Publisher with another model and workspace) | written before B starts | proves it is ignored: Blank Slate is still refused; Publisher runs with its default | — |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` (`published-agents.json` never shipped; DEC-204: no reader, no writer, no migration)
- Evidence planned: a leftover file with entries that would change the result if read; the file's bytes unchanged after the run; B's settings folder written to only for `peers.json`.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Action |
| --- | --- | --- | --- | --- |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` RC-03 publishing part | publish validation, publish file, unpublish | slice 1 AC-103 (superseded) | Stale / Remove | Replace with the publish API's absence and the leftover-file check (AC-207) |
| same, RC-04 | "not published", publish, `PUBLISHED_AGENT_CANNOT_RUN` | AC-103 (superseded) | Replace | AC-202, AC-203, AC-204, AC-207 refusals |
| same, RC-05 metadata expectations | published workspace | AC-103 (superseded) | Needs Update | AC-201, AC-205: the default's runtime/model, temp workspace, auto-approve |
| same, RC-17 | unpublish → refused; running run keeps working | AC-103 (superseded) | Replace | RU-1: default cleared → `NO_DEFAULT_RUNTIME`; the running run keeps working |
| same, `inboundStart` body, RC-20 key list | `publishedAddress` | DEC-206 | Needs Update | `address` |
| same, all other cases | slice 1 behavior | AC-208 | Still Valid | Run unchanged |
| unit tests of the receiver, resolver and contract | IMP-02 | BEH-202 … 204 | Still Valid | Reuse |

## Planned Cases

Case `API-NN` is the E2E's `RC-NN`, as in autobyteus-191.

| Case ID | Criteria | Boundary | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | all | build | Existing | `pnpm -C autobyteus-server-ts build` | `dist` suites need a current build |
| API-R1 | AC-208 (unit), REQ-208 | unit | Reused | IMP-01, IMP-02, IMP-03 | at `e5d0405aef`; HEAD changes only `tickets/` after `63f6635b6d` |
| API-R2 | AC-206 | web | Reused | IMP-04, IMP-05, IMP-06 | — |
| API-01, 02 | slice 1 AC-101 | gateway, delegation | Durable (updated body) | RC-01, RC-02 | AC-208 |
| API-03 | AC-207, REQ-208, DEC-206 | settings, gateway | Durable (updated) | RC-03: registration and gateway as before; `publishedAgents` is no GraphQL field; an inbound body with `publishedAddress` is a 400 | — |
| API-04 | AC-202, AC-203, AC-204, AC-207 | B's receiver | Durable (replaced) | RC-04: every refusal text; nothing on either node; leftover file ignored and unchanged | — |
| API-05 | AC-201, AC-205, AC-207 | delegation | Durable (updated) | RC-05: Publisher runs with its default, temp workspace, auto-approve on, not the leftover file's settings | — |
| API-06 … API-16, API-18 … API-20 | slice 1 ACs (AC-208) | as slice 1 | Durable (unchanged) | RC-06 … RC-16, RC-18 … RC-20 | AC-208 |
| API-17 | RU-1 | delegation | Durable (replaced) | RC-17: Publisher's default cleared → `NO_DEFAULT_RUNTIME`; the running run still exchanges both ways | — |
| API-21 | AC-208 | same-node suites, switch on | Existing | `tests/e2e/projects`, `run-history`, `agent-team-runs`, `agent-org-runs` | the change touches the shared launch resolver (`inherited` path) |
| API-22 | AC-206 | browser | Journey | `/nodes` → Remote Collaboration on a built node with the switch on; DOM checks | added after the post-repository score (94%) to close the user-surface gap |

- Test progress log needed: `Yes`

## Durable Coverage To Add / Update / Remove

| Case ID | Path | Change |
| --- | --- | --- |
| API-03, 04, 05, 17, 20 | `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Update / replace as above; the publishing assertions are removed because their behavior is removed (REQ-208), and each is replaced by the AC-20x case that covers its successor |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User Only? | Follow-Up |
| --- | --- | --- | --- | --- |
| Agent Teams across nodes | autobyteus-247 | — | No | 247 |
| AC-206 in a browser | covered by IMP-06 and the web suite | low | No | — |

## Ambiguities Or Reroute Triggers

None at planning time.

## Investigation Decision

- Proceed: `Yes`
- Durable coverage changed: `Yes`
- Reroute required: `No`

# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results, confidence scores and the broader-validation decision are in [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md).

## Investigation Meta

- Requirements Doc: `tickets/in-progress/daily-assistant-delegation-target/requirements-doc.md` (SR-001, Approved; confirmed unchanged at SR-002)
- Investigation Notes: `tickets/in-progress/daily-assistant-delegation-target/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/daily-assistant-delegation-target/solution-revision-record.md`
- Design Spec (required on every route): `tickets/in-progress/daily-assistant-delegation-target/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable` (direct Small/Low route)
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `tickets/in-progress/daily-assistant-delegation-target/implementation-handoff.md` (IR-001, implementation commit `fbc9b3c2e9`)
- Implementation Revision Record: `tickets/in-progress/daily-assistant-delegation-target/implementation-revision-record.md`
- Code Review Report: `N/A — not applicable` (direct low-risk route skips code review)
- Code Review Revision Record: `N/A — not applicable`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `tickets/in-progress/daily-assistant-delegation-target/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: Implementation Complete (IR-001), direct route Small / Low
- Prior Investigation Reviewed: None (first round)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

The Daily Assistant (built-in, id `autobyteus-daily-assistant`) becomes an ordinary collaborator: listed by `list_available_agents` at `/daily_assistant` with its description (REQ-001/AC-001), delegable by `delegate_task` with a saved Task or a description (AC-002), its copy works where any delegated copy works (REQ-004: the Task's Project's first linked folder, else the delegating top-level run's folder; on a peer, the peer's temp workspace) and can reply to its delegator (AC-003, RSK-001/ASM-001), listed and delegable from a peer node (AC-004), offered by `@` except in its own run/draft (AC-005). The Model Router (`autobyteus-model-router`) is never a collaborator on any surface, with "Show internal agents" off or on (REQ-002, QR-001). Own-definition and in-run guards stay (REQ-003, AC-006). One eligibility owner (`CollaboratorCandidatePolicy`) decides it from a registry flag `collaborationEligible`; the web New-chat mirror is a pinned set. Persisted data: `Not Affected`.

## Supported Scenarios And Real Usage

- Designer scenarios covered (`SCN-*`): SCN-001 (PM lists), SCN-002 (PM delegates a saved Task; copy works and reports back), SCN-003 (peer lists and delegates), SCN-004 (`@` from another agent's run / New chat), SCN-005 (self / in-run delegation).
- Real-use scenarios added from investigating the implemented behavior, each with its real trigger:
  - SCN-A1: the PM gives a second Task to the Daily Assistant from the same PM run. Trigger: the PM's `delegate_task` again. The address `/daily_assistant` is then refused as already in the run (AC-006); the real path for more work is mode (3) `delegate_task(target_agent_run_id, task_id)` to the existing copy. Tested so that the user's "several Tasks for my Daily Assistant" case is known to work.
  - SCN-A2: the user has given his Daily Assistant its own runtime/model (personal setting `defaultLaunchConfig` of a built-in, the Agents page's editor, GraphQL `updateAgentDefinition`). A peer delegation needs it (a remote copy needs a default or Model Routing). Trigger: the owner's settings save, then the peer's `delegate_task`.
  - SCN-A3: the delegated Daily Assistant copy has the collaboration tool it needs to report back (`send_message_to`) although its template selects only `list_available_agents` (ASM-001). Trigger: the copy's own tool list over its scoped Agent Tools MCP endpoint (`LIST_TOOLS` in the scripted CLI).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): None recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 `list_available_agents` (local) | Changed | REQ-001/002, design DS-002 | Real tool call over scoped MCP: DA entry exact; Router absent with internal hidden and shown |
| BEH-002 `delegate_task('/daily_assistant')` local | Changed | REQ-001/004, DS-001 | Real delegation with saved Task (linked Project folder) and description (delegator folder); copy is a DA; copy replies to delegator |
| BEH-003 peer list / remote delegation | Changed | REQ-001/002/004, DS-003 | Two built server processes, paired: list shows DA, Router absent (also shown); remote delegation admitted and started in beta's temp workspace; Router refused |
| BEH-004 `@` candidates | Changed | REQ-001…003, DS-004 | Server GraphQL `collaboratorMentionCandidates` for a PM run and a DA run; `@Daily Assistant` mention admitted on a real send; web mirror by reused web unit (IMP-06) |
| BEH-005 own-definition / in-run guards | Preserved | REQ-003 | DA run: absent and refused; PM run with a DA copy: no second instance |
| Persisted data | Preserved (`Not Affected`) | design § Persisted Data | No transition case |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `CollaboratorCandidatePolicy` eligibility input; registry flag | IMP-01/02/04 unit (policy, admission, remote lister/receiver) | Real tool path (scoped MCP), copy launch/workspace, report-back | Server E2E with scripted AGY |
| API / transport / contract | Yes | Agent Tools MCP results of `list_available_agents`/`delegate_task`; GraphQL `collaboratorMentionCandidates`; peer REST `/rest/remote/available-agents`, `/rest/remote/delegated-runs` | Unit with in-memory fakes | Serialization over real transports, peer signing/pairing | Server E2E (in-process studio server; two built servers) |
| Frontend component / state | Yes (data only) | web `isCollaborationIneligibleAgentDefinitionId` set used by draft `@` eligibility | IMP-05/06/07 | Rendering uses the existing menu unchanged | Browser probe optional (see Not Tested) |
| Browser integration / user journey | Minor | One more entry in the existing `@` menu | Web unit | Real browser menu listing | Live probes (need a logged-in paid runtime CLI) |
| Authentication / session / permissions | No | Node credential unchanged | — | — | — |
| Desktop renderer / web-equivalent UI | Minor | Same as frontend | Web unit | — | — |
| Desktop shell / Electron-specific integration | No | — | — | — | — |
| Process / lifecycle | No (preserved) | Copy launch unchanged | Existing DCF suite | DA copy specifically | Covered by the E2E launch-folder check |
| Persisted-data transition | No | — | — | — | — |
| Worker / queue / distributed coordination | Yes | Peer node eligibility via the receiving node's policy | Unit lister/receiver | Real two-process peer | Two-server E2E |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-delegation-target`, branch `codex/daily-assistant-delegation-target`
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL/WebSocket server (`autobyteus-server-ts`, Node 22), Nuxt web + Electron (`autobyteus-web`)
- Project testing guideline path(s): `TESTING.md` (repository root). No closer `TESTING*.md` in `autobyteus-server-ts/` or `autobyteus-web/`.
- Conflicting, missing, or unclear project instructions: None found so far.
- Changed build-input paths: `autobyteus-server-ts/typecheck-baseline.json` (matches `**/typecheck-baseline.json`). Its only reader is `autobyteus-server-ts/scripts/typecheck.mjs`; no release workflow or the Docker build runs the server typecheck (grep of `.github/workflows/`, `autobyteus-server-ts/docker/`). The changed registry is read at build time by `build:full`'s sanitized built-in agents bootstrap smoke. Fresh-start case API-F01: fresh clone + the server Docker job's build (`--target server-package`, its own `pnpm install --frozen-lockfile` and server build) plus the server typecheck in the clone.
- Required environment variables or secrets available: `N/A` — no provider keys needed (scripted AGY runtime).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` § Test layers, Choosing the path | Layer choice | Backend/API → server tests + server E2E; one file: `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch` |
| `TESTING.md` § Environments | Isolation | Clean env for E2E: `env -i PATH HOME=<resolved temp> TMPDIR`; one heavy run at a time on the machine; build `dist/` for suites that spawn `dist/app.js` |
| `TESTING.md` § Runtimes without a model | Real delegation without providers | `ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`, `RUN_AGY_FAILURE_E2E=1`; `CALL_TOOL:{…}` drives real tools |
| `TESTING.md` § Rerun by impact | Reuse | Implementation checks on `fbc9b3c2e9`; HEAD `587ef709d0` adds only ticket files |
| `TESTING.md` § Fresh-start build | Build-input proof | Fresh clone, frozen install, job build order |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Harness | In-process studio server, own data dir, AGY roots, `calls`, `conversationOf`, `liveTree`, `mcpCall` |
| `tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts` header | Folder evidence pattern | Copy folder = run tree `workspaceRootPath` + capsule manifest `workspacePath` + CLI `--add-dir` (`AGY_FAKE_ARGV_LOG`) |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` header | Two-node suite | Needs `pnpm -C autobyteus-server-ts build` and `test:integration:prepare` (Brief Studio package); about 5 min; cases share nodes and run in order |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| In-process studio server (new suite) | `autobyteus-server-ts` | started by the harness in `beforeAll` | own temp data dir, port 0 | harness `startStudioE2eRuntimeServer` | harness `close()` terminates roots and removes the data dir |
| Two built servers alpha/beta | `autobyteus-server-ts` | suite spawns `dist/app.js` | needs current `dist/` | suite readiness | suite `afterAll` |
| Server build | repo root | `pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build` | heavy; serialized with other machines' heavy runs | `dist/app.js` exists | untracked output |
| Brief Studio package | repo root | `pnpm -C autobyteus-server-ts test:integration:prepare` | heavy | `applications/brief-studio/dist/importable-package` | untracked output |
| Fresh clone (API-F01) | new temp dir | `git clone --no-local`, Docker buildx | Docker | output folder has `dist/app.js` | remove the clone and output |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| PM-like agent with `list_available_agents`, `create_task` | GraphQL `createAgentDefinition` | test data dir only | removed with data dir |
| Daily Assistant definition | server startup bootstrap (`prepareBeforeListen` → `bootstrapBuiltInAgents`) | from the shipped template | removed with data dir |
| Project with a linked folder, saved Tasks | GraphQL `createProject`, `createProjectTask` | folders under the test data dir | removed |
| DA personal runtime/model (SCN-A2) | GraphQL `updateAgentDefinition` on beta | beta's own data root | removed with beta |
| "Show internal agents" | GraphQL `updateServerSetting(AUTOBYTEUS_SHOW_INTERNAL_AGENTS)` | per server | removed |
| Node credential / pairing | harness attaches launch credential; `pairNodes` | never printed | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-collaboration/collaborators/collaborator-admission.test.ts`, `internal-agent-eligibility.test.ts`, `tests/unit/remote-collaboration/remote-catalog-lister.test.ts`, `remote-delegation-receiver.test.ts` | New DA-eligible / Router-ineligible expectations | AC-001, 002, 004…006 | Still Valid | IMP-01 fails on base, IMP-02 passes | Reuse (API-01) |
| web `utils/collaborators/__tests__/collaborationIneligibleAgentDefinitionIds.contract.spec.ts`, `draftMentionEligibility.spec.ts` | Mirror pinned to registry; DA offered for non-DA draft, not DA draft; Router never | AC-005, QR-001 | Still Valid | IMP-06 | Reuse (API-03) |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` RC-04 | `/daily_assistant` on beta refused `AGENT_NOT_FOUND` as "a built-in" (AC-204 of autobyteus-245) | Contradicts REQ-001 / AC-004 | Needs Update | L864-865 | Move `/daily_assistant` out of the not-found cases; add `/model_router` (REQ-002) as not found |
| same, RC-26 | Exact offer of beta excludes the built-in Daily Assistant (L1827-1829); every listed address is accepted or refused only for its runtime | Contradicts REQ-001 / AC-004 | Needs Update | L1798-1829 | Expected offer includes Daily Assistant at `/daily_assistant` with its template description; Model Router not offered; DA delegation is refused only for its runtime (beta's DA has no default, routing off) |
| same, RC-38 | Beta's internal agent offered once beta shows internal agents | REQ-002 extension | Still Valid; extend | L1882+ | While beta shows internal agents, the Model Router is still not offered and `/model_router` is refused |
| `tests/e2e/projects/delegated-copy-project-folder.e2e.test.ts` (autobyteus-97) | Copy folder rule for catalog copies | REQ-004 (preserved) | Still Valid, Out Of Scope to change | — | Pattern reused in the new suite |
| `tests/e2e/agent-definitions/internal-agents.e2e.test.ts` | Shown internal agents include the Model Router in the definitions list | Not collaboration | Out Of Scope | L188-190 | None |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (VIS-011, T01, N02, N03), `chat-entry-live-probe.mjs` C03 | Assertions edited by IR-001 | AC-005 | Still Valid (edited); need a logged-in paid runtime CLI | headers | Not run in this round (see Not Tested) |
| `tests/unit/agent-tools/agent-discovery/list-available-agents-tool.test.ts` | Asserts nothing on DA absence | — | Out Of Scope | implementation handoff | None |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, 002, 004, 005, 006, QR-001 | policy / admission / remote lister+receiver units | Reused | IMP-01, IMP-02 | Ran on `fbc9b3c2e9`; `git diff --name-only fbc9b3c2e9 587ef709d0` touches only `tickets/` |
| API-02 | all server-side | whole server unit suite | Reused | IMP-04 | same commit argument |
| API-03 | AC-005, QR-001 | web mirror, contract pin, draft eligibility | Reused | IMP-06 | same commit argument |
| API-04 | — | server/web typecheck, web guards, tracked imports | Reused | IMP-03, IMP-05, IMP-07 | same commit argument; rerun of server typecheck only if test files are added (they are: new E2E file → API-09) |
| DAC-01 | AC-001, REQ-002, QR-001 | `list_available_agents` and `delegate_task('/model_router')` over the PM run's scoped MCP | Durable | new suite, see below | Real tool path, real settings switch |
| DAC-02 | AC-002, AC-003, REQ-004, ASM-001 | `delegate_task('/daily_assistant', task_id)`; copy launch folder; copy's tool list; copy `send_message_to` delegator | Durable | new suite | The user's exact scenario (saved Task, report-back) |
| DAC-03 | AC-002, AC-003, REQ-004 | description-only delegation from a second PM run; copy in the delegator's folder; reply | Durable | new suite | Second mode of AC-002 |
| DAC-04 | AC-006, REQ-003, SCN-A1 | Team run with the Daily Assistant as configured member: `/daily_assistant` no address there, refused, nothing starts; PM's mode (3) with a second saved Task to its existing copy | Durable | new suite | In-run guard with DA as target; the PM's real path for a 2nd Task. Revised after execution: delegated copies are not in-run placements (`collaborator-root-port.ts:47`), so the first plan's "PM run holding a DA copy" case was wrong (see the execution report, Round deviations) |
| DAC-05 | AC-006, REQ-003 | DA run: list omits `/daily_assistant` (and Router); `delegate_task('/daily_assistant')` refused with the own-definition text; nothing started | Durable | new suite | Own-definition guard with DA as viewer |
| DAC-06 | AC-005, REQ-002/003 | GraphQL `collaboratorMentionCandidates` for the PM run and the DA run (internal hidden/shown); a real send with `@Daily Assistant` to the PM is admitted ("[Mentioned agents]" entry) | Durable | new suite | Server `@` boundary end to end |
| RC-04u | AC-004, REQ-002 | peer delegation refusals on beta | Durable (update) | two-server suite | stale built-in assertion |
| RC-26u | AC-004, REQ-001/002 | peer offer of beta (exact list), each listed address delegable or refused only for runtime | Durable (update) | two-server suite | stale built-in assertion |
| RC-38u | AC-004, REQ-002 | beta shows internal agents: Router still not offered / refused | Durable (update) | two-server suite | Router independent of the setting across nodes |
| RC-42 | AC-004, REQ-004, AC-003 (remote), SCN-A2 | beta's owner gives its DA a runtime/model; alpha's agent delegates `/daily_assistant` on beta → started in beta's temp workspace; the remote copy replies to alpha's delegator | Durable (new case) | two-server suite | Remote admission and start, report-back across nodes |
| API-10 | AC-005, REQ-002 | real browser New chat `@` for a non-DA target, internal agents shown | Existing Test (updated) | `cd autobyteus-web && node tests/e2e/model-routing-decisions-probe.mjs --output-dir=<new dir>`; MRD-08 also asserts the Daily Assistant is offered | Added after the post-repository score (user surface 90%): scripted, no paid runtime |
| API-09 | — | server typecheck with the new/edited test files | Existing Test | `pnpm -C autobyteus-server-ts typecheck` | new test code must not grow the baseline |
| API-F01 | — | fresh clone + server Docker job build (`--target server-package`) | Durable procedure (Fresh-Start) | `git clone --no-local` → `docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --output type=local,dest=<new> .` | build input `typecheck-baseline.json` changed; registry read by build smoke |

Command for the new suite (scripted AGY, clean environment):
`env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/daily-assistant-collaborator.e2e.test.ts --no-watch`

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| DAC-01…DAC-06 | `autobyteus-server-ts/tests/e2e/projects/daily-assistant-collaborator.e2e.test.ts` | No E2E proves a built-in as a collaborator through the real tool, launch and messaging path; the user's scenario must not regress |
| RC-42 | `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` (new case) | Remote admission + start of a built-in on a real peer |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| RC-04u | two-server suite RC-04 | `/daily_assistant` removed from the not-found list; `/model_router` added | header text "built-in" → "the Model Router" |
| RC-26u | two-server suite RC-26 | Daily Assistant in the exact expected offer (template description); Model Router not offered; header text | — |
| RC-38u | two-server suite RC-38 | Router absent and refused while beta shows internal agents | — |
| API-10 | `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs` MRD-08 | also assert the Daily Assistant is offered in New chat `@` for the Manager target | already asserts the Router is never offered |

## Durable Coverage To Remove

None. (The assertion "a built-in is not offered/delegable" is replaced in place by the Model Router assertion: RC-04u/RC-26u.)

## Live Environment And Fixture Plan

- Startup order and commands: (1) `pnpm -C autobyteus-server-ts prebuild`, `build`, `test:integration:prepare` (for the two-server suite); (2) new suite (in-process server); (3) two-server suite (spawns alpha and beta from `dist/app.js`); (4) fresh-start build in a new clone.
- Environment choices that materially affect the run: clean `env -i` with a resolved temp `HOME`; scripted AGY CLI (`linked_skills`), so no provider calls and no user CLI state.
- Health / readiness checks: harness and suite readiness (GraphQL, WS `CONNECTED`, snapshots).
- Seed data / fixtures: definitions, Projects, Tasks, settings created through GraphQL.
- Test identities: launch owner credential attached by the harness; pairing by invite in the two-server suite. Never printed.
- Requirement-linked journeys: DAC-01…06, RC-04u/26u/38u/42.
- Evidence to capture: JSON receipts (`DA_COLLABORATOR_E2E_EVIDENCE_DIR`, `REMOTE_E2E_EVIDENCE_DIR`), vitest output.
- Owned processes and temporary state to clean up: harness data dir, alpha/beta processes and data roots, fresh clone and build output.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Live browser `@` probes (`cross-scope-agent-mentions-live-probe`, `chat-entry-live-probe` C03) | Need a logged-in paid runtime CLI (Claude/Codex) and real inference per case; the change adds one entry to an unchanged menu, proven at the server GraphQL boundary (DAC-06), in web unit (API-03) and in a real browser New chat by the scripted probe (API-10) | Low | No | None |
| A real model deciding to report back | Scripted runtime proves the copy has the tool and the message is delivered; whether a model chooses to call it is model behavior, not this change | Low | Partly (the user's real delegation) | Delivery may tell the user |
| Docker peer nodes listing their own DA | Needs a released server image (requirements: External Contracts) | Known | No | Release |

## Ambiguities Or Reroute Triggers

None at planning time. Triggers: a DA copy that cannot reply to its delegator (RSK-001) → `Design Impact` to the Solution Designer.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: new suite and RC-42; updated: RC-04, RC-26, RC-38)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: implementation checks IMP-01…07 reused (same code).

# API/E2E Execution Coverage Report

The run record and the result. The plan is [api-e2e-coverage-investigation.md](api-e2e-coverage-investigation.md); the history is [api-e2e-revision-record.md](api-e2e-revision-record.md).

## Round

- Coverage investigation: `tickets/in-progress/daily-assistant-delegation-target/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `tickets/in-progress/daily-assistant-delegation-target/api-e2e-test-progress.md`
- Round and trigger: Round 1, Implementation Complete IR-001 (direct Small/Low route)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  1. DAC-04 changed after its first two runs. The plan assumed that a PM run already holding a delegated Daily Assistant copy refuses `/daily_assistant` again. The existing design says otherwise: delegated copies are not in-run placements (`collaborator-root-port.ts:47`, "Delegated copies are not placements."), and the `delegate_task` contract says every call with an address creates another task agent. Any agent's repeated delegation by address starts a new copy. DAC-04 now proves the in-run guard where it applies (a Team whose configured member `/mate` is the Daily Assistant: `/daily_assistant` is no address there and is refused, nothing starts) and the PM's real path for a second Task (mode 3: `target_agent_run_id` + `task_id` to the existing copy). This matches the unit proof the requirement names for AC-006 (`collaborator-admission.test.ts`, `configuredAgents: [Daily Assistant]`).
  2. Added API-10, a broader browser case not in the plan. The scripted `model-routing-decisions-probe.mjs` MRD-08 already opens a real New chat `@` menu for a non-DA target with internal agents shown. It now also asserts that the Daily Assistant is offered there (AC-005 in a real browser, no paid runtime).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/daily-assistant-delegation-target/tickets/in-progress/daily-assistant-delegation-target/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | source `fbc9b3c2e9` (+ test files of `c4f004d7fc`) | macOS (Darwin 25.5, arm64), Node v22.23.1 | In-process Studio server (`startStudioE2eRuntimeServer`), scripted AGY CLI `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | `env -i PATH HOME=<resolved temp> TMPDIR`; own temp data dir; Daily Assistant bootstrapped from the shipped template at startup; no provider keys |
| ENV-2 | `dist/` built from `fbc9b3c2e9` source (`prebuild`, `build`, `test:integration:prepare`) | same | Two built servers alpha/beta (`dist/app.js`) paired by invite, capturing proxies, scripted AGY; gamma/delta/epsilon for RC-27 | own data roots and HOMEs; beta has Brief Studio loaded |
| ENV-3 | `c4f004d7fc` | same, Docker 29.0.1 (linux/arm64 builder) | Fresh `git clone --no-local`, `docker buildx … --target server-package` | no build output in the clone |
| ENV-4 | `dist/` of ENV-2 + web of `c4f004d7fc` (+ probe edit) | same | `model-routing-decisions-probe.mjs`: two built servers, Nuxt dev, headless Chrome, scripted AGY | probe-owned temp root |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, 002, 004, 005, 006, QR-001 | policy, admission, remote lister/receiver (unit) | Reused `IMP-01`, `IMP-02` | — | Pass | (implementation handoff) | — | Ran on `fbc9b3c2e9`; `git diff --name-only fbc9b3c2e9 587ef709d0` touches only `tickets/`; my commit `c4f004d7fc` adds only E2E files |
| API-02 | all server-side | whole server unit suite | Reused `IMP-04` | — | Pass | (implementation handoff) | — | same reason |
| API-03 | AC-005, QR-001 | web mirror, contract pin, draft `@` eligibility and its callers | Reused `IMP-06` | — | Pass | (implementation handoff) | — | same reason |
| API-04 | — | web typecheck, web guards, tracked imports | Reused `IMP-05`, `IMP-07` | — | Pass | (implementation handoff) | — | same reason; server typecheck rerun as API-09 because test files were added |
| DAC-01 | AC-001, REQ-002, QR-001 | PM run's `list_available_agents` and `delegate_task('/model_router')` over its scoped Agent Tools MCP; `updateServerSetting(AUTOBYTEUS_SHOW_INTERNAL_AGENTS)` | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs DA_COLLABORATOR_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/daily-assistant-collaborator.e2e.test.ts --no-watch --reporter=verbose` (repo root) | ENV-1 | Pass | `DAC-suite-pass.log`, `DAC-suite-results.json` (`DAC-01`) | log: `✓ … DAC-01: the PM lists the Daily Assistant at /daily_assistant`; JSON `"address": "/daily_assistant"`, `"description": "General-purpose agent for practical tasks, with awareness of available specialist agents and teams."` under both `shown=false` and `shown=true`; `modelRouterDelegation` `"'/model_router' is not the address of an available agent or agent team. …"` | Agents list with internal shown: `["Daily Assistant", "DAC Helper …"]`, no Model Router |
| DAC-02 | AC-002, AC-003, REQ-004, ASM-001 | PM's `delegate_task('/daily_assistant', task_id)` of a saved Task in a Project linked to F; copy prompt, launch folder (run tree, capsule manifest, CLI `--add-dir`), copy's Agent Tools (`LIST_TOOLS`), copy's `send_message_to` to the PM by run id | same command | ENV-1 | Pass | `DAC-suite-pass.log`, `DAC-suite-results.json` (`DAC-02`) | `"delegated": true`, `"target_agent_run_id": "daily_assistant_…"`; `launch` `recorded`/`capsule`/`addDirs` all `…/project-folder-F`; `reply` `"code": "DELIVERED"`; `receivedAtPm` `You received a message from the agent with sender run id "daily_assistant_…"` … `Task done. DA-REPORT-…`; `copyTools` contains `"send_message_to"`, `"delegate_task"` | The Task's own text made the copy report on receipt (scripted). The copy's prompt starts with the template's "You are Daily Assistant, a general-purpose agent" |
| DAC-03 | AC-002, AC-003, REQ-004 | second PM run: description-only `delegate_task('/daily_assistant')` | same command | ENV-1 | Pass | `DAC-suite-results.json` (`DAC-03`) | `"task_id": "ad_hoc_task_…"`; `launch.capsule` = `…/workspace` (the PM's folder); `receivedAtPm` `Ad-hoc done. DA-ADHOC-…` | — |
| DAC-04 | AC-006, REQ-003, SCN-A1 | Team run with members manager + Daily Assistant (`/mate`): list and `delegate_task('/daily_assistant')`; PM's mode (3) second Task to the existing copy | same command | ENV-1 | Pass | `DAC-suite-results.json` (`DAC-04`), `DAC-suite-first-runs.log` | `teamList` has `"Daily Assistant"` at `"/mate"`, none at `/daily_assistant`; `refused` `"'/daily_assistant' is not the address of an available agent or agent team. …"`; `second` `"delegated": true` with the DAC-02 copy's run id | Two earlier runs failed on test assumptions (Round deviations 1); no product change |
| DAC-05 | AC-006, REQ-003 | Daily Assistant run (template `toolNames` incl. `list_available_agents`): list and `delegate_task('/daily_assistant')` | same command | ENV-1 | Pass | `DAC-suite-results.json` (`DAC-05`) | agents addresses `["/dac_project_manager_…", "/dac_helper_…", "/dac_team_…"]`; `refused` `"code": "COLLABORATION_SELF_TARGET_REJECTED"` | Refusal text is the existing self-target text for any standalone run's own address ("…is in your own team; you can't delegate to it…") |
| DAC-06 | AC-005, REQ-002, REQ-003 | GraphQL `collaboratorMentionCandidates` (PM run, DA run; internal hidden/shown); real send to a PM run with mention `{kind: agent, definition_id: autobyteus-daily-assistant}` | same command | ENV-1 | Pass | `DAC-suite-results.json` (`DAC-06`) | `views.shown=true.pm` contains `"autobyteus-daily-assistant"`, `.da` does not; no `autobyteus-model-router` anywhere; `stored` `[Mentioned agents]` / `- Daily Assistant (agent) at /daily_assistant: delegate the task to it with delegate_task` | — |
| DAC-base | (regression sensitivity) | same suite with base `collaborator-candidate-policy.ts` + `built-in-agent-registry.ts` from `310fc27452` | same command after `git show 310fc27452:<file> > <file>`; restored with `git checkout --` | ENV-1 | Pass (5 of 6 cases fail on base, as intended) | `DAC-suite-on-base.log` | `Tests  5 failed \| 1 passed (6)`; DAC-05 passes on base (preserved guard) | Proves the suite catches the original bug |
| RC-04u | AC-004, REQ-002 | alpha → beta `delegate_task` refusals (beta's receiver, `/rest/remote/delegated-runs`) | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" REMOTE_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch --reporter=verbose` (repo root; full suite, 42 cases in order) | ENV-2 | Pass | `RC-two-server-suite.log`, `RC-two-server-receipt-excerpt.json` (`RC-04`) | `/model_router` answer `"code": "AGENT_NOT_FOUND"`, text `Node "beta-node" has no Agent or Agent Team at /model_router that can be delegated to. …` | Replaced the stale `/daily_assistant` not-found row |
| RC-26u | AC-004, REQ-001, REQ-002 | alpha agent's `list_available_agents {node: beta}` (exact offer), the wire answer of `/rest/remote/available-agents`, alpha's Nodes-page `peerNodeOffer`, `delegate_task` to every listed address | same command | ENV-2 | Pass | same (`RC-26`) | `offer` contains `{"name": "Daily Assistant", "kind": "agent", "address": "/daily_assistant", "description": "General-purpose agent …"}`; no Model Router; `delegations["/daily_assistant"]` `There is no default runtime configured for the target agent Daily Assistant on node "beta-node", and Model Routing is off …` | Beta's Daily Assistant has no runtime/model of its own here, so it is admitted and refused only for that, like Blank Slate |
| RC-38u | AC-004, REQ-002 | beta shows internal agents: alpha's offer and `delegate_task('/model_router')` | same command | ENV-2 | Pass | same (`RC-38`) | `shownOffer` names include `Hidden Helper` and `Daily Assistant`, not `Model Router`; `routerWhileShown` `Node "beta-node" has no Agent or Agent Team at /model_router …` | — |
| RC-42 | AC-004, REQ-004, AC-003 (across nodes), SCN-A2 | beta's owner `updateAgentDefinition` (Daily Assistant `defaultLaunchConfig`); alpha's agent lists and `delegate_task {node: beta, recipient_address: /daily_assistant}`; beta's run metadata; the copy's report to alpha | same command | ENV-2 | Pass | same (`RC-42`) | `saved.personalSettings` `["DEFAULT_LAUNCH_CONFIG"]`; `delegated` `"delegated": true, … "node": "beta-node"`; `metadata.agentDefinitionId` `autobyteus-daily-assistant`, `workspaceRootPath` `…/beta/data/temp_workspace`; `received` `You received a message from the agent with sender run id "daily_assistant_…" on node "beta-node".` / `Done. Marker DA-REMOTE-REPORT.` | Suite cleanup receipt `{"rootRemoved": true, "serversStopped": true, "leftoverAgy": [], "errors": []}` |
| API-09 | — | server typecheck incl. the new and edited test files | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-09-server-typecheck.log` | `production errors: 0; test-file errors: 1181 in 365 files (baseline 1181 in 365 files)` | No new test-file errors |
| API-F01 | — (build input `typecheck-baseline.json`; registry read by the build smoke) | fresh clone + the server Docker job's build stage (`Dockerfile.monorepo` builder: `pnpm install --frozen-lockfile`, contract builds, Prisma, `pnpm -C autobyteus-server-ts build` incl. the sanitized built-in agents bootstrap smoke, mobile web, deploy) | `git clone -q --no-local <worktree> <tmp>/clone && cd <tmp>/clone && git checkout c4f004d7fc && docker buildx build -f autobyteus-server-ts/docker/Dockerfile.monorepo --target server-package --output type=local,dest=<tmp>/out .` | ENV-3 | Pass | `API-F01-fresh-start-build.log` | `#22 [builder 14/30] RUN pnpm install --frozen-lockfile` (not CACHED); `Built-in agents bootstrap smoke check passed.`; `dist/built-in-agents/built-in-agent-registry.js contains: collaborationEligible: true collaborationEligible: false` | The changed baseline's only reader (`scripts/typecheck.mjs`) runs in no release job; it ran in API-09. Desktop packaging, signing and other OS runners: not tested (need the runner); the change adds no desktop build input. Clone and output removed |
| API-10 | AC-005, REQ-002 | real browser New chat `@` menu for a non-DA target (Manager) with internal agents shown; real Nuxt dev, two built servers, scripted AGY | `cd autobyteus-web && node tests/e2e/model-routing-decisions-probe.mjs --output-dir=<new dir>` (MRD-08 now also asserts the Daily Assistant is offered) | ENV-4 | Pass | `API-10-mrd-probe-result.json`, `API-10-mrd-probe.log`, `API-10-new-chat-mentions.png` | JSON `newChatMentions.options` `["autobyteus-daily-assistant", "lead", "writer", "studio"]`, `filteredModel` `[]`; log `Pass MRD-08 … the Daily Assistant is offered (autobyteus-455 AC-005)`; `Model Routing decisions probe: Pass`; screenshot: `@Model` → "No agents or teams match" | All 8 probe cases passed, no browser errors (MRD-07); cleanup `tempRoot: removed`, servers and frontend terminated |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (PM lists DA at `/daily_assistant` with its description; no Model Router, also with internal shown) | Yes | DAC-01 (real tool over scoped MCP, both settings), API-01 | Proven | — |
| AC-002 (delegate saved Task and description → DA copy works the Task in the REQ-004 folder; `/model_router` refused) | Yes | DAC-02 (saved Task: copy is a DA, in the Project's linked folder F by run tree, capsule and CLI `--add-dir`), DAC-03 (description: in the delegating run's folder), DAC-01 (Router refused), API-01 | Proven | — |
| AC-003 (copy replies to its delegator) | Yes | DAC-02 (copy has `send_message_to`; `DELIVERED`; PM receives `Task done. DA-REPORT-…`), DAC-03, RC-42 (across nodes) | Proven | Whether a real model chooses to send its report is general model behavior, not this change; the tool, its delivery and the copy's prompt are proven. The user's own delegation of miscellaneous-1 is the real-model run |
| AC-004 (peer lists DA; remote delegation admitted; Router absent/refused) | Yes | RC-26u (exact offer, wire answer, Nodes page; DA admitted and refused only for no runtime), RC-42 (with a runtime: started in beta's temp workspace, reports back), RC-04u and RC-38u (Router refused; absent also while shown), API-01 | Proven | — |
| AC-005 (`@` offers DA in non-DA run and New chat; not in DA run/draft; Router never) | Yes | DAC-06 (server candidates for PM and DA runs, both settings; `@Daily Assistant` send admitted), API-10 (real browser New chat for a non-DA target), API-03 (web draft eligibility incl. DA draft, mirror contract) | Proven | — |
| AC-006 (own definition absent and refused; no second instance in a run holding a DA) | Yes | DAC-05 (DA run), DAC-04 (Team with a DA member), API-01 | Proven | Note: "a run that already contains a DA copy" is read as the run's configured placements, as the requirement's named unit proof does; a delegated copy is not a placement in the existing design, so a repeated delegation by address starts another copy for every agent alike (Round deviation 1) |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 96% | DAC-01…06, RC-04u/26u/38u/42, API-01, API-03, API-10 | AC-003 with a real model's own decision to report | The user's real delegation |
| Changed-boundary execution directness | 96% | 96% | The one changed predicate exercised through every caller: scoped MCP tools, GraphQL candidates, `@` send admission, peer REST list and delegation | None material | — |
| Cross-boundary integration realism and mock gap | 93% | 93% | Real CLI→MCP→server path, real Project/Task services, real copy launch, two real paired processes; only inference is scripted | A real model's tool choice | A paid live run (not needed for the changed policy, TESTING.md Gates) |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | DA bootstrapped from the shipped template; built `dist/`; owner credential and peer pairing; personal setting via the real API; fresh-clone release build (API-F01) | Not the desktop app or a Docker peer image | Isolated desktop instance after release build |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | Router refused locally and on a peer with internal hidden/shown; own-definition; Team in-run; peer DA without a runtime; DAC-base sensitivity | — | — |
| User-surface, browser, and desktop-shell confidence | 90% | 93% | API-03 (web unit), DAC-06 (server `@` data), API-10 (real browser New chat `@`) | Live-run `@` menu and a DA draft not rendered in a browser (data proven by DAC-06 and API-03; menu component unchanged) | Live probes with a logged-in paid runtime CLI |
| Durable regression coverage quality and relevance | 97% | 97% | New suite fails 5/6 on base (DAC-base); stale two-node assertions replaced; MRD-08 extended | — | — |

- Overall post-repository confidence: 94.4% (before API-10)
- Overall final confidence: 95.0%
- Calculation method: simple average of the seven categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: real-model report-back choice (general delegated-copy behavior); `@` rendering in a live run not seen in a browser (unchanged component, data proven)

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Browser` (API-10), plus `Worker or Distributed` two-node runs (RC cases) and a fresh-start release build (API-F01)
- Confidence gap or residual risk it addresses, and the expected gain: after the repository-resident E2E the user surface was at 90% (unit and server data only); a real browser New chat `@` for a non-DA target closes the rendered-menu gap for the changed web mirror (+3)
- Browser validation needed, and why or why not: yes, once and narrowly: the web change only alters which ids the New chat mirror rejects; a scripted probe already drives that menu without paid inference
- If `Not Required`: N/A
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the old web `isBuiltInAgentDefinitionId` and the all-built-ins set are gone; no alias)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/daily-assistant-collaborator.e2e.test.ts` | Added | DAC-01…06 | — |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (RC-04, RC-26, RC-38, header) and Added (RC-42) | RC-04u, RC-26u, RC-38u, RC-42 | The assertions "a built-in is refused / not offered" were replaced in place by the Model Router (REQ-001/REQ-002 make the old ones wrong) |
| `autobyteus-web/tests/e2e/model-routing-decisions-probe.mjs` | Updated (MRD-08 asserts the Daily Assistant is offered) | API-10 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Model inference of agent runs | Scripted AGY CLI (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`): `CALL_TOOL:{…}` calls the real tool over the run's scoped MCP; `LIST_TOOLS` lists them | The change is server eligibility; TESTING.md: real-provider runs only when the change needs them | An agent's own decision to call a tool is not exercised |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| In-process Studio servers and temp data dirs (new suite) | Yes | harness `close()` terminates roots, removes the data dir; argv log dir removed | Done (suite passed its owned-cleanup expectation) |
| Two-server suite nodes and roots | Yes | suite `afterAll` | Receipt `{"rootRemoved": true, "serversStopped": true, "leftoverAgy": [], "errors": []}` |
| DAC-base source swap | Yes | `git checkout --` of the two files | `git status` clean for `autobyteus-server-ts/src` |
| Fresh clone and Docker output under `/tmp/da455-fresh.*` | Yes | `rm -rf` | Removed |
| Probe output dir, Nuxt, Chrome, alpha/beta | Yes | probe cleanup; output copied to evidence, then removed | `tempRoot: removed`, processes terminated |
| Worktree build outputs (`autobyteus-server-ts/dist`, SDK `dist/`, Brief Studio package) | Yes | kept (untracked, not committed) for later rounds | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): None not proven. AC-003 by a real model is exercised by the user's own delegation (see the Acceptance-Criteria Proof).
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: `/software_engineering_team/delivery_engineer` (direct Small/Low route, no test-code review)
- Notes:
  - RSK-001 / ASM-001 hold: a delegated Daily Assistant copy has `send_message_to` and `delegate_task` over its Agent Tools (its template selects only `list_available_agents` of them), and its message reaches its delegator, locally and across nodes. No Design Impact.
  - For the user's case: the PM's `delegate_task('/daily_assistant', task_id)` works; more Tasks for the same copy go by its run id (mode 3, DAC-04); another `delegate_task` by address starts another Daily Assistant copy, as for every agent.
  - A peer delegation to a node's Daily Assistant needs a runtime and model for it on that node (its personal setting) or Model Routing on, like any agent (RC-26u, RC-42). Docker peers list their own Daily Assistant only once they run a release with this change.
  - Follow-up FU-001 (non-urgent, `follow-ups.md`): the self-target refusal wording for a standalone run's own address.

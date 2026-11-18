# API/E2E Execution Coverage Report — autobyteus-308 (internal agents)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, Implementation Complete (IR-001, direct route) from `/software_engineering_team/implementation_engineer`
- Prior round reviewed: none
- Deviations from the investigation's plan, and why:
  - API-07 (`list_agent_definitions` by a live agent) could not run as planned: the tool is registered on no node (pre-existing; FU-001). Recorded as Not Tested, with the cause.
  - API-08 also checks that opening a hidden agent's run does not add it to the list the pickers read (found while reading the pickers' sources for RSK-001).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/internal-agents/tickets/in-progress/internal-agents/evidence/api-e2e/` (the handoff gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `692e884b77` (code `813f7208d2`) + this round's tests | macOS darwin 25.5, Node v22.23.1 | in-process studio server (vitest); scripted AGY CLI (`agy-failure-cli.mjs`, `linked_skills`) for real agent tool calls without a model | `env -i`; disposable HOME; test-owned data root; synthesized internal agent as files before start |
| ENV-2 | same, `dist` built from it | same | two built nodes (alpha, beta) of the two-server E2E | beta has a file-authored internal agent; setting changed on beta through its GraphQL |
| ENV-3 | same `dist` | same | built node + Nuxt dev + headless Chrome 1440×1000 | en and zh-CN |
| ENV-4 | same `dist` | same | built node, AutoByteus runtime, LM Studio `qwen/qwen3.6-35b-a3b` | local model, unloaded after |
| ENV-5 | `17a6904e70` in a fresh clone `/tmp/ia-clean` | same | clean clone, documented setup | removed after |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | AC-001…007 unit/web | unit, component, guards | Reused IMP-01, IMP-02, IMP-03, IMP-04 | (handoff) | Pass | (handoff) | (handoff) | `git diff --name-only 813f7208d2 692e884b77` = `tickets/` only |
| API-01 (IA-01) | AC-001, AC-005, AC-007, REQ-008 | GraphQL on a real studio server | `env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/internal-agents.e2e.test.ts --no-watch` | ENV-1 | Pass | `API-01-05-internal-agents-e2e.log` | `Tests  5 passed (5)` (2 consecutive runs, and again in API-10) | hidden by default, normal agents `internal: false`, by ID `{"id":"e2e-internal-helper",…,"internal":true}`, shown after `updateServerSetting`, hidden again |
| API-02 (IA-02) | AC-006, persisted data | GraphQL update + file on disk | same file | ENV-1 | Pass | same | `✓ IA-02` | the internal agent's `agent-config.json` keeps `"internal": true`; a saved normal agent's file has no `internal` key |
| API-03 (IA-03) | AC-002, REQ-008 | real recorded run (scripted AGY), run history, Memory page, run by ID | same file | ENV-1 | Pass | same | `✓ IA-03 … 503ms` | the run and the agent's reply recorded; absent from `listWorkspaceRunHistory`, `listAgentsWithMemory`, its per-agent run list and the unattributed list; `getRunProjection` opens it; present once shown |
| API-04 (IA-04) | AC-003, AC-005 | an agent's real tool calls over Agent Tools MCP; `@` candidates; `@` by ID over the WebSocket | same file | ENV-1 | Pass | same | `✓ IA-04 … 885ms` | hidden: `list_available_agents` leaves it out; `delegate_task` → "is not the address of an available agent or agent team", nothing started; not an `@` candidate; an `@` mention → `accepted: false`, `COLLABORATOR_ADD_FAILED`, "'e2e-internal-helper' is not a shared Agent that can be mentioned."; shown (same live run, no restart): listed at `/e2e_internal_helper`, a candidate, mention accepted, `delegated: true`; hidden again: refused again |
| API-05 (IA-05) | REQ-002 | setting by mutation and by environment | same file | ENV-1 | Pass | same | `✓ IA-05` | `"yes"` → "Show internal agents must be true or false."; `AUTOBYTEUS_SHOW_INTERNAL_AGENTS=true` in the environment alone shows it (list and run history) |
| API-06 (RC-38, RC-26) | AC-003 peer, AC-005 peer | two real nodes over the peer protocol | `env -i … RUN_AGY_FAILURE_E2E=1 REMOTE_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-06-two-server-e2e.log`, `API-06-two-server-receipt.json` (RC-38 record) | `Tests  38 passed (38)`; RC-38 `hiddenOffer` without Hidden Helper, `shownOffer` with `{"name":"Hidden Helper","kind":"agent","address":"/hidden_helper",…}` | RC-26's exact offer of beta holds with the internal agent present; hidden: not offered, not on alpha's Nodes page, delegation refused with today's not-found text; shown (no restart): offered, accepted; hidden again: refused |
| API-07 | AC-004 | live AutoByteus agent with `list_agent_definitions` | `node list-agent-definitions-live.mjs <worktree> <out>` (copy `API-07-list-agent-definitions-live.mjs.txt`) | ENV-4 | Not Tested | `API-07-list-agent-definitions-live.log` | the agent: "I don't have a "list_agent_definitions" tool available"; `git grep` shows `registerAgentManagementTools` without a caller, also on base | The tool is registered on no node (pre-existing since `b1c89884e6`): FU-001. AC-004's filter is proven at code level (API-00/IMP-03, and API-10 in a clean clone) |
| API-08 | AC-001, AC-005 UI, REQ-003, REQ-004, REQ-007, REQ-008 UI, SCN-A1 | real stack page | `node autobyteus-web/tests/e2e/internal-agents-probe.mjs --skip-server-build` (`pnpm -C autobyteus-web test:e2e:internal-agents`) | ENV-3 | Pass | `API-08-internal-agents-probe/API-08-probe-summary.log`, `result.json`, `IP-*.png` | `Pass IP-01` … `Pass IP-05`; `browserErrors: []`; `IP-01-featured: ["Select an agent","Daily Assistant","Probe Normal …"]`; badge `{"text":"Internal",…}` | hidden: Agents page, store (every picker's list), featured picker, history panel leave it out; its run opens by URL with the reply and does not enter the store; toggled on: saved, shown with the badge, in the featured picker and history, no reload; off again: gone, no reload; zh-CN card. Runs 1–2 failed on probe harness issues (fixed) |
| API-09 | regression | 15 existing E2E files | see evidence header | ENV-1 | Pass | `API-09-regression-e2e.log` | `Test Files  15 passed (15)`, `Tests  79 passed (79)` | agent definitions, packages live refresh, Memory page, run history, collaboration contract, ad-hoc delegation, server settings |
| API-10 | Task: clean-clone proof | fresh clone | `git clone --branch codex/internal-agents --single-branch <repo> /tmp/ia-clean`; install, `autobyteus-ts` build, prebuild, `nuxt prepare`; typecheck; 6 focused unit files; 2 web specs; the new E2E | ENV-5 | Pass | `API-10-clean-clone-proof.log` | `typecheck exit 0`; `Tests  73 passed (73)`; `Tests  9 passed (9)`; `Tests  5 passed (5)` | clone removed after |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result | User-only part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01, API-08, API-00 | Proven | — |
| AC-002 | Yes | API-03, API-08 | Proven | — |
| AC-003 | Yes | API-04 (local), API-06 (peer) | Proven | — |
| AC-004 | No (REQ-006 Should) | API-00 / API-10 (the tool's filter) | Proven at code level; not reachable by any agent (FU-001) | — |
| AC-005 | Yes | API-01, API-03, API-04, API-06, API-08 | Proven (the requirement's "user check" was done on the real stack; the user may look again in their own app) | — |
| AC-006 | Yes | API-02 | Proven | — |
| AC-007 | Yes | API-01, API-09 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Supports | Residual | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 95% | 95% | every critical AC directly proven | AC-004 only at code level (tool unregistered, pre-existing) | FU-001 |
| Changed-boundary execution directness | 95% | 95% | real HTTP/WS/MCP, real runs, real peer protocol, real page | — | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | scripted AGY executes the real tools; two real nodes; real browser | no inference model chooses the calls (not relevant to the rule) | — |
| Environment, configuration, identity, fixture fidelity | 95% | 95% | synthesized agent installed as files (Task constraint); env and Settings paths; clean clone | — | — |
| Failure, edge-case, lifecycle, recovery | 95% | 95% | invalid value, env path, toggling back, refusal texts, peer | — | — |
| User-surface, browser, desktop-shell | 90% | 95% | API-08 incl. the store every picker reads and the store-after-open check; pickers' sources read (all read the store; nothing adds by ID) | team/Org/run-target pickers not rendered one by one | — |
| Durable regression coverage | 95% | 95% | new E2E file, RC-38, probe; ran in a clean clone | — | — |

- Overall post-repository confidence: 94.3%
- Overall final confidence: 95%
- Calculation method: simple average
- Every critical AC directly proven: `Yes`
- Any final category below 90%: `No`
- Target met: `Yes`
- Residual risks: FU-001; the application resolver observation (handoff Known Risks) remains for autobyteus-32.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed): `Browser` (API-08), `Worker or Distributed` (two nodes, API-06), `Live API` (API-07), `Other` (clean clone, API-10).
- Gap addressed: served surfaces with real runs and tool calls, the peer, the UI refresh and pickers, the clean-clone proof.

## Desktop Application Validation (When Applicable)

- Web-equivalent renderer proven by API-08; no shell change. Effect on the user's running app: `None`.

## Persisted-Data Transition Checks

- Decision: `Directly Usable — No Migration`. Existing-form agents (no key) listed unchanged and saved without a key (API-01, API-02, API-09). No migration, no dual path observed.

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`. Compatibility-only coverage: `No`.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs |
| --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-definitions/internal-agents.e2e.test.ts` | Added | API-01…05 |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated: beta's file-authored internal agent; RC-38 | API-06 |
| `autobyteus-web/tests/e2e/internal-agents-probe.mjs`, `autobyteus-web/package.json` (`test:e2e:internal-agents`) | Added | API-08 |

- Test-code review: `Not Required — direct low-risk route`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Agent runtime CLI | scripted AGY CLI (the project's documented fixture for real tool calls without a model) | deterministic, no account | no model decides; the tools, sessions and refusals are real |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| In-process servers, disposable HOMEs, data roots | Yes | test `afterAll` | removed |
| Two-server nodes and proxies | Yes | the file's cleanup | 38/38 incl. cleanup; evidence dir copied |
| Probe stacks (4 runs) | Yes | probe `finally` | `tempRoot: removed`, processes terminated |
| Live node for API-07 (3 runs) | Yes | process group stop, root removed | removed |
| LM Studio model | Yes | `lms unload --all` | unloaded |
| Clean clone `/tmp/ia-clean` | Yes | `rm -rf` | removed |
| `/Users/normy/autobyteus-worktrees/internal-agent-frontend-visibility` | No | not touched | — |

## Observations (no finding)

- O-1: a hidden agent's run opened by URL shows a generic "A" avatar in the header and on the reply, since the agent isn't in the client's list; the conversation renders (`IP-02-hidden-run-opened-by-url.png`).
- O-2: an `@` mention of a hidden agent is refused with code `COLLABORATOR_ADD_FAILED` (today's wrapping of an ineligible mention), reason "'<id>' is not a shared Agent that can be mentioned." The handoff named `COLLABORATOR_MENTION_INVALID`, the policy's inner code.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: AC-004 is proven only at code level, because the tool is unreachable (FU-001).
- Next recipient from `get_handoff_rules`: delivery engineer (direct route).

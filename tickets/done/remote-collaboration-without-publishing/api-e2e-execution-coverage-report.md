# API/E2E Execution Coverage Report — autobyteus-245 (Remote Collaboration Without Publishing)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-collaboration-without-publishing/tickets/in-progress/remote-collaboration-without-publishing`. Evidence is in `…/evidence/api-e2e/`.

## Round

- Coverage investigation: `…/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `…/api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `…/api-e2e-test-progress.md`
- Round and trigger: round 1, from CRR-001 (Pass, no findings) of IR-001, code `e5d0405aef`
- Prior round reviewed: none for this ticket
- Deviations from the investigation's plan: API-22 (AC-206 in a browser) was planned as not needed. The first scorecard came out at 94%, held down by the card render, so I ran it to close that gap.
- Evidence folder: `…/evidence/api-e2e/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (the two-server E2E was rewritten for this ticket)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `e5d0405aef`, plus the rewritten E2E file (committed with this report) | macOS 26.5.2 (Darwin 25.5), Node v22.23.1 | `autobyteus-server-ts/dist` built at API-00 | Two server processes `node dist/app.js` on temp data roots, HOMEs and ports. Clean environment (`env -i PATH HOME TMPDIR`) and capturing proxies, as in autobyteus-191. Scripted AGY CLI (`linked_skills`). Beta also has `CODEX_APP_SERVER_COMMAND=<a missing file>`. Before beta starts, its data root gets a file-authored Team with the team-local Agent "Local Scout" and a leftover `published-agents.json`. |
| ENV-3 | `e5d0405aef` | as ENV-1; agent browser tool (Chromium) | one built node (switch on) + `nuxt dev` of `autobyteus-web` against it | temp data root; torn down afterwards |
| ENV-2 | `e5d0405aef` | as ENV-1 | in-process E2E servers (vitest) | `RUN_AGY_FAILURE_E2E=1`, `ENABLE_REMOTE_COLLABORATION=true`, clean environment |

## Cases

`API-NN` is the E2E case `RC-NN` in `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`. Command, from `autobyteus-server-ts`: `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/tests/fixtures/agy-failure-cli.mjs" REMOTE_E2E_EVIDENCE_DIR=<dir> ./node_modules/.bin/vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch`.

Runs:
- run 1: 20/20 (`API-run1.log`, receipt `API-run1/remote-two-server-receipt.json`);
- run 2: 20/20 (`API-run2.log`, `API-run2/…`).

The default reporter omits fast cases (RC-01, RC-03, RC-20) from the list; `Tests  20 passed (20)` and their receipt records cover them.

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | all | build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log` | `exit=0` | — |
| API-R1 | REQ-208, AC-207 (code search), AC-208 (unit) | unit, typecheck | Reused: IMP-01, IMP-02, IMP-03 | — | Pass | IMP-01/02/03 | — | at `63f6635b6d`; `e5d0405aef` adds only `tickets/` |
| API-R2 | AC-206 | web | Reused: IMP-04, IMP-05, IMP-06 | — | Pass | IMP-04/05/06 | IMP-06: no publish section; "Agents available to peers" | browser check of the card by the implementation; nothing else changed on the web side |
| API-01, API-02 | slice 1 AC-101 (AC-208) | gateway, delegation with the switch off | RC-01, RC-02 | ENV-1 | Pass | receipts `RC-01`, `RC-02` | `REMOTE_COLLABORATION_OFF` | the inbound body now uses `address` |
| API-03 | AC-207, REQ-208, DEC-206; slice 1 AC-102/111 (AC-208) | settings, gateway | RC-03 | ENV-1 | Pass | receipts `RC-03.noPublishing` | `"publishQuery": "Cannot query field \"publishedAgents\" on type \"Query\"."`; `oldField` `status: 400`, `code: "REMOTE_REQUEST_INVALID"`, `"message": "address must be a non-empty trimmed string."` | beta's settings folder holds only `peers.json` and the untouched leftover |
| API-04 | AC-202, AC-203, AC-204, AC-207 | beta's target resolution | RC-04: nine delegations from alpha's standalone run, one per target | ENV-1 | Pass | receipts `RC-04.results` | see "RC-04 results" below | For every target: `delegated: false`, beta's code, no work packet sent, no run folder on beta (none prepared), no Task record and no link on alpha, and the leftover file byte-identical. The team-local fixture is checked to be a real Team definition first. |
| API-05 | AC-201, AC-205, AC-207; slice 1 AC-104/105 | delegation, messages | RC-05 | ENV-1 | Pass | receipts `RC-05.metadata` | `"runtimeKind": "antigravity_cli"`, `"llmModelIdentifier": "gemini-3.8-flash-low"`, `"workspaceRootPath": "…/beta/data/temp_workspace"`, `"autoExecuteTools": true`, `delegatedFrom` as slice 1 | Publisher's own default runs, not the leftover file's `leftover-model` / `autoExecuteTools: false` / leftover workspace. The workspace is the canonical temp-workspace path. Follow-ups both ways, one message ID per log, as slice 1. |
| API-06 … API-16, API-18 … API-20 | slice 1 ACs (AC-208) | as slice 1 | RC-06 … RC-16, RC-18 … RC-20 | ENV-1 | Pass | receipts | as in autobyteus-191 | Unchanged except RC-20's start-request key list (`address`); RC-20 counted 18 start requests, including RC-04's nine refusals |
| API-17 | RU-1 (the owner changes an Agent's default) | delegation | RC-17: Publisher's default updated to `retired-model`; delegate; then follow-ups to the running run | ENV-1 | Pass | receipts `RC-17` | "The Agent Publisher on node \"beta-node\" cannot run there: The model 'retired-model' is not available on antigravity_cli." | Nothing new on beta. The running run still exchanges both ways and keeps its starting model. |
| API-21 | AC-208, QR (resolver `inherited` path unchanged) | same-node E2E suites, switch on | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=… ENABLE_REMOTE_COLLABORATION=true vitest run tests/e2e/projects tests/e2e/run-history tests/e2e/agent-team-runs tests/e2e/agent-org-runs --no-watch` | ENV-2 | Pass (one known failure outside scope) | `API-21-same-node-e2e-switch-on.log` | `Test Files  1 failed \| 36 passed (37)` | The failure is `delegated-launch-config-defaults.e2e.test.ts`, with the same lines (521/639) and the same messages as on slice 1 (autobyteus-191 rounds 2, 3 and 5). That is autobyteus-191's FU-003 (`tickets/done/cross-node-agent-communication/follow-ups.md`), a stale expectation that predates both tickets. This suite exercises the launch resolver this ticket changed, and its other assertions pass. |
| API-22 | AC-206, REQ-207 | browser | open `/nodes` → Remote Collaboration on a built node with the switch on; read the card | ENV-3 | Pass | `API-22-browser-card.log`, `API-22-remote-collaboration-card.png` | switch `aria-checked: "true"`; no text or button matching /publish/i; visible inputs only the switch, Node URL, Name; the note "Agents available to peers … any shared agent … its own default runtime and model … this node's temp workspace … tool calls auto-approved … local login … no default runtime and model is refused." | DOM assertions; the screenshot is supporting evidence (checked current) |

### RC-04 results (run 1; run 2 identical)

| Target address | What it is on beta | Beta's code | `targetName` | Text the delegating agent reads |
| --- | --- | --- | --- | --- |
| `/blank_slate` | shared Agent, no default (also "published" in the leftover file) | `NO_DEFAULT_RUNTIME` | Blank Slate | There is no default runtime configured for the target agent Blank Slate on node "beta-node". |
| `/half_set` | shared Agent, runtime only | `NO_DEFAULT_RUNTIME` | Half Set | There is no default runtime configured for the target agent Half Set on node "beta-node". |
| `/codex_writer` | default Codex, unavailable on beta | `AGENT_CANNOT_RUN` | Codex Writer | The Agent Codex Writer on node "beta-node" cannot run there: Codex App Server command '…/beta/missing/codex' is not available. |
| `/fragile` | default AGY model not offered | `AGENT_CANNOT_RUN` | Fragile | The Agent Fragile on node "beta-node" cannot run there: The model 'no-such-model' is not available on antigravity_cli. |
| `/daily_assistant` | built-in | `AGENT_NOT_FOUND` | — | Node "beta-node" has no Agent at /daily_assistant that can be delegated to. |
| `/remote_org_b` | Agent Org | `AGENT_NOT_FOUND` | — | Node "beta-node" has no Agent at /remote_org_b that can be delegated to. |
| `/local_scout` | team-local Agent (complete default) | `AGENT_NOT_FOUND` | — | Node "beta-node" has no Agent at /local_scout that can be delegated to. |
| `/nobody_here` | unknown | `AGENT_NOT_FOUND` | — | Node "beta-node" has no Agent at /nobody_here that can be delegated to. |
| `/review_squad` | shared Agent Team | `REMOTE_TEAMS_NOT_SUPPORTED` | Review Squad | Review Squad on node "beta-node" is an Agent Team; Agent Teams on another node are not supported yet. |

All texts match the design's table (design-spec § texts) exactly.

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-201 | Yes | API-05 (and every later case that uses Publisher) | Proven | — |
| AC-202 | Yes | API-04 (`/blank_slate`, `/half_set`) | Proven | — |
| AC-203 | Yes | API-04 (`/codex_writer`, `/fragile`), API-17 | Proven | — |
| AC-204 | Yes | API-04 (built-in, Org, team-local, unknown; shared Team) | Proven | — |
| AC-205 | Yes | API-05 | Proven | — |
| AC-206 | Yes | API-22, API-R2 (IMP-05, IMP-06) | Proven | — |
| AC-207 | Yes | API-03, API-04, API-05, API-R1 (IMP-01 search, IMP-07) | Proven | — |
| AC-208 | Yes | API-01 … API-20, API-21, API-R1 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supports | Residual Uncertainty | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 95% | 95% | all AC rows | — | — |
| Changed-boundary directness | 95% | 95% | two real servers, real catalog and runtime-availability checks on beta | inference scripted | — |
| Integration realism | 95% | 95% | API-04/05/17 through real HTTP | loopback proxies | — |
| Environment and fixture fidelity | 95% | 95% | real definitions (GraphQL and file-authored), real missing Codex, leftover file | — | — |
| Failure and edge cases | 95% | 95% | nine refusals, RU-1, slice 1's lifecycle cases | — | — |
| User surface | 90% | 95% | API-22 (DOM checks on the rendered card), IMP-05, IMP-06 | — | — |
| Durable regression quality | 95% | 95% | the rewritten 20-case E2E, two clean runs | — | — |

- Overall post-repository: 94%. Overall final: 95% (simple average). After the repository and E2E runs, the user surface (90%) was the only gap; API-22 closed it.
- Every critical acceptance criterion directly proven: `Yes`
- Any category below 90%: `No`
- Default 95% target: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed): the two-server E2E (Worker or Distributed), and a browser check of the card (API-22) to close the user-surface gap.

## Persisted-Data Transition Checks

- Decision: `Not Affected` (DEC-204).
- A leftover `published-agents.json` with entries that would change the results is ignored (API-04: Blank Slate is still refused; API-05: Publisher runs with its default) and left byte-identical. Beta writes only `peers.json` (API-03).
- No migration, dual read or fallback observed.

## Compatibility / Legacy Scope Check

- Compatibility mechanisms in scope: `No`. `publishedAddress` is not accepted (400, API-03).
- Durable coverage kept only for removed behavior: `No`. The publishing assertions were removed with the behavior and replaced by the AC-20x cases.

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated | API-03, API-04, API-05, API-17, API-20; harness and set-up | Removed: RC-03's publish validation and publish file; RC-04's "not published" and `PUBLISHED_AGENT_CANNOT_RUN`; RC-17's unpublish. Why: publishing is removed (REQ-208). Replacements: API-03 (no publish API), API-04 (AC-202 … AC-204, AC-207), API-17 (RU-1). |

- Attached for proportional test-code review: `Yes`

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| Runtime CLIs | scripted AGY CLI | no inference |
| An unavailable Codex | `CODEX_APP_SERVER_COMMAND` pointing at a missing file | — |
| The network between the nodes | capturing proxies | loopback |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| E2E servers, proxies, temp roots (runs 1–2) | Yes | `afterAll` | receipts `"rootRemoved": true, "serversStopped": true, "leftoverAgy": [], "errors": []` |
| In-process suite servers (API-21) | Yes | the suites' cleanup | — |
| API-22 node, Nuxt dev, browser tab | Yes | node and Nuxt stopped, tab closed, temp root removed | ports free |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven: none; nothing is user-only
- Next recipient: `/software_engineering_team/code_reviewer` (proportional test-code review; Medium / High)
- Notes: RSK-201 (auto-approve always on for remote runs) is accepted by the user. The stale `delegated-launch-config-defaults` suite is autobyteus-191's FU-003, outside scope.

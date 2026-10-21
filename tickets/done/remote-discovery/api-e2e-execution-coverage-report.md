# API/E2E Execution Coverage Report — autobyteus-261 (Remote discovery, slice S5)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-discovery/tickets/in-progress/remote-discovery`; evidence in `…/evidence/api-e2e/`.

## Report Meta

- Investigation: `…/api-e2e-coverage-investigation.md` (round 1)
- Progress log: `…/api-e2e-test-progress.md`
- Revision record: `…/api-e2e-revision-record.md`
- Current revision: `API-REV-001`; round 1
- Trigger: CRR-001 pass of IR-001. Code `93dc932920`, docs `d7bcd1b768`, branch `codex/remote-discovery`. Classification: Medium / High.
- **Result: Pass, final confidence 95%.**
- Durable coverage changed: Yes. The two-server E2E and the scripted CLI fixture were changed; this round commits them.

## Environment

| ID | Code | Machine | Servers | Data |
| --- | --- | --- | --- | --- |
| ENV-1 | `93dc932920` (dist API-00) + the test changes | macOS 26.5.2, Node v22.23.1 | two-server E2E: alpha and beta `dist/app.js` behind capturing proxies; RC-27 adds gamma, delta, epsilon (direct URLs); scripted AGY CLI; beta loads Brief Studio's importable package | temp roots and HOMEs, `env -i`; removed after each run (`cleanup: rootRemoved true, leftoverAgy []`) |
| ENV-2 | as ENV-1 | as ENV-1 | in-process E2E servers (vitest), `ENABLE_REMOTE_COLLABORATION=true`, `RUN_AGY_FAILURE_E2E=1` | temp |
| ENV-3 | as ENV-1 | as ENV-1 | API-30: alpha and beta (`API-30-live-two-nodes.mjs`), AutoByteus runtime, `deepseek-v4-flash`, keys only from the read-only test vault (`Secret vault: test vault … (read-only)`); API-30b: a third node with the Claude runtime (haiku, the signed-in `claude` CLI, real HOME as TESTING.md requires; data in temp) | temp roots removed; the `claude` CLI's session folder for the test workspace (`~/.claude/projects/…api30b-claude-node…`) removed |

The user's AutoByteus, its data and Docker nodes were not used.

## Cases

The commands, run from `autobyteus-server-ts`:
- **Two-server E2E (RC-NN cases):** `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND="$PWD/tests/fixtures/agy-failure-cli.mjs" REMOTE_E2E_EVIDENCE_DIR=<dir> ./node_modules/.bin/vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch`.
- **Prerequisite:** `pnpm -C autobyteus-server-ts test:integration:prepare`, which builds Brief Studio's importable package.

| Case | Criteria | What runs | Env | Result | Evidence and what to look for |
| --- | --- | --- | --- | --- | --- |
| API-00 | all | build; Brief Studio package | ENV-1 | Pass | `API-00-server-build.log`: `exit=0`, the package path |
| API-R1 | unit level of all | IMP-02 (70 files, 538 tests at `93dc932920`) | — | Reused | No source has changed since `93dc932920`. Implementation evidence: `IMP-02-discovery-focused.log` |
| Runs 1–3 | — | whole two-server E2E | ENV-1 | Run 1: 27/29 (two test defects, below). **Runs 2 and 3: 29/29** (281 s, 279 s) | `API-run1.log`, `API-run2.log`, `API-run3.log` and their folders (receipt and five server logs) |
| API-01 … API-25 | AC-407 (191/245/247) | RC-01 … RC-25 | ENV-1 | Pass (runs 2, 3) | Unchanged except RC-04, RC-19 and RC-20 (below) |
| API-04 (RC-04) | AC-406, DEC-407 | beta's refusals | ENV-1 | Pass | "The Agent Team Codex Team on node \"beta-node\" cannot run there: …"; the Agent texts are unchanged. Unknown, built-in, Org and team-local addresses read "Node \"beta-node\" has no Agent or Agent Team at /x that can be delegated to. If you have list_available_agents, call it with this node to see what it offers." Each NO_DEFAULT_RUNTIME / AGENT_CANNOT_RUN answer has `target {kind, name}` (e.g. `{kind:"agent_team", name:"Hollow Team"}`) and no `targetName` |
| API-19 (RC-19) | AC-406 | delegation after the peer is removed | ENV-1 | Pass | "No peer node named \"beta-node\" is registered on this node, so nothing was sent. Use a node name the user gave you; if you have list_available_nodes, it lists them." |
| API-20 (RC-20) | REQ-403, contract | audit of every captured request | ENV-1 | Pass | Run 3: `total 90`. Both new routes are present: `/rest/remote/availability` 3, `/rest/remote/available-agents` 3. Their bodies are exactly `fromNodeId, toNodeId`. Accepted answers are exactly `accepted, nodeId` and `accepted, agents, nodeId`, and entries carry only name, kind, address and description. No credential |
| API-26 (RC-26) | AC-402, REQ-403/405, QR-402, AC-404 (MCP), AC-406 | the offer and the exposure | ENV-1 | Pass | Receipt `RC-26`, below the table |
| API-27 (RC-27) | AC-401, QR-401, SCN-402 | the node list | ENV-1 | Pass | Receipt `RC-27`, below the table |
| API-28 (RC-28) | AC-404, AC-407, C-1 | switch off, unknown node, blank node, local list | ENV-1 | Pass | Receipt `RC-28`, below the table |
| API-29 (RC-29) | AC-405 | read per call | ENV-1 | Pass | `first 12, second 13`. The new entry is exactly `{name:"Late Team", kind:"agent_team", address:"/late_team", description:"Added between two listings"}` |
| API-30 | AC-404 (AutoByteus, Claude), SCN-401 with real models, C-1 | broader validation with a real model | ENV-3 | Pass | `API-30/` files; findings below the table |
| API-31 | AC-407 | same-node suites `projects`, `agent-definitions`, `run-history`, `agent-team-runs`, `agent-org-runs`, switch on | ENV-2 | Pass (191 FU-003 out of scope) | `API-31-same-node-e2e-switch-on.log`: `Test Files 1 failed \| 42 passed (43)`, `Tests 2 failed \| 182 passed \| 4 skipped (188)`. The only failure is `delegated-launch-config-defaults` at :521/:639, with the same errors as autobyteus-191's FU-003 (`launch: null` vs `followsTeam`; `members` undefined). This ticket changes no launch code. `collaboration-prompt-wording`, `delegated-copy-member-contact-host` and `general-agent-identity` (which list agents locally) pass |

**RC-26 (receipt `RC-26`):**
- **Tools over Agent Tools MCP (the new fixture command `LIST_TOOLS`):**
  - Scout has `list_available_nodes, list_available_agents, send_message_to, delegate_task`.
  - The Delegator has `create_task, update_task, send_message_to, delegate_task`.
  - The tool descriptions, the optional `node` and the two `delegate_task` texts equal the approved texts.
- **The offer:**
  - Exactly 12 entries: Publisher, Blank Slate, Half Set, Codex Writer, Fragile, Bystander, Checker, Plain Helper, Studio Team, Hollow Team, Codex Team, Field Team.
  - Plain Helper has no `description` field.
  - Left out, though in beta's catalog: Daily Assistant (built-in), Remote Org B (Org), Local Scout (team-local), and Brief Studio Team, Writer and Researcher (application-owned).
- **On the wire:** one request, body `{fromNodeId, toNodeId}`; answer keys `accepted, agents, nodeId`. The tool result equals beta's answer.
- **QR-402:** nothing was written on beta (run folders and message logs) or on alpha (Task records).
- **Delegations:** a `delegate_task` to each of the 12 listed addresses is accepted.
  - Publisher, Studio Team and Field Team started.
  - The others were refused only for their runtime (NO_DEFAULT_RUNTIME, AGENT_CANNOT_RUN). None was "not found".

**RC-27 (receipt `RC-27`):**
- **Node list:** `[{beta-node, available}, {gamma-node, unavailable}, {delta-node, unavailable}, {epsilon-node, unavailable}]`, in registration order, in 214 ms.
- **Reasons from `list_available_agents`, each identical to `delegate_task`'s:**
  - gamma: "Node \"gamma-node\" could not be reached (fetch failed)."
  - delta: "Remote collaboration is turned off on node \"delta-node\", so it refused the request."
  - epsilon: "Node \"epsilon-node\" does not have this node registered as a peer, so it refused the request."
- **Black-holed beta:** `unavailable` after 20 214 ms (the 20 s bound); available again afterwards.

**RC-28 (receipt `RC-28`):**
- **Switch off:** both calls are tool errors, "Remote collaboration is turned off on this node, so nothing was sent to another node.", and nothing was captured.
- **`nowhere-node`:** gets the new unknown-node text, identical for `delegate_task`.
- **`node: ""` and `node: null`:** both get "node must be the name of a peer node registered on this node; leave it out to list this node's agents and agent teams."
- **Without `node`:** alpha's own `/delegator, /remote_manager, /remote_worker, /remote_squad`, with no empty description.

**API-30 (`API-30/` files):**
- **SCN-401 on AutoByteus with DeepSeek** (`autobyteus-producer-tool-calls.json`). Asked only "the designer on the other node (beta) … find them yourself", the Producer:
  1. called `list_available_nodes {}` and got `beta-node available`;
  2. called `list_available_agents {"node":"beta-node"}` and got Designer, Copy Lead, Copy Checker and Copy Team (`agent_team`);
  3. called `delegate_task {node:"beta-node", recipient_address:"/designer", …}`, which returned `delegated: true, node: "beta-node"`.
- **Opt-in on AutoByteus** (`alpha-tool-preparation.log`): the Producer got "8 tools prepared" and the Plain Producer "6 tools prepared", a difference of exactly the two discovery tools. The Plain Producer said it had "no `list_available_agents` tool in my toolset".
- **Claude (haiku):**
  - Claude Producer's tool list includes `mcp__autobyteus_agent_tools__list_available_nodes` and `…list_available_agents`, and it used both correctly.
  - Claude Plain has neither, and said it can't list peers.
- **C-1:** the omitted `node` was sent as `{}` on AutoByteus/DeepSeek and on Claude/haiku. No null or "" was observed.

## Failures

None in the product.

Run 1 had two test defects, both fixed before runs 2 and 3:
- **RC-26:** my exclusion regex `/writer$/` also matched beta's own "Codex Writer". It now matches Brief Studio's definitions by name.
- **RC-19:** it still expected the old unknown-node text, which this ticket changes on purpose (DEC-406).

## Acceptance-Criteria Proof

| AC | Proven by | Status |
| --- | --- | --- |
| AC-401 | API-27 (four real peer states, order, reasons equal to delegation's, 214 ms, black-holed 20.2 s) | Proven |
| AC-402 | API-26 (exact offer, exact fields, exclusions with real definitions, wire bodies, every address delegable; Publisher and Studio Team start), API-20 | Proven |
| AC-404 | API-28 (switch off: refused, nothing sent; unknown node text); API-26 (MCP: no tools without the selection); API-30 (AutoByteus: 6 vs 8 tools, the agent has none; Claude: the agent's tool list) | Proven |
| AC-405 | API-29 | Proven |
| AC-406 | API-04 (Team `AGENT_CANNOT_RUN`, Agent unchanged, unknown-address text, `target`), API-19, API-26 (descriptions as the agent receives them) | Proven |
| AC-407 | API-01 … API-25 (runs 2, 3), API-28 (local list), API-31, API-R1 | Proven (191 FU-003 pre-existing) |
| AC-408 | — | **Only the user can check.** Tried: everything a node can show between real server processes on one machine (five servers, real HTTP, real peer states), and with real models on AutoByteus and Claude (API-30). Still needs the user: the desktop node ↔ a Docker node, in both directions, over the real network. |

## Validation Confidence Scorecard (Mandatory)

These are scored over what can be proven without the user; AC-408 is listed for delivery.
- **Post-Repository Score:** after the two-server E2E runs and API-31, before API-30.
- **Final Score:** after API-30.

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 95% | AC table; post-repository, AC-404's AutoByteus and Claude exposure was unit-only | none material | — |
| Changed-boundary execution directness | 94% | 95% | five real server processes; real HTTP; the real catalog including an application package; the MCP tool list as the agent sees it; real AutoByteus and Claude runs | — | — |
| Cross-boundary integration realism and mock gap | 95% | 95% | API-26 … API-30; a black-holed peer; real models | loopback (the user's AC-408) | AC-408 |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | clean `env -i`; separate HOMEs, data and ports; pinned identities; the test vault for keys | the Claude check uses the real HOME (required for the signed-in CLI); its test-created session folder was removed | — |
| Failure, edge-case, lifecycle, and recovery evidence | 94% | 95% | stopped, switched-off, unregistered and black-holed peers; switch off; unknown, blank and null node; a Team added between calls | an older peer without the routes (404 → unavailable) is unit-only; rule 9 requires the same release on both nodes | running an older build as a peer |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI change (requirements § UI: none). The agent-facing texts are covered above | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | 29-case E2E, two clean runs of the final file; exact entries, bodies and texts; no fixed sleeps in the new cases | the suite now needs Brief Studio's package (it fails fast with the command to run); about 4.7 minutes | — |

- Overall post-repository confidence: 94% (simple average of six applicable categories, 94.2%)
- Overall final confidence: 95%
- Every critical acceptance criterion directly proven, apart from the user's check: `Yes`
- Any final applicable category below `90%`: `No`
- Default target of `95%` met: `Yes`
- Confidence-limiting residual risks:
  - RSK-401: a listing is answered to any registered peer; identity is claimed until S6. Accepted.
  - RSK-402: up to 20 s for a black-holed peer; observed at 20.2 s.
  - AC-408 is the user's check.

## Broader Validation Decision (Mandatory)

- **Decision:** `Required` (executed, API-30).
- **Mode:** `Worker or Distributed`, with real inference: two and three server processes, the AutoByteus runtime with DeepSeek, and the Claude runtime with haiku.
- **What it addressed:**
  - AC-404's AutoByteus and Claude exposure, which was unit-only before;
  - C-1 (does a real runtime send null or "" for the omitted `node`?);
  - SCN-401 as a real model follows it from a plain request.
- **Browser:** not needed; there is no UI change.

## Observations (not findings)

- **O-1.** Without the discovery tools, a real AutoByteus agent (API-30, Plain Producer) found beta's data and `peers.json` with `run_bash` and `read_file`, then delegated to `/designer`. That was possible only because both test nodes share one disk. It is not a discovery defect; the tools make it unnecessary.
- **O-2 → FU-003.** Claude-runtime agents also had the signed-in user's claude.ai connectors (`mcp__claude_ai_Claude_Docs__*`). This is pre-existing and outside this ticket; recorded in `follow-ups.md` as FU-003.
- **C-1.** Not observed with real runtimes. The scripted `null` and `""` get the VALIDATION_ERROR recovery text, as designed.

## Durable Coverage Changes

- `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`: `LIST_TOOLS` replies `TOOLS:[{name, description, inputSchema}]`, the run's Agent Tools MCP tools.
- `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`:
  - **set-up:** Brief Studio on beta (fails fast if the package is missing), beta's Plain Helper (no description), and alpha's Scout (both tools);
  - **`PATHS` and `TEXT_261`:** the two new routes and the approved texts;
  - **existing cases:** RC-04 (new texts, `target`), RC-19 (new text), RC-20 (the two routes and their answers);
  - **new cases:** RC-26 … RC-29;
  - **header:** updated.

## Persisted-Data Transition Checks

`Not Affected`; nothing is stored. QR-402 (API-26) shows that listing writes nothing on either node.

## Decision

Pass. This goes to the code reviewer for the proportional test-code review of the two test files (Medium / High).

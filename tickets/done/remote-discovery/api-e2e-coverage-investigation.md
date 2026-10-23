# API/E2E Coverage Investigation — autobyteus-261 (Remote discovery, slice S5)

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-discovery/tickets/in-progress/remote-discovery`

## Investigation Meta

- Requirements: `…/requirements-doc.md` (Approved, SR-002), AC-401 … AC-408
- Investigation notes: `…/investigation-notes.md`
- Design spec: `…/design-spec.md` (SR-003); design review `…/design-review-report.md` (ARCH-REV-001 Pass)
- Implementation handoff: `…/implementation-handoff.md` (IR-001, code `93dc932920`)
- Code review: `…/code-review-report.md` (CRR-001 Pass; C-1 held for evidence)
- Follow-ups: `…/follow-ups.md` (FU-001, FU-002)
- API/E2E revision record: `…/api-e2e-revision-record.md`; current revision `API-REV-001`; round 1
- Classification carried: task size `Medium`, architectural risk `High` → reviewed route; a passing result goes to the code reviewer for test-code review
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-discovery/TESTING.md` (E2E with a clean environment; real providers only through the test vault; never the user's app or data)

## What Must Be Proven

- **The nodes list (REQ-401, AC-401, QR-401).** `list_available_nodes` lists the registered peers in registration order as `{name, status}`. Peers are checked in parallel, and the answer comes within the 20 s peer bound even when a peer black-holes requests. For an unavailable peer, `list_available_agents {node}` gives the specific reason, which is the same reason a delegation would get.
- **The offer (REQ-402/403/405, AC-402).** `list_available_agents {node}` returns exactly beta's eligible shared Agents and Agent Teams.
  - Not listed: built-ins, Orgs, team-local agents and application-owned definitions.
  - Each entry has only `name`, `kind`, `address` and `description`, and `description` only when it is not empty.
  - Every listed address is accepted by `delegate_task` with the same `node`.
  - The request and answer bodies carry nothing else.
  - A listing creates no run, writes nothing and logs no message (QR-402).
- **Opt-in and switch (REQ-406, AC-404).**
  - An agent without the tools in its definition doesn't have them (AutoByteus, Agent Tools MCP, Claude).
  - With alpha's switch off, both calls are refused "turned off" and nothing is sent.
  - An unknown node gets the new "Use a node name … if you have list_available_nodes …" text.
- **Read per call (REQ-407, AC-405).** A Team added on beta between two calls appears in the second.
- **Texts (REQ-408, AC-406).**
  - A Team that can't run reads "The Agent Team …".
  - The unknown-address text names both kinds and points to `list_available_agents`.
  - The new tool descriptions and the `node` descriptions are as designed.
  - The refusal answer carries `target {kind, name}` in place of `targetName`.
- **Preserved (AC-407).**
  - The local list without `node` behaves as before; the only change is DEC-405, which drops an empty description.
  - The existing 191/245/247 cases still pass.
- **C-1 (held for evidence).** Does any real runtime send `node: null` or `""` for the omitted optional parameter?

## Supported Scenarios And Real Usage

- SCN-401: an agent finds a peer and delegates without being told any address.
- SCN-402: a peer is down or misconfigured.
- SCN-403: this node's switch is off.
- Real use added:
  - RU-1: a peer that black-holes requests while the agent lists the nodes (RSK-402).
  - RU-2: the owner of beta adds a Team between two listings (AC-405).
  - RU-3: a real model on the AutoByteus runtime follows SCN-401 from a plain-language request, with no addresses given. This exercises the tool texts and C-1.
- Contrived: none.

## Changed Surface And Boundary Classification

| Surface | Changed boundary | Repository evidence (IMP-02) | Material risk not exercised there | Mode |
| --- | --- | --- | --- | --- |
| Inter-node contract | two new routes and kinds through the gateway; `target` on refusals | unit (gateway, client, in-process A→B) | real HTTP between two processes; exact bodies; four real peer states | Two-server E2E + capture audit |
| Discovery owner | parallel fan-out, bound, status mapping | unit with fake peers (50 ms bound) | real stopped / switched-off / unregistered / black-holed peers | Two-server E2E |
| Catalog lister on B | eligibility through `NodeCatalogPort` | unit | the real catalog with built-ins, an Org, a file-authored Team with a team-local agent, an application-owned Team (Brief Studio) | Two-server E2E |
| Tool exposure | opt-in on AutoByteus, MCP, Claude | unit | the real MCP tool list of a run; the AutoByteus and Claude runtimes | E2E (MCP via the scripted AGY CLI); broader validation (real AutoByteus, Claude where possible) |
| Agent-facing texts | DEC-406 | unit (pinned) | the texts as an agent receives them | E2E (MCP tool list and refusals) |

## Existing Durable Coverage Inventory

| Path / test | Validity | Action |
| --- | --- | --- |
| two-server E2E RC-04 `notFound` ("has no Agent at …") and `/codex_team` ("The Agent Codex Team …") | Needs Update (DEC-406/407) | New texts, and assert the answer's `target {kind, name}` |
| RC-20 allowed paths and body keys | Needs Update | Add the two routes and their exact keys |
| RC-01 … RC-25 otherwise | Still Valid | Run (AC-407) |
| unit / in-process (IMP-02) | Still Valid | Reused (API-R1) |
| same-node E2E suites | Still Valid | Run the ones that use `list_available_agents` locally (AC-407) |

## Planned Cases

| Case | Criteria | Kind | Steps |
| --- | --- | --- | --- |
| API-00 | all | Existing | build; Brief Studio importable package (`pnpm -C autobyteus-server-ts test:integration:prepare`) |
| API-R1 | unit level of all | Reused | IMP-02 (code `93dc932920`) |
| API-01 … API-25 | AC-407 (191/245/247) | Durable, updated | RC-04 (new texts and `target`), RC-20 (new routes) |
| API-26 (RC-26) | AC-402, REQ-403/405, QR-402, AC-404 (MCP exposure), AC-406 (descriptions) | Durable, new | Alpha's "Scout" selects both tools; the Delegator doesn't. `LIST_TOOLS` in the scripted CLI (new fixture command) lists the MCP tools and their descriptions. Scout lists beta's offer, which is exactly the expected set with exact keys (a shared agent with an empty description has no `description` field). Built-in, Org, team-local and application-owned (Brief Studio team) are absent. The captured request body is exactly the envelope. Nothing is written on either node. Then a delegation to every listed address: none is "not found"; Publisher and Studio Team start |
| API-27 (RC-27) | AC-401, QR-401, RU-1 | Durable, new | Three more servers: gamma (registered, then stopped), delta (switch off), epsilon (alpha not registered there). `list_available_nodes` returns registration order, with beta available and the others unavailable, quickly. `list_available_agents` and `delegate_task` per node get the same reason. Beta black-holed: the call finishes within the bound, with beta unavailable |
| API-28 (RC-28) | AC-404 | Durable, new | Alpha's switch off: both calls are refused "turned off" and nothing is captured. An unknown node gets the new text, the same for `delegate_task`. The local list without `node` is unchanged in shape |
| API-29 (RC-29) | AC-405 | Durable, new | Beta's owner adds a Team between two listings; it appears only in the second |
| API-30 | AC-404 (AutoByteus, Claude exposure), RU-3, C-1 | Broader validation (temporary; test vault) | Two dist servers, the AutoByteus runtime with `deepseek-v4-flash`. An agent with the tools follows SCN-401 from a plain request; an agent without them does not have them (tool list in its LLM request or prompt). Watch whether `node` is sent as null or "" when omitted. Claude runtime if it can run here without the user's login |
| API-31 | AC-407 | Existing | same-node suites that use `list_available_agents` (`projects`, `agent-definitions`, `runtime` non-gated), switch on |

- Test progress log: `Yes`

## Not Tested / Deferred

| Behavior | Reason | User only? |
| --- | --- | --- |
| AC-408 desktop ↔ Docker | needs the user's desktop node and Docker node | Yes |
| an older peer without the routes (404 → `unavailable`) | no older build is run here; covered by the unit case (404) | No |

## Ambiguities Or Reroute Triggers

None at planning time. C-1 is observed, not assumed.

## Investigation Decision

- Proceed: `Yes`; durable coverage changes: `Yes`; reroute: `No`

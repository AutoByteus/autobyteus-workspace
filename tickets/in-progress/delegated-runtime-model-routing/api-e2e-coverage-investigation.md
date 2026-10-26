# API/E2E Coverage Investigation — autobyteus-32 (Model Router core)

The plan. Results, scores and the broader-validation decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-016, Approved) with `launch-selection-order.md` (SR-016, behavior-defining) and the Product UI/UX specification (`/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-runtime-model-routing/ui-ux-spec.md`, `ce3e417`)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (to SR-017)
- Design Spec: `design-spec.md`
- Design Review Report / Architecture Review Revision Record: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-002, -003 Pass)
- Implementation Handoff / Revision Record: `implementation-handoff.md`, `implementation-revision-record.md` (IR-002)
- Code Review Report / Revision Record: `code-review-report.md`, `code-review-revision-record.md` (CRR-002 Pass, 9.4)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Round: 1. Trigger: code review pass CRR-002 from `/software_engineering_team/code_reviewer`. Prior investigation: none.

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-runtime-model-routing`, branch `codex/delegated-runtime-model-routing`, base `origin/personal` `d74f75a51a`; code `d384968700`, `930597c730`, `4979559f7f`, `0cdaa0d480`, `161d136c1b`, `03d9860e82`; docs `a5a29c4ff6`.

**Task Done-when (verbatim):** "The user has approved the approach. A delegated team can run its members on different runtimes/models as chosen for the Task (e.g. Solution Designer on the Claude runtime, Implementation Engineer on Codex). The choice is visible, fallbacks are clear, it's covered by tests, and the user has verified it in the desktop app."

## Current Requirement And Design Basis

- Order per agent of a fresh delegated copy: agent default → team default → the node's Model Router (when active) → (this node) the delegating run's launch → refusal; "usable" includes signed in and not blocked (U3/U4b, only while routing is on).
- One long-lived, internal Model Router agent per node, in its own internal workspace, confined on Codex/Claude; one routing request at a time, 40 s budget including the wait; `submit_launch_choices` validates; failure → inherited launch with a note (this node) or refusal (peer).
- Visibility: `delegate_task` notes, run Settings rows (local and remote), decision records by Task, statistics, the Model Routing page; peer copies recorded by the peer with `fromNode`.
- Feature off: exactly today's behavior.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001…SCN-010 (SCN-009 moved out with REQ-013).
- Added from the implementation:
  - SCN-A1 (C-05): the router's backend process dies while the server runs; the next routings fall back "busy" until its run is replaced.
  - SCN-A2: the router launch is changed on the page while a router run exists (a new run on the new launch; the old one is not used).
  - SCN-A3: the user talks to the router while a routing request waits (one request at a time; the user's turn first).
- Contrived: none recorded.

## Changed Surface And Boundary Classification

| Surface | Affected? | Changed Boundary | Repository Evidence | Not Exercised | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend | Yes | order, usability, router, queue, sessions, records | IMP-03 (346 unit, stub router) | real composition, real router run | Server E2E (scripted router run) |
| API / transport | Yes | `delegate_task` notes, GraphQL model routing, MCP `submit_launch_choices`, peer start/answer | unit | real HTTP/MCP/peer | Server E2E, two-node E2E |
| Frontend | Yes | page, run Settings rows | IMP-05/07/08 | rows with real routed/remote copies | Browser on real data |
| Auth / permissions | Yes | router confinement (Codex sandbox, Claude hooks) | unit per runtime | the real CLIs | Live checks |
| Process / lifecycle | Yes | long-lived router run, restore, idle tracking | unit | real process death (C-05), restart | Live |
| Persisted data | Yes | decision log, router state, workspace, settings, run-history fields | unit (absent = not routed) | older real runs | Restore test |
| Distributed | Yes | peer contract (`launches`, refusal state, 50 s bound) | unit | two real nodes; Docker | Two-node E2E; Docker |
| External | Yes | runtimes' MCP tool-call time-outs | — | Claude SDK, Antigravity, Grok live | Live |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root); no closer `TESTING*.md`.
- Clean env for E2E; scripted AGY (`tests/fixtures/agy-failure-cli.mjs`, `RUN_AGY_FAILURE_E2E=1`) for real tool calls without a model; live CLIs need the real HOME; never edit `~/.claude`, `~/.codex`, `~/.grok`; throwaway `CODEX_HOME` with a symlinked `auth.json` is allowed; provider keys only from the test vault; one local-model run at a time; Docker: test-owned container, no user volumes; isolated desktop instance for the user's check.
- Constraint found: Claude's login is in the macOS keychain, keyed by its config dir; a throwaway `CLAUDE_CONFIG_DIR` is signed out (checked), and the user's `~/.claude/settings.json` has no allow rules and may not be edited. The "user-level Write allow rule" variant of the Claude check needs the user's consent.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Decision | Action |
| --- | --- | --- | --- |
| unit `tests/unit/model-routing/**`, resolver, remote, lifecycle, workspaces (IMP-03, IMP-09) | stub-router behavior | Still Valid | Reuse (API-00) |
| web specs (IMP-05, IMP-10), guards (IMP-06) | page, rows | Still Valid (FU-006 out of scope) | Reuse |
| integration (IMP-04) | roots, backends | Still Valid for IR-002? check diff | Reuse if unaffected |
| `tests/e2e/projects/*delegat*`, `delegated-launch-config-defaults`, collaboration E2E | feature-off behavior (AC-002, preserved) | Still Valid | Rerun (API-09) |
| `remote-delegation-two-server.e2e.test.ts` | peer contract | Needs Update: routing cases, and older cases whose assertions predate the ticket's peer contract (start request `task`, link/row `launches`, refusal routing state, 50 s start bound) | Add RC-39…41; update RC-01/03/04/05/06/07/10/15/17/20/21/31 |
| `internal-agents.e2e.test.ts` (308) | internal agents | Needs Update: IA-01 assumed one internal agent; the built-in router is a second (REQ-008) | Update IA-01 |
| `codex/available-agent-runtimes-live-agents` (303) | live tool on every runtime | Fold (cherry-pick, keep the branch) + routed delegation case | API-12 |
| No E2E of routing | — | Gap | Add |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | unit/web | unit, component | Reused | IMP-09, IMP-10, IMP-06, IMP-04 (by diff) | — |
| MR-01 | AC-002 | real server, scripted delegator | Durable | new `tests/e2e/model-routing/model-routing-delegation.e2e.test.ts`: routing off → inherited as today, no request, no record | feature-off contract |
| MR-02 | AC-001, AC-009 data, AC-012 | same + scripted router run | Durable | team copy, one member with a default; router asked once for the others; notes, launches, records by Task, statistics; reopen rows | SCN-001 |
| MR-03 | AC-004 | same | Durable | invalid then valid; silent router → 40 s → inherited with note | SCN-002 |
| MR-04 | AC-006 | same | Durable | three delegations at once (slow router turns): one per turn in arrival order; a request waiting past 40 s fails "busy" | SR-016 |
| MR-05 | AC-003 | same + scripted `/usage` | Durable | default on a blocked model skipped "blocked until …" when on; used when off | U4b |
| MR-06 | REQ-002 status, CR-002 | real signed-out Codex CLI in a clean HOME | Durable | router launch on Codex → `SIGNED_OUT` | status codes |
| MR-07 | AC-008 | GraphQL | Durable | router definition, run, workspace hidden; `openModelRouterAgent` works; shown with the setting | REQ-008 |
| MR-08 | AC-011 (tool set) | the router run's MCP session | Durable | router tools = template + no collaboration tools | REQ-003 |
| RC-39…41 | AC-005, REQ-012 peer | two built nodes | Durable | two-server file: B off → refusal with B's state; B on (scripted router) → launches back on A, B's record `fromNode`, null delegating name/run; B router silent → `MODEL_ROUTER_FAILED` within the 50 s bound | peer contract |
| L-01 | AC-011 Claude | live router on Claude | Temporary Probe | write outside the workspace (with a workspace `.claude/settings.json` allowing it) denied; no shell tool | confinement |
| L-02 | AC-011 Codex | live router on Codex, throwaway `CODEX_HOME` | Temporary Probe | write outside refused even with a workspace `.codex/config.toml` asking for full access; since the live model will not run outside writes, a workspace script writes outside (config present, and not present, when Codex starts) and Codex's recorded sandbox policy is read | confinement |
| L-03 | AC-007 | live router (real model) | Temporary Probe | teach "use Antigravity for writing" via the router run; `knowledge.md` changes; next writing Task routed to Antigravity | knowledge |
| L-04 | C-05 | live router | Temporary Probe | kill the router's CLI process, route | residual risk |
| MR-09 | C-05, AC-004 | real server, scripted router (crash / throw modes) | Durable | the router's CLI exits mid-turn, then a turn fails with an error; observe the next routings | added during execution: reproduces C-05 deterministically |
| API-12 | REQ-001 on every runtime, QR-001 | live agents on Claude, Antigravity, Grok (+ Codex, AutoByteus) | Durable (gated) | fold 303 live-agents; add a ~45 s routed delegation per runtime that must complete as a tool result | tool-call time-outs |
| API-13 | AC-005 Docker | test-owned Docker node B | Temporary Probe | as RC-39…41 against a container, if the image can run this branch's dist | Docker parity |
| API-14 | AC-001, AC-009, AC-012 UI | real stack page with real routed and remote data | Temporary Probe / probe | Decisions, Overview, run Settings rows from MR-02/RC data | rows never rendered with real data |
| API-09 | AC-002, preserved | existing E2E | Existing Test | delegation/collaboration E2E files | regression |
| API-15 | Done-when | isolated desktop instance | Other | build and prepare the user's check | user verification |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Only The User Can Check? |
| --- | --- | --- |
| Claude confinement with a user-level `Write` allow rule | needs a rule in the user's `~/.claude/settings.json` (TESTING.md forbids editing it); a throwaway config dir is signed out | Yes (or the user consents to a temporary rule) |
| The user's desktop check | Done-when | Yes |
| Antigravity/Grok router confinement | not confinable (FU-005, accepted) | — |

## Investigation Decision

- Proceed: `Yes`. Durable coverage added/updated: `Yes`. Reroute: `Yes`, after execution. F-1 (Codex sandbox widened by a workspace config), F-2 (the Claude router has the user's claude.ai connector tools and `Skill`) and F-3 (a failed router turn leaves routing "busy") go to the code reviewer for failure-origin review; see the execution report.

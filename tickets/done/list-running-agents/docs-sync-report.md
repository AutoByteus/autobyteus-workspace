# Docs Sync Report — list-running-agents (autobyteus-492)

## Scope

- Ticket: `list-running-agents` (autobyteus-492), `task_size` `Large`, `architectural_risk` `High`, route `Reviewed` (architecture review ARCH-REV-001…004, source review CRR-001/002, API/E2E API-REV-001, test-code review CRR-003).
- Trigger: the code reviewer's CRR-003 Pass (test-code review after API/E2E), which delivers the package.
- Bootstrap base reference: `origin/personal` @ `bd2053ee51`.
- Integrated base reference used for docs sync: `origin/personal` @ `75048cbaf4`, merged into the ticket branch as `df6992e0c1` (49 base commits; no conflicts). Delivery docs edits started only after this merge.
- Second refresh: `origin/personal` moved to `be11a62449` (autobyteus-491, the retired memory item model and two retired built-in agents; no messaging, collaboration or tool code) while delivery ran. It was merged as `736526af88` without conflicts after the docs edits below. Its changed docs (`GLOSSARY.md`, the docker README, `ARCHITECTURE.md`, `agent_definition.md`, `agent_memory.md`, `codex_raw_event_mapping.md`, web `settings.md`, `agent_memory_design.md`) do not describe messaging or discovery, so the edits here still hold.
- Post-integration verification reference: the merged states `df6992e0c1` and `736526af88`; commands and results in `release-deployment-report.md` § Initial Delivery Integration Refresh.

## Why Docs Were Updated

- Summary: the ticket makes the run ID the address for `send_message_to` (CM-13): any sender reaches any running agent by run ID, on this node or with `node` on a paired node, without waking anything; the different-Task refusal and the `TASK_AGENT_RESOURCE_CONFLICT` answer on this path are gone; unrelated messages stay out of run views; a new opt-in tool `list_running_agents` lists the running Agent and Team runs a person started; two new peer routes (`/rest/remote/run-messages`, `/rest/remote/running-agents`); the result catalogue is now M-01…M-50.
- Why this should live in long-lived project docs: the collaboration model is the canonical contract (DESIGN.md names it: "Changes to Teams, Orgs, standalone collaboration, Tasks, messaging or run storage follow it or update it in the same change"); the module docs are what the next change to messaging, discovery or the peer routes reads first.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; names the collaboration model as the contract | No change | Rule 9 (both nodes run one release; no version handling) is what the ticket follows and records; no rule is added or changed. The ticket's design case is in `docs/design-cases.md` (below). |
| `TESTING.md` | The ticket changes the tools a run gets (a new opt-in tool) and the E2E suites | No change | The row "The tools a run gets" already requires the whole unit, integration and E2E suites plus the search of gated suites; API/E2E ran exactly that (API-04, API-05, API-09). `list_running_agents` is opt-in, like `list_peer_nodes`, so `PLATFORM_GIVEN_TOOL_NAMES` is unchanged. No command in it stopped working. |
| `RELEASE.md` | Finalization and release rules | No change | Followed as written (see the release/deployment report). One check the guide asks, the Secret Gate over `origin/personal..codex/list-running-agents`, ran before the first push. |
| `GLOSSARY.md` | Defers collaboration words to `collaboration_model.md` § 1 | No change | The new words ("Running agent", "Run started by a person", "Related / unrelated runs", "Unlinked run") are defined in `collaboration_model.md` § 1, where the glossary points. |
| `docs/design-cases.md` | Design cases | No change (already updated) | The Solution Designer added the autobyteus-492 case (ARCH-REV-004 AR-008, read the committed state in a shared worktree) in the ticket. It is a design case in the document's own form. |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | The canonical contract | No change by delivery (already updated in the code commit) | Verified against the final code: § 1 terms, CM-5, CM-11, new CM-13, § 4 and § 5 status rows. CM-13's statements (no wake, "not running" refusal, closed-Task row 13 for every sender on the holding node with or without `node`, team run ID refused with the coordinator's ID, `unlinked_run` endpoint, `publishToViews: false` for unrelated, `list_running_agents` scope) match `global-agent-run-message-router.ts`, `cross-run-message-delivery.ts` and the E2E receipts (RC-47 g1, RC-48, RC-49). |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `target_agent_run_id` route owner | No change by delivery (already updated) | Verified: the four paths (same-root, cross-run with its steps 4 and 5, peer path DS-004, global live-only) match the router at the merged state. |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Discovery tools | No change by delivery (already updated) | `list_running_agents` entry shape, filters and the switch rule match `list-running-agents-contract.ts` and RC-47/RC-48 receipts. |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Peer routes | Updated | The implementation's section "Messages by run ID and running agents" verified; delivery added one sentence to the intro. The intro's older text about authentication is outdated: FU-006. |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Tool descriptions and the result catalogue | Updated | Named `list_running_agents` among the tools with one shared description; "cross-Task … refusals" replaced (the different-Task refusal M-06 is withdrawn); the catalogue range is M-01…M-50. |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | The Agent Tools MCP catalogue of tool adapters | Updated | The discovery adapters list now names `list_running_agents` (`list-running-agents-mcp-adapter-provider.ts` is in the default providers). |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | A standalone root's message rule | Updated | "allowed when both runs work on one open Task, or one is the other's assigner" is no longer the whole rule. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | The `target_agent_run_id` route as seen from Team runs | Updated | "Any other target uses the global live-only path" was false for a collaboration sender: it now goes root to root while the receiver runs; the direct post serves only senders or targets without a collaboration root. |
| `autobyteus-server-ts/docs/modules/projects.md` | Message-scope lines named by the design | No change | Reviewed every `send_message_to` line: reactivation (assigner's message after DONE), "Address messaging order" and "Borrowed, not adopted" (`TASK_AGENT_RESOURCE_CONFLICT` for delegation helpers, a code that still exists in `task-execution-resources.ts`) describe behavior this change does not touch. |
| `autobyteus-server-ts/docs/design/node_access_model.md` | Route list, if it enumerates peer routes | No change | It covers peer routes as the prefix `/rest/remote/*` (NA-7, NA-24, NAS-21..38); the two new routes sit under it. |
| `autobyteus-server-ts/docs/modules/agent_artifacts.md`, `agent_orgs.md`, web `chat.md`, web `agent_teams.md` | Messages to runs outside the sender's root | No change | Their statements (a run-ID message carries `reference_files` only in the target's input metadata; `send_message_to` by address never creates a run; a peer message by run ID wakes a stopped run) hold after this change. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | Rewrite and new rule (in the code commit `deacacf948`) | § 1 terms; CM-5, CM-11 wording; new CM-13; § 4 "later steps"; § 5 rows | The model is the contract; CM-13 is the new message rule |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Update (code commit) | Cross-run path steps 1-5, peer path, live-only path, refusal list | The router's paths changed |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Update (code commit) | `list_running_agents` entry; opt-in rule for the three discovery tools; the `node` and switch rule | New tool |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | Update (code commit) and delivery | Section "Messages by run ID and running agents"; the route count; delivery added the intro sentence | Two new peer routes |
| `docs/design-cases.md` | Addition (Solution Designer, in the ticket) | One "Again in autobyteus-492" case | A design case |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | Update (delivery) | Tool list; refusal wording; catalogue range M-01…M-50 | M-06 withdrawn, M-46…M-50 added by the ticket |
| `autobyteus-server-ts/docs/modules/agent_tools_mcp_server.md` | Update (delivery) | The discovery adapters list | The new provider |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Update (delivery) | The cross-run message rule | CM-13 |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Update (delivery) | The `target_agent_run_id` route paragraph | Cross-run now serves unrelated running agents |
| `autobyteus-server-ts/typecheck-baseline.json` | Count (in the code commit) | `1009` test-file errors in `315` files | The ticket's added test files; the typecheck prints "(baseline 1009 in 315 files)" |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The run ID is the address | Who may message whom, when a message wakes, what is refused and with which text, what stays out of views | `requirements-doc.md` DEC-001…DEC-014, `design-spec.md` | `collaboration_model.md` CM-13 |
| The route's paths | Same-root, cross-run (related wake / unrelated live-only), peer (`node`), global live-only; where the closed-Task row 13 is decided (the holding node) | `design-spec.md` § Bounded Local Spines | `agent_communication.md` |
| Running agents | One owner (`RunningAgents`) for "running now", the listing, the entry shape, what is never listed | `design-spec.md` DS-001 | `agent_tools.md`, `collaboration_model.md` § 1 |
| The peer routes | `/rest/remote/run-messages` (no root named, never wakes) and `/rest/remote/running-agents` (strict reader); older peers answer 404 | `design-spec.md` DS-004, DESIGN.md rule 9 | `remote_collaboration.md` |
| Design lesson (read the committed state in a shared worktree) | A design that cites code others have not committed names a target that does not exist | `design-review-report.md` AR-008 | `docs/design-cases.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The different-Task refusal (`OTHER_TASK_REFUSAL`, M-06) and `TASK_AGENT_RESOURCE_CONFLICT` as an answer of `send_message_to` | Delivery to any running agent (CM-13); the closed-Task refusal stays | `collaboration_model.md` CM-13, `agent_communication.md`, `prompt_engineering.md` (catalogue) |
| "Messages to unlinked active runs on a peer come in a later slice" | `/rest/remote/run-messages` and `unlinked_run` endpoint | `collaboration_model.md` § 4 and § 5, `remote_collaboration.md` |
| "The global live-only path serves every other target" | It serves only senders or targets without a collaboration root | `agent_communication.md`, `agent_team_execution.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verify from the evidence (done: `release-deployment-report.md` § Verification), commit, archive, finalize.
- Notes: one out-of-scope doc problem found (FU-006). The base's autobyteus-517 changed several of the watcher tests that FU-001 and FU-005 name (`os-latency-under-load.ts`, `file-system-watcher`, `package-auto-refresh`, `skill-folder-watcher`, `agent-package-folder-watcher`); delivery did not rerun them to decide whether those follow-ups are still needed, so the Solution Designer checks that before sending them.

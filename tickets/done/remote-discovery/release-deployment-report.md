# Delivery / Release / Deployment Report — remote-discovery (autobyteus-261)

## Release / Publication / Deployment Scope

Remote discovery (`Medium` / `High`, reviewed route). The scope is repository finalization to `origin/personal`, then beta `v1.5.8-beta.6` at the user's request.

## Project Release Guide

- Release guide: `RELEASE.md` at `origin/personal` `8fbe77c461`.
- Deviations from the guide and why: `None`.
- Proposed guide fixes: `None`.

## Handoff Summary

- Handoff summary artifact: `tickets/done/remote-discovery/handoff-summary.md`
- Delivery revision record: `tickets/done/remote-discovery/delivery-revision-record.md` (`DR-001`)

## Initial Delivery Integration Refresh

- Bootstrap base reference: `origin/personal` `8fbe77c461`
- Latest tracked remote base reference checked: `origin/personal` `8fbe77c461` (2026-10-21, at delivery start and again before finalization)
- Base advanced: `No`
- New base commits integrated: `No`
- Local checkpoint commit: `Completed` (`b90e531506`, the reviewer's CRR-001/002 documents)
- Integration method: `Already current`
- Post-integration executable checks rerun: `No`
- No-rerun rationale: no base commits were integrated. The finalized code is the validated code (`93dc932920` plus the tests at `f09ebad342`) on the same base, and API/E2E's runs 2 and 3, API-30 and API-31 ran at that state. Delivery's commits are documents only.
- Handoff state current with latest tracked remote base: `Yes`

## Verification

- Evidence judged: `Sufficient` for AC-401 … AC-407.
- Evidence relied on:
  - the execution report's AC proof and cases;
  - the receipts of runs 2 and 3;
  - the API-30 tool calls, conversations and tool-preparation log;
  - `API-31-same-node-e2e-switch-on.log`;
  - the scorecard: final 95%, post-repository 94%, no category below 90%.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-401 | RC-27 (run 3) | `[beta available, gamma unavailable, delta unavailable, epsilon unavailable]` in 214 ms, in registration order. The reasons equal `delegate_task`'s ("could not be reached (fetch failed)", "turned off on node \"delta-node\"", "does not have this node registered as a peer"). A black-holed beta is `unavailable` at 20 214 ms | Proven |
| AC-402 | RC-26, RC-20 | Exactly 12 entries (8 Agents, 4 Teams). Plain Helper has no `description`. Beta's catalog also holds Daily Assistant, Local Scout and the Brief Studio definitions, which are excluded. Wire body `{fromNodeId, toNodeId}`, answer `accepted, agents, nodeId`. Every listed address is delegable (none "not found") | Proven |
| AC-404 | RC-26, RC-28, API-30 | MCP tools: Scout has both discovery tools, the Delegator neither. With the switch off, both calls are refused and nothing is sent. AutoByteus: 8 vs 6 tools prepared, and the plain agent says it has no `list_available_agents`. Claude: the opted-in agent has both `mcp__autobyteus_agent_tools__list_available_*`, the plain one has neither | Proven |
| AC-405 | RC-29 | `first 12, second 13`; "Late Team" added between calls appears | Proven |
| AC-406 | RC-04, RC-19, RC-26/28 | "The Agent Team Codex Team on node \"beta-node\" cannot run there: …"; "Node \"beta-node\" has no Agent or Agent Team at /x that can be delegated to. If you have list_available_agents, call it with this node …"; the unknown-node text pointing to `list_available_nodes`; `target {kind, name}` | Proven |
| AC-407 | RC-01 … RC-25 (runs 2, 3), RC-28 local list, API-31 | Earlier slices pass. Same-node suites 42/43; the failure is 191's FU-003 | Proven |
| AC-408 | — | The user's desktop ↔ Docker check, both directions. API/E2E could not reach it (real networking between the desktop and a container; the user's nodes and sign-ins) | User Check: open, to be run on `v1.5.8-beta.6` |

- More evidence requested: `None`.
- User check needed: `Yes`, for AC-408 (the requirements' "Done when").
  - Delivery offered two ways: check a local build before merge, or check a beta after finalization.
  - The user answered "now release a new beta thanks" (2026-10-21), choosing the beta.
  - Finalization therefore precedes the user check, by the user's decision. AC-408 stays open until the user reports it.

## Release Decision

- Decision: `Beta` (`v1.5.8-beta.6`).
- Decided by: the user, 2026-10-21, "now release a new beta thanks".

## Docs Sync Result

- Docs sync artifact: `tickets/done/remote-discovery/docs-sync-report.md`
- Docs sync result: `Updated` (by the implementation; verified by delivery, no further edit)

## Ticket State Transition

- Ticket moved to `tickets/done/remote-discovery`: `Yes`

## Environment Or Persisted-Data Transition Notes

- `Not Affected`: nothing is stored. A listing writes nothing on either node (QR-402, RC-26).

## Rollback Criteria

Revert the merge on `personal` and cut a new release (`RELEASE.md`). Without the opt-in tools selected, agents see no change. With the switch off (the default), no remote path runs.

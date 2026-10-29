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

## Finalization Record (DR-001)

### Repository Finalization

- Ticket branch `codex/remote-discovery`, final commit `977c3c4b00`:
  - path hygiene exit 0; licensing consistent;
  - Secret Gate `origin/personal..HEAD`: 11 commits, PASS;
  - pushed to `origin` as a new branch.
- Finalization target: `origin` / `personal`, still `8fbe77c461` at every fetch.
- Merge: `finalize/remote-discovery`, `--no-ff`, giving `9bf8ad61a7` with a tree identical to the ticket branch. Secret Gate PASS.
- `git push origin HEAD:personal`: `8fbe77c461..9bf8ad61a7`. Repository finalization: `Completed`.

### Release: beta v1.5.8-beta.6

- Decision: the user's, 2026-10-21 ("now release a new beta thanks"). The beta carries autobyteus-247 (merge `829928ceb6`) and autobyteus-261 (merge `9bf8ad61a7`).
- **Method:** `RELEASE.md`, from a fresh worktree of `origin/personal` `9bf8ad61a7` on `finalize/release-1.5.8-beta.6`. Deviations: none.
- **Checks before tagging,** all passed:
  - licensing: "Licensing is consistent.";
  - artifact hygiene: exit 0;
  - `check_secrets.sh v1.5.8-beta.5..HEAD`: 35 commits, PASS.
- **Version, tag and release commit:**
  - `next-beta` gave `1.5.8-beta.6`.
  - `desktop-release.sh beta --branch finalize/release-1.5.8-beta.6 --no-push` made the release commit `d7bdf99139` (`autobyteus-web/package.json` = `1.5.8-beta.6`) and the annotated tag `v1.5.8-beta.6`.
- **Push:** Secret Gate PASS; `origin/personal` was refetched and unchanged. `git push origin HEAD:personal` gave `9bf8ad61a7..d7bdf99139`, then the tag (10:55:17 UTC).
- **Pipelines,** all `success` (`gh run watch --exit-status`):
  - Desktop Release `39588107376`;
  - Android APK Release `39588107358`;
  - iOS App Store Connect Release `39588107502`;
  - Server Docker Release `39588107427`.
- **Published artifacts:**
  - GitHub pre-release `v1.5.8-beta.6`, not a draft, with 17 assets: the APK and `.sha256`, the Linux x64/ARM64 AppImages, the macOS ARM64/x64 `.dmg`/`.zip` with blockmaps, the Windows `.exe`, and the four `latest*.yml`.
  - Docker `autobyteus/autobyteus-server:1.5.8-beta.6` and `:beta` share `sha256:efbff5eae6ac…` (amd64, arm64). `:latest` stays on `1.5.7` (`sha256:821e777d8e88…`).
- **Release result:** `Completed`. Release notes: `Not required` (generated notes for a pre-release).
- **Rollout:** desktop installs with **Settings > Updates > Receive beta updates** on are offered `1.5.8-beta.6`. Docker: `autobyteus-docker upgrade --all --tag beta`. Rollback per `RELEASE.md` (no app-data migration).

### Post-Finalization Cleanup

- Worktrees `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-discovery` and `/Users/normy/autobyteus_org/autobyteus-worktrees/release-1.5.8-beta.6`: `Completed`, removed with `git worktree remove --force` right after this record's push.
  - Checked first: no process runs from either.
  - Everything tracked is pushed; untracked `*/dist/` build output goes with them.
  - Prune: `Completed`.
- Local branches `codex/remote-discovery` (`977c3c4b00`, contained in `origin/personal`), `finalize/remote-discovery` and `finalize/release-1.5.8-beta.6`: `Completed`, deleted.
- Remote ticket branch: kept on `origin` (`Not required`).

### Final Status

- Verification complete: AC-401 … AC-407 `Yes` (from the evidence). AC-408 `No`: the user's check on `v1.5.8-beta.6` is open, by the user's decision to finalize and release first.
- Repository finalization complete: `Yes` (`9bf8ad61a7` on `personal`).
- Applicable release/deployment/rollout complete: `Yes` (beta `v1.5.8-beta.6`, complete: four of four workflows, 17 assets, Docker `:beta`).
- Applicable safe cleanup complete: `Yes`.
- Unresolved blocker: none for delivery. AC-408 waits for the user, and a failure there is fixed forward.
- Terminal package sent to the Solution Designer: `Yes`, stating AC-408 as open with the user.

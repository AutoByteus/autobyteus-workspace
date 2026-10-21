# Delivery / Release / Deployment Report — remote-nodes-page (autobyteus-267)

## Scope

Nodes → Remote Collaboration page (`Medium` / `Low`, direct route). The scope is repository finalization to `origin/personal`, then beta `v1.5.8-beta.8` at the user's request.

## Project Release Guide

- `RELEASE.md` at `origin/personal` `00d8a7ce62`. Deviations: `None`. Proposed fixes: `None`.

## Initial Delivery Integration Refresh

- Bootstrap base: `9e7a458808`. Latest checked: `00d8a7ce62` (advanced: remote-node-runtime-sign-in, `1.5.8-beta.7`).
- Checkpoint: `186e487af1`. Method: `Merge` (`534ae78028`). Result: `Completed`, no conflicts. `autobyteus-web/package.json` and `autobyteus-web/docs/settings.md` changed on both sides and were checked.
- Post-integration checks rerun: `Yes`, DEL-01 … DEL-06 (`handoff-summary.md` § Integration). Result: `Passed`.
- Delivery edits started only after the integrated state was current: `Yes`.

## Verification

- Evidence judged: `Sufficient` for AC-501, 502, 504, 505 and 507. The evidence relied on: the API-REV-002 report and scorecard (95%, no category below 90%), the probe JSON and screenshots of runs 5 and 6, the API-01 receipt, and DEL-05/DEL-06.

| Acceptance-Criteria ID | Cases And Files Checked | What You Saw | Judgement |
| --- | --- | --- | --- |
| AC-501 | RNP-01 (runs 6, DEL-06); RC-27 `pageCodes`, `heldPage` | Seven peers settle on their own (about 0.24 s): Available, Not reachable, Off there, Not registered there, Different server, Available. Theta shows "Checking…" / "Waiting for theta… up to 20 seconds." while others are settled, then Not reachable at about 20.1–20.2 s. Server codes are per state; held at 20.0 s | Proven |
| AC-502 | RNP-02, RNP-09; RC-26 `pageOffer` | The DOM list equals the window's and alpha's answer. `peerNodeOffer(beta)` equals `list_available_agents {node}`'s 12 entries without addresses. The window made 0 requests to peers (106 total, all to its own server) | Proven |
| AC-504 | RNP-02; screenshot | 30 entries, one line; "copy" narrows to "3 of 24" Agents and "1 of 6" Teams; no-match text; clear restores | Proven |
| AC-505 | RNP-03 … RNP-06, RNP-08 | Off: the notice, no chips, 0 asked. On: each of 8 peers asked once. Add: the new peer asked once. Refresh: one peer. Return to the tab and switch off/on while theta's ask is open: theta asked again (`{1, 1}`; the F-001 retest). 0 asks in 30 s quiet | Proven |
| AC-506 | — | The user's check (desktop window on the Docker node and on the desktop node, both directions) | User Check: open, on `v1.5.8-beta.8` |
| AC-507 | RNP-07; RC-01 … RC-29 | Rename and remove work, and remove asks nobody; the 261 tool results are unchanged (29/29 on the merged state) | Proven |

- More evidence requested: `None`.
- User check needed: `Yes`, AC-506. The user asked for a new beta during delivery ("could you please release a new beta", 2026-10-21). Delivery took that as the same choice the user made for autobyteus-261: finalize, then check on the beta. AC-506 stays open until the user reports it.

## Release Decision

- `Beta` `v1.5.8-beta.8`, by the user, 2026-10-21.

## Docs Sync Result

- `tickets/done/remote-nodes-page/docs-sync-report.md`: `Updated` (`autobyteus-web/docs/settings.md`, the in-flight rule; the implementation's docs verified).

## Ticket State Transition

- Moved to `tickets/done/remote-nodes-page`: `Yes`.

## Environment Or Persisted-Data Transition Notes

- `Not Affected`: nothing is stored or cached.

## Rollback Criteria

Revert the merge on `personal` and cut a new release. The page only reads; no data is involved.

## Finalization Record (DR-001)

### Repository Finalization

- Ticket branch `codex/remote-nodes-page`, final commit `0873f8f17b`:
  - path hygiene exit 0; licensing consistent;
  - Secret Gate `origin/personal..HEAD`: 14 commits, PASS;
  - pushed to `origin` as a new branch.
- Finalization target: `origin` / `personal`, still `00d8a7ce62` at every fetch.
- Merge: `finalize/remote-nodes-page`, `--no-ff`, giving `ab91ed5404` with a tree identical to the ticket branch. Secret Gate PASS.
- `git push origin HEAD:personal`: `00d8a7ce62..ab91ed5404`. Repository finalization: `Completed`.

### Release: beta v1.5.8-beta.8

- **Decision:** the user's, 2026-10-21 ("could you please release a new beta"). The beta carries autobyteus-267 (merge `ab91ed5404`).
- **Method:** `RELEASE.md`, from a fresh worktree of `origin/personal` `ab91ed5404` on `finalize/release-1.5.8-beta.8`. Deviations: none.
- **Checks before tagging,** all passed:
  - licensing consistent;
  - artifact hygiene exit 0;
  - `check_secrets.sh v1.5.8-beta.7..HEAD`: 16 commits, PASS.
- **Version, tag and release commit:**
  - `next-beta` gave `1.5.8-beta.8`.
  - `desktop-release.sh beta --branch finalize/release-1.5.8-beta.8 --no-push` made the release commit `1ea9d9dd1a` (`autobyteus-web/package.json` = `1.5.8-beta.8`) and the annotated tag `v1.5.8-beta.8`.
- **Push:** Secret Gate PASS; `origin/personal` was refetched and unchanged. `git push origin HEAD:personal` gave `ab91ed5404..1ea9d9dd1a`, then the tag (16:51:08 UTC).
- **Pipelines,** all `completed success`:
  - Desktop Release `39638485134`;
  - Android APK Release `39638485016`;
  - iOS App Store Connect Release `39638485363`;
  - Server Docker Release `39638484838`.
  - Delivery's own watcher was stopped by a session restart, so the conclusions were read afterwards with `gh run view`.
- **Published artifacts:**
  - GitHub pre-release `v1.5.8-beta.8`, not a draft, with 17 assets (APK and `.sha256`, Linux x64/ARM64 AppImages, macOS ARM64/x64 `.dmg`/`.zip` with blockmaps, Windows `.exe`, four `latest*.yml`).
  - Docker `autobyteus/autobyteus-server:1.5.8-beta.8` and `:beta` share `sha256:2702e31b0311…` (amd64, arm64). `:latest` stays on `1.5.7` (`sha256:821e777d8e88…`).
- **Release result:** `Completed`. Release notes: `Not required` (pre-release).
- **Rollout:** desktop installs with beta updates on are offered `1.5.8-beta.8`. Docker: `autobyteus-docker upgrade --all --tag beta`.

### Post-Finalization Cleanup

- Worktrees `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-nodes-page` and `/Users/normy/autobyteus_org/autobyteus-worktrees/release-1.5.8-beta.8`: `Completed`, removed with `git worktree remove --force` right after this record's push.
  - Checked first: no process runs from either.
  - Everything tracked is pushed; untracked build output goes with them.
  - Prune: `Completed`.
- Local branches `codex/remote-nodes-page` (`0873f8f17b`, contained in `origin/personal`), `finalize/remote-nodes-page` and `finalize/release-1.5.8-beta.8`: `Completed`, deleted. Remote ticket branch kept.

### Final Status

- Verification complete: AC-501, 502, 504, 505, 507 `Yes`. AC-506 `No`: the user's check on `v1.5.8-beta.8` is open, by the user's request to release a beta.
- Repository finalization complete: `Yes` (`ab91ed5404`).
- Release complete: `Yes` (beta `v1.5.8-beta.8`, four of four workflows, 17 assets, Docker `:beta`).
- Safe cleanup complete: `Yes`.
- Unresolved blocker: none for delivery; AC-506 waits for the user.
- Terminal package sent to the Solution Designer: `Yes`, stating AC-506 as open.

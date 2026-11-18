# Delivery / Release / Deployment Report — autobyteus-352, beta v1.5.11-beta.8 (Release Requested)

## Release / Publication / Deployment Scope

- Release request: Project Task `autobyteus-352`, from `/project_task_manager` on the user's words of 2026-10-31, "lets release a new beta"; handed off by the Solution Designer (`handoff-release-requested.md`). No software change.
- It carries everything merged into `personal` after `v1.5.11-beta.7` (139 commits), mainly:
  - autobyteus-316 (merge `2df46e7f91`): continue a stopped agent on another runtime; the GraphQL mutation rename that breaks old clients;
  - autobyteus-339 (merge `5d0df2eeb3`): reliable "Install update and restart";
  - autobyteus-347 (merge `d9a51f16dc`): Projects in the left panel.
- Docs sync, the handoff summary and verification from evidence do not apply to a release request; the release guide's checks are the verification.

## Project Release Guide

- Release guide path and revision: `RELEASE.md` on `origin/personal` @ `eaafd77ac5`, read in the release worktree; unchanged since `v1.5.11-beta.7`.
- Deviations from the guide and why:
  - **Release body:** RELEASE.md says betas use GitHub generated notes. After all four workflows finished, this release's `release-notes.md` was added above the generated notes with `gh release edit`; no asset or tag changed. Reasons:
    - the beta carries a GraphQL change that breaks old clients;
    - it is the first release the user's nodes receive in place, and users need to update while idle.
    The same deviation was made for v1.5.11-beta.6 and beta.7.
  - autobyteus-339 has no `release-notes.md` (its delivery released nothing). Its line was written from `tickets/done/update-restart-reliability/handoff-summary.md`.
- Proposed guide fixes (need the user's agreement; the guide is not changed):
  - as proposed in autobyteus-305 DR-003, a beta whose change needs a user action adds it to the generated notes;
  - the release smoke check's Grok pin should be robust to the Grok CLI's varying model catalog (see below; FU-005 of `tickets/done/work-journal-neutral-vocabulary`).

## Release Decision

- Decision: `Beta`, version `1.5.11-beta.8` (`python3 scripts/release_versions.py next-beta`).
- Decided by: the user, 2026-10-31: "lets release a new beta".

## Checks Before Tagging (on `origin/personal` @ `eaafd77ac5`; `evidence/REL-01-pretag-checks-and-release-smoke.log`)

- `python3 scripts/check_licensing.py`: `Licensing is consistent.`
- `python3 scripts/check_repository_artifact_hygiene.py`: `Repository artifact hygiene check passed.`
- `scripts/check_secrets.sh v1.5.11-beta.7..HEAD`: `PASS (no secrets found)`, 139 commits.
- Release smoke check, after `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild`:
  - Runs 1 and 2 aborted the live suite before any scenario. The suite checks the Grok runtime's `providerModelCatalogSnapshots` for its model, and the list varied between calls:
    - run 1: the default `grok-4.7` was not offered (`available: grok-4.5, grok-4.6`);
    - run 2, with the suite's documented override `GROK_E2E_MODEL=grok-4.6`: `grok-4.6 is not offered; available: grok-4.7`.
    This is the known flaky pin (FU-005 of `tickets/done/work-journal-neutral-vocabulary`), not this release's code. Antigravity and AutoByteus passed both runs.
  - **Run 3 (default pin): PASS.** All 13 scenarios: Claude 3/3, Codex 3/3, Grok 3/3, Antigravity 2/2, AutoByteus 2/2; models `{"claude": "haiku", "codex": "gpt-5.6-luna", "grok": "grok-4.7"}`; `result PASS`, exit 0.
  - **No runtime waiver** was needed or used.
- Build-only release run `41230080206` (`pnpm release:test --ref personal`) on `eaafd77ac5`: success, all five desktop targets (`evidence/REL-02-build-only-run.log`).

## Version / Tag / Release Commit

- `bash scripts/desktop-release.sh beta --branch finalize/release-v1.5.11-beta.8 --no-push`: commit `e87e6bb2b1` `chore(release): bump workspace release version to 1.5.11-beta.8`, annotated tag `v1.5.11-beta.8`. Run on a clean tree: the ticket folder was stashed and the untracked `*/dist/` from the smoke check's prebuild removed.
- `origin/personal` re-fetched (still `eaafd77ac5`), then `git push origin HEAD:personal` (`eaafd77ac5..e87e6bb2b1`) and `git push origin v1.5.11-beta.8` (19:00:59 UTC).

## Repository Finalization

- The work was already merged. Finalization is the release commit on `personal` (above) and this ticket's records, pushed to `personal` after the rollout, plus the archive move to `tickets/done/release-v1.5.11-beta.8/`.

## Release / Publication / Deployment

- Applicable: `Yes`. Method: `Project Release Guide`.
- Pipelines triggered and their results (`evidence/REL-03-rollout.log`), watched together, all **success**:
  - Desktop Release `41232166379` (five builds and Publish);
  - Android APK Release `41232166380`;
  - iOS App Store Connect Release `41232166595` (build, test, archive, TestFlight upload);
  - Server Docker Release `41232166412` (image, plus Publish Server Package `linux/arm64` and `linux/amd64`).
- Published artifacts checked against what the release should produce:
  - GitHub release `v1.5.11-beta.8`: pre-release, not draft, **23/23 assets**, including the six `autobyteus-server-1.5.11-beta.8-linux-{arm64,x64}.{tar.gz,json,json.sig}`. GitHub "Latest" remains `v1.5.10`.
  - Docker Hub: `:1.5.11-beta.8` and `:beta` = `sha256:1f6b9fd257a3…`; `:latest` unchanged (`sha256:a1c22e2e4186…`).
- **In-place update of a test node** (`evidence/REL-04-in-place-update-beta7-to-beta8.log`): test-owned container `rel8-inplace` with fresh volumes on the published `1.5.11-beta.7` image (the user's nodes' version); never the user's nodes.
  - `POST /rest/node-update {"version":"1.5.11-beta.8"}`, the Nodes page's request, was accepted, logged with `requestedFrom` `172.17.0.1`.
  - Steps: checking 0 s → downloading 2 s → preparing 31 s → no answer while restarting 42 s → confirming 44 s → **succeeded 104 s**, "Updated to 1.5.11-beta.8.".
  - The old server exited at 19:42:40.396; the new one started at 19:42:40.399.
  - Same container and image. The server runs from `/home/autobyteus/server-packages/packages/1.5.11-beta.8` (`source: installed`). Health ok, data marker kept, no key material in the node log. Container and volumes removed.
- Release notes handoff result: `Used`. Generated notes, with this ticket's `release-notes.md` added above them (deviation above).
- Release/publication/deployment result: `Completed`

## What The User Should Check After Updating

1. The desktop updates to 1.5.11-beta.8 through its beta channel (Settings → Updates → Receive beta updates).
2. In **Nodes → Manage Nodes**, each Docker node (`autobyteus-server-0/1/2`, all on 1.5.11-beta.7 with their server-packages volumes since 2026-10-31) shows **Server 1.5.11-beta.7** and **Update to 1.5.11-beta.8**, "Same version as this app".
3. Click it **while the node is idle**: until autobyteus-305 step 5, an update stops agents that are mid-turn. The row shows the steps, then "Updated to 1.5.11-beta.8." after about 2 minutes. The node keeps its container; no image is pulled. Alternative: `autobyteus-docker update --all`.
4. Remote nodes should be updated together with the desktop, because the GraphQL rename breaks older clients.

## Post-Finalization Cleanup

- Release worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/release-v1.5.11-beta.8` and local branch `codex/release-v1.5.11-beta.8` were created for this release; they are removed once the records are on `personal` (DR-001 record). The local finalize branch is deleted.
- The pulled image tag `autobyteus/autobyteus-server:1.5.11-beta.7` was left in place: it is the image the user's nodes run.

## Rollback Criteria

- RELEASE.md rules. This beta adds no data migration. Projects mode adds a new file per Project that earlier versions ignore. A run switched to another runtime with this version has not been tested on an earlier version. Docker nodes cannot be downgraded in place; `:beta` only moves forward.

## Final Status

- Release guide checks complete: `Yes`; release complete: `Yes` (4/4 workflows, 23/23 assets, `:beta` moved, an in-place update from beta.7 proven).
- Unresolved blocker: `None`. Successful terminal package eligible for return: `Yes`.

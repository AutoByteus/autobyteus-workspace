# Handoff Summary — autobyteus-305, build step 2 (starter and server-packages volume)

This summary holds the latest delivery (DR-002, step 2). Step 1's summary (DR-001: signed server package, merged as `eec6522b27`) is in git at `77fb8bf2d1`.

## What This Delivery Contains

Build step 2 of 5. Steps 3–5 (in-place update by command, desktop, mid-turn runs come back) are not built yet.

- **Starter:** supervisord now runs `/opt/autobyteus/starter/starter.mjs`, which runs the node's server package as its child (own process group). It forwards a stop to the server and exits with the server's code on a crash, so supervisord restarts it.
- **Package choice at each start:** an installed package (from the volume) if it fits this image and is not older than the built-in one; otherwise the built-in package unless the node already ran a newer version; otherwise no server and `NEEDS_NEW_IMAGE`. The starter stays up and names the image and the launcher command.
- **Starter state** (`state.json`, `update.json`) lives in the new per-node volume `<node>-server-packages` at `/home/autobyteus/server-packages`. The bash and PowerShell launchers mount it, with config hash `v7`. Compose mounts `autobyteus-server-server-packages`.
- **C2 and C1:** the starter answers on a socket (`cli.mjs status`); the server relays it as `GET /rest/node-update[?target=<version>]` (route class `TRUSTED_NETWORK_OWNER`: phones get 403). `inPlaceUpdate: "unavailable"` is returned on servers without a starter (desktop, development).
- **CR-N1 from step 1 is done:** the workflow's way-out command now prints `-f publish_zh=true` for a zh run.
- Docs: Docker README (starter, selection, status), root and server READMEs (volume), TESTING.md (starter test layer), and `remote_access.md` (route, added by delivery).

## Classification And Route

- Task size `Large`, architectural risk `High`, route `Reviewed`: SR-005 (SR-006/007) → ARCH-REV-003 → IR-002 → CRR-003 Pass (9.5/10) → API-REV-002 Pass (94.7%) → CRR-004 Not Applicable (no durable test changed) → delivery DR-002.

## Integration

- `origin/personal` was still `77fb8bf2d1` (the step-1 finalization), so the branch was already current and nothing was merged. API/E2E tested `6637b54d46`, whose code equals `b1029fc1b0`. Everything after it is ticket documents only.
- Delivery checks on the delivered state (DEL-03): 26/26 starter tests, 176 script tests OK (2 skipped), system level 1 unchanged, licensing, hygiene and secret gate pass.

## Verification

Verified from the evidence (details in `release-deployment-report.md`). Every step-2 critical criterion is directly proven:
- the starter's package choice incl. `NEEDS_NEW_IMAGE`;
- the move to the starter image by bash v6 and v7 launchers, PowerShell and compose, with all volumes and data kept;
- the C1/C2 status;
- the phone refusal with a real paired phone;
- the starter's supervision.

The 94.7% confidence is 0.3 under the 95% target. The gap is durable PowerShell execution coverage, which is FU-006's pre-existing gap. API/E2E executed every step-2 PowerShell path once (API-22).

## Decisions And Notes For The Solution Designer

- **CR2-N1 (a release between step 2 and step 3), accepted by delivery as an interim.** After a newer version ran, a node retargeted to an older image (`upgrade --all --tag <older>`) runs no server, and the launcher's `status` still says "running". The refusal shows only in the node log and in `docker exec <c> node /opt/autobyteus/starter/cli.mjs status` (Docker README).
  - Before step 2, the same action started an older server on data a newer one may have migrated, so this is safer, not a regression.
  - It needs a deliberate downgrade (a non-goal), and REQ-011's status is reported through C1/C2 as required.
  - So a release may fall between step 2 and step 3. If the user wants the launcher `status` line before such a release, that is a small change to bring forward from step 3.
- **RU-23, for the step-3 design and the release notes of the release that ships step 3.**
  - A node that an installed v6 launcher recreates has no `<node>-server-packages` volume, so starter state stays in the container layer. In step 2 that loses nothing: the next boot chooses the built-in package again.
  - From step 3, a package installed in place on such a node would be lost at that launcher's next recreate on an image change.
  - The new launcher (from `personal`, `autobyteus-docker.sh … install`) adds the volume on its next `upgrade --all` (API-12 phase C).
  - Users must reinstall the launcher, and the step-3 release notes must say so. The step-3 design may also want the update to refuse when the volume is missing.
- **The launcher is installed from the `personal` branch.** This merge changes the launcher for anyone who reinstalls it now, before any release. API-12 phase A covers that: the v7 launcher on the published `:beta` (old layout) recreates once, mounts the unused volume and keeps everything.
- **FU-006** (added by API/E2E): the PowerShell launcher's fresh port pick (`new-container`, `reset`) is broken since `517a0bce53`, the same on `origin/personal`. It is a pre-existing follow-up for the Solution Designer to send.

## Still Open From Step 1 (unchanged)

No release has been cut since step 1's merge (newest `v1.5.11-beta.5`, before it). On the first release after it, whoever cuts it must:
1. check that it has 23 assets;
2. unpack one published `autobyteus-server-<v>-linux-<arch>.tar.gz` and compare it with that image's `/opt/autobyteus/server-package` (`evidence/IMP-06-manifest.sh`);
3. confirm the package job neither timed out nor failed on the secret/key pair.

That release will also ship step 2 (the starter) if this merge lands first, so CR2-N1 applies to it.

## Where Things Are

- Merged into `personal` with `--no-ff` as `a0f4b491f7` (pushed; Secret Gate PASS before both pushes). No release.

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`. Kept for steps 3–5.
- Ticket folder stays at `tickets/in-progress/docker-node-in-place-server-update/`.
- Implementation's local images `autobyteus-server-305-test:step1`, `:step1-amd64`, `:step2` and container `ab305-extract` are left to their owner. The user's nodes `autobyteus-server-0/1/2` were never touched.

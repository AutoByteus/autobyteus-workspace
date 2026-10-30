# Handoff Summary — autobyteus-305, build step 1 (signed server package)

## What This Delivery Contains

Build step 1 of 5 of the design spec: **signed server package**. Each step is reviewed and merged on its own. Steps 2–5 (starter and server volume, in-place update by command, desktop, mid-turn runs come back) are not built yet.

- The Docker image runs its server from a built-in server package at `/opt/autobyteus/server-package` (supervisord still starts `node dist/app.js`; no starter yet).
- Each default-variant release will publish, per architecture (`x64`, `arm64`), `autobyteus-server-<version>-linux-<arch>.tar.gz`, `.json` (description) and `.json.sig` (Ed25519 signature) on the GitHub release, taken out of the pushed image. A complete release now has 23 assets (was 17).
- Base images are pinned by digest in `autobyteus-server-ts/docker/system-level.json`. The release workflow refuses an image whose system part changed without a new level.
- Removed: `bootstrap.sh` and the dead `AUTOBYTEUS_WORKSPACE_ROOT` / `AUTOBYTEUS_SKIP_SYNC` variables (launcher, compose, `.env.example`).
- New GitHub secret `SERVER_PACKAGE_SIGNING_KEY` (set 2026-10-30, IMP-10); public key in `autobyteus-server-ts/docker/server-package-signing-key.pem`.
- Docs: DESIGN.md rule 9 exception, GLOSSARY, RELEASE.md, TESTING.md, Docker README.

## Classification And Route

- Task size `Large`, architectural risk `High`, route `Reviewed`: SR-005 → ARCH-REV-002 Pass → IR-001 → CRR-001 Pass (9.5/10) → API-REV-001 Pass (95%) → CRR-002 Pass → delivery DR-001.

## Integration

- Method: merge of `origin/personal` @ `e4bebdc858` into the ticket branch (`a85cf65c52`), after a checkpoint commit of the review records (`44620de716`). The base brought autobyteus-284 (bounded shutdown); no file overlaps with this ticket.
- Post-integration checks (DEL-01): 174 script tests OK (2 skipped as before), system level unchanged, actionlint and shellcheck clean, licensing, artifact hygiene and secret gate pass.
- Integrated-state image (DEL-02): arm64 image built from the merged tree (`server-package.json: 1.5.11-beta.5 linux-arm64, … 61 migrations`); container healthy in 8 s, `/mobile/` 200, GraphQL answers, server cwd `/opt/autobyteus/server-package`, the base's 284 shutdown code inside the package, no `bootstrap.sh`. Container and image removed.

## Verification

Verified from the evidence (details in `release-deployment-report.md`): AC-011's local part, BEH-001 (preserved) and the removal plan are directly proven. AC-011's GitHub part (the real release run with the real secret) can only be proven by a release. A release can only be cut after this merge, and none was requested.

## Open Until The First Release (whoever cuts it)

The first release after this merge is the first real run of the `publish-server-package` job. Whoever cuts it must check:

1. `gh release view vX.Y.Z[-beta.N] --json assets` lists **23** assets, including the six `autobyteus-server-<v>-linux-{x64,arm64}.{tar.gz,json,json.sig}`.
2. One published `autobyteus-server-<v>-linux-<arch>.tar.gz`, unpacked, is identical to `/opt/autobyteus/server-package` in that release's image (files, links, modes; the method is in `evidence/IMP-06-manifest.sh`).
3. The package job did not time out waiting for the release (30 minutes) and did not fail on the secret/key pair.

A package job failure leaves a partial release in the RELEASE.md sense. Nodes do not read packages before step 3, so users are not affected in the meantime.

## Not Done Here

- CR-N1 code side: the workflow's "Check system level" error message should print `-f publish_zh=true` for a zh run (the Docker README already says it). Left to implementation with step 2.
- Follow-ups FU-001..FU-005 are unchanged (`follow-ups.md`). Delivery added none.
- Prerequisite PRQ-001 (autobyteus-284, bounded shutdown) merged into `personal` on 2026-10-30 (`c0a4409a9b`), so it is in the base now. PRQ-002 (285/287) is still open.

## Where Things Are

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`. Kept for steps 2–5.
- Ticket folder stays at `tickets/in-progress/docker-node-in-place-server-update/`, because the ticket continues with step 2.
- Local test images kept by implementation: `autobyteus-server-305-test:step1`, `:step1-amd64`; leftover created container `ab305-extract` (implementation's).

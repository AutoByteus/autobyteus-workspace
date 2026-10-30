# Handoff Summary — autobyteus-305, build step 3 (in-place update by command)

This summary holds the latest delivery (DR-003, step 3). Earlier summaries are in git: step 1 at `77fb8bf2d1`, step 2 at `6b34f900b6`.

## What This Delivery Contains

Build step 3 of 5. Steps 4 (desktop) and 5 (mid-turn runs come back) are not built yet.

- **`autobyteus-docker update [--name <node> | --all] [--version <X.Y.Z>]`** (bash and PowerShell). Without `--version` it uses the newest release on the node's saved track: `latest`/`latest-zh` → stable, `beta` → newest. Pinned or custom images need `--version`. It prints the target, the steps it sees and the result.
- **The starter's update:**
  1. find the release on GitHub;
  2. download the package;
  3. verify the archive, the signed description and the Ed25519 signature against the image's public key;
  4. check it fits (architecture, Node ABI, system level);
  5. prepare;
  6. self-check start on a temporary data folder;
  7. stop, then a data copy when the package brings new migrations (DEC-005, with a free-space check before stopping);
  8. switch and confirm.

  A failure after the switch restores the old version and, when copied, its data.
- **Refusals** (nothing changes): `NOT_NEWER`, `INVALID_VERSION`, `NO_PACKAGE_FOR_VERSION`, `ARCHIVE_MISMATCH`, `DESCRIPTION_MISMATCH`, `SIGNATURE_INVALID`, `NEEDS_NEW_IMAGE`, `NO_PACKAGES_VOLUME`, and not enough space.
- **`autobyteus-docker status`** shows each node's server version, an update in progress, and an `updateBlocker`. Boot recovers an update a stop interrupted, and deletes unreferenced packages.

## Classification And Route

- Task size `Large`, architectural risk `High`, route `Reviewed`: SR-009/SR-010 → ARCH-REV-004 → IR-003 → CRR-005 Pass (9.5/10) → API-REV-003 Pass (94.7%) → CRR-006 Not Applicable → delivery DR-003.

## Integration

- Checkpoint commit `fed31bb5fb` (the code reviewer's CRR-005/CRR-006 records), then a merge of `origin/personal` @ `a8d7c87564` as `f0b2b43dbc`. The base brought autobyteus-343 (stored runtime names, a new app-data migration). No file overlaps.
- DEL-04: 48/48 starter tests, 184 script tests OK (2 skipped), 123 server tests (node-update, remote-access, architecture), server typecheck, actionlint, shellcheck, level check, licensing, hygiene and secret gate.
- DEL-05: an arm64 image built from the merged tree (`… 62 migrations`, including the base's `raw-trace-manifest-runtime-names`). The container was healthy in 8 s; the public key in the image equals the committed one; no source override.
  - Against the **real GitHub releases**: `update --track beta` resolved the newest beta (1.5.11-beta.5) and refused `NOT_NEWER`; `--version 1.5.11-beta.99` was refused `NO_PACKAGE_FOR_VERSION`. The server pid was unchanged.
  - Container, volume and image were removed.

## Verification

Verified from the evidence (`release-deployment-report.md`). AC-002, AC-003, AC-004, AC-005, AC-006, AC-008, AC-012, AC-013 and RU-23 are directly proven through the real launchers against real starters (API-31..API-36: 69 checks pass). The two failed checks expected step lines that the 2 s polling can skip; the target and the result always print. Confidence 94.7%: the gap is FU-006's pre-existing PowerShell coverage, as in step 2. The production key and the GitHub download path are proven by the first release with packages.

## Release

The user asked for a new beta once the audit passed: **v1.5.11-beta.6 is released**, carrying steps 1–3.

- 4/4 workflows succeeded and 23/23 assets are published; it is a pre-release, and "Latest" stays v1.5.10. Docker `:1.5.11-beta.6` = `:beta`; `:latest` is unchanged.
- **The step-1 first-release checks passed:**
  - the production key verifies both descriptions;
  - the published arm64 archive is byte-identical to the image's built-in package;
  - the published image's starter reads the real GitHub releases.
- On the way, the user waived Grok in the release smoke check (quota exhausted).
- Also on the user's instruction, delivery moved the desktop macOS builds to `macos-15`: the `macos-14` brownout had cancelled the first build-only run, and the image retires on Nov 2 (FU-007, resolved).
- The release page has the Docker section with the launcher-reinstall instruction above the generated notes.
- Details: `release-deployment-report.md`.

## Notes For The Solution Designer

- **CR3-N1** (non-blocking): a self-check failure always says "no health answer within 120 s" and discards the candidate's output. Not taken in delivery (it is a code change); for implementation with step 4. It ships in this beta: such a failure still refuses safely, with a less precise reason.
- **API/E2E observations, not findings:** the launcher can skip short steps when it polls; `state.json` may keep a stale built-in `previous` after a recreate, which nothing reads.
- **RU-23** is in the release notes, with the reinstall and `upgrade --all` commands.
- **FU-006** stays a follow-up (PowerShell fresh port pick).

## Where Things Are

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update`, branch `codex/docker-node-in-place-server-update`. Kept for steps 4–5.
- Ticket folder stays at `tickets/in-progress/docker-node-in-place-server-update/`.
- Implementation's local images `autobyteus-server-305-test:*`, container `ab305-extract` and `/tmp/ab305/proof` are left to their owner. The user's nodes `autobyteus-server-0/1/2` were never touched.

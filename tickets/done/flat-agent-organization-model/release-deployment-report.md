# Delivery / Release / Deployment Report — DR-012

## Result

**Delivery Completed — AutoByteus v1.4.71 is publicly released.** The user
explicitly requested a new version after accepting the complete flat AgentOrg
feature line. Classification remains **Large / High / Reviewed**.

This round publishes the DR-011-accepted implementation. It does not overwrite
historical review, API/E2E, limitation, or accepted-issue records.

## Stable release

- Release commit: `e8b6c3b41f54de4226c98662b6c040ef1e125edf`.
- Annotated tag: `v1.4.71` (tag object
  `7a6125fa285d91efe201ca3f6571b290a7c6a904`).
- GitHub release:
  <https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.71>.
- State: published, stable, non-draft, non-prerelease.
- Published at: `2026-09-21T10:03:58Z`.
- GitHub assets: 21 uploaded, all nonempty.

Successful workflow results:

| Surface | Run | Result |
| --- | --- | --- |
| Desktop: Windows, macOS x64/arm64, Linux x64/arm64 | [35586415979](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586415979) | Success |
| iOS archive/upload | [35586415950](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586415950) | Success |
| Messaging Gateway | [35586415751](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586415751) | Success |
| Android signed APK recovery | [35586707639](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586707639) | Success |
| Server multi-architecture Docker recovery | [35586953949](https://github.com/AutoByteus/autobyteus-workspace/actions/runs/35586953949) | Success |

## Recovery history

The canonical `1.4.70` attempt encountered repository artifact hygiene before a
release was published. Its Desktop and Android runs failed; the other three
workflows were cancelled. The `v1.4.70` annotated tag remains as an audit
marker, but GitHub has no corresponding release and Docker Hub has no server
tag `1.4.70`.

Delivery archived the raw ticket evidence, removed 3,582 tracked raw evidence
entries, added durable archive notices, and passed the release hygiene scan over
31,360 tracked paths (maximum 199 characters). Archive locations and SHA-256
values are recorded in the DR-012 evidence.

Two v1.4.71 workflow-local blockers were repaired and rerun without moving the
published tag:

- Android `setup-android@v3` tried to install obsolete SDK package `tools`.
  Commit `83e213174b75a5d3d666e70fb03f4a3486cd83ba` updates to v4; recovery passed.
- The server Dockerfile omitted two new workspace contract packages. Commit
  `2a11ed7aaac45128276820a570206df2df9c8bfe` adds them to dependency, build, and
  runtime stages; recovery passed from that post-tag packaging commit.

These are release-infrastructure corrections. The tagged production application
source used by the public desktop/mobile/messaging artifacts was not rewritten.

## Publication verification

- All four updater YAMLs declare `1.4.71`; their referenced asset names exist
  and their declared sizes match GitHub.
- Android and messaging-gateway checksum files match the published asset
  digests.
- Messaging metadata and the managed release manifest name version/tag
  `1.4.71` / `v1.4.71` and resolve to uploaded assets.
- Docker tags `autobyteus/autobyteus-server:1.4.71` and `:latest` share digest
  `sha256:d6710356c74c6c36286738d09eba48d55af883c4600e35985c65329a4796bedb`.
- The Docker manifest includes linux/amd64 and linux/arm64.

The iOS job's success establishes archive and upload to App Store Connect. It
does not establish App Store review approval or public storefront availability.

## Documentation synchronization

**Pass — release records updated; no further product-doc impact.** The public
release notes already describe the accepted AgentOrg capabilities and
compatibility boundaries. DR-012 updates the delivery revision record, handoff
summary, docs-sync report, release/deployment report, and durable release
evidence. No product behavior or durable test source is changed by Delivery.

## Deployment and rollback boundary

GitHub desktop/mobile/gateway artifacts and the Docker images are publicly
published. No desktop app was installed, no user server was upgraded, no
database or profile was changed, no migration was executed against user data,
and no environment-specific rollout was performed.

Rollback remains explicit: do not move the immutable release tag. A corrective
release would use a new version; server consumers can pin the prior known image
tag/digest. No automatic user-data rollback is implied.

## Preservation and repository state

The unrelated main-worktree `package.json` modification plus `.article-work/`
and two application `dist/` trees were protected before release commits in a
named stash and checksum archive. They are restored only after the final DR-012
documentation push and verified against their exact baseline. No blanket
staging or unrelated cleanup is permitted.

Canonical evidence:
`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/flat-agent-organization-model/delivery-evidence/dr-012/release-v1.4.71.md`.

## Terminal handoff

Eligible after the DR-012 documentation commit equals `origin/personal`, the
protected unrelated state is restored exactly, and the final status contains no
delivery-owned residue. Return the authoritative completion package to Solution
Designer; do not replay release or publication operations.

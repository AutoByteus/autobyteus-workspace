# Root Cause and Permanent Correction — Source Implemented and Validated

## What actually failed
The prior startup engine resolver was defective in two connected ways:
1. It looks for bundled Prisma engines under the server package's node_modules, but Docker's pnpm layout keeps the actual engine package in the workspace-root node_modules/.pnpm. The installed CLI's dependency links already identify that package; the old resolver ignores them.
2. When its search misses those correct engines, it scans the root-user cache and selects a platform-compatible pair without checking the engine revision expected by the CLI. Native architecture compatibility is not RPC/protocol compatibility. The selected c299 engine lacks the listMigrationDirectories method used by installed Prisma5.22; the installed605 engine supports it.

This explains the original contrast: 8001 and8003 used identical image/startup/CLI bytes, but separate retained root-home volumes. Both had installed and cached engine copies. 8001's selected605 cached pair matched its CLI; node2's only complete pair was c299 (605 native cache directory empty). Thus the same faulty selection happened to work on8001 and failed on8003. This is the historical measured contrast, not a claim about every current container after user upgrade.

## Why there are installed AND /root cached engines
Prisma installs native binaries with its engine package and also caches downloads under the executing user's home. The backend runs as root/HOME=/root. Our launcher deliberately preserves that home in each node's own named volume for CLI sign-ins/settings. A cache and installed copy can therefore coexist and outlive an image. Two copies alone are normal; choosing an incompatible revision is the bug. See Prisma's [cache paths](https://github.com/prisma/prisma/blob/5.22.0/packages/fetch-engine/src/utils.ts), [postinstall](https://github.com/prisma/prisma/blob/5.22.0/packages/engines/src/scripts/postinstall.ts), and [download/copy logic](https://github.com/prisma/prisma/blob/5.22.0/packages/fetch-engine/src/download.ts).

The exact process/person/command that wrote node2's c299 cache has NOT been established. Prior image-only inspection found no root cache in that historical image; cache metadata predates recreation and the retained root-home explains its presence. Generic Prisma cache behavior and timestamps are not an actor audit. We did not inspect private shell history or credentials. There is no evidence someone damaged node2, or that destroy corrupted its DB.

## Why recreation and upgrade exposed it
New processes rerun normal schema/startup engine selection against the retained HOME. The earlier workaround explicitly selected matching installed engines in one container's Supervisor file. It survived a restart of that container, not replacement. After the user's upgrade, fresh read-only snapshot14:56:22Z on new node4a0c3f/image1779 proves both pins absent and the same cachedc299/RPC failure, although correct installed605 engines remain. That recurrence is not speculation. Delivery subsequently reports a second protected pin/readiness recovery; no new source fix was shipped by it.

The flawed automatic fallback predates these operations: source history ties it to Feb26 immutable Linux AppImage/native-engine EROFS repair, with later platform/DB corrections. Retiring obsolete Dockerfiles left this runtime owner unchanged. Exact last successful removed-node2 cache/image history cannot be reconstructed from available facts.

## Implemented permanent correction
Follow the real installed Prisma CLI's dependency graph to its own @prisma/engines package and @prisma/engines-version metadata. Prefer that package's supported native pair. Only fall back to cache under the exact expected revision, never another version or newest timestamp. Preserve explicit operator overrides and normal schema/error behavior. Use Node's [realpath package dependency resolution](https://nodejs.org/download/release/v22.15.0/docs/api/modules.html#package-manager-tips) / [createRequire](https://nodejs.org/download/release/v22.15.0/docs/api/module.html#modulecreaterequirefilename); don't hardcode an engine version or add another directory scan.

Independent API validation executed current-source Docker startup and actual container recreation using the SAME test-owned persisted home/data with the incompatible cache retained and no explicit pin. Package-local/flat/cache/override selection cases also passed. No real user volume or working-node changes. Source merge alone was not public-image publication. The later user-requested v1.5.3-beta.5 release now publishes the corrected image (see release status below). No user-node upgrade was authorized or performed; pins in still-installed old images remain recreation-unsafe.

Evidence: current investigation-notes.md E001..008; current recurrence-node2-readonly.json and available-image-dependency-metadata.json; prior finalized cause-comparison/control/RPC evidence and fresh Delivery recurrence package linked there. D1 is implemented at dd7be60ff6c732e0ddf6d9ac97a822bda8a85869; API-REV-002 scoped Pass95.7% and CRR-003 durable-test Pass are current authorities. Historical reports retain their stage-time wording. Current release/finalization state is in handoff-summary.md; source-native proof and later public-image publication are separate evidence. No user-node deployment is claimed.

## What the current proof establishes

The immutable dependency image1779 plus a read-only **current built server dist**
was audited across4559 files: only `startup/migrations.js` and its declaration
map differed. In the owned LinuxARM64 fixture, the original resolver selected
c299 and its native RPC returned method-not-found; the corrected source selected
its own605 bundle and the real RPC returned27 migration directories. Normal
startup reached three HTTP200/statusok responses. A representative definition
created through GraphQL survived removal of the first container and creation of
a different container over the same owned HOME/data; three further health checks
passed and the wrong-cache bytes remained unchanged. The immutable image alone
is **not** fixed or published by that test.

Delivery integrated the latest checked personal base and reran197 focused tests
and production typecheck successfully; tested runtime inputs/dist and69 raw
API evidence files were unchanged. No user node, pin or backup was probed or
modified. Native proof is LinuxARM64, not every packaged platform, UI, provider
or historical record.

The full integration suite remains **371 passed / 2 failed / 68 skipped, exit1**.
Independent failure-origin review confirms both failures are the existing,
unrelated streaming-cadence defect PB-001. They were not fixed, skipped or waived;
the second case did not reach later timing assertions. The manager retains the
separate approval-pending candidate, with no new Task ID or dispatch. Full units
were5455 passed/7 skipped; neither skipped tests nor source merge certify a
published image. Source delivery, later beta publication and user-node upgrade remain separate.

## Later authorized release — v1.5.3-beta.5
On the user’s explicit beta request, Delivery published tagabfd379059a7bc1c392a6a2137d27e32427cda26 as v1.5.3-beta.5. Desktop, Android, iOS TestFlight and server Docker workflows all succeeded;17GitHub assets and the rebuiltlinux/amd64+arm64image verified. Version and beta Docker tags resolve tosha256:a8c1d37d142a8bcd1ff28287fcc742d1d4c9e99b91f05be3adb3a9cff7b25bbc; stable channels remain unchanged. See release-deployment-report.md and delivery-evidence/dr-003. This now ships the source correction; it does not mutate existing user containers, pins, volumes, settings or backups and is not a claim of authenticated user-node or all-history testing. Unknown historical cache writer and unrelated streaming-test failures remain unchanged.

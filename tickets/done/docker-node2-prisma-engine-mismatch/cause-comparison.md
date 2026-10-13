# Immediate Cause / Working8001 Comparison — 2026-10-13

8001 really is working: two HTTP200/status ok health responses, supervisor RUNNING and migration-success log.8003/node2 is FATAL and health resets. Checks were read-only;8001 unchanged.

Both use exactly the same Docker image, Prisma5.22 CLI and startup JS bytes. Both contain the correct engine under/app/node_modules/.pnpm. Both startup resolvers miss this workspace-root directory and instead consult the node's retained/root-home cache.

8001's cache contains the matching605197... engine and its startup used that pair successfully. Node2 has only a completec2990... cached pair (its605... native directory is empty). Startup picks it without checking CLI compatibility. Operator's DB-free RPC proved wrongc299 engine cannot answer this CLI's listMigrationDirectories method, while installed605 engine can. No need to delete database/volumes or install another Prisma version.

Why/root? Supervisor runs backend as root with HOME=/root. Prisma normally keeps downloaded binaries under the process user's home cache, separately from installed package binaries. That normal location is documented by [Prisma's version-pinned cache code](https://github.com/prisma/prisma/blob/5.22.0/packages/fetch-engine/src/utils.ts). Two copies are not themselves evidence of wrongdoing; the defect is selecting an incompatible copy.

Why retained? Launcher mounts a distinct named/root-home volume per node to keep runtime sign-ins/settings through container recreation. Thus same image does not mean same home cache. Both working and failed nodes have bundled+cached copies; only8001's cached pair matches.

What wrote node2'sc299 cache? Not established. Prisma's [engine postinstall](https://github.com/prisma/prisma/blob/5.22.0/packages/engines/src/scripts/postinstall.ts) and downloader explain how such caches can be populated, but there is no command/actor audit in current evidence. A task-owned current-image inspection found no root Prisma cache in the image; cache-file metadata predates node2 recreation by hours. This proves current cache came from retained state rather than recreation seeding it from this image; it does NOT identify an old install, specific tool/person or first creation date. No private shell history/credentials were examined.

Why now? New backend startup performs engine selection and migration again against retained home contents. Current8001/node2 comparison establishes why the same image succeeds on one and fails on the other. Prior removed node2's last successful image/engine/cache state is unavailable; we cannot prove exactly which earlier action changed it. The resolver fallback dates to Feb26 AppImage EROFS work; yesterday's Dockerfile retirement left executable startup unchanged.

Immediate user-prioritized repair: pin BOTH existing query/schema engine paths to installed5.22 pair for node2, preserve all storage and migration checks, back up affected data first, verify actual readiness. Further provenance/durable automatic resolver correction follows usability. No repair/readiness success is claimed in this brief.

Concrete local evidence: investigation-evidence/{node0-node2-control.json,prisma-runtime-metadata.json,prisma-realpath-packages.json,startup-log-facts.json,isolated-image-metadata.json}; attached operatorengine-comparison.json. Source/log hashes and timestamps available there; no user secret contents.

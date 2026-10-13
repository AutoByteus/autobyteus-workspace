# Investigation Notes — Node2 Prisma Engine Startup Recovery

## Investigation Meta
- Package: docker-node2-prisma-engine-mismatch; Task project_task_3466c3eb-4f04-4ca8-b487-dbcf4c90da14; requested by /project_task_manager, run project_task_manager_a5f6d9d306e54970bafdad895bdf731d.
- Git worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/docker-node2-prisma-engine-mismatch
- Branch: codex/docker-node2-prisma-engine-mismatch
- Fresh resolved base: origin/personal @ a609de982a22925299d550bea4084e578cc5cd60 (git fetch origin personal, 2026-10-13)
- Finalization target: origin/personal; image publication/release not authorized by current request.
- Bootstrap: isolated worktree created; shared default personal checkout has unrelated dirt and is not used for authoring/finalization. No prerequisite blocker.
- Authorities read: solution-designer skill; requirements-engineering gate; requirements/investigation/revision templates; base root AGENTS/DESIGN/TESTING and server AGENTS (2026-10-13).
- Current revision: SR-003; R3 Approved, D1.1/O1 Ready; accepted actual recovery, separate follow-up; factual evidence distinct from intent/design.

## Initial Request / Input Evidence
Read both incoming task-result.md copies and engine-comparison.json before acting. Operator evidence owner computer_use_operator_8b64daa0b7ca459e86aefd257b269545. First report covers restoration and readiness failure; second appends later engine diagnosis, superseding earlier uncertainty. Not fresh execution proof by Solution Designer. Original operation Task project_task_177e099f-3d40-4f21-a905-68e61e07c0ad remains manager-owned/in-progress; route cross-task needs through manager, not operator directly.

## Source Log
| ID | Source / exact command | Observation |
| --- | --- | --- |
| E-001 | Attached ctx_2cff5d77156a__task-result.md | Managed node2 recreated by installed new-container --tag beta, same original named volumes/host workspace; backend resets and supervisor BACKOFF/FATAL. No storage deletion/repair undertaken. |
| E-002 | Attached ctx_0654485fabef__task-result.md and ctx_6365f67e9d74__engine-comparison.json | Prisma CLI/engines5.22.0 expect605197351a3c8bdd595af2d2a9bc3025bca48ea2. Resolver searches only package-local dirs and selects root-home cache c2990dca591cba766e3b7ef5d9e8a84796e47ab7; root virtual-store bundled matching engine exists. Database-free RPC fails selected cache, succeeds bundled. No proof of DB integrity/later stages; no repair applied. |
| E-003 | Manager read-only inspect/health facts in Task | Nodes0/1/2 all same image sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1. Do not assume new image on recreation or healthy controls. Node2 backend8003 resets; four original mounts verified. |
| E-004 | git fetch origin personal; rev-parse; worktree add | Fresh base a609de982a22925299d550bea4084e578cc5cd60; isolated task branch established. Root policies read from refreshed base, not older shared personal. |

## Supplement Inventory
Attached absolute source files: /Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_3466c3eb-4f04-4ca8-b487-dbcf4c90da14/context/{ctx_2cff5d77156a__task-result.md,ctx_0654485fabef__task-result.md,ctx_6365f67e9d74__engine-comparison.json}. Owner prior Computer Use Operator; scope cause/restoration evidence; status historical incoming evidence; no normative supplement/approval. Read-only copies remain durable Task context.

## Preservation / Unknowns
Existing volumes: autobyteus-server-2-data→/home/autobyteus/data, autobyteus-server-2-workspace→/app/autobyteus-server-ts/workspace, autobyteus-server-2-root-home→/root, autobyteus-server-2-chromium-profile→/home/vncuser/.config/chromium. Existing host bind /Users/normy/.autobyteus/docker-server/shared-workspace/nodes/autobyteus-server-2→/home/autobyteus/workspace. User settings/data must be preserved; no secret contents in evidence. Other nodes/build workloads must not change. Safe backup and isolated reproduction precede any data-affecting remediation; working user node2 remains running as deliverable, only owned temporary resources cleaned.
INITIAL unknowns (historical bootstrap): actual resolver/CLI provenance, introduction history, override interactions, earlier-start behavior; safe recovery surface and DB readiness. Later E005..014 resolve current selection and actual scoped readiness; exact historical cache writer/last removed-container state remain unknown. Product UI/UX request: Not stated, N/A.

## Architecture Findings
D1/O1 operational design reviewed/executed on R2. Current R3/D1.1 administratively partitions accepted recovery closure and separate source/provenance follow-up. No live repair performed by this role; actual Delivery evidenceE014 read, not replayed.

## Completed Evidence / Source Investigation (2026-10-13)
| ID | Exact source | Facts / limitation |
| --- | --- | --- |
| E-005 | src/startup/migrations.ts, tests/unit/startup/migrations-prisma-engine-env.test.ts (server package); git log -S resolveCachedPrismaEnginePair | Local appRoot/node_modules scan only, cache revision unbounded with platform/mtime ranking. Explicit complete pair supported. Test fixture misses root virtual-store layout and endorses unversioned cache. Introduced6a0a43b55ea0950dffe823a138d048ca4a6ba4cc,2026-02-26 linux-release engine resolution. |
| E-006 | investigation-evidence/node0-node2-control.json, read-only Docker inspect + HTTP health x2 + supervisor status,12:33Z | Node0/8001 HTTP200/status ok, RUNNING; node2/8003 resets,FATAL. Image IDs identicalb141..., per-node distinct retained home volumes; neither modified. |
| E-007 | investigation-evidence/prisma-runtime-metadata.json and read-only-prisma-metadata.cjs,12:33Z | CLI and migration JS hashes identical across nodes; HOME=root, no Docker-exec engine override. Pure resolver on0 chooses605..., on2 choosesc299.... Node2 matching605 target directory empty; only complete cached pairc299 exists. Its engine birthtimes07:32Z and mtimes09:35Z predate recreation12:13Z. Metadata does not identify writer or prove prior version. |
| E-008 | investigation-evidence/prisma-realpath-packages.json,12:34Z | Both CLI realpath/app/node_modules/.pnpm/prisma@5.22.0/...; engines dependency resolves only after REALPATH of CLI symlink; createRequire on unreald CLI path failed. Engines5.22 and metadata605... + native query/schema files installed in both images. Root-home volumes created May12(node2)/May13(node0),2026. Image built05:58Z today. |
| E-009 | investigation-evidence/isolated-image-metadata.json | Owned same-image, read-only/network-none/node-entrypoint inspection found NO/root/.cache/prisma/master in image and no global Prisma package in bounded package scan. Container --rm, cleanup absence verified. No user volumes, DB URL, service entrypoint, installs or credentials. Current image did not seed current root cache; cannot establish earlier image/command writer. |
| E-010 | investigation-evidence/startup-log-facts.json,12:35Z | Filtered recognized facts only:8001 actual log selected cached605 and migrations completed; node2 selectedc299 and err has RPC method missing/DATABASE_MIGRATION_FAILED. No full logs/env/secret content output. |
| E-011 | Prisma official5.22 source linked below | fetch-engine gets home/.cache/prisma,channel=master,revision,target; engines postinstall invokes version-pinned downloader, caches binary/checksums. This explains possible mechanism, NOT audit attribution ofc299 writer. |
| E-012 | historical tickets/done/linux-appimage-prisma-erofs/investigation-notes.md and git6a0a43b55 | Fallback introduced for missing OpenSSL3 engine in immutable AppImage; explicit cached paths avoided EROFS. Purpose legitimate; unversioned discovery + missing root pnpm layout exposed wrong selection. Not introduced by yesterday's legacy Dockerfile retirement. |
| E-013 | current migrations.ts, server-runtime.ts118+, startup ordering policy, migration guideline, app-data runner.runPending, latest SQL20261009120000 | Correct schema engine deploy precedes repository/vault/app-data and HTTP start; true schema failure currently fatal. Already-shipped migrations may run once engine fixed; e.g. last SQL adds threshold and clears old Claude latest-readings (not totals/costs). No applied history rewrite/new migration proposed. Runner skips terminal success/warnings, records failures and startup continues scoped app-data status; normal ordering unchanged. |

## Architecture Gate / Operational Priority — Historical R2 (R3 Supersedes Partition)
Read architecture-design.md, design-principles.md in full (including separately reread truncated middle), design-spec template, current rootDESIGN, startup_initialization_and_lazy_services.md and full data_migration_guideline.md (split after truncation), serverAGENTS/TESTING. No applicable closerAGENTS/DESIGN files found. No governing-policy conflict.
User now prioritizes usable node2 BEFORE deeper attribution/durable source changes. R2/O1 only existing explicit compatible engine pin with safe backups and isolated proof; R1 source findings remain deferred O2, not implemented or canceled. At that R2 gate no live repair had occurred. Later Delivery actual recovery is E-014; R3 scope partition is E-015. No source/tests/dependencies/user configurations changed by Solution Designer.

## External Primary Sources
- https://github.com/prisma/prisma/blob/5.22.0/packages/fetch-engine/src/utils.ts — cache location/home/revision/target.
- https://github.com/prisma/prisma/blob/5.22.0/packages/engines/src/scripts/postinstall.ts — CLI engine downloader identity.
- https://raw.githubusercontent.com/prisma/prisma/5.22.0/packages/fetch-engine/src/download.ts — cache/download/checksum path; mtimes can be refreshed during reuse, not reliable last-install audit.
- https://docs.prisma.io/docs/orm/v6/reference/environment-variables-reference — custom engine environment contract; installed source's explicit pair is concrete local authority.
Prisma source attribution does not establish who/which command populated persistentc299. Current image baseline lacks it; file metadata shows it predated recreation. No user history/auth/npm log inspection attempted. No inference that destroy corrupted data or someone did something bad.

## Expanded Supplement Inventory
All investigation-evidence files are Solution Designer-owned factual diagnosis/metadata only, relatedREQ-003..006/AC-003..006 and later001,002; no normative approval. cause-comparison.md is plain-language evidence synthesis, not requirements. Full absolute local artifact directory: /Users/normy/autobyteus_org/autobyteus-worktrees/docker-node2-prisma-engine-mismatch/tickets/in-progress/docker-node2-prisma-engine-mismatch/. Operator Task references remain externally owned attached evidence. No prior review/implementation/API/delivery artifacts applicable yet (N/A — not applicable).

## E-014 — Actual Delivery Recovery / Evidence Read (Not Re-executed)
Returned handoff-summary/release/docs/DR-001/002 and public backup-receipt/live-preservation/normal-startup-facts/user-acceptance files read. Delivery established actual canonical data/DB/key/memory/custom roots with nonsecret path contracts; FATAL/no backend/DB writer before/after affected snapshot; private0700dir/0600tar25487360bytes/132files, copiedSQLite readonlyquick_checkok. Only node2 backend current config two native605 paths appended, atomic original permissions/entries preserved; named update; pid2002existing-env/migration success; repeated8003HTTP200statusok and continued13:48Z. Settings/key/mounts/othernode/build IDsstarts/siblings8001healthunchanged; node2LEFT RUNNING. No source/deps/image/cache/profile/.env/ledger/reset/downgrade/other-node/model/release operation. Backup retention not automatic restore. No all-history/client screenshot/DBbyteidentity/platform claim. Initial getter/report-builder failure and ownedChrome limitation preserved, no fabricatedglobalgreen. Final repository gates not yet complete.

## E-015 — User Scope Split / Follow-Up Registration
Exact DR-002 JSON user accepts node2working/current ticket done, asks SEPARATE comparative two-engine/code-cause investigation/fix. R3 approval USER exact quote; D1.1 changes only administrative completion partition. Prior R2sameTaskO2 superseded; obligation moved to TODO project_task_6b8c9612-c94b-4d62-8053-00ef94bd94df, nine public saved contexts, no delegation/statusDONE/sourcework/newprobe. Manager owns dispatch. follow-up-registration.json records actual tool result; follow-up-context.md preserves known same-image/layout/cache contrast, recoverable origin limits, actual protected recovery/pin recreation limit, privacy/isolation/release/no-other-node constraints and new-task proof needs. Approval applicability: user message normative partition, saved facts not new-task architecture approval. Delivery untracked artifacts externally owned, preserved; finalized path not yet fabricated.

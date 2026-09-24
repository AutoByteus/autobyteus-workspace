# Implementation Handoff — unified Team/Org run-history catalog policy

## Upstream artifact package

- Upstream review applicability and result: independent architecture review selected and passed in ARCH-REV-002; implementation follows SR-004 with SR-002 approved behavior baseline.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/requirements-doc.md`.
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/investigation-notes.md`.
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-revision-record.md`.
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-spec.md`.
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-handoff.md`.
- Supplemental task artifacts: N/A — not applicable; the separate unmerged memory branch is evidence/conditional integration context, not an approved UI supplement.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-review-report.md`.
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/architecture-review-revision-record.md`.
- Triggering rework report: N/A — initial implementation. DR-001 was resolved upstream in SR-004/ARCH-REV-002.

## Current implementation summary

- Implementation cycle: Initial.
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/implementation-revision-record.md`.
- Current implementation revision ID: IR-001.
- Code commit: `b68847a8c` on `codex/unify-agent-team-org-history-policy`.
- Related solution revision IDs: SR-001–SR-004; approval at SR-002.
- Related architecture-review revision IDs: ARCH-REV-001–002; current Pass ARCH-REV-002.
- Related code-review, API/E2E, and delivery revision IDs: N/A.
- Triggering finding IDs: N/A; DR-001 resolved before implementation.

## Routing classification

- Task size: **Medium**.
- Architectural risk: **High**.
- Design classification reference: `design-spec.md` “Task size and architectural risk”; ARCH-REV-002 confirmed it.
- Classification: **Confirmed**. The completed changes stay in existing run-history/manager ownership plus an offline maintenance entrypoint. Shared state, persisted authority, archive/restore concurrency and multi-file compensation continue to justify High risk; no silent downgrade.
- Selected route: **Code Review** (subject to returned `get_handoff_rules`).
- Lightweight direct-route self-review: Not Applicable; independent Code Reviewer is required.
- New design impact/escalation trigger: None found. Conditional Org root memory-source integration remains tied to its branch merge, as designed.

## Reviewed behavior implementation trace

| Behavior | Approved outcome | Implemented production path and result |
| --- | --- | --- |
| BEH-001 | Both family catalogs use admitted, normalized, read-only index authority. | Mixed history `CollaborationRootHistoryService` → Team/Org `listCatalogRows` → `CollaborationRunHistoryCatalogCore` → strict family stores/readiness. Org tree-scan/index rewrite initialization and Team tolerant normal read are removed. Query snapshots compact summary, filter admission and do not write; focused first/new-instance, direct-use and corruption tests passed. |
| BEH-002 | Explicit lifecycle rows, no Org pre-create initialization, safe archive/delete and concurrent Restore. | Org `AgentOrgRunService.create` now creates package before `recordCreated`; both catalogs enter family-keyed core queue for events. Team manager exposes `withInactiveHistoryMutation`; Team archive/unarchive/delete and Org archive/delete acquire core queue → exact-root manager lane → inside-lane inactive check → full tree/index transaction/compensation. Team archive rollback/readback and delete readback were added; deterministic Restore-first and archive/unarchive-first narrow integration tests passed. |
| BEH-003 | Imported/local memory catalog inspection stays read-only and admitted. | Team memory source continues through Team owner query; Org owner query is now safe/read-only. `AgentOrgRootMemorySource` does not exist on this unmerged base, so its conditional adapter change/byte-identical imported-source test is N/A here, not falsely claimed complete. The repair command has no startup, server, GraphQL or explorer caller. |
| BEH-004 | Valid indexes directly usable; missing empty, corrupt errors, orphan rows require explicit local repair. | Strict Team/Org normal stores and shared core expose current rows only; no versioned runtime fallback. Separate `run-history/maintenance/collaboration-run-history-index-repair.ts` and built-code CLI require explicit app-data profile, default dry-run, admitted missing IDs only, acknowledgement for wholly absent index, backup then strict verification. Existing row facts are not reprojected. Store/core/repair fixtures passed. |

## Key files and areas

- Added `src/run-history/services/collaboration-run-history-catalog-core.ts`; modified Team and Org catalog services, Team manager, Org run service, mixed history consumer and Team memory stub.
- Added `src/run-history/maintenance/collaboration-run-history-index-repair.ts`, `scripts/repair-collaboration-run-history-index.mjs` and operations README.
- Removed obsolete Team diagnostic index service and its unit test; removed Team tolerant index convenience read methods and Org runtime summary-writer use, while retaining historical migration owners/imports.
- Updated Org family migration transition to invalidate both family caches after its direct index writes; refreshed one migration test fixture for the current Prisma column.
- Focused unit and exact-root manager integration tests added/updated under `autobyteus-server-ts/tests`.

## Important assumptions and known risks

- The selected app-data profile is an operator-owned local profile. CLI requires an existing `.env`, derives memory via `AppConfig`, resolves real paths and rejects a memory root outside the selected profile. It accepts neither an explorer folder nor a direct `--memory-dir`. The operation must run with the server stopped/quiescent and after a full profile backup.
- Index-only summary/termination facts cannot be reconstructed from a missing row; the repair report states this and a wholly missing index requires explicit acknowledgement. Corrupt indexes are not overwritten.
- `codex/memory-team-view-slow-load` is unmerged at this base; its Org root memory-source integration must happen when that branch lands. No source file was created solely to simulate it.
- Source-review and independent API/E2E remain outstanding. Local tests below are not downstream sign-off.

## Task design health assessment implementation check

- Reviewed posture/root cause/refactor decision: approved refactor; duplicated catalog policy/coordination and Org boundary bypass; refactor needed now.
- Matched reviewed assessment: Yes. Core owns only index state/queue/query/summary policy; family adapters retain tree/projector/manager transactions; offline repair is separate.
- Design Impact routed: N/A; no architecture-owned decision was invalidated.

## Legacy, compatibility and persisted-data checks

- Backward-compatibility mechanisms introduced: None. No old Org query alias, read-time reconciliation, dual reader/writer, version-specific normal fallback or startup repair.
- Obsolete in-scope paths removed: Yes — Org `initialize`/`listRows` runtime path, Team diagnostic index service/test and tolerant Team normal-read convenience methods. Historical migration writer/reconciler remain deliberately migration-owned.
- Shared structures/file boundaries: tight generic row constraint (`summary`, `createdAt`, `idOf`), no generic persisted Team/Org union or tree transaction. No changed source implementation file exceeds 500 effective non-empty lines; Team catalog has 287, Org catalog 245, core 106, repair 95; Team changed-line delta was assessed and stays under the >220 signal.
- Canonical shared design guidance reapplied: Yes.
- Approved persisted-data decision: **Directly Usable — No Migration**, `design-spec.md` “Legacy removal and persisted-data decision”. Current eight-field Team/Org arrays are read unchanged by strict stores; read-only representative fixture verifies summary, termination, archive and byte identity. No migration or current-runtime old-shape branch was added. Existing historical migrations remain intact.
- Transition deviation: None.

## Environment and local implementation checks

- Dependencies installed offline from the workspace lockfile; shared workspaces built and Prisma client generated for local checks. Generated distribution directories were not committed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit --pretty false`: pass.
- Focused implementation-scoped unit/narrow-integration set (14 files): **82 tests passed**. Included family catalogs/core, existing-index parity, repair, Team manager restore/archive interleavings, Org create ordering, mixed-history readiness, Team memory, strict store and relevant migration suites.
- Final summary-policy subset after centralizing first-summary logic: **20 tests passed** in Team/Org/core files; typecheck passed again.
- Built repair CLI `--help`: pass. Isolated temporary owned-profile dry-run: pass, resolved profile and memory root printed; neither index was written.
- Earlier broader migration fixture execution initially failed because its temporary SQLite schema omitted the newly released `claude_sdk_usage_state_json` column. The fixture migration list was updated to the current migration, and its 11 tests then passed. This was a test setup correction, not a runtime schema change.
- `git diff --check`: pass. No rendered frontend changed.

## Frontend rendered-result check

Not Applicable — this is server catalog/maintenance behavior; no rendered UI or interaction implementation changed.

## Downstream coverage hints

- Independently exercise first and subsequent Team/Org queries with store spies/hash checks, including two service instances and imported-memory owner queries once the separate branch lands.
- Validate real manager Restore-first and archive/unarchive-first ordering, failed archive/delete compensation and no false success on indeterminate outcomes.
- Verify missing/corrupt/orphan parity, admitted/unadmitted row retention, existing current index arrays and repair dry-run/backup/acknowledgement on isolated app-data profiles.

## API/E2E/executable coverage still required

API/E2E Engineer owns broad executable coverage, realistic system checks and final validation classification after Code Reviewer passes. This handoff makes no API/E2E pass claim.

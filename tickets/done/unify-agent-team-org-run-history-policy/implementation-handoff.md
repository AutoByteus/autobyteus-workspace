# Implementation Handoff — unified Team/Org run-history catalog policy

## Upstream artifact package

- Upstream review applicability and result: independent architecture review selected and passed in ARCH-REV-003 on revised SR-005; approved requirements remain SR-002. ARCH-REV-002 is historical.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/requirements-doc.md`.
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/investigation-notes.md`.
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-revision-record.md`.
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-spec.md`.
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/solution-handoff.md`.
- Supplemental task artifacts: N/A — not applicable; the separate unmerged memory branch is evidence/conditional integration context, not an approved UI supplement.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/design-review-report.md`.
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/architecture-review-revision-record.md`.
- Triggering rework: `api-e2e-execution-coverage-report.md` / `api-e2e-revision-record.md` (API-REV-001 F-001), `code-review-report.md` / `code-review-revision-record.md` (CRR-002 CR-001), and SR-005/ARCH-REV-003, all in this ticket directory. DR-001 remains resolved upstream.

## Current implementation summary

- Implementation cycle: Rework after API-REV-001 F-001 and CRR-002 CR-001; IR-001 is historical.
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/unify-agent-team-org-history-policy/tickets/in-progress/unify-agent-team-org-run-history-policy/implementation-revision-record.md`.
- Current implementation revision ID: IR-002.
- Initial code commit: `b68847a8c`; current IR-002 correction code commit: `49ce0d173` on `codex/unify-agent-team-org-history-policy`.
- Related solution revision IDs: SR-001–SR-005; approval remains SR-002.
- Related architecture-review revision IDs: ARCH-REV-001–003; current Pass ARCH-REV-003.
- Related code-review IDs: CRR-001 historical Pass, CRR-002 Fail (failure origin); API/E2E ID: API-REV-001 Fail. Delivery: N/A. Neither historical pass clears this revision.
- Triggering finding IDs: API-REV-001 F-001 and CRR-002 CR-001; DR-001 resolved before IR-001.

## Routing classification

- Task size: **Medium**.
- Architectural risk: **High**.
- Design classification reference: `design-spec.md` “Task size and architectural risk”; ARCH-REV-003 confirmed it.
- Classification: **Confirmed**. The SR-005 correction stays in existing Team Memory/location-projection ownership without a new subsystem, API or persistence format. Shared state, persisted authority, archive/restore concurrency and multi-file compensation continue to justify High risk; no silent downgrade.
- Selected route: **Code Review** (subject to returned `get_handoff_rules`).
- Lightweight direct-route self-review: Not Applicable; independent Code Reviewer is required.
- New design impact/escalation trigger: None found in implementing SR-005. Conditional Org root memory-source integration remains tied to its branch merge.

## Reviewed behavior implementation trace

| Behavior | Approved outcome | Implemented production path and result |
| --- | --- | --- |
| BEH-001 | Both family catalogs use admitted, normalized, read-only index authority. | Mixed history `CollaborationRootHistoryService` → Team/Org `listCatalogRows` → `CollaborationRunHistoryCatalogCore` → strict family stores/readiness. Org tree-scan/index rewrite initialization and Team tolerant normal read are removed. Query snapshots compact summary, filter admission and do not write; focused first/new-instance, direct-use and corruption tests passed. |
| BEH-002 | Explicit lifecycle rows, no Org pre-create initialization, safe archive/delete and concurrent Restore. | Org `AgentOrgRunService.create` now creates package before `recordCreated`; both catalogs enter family-keyed core queue for events. Team manager exposes `withInactiveHistoryMutation`; Team archive/unarchive/delete and Org archive/delete acquire core queue → exact-root manager lane → inside-lane inactive check → full tree/index transaction/compensation. Team archive rollback/readback and delete readback were added; deterministic Restore-first and archive/unarchive-first narrow integration tests passed. |
| BEH-003 | Imported/local memory catalog inspection stays read-only, admitted, and bounded to one tree read per root/request. | Current Team Memory explorer queries the Team catalog owner, reads each admitted root tree once, then passes that exact snapshot through `TeamMemoryMemberTargetBuilder.buildFromTree` → `AgentMemoryLocationService.listTeamMemberLocationsFromTree` → pure `TeamRunExecutionTreeLocationService.listAgentsInTree`/`TeamExecutionIndex` location projection. The unscoped all-root lookup is removed from the per-root loop; nested/configured identity, physical paths, filtering, cards and memory availability are preserved. Instrumented Team list and Team-run list tests after readiness assert two reads for two admitted roots per request and compare actual file hashes before/after. Org imported adapter remains conditional/N/A until its separate branch merges. |
| BEH-004 | Valid indexes directly usable; missing empty, corrupt errors, orphan rows require explicit local repair. | Strict Team/Org normal stores and shared core expose current rows only; no versioned runtime fallback. Separate `run-history/maintenance/collaboration-run-history-index-repair.ts` and built-code CLI require explicit app-data profile, default dry-run, admitted missing IDs only, acknowledgement for wholly absent index, backup then strict verification. Existing row facts are not reprojected. Store/core/repair fixtures passed. |

## Key files and areas

- Added `src/run-history/services/collaboration-run-history-catalog-core.ts`; modified Team and Org catalog services, Team manager, Org run service, mixed history consumer and Team memory stub.
- Added `src/run-history/maintenance/collaboration-run-history-index-repair.ts`, `scripts/repair-collaboration-run-history-index.mjs` and operations README.
- Removed obsolete Team diagnostic index service and its unit test; removed Team tolerant index convenience read methods and Org runtime summary-writer use, while retaining historical migration owners/imports.
- Updated Org family migration transition to invalidate both family caches after its direct index writes; refreshed one migration test fixture for the current Prisma column.
- Focused unit and exact-root manager integration tests added/updated under `autobyteus-server-ts/tests`. IR-002 additionally changes `team-memory-explorer-service.ts`, `team-memory-member-target-builder.ts`, `agent-memory-location-service.ts`, and `team-run-execution-tree-location-service.ts` plus focused Memory/location tests; see IR-002 for the delta.

## Important assumptions and known risks

- The selected app-data profile is an operator-owned local profile. CLI requires an existing `.env`, derives memory via `AppConfig`, resolves real paths and rejects a memory root outside the selected profile. It accepts neither an explorer folder nor a direct `--memory-dir`. The operation must run with the server stopped/quiescent and after a full profile backup.
- Index-only summary/termination facts cannot be reconstructed from a missing row; the repair report states this and a wholly missing index requires explicit acknowledgement. Corrupt indexes are not overwritten.
- `codex/memory-team-view-slow-load` is unmerged at this base; its Org root memory-source integration must happen when that branch lands. No source file was created solely to simulate it.
- CRR-002 and API-REV-001 remain Fail until new source review and API/E2E rerun; CRR-001/IR-001 are historical. Local tests below are not downstream sign-off.

## Task design health assessment implementation check

- Reviewed posture/root cause/refactor decision: approved refactor; duplicated catalog policy/coordination and Org boundary bypass; refactor needed now.
- Matched reviewed assessment: Yes. Core owns only index state/queue/query/summary policy; family adapters retain tree/projector/manager transactions; offline repair is separate. SR-005 reuses the existing TeamExecutionIndex/location owner for bounded Team Memory projection, with no second path model.
- Design Impact routed: N/A; no architecture-owned decision was invalidated.

## Legacy, compatibility and persisted-data checks

- Backward-compatibility mechanisms introduced: None. No old Org query alias, read-time reconciliation, dual reader/writer, version-specific normal fallback or startup repair.
- Obsolete in-scope paths removed: Yes — Org `initialize`/`listRows` runtime path, Team diagnostic index service/test and tolerant Team normal-read convenience methods. Historical migration writer/reconciler remain deliberately migration-owned.
- Shared structures/file boundaries: tight generic row constraint (`summary`, `createdAt`, `idOf`), no generic persisted Team/Org union or tree transaction. No changed source implementation file exceeds 500 effective non-empty lines; Team catalog has 287, Org catalog 245, core 106, repair 95; changed IR-002 source files also remain below 500 effective non-empty lines and the IR-002 delta is below the >220 signal; Team changed-line delta was assessed and stays under the >220 signal.
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
- IR-002 local check: TypeScript build-config typecheck passed; Team Memory explorer and agent-memory location suites, 7 tests passed. After readiness, both list requests were instrumented separately at the tree store, with exactly one read per admitted root per request (two roots). The test computed SHA-256 for every file before and after each request; all hashes matched. A tree-scoped parity test matched the prior configured/task/nested locations and asserted zero new store reads.
- `git diff --check`: pass. No rendered frontend changed.

## Frontend rendered-result check

Not Applicable — this is server catalog/maintenance behavior; no rendered UI or interaction implementation changed.

## Downstream coverage hints

- Independently rerun API-REV-001 F-001 against the current Team imported Memory GraphQL Team-list and Team-run-list requests, after readiness, with per-root tree-read counters and actual before/after file hashes. Also exercise first and subsequent Team/Org catalog queries and the Org adapter after its separate branch lands.
- Validate real manager Restore-first and archive/unarchive-first ordering, failed archive/delete compensation and no false success on indeterminate outcomes.
- Verify missing/corrupt/orphan parity, admitted/unadmitted row retention, existing current index arrays and repair dry-run/backup/acknowledgement on isolated app-data profiles.

## API/E2E/executable coverage still required

API-REV-001 is a Fail, not a reusable pass. Code Reviewer must review IR-002, then API/E2E Engineer must rerun realistic current Team imported-source validation and classify the new result. This handoff makes no API/E2E pass claim.

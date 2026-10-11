# Implementation Revision Record — `agent-package-auto-refresh`

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / ARCH-REV-002 Pass | N/A (implementation notes N-1…N-4 honored) | `Initial Baseline` | SR-005, SR-007, ARCH-REV-002; CRR/API-REV/DR `N/A` | Implementation complete; ready for source review |
| IR-002 | Code Reviewer / `code-review-report.md` / CRR-001 round 1 (Fail — Local Fix) | CR-001, CR-002, CR-003; R-1 | `Local Fix` | SR-007, ARCH-REV-002, CRR-001; API-REV/DR `N/A` | All three fixed, R-1 applied; ready for targeted source review |

## Revision Entries

### IR-001 — Definition catalog, package monitor, change feed and live web catalogs

- Triggering role, report path, and round: `/software_engineering_team/architecture_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md`, ARCH-REV-002 (round 2, Pass).
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: Implemented per `design-spec.md` SR-007 Change / Refactor Sequence steps 1–6 on `codex/agent-package-auto-refresh` (commits `9777af682`, `0cd763fd0`, `f7fcf9055`, on `origin/personal@359d2c0ef`).
- Related solution revision IDs: `SR-005`, `SR-007`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline is recorded: first implementation handoff.
- Approved behavior or requirement IDs affected: BEH-001…BEH-008; REQ-001…REQ-018 (REQ-011 as a no-watch boundary); AC-001…AC-016 implementation paths; DSN-001…DSN-003; review notes N-1 (org-owned Teams admitted as `agent_team` subjects), N-2 (application-owned team-local agents still listed from disk), N-3 (in-app nested writes reconcile the owning unit via `catalog.unitOf`), N-4 (identical resolved paths de-duplicated before the duplicate rule).
- Implementation delta: new `src/definition-catalog` subsystem (catalog, sync, readers, grammar, monitor, hub); services and admission moved onto the catalog; registry narrowed; diagnostics query replaced; `catalogIssue`, `AgentPackage.autoRefresh`, Orgs refresh mutation; `/ws/definition-catalog`; cache providers, persistence wrappers and the fresh path removed; built-in bootstrap reordered; registered roots keep missing folders. Web: shared `NodeChangeFeed`, definition feed retained app-wide, `reloadIfLoaded` stores, diagnostics store, badges/notices/package status, Org catalog card extracted, localization, regenerated types. Implementation refinements (no contract change): parent-folder presence watch while armed (macOS emits no events when a root is renamed away), trailing re-check of units a read applied early (chokidar's 5 ms per-file change throttle), one catalog with subject-keyed units.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas (107 server files, 1 script + 1 test-support file, 41 web files).
- Local validation and result: server typecheck pass; server unit 672 files pass; server integration 72 files pass except the two documented `agent-status-websocket` cases; definition-catalog unit (68) and journey integration (13) pass; N-1 guard tests pass; definition/package E2E failures identical to base; web `test:nuxt` all 600 files pass; server build incl. bootstrap smoke pass; rendered check on the real dev stack (Agents, Teams, Settings) pass; Linux container probe: rename-away/restore and rename-swap transitions ≈ 25 ms, 603 inotify watches for the user's two packages, 0 after close.
- Next recipient or routing: source review (Large/High) per `get_handoff_rules`.
- Remaining limitations or risks: desktop-instance user journey, AC-008/009/010/014 and remote-access auth on the new websocket are left to API/E2E; Vitest files were not executed on Linux (probe used instead); pre-existing E2E failures and 83 stale compiled `.test.js` files are follow-ups.

### IR-002 — CRR-001 local fixes: unreadable package folder isolation, diagnostics follow-up reload, dead alias

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-report.md`, CRR-001 (round 1).
- Triggering finding IDs: CR-001 (High), CR-002 (Low), CR-003 (Low); non-blocking R-1.
- Classification: `Local Fix`
- Prior authoritative result: IR-001 — an unreadable registered package folder made every catalog read, `admission.scan()` and the startup scan reject.
- Current authoritative result: an unreadable folder affects only its own definitions (last loaded version kept with an issue naming the folder and the error); other roots, admission and startup are unaffected; Settings shows the root as not auto-refreshing.
- Related solution revision IDs: `SR-007`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this implementation revision is recorded: Local Fix requested by source review.
- Approved behavior or requirement IDs affected: REQ-015, REQ-016, REQ-008, BEH-008 preserved ("startup never blocked; other definitions unaffected"), DEC-005; REQ-005/REQ-009/AC-004 (CR-002).
- Implementation delta:
  - CR-001 — `definition-catalog-sync.ts`: the root context now holds `readable` roots and an `unavailable` map (missing → null, unreadable → error text). Each present root's kind folders are listed up front; enumeration runs per root (`enumerateUnits`) and a root that fails is moved to `unavailable` and logged (`DEFINITION_CATALOG_ROOT_UNREADABLE`). Units of unavailable roots go through `catalog.markSourceUnavailable(subject, unitId, reason)` (renamed from `markSourceMissing`; same `DEFINITION_SOURCE_MISSING` code, reason names the folder and the read error). Full reconcile enumerates every subject before reading any unit; the application-owned list failure is isolated too. `package-definition-monitor.ts`: arming checks the kind folders can be listed and otherwise reports `UNAVAILABLE` with the error (re-armed on the next full reconcile). `build-studio-server.ts`: the startup admission scan is guarded and logs on failure. Web badge text for this code: "Package folder unavailable" / "could not be found or read" (en, zh-CN).
  - CR-002 — `stores/definitionDiagnosticsStore.ts` uses one `createLoadedListReloader` per subject (in-flight sharing plus one follow-up; failed reload keeps the previous notice); the unused `unavailable` helper is gone.
  - CR-003 — `projectChangeRetryDelayMs` removed; the projects spec asserts the shared `nodeChangeRetryDelayMs`.
  - R-1 — the quiet-window timer flushes without arming the trailing re-check; only read-triggered flushes (`settle()`) arm it, matching its comment and the handoff.
- Changed files or areas: `autobyteus-server-ts/src/definition-catalog/services/{definition-catalog-sync,definition-catalog}.ts`, `src/definition-catalog/monitor/package-definition-monitor.ts`, `src/compositions/build-studio-server.ts`; tests `tests/unit/definition-catalog/{unreadable-package-root (new),definition-catalog,package-definition-monitor}.test.ts`, `tests/integration/definition-catalog/package-auto-refresh.integration.test.ts` (new CR-001 startup case); web `stores/definitionDiagnosticsStore.ts` (+ new spec), `services/projects/projectChangeFeed.ts` (+ spec), `localization/messages/{en,zh-CN}/definitionCatalog.ts`, badge spec.
- Local validation and result: new unreadable-root unit test fails on the IR-001 sync (`EACCES … scandir`) and passes now; catalog unit + journey integration 86 tests pass (14 journey cases incl. unreadable root at startup with monitor `UNAVAILABLE` and live updates for the other root); server typecheck clean; server unit 673 files / 5316 tests pass; server integration 72 files pass, only the 2 documented `agent-status-websocket` cases fail; web `test:nuxt` 599 files / 4149 tests pass.
- Next recipient or routing: `/software_engineering_team/code_reviewer` (targeted delta on CR-001…CR-003), then API/E2E.
- Remaining limitations or risks: unchanged from IR-001 (desktop journey, AC-008/009/010/014 and websocket remote-access auth left to API/E2E). Permission tests use chmod and assume a non-root user.

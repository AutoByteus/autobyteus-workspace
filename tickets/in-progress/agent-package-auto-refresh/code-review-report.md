# Code Review Report — `agent-package-auto-refresh`

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/requirements-doc.md` (Approved SR-005; editorial SR-007)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-spec.md` (SR-007)
- Supplemental Task Artifacts Reviewed As Context: `probes/` (evidence only); `implementation-evidence/apar-linux-monitor-probe-output.txt`
- Relevant Solution Revision IDs: SR-005 (approval), SR-007 (design)
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/design-review-report.md` (ARCH-REV-002 Pass, notes N-1…N-4)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-002
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-package-auto-refresh/tickets/in-progress/agent-package-auto-refresh/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation complete (IR-001) from `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Failure Evidence: N/A
- Branch / commits reviewed: `codex/agent-package-auto-refresh` at `0bbfaa8e3` (base `359d2c0ef`; `9777af682`, `0cd763fd0`, `f7fcf9055`)

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: Confirmed. New server subsystem, new websocket and GraphQL contracts, a settle/flush/queue concurrency model, watcher lifecycle, and every definition reader plus admission rewired (150 files). No correction.

## Review Scope

- Changed implementation and behavior reviewed: the whole server `src/definition-catalog/**` subsystem (types, node-file helpers, registered roots, catalog, sync, runtime, three source readers, unit presence, path grammar, monitor, hub and messages); the three definition services and their node readers and file providers; admission and the narrowed registry; compositions (`host-definition-services`, `create-bundle-backed-definition-services`, `definition-catalog-feed-composition`, `build-studio-server`); GraphQL (`definition-diagnostics`, agent/team/org types and converters, `agent-packages`); `/ws/definition-catalog`; package service, mappers and root settings store; app config; built-in bootstrapper; fresh-path callers (backend factory, org run service, skill-improvement resolvers, migrations' provider swap, standalone validator). Web: `NodeChangeFeed`, `ProjectChangeFeed`, definition feed and composable, `loadedListReloader`, the four store `reloadIfLoaded` additions, `definitionDiagnosticsStore`, badge and notice components, card/list/Settings changes, `app.vue`.
- Files / areas reviewed: as above. The catalog unit tests (5 files) and the journey integration test were read for structure and run (`vitest run tests/unit/definition-catalog tests/integration/definition-catalog`: 6 files, 81 tests pass).
- Explicit exclusions: `generated/graphql.ts` (regenerated; skimmed only), localization strings (content only), the pre-existing E2E failures listed in the handoff (owned elsewhere), and the desktop/remote-auth journeys left to API/E2E.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes (SR-005; DEC-001…DEC-006 recommended options; DEC-007 = A; DSN-001…DSN-003).
- Design-spec behavior map verified against the implementation: Yes. DS-001…DS-005 are implemented as designed. Three implementation refinements were checked and stay within the design's ownership and contracts:
  - parent-folder presence watch while armed;
  - trailing re-check of units applied early;
  - one catalog with subject-keyed units.
- Design review report and round confirmed: ARCH-REV-002 Pass. N-1…N-4 verified in code:
  - N-1: `agent-team-definition-service.ts:209–224` lists `listNestedNodes("agent_org", "agent_team")`.
  - N-2: `agent-definition-service.ts:243`, `listApplicationOwnedTeamLocalAgents`.
  - N-3: `reconcileOwningUnit` through `catalog.unitOf` in the agent and team services.
  - N-4: `unit-presence.ts:31–50`, `seenPaths`.
- Behavior-basis status: `Confirmed`, with one implementation defect against a preserved/required behavior (CR-001; the basis itself is not contradicted).
- Changed or newly discovered behavior: None.
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Supported Behavior Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | Monitor `handleEvent` → `classifyDefinitionUnit` → `sync.noteUnitChange` → timer or a read's `settle()` → `reconcileBatch` → reader `readUnit` → `catalog.apply`. Services, admission and GraphQL read behind `settle()`. Integration AC-001/002/003/006/015/016 pass. | — |
| BEH-002 | Confirmed | Refresh mutations → `refreshCache()` → `sync.reloadAll()` (coalesced) → publish all four subjects. Package actions → `reloadDefinitionCatalog`. | — |
| BEH-003 | Confirmed | Hub → `/ws/definition-catalog` (remote-access auth) → `DefinitionCatalogChangeFeed` → `reloadDefinitionCatalogSubjects` → store `reloadIfLoaded`; `connected` reloads all subjects. Diagnostics freshness gap: CR-002. | — |
| BEH-004 | Confirmed | `catalog.applyNode` rule table (last good, issue-only, duplicate without last good); nested nodes per unit; Org correlation through last-good members. | — |
| BEH-005 | Confirmed | Backend factory, org run service and team topology read the catalog; no run-state code changed. | — |
| BEH-006 | Confirmed | Update → `reloadAll` → registration listener → `monitor.syncRoots` identity re-arm; presence watch also catches the swap. | — |
| BEH-007 | Confirmed | Grammar allow-list excludes `skills/`, dot names, `_` templates and other files. | — |
| BEH-008 | Confirmed (defect CR-001) | Missing root → `markSourceMissing` keeps last good, and admission still admits it. Watch failure → `UNAVAILABLE`. **An unreadable registered root fails catalog population for every root and blocks startup (CR-001)**, which breaks the preserved "startup is never blocked; other definitions are unaffected" and REQ-015. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-012 / SCN-001–003 | BEH-001, REQ-001–004, REQ-010, REQ-018 | User/System | User via Project Task Manager; Agent Package Creator | Change packages, then delegate against the result | File tools write under a registered root; `list_available_agents` / `delegate_task` | Normal | DS-001 → DS-002 → DS-003 | Current definitions used | Requirements; integration journey | Supported Normal Scenario | Use |
| SCN-004 | BEH-004, REQ-007–009 | User/System | Same | Survive a broken or half-written edit | Partial or bad write | Normal | DS-002 rule table → GraphQL `catalogIssue` / `definitionDiagnostics` → web badge or notice | Last good plus issue; fix clears it | Requirements AC-004/005 | Supported Normal Scenario | Use |
| SCN-005 | BEH-001, REQ-004 | Operational | User | `git pull` in a package | Many file events | Normal | Settle coalescing; a read flush may split a burst (design Key Tradeoffs) | Bounded publications; consistent final state | Requirements; design | Supported Normal Scenario | Use (CR-002) |
| SCN-011 (unreadable root) | BEH-008, REQ-015, REQ-016, REQ-008; preserved "startup never blocked" | Operational | User/OS | A registered package folder exists but cannot be read (permissions; macOS privacy-protected folders for a desktop app) | Server start, or any catalog read | Explicit Edge | `build-studio-server` → `admission.scan()` → `settle()` → `ensurePopulated` → `runFullReconcile` → `reader.listUnitIds` → `listChildDirNames` throws EACCES | Required: no crash; error reported; other roots unaffected; definitions per DEC-005 | REQ-015 names "missing **or unreadable**"; BEH-008 preserved column; base code skipped unreadable folders | Supported Explicit Edge Scenario | Use (CR-001) |
| SCN-009 | BEH-003, REQ-006 | System | Web client | Recover after disconnect | Reconnect → `connected` | Normal | NodeChangeFeed retry → `connected` → reload all loaded | Current lists | Requirements | Supported Normal Scenario | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | One unreadable folder under a registered root rejects catalog population, so every definition read throws and the startup admission scan rejects | SCN-011 (unreadable), REQ-015, BEH-008 preserved, REQ-008 | A registered root (or one of its kind folders) is present but unreadable at start or at any later full reconcile | `listChildDirNames` rethrows non-ENOENT errors (`definition-node-files.ts:20–29`). Its callers are `AgentDefinitionSourceReader.listUnitIds` (`:31–38`) and `listUnitDirNames` (`unit-presence.ts:16–25`). `runFullReconcile` (`definition-catalog-sync.ts:275–296`) has no per-root isolation, so `ensurePopulated` rejects, then `settle()`, then every service read, admission `scan()`, and the unguarded startup scan (`build-studio-server.ts`, after `composeDefinitionCatalogFeed`). The base code skipped such folders (`file-agent-definition-provider.ts@359d2c0ef:303–306` `catch { continue; }`; registry `readdir(...).catch(() => [])`). | Reviewer probe (temporary test, removed): default root with agent `alpha`, external root with `agents/` chmod 000 → `getAllAgentDefinitions()` and `admission.scan()` both threw `EACCES: permission denied, scandir …/ext/agents`. | Promote | CR-001 (High). Isolate per-root enumeration failure. |
| C-02 | The diagnostics store drops a change notification that arrives while the same subject's load is in flight | REQ-005, REQ-009, AC-004; the change-feed contract that a notification makes loaded views current | Two publications close together: a burst split by flush-on-read (the design's acknowledged behavior), or two quick edits | `definitionDiagnosticsStore.ts:19–21` returns the running promise without a follow-up, so a query that already passed its server `settle()` answers with pre-change data and the notice stays stale until the next change. The list stores use `createLoadedListReloader`, whose follow-up exists for exactly this case (`loadedListReloader.ts:1–6`). | Code read; the same file pair shows both semantics | Promote | CR-002 (Low). Reuse the same follow-up semantics. |
| C-03 | `projectChangeRetryDelayMs` is now an alias that only its own spec imports | Core Principle 7 (dead code in touched files) | Engineering contract | `projectChangeFeed.ts:12`; grep shows only `projectChangeFeed.spec.ts:2,91` | grep | Promote | CR-003 (Low). Remove the alias; test the shared backoff where it lives. |
| C-04 | Trailing re-check also runs for timer-fired settles, while its comment and the handoff say "units a read applied early" | REQ-018 / SCN-012 (read flush mid-write); chokidar change throttle | Every settled burst | The timer callback calls `settle()`, which copies pending units to `trailingUnits` (`definition-catalog-sync.ts:128–136, 197–199`). One extra small read per unit, with no publication when nothing changed. | Code read | Reject (as a finding) | The consequence is negligible and the mechanism is correct for its supported premise. Recorded as non-blocking recommendation R-1: arm it only for read-triggered flushes, or correct the comment. |
| C-05 | The `definition-catalog` subsystem imports `collaboration-definition-admission/domain/definition-source-descriptor` despite the design's "must not import admission" | Design dependency rules | Engineering contract | Type/value import of the descriptor that the Team and Org domain models already carry (`agent-team-definition/domain/agent-team-definition.ts:6`, `agent-org-definition/domain/agent-org-definition.ts:6`). No dependency on admission services and no cycle. | grep | Reject | Pre-existing placement of shared domain vocabulary, not a new shortcut. |
| C-06 | Package service reads root status through the static `PackageDefinitionMonitor.getProcessInstance()` | Design "narrow port" | Engineering contract | The `rootWatchStatus` port is injectable; the default follows the existing process-instance pattern of the definition services. | Code read | Reject | Consistent with the established pattern. |
| C-07 | Teams-page diagnostics notice can include org-owned Team unavailability | REQ-009 | — | Admission lists org-owned Teams as `agent_team` subjects (N-1) | Code read | Reject | No approved requirement is contradicted; extra visibility only. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | One inventory owner (catalog behind services); one change applier (sync); admission on the catalog; fresh path and caches removed | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements; probes used as evidence only | — |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001…DS-005 map one-to-one to monitor → sync → catalog/readers → services/admission → hub/feed | — |
| Ownership boundary preservation and clarity | Pass | Sync is the only catalog writer (grep: `catalog.apply`/`markSourceMissing` only in the sync and the test helper); monitor never reads definitions | — |
| Off-spine concern clarity | Pass | Grammar, fingerprints, presence and subject expansion each sit with their owner | — |
| Existing capability/subsystem reuse check | Pass | Reuses parsers, codecs, ID helpers, org-owned correlation, chokidar, the projects feed pattern (extracted `NodeChangeFeed`) | — |
| Reusable owned structures check | Pass | `unit-presence.ts` shared by the Team and Org readers; `loadedListReloader` shared by four stores (not by the diagnostics store: CR-002) | CR-002 |
| Shared-structure/data-model tightness check | Pass | `DefinitionCatalogIssue` core vs. `DefinitionDiagnostic` projection; `UnitReadOutcome` / `NodeReadOutcome` tight | — |
| Repeated coordination ownership check | Pass | Settle, flush, queue and expansion live only in the sync | — |
| Empty indirection check | Pass | Persistence-provider pass-through wrappers removed | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Node readers sit with their subjects; source readers handle enumeration and precedence | — |
| Ownership-driven dependency check | Pass | No catalog import of services, GraphQL, collaboration or run execution (C-05 rejected) | — |
| Authoritative Boundary Rule check | Pass | Callers use the services; admission uses the services plus the narrowed registry; no `getFresh*` remains (grep) | — |
| File placement check | Pass | `src/definition-catalog/{domain,services,providers,monitor,changes}` as designed | — |
| Flat-vs-over-split layout judgment | Pass | Readable | — |
| Interface/API/query/command/service-method boundary clarity | Pass | Subject-specific service methods; `definitionDiagnostics(subject)` enum; `noteUnitChange(subject, unitId)` | — |
| Naming quality and naming-to-responsibility alignment check | Pass | Natural names; the trailing re-check comment is imprecise (R-1, non-blocking) | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | — | — |
| Patch-on-patch complexity control | Pass | Initial implementation; refinements are local | — |
| Dead code removed in the touched files and modules (Core Principle 7) | Fail | `projectChangeRetryDelayMs` alias used only by its spec | CR-003 |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | Journey test names map to AC IDs; unit tests cover the rule tables and the state machine | Add a regression test with CR-001 |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | `definition-catalog-test-runtime.ts` | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Stale `.test.js` twins of touched tests removed; 83 others listed as follow-up | — |
| API/E2E readiness for the next workflow stage | Fail | CR-001 can stop the server from starting in an environment API/E2E or the desktop journey may meet | CR-001 |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `definition-catalog/monitor/package-definition-monitor.ts` | 317 (new) | Pass | Delta pressure (new file) | One owner: watch lifecycle and root state machine | Pass | Acceptable | — |
| `definition-catalog/services/definition-catalog-sync.ts` | 296 (new) | Pass | Delta pressure (new file) | One owner: population, settle, queue, publication | Pass | Acceptable | CR-001 fix lands here or in the readers |
| `definition-catalog/services/definition-catalog.ts` | 222 (new) | Pass | Borderline | Pure state and rules, no I/O | Pass | Acceptable | — |
| `web/components/agentOrgs/AgentOrgExperience.vue` | 489 | Pass | Net shrink (card extracted) | Pass | Pass | Acceptable | — |
| `config/app-config.ts` | 488 | Pass | +10 | Pass | Pass | Acceptable | — |
| `agent-packages/services/agent-package-service.ts` | 464 | Pass | +21/−16 | Pass | Pass | Acceptable | — |
| Other changed source files | ≤ 355 | Pass | Small deltas | Pass | Pass | Acceptable | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | Fresh path, cache providers, registry shared enumeration and the old diagnostics query are gone (grep clean) |
| No legacy old-behavior retention in changed scope | Pass | Application-owned disk reads are a distinct, out-of-scope source |
| Dead code removed in the touched files and modules (Core Principle 7) | Fail | CR-003 |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Not Affected`; the migrations only swap a removed pass-through wrapper for the file provider |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | N/A (no migration) |

## Dead / Obsolete / Legacy Items Requiring Removal

| Item / Path | Type | Evidence | Why It Must Be Removed | Required Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/services/projects/projectChangeFeed.ts:12` `projectChangeRetryDelayMs` | `DeadCode` (test-only alias) | Only `services/projects/__tests__/projectChangeFeed.spec.ts:2,91` import it | Code that only its own test calls (Core Principle 7) | Remove it; assert the backoff against `nodeChangeRetryDelayMs` (or in a `nodeChangeFeed` spec) |

## Docs-Impact Verdict

- Docs impact: `Yes`
- Why: new live-refresh behavior, issue badges, package auto-refresh status, the new websocket and GraphQL fields, the DSN-002 effect (a duplicated Team/Org is no longer offered by `list_available_agents`), and the changed package-row wording.
- Files or areas likely affected: server `docs/modules` for agent definitions and agent packages; web `docs/agent_management.md`, `agent_teams.md`, `agent_orgs.md`, `settings.md` (as listed in design step 6, owned by delivery).

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001…P-004 | Confirmed | Implemented as designed (expansion, admission on catalog, units, root state machine) |
| P-005 | Confirmed (rejected; closed anyway by arming before the first scan) | — |
| P-006 | Confirmed | N-1 implemented; guard tests pass |

### `CR-P-01` — A registered package root that is present but unreadable

- Origin: `New`
- Related approved requirement or established contract: REQ-015 ("missing or unreadable … MUST NOT crash … report an error … handle its definitions per DEC-005"); BEH-008 preserved ("Startup is never blocked; other definitions are unaffected"); REQ-008 ("MUST NOT affect other definitions").
- Relevant behavior ID(s): BEH-008, BEH-001
- Coherent product goal or governing event: the server keeps serving every other package when one registered folder cannot be read.
- Scenario validity: `Supported Explicit Edge Scenario`. The approved requirement names it, and the base code already tolerated it.
- Initiating basis kind: `Operational`
- Independent trigger or governing contract: REQ-015. Real causes include folder permissions and, for the desktop app, macOS privacy-protected locations (Documents/Desktop) that return EPERM/EACCES to `readdir`.
- Support evidence: REQ-015 text; base `FileAgentDefinitionProvider.getAll` and `DefinitionSourceRegistry.scan` skipped unreadable folders.
- Forward path: server start → `buildStudioServer` → `composeDefinitionCatalogFeed` → `definitionAdmissionService.scan()` → `teams.listAdmissionEntries()` → `sync.settle()` → `ensurePopulated()` → `runFullReconcile(false)` → `reader.listUnitIds(context.present)` → `listChildDirNames` throws EACCES. Population rejects and is retried on every later read, failing each time.
- Lifecycle preconditions and material consequence: the root folder exists (stat succeeds, so it counts as present) but one of its kind folders cannot be listed. Startup rejects. In a running server, a later `reloadAll` (Reload, package action) rejects instead, and `noteRootChanged` batches fail and re-pend.
- Reachability: `Reachable` (reproduced by the reviewer probe).
- Review consequence / proportionate response: CR-001, Local Fix. Isolate enumeration failure per root. No new machinery beyond a per-root catch and an issue/log.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.0
- Overall score (`/100`): 90
- Score calculation note: simple average of the ten categories; the decision follows the findings.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001…DS-005 are directly readable in code: monitor → sync → readers/catalog → services/admission → hub/feed | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.3 | Single catalog writer; services are the only public boundary; admission enumerates through services; no fresh-read bypass remains | Monitor root status reaches the package service through a static process instance (consistent with the existing pattern, C-06) | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.2 | Subject-specific service methods, `definitionDiagnostics(subject)` enum, explicit frame contract (zod) | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.2 | Node readers with their subjects; source readers own enumeration and precedence; grammar is separate from the monitor | Monitor and sync are dense but single-owner | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.2 | Tight issue/outcome types; `unit-presence` and `loadedListReloader` shared | The diagnostics store re-implements in-flight handling without the follow-up (CR-002) | Reuse the reloader semantics |
| `6` | `Naming Quality and Local Readability` | 9.1 | Natural domain names throughout | Trailing re-check comment does not match its actual scope (R-1) | Align the comment or the scope |
| `7` | `API/E2E Readiness` | 8.8 | Journey integration covers AC-001…AC-016 paths; Linux probe recorded | CR-001 can stop the server from starting in a reachable environment | Fix CR-001 and add a regression test |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 7.5 | Rule table, settle/flush/queue, expansion, the root state machine and N-1…N-4 are correct | CR-001: one unreadable folder fails every definition read and blocks startup, against REQ-015 and preserved BEH-008. CR-002: a diagnostics notice can stay stale after a quick second change | Per-root enumeration isolation; diagnostics follow-up reload |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | Clean-cut removal of caches, fresh path, old registry enumeration and the old diagnostics query | — | — |
| `10` | `Cleanup Completeness` | 8.8 | Thorough removal list, stale `.test.js` twins removed, follow-up list recorded | `projectChangeRetryDelayMs` test-only alias (CR-003) | Remove the alias |

## Findings

### CR-001 — An unreadable registered package folder fails every catalog read and blocks server startup (High)

- Candidate / premise: C-01, CR-P-01. Contract: REQ-015, REQ-008, BEH-008 preserved ("Startup is never blocked; other definitions are unaffected").
- Evidence:
  - `definition-catalog/domain/definition-node-files.ts:20–29`: `listChildDirNames` rethrows every error except ENOENT/ENOTDIR.
  - Callers: `providers/agent-definition-source-reader.ts:31–38`, `providers/unit-presence.ts:16–25` (Team/Org `listUnitIds`), and `readTeamLocalAgentNodes` / the org reader (per-unit, already caught by `reconcileUnit`).
  - `services/definition-catalog-sync.ts:275–296` `runFullReconcile` has no per-root isolation. `ensurePopulated` (`:171–184`) rejects, so `settle()` rejects for every service read and for admission. `reconcileBatch` (`:242–273`) fails the whole batch for a root change and re-pends it on every later read.
  - `compositions/build-studio-server.ts`: the startup `admission.scan()` is awaited unguarded, so startup rejects.
  - Base behavior: unreadable folders were skipped (`file-agent-definition-provider.ts@359d2c0ef` `getAll`: `catch { continue; }`; registry `readdir(...).catch(() => [])`).
  - Reviewer probe (temporary test, removed after the run): an external root with `agents/` at mode 000 → `getAllAgentDefinitions()` and `admission.scan()` both threw `EACCES: permission denied, scandir …/ext/agents`, even though the default root was healthy.
- Required action (Local Fix, implementation):
  - Isolate enumeration failure per root in the readers or the sync, so one unreadable root never fails population, a full reconcile or a batch.
  - Keep that root's existing units as last good (DEC-005) with an issue or log that names the unreadable folder; first-seen units from that root simply stay absent. Other roots reconcile normally.
  - Confirm that Settings shows the root as not auto-refreshing (chokidar's EACCES error should already drive `UNAVAILABLE`).
  - Add a regression test with an unreadable kind folder: other roots stay readable and `admission.scan()` resolves.

### CR-002 — Diagnostics store drops a change notification that arrives during an in-flight load (Low)

- Candidate: C-02. Contract: REQ-005 and REQ-009, AC-004 ("fixing the file … clears the error"), and the feed's own reload contract.
- Evidence: `autobyteus-web/stores/definitionDiagnosticsStore.ts:19–21` returns the running promise with no follow-up. The list stores use `utils/definitionCatalog/loadedListReloader.ts`, which schedules one follow-up "so a change during a reload is never missed". Back-to-back publications are expected when a read flush splits a burst (design § Key Tradeoffs). The web's own reloads call `settle()` and can trigger such a flush.
- Required action (Local Fix, implementation): give each diagnostics subject the same in-flight-plus-one-follow-up semantics, preferably by reusing `createLoadedListReloader`. Add a unit case: a reload requested during an in-flight load runs once more.

### CR-003 — Test-only alias left in a touched file (Low)

- Candidate: C-03. Contract: Core Principle 7.
- Evidence: `autobyteus-web/services/projects/projectChangeFeed.ts:12` `export const projectChangeRetryDelayMs = nodeChangeRetryDelayMs`. Its only consumer is `services/projects/__tests__/projectChangeFeed.spec.ts:2,91`.
- Required action (Local Fix, implementation): remove the alias and assert the backoff against `nodeChangeRetryDelayMs` where it is defined.

### Non-blocking recommendation

- **R-1 (C-04):** the trailing re-check also runs after timer-fired settles, while the comment (`definition-catalog-sync.ts:122–127`) and handoff describe it as covering only units a read applied early. Either arm it only for read-triggered flushes, or correct the comment. Behavior is correct either way.

## Classification

- `Local Fix`: CR-001, CR-002 and CR-003 are bounded corrections inside implementation-owned source (catalog readers/sync, one web store, one web service file). No design or requirement change is needed: REQ-015 and DEC-005 already define the intended behavior for an unreadable root.

## Recommended Recipient

- `/software_engineering_team/implementation_engineer` (Local Fix). After the fix, source review (targeted delta on CR-001…CR-003) and then API/E2E.

## Residual Risks

- Remote-access auth on `/ws/definition-catalog` reuses `authorizeRemoteAccessWebSocket`, but this change does not exercise it. That belongs to API/E2E (QR-006).
- Vitest monitor tests were run on macOS only. Linux behavior is evidenced by the container probe, not by the test files.
- The desktop SCN-012 journey and AC-008/009/010/014 remain for API/E2E.
- DSN-002's visible effect needs delivery docs.

## Latest Authoritative Result

- Review Decision: `Fail`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass` (scenarios established; CR-001 rests on a supported explicit edge scenario named by REQ-015)
- Material-Premise Gate: `Pass` (CR-P-01 reachable and supported; C-04…C-07 rejected)
- Score Summary: 9.0/10 (90/100). Runtime Correctness 7.5, API/E2E Readiness 8.8 and Cleanup 8.8 are below the 9.0 bar.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/implementation_engineer`
- Notes: The architecture is implemented faithfully and N-1…N-4 are honored. The three findings are local.

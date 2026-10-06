# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, SR-001)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (Source Log, AF-001..AF-011)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-001, SR-002)
- Design Spec Reviewed As Context: `design-spec.md` (SR-002)
- Supplemental Task Artifacts Reviewed As Context: None exist. Product Design: N/A.
- Relevant Solution Revision IDs: SR-001, SR-002
- Design Review Report Reviewed As Context: `design-review-report.md` (Pass, round 1)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-001
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: Initial implementation (IR-001, commit `62af418df`) handed off by `/software_engineering_team/implementation_engineer`
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Relevant API/E2E Revision IDs: N/A
- Delivery Revision Record / IDs: N/A
- Failing Scenario IDs / Commands / Evidence: N/A

All artifacts are in `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/`.

## Routing Classification Review

- Task size: `Medium`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The diff touches 18 files, mostly deletions and test/doc updates. The only new production code is one 73-effective-line migration. High risk is correct because the change permanently deletes an app-data folder with no backup.

## Review Scope

- Changed implementation and behavior reviewed: the full diff `1aa918298..62af418df`, which covers:
  - the built-in registry row and constant, and the template folder, both deleted;
  - the new migration and its registration;
  - the web mirror;
  - the smoke script;
  - unit, integration and E2E test changes;
  - the web spec and probe;
  - docs (server README, server and web `projects.md`, TESTING.md).
- Files / areas also read for context:
  - `app-data-migration-runner.ts` (`runPending`, `runMigration` STARTUP_ONLY rejection, `classifyRecoveryAction`);
  - the predecessor `remove-external-messaging-data-migration.ts`;
  - the other `STARTUP_ONLY` migrations;
  - the `runPending`-before-`prepareBeforeListen` order in `server-runtime.ts:178/245` and `start-standalone-application-host.ts:146/312`.
- Reviewer-run checks:
  - `vitest run tests/unit/built-in-agents tests/unit/app-data-migrations/remove-built-in-project-task-manager-migration.test.ts tests/integration/app-data-migrations/remove-built-in-project-task-manager-startup.integration.test.ts` → 4 files, 23 tests passed.
  - `pnpm -C autobyteus-web test:nuxt utils/agents utils/collaborators --run` → 3 files, 10 tests passed (includes the mirror contract).
  - `git grep "autobyteus-project-task-manager|PROJECT_TASK_MANAGER|projectTaskManager"` outside `tickets/` → only the expected hits: the migration file, its registration, the README, the smoke absence check, retirement and migration tests, and the historical web fixture (AF-007).
- Explicit exclusions:
  - AC-008 continue behavior (no code change; API/E2E owns it).
  - Entry-point-level server start checks (API/E2E).
  - The untracked `autobyteus-application-*/dist/` prebuild output.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood:
  - Stop shipping the built-in.
  - Delete the installed copy once, without backup (DEC-001 = A).
  - Never block startup; retry on the next start.
  - Touch nothing else.
  - Old runs stay readable but cannot be continued (DEC-002).
  - Projects tools are unchanged.
- Design-spec behavior map verified against the implementation: Yes. See the table below.
- Design review report and round confirmed: ARCH-REV-001, Pass. REC-001 was applied as option 1 (`STARTUP_ONLY`).
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: UNK-001 (how the AC-008 continue failure looks to the user) is existing behavior and is left to API/E2E.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | The registry row and constant are removed and the template is deleted. Bootstrapper code is unchanged. Evidence: the bootstrapper test asserts exactly `[retrospective, daily]`; the templates test asserts no entry and no template; the smoke asserts the dist template is absent and that bootstrap creates no folder. | — |
| BEH-002 | Confirmed | Order: `runPending` (server-runtime:178 / standalone:146) → migration removes the folder → `prepareBeforeListen` (245 / 312) → bootstrap → cache. The integration test shows the precondition `[retired, repository]` and exactly `["project-task-manager"]` after start and after restart. | — |
| BEH-003 | Confirmed | `RemoveBuiltInProjectTaskManagerMigration`, single item: lstat ENOENT ⇒ SKIPPED; rm ⇒ MIGRATED; error ⇒ FAILED. It never throws. It is required, STARTUP_ONLY and registered last with the exact path from `getAgentsDir()`. The runner skips terminal success; FAILED ⇒ `RESTART_TO_RETRY` ⇒ the next start retries (integration test: attempts 1 → 2). Preserved files are byte-identical. | — |
| BEH-004 | Confirmed (no change) | No code touched. The history fixture is unchanged. | — |
| BEH-005 | Confirmed (no change) | No tool code touched. The node-locality E2E drops only the manager lookup; the rest of E-008 is intact. | — |
| BEH-006 | Confirmed | The web mirror drops the ID and the contract spec passes. The server `@` policy is derived from the registry. The spec and probe lists are updated. | — |
| BEH-007 | Confirmed | Server and web `projects.md` say "no shipped manager; any agent selecting the Project tools". The README has a migration paragraph. TESTING.md "Manager bootstrap" is replaced. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, BEH-006 | System/User | User installing the new version | Use the app without a built-in manager | First start | Normal | runPending (SKIPPED) → bootstrap (2 built-ins) → cache | No built-in PTM | requirements; bootstrapper; smoke | Supported Normal Scenario | Use |
| SCN-002 | BEH-002, BEH-003 | System/User | User upgrading from a beta | See one PTM | First start after update | Normal | runPending → migration rm → record SUCCEEDED → bootstrap → cache; restart skips | Only `project-task-manager` listed | requirements; integration test | Supported Normal Scenario | Use |
| SCN-003 | BEH-003 | Operational | Data Migration Guideline §1 | Startup must not depend on cleanup | Start after update; removal fails | Explicit Edge | migration FAILED (no throw) → warning → startup continues → `RESTART_TO_RETRY` → next start retries | App usable; duplicate until a later start succeeds | guideline; runner; integration test | Supported Explicit Edge Scenario | Use |
| SCN-004 | BEH-004 | User | User | Read an old built-in conversation | History panel | Normal | unchanged code | Readable; continue fails like any deleted agent | AF-011 | Supported Normal Scenario | Use (API/E2E validates) |
| SCN-005 | BEH-005 | User | User of an agent selecting Project tools | Manage Tasks | Chat | Normal | unchanged code | Unchanged | projects E2E 21/21 (implementer) | Supported Normal Scenario | Use |
| SCN-006 | BEH-003 | System | Install that never had the built-in | Upgrade cleanly | First start | Normal | migration SKIPPED → SUCCEEDED | Nothing changes | unit and integration tests | Supported Normal Scenario | Use |
| SCN-007 | — | Operational | — | Downgrade then re-upgrade | — | — | — | — | Non-goal | Technically Possible but Unsupported/Contrived | Reject |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CR-C-001 | `executionPolicy = "STARTUP_ONLY"`, where the design text said "default ANYTIME" | SCN-003; REC-001 / PREM-002 | A startup removal fails | FAILED ⇒ `RESTART_TO_RETRY`, `canRetry=false`; `runMigration` throws `AppDataMigrationRestartRequiredError` | runner `classifyRecoveryAction`/`runMigration`; integration test asserts recovery action; 5 sibling migrations use the same policy | Reject | This was an option the review sanctioned (REC-001) and it matches REQ-003's wording ("retried on the next start"). It removes the PREM-002 stale-catalog window. The README documents it. No design drift. |
| CR-C-002 | The lstat/rm item logic duplicates the external-messaging migration | Design "Reusable Owned Structures": released migrations stay self-contained | — | — | design-spec; design-review-report | Reject | The design deliberately kept the copy bounded. Not a duplication defect. |
| CR-C-003 | The literal `autobyteus-project-task-manager` appears in `app-data-migration-registry.ts`, not only in the migration file | Design Final File Responsibility Mapping (the registry passes the exact path) | — | — | design-spec rows for the registry; the predecessor registry passes roots the same way | Reject | The design specifies it. It is the migration subsystem's composition point, not a current-runtime reader. |
| CR-C-004 | A user agent that legitimately owns the ID is deleted | PREM-001 | Create an agent named exactly "AutoByteus Project Task Manager" on a never-beta install | — | AF-006; design-review-report PREM-001 | Reject | Technically Possible but Unsupported/Contrived (confirmed upstream). No guard required. |
| CR-C-005 | The integration test runs only this migration in a one-entry registry, not the full registry | AC-002/003/004/006 proof | — | The instance comes from `new AppDataMigrationRegistry().listDefinitions().at(-1)` and the test asserts its ID, so the real path resolution is exercised | integration test | Reject | Proportionate proof at the runner/bootstrap/catalog layer. Entry-point startup is explicitly left to API/E2E. |
| CR-C-006 | A partial `rm` failure leaves a partly deleted folder | SCN-003 | rm fails midway | The next start runs `rm({recursive, force})` again, which is idempotent | design §2.5; unit retry test | Reject | Already covered by the approved design. No extra machinery needed. |

No candidate was promoted. None is held for evidence.

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved | Pass | Cleanup / No Design Issue Found. The bootstrapper and `@` policy absorbed the removal with no code change. | None |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | None exist | None |
| Data-flow spine inventory clarity and preservation | Pass | DS-001 (runner → migration → record) and DS-002 (bootstrap → cache → catalog/`@`) are preserved. The order is unchanged in both entrypoints. | None |
| Ownership boundary preservation and clarity | Pass | The runner owns status and retry. The migration owns one path's removal and formats no status text. The registry resolves the path. The bootstrapper gets no deletion duty. | None |
| Off-spine concern clarity | Pass | The web mirror and README stay off-spine | None |
| Existing capability/subsystem reuse check | Pass | Uses the app-data migration subsystem | None |
| Reusable owned structures check | Pass | CR-C-002 (deliberate self-contained migration) | None |
| Shared-structure/data-model tightness check | Pass | No new shared types; uses the existing migration types | None |
| Repeated coordination ownership check | Pass | Retry and one-time semantics stay with the runner | None |
| Empty indirection check | Pass | No new layers | None |
| Scope-appropriate separation of concerns and file responsibility | Pass | One migration per file | None |
| Ownership-driven dependency check | Pass | The migration imports only `node:fs/promises` and the migration types. It imports neither the built-in registry nor agent services. | None |
| Authoritative Boundary Rule check | Pass | No startup code calls `execute()` directly. In the integration test, `execute` is reached only through the runner. | None |
| File placement check | Pass | `migrations/remove-*-migration.ts` sibling convention | None |
| Flat-vs-over-split layout judgment | Pass | Matches the existing flat `remove-*` layout | None |
| Interface/API boundary clarity | Pass | `constructor(installedAgentDir: string)`; exported migration ID constant | None |
| Naming quality | Pass | `RemoveBuiltInProjectTaskManagerMigration`, `installedAgentDir`, `removeInstalledAgentDir`, item ID `installedAgentDir` | None |
| No unjustified duplication in changed scope | Pass | CR-C-002 | None |
| Patch-on-patch complexity control | Pass | Single clean change | None |
| Dead/obsolete code cleanup completeness | Pass | Constant, row, template, PTM prompt test, smoke PTM assertions, E2E manager lookup and receipt field, and mirror/spec/probe entries are all removed. The grep sweep is clean. | None |
| Test scenarios and assertions are clear and requirement-aligned | Pass | Unit tests cover every disposition. The integration test proves the AC-002/003/004/005/006 outcomes, including the precondition duplicate, byte-identical preservation, `execute` called once, and attempts 1 → 2 after failure. The bootstrapper test proves bootstrap neither creates nor rewrites a stale copy. | None |
| Test fixtures/helpers reusable and structure coherent | Pass | Small local helpers. Temp data is owned and cleaned up; env and config are restored. | None |
| No stale, duplicated, or compatibility-only tests retained | Pass | The PTM prompt/tools test is replaced by a retirement test | None |
| API/E2E readiness | Pass | AC-008 and entry-point startup checks are clearly handed off with suggested scenarios | None |

## Source File Size And Structure Audit

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `src/app-data-migrations/migrations/remove-built-in-project-task-manager-migration.ts` (new) | 73 | Pass | Pass (+82) | Pass | Pass | Healthy | None |
| `src/app-data-migrations/app-data-migration-registry.ts` | 128 | Pass | Pass (+4) | Pass | Pass | Healthy | None |
| `src/built-in-agents/built-in-agent-registry.ts` | 33 | Pass | Pass (−2) | Pass | Pass | Healthy | None |
| `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts` | small | Pass | Pass (−1) | Pass | Pass | Healthy | None |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No alias, catalog filter, retired-ID list, or mirror retention |
| No legacy old-behavior retention in changed scope | Pass | — |
| Dead/obsolete code cleanup completeness in changed scope | Pass | Grep sweep clean |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Migration Required` (approved deletion): one path, no backup, no scan |
| No version-specific dual reads/writes or request-time old-shape fallback | Pass | The old literal lives only in the migration subsystem (CR-C-003) |
| Approved transition mechanics match the reviewed design | Pass | lstat/rm/FAILED semantics, never throws, required, no prerequisites, registered last, exact path. The execution policy follows REC-001 (CR-C-001). |

## Dead / Obsolete / Legacy Items Requiring Removal

None.

## Docs-Impact Verdict

- Docs impact: `Yes` (done in this change)
- Why: The docs described a shipped manager. The migration needs an operator-facing entry.
- Files or areas affected: `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/modules/projects.md`, `autobyteus-web/docs/projects.md`, `TESTING.md`. The wording is accurate. Delivery should run the AC-010 docs check.

## Additional Material Premise Validation

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| PREM-001 | Confirmed | — |
| PREM-002 | No Longer Relevant | With `STARTUP_ONLY`, `runMigration` throws `AppDataMigrationRestartRequiredError` and the UI shows `RESTART_TO_RETRY` with no Retry button. A mid-session manual retry is no longer reachable. |

New or reclassified premises beyond the above: None.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.5
- Overall score (`/100`): 95

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| 1 | Data-Flow Spine Inventory and Clarity | 9.5 | DS-001/DS-002 are preserved; the migration sits before the catalog build in both entrypoints | Nothing material | — |
| 2 | Ownership Clarity and Boundary Encapsulation | 9.5 | The runner owns retry and status; the bootstrapper has no deletion duty; no `execute()` bypass | Nothing material | — |
| 3 | API / Interface / Query / Command Clarity | 9.5 | A single-subject constructor with an explicit absolute path | Nothing material | — |
| 4 | Separation of Concerns and File Placement | 9.5 | One migration per file, sibling convention | Nothing material | — |
| 5 | Shared-Structure / Data-Model Tightness and Reusable Owned Structures | 9.0 | No new types; the existing migration types are reused | The predecessor's lstat/rm block is deliberately duplicated (design-sanctioned, CR-C-002) | — |
| 6 | Naming Quality and Local Readability | 9.5 | Clear names; the comment explains why the policy is startup-only | Nothing material | — |
| 7 | API/E2E Readiness | 9.5 | Integration proof at the runner/bootstrap/catalog layer; clear AC-008 and entry-point scenarios | Entry-point and AC-008 proof still pending (owned by API/E2E) | — |
| 8 | Runtime Correctness And Behavioral Fidelity | 9.5 | Every disposition is tested; restart and failure-retry are proven over a real record store; preserved files are byte-identical | Nothing material | — |
| 9 | No Backward-Compatibility / No Legacy Retention | 9.5 | Clean cut; the old literal is confined to the migration subsystem | Nothing material | — |
| 10 | Cleanup Completeness | 9.5 | Constant, row, template, tests, smoke, E2E, mirror, spec, probe and docs are all updated; grep is clean | Nothing material | — |

## Findings

None.

## Classification

N/A (Pass).

## Recommended Recipient

The primary pass handoff goes to the recipient returned by `get_handoff_rules` (normally `/software_engineering_team/api_e2e_engineer`). An informational pass notice goes to `/software_engineering_team/implementation_engineer`.

## Residual Risks

- AC-008 / UNK-001: the outward behavior when continuing an old built-in run must be validated in API/E2E. The design's escalation trigger applies if it is worse than the existing "not found" failure.
- Entry-point-level confirmation through a real Studio or standalone start, including Server Migrations status SUCCEEDED or FAILED + `RESTART_TO_RETRY`, is still owned by API/E2E.
- SCN-007 (downgrade then re-upgrade) is unsupported. DEC-002 (Team/Org members referencing the built-in) was accepted by the user.
- The pre-existing `typecheck` TS6059 `rootDir` issue on base is unrelated.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass` (PREM-001 confirmed contrived; PREM-002 no longer relevant under STARTUP_ONLY)
- Score Summary: 9.5/10 (95/100); every category ≥ 9.0
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer` (per handoff rules)
- Notes: The implementation matches the SR-002 design and ARCH-REV-001. REC-001 was applied as option 1. There are no findings.

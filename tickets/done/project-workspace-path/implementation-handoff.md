# Implementation Handoff — Project workspace paths

## Upstream Artifact Package

- Architecture review applicable: **Pass ARCH-REV-001**, requirements **SR-002 / AP-001**, design **SR-003**. No review findings.
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/solution-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/design-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/architecture-review-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/analysis-result.md`
- `analysis-result.md` is historical/superseded, not current approval. Product UI/UX/behavior supplements: **N/A — not applicable**. Triggering rework reports: **N/A — initial baseline**.

## Current Implementation Summary

**Implementation Complete — ready for independent Code Review**, not API/E2E, delivery or release acceptance.

- Cycle: Initial; revision **IR-001**, `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/implementation-revision-record.md`.
- Related: SR-002/AP-001 + SR-003; ARCH-REV-001. CRR/API-REV/DR and triggering findings: **N/A**.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path`; branch `codex/project-workspace-path`; base `5316a0cad19498819a8a50c594b72c0197d8b6a1`.
- Development commits, in order:
  - `6cc26a9e9`: freeze released migration Project target reader/types before current-schema cutover.
  - `512a83115`: separately labelled baseline test fix: workspace-removal unit supplies empty process run catalogs.
  - `9dad89bae`: coordinated path-only server/tool/GraphQL/feed/web cutover, focused tests and module docs.
- Current source and this handoff are authoritative. Cumulative ticket/evidence files are committed separately; no merge/push/tag/release.

Project associations now use one canonical absolute path and description. Tool input is `workspace_path`; JSON/API/feed/web identity is `workspaceRootPath`. Picker and manual authoring submit the same shape. Save does not register or create folders or require existence. ProjectService remains the policy owner. The current store projects only path/description, reads old supersets without writes, and writes exact two-key links on ordinary saves. Task/layout/resource logic is unchanged. Existing migration keeps historical four-field classification/output in an isolated frozen file; no new migration or sweep.

## Routing Classification

- **task_size: Medium; architectural_risk: High — Confirmed**, as design-spec classification section.
- Evidence: bounded changes to existing owners, but material public contract/persistence and strict feed/UI cutover remain High. No broader subsystem, new lifecycle or compatibility branch.
- Selected route: **Code Review**, confirmed by `get_handoff_rules` on 2026-10-07. Direct-route lightweight self-review: **Not Applicable**; normal implementation self-inspection completed.
- New Design Impact/Requirement Gap: **None**. No scope expansion or implicit risk downgrade.

## Reviewed Behavior Implementation Trace

Server paths below are relative to `autobyteus-server-ts/`, web to `autobyteus-web/`.

| Behavior | Approved change / preserved outcome | Actual production path / files | Result / local evidence |
| --- | --- | --- | --- |
| BEH-001 (REQ/AC-001/003; DS-001/005) | Strict path tool rows; explicit Project patch identity; omission/blank/list semantics and selection parity | shared `src/agent-tools/project-tasks/project-task-tool-{contract,manifest}.ts` → ProjectService record commands → catalog-locked exact writer → publisher + path acknowledgement | Native preparation/MCP adapter unit parity, malformed/old ID rejection, canonical duplicates and atomic patch tests pass; no registration/Task enrichment on acknowledgement |
| BEH-002 (REQ/AC-002/004/005; DS-001/002/003/004) | Two-key entries; old paths/descriptions and Project/Task data survive; view/order/live contract | `src/projects/domain/models.ts`, `stores/project-store.ts`, `services/project-service.ts` → GraphQL `types/projects.ts` / `changes/project-change-messages.ts` → web `types/project.ts`, fragments/store, panel/row | Historical/current store read-no-write and ordinary-save cleanup pass; context/Task/resources byte continuity tested; strict wire rejects ID/time keys; real browser reload/edit/unlink observed |
| BEH-003 (REQ/AC-003/004/005; DS-001/002/005) | Omitted list preserves, supplied list replaces in order, [] unlinks; omitted retained tool description preserves, blank clears | ProjectService pure normalization/merge and direct path operations; frontend panel busy/key/query/unlink path; unchanged publisher sequencing | Tests cover metadata atomicity, canonical duplicates, ordering, full-form semantics, unlink and Task continuity. Browser invalid/duplicate messages and Cancel preserve state |
| BEH-004 (REQ/AC-006; DS-001/002) | Direct absolute path, picker only convenience; no existence/registration/mkdir prerequisite | service path.isAbsolute/NUL guard + existing pure canonicalizer; manager `listRegisteredWorkspaceRootPaths` only for read view; editor/entry one path draft | Unit acceptance of nonexistent/unregistered path with no lookup/write; one root snapshot per list/skip empty; owned browser picker+manual Save, unchanged registry, absent manual directory |

Scope Guardrail followed: **Yes**. No Task/delegation changes, global workspace-ID refactor, ID alias, symlink policy, cross-node filesystem access, new discovery, release or migration lifecycle.

## Key Files And Ownership

- Historical isolation: `src/app-data-migrations/migrations/projects-per-folder-v1/released-project-folder-v1.ts`; existing migration's exact classifier/equality/post-write call sites repointed. Frozen provenance is pinned in-file. Existing layout and Task reader unchanged.
- Service/store: existing Project boundary owns canonical absolute paths, duplicates, metadata/list merge and view ordering; manager exposes only registered roots, no registry mechanism leak.
- Transport: all current native/MCP/GraphQL/feed association fields changed together. Existing global registration/runtime IDs untouched.
- Renderer: `ProjectEditor`, `ProjectWorkspaceEntry`, `ProjectWorkspacesPanel`, `ProjectWorkspaceRow`; path-only draft/types/fragments/store, router-encoded `workspacePath`, stable row `data-testid` plus `data-path`. Removed unused `linkableWorkspaces` utility/test.
- en/zh-CN absolute-path validation and truthful folder-reference copy. Existing visual components/layout retained.
- Module docs: server `projects.md`, `agent_tools_mcp_server.md`, web `docs/projects.md`. TESTING.md commands did not change.

## Assumptions / Known Risks

- Matched backend/web deployment; no old-client alias or old/new concurrent writer/rollback guarantee.
- Command path semantics are executing-node native `path.isAbsolute` + existing canonicalizer; no shell expansion, realpath, symlink identity or case folding. Historical reads do not recanonicalize or add host-specific command checks.
- AVAILABLE means registry membership, not actual folder access. No new registry subscription/caching behavior.
- HTTP/scoped-MCP, real websocket/reconnect, node isolation, real restart/upgrade and cross-OS boundaries remain downstream validation work, not inferred from unit totals or browser observations.
- **Existing broader API/E2E fixtures still use the old contract.** Per skill ownership, they were not reauthored or executed here. This is explicit required work for API/E2E, not a claimed pass or production fallback. Inventory: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/implementation-evidence/ir-001/downstream-contract-fixtures.txt`.

## Design Health / Legacy / Data Transition Checks

- Reviewed posture: Behavior Change / bounded model-contract refactor; root cause Shared Structure Looseness + Boundary/Ownership Issue; Refactor Needed Now. Implementation matched: **Yes**; no escalation needed.
- Current runtime compatibility wrappers/dual readers/writers: **None**. In-scope old ID/time dependencies, registration-before-save and timestamp ordering removed. Frozen historical reader is migration-owned only, never imported by runtime.
- Tight structures and boundaries: **Yes**. Reapplied shared principles and root DESIGN.md/data-migration guideline. 22 changed implementation files checked: max 306 nonempty lines, max 101 added+deleted lines; all under 500/220 guardrails (`source-guardrails.json`).
- Persisted decision: **Directly Usable — No Migration**, unchanged. Both two-field current and faithful four-field superset fixtures read byte-identically; description-only ordinary saves write two keys; Task/context/resources bytes unchanged. No source version field, startup sweep or new migration ID/ledger reset.
- Existing migration frozen classification retains old ID/time conflicts, exact four-field output, source preservation and ordinary retry. MP-001 honored; MP-002 unsupported normal-save-while-gated machinery not introduced. Unit runner terminal/retry coverage passes; real startup entrypoints are not certified here.

## Environment / Local Implementation Checks

Evidence root: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/implementation-evidence/ir-001`. Commands run from worktree root; no customer data or running app used.

| Check | Command / result | Evidence |
| --- | --- | --- |
| Dependencies | `pnpm install --frozen-lockfile` exit 0 | `install.log`; initial freeze test could not start because vitest absent (`migration-freeze.log`), not counted as a test pass |
| Shared outputs / production server | `pnpm -C autobyteus-server-ts prebuild` then `pnpm -C autobyteus-server-ts build` (serialized), **exit 0**, TypeScript + sanitized built-module smoke | `prebuild-final.log`, `server-build-final.log`, `build-receipt.json`; source `9dad89bae` |
| Server focused owners | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/projects tests/unit/agent-tools/project-tasks tests/unit/api/graphql/projects-schema.test.ts tests/unit/workspaces/workspace-manager.test.ts tests/unit/workspaces/workspace-removal-guard.test.ts tests/unit/app-data-migrations/projects-per-folder-v1-app-data-migration.test.ts tests/unit/app-data-migrations/app-data-migration-runner.test.ts --no-watch` — **18 files / 243 tests pass** | `server-unit-final.log` |
| Nuxt setup / focused renderer | `pnpm -C autobyteus-web exec nuxt prepare`; `pnpm -C autobyteus-web test:nuxt components/projects stores/__tests__/projectStore.spec.ts utils/projects --run` — **15 files / 119 tests pass** | `nuxt-prepare.log`, `web-unit-final.log` |
| Boundary guards | `pnpm -C autobyteus-web guard:web-boundary`; `pnpm -C autobyteus-web guard:localization-boundary` — both pass | corresponding guard logs |
| Diff / source guardrails | `git diff --check 5316a0cad19498819a8a50c594b72c0197d8b6a1 HEAD` clean; all file/delta limits pass | `source-guardrails.json` |
| Rendered feedback | Actual owned built-server/Nuxt/Chrome form, path edit/unlink/reload, 1512/390 px | `rendered-check.md`, screenshots, persistence + cleanup receipts |

Initial server run had one pre-existing workspace-removal unit setup failure: unchanged removal guard requires process AgentRunManager/AgentTeamRunManager; this unit had no supervisor initialization. Fix `512a83115` provides empty run catalog doubles only for that unit (no production bypass). Original failure is retained in `server-unit-1.log`; revised tests and the independent guard suite pass. Dependency install warnings about not-yet-built SDK bin links are resolved by normal prebuild; no dependency versions changed. Browserslist age / experimental SQLite warnings are retained, not product failures.

Normal build outputs in the two untracked SDK `dist/` directories were removed after checks (not committed). **Run normal server prebuild/build before downstream execution**, as TESTING.md already requires. Ignored node_modules/Nuxt/build caches are local prerequisites, not handoff sources.

## Frontend Rendered-Result Check

**Completed as implementation self-validation**, no redesign. See `/Users/normy/autobyteus_org/autobyteus-worktrees/project-workspace-path/tickets/in-progress/project-workspace-path/implementation-evidence/ir-001/rendered-check.md`.
- Inspected picker/manual authoring, saved available/unregistered rows, special-character encoded edit focus, description Save/reload, invalid and normalized duplicate errors, mode change, Cancel, unlink/reload, narrow layout and focus.
- Corrected truthful row/help copy, visible/focused save error at narrow scroll positions, and invisible manual-path submission after switching to picker. Component regressions cover these corrections.
- Wide/narrow rows and editor had no horizontal overflow; original visual hierarchy and shared components retained.
- Evidence: `paths-wide.png`, `paths-narrow.png`, `editor-narrow-error-focused.png`; initial pre-polish screenshot retained. Browser tab closed, viewport reset, owned processes exited, ports released, data removed.
- Limits: no production frontend bundle or standalone vue-tsc claim, packaged desktop/full product, Windows/Linux execution, real model, complete accessibility audit, zh-CN rendered walkthrough, websocket multi-client/restart test.

## Downstream Executable Coverage Still Required

API/E2E owner should adapt and execute design/TESTING.md suites after source review, without bringing back old contracts:
1. `tests/e2e/projects/project-task-boundaries.e2e.test.ts`: path input/ack, strict old-ID rejection, native/scoped-MCP selection parity and preserved Task actions.
2. `project-mutation-node-locality.e2e.test.ts`: same absolute path accepted on each node without registration, isolated Project data (not old registration-ID rejection).
3. `projects-graphql.e2e.test.ts`: aggregate/direct path inputs and views, errors/atomicity, omission/clear/order, exact disk shape and no Save registry/directory side effects.
4. `project-change-feed.e2e.test.ts` with TESTING.md gated AGY fixture: strict path wire equals GraphQL, update/unlink consistency, no Task/root/reconnect regressions.
5. `projects-startup-migration.e2e.test.ts`: both real startup entrypoints, frozen historical output/classification/retry/terminal skip, current-reader continuity and no new migration; no invented MP-002 scenario.
6. `autobyteus-web/tests/e2e/projects-feature-probe.mjs` (`test:e2e:projects`): change old ID selection/row locators to root-path values + stable data-path targeting; replace registration-survives-failed-save expectation with no-registration-on-save; adapt independent mode-draft assertion to one path draft. Cover picker/manual exact entries, spaces/#/?/unicode/backslash where host-valid, invalid canonical duplicates, edited unregistered links, notice/navigation/unlink/reload.
7. Preserve migration historical fixtures and unrelated global registration/Task behavior. Rebuild owned targets. Broader executable coverage, confidence/pass-fail classification, desktop/full-product checks and user verification remain their assigned downstream owners.

## Routing Record

Rule lookup on 2026-10-07 selected the initial Implementation Complete + architectural_risk=High rule → **`/code_reviewer`**. Other rules do not apply. Cumulative package will be sent only to that exact recipient; the send tool receipt is the dispatch authority. No duplicate notification to the sender or Solution Designer.

# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-sync-transparency-design/tickets/done/memory-sync-transparency/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code review round 2 passed and routed Memory Sync transparency work to API/E2E coverage investigation and execution.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior to prove is the minimal Memory Sync Source transparency update:

- `Test connection` now has explicit GraphQL modes: `SAVED` tests persisted source hub URL/source node id/saved token only; `DRAFT` tests draft hub URL/source node id/token together. Blank-token UI testing must use saved mode and must not mix unsaved draft URL/source id with the saved token.
- The Source card keeps operation feedback inline: testing state/result beside `Test connection`, `Sync now` disabled/spinner state, `Current job: idle` or `Current job: syncing…`, and `Last sync: success · <timestamp>` or latest sync error.
- Status refresh/polling updates the store status only and must not rehydrate Source form fields or clear a pasted draft token.
- Latest sync error must take precedence over an older `lastSuccessfulSyncAt` value.
- Existing memory sync data behavior must remain intact: source memory syncs to hub/imports, imported memory remains read-only/selectable, token values are not exposed, duplicate clicks/runs are coalesced or disabled.
- Legacy/compatibility posture: no old plaintext-token-only GraphQL test shape, no user-facing raw `Job state`/manual `Last run` primary surface, no top-level `store.info` as primary Source action result.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| GraphQL `testMemoryHubConnection` input uses explicit `MemoryHubConnectionTestMode` (`SAVED`/`DRAFT`) | Changed | Requirements REQ-004/REQ-005, AC-002/AC-015; design DS-001; implementation handoff notes stale API/E2E callers | Update existing API/E2E callers from old `{ hubBaseUrl, token, sourceNodeId }` shape and add explicit saved/draft mode assertions. |
| Saved blank-token connection test uses persisted source config only | Added/Changed | Requirements AC-002/AC-015; design DR-003 resolution; backend `MemorySyncConnectionTestService` | Add durable API/E2E saved-mode coverage proving poisoned/draft input fields do not override persisted saved settings. |
| Draft-token connection test uses draft hub URL/source id/token together | Changed | Requirements REQ-005; design examples; frontend store projection | Update in-process API E2E to use `DRAFT` mode for pre-save/draft token health check. |
| Manual source sync still pushes local memory to hub/imports and exposes imported memory | Preserved | Requirements REQ-012/AC-013; existing memory-sync API/multiprocess E2E | Retain and rerun existing durable E2E coverage after input-shape updates. |
| `getMemorySyncStatus.sourceState` remains source of `jobState`, `lastSuccessfulSyncAt`, `lastError`, tracked files | Preserved with new UI semantics | Requirements REQ-006/REQ-007/REQ-010; design DS-002/DS-003 | Retain existing status assertions; add API E2E evidence that an error after success is visible in status as `jobState: error` with `lastError` while old success timestamp remains. |
| Source card inline UI states and form-preserving status refresh | Added/Changed | Requirements AC-001/AC-005/AC-014; design DS-004 | Existing component coverage remains valid; run it as executable UI coverage. No browser E2E harness is required for this ticket because the card-level behavior is already covered at the component boundary. |
| Old raw `Job state`/manual `Last run`/top-level `store.info` primary result | Removed | Design Removal Plan; code review CR-001/CR-002 resolved | Keep component regression coverage; no compatibility E2E coverage should be added for removed behavior. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` — in-process GraphQL + REST memory sync | Configures hub/source, tests connection, starts sync, verifies imported memory and REST safety | REQ-004/REQ-005/REQ-012; AC-002/AC-003/AC-006/AC-013 | Needs Update | Static grep shows caller still passes old input `{ hubBaseUrl, token, sourceNodeId }`; current GraphQL schema requires `mode`. Scenario remains the right API boundary. | Update to `DRAFT` mode for pre-save token check, add `SAVED` mode after source config with poisoned draft fields ignored, retain sync/import assertions, add latest-error status assertion. |
| `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` — two real backend processes | Starts hub/source processes, configures source, tests connection, runs sync, verifies imported source/read-only memory | REQ-004/REQ-012; AC-002/AC-013; realistic Docker/remote-node analogue | Needs Update | Static grep shows old plaintext-token input. This is the strongest realistic process-boundary coverage and should remain. | Update connection test to `SAVED` mode after persisted source config; rerun. |
| `autobyteus-server-ts/tests/unit/memory-sync/memory-sync-local-fixes.test.ts` — saved/draft service and sync gate regressions | Covers saved mode not mixing draft fields at service boundary, draft mode using draft identity, background/manual coalescing | REQ-004/REQ-005/REQ-009; AC-002/AC-008/AC-015 | Still Valid | Code review ran 8 passing tests; source-level coverage directly maps to new service and sync coalescing. | Retain and rerun as focused executable coverage. |
| `autobyteus-web/components/settings/__tests__/MemorySyncCard.spec.ts` — Source card component behavior | Covers form/draft token preservation under status change, saved vs draft test dispatch, latest error precedence, removed legacy feedback, sync button state | REQ-001/REQ-004/REQ-005/REQ-007/REQ-009/REQ-013; AC-001/AC-005/AC-007/AC-014/AC-015 | Still Valid | Code review ran 4 passing tests; assertions target user-visible card behavior and removed legacy paths. | Retain and rerun as UI executable coverage. Add timer-level assertion only if execution reveals a gap. |
| `autobyteus-web/graphql/mutations/memorySyncMutations.ts` / `autobyteus-web/stores/memorySyncStore.ts` store projection | Frontend mutation doc and store map saved/draft requests to GraphQL `SAVED`/`DRAFT` modes | REQ-004/REQ-005; design DS-001 | Still Valid | Static inspection shows `toConnectionTestMutationInput()` emits `mode: 'SAVED'` or `mode: 'DRAFT'`; component tests cover dispatch into store. | Retain; no separate durable E2E file needed beyond component/API execution. |
| Broad web `nuxi typecheck` and full server `pnpm typecheck` | Project-wide static checking | General correctness | Out Of Scope for API/E2E pass gate due known unrelated failures | Code review documents pre-existing unrelated broad failures; focused source build check passed. | Do not use broad known-failing checks as final API/E2E gate; rerun focused checks relevant to changed scope. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None to remove | N/A | Existing relevant coverage remains useful after input-shape updates. | Requirements/design remove old UI/API behavior, but no repository-resident stale test must be deleted; old callers are updateable. | Updated explicit-mode API/E2E and existing component regressions. | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-E2E-001 | Draft-token GraphQL connection test succeeds with explicit `DRAFT` mode against real hub health endpoint | REQ-005, AC-003; design DS-001 | Update existing `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` scenario | Prevents regressions back to old implicit input and proves draft identity over the API/REST boundary. |
| API-E2E-002 | Saved GraphQL connection test succeeds after source config is persisted and ignores supplied draft/poisoned fields when `mode: SAVED` | REQ-004, AC-002, AC-015; design DR-003 resolution | Add assertion in `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | Proves blank-token saved-settings behavior at API/E2E boundary, not only unit service boundary. |
| API-E2E-003 | Latest sync failure after an earlier success is visible through status as `jobState: error` and `lastError` while prior `lastSuccessfulSyncAt` is still present | REQ-007, REQ-010; AC-007; design DR-002 resolution | Add assertion in `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` | Provides API status evidence for the UI precedence rule and guards against losing durable error state. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-E2E-004 | `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-api.e2e.test.ts` old connection-test input | Replace old input with explicit mode and add saved/draft coverage described above | REQ-004/REQ-005; AC-002/AC-003/AC-015 | Static grep found stale old input at line 195 before edits. |
| API-E2E-005 | `autobyteus-server-ts/tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts` old connection-test input | Replace old input with `mode: SAVED` after source config is persisted | REQ-004; AC-002; realistic process boundary | Static grep found stale old input at line 295 before edits. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001 | Static grep after edits for old `testMemoryHubConnection` object shape in tests/source | Confirms no old plaintext-token-only durable caller remains in changed API/E2E scope | One-off cleanup audit; the durable coverage is the updated tests themselves. |
| TEMP-002 | `git diff --check` | Confirms durable coverage edits have no whitespace/errors | Repository hygiene check only. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full browser-driven Nodes → Memory Sync click flow | Existing repository has focused component coverage for the card and backend API/multiprocess E2E for the service boundaries; adding a browser harness would be disproportionate to this ticket and duplicate stable component assertions. | Low: UI state logic is component-tested and API behavior is E2E-tested. | None for this ticket unless execution reveals component/API mismatch. |
| Low-frequency background run visibly observed live between polls | Design accepts that fast background jobs can be missed between 30s polls; component coverage proves status updates preserve form values and show running when status is `running`; unit coverage proves background/manual coalescing. | Low/accepted residual risk. | None; deeper realtime/background observability was out of scope. |
| Stale `running` recovery after process crash | Explicitly accepted residual risk in requirements/design. | UI may show `syncing…` until later correction. | No API/E2E escalation; out of scope. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None identified before coverage edits | N/A | Upstream artifacts explicitly decide saved/draft modes, polling preservation, and latest-error precedence. Legacy/compatibility removal check is clean. | N/A |

## Execution Plan

1. Update durable API/E2E callers of `testMemoryHubConnection` to explicit `SAVED`/`DRAFT` modes.
2. Add API E2E assertions for saved-mode persisted-config behavior with poisoned draft fields and latest-error status after prior success.
3. Run static grep for stale old input shape.
4. Run focused executable checks:
   - `git diff --check`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/memory-sync/memory-sync-local-fixes.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory-sync/memory-sync-api.e2e.test.ts`
   - `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/memory-sync/memory-sync-multiprocess.e2e.test.ts`
   - `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/MemorySyncCard.spec.ts`
   - `pnpm -C autobyteus-web audit:localization-literals`
   - `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
5. Write the canonical execution coverage report.
6. Because repository-resident durable coverage will be updated after the earlier code review, route the cumulative package back to `code_reviewer` for narrow coverage-code re-review before delivery.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable API/E2E tests are stale only in input shape and need explicit saved/draft coverage updates; no requirement/design ambiguity or implementation local-fix reroute was found during investigation.

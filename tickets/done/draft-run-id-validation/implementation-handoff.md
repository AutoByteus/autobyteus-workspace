# Implementation Handoff — draft-run-id-validation

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review was selected (Small/High) and passed in round 2 (ARCH-REV-002). Routing comes from `get_handoff_rules`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/requirements-doc.md` (Approved, REQ-001..009, AC-001..009)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/design-spec.md` (SR-003)
- Supplemental task artifacts: none behavior-defining. The prior handover and the OBS-001 report are evidence only.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial).

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/draft-run-id-validation/tickets/in-progress/draft-run-id-validation/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review, API/E2E and delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Summary:

- **D1:** `draftRunId`, `teamDraftId` and `agent_final.runId` use `safeIdentity`, so every owner ID field of every kind now follows one rule. `memberAddress` keeps `assertAgentTeamAddress`.
- **D2:** stored filenames must match `^[A-Za-z0-9._-]+$`, must not be dot-only, and must not contain `..`. Nothing is trimmed.
- **D3:** the layout's `resolveSafeChildPath` throws `ContextFilePathContainmentError`, a subclass of `ContextFileDescriptorError`, so a containment failure maps to 400 with `detail` on every route.
- **D4:** `GET /rest/runs/:runId/context-files/:storedFilename` maps `ContextFileDescriptorError` to 400 with `detail`.
- **D5:** a new `assertExactFields` helper makes `agent_draft` and `team_member_draft` reject unknown fields. The existing Org, collaboration and Team-final exact-field checks now use the same helper, with byte-identical messages.
- **Removals:**
  - `required()`.
  - The dead server exports `getStoredFilenameFromLocator` and `getDisplayNameFromStoredFilename`, and their unit-test assertions. The web keeps its own separate functions.
  - The probe's `observeOnly` rows and its `'observe'` fallback.
- **Deviation from the file mapping (in-owner, for REQ-004/AC-005):**
  - `ContextFileLocalPathResolver` previously built the `agent_final` owner without the codec. It also called `parseFinalContextFileOwnerDescriptor` for the Team, Org and collaboration final branches outside any try. A malformed final locator such as `/rest/team-runs/%2E%2E/agent-runs/x/context-files/f` therefore threw out of `resolve()` into the provider-input normalizer instead of being unresolved.
  - Now all four final branches pass the raw owner into `resolveExistingFinalPath`, which parses through the codec inside its existing catch and returns `null`.
  - This keeps DS-002 ("resolver → codec → throws → caught → null") true. It changes only the resolver, adds no new mechanism, and leaves valid locators unchanged.
- **Baseline fix, in its own commit (TESTING.md Rule 9):**
  - `tests/unit/agent-execution/backends/antigravity/agy-configured-skill-linker.test.ts` failed after the sibling `autobyteus-agents` repo commit 1acc451 (2026-10-10). That commit moved the Solution Designer's shared `design-examples.md` and `design-principles.md` symlinks into `references/`.
  - The test now reads `references/<name>`. Its intent, that linked shared references stay readable through the capsule, is unchanged.

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk".
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 4 server source files changed (the codec, layout, REST mapping and resolver), each by a small delta. This is a security trust-boundary change.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. No legitimate ID or stored filename failed the new rules, and the migration suites that use `assertStoredFilename` pass in the unit run.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001/002 | Traversal `draftRunId`/`teamDraftId` on draft GET/DELETE → 400 + detail, nothing touched | `/drafts/*` → `parseDraftContextFileLocator` → `safeIdentity` throws → `sendDraftRouteError` 400 | Done: integration over raw HTTP (snapshot of every file unchanged) and probe CF-001 (sentinels intact) |
| BEH-003/004 | Upload/finalize with a traversal or extra-field owner → 400, nothing written or moved | `parseDraftContextFileOwnerDescriptor` throws → existing route catch → 400 | Done (integration, file snapshot unchanged) |
| BEH-005 | Agent-final malformed `runId`/filename → 400 + detail | `parseFinalContextFileOwnerDescriptor`/`assertStoredFilename` → D4 mapping | Done (integration over raw HTTP; probe GET row) |
| BEH-006 | Malformed locator unresolved for the runtime | Resolver → codec (draft + all final kinds) → caught → `null` | Done (unit with stub + integration with real layout) |
| BEH-007 | Org/collab/Team-final validation unchanged | Same rule, shared helper | Preserved (existing tests pass) |
| BEH-008 | Bad stored filename (`%00`, space, `:`, `.`, `%2E`) → 400 | `filename()` allowlist | Done |
| SCN-004 / REQ-005 | All legitimate ID formats unchanged | — | Done: unit for every kind/field; integration upload → GET → DELETE for `<slug>_<32hex>`, `temp-…`, `temp-chat-…`, `team-draft-<uuid>`; finalize with a `<slug>_<32hex>` run ID |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/context-files/domain/context-file-owner-types.ts`
- `autobyteus-server-ts/src/context-files/store/context-file-layout.ts`
- `autobyteus-server-ts/src/api/rest/context-files.ts` (agent-final mapping)
- `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` (in-owner fix above)
- Tests:
  - `tests/unit/context-files/context-file-owner-types.test.ts`: per kind/field legitimate and rejected IDs, extra fields, `memberAddress`, the filename allowlist, and the error subclass.
  - `tests/unit/context-files/context-file-layout.test.ts`
  - `tests/unit/context-files/context-file-local-path-resolver.test.ts`
  - `tests/integration/api/rest/draft-context-files-universal.integration.test.ts`: raw-HTTP traversal/dot-only cases with a whole-tree file snapshot, upload/finalize rejection, legitimate formats, and the runtime resolver with the real layout.
  - `tests/integration/api/rest/context-files.integration.test.ts`: agent-final 400 cases and a legitimate run ID.
- `autobyteus-web/tests/e2e/composer-context-file-removal-probe.mjs`: CF-001 rows graded; added `team-runs`, `/rest/runs/` (GET only, because final files have no DELETE route) and dot-only `%2E` rows; a keeper draft in an existing owner folder; all sentinels asserted.
- `TESTING.md`: CF-001 description.
- Baseline fix: `autobyteus-server-ts/tests/unit/agent-execution/backends/antigravity/agy-configured-skill-linker.test.ts`.

## Important Assumptions

- Unknown third-party clients sending untrimmed IDs or extra descriptor fields would now receive 400. No such client exists in the repo (design Risks).
- `agent_final` descriptors still accept unknown extra fields, because REQ-009 covers only the two draft kinds. I tested and kept it unchanged rather than widening scope.

## Known Risks

- Status codes change for malformed input only: untrimmed IDs (accepted → 400), traversal IDs (200/204/500 → 400), agent-final invalid filename (500 → 400), agent-final traversal `runId` (404 → 400).
- `app.inject` and WHATWG URL clients collapse `%2E`/`%2E%2E` segments before routing. The integration tests therefore send those paths over a real socket with `node:http`, as the probe does.
- From the review: on Windows, drive-designator IDs (for example `D:`) are caught only by the containment guard, which now returns 400. TTL cleanup runs before a guard trip. PB-001 is a pre-existing exception.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix (security hardening)
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`, plus the in-owner resolver fix noted above.
- If challenged, routed as `Design Impact`: `N/A`. The resolver fix restores the design's stated DS-002 path inside the same owner; it is not a design change.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`. Trim-and-accept is removed.
- Dead code in the touched files and modules removed: `Yes`. Removed `required()`, the two dead exports, the probe `observeOnly`/`'observe'` fallback, and the resolver's now-unused type import.
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`. One exact-fields helper replaces three copies.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (codec 182, resolver 158, REST 230 effective lines; all deltas small).

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Implementation follows it: `Yes`. Locator strings and layout are unchanged. Generated names (`ctx_<12hex>__<stem>.<ext>`) pass the allowlist. The migration suites that use `assertStoredFilename` pass in the server unit run.
- Deviation: `None`

## Environment Or Dependency Notes

- Fresh worktree: `pnpm install`, `pnpm -C autobyteus-server-ts prebuild`, `test:integration:prepare` (which also built `dist/` for the probe), and `pnpm -C autobyteus-web exec nuxi prepare`. Untracked `*/dist/` build outputs are not staged.

## Local Implementation Checks Run

- `pnpm -C autobyteus-server-ts typecheck`: pass.
- `pnpm -C autobyteus-server-ts test:unit`: 668 files pass, 4 skipped.
  - The 1 failure, `agy-configured-skill-linker.test.ts`, is unrelated: it was caused by the `autobyteus-agents` file move.
  - Fixed in a separate baseline commit; that file now passes (12/12).
  - The migration suites pass.
- `pnpm -C autobyteus-server-ts test:integration`: 71 files pass, 18 skipped. The 1 failing file is `agent-status-websocket.integration.test.ts` (2 cases), the accepted pre-existing PB-001 exception.
- Targeted runs: `tests/unit/context-files` 127/127; `draft-context-files-universal.integration.test.ts` 16/16; `context-files.integration.test.ts` 12/12.
- Detection check: with the source changes stashed, 7 of the 16 universal integration tests fail. This includes the cross-owner `DELETE ..%2Fagent-runs%2Fvictim` → 204, the original bug.
- API/E2E probe CF-001 (`pnpm -C autobyteus-web test:e2e:composer-context-file-removal --output-dir /tmp/drv-probe-cf001 --cases CF-001`, against the freshly built backend): **Pass**.
  - Every traversal and dot-only row returns 400 with a specific `detail`, for example `draftRunId must be a safe non-empty identity.`, `teamDraftId …`, `runId …` and `storedFilename is invalid.`
  - Sentinels intact: draft-root level, app data, other owner, and the owner's own keeper draft.
  - The probe cleaned up: the data root was removed and its processes terminated.
  - The first run flagged only my own row error: a DELETE on `/rest/runs/…`, which has no route and correctly returned 404. I fixed the row to GET only.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: server-side validation only. No rendered UI changed, and the web source is untouched apart from the probe script.

## Downstream Coverage Hints / Suggested Scenarios

- Re-run CF-001 plus the composer journeys CF-002..CF-009 to confirm that attach, preview, remove and send are unchanged for every run kind (REQ-005, SCN-004).
- Over real HTTP: upload and finalize with traversal and extra-field owners (400; nothing written or moved); agent-final traversal `runId` and invalid filenames.
- Runtime: a message whose content contains a traversal draft or final locator is passed to the provider unresolved, and the turn does not fail.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Full composer probe (all CF cases) and broader API/E2E validation against the built backend.

# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Qwen UI/interaction spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`
- Supplemental readable-ID transition spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/custom-provider-readable-id-migration-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Triggering integrated source-review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`
- Code-review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-revision-record.md` (`CRR-015`; `CRR-012` and `CRR-014` are pre-integration context)
- CRR-015 restrictive-umask reproduction: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/probes/code-review/app-config-mode-umask-crr-015.log`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-coverage-investigation.md`
- API/E2E execution report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-revision-record.md` (`API-REV-007`)
- API/E2E durable-test review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-test-review-report.md`
- Triggering delivery revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/delivery-revision-record.md` (`DR-006`)
- Triggering tracked-base refresh/conflict evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/delivery-integrated-state-refresh.log`
- Delivery-state artifacts retained for the later restart: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/docs-sync-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/handoff-summary.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/release-deployment-report.md`, and `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-report.md`.

`CRR-015` is the current implementation trigger and its sole source finding is addressed by IR-012. `CRR-012`, `API-REV-007`, and `CRR-014` are valid evidence for checkpoint `7ea8a728420d584218aaf141af754145fa7a5329`, but they do not authorize the conflict-resolved merge plus current local fix. The older `DR-005` v1.4.45 Electron package remains explicitly stale and must not be relabeled as current.

## Current Implementation Summary

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/implementation-revision-record.md`
- Current implementation revision ID: `IR-012`
- Related solution revision IDs: `SR-010`–`SR-012`, `SR-016`; `SR-013`–`SR-015` are superseded for the readable-identity transition.
- Related architecture-review revision IDs: `ARCH-REV-010`; `ARCH-REV-009` is superseded.
- Related code-review revision IDs: `CRR-015` (`Fail — Local Fix`, `CR-005`); fresh source re-review of `IR-012` is required. `CRR-012` source Pass and `CRR-014` durable-test Pass apply only to the pre-integration checkpoint.
- Related API/E2E revision IDs: `API-REV-007` Pass at 96.4% on the pre-integration checkpoint; applicable integrated-state validation is required only after fresh source review passes.
- Related delivery revision IDs: `DR-006` (`Local Fix`), still blocked pending source and applicable integrated API/E2E gates.
- Triggering finding IDs: `CR-005`, `PREM-QWEN-004`; `CR-004` / `PREM-CPMIG-005` remain resolved in the unchanged readable migration.
- Recorded current base: `origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117`.
- Integrated merge commit: `ea8dbfd2d4f78312806bee7a41f38daa6a0e9a06`, with parents `7ea8a728420d584218aaf141af754145fa7a5329` and `3cddeec6b93602da172fec2e7b9a80acc7c05117`.
- IR-012 current worktree delta: descriptor-level exact mode application plus its POSIX restrictive-umask regression; current code and this handoff are authoritative.
- Divergence at handoff: ahead `13`, behind `0` relative to the recorded remote base; no new base refresh or merge was performed for IR-012.

IR-012 corrects the one CRR-015 durability defect: `openSync("wx", mode)` remains the exclusive same-directory creation step, then `fchmodSync(descriptor, mode)` explicitly applies the existing permission bits independently of process umask before the existing write/fsync/close/atomic-rename sequence. Under existing mode `0660` and umask `0077`, both the focused AppConfig path and direct built-helper probe now commit `0660`. A pre-commit failure still closes/unlinks the temporary file, AppConfig still sanitizes the error, and runtime state is still published only after rename. No generalized transaction or recovery machinery was added.

IR-011's current-base reconciliation remains otherwise unchanged: initialization discards only exact `AUTOBYTEUS_STREAM_PARSER`; normal and durable writes reject its reintroduction; suffix and unrelated settings remain intact; failed persisted cleanup leaves the retired runtime value inert; and normal upsert/removal plus durable replacement share current-base line transforms.

The current source preserves the reviewed `SR-010`–`SR-012` exact-custom/native-Qwen behavior and implements the `SR-016` readable identity replacement. New custom-provider IDs are deterministic derivatives of the canonical provider name and are committed under store-owned name/ID uniqueness. Current runtime/store parsing is strict V3 only.

For upgrades, the historical V1 migration stages secretless V2. The final readable migration checks five exact terminal prerequisites, reads legacy V2 names only inside the migration boundary, derives a transient old-ID/future-ID selector map, attempts only the approved JSON and application-SQLite selector fields, and publishes strict `{ "version": 3, "providers": [] }` last. It separately retains every trusted strict-V2 old provider ID for post-commit cleanup, so slug/built-in/non-derivable mapping failure still produces no selector map but does not skip best-effort old-key removal. It never resolves, copies, re-encrypts, or saves a legacy secret. Invalid/untrusted files still have no cleanup identity. The user recreates a desired provider through the unchanged add-custom-provider flow by re-entering name, Base URL, and key.

Unavailable selector strings remain authoritative persisted values. The application-agent launch editor now displays the raw unavailable value and blocks entry rather than clearing it. Same-name recreation plus the same advertised model suffix makes the migrated selector usable again; a different name or missing suffix requires explicit reselection. No runtime fallback or UUID alias exists.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| `BEH-001` | Preserve recognized advertised custom-model metadata and discovery resilience. | Core OpenAI-compatible discovery/provider and exact metadata resolver. | Positive advertised fields remain highest priority; URL/key validation, duplicate handling, timeouts, and last-known-good behavior remain intact. |
| `BEH-002` | Remove endpoint/region/plan/profile/alias policy; infer only by exact built-in `value`. | `autobyteus-ts/src/llm/metadata/` and `openai-compatible-endpoint-provider.ts`. | No URL/profile matching, aliases, references, `endpoint_profile`, fuzzy matching, or preview compatibility remains. |
| `BEH-003` | Preserve resolved metadata and truthful known/unknown provenance through runtime/catalog/budget/UI. | Core model types -> server metadata provisioning -> existing token budget/compaction/Token Meter paths. | Reduced `live | inferred_builtin | static_definition | unknown` provenance is preserved. Token history identity is not rewritten. |
| `BEH-004` | Save Qwen Base URL/key as one strict pair with bounded compensation and truthful errors. | Server `LlmProviderService` -> secret vault + `AppConfig.setDurably` -> GraphQL -> web Settings runtime/store. | Probe, prior command-scoped snapshot, key save, atomic durable URL commit, prior-key restore/new-key removal on pre-commit failure, sanitized previous-restored failure, and repair-required double-failure remain implemented. The durable helper explicitly reapplies existing permission bits after exclusive creation so restrictive umask cannot narrow the committed file. |
| `BEH-005` | Expose exact native Qwen offerings and remove preview behavior. | `autobyteus-ts/src/llm/qwen-supported-model-definitions.ts`. | Exact values include `qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2`; collisions use only `modelIdentifierOverride`. |
| `BEH-006` | Preserve key-only default use and expose Qwen-only setup status. | Qwen config/runtime, server status command/GraphQL, web store/form/reload lifecycle. | `{effectiveBaseUrl, endpointSource, apiKeyConfigured}` derives source from normalized setting presence. Successful mutation status is authoritative; later view refresh failure is a warning and Reload Models retries both required refreshes. Exact retired-setting discard cannot become a configured Qwen URL source. |
| `BEH-007` | Use readable custom IDs; reset legacy providers/credentials while preserving exact active/default/resumable selector intent; retain unavailable selectors. | Core identity/V3 schema -> server store/create flow; V1/name-snapshot/readable migration adapters -> registry/startup gate; application launch editor. | Exact `provider_<name-derived-body>` identity, atomic store invariant, secretless V1, transient V2 mapping, allowlisted selector rewrites, empty V3 last, cleanup identities independent of mapping success, removal-only cleanup, ordinary retry semantics, and explicit unavailable-selector blocking are implemented. |

## Key Files Or Areas

### Readable identity and current runtime

- `autobyteus-ts/src/llm/custom-llm-provider-identity.ts`: canonical-name normalization and deterministic ASCII-safe readable ID codec.
- `autobyteus-ts/src/llm/custom-llm-provider-config.ts`: strict V3 schema, exact derived-ID invariant, and duplicate canonical-name/ID rejection.
- `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts`: store-lock-owned create uniqueness and V3 persistence.
- `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts`: existing probe/create/secret/reload spine using store-returned readable identity.

### Isolated legacy transition

- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-v1-app-data-migration.ts`: secretless V1 -> V2 stage and reconfiguration warning.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-v1-migration-file.ts`: durable stage publication including parent-directory fsync.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-migration-name-snapshot.ts`: migration-only strict missing/V2/V3 `{id,name}` reader.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-readable-id-prerequisite-guard.ts`: the exact five terminal prerequisites.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-readable-id-json-selector-migrator.ts`: exact JSON inventory and per-target atomic rewrite.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-readable-id-application-selector-migrator.ts`: one transaction per application SQLite database.
- `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-readable-id-app-data-migration.ts`: independent strict-V2 selector-map and cleanup-ID projections, selector attempts, empty-V3 commit, and post-commit removal-only cleanup.
- `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`: readable migration registered as the final current required definition.
- `autobyteus-server-ts/src/server-runtime.ts`: thin post-`runPending` terminal gate.

### Missing-selector interaction

- `autobyteus-web/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue`: raw unavailable selector retention and blocking readiness.
- `autobyteus-web/localization/messages/en/applications.ts` and `zh-CN/applications.ts`: explicit same-name recreation/reselection guidance.
- `autobyteus-web/components/applications/setup/__tests__/ApplicationAgentLaunchProfileEditor.spec.ts`: retain/block then recover-on-available regression.

### Retained exact-Qwen/exact-metadata implementation

- Core metadata resolver, Qwen provider config/runtime, supported definitions, server strict AppConfig/provider service/GraphQL, and web Qwen Settings/store/runtime paths remain the current `SR-010`–`SR-012` implementation.

### Current-base AppConfig integration

- `autobyteus-server-ts/src/config/app-config.ts`: single runtime/persistence owner for normal and durable settings, exact retired-setting discard/rejection, strict sensitive-setting guards, and runtime publication after durable commit.
- `autobyteus-server-ts/src/config/app-config-setting-policy.ts`: bounded policy inventory for generic secret settings and the exact retired setting, extracted to keep AppConfig below the source-size guardrail.
- `autobyteus-server-ts/src/config/environment-assignment-lines.ts`: current-base line-preserving upsert/removal transforms.
- `autobyteus-server-ts/src/config/environment-assignment-file.ts`: normal and durable filesystem operations using the shared transforms; durable replacement retains same-directory temp/fsync/rename semantics and applies the existing permission bits explicitly to the open descriptor.
- `autobyteus-server-ts/tests/unit/config/app-config.test.ts`: combined exact retirement, failure/permission, sensitive-boundary, Qwen durability, initialization, and restrictive-umask mode-preservation coverage.

## Important Assumptions

- The browser continues to submit only custom provider name, Base URL, and key; the backend derives the immutable ID.
- Canonical name or deterministic slug collisions reject rather than acquire random/hash/counter suffixes.
- A migrated selector is restored only by the same canonical provider name and the same exact advertised model suffix.
- Missing/unavailable selectors are valid stored strings but are not executable models; existing factory/activation failure remains authoritative with no fallback.
- V3 provider data is the only normal runtime/store schema. Historical V1/V2 knowledge is confined to app-data migration owners.
- `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` are terminal both for prerequisites and the readable startup gate.
- One native Qwen endpoint remains active per installation; existing Qwen keys and optional URL state need no migration.

## Known Risks

- IR-011 integrated `origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117` and was ahead `13` / behind `0` at handoff, but the remote can advance again. Delivery must still perform its mandatory fresh tracked-base fetch after source review and applicable integrated API/E2E gates. No push, archival, final target merge, release, or cleanup was performed.
- Pre-integration `CRR-012`, `API-REV-007`, and `CRR-014` cannot be treated as review or executable authorization for merge commit `ea8dbfd2d4f78312806bee7a41f38daa6a0e9a06` plus the IR-012 fix. `CRR-015` is a failure report, not approval; fresh source re-review is required.
- Ordinary runner semantics can keep an interrupted recent `RUNNING` record non-retryable for approximately 15 minutes; immediate crash recovery is intentionally removed.
- A crash or cleanup failure after empty-V3 publication can leave an old secret orphan. It is unreachable from strict V3/runtime and there is no fallback lookup.
- Malformed, read-only, concurrently changed, unsafe, or otherwise unwritable selector targets are skipped with warnings and remain stale for manual reselection.
- Recreation succeeds only when the endpoint still advertises the exact suffix; removed offerings require manual reselection.
- Real Alibaba availability, credentials, quota, region policy, TLS behavior, and undocumented payload variation were not exercised. Vendor facts remain source-dated.
- Repository-wide Nuxt typecheck is already broadly baseline-blocked outside this change; production build and focused changed-path tests are green.

## Task Design Health Assessment Implementation Check

- IR-012 change posture: `Bug Fix / Local Fix`
- IR-012 root-cause classification: `Local Implementation Defect`; the file-mechanics owner read the correct mode but relied on a creation call whose POSIX semantics allow umask to narrow it.
- IR-012 refactor decision: `No additional refactor needed`; one descriptor-level permission application fulfills the existing contract inside the correct owner.
- Implementation matched the reviewed cumulative assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: AppConfig remains the authoritative setting/runtime boundary; the file owner owns exclusive creation, exact mode application, write/fsync, rename, and cleanup. No caller bypass or second transaction owner was introduced. The exact retired-setting inventory, generic-secret inventory, name/ID policy, migration isolation, selector adapters, and ordinary provider recreation remain unchanged.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` in normal runtime. The approved historical migration ID and isolated V1/V2 migration readers are transition code, not a runtime compatibility path.
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, files, helpers, tests, flags, adapters, and dormant replaced paths removed in scope: `Yes` — SR-015 journal/state/backup/receipt/secret-migrator/startup-recovery/PID-recovery/runner-bypass code and crash-specific tests were removed.
- Shared structures remain tight: `Yes` — no credential-state record, generalized provider identity object, reconnect DTO, offering/route attributes, runtime alias, or transaction/recovery framework was added.
- Canonical shared design guidance was reapplied: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` — `app-config.ts` is `496`, `app-config-setting-policy.ts` is `11`, and `environment-assignment-file.ts` is `62` effective non-empty lines. Migration concerns remain split into prerequisite, JSON, application-SQLite, name-snapshot, and coordinator owners.
- Notes: Current provider services/stores are V3-only. Migration-local readers/adapters are the sole historical-schema boundary.

## Persisted Data Transition Check

- Approved decisions:
  - Qwen key/optional URL: `Directly Usable — No Migration`.
  - Valid legacy provider records/Base URLs and credentials: `Discard or Rebuild` through empty V3 plus ordinary recreation.
  - Exact structured active/default/resumable selectors: `Migration Required` to readable prefixes.
  - Invalid/ambiguous legacy providers: `Discard or Rebuild` to empty V3 with no selector map.
  - Historical traces/token identities/accounting and model-free indexes: `Directly Usable — No Rewrite`.
- Design-spec decision reference: `design-spec.md` “Persisted Data / State Transition Decision” and `custom-provider-readable-id-migration-spec.md` “Persisted-Data Decisions”, “Exact Ordering Boundary”, and “Optimistic Execution And Startup Gate”.
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Discard/rebuild result: V1 publishes secretless V2; readable migration publishes strict empty V3 only after all selector attempts; ordinary create recreates a provider/secret later.
- Migration implementation and focused checks: Exact five-prerequisite guard; strict missing/V2/V3 classification; exact mapping; JSON temp-write/fsync/rename; SQLite transaction per database; provider identity/current-byte check; empty-V3 temp-write/fsync/rename/directory-fsync; post-commit removal-only cleanup; retry/idempotency, malformed/read-only/concurrent-change, publication failure, cleanup warning, and startup gate tests.
- Deviation from reviewed transition decision: `None`

## Environment Or Dependency Notes

- No dependency was added.
- Core/server/web workspace dependencies were already installed.
- Server build regenerated the existing Prisma client as part of the supported build.
- Normal root `pnpm dev` was used only for the frontend implementation feedback loop; the server shut down cleanly afterward. The temporary preview page was deleted before final checks and is not product source.
- Implementation reconciled only the DR-006 recorded base and produced the reviewed-state candidate merge. Delivery retains the mandatory later fresh fetch, final integrated-state check, docs sync, Electron packaging, and repository finalization ownership.

## Local Implementation Checks Run

These are implementation-scoped checks, not API/E2E sign-off.

- IR-012 focused AppConfig regression: `1 file / 27 tests` — passed. The new POSIX test sets the existing `.env` mode to `0660`, changes process umask to `0077`, invokes the real `AppConfig.setDurably` path, proves the committed mode remains `0660`, and restores the previous umask in `finally`.
- IR-012 integrated server build: `pnpm --dir autobyteus-server-ts build` — passed, including shared core/contracts/backend builds, Prisma generation, server TypeScript, managed assets, and sanitized built/bootstrap smoke.
- IR-012 direct built-helper probe: existing mode `0660` plus umask `0077` produced committed mode `0660`, updated `QWEN_BASE_URL`, and no `.tmp` file.
- DR-006 merge execution: `git merge --no-edit origin/personal` was resolved and committed as `ea8dbfd2d4f78312806bee7a41f38daa6a0e9a06`; its parents are the protected reviewed checkpoint `7ea8a728420d584218aaf141af754145fa7a5329` and recorded base `3cddeec6b93602da172fec2e7b9a80acc7c05117`. Branch divergence was ahead `13` / behind `0`; no unmerged path remained.
- IR-011 focused AppConfig baseline before the CRR-015 correction: `1 file / 26 tests` — passed but used ambient umask and therefore did not close `PREM-QWEN-004`; it is retained only as merge context.
- IR-011 integrated server selection: `8 files / 123 passed / 1 intentionally skipped` — passed. Files covered AppConfig, application database location, provider service/settings/GraphQL, readable migration/prerequisites, and the post-migration startup gate.
- IR-011 integrated server build: `pnpm --dir autobyteus-server-ts build` — passed, including shared core/contracts/backend builds, Prisma generation, server TypeScript, managed assets, and sanitized built/bootstrap smoke.
- Merge/source hygiene before the commit: `git diff --cached --check` passed. The resolved code was committed only after no unmerged path remained.
- Final handoff hygiene: current `git diff --check` passed; no unmerged path or conflict marker exists in the current fix/artifact files; source sizes are AppConfig `496`, setting policy `11`, assignment file `62`, and assignment lines `35` effective non-empty lines; the source/test delta is `22` insertions across two files; IR-012/CRR-015/CR-005 artifact anchors are present.
- Pre-integration implementation checks from IR-010 remain documented in that revision entry, and downstream evidence is retained in `API-REV-007` / `CRR-014`; neither is represented as fresh proof of this merge.

Expected non-failing local output included Node's experimental SQLite warning, ordinary AppConfig initialization logs, and one intentional Windows-path skip on the current non-Windows host.

## Frontend Rendered-Result Check

- IR-012 applicability: `Not Applicable` — this correction changes backend environment-file permission application and its unit test only. No rendered frontend or user interaction changed.
- Current cumulative frontend state: the IR-009 rendered interaction check below remains implementation context for the unchanged missing-selector behavior; it is not new IR-011 executable authorization.
- Affected surfaces / journeys: Application agent launch-profile editor loading an exact saved selector absent from the current model catalog, then selecting an available model.
- Approved references: `BEH-007`, `REQ-015`, `AC-019`, the missing-selector lifecycle in `design-spec.md`, and `custom-provider-readable-id-migration-spec.md`.
- Existing design system/shared components reviewed: the existing runtime select, `SearchableGroupedSelect`, workspace selector, readiness output, amber warning treatment, spacing, typography, and adjacent application setup behavior.
- Project instructions/rendered surface: read `autobyteus-web/README.md`; used the normal root `pnpm dev` stack and the real `ApplicationAgentLaunchProfileEditor` on a temporary development-only preview route. The preview file was removed afterward.
- States/interactions inspected:
  - Saved missing selector `openai-compatible:provider_alibaba_cloud_token_plan:deepseek-v4-flash-0731` remained visible, emitted no clearing update, showed explicit amber guidance, and produced `Blocked` readiness.
  - Opened the actual grouped model selector and chose `OpenAI / gpt-5.4`; the warning disappeared and readiness became `Ready` with no blocking issue.
  - Desktop browser viewport reported no horizontal overflow (`scrollWidth === clientWidth === 947`).
  - A 390 px narrow-container simulation preserved truncation, wrapping, card hierarchy, workspace controls, and readable blocking guidance without visually clipped controls.
- Visual or interaction issues found and corrected: The pre-change editor silently cleared an unavailable selector. It now retains and blocks. The new long-selector fixture was explicitly typed after the broad typecheck exposed literal widening.
- Supporting evidence:
  - Missing/blocked desktop: `/Users/normy/.autobyteus/browser-artifacts/4988cf-1786273569218.png`
  - Available/ready desktop: `/Users/normy/.autobyteus/browser-artifacts/4988cf-1786273701342.png`
  - Missing/blocked narrow-container: `/Users/normy/.autobyteus/browser-artifacts/4988cf-1786273727415.png`
- Remaining unverified states / limitations: This is implementation self-validation, not independent browser/API/E2E sign-off. Team editor, bindings, resume, and same-name recreation need downstream executable validation against durable fixtures.

## Downstream Coverage Hints / Suggested Scenarios

- Treat `API-REV-007` as pre-integration evidence. Refresh the coverage investigation for merge commit `ea8dbfd2d4f78312806bee7a41f38daa6a0e9a06` and decide which current durable cases remain valid before integrated execution or coverage edits.
- Revalidate the integrated AppConfig intersection directly: exact `AUTOBYTEUS_STREAM_PARSER` is removed at initialization and cannot return through either `set()` or `setDurably()`; suffix/unrelated keys survive; read-only cleanup stays runtime-inert; current-base line endings/exported assignments remain correct; an existing broader `.env` mode survives restrictive service umask; and Qwen's durable failure still leaves runtime/file state uncommitted for server compensation.
- Exercise a direct multi-version fixture with the exact five prerequisites, including token provider-name snapshot before empty-V3 reset and current selector-writer output surviving the final migration.
- Validate V1 inline-secret disposal and V2 old-secret non-resolution: no status/resolve/save/copy/re-encryption call, no readable secret, and removal attempts only after empty V3. Include slug collision, built-in-name conflict, and non-derivable-name cases to prove every trusted strict-V2 old ID is cleaned independently of selector-map success while invalid/untrusted files are not.
- Cover every exact JSON and application-SQLite selector shape with byte-identical suffix preservation; prove excluded traces/free text/token identifiers/history indexes are unchanged.
- Cover malformed, read-only, symlink/unsafe, concurrently changed, publication-failure, cleanup-failure, pre-V3 ordinary retry, post-V3 no-op, prerequisite failure, and recent/stale `RUNNING` behavior without any special runner bypass.
- Verify the unchanged frontend/API create flow: bad name/URL/key pair creates no provider/secret; valid same-name recreation creates the exact readable ID, reloads models, and restores migrated selectors when the suffix exists.
- Verify unavailable defaults, bindings, applications, agent/team resume metadata, and improver session selectors remain raw-visible and fail without fallback; different-name recreation or absent suffix requires manual reselection.
- Revalidate retained native-Qwen exact catalog/runtime/status/durability and Settings refresh recovery, especially exact `deepseek-v4-flash-0731` identity/wire value and the strict AppConfig/secret compensation boundary.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Fresh source re-review of IR-012 must pass first. Then `api_e2e_engineer` must refresh the coverage investigation for the integrated merge plus correction, decide which prior durable coverage remains valid or stale, execute the applicable API/E2E/broader checks, and record evidence and residual risk. If durable repository coverage is added, updated, or removed, the cumulative package must return through `code_reviewer` before delivery. Delivery must then restart from another mandatory fresh tracked-base fetch before documentation, current Electron packaging, final handoff, or repository finalization.

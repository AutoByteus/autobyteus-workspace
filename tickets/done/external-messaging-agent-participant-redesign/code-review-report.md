# Code Review Report — Remove External Messaging From The Main Product

## Review Round Meta

- Review Entry Point (latest round 4, CRR-004): `Implementation Review`, a narrow re-review after the implementation-owned fix for CR-002.
  - Trigger: `/implementation_engineer` IR-003, commit `40f769e0d`, which amends `e9bbb28ab`.
  - Relevant implementation revision IDs: `IR-001` to `IR-003`. Relevant API/E2E revision IDs: `API-REV-001`.
  - Prior round reviewed: 3 (CRR-003, failure-origin, `Fail` / `Local Fix`, CR-002).
- Round 3 (CRR-003) entry point: `API/E2E Failure-Origin Review`. Rounds 1–2 were `Implementation Review`, and their content below remains valid context.
- Round 3 trigger: `/api_e2e_engineer` API-REV-001 `Fail` on G-01, commit `e9bbb28ab`.
- Coverage Investigation Reviewed: `api-e2e-coverage-investigation.md`
- Execution Coverage Report Reviewed: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed: `api-e2e-revision-record.md`
- Relevant API/E2E Revision IDs: `API-REV-001`
- Failing Scenario IDs: `G-01` (AC-120 / REQ-120 path level; REQ-101; no-legacy-retention policy)
- Exact Failing Commands / Execution Mode:
  - R-09 path gate: `git ls-files | grep` for the REQ-120 identifiers, outside the allowed set.
  - G-01 live probe: `node dist/app.js --host 127.0.0.1 --port 18771` with no `--data-dir`, a temporary `autobyteus-server-ts/.env`, and a scrubbed env, followed by `git status`.
- Failure Evidence Paths:
  - `api-e2e-evidence/G-01/default-data-dir-probe.txt`
  - `api-e2e-evidence/logs/G-01-default-data-dir-start.log`
  - `api-e2e-evidence/logs/R-09-req120-gate.log`
- Current Code Review Revision ID: `CRR-003` (round 3). The meta fields below record rounds 1–2.

- Review Entry Point (rounds 1–2): `Implementation Review`
- Requirements Doc Reviewed As Context: `requirements.md` (SR-013 content, Approved SR-014)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (AE-01–AE-22)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (SR-016, `Ready`)
- Supplemental Task Artifacts Reviewed As Context: `product-model-analysis.md` (approved supplement), `solution-handoff.md`
- Relevant Solution Revision IDs: `SR-014`, `SR-016`
- Design Review Report Reviewed As Context: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: `ARCH-REV-002`
- Implementation Handoff Reviewed As Context: `implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md`
- Relevant Implementation Revision IDs: `IR-001`, `IR-002`
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Current Review Round: `2`
- Trigger: `/implementation_engineer` completed IR-002, the Local Fix for CR-001. Commit `e9bbb28ab` amends `a1478259d` on base `40b1783f4`.
- Prior Review Round Reviewed: `1` (CRR-001, `Fail` / `Local Fix`, CR-001)
- Latest Authoritative Round: `2`
- Coverage Investigation / Execution Coverage / API-E2E Revision Record: `N/A — not applicable` (implementation review)
- Delivery Revision Record: `N/A — not applicable`
- Failing Scenario IDs / Commands / Evidence: `N/A — not applicable`

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. There are 503 files across 8 areas, including public API removal, a stream-contract change, data deletion plus DDL, release, workspace and lockfile changes, and startup-sequence edits. The classification is confirmed.

## Review Scope

- Round 4 (CRR-004):
  - Delta: `git diff --name-status e9bbb28ab 40f769e0d` = `D autobyteus-server-ts/external-channel/gateway-callback-outbox.json` only. No source, test, config or ignore-file change, so every rounds 1–2 check and its evidence remains valid.
  - Reviewer-run gates on `40f769e0d`:
    - Content gate: only the 4 allowed registry lines, L68–71.
    - Path gate (`git ls-files`, REQ-120 identifiers, case-insensitive, outside the allowed set): empty.
    - Broader path scan (`messaging|telegram|discord|whatsapp|wecom|wechat|gateway|outbox|channel`): only the unrelated MCP gateway, application backend/agent-tool/run-lifecycle gateways, and LLM/multimedia gateway routing.
  - The added-file set is still exactly the 6 designed additions. The change set is 440 files, +579/−32279.
- Round 3 (CRR-003, failure-origin):
  - Scope is limited to G-01. I confirmed that the failing scenario still represents approved behavior and classified the origin.
  - Inspected: the tracked file `autobyteus-server-ts/external-channel/gateway-callback-outbox.json`, its history (`76bd9107d`), `AppConfig` default data-dir resolution (`app-config.ts` L56–60), the server `.gitignore`, the server `README.md` L49, the API/E2E probe evidence, and the R-09 gate log.
  - No full source audit or scorecard is repeated. Only the affected finding and score rationale are updated.
- Round 2 (CRR-002):
  - Scope is limited to the CR-001 recheck. `git diff a1478259d e9bbb28ab` changes exactly 64 files, all deletions under the two SDK `dist/` folders. No source, test, config or doc differs, so every round-1 check and its evidence below remains valid for `e9bbb28ab`.
  - The current change set is `git diff 40b1783f4..e9bbb28ab -M`: 439 files, +579/−32275 (6 A, 225 D, 159 M, 49 R).
- Round 1 changed implementation and behavior reviewed: `git diff 40b1783f4..a1478259d -M` (70 A, 225 D, 159 M, 49 R).
  - Every modified or added source file was reviewed in full.
  - Wholesale deletions (`src/external-channel/**`, `src/managed-capabilities/**`, web messaging UI/stores/composables, `ui-prototypes/messaging-setup-assistant/**`) were checked for orphaned references rather than line by line.
- Files / areas reviewed:
  - Server startup and shutdown wiring, GraphQL/REST registration, route policy, `AppConfig`, config parsers, `store-utils`, streaming models and the team stream handler.
  - Both historical migration edits, the new cleanup migration, its registry entry, the new Prisma migration, and the build-script rename.
  - Contracts source and tracked `dist/`.
  - `autobyteus-ts` agent message and root export.
  - Web settings page, streaming projector/adapters/protocol, the localization audit script, and the generated GraphQL delta.
  - Gateway `package.json`, `vitest.config.ts`, and the import rewrites.
  - Workflows, release/termux/personal-docker scripts, Docker all-in-one, supervisor, compose, pnpm workspace, root `package.json`, and the lockfile.
  - Docs, the superseded-ticket moves, and every changed test.
- Explicit exclusions:
  - Gateway build and test behavior, per REQ-121: not validated.
  - Formal AC probes (AC-102, AC-103, AC-114, AC-116–AC-119, AC-121) are validation-stage obligations (N-3).

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. This is a clean-cut removal of external messaging from the main product (REQ-101–103). It adds a one-time data cleanup (REQ-114), removes release/packaging (REQ-117), provides a Settings fallback (REQ-118), and passes the identifier gate (REQ-120). The gateway self-contains its types (REQ-121). MCP/skills (REQ-116) and run history (REQ-119) are preserved.
- Design-spec behavior map verified against the implementation: Yes (table below).
- Design review report and round confirmed: ARCH-REV-002, round 2, Pass.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior: None.
  - DV-1 is a correct *preservation* of existing non-messaging behavior (AgentOrg history refresh on the user's own accepted `SEND_MESSAGE`). One removal-plan row misattributed it. It is not new behavior (see C-02).
- Remaining material ambiguity: None.

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting / Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-101 | Confirmed | `pages/settings.vue`: `'messaging'` removed from the type, `validSections`, nav, content and import. `normalizeSection()` returns null, so the default is `api-keys`. `settings.spec.ts` "keeps the default section for an unknown section query" passes. No leftover `settings.*messaging*` keys or `section=messaging` references. | — |
| BEH-102 | Confirmed | `rest/index.ts` no longer registers channel ingress. `schema.ts` drops both resolvers. `classifyHttpRoute` loses the `EXTERNAL_SIGNATURE` rule and allow-list entry, so old paths fall to the default family. `server-runtime.ts` has no binding or gateway restore. The signature middleware is deleted. | — |
| BEH-103 | Confirmed | Output and callback runtimes are no longer started (`server-runtime.ts`) or stopped (`build-studio-server.ts`). The shutdown chain order is otherwise preserved: API → event pipeline → host definitions → vault → Prisma. | — |
| BEH-106 | Confirmed | `RemoveExternalMessagingDataMigration` is registered last with the four constructor-injected roots (the same derivations as HEAD `external-channel-storage.ts` and the installer). `runPending()` logs FAILED and startup continues. FAILED is retried on the next start because only SUCCEEDED/SUCCEEDED_WITH_WARNINGS are skipped. Prisma `20260924120000` runs `DROP TABLE IF EXISTS` ×2. | — |
| BEH-107 | Confirmed | Workflows: only the `GATEWAY_VERSION` lines and the manifest-validation step are removed. Desktop validation is kept (R-2). The gateway workflow and `allinone-start-gateway.sh` are deleted. Docker, supervisor, compose, scripts and workspace are cleaned. The lockfile diff is pure removal (0+/299−). | — |
| BEH-108 | Confirmed | No MCP/skills module is touched. | — |
| BEH-109 | Confirmed | Readers are unchanged. The new projection test uses the generic `legacySourceMetadata` key and passes. | — |
| (gateway) REQ-121 | Confirmed | 18 R100 renames. All 134 `external-channel/` imports in 50 gateway files are relative and resolve to existing files (scripted check). The `autobyteus-ts` dependency, pre-scripts and aliases are removed. The remaining `autobyteus-ts` references in the gateway Dockerfile and runtime script are the accepted SR-011 deferral. | — |
| DS-004 (contract) | Confirmed | `EXTERNAL_USER_MESSAGE` is removed from both contract unions, the server enum, and the web protocol, projector and adapters. Tracked contract `dist/` rebuilt into a temp dir gives identical `.js`/`.d.ts`; only the maps differ, by outDir path. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-111 | BEH-101, REQ-118 | User | User | Browse Settings / follow old link | `/settings`, `?section=messaging` | Normal | route → `normalizeSection` → default | No Messaging; API Keys shown | requirements; `settings.vue` | Supported Normal Scenario | Use |
| SCN-112 | BEH-102/103, REQ-102/103 | System | Legacy gateway / caller | Chat traffic reaches the upgraded node | POST to old ingress; startup with bindings | Explicit Edge | route policy → router → 404; startup has no binding reader | No run effect | requirements; route policy + runtime diff | Supported Explicit Edge Scenario | Use |
| SCN-113 | BEH-106, REQ-114, QR-104/105 | Operational | Operator | Upgrade with legacy data | App start | Normal | Prisma migrate → runner → cleanup (last) | Roots deleted, tables dropped, startup never blocked | requirements; runner + migration code; unit test | Supported Normal Scenario | Use |
| SCN-114 | BEH-107, REQ-117 | Operational | Maintainer | Release / install | `v*` tag, `pnpm install`, Docker build | Normal | workflows / scripts / workspace | No gateway steps | workflow + script diffs | Supported Normal Scenario | Use |
| SCN-116 | BEH-109, REQ-119 | User | User | Open old run | Run history | Normal | raw traces → projection | Ordinary user/assistant messages | projection test | Supported Normal Scenario | Use |
| CON-HYG | Design "Final File Responsibility Mapping" (additions limited to the 3 designed files + superseded notes); base repo contract that `autobyteus-application-{sdk-contracts,backend-sdk}/dist/` is build output and untracked | Contract | Maintainer / delivery | The change set contains only designed changes; build output is not versioned where the base decided it isn't | Commit contents | Normal | `server prebuild/pretest → prepare:shared` rebuilds these `dist/` folders on every server build or test | Tracked copies are rewritten by every build, which dirties the worktree and adds unreviewable out-of-scope content | `git ls-tree 40b1783f4` has no such `dist/`; they were untracked in `28a8c368e`; `autobyteus-server-ts/package.json` `prepare:shared`; `Dockerfile.monorepo` builds them in-stage | Supported Normal Scenario (engineering contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-01 | The commit adds 64 generated files (+1701 lines) under `autobyteus-application-sdk-contracts/dist/**` and `autobyteus-application-backend-sdk/dist/**`. These are untracked on base and are not in the design's change inventory. | CON-HYG | A normal server build or test runs `prepare:shared` | Every build rewrites these tracked files. The delivery commit would reintroduce build output that the base deliberately untracked, unrelated to this ticket. | `git diff --name-status` (64 `A`); `git ls-tree -r 40b1783f4` (absent); `28a8c368e` untracked them; no consumer needs tracked copies (Dockerfile.monorepo copies from its builder stage) | Promote → **CR-001** (resolved in round 2) | Remove them from the commit (untrack). No other change is required. Round 2: `e9bbb28ab` tracks 0 files under either `dist/`, and the added-file set is exactly the 6 designed additions. |
| C-02 | DV-1: `onAcceptedExternalUserMessage` was kept, contrary to one design removal-plan row | REQ-101/REQ-120 scope; preserved non-messaging behavior | The user's own AgentOrg `SEND_MESSAGE` ACK (`agentOrgStreamingService.acknowledge`) | It refreshes AgentOrg history (first-message summary, `0d7b6e7e7`). It never reads the removed contract member. Removing it would break a non-messaging feature. | The code at L69/L372 and the store at L95; `0d7b6e7e7`; the REQ-120 identifier is case-sensitive `EXTERNAL_USER_MESSAGE` | Reject (as a finding). **Confirmed correct.** | The design row and AE-06 misattributed it by name. This is a non-blocking upstream artifact note, and no design rework is needed. |
| C-03 | DV-2/DV-3: the live publishers and `TeamStreamBroadcaster` were deleted entirely | Design "removal is first-class"; cleanup contract | — | Base: `TeamStreamBroadcaster.publishToTeamRun` was called only by `TeamLiveMessagePublisher`, and that only by `channel-team-run-facade.ts`. After removal, register/unregister were dormant. | `git grep` at `40b1783f4` | Reject (correct cleanup) | — |
| C-04 | DV-4: helpers removed (`normalizeOptionalUrlBase`, `parsePositiveNumberConfig`, `nextNumericStringId`, `normalizeNullableString`, `parseDate`) | Cleanup contract | — | Zero remaining references repo-wide (main product) | `git grep` at `a1478259d` | Reject (correct cleanup) | — |
| C-05 | DV-5: `generated/graphql.ts` got a removal-only delta instead of a full regeneration | Design "Regenerated output" | — | The tracked file is already stale on base, so a full regen adds ~1,400 unrelated lines. The delta is 0+/537− with no remaining channel/gateway/messaging types. | numstat; grep | Reject (proportionate, in-scope) | — |
| C-06 | DV-6 to DV-8 (constructor arg, `/app/memory`, test renames) | Removal plan | — | `/app/memory` was referenced only by gateway start and compose. The constructor arg was used only by the removed branch. | `git grep` at base | Reject | — |
| C-07 | The cleanup migration uses the default `ANYTIME` policy, so it is also manually runnable | Design Interface Boundary Mapping (explicit) | — | Deleting unused roots at any time is harmless. This is design-approved. | design-spec | Reject | — |
| C-08 | "external message …" wording remains in `standalone-agent-run-lifecycle-service.test.ts` message IDs and content | — | — | Generic English, no REQ-120 identifier, no behavior | diff | Reject (not material) | — |
| C-10 (round 3) | G-01: the tracked file `autobyteus-server-ts/external-channel/gateway-callback-outbox.json` (`{"version":1,"records":[]}`) remains in the main product | REQ-101/REQ-120 and the Legacy Removal Policy (contract), plus SCN-DEV below | See the SCN-DEV row that follows | See the SCN-DEV row that follows | `git ls-files` path gate (the only hit); `git log` → `76bd9107d`, where it was committed alongside unrelated work; `api-e2e-evidence/G-01/default-data-dir-probe.txt` | Promote → **CR-002** (resolved in round 4, `40f769e0d`) | Remove the tracked file (`git rm`). No source, design or requirement change, and no new ignore rule, because nothing writes there after the removal. |
| SCN-DEV (round 3) | The supporting scenario for C-10: a developer starts the server from the package with no `--data-dir` | REQ-114/BEH-106 + CON-HYG | Documented dev workflow: server `README.md` L49 ("Create `.env` in `autobyteus-server-ts` (or use `--data-dir` …)"); `AppConfig` falls back to `appRootDir` (L60); server `.gitignore` treats `/db/`, `/logs/`, `/download/` there as runtime data | Startup → app-data runner → `RemoveExternalMessagingDataMigration` → `<appRoot>/external-channel` exists as a tracked file → the directory is deleted. Record SUCCEEDED "migrated 1; skipped 3", and the worktree shows ` D …/gateway-callback-outbox.json`. | Probe log `APP DATA DIRECTORY: …/autobyteus-server-ts`; `git status` after start | Supported Normal Scenario | The migration's behavior is correct: that folder *is* the dev-layout messaging data root. The defect is the accidentally tracked runtime-data file inside it. |
| C-09 | The Docker all-in-one build fails at `team-stream-contracts build` (missing `agent-presentation-contracts` copy) | AC-117 | — | This is pre-existing: the baseline fails at the identical step. It is not caused by this change. | handoff + Dockerfile (no COPY of that package on base) | Reject (as a finding) | Residual risk for AC-117 validation |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Clean-cut removal; no shim, alias, stub or flag | None |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | Removal inventory matches `product-model-analysis.md` | None |
| Data-flow spine inventory clarity and preservation under shared principles | Pass | DS-001 to DS-008 verified in code | None |
| Ownership boundary preservation and clarity | Pass | Cleanup goes only through the runner/registry; DDL only in Prisma; gateway owns its types | None |
| Off-spine concern clarity | Pass | Migration logging reuses the runner | None |
| Existing capability/subsystem reuse check | Pass | App-data runner, Prisma, `normalizeSection` reused | None |
| Reusable owned structures check | Pass | Cleanup summary helper follows the `remove-*` precedent locally | None |
| Shared-structure/data-model tightness check | Pass | Unions and `RemoteAccessRouteClassification` shrink; `ExternalMessagingDataRoots` is exact | None |
| Repeated coordination ownership check | Pass | N/A (removal) | None |
| Empty indirection check | Pass | Empty publishers and dormant broadcaster removed (DV-2/DV-3) | None |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | Round 1 failed on CR-001. Round 2: the SDK `dist/` files are untracked, and the `^A` set is exactly the 6 designed additions. | None |
| Ownership-driven dependency check | Pass | No main-product import of the gateway; gateway has no `autobyteus-ts` dependency | None |
| Authoritative Boundary Rule check | Pass | Startup calls only `runPending()`; no direct cleanup call | None |
| File placement check | Pass | Migration, test and Prisma folder follow conventions | None |
| Flat-vs-over-split layout judgment | Pass | — | None |
| Interface/API/query/command/service-method boundary clarity | Pass | Constructor takes explicit named roots | None |
| Naming quality and naming-to-responsibility alignment | Pass | `copy-build-assets.mjs`, `RemoveExternalMessagingDataMigration`, `scriptSrcEdge` | None |
| No unjustified duplication of code / repeated structures | Pass | — | None |
| Patch-on-patch complexity control | Pass | Shutdown chain simplified with order preserved | None |
| Dead/obsolete code cleanup completeness in changed scope | Pass | No orphaned module or symbol; REQ-120 gate and residue searches clean (re-run by reviewer) | None |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass | The 8-case cleanup test covers all design-required cases plus inspect-failure and retry. The generic-metadata projection test and settings fallback test are present. | None |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | Non-messaging coverage is retained via generic equivalents (restore ordering, delta preservation, broadcaster) | None |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Messaging tests deleted; route-policy ingress case removed without replacement (per design) | None |
| API/E2E readiness for the next workflow stage | Pass | Probes N-3 are listed in the handoff; the pre-existing Docker gap is flagged. CR-001 is resolved. | None |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `server/src/config/app-config.ts` | 479 (was 500) | Pass | Pass (shrank) | Pass | Pass | OK | None |
| `web/pages/settings.vue` | 407 (was 423) | Pass | Pass | Pass | Pass | OK | None |
| `server/src/server-runtime.ts` | 259 (was 287) | Pass | Pass | Pass | Pass | OK | None |
| `server/src/app-data-migrations/app-data-migration-registry.ts` | 117 (was 112) | Pass | Pass (+5) | Pass | Pass | OK | None |
| `server/src/app-data-migrations/migrations/remove-external-messaging-data-migration.ts` | 79 (new) | Pass | Pass | Pass | Pass | OK | None |
| All other changed implementation files | ≤368, all shrank | Pass | Pass | Pass | Pass | OK | None |

The 64 SDK `dist/` files are generated output, not implementation source. They are handled under CR-001, not this audit.

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No 410 stub, alias section, deprecated member or re-export shim |
| No legacy old-behavior retention in changed scope | Pass | DV-1 is non-messaging behavior (C-02) |
| Dead/obsolete code cleanup completeness in changed scope | Pass | — |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | A: discard; B: Prisma drop; C: direct use |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | Historical migrations lost their messaging branches; readers unchanged |
| Approved transition mechanics match the reviewed design | Pass | Exactly 4 injected roots, lstat → rm (symlink not followed), never throws, FAILED retried; `DROP TABLE IF EXISTS` ×2 |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None remaining (round 4).
- CR-002's item, `autobyteus-server-ts/external-channel/gateway-callback-outbox.json`, was removed in `40f769e0d` (IR-003), and the path gate is empty.
- CR-001's items (`autobyteus-application-sdk-contracts/dist/**` with 52 files and `autobyteus-application-backend-sdk/dist/**` with 12 files) were untracked in `e9bbb28ab` (IR-002) and verified in round 2.

## Docs-Impact Verdict

- Docs impact: `Yes` (already applied in IR-001, and verified)
- Why: messaging docs were removed or reworded across the root, server, web, Docker and future-ticket docs. The added text is accurate against the code (release flow, shutdown order, public URL, stream event list).
- Files or areas likely affected (delivery):
  - Release notes should mention the unpruned Docker `<logs>/gateway.log` and `gateway-memory` volume (R-3).
  - The published `.github/release-notes/release-notes.md` still says "messaging bindings" and is replaced at the next release.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| MP-001 | Confirmed | — |
| MP-002 | Confirmed | — |
| MP-003 | Confirmed | — |

No new or reclassified premises.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.45
- Overall score (`/100`): 95
- Score calculation note: simple average for trend visibility only. The decision follows CR-001 and the category floor.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | All DS spines verified. Startup and shutdown chains are simplified with order preserved. | — | — |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | Runner-owned cleanup, Prisma-owned DDL, gateway-owned types | — | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Explicit named roots; unions and classification tightened | — | — |
| `4` | `Separation of Concerns and File Placement` | 9.5 | Designed files are placed correctly. The change set is limited to designed scope (CR-001 resolved). | — | — |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | Contract unions shrink; `dist/` rebuilt consistently | — | — |
| `6` | `Naming Quality and Local Readability` | 9.5 | Clear names; `copy-build-assets.mjs` rename | `onAcceptedExternalUserMessage` name predates the ticket (not in scope) | — |
| `7` | `API/E2E Readiness` | 9.0 | N-3 probes enumerated. Pre-existing Docker gap flagged. | Docker all-in-one cannot prove AC-117 until the separate pre-existing gap is fixed | — (validation decision) |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.5 | Server src tsc passes. 18 files/153 server tests and 10 files/120 web tests re-run by the reviewer pass. Migration semantics match the design. | — | — |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 9.5 | No shims, stubs or aliases | — | — |
| `10` | `Cleanup Completeness` | 9.0 (round 4; 8.5 in round 3; 9.0 in round 2) | Messaging removal is complete at both levels: the content gate and the path gate (added in round 4 to close the round-3 review gap) are clean. There are no orphans, and the stray SDK `dist/` output and the tracked outbox file (CR-002) are removed. | The pre-existing `.gitignore` gap for the SDK `dist/` folders remains out of scope | Optional separate hygiene ticket |

## Findings

No open findings (round 4).

### CR-002 — Tracked messaging runtime-data file left in the main product (Local Fix; API/E2E G-01) — **Resolved in round 4 (IR-003, `40f769e0d`)**

- Round 4 verification:
  - The delta from `e9bbb28ab` is exactly `D autobyteus-server-ts/external-channel/gateway-callback-outbox.json`, and the folder no longer exists.
  - The content gate shows only the 4 allowed registry lines. The path gate is empty. The broader path scan finds only unrelated gateways.
  - No `.gitignore` entry was added, as required.

Round 3 record, kept for history:

- Contract and scenario:
  - REQ-101 ("the main product contains no external-channel or messaging-gateway code") and REQ-120 (identifier search over tracked main-product files; the design gate domain is "every tracked file except the allowed set").
  - The design's Legacy Removal Policy.
  - Supported scenario SCN-DEV (candidate C-10): the documented dev workflow of running the server from `autobyteus-server-ts` with no `--data-dir`.
- Evidence:
  - `git ls-files` lists `autobyteus-server-ts/external-channel/gateway-callback-outbox.json`. Its content is `{"version":1,"records":[]}`, and it was committed alongside unrelated work in `76bd9107d` (2026-04-13, "feat(applications): add application bundle import ecosystem").
  - It is the only path-level REQ-120 hit (R-09 log).
  - `AppConfig` defaults `dataDir` to `appRootDir` (the server package root) when no `--data-dir` is given, and the server README documents that layout.
  - The approved cleanup migration therefore deletes this tracked file on the first dev start. G-01 probe: SUCCEEDED "migrated 1; skipped 3", and `git status` shows ` D autobyteus-server-ts/external-channel/gateway-callback-outbox.json`.
- Consequence: messaging residue stays in the product tree, and every developer's first start after upgrade leaves a dirty worktree through a deleted tracked file.
- Required action: `git rm autobyteus-server-ts/external-channel/gateway-callback-outbox.json` and recommit or amend.
  - No source, design or requirement change.
  - Do not add a `.gitignore` entry: nothing writes to that folder after the removal, and an entry would itself be messaging residue.
  - Re-confirm with a path-level gate: `git ls-files | grep -E '<REQ-120 identifiers>'` outside the allowed set must print nothing.
- Origin: an implementation defect, namely a missed item in the implementation-owned removal inventory. It is the same class as AE-20 (the stale accidental root `index.html`). The design's removal policy is total ("delete every external-channel/messaging component"), and its gate domain already covers every tracked file, so no design change is needed. Two earlier gaps also contributed:
  - Earlier review gap: my CRR-001/CRR-002 gates re-ran content-only `git grep` and did not list tracked paths. A path-level listing would have caught this. This was reasonably detectable in source review.
  - Design gate note (non-blocking): the design's identifier searches (AE-01, the REQ-120 gate) are content-grep based. The Solution Designer may add "including tracked file paths" wording during artifact sync. This does not block, because the gate domain already includes every tracked file.

No findings were open at the end of round 2.

### CR-001 — Out-of-scope generated SDK build output committed (Local Fix) — **Resolved in round 2 (IR-002, `e9bbb28ab`)**

- Round 2 verification:
  - `git diff a1478259d e9bbb28ab` changes 64 files with 1701 deletions, all under the two SDK `dist/` folders. No other file differs.
  - `git ls-files` tracks 0 files under either `dist/`, matching base.
  - `git diff 40b1783f4..HEAD --name-status | grep '^A'` lists exactly the 6 designed additions.
  - The worktree is clean apart from the untracked `dist/` output (as on base) and the ticket folder.

Round 1 record, kept for history:

- Contract: design-spec "Final File Responsibility Mapping" (additions limited to the designed files) and the base repository state, where `autobyteus-application-sdk-contracts/dist/` and `autobyteus-application-backend-sdk/dist/` are untracked build output (untracked in `28a8c368e`; absent in `git ls-tree 40b1783f4`). Candidate C-01.
- Evidence: `git diff 40b1783f4..a1478259d --name-status` shows 64 `A` entries under those two `dist/` folders (+1701 lines).
  - Every server `prebuild`/`pretest`/`pretypecheck` regenerates them via `prepare:shared`, which is likely how they entered the commit.
  - No workflow or Dockerfile depends on tracked copies: `Dockerfile.monorepo` copies from its builder stage.
- Consequence: the delivery commit would reintroduce build output that the base intentionally stopped tracking, unrelated to REQ-101–REQ-121. Later server builds or tests rewrite the tracked files and create noise or drift.
- Required action: remove both folders from the index (`git rm -r --cached autobyteus-application-sdk-contracts/dist autobyteus-application-backend-sdk/dist`) and recommit or amend so the change set contains only designed changes. Re-confirm that `git diff 40b1783f4..HEAD --name-status | grep '^A'` lists only the 6 designed additions. No source change is needed. A `.gitignore` change is not required by this finding.

### Confirmed Design-Plan Deviations (no action)

- **DV-1:** confirmed correct (C-02). `onAcceptedExternalUserMessage` is the AgentOrg accepted-`SEND_MESSAGE` history-refresh hook from `0d7b6e7e7`. It is unrelated to `EXTERNAL_USER_MESSAGE`. It is kept. It is not routed as Design Impact because the implementation matches the approved requirements and no design rework is needed. Non-blocking note for Solution Designer: correct the removal-plan row in the design spec and AE-06 during artifact sync.
- **DV-2 to DV-8:** confirmed (C-03 to C-06).

## Classification

- Round 4: `N/A` (Pass).
- Round 3 (failure-origin, G-01; history): `Local Fix`, implementation-owned (CR-002). Origin: implementation defect (missed removal item), with an earlier review gap. Not caused by the test, fixture, environment or execution. Not Design Impact or Requirement Gap.
- Round 2: `N/A` (Pass).
- Round 1 (history): `Local Fix` (CR-001), a bounded packaging/commit-content correction.

## Recommended Recipient

- Round 4:
  - Primary: `/api_e2e_engineer`. Rerun the R-09 content and path gates and the G-01 default-data-dir probe. Expected: no ` D` in `git status`, and the binding root reports SKIPPED. All other API-REV-001 validation stays valid, because the delta is one deleted data file.
  - Informational: `/implementation_engineer`.
- Round 3 (history): `/implementation_engineer`.
- After the fix:
  - A narrow source re-review, limited to the change-set delta plus content and path REQ-120 gates.
  - Then API/E2E reruns the R-09 content and path gates and the G-01 default-data-dir probe. Expected: no ` D`, and the binding root reports SKIPPED.
  - If only that file changes, no other validation needs rerunning.
- Round 2 (history): primary `/api_e2e_engineer`, informational `/implementation_engineer`.

## Residual Risks

- The pre-existing Docker all-in-one build failure (missing `autobyteus-agent-presentation-contracts` copy) blocks full AC-117 Docker proof. The baseline fails at the same step, so it is not caused by this change and needs a separate decision at validation.
- Release workflow edits can't be exercised without a tag. The diffs are surgical and verified (R-2).
- The data deletion is irreversible. It is approved and scoped to exactly four roots, and unit tests cover siblings and symlinks.
- The gateway is left unvalidated, with its own Dockerfile and runtime script stale (accepted, SR-011).
- Upstream artifact note (non-blocking): the design removal-plan row and AE-06 list `onAcceptedExternalUserMessage` as messaging, which is incorrect (DV-1).
- Hygiene note (non-blocking, pre-existing): the two SDK `dist/` folders are not covered by `.gitignore`, so broad `git add -A` after a server build can stage them again. Delivery should check the final added-file set. A separate ignore-rule ticket is optional.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review` (round 4, CRR-004; narrow re-review after the CR-002 fix)
- Supported Product Scenario Gate: `Pass` (SCN-DEV now yields no tracked-file deletion)
- Material-Premise Gate: `Pass` (MP-001, MP-002 and MP-003 unchanged)
- Score Summary: 9.45/10. Every category is ≥ 9.0, and Cleanup Completeness is restored to 9.0.
- Failure Origin (round 3, history): implementation defect CR-002, plus an earlier review gap that the round-4 path gate closes.
- Recommended Recipient: `/api_e2e_engineer` (primary); `/implementation_engineer` (informational)
- Notes:
  - Reviewed commit: `40f769e0d`.
  - CR-001 and CR-002 are resolved, and there are no open findings.
  - The API/E2E rerun scope is R-09 gates plus the G-01 probe.

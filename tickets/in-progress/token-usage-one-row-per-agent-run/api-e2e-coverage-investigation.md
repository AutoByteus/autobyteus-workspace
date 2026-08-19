# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-spec.md`
- Supplemental Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/token-usage-data-model-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md`
- Solution / Architecture Revisions: `SR-006`; `ARCH-REV-006`
- Implementation / Source Review Revisions: `IR-005`; `CRR-007` Pass at 92.9/100 with no open source finding
- Prior API/E2E Revisions: `API-REV-001` Fail at 70.0%; `API-REV-002` Fail at 75.0%
- Current API/E2E Revision: `API-REV-003`
- Investigation Round: `3`
- Trigger: resumed execution after `IR-005` and `CRR-007` resolved migration-only released-row semantic finding `CR-006 / MP-CR-004`.
- Investigation timing: the round-3 delta below was written before any round-3 durable edit, final execution, or reroute. This file is now refreshed with the completed evidence and is the latest authoritative investigation.

## Round 3 Resumption Delta

- Recheck `APIE2E-F002` first against reset/migrated Prisma/SQLite and GraphQL.
- Preserve the local OLLAMA `unsupported_or_local` assertion. Retarget the later historical-unknown case from current observation ingestion to actual released-row consolidation and current-record output because current ingestion correctly applies current normalization.
- Correct two already-classified stale GraphQL assertions: a mixed runtime summary is the bounded `Mixed` state, and multiple observations folded into one run remain one current record rather than reconstructed event buckets.
- Update both unchanged-ID source-shaping startup E2Es to bounded keyset/CAS/scalar owners and capability-scoped outcomes; do not retain removed whole-ledger test helpers or global-fatal expectations.
- Complete actual built-server consolidation success/failure/retry/overlap and restore gating; injected rollback; empty-source relaunch; freelist; unsafe SafeInt; ninth/reappearing series and byte caps; released scale/WAL/temp/disk/latency; GraphQL/API; normal/degraded/fatal Chrome; frontend build/component checks; static forward-only checks; cleanup.
- A new critical implementation failure would stop and reroute. Otherwise all selected evidence is required before `Pass`.

## Current Requirement And Design Basis

The approved system has one unique `token_usage_run_records` row per canonical run for standalone, direct, nested, delegated, and task-team origins. Direct deltas add; cumulative snapshots advance from bounded hashed checkpoints; replay/regression cannot double count or subtract; checkpoint and idempotency state have entry and byte caps. Current services, GraphQL, activation, and statistics are forward-only. Only registered app-data migrations may understand released ledger rows.

The two unchanged-ID source-shaping migrations run before one atomic SQLite consolidation. Successful validation deletes supported legacy rows without startup `VACUUM`; SQLite pages need only become reusable. An incomplete consolidation gates stored history and every pre-existing-run restoration before provider construction while valid current schema still admits newly allocated runs. A missing required current schema is fatal. JavaScript/GraphQL unsafe integers must reject without rounding and without undoing the exact committed BigInt fold. Settings ranges select by run creation (first-use fallback) and display lifetime totals.

## Changed Behavior Summary

| Boundary | Requirement / AC Basis | Coverage Consequence | Final Decision |
| --- | --- | --- | --- |
| Current one-row fold/store | REQ-001–REQ-007; AC-001–AC-005 | Replace event append/list fixtures with current fold/repository tests, concurrency, replay/regression, ninth-series, and byte-cap proof | Updated / expanded durable coverage |
| Run/team/member/statistics GraphQL | REQ-008–REQ-011; AC-006–AC-010 | Seed or fold current records; one concrete run counted once; mixed summaries and lifetime range semantics | Updated durable GraphQL and browser coverage |
| Source-shaping migrations | REQ-012–REQ-016, REQ-022; AC-011–AC-015, AC-021 | Remove whole-ledger helper expectations; prove bounded candidates/CAS/scalars, capped evidence, ordinary retry, sibling continuation | Updated durable startup E2Es plus scale probe |
| Consolidation / cleanup | REQ-017–REQ-021; AC-016–AC-020 | Prove released mapping, transaction rollback, retry/overlap, empty relaunch, source zero, reusable freelist, no required shrink | Expanded durable migration and actual built-server E2E plus scale probe |
| Degraded/fatal lifecycle | REQ-023–REQ-026; AC-022–AC-025 | Exercise healthy degraded server/new run/restore rejection/retry and fatal current schema; scan runtime for removed legacy APIs | Expanded actual server, restore service, Chrome, and static evidence |
| Public SafeInt/live quality | REQ-006/REQ-010; AC-007/AC-009 | Assert exact committed BigInt state, typed GraphQL rejection, no rounding, and public-summary rather than persistence-unavailable quality | Expanded durable GraphQL/lifecycle coverage |

## Changed Surface And Boundary Classification

| Surface | Affected | Direct Repository Evidence | Remaining Gap After Repository Stage | Broader Mode |
| --- | --- | --- | --- | --- |
| Domain/backend | Yes | Fold, accumulator, pricing, migration mapper, repository/store tests | Released-scale resource behavior | Real SQLite scale probe |
| API/transport | Yes | Current GraphQL E2E, typed readiness and SafeInt tests, live token message coverage | Browser/backend runtime integration | Actual built server + Chrome |
| Frontend / web-equivalent desktop renderer | Yes | Four mounted Nuxt component tests | Real rendering, proxy config, compact degraded/fatal states | Local Chrome 151 |
| Electron shell | No material shell change | No preload/IPC/native/window/package change | None | Actual Electron not justified |
| Process/lifecycle | Yes | Runner/runtime/activation/team service tests | Whole startup/failure/new-run/retry/overlap sequence | Built-server E2E |
| Persisted-data transition | Yes | Real Prisma/SQLite migration tests | Released-volume WAL/temp/disk/time and physical freelist | Scale probe |
| External provider runtime | No provider change | Deterministic observations plus stable live-message contract | Real LM Studio/Codex/Claude requires external services and does not close a ticket-specific persistence gap | Not selected |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run`
- Stack: Node 22.23.1, pnpm 10.28.2, TypeScript, Fastify/Mercurius/TypeGraphQL, Prisma 5.22/SQLite, Nuxt 3/Vue, Vitest 4.0.18, Playwright Core with installed Google Chrome.
- Authoritative server instructions: `autobyteus-server-ts/AGENTS.md`, `autobyteus-server-ts/README.md`, server `package.json`, Vitest config, `.env.test`, and `tests/setup/prisma-*`.
- Authoritative frontend instructions: `autobyteus-web/README.md`, `package.json`, Nuxt config, component test setup, and web/localization boundary scripts.
- Actual server/browser helper: `test-support/live-e2e/test-runtime-bootstrap.mjs`; it creates isolated data roots, database files, ports, migrations, and built server processes.
- Constraints: never use the user profile/database or port 29695 for owned live probes; build the server before actual standalone startup; use migration-owned legacy fixtures only; clean only owned resources.
- Known independent toolchain issue: `pnpm exec nuxi typecheck` loads transient `vue-tsc` against a TypeScript package that does not export `./lib/tsc`. It must remain a recorded blocked check, not a fabricated pass or product failure. Component tests, Nuxt production build, server TypeScript build, Chrome, and API tests remain executable.

## Persisted Data Transition Coverage Basis

- Approved outcome: `Migration Required`.
- Released source shapes: 20260624 ledger plus 20260625 pricing and later released display/address/name columns.
- Required evidence: deterministic released row mapping, equal-time numeric ledger ordinal, historical unknown/local semantics, source-shaping order, one transaction, validation-before-delete, rollback, ordinary retry, disjoint run IDs, current preservation, source zero, integrity, reusable pages, no runtime legacy owner.
- Representative fixtures: exact released migration SQL in durable built-server tests; a 154,100-row/1,269-run, 880,848,896-byte seeded SQLite probe (larger than the reported ~774.5 MiB reference); malformed/conflicting/missing custom-provider candidates; mixed runtimes; BigInt unsafe projection; injected overlap and cleanup failure.

## Existing Durable Coverage Inventory And Validity

| Coverage Group | Decision | Basis / Action | Final Status |
| --- | --- | --- | --- |
| Original helper, normalizer, unit-price, pipeline, repository, and store paths | Needs Update | Obsolete ledger/event owners replaced with current record owners; one post-quiescence assertion locally corrected | Pass |
| Statistics/display/enrichment/GPT-5.6/general/provider/unit-price GraphQL | Needs Update | Ledger-seeded fixtures and event-bucket assumptions were stale | Pass after current-owner conversion |
| Source-shaping startup E2Es | Needs Update | Removed whole-ledger helpers and global-fatal expectations | Pass with bounded adapter/runner semantics |
| Production upgrade built-server E2E | Needs Update | New consolidation adds a second migration record and deletes legacy source | Pass with success, degraded retry, and overlap paths |
| Migration/fold/runner/schema/restore unit tests | Still Valid / Expand | Directly exercise current and migration boundaries | Pass |
| TokenUsageStatistics component tests | Still Valid | Lifetime copy, migration guidance, and query state remain required | Pass |
| Runtime provider GraphQL E2E (`RUN_RUNTIME_TOKEN_USAGE_E2E=1`) | Still Valid, not selected | Requires external LM Studio/Codex/Claude runtime; deterministic live-message plus current store/API coverage directly exercises changed ticket boundaries | Three opt-in cases remain skipped by design |

## Stale Or Obsolete Coverage Decisions

| Obsolete Assertion / Owner | Classification | Replacement |
| --- | --- | --- |
| Imports/calls to removed append/list/aggregate ledger APIs | Stale / replace | Current record fixture, fold, repository, store, and GraphQL assertions |
| Mixed-runtime team expected an event-derived runtime list | Stale / update | Assert bounded `Mixed` summary |
| Multiple observations in one run expected separate event model rows | Stale / update | Assert one mixed current run record and exact display grouping |
| Historical unknown injected through current observation normalization | Stale / update | Insert released row, run real consolidation, assert current output/source deletion |
| Source-shaping failure globally blocks startup | Stale / update | Capability-scoped failure remains retryable and sibling work continues |
| Production upgrade leaves token ledger unchanged | Stale / update | Assert current rows, exact totals, source deletion, and immutable relaunch |

No durable test file was removed. Obsolete statements were replaced inside retained requirement-linked files.

## Durable Coverage Added Or Updated

Seventeen API/E2E-owned repository paths are changed and require proportional test-code review after this successful round:

1. `autobyteus-server-ts/tests/helpers/token-usage-run-record-fixtures.ts`
2. `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts`
3. `autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-unit-price-summary.test.ts`
4. `autobyteus-server-ts/tests/integration/token-usage/providers/default-agent-run-event-pipeline-lifecycle.integration.test.ts`
5. `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts`
6. `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts`
7. `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
8. `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-display-field-capturer.integration.test.ts`
9. `autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts`
10. `autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts`
11. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
12. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts`
13. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts`
14. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts`
15. `autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts`
16. `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`
17. `autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts`

## Repository Coverage Execution Plan And Results

| Scenario / Evidence | Result | Evidence |
| --- | --- | --- |
| Exact F002 recheck and historical-case diagnostic | Expected local case passes; stale historical setup identified | `logs/14-api-e2e-f002-round3-recheck.log` |
| Corrected current/migration GraphQL | 2 files / 6 tests pass | `logs/15-round3-graphql-current-migration.log` |
| All 13 originally owned paths | 12 executable files / 43 tests pass | `logs/16-all-13-api-e2e-owned-durable-paths.log` |
| Bounded source-shaping startup coverage | 2 files / 4 tests pass | `logs/17-source-shaping-startup-current-coverage.log` |
| Server production build | Pass, including shared builds, Prisma generation, TypeScript, bootstrap smoke | `logs/18-server-build.log` |
| Production actual startup/relaunch | 2 selected actual-server upgrade tests pass | `logs/19-production-upgrade-built-server.log` |
| Failed consolidation/new run/restore/retry and overlap | 2 selected actual-server lifecycle tests pass | `logs/20-built-server-consolidation-lifecycle.log` |
| Injected rollback, freelist, empty relaunch | 1 file / 3 tests pass | `logs/21-rollback-freelist-relaunch.log` |
| Unsafe SafeInt persistence + GraphQL | Selected test passes; exact 9007199254740992n/revision 2 retained, GraphQL null + typed error | `logs/22-unsafe-safeint-graphql-persistence.log` |
| Final broad lifecycle/API suite | 27 files / 125 tests pass; one external-runtime file / 3 opt-in cases skipped | `logs/28-final-broad-server-lifecycle-api-suite.log` |
| Server TS, diff, forward-only scan | Pass | `logs/29-server-ts-diff-legacy-boundary.log` |

## Post-Repository Confidence Scorecard

This score was taken after durable/API/build checks but before scale and Chrome.

| Category | Score | Evidence / Gap At Gate |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 95% | All semantic/lifecycle assertions pass; released resource behavior and real renderer still pending |
| Changed-boundary execution directness | 97% | Real Prisma/SQLite, current GraphQL, actual built server, exact migration; no scale yet |
| Cross-boundary integration realism | 94% | Actual server startup/API passes; browser proxy/render path pending |
| Environment/configuration/fixture fidelity | 94% | Released SQL and isolated runtime roots; released-volume fixture pending |
| Failure/edge/lifecycle/recovery evidence | 96% | Rollback, retry, overlap, restore topology, SafeInt, series caps pass |
| User-surface/browser/desktop-shell confidence | 88% | Component coverage only; renderer gap requires Chrome; shell itself unchanged |
| Durable regression coverage quality | 96% | Focused current-owner coverage passes; proportional review still required |

- Overall post-repository confidence: `94.3%` (simple average).
- Category below 90%: browser/user surface at 88%.
- Broader validation decision: `Required`.

## Broader Validation Decision And Completed Evidence

- Decision: `Required`.
- Expected gain: prove released-scale SQLite behavior and web-equivalent desktop rendering against actual backend classifications.
- Selected modes: temporary owned scale probe; actual built server; Nuxt development frontend; semantic Chrome assertions and screenshots; Nuxt production build.
- Scale result: 154,100 rows / 1,269 current runs; seeded DB 880,848,896 bytes; 144 custom candidates scanned (141 migrated, 3 bounded warnings) while ~154k unrelated rows were excluded; provider-name scan 144 (142 migrated, 2 bounded warnings); consolidation 11.287s against a 30-minute timeout; peak WAL 12,112,832 bytes; peak temp 0; peak RSS 192,937,984 bytes; source 0; current 1,269; report/input/output totals 154,100; `integrity_check=ok`; freelist 215,037 pages; physical DB not forced to shrink.
- Chrome result: Chrome 151 normal current/migrated task/model totals and lifetime copy; compact degraded actionable guidance while navigation remains available; fatal current-schema server exits 1 with the versioned platform-fatal protocol and browser shows a nonempty fetch error without breaking settings navigation.
- Frontend result: component 1 file / 4 tests, all boundary/localization guards, and Nuxt production build pass. Nuxt typecheck reproduces only the known `vue-tsc`/TypeScript `ERR_PACKAGE_PATH_NOT_EXPORTED` toolchain incompatibility.
- Evidence: `logs/23-released-scale-154k-774mib.log`, `scale-probe-result.json`, `logs/24-chrome-normal-degraded-fatal.log`, `browser-probe-result.json`, three screenshots, `logs/25-web-component-and-guards.log`, `logs/26-nuxt-typecheck-known-toolchain-block.log`, `logs/27-nuxt-production-build.log`, and `logs/30-probe-syntax-and-cleanup-audit.log`.

## Desktop Application Validation Decision

- Changed renderer behavior is web-equivalent; Chrome is the project-supported least-invasive direct surface.
- Actual Electron was not launched because no IPC, preload, native, window, packaging, or shell lifecycle behavior changed. Browser evidence is not claimed as Electron-shell proof.
- Chrome semantic assertions, actual backend correlation, normal/degraded/fatal screenshots, compact viewport, and production Nuxt build close the material renderer risk.

## Live Environment And Fixture Plan / Actual

- Owned targets: unique loopback ports, generated runtime roots under server test temp, unique SQLite DB names, local Nuxt child processes, isolated headless Chrome context.
- Normal fixture: released legacy row consolidated by actual startup, then queried/rendered as current data.
- Degraded fixture: released row with blank run ID makes consolidation fail while server stays healthy.
- Fatal fixture: current run table deliberately removed after normal schema migrations; built server must exit through current-schema fatal protocol.
- Scale fixture: temporary OS directory and unique SQLite file; exact released migration SQL; 154,100 wide rows with 1,269 run IDs, 144 candidate custom rows, malformed/conflicting/missing identities, and ~154k unrelated runtime rows.
- Production profile, user DB, Electron process, external accounts, and paid providers: untouched.

## Temporary Executable Validation

| Artifact | Purpose | Durable Replacement Decision |
| --- | --- | --- |
| `test-results/api-e2e/probes/released-scale-token-consolidation.mjs` | Released-volume latency/WAL/temp/RSS/disk/freelist/integrity measurement | Temporary only; a 154k/840 MiB fixture is too heavy for routine repository tests |
| `test-results/api-e2e/probes/token-usage-chrome-browser.mjs` | Correlated actual-server normal/degraded/fatal Chrome journey | Temporary only; repository already uses component tests and has no general token-statistics browser runner |

Both probes are retained as ticket evidence, syntax-checked, and clean only their owned resources.

## Not Tested / Infeasible / Deferred

- External real-runtime provider suite: three `RUN_RUNTIME_TOKEN_USAGE_E2E=1` cases skipped because LM Studio/Codex/Claude services and credentials are not deterministic or needed to prove the changed storage/migration contract. GPT-5.6 live-message E2E, transformer, pipeline, current store, GraphQL, and actual server tests cover the changed contract directly.
- Electron shell: not applicable to changed boundaries; Chrome proves only renderer/client-server behavior.
- Nuxt typecheck: attempted and blocked by the already-recorded transient `vue-tsc`/TypeScript package-export incompatibility. This is not a product failure; production Nuxt build passes.
- Hostile corruption, power-cut taxonomy, kernel/device faults, adversarial writers, and same-release `VACUUM`: deliberately out of scope under REQ-024/AC-023.

## Ambiguities Or Reroute Triggers

- Requirement gap: none.
- Design impact: none.
- Implementation failure in round 3: none. `APIE2E-F002` is resolved; the later historical assertion and two GraphQL assertions were stale coverage, classified before correction.
- Environment blocker: none. The known Nuxt typecheck incompatibility has alternative direct product/build evidence and was already disclosed upstream.

## Final Confidence And Investigation Decision

| Category | Final Score | Final Evidence | Residual Uncertainty |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 97% | All AC groups have direct durable or executable evidence | External provider implementations were not re-exercised because they did not change |
| Changed-boundary execution directness | 98% | Current fold/store/SQLite/GraphQL, actual startup, released migration, fatal schema | Negligible synthetic-fixture versus field-data distribution difference |
| Cross-boundary integration realism | 97% | Actual built server, GraphQL, Nuxt proxy, Chrome DOM and screenshots | No Electron-shell execution, correctly scoped N/A |
| Environment/configuration/fixture fidelity | 97% | Exact released SQL, larger-than-reference DB, owned ports/data, Chrome 151 | Synthetic rather than copied production rows |
| Failure/edge/lifecycle/recovery evidence | 98% | Rollback, retry, overlap, old/new admission, all restore gates, SafeInt, caps, freelist | No out-of-scope power/kernel fault matrix |
| User-surface/browser/desktop-shell confidence | 97% | Normal/degraded/fatal Chrome, compact viewport, production build, components | Browser proves renderer, not unchanged Electron shell |
| Durable regression coverage quality | 96% | 17 focused changed paths; 125-test broad pass | Required proportional test-code review is pending |

- Overall final confidence: `97.1%` (simple average).
- Every critical acceptance criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Default clean target met: `Yes`.
- Result: `Pass`.
- Required next recipient: `/code_reviewer` for proportional review of the 17 API/E2E-owned durable paths before delivery.

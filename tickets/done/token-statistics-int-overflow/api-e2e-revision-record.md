# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `code_reviewer` / `code-review-report.md` implementation-source round 3 | `SR-001`, `IR-001`, `CRR-002` | Investigation stopped and rerouted; 61% provisional, no execution result | `Pass`; 96% final confidence |
| API-REV-002 | `code_reviewer` / `code-review-report.md` implementation-source round 4 | `DR-004`, `IR-002`, `CRR-004`; product basis retains `SR-001` | `Pass`; 96% final confidence | `Pass`; 97% final confidence |

## Revision Entries

### API-REV-001 — Resume after exact-display design correction and complete executable coverage

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-int-overflow/code-review-report.md`; implementation-source review round 3.
- Triggering finding or scenario IDs: prior AC-002 compact-primary display blocker; current API-001, WEB-001, and WEB-002 durable candidates.
- Related solution, implementation, or code-review revision IDs: `SR-001`, `IR-001`, `CRR-001`, `CRR-002`.
- Why coverage or execution was revised: the prior API/E2E investigation correctly stopped because the approved exact-decimal criterion contradicted the Task table's compact primary formatter. `SR-001` corrected the solution, `IR-001` changed both primary cells to `formatInteger`, and `CRR-002` passed the revised source, making execution valid again.
- Coverage decisions or durable test paths changed:
  - `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts`: accepted after adding the missing Task query, exact assertions, native AppConfig lifecycle, and cleanup; final patch hash `4e017e132d7930fda0f7623cf3d9ce279628963e39186916f32f730314ec9746`.
  - `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`: accepted unchanged from the deferred candidate; final patch hash `ce8303be777cbf5e47e0607faf3c73dbfb8616ba245659e6b6cc1fd5909b7869`.
  - `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`: accepted unchanged from the deferred candidate; final patch hash `4d53062b5929ef28b84804b3acbb1c00a3143443803c39fe8c2aafbb6a794123`.
  - No durable test was removed.
- Scenarios added, changed, removed, or rechecked: API-001 added/updated and passed; WEB-001/WEB-002 updated and passed; API-002/API-003/WEB-003 rechecked and passed; PROBE-001/BUILD-001 executed and passed. No scenario was removed.
- Commands, environment, fixture, or broader-validation delta: native Prisma reset and an owned temp AppConfig made API-001 self-contained. Two older regression files required a disposable AppConfig setup/config; their initial pre-assertion environment failure was corrected and the rerun passed 4/4. Source schema inventory/codegen and build-config typecheck were executed. Repository evidence reached 92%, so targeted broader validation ran: a source-built live server, isolated SQLite seed/query/cleanup, live schema/codegen, and Chrome Settings journey raised final confidence to 96%.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| AC-002 primary Task value rendered compact-only (`3.14B`) | `Design Impact` / `Requirement Gap` | Resolved by `SR-001`, `IR-001`, and `CRR-002`; WEB-002 now proves exact primary digits and compact secondary text. | `web-focused.log`; revised source/revision artifacts. |
| API-001 missing `tokenUsageTaskStatisticsInPeriod` coverage | API/E2E `Local Fix` | Current durable E2E queries Task, runtime/model, and run summary and asserts exact `3_136_827_911`. | `server-provider-semantics.log`. |
| API-001 AppConfig/test-environment setup missing | API/E2E `Local Fix` | Durable temp AppConfig points to native isolated DB; setup and cleanup pass with zero residue. | `server-provider-semantics.log`; `server-provider-cleanup.log`. |

- Canonical artifacts and sections updated: complete current state of `api-e2e-coverage-investigation.md`; new authoritative `api-e2e-execution-coverage-report.md`; this revision record.
- Prior result and confidence: no execution result; investigation decision was reroute/stop at 61% provisional confidence.
- Current result and confidence: `Pass`; 96% final confidence; all categories at least 95%; every critical acceptance criterion directly proven.
- New or remaining failure IDs: `None`.
- Recommended recipient: `code_reviewer` for proportional durable-test review.
- Remaining risks, blocked evidence, or untested scope: packaged artifact rollout and values above `Number.MAX_SAFE_INTEGER` are non-blocking/out of scope. Chrome proved the shared renderer path; packaged Electron rollout remains a non-blocking delivery concern because no shell-specific code changed.

### API-REV-002 — Validate the DR-004 Docker packaging correction

- Triggering role, report path, and round: `code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/tickets/done/token-statistics-int-overflow/code-review-report.md`; implementation-source review round 4.
- Triggering finding or scenario IDs: delivery revision `DR-004`, implementation revision `IR-002`, Server Docker Release run `30425051361`, and current scenarios `PKG-001`–`PKG-007`.
- Related solution, implementation, or code-review revision IDs: original product basis retains `SR-001`; current packaging correction is `IR-002` / `CRR-004`; prior product/API passage retains `IR-001` / `CRR-002` / `CRR-003` / `API-REV-001`.
- Why this coverage/execution revision was recorded: the user-authorized `v1.4.27` tag-triggered release exposed an obsolete repository-root `COPY patches ./patches` in three supported Dockerfiles. Source review passed the exact three-line removal, but real Docker/BuildKit execution, dependency inspection, cleanup, and durable regression protection remained required.
- Coverage decisions or durable test paths changed:
  - Added `/Users/normy/autobyteus_org/autobyteus-worktrees/release-token-statistics-int-overflow-v1.4.27/scripts/tests/test_docker_build_context_sources.py`.
  - The test generically inventories direct non-stage `COPY` sources for the monorepo, all-in-one, and remote-server Dockerfiles and asserts that they exist in repository-root context.
  - File SHA-256: `8de41e4923a8a776cb4ea3655f4fe1adcc0b889ca6c023331c9a9ff30651d1d0`; patch SHA-256: `1d01b8833094455863a34361f885f0bcb53724874d4cf6f8dfc2186a5e0fca77`.
  - No durable test was updated, removed, disabled, or replaced.
- Scenarios added, changed, removed, or rechecked: `PKG-001` added and passed; `PKG-002`–`PKG-007` added as executable coverage and passed; the established CLI/browser-bridge Docker contracts rechecked 9/9 and the combined suite passed 10/10. Original API/UI scenarios remain the unchanged passed `API-REV-001` baseline.
- Commands, environment, fixture, or broader-validation delta: an owned Docker-container Buildx builder ran every affected Dockerfile from the real repository root. The release monorepo Dockerfile completed its full native arm64 `builder` target and was loaded for ephemeral package/output inspection; all-in-one and remote-server completed full builder targets with cache-only output; multi-platform BuildKit check passed; no registry or workflow action occurred. The owned builder, image, containers, cache, and temporary lock snapshot were removed.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `DR-004` / run `30425051361`: BuildKit failed for both release platforms on missing root `patches/` before install | Implementation-owned packaging `Local Fix` | `IR-002` removes the obsolete copy from all three affected Dockerfiles; every real native builder target now completes from repository-root context. | `pkg-003-monorepo-builder-build.log`; both `pkg-004-*-builder-build.log`; `CRR-004`. |
| Current dependency/patch state needed executable confirmation | Validation gap, not a prior API/E2E failure | Loaded monorepo builder inspection reports unpatched `repository_prisma@1.0.9`, no `/app/patches`, no patch metadata, and successful server/mobile outputs. | `pkg-003-monorepo-builder-inspection.log`; `pkg-005-contract-audit.log`. |

- Canonical artifacts and sections updated: current `api-e2e-coverage-investigation.md`, current `api-e2e-execution-coverage-report.md`, this revision record, and retained `api-e2e-evidence/docker-packaging-dr004/`.
- Prior result and confidence: `API-REV-001` — `Pass`, 96% final confidence for the original product scope.
- Current result and confidence: `Pass`, 97% final confidence for the cumulative current package; all current-round critical scenarios passed and no applicable category is below 95%.
- New or remaining failure IDs: `None`.
- Recommended recipient: `code_reviewer` for proportional review of the one added durable test.
- Remaining risks, blocked evidence, or untested scope: registry publication/workflow recovery, full emulated amd64 compile, and unchanged runtime-stage launch were not performed. During execution `origin/personal` advanced 14 commits; exact Dockerfiles/lock/server package/.dockerignore inputs remained unchanged and the root package changed scripts only. Delivery must perform its required latest-base refresh and integrated-state check before selecting any recovery action. Published `v1.4.27` remains unchanged.

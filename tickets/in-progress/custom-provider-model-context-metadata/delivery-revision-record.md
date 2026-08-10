# Delivery Revision Record

## Revision Index

| Revision ID | Entry Point / Trigger | Prior Result | Current Result | Affected Canonical Artifacts |
| --- | --- | --- | --- | --- |
| DR-001 | API/E2E `API-REV-002` Pass, proportional test re-review `CRR-004` Pass, initial delivery integration | N/A | `Pass — integrated handoff ready for explicit user verification; finalization held` | `delivery-integrated-state-refresh.log`, `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, seven long-lived docs |
| DR-002 | User requested README-guided local Electron build for hands-on verification | `DR-001 — Pass / awaiting verification` | `Pass — unsigned macOS arm64 Electron artifact ready for user testing; finalization still held` | `electron-build-mac-report.md`, `electron-build-mac.log`, `handoff-summary.md`, `release-deployment-report.md` |
| DR-003 | Current `SR-010`/`SR-011`, `IR-006`, `CRR-007`, `API-REV-004`, and `CRR-009` package; mandatory latest-base delivery refresh | `DR-002 — historical/superseded by the Qwen rework` | `Blocked — latest-base merge conflicts in AppConfig production/test boundaries; merge aborted and rerouted` | `delivery-integrated-state-refresh.log`, `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md` |
| DR-004 | `IR-007`, `CRR-010`, and integrated `API-REV-005`; mandatory fresh tracked-base delivery restart | `DR-003 — Blocked / Local Fix` | `Pass — integrated branch current, docs synchronized, handoff ready for explicit user verification; finalization held` | `delivery-integrated-state-refresh.log`, `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, three expanded long-lived docs |
| DR-005 | User requested README-guided Electron build for hands-on testing | `DR-004 — Pass / awaiting verification` | `Pass — current-base macOS arm64 Electron 1.4.45 build and artifact verification complete; finalization held` | `electron-build-mac-report.md`, `electron-build-mac-dr-005.log`, `electron-build-mac-dr-005-verification.log`, `delivery-integrated-state-refresh.log`, `handoff-summary.md`, `release-deployment-report.md` |
| DR-006 | `SR-016`, `IR-010`, `CRR-012`, `API-REV-007`, and `CRR-014`; mandatory latest-base delivery restart before a current Electron build | `DR-005 — historical for the pre-SR-016 package` | `Blocked — latest-base merge conflicts in AppConfig production/test boundaries; merge aborted, docs/build withheld, and rerouted` | `delivery-integrated-state-refresh.log`, `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `electron-build-mac-report.md` |
| DR-007 | `IR-012`, `CRR-016`, `API-REV-008`, and `CRR-017 N/A`; delivery restart plus the requested current Electron build | `DR-006 — Blocked / Local Fix` | `Pass — branch current, five durable docs synchronized, macOS arm64 Electron 1.4.45 rebuilt and verified; finalization held` | `delivery-integrated-state-refresh.log`, `docs-sync-report.md`, `handoff-summary.md`, `release-deployment-report.md`, `electron-build-mac-report.md`, three DR-007 build/verification logs, five long-lived docs |

## Revision Entries

### DR-001 — Integrated custom-provider metadata delivery baseline

- Delivery round and trigger: Initial delivery round after implementation source review `CRR-002` Pass, API/E2E `API-REV-002` Pass at `95.3%`, and proportional durable-test re-review `CRR-004` Pass.
- Triggering upstream artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-execution-coverage-report.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/api-e2e-test-review-report.md`, and `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/code-review-report.md`.
- Prior authoritative result (`N/A` for `DR-001`): `N/A`. No prior delivery result is inferred.
- Base refresh: `git fetch origin personal --prune` advanced tracked `origin/personal` to `ba6ebc2a2fbf56f17ee6bbb965f3f153307db3d2`.
- Delivery-safety checkpoint: `e86bf82e7` protected the reviewed candidate before integration.
- Integration: `git merge --no-edit origin/personal` completed as merge commit `36ebd83fb87df7608cbdbbd8de26750d4ee49ed9`.
- Post-integration verification: focused custom-provider/model TypeScript tests passed, 3 files / 16 tests. Expected unavailable local Ollama/LM Studio connection warnings were emitted by the provider test; no test failed. `git diff --check` passed.
- Current authoritative result: `Pass — latest tracked base is integrated, long-lived docs are synchronized, delivery artifacts are written, and the branch is ready for explicit user verification. Repository finalization has not started.`
- Docs sync: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/docs-sync-report.md` — `Updated / Pass`.
- Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/handoff-summary.md` — `Ready For User Verification`.
- Release/deployment report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/release-deployment-report.md` — no release/deployment in scope; finalization pending verification.
- User verification/finalization state: Explicit user verification has not been received. The ticket remains under `tickets/in-progress`; no archive, ticket-branch push, target merge, release, deployment, or cleanup has occurred.
- Why this baseline is recorded: Establish the first truthful integrated delivery state, preserve latest-base and post-integration evidence, promote the final custom metadata and Token Meter contracts into long-lived docs, and record the mandatory verification hold.
- Remaining risks or untested scope: Source-dated vendor profile freshness, synthetic rather than real vendor enforcement/payload behavior, and out-of-scope Electron/distributed-worker execution remain explicit. No delivery blocker is present.
- Next action: User verifies the integrated handoff and replies explicitly; delivery then refreshes the finalization target again before any archival, push, merge, release, deployment, or cleanup.

### DR-002 — Local macOS Electron user-test build

- Delivery round and trigger: User asked delivery to read the README and build Electron so the result could be tested hands-on.
- Documentation basis: root `README.md` build/release sections, `autobyteus-web/README.md` desktop build and integrated-server sections, `autobyteus-web/AGENTS.md`, and `autobyteus-web/docs/electron_packaging.md`.
- Prior authoritative result: `DR-001 — Pass; integrated handoff ready for explicit user verification, finalization held.`
- Current authoritative result: `Pass — README-guided local macOS arm64 Electron build completed with exit 0. DMG, ZIP, and direct app bundle were produced for user testing. DMG verification, ZIP integrity, packaged arm64 node-pty helper validation, and a real packaged node-pty spawn probe passed.`
- Build command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* corepack pnpm -C autobyteus-web build:electron:mac`.
- Build report: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/electron-build-mac-report.md`.
- User-test artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.40.dmg`.
- User verification/finalization state: Explicit product verification has not been received. The ticket remains under `tickets/in-progress`; no archive, ticket-branch push, target merge, release, deployment, or cleanup has occurred.
- Build caveats: The package is unsigned/unnotarized. The app uses `~/.autobyteus/server-data`; delivery did not launch the app or mutate user data. Non-fatal electron-builder unresolved optional-dependency diagnostics were logged; packaging and artifact checks passed.
- Why this revision is recorded: Preserve the requested user-test build, exact command, produced artifacts, integrity/runtime evidence, and the continuing verification hold without rewriting the DR-001 integrated baseline.
- Next action: User tests the artifact and replies explicitly. Delivery then refreshes the finalization target again before any repository finalization or release work.

### DR-003 — Current Qwen package latest-base integration blocker

- Delivery round and trigger: Delivery resumed after current requirements/design `SR-010`/`SR-011`, implementation `IR-006`, source review `CRR-007` Pass at `9.37/10`, API/E2E `API-REV-004` Pass at `96.4%`, and proportional durable-test review `CRR-009` Pass.
- Prior authoritative result: `DR-002` recorded a successful build for the earlier endpoint-profile implementation. `SR-010` explicitly superseded that design and all its downstream evidence, so it is historical only and cannot authorize current verification or finalization.
- Base refresh: `git fetch origin personal --prune` completed successfully. The current tracked base is `origin/personal@647b1119a9dc3ba2ba301243e1b5e752943454db`; the pre-checkpoint ticket state was ahead 5 and behind 80.
- Delivery-safety checkpoint: `git diff --check` passed, then local checkpoint `49736ac6b73436b1643ed7959391bd3e934ae164` protected the fully reviewed Qwen candidate and cumulative artifacts.
- Integration attempt: `git merge --no-edit origin/personal` failed with content conflicts in `autobyteus-server-ts/src/config/app-config.ts` and `autobyteus-server-ts/tests/unit/config/app-config.test.ts`.
- Safety recovery: Delivery did not resolve production code. `git merge --abort` passed, retaining checkpoint `49736ac6b73436b1643ed7959391bd3e934ae164`; the branch remains ahead 6 and behind 80.
- Post-integration verification: Not run because no integrated state exists.
- Docs sync: `Blocked`. No DR-003 long-lived docs were edited or declared current against stale state. `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/docs-sync-report.md` records the pending durable docs impact.
- Current authoritative result: `Blocked — latest tracked base cannot be integrated without reconciling AppConfig persistence and its unit tests. Handoff readiness, user verification, finalization, release/deployment, and cleanup remain unavailable.`
- Classification and route: `Local Fix` to `implementation_engineer`. The cumulative package includes the current requirements, investigation, design, design review, implementation, source review, coverage investigation, execution report, durable-test review, and all DR-003 delivery artifacts.
- Remaining risk to preserve: Real Alibaba availability, credentials, quota, region policy, TLS behavior, and undocumented payload variation were not exercised. The loopback E2E evidence does not claim live vendor verification.
- Next action: Implementation reconciles latest-base changes and runs implementation-scoped checks. The resulting integrated source returns through code review and applicable API/E2E validation before delivery restarts from a new latest-base refresh.

### DR-004 — Integrated Qwen handoff ready for user verification

- Delivery round and trigger: Delivery restarted after `IR-007` resolved the DR-003 AppConfig conflict, `CRR-010` passed the integrated source at `9.40/10`, and `API-REV-005` independently re-established integrated API/E2E/browser confidence at `96.4%` without changing production source or durable repository coverage.
- Prior authoritative result: `DR-003 — Blocked / Local Fix`; the merge was aborted and no integrated state was available for docs or handoff.
- Fresh base refresh: The initial `git fetch origin personal --prune` found IR-007 current at `647b1119a9dc3ba2ba301243e1b5e752943454db`. A final pre-handoff audit then detected that the tracked ref had advanced by seven compaction-lineage commits, and an explicit refetch confirmed `origin/personal@9ce41640960fc3e2a7b85b85608a4f081fe52df2`.
- Integration decision: Delivery checkpointed the current Qwen/docs/evidence package as `694fe3ffb75d42b41a25462346ec9e492b1d3a45`, then merged the late base without conflict as `894f01ac43b8ace816ca6f78da180507647cc59d`. The final branch state was ahead 9 / behind 0. New base production/test/docs changes were confined to memory/compaction/lineage boundaries and did not overlap ticket paths.
- Post-integration verification: The required core exact-metadata/Qwen command passed 4 files / 25 tests on `894f01ac43b8ace816ca6f78da180507647cc59d`. API-REV-005 remains the independent ticket-behavior evidence; API-REV-004 was not inferred forward.
- Docs sync: `Updated / Pass`. Delivery validated all seven long-lived feature docs against integrated state and expanded `autobyteus-server-ts/docs/modules/llm_management.md`, `autobyteus-ts/docs/llm_module_design_nodejs.md`, and `autobyteus-web/docs/settings.md` with final native Qwen endpoint/key persistence, status, error, refresh, and recovery behavior.
- Docs validation: `git diff --check` passed; the source/test working-tree modification audit after docs sync was empty.
- Current authoritative result: `Pass — the latest tracked base is integrated, API-REV-005 plus the late-base Qwen/metadata smoke authorize the handoff state, durable docs are synchronized, and the handoff is ready for explicit user verification.`
- User verification/finalization state: Explicit verification has not been received. Ticket archival, delivery commit/push, target merge/push, version/tag/release, deployment, and worktree/branch cleanup remain on hold.
- Historical evidence posture: The endpoint-profile delivery design and unsigned v1.4.40 Electron artifact are superseded and must not be used to verify the current Qwen implementation.
- Remaining risk to preserve: Real Alibaba availability, credentials, quota, region policy, TLS behavior, undocumented payload variation, and future source-dated fact drift were not exercised. The owned loopback provider proves the approved OpenAI-compatible contract only.
- Next action: User verifies or explicitly accepts the handoff. Delivery then fetches the finalization target again and renews verification if that later refresh materially changes the handoff state before archive/commit/push/merge.

### DR-005 — README-guided macOS Electron verification build

- Delivery round and trigger: User asked delivery to read the README and build Electron for hands-on testing.
- Prior authoritative result: `DR-004 — Pass; integrated docs/handoff ready for verification, repository finalization held.`
- Documentation basis: root `README.md`; `autobyteus-web/README.md` Desktop Application Build, macOS logging/no-notarization, integrated backend, and server-mode sections; `autobyteus-web/docs/electron_packaging.md`; `autobyteus-web/AGENTS.md`.
- Pre-build base refresh: `git fetch origin personal --prune` found ten commits beyond the DR-004 base, covering progressive rich rendering/finalization and release v1.4.45. Delivery checkpointed the current package as `93c731cfa74fa961da8f8746a9af89ac1e407f74` and merged `origin/personal@7f0fc49965950d9689726a048371f2e2b78eef31` without conflict as `f31f378d712b1b1f4e839a671104c410b51c6d06`.
- Integrated docs impact: The base changed `autobyteus-web/docs/agent_execution_architecture.md`; the automatic merge retained both progressive-rendering and this ticket's Token Meter truth. No Qwen doc rework was required.
- Build command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* corepack pnpm -C autobyteus-web build:electron:mac`.
- Build result: `Pass`, exit 0, 2026-08-08T20:16:12Z–20:20:29Z, package 1.4.45, Electron 42.4.1, Darwin arm64, unsigned/unnotarized.
- Build pipeline result: web/localization guards, shared/server builds, Prisma generation, sanitized bootstrap, integrated-server deployment, Nuxt Electron generation, Electron/build TypeScript compilation, native module rebuild, packaging, and blockmap generation passed.
- Artifact verification: DMG checksum valid; ZIP integrity passed; app executable is Mach-O arm64; packaged target/selected node-pty helpers and real spawn probe passed.
- Recommended artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.45.dmg`, SHA-256 `50f60d04c6bee092211941c6be8813fb679e6e66a291902c7168d3ebbc5652d8`.
- Post-build base confirmation: `git fetch origin personal --prune` at 2026-08-08T20:21:52Z retained `7f0fc49965950d9689726a048371f2e2b78eef31`; branch ahead 11 / behind 0.
- Current authoritative result: `Pass — current-base local macOS arm64 Electron package is ready for user testing.`
- User-data posture: Delivery did not launch the app or mutate `~/.autobyteus/server-data`. The user should back up that directory if preserving existing local state matters.
- Release/finalization state: This is not a release. No tag, push, target merge, deployment, archival, or cleanup occurred. Explicit user verification remains required.
- Remaining risk: Build is unsigned/unnotarized. Real Alibaba availability, credentials, quota, region policy, TLS behavior, undocumented payload variation, and source-dated fact drift remain outside automated coverage.
- Next action: User installs/opens the DMG, verifies Qwen setup/catalog/restart behavior, and explicitly accepts or reports findings. Delivery then performs the mandatory finalization-target refresh.

### DR-006 — SR-016 latest-base integration blocker

- Delivery round and trigger: Delivery restarted after readable custom-provider identity solution `SR-016`, implementation `IR-010`, implementation source review `CRR-012` Pass, API/E2E `API-REV-007` Pass at `96.4%`, and proportional durable-test review `CRR-014` Pass. The user's standing request is a README-guided Electron build for hands-on testing.
- Prior authoritative result: `DR-005` passed for the older native-Qwen package at `origin/personal@7f0fc49965950d9689726a048371f2e2b78eef31`. It predates SR-016 and the current tracked-base advance, so its v1.4.45 artifact is historical and is not authorized as the current test package.
- Fresh base refresh: `git fetch origin personal --prune` completed successfully and found `origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117`; the pre-checkpoint branch state was ahead `11`, behind `20`.
- Delivery-safety checkpoint: The reviewed SR-016 source, durable coverage, cumulative artifacts, and retained evidence were protected as local commit `7ea8a728420d584218aaf141af754145fa7a5329` after the source/test/Markdown/JSON whitespace check passed.
- Integration attempt: `git merge --no-edit origin/personal` failed with content conflicts in `autobyteus-server-ts/src/config/app-config.ts` and `autobyteus-server-ts/tests/unit/config/app-config.test.ts`.
- Conflict meaning: The current base retires the exact `AUTOBYTEUS_STREAM_PARSER` setting through line-based AppConfig mutation and adds matching initialization/set tests. The ticket side owns durable atomic environment-file replacement for `QWEN_BASE_URL`, generic secret guards, and matching failure/permission tests. Both contracts touch the same imports, `set`, private mutation helpers, environment cleanup, and adjacent test region; delivery cannot choose their combined behavior without implementation ownership and review.
- Safety recovery: `git merge --abort` completed successfully. HEAD is restored to checkpoint `7ea8a728420d584218aaf141af754145fa7a5329`; divergence is ahead `12`, behind `20`; no unmerged path remains.
- Post-integration verification: Not run because no integrated state exists. No Electron build was started, and the prior v1.4.45 binaries were not relabeled as current.
- Docs sync: `Blocked`. No long-lived doc was edited or declared current. The eventual integrated docs pass must cover readable custom-provider IDs, startup migration/selector rewriting, best-effort old-secret cleanup, removed obsolete V1 startup E2E truth, and any base-owned AppConfig retirement behavior that survives reconciliation.
- Current authoritative result: `Blocked — the latest tracked base cannot be integrated without reconciling AppConfig persistence/retired-setting behavior and the combined unit tests. Current hands-on build, docs sync, handoff readiness, user verification, finalization, release/deployment, and cleanup remain unavailable.`
- Classification and route: `Local Fix` to `implementation_engineer`, followed by source review and applicable integrated API/E2E validation before delivery restarts from another fresh tracked-base fetch.
- Bounded residuals retained: Real Alibaba availability, credentials, quota, region policy, TLS behavior, undocumented payload variation/future drift; the ordinary recent `RUNNING` window; arbitrary interruption timing; actual cleanup-failure orphan risk; stale skipped selectors; and the package-wide TS6059 baseline. Delivery-owned tracked-base integration is an active blocker rather than a residual.
- Repository state: Ticket remains under `tickets/in-progress`; no branch push, final target merge, tag, release, deployment, archival, or cleanup occurred.
- Next action: Implementation reconciles the two AppConfig contracts and their tests on `origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117`, returns the integrated source through review/API-E2E, and then delivery performs a new mandatory fetch/integration check before docs synchronization or Electron packaging.

### DR-007 — Integrated SR-016 docs and current Electron verification build

- Delivery round and trigger: Delivery restarted after `IR-012`, source review `CRR-016` Pass at `9.40/10`, API/E2E `API-REV-008` Pass at `96.9%`, and `CRR-017` Not Applicable because API-REV-008 changed no repository-resident durable coverage. The standing user request remained a README-guided Electron build for hands-on testing.
- Prior authoritative result: `DR-006 — Blocked / Local Fix`; its merge was aborted and no integrated docs/build state existed.
- Mandatory fresh refresh: `git fetch origin personal --prune` confirmed `origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117` was already the second parent of implementation merge `ea8dbfd2d4f78312806bee7a41f38daa6a0e9a06`. The branch was ahead `13`, behind `0`; no new base commit required another merge or pre-doc executable rerun.
- Delivery-safety checkpoint: The reviewed integrated merge, uncommitted IR-012 correction, CRR/API artifacts, and retained evidence were protected as local commit `7f02e49f6897b3c2715d2c7e2fb712a424514f82`. Afterward the branch was ahead `14`, behind `0`.
- Upstream integrated validation: API-REV-008 passed AppConfig `27/27`, core `24` with the opt-in live file skipped, server `91` with one platform skip, critical E2E `12/12`, web `33/33`, server/web builds, guards, real Chrome/Nuxt/built-backend journey, integrity, and cleanup. Delivery did not infer prior evidence forward.
- Docs sync: `Updated / Pass`. Delivery removed UUID/V2/secret-transfer documentation and promoted deterministic readable identity, strict V3 store invariants, exact selector/reset ordering, secretless transition and cleanup, provider-absent recreation, and unavailable-selector behavior into five long-lived docs.
- README basis: Root `README.md`, `autobyteus-web/README.md` macOS no-notarization and integrated-server sections, `autobyteus-web/AGENTS.md`, and `autobyteus-web/docs/electron_packaging.md`.
- Build command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* corepack pnpm -C autobyteus-web build:electron:mac`.
- Build result: `Pass`, exit 0, `2026-08-09T18:53:58Z`–`18:58:06Z`, package `1.4.45`, Electron `42.4.1`, Darwin arm64. Web/localization guards, shared/server compilation, Prisma generation, sanitized built-in-agent bootstrap, mobile/Electron Nuxt generation, integrated-server deployment, native rebuild, packaging, and blockmaps passed.
- Artifact verification: DMG checksum verification, ZIP integrity, Mach-O arm64 executable, packaged target/selected node-pty helper checks, real packaged node-pty spawn probe, and packaged built-server byte identity for AppConfig/readable migration/custom-provider store passed.
- Recommended artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.45.dmg`, SHA-256 `afbe2e992e082a00a79095f7d589c9219ea8c522594df9cb393a50ff78f1e5d6`.
- Post-build base confirmation: A fresh fetch retained `origin/personal@3cddeec6b93602da172fec2e7b9a80acc7c05117`; it remains an ancestor and divergence remained ahead `14`, behind `0` before delivery-only docs/artifact edits.
- Current authoritative result: `Pass — the current integrated SR-016 package is documented, packaged, and ready for explicit hands-on user verification.`
- Build posture: Local verification package, no Developer ID/team signature and no notarization; the root executable carries only an ad-hoc linker signature. Gatekeeper approval may be required. Delivery did not launch the app or mutate `~/.autobyteus/server-data`.
- Release/finalization state: Ticket remains under `tickets/in-progress`; no push, target merge, tag, release, publication, deployment, archive, or cleanup occurred. Explicit user verification remains required.
- Bounded residuals: Real Alibaba availability/credentials/quota/region/TLS/undocumented payload variation; ordinary recent-`RUNNING` delay; arbitrary interruption; approved unreachable old-secret orphan and stale-selector risks; POSIX-only permission semantics; possible future base divergence; package-wide typecheck configuration limitations; and local ad-hoc/non-notarized packaging.
- Next action: User tests the DR-007 DMG and explicitly accepts or reports a finding. Delivery must fetch the finalization target again before any archive, push, merge, release, deployment, or cleanup.

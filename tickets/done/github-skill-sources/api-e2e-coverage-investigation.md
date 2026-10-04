# API/E2E Coverage Investigation — github-skill-sources

> **Current: API-REV-002 Pass / 95%.** User excludes Windows and Electron-shell gates. Web/backend feature validation completed; see round-2 plan/checkpoint and conclusion below, and canonical execution report. Earlier Blocked/73.6% sections are retained **historical round-1 decisions**, superseded rather than erased. No current missing environment dependency.

## Scope and basis
Initial investigation, API round 1; 2026-10-04. Assigned worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources; branch codex/github-skill-sources; incoming HEAD 0bfd39f46. Large / High; Reviewed route. SR-006 / USER-APPROVAL-006, SR-008, ARCH-REV-002 Pass, IR-001 and CRR-001 source Pass. Historical ARCH-REV-001 is not the current verdict. No prior API result. Delivery and proportional API test-review artifacts: N/A — not applicable yet.

Full cumulative package read before this plan and before test changes/execution:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/approved-requirements-sr006.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/architecture-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/approval-request.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/design-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/architecture-review-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/implementation-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/implementation-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/code-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/code-review-revision-record.md`
- `evidence/local-checks.md` and reviewer command/result records inspected. Their execution remains attributed to upstream roles.
- Approval snapshot unchanged; no normative Product supplements. Screenshot is illustrative existing UI, not pixel authority.

## Instructions and execution discovery
- Root `AGENTS.md`, server/web `AGENTS.md`, root `TESTING.md` (only applicable testing guideline), root README local full-stack/testing sections; server README setup/build/tests; server package.json/vitest.config.ts/tests/setup/prisma-{env,test-config,global-setup}.ts; web package scripts/test conventions; docs/isolated-app-instances.md.
- Use `vitest run ... --no-watch`, web `test:nuxt ... --run`; ordinary server prebuild restores removed shared SDK outputs. Test-owned Prisma path: server/tests/.tmp/autobyteus-server-test.db, not user DB. No arbitrary .env credential edits.
- Full product journey requires current-worktree isolated desktop build and free reported ports; web-equivalent component probes are not that journey. Public GitHub read-only smoke may use disposable data; never mutate a remote fixture to manufacture an update.
- Follow normal source schema/GraphQL and real storage; inject remote responses only for deterministic revisions/faults. Do not count those as real GitHub or model-provider evidence.
- Services created for execution must have owned data/processes and cleanup receipts. Do not stop or reuse user app. Native Windows/Linux are separate evidence targets; current host is macOS.

## Changed surfaces
Domain/catalog; GitHub HTTPS/redirect/archive extraction; source persistence/publication and REMOVING lifecycle; GraphQL schema/client fragments/errors; renderer modal/store/file explorer; watcher/socket teardown; Codex/Claude/Grok-ACP native preparation and occurrence release; shared agent-package metadata regression. Electron shell is not changed directly, but full supported user journey requires isolated app under TESTING.md.

## Scenario-to-boundary plan
| Case | Approved authority | Scenario and real entry | Planned evidence |
| --- | --- | --- | --- |
| E-001 | AC-001–008, DS-001–008 | Existing source/catalog/archive/materializer checks | Narrow github + shared-owner tests, then affected server/web regression |
| E-002 | AC-001/002/003/004/005/006/007/008 | GraphQL import/check/update/remove/Reload, local source preservation and structured errors | Add durable GraphQL suite, real schema/owner/storage/archive, controlled fetch only; complete frontend selections |
| E-003 | AC-001/002/008 | Public root/collection import | Read-only live GitHub smoke with disposable catalog; no script execution |
| E-004 | AC-005/006/007, DS-007 | Restart/interruption/publication faults/REMOVING retry | Durable lifecycle via source commands; process-level restart probe if repository evidence leaves gap |
| E-005 | AC-005/007, DS-008, MP-001 | Import → run A → Update → actual header ＋/Send B, same workspace, A live | Current-worktree isolated desktop; production adapters, both scopes, retained/deleted g1, both release orders; controlled providers where justified, never label fixtures live models |
| E-006 | AC-001/005/006/007, DS-005 | Files open → return Sources → update → reopen/remove | Real explorer socket/watcher teardown and file freshness via owned stack |
| E-007 | AC-007 | Existing package/local/runtime-default collisions, transport and reload | Existing catalog, agent-package and skills GraphQL regressions |
| E-008 | AC-008; DS-008 | Archive/link/permission/deletion | Native Windows/Linux run if available; POSIX-host tests alone cannot prove Windows |

Unsupported multi-server shared-data writer and contrived simultaneous detail/Sources scenarios excluded; no confidence penalty for them. No requirement change.

## Existing durable coverage decisions
| Artifact (workspace-relative) | Decision | Valid scope / gap |
| --- | --- | --- |
| server tests/unit/skills/github/source-lifecycle.test.ts | Still Valid | Commands, archive-backed temp fixtures, root/collections, errors/publication/remove; simulated restart constructs owners, not process restart |
| server tests/unit/skills/github/archive-boundary.test.ts and github-client.test.ts | Still Valid | Malicious paths/PAX/link chains/cycles/modes, redirect/metadata; mock transport and host-specific filesystem |
| server tests/unit/skills/github/runtime-generation.test.ts | Still Valid | 15 shared-owner cases; release matrices/faults; not production adapter or header ＋/Send journey |
| server tests/unit/skills/services/*, disabled-skills-store.test.ts | Still Valid | Catalog/default/local choices and names retain approved meaning |
| server tests/unit/agent-execution/backends/{shared,codex,claude,grok,acp} affected skill/bootstrap tests | Still Valid | Adapter contracts and holder behavior; doubles bypass live preparation |
| server tests/e2e/skills/{skills-graphql,skill-name-catalog-graphql}.e2e.test.ts | Still Valid assertions; investigate fixture resets on execution | Real schema/catalog/local/package contract; new source singleton reset may be needed for test isolation, not production defect |
| server tests/integration/skills/skill-integration.test.ts | Still Valid | Local reader/edit/reload unaffected workflows |
| server tests/unit/agent-packages/{agent-package-service,agent-package-skill-name-validation,github-agent-package-installer,github-repository-source}.test.ts | Still Valid | Shared transport and package preservation regressions |
| server tests/unit/agent-packages/package-root-summary.test.ts | Out Of Scope baseline failure retained | Unchanged applicationCount expectation; do not weaken |
| server tests/unit/workspaces/workspace-manager.test.ts | Still Valid rebind; known setup failure separately retained | Cached root test is not watcher/socket proof; AgentRunManager baseline setup failure not source removal |
| web components/skills/__tests__/*; stores/__tests__/{skillSourcesStore,skillStore}.spec.ts | Still Valid | Controls/confirmations/store/fragments with mocked API; actual schema not exercised |
| unrelated runtime/provider/general suites | Out Of Scope unless affected boundary exposes need | No full-suite pass inferred |

## Durable coverage to add / update / remove
- Add `autobyteus-server-ts/tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts`: E-002, real GraphQL source lifecycle + complete source selections + conflict/failure retention + Reload. Mock only external responses; use real archive preparation/storage/catalog, deterministic revision changes, owned cleanup. Existing owner-only tests miss schema serialization and fragment integration.
- Any additional durable test or fixture update will be recorded before change. No stale coverage deletion planned. Existing tests retain authority only where current requirements validate assertions.
- Temporary live smoke E-003 is suitable as opt-in probe because external public revisions/layouts change; retain commands and responses, not a default network dependency.

## Repository execution order
1. `pnpm -C autobyteus-server-ts prebuild` (setup).
2. `pnpm -C autobyteus-server-ts exec vitest run tests/unit/skills/github tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/shared/workspace-skill-materializer-collision-policy.test.ts --no-watch`.
3. Add/run E-002, then affected skills API/integration, catalog/package/bootstrap and web components/stores.
4. Reassess scorecard and broader surface. Exact commands/logs/results will be appended; nothing executed yet by API owner.

## Ledger
Required: Yes, multiple independent cases and credible interruption risk. Canonical `api-e2e-test-case-ledger.md`, initialized now before execution.

## Confidence and broader-validation gate
Post-repository scorecard: pending execution (no percentage earned by upstream source-review score). All seven categories will be scored after repository execution. Critical acceptance directly proven: No. Default target ≥95% overall, each applicable ≥90%, every critical AC directly proven.
Broader validation: Required, not waived by fixture passes. Highest material gaps: GraphQL→storage integration, public archives, full future-run workflow, actual watcher/socket lifecycle, restart and platform behavior. Browser component fixtures alone cannot close them. Selected modes: API, lifecycle, isolated desktop, native-platform when available. Do not call a missing platform a product failure. Do not declare Blocked before safe setup/probes/emulation alternatives evaluated.

## Live environment / cleanup plan
Use smallest isolated source schema for deterministic API coverage; own temp app data and restore env/singletons/fetch after each case. Broader app: normal isolated-app start --build, record exact instance/ports, health readiness, keep evidence and stop exact instance. Credentials only through documented importer if actually required; fake external actors can prove adapter wiring but not live providers. No user-app effect permitted. Real GitHub requests read public repositories only and no downloaded instruction/script will be executed.

## Compatibility / persisted data
IR-001 clean-cut checks read. No old-location wrappers or dual authority allowed. Existing local paths and disabled-name array: Directly Usable — No Migration; package/run metadata Not Affected. Test representative current reader continuity; no invented migration. Generation updates/removal are explicit user-authorized loss, failure/cancel must retain prior usable install.

## Current decision
Proceed with coverage and execution. No reroute trigger yet. Durable addition planned; no removal. Investigation will be updated before rerouting any supported failure.

### E-002 harness correction before execution retry
Initial suite collected no tests: importing the web GraphQL module required Nuxt-only graphql-tag alias not present in server resolution. API-owned harness issue, not a product failure. Read actual gql template text from the production file and expand its single shared fragment, avoiding a copied selection and new package alias/dependency. Corrected controlled archive host to existing codeload /tar.gz/ URL (observed from implementation, before assertions ran). Restore AUTOBYTEUS_MEMORY_DIR changed by config setup. No production edits.

### E-007 regression findings and validity decision
Initial broader run: 27 files passed, 1 failed; 295 tests passed, 2 failed. Both assertions remain valid REQ-004/007 behavior. Investigation identifies fixture drift, not supported production failure: `skill-name-catalog-graphql.e2e.test.ts` resets SkillService while new SkillSourceService retains its first catalog/runtime-default matcher across temp CODEX_HOME cases; standalone case will confirm. Agent-package fixture passes fake HTTP only to installer, whereas extracted service metadata now belongs to GitHubRepositoryClient; check escapes fixture and returns CHECK_FAILED. Update test setup to reset the source owner and inject the same deterministic metadata transport into both real owners. No assertions or intended behavior removed. Also reset source singleton in `skills-graphql.e2e.test.ts` to prevent removed temp source registry capture. Changed durable paths declared before edits.
Web affected suite: 6 files / 28 tests Pass, mocked renderer evidence only (`evidence/api-web.txt`).

## Post-repository confidence decision (first checkpoint)
Focused: 91/91 pass. New GraphQL: 5/5 pass. Existing API regression after fixture corrections: 3 files / 19 pass. Broader initial run 295/297; two fixture drifts corrected and focused rerun green; full broader rerun pending. Web: 28/28 pass. Current-source server build and sanitized bootstrap pass.

| Mandatory category | Score | Evidence / unresolved gap | Evidence gain sought |
| --- | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 75% | Source API direct; actual runtime/product and restart incomplete | Live API + product |
| Changed-boundary execution directness | 75% | Real schema/files/archive; mocked transport, no HTTP/browser | Built server HTTP and real download |
| Cross-boundary integration realism and mock gap | 50% | Critical actual header/adapters untested | Production adapter journeys |
| Environment/configuration/identity/fixture fidelity | 75% | Owned macOS data; deterministic fixtures; no native Windows/Linux yet | Live archive and platform tests |
| Failure/edge/lifecycle/recovery | 75% | Owner-level faults/leases, API removal retry; no process interruption | Process restart/faults |
| User-surface/browser/desktop-shell | 50% | Mocked components and upstream rendered fixtures only | Isolated current-worktree app |
| Durable regression quality/relevance | 90% | Focused suites + actual frontend GraphQL selections; bounded new fixture corrections | Add integrated regression where needed |

Overall 70% (490/7); not a Pass, all critical ACs not directly proven. Broader validation **Required**. Modes: built-server HTTP/public GitHub, process lifecycle and isolated desktop. Build completed; next live smoke uses read-only public `blader/humanizer` (root) and `squirrelscan/skills` (collection), independently identified from GitHub repository references. No downloaded scripts/instructions executed. Docker engine reports Linux aarch64 available; no Windows runner identified, user asked for one. Native Windows cannot be inferred from simulated errors.

### E-008 Linux alternative
Available Docker Linux aarch64 engine and existing node:22-bookworm image enable native Linux kernel/filesystem checks without modifying shared containers. Temporary probe `evidence/probes/platform-filesystem.mjs` copies only four current built archive/path/link/materializer modules to private container /tmp; installs exact tar@7.5.22; runs as unprivileged node on container-local disk (not macOS bind-mount semantics), read-only worktree mount, --rm cleanup. Covers safe archive links/modes/no execution, traversal, substituted owner, 8 link-transfer/release combinations and real chmod permission denial/retry. This is focused Linux mechanism evidence, not native Linux full product or native Windows.


## Completed repository execution and final investigation decision
All commands from assigned worktree root; logs relative to this ticket.

| Command | Result | Evidence |
| --- | --- | --- |
| `pnpm -C autobyteus-server-ts prebuild` | Pass; restores shared build outputs | evidence/api-prebuild.txt |
| Focused command above | Pass 6 files / 91 tests | evidence/api-focused.txt |
| `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts --no-watch` | Initial collection error fixed in API harness; rerun 5/5 Pass | evidence/api-graphql-{initial,ready}.txt |
| `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/skills --no-watch` | Pass 3 files / 19 tests after unchanged-assertion fixture repairs | evidence/api-graphql-regression-ready.txt |
| Affected 28-file command below | Initially 295 pass / 2 fixture failures; final 297/297 Pass | evidence/api-regression.txt; evidence/api-regression-ready.txt |
| `pnpm -C autobyteus-web test:nuxt components/skills stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts --run` | Pass 6 files / 28 tests | evidence/api-web.txt |
| `pnpm -C autobyteus-server-ts build` | Pass including sanitized bootstrap | evidence/api-server-build.txt |
| `pnpm --silent isolated-app start --build` | Pass current-worktree packaged app, owned free ports/data | evidence/api-isolated-{build.txt,start.json} |
| `git diff --check` | Pass | report/cleanup record |

Exact affected regression command:
```sh
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/skills tests/integration/skills tests/unit/skills tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/shared/workspace-skill-materializer-collision-policy.test.ts tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/grok/grok-build-runtime-registration.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts tests/unit/agent-execution/backends/acp/acp-agent-run-backend-factory.test.ts tests/unit/agent-packages/agent-package-service.test.ts tests/unit/agent-packages/agent-package-skill-name-validation.test.ts tests/unit/agent-packages/github-agent-package-installer.test.ts tests/unit/agent-packages/github-repository-source.test.ts --no-watch
```

Fixture corrections resolved the observed failures without weakening assertions; no production edits. No full-suite pass claimed. Existing general tsconfig rootDir error, unchanged package-summary applicationCount mismatch, workspace-removal AgentRunManager setup failure remain upstream baseline limitations, not resolved or rerun here.

### Broader results and gaps
Real public API root/collection imports, duplicate variants, checks/Reload/removal pass. Current packaged UI duplicate/trust/cancel, managed remove/reimport and Files socket open/close pass; real restart retains exact source metadata. Native Linux mechanism probe passes 12 checks. Raw sources remain untrusted data, no downloaded script or model execution. Screenshots support DOM/API/log assertions, not replace them.

Broader decision at round end: **Blocked**, exact unavailable dependency **an isolated native Windows execution target**. Host Darwin arm64; available Docker contexts are local Unix sockets and selected engine is Linux aarch64. An owned Linux container was actually exercised, including real unprivileged permission failure. POSIX tests and injected Windows-style rename errors cannot provide native Windows directory-symlink/permission/delete proof. No Windows machine/CI connection or execution instructions supplied; user asked for one. Do not invent access, provision cloud/CI credentials or report Linux as Windows.

The round stops at that external-platform blocker. This does **not** mean all feasible remaining cases were attempted: full E-005 production-adapter/header ＋/Send matrix, actual update-generation explorer reopen, process interruption before/after publication, REMOVING process-restart and cross-source admission beyond owner fixtures are **Not Tested at their required integrated surfaces**, not declared infeasible. They remain API-owned work on resumption; Windows access alone will not produce a Pass. No product failure has been established in executed cases.

Final confidence 73.6% (515/7), authoritative scorecard in execution report; user-surface category increases from 50 to 75 with real packaged evidence, other anchors unchanged due still-material gaps. No critical-AC/95% waiver. Proportional test-code review required on eventual reviewed-route success, not requested on this Blocked result. No source or stale-test deletion; three durable test paths changed. No legacy/compatibility mechanism observed or protected by new tests.

## API-REV-002 execution plan — user scope correction (in progress)
User explicitly excludes native Windows testing and confirms this is a web-capable feature, not an Electron-shell feature. Windows and Electron-specific gates are **Out Of Scope**, not Blocked. Prior 73.6%/Blocked is historical, not the current execution status. No missing dependency currently prevents continued testing. No new product behavior requested; approved import/update/removal/current-reader guarantees remain.

Continue through ordinary Nuxt frontend + real built backend + fresh Chrome on owned free ports/disposable data, following the existing Projects real-stack probe setup. Do not use installed/user Electron. Preserve prior live public GitHub evidence; deterministic upstream revisions/failures will be controlled at outbound GitHub fetch in an owned backend process, not by mocking GraphQL or mutating public repositories. Add durable browser coverage for import/check/cancel/update/failure/retry/Reload/removal and real Files open/update/reopen/socket teardown. Add integrated current-adapter bootstrap/source-update coverage with only external provider calls controlled where necessary; no paid/live model requirement for skill installation. Keep source safety/failure integrity and existing collision assertions; no all-platform or full-suite claim.

Planned round-2 cases: E-006-web (real UI/API update and file freshness, owned browser/server), E-004-web (failed update preserves prior install, retry and removal), E-005-integrated (real source/current adapter preparation for later run; assess remaining browser new-chat evidence honestly), E-007-rerun (affected regression after durable changes). Record each attempt immediately; no final result/confidence until execution finishes. No external blocker at plan time.

### Round-2 repository checkpoint
`pnpm -C autobyteus-server-ts prebuild` Pass. Expanded GraphQL source suite 29/29 Pass: original five cases plus 24 actual adapter/source/file-lifetime combinations. Browser source harness and external GitHub/Codex fixtures are durable; no source changes. Full affected regression rerun follows. Final expanded web attempt will add process interruption during download and native host permission failure/removal restart retry to seven already-passing real web cases.
Post-repository round-2 scores: requirement 90, directness 95, realism 90, environment 95, lifecycle 90, user 90, durable 95; overall 92.1% (645/7). Broader validation Required for remaining direct lifecycle evidence. Windows/shell checks out of scope by explicit user direction.

## Round-2 final investigation conclusion
- Reused current approved product behavior and corrected validation surfaces per explicit user instruction; Windows/shell Out Of Scope. Old blocker withdrawn, no delivery/user approval inferred.
- Existing tests remain valid after the two narrow round-1 fixture repairs. Add Durable Coverage: actual source API→three adapters (24 combinations), and real Nuxt/backend/Chrome source/update/failure/new-chat/restart probe with external-only fixtures. No tests removed.
- Repository: 321 affected server +28 web Pass. Final broader browser attempt 8/8 Pass, no page errors, all owned children/data/ports released. Prior live public Github proof remains valid because source did not change.
- Actual header ＋/Send runs real Codex adapter/stdio with scripted external provider; Claude/Grok distinct preparation paths get direct integrated coverage, not falsely called live browser/model journeys. Process interruption and permission-failed removal/restart retry now directly proven. No exhaustive OS/crash/model matrix required for this feature.
- Final scorecard: all seven categories95%, mean95%. Requirement/directness/realism/env/lifecycle/user/durable evidence reasoning and exact commands in canonical report. Broader Required work completed; no current blocker.
- Proportional review required for all seven cumulative changed durable paths in report; send complete cumulative package via selected rule. No production source fixes.

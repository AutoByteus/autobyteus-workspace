# API/E2E Execution Coverage Report — github-skill-sources

## Latest authoritative result
**Pass — API-REV-002, round 2, final validation confidence 95%. No remaining testing blocker for the corrected feature scope.**
Task size **Large**, architectural risk **High**, reviewed route retained. Changed durable tests require proportional Code Reviewer review; this is not delivery approval, release or user verification.

## Scope correction and prior result
API-REV-001 was Blocked/73.6%; preserved in revision history and commit `5561d2cb3`. It stopped prematurely by elevating missing native Windows access into a ticket blocker while feasible web checks remained. User explicitly stated “We don't test Windows, not in the scope” and confirmed this feature can be tested via the web frontend and backend, without Electron-shell obligations. API owner accepts this correction: **Windows and Electron-specific testing are Out Of Scope, not Blocked**. No intended import/update/removal behavior was removed. The old Windows dependency request is withdrawn. These are corrected validation surfaces, not weakened data-integrity requirements or fabricated passes for unexecuted platforms.

Round 2 completed the real remaining feature checks rather than merely changing the label. No production code changed and no supported product defect was established. No new requirements approval is being requested for this execution correction.

## Cumulative authority and workspace
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources`; branch `codex/github-skill-sources`; finalization target `origin/personal`, unchanged.
- Incoming source review HEAD `0bfd39f46`; prior API evidence commit `5561d2cb3`. Source implementation remains `242f7bdac..432b255ac`.
- Approved requirements SR-006 / USER-APPROVAL-006; design SR-008; ARCH-REV-002 Pass current; IR-001 and CRR-001 active. Historical ARCH-REV-001 failure resolved upstream, not current.
- Authoritative current user validation-scope clarification: this conversation, 2026-10-04, summarized above. Carry it downstream; do not reinstate the obsolete Windows/shell gate.
- Delivery/revision report and proportional API test-review report: N/A — not applicable yet. Product-owned supplement: N/A — not applicable.

### Full upstream references
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/approved-requirements-sr006.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/architecture-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/approval-request.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/design-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/architecture-review-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/implementation-handoff.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/implementation-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/code-review-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/code-review-revision-record.md`

### Current API references
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/api-e2e-coverage-investigation.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/api-e2e-execution-coverage-report.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/api-e2e-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/tickets/in-progress/github-skill-sources/api-e2e-test-case-ledger.md`

## Execution basis and fixture fidelity
Read cumulative upstream package, root/server/web AGENTS and root TESTING.md, README local-stack instructions, isolated-app instructions (round 1), server/web manifests and Vitest setup. No closer testing guideline found. Followed the existing `projects-feature-probe.mjs` free-port, disposable-database, built-backend + Nuxt + Chrome execution pattern in round 2. No Electron startup or IPC mock is needed for this feature.

Owned setup: macOS arm64, Node 22, pnpm 10; temporary SQLite database migrated with normal Prisma deploy; built `dist/app.js --host 127.0.0.1 --port <owned-port> --data-dir <owned-data>`; Nuxt dev bound via BACKEND_NODE_BASE_URL; fresh headless Chrome/profile. Backend HOME, CODEX_HOME, memory/log/workspace and database paths are isolated. Only system baseline environment is carried. The built server is the current unchanged source previously built successfully in round 1; normal prebuild regenerated removed workspace SDK dependencies in round 2. No production rebuild is implied by the test-only edit.

The durable browser harness sends real GraphQL/HTTP and real explorer WebSockets. It does **not** mock frontend stores, schema, source/catalog owners, archive extraction, managed filesystem, runtime adapter, thread transport or run lifecycle. Outbound GitHub metadata/archive responses provide deterministic v1/v2 and network failure. A test-only external Codex CLI surrogate returns a model and scripted responses, reading the actual exposed SKILL.md bytes on thread/turn start. It never contacts a model service, requires credentials, executes skill scripts or claims inference-quality proof. Prior live public GitHub evidence separately proves external transport.

The adapter matrix enters actual GraphQL import/update and then real Codex/Claude bootstrappers or Grok's actual ACP backend factory/profile; current singleton materializers and catalog resolution are real. Agent/workspace lookup is a supplied fixture, Codex skills/list is controlled, Claude preparation does not invoke its external SDK, and Grok spawns the existing scripted ACP CLI. These are adapter preparation/ownership checks, not three live-model UI journeys. The common header/Send web path is directly tested once through real Codex transport; distinct adapter branches and both scopes are directly tested below rather than multiplying identical UI checks.

## Case reconciliation and AC proof
| Case / criteria | Evidence and observed result | Boundary / limitation |
| --- | --- | --- |
| E-001 / AC-001–008 | Existing focused source/archive/catalog/holder safety tests pass, included in final 321 | Deterministic valid and malicious archives, no script execution, conflicts, failure publication and genuine collision checks |
| E-002 / AC-001–007 | Original 5 GraphQL cases pass | Actual frontend document selections → schema → storage/archive; equivalent URL, mixed ownership, offline update, disabled choices, malformed registry and removal retry |
| E-005-integrated / AC-005/007, DS-008 | 24/24 new combinations pass | Codex/Claude/Grok × CONFIGURED/ALL_INSTALLED × old tree retained/deleted × either release order; both Codex discovery and expose branches. Old holder cannot remove newer link |
| E-007 / AC-004/007 | **28 server files / 321 tests pass** | Includes above 29 GraphQL tests; package shared transport, local/default catalog collisions and adapter regressions. Counts are not additive |
| E-001-web | **6 web files / 28 tests pass** | Component/Pinia regressions, not mislabeled full browser checks |
| WEB-001 / AC-001 | Import collection, expected count, old supporting file in Files, actual socket connect/close: Pass | Real web/backend; controlled upstream archive |
| WEB-002 / AC-003/005 | Source-open check detects v2; Cancel preserves v1 and local edit; archive request count stays one: Pass | Check never downloads/replaces |
| WEB-003 / AC-005 | Confirm Update with unavailable upstream: visible error; previous root, skill content and local edit retained: Pass | Real mutation; outbound network fault only |
| WEB-004 / AC-005/007 | Retry Update succeeds, additions/deletions refresh without restart, old tree/local edit removed; reopen Files shows version-2 support file, no old file: Pass | Actual watcher/workspace/cache rebind and UI |
| WEB-CHAT-A/B / AC-001/005/007 | Start first chat using v1; update; reopen it and press actual header ＋/Send in same workspace; second chat reads v2 while first remains active: Pass | Actual frontend/run server/Codex adapter/stdio; scripted external provider, not real inference. Closing first preserves second's link; closing second removes link |
| WEB-INTERRUPT / AC-005 | Kill owned backend with SIGKILL during observed next-version archive download; restart and verify exact previous root/revision/content still usable: Pass | Real process interruption; not exhaustive instruction-level crash simulation |
| WEB-005 / AC-006/007 | Reload and process restart preserve source; real host directory permission denial gives REMOVING, excludes skill; restore permission, restart again, UI Retry removal deletes source and preserves unrelated local skill: Pass | Actual filesystem error and persisted retry, no cleanup-method mock |
| E-003 / AC-001/002/003/006/008 | Round-1 live public root/collection import, duplicate/check/Reload/remove: Pass, still applicable | `blader/humanizer` SHA225a6f39ac85f76ee48dbad772ea4abe4ed6c9d8; `squirrelscan/skills` SHA dcf16bf83a4267fcf6a913e89ab9209072b28a94; no upstream writes |
| E-008 | Prior Linux native probe 12 checks Pass, supplementary | Windows **Out Of Scope**; no Windows claim. Prior packaged-app observations supplementary, not shell acceptance gates |

Final browser attempt `evidence/web-r2-final/result.json`: **8/8 cases Pass**, no page errors; actual version-two chat and updated Files screenshots inspected. Backend log corroborates watcher lease/session closure and source generation paths; provider.jsonl records different version bytes for the two threads in the same workspace. Earlier progressively expanded attempts all pass at their stated scope (5, 7, 8 cases); final attempt also isolates backend HOME and verifies both ports released. No hidden failing attempt in round 2.

Existing cross-source transaction/admission assertions and publication-failure tests remain in affected suites. The one-user/two-tab contrived race was not introduced. Process probe covers an actual interrupted download; synchronous before/after registry publication fault injection remains repository evidence, not an exhaustive process kill matrix.

## Commands and evidence
All commands below run from the assigned root. Logs live in the ticket evidence directory.
```sh
pnpm -C autobyteus-server-ts prebuild
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts --no-watch
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/skills tests/integration/skills tests/unit/skills tests/unit/agent-execution/backends/shared/workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/shared/workspace-skill-materializer-collision-policy.test.ts tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts tests/unit/agent-execution/backends/grok/grok-build-runtime-registration.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts tests/unit/agent-execution/backends/acp/acp-agent-run-backend-factory.test.ts tests/unit/agent-packages/agent-package-service.test.ts tests/unit/agent-packages/agent-package-skill-name-validation.test.ts tests/unit/agent-packages/github-agent-package-installer.test.ts tests/unit/agent-packages/github-repository-source.test.ts --no-watch
pnpm -C autobyteus-web test:nuxt components/skills stores/__tests__/skillStore.spec.ts stores/__tests__/skillSourcesStore.spec.ts --run
node autobyteus-web/tests/e2e/github-skill-sources-probe.mjs tickets/in-progress/github-skill-sources/evidence/web-r2-final tickets/in-progress/github-skill-sources/api-e2e-test-case-ledger.md
```
Use a **fresh output directory** for reruns; the browser probe refuses existing output. Its header documents build/dependency/Chrome prerequisites. It executes normal Prisma migration, backend and Nuxt child commands internally, retains logs and always cleans its owned processes/data. No paid/provider secret setup required.

- `evidence/api-r2-prebuild.txt`: Pass.
- `evidence/api-r2-adapters-initial.txt`: 1 file / 29 tests Pass.
- `evidence/api-r2-regression.txt`: 28 files / 321 tests Pass.
- `evidence/api-r2-web-unit.txt`: 6 files / 28 tests Pass.
- `evidence/api-r2-web-final.txt` and `evidence/web-r2-final/`: browser summary, real GraphQL requests, socket records, screenshots, backend/frontend/migration logs, provider byte receipts and GitHub request records.
- Prior full execution evidence remains under `evidence/api-*`; exact round-1 commands in coverage investigation and git history `5561d2cb3`. Reviewer and implementation evidence remain separately attributed, not independently relabeled.

No full-suite or global typecheck pass claim. Upstream documented baseline tsconfig rootDir, package-summary applicationCount expectation and workspace-removal AgentRunManager setup issues were not weakened or silently fixed. No relevant implementation assertion was removed.

## Confidence and broader-validation decision
Scores describe evidence completeness, not statistical software correctness. Simple average across all seven applicable categories.
| Category | Round-2 repository checkpoint | Final | Evidence / bounded residual |
| --- | ---: | ---: | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | All current ACs covered across actual source API/UI and appropriate safety/regression layers; arbitrary third-party layouts excluded |
| Changed-boundary execution directness | 95% | 95% | Real UI/HTTP/files/socket/run preparation; only external upstream/provider responses controlled |
| Cross-boundary integration realism/mock gap | 90% | 95% | Public GitHub live proof plus deterministic updates, actual header/Send/stdio and all adapter preparations; no live model-quality claim |
| Environment/configuration/identity/fixture fidelity | 95% | 95% | Owned web stack and database, isolated HOME, exact source identity; Windows/shell excluded, not penalized |
| Failure/edge/lifecycle/recovery evidence | 90% | 95% | Network failure, archive/registry/name faults, real interrupted download, permission-denied deletion/restart retry, both holder release orders |
| User-surface/browser confidence | 90% | 95% | Real Sources/Files/new-chat UI with semantic and API/filesystem assertions; no Electron-specific claim |
| Durable regression quality/relevance | 95% | 95% | Seven narrow changed test/harness files, actual frontend documents, reusable deterministic real-stack probe, unchanged legacy assertions |

Post-repository checkpoint **92.1% (645/7)** → final **95% (665/7)**. No applicable category below90. Critical current feature behavior has direct evidence; no unresolved material testing blocker. Broader validation was **Required and completed**, not waived because unit tests passed. Remaining negligible uncertainty: external service version variation and general third-party content diversity; unsupported platforms/shell/inference-quality certification not part of this ticket.

## Every changed durable test path (cumulative API stage)
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/autobyteus-server-ts/tests/e2e/skills/github-skill-sources-graphql.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/autobyteus-server-ts/tests/e2e/skills/github-skill-runtime-harness.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/autobyteus-server-ts/tests/e2e/skills/skill-name-catalog-graphql.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/autobyteus-server-ts/tests/e2e/skills/skills-graphql.e2e.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/autobyteus-web/tests/e2e/github-skill-sources-probe.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/autobyteus-web/tests/e2e/fixtures/github-skill-upstream.mjs`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/github-skill-sources/autobyteus-web/tests/e2e/fixtures/skill-codex-app-server.mjs`

- New GraphQL suite: five lifecycle cases plus 24 integrated adapter combinations; helper owns adapter fixture/process cleanup.
- Two existing skills API suites: source-service singleton reset and extracted GitHub-client fixture injection; original assertions preserved.
- New web probe and two fixtures: real UI/API/update/new-chat/failure/restart; only external GitHub/Codex responses controlled.
- Removed durable tests: none. Production source changes: none. Test-review decision: **Required — proportional review for Large/High route**.

## Compatibility, data and cleanup
Existing local registrations/files and surviving enable choices remain directly usable without migration; package/run history not affected by feature. Real current-reader restart and local preservation tests pass. No legacy compatibility wrapper, dual reader or migration test introduced. No source/behavior revision needed.

Final isolated browser stack used backend60316/frontend60317 and owned root `github-skills-web-OkPnd4`; result receipt proves Chrome closed, all children stopped, both ports released and private data removed. An owned backend was intentionally SIGKILLed for the interruption case; replacement process remained owned and was stopped. Temporary directory permissions restored before retry/cleanup. External fake CLI descendants share owned backend groups; no user's provider process or installed app was used. Prior isolated Electron instance and Linux container were already removed in round1. Generated untracked SDK build outputs are removed after checks (normal prebuild regenerates them). Ignored current build artifacts retained, not released.

Durable fixtures remain under repository tests. Prior temporary probes under ticket evidence/probes remain as reproducible evidence, not default suites. All logs/screenshots/JSON retained; text-log trailing whitespace may be normalized before commit without changing diagnostics.

## Handoff-rule evaluation
Called `get_handoff_rules` after final artifact persistence. Selected the single matching rule: API/E2E Pass + Large/High + changed durable tests → `/code_reviewer`. Proportional test-code review is requested with the complete cumulative package and all seven changed durable paths. No failure-origin or direct-delivery rule applies. Sending confirmation is recorded by the tool receipt, not presumed here.

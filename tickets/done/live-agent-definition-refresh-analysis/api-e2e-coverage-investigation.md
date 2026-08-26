# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/design-spec.md`
- Supplemental Task Artifacts: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/ui-ux-spec.md`
- Solution Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/solution-revision-record.md`
- Design Review Report: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/design-review-report.md`
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/implementation-revision-record.md`
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-report.md`
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/code-review-revision-record.md`
- Delivery Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/delivery-revision-record.md` (`DR-002` is historical pre-failure context)
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis/tickets/in-progress/live-agent-definition-refresh-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Investigation Round: `4`
- Trigger: `CRR-010` source Pass for `IR-006`, resolving implementation-owned `CR-F-004`, plus the `CRR-009` split assignment of `CR-F-005`–`CR-F-007` to API/E2E.
- Prior Investigation Reviewed: `Yes` — API-REV-003's SR-005 real-stack failure and CRR-009 pre-edit classifications were rechecked before any durable edit.
- Latest Authoritative Investigation: This document; it supersedes the API-REV-003 Fail plan while the revision record preserves that history.

## Current Requirement And Design Basis

The approved behavior is the revision-free sequential user journey from `SR-005`/`ARCH-REV-004`, preserving SR-004: Stop or Application terminal release completes; Settings performs a network-fresh owner-aware read; active General runs and nonterminal Application bindings remain locked; only schema-supported `llmConfig` fields are editable; Save keeps the identity stopped; a later General/browser message restores the same identity and uses the persisted values. There is no multi-tab, browser-timing, revision-token, rebase, hand-speed, or cross-owner simultaneous-call contract.

`IR-006`/`CRR-010` additionally establish the current Codex producer contract: a non-empty all-string parameter-list field with `type: "enum"` and `enum_values` normalizes once into the existing UI `type: "string"` plus enum-membership contract. Advertised members such as `reasoning_effort=low` must render, validate, Save, persist, and reach later provider use. Unsupported values and malformed mixed enums remain fail-closed.

`CRR-009` confirmed that production Studio composition and the real stack were correct while multiple in-process GraphQL E2E fixtures were incomplete or stale. The test harness must register the complete Studio application service object without weakening production `requireConfiguredServices`; obsolete singleton APIs, manager methods, query fields, and inconsistent synthetic Application provenance must be replaced with current contracts. File-explorer and token-analytics expectations remain valid and require deterministic root-run execution rather than changed product assertions.

Implementation-handoff scope checks are clean: no backward-compatibility mechanism is introduced, and `IR-006`'s persisted-data decision is `Not Affected` because only transient catalog normalization changed.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Current Codex parameter-list enum normalization | Changed | `IR-006`, `CRR-010`, prior `API-E2E-F-001` | Recheck the exact real payload in shared durable web coverage and the no-interception browser Save/restore journey. |
| Studio GraphQL resolver composition in in-process E2E | Changed test setup, production preserved | `CR-F-005` | Register a complete service object in one reusable E2E helper; unused boundaries fail loudly; production fail-fast remains unchanged. |
| Agent/Team definition, private-skill, workspace, and migration fixtures | Changed test fixtures | `CR-F-006` | Replace removed APIs/fields/capabilities and synthetic Application provenance with current supported contracts. |
| File-explorer child-process probe | Changed test synchronization | `CR-F-007` | Wait for child `close`, not `exit`, so final stdout is observed under root-suite pressure. |
| Token analytics GraphQL result handling | Changed test diagnostics | `CR-F-007` | Assert GraphQL errors are absent before reading data; retain all analytics expectations and prove the full token folder/root order. |
| SR-005 Application lease/release/startup/reentry and exact General lanes | Preserved | `IR-005`, `CRR-007`, API-E2E-007/008 | Retain existing focused durable evidence; do not add browser concurrency or cross-owner simultaneous-call scenarios. |
| Existing launch/definition paths and fixed identity fields | Preserved | REQ-001/006/014/015; AC-014/015 | Root and browser checks must show only authorized `llmConfig` changes. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Preserved but relevant | General/Application ownership, stopped mutation, canonical read | Application ownership integration; Studio/service tests; root E2E | None after current focused/root checks | Live browser for end-to-end use only |
| API / transport / contract | Yes | Studio GraphQL composition and stopped Team mutation | 15-file focused durable set; canonical root E2E | Real frontend request/response and returned canonical tree | Browser + live API |
| Frontend component / state | Yes | Current Codex enum normalization and Save gate | `llmConfigSchema`/`RuntimeModelConfigFields`/Agent+Team form tests | Actual dynamic catalog payload, rendered control, user selection, Save | Browser |
| Browser integration / user journey | Yes | Stop -> Settings -> low -> Save -> canonical reload -> later message | No durable real-provider browser fixture is appropriate | Previous API-REV-003 failed only here | Browser |
| Authentication / session / permissions | No | Local development stack has no changed auth boundary | N/A | None | None |
| Desktop renderer / web-equivalent UI | Yes | Nuxt renderer used by Electron | Component coverage and web build | Fully composed user journey | Browser-preferred |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package lifecycle change | Electron shell is outside the changed boundary | None material | None |
| Process / lifecycle | Yes | Team launch, Stop, later restore, final Stop | Lifecycle lanes and root E2E | Real Codex process/thread and WebSocket traffic | Browser + live process |
| Persisted-data transition | No new transition | Current Team execution tree receives narrow `llmConfig` change | Stopped-update E2E, migration E2E, root suite | Physical file and post-Save fresh read | Live API/file evidence |
| Worker / queue / distributed coordination | No distributed change | Per-ID General lanes and Application lease remain local | Existing focused coverage | Multi-node explicitly out of scope | None |
| External integration | Yes | Actual local package and real Codex App Server / GPT-5.4 | Catalog/bootstrapper tests | Provider actually accepts the restored config and responds | Browser + real provider |

## Project Execution Discovery

- Assigned worktree: `/home/autobyteus/workspace/autobyteus-workspace-live-agent-definition-refresh-analysis`
- Project stack: pnpm workspace; TypeScript/Fastify/GraphQL/Prisma/SQLite backend; Nuxt/Vue frontend; Electron shell; Vitest; Playwright Core with system Chromium; Codex App Server runtime.
- Required local external source: `/home/autobyteus/workspace/autobyteus-agents`.
- Credentials/runtime: a working local Codex App Server/GPT-5.4 path was available; no secret value was recorded.
- Known project instruction issue: `pnpm typecheck` includes `tests` while `rootDir` is `src`, producing repository-wide TS6059 errors already recorded by `IR-005`; production `tsconfig.build.json` remains the authoritative successful TypeScript build path.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Server execution/testing | Use pnpm; focused Vitest first; production build through package scripts. |
| root `package.json` | Canonical broad E2E | `pnpm test:e2e` delegates to the complete server `tests/e2e` run. |
| `autobyteus-server-ts/package.json` | Shared preparation/build | `prepare:shared`, `build`, Vitest setup, Prisma generation. |
| `autobyteus-web/package.json` | Frontend build/development | `pnpm build`; Nuxt dev; browser probes; Electron separate. |
| `autobyteus-web/nuxt.config.ts` | Development endpoints | Explicit backend HTTP/WS endpoint overrides are required to isolate from the repository `.env` defaults. |
| API/E2E skill | Runtime safety | Own ports/data, prefer browser for web-equivalent Electron behavior, do not disturb unrelated processes/data, clean only owned resources. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Shared packages | workspace root/server pre-scripts | `pnpm prepare:shared` | Generates local SDK outputs | command exit 0 | remove validation-generated SDK `dist` outputs |
| Built backend | `autobyteus-server-ts` | `pnpm build`; `node dist/app.js --host 127.0.0.1 --port 38123 --data-dir <owned>` with explicit isolated `DATABASE_URL`, data/memory/temp roots | Owned SQLite and files under `.autobyteus/development`; inherited production variables explicitly overridden/unset | `/rest/health` | Ctrl-C; remove only owned data |
| Frontend | `autobyteus-web` | `pnpm build`; Nuxt dev on `127.0.0.1:33123` with every backend HTTP/WS endpoint set to `38123` | Real source UI, not an intercepted fixture | HTTP 200 plus loaded semantic manager DOM | Ctrl-C; remove generated Nuxt cache |
| Browser | workspace root | system Chromium through `playwright-core` | One real headless tab, 1600x1000, no `page.route` or GraphQL interception | semantic DOM, GraphQL, WebSocket, screenshot assertions | browser close |
| External package | `/home/autobyteus/workspace/autobyteus-agents` | import through Settings UI | Read-only source; exact path | 7 shared agents / 50 team-local agents / 12 teams / 0 applications | validation data removal; source Git remained clean |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` for IR-006; existing current Team-run packages remain directly usable under SR-005.
- Representative evidence: current V2 Classroom execution tree; V1 production-upgrade E2E with General provenance; stopped mutation returning and physically persisting the current tree; network-fresh reread; later restore.
- Migration-specific evidence: the existing Team V1 production upgrade remains in the canonical root suite, now without invalid synthetic Application provenance.
- Compatibility fallback observed: None.
- Upstream ambiguity/reroute: None.

## Existing Durable Coverage Inventory And Current Decisions

| Path / Scenario | Intent | Validity Decision | Current Evidence / Action |
| --- | --- | --- | --- |
| `autobyteus-web/utils/__tests__/llmConfigSchema.spec.ts` and `components/launch-config/__tests__/RuntimeModelConfigFields.spec.ts` | Exact Codex enum producer shape, allowed/unsupported/malformed values, launch/Settings shared control | Still Valid | CRR-010 focused 2 files / 15 tests passed; real browser confirms the exact path. |
| Agent/Team existing-run stores/forms | Network-fresh stopped editing, fixed fields, validation, Save state | Still Valid | Prior focused web suites and current real browser pass. |
| `tests/integration/run-history/application-owned-studio-run-model-config.integration.test.ts` | SR-005 Application lease/release/startup/reentry | Still Valid | API-REV-002/CRR-007 evidence remains current; root suite passes. |
| Nine GraphQL E2E files listed under CR-F-005 | In-process schema/API scenarios | Needs Update -> Updated / Still Valid | Complete Studio service helper registered; focused and root pass. |
| Agent-Team definitions/private skills/workspaces/migration fixtures under CR-F-006 | Current definitions, runtime capabilities, manager/query/migration contracts | Needs Update -> Updated / Still Valid | Current supported APIs/fields/capabilities/provenance; focused and root pass. |
| File-explorer WebSocket lifecycle | Descriptor/lease/spawn health | Still Valid; synchronization updated | 3/3 focused and canonical root pass. |
| Token-usage analytics | Date ranges, filters, buckets, cost | Still Valid; diagnostic assertions updated | analytics 3/3, full token folder 9 files / 24 tests, canonical root pass. |
| Revision/multi-tab/rebase/hand-speed scenarios | Obsolete browser concurrency policy | Stale / Remove concept only | No repository-resident current test retained or added; no replacement. |
| Cross-owner simultaneous Studio/Application call | Disallowed by lease barrier | Out Of Scope | Sequential ownership states only. |

## Durable Coverage Added Or Updated

### Added helper

- `autobyteus-server-ts/tests/e2e/helpers/studio-application-api-services.ts` — reusable complete Studio service registration for in-process GraphQL E2E. Current definition authorities are real process services; unused service boundaries fail loudly and scenarios may provide explicit overrides. Production fail-fast behavior is unchanged.

### Updated files

- `tests/e2e/agent-definitions/agent-definitions-graphql.e2e.test.ts`
- `tests/e2e/agent-definitions/agent-package-private-skills.e2e.test.ts`
- `tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`
- `tests/e2e/agent-definitions/json-file-persistence-contract.e2e.test.ts`
- `tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts`
- `tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`
- `tests/e2e/external-channel/external-channel-setup-graphql.e2e.test.ts`
- `tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts`
- `tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts`
- `tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`
- `tests/e2e/runtime/configured-skill-on-demand-loading.e2e.test.ts`
- `tests/e2e/token-usage/token-usage-analytics-graphql.e2e.test.ts`
- `tests/e2e/workspaces/archive-run-history-graphql.e2e.test.ts`
- `tests/e2e/workspaces/workspace-run-history-graphql.e2e.test.ts`
- `tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`

No durable file was removed. Obsolete fields/synthetic provenance were removed only from current retained fixtures/queries.

## Repository Coverage Execution Plan And Results

| Order | Command / Scope | Working Directory | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm prepare:shared` | server/workspace | Local shared package prerequisite | Pass | retained in focused/build logs |
| 2 | CR-F-005 nine-file focused run, followed by corrected workspace rerun | server | Complete Studio registration and current workspace query | Pass after fixture correction | `cr-f-005-focused.log`, `workspace-run-history-focused.log` |
| 3 | Agent-Team/private-skills/workspaces focused runs | server | CR-F-006 current APIs/capabilities | Pass | `cr-f-006-focused.log`, `agent-team-definitions-focused.log` |
| 4 | Team V1 production-upgrade E2E | server | Current General provenance and migration | Pass — 1 file / 4 tests | `team-v1-migration-focused.log` |
| 5 | File-explorer + token analytics; full token folder | server | CR-F-007 process/order/resource isolation | Pass — 2 files / 6 tests; 9 files / 24 tests | `cr-f-007-focused.log`, `cr-f-007-token-folder.log` |
| 6 | Consolidated changed durable set | server | All CR-F-005–007 changes together | Pass — 15 files / 78 tests | `durable-coverage-focused-final.log` |
| 7 | `pnpm typecheck` | server | Repository typecheck script | Known configuration failure — TS6059 for all tests outside `rootDir: src`; not introduced here | `server-typecheck.log`; same limitation documented by IR-005 |
| 8 | `pnpm test:e2e` | workspace root | Canonical complete server E2E | **Pass — 56 passed / 14 skipped files; 201 passed / 51 skipped tests** | `root-pnpm-test-e2e-rerun.log` |
| 9 | `pnpm -C autobyteus-server-ts build` | workspace root | Production backend TS/assets/bootstrap | Pass | `backend-build.log` |
| 10 | `pnpm -C autobyteus-web build` | workspace root | Production Nuxt renderer build | Pass | `frontend-build.log` |
| 11 | `git diff --check` | workspace root | Patch hygiene | Pass | final command output |

## Post-Repository Confidence Scorecard

This score is intentionally recorded before the required real browser rerun. The canonical root suite and both production builds are green, but API-REV-003 demonstrated that repository tests alone could miss the exact catalog-to-user path.

| Confidence Category | Score | Support | Remaining Uncertainty | Improvement |
| --- | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | Direct server ownership/persistence tests, IR-006 shared UI regressions, clean root suite | Exact real stopped Codex Save/later use still needed | Real browser journey |
| Changed-boundary execution directness | 95% | Exact normalizer, resolver, migration, process and canonical E2E checks | Repository fixtures do not prove the actual dynamic catalog in the UI | Real browser/catalog |
| Cross-boundary integration realism and mock gap | 91% | Root E2E and production builds cross broad real boundaries | Nuxt/backend/provider not yet composed in this round | Composed no-interception stack |
| Environment/configuration/identity/fixture fidelity | 90% | Current process authorities and project fixtures | Exact external package/team/provider identity still to prove | Exact local package import and provider |
| Failure/edge/lifecycle/recovery evidence | 95% | Active/released ownership, fail-closed services, migration, root lifecycle coverage | Real Stop/Save/restore/final Stop still to rerun | Browser lifecycle |
| User-surface/browser/desktop-shell confidence | 82% | Shared component/form tests and production web build | Critical prior browser failure not yet rechecked | Real Chromium tab |
| Durable regression coverage quality/relevance | 97% | One reusable helper, current fixtures, 15/78 focused, full root pass | External provider/package browser journey remains temporary by necessity | None material after live rerun |

- Overall post-repository confidence: `91.7%` (`642 / 7`).
- Calculation: simple average; critical-acceptance and weak-category gates checked separately.
- Every critical acceptance criterion directly proven at this stage: `No` — API-E2E-009's real stopped Codex Save/later use remained pending.
- Applicable category below 90%: `Yes` — user-surface/browser confidence at 82%.
- Default 95% target met: `No`.
- Broader validation decision: `Required`.

## Broader Validation Decision

- Decision: `Required — completed successfully in API-REV-004`.
- Selected mode: real Browser + Live API + lifecycle/process + actual Codex provider.
- Confidence gap: API-REV-003's exact real Codex `type: enum` Save failure and the need to prove persistence plus later provider use, not merely component validity.
- Expected evidence gain: close the catalog/mock gap across actual package import, Nuxt, GraphQL, current SQLite/files, WebSocket, restore, and GPT-5.4.
- Browser rationale: this is web-equivalent Electron renderer behavior and the user explicitly requested real user-style tab interaction. No shell-specific behavior changed, so actual Electron execution would add risk without relevant evidence.

## Live Environment And Fixture Plan

- Start freshly built backend on owned `127.0.0.1:38123` and Nuxt on owned `127.0.0.1:33123`.
- Explicitly override inherited production `DATABASE_URL`, data/memory/temp roots, package roots, internal URL, and every frontend HTTP/WS endpoint. Use validation-owned `.autobyteus/development` SQLite/files.
- Import exact `/home/autobyteus/workspace/autobyteus-agents` through the real Settings UI; do not mutate the source.
- Use the real Classroom Simulation Team, Codex App Server, GPT-5.4, and the actual rendered `reasoning_effort` select.
- Journey: import -> render details -> Run -> Stop -> open Settings -> select `low` -> prove no validation error/Save enabled -> Save -> assert `UPDATED` and canonical low tree -> reopen Settings network-fresh -> assert low -> later message -> assert real assistant response and WebSocket traffic -> final Stop.
- Capture semantic JSON, GraphQL variables/responses, WebSockets, screenshots, build/service logs, persisted tree hash, provider raw-trace hash, and final inactive query.
- No `page.route`, GraphQL interception, manual database injection, synthetic catalog payload, browser concurrency, or multi-user behavior.
- Cleanup owned Chromium, Nuxt, backend, ports, generated SDK/Nuxt output, and validation data only. Keep external source read-only.

A setup preflight initially inherited the container's production `DATABASE_URL` despite the isolated `--data-dir`. The exact imported validation package was removed through the real UI, `/home/autobyteus/data/.env` was verified back at its original single package root, and no run was launched there. The authoritative run began only after explicit database/data/memory/temp/package-root isolation and log verification of the owned `development.db`.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Runtime | Behavior | Why Temporary |
| --- | --- | --- | --- |
| API-E2E-009 | `full-stack-classroom-sr005-rerun/run-full-stack-classroom-rerun.mjs` | Exact real user journey and provider response | Depends on an external local package, local Codex installation/session, and live provider; durable unit/API coverage protects stable contracts. |
| API-E2E-009 verification | `verify-final-state.mjs` | Read-only final GraphQL/file/trace correlation | Evidence-only cross-boundary probe; no product fixture injection. |

## Not Tested / Infeasible / Deferred

| Boundary | Reason | Risk / Follow-Up |
| --- | --- | --- |
| Multi-tab/user, hand-speed, revision/rebase | Explicitly excluded by SR-005 | None; do not add. |
| Cross-owner simultaneous calls | Nonterminal Application lease makes Studio Save ineligible | Sequential owner states are the contract. |
| Multi-node ownership | No distributed contract | Out of scope. |
| Electron preload/IPC/window/package behavior | No shell change | Browser directly proves the changed renderer/server path. |
| Paid Claude remote response | No configured credential was established in prior rounds; Claude boundary unchanged by IR-006 | Existing durable Claude adapter/session coverage retained; no new blocker. |

## Ambiguities Or Reroute Triggers

None. `CR-F-004` is resolved by reviewed source. `CR-F-005`–`CR-F-007` are resolved by the durable harness/fixture/synchronization changes and clean focused/root execution. Any new failure would route through `/code_reviewer`, but none remains.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — completed`.
- Repository-resident durable coverage added/updated/removed: `Yes` — one helper added, fifteen E2E files updated, none removed.
- Post-repository confidence: `91.7%`.
- Broader validation decision: `Required — completed successfully`.
- Reroute required before execution: `No` after CRR-010.
- Next recipient: `/code_reviewer` for proportional review of the changed durable test code.
- Notes: the latest final result and confidence are authoritative in `api-e2e-execution-coverage-report.md`; this investigation records the pre-edit decisions and post-repository gate.

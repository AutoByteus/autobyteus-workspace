# API/E2E Coverage Investigation — TEAM-PACKAGE-READ-20260915-001
## Meta / authority
Round 1, new ticket, no prior API result/confidence. Current API revision N/A until completed API-REV-001. Trigger CRR-001 source Pass / IR-001. All canonical upstream files in this directory reviewed: requirements-doc.md (SR-006 approved), investigation-notes.md, solution-revision-record.md (SR-007), design-spec.md (DS-REV-002), solution-handoff.md, bootstrap-handoff.md, package-inventory.json, design-review-report.md / architecture-review-revision-record.md (ARCH-REV-001), implementation-handoff.md / implementation-revision-record.md, code-review-report.md / code-review-revision-record.md. Product/Delivery artifacts N/A. Prior tickets and withdrawn REQ-004/superseded DS-001 not authority.
Worktree tolerant-flat-team-package-reading; HEAD c95ef93f8c9042c2174b814c205f00173b816004 PLUS reviewed uncommitted working files. All19 manifest entries/deletions independently matched, validation/api-intake-manifest.json. Do not test HEAD alone. No staging/commit authorized.
## Routing
Medium / High, Reviewed; successful route Code Reviewer for separate proportional test review (no API durable edits currently planned; reviewer may record Not Applicable). Failure uses current rule. No Delivery success inferred.
## Requirements / changed boundaries
| Behavior | Change and preserved obligation | Evidence plan |
|---|---|---|
| BEH001 / AC001a-b | Team raw input generic known-field projection in codec/3 consumers; strict required meaning/current writer retained | R01/R02, B01 real import/catalog/select, B02 defaults |
| BEH002 / AC002a-c | absent/null default equivalent; malformed supplied values and incomplete launch still rejected; no source rewrite | R01/R02, B01 hashes, B02 user launch |
| BEH003 / AC003a-b | real scoped Agent lookup, whole-parent exclusion and sibling availability; no nested conversion | R01/R02, B01 exact supplied5/7/2 |
| BEH005 / AC005a-b | remove authored migration only; retain runtime ID/prerequisite/ledger/locators/history/continuation | R01/R02, B03 actual seeded full startup + B04 browser history/attachment/Send |
Domain/provider/read contract changed; API facades and frontend unchanged but real integration material. Process lifecycle/persisted migration HIGH risk. Browser/web-equivalent Electron affected through catalog and history; shell/IPC unchanged N/A. Authentication unchanged; local provider/auth availability must be verified, never fabricate. Worker/queue external inference not changed; real continuation proves relevant existing seam only.
## Discovery / environment instructions
Read server AGENTS.md, server README.md (build, --data-dir, startup Prisma then app-data migrations; secrets via Settings, never ambient credentials), web AGENTS.md/README.md (Nuxt BACKEND_NODE_BASE_URL proxy; test:nuxt --run), root/server package.json, server vitest.config.ts (forks, serial files, Prisma setup), test-support/live-e2e/test-runtime-bootstrap.mjs (sanitized environment, owned tests/.tmp and db roots, listening marker). Skill/templates read from workspace-superrepo root; no skill or live-e2e README exists at guessed worktree path, corrected to actual module instructions.
Commands: pnpm -C autobyteus-server-ts prepare:shared; exec vitest run <paths> --no-watch; build. Browser Nuxt dev --host127.0.0.1 --port<owned>, backend built app with new data-dir, unique db and loopback port. Existing dependencies/Prisma generated; shared SDK dist absent and must regenerate. Fresh owned ports/processes only; never user server. Exact PIDs/paths readiness and cleanup logged when created.
Data: external /Users/normy/autobyteus_org/autobyteus-agents read-only REAL package, no copies with fabricated avatar/default corrections. Hash full authored paths/names/assets before/after. Separate minimum owned synthetic authoring/default controls and historical execution fixture are legitimate setup, clearly distinguished from external acceptance. Existing test fixture helpers provide released runtime shape. No user data copied. Native Agent definition still required; enclosing Team/Org fresh instruction must not be required on historical restore. No all-provider claim.
## Persisted transition
Definitions Directly Usable—No Migration when valid. Seven missing-avatar remain invalid, Northstar/department unresolved scoped Agent remain unavailable. Runtime/history existing Migration Required, not new migration/replay. Verify first startup supported stored tree/sidecars/attachment/history becomes current; native flat zero-write; restart keeps completed family ledger untouched and old authoring rows inert. No reversal/partial authored repair obligation. Normal canonical saves/transactions retained.
## Durable inventory / validity decisions
All paths server-relative tests/unit unless noted.
| Scenario/path | Decision | Rationale/action |
|---|---|---|
| agent-team-definition/agent-team-definition-config.test.ts (36) | Still Valid | All extra-field/default/negative/strict writer cases match SR006; reuse |
| collaboration-definition-admission/tolerant-team-package-reading.test.ts | Still Valid | Real file providers/scoped lookup/catalog facade; controlled launch allocation; reuse, live UI closes facade gap |
| collaboration-definition-admission directory + agent-team-definition directory | Still Valid | current canonical authoring, source ownership/revision and availability; reuse |
| application-bundles/file-application-bundle-provider.test.ts | Still Valid | same reader at third normal consumer, manifest/resource constraints; reuse |
| app-data-migrations/definition-nonmutation-startup.test.ts | Still Valid | real runner/SQLite + full registry fixture, but config spies/in-process; live startup still needed |
| app-data-migrations/agent-org-flat-team-families-v1-app-data-migration.test.ts + all current migrations | Still Valid | retained runtime collision/strict state/locator/cleanup/zero-write/history and dependencies |
| deleted collaboration-definition-authoring-shape.test.ts | Stale / Remove already IR-owned | obsolete automatic authored conversion explicitly rejected REQ005; replacement nonmutation + runtime cohorts retained; no API deletion |
| agent-team-execution/team-run-service.test.ts | Still Valid | admission and applicable launch guards |
| agent-org-execution/scope-builder and manager-lifecycle; agent-execution restore/backend factory | Still Valid | stored-state continuation, actual Agent dependency retained, controlled providers |
| unrelated AORG/Activity/desktop-shell suites | Out Of Scope | no changed lifecycle/UI/shell policy; no prior result reused |
No ambiguous/stale assertion needing API edit identified. No new durable test planned: upstream durable tests directly cover deterministic changed owners. Temporary real browser/provider and full-process fixture closes external environment gaps without new parallel framework; reproducible scripts/evidence remain ticket-local. Reassess if a supported missing durable scenario/failure emerges.
## Execution / checkpoint plan
Canonical api-e2e-test-case-ledger.md initialized before execution. Cases R01 narrow owners, R02 broader52-file preserved seams, R03 production build; B01 real external import/reload/catalog/select and hashes; B02 separate defaults fixtures/incomplete launch/user supplied settings+actual launch; B03 full startup authored preservation/runtime migration/ledger/restart; B04 frontend migrated history/attachment/normal continuation. Cases update immediately, in-progress checkpoints never Pass.
## Confidence / broader decision
Postrepository scorecard pending execution; no numeric result inferred. Seven mandatory categories will be scored after repository checks and final live validation. Broader Required: real frontend import/default/launch and full startup migration/continuation are critical gaps despite supplied356 local Pass. Browser+Lifecycle+readonly backend evidence selected; no diagnostic API command substitutes for user clicks. No actual Electron launch needed: no shell-specific change. No effect on user app. Native model availability pending safe read; if missing record exact blocker.
## Safety / unresolved
Preserve other-owner working files and external repo; no user servers/auth/conversations, reset/replay, release/push/merge/commit. Only owned process termination, keep reproducible fixtures/data isolated. Source strict typecheck known failing/rootDir and expanded diagnostics; no clean baseline/global no-new-errors claim. No current reroute ambiguity. Proceed to execution; final report/revision pending.

## Post-repository result / mandatory confidence gate
R01 4files59 Pass; R02 52files356 Pass includes59; R03 full server build Pass. Exact commands/logs ledger/validation. Standard Vitest setup resets only its worktree-local tests/.tmp/autobyteus-server-test.db, not live data. No strict typecheck rerun; inherited failures qualified.
| Category | Score | Evidence / remaining gap |
|---|---|---|
| Requirement/AC proof | 75 | Deterministic owners pass, actual user/startup acceptance absent |
| Changed-boundary directness | 95 | Real projection and migration code executed, no source substitution |
| Integration realism/mock gap | 75 | Real providers/SQLite but config seams and provider mocks |
| Environment/identity/fixtures | 75 | Real source hashes verified; fresh full runtime still to seed |
| Failure/edge/lifecycle | 75 | Negative/ledger/collision tests pass; actual startup/restart absent |
| User/browser/shell | 50 | Actual UI critical, not yet executed; shell N/A unchanged |
| Durable regression quality | 95 | Current supported positive/negative owners and preserved cohorts |
Mean540/7=77.1%. Critical AC not all directly proven; clean95 target NOT met. Broader Required Browser + Lifecycle. Local LM Studio model-list read succeeds and includes qwen/qwen3.6-35b-a3b; no auth/service changes. Expected strong scoped confidence after actual cases, not pre-awarded.

## Live fixture refinement before continuation
First seed (team-package-api001) proved authored nonmutation, runtime family conversion, locator bytes and flat tree preservation at full startup. It intentionally supplied minimal raw history but investigation found native restore requires strict v5 WorkingContext snapshot, absent from that minimal seed. Its raw user source_event used current native LLMUserMessageReadyEvent rather than migration's released AgentRun.postUserMessage qualifier, so first-message migration safely reported INVALID_CONFIGURED_USER_TRACE and kept blank summary. This is fixture insufficiency, NOT a source failure or acceptance pass for continuation. Do not mutate/reset/replay that dataset to force green. Prepare a SECOND fresh complete fixture team-package-complete-api001: released qualifier and strict v5 snapshots generated through current serializer/finalizer before first full startup; same owned authored bytes, real external roots configured before startup, isolated schema-deploy + old FAILED authoring ledger row. No existing application data overwritten. B03 remains in progress until full complete-fixture startup and repeated-startup checks; B04 not yet attempted. Primary browser import and launch B01/B02 retain original dataset and remain separate evidence.

Final B04 evidence qualification: first verification script overasserted that never-used mounted member must call restore; actual telemetry correctly calls prepareNewAgentRun (no prior raw conversation) under exact saved native ID. Direct used member calls prepareRestoreAgentRun and remembers old content. Corrected evidence assertion, not production/test code; no user action replay. Both real frontend results pass scoped continuation/first-work contract.

## Final investigation decision
All R01–R03/B01–B04 Pass; completed canonical execution report is authoritative. Final category scores all95, mean95.0%; all critical AC directly proven in mapped surfaces. No API durable/source changes, no remaining reroute blocker. Broader Required completed with actual frontend/lifecycle; inherited strict failures, synthetic history provenance, interrupted-browser/new-tab and mounted first-work qualifications preserved. Only owned services/tabs cleaned; local evidence/datasets retained. Successful reviewed route goes Code Reviewer, not direct Delivery.

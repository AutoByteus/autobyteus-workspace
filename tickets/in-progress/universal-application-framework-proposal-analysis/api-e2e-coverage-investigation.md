# API/E2E Coverage Investigation — Universal Application Dual-Host Foundation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/proposal-critical-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-self-validation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/sources/autobyteus-vertical-application-developer-experience-proposal.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-008`
- Current Investigation Round: `8` (`API-REV-008` complete)
- Trigger: `code_reviewer` source-review result `CRR-022` (`Pass`) for `IR-013`; reviewed HEAD `235be4529bf4c34e3047632453ca80adf25e1972`.
- Prior Investigation Reviewed: `API-REV-007` (`Fail / 88%`), including unresolved `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007`, resolved descriptor/tool-list boundary `APIE2E-F006`, and independent `APIE2E-REPO-005` (`Unclear`).
- Current Result: `Pass / 97%`; the prior publication failure is resolved, live dual-host publication/remount and stop/restart pass, and cleanup is complete.
- Latest Authoritative Investigation: `Yes`

## Round 8 Pre-Execution Coverage Reconciliation

`IR-012` implements the reviewed graph-scoped publication authority from `SR-010` / `ARCH-REV-008`; `IR-013` adds the exact graph-owned run shutdown edge required before application session/publication disposal. `CRR-022` confirms both source corrections and requires API/E2E to reconcile the preserved explicit-dependency fixtures, make shutdown behavior durable, recheck `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007` first, then prove real active-run stop/restart and conditional broader parity.

### Round-8 Changed-Surface Classification

| Boundary | Change | Direct durable requirement | Broader executable requirement |
| --- | --- | --- | --- |
| Agent Tools process/application authority | `IR-012` makes process registry/catalog/route explicit and gives each application graph its own session execution authorities | Reconcile explicit authority fixtures; retain route/auth/session tests; ensure application sessions bind the graph publication port | Actual authenticated tools/list, publication, recipient-name handoff, journal/relay/app projection |
| Deferred graph publication port | New bind-once/close authority between early session construction and graph-local publication service | Cover unbound/bound/second-bind/closed behavior through current focused suites or add only if absent | Successful real publication and post-close rejection |
| Graph-owned run shutdown | `IR-013` adds one idempotent team-before-agent shutdown authority | Add a direct durable shutdown test and assert exact graph manager ownership | Stop/restart with real team/member runs; old runs/descriptors/sessions cannot dispatch |
| Application lifecycle | Run shutdown now follows worker stop and precedes session revoke/publication close/stream stop | Update stale lifecycle dependencies and assert exact order, aggregation, continuation, and idempotence | Leak-free graceful stop/restart, including a failure-boundary check where safely executable |
| General-process authority | Must remain live through application graph close and close only with the process | Preserve distinct-scope coverage | Prove application close does not revoke general-process scope; process close does |
| `APIE2E-REPO-005` / unchanged team-manager fixtures | Independently stale/unattributed | Do not force IR-013 changes into unchanged required-ID fixtures without current requirement mapping | Keep separate `Unclear` unless independently attributed |

### Round-8 Existing-Coverage Validity Decisions

| Path / scenario | Decision before edit | Rationale / action |
| --- | --- | --- |
| `tests/unit/application-platform/application-run-authorities.test.ts` | `Needs Update` | IR-012 requires the explicit application session authority input; extend the existing exact-authority assertion to prove the shutdown authority retains the same graph-local team/agent managers without exposing them publicly. |
| `tests/unit/application-platform/application-platform-lifecycle.test.ts` | `Needs Update` | Fixture predates application session authority, publication port, and run shutdown dependencies. Update it and assert `block -> existing cleanup -> workers -> graph runs -> session close -> publication close -> streaming`, with later steps continuing after run failure. |
| New `tests/unit/application-platform/application-run-shutdown-authority.test.ts` | `Add Durable Coverage` | Disposable reviewer probes are not durable. Directly prove idempotence, team-before-agent order, continuation, and two-owner aggregation. |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | `Still Valid; rerun` | Route/auth/session/tool mapping remains authoritative; its injected publication seam alone does not prove the application graph. |
| `tests/integration/application-backend/standalone-application-composition.integration.test.ts` | `Needs Reconciliation; rerun` | Explicit process authority/route dependencies may require fixture updates; retain its route-order/auth semantics. |
| Real standalone `APIE2E-STANDALONE-MCP-003` | `Mandatory first live gate` | Require actual publication plus message/handoff and application projection; reject direct-file/SQLite substitution. |

### Round-8 Planned Order

1. Update/add the three direct durable application authority/shutdown/lifecycle files and reconcile any explicit-dependency composition fixtures.
2. Run those tests, Agent Tools route/composition coverage, current graph isolation/recovery coverage, server build/typecheck, devkit, and maintained package builds.
3. Execute a fresh real Brief standalone journey first. Require researcher and writer publication through authenticated Agent Tools, recipient-name handoff, publication journal, relay, app projection, browser state, immutable hashes, and no workaround.
4. If the critical gate passes, gracefully close with active graph team/member runs, verify old run/session/descriptor rejection, restart fresh, prove general-process scope separation, and check leaks.
5. Only after those pass, resume Studio publication/remount, exact dual-host digests, maintained commands, recovery/isolation, controlled-browser, and cleanup matrices.

## Round 8 Repository And Live Result

- The initial focused selection exposed three stale explicit-dependency fixtures (route publication authority, standalone route dependencies, graph session-authority factory). After API/E2E-owned fixture reconciliation, the final focused matrix passes `7 files / 20 tests`. A later stale mixed-member cleanup fixture was similarly updated to inject the current exact session authority and passes `1/1`.
- Durable coverage now directly proves graph shutdown idempotence, team-before-agent order, continuation and aggregation; lifecycle placement after workers and before session/publication/streaming cleanup; application-scope revocation while general-process scope remains valid; process-close registry clearing; and exact graph-local manager/session/publication identities.
- All cumulative API/E2E-owned server coverage passes `21 files / 63 tests`; selected-resource Nuxt coverage passes `3 files / 7 tests`; the devkit passes `19/19`; server TypeScript no-emit/build, Brief and Socratic build/validate/backend typecheck all pass.
- `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007` is **resolved**. The fresh real Brief standalone journey uses package-owned Codex/Luna members. The researcher performs authenticated `publish_artifacts`, recipient-name `send_message_to`, and a real writer handoff; the writer publishes through the same Agent Tools server. App-owned artifact/revision rows and the browser show `in_review`, two outputs, and one final. No direct file or SQLite mutation is credited as publication or handoff.
- Live active shutdown creates a second real team/researcher, stops the owned host, and leaves ports 43124/9229/8000/3000 clear with no owned worker/Codex process. Restart does not retain a live child/session; an explicit new launch allocates new team/member run IDs and completes with non-empty researcher (`1688` bytes) and writer (`2334` bytes) projections. Exact old application-session revocation and general-process survival until process close are additionally covered by the direct real registry/authority test.
- Real Studio imports the same current Brief package, exposes the package team, saves setup, enters one iframe, and explicit reload replaces it with exactly one fresh iframe. A real Studio Codex/Luna team then publishes non-empty researcher (`1678` bytes) and writer (`2273` bytes) artifacts and reaches `in_review`; the browser shows two outputs and one final.
- Controlled-browser prerequisites are proved with installed Google Chrome and headless Playwright; both real host commands retain `--no-open` behavior. Brief package/authoring inputs remain immutable (`73/73` current pre/post hashes). Root and application data, temporary scripts, listeners, worker/Codex children, and generated runtime state are cleaned.
- `APIE2E-REPO-005` remains a historical mixed-validity whole-suite diagnostic and is not used as requirement evidence or attributed to IR-012/IR-013. Every requirement-linked current suite and live path selected for this round passes.

### Round-8 Final Coverage Decisions

| Boundary / scenario | Final decision | Evidence |
| --- | --- | --- |
| `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007` | `Resolved / Pass` | `api-rev-008-actual-tools-dispatch.json`, standalone DB/browser evidence |
| Agent Tools application/process scope | `Durable Pass` | new process-authority test plus route/composition suites |
| Graph-owned shutdown/lifecycle | `Durable + live Pass` | shutdown/lifecycle tests; active-stop/restart/cleanup evidence |
| Studio remount and publication parity | `Live Pass` | remount browser JSON/PNG; Studio publication DB/browser evidence |
| Package immutability / dual-host identity | `Pass` | one exact current package used by both hosts; `73/73` hashes unchanged |
| Maintained command matrix | `Pass for current changed scope` | server/devkit/Brief/Socratic builds and validations; both Brief hosts live |
| `APIE2E-REPO-005` | `Unclear, non-gating historical diagnostic` | deliberately separate from current requirement-linked evidence |

### Round-8 Confidence

| Category | Final |
| --- | ---: |
| Requirement and acceptance-criteria proof | 96% |
| Changed-boundary execution directness | 100% |
| Cross-boundary integration realism and mock gap | 98% |
| Environment, configuration, identity, and fixture fidelity | 98% |
| Failure, edge-case, lifecycle, and recovery evidence | 95% |
| User-surface/browser confidence | 98% |
| Durable regression coverage quality and relevance | 96% |

Overall: `97%` (`97.3%`). No applicable category is below `90%`, every critical criterion has direct proof, broader validation was required and completed, and no material open failure remains.

## Round 7 Coverage Reconciliation And Result

`IR-011` / `CRR-019` is a bounded graph-authority correction: the application graph now constructs the existing Codex bootstrapper with the exact package-aware `AgentDefinitionService`, passes it through the existing Codex backend factory, and injects that factory into the graph's run manager. The exact first gate remains `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006`: non-null actual descriptor, authenticated Agent Tools `tools/list`, real eligible `publish_artifacts` and `send_message_to` dispatch, writer handoff/run, and projected artifacts. Direct file or SQLite manipulation is invalid. Native runtime tools, Claude, transport/projection, and `/mcp/gateway` are excluded without independent evidence.

### Round-7 Validity And Execution Decisions

| Coverage / surface | Decision | Required evidence |
| --- | --- | --- |
| `application-run-authorities.test.ts` / `APIE2E-CODEX-AUTH-001` | `Still Valid; rerun first` | Exact graph service identity and no global lookup. |
| Standalone composition + Agent Tools route suites | `Still Valid; rerun with authority test` | Preserve route/auth/session behavior while authority changes. |
| Real standalone Brief | `Mandatory critical rerun` | Actual descriptor, direct authenticated JSON-RPC initialize + `tools/list`, eligible tool presence and actual calls, researcher-to-writer handoff/run, app-owned projection, event/notification state, no direct DB bypass. |
| Retained parity/remount/command/digest/recovery/isolation matrix | `Conditional` | Resume only after the critical real path passes. |
| `APIE2E-REPO-005` | `Unclear; separate` | Do not rerun or attribute unless independently justified after the requirement-linked matrix. |

### Round-7 Planned Order

1. Rerun the exact authority regression plus standalone route/auth coverage and required builds.
2. Start a fresh Brief standalone host with `--no-open`; capture immutable pre-run hashes.
3. Create one real Brief and inspect the exact active descriptor. Perform authenticated Agent Tools `initialize`/`tools/list` against that descriptor without exposing its bearer/session values in evidence.
4. Require real `publish_artifacts` and `send_message_to` calls, a writer run, projected research/final artifacts, and valid `in_review` business state. Reject shell/SQLite shortcuts.
5. If and only if step 4 passes, continue Studio remount/parity, maintained commands, dual-host hashes, recovery, graph isolation, controlled-browser, and cleanup checks.

### Round-7 Repository And Live Result

- The exact graph-authority regression now passes without global definition lookup. Together with the Codex bootstrap/factory selection, standalone composition, and Agent Tools route coverage, the focused selection passes `5 files / 40 tests`; `2 files / 14 environment-gated tests` skip. Server, devkit, and Brief package build/validate/backend typecheck pass.
- `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006` is **resolved** at its exact boundary. Both actual Brief member Codex threads connect to `3` available MCP servers with `0` unavailable and `86` tools. Their actual catalogs contain `mcp__autobyteus_agent_tools__publish_artifacts` and `mcp__autobyteus_agent_tools__send_message_to`; no descriptor bearer/session secret is retained in evidence.
- The real researcher calls `send_message_to` twice through Agent Tools and both calls return `Delivered message to writer.` A real writer run/thread is created, receives the handoff, and calls `publish_artifacts`. This proves the real teammate communication path rather than direct file or database manipulation.
- New `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007` fails at artifact publication. Three researcher and two writer `publish_artifacts` calls all reach the eligible Agent Tools adapter and return `publish_artifacts_failed`: the exact graph-local member run is reported `not active`. The live binding contains both member run IDs, but the application stays `not_started`, app artifact/revision tables and the platform publication journal remain empty, and the rendered browser reports zero drafts.
- Source correlation explains the mismatch without claiming final origin authority: `createApplicationRunAuthorities()` owns a `PublishedArtifactPublicationService` bound to its graph-local `AgentRunManager`, while the default Agent Tools `PublishArtifactsMcpAdapterProvider` is constructed with the cached process-global publication service, whose default manager is `AgentRunManager.getInstance()`. The session fallback carries paths and application context but no `emitArtifactPersisted`, so the global service rejects the graph-local member ID before projection.
- `send_message_to` succeeding in the same actual sessions narrows the failure to publication authority/routing rather than the descriptor, authentication, tools list, Codex runtime, team membership, or general Agent Tools transport.
- Package and authoring inputs remain immutable (`69/69` exact pre/post hashes), and all owned listeners, runtime data, generated devkit output, temporary browser scripts, and inspector state are cleaned.
- The conditional Studio/parity/command/recovery/isolation matrix was not executed after the critical stop gate. `APIE2E-REPO-005` remains independent `Unclear` and was neither rerun nor reclassified.

### Round-7 Durable-Coverage Validity Update

| Path / scenario | Current decision | Evidence / follow-up |
| --- | --- | --- |
| `tests/unit/application-platform/application-run-authorities.test.ts` / `APIE2E-CODEX-AUTH-001` | `Still Valid; Pass` | Exact graph-local definition service now reaches the Codex bootstrapper; 1/1 passes. |
| `tests/integration/application-backend/standalone-application-composition.integration.test.ts` | `Still Valid; Pass` | Registrar order and route mount remain correct; 2/2 passes. |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | `Still Valid but insufficient for F007` | Route/auth/tools-list is valid and 11/11 passes, but publication coverage injects a hand-built service that already owns its fake active run and therefore bypasses default-provider-to-application-graph authority selection. |
| Default Agent Tools publication provider + real application graph | `Add Durable Coverage after focused owner classification` | A durable functional regression should prove that a default authenticated session can publish for an actual graph-local application member. Do not lock in a specific injection/registry design before `code_reviewer` determines whether the fix is bounded or design-impacting. |
| Real standalone Brief / `APIE2E-STANDALONE-MCP-003` | `Mandatory critical rerun` | Require successful researcher and writer publication, platform journal/app projection, valid status, and no shortcut. |

No durable test file changed in round 7. All earlier API/E2E-owned durable changes remain preserved. This Fail handoff requests focused failure-origin review, not proportional successful-test review.

### Prior-Failure Resolution And New Failure

| Scenario / finding | Prior state | Round-7 result | Evidence |
| --- | --- | --- | --- |
| `APIE2E-CODEX-AUTH-001` / `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006` / `CR-014` | Graph-local package definition could not produce a Codex Agent Tools descriptor | **Resolved**: exact authority test passes; actual researcher/writer sessions connect to the third AutoByteus MCP server and list both eligible tools | `api-rev-007-focused-authority-route.log`, `api-rev-007-actual-tools-dispatch.json` |
| `APIE2E-STANDALONE-MCP-003` / `APIE2E-F007` | New boundary first reached in round 7 | **Fail**: actual publication adapter uses an authority that cannot see either graph-local active member; no platform/app artifact projection occurs | actual dispatch, database state, browser state, and source-correlation evidence |

### Failure Classification And Confidence

Preliminary classification is implementation-owned `Local Fix`, subject to `code_reviewer` focused failure-origin review. The failure is directly correlated to the established default MCP publication adapter selecting the cached process-global publication service instead of the already-created graph-local application publication authority (or another graph-aware general route). Because the current catalog/provider seam is process-global, the focused reviewer must decide whether a bounded fix exists or whether this creates design impact; API/E2E does not prescribe the implementation. No Claude, native Codex/Claude tool, external `/mcp/gateway`, or generic Agent Tools transport change is supported by this evidence.

| Confidence category | Post-repository | Final | Evidence / limit |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 50% | Descriptor, list, handoff, and writer run pass; critical artifact publication/projection fails. |
| Changed-boundary execution directness | 95% | 100% | Exact authority regression plus actual authenticated member calls and exact returned errors. |
| Cross-boundary integration realism and mock gap | 75% | 100% | Repository publication test injects its own service; live run uses real package/server/worker/Chrome/Codex/Luna/Agent Tools/app DB. |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Fresh root, exact package defaults and identities, installed Chrome, real member runs/threads. |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 90% | Repeated calls from both roles, app/platform state, immutable hashes, and cleanup; post-fix recovery not run. |
| User-surface, browser, and desktop-shell confidence | 75% | 90% | Real standalone browser and cross-layer state captured; Studio matrix stopped; desktop shell inapplicable. |
| Durable regression coverage quality and relevance | 90% | 90% | Authority and route regressions are strong; default-provider/application-graph publication has no durable functional regression yet. |

- Overall post-repository confidence: `86%` (`85.7%`, simple average).
- Overall final confidence: `88%` (`87.9%`, simple average).
- Broader-validation decision: `Required`; executed through the real critical path and stopped on `APIE2E-F007`.
- Outcome: `Fail`.
- Routing: `code_reviewer` for focused failure-origin analysis, not proportional test-code review.

## Round 6 Coverage Reconciliation And Result

### Requirement And Failure Basis

`IR-010` / `CRR-017` adds only the established Agent Tools MCP registrar to standalone before its static wildcard. The first rerun therefore had two distinct gates: (1) recheck the exact route/auth boundary, then (2) inspect the actual package-owned Codex run descriptor and its actual tool list before accepting any business artifact or handoff result. Per `AC-005`, `AC-006`, `AC-009`, `AC-010`, and `DS-014`, eligible server tools must include `publish_artifacts` and `send_message_to`; Codex/Claude-native `write_file` is explicitly not required through this server MCP route.

The existing broad diagnostic `APIE2E-REPO-005` remains independently `Unclear`. It is not attributed to `IR-010`, and this round did not expand the bounded route fix to resolve it.

### Current Coverage Validity Decisions

| Path / scenario | Decision | Reason |
| --- | --- | --- |
| `tests/integration/application-backend/standalone-application-composition.integration.test.ts` and `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` / `APIE2E-STANDALONE-MCP-001` | `Still Valid; rerun first` | Directly proves the established callback is mounted before static fallback and retains its 401/404/session behavior. |
| Real standalone Brief / `APIE2E-BRIEF-003` | `Still Valid; rerun after route pass` | Repository route coverage cannot prove that a package-owned run receives a non-null descriptor or eligible tools. Use a fresh root, real Codex App Server/Luna, actual run state, actual tool list, browser state, trace, and app database. |
| `tests/unit/application-platform/application-run-authorities.test.ts` | `Needs Update` | Its existing graph-local allocator assertions did not inspect the Codex bootstrapper definition authority that resolves configured tool exposure. Add one direct identity assertion without faking the owning service. |
| Remaining Studio/standalone parity, remount, command, digest, recovery, and cleanup matrix | `Run only after the critical standalone tool gate passes` | Do not accumulate secondary evidence after a critical `AC-005`/`AC-006` failure. |

### Repository And Broader Result

- `APIE2E-STANDALONE-MCP-001` is **resolved**: the exact two-file focused selection passes `2 files / 13 tests`; the standalone path reaches the established authorization/session route rather than static 404.
- Server, devkit, and Brief rebuild/validation/typecheck all pass before live execution.
- The fresh real standalone run creates the Brief, binding, team run, and exact package-owned researcher on `codex_app_server` / `gpt-5.6-luna`.
- New `APIE2E-STANDALONE-MCP-002` / `APIE2E-F006` then fails before `tools/list`: the exact run's `codexThreadConfig.appServerConfig` is `null`. Live inspector evidence shows the exact Codex bootstrapper cannot resolve the package-local agent ID because it owns a process-global `AgentDefinitionService`; the graph-local service is used by allocation and the AutoByteus backend but is not carried into the Codex backend factory/bootstrapper. The resulting session has `enabledTools=[]` and `configuredToolNames=[]`.
- The actual Codex tool inventory contains neither `publish_artifacts` nor `send_message_to`; both call counts are zero. Because no Agent Tools descriptor exists, an Agent Tools `tools/list` request is impossible rather than passing.
- The model then created files with `run_bash` and directly inserted/updated Brief SQLite tables. The semantic `in_review` row and two artifacts are therefore invalid as publication/handoff evidence; the authoritative trace records the bypass.
- The updated durable graph-authority regression fails `1/1`, receiving the global definition service instead of the exact application graph service.
- Package and authoring-input hashes are identical before and after the real run (`69/69`); all owned listeners, processes, runtime data, generated devkit output, and temporary inspector scripts were cleaned.
- The remaining broader matrix was not run after the critical stop gate. `APIE2E-REPO-005` remains `Unclear` and was not rerun.

### Failure Classification And Confidence

Preliminary classification: `Local Fix`, implementation-owned, subject to `code_reviewer` focused failure-origin review. `createApplicationRunAuthorities()` constructs `AgentRunManager` without a graph-local Codex backend factory; that omission selects the process-global Codex factory/bootstrapper and global definition service. This is a previously unexercised graph-authority escape, not a failure of the now-correct standalone route mount. No Claude-specific change is recommended without separate evidence.

| Confidence category | Post-repository | Final | Evidence / limit |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 50% | Route/auth is direct, but real eligible-tool dispatch/handoff/artifact completion fails. |
| Changed-boundary execution directness | 95% | 100% | Exact route, live run object, bootstrapper authority, session state, and durable identity assertion are direct. |
| Cross-boundary integration realism and mock gap | 90% | 95% | Real package/server/worker/SQLite/Chrome/Codex/Luna; final DB rows are rejected because they came from a direct SQL bypass. |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Fresh owned root, exact current package IDs/defaults, actual run/thread, and installed Chrome. |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 90% | Exact null descriptor, invalid workaround, hash check, and cleanup; post-fix recovery not run. |
| User-surface, browser, and desktop-shell confidence | 85% | 90% | Real standalone web UI/browser captured; Studio/remount stopped; desktop shell is not applicable. |
| Durable regression coverage quality and relevance | 95% | 95% | Route suites pass and a narrow exact authority regression now fails at the defect. |

- Overall post-repository confidence: `91%` (`91.4%`, simple average).
- Overall final confidence: `88%` (`87.9%`, simple average).
- Broader-validation decision: `Required`; executed through the real standalone critical gate, then stopped on `APIE2E-F006`.
- Outcome: `Fail`.
- Routing: `code_reviewer` for focused failure-origin analysis, not proportional successful-test review.

## Round 5 Pre-Edit Coverage Reconciliation

This section records the current coverage decision before any round-5 durable test edit or final execution. It supersedes the round-4 requirement basis and planned matrix where the two conflict; the older sections remain historical evidence for the still-relevant dual-host scenarios.

### Revised Requirement And Implementation Basis

`SR-005` first established complete package-owned launch defaults, exact three-state readiness, and a graph-local package-team prompt authority. `API-REV-004`'s clean standalone failure (`APIE2E-BRIEF-003` / `APIE2E-F004`) must therefore be rerun first against the exact maintained Brief defaults: `codex_app_server` plus `gpt-5.6-luna`, no saved host row, and no business-request fallback.

`SR-006` / `ARCH-REV-006` then made four launch-configuration meanings authoritative and distinct: immutable manifest `packageBaseline`, exact current `selectedResourceBaseline`, sparse `savedOverride`, and post-overlay `effectiveConfiguration`. The same service now owns a closed no-write selection preview, sparse alternate-resource save, PUT-time identity/topology re-resolution, deleted/stale-row diagnosis, explicit Reset, and per-field provenance. Studio must discard stale preview responses and must preserve per-member inheritance for mixed-runtime teams. `IR-009` / `CRR-014` closes the last reviewed package-portability defect by extending the existing recursive classifier to URL/URI, connection-string/DSN, endpoint-address, access/account/client/subscription-key, and authentication aliases while retaining the exact approved token-count and typed-pricing fields.

The round-5 acceptance basis is therefore `REQ-007`/`REQ-008`, `UC-004`, `UC-009`, `UC-019`–`UC-023`, and `AC-014`–`AC-017`, in addition to the previously mapped unchanged-package dual-host, command, recovery, isolation, and cleanup criteria. No migration, compatibility reader, fallback, package special case, or UI-owned definition traversal is approved.

### Changed-Surface Reclassification

| Boundary | Round-5 status | Direct durable evidence required before live execution | Broader-validation consequence |
| --- | --- | --- | --- |
| Pure package validation / recursive portable policy | Changed by `IR-006`–`IR-009` | Add exact positive token/pricing and recursive negative-alias coverage, including exact path and no secret value in diagnostics | Rebuild and validate both maintained packages; live hosts consume the same output |
| Launch-configuration service / selected-resource authority | Changed by `IR-006`–`IR-008` | Add stored baseline/effective/provenance, no-write preview, sparse first save, clearing, stale/deleted/reset, and PUT re-resolution coverage | Real Studio setup must exercise package defaults and an override/reset without mutating package bytes |
| Studio selection-preview client | Changed by `IR-008` | Add out-of-order response invalidation and exact app/slot/ref identity coverage | Browser journey must confirm Save/entry blocking and recovery through current Studio UI |
| Mixed-runtime Studio editor | Changed by `IR-007`–`IR-008` | Update stale editor assertions; prove blank team runtime means per-member inheritance and disables team-wide model selection | Browser evidence is supplemental; the durable component/composable boundary is mandatory |
| Standalone startup/readiness | Changed by `IR-006` | Reuse composition coverage and rerun the formerly failing clean standalone journey first | Critical gate: no full live matrix proceeds if `APIE2E-BRIEF-003` still fails |
| Graph-local prompt and run identity | Changed by `IR-005`–`IR-006` | Retain direct allocator regression and add/retain package team-instruction prompt assertion | Both-host real provider/team/event/artifact proof remains required |

### Round-5 Existing-Coverage Validity Decisions

| Path / scenario | Decision before edits | Reason and required action |
| --- | --- | --- |
| `autobyteus-server-ts/tests/unit/api/rest/application-backends-execution-resource-configurations.test.ts` | `Stale / Replace` | The current API/E2E-owned edit still imports the deleted `LaunchProfileValidationError`, calls removed `listExecutionResourceConfigurations`/`upsertExecutionResourceConfiguration` methods, and asserts obsolete `status/configuration/launchProfile` shapes. Replace those assertions with current GET/preview/PUT/DELETE transport contracts and `ApplicationLaunchConfigurationError` mapping. |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-execution-resource-configuration-service.test.ts` | `Stale / Remove from affected matrix` | It covers the removed predecessor service and an obsolete topology-repair behavior. Do not extend it; current behavior belongs under `ApplicationLaunchConfigurationService`. |
| Prior `application-platform` lifecycle/isolation/allocator tests and standalone composition integration | `Still Valid` | They directly protect the explicit graph, recovery, cleanup, identity, and selected-host boundaries. Retain and rerun. |
| Current Studio setup/team editor specs | `Needs Update` | Fixtures and payloads use the predecessor `READY/configuration/launchProfile` contract; one case protects automatic stale topology repair. Replace with current slot-view shapes, exact selected baselines, explicit replacement, sparse override payloads, and mixed-runtime inheritance. |
| No durable test for `ApplicationPortableLaunchConfigPolicy` | `Add Durable Coverage` | Reviewer probes were disposable and cannot be the regression authority. |
| No durable test for `ApplicationLaunchConfigurationService` selected-resource semantics | `Add Durable Coverage` | Implementation probes were disposable; AC-015/016 require direct service evidence. |
| No durable test for `useApplicationLaunchSelectionPreviews` | `Add Durable Coverage` | AC-015's stale-response and exact-identity concurrency behavior otherwise exists only in source review. |

### Planned Round-5 Durable Scenarios

| Scenario ID | Planned durable artifact | Required proof |
| --- | --- | --- |
| `APIE2E-POLICY-001` | `autobyteus-server-ts/tests/unit/application-platform/application-portable-launch-config-policy.test.ts` | Exact supported token-count/pricing structures pass; recursively nested credential/token/authorization, URL/URI, connection/DSN, qualified address, access/account/client/subscription key, host, workspace, and path aliases fail at the exact config path without echoing the sentinel value. |
| `APIE2E-CONFIG-001` | `autobyteus-server-ts/tests/unit/application-platform/application-launch-configuration-service.test.ts` | No-row selected baseline equals package baseline while effective adds only application workspace and preserves definition provenance; preview reads no override state and writes nothing. |
| `APIE2E-CONFIG-002` | same service test | First-save alternate resource inherits that resource's per-member baseline, persists a sparse override, and reports host-versus-definition provenance correctly; a later cleared field re-inherits from the selected resource. |
| `APIE2E-CONFIG-003` | same service test | Deleted selection exposes no selected/effective configuration; stale topology preserves the current selected baseline and raw row but blocks effective execution; Reset removes the row and restores package-default evaluation. |
| `APIE2E-CONFIG-004` | same service test | Preview/PUT resource or topology race is rejected because PUT independently re-resolves before store write. |
| `APIE2E-WEB-001` | `autobyteus-web/composables/__tests__/useApplicationLaunchSelectionPreviews.spec.ts` | An older preview response cannot overwrite a newer exact app/slot/ref request and selection/reset invalidates pending results. |
| `APIE2E-WEB-002` | updated current Studio editor/setup tests | Mixed-runtime blank team defaults preserve per-member runtime/model inheritance; stale topology stays locked until explicit replacement; current sparse REST payloads and readiness union are used. |

### Round-5 Execution Order

1. Run the new policy/service/composable/editor tests and current REST transport tests.
2. Run all implementation-affected server/devkit/Nuxt suites plus builds/typechecks.
3. Rebuild/validate maintained Brief and Socratic packages and capture exact package/entry digests.
4. Recheck `APIE2E-BRIEF-003` first in a fresh standalone data root. Require `RUNNABLE`, package-owned Codex/Luna defaults, real provider/team/binding/events/notifications/artifacts, and no saved row.
5. Only after step 4 passes, execute the real Studio parity/remount/reload journey, maintained command loops, worker recovery, concurrent graph isolation, digest parity, browser-prerequisite checks, and owned-process/data cleanup.

## Round 5 Post-Repository And Broader-Validation Result

### Durable-Coverage Decisions Applied

| Path / scenario | Final decision | Result |
| --- | --- | --- |
| `tests/unit/application-platform/application-portable-launch-config-policy.test.ts` / `APIE2E-POLICY-001` | `Add Durable Coverage` | Added; 19 cases cover approved token/pricing positives and all recursive prohibited alias families with exact paths and no sentinel echo. |
| `tests/integration/application-backend/standalone-package-portable-defaults.integration.test.ts` | `Add Durable Coverage` | Added; the real Brief package passes with supported Codex/Luna defaults and rejects eight representative prohibited aliases. |
| `tests/unit/application-platform/application-launch-configuration-service.test.ts` / `APIE2E-CONFIG-001`–`004` | `Add Durable Coverage` | Added; five cases cover four distinct configuration meanings, no-write preview, alternate first-save inheritance, clearing, mixed member defaults, deleted/stale/reset, provenance, and PUT re-resolution. |
| `autobyteus-web/composables/__tests__/useApplicationLaunchSelectionPreviews.spec.ts` / `APIE2E-WEB-001` | `Add Durable Coverage` | Added; three cases cover stale response ordering, reset invalidation, and exact selection identity. |
| Studio setup/editor component specs / `APIE2E-WEB-002` | `Needs Update` | Replaced obsolete launch-profile fixtures and automatic topology repair with sparse preview/PUT/reset, mixed-runtime inheritance, and explicit stale-topology replacement. |
| `tests/unit/api/rest/application-backends-execution-resource-configurations.test.ts` | `Stale / Replace` | Replaced with current GET/preview/list/PUT/409/DELETE transport assertions; 6/6 pass. |
| Former predecessor service and stale-state unit files | `Stale / Remove` | Removed because both imported deleted production services and one protected automatic topology repair. Current service and UI coverage replace them. |
| `tests/integration/application-backend/brief-package-team-prompt.integration.test.ts` | `Add Durable Coverage` | Added; graph-local real Brief package team instruction reaches the final Codex bootstrap without singleton fallback. |
| `tests/integration/application-backend/standalone-application-composition.integration.test.ts` / `APIE2E-STANDALONE-MCP-001` | `Needs Update` discovered during live validation | Added a route-surface regression after the live failure. It currently fails exactly `404` versus required Agent Tools MCP gate `401`, matching the live tool-unavailability failure. |

### Repository Execution Result

- Focused portable-policy and launch-configuration service: `2 files / 24 tests` Pass.
- Selection-preview composable: `1 file / 3 tests` Pass.
- Current Studio launch component/composable group: `3 files / 7 tests` Pass.
- Current launch REST transport: `1 file / 6 tests` Pass.
- Real Brief package portability: `1 file / 9 tests` Pass.
- Real Brief graph-local prompt: `1 file / 1 test` Pass.
- Brief imported-package integration: `1 file / 3 tests` Pass.
- Final affected server matrix: `30 files / 116 tests` Pass.
- Affected Nuxt matrix: `14 files / 111 tests` Pass.
- Devkit build and tests: build Pass; `19/19` Pass.
- Server build-config TypeScript no-emit: Pass.
- Brief and Socratic `build`, `validate`, and backend typecheck: Pass for both maintained applications.
- Exploratory repository-wide server run: `489 files / 2676 tests` Pass, `39 files / 105 tests` Fail, `32 files / 110 tests` skipped, plus six unhandled errors. This broad red state spans old runtime, GraphQL-authority, file/media, and test-double contracts beyond the affected matrix. It is retained as `APIE2E-REPO-005` and must be reconciled before a future Pass; no baseline comparison is claimed.
- Newly added `APIE2E-STANDALONE-MCP-001`: expected unauthenticated `/mcp/agent-tools/:sessionId` to reach the registered gate and return `401`; actual standalone composition returns `404`.

### Prior-Failure Resolution And New Failure

`APIE2E-F004` is resolved at its exact prior boundary. A fresh standalone root now derives the package-owned `codex_app_server` / `gpt-5.6-luna` defaults, reaches runnable launch, creates binding `0d8ed907-78ec-49ef-b692-7bd53f429858`, and creates team run `brief_studio_team_f902a8f9031147ec9f5fc743e26b6e8e` with both package-owned members on Luna. There is no missing `llmModelIdentifier`.

The same `APIE2E-BRIEF-003` journey then fails under new `APIE2E-F005`. At the bounded 381-second snapshot:

- Brief state remained `not_started`, binding state remained `ATTACHED`, and app-owned artifact count remained `0`.
- The researcher definition configured `write_file`, `publish_artifacts`, and `send_message_to`, but its 107-event trace contained 36 `run_bash` calls and zero calls to every configured tool.
- The model explicitly searched the filesystem and built output for ways to emulate the missing tools. A later direct-service workaround attempted from `run_bash` did not constitute a configured tool call or produce an app-projected artifact.
- Source correlation is exact: Studio registers `registerAgentToolsMcpRoutes(app)`; `buildStandaloneApplicationServerComposition` registers only standalone REST, WebSocket, and static routes; `AgentToolMcpSessionService` nevertheless advertises `${internalBaseUrl}/mcp/agent-tools/:sessionId`. The durable standalone composition regression observes the resulting `404`.

Preliminary classification is `Local Fix`, implementation-owned: the standalone server composition omits the Agent Tools MCP route needed by its own Codex run descriptors. `code_reviewer` must confirm origin and owner. The full Studio/parity/remount/repeated-command/digest matrix was intentionally stopped at this critical clean-standalone gate.

### Confidence And Broader-Validation Decision

| Confidence category | Post-repository | Final | Evidence / limiting factor |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 50% | Selected-resource and portability semantics are durable, but critical both-host real team completion still fails in standalone. |
| Changed-boundary execution directness | 95% | 95% | Exact service/policy/UI boundaries and exact missing standalone route are directly exercised. |
| Cross-boundary integration realism and mock gap | 90% | 95% | Fresh package, real standalone server/worker/SQLite, Chrome, real Codex App Server, Luna binding, and trace/API correlation. |
| Environment, configuration, identity, and fixture fidelity | 90% | 95% | Exact current-worktree Brief package, empty owned data root, package-owned identities/defaults, installed Chrome, no host-row fallback. |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 90% | Exact stall, route regression, process teardown, and owned-data cleanup captured; post-fix recovery remains untested. |
| User-surface, browser, and desktop-shell confidence | 85% | 90% | Real standalone business UI and browser capture; Studio/remount was not rerun after the stop gate; shell remains inapplicable. |
| Durable regression coverage quality and relevance | 95% | 95% | Current requirement-linked service/API/component/package tests plus an exact failing route regression. |

- Overall post-repository confidence: `91%` (`91.4%`, simple average).
- Overall final confidence: `87%` (`87.1%`, simple average).
- Broader validation decision: `Required`; executed through the clean standalone critical gate, then stopped on `APIE2E-F005`.
- Final result: `Fail`.
- Cleanup: port `43124`, worker/Codex/browser processes, isolated `.autobyteus` state, generated devkit output, agent-created workspace file, and disposable harness/worktree paths were removed; `git diff --check` passes.

## Historical Round-4 Investigation Baseline — Superseded

All sections from this heading to the end of the file preserve the round-4 baseline only. They are not current decisions. The authoritative API-REV-006 coverage decisions, result, failure IDs, and confidence are recorded in **Round 6 Coverage Reconciliation And Result** above; the intervening Round 5 sections preserve API-REV-005 history.

### Current Requirement And Design Basis (Round-4 Historical)

The reviewed solution requires one manifest-v4 application package to run unchanged in the Studio iframe host and standalone host while sharing graph-local definitions, runtime owners, identity/collision authorities, package identity, bundled-resource resolution, workers, storage, events, notifications, and artifacts.

Round 3 confirmed the Studio GraphQL/setup/entry/remount correction, but the first real Brief `Generate draft` action failed before binding/run creation because `TeamRunService`'s allocator fell back to a process-global agent-definition catalog. The material round-4 basis is UC-009 with AC-005 and AC-006, plus the still-pending AC-001/011/013 live matrix: the exact package-owned Brief team member must allocate through the same graph-local definition/run/metadata authority, create a binding and run, invoke the supported provider, publish events/notifications/artifacts, and remain parity-safe across hosts.

`IR-005` / `CRR-008` corrected the source boundary by constructing one graph-local `AgentRunIdentityAllocator` from the exact agent-definition service, agent run manager, agent/team metadata services, and memory root, then injecting that same allocator into both `AgentRunService` and `TeamRunService`. Round 4 added the planned durable direct regression and proved the repaired real Studio journey through binding, team run, real LM Studio provider, researcher/writer artifacts, application notification, and `in_review` state.

Continuation to the required standalone host exposed a new critical mismatch with the same approved basis: a clean documented standalone session has the manifest-default bundled team but no persisted LLM launch profile and no supported setup/CLI input for one. The real business action therefore fails with `llmModelIdentifier is required.` before binding. That new `APIE2E-BRIEF-003` / `APIE2E-F004` result now governs rerouting.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| `APIE2E-007` / repeated Studio package refresh | Changed | `IR-003`, `CRR-004`, AC-011 | Extend the preserved devkit regression for import-once, package refresh, current identity, and backend reload ordering; rerun real repeated Brief edits. |
| `APIE2E-STUDIO-001` / Studio definition authority | Changed | `IR-004`, `CRR-006`, UC-002/003/009/015 | Replace singleton-based refresh tests, then require the exact package-owned Brief team through real Studio GraphQL, a valid setup gate, enabled entry, iframe mount, and explicit remount. |
| `APIE2E-BRIEF-002` / package-owned team member identity allocation | Corrected and verified | `IR-005`, `CRR-008`, UC-009, AC-005/006 | Direct non-fake regression and real Studio binding/run/provider/event/notification/artifact journey pass; prior `APIE2E-F003` is resolved. |
| `APIE2E-BRIEF-003` / standalone launch-profile ownership | Unclear in reviewed design; real requirement fails | UC-004/009/018, AC-005/006/011/013 | Preserve the clean standalone failure and route for focused origin review: no supported setup/profile input exists, configuration is empty, and launch rejects missing `llmModelIdentifier`. |
| Studio package GraphQL registration | Added narrow mutation | `IR-003`, `CRR-004` | Assert `DevkitReloadApplicationPackage` is used only after the root already exists and duplicate import never recurs. |
| Studio setup/entry and bundled definition lookup | Preserved requirement over graph-local definitions | UC-002/003/009, AC-003/005/006 | Execute the real imported-package route and prove the setup editor can resolve the package-owned bundled team. |
| Shared runtime, graph isolation, recovery, cleanup | Preserved behind explicit compositions | AC-005/006/012/013 | Recheck the durable server application matrix and live cleanup evidence. |
| Maintained project packaging and entry immutability | Preserved | AC-001/011 | Rebuild/validate/typecheck Brief and Socratic, hash trees and entry files, and compare hashes during live Studio generations. |
| Removed broad implicit REST registrar | Removed | Reviewed design, `IR-002`, `API-REV-001` | Retain the six current-behavior endpoint assertions using explicit dependencies; do not restore deleted singleton fallback setup. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Graph-local definitions, execution resources, worker/runtime lifecycle | Affected server matrix and Brief integrations | Same real Brief journey through both hosts | Live API + browser |
| API / transport / contract | Yes | New Studio package-reload mutation; existing backend reload; global Studio definition query | Devkit regression, GraphQL/service tests, server integration | Whether the real Studio definition query exposes package-owned definitions | Live API |
| Frontend component / state | Yes | Setup gate, enter/reload/exit presentation | Focused Nuxt 16/16 | Real setup editor against a package-owned bundle team | Browser |
| Browser integration / user journey | Yes | Real Studio route, setup, iframe entry/remount | Controlled-browser and component coverage | End-to-end setup/entry and explicit remount | Browser |
| Authentication / session / permissions | No | No account boundary in the approved local-first path | N/A | N/A | None |
| Desktop renderer / web-equivalent UI | Yes | Nuxt Studio route used by Electron and browser development | Focused Nuxt coverage | Real cross-boundary route/iframe behavior | Browser development path |
| Desktop shell / Electron-specific integration | No | No preload/IPC/window/package boundary changed | N/A | None | None |
| Process / lifecycle | Yes | Repeated watcher builds, package/backend reload, host/browser cleanup | Devkit and lifecycle tests | Repeated real generations and post-failure cleanup | CLI + process checks |
| Persisted-data transition | Yes | Current readers/migrations under isolated host data roots | Server database/integration coverage | Full both-host persisted journey remains gated by Studio entry | Live restart after fix |
| Worker / queue / distributed coordination | Yes | Graph-local workers and supported recovery | Isolation/lifecycle/worker tests | Complete real Brief team path through Studio | Live application journey |
| External integration | Yes | Real local Studio GraphQL/REST/Nuxt and system Chrome | Repository client/service coverage | Cross-authority identity visibility in the running server | Live API + browser |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis`
- Project type and runtime stack: pnpm 10.28.2 TypeScript/ESM workspace; Node 22.23.1; Fastify 4; Vitest 4.0.18; Prisma/SQLite; Nuxt 3.21.1/Vue; Playwright Core 1.58.2; Chrome 150.0.7871.187.
- Conflicting, missing, or unclear project instructions: none material. Server tests use `vitest run --no-watch`; Nuxt tests use `--run`; `dev:studio` requires a running Studio server and instructs the user to remount explicitly. A controlled browser requires installed Chrome/Edge or an explicit executable/channel; `--no-open` is the supported opt-out.
- Required environment variables or secrets available: `Yes`; an installed local LM Studio provider/model was available and completed the real Studio run. Standalone failed before provider invocation because its clean host data had no launch profile; no unavailable external dependency blocked the round.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `/README.md`, `/package.json` | Workspace bootstrap and root development | Root `pnpm dev` starts the real server and Nuxt surface. |
| `/docs/custom-application-development.md` | Application command contract | `dev`, `dev:studio`, `build`, `validate`, `start`; real hosts, no mock fallback. |
| `/autobyteus-server-ts/AGENTS.md`, `package.json`, `vitest.config.ts`, `.env.test` | Server test environment | Use Vitest non-watch and project-owned Prisma test database. |
| `/autobyteus-web/AGENTS.md`, `package.json` | Studio web-equivalent validation | Run focused Nuxt tests with `--run`; prefer browser development path over Electron for web behavior. |
| `/autobyteus-application-devkit/README.md`, `package.json` | CLI/browser behavior | `pnpm test`; installed Chrome/Edge or explicit browser selector unless `--no-open`. |
| `applications/{brief-studio,socratic-math-teacher}/{package.json,autobyteus-app.config.mjs}` | Maintained project scripts and package mapping | Both projects map their non-default inputs and all exposure flags into the shared package owner. |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Devkit regression | workspace root | `pnpm -C autobyteus-application-devkit test` | Builds first; owned `.tmp-tests` and `dist` | command exit / 19 tests | remove generated test/build output |
| Server application matrix | workspace root | `pnpm -C autobyteus-server-ts exec vitest run <50 paths> --no-watch` | Test-owned Prisma/SQLite | 50 files / 216 tests | runner/global teardown |
| Maintained packages | each app root | `pnpm build`; `pnpm validate`; `pnpm typecheck:backend` | Generated read-only importable package | exit 0 and digest | restore tracked generated README only |
| Studio server and web | worktree root | `pnpm dev` | isolated API/E2E `.autobyteus/development`; ports 8000/3000 | backend and Nuxt ready markers; API probes | SIGINT only owned process tree; remove owned state |
| Brief Studio session | Brief root | `pnpm dev:studio` | real public local-package import/refresh/backend reload | `Studio package ready` / reload complete | SIGINT; restore source; remove generated state |
| Browser journeys | temporary Playwright Core probes | system Chrome against Studio `http://127.0.0.1:3000/applications/<id>` and standalone `http://127.0.0.1:43124/` | web-equivalent Studio and standalone surfaces | semantic setup/UI/business assertions plus API/log correlation | close context/browser; remove probes |
| Brief standalone session | Brief root | `pnpm dev -- --port 43124 --no-open` | real selected-app host; clean `.autobyteus/dev/data`; no mock/browser auto-open | `Standalone application ready` and bootstrap | SIGINT; remove owned state |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Brief and Socratic importable packages | Shared devkit pack | Hash package tree and entries; no host-specific build | generated package retained as repository build output; tracked timestamp README restored |
| Studio package registration | Public local-package GraphQL mutation in isolated server state | Select exact current-worktree Brief root; do not reuse a desktop process | API/E2E root removed after server stop |
| Brief execution resources | Package manifest default bundle team; Studio setup saves a local model launch profile | Studio uses the exact current IDs and supported setup. Standalone starts from a new writable root without manual DB injection. | evidence retained; state removed |
| Browser state | temporary Playwright profile | no user profile or user-running browser disturbed | closed and removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration`
- Design-spec and implementation-handoff references: design `Persisted Data / State Transition Decision`; requirements AC-012; implementation handoff `Persisted Data Transition Check`.
- Representative existing-data setup and required behavior: reuse current application/platform schemas and current readers under a host-owned data root; never mutate package input or add a version-specific reader.
- Evidence executed for the approved outcome: affected server integrations apply current migrations and exercise current storage/event/artifact readers; repeated Studio refresh reuses the same registered root and package identity without package-entry mutation.
- Migration-specific completion/recovery scenarios: `N/A`
- Upstream ambiguity or reroute required: `No`

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| SDK contracts and frontend startup suites | Current v4 wire, bootstrap normalization, startup/client ownership | AC-002/003/007/008 | Still Valid | Round-2 6/6 and 12/12 | Retain and rerun. |
| `autobyteus-application-devkit/tests/application-devkit.test.mjs` Studio client scenario | Import absent root once; refresh existing root; resolve current identity; backend reload afterward | AC-011; `IR-003` | Still Valid after API-REV-002 update | Updated operation model passes in 19/19 suite | Retain. |
| Two REST unit files with six old-boundary results | Current endpoint/error behavior using explicit graph dependencies | AC-003/005/010 | Still Valid after API-REV-001 update | Included in round-4 236/236 affected server rerun | Retain; deleted implicit registrar is not protected. |
| Brief imported-package/team-config integrations | Real package worker/gateway/storage/events/artifacts with deterministic team-run seam | AC-005/006/012 | Still Valid with explicit mock-gap limitation | Included in round-4 236/236 | Retain; the separate real allocator-authority regression was added and passed. |
| Standalone composition integration | Exact selection, package identity/digest, public route and WS policy | AC-001/004/009/010 | Still Valid but insufficient for AC-005/006 launch setup | Included in round-4 236/236; live clean standalone exposes the missing-profile gap | Retain; do not treat route/bootstrap coverage as real resource-launch proof. |
| Graph isolation, lifecycle, and worker recovery tests | Distinct authorities, graph-local stop, recovery and aggregate cleanup | AC-006/012/013 | Still Valid | Included in round-4 236/236 | Retain. |
| Focused Studio iframe/shell/store tests | Presentation and launch transition behavior with mocked definitions | UC-002/003; AC-003/006 | Still Valid but insufficient for real catalog authority | 6 files, 16/16 | Retain; live browser/API proof remains necessary. |
| `autobyteus-server-ts/tests/unit/api/graphql/types/definition-catalog-refresh.test.ts` | GraphQL catalog schema plus agent/team refresh ownership and ordering | UC-002/009; AC-003/005/006 | Still Valid after round-3 update | Exact configured Studio pair is asserted; focused 3/3 and broader 51-file/219-test server selection pass | Retain. |

## Stale Or Obsolete Coverage Decisions

The six REST result assertions remain current. Only their former implicit singleton/broad-registrar setup was obsolete and was replaced in API-REV-001. No test protects a removed compatibility or fallback path.

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| Two REST unit files | Implicit service discovery during broad route registration | Explicit composition dependencies are the approved clean cut | REQ-005, AC-010, reviewed design | Same six response assertions using explicit lifecycle/gateway/orchestration doubles | `N/A` |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| `APIE2E-001/002` | Standalone exact selection/package digest/public ingress | AC-001/004/009/010 | `standalone-application-composition.integration.test.ts` | Retained from API-REV-001; direct composition regression. |
| `APIE2E-004` | Concurrent graph isolation | AC-006/012 | `application-platform-runtime-graph-isolation.test.ts` | Retained from API-REV-001; primary singleton regression. |
| `APIE2E-005` | Lifecycle, recovery, cleanup | AC-006/012/013 | platform lifecycle and engine host tests | Retained from API-REV-001; direct worker/stop evidence. |
| `APIE2E-BRIEF-DUR-001` | The run-authority composition builds one real allocator from exact graph-local definition/run/metadata authorities and shares it with agent/team services; package-owned definition allocation succeeds without a global lookup | IR-005/CRR-008; UC-009; AC-005/006 | `autobyteus-server-ts/tests/unit/application-platform/application-run-authorities.test.ts` | Existing allocator and team-service tests inject isolated fakes; the prior Brief integration fakes the team-run seam. A direct composition regression is required. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| `APIE2E-007` | Devkit Studio client regression | Model/assert `DevkitReloadApplicationPackage`, no duplicate import, current identity, and backend reload order | AC-011; IR-003/CRR-004 | Completed; 19/19 passes and real repeated Brief generations pass. |
| `APIE2E-STUDIO-DUR-001` | `definition-catalog-refresh.test.ts` | Replace two singleton spies with the configured Studio agent/team service pair; preserve agent-before-team refresh ordering | UC-002/009; AC-003/005/006; IR-004/CRR-006 | Completed; focused 3/3 and broader server matrix pass. |
| `APIE2E-REST-001/002` | Two REST unit files | Replace obsolete implicit registrar setup, preserve six current results | REQ-005, AC-003/005/010 | Completed in API-REV-001; round-2 rerun passes. |

## Durable Coverage To Remove

None. No current-behavior assertion was deleted or disabled.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-application-devkit test` | worktree | IR-003 import/refresh/current-identity/backend-order regression | Pass, 19/19 | `evidence/api-e2e/api-rev-002-devkit-regression.log` |
| 2 | SDK contract and frontend SDK package tests | worktree | v4 wire and host-neutral startup/client behavior | Pass, 6/6 and 12/12 | `evidence/api-e2e/api-rev-002-repository-core.log` |
| 3 | affected server application matrix (`vitest run` on 50 paths, `--no-watch`) | `autobyteus-server-ts` test configuration | explicit routes, Brief execution, standalone composition, isolation, recovery, lifecycle | Pass, 50 files / 216 tests | `evidence/api-e2e/api-rev-002-repository-core.log` |
| 4 | server build-config TypeScript no-emit | server build configuration | production compile boundary | Pass | `evidence/api-e2e/api-rev-002-repository-core.log` |
| 5 | focused Nuxt application surface/iframe/shell/store/URL/transport tests | `autobyteus-web`; six files, `--run` | Studio web-equivalent presentation | Pass, 6 files / 16 tests | `evidence/api-e2e/api-rev-002-studio-focused-nuxt.log` |
| 6 | Brief and Socratic `build`, `validate`, `typecheck:backend`; package/entry digests | maintained app roots | package mappings and immutable entry baseline | Pass | `evidence/api-e2e/api-rev-002-maintained-build-digests.log` |
| 7 | focused `definition-catalog-refresh.test.ts` | server Vitest, round 3 | Exact configured Studio definition authorities and refresh ordering | Pass, 3/3 | `evidence/api-e2e/api-rev-003-definition-catalog-refresh.log` |
| 8 | server build-config TypeScript no-emit and affected application matrix including the refreshed GraphQL test | server, round 3 | IR-004 compile plus broader regression | Pass, 51 files / 219 tests | `evidence/api-e2e/api-rev-003-repository-core.log` |
| 9 | focused `application-run-authorities.test.ts` plus allocator/team launch/service files | server Vitest, round 4 | Exact graph-local allocator construction, sharing, and package-owned definition allocation | Pass, new test 1/1; related selection 4 files / 17 tests | `evidence/api-e2e/api-rev-004-allocator-authority.log` |
| 10 | server build-config TypeScript no-emit and affected application matrix including both authority fixes plus allocator tests | server, round 4 | IR-005 compile plus broader regression | Pass, TypeScript; 55 files / 236 tests | `evidence/api-e2e/api-rev-004-repository-core.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | What Supports The Score | Remaining Uncertainty | Additional Validation That Could Improve It |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | Prior failure's direct regression passes; broad server/SDK/Nuxt and maintained builds pass | Real Studio setup/entry/remount and complete both-host Brief journey not yet rerun | Real Studio API/browser journey |
| Changed-boundary execution directness | 95% | Devkit operation order and affected server boundaries execute directly | Repository tests do not prove the live Studio catalog wiring | Live API/browser |
| Cross-boundary integration realism and mock gap | 90% | Real package/worker/SQLite/REST/WS plus deterministic team seam | Complete Studio package-to-UI boundary remains unproven | Real Studio route |
| Environment, configuration, identity, and fixture fidelity | 90% | Current worktree packages and real project configs/builds | Root Studio and exact canonical identities not yet exercised at this checkpoint | Isolated root Studio run |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | Graph isolation, worker recovery, aggregate cleanup, package refresh regression | Successful repeated live Studio lifecycle/remount pending | Repeated edits and cleanup |
| User-surface, browser, and desktop-shell confidence | 85% | Focused Nuxt 16/16 and prior controlled-browser proof | No round-2 real Studio route/iframe yet | Browser journey |
| Durable regression coverage quality and relevance | 95% | 15 cumulative API-owned paths now include the direct non-fake run-authority composition regression; focused 4/17 and affected 55/236 pass | Real browser/provider completion remains outside repository coverage | Live Brief journey |

- Overall post-repository confidence: `91%`
- Calculation method: simple average, `(90+95+90+90+90+85+95)/7 = 90.7%`, rounded.
- Every critical acceptance criterion directly proven: `No`
- Any applicable category below `90%`: `Yes` — user/browser confidence 85%.
- Default clean-confidence target of `95%` met: `No`
- Material residual risks: live package refresh, setup gate, bundled definition visibility, iframe entry/remount, and full both-host Brief parity still require broader execution.

## Broader Validation Decision

- Decision: `Required — executed until critical standalone failure`.
- Selected execution mode: `Live API`, `Browser`, `CLI`, `Lifecycle`.
- First required scenario outcome: `APIE2E-BRIEF-002` passed. Exact Studio binding/run allocation, real provider execution, researcher/writer publications, browser notifications `brief.created` / `brief.draft_run_started`, and `in_review` state resolve `APIE2E-F003`.
- Continuation outcome: `APIE2E-BRIEF-003` failed in the documented real standalone command. The Brief record persists, but Generate draft becomes blocked before binding with `llmModelIdentifier is required.`
- Confidence effect: the real changed allocator boundary is strongly proven, while critical both-host AC-005/006 remains failed; final confidence is 89% with requirement proof at 50%.
- Browser rationale: both surfaces are web-equivalent and were exercised through their real development hosts. Electron remains unnecessary.
- Blocker status: not blocked; provider availability was proven in Studio. The standalone result is a product/design failure, not an unavailable dependency.

## Desktop Application Validation Decision

- Desktop framework / shell: Electron wraps the Nuxt Studio in release builds.
- Web-equivalent behavior: setup, iframe mount/remount, Brief creation, Generate draft, run status, events/notifications, and artifacts.
- Shell-specific behavior: no changed preload, IPC, native window, packaging, or OS integration.
- Chosen approach: real root server plus Nuxt browser route with API/log correlation; no Electron launch.
- Effect on any already-running desktop application: `None`.
- Round-4 confidence consequence: a successful real Brief completion is mandatory before any Pass; repository-only success is insufficient.

## Live Environment And Fixture Plan

- Startup order and commands executed: build devkit; start root `pnpm dev`; start Brief `pnpm dev:studio`; perform the exact Studio browser journey; then start Brief `pnpm dev -- --port 43124 --no-open` and perform the standalone browser journey.
- Environment choices: macOS arm64; Node 22.23.1; pnpm 10.28.2; isolated API/E2E roots; loopback 8000/3000/43124; exact current-worktree package; system Chrome; local LM Studio model selected through supported Studio setup.
- Health/readiness: root backend/Nuxt ready logs; `Studio package ready`; standalone ready and same-origin bootstrap; API probes.
- Seed/fixtures: manifest-default Brief bundle team; Studio saved launch profile; new standalone writable data root with no manual database manipulation.
- Identity/auth: exact current-worktree Brief application/package/team/member IDs; no user identity required.
- Requirement-linked journeys: `APIE2E-BRIEF-002`, `APIE2E-BRIEF-003`, `APIE2E-PARITY-004`; UC-004/009/018; AC-001/005/006/011/013.
- Evidence: durable/build logs, browser/API/server/provider logs, screenshots, SQLite read-only configuration evidence, entry hashes, process/listener cleanup.
- Cleanup: all owned root/Studio/standalone processes, browsers, temporary probes, `.autobyteus` roots, test temp state, devkit output, and generated tracked README were cleaned/restored.

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| `APIE2E-BRIEF-002` | Real root Studio plus Brief `dev:studio`, system Chrome, real Brief create/Generate, API/log/provider correlation | Package-owned allocation, binding/run, real provider, notifications, researcher/writer artifacts | Full root/browser/provider orchestration is platform- and environment-sensitive; allocator authority is durable separately. |
| `APIE2E-BRIEF-003` | Real Brief standalone `dev -- --port 43124 --no-open`, clean data, system Chrome, API/SQLite correlation | Documented standalone product flow lacks a usable host-managed LLM profile and fails before binding | The needed intended setup contract is unresolved; durable coverage must follow reviewed design, not encode an accidental workaround. |
| `APIE2E-PARITY-004` | Pre/post package/entry hashes across exercised hosts | Compared frontend/backend entries are identical and immutable | Cross-process conformance is too expensive for a focused unit suite. |
| `APIE2E-LIVE-CLEANUP` | Listener/process/path scan | No owned service/browser/data leak | OS process inventory is platform-dependent. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up |
| --- | --- | --- | --- |
| Successful standalone Brief team/provider/artifact completion | Real documented flow fails first on missing required launch profile | Critical AC-005/006 | Focused origin review, then design/implementation correction and rerun. |
| Complete successful same-package dual-host parity | Standalone business journey fails | Critical AC-001/005/006 proof incomplete | Rerun after correction. |
| Fresh round-4 explicit Studio remount and remaining starter/Socratic/full command matrix | Stopped after new critical failure; prior historical evidence not promoted to round-4 success | AC-011/013 incomplete | Resume only after the critical standalone issue is corrected. |
| Electron shell | No changed shell boundary | None for this scope | None. |
| Multi-node/public-auth deployment | Outside approved first slice | None for current local-first scope | Future work only. |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| AC-005/006 requires real team execution with usable launch semantics in standalone, but the reviewed standalone command/host has no setup UI or resource/model/profile input and a clean configuration store is empty | `Design Impact` (preliminary; focused origin review required) | `api-rev-004-brief-standalone-real-team.log`, failure API JSON, configuration log, `api-rev-004-standalone-launch-profile-surface.log` | `code_reviewer` first; if confirmed, `solution_designer` |

## Investigation Decision

- Proceed To API/E2E Execution: `Completed — round 4 Fail`.
- Repository-Resident Durable Coverage Added / Updated / Removed: `Yes` — added one direct non-fake application run-authority regression; retained the cumulative 14 prior paths; removed none.
- Post-repository confidence: `91%` — TypeScript Pass; new direct composition test 1/1; related allocator/launch/service selection 4 files/17 tests; affected matrix 55 files/236 tests.
- Broader validation decision: `Required; Studio Pass then standalone critical Fail`.
- Final confidence: `89%`; requirement/acceptance proof is 50% because AC-005/006 fails in standalone.
- Reroute Required: `Yes`.
- Recommended Recipient: `code_reviewer` for focused failure-origin review.
- Notes: `APIE2E-BRIEF-002` / `APIE2E-F003` is resolved. New `APIE2E-BRIEF-003` / `APIE2E-F004` is not an external-provider blocker; the same provider completed Studio. Cleanup is complete.

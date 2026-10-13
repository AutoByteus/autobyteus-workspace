# API/E2E Coverage Investigation

## Investigation Meta / Routing
Round 1, initial IR-001 request, 2026-10-13. Assigned worktree /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description; branch codex/agent-team-members-after-description; input HEAD 216331390820766fa1561048c8b3df84e21fb062, clean. Source commit 151c8131a8f4dbe70d4fd5ede3b6e502301adb04. Full upstream package read before test edits/execution.
- requirements-doc.md: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/requirements-doc.md
- investigation-notes.md: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/investigation-notes.md
- design-spec.md: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/design-spec.md
- solution-revision-record.md: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/solution-revision-record.md
- solution-handoff.md: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/solution-handoff.md
- implementation-handoff.md: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/implementation-handoff.md
- implementation-revision-record.md: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description/tickets/in-progress/agent-team-members-after-description/implementation-revision-record.md
- Supplements: original three screenshots inventoried at absolute paths in investigation-notes.md/E001, plus implementation-render-01 observations/inspected images/self-review; current-state and implementation evidence, not independent validation.
- Architecture/source-review artifacts: N/A — not applicable. Delivery re-entry: N/A. Current API revision: API-REV-001 / completed Pass; prior result N/A.
- task_size=Small; architectural_risk=Low; Direct Low-Risk input; successful route Delivery; test review Not Required — direct low-risk route. No new production owner/contract.

## Current Requirement / Design Basis And Scenarios
R1 Approved, SR-001/SR-002: AC-001 order Description → Members → Instructions → Handoffs for every loaded Team; AC-002 unchanged count/coordinator/cards/shared and team-local View destination/return context; AC-003 header/actions/ownership/content/disclosure/handoff order preserved; AC-004 same responsive containment/columns and loading/not-found states. DS-001–003 map common composition and unchanged emits/parent pages. Production diff independently read: intact section relocation, unused router removal, no handler/CSS/data change. Legacy/Compatibility Removal and Persisted Data checks in handoff read: clean / Not Affected, corroborated diff.
SCN-001–003 all supported. Additional concrete preservation path: Org → scoped Team → shared Agent → same Team → same Org through existing page/store integration. No unsupported/contrived scenario recorded or tested; no concurrency/provider/artificial capacity promise.

## Changed Behavior And Boundaries
| Boundary | Affected / evidence | Remaining risk / selected surface |
| --- | --- | --- |
| Frontend component / web-equivalent Electron renderer | Yes: sibling order; real children in colocated tests | CSS geometry, long content, real input/disclosure: durable browser probe |
| Browser navigation / parent pages / identity | Preserved: actual page/store integration exists | Router transport/Apollo are doubles; directly execute page handlers and canonical local destination |
| Backend/API/auth/session | No production change | No new server contract or permission policy; not retest whole backend |
| Shell/IPC/window/lifecycle/packaging | No production change | Browser not shell proof; no shell gate needed for local template delta |
| Persistence/workers/queues/external integrations | No change | No migration/data loss/model use authorized |

## Project Execution Discovery
Read assigned-worktree AGENTS.md, DESIGN.md, TESTING.md, RELEASE.md, autobyteus-web/AGENTS.md, root README packaged/testing/development sections, autobyteus-web/README.md env/development/testing, docs/isolated-app-instances.md, root/web package.json, web vitest.config.mts, nuxt.config.ts, existing browser probes/fixture helpers. No closer AGENTS/TESTING found. No policy conflict. Root TESTING.md is applicable testing guideline (not primary checkout's differing version).
Commands: test:nuxt once mode narrow then related suites; web/localization guards; renderer changes require browser probe; full real-product journeys require source-current isolated desktop. This stage selects component browser + actual page/store repository integration, NOT a full product/desktop journey. No changed shell or material backend risk warrants packaging build; if realism remains inadequate after these checks, revisit and use isolated-app start --build. Human app verification remains Delivery-owned and mandatory, not replaced here.
Prerequisites: implementation installed frozen-lockfile dependencies and prepared Nuxt successfully; verify usable via checks. Node/pnpm/Chrome version recorded at execution. No secrets required. Clean child environment: PATH, private HOME/TMPDIR, NUXT_TELEMETRY_DISABLED and owned BACKEND_NODE_BASE_URL only. Browser gets fresh isolated context. Probe chooses loopback free Nuxt/health ports, installs only owned fixture page, seeds own Pinia catalog; health HTTP and definition-feed WS explicitly emulated. Unexpected API calls/browser errors fail. Warm dev dependencies before assertions. Remove browser/page/process group/health server/temp HOME; confirm ports/process gone. No user-running app/data target; original supplied screenshot files are read-only task attachments.

## Existing Durable Coverage Validity
| Path / tests | Decision | Basis / action |
| --- | --- | --- |
| components/agentTeams/__tests__/AgentTeamDetail.spec.ts, all 9 tests | Still Valid | Current order, ownership, loaded/error/loading, coordinator/count/content, shared/local emits, Run/Back/Edit/Delete preserved R1; real Instructions/Handoffs, dialog/store/runStart doubled |
| components/agentOrgs/__tests__/AgentOrgOwnedAuthoring.spec.ts, all 15 tests | Needs Update → Updated / Still Valid | Scoped exact-reference/ownership/nonpublication and errors; baseline query-fixture drift corrected, unknown-I/O assertion added; every original scenario retained |
| components/common/__tests__/ExpandableInstructionCard.spec.ts | Still Valid | Real disclosure edge cases; mock DOM metrics need browser proof |
| components/collaboration/handoffs/__tests__/HandoffManager.spec.ts | Still Valid | Real view order/identities/empty/edit behavior retained |
| pages/__tests__/org-definition-navigation.spec.ts, 2 journeys | Needs Update (extend, not replace) | Actual Org/Team/Agents pages and stores: add current order at loaded Team checkpoints and canonical team-local route/return; no stale assertion removal |
| Other server/Electron/runtime/browser probes | Out Of Scope | No changed boundary they directly prove; inventory scripts and nearby probe patterns read |
No stale/removal decisions; implementation's old-router mock removal matches proven-unused acquisition.

## Coverage Gaps / Durable Plan
| Case | Decision / path | REQ/AC and why |
| --- | --- | --- |
| NAV | Update pages/__tests__/org-definition-navigation.spec.ts | AC-001/002/003: actual scoped/shared parent route integration plus local Agent destination/return (not emits only) |
| B01 | Add tests/e2e/agent-team-detail-probe.mjs + fixtures/agent-team-detail.page.vue + package script test:e2e:agent-team-detail | AC-001/002/004: six-member long-content production component, 1440/600 geometry, containment, names/count/coordinator/handoff order |
| B02 | Same durable probe | AC-002/003: trusted keyboard/click shared/local emits, real disclosure and dialog cancel, unchanged Back/Edit; Run/confirmed deletion already covered safely in unit |
| B03 | Same durable probe | AC-001/003/004: second application-owned Team/empty handoffs, no Delete, missing Team no loaded sections |
Durable browser coverage is appropriate: recurring composition/responsive regression with established repository fixture-probe layer. Ticket preview alone is not durable. No temporary probe planned; no removal.

## Repository Execution Plan / Results
All commands from /Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-members-after-description, evidence under this ticket. Ledger required: Yes — independently meaningful suites/browser cases and interruption risk. Canonical api-e2e-test-case-ledger.md initialized before execution.
| Order / case | Command | Result / evidence |
| --- | --- | --- |
| 1 / R01 | pnpm -C autobyteus-web test:nuxt components/agentTeams/__tests__/AgentTeamDetail.spec.ts --run | Pass 9/9 / api-focused.log |
| 2 / R02 | pnpm -C autobyteus-web test:nuxt pages/__tests__/org-definition-navigation.spec.ts components/agentOrgs/__tests__/AgentOrgOwnedAuthoring.spec.ts components/common/__tests__/ExpandableInstructionCard.spec.ts components/collaboration/handoffs/__tests__/HandoffManager.spec.ts --run | Pass 31/31 final / api-related-final.log; authoring attempt api-related.log retained |
| 3 / R03 | guard:web-boundary; guard:localization-boundary; audit:localization-literals; git diff --check; repository artifact hygiene | Pass / api-guards.log; final guards also api-guards-final.log |
| 4 / B01–03 | pnpm -C autobyteus-web test:e2e:agent-team-detail --output-dir <fresh ticket dir> --ledger-file <canonical ledger> | Pass B01–B03 / api-browser-02/evidence.json; first selector-authoring attempt preserved |

## Post-Repository Confidence / Broader Decision
Repository evidence now: R01 9/9 plus R02 31/31 pass; real pages/store/Apollo cache execute scoped/shared/local journeys, router transport and GraphQL server are doubled. Baseline fixture omissions fixed in their own commit. Post-repository gate (historical): broader validation Required, Browser; repository DOM does not exercise real CSS widths/disclosure nor trusted controls. Expected ≥95% after renderer proof plus actual page/store integration. Full backend/desktop, live providers and unrelated lifecycle Not Tested / out of changed scope; browser evidence never called shell sign-off.

## Ambiguities / Decision
None. Proceed: Yes; durable updates/additions as above; no reroute required. Only R1-supported behavior. Update this investigation with actual repository results/mandatory scorecard before browser run.

## R02 Authoring / Fixture Findings (historical, before corrections)
R01 Pass 9/9. R02 initial 3 new navigation assertions failed because global test localization turns keys into “Description heading”/“Members heading” without count, not because product ordering was wrong. Correct new harness to use actual English localization for mounted page assertions. api-related.log retained; subsequently resolved with 31/31 and hardened combined 40/40.
Existing navigation and AgentOrgOwnedAuthoring mocks omit current GraphQL fields skillScope/loadIssue/loadIssues and reject definitionProblems requested by catalog. These are test-boundary omissions (service logs show swallowed Apollo errors), present in original HEAD fixtures; R1 did not alter query contracts. Revise validity of these fixtures to Needs Update, preserve every scenario/assertion. Small baseline harness fix was its own labelled commit per TESTING Rule 9; fill current shape and respond healthy empty definitionProblems rather than hide errors. Apollo cache.diff/canonizeResults deprecation is framework-level warning, not missing fixture data. Correct authoring inventory: 15 tests, not 12.

Baseline harness fix: 1db38232a22e6e8763bd6489000e7a8910ec44f1. Original tests 17/17 pass with 12 occurrences of swallowed definitionProblems error and 110 missing-field messages; fixed original tests 17/17 pass with both counts zero. api-baseline-before.log/api-baseline-fixed.log retained. Not a production defect; no old behavior preserved. New navigation mount now uses actual localizationRuntime.translate rather than global fallback.

## Post-Repository Mandatory Confidence Scorecard
| Category | Score | Supporting evidence / uncertainty / evidence gain |
| --- | --- | --- |
| Requirement / AC proof | 90% | Order/count/coordinator/actions/states and real-page return scope directly proven; AC-004 real geometry still missing; browser closes it |
| Changed-boundary directness | 95% | Current production template with real children executed; CSS layout not rendered in happy-dom |
| Integration realism / mock gap | 90% | Actual three page owners, real stores/Apollo normalization/exact reader; router and server transport doubles; browser component events verify trusted input, unchanged production handlers/diff bounds server risk |
| Environment/configuration/identity/fixtures | 90% | Correct scopes/canonical local ID, fresh Pinia, current queries/complete fixtures; real browser configuration/locale pending |
| Failure/edges/lifecycle/recovery | 95% | Loading/not-found, scope mismatch/reference failures, cancellation/confirmation from valid component/scoped suites; no changed process/recovery obligations |
| User surface/browser/desktop-shell | 75% | DOM/classes only; geometry/disclosure/input not independently browser-proven yet; no shell delta |
| Durable regression relevance | 95% | Requirement-linked real-child order plus actual parent paths; implementation original-order reversal witness read; new browser probe awaits execution |
Overall 90.00% = (90+95+90+90+95+75+95)/7. Clean 95% gate NOT met; user-surface category below 90%; AC-004 remains unproven by independent real rendering.
Broader Required — Browser (durable production-component probe). Capture B01–B03, raw DOM/geometry/state, inspected 1440/600 screenshots, browser/API error list and cleanup. Expected final 95% with no category <90%. Desktop/full real backend journey is not selected: sibling template order only, intact handlers and page/store preservation already executed; no shell/transport/runtime/data contract delta. This bounds remaining mock gap, does not claim real backend or shell proof. If targeted browser exposes integration concern, reassess rather than force passing percentages.
Original three screenshots independently inspected: old Instructions/Handoffs-before-Members and six-card roster/coordinator corroborate problem and preservation, not new fixture normative data.

## Browser authoring correction before rerun
api-browser-01: B01 Pass; B02 Fail from a case-sensitive English selector written “Delete definition” while the unchanged production catalog agentTeams.generated.ts labels it “Delete Definition”. Known API/E2E-owned authoring error, not product failure; current production label/source inspected. Browser events empty, one health request, all owned resources/ports removed. B03 Not Tested on this attempt. Correct the selector to actual product copy; retain all first-attempt logs/evidence and reuse B01–B03 in fresh api-browser-02. Add failure screenshot/DOM capture for future diagnostics. No authoritative completed-round result yet; resolve before sign-off.

## Post-browser evidence and final harness hardening
api-browser-02 B01–B03 Pass; B02 first authoring failure resolved (actual Delete Definition visible and cancellation completed); browser events empty, only owned health request, cleanup receipt Pass. Both width screenshots inspected; DOM proves below-fold handoffs/order, not screenshots alone. Independent socket/process/route cleanup confirmation api-cleanup-check.json. Final source blob unchanged 82982846da660d3bb9c8b9349589e14cc8b5de17; combined repository 5 suites/40 tests pass in api-combined-final.log.
Before final durable-test commit, add unknown-operation ledgers/assertions to both corrected Apollo integration fixtures so future missing I/O cannot be swallowed by production's graceful error UI and incorrectly counted as a pass. This is test-boundary hardening of observed baseline defect, not product behavior change; intentional exact-read failure stays supported. Subsequent final hardened 40-test rerun and guards/hygiene passed (see Final Investigation Decision).

## Final Investigation Decision
API-REV-001 / round 1 complete: Pass, 95.71%; direct Small/Low route, test review Not Required — direct low-risk route. Durable coverage commit ae7f0fc44353a9211eb32e97a3ede5ce011f42e0; baseline fixture fix 1db38232a2 (full pin in execution report). Final hardened combined repository run 5 files/40 tests Pass, guards/audit zero findings, syntax/diff/artifact guards Pass. Final browser probe itself unchanged since api-browser-02; repository fixture-only hardening executed afterwards. Broader Required — Browser, completed. Clean target met, no category below 90%, AC-001–004 directly proven over supported scope; no material broader-validation risk for template-only delta. Final scorecard/report carries evidence and remaining unchanged transport/shell limitations. No durable removals; no temporary executable probe introduced; fixture installed transiently by durable probe removed. No reroute/production defect/upstream gap. Delivery still owns explicit app verification, integrated/docs work, release agreement and personal finalization.

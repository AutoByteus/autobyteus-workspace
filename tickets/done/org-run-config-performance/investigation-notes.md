# Investigation Notes — Org/Team run-configuration performance

## Meta / Bootstrap
- Package `org-run-config-performance`; date 2026-10-03; current round `SR-010` (approved architecture investigation); approved performance baseline `SR-006`.
- Requirements SR-006 explicitly approved in SR-010; architecture investigation/design complete, Medium / High, ready for applicable independent review. Earlier approval holds below are historical, not current status.
- Git isolated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance`, branch `codex/org-run-config-performance`.
- Successful `git fetch origin` then worktree from refreshed `origin/personal` at `1b976216da0cbd0cc84fef3fe22a2739325b8ad3`.
- Eventual finalization target `origin/personal`; no release authorized. No bootstrap blocker.
- Shared checkout originally `01859eb53` with unrelated changes, left untouched.
- After user-reported power-off/restart, saved documents/evidence recovered; four owned ports rechecked empty. No stale/unknown PID terminated. Prior cleanup receipt remains authoritative for pre-interruption shutdown.

## Request / Product Understanding
User reports slow imported **AutoByteus Org** (not Software Engineering Org) config/launch with **Codex / GPT-6.1 Sol** (not GPT-5.6), slow Team config and model options; requests experiments/timing. User subsequently confirms the affected node is local desktop and asks whether the cause was found. No numeric duration supplied. Initial clarification/restart did not approve scope; explicit cumulative SR-006 approval was subsequently captured in SR-010. Vague other navigation remains unclear.

Org composes Agents/flat Teams without implicit coordinator; Team is coordinator-led. Run opens config, resolves exact owned definitions/options, validates and creates run. Imported Org launch leaves Agent/Team recipient unselected until subsequent work.

## Supported Current Behavior
| ID | Product trigger/lifecycle | Evidence / confidence |
| --- | --- | --- |
| BEH-001 | Org Library Run → config → exact references → runtime/model/schema readiness | Org docs, AgentOrgExperience/RunConfigPanel, isolated UI; high |
| BEH-002 | Team Library Run → config → runtime/model/options | Team docs, shared composable, Software Engineering Team isolated UI; high |
| BEH-003 | Ready Org → Run → created identity/workspace → choose Agent/Team | Org docs, creation/inspection, observed workspace; high quiet-local confidence |
| BEH-004 | Unavailable runtime/model failure → existing reason/loading/error/admission states | Source-supported; full failure journey not exercised here |
| BEH-005 | User timing request → isolated passive measurement → owned cleanup | User, TESTING.md, receipts; high |

SCN-001–003 are supported normal journeys; SCN-004 is a supported normal discovery-error alternate; SCN-005 a supported normal operational measurement scenario. Synthetic idle API creates are fixtures, not approved new product scope.

## Source Log / Technical Facts
Paths below are relative to task worktree. Initial entries establish current behavior/feasibility; the SR-010 architecture entries below supply the technical-decision evidence.

| Source / command | Finding / implication |
| --- | --- |
| solution-designer skill/requirements standards/templates | Explicit intended-behavior approval precedes architecture; separate evidence authority |
| `autobyteus-web/AGENTS.md`, `autobyteus-server-ts/AGENTS.md`, `TESTING.md` | Applicable instructions read; no root/ancestor AGENTS. Isolated test-owned app/data required; full-product changed validation needs current worktree build |
| `autobyteus-web/docs/agent_orgs.md`, `docs/agent_teams.md` | Supported config/run/recipient/inheritance contracts |
| `autobyteus-web/components/agentOrgs/AgentOrgExperience.vue` | Run routes `/workspace?rootSubjectKind=agent_org&definitionId=...&mode=configuration` |
| `autobyteus-web/components/workspace/config/AgentOrgRunConfigPanel.vue` | Required catalogs/references/schema readiness, create/history/workspace; no implicit Org recipient |
| `autobyteus-web/services/agentOrgDefinition/agentOrgDefinitionReferences.ts` | Exact owned reads, request-local dedup, TEAM_LOCAL identities; preserve required freshness |
| `autobyteus-web/stores/runtimeAvailabilityStore.ts` | Completed response cache; separate force refresh; no explicit store in-flight promise. Apollo dedup observed, so no duplicate-query root-cause claim |
| `autobyteus-web/composables/useRuntimeScopedModelSelection.ts` | All-runtime availability gates options; catalog loading/cache/error separate |
| `autobyteus-web/stores/llmProviderConfig.ts` | Runtime catalog caches/in-flight dedup already exist |
| `autobyteus-server-ts/src/runtime-management/runtime-availability-service.ts` | All-provider Promise.all; AGY availability calls full models probe; per-runtime method exists |
| `autobyteus-server-ts/src/runtime-management/antigravity-cli-capability.ts` | `agy --help`, then `agy models`; nonblocking spawn; bounds3s/15s, not observed18s |
| `autobyteus-server-ts/src/runtime-management/grok/grok-build-capability.ts` | Version/help discovery probes |
| `autobyteus-server-ts/src/llm-management/services/codex-model-catalog.ts` | acquire/init → model/list → release; no inference/model-weight loading |
| `autobyteus-server-ts/src/runtime-management/codex/client/codex-app-server-client-manager.ts` | Per-cwd client reference count, start promise, initialize/release close; lifecycle requires later design investigation |
| `autobyteus-server-ts/src/llm-management/services/run-model-selection-service.ts` | validateMany/listOptionsMany already share request-local catalog promises; not a new batching fix |
| `pnpm install --frozen-lockfile --offline` | ~7.7s task dependency install; devkit-bin and ignored @google/genai build warnings retained, not perf findings |
| `pnpm --silent isolated-app start --app /Applications/AutoByteus.app` | Isolated installed1.4.92 baseline, private data; no changed-source proof |
| `BACKEND_NODE_BASE_URL=http://127.0.0.1:50887 pnpm -C autobyteus-web exec nuxt dev --host 127.0.0.1 --port 50910` | Source1.4.93 dev frontend + test-owned Chrome; not packaged renderer |
| Public GraphQL import/catalog/create/inspection/model-options | Normal API against test-owned data; operation/payload/errors retained in raw JSON |
| `which codex`; `which claude`, `claude --version`; `grok --version`, `grok agent --help`; `agy --help`, `agy models` | Three repeated independent provider partitions |
| `pnpm --silent isolated-app stop iso-50886-d874` | Graceful shutdown/private root removed/ports released before interruption |

Relevant performance owner paths checked unchanged against v1.4.92; intervening Org/Team config deltas concern auto-approval defaults/tests. This does not prove packaged-renderer parity.

## Runtime / Probe Findings
Detailed canonical supplement: `performance-findings.md`; actual browser raw/summary in `evidence/passive-ui-events.jsonl` and `timing-summary.json`.

- **F-001 confirmed cold gate:** click→Codex offered2270.4ms; all-runtime requests1640.5–1931.5ms (3, median1716.9). AGY help/models1459–1498ms (3), models1392–1436; Codex discovery7–9ms. Source corroborates unrelated AGY discovery on Codex cold critical path.
- **F-002 phase partition:** Codex selected→options155.6–197.7ms (3); quiet Org launch598.6ms (1), mutation531.2. Warm Org config13.3/refs58.6ms (1); cold config307.2/refs402.9 (1); cold Team config368.5 (1).
- **F-003 incomplete general symptom reproduction:** 18 API idle creates336–392ms; history at21idle Orgs fast (workspace median3ms, roots8). No realistic transcript/streaming/remote load.
- **F-004 secondary, not causal:** 20 projection reads for 10Agents in2batches,17–29ms each. Dev long tasks up to1454ms confounded by optimization/Spotlight/VM load; no packaged hotspot established.

Passive browser timing is actual click/change→DOM-ready, not CUA latency or compositor paint. Plugin observed click/change, DOM, longtasks and fetch operation/runtime/status/duration metadata; no UI automation. All browser interactions via CUA. Removed production-path disposable plugin, retained evidence copy.

## Environment / Payload / Structural Inventory
- Two initial user-app read-only snapshots only; no test actions/requests/mutations/restarts/terminations on user app.
- Isolated instance `iso-50886-d874`: control50886, backend50887, dev frontend50910, collector50911. Private paths in isolated-start receipt.
- Fixture copy from `/Users/normy/autobyteus_org/autobyteus-agents`; recorded revision `cc54b541491523df41840e7fec02d0f26e9f5d79`. Source working tree observed dirty: revision is provenance only, **not exact copied-content pin**; no full fixture hash retained. Selected definition/catalog facts captured. Original source untouched; copy removed with owned root.
- Imported14Teams,47Team-local Agents,7shared Agents. `autobyteus-org`:3Teams/10configured Agents; `software-engineering-team`:6members.
- Exact runtime/model `codex_app_server` / `gpt-6.1-sol`, UI default reasoning low. No substitution.
- 2UI+18API idle Orgs, final measured UI launch→21; no turn, inference or credential import.
- Relevant payloads: availability/model catalogs and owned reference definitions/configurations. Relevant structures: GraphQL, runtime selection/catalog cache, CLI/client lifecycle. Target API/cache/concurrency choice unknown before design. No persistence/security/deployment boundary change proposed; no migration inferred.

## State / Safety / Rejected Measurements
Public API writes only to private test-owned SQLite/data root. Preserve existing owned identity, definitions, configuration/inheritance/history and credentials. No user-data loss/reset acceptable; disposable test-only root removed.

`evidence/control-timing-caveats.md` records excluded evidence: rejected GraphQL fields, wrong first launch selector, controller timeout before dispatch, Nuxt optimization/dynamicimport errors, confounded3857ms Team snapshot during synthetic population. These are not successful application latency or installed-app failure claims.

## Product Context
Product help not requested. Product/prototype repository/ticket/spec/visuals/approval: **N/A — not applicable**. No Product route.

## Supplement Inventory
Owner: Solution Designer; paths relative to canonical package. All are factual, **not behavior-defining**, no intended-behavior approval applies.

| Artifact | Purpose / scope | Related IDs / status |
| --- | --- | --- |
| `performance-findings.md` | Canonical factual interpretation/source/timing index | REQ-001–005; completed investigation baseline |
| `evidence/timing-summary.json`, `passive-ui-events.jsonl` | Actual phases/HTTP/longtasks | REQ-001,005; retained |
| `evidence/passive-ui-probe.ts`, `passive-collector.mjs` | Disposable passive methodology copies | REQ-005; not production/test coverage |
| `evidence/capability-cli-timings.json` | 3-repeat probe partition | REQ-001,005; retained |
| `evidence/api-baseline-initial.json`, `codex-catalog-baseline.json`, `definition-baseline.json`, `org-idle-history-scaling.json`, `org-reader-baseline.json` | Public API fixture/catalog/read/create timing, explicit errors | REQ-003–005; evidence, not broad pass |
| `evidence/source-context.json`, `control-timing-caveats.md` | Provenance/method limits | REQ-005; retained |
| `evidence/isolated-start.json`, `isolated-stop.json`, `cleanup-receipt.json`, `resume-check.json` | Isolation/cleanup/restart recovery | BEH-005; receipts |
| `evidence/install.log`, `nuxt-dev.log`, `isolated-app.log` | Supporting setup/runtime/error logs | REQ-005; retained |
| `evidence/handoff-rules.json` | Exact returned route rules; none matches Draft | SR-001; retained |
| `evidence/user-local-node-clarification.json` | Exact user environment clarification; not approval | SR-002; factual |
| `evidence/handoff-rules-sr002.json` | Historical SR-002 route lookup for Ready for Approval | SR-002; factual, created after lookup |
| `investigation-result.md` | Full cumulative outcome/context/rule route | Current SR-003; requirements conversation only |

## Unknowns / Risks / Requirements Implications
- UNK-001: node resolved as local desktop by user; elapsed seconds/precise interval still unknown. Cold discovery gate is confirmed, not an explanation of every reported local desktop delay.
- UNK-002: long transcripts/background streaming on local desktop; idle fixtures not representative. No active-load root cause established.
- UNK-003: installed packaged 1.4.93 baseline measured in SR-003; changed-build API/E2E still needed after any implementation.
- RISK-001: small UI sample counts/host load; not enough for absolute budget/pass.
- RISK-002: dirty fixture provenance; do not overstate reproduction.
- DEC-002: fix scope and explicit approval pending.

REQ-001 proposes independent verified readiness, not skipping verification. REQ-002–004 preserve existing availability/freshness/schema/admission/selection/recipient contracts. REQ-005 requires honest repeatable timings. Architecture investigation/design: **not started**; reconfirm contracts/cache/lifecycle after approval. Existing dedup/batching is not a new fix; investigation volume is not size/risk classification.

## SR-002 — Local Desktop Clarification
Evidence-only clarification. User confirms the slow node is local desktop. Prior F-001–004 remain unchanged; no new timing performed or whole-symptom causal conclusion inferred. Environment uncertainty no longer blocks presenting the narrow independence/preservation proposal for approval. No intended behavior changed, no approval inferred, no target architecture selected.

## Historical SR-003 Intake — Post-Run History Row (Now Completed Below)
User distinguishes model options inside config from slow creation/history-row display after clicking Run Agent Org. This is within UC-001/SCN-003 and REQ-005 measurement intent, not approval of the proposed fix. New measurement must independently timestamp click, creation response, history refresh, exact new-row DOM/visibility and workspace readiness. Fresh isolated installed app is now 1.4.93; both packaged renderer and backend will be observed, not the earlier Nuxt path. Instance iso-54639-13b7/ports 54639,54640 is test-owned; launch receipt retained. No real model turn or user-app/data mutation authorized. At intake, requirements temporarily returned to Draft pending the additional factual round; the completed result below restores Ready for Approval.

## SR-003 — Completed Post-Run / Exact New-Row Investigation
User requests this interval separately and says continue; neither message approves intended fixes. Full factual result in `launch-row-findings.md`. F-005 records5000 actual stored-tree reads for 10 member collision checks with 500 history roots, plus global admission scan. F-006 records ~10MB repeated history snapshots and profiled full-subtree JSON.stringify equality in navigation. The exact new row now measured in packaged 1.4.93: small 361–531ms; ~500 history primary light-observer 1689–2047ms. Workspace readiness can precede row publication. No inference.

Sources added: `AgentOrgRunService`/planner/identity allocator/compound stored locations; root-package readiness index/current validator; collaboration-root history facade; web runHistoryLoadActions/StoreSupport/NavigationProjection/NavigationStoreActions. Installed compiled method hooks observed actual call counts; one separately CPU-profiled renderer maps callback to `retainEqualNodes`. Source/excerpt/pins retained. Traced creation stages and limitations in supplement; no target design selected.

Same UC-001/SCN-003 supported Run journey with earlier saved histories; synthetic public-API population is only operational SCN-005 fixture setup, not a new bulk-create/capacity product requirement. Proposed REQ-006/007 and AC-006/007 extend initial unapproved narrow fix scope to history amplification while preserving identity/admission/freshness. Explicit approval of cumulative SR-003 required.

### Additional Supplement Inventory (Solution Designer; factual/non-normative)
- `launch-row-findings.md`: current post-Run interpretation, F-005/006, REQ-005–007/AC-005–007; completed investigation.
- `evidence/user-launch-row-clarification.json`: user-request clarification; no implementation approval.
- `evidence/launch-row-timing-summary.json`, phase JSON files (`small-history`, `history-100`, `stored-history-100`, `stored-history-500`, `stored-history-500-light`, separate `renderer-profile`) and screenshots: actual new-row/workspace/network/long-task evidence; primary stress light-observer series identified.
- `evidence/launch-row-passive.js`, `launch-row-probe.mjs`, `launch-row-populate.mjs`, `launch-row-stop-fixtures.mjs`: disposable method/load reproduction; not production or durable executable coverage.
- Population JSON (`to-100`, `to-500`) and fixture-stop JSON (`100`, `500`): test-owned public lifecycle receipts; concurrent population timings excluded from user-latency claims.
- Backend timing-hooks/trace scripts, trace/install/ownership JSON: separately instrumented actual backend stages/counts; hooks restored; inclusive child timings overlap.
- Renderer CPU profile, profile summary/hotspot excerpt: one profiled stress launch; source-mapped full-subtree equality hotspot, not full workload coverage.
- Fixture manifest and installed source pin: exact copied content hashes / compiled baseline provenance.
- Isolated start/stop/app log/cleanup and `launch-row-caveats.md`: safety and all method/setup/failure/observer limitations.
- `evidence/handoff-rules-sr003.json`: exact current route lookup after persisted result (created at lookup).

Cleanup: iso-54639-13b7 graceful stop, private root/copy removed, ports 54639/54640/9229 clear, backend timing hooks restored. No production source changes. Only owned docs/evidence remain. Residual: user's exact history volume, stored message size and active-agent workload unknown; this stress reproduction is not exact-user attribution.

## SR-004 — Why Collision Checks Read Execution Trees (Evidence-Only)
The user asks why the measured 5000 reads happen and suspects over-engineering on both sides. This asks for explanation, not explicit approval; SR-003 intended requirements remain unchanged and unapproved. No new UI samples, source change, design or instance launch in this clarification.

Verified code mechanism:
1. The allocator generates an Agent run ID using a normalized definition name plus a Node crypto randomUUID token (agent-run-id.ts:22–32). The 5000 reads do not mean 5000 actual ID collisions occurred.
2. For each candidate it reserves the ID locally and checks active standalone runs, standalone metadata/path, then collaboration membership (agent-run-identity-allocator.ts:64–112).
3. Org member identities are nested inside execution trees; the Org membership implementation answers containsRunId by iterating every admitted Org root, reading its tree and constructing AgentOrgExecutionIndex to look for the candidate Agent/Team ID (location-service.ts:91–102). The process supervisor injects a stored-only Org service into this allocator.
4. Each stored read opens the tree JSON, parses and validates the full payload (tree-store.ts:19–27). No sharing across the 10 candidate checks was observed in this path. Therefore 10 new IDs × 500 existing Org trees = 5000 stored-tree reads, even when all candidates are unused. This is not model inference or 5000 model calls.

Purpose versus cost: the safety purpose is to avoid reusing an identity already present in any active/stored collaboration. Tree data contains child IDs not answered by the standalone run-path check. Reusing a general execution-location lookup makes that small yes/no membership question depend on full historical structure. That is an evidence-backed inefficient hot-path coupling; the original author's reasoning/history was not established. Random UUID generation makes accidental collisions extremely unlikely, but this alone is not authorization to remove identity/data-integrity guarantees.

Frontend purpose versus cost: history includes full Org trees to represent expandable hierarchical members. retainEqualNodes serializes both prior/new nodes to decide whether it can reuse old object references; this can avoid reactive churn for unchanged data but itself walks the full subtree. Actual CPU evidence in F-006 establishes the cost under the stress fixture. Correct hierarchy, fresh updates and reference reuse are useful goals; repeated full snapshots/full equality comparisons are not inherently required by those goals. Specific simplification choices remain for architecture after approval, rather than selecting another cache/index layer here.

Scope judgment: the measured paths do too much repeated work for creating one Org/publishing one row. This supports targeted simplification; it does not establish that the entire application is over-engineered. Exact live-user workload remains unknown. Source/hash references: evidence/collision-check-explanation-source.json. User reference: evidence/user-collision-check-question.json.

Supplement inventory additions (Solution Designer, factual/non-normative): evidence/user-collision-check-question.json (SR-004 input, not approval); evidence/collision-check-explanation-source.json (read-only source/hash references); evidence/handoff-rules-sr004.json (current route lookup after result persistence). Current completed SR-004 is evidence-only; requirements baseline SR-003 unchanged, Ready for Approval.

## SR-005 — Fresh Creation Does Not Require Old Execution State
The user asks whether starting a fresh Org intrinsically needs old execution trees, rather than asking how the loop works, then says continue. For the measured 5000 member-identity collision reads, the purpose is solely the allocator's global ID-reuse check; old trees supply stored child IDs. The fresh launch plan resolves its new topology/configuration from current definitions and selected configuration, not prior Org execution state (agent-org-run-planner.ts:30–84). The per-member allocator calls the general collaboration membership lookup and thereby scans all admitted old Org trees. Thus this scanning is a consequence of the current ID-membership implementation, not a fundamental dependency on earlier Org state. Identity uniqueness remains a preserved requirement; full historical tree loading per new member is not inherent to that requirement. This explanation does not assert that all other admission/history-validation scans have the same purpose or can be removed. It is not approval to remove collision or structural safety guarantees, and it selects no architecture alternative.
Read-only code references: existing evidence/collision-check-explanation-source.json plus AgentOrgRunPlanner.build/resolveConfiguration source inspected in this round. No new timings or production changes. User evidence: evidence/user-new-org-scan-necessity.json. Requirements baseline SR-003 remains unchanged and unapproved, Ready for Approval; SR-005 is evidence-only.

SR-005 supplement inventory: evidence/handoff-rules-sr005.json is the exact rule return, factual/non-normative, Solution Designer owned; no condition matched.

## SR-006 — UUID Generation / Proposed No-History-Scan Fresh Creation
User challenges whether checking prior executions is justified when fresh IDs use UUIDs (spoken "YoYo ID", interpreted as UUID). Source confirms createUuidIdentityToken uses node:crypto.randomUUID, removes dashes, then adds a normalized definition-name prefix. AgentRunIdentityAllocator defaults to that token source. The historical lookup is an extra explicit negative-membership check, not required to generate UUIDs or construct a fresh Org. UUID uniqueness is probabilistic, not mathematical impossibility; no demonstrated product need in this investigation justifies full saved-tree lookup for every fresh candidate. "Preserve identity safety" must not be read as "preserve the current exhaustive historical collision check."

Impact: requirement refinement, not approved implementation. REQ-006/AC-006 now propose no saved-Org execution-tree reads for collision checking during normal fresh UUID-based Org member allocation, rather than merely reducing M×N repetition. Preserve fresh identity generation, configuration/definition/workspace/schema/structural admission, data continuity and authoritative history. This is not blanket removal of admission checks, nor a claim about user-supplied/imported/resumed identity policies, which have not been designed or changed. No target cache/index/alternative architecture selected. Existing user evidence does not approve the cumulative runtime/frontend/backend package; requirements are Ready for Approval at SR-006, with explicit approval pending.

No new timing or production change. Source evidence is existing collision-check-explanation-source.json; new user supplement is evidence/user-uuid-scan-objection.json. All are factual/non-normative; canonical requirements carry the proposed behavior. The source-generator feasibility fact should not be conflated with the rationale for all existing checks.

SR-006 inventory: evidence/handoff-rules-sr006.json records the exact current rule lookup; factual/non-normative, Solution Designer owned, no matching route.

### Follow-up Recommendation Discussion — Same SR-006 Basis
User states the historical-collision logic should be refactored away, then asks "Do you think so?" The recommendation is removal of saved-tree collision scanning from normal fresh UUID allocation, not merely faster/cached historical searches. This reinforces existing proposed REQ-006/AC-006 without a new scope/baseline; no new SR round or technical design selected. Preserve fresh-definition/configuration/admission outcomes and execution-tree data/functions used for history/execution location. Do not infer deletion of execution trees or all unrelated lookup operations. User expresses removal preference; cumulative package approval remains unrecorded. User reference: evidence/user-refactor-removal-discussion.json (Solution Designer owned, factual/non-normative). No new experiments or production changes; prior interruption left no owned running experiment/source-write in progress.

### Frontend Simplification Discussion — Same SR-006 Basis
User also questions frontend over-engineering. Current REQ-007/AC-007 already propose reducing repeated full-history transfer/reprocessing and whole navigation-subtree equality while preserving authoritative concurrent freshness/hierarchy/selection. No new intended scope or technical design selected. Read-only source reconfirms retainEqualNodes serializes prior/new entire workspace nodes to retain equal references; packaged stress evidence F-006 separately shows repeated ~10MB full-history snapshots around 500 saved roots and long tasks. The evidence supports excessive work in this launch/history publication path, not a blanket conclusion about the entire frontend. UI publication of one confirmed new run should not require repeatedly reprocessing all unrelated saved histories. Recommendation is targeted simplification of that repeated-work path, not simply a new caching layer or bypassing freshness/validation. Exact API/update strategy remains undecided pending approval/design. No new experiments, production changes, user-app actions or performance-fix claim.
User supplement: evidence/user-frontend-simplification-discussion.json; existing raw profile/timing/source references remain applicable. Owner Solution Designer, factual/non-normative. Requirements remain Ready for Approval at SR-006; no complete package approval captured.

Additional factual supplement: evidence/handoff-rules-frontend-discussion.json (Solution Designer-owned exact current rules); no condition matched.

## SR-007 — Requested Root Solution Design Best Practices
Explicit user request creates root SOLUTION_DESIGN_BEST_PRACTICES.md and a short root AGENTS.md mandatory-read pointer in the existing isolated task worktree. General design guidance grounded in observed backend/frontend/discovery anti-patterns; no application architecture/source change. Full context/result in design-guideline-result.md. Pending performance requirements remain unapproved SR-006; this documentation request is separate. Root guide is design governance, not a behavior-defining supplement for the pending fix. Documentation links/whitespace/content checked; app tests N/A.
Supplement inventory: root SOLUTION_DESIGN_BEST_PRACTICES.md (Solution Designer-owned requested reusable guidance); root AGENTS.md (mandatory-read entrypoint); design-guideline-result.md (full result/handoff context); evidence/user-design-guide-request.json (exact scope/name request); evidence/design-guide-documentation-checks.json (authored-file hashes/checks); evidence/handoff-rules-design-guide.json (exact rules after lookup). User app/shared source/bundled skills untouched. Root files uncommitted/unmerged in task worktree.

SR-007 follow-up (same root documentation round): user emphasizes start simple on larger tickets and no invented edge cases. Guide updated accordingly and explicitly records the prior over-defensive preservation reasoning. One canonical SOLUTION_DESIGN_BEST_PRACTICES.md retained; alternate naming optional. User evidence: evidence/user-design-guide-start-simple.json. Current documentation checks regenerated; initial evidence/design-guide-documentation-checks-initial.json retained. Full refined context/routing in design-guideline-result.md; application scope/approval unchanged.

Refined-document rule inventory: evidence/handoff-rules-design-guide-refined.json, exact current lookup; Solution Designer-owned factual evidence, no matching route.

SR-007 naming discussion: recommend existing SOLUTION_DESIGN_BEST_PRACTICES.md for its broader scope; constraints-only name is narrower. User reference evidence/user-design-guide-naming-question.json. No new intended scope, content/name change or performance approval; result/rules in design-guideline-result.md.

SR-007 completion follow-up: user agrees with filename and Mandatory Design Rules organization (evidence/user-design-guide-name-approval.json). Guide now has that explicit section; root AGENTS.md explicitly applies it. Previous/current documentation checks retained. This scoped documentation approval does not approve the pending application refactor. Exact current route/context in design-guideline-result.md; root files remain unmerged in the isolated task worktree.

## SR-008 — Clean Functionality First; Evidence-Led Refinement Later
Requested root documentation refinement records two phases and explicitly rejects premature performance/concurrency/imagined-edge-case frameworks. Root AGENTS.md and canonical guide updated consistently. Existing real requirements remain in the baseline; no blanket suspension of correctness/security or current observed performance scope. Measured-path over-engineering diagnosis is based on unnecessary repeated operations, not proof of every live delay or original authorship. User reference evidence/user-phased-design-guidance.json; prior/current documentation check receipts retained; full result/routing in design-guideline-result.md. No application changes or approval inferred; same isolated worktree/unmerged state.

SR-008 rule inventory: evidence/handoff-rules-phased-design.json, exact lookup; Solution Designer-owned factual supplement, no matching condition.

SR-008 anti-pattern clarification: historical-scan and whole-history cases already existed; broader premature performance/concurrency/imagined-edge-case architecture now has its own explicit heading. Same intended guide principles, no application change. User evidence/user-antipattern-confirmation.json and prior/current documentation check receipts retained. Naming kept as agreed; full result/routing in design-guideline-result.md.

## SR-009 — Application Ticket Resumed / Scope Approval Requested
User returns to the application ticket after documentation. Same isolated branch/base; requirements SR-006 remain Ready for Approval. Presented the cumulative three-change scope explicitly through an asynchronous approval question; accepted for display, answer pending. Resume wording is not silently recorded as approval. No architecture or source change yet.

F-007 (current-source feasibility / exposure): shared AgentRunIdentityAllocator callers include Org member allocation, flat Team, standalone provisioning, task/collaborator identities and application execution scope. Current unit tests inject duplicate tokens and assert scans/reservations/memory paths; they are current mechanism expectations, not independent product evidence requiring historical scans. Future approved design must map relevant owner/caller consequences proportionately without retaining contrived behavior simply because a test encoded it.

F-008 (current-source refresh map, supplement to F-006): AgentOrgRunConfigPanel launch calls refreshTreeQuietly; history panel mounts/fetches and refreshes every 5000 ms; Org contexts publish activity via applyAgentOrgActivity which starts another Org-history refresh after projecting local activity. Full fetch publishes each family independently with generation guards and a final navigation refresh. This identifies concrete normal callers but does not newly attribute every request captured in the earlier performance samples. Existing single-runtime availability service method versus all-runtime GraphQL surface is confirmed; no target API selected.

Sources/content pins: evidence/ticket-resume-source-context.json. Exact resume: evidence/user-ticket-resume.json. Scope question/basis: evidence/application-scope-approval-prompt.json. Actual identity test path found after initial guessed-path miss; no coverage absence or runtime failure claimed. No tests, builds, new UI samples, runtime processes, user-data actions or production edits. Root guide applies: remove unnecessary work, use measured current problems, avoid new speculative caches/concurrency frameworks. Pending application approval and exact live workload/numeric-budget unknowns remain visible. Design-guide documentation is separate and unmerged.

## SR-010 — Explicit Application Approval / Architecture Investigation Started
User explicitly confirms the presented three-change scope, then says good and clean, lets go. Exact approval in evidence/user-application-scope-approval.json; presented SR-006 requirements hash matched and frozen at evidence/approved-requirements-sr006.md before metadata changes. REQ-001–007 / AC-001–007 / SCN-001–005 approved; no intended behavior changed. Architecture standards/template and root AGENTS/guide read. Existing isolated worktree/base preserved. No source implementation begun; technical design and actual size/risk classification must complete before current handoff rules apply.


### SR-010 Architecture Investigation — F-009–013
All investigation was read-only source mapping in the isolated task worktree after the approved basis was reconfirmed. Commands: `cat`, bounded `sed`, and `rg` for definitions, call sites, query consumers and coverage; current HEAD/base rechecked. Root/package AGENTS, design guide, TESTING.md and bundled architecture standard/principles/template read. No new app process, performance samples, tests, production changes or user-app activity. Source content pins: `evidence/architecture-source-context-sr010.json` (38 files). Missing initial guessed names for availability store/Org catalog/navigation action file were resolved with file searches; no missing capability or test failure inferred.

| Finding | Exact current source / command | Factual observation / significance | Uncertainty |
| --- | --- | --- | --- |
| F-009 | `src/agent-execution/services/agent-run-identity-allocator.ts`, `identity/agent-run-id.ts`; `rg` allocator construction and `containsRunId` over server `src` | Default UUID token; allocator mixes definition loading with 64 retries/reservations and active/metadata/path/tree collision queries. Production membership callers found only allocator/compound family facade. Four constructors inject now-collision-only options. Singleton factory referenced only three Team integration tests; one test forces the same zero token. Real location lookup/list/discovery/ambiguity paths are separately consumed. | Test-injected identical tokens are not product evidence requiring exhaustive fresh-UUID collision detection. Shared fresh creation affects Org/Team/standalone/delegation/application scope; required manager integrity remains independent. |
| F-010 | `runtime-management/runtime-availability-service.ts`, `api/graphql/types/runtime-availability.ts`; web `runtimeAvailabilityStore.ts`, `useRuntimeScopedModelSelection.ts`, shared config fields; `rg` all `runtimeAvailabilities` query consumers | Registry and selected-kind verification method exist. All-provider Promise.all is the only availability transport; store replaces one array when that aggregate resolves. Missing row defaults native enabled; composable observes the array and fires aggregate fetch. Only production aggregate method caller is its resolver; client query used by store/generated output plus probe mocks. Five providers registered; no separate cheap registry transport. | Synchronous CLI discovery/version probes can occupy backend event loop. Independent response publication removes completion coupling, not all provider/OS scheduling latency. |
| F-011 | `run-history/services/collaboration-root-history-service.ts`, `agent-org-run-history-catalog-service.ts`, `collaboration-run-history-catalog-core.ts`; Org create service; history resolver | Catalog already exposes admitted `getCatalogRow(id)` through index-row authority. Mixed facade projects catalog rows plus active snapshot or stored tree, omitting archived inactive rows. Org create awaits durable recordCreated after manager creation before returning ID. GraphQL has list only; Org inspection includes execution-view/context content, a different observation contract. | Cold catalog readiness can initialize/revalidate globally. No new storage/index is needed for one-row observation, but this does not mean zero global work at all boundaries. |
| F-012 | web `runHistoryLoadActions.ts`, `runHistoryStore.ts`, Org config/contexts/stream service | Full history publishes independent families with generation guards, then wrapper publishes again. Workspace avatar enrichment happens after early publication and must not be accidentally lost. Local active patch always increments family generation/projects/starts full Org refresh, even equal active state. Checkpoint publication calls it; accepted user-message acknowledgement also starts full Org refresh. In-place collaborator_added changes the execution tree without checkpoint publication; task activation already checkpoint-reloads. | Normal async polling/recovery/termination overlaps matter. Raw earlier HTTP requests are not each newly attributed to these callers. Scoped read sequencing must preserve the existing stale-response protections. |
| F-013 | web `runHistoryNavigationProjection.ts`, `runTreeProjection.ts`, `runHistoryTypes.ts`, projection tests/navigation store actions | Generic equality JSON-stringifies entire workspace/Team presentation nodes. Org run objects, including complete trees, are carried by reference into workspace projection. Stable keys/order/indexes already exist. Tests establish equal and unrelated Team bucket reference retention and exact focus/task indexes; simple deletion of all equality would lose meaningful continuity. | Full refresh still replaces parsed rows and may rebuild presentation branches. Typed presentation comparisons can avoid tree serialization without claiming zero O(history-row) work. |

Separate residual: `RootRunPackageReadinessIndex.admitCurrent` calls global rebuild/validator scan and enforces admitted current packages. The earlier 501-root admission scan is not the 5000 candidate collision reads. No new evidence justifies deleting its structural/cross-root invariant or changing migration/startup semantics in this task. Persistence shape/readers/writers unchanged; migration convention design N/A because no transformation selected. Design decisions and reasoned deferrals are authoritative only in `design-spec.md`.

### SR-010 Artifact / Supplement Inventory Additions
- `design-spec.md`: Solution Designer technical authority, Ready for independent review, Medium / High; realizes approved SR-006 REQ/AC-001–007, no new intended behavior.
- `evidence/user-application-scope-approval.json`, frozen presented `evidence/approved-requirements-sr006.md`, updated approval prompt: exact explicit approval and unchanged presented hash, not inferred from prior continue messages.
- `evidence/architecture-source-context-sr010.json`: factual current-source/hash/context supplement for F-009–013, no normative approval applicability.
- `architecture-design-result.md`: full current result/handoff context; includes prior timing/profile/caveat/cleanup supplements, workspace/base/finalization and requested downstream work. Independent review artifacts currently N/A — not applicable yet.
- Prior factual/doc/result supplements remain in their inventory/history. Historical Ready for Approval text is superseded by SR-010 approval, not evidence that the current design is unapproved. Root documentation remains authored/unmerged; no app/source/build pass implied.

### SR-010 Design Completion
Approved requirements remain unchanged in intent. Completed technical design chooses deletion of fresh-ID collision machinery, independent selected runtime transport/publication, scoped authoritative Org observation and typed navigation comparison within existing owners. No cache/index/framework, persistence migration, model-default change, inference send or release. Completed classification Medium / High follows shared allocator blast radius and transport/freshness contracts, not evidence/document volume. Independent review is required if the current handoff rules select it. Broader exact live-user delay and residual admission/resync costs remain explicit validation uncertainties; no changed-build performance claim.

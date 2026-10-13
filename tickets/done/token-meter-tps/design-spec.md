# Design Spec — Token Meter output TPS

## Solution And Approval Basis
- Package: token-meter-tps; design D1 Ready; current solution revision SR-002.
- Approved requirements: R1/SR-001, Solution Designer within user's explicit rough-estimate direction; conversation notice recorded verbatim in requirements-doc.md. No intended-behavior change in D1.
- Canonical documents: /home/autobyteus/workspace/.codex/worktrees/token-meter-tps/tickets/in-progress/token-meter-tps/{requirements-doc.md,investigation-notes.md,solution-revision-record.md}.
- Behavior-defining supplements: None. Original screenshot is supporting evidence only.
- Authorities read, 2026-10-13: installed solution-designer architecture-design.md, design-principles.md, design template; repository DESIGN.md, AGENTS.md, TESTING.md and web/server AGENTS.md; server WebSocket protocol and Codex raw mapping area contracts. Exact paths in investigation meta. Design examples not needed. Conflicts: None. Codex raw mapping prose contains an older context-budget field name; current source/strict DTO is the factual shape and no raw mapping is changed here.

## Current-State Read
E1–E14 in investigation trace provider usage → canonical normalization/persistence → exact AgentRun stream → meter store → scope composable → Token panel. The existing store owns live usage intake and durable-summary projection; standalone displayed totals can aggregate children. Model-call reports, context-only readings and Claude result reconciliation share the transport. No uniform model inference duration is exposed. Server observation timestamps and normalized output deltas already exist. Extend browser observation only, not provider execution/accounting.

## Task Size And Architectural Risk
- task_size: Medium.
- architectural_risk: Low.
- Evidence: one existing web ownership area, ~6 production files modified/added plus local types, en/zh-CN copy and tests/probe/docs. Adds a bounded transient estimator and display, not a new authority for token counts. All inputs already cross existing strict contracts; no server production/API/schema/persistence/security/deployment/runtime-control changes.
- Payload inventory: labels/help, recorded/scripted fixtures and ticket evidence. This volume does not determine architectural risk.
- Structural inventory: meter-private helper, meter live intake/getter, local selection view and compact component. Existing dependency direction retained. Server/runtime investigation scope is much wider than implementation delta.
- Escalation: any required new telemetry/shared DTO/API, persistent timing, raw provider parsing, stream/lifecycle/recovery rewrite, root/child usage policy change, or missing identity semantics → return Design Impact/Requirement Gap to Solution Designer before expansion. Do not silently add a server timing system or change the metric to text/4.

## Architecture Investigation Evidence
| Evidence | Design use | Remaining uncertainty |
|---|---|---|
| E1/E2 | TPS card independent of primarySummary and exact selected target.context.runId | None in code path |
| E4–E10 | Use authoritative delta and observed_at; reports_model_call filter; event-summary runtime for presentation payload | Runtime availability varies; must be reported in validation |
| E11/E12 | Intake behind meter; both live paths, duplicate/revision gate; never hydrate from summary | Tests must cover actual Team double-dispatch |
| E13/E14 | Direct target context covers Org/collaboration/task variants; existing locale/probe infrastructure | No current changed-source runtime or browser validation |

## Intended Change
Add an “Output TPS” card, always qualified “Estimated · Last reported”, for the selected exact AgentRun. Compute the later call's server-accounted output delta over wall seconds since the previous compatible model-call report in the same turn. Preserve all existing meter values and behavior.

## Change Scope
- In scope UC-001–003: meter-private calculation, its two live intake paths, exact selected-run projection, compact card, localized help, durable tests and isolated evidence.
- Deliberately left alone: server normalization/counters/prices, shared stream schemas and lifecycle, cost roll-ups, team tables, saved history, provider models, Settings analytics and unrelated scope-selector branches.
- Follow-ups: None established as confirmed product defects. E2 notes delegated-kind asymmetry in old total-scope helpers as an investigation caveat only, not an authorized repair. If downstream demonstrates an out-of-scope defect, record evidence and route follow-up rather than growing this change.

## Relevant Behavior And Production-Path Map
| Behavior | Approved intent / AC | Supported trigger and current evidence | Target lifecycle / spine |
|---|---|---|---|
| BEH-001 | REQ-001,003 / AC-001,003,006 | User opens selected agent Token panel; E1 | DS-001 exact target→meter getter→card even before totals |
| BEH-002 | REQ-001,005 / AC-002,005,006 | User selects host/member/copy; E2/E13 | DS-001 uses target.context.state.runId, never primarySummary.runId as selection authority |
| BEH-003 | REQ-002–004 / AC-001,004,005 | Canonical usage reports during model/tool turn; E4–E12 | DS-002 unchanged runtime/stream→meter admission→private estimator→reactive card |
| BEH-004 | REQ-004–007 / AC-003–008 | Delayed/missing events, history/fetch/reconnect/config update; E9–E14 | DS-003 same-run sample admission/reset; DS-001 last-known/unavailable; no history synthesis |

## Relevant Supplemental Task Artifacts
Original screenshot absolute path in investigation inventory. Related BEH-001/002; supporting current UI only. No Product artifact or independent review artifact applies to D1 at authoring time. Independent review artifacts: N/A — not applicable unless routing requires them.

## Task Design Health Assessment
- Posture: Feature; root cause: No Design Issue Found; refactor needed now: No.
- E11 already places all usage admission behind meter owner; transient compaction marks establish local helper precedent. Adding calculation directly into 500+ line meter or 500+ line panel would mix details, so add narrowly owned estimator/card rather than refactor unrelated accounting.
- Triggers assessed: duplicate coordination is avoided by one estimator behind both intake methods; no boundary bypass (card never imports estimator internals); no mixed-subject selector (exact runId only); no shared-type looseness (small discriminated result); no migration/legacy pressure (no persistent or replaced format).
- Capability reuse: extend existing meter, scope and localization. No new service/store/registry, timer scheduler or historical cache. No necessary refactor deferred; native cost/summary selectors remain outside delta.

## Terminology
Report interval: wall time between server observation timestamps of two compatible model-call reports, not the model's inference duration. Baseline: earlier report used only for time/identity, not its output. Reading: frozen, timestamped estimate from the later report. “Last reported” remains true even while the agent is busy or has completed.

## Legacy Removal Policy
No replaced runtime or persisted format. No compatibility wrappers/dual paths/fallback tokenizer. New live meter observation is the sole TPS source. No confirmed dead code in touched paths; implementation must check imports/reachability and remove any dead additions or touched local dead code, with evidence. No deletion of old summary behavior.

## Persisted Data / State Transition Decision
Not Affected. No server model/schema, serializer, repository, migration, user data or durable summary fields changed. Transient samples live within the meter's Pinia instance, like existing session-local compaction marks. Renderer reload loses them by approved design. No migration/admission gate or installation restart requirement introduced by this feature. Cleanup/disposal follows the store lifecycle; no browser localStorage.

## Data-Flow Spine Inventory
| ID | Scope | Start → end | Owner / reason |
|---|---|---|---|
| DS-001 | Primary End-to-End | User selects exact run & Token → activeWorkspaceTarget → usage scope projection → meter.getRunThroughput → TPS card | Existing active context owns selection; meter owns sample; view owns rendering |
| DS-002 | Return-Event | Runtime model-call usage → server fold/persistence → existing Agent/Team/Org/collaboration stream → meter live admission → throughput reading → visible Token card | Server owns counts/time; meter owns derived view observation |
| DS-003 | Bounded Local | Accepted usage event → identity/revision/quality check → reset/baseline/compute → reactive sample | Meter-private estimator, required for continuity and no double count |

## Primary Execution Spine(s)
DS-001: `User workspace selection → activeContextStore.activeWorkspaceTarget → useTokenUsageWorkspaceScope exact-throughput projection → tokenUsageMeterStore.getRunThroughput(runId) → TokenUsageThroughputCard inside TokenUsageMeterPanel`.
DS-002: `User/agent input → existing AgentRun/backend model/tool loop → normalized TOKEN_USAGE_UPDATED → TokenUsageRunAccumulator authoritative delta/summary → existing strict stream + adapters → meter live apply → private throughput estimator → selected card`.

## Spine Narratives
| Spine | Narrative | Main subjects | Off-spine concerns |
|---|---|---|---|
| DS-001 | Opening/switching Token reads selected AgentContext directly. Sample is independent of loading/aggregation of cost totals. Missing sample yields collecting for active work or unavailable otherwise. Sample's model/runtime/time remain explicit when configured choice differs | Selected AgentRun, meter sample, card | Formatting and translations |
| DS-002 | Each runtime continues existing reporting; server normalizes counted output. Existing stream identity checks remain authoritative. Meter admits exact fresh reports once and derives TPS without modifying count/price summaries. Reactive selection reads only its run's result | Runtime report, exact AgentRun summary, meter | Canonical adapters/normalization, unchanged |
| DS-003 | First compatible call establishes baseline; next compatible call divides its delta by server timestamp difference. All accepted observations maintain continuity watermark, but only model calls measure. Broken continuity/identity/count/time never becomes fabricated speed | Baseline and last interval reading | Guard/reason codes for unavailable state |

## Spine Actors / Main-Line Nodes And Ownership Map
- ActiveContextStore / ActiveAgentWorkspaceTarget: exact current run selection, any supported union variant. No TPS computation.
- Existing runtime adapters and server accumulator: counts, attribution, cumulative normalization and revisions. Unchanged.
- tokenUsageMeterStore: public UI boundary, live intake/admission and session sample lifetime. Existing cost/summary behavior retained.
- createTokenUsageThroughputState private helper: sample identity, continuity, arithmetic and unavailable reasons; no GraphQL, provider, clock polling or UI imports.
- Scope composable: selected-run result and presentation empty state; no raw provider knowledge.
- Card: localized, accessible display; never sums raw counts.

## Thin Entry Facades / Public Wrappers
Existing stream adapters are protocol translators, not TPS owners. No new forwarding service. Existing meter getter is the public boundary; helper is private owned mechanism.

## Removal / Decommission Plan
| Item | Disposition | Reason |
|---|---|---|
| Current usage/cost/context paths | Retain unchanged | Approved preserved behavior |
| Any proposed TPS from aggregate summary/text/arrival timer | Do not introduce | Wrong subject/semantics; one live-report source only |
| Dead touched imports/test-only production exports introduced during implementation | Remove in this change if evidenced | No parallel/internal unused TPS APIs |
No source removal identified by investigation; additions are not a modernization project.

## Return Or Event Spine(s)
DS-002 splits only at established transport ownership:
- Standalone: AgentStreamingService→dispatchAgentStreamMessage→handleTokenUsageUpdated→applyTokenUsageUpdated.
- Standalone Team: validated Team view effects→applyTeamTokenUsage first; dispatch_agent→common handler second (duplicate, must not produce a second observation).
- Org/collaboration child: exact identity-checked presentation event→toAgentPresentationProjectionMessage→common dispatch/handler→applyTokenUsageUpdated.
Do not add sibling runtime-specific TPS handlers.

## Bounded Local / Internal Spines — Calculation And Admission
Parent owner: tokenUsageMeterStore. Helper state is O(1) per run, no report history array. Use existing summary freshness as admission, supplemented by helper's own last-seen revision because Team routes duplicate delivery. Inputs derive only from live method arguments and the same event's validated exact summary.

### Identity and data
Sample identity: `{runId, turnId, runtimeKind, modelProvider, modelIdentifier, modelValue}`. Require nonempty exact runId, turnId, runtimeKind and a modelIdentifier or modelValue; preserve which model values are reported rather than resolving aliases from configuration. Include both model fields/provider when present in comparison. Runtime comes from top-level runtime_kind when present, otherwise the same event's exact summary.latestRuntimeKind (presentation DTO intentionally lacks top-level runtime). If both conflict, no sample. Never use standalone roll-up/latest global price model/config to impute observed identity.

Read normalized `meter_delta_output_tokens`; finite, nonnegative safe integer required (0 is valid). Do not use input, total, raw provider totals, reasoning additions, billable fields as alternate paths, transcript chars or summary-output subtraction as the numerator. Summary revision and usageReportCount supply freshness/continuity evidence, not timing. Endpoint time is `Date.parse(observed_at)` (finite); do not mix server time with client receipt time.

### Transition rules
1. Keep unchanged meter public summary validation/dedupe and return semantics. Numeric admission occurs only after a live exact-run or exact-member summary passes identity checks and actually advances that summary. Fetch/upsert entrypoints do not observe. Separately, a fresh live model-call event for an already-correlated run that cannot supply an authoritative summary/count (for example persistence-unavailable) must break that run’s sampling chain rather than let the next valid report bridge the known evidence hole; this does not alter cost admission. Place this narrow invalidation at the existing live boundary before its no-summary return, behind event-key/identity checks; equal/older identifiable events remain no-ops. Keep invalidation private to the meter/helper, not another runtime handler. An ignored event with unestablishable identity/freshness must never produce a number. Never replay fetched summary as a sample.
2. Helper ignores equal/older revisions without modifying sample/baseline. Maintain last-seen exact revision across all admitted live observations. First observation needs no preceding revision; a later gap (`newRevision !== lastSeenRevision + 1`) invalidates the baseline/reading, because report continuity is unknown. Existing timestamps avoid receive-burst artifacts after network delays.
3. `reports_model_call !== true` never supplies a rate numerator or timestamp baseline. It may advance last-seen revision. Normal reading-only/context/Claude reconciliation must not replace a valid reading with a zero or change its model. A continuity gap still invalidates collection; otherwise leave reading intact.
4. For a model call, reject missing/invalid delta, timestamp or required identity and known output-invalid accounting evidence (listed below). Clear measurement chain and expose reason `unavailable`; next valid call starts collecting.
5. First usable call, changed tuple (turn/runtime/model/provider), or a fresh valid event after a gap establishes a baseline, sets collecting, and clears the old numeric result. Its tokens are deliberately not counted. Do not retain cross-model numerical value under new identity.
6. Next compatible call must have a later timestamp and exactly one new model call since previous compatible call (`usageReportCount === previousCallCount + 1`). If count continuity is missing, use this valid report as new baseline/collecting, not a rate. Nonpositive/nonfinite interval gives unavailable and breaks the pair; next valid report starts fresh.
7. Compute `deltaOutput / ((currentObservedMs - baselineObservedMs) / 1000)` only when finite. Publish a last-reported estimated reading `{outputTokens, elapsedSeconds, observedAt, identity, tokensPerSecond}` and advance baseline to current report. Example 200/10=20, then 150/5=30; not a cumulative average. Display one decimal with locale formatting, no arbitrary numerical cap. No timer changes the value.
8. No new turn/status ownership needed. During waiting/completion/disconnect the last sample stays explicitly Last reported with fixed time. On the first next-turn call the tuple change resets collection. No sample after app reload/history fetch; lack of historical sampling is shown honestly. Config changes never relabel a stored sample; it remains visibly the reported runtime/model or can be hidden as unavailable until new sample, never called current speed for the new selection.

Known output-invalid quality flags to guard from current sources: `reported_output_tokens_missing`, `output_tokens_missing`, `snapshot_series_key_missing`, `cumulative_snapshot_source_unrecoverable`, `cumulative_snapshot_regressed`, `cumulative_series_checkpoint_evicted`, `token_usage_persistence_unavailable`, `token_usage_public_summary_unavailable`. For `cumulative_snapshot_provider_delta_missing`, conservatively re-baseline/collect rather than show a zero from missing initial provider delta. Input/cache/price/context-only quality flags do not disable valid output. Keep this small explicit policy in estimator, test source flags, do not invent generic string matching or repair server accounting. If current data exposes another material output ambiguity, return evidence to designer.

### Display states
- No target: select-agent/unavailable state, no number.
- No sample and selected context running/initializing: Collecting — waiting for usage reports.
- Valid baseline only: Collecting — need another matching usage report.
- Unavailable/invalid evidence or inactive history with no sample: “—”, reason; not 0.
- Valid reading: e.g. `20.0 tokens/s`, “Estimated · Last reported”, runtime + reported model, local-formatted date/time with full timestamp available. Include `200 output tokens / 10.0 s` in visible/help detail. Never a Live indicator. Identity strings wrap/truncate accessibly at narrow widths.
- Readable help: “Output from the latest reported model call ÷ time since the preceding report in this turn. Includes time spent waiting and using tools. Updates with usage reports, not each token; not model-inference speed. Reasoning is counted only as included in reported output. A first/only report cannot provide TPS; readings are not restored after reload.” Claude help/documentation notes main-loop only; costs may include a broader aggregate.

## Off-Spine Concerns Around The Spine
| Concern | Serves | Ownership / why |
|---|---|---|
| Provider normalization, persistence and protocol identity | DS-002 server | Existing authority, no changes; frontend must not bypass |
| Formatting/localization | DS-001 card | Existing locale catalogs and Intl; no token semantics here |
| Pure arithmetic guards/reasons | DS-003 meter | One helper shared across both live intake paths |
| Browser/scripted fixtures and evidence | Verification | Test-only owners, never production fallback |

## Ownership Boundaries / Boundary Encapsulation Map
| Boundary | Internal | Caller | Forbidden |
|---|---|---|---|
| Meter public getRunThroughput(runId) and existing apply methods | Per-run throughput helper state | Composable / existing stream handlers | Component importing helper; direct server/raw parsing |
| Active workspace target | Context/team/org selectors | Scope composable | Inferring selected run from aggregate usage model/name |
| Server canonical token observation | Providers and cumulative folding | Existing streams→meter | Re-deriving counts from raw provider payload or snapshot totals |

## Dependency Rules
Streams→existing meter methods→private throughput helper. Scope→meter getter and active target. Card→view props/formatter/localization. No helper→store cycle, card→server/provider, new stream connection, GraphQL polling, or upward access to meter internals. Preserve existing public return semantics of apply methods and all cost hydration behavior.

## Interface Boundary Mapping / Check
- `getRunThroughput(runId: string | null): TokenUsageThroughputState | null`: one exact AgentRun, no generic root/team selector. Singular responsibility; ambiguity Low.
- Private `observeLiveUsage(payload, validatedExactSummary)` (or equivalent explicit typed input): one live report, validated exact identity; no fetch/hydrate overload. Singular; ambiguity Low.
- `TokenUsageThroughputCard` props: discriminated presentation state/sample, not arbitrary summary union. All numeric ready fields required together; unavailable reasons enumerated. Ambiguity Low.
Names are natural: Output TPS, throughput observation, exact AgentRun. No “support/manager/framework” modules.

## Existing Capability Reuse / Subsystem Allocation
Extend web token-usage capability under existing folders. Reuse meter, selection, locale and formatter; no new backend capability. Private helper encapsulates actual numerical state rather than empty delegation. Separate card keeps existing panel readable. Flat folder is appropriate for one concern, not a subsystem framework.

## Draft File Responsibility Mapping / Reusable Owned Structures / Tightness
Initial candidates: estimator in store, state type in types/tokenUsageMeter.ts, projection in scope, view in panel. Refined: private estimator file and small card separate computation from accounting/rendering. Reuse one local discriminated union instead of parallel ready flags and optional number fields. `tokensPerSecond` is derived once from the explicit numerator/interval and retained as a view value (or computed in getter); do not keep independently writable overlapping counters. Identity owns model/runtime on sample, separate from configured identity. No shared cross-package DTO is introduced.

## Final File Responsibility And Target Mapping
| Change / path (relative to worktree) | Owner / concrete responsibility | Must not contain |
|---|---|---|
| Add `autobyteus-web/stores/tokenUsageThroughput.ts` | Meter-private per-run baseline, revision continuity, eligibility, division, state/reasons; same pattern depth as tokenUsageCompactionMarks | Network, persistence, raw runtime parsing, UI formatting |
| Modify `autobyteus-web/stores/tokenUsageMeterStore.ts` | Invoke helper from both accepted live paths and expose exact-run getter | Duplicated formula or aggregate TPS |
| Modify `autobyteus-web/types/tokenUsageMeter.ts` | Local discriminated throughput state/sample type shared by helper/store/view | Changes to server summary semantics or shared DTO |
| Modify `autobyteus-web/composables/useTokenUsageWorkspaceScope.ts` | Expose selected exact-run throughput presentation via active target across all variants, independent of primarySummary | TPS from standalone roll-up; unrelated total-selector refactor |
| Add `autobyteus-web/components/workspace/usage/TokenUsageThroughputCard.vue` | Compact responsive localized card + accessible explanation and timestamp | Calculation/state ownership |
| Modify `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue` | Place card near top, outside primarySummary gate; retain existing sections | Embedding estimator |
| Modify `autobyteus-web/localization/messages/{en,zh-CN}/shell.ts` | Accurate units/states/formula/limitations | English hard-coded in template |
| Add/modify colocated `__tests__` for helper, meter, scope, card/panel | AC-001–007 including real Team two-effect flow and Org/collaboration adapters | Tests that claim live inference from fixtures |
| Add focused `autobyteus-web/tests/e2e/token-meter-tps-*.mjs` and package script, fixture under existing test dirs if required | Durable changed-source browser/transport probe and cleanup receipt | Production-only probe hooks exposed normally |
| Documentation update in existing web usage docs/README, chosen by Delivery | Definition, report cadence, support limits | Broad testing/release policy edits |
Server test-fixture/source-test additions only if needed to supply realistic multi-call transport proof, not server production changes. Exact test filename choices may vary within existing conventions; semantics and scope cannot.

Folder boundary check: stores holds state/control, composables selected-view projection, components view, types shared local shape, locale content, tests fixtures. All boundaries clear, over-split risk Low. No folder moves necessary.

## Applied Patterns / Concrete Shape Guidance
Use the existing small owned-state helper pattern; no general state-machine framework.
Good: Team's exact member report reaches meter once→that run's timestamped rate. Bad: component divides standalone total output (host+children) by app time.
Good: reported model `claude-...` remains on sample despite configured alias. Bad: last sample number under newly selected model name.
Good: `Collecting` after first report; later report computes real interval. Bad: divide lifetime counts by time since opening Token.

## Backward-Compatibility Rejection Log
| Candidate | Decision / clean path |
|---|---|
| Fallback tokenizer or historical totals when telemetry missing | Rejected; honest collecting/unavailable |
| New TPS from both server and browser timers | Rejected; one report-pair method |
| Persist/rehydrate TPS into old usage schema | N/A, not introduced; existing data unaffected |
No compatibility wrappers, dual writes or retained replaced behavior.

## Derived Layering
Existing canonical accounting/transport below meter-derived observation below selected view; no new cross-layer authority.

## Change / Refactor Sequence
1. Implement/test private eligible-report/pair state and local type; deterministic examples, invalid/duplicate/gap/zero handling.
2. Integrate accepted live intake in both meter paths; ensure record-backed upserts do not observe. Regression for Team double dispatch, false calls and hydration race.
3. Add exact target projection and independent card; locale strings; preserve existing totals. Check all task/member target variants.
4. Durable browser fixture + real test-owned server/runtime stream evidence with two model calls within a turn and tool gap. Keep changed-source build provenance and screenshots/DOM assertions.
5. Run appropriate existing meter/scope/formatting/localization coverage; downstream API/E2E owns realistic validation and Delivery owns integrated checks, docs/finalization/rollout and cleanup.
No temporary production seam, migration or raw converter change needed.

## Verification Guidance (Intent, Not Results)
Use TESTING.md. Implementation-scoped web suites (`pnpm -C autobyteus-web test:nuxt <spec> --run`), web/localization guards; cover numeric examples, no first-report TPS, zero vs absent, duplicates/stale/gaps, same timestamp, mixed runs/turns/models, false reading/reconciliation, Team double dispatch, selected cost roll-up mismatch, history and config change. Durable browser probe asserts states/identity/number and captures normal/narrow/en/zh-CN screenshots against changed source. Provide complete fixture GraphQL/WS boundaries; no browser errors.
API/E2E: use existing scripted AGY fixture/harness or bounded new fixture with multiple DONE usage steps in one turn, public create/send/select surfaces, real server normalization and stream; test Team/Org/collaboration selection routing at appropriate layers. Prefer scripted provider evidence over paid traffic. Code-backed fixture coverage of all five normalized shapes does not mean all live runtimes verified. Codex case must cover cumulative/reading-only; Claude case main-loop vs result; AGY/Grok completed-call counts. Record a matrix of executed/scripted/live/unavailable cases.
For primary full desktop user journey, use an isolated worktree build per TESTING.md (`pnpm --silent isolated-app start --build` or supported --from-worktree), never installed/user app. If environment prevents that layer, report precise gap rather than call browser evidence desktop verification. No paid benchmark needed to validate estimator; paid provider checks only if a demonstrated gap needs them and authorized constraints permit. Stop own server/browser/instance and remove only test-owned data; preserve evidence.

## Key Tradeoffs And Risks
Report-interval TPS is useful while tool-using agents make repeated model calls, but not per-token or pure inference speed. First/single-call turns have no estimate; native subagent reconciliation excluded; locale and same-run selection matter. Reconnect/revision gaps conservatively lose a pair rather than miscount. Runtime observations/clock/report delay can affect estimate; label and help are integral correctness, not optional polish. Timing history is deliberately not stored.

## Guidance For Implementation
Do not broaden scope because backend timing could be more exact. If the approved report method proves unusable for an actual supported runtime despite investigated fields, return evidence and Design Impact, not silent unsupported claims. Record actual commands, failures and layer limitations. Implementation owns implementation-handoff.md; downstream owners supply their own artifacts. No source code/test execution completed by this design package.

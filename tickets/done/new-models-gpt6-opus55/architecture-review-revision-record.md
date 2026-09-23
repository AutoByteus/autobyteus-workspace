# Architecture Review Revision Record

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / SR-003 Large/High architecture review | SR-002, SR-003 | N/A | Fail | ARCH-F-001, ARCH-F-002 |
| ARCH-REV-002 | Round 2 / SR-004 design recovery | SR-002, SR-004 | Fail | Pass | ARCH-F-001, ARCH-F-002 resolved |
| ARCH-REV-003 | Round 3 / SR-005 catalog design recovery after CRR-001 | SR-002, SR-005 | Pass | Pass | CR-F-001 design remedy; no new ARCH finding |
| ARCH-REV-004 | Round 4 / SR-007 SDK Token Meter extension | SR-006, SR-007 | Pass (prior scope) | Fail | ARCH-F-003, ARCH-F-004 |
| ARCH-REV-005 | Round 5 / SR-008 design recovery | SR-006, SR-008 | Fail | Pass | ARCH-F-003, ARCH-F-004 resolved |
| ARCH-REV-006 | Round 6 / SR-010 selected-only SDK design | SR-009, SR-010 | Pass (prior scope) | Pass | No new finding; ARCH-F-001–004 remain resolved |
| ARCH-REV-007 | Round 7 / SR-012 configured-price SDK design | SR-011, SR-012 | Pass (prior scope) | Pass | No new finding; ARCH-F-001–004 remain resolved |
| ARCH-REV-008 | Round 8 / SR-013 return-shape evidence re-review | SR-011, SR-012, SR-013 | Pass (then implementation hold) | Pass | No new finding; ARCH-F-001–004 remain resolved |
| ARCH-REV-009 | Round 9 / SR-014 Claude known-context correction | SR-014; SR-011–013 retained | Pass (prior scope) | Pass | No new finding; ARCH-F-001–004 remain resolved |

## Revision Entries

### ARCH-REV-001 — Initial signed-thinking lifecycle review

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md`
- Review round and trigger: 1; Solution Designer Architecture Design Complete for SR-003.
- Triggering role, report path, and finding IDs: Solution Designer; `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/solution-handoff.md`; prior findings N/A.
- Relevant solution revision IDs: SR-002, SR-003.
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail / Design Impact.
- What changed in the review result or what baseline was established: First independent review confirms Large/High gate and most catalog, pricing, SDK and snapshot-transition structure. It finds two within-scope signed-thinking lifecycle omissions: non-tool turns in the continuing sequence and retained signed turns after client-side keep-tail compaction.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: ARCH-F-001, ARCH-F-002.
- Material classification changes: None; no requirement change proposed.
- Recommended recipient: /solution_designer.
- Remaining risks or uncertainty: No direct provider keys; Codex entitlement and implementation-time SDK pin/compatibility require later validation.

### ARCH-REV-002 — Active tool-cycle signed-retention and compaction recovery

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md`
- Review round and trigger: 2; Solution Designer SR-004 revised architecture after ARCH-REV-001 Fail; user requested SDK-first sequencing.
- Triggering role, report path, and finding IDs: Solution Designer; `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/solution-handoff.md`; ARCH-F-001/002.
- Relevant solution revision IDs: SR-002, SR-004.
- Prior authoritative decision: Fail.
- Current authoritative decision: Pass.
- What changed in the review result or what baseline was established: Revalidated unchanged approved behavior and current production paths. SR-004 limits signed retention to the active tool cycle, atomically removes all replayable signed blocks before the next independent turn, defers client compaction during immediate tool continuation, and strips stale signed blocks from an accepted keep-tail summary. This addresses the provider's sequence and prefix constraints without new product behavior or beta machinery.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001 | Open / High Design Impact | Resolved | SR-004 DS-002/003/008, native-turn lifecycle, memory/assembler file mapping | Design A tool → B plain → C tool example; memory-owned all-block reset before independent request/recovery checkpoint; `AgentTurnRunner` and `LlmPhase` expose turn/tool-cycle state; official preserved-thinking rules permit all-block removal. |
| ARCH-F-002 | Open / High Design Impact | Resolved | SR-004 DS-008, compaction deferral/reset, accepted builder/executor/validator mapping | Current planner retains recent suffix and builder rewrites prefix; revised design defers active continuation and strips all retained stale signed blocks at accepted compaction; summary/tool-protocol example and tests specified. |

- New or remaining finding IDs: None.
- Material classification changes: Design Impact findings resolved; no requirement change. Review decision Fail → Pass; Large/High unchanged.
- Recommended recipient: /implementation_engineer primary; /solution_designer informational after primary handoff.
- Remaining risks or uncertainty: No direct provider keys; implementation must prove lifecycle classifier, reset atomicity, compaction deferral, SDK compatibility and local Codex outcomes, and return a classified finding if those gates fail.

### ARCH-REV-003 — Bounded static-catalog ownership correction

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md`
- Review round and trigger: 3; Solution Designer SR-005 design recovery after Code Review CRR-001 Fail on IR-001 commit `704e2108e`.
- Triggering role, report path, and finding IDs: Code Reviewer `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/code-review-report.md` and `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/code-review-revision-record.md`; CR-F-001 / CR-C-001.
- Relevant solution revision IDs: SR-002, SR-005; SR-004 runtime basis retained.
- Prior authoritative decision: Pass (ARCH-REV-002 on SR-004).
- Current authoritative decision: Pass (SR-005 bounded design). CRR-001 remains Fail for IR-001 source until implementation rework and independent source re-review.
- What changed in the review result or what baseline was established: Verified the actual 538-effective-line catalog and one-aggregate/Qwen-sublist code shape. SR-005 maps Anthropic rows/schemas to one provider module and the existing common pricing constructor to one shared helper; the existing ordered aggregate stays the sole factory/server catalog authority. No approved behavior or persisted-state decision changes.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001 | Resolved at ARCH-REV-002 | Remains resolved | SR-004 DS-002/003/008 retained in SR-005 | SR-005 explicitly leaves signed-turn runtime implementation/design unchanged. |
| ARCH-F-002 | Resolved at ARCH-REV-002 | Remains resolved | SR-004 DS-008 retained in SR-005 | SR-005 changes catalog allocation only; compaction design stays intact. |
| CR-F-001 | Open at source-review gate | Design remedy accepted; source finding remains open | SR-005 DS-009 and final file map; CRR-001 | Direct code read confirms one contiguous Anthropic block, local shared pricing wrapper, Qwen provider-list precedent and 538-line aggregate. Rework must still prove effective counts/equivalence at renewed source review. |

- New or remaining finding IDs: No open architecture findings; CR-F-001 remains open in Code Review until source re-review.
- Material classification changes: None; bounded low-risk delta within cumulative Large/High package; approved SR-002 behavior unchanged.
- Recommended recipient: /implementation_engineer primary for bounded rework, then /solution_designer informational.
- Remaining risks or uncertainty: Catalog equivalence/import-cycle/source-size audit is an implementation/source-review gate. API/E2E still waits for Code Review pass; any possible direct-provider credential file is validation-only and was not inspected here.

### ARCH-REV-004 — SDK mixed-identity and SQL-readiness review

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md`
- Review round and trigger: 4; Solution Designer SR-007 architecture on Approved SR-006 after API-REV-004 diagnosis and sanitized no-key/cost-limited SDK experiments.
- Triggering role, report path, and finding IDs: Solution Designer `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/solution-handoff.md`; API/E2E API-REV-004 Requirement Gap context. Prior ARCH-F-001/002 remain resolved; no prior open architecture finding.
- Relevant solution revision IDs: SR-006, SR-007; SR-002–005 retained as earlier-scope history.
- Prior authoritative decision: Pass for SR-005/SR-002 only (ARCH-REV-003); no implied approval of SR-006 extension.
- Current authoritative decision: Fail / Design Impact for SR-007.
- What changed in the review result or what baseline was established: New approved SDK-accounting behavior and real mixed/cumulative probes were reviewed. The envelope and transactional per-model fold are directionally sound, but the design omits the existing context-enricher null-ID fallback on the mixed path and the startup schema/readiness owner for its required nullable SQL migration.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001 | Resolved | Remains resolved, unaffected | SR-004 / ARCH-REV-002 | SR-007 does not revise direct Messages signed-turn behavior. |
| ARCH-F-002 | Resolved | Remains resolved, unaffected | SR-004 / ARCH-REV-002 | SR-007 does not revise direct Messages compaction behavior. |
| CR-F-001 | Design remedy accepted at ARCH-REV-003 | Outside current architecture finding set | SR-005 / ARCH-REV-003 and later source-review history | SR-007 leaves the catalog split unchanged; source-review history is separate authority. |

- New or remaining finding IDs: ARCH-F-003, ARCH-F-004.
- Material classification changes: New Approved SR-006 scope creates a new architecture review basis; decision Pass (prior scope) → Fail for SR-007. Findings are within approved behavior, not a request for new product policy.
- Recommended recipient: /solution_designer.
- Remaining risks or uncertainty: SDK estimated USD is not billing; Haiku's internal cause is unknown; direct paid provider calls/secrets not used. Implementation/source/API/E2E/delivery gates for the new scope have not run.

### ARCH-REV-005 — Mixed attribution and current-schema gate recovery

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md`
- Review round and trigger: 5; Solution Designer SR-008 revised architecture after ARCH-REV-004 Fail / Design Impact.
- Triggering role, report path, and finding IDs: Architecture Reviewer `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md` ARCH-REV-004; ARCH-F-003/004. Solution Designer supplied revised `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/solution-handoff.md`.
- Relevant solution revision IDs: Approved SR-006 and design SR-008; SR-007 prior failed design basis.
- Prior authoritative decision: Fail on SR-007.
- Current authoritative decision: Pass on SR-008.
- What changed in the review result or what baseline was established: Rechecked both prior findings against current code and the revised design. SR-008 adds one complete user-selected SDK run → result → context enrichment → transactional fold → GraphQL/stream → Token Meter primary spine, a validated SDK `single|multiple|unknown` discriminator that preserves intentional mixed/unknown null IDs without changing non-SDK fallback, and one updated-app startup → migration → physical-column assertion → admission/read spine for the nullable checkpoint.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-003 | Open / High Design Impact | Resolved | SR-008 DS-014, identity/file mapping, mixed event-to-UI test | Current `TokenUsageContextEnricher` uses nullish selected-alias fallback; SR-008 explicitly changes it only for validated SDK attribution, rechecks at parser/context boundary, maps exact owner and demonstrates selected `opus[1m]` with two raw models retaining null machine ID and Multiple models display. |
| ARCH-F-004 | Open / Medium Design Impact | Resolved | SR-008 DS-015, migration/readiness mapping and startup tests | Current server and standalone startup run migration then `assertTokenUsageCurrentSchema` before admission; SR-008 adds the nullable column to fixed `RUN_COLUMNS`, names fatal failure/no-admission and corrected-restart path, old-null read and new checkpoint round-trip. |

- New or remaining finding IDs: None.
- Material classification changes: Design Impact findings resolved; no approved intended-behavior change. Review decision Fail → Pass; cumulative Large/High unchanged.
- Recommended recipient: /implementation_engineer primary; /solution_designer informational after primary handoff.
- Remaining risks or uncertainty: SDK USD remains an estimate, not a bill; source/API/E2E/delivery gates for SR-006 scope have not yet run; implementation must prove context pass-through, cumulative cost integrity and migration readiness with safe fixtures and cost-limited live SDK checks.


### ARCH-REV-006 — Selected-model-only SDK Token Meter review

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md`.
- Review round and trigger: 6; Solution Designer SR-010 architecture after user-approved SR-009 corrected the former whole-SDK mixed accounting/display policy.
- Triggering role, report path, and finding IDs: Solution Designer `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/solution-handoff.md`; ARCH-REV-005 Pass was restricted to Approved SR-006/SR-008. No open prior architecture finding.
- Relevant solution revision IDs: Approved SR-009, design SR-010; SR-008 is prior reviewed design history.
- Prior authoritative decision: Pass on former SR-006 basis only.
- Current authoritative decision: Pass on SR-010/Approved SR-009.
- What changed in the review result or what baseline was established: Independently checked user-selected Opus→SDK resolved raw ID→mixed cumulative result→validated event/context→private all-model checkpoints with selected-only ledger delta→analytics/GraphQL/stream/Token Meter; checked missing/ambiguous fail-closed behavior, selected-only estimate copy, historical no-reprice and retained migration/readiness. Current stopped-run Settings/resume is a supported selection-change trigger. A separate catalog probe uses different settings/cwd from a runtime query; active-turn-equivalent binding is an explicit implementation validation risk, not authorization to guess.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001/002 | Resolved | Remain resolved; unaffected | SR-004 / ARCH-REV-002 | SR-010 does not change direct Messages signed-thinking replay. |
| ARCH-F-003 | Resolved | Remains resolved under new selected-match contract | SR-008, SR-010 / ARCH-REV-005 | SR-010 carries validated matched/missing/ambiguous SDK state through context enrichment; intentional null is not filled with selected alias. |
| ARCH-F-004 | Resolved | Remains resolved | SR-008, SR-010 / ARCH-REV-005 | SR-010 retains additive nullable column, fixed RUN_COLUMNS, both startup gates, fatal no-admission and corrected-restart path. |

- New or remaining finding IDs: None.
- Material classification changes: Approved behavior changed SR-006→SR-009; previous pass did not cover it. New design Pass; cumulative Large/High unchanged.
- Recommended recipient: /implementation_engineer primary; /solution_designer informational after successful primary message.
- Remaining risks or uncertainty: SDK metadata can be absent/context-sensitive; implementation must bind in active turn context or prove equivalence, else use missing/partial. SDK USD is an estimate; no direct paid API validation or secret inspection. Source/API-E2E/delivery gates for SR-009 remain.


### ARCH-REV-007 — Configured-price selected Claude SDK monetary review

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md`.
- Review round and trigger: 7; Solution Designer SR-012 architecture after Approved SR-011 replaced SDK-dollar pricing with configured-price estimation and delegated a cache-write approximation.
- Triggering role, report path, and finding IDs: Solution Designer `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/solution-handoff.md`; ARCH-REV-006 Pass was limited to SR-010/SR-009. No open prior architecture findings.
- Relevant solution revision IDs: Approved SR-011, design SR-012; SR-010 prior reviewed identity/checkpoint basis.
- Prior authoritative decision: Pass on former SR-009 SDK-dollar basis only.
- Current authoritative decision: Pass on SR-012/Approved SR-011.
- What changed in the review result or what baseline was established: Independently checked cost-source owner moves from WIP SDK `costUSD` to existing configured policy/calculator after trusted selected delta; all-dimension main-loop split gate; marked 1h approximation for positive unreconciled selected cache writes; missing-rate/zero-write cases; durable run/team/GraphQL/UI quality; no Haiku or whole-SDK monetary leakage; retained selected identity, private checkpoints, startup readiness and historical no-reprice. I-41 proves one supported exact-split turn, not a universal identity.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001/002 | Resolved | Remain resolved, unaffected | SR-004 / ARCH-REV-002 | SR-012 does not revise direct Messages signed-thinking/tool replay. |
| ARCH-F-003 | Resolved | Remains resolved | SR-008, SR-010/012 | Validated selected match and intentional null through context enrichment retained; no alias-as-actual fallback. |
| ARCH-F-004 | Resolved | Remains resolved | SR-008, SR-010/012 | Nullable checkpoint column, fixed RUN_COLUMNS and server/standalone no-admission/restart path retained. |

- New or remaining finding IDs: None.
- Material classification changes: User-approved monetary source SR-009→SR-011; prior Pass was scope-limited. Current design Pass; cumulative Large/High unchanged.
- Recommended recipient: /implementation_engineer primary; /solution_designer informational after successful primary handoff.
- Remaining risks or uncertainty: Main-loop split does not always represent per-model query-pipeline usage; equality gate/fallback and visible marker are required. Approximate 1h may overestimate. SDK `provider:'firstParty'` must map to supported Anthropic price identity; active-turn model resolution context remains an implementation guard. WIP/prior passes are not current-scope source/API-E2E/delivery conformance.


### ARCH-REV-008 — Terminal SDK return-shape evidence re-review

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md`.
- Review round and trigger: 8; user-requested broader real SDK return-shape investigation after ARCH-REV-007 Pass and subsequent implementation hold.
- Triggering role, report path, and finding IDs: Solution Designer `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/solution-handoff.md`; I-42–I-44 sanitized evidence and SR-013 evidence-only solution entry. No open architecture findings.
- Relevant solution revision IDs: Approved SR-011, design SR-012, evidence-only SR-013.
- Prior authoritative decision: ARCH-REV-007 Pass on SR-012/SR-011 had already been issued and routed; reviewer then notified Implementation Engineer to hold affected monetary work at Solution Designer's request. The hold was not an unrecorded Fail or a revocation of the prior completed review.
- Current authoritative decision: Pass after evidence-updated re-review.
- What changed in the review result or what baseline was established: I-42 confirmed terminal top-level per-turn split against selected per-model **delta** across create→resume; I-43 showed a tool-bearing terminal result with matching selected Opus counts and separate Haiku, but non-final assistant-frame output did not sum to terminal output. SR-012 now expressly excludes streamed-frame accumulation and canonical assistant-ID/raw-result-key joining. I-44 discloses that probe callback permission gating was shadowed and the guarded follow-up failed; no command-level safety claim is made. The strict all-dimension gate, visibly marked 1h fallback, configured calculator, persisted quality and history/readiness contracts remain unchanged.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001/002 | Resolved | Remain resolved, unaffected | SR-004 / ARCH-REV-002 | SR-013 has no direct Messages replay change. |
| ARCH-F-003 | Resolved | Remains resolved | SR-008, SR-010/012 | Terminal selected match and intentional null through context remain; assistant canonical model is not used as raw join key. |
| ARCH-F-004 | Resolved | Remains resolved | SR-008, SR-010/012 | Nullable column/startup assertion unchanged. |

- New or remaining finding IDs: None.
- Material classification changes: Evidence-only; Approved SR-011, SR-012 design policy, Large/High and Pass verdict unchanged. Implementation hold is superseded by the completed evidence update and this renewed handoff.
- Recommended recipient: /implementation_engineer primary; /solution_designer informational after successful primary handoff.
- Remaining risks or uncertainty: Observed equality on three real shapes is not universal; use the all-dimension gate and marked fallback. I-44 means command-level callback gating was unverified; further live command probes need a verified PreToolUse hook. SDK provider mapping and active-turn metadata context remain implementation guards. Prior WIP/source/API-E2E/delivery gates are not new-scope conformance. The Solution Designer has now added an explicit review-order correction to the cumulative handoff, SR-013 record and design authority header: ARCH-REV-007 preceded the probes and hold; ARCH-REV-008 is the evidence-expanded review. This administrative clarification does not alter SR-011 behavior or SR-012 design judgment.


### ARCH-REV-009 — Claude SDK known-context meter correction

- Canonical design review report: `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/design-review-report.md`.
- Review round and trigger: 9; Solution Designer SR-014/DS-018 on explicitly Approved SR-014 after user-reported Linux Electron Claude SDK context-meter defect.
- Triggering role, report path, and finding IDs: Solution Designer `/home/autobyteus/workspace/.codex/worktrees/new-models-gpt6-opus55/tickets/in-progress/new-models-gpt6-opus55/solution-handoff.md`; I-45 screenshot/source/read-only isolated DB evidence. No open prior architecture finding.
- Relevant solution revision IDs: SR-014 current context correction; SR-011–013 retained monetary basis.
- Prior authoritative decision: ARCH-REV-008 Pass on SR-012/SR-013/Approved SR-011 only, not the new context defect.
- Current authoritative decision: Pass on DS-018/SR-014.
- What changed in the review result or what baseline was established: Confirmed user-selected Claude SDK Opus message→selected terminal result→valid 22,135 prompt/1,000,000 capacity→null stored percent→existing GraphQL/UI unavailable branch. DS-018 computes safe percentage on new Claude events and derives an old null percentage only from the same latest stored record at read projection. The actual isolated DB row supports Directly Usable — No Migration; no model-name capacity guess, cross-record stitching, token/cache/cost change, new frontend DTO/UI contract or SQL rewrite. Codex control remains a regression case. The SR-014 delta is Small/Low but cumulative still-in-delivery package remains Large/High and configured independent review applies.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-F-001/002 | Resolved | Remain resolved, unaffected | SR-004 / ARCH-REV-002 | SR-014 does not touch direct Messages signed-thinking replay. |
| ARCH-F-003 | Resolved | Remains resolved | SR-008/010/012 | Selected SDK raw match retained; context limit comes from that selected row, not Haiku/first key. |
| ARCH-F-004 | Resolved | Remains resolved | SR-008/010/012 | Existing nullable checkpoint migration/readiness unchanged; context fix requires no new column. |

- New or remaining finding IDs: None.
- Material classification changes: New Approved SR-014 behavior is reviewed, with no change to SR-011 monetary policy. Delta Small/Low; cumulative Large/High unchanged. Prior Pass remains basis-limited; current Pass adds only DS-018.
- Recommended recipient: /implementation_engineer primary; /solution_designer informational after successful primary handoff.
- Remaining risks or uncertainty: Current packaged Electron executable is still defective until implementation, validation, rebuild and explicit user verification. SDK may omit contextWindow in future results; preserve unavailable state instead of guessing capacity. Prior monetary/source/API-E2E/delivery gates remain.

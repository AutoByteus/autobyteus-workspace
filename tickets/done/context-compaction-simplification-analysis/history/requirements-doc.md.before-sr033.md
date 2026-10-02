# Context-compaction simplification — approved baseline / SR032 targeted approval pending

## Document status and approval

Package `context-compaction-simplification-analysis`; owner Solution Designer; 2026-09-30; current consolidated revision **SR-028 — Approved**. This document is the current intended-behavior authority. Historical proposed/superseded wording is preserved in `history/requirements-doc.md.before-sr028.md` and `solution-revision-record.md`, not additional current requirements.

Latest user: **“Well, I think now you can continue with the design. Yeah, I agree with you. Hold A then B flow.”** This approves the bounded `input-hold-proposal.sr027.md`: retain original A on pre-parent compaction failure, admit later B behind A, recover before dispatch, then A followed by B without duplication. Reuse the live per-run queue; no durable outbox, new migration or general busy-send redesign. All DEC-021-01/02/03 decisions are settled. Do not ask the user again about retry ownership, content input or A/B disposition.

| Approval | Exact scope retained |
| --- | --- |
| SR-012, captured SR-013: “Correct. approve” | Direct summary replacing categorized child-agent compaction; exact prompt-v5/output supplement; supported saved-run and historical inspection preservation |
| SR-017/018: “We don't have to have this migration at all”; “relevant updates and then send extra review” | No retired compactor preferences import; default current parent model; current optional model/generation/ratio controls remain; no settings migration |
| SR-020 | Stop Qwen investigation; recorded F005 accepted known/nonblocking, not fixed/Pass; use separately authorized DeepSeek for representative validation, not a proof of every model |
| SR-022/023 | Remove numeric prompt target, retain provider hard cap; adopt expanded natural-compression operating assumption; current rationale must not rely on external-product comparisons |
| SR-024/025 | Replaceable CompressionStrategy: prepared content text -> compressed text; content is already prepared before invocation |
| SR-026 | Three total attempts inside the strategy (initial plus two retries), fail after third failure; no outer automatic loop |
| SR-028 (above) | Bounded held A then B flow, minimal error/held UI, live in-memory scope |

Behavior-defining supplements: `proposed-compaction-prompt.md` (exact v5, SHA256 `2018cd60cd6adedbc3c92fa641b8ff3fc632e0fd177db8305d0af036ff5830d7`), `output-format-and-coverage.md`, `input-hold-proposal.sr027.md`, `acceptance-disposition.sr020.md`. Current tables here supersede older retry/size-parameter wording in historical supplements. Candidate-v6 is parked/unapproved. Approval authorizes architecture, not implementation/review bypass or delivery.

Workspace `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`, branch `codex/context-compaction-simplification-analysis`; HEAD `5cb7b049ae3158108bff2cb70ed80e89540586d9`; last refreshed `origin/personal` base `8caa610ff438c288d9aca9f2efe2c33924fbf517`. No fresh fetch in SR028. Finalization to origin/personal remains Delivery-owned.

## SR032 proposed terminal-activity clarification — Ready for Approval, not approved

Approved REQ001–012 / AC001–017 and SR028 supplements remain unchanged. This is a narrowly proposed addition, not a claim that existing approval already defined the historical compaction card's terminal treatment. Decision DEC-032-01 is pending user approval. Related design for this addition is Needs Revision pending approval; existing reviewed SR030 implementation/checks can continue independently.

**Supported scenario SCN-006 (existing trigger; proposed display outcome):** a user selects the normal Terminate run control while compaction is in progress; termination succeeds; the user inspects the conversation, reopens the saved run, and may later send a new message. This is observed real desktop usage with a local synthetic provider, not an injected duplicate-command scenario. Scope is the current native compaction activity, not general provider/runtime lifecycle redesign.

**Proposed REQ-013 / BEH-007:** after confirmed run termination, an unresolved compaction activity from that terminated execution must no longer appear to be actively running. Preserve the historical activity and last-observed facts, but visibly qualify it as stopped by run termination (suggested copy: “Stopped — run terminated”). Do not fabricate completion, three-attempt exhaustion, rollback or a more precise cancellation outcome than the evidence establishes. An already-known completed/failed operation keeps its actual final result. Merely losing a connection is not confirmation of termination.

**Proposed AC-018 / REQ013, related REQ005/007/012 / SCN006:** terminate during active compaction through the normal user control; after successful termination the run is Offline, the old activity has no active Compaction/Queued presentation or animation and is clearly historical/stopped. Saved reopen preserves that distinction without generation; later authorized new work is a separate activity and does not resurrect or overwrite the old activity's result. Existing no-late-commit/no-cancelled-input-dispatch and history-preservation checks stay unchanged. No deletion/rewrite of raw evidence or blanket inference that all offline runs were cancelled. Exact representation, event delivery and saved-view reconciliation are architecture work after approval; no new schema/migration/ledger is selected here.

**Decision requested:** approve this bounded display clarification, or keep the last-observed phase as intentional historical presentation. Neither alternative has been silently approved. API006 can retain the observation and continue unrelated approved checks; do not add a failing normative assertion for AC018 or count the observation as a new acceptance failure before the intended outcome is settled.

## Problem, stakeholders and outcome

The old categorized compactor mixed context reduction with child-agent execution and long-term-memory generation. The ticket replaces that with one useful continuation summary. The current implemented direct summarizer is still concretely coupled to orchestration and lacks the newly requested strategy-owned retries and held-input recovery. Those are new approved behavior, not retroactive implementation violations.

Run users continue long work without losing constraints or resubmitting held input; maintainers replace the compression implementation without rewriting selection/commit; Memory Inspector users retain access to history. Evidence is in canonical `investigation-notes.md`; technical decisions are in `design-spec.md`.

## Relevant current, desired and preserved behavior

| ID | Current evidence-backed behavior | Approved desired change | Preserved outcomes |
| --- | --- | --- | --- |
| BEH-001 / system | Automatic threshold/planner and current direct LLM path exist | One replaceable content transformation with strategy-owned bounded attempts | System head, recent tail, tool integrity, raw evidence, final fit, internal progress |
| BEH-002 / user | Inspector independently reads working context and stored category records | No new episodic/semantic generation | Historical records remain readable; empty category view for new runs is normal |
| BEH-003 / system | Previous summary is selected in later compactable prefix | One updated replacement summary | Corrections/current state and still-relevant earlier constraints, recent-tail precedence |
| BEH-004 / user/operational | Current versionless reader and frozen released upgrader implemented in IR003 | Preserve approved restore/upgrade boundaries | No model call just to reopen valid context; unfinished tool writer states use normal repair |
| BEH-005 / user/system | Failure keeps pending compaction but can finish as IDLE; server input queue already exists | Recoverable error; held A; later B authorizes another three-attempt operation, then ordered continuation | Safe baseline; no duplicate inputs or replay of consumed work; explicit stop remains stop |
| BEH-006 / engineering contract | Executor/config depend on concrete DirectLlmCompactionSummarizer with structured inputs/provider result | Prepared content -> compressed content contract | Caller selection/validation/commit, sole direct production implementation, no registry |

## Scope guardrail

In scope: UC-001 automatic/repeated compaction; UC-002 supported resume and historical inspection; UC-003 compaction failure/retry/held-input continuation; UC-004 replacement at the compression contract. Minimal existing UI status/input corrections needed to show held/queued/error are included. Preserve optional current model/generation settings, ratios, raw-evidence lifecycle and existing runtime-specific append-versus-wait behavior.

Out of scope: long-term-memory product; old/new algorithm selector or registry; second production algorithm; child compactor/tools/semantic repair or shortening passes; manual summary entry; provider-native runtime redesign; universal busy-send interface; queue editor/reordering; durable offline outbox or pending-input recovery across backend restart; automatic replay of historical messages; historical-data deletion; broad migration or unrelated cleanup; arbitrary corruption repair, concurrent old/new writers, power-loss transaction guarantee; universal model-quality proof. Product/DR artifacts N/A — not requested.

Every blocking downstream correction must trace to these approved IDs. Additional product behaviors/compatibility promises/operational mechanisms require a requirement-gap decision, not silent adoption.

## Relevant scenarios and journeys

| ID / validity | Actor/event and goal | Supported trigger and sequence | Outcome / alternate | Evidence basis |
| --- | --- | --- | --- | --- |
| SCN-001 — Supported Normal Scenario | Run user continues sustained work | Ordinary conversation/tools reach existing context threshold; older settled content is summarized, recent activity retained, parent continues | One useful checkpoint; failure follows SCN005 | LLM phase, request assembler, threshold and planner |
| SCN-002 — Supported Normal Scenario | User inspects memory | Opens existing Memory Inspector and historical category/working-context views | Existing content remains readable; no category rows required for new summaries | Memory service/readers |
| SCN-003 — Supported Normal Scenario | Long run continues after compaction | New work/corrections accumulate; another compaction selects the previous summary and newly eligible older messages | One updated summary, prior summary included once; no resurrected completed work | Unit builder/planner/rendering |
| SCN-004 — Supported Normal Scenario | User returns to supported saved run | Normal resume restores meaningful current context and existing tool-protocol repair before next request | No generation solely for valid reopen; unavailable history stays scoped | Bootstrap, released-shape preservation, IR003/ARCH002 |
| SCN-005 — Supported Explicit Edge Scenario | User's run cannot compact successfully | Three strategy attempts fail before next parent dispatch; show recoverable error, hold unsent A; user sends B; retry compaction first; continue A then B after success | Repeated failure keeps inputs held; no queue-driven infinite cycles; already executed work not replayed; explicit cancel/termination stops its operation | Explicit SR026/028 + server/core queue and phase source |

Long instructions, attachments, Unicode, corrections, pending approvals and tool continuations are variations of these scenarios, not new manual workflows. UC004 substitution is an explicit engineering contract exercised in SCN001/003/005, not a hypothetical user-visible algorithm catalog. Hand-edited snapshots, arbitrary data corruption and synthetic-only source shapes are not newly supported scenarios.

## Requirements

| ID | Approved requirement | Trace |
| --- | --- | --- |
| REQ-001 | Produce one continuation checkpoint from selected older settled content, including the prior summary once when present; replace rather than accumulate summaries. | BEH001/003, SCN001/003 |
| REQ-002 | Do not generate/update or depend on episodic/semantic category records for current compaction. Remove old category/child-agent algorithm and selector, without removing the useful replacement contract. | BEH001/003/006 |
| REQ-003 | Preserve required head, recent uncompressed activity, protected complete tool groups, raw-evidence lifecycle and existing next-request fit checks. | SCN001/003 |
| REQ-004 | Failed/empty/known-incomplete/rejected output cannot replace valid context. Block normal dispatch at required compaction failure, expose recoverable error and permit a later distinct user admission to authorize a fresh compression operation before continuing. No retry after committed success due to reporting/cleanup error. | BEH005, SCN005 |
| REQ-005 | Host calls the strategy once per authorized compression operation; strategy owns three total attempts, returns first success, fails after third failure. Uniform compression/API/output failures retry; cancellation/termination stops. Direct implementation sends at most three outbound generation requests including local SDK behavior. No child agent/tools/semantic repair/outer automatic loop. Host preparation/acceptance/persistence failures are not internal generation retries. | BEH001/005, SCN001/005 |
| REQ-006 | Preserve goal, constraints, decisions, verified progress, active/pending work, unanswered requests, useful exact references, corrections and uncertainty. Never invent approval/completion or promote quoted content to authorization. Recent retained messages stay authoritative. | SCN001/003, exact v5 |
| REQ-007 | Preserve supported existing saved runs and historical category reads without history deletion/rewrite or generation merely to reopen. Required identity/provenance/tool facts remain required. | BEH002/004, SCN002/004 |
| REQ-008 | Internal operation with existing enablement/ratio/budget/status and optional current model/generation controls. Default then-current parent model/provider through existing credentials; selected-model defaults for unspecified generation fields. No retired model/settings reads/import/default initialization writes; old files untouched; current tuple retained. | SCN001/003/005, SR017 |
| REQ-009 | One complete tagged Markdown summary with six approved ordered headings; use nonempty inner body only; ignore exterior prose and reject missing/incomplete/ambiguous blocks. Known incomplete provider responses rejected. No JSON/model-driven repair. | SCN001/003/005 |
| REQ-010 | Replaceable CompressionStrategy consumes prepared content string and returns compressed string. No prefix/node/budget/provider metadata obligation in content contract. Caller prepares selection/rendering; strategy owns bounded compression attempts, not selection/installation/persistence/message delivery. One direct production implementation, independent test substitution. | BEH006/UC004, SCN001/003/005 |
| REQ-011 | No numeric desired-summary target, word-count substitute or bullet quota in prompt or strategy input. Keep exact v5, provider hard cap, input capacity, planner reserve and final fit/incomplete checks. | SCN001/003, ASM02201 |
| REQ-012 | Preserve pre-parent unsent A with identity/text/attachments on failure. Admit B behind A; successful recovery continues held inputs in order, once. New user admission after exhaustion authorizes recovery; existing queued entries and messages admitted during an active cycle do not authorize autonomous future cycles. Minimal frontend held/error state and usable error-state composer. No restart-durable queue guarantee. | BEH005, SCN005, SR028 |

## Acceptance criteria and verification intent

| ID | REQ / scenario | Observable criterion |
| --- | --- | --- |
| AC-001 | 001 / SCN001 | Next request contains one checkpoint + retained recent context, not compacted-away detailed prefix. |
| AC-002 | 001/006 / SCN003 | Repeated summary preserves relevant constraints and corrections, incorporates progress and replaces the earlier summary once. |
| AC-003 | 002 / SCN001/003 | No new episodic/semantic writes, category protocol/projection, child compactor, selector or legacy fallback. |
| AC-004 | 003 / SCN001/003 | Head/tool groups/tail and raw evidence retained; final context plus overhead fits existing target. |
| AC-005 | 004 / SCN005 | Failure retains valid baseline and blocks next parent dispatch; exhaustion visible as recoverable error, not cleared by false IDLE/completion; later genuine user admission can recover. Test commit separately from generation. |
| AC-006 | 005/008 / SCN001/005 | First/second/third success; three failures and no fourth; host invokes once, strategy performs retries, actual direct generation-request count <=3 including SDK; no semantic repair. |
| AC-007 | 006 / SCN001/003 | Manual source/output assessment of ordinary first/repeated fixtures; plans vs completed, approvals, references, corrections and pending work preserved. Plumbing/shape success is not semantic proof. SR020 exception remains explicit. |
| AC-008 | 007 / SCN004 | Supported v5/current versionless contexts resume with saved summary and normal repair; no model call merely to transform; frozen historical converter and writer-cut preservation remain verified. |
| AC-009 | 007 / SCN002 | Historical categories/current working context remain inspectable; no historical-file deletion. |
| AC-010 | 008 / SCN001/003/005 | Parent model default evaluated at operation/attempt time; current optional overrides/ratios usable, settings errors scoped to use, no separate compactor setup. |
| AC-011 | 009 / SCN001/003/005 | Exact six-heading tagged contract extracted; malformed/empty/ambiguous/known-incomplete outputs not installed; surrounding prose excluded. |
| AC-012 | 008/007 / SCN001/004 | No old-settings read/import or absent-key initialization; exact current tuple persists restart; supported snapshot meanings and existing historical upgrade dispositions preserved with no new migration. |
| AC-013 | 004/005 / SCN005 | Count includes transient/permanent API rejection and unusable output; cancellation during call/backoff/hold prevents later invocation/commit; existing provider deadlines remain; storage/postcommit errors cannot cause generation retries. |
| AC-014 | 004/012 / SCN005 | Actual A submission with identity/attachments, held error, B admission, successful compaction, parent handling A then B exactly once; no repeated input pipeline/history ingestion, no replay of previously consumed tool work. |
| AC-015 | 010/005 / UC004/SCN001/003/005 | Ordinary string standalone strategy test; independent non-inheriting implementation through real orchestration, no concrete-class cast/provider metadata fabricated; host no auto reinvocation on rejection; validation/commit/cancellation still apply. |
| AC-016 | 011/003/009 / SCN001/003 | Exact v5 with prepared content, no `Summary budget: N tokens.` or replacement quota; no duplicate prior summary; provider cap/input/final budget checks retained. |
| AC-017 | 012 / SCN005 | Error and held/queued display allow later send; renewed failure retains A/B without auto drain; new admissions during recovery do not overlap or carry a future retry credit; cancellation/termination cannot resume cancelled work; no cross-run mix; same-live-run reconnect projects truthful pending state. |

## Operating assumption

**ASM-022-01 — Natural summary compression.** For the long conversation histories that trigger compaction, we assume that an LLM given a clear summarization task will normally produce a substantially shorter continuation summary without being told a numeric token target. We rely on this behavior in the normal compaction path. The summary is not intended to reproduce the transcript or retain a fixed percentage of its tokens.

A long history contains repeated discussion, intermediate reasoning, superseded plans, repeated status messages, and verbose tool results. A continuation summary selects the current goal, still-applicable constraints, important decisions and findings, completed and pending work, and the exact references needed to resume. Much of the original volume is therefore not required in the replacement. Our input preparation also excerpts large tool results before they reach the summarizer. The summary's useful detail is driven by the task's state and remaining work, rather than by the length of the source history alone.

The practical basis is the user's extensive experience with LLM summarization: even very large histories ordinarily result in comparatively short summaries without a requested token count. For this design, that experience is sufficient to adopt natural compression as an operating assumption. We do not require an exact input-to-output ratio, a fixed output length, or further experiments to justify omitting a numeric prompt target. Illustrative input/output sizes are not acceptance thresholds.

**Design consequence:** ask for a concise but sufficiently detailed continuation summary using the approved content and output instructions. Do not add “approximately N tokens,” a word-count substitute, a fixed bullet quota, or a summary-size parameter to the replaceable transformation contract. Do not sacrifice important continuation information merely to hit an arbitrary target. On repeated compaction, the selected prefix already contains the prior summary once; the result is one updated replacement, not an accumulation of summaries.

**Separate boundary safeguards:** retain the provider's hard output cap, rejection of known incomplete output, and the existing final-context fit check before installing the replacement. These enforce resource and state boundaries; they are not instructions to produce a particular summary length. If a candidate fails those checks, retain the valid baseline and follow the approved failure policy. This operating assumption is not a promise about every possible input, and it does not justify removing those existing safeguards.

## Constraints, uncertainty and readiness

No new user decision remains. Architecture must implement these bounded behaviors without inventing a durable queue/migration. Existing snapshot/archive safety is per-file atomicity, not full crash/power-loss proof. Core implementation, adapter retry controls, same-turn suspension and UI integration need independent review and executable verification; they are not claimed implemented by approval.

API005 remains interrupted. API004 Fail90.7 is the historical last completed result. API-F005 is accepted known/nonblocking/not fixed, Qwen stopped; API-F004 historical cause remains unknown; CRR007 F006 correction resolved. The SR022 four-call diagnostic is evidence only, with one fidelity failure and three scoped usable outputs, not universal proof or a new acceptance result. Existing nine API durable paths still need eventual successful-test review; other inherited/fullsuite/typecheck/browser/desktop/retry/resume/crash gates remain. No new live calls authorized here.

Full investigation and cumulative supplement inventory are in `investigation-notes.md`; revisions/approval history in `solution-revision-record.md`; current architecture in `design-spec.md`. Prior specialist passes are scoped to their actual older basis. Product/UI prototype N/A — not requested; minimal existing-surface projection is in this ticket. Delivery not reached.

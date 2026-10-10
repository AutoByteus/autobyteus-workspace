# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Project Task `project_task_e08c9081…`) | N/A | N/A | Ready for Approval | BEH-001..006; REQ-001..009; AC-001..010 | Presented to user for approval with DEC-001 (TTL) and DEC-002 (Sonnet 5 price) |
| SR-002 | Mixed (Evidence + Requirements) | User request 2026-10-09: deep cost-efficiency investigation, Claude-Agent-SDK-comparable hit, fix pricing, then start | N/A | Ready for Approval | Approved | BEH-005, BEH-007 (new); REQ-002, REQ-003, REQ-005, REQ-010 (new); AC-003, AC-004, AC-011 (new); QR-001; DEC-001, DEC-002 resolved | Approved basis for architecture design |
| SR-003 | Mixed (Requirements + Design) | User 2026-10-09: "update [the Anthropic SDK] if not latest"; "please continue" after design explanation; S4 probe | N/A | Approved | Approved; design Ready | REQ-011, AC-012 (new); design-spec.md created | Design complete; routed per handoff rules |
| SR-004 | Mixed (Requirements + Evidence + Design) | Architecture review ARCH-REV-001 (Fail, Design Impact) | ARCH-001, ARCH-002, ARCH-003, ARCH-004 | Approved (SR-003); design Ready | Requirements Approved (user delegation); design Ready (revised) | BEH-005; REQ-003 (revised), REQ-012 (new), REQ-002 wording; AC-004 (revised), AC-013 (new); SCN-005/006 (new) | Returned to architecture review |
| SR-005 | Mixed (Requirements + Design) | User 2026-10-09: "If you think the refactoring will make it better, do it … Update your design." | N/A | Approved (SR-004), design Ready, implementation in progress | Approved; design Ready (Large/High) | REQ-013, AC-014 (new); design restructured | Implementation stopped; re-review requested |

## Revision Entries

### SR-001 — Native Anthropic prompt caching requirements baseline

- Phase and classification: Requirements / `Initial Baseline`
- Triggering evidence: Project Task request with 11/13/14/15.png; live probe (`probes/anthropic-cache-probe-result.json`); read-only DB evidence; official Anthropic prompt-caching and pricing docs (2026-10-09).
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design not created.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: BEH-001..006, REQ-001..009, AC-001..010, SCN-001..004, DEC-001, DEC-002.
- Scenario-basis or scenario-validity changes: N/A (baseline).
- Why this baseline was recorded: root cause confirmed (caching never requested); feasibility proven on Opus 5.5.
- Canonical sections changed: all (new).
- Supplemental artifacts added: probe test and result (evidence only).
- Product design evidence incorporated: N/A.
- Intended behavior changed: `Yes` (new caching behavior, pending approval).
- Approval impact: awaiting explicit user approval and DEC-001/DEC-002 answers.
- Behavior-defining supplement versions and approval references: None.
- Affected design/review basis invalidated or rebuilt: N/A.
- Post-design task-size/risk classification: N/A before design completion.
- Applied handoff-rule outcome: N/A (approval hold stays in the requirements conversation).
- Downstream and architecture-review impact: N/A.
- Scope note: a short-lived "Part 2" (Token Meter latest-prompt fill and delegated-member usage) was added and then withdrawn by `/project_task_manager` on 2026-10-09. It now belongs to `project_task_cb40258d-0311-4675-bdd4-8ff49253b576`. Findings are recorded as out-of-scope observations in `investigation-notes.md`.
- Remaining gaps: UNK-001 (thinking reset vs lookback), UNK-002 (tool-schema byte stability) for architecture.
- Next action: user approval; then architecture design.

### SR-002 — Deep cost-efficiency investigation and approved target

- Phase and classification: Mixed (Evidence + Requirements) / `Refinement`
- Triggering user feedback: 2026-10-09 "do deep investigation how to enable [caching] and how to achieve the maximum cost efficiency ... after you find out then start to work on this ... at least comparable [cache] rates like the Claude agent SDK" and "fixing of course pricing as well."
- Triggering finding IDs: N/A
- Prior status: requirements Ready for Approval (SR-001); design not created.
- Current status: requirements Approved (SR-002); design in progress.
- IDs affected: BEH-005 changed (append-only instead of steady-state strip); BEH-007 added (interruption note); REQ-002 tightened (append-only across turns); REQ-003 replaced (native blocks kept for all replies, no strip at new turn); REQ-005 fixed to 1h; REQ-010 added; AC-003 target raised to ≥ 90 % on ≥ 25 calls; AC-004 rewritten; AC-011 added; QR-001 updated; DEC-001 resolved (1h), DEC-002 resolved (yes).
- Scenario changes: SCN-002 sequence now "new turn appended to unchanged history".
- Why: Claude Agent SDK transcripts show 1h TTL everywhere and append-only history; real-session TTL simulation favors 1h ($88.6 vs $123.5); live strategy probe shows the per-turn thinking strip costs a full rewrite of the latest tool cycle every turn (S1 $0.434 vs S3 $0.265, 82.8 % vs 90.9 %), and Anthropic's guidance calls steady-state stripping a cache-restarting anti-pattern.
- Canonical sections changed: requirements (status, outcome, behavior table, scope, requirements, ACs, scenarios, quality, decisions, traceability, supplements, readiness); investigation notes (deep investigation section, risks, supplements).
- Supplements added: `probes/strategy-probe.mjs`, `probes/strategy-probe-result.json`, `probes/transcript-analysis/*.py` (evidence only).
- Intended behavior changed: `Yes`. The prior approved behavior "strip all thinking at each independent turn" (ticket `new-models-gpt6-opus55`) is replaced by append-only history to meet the user-approved goal.
- Approval impact: user approved the goal, the pricing fix and starting work, delegating technical means/TTL to the evidence; the append-only consequence is reported to the user together with the design so it can be vetoed.
- Behavior-defining supplement versions: None.
- Affected design/review basis: N/A (design not yet created).
- Post-design classification: pending design.
- Applied handoff-rule outcome: N/A.
- Downstream impact: architecture design must cover memory/renderer/adapter changes for append-only history (RSK-003).
- Remaining gaps: compaction summarizer cache reuse recommended as a separate follow-up Task.
- Next action: architecture design.

### SR-003 — SDK upgrade, append-only confirmation, design completion

- Phase and classification: Mixed (Requirements + Evidence + Design) / `Refinement`
- Triggering user feedback: 2026-10-09 "If we are not using the latest anthropic SDK, we should update it on the library." Then, after the explanation of the major problems and the design, "please continue. I believe you follow the design principles."
- Triggering evidence: `npm view @anthropic-ai/sdk` → latest 0.132.1 (workspace pins 0.128.0); strategy probe S4 (`probes/strategy-probe-s4-result.json`): no per-turn strip while text-only replies stay stored without thinking: 90.8 % hit, $0.268, accepted under `prefix_mismatch_behavior: "error"`.
- Prior status: requirements Approved (SR-002); design not created.
- Current status: requirements Approved (SR-003); design `Ready`.
- IDs affected: REQ-011 and AC-012 added; BEH-005 desired behavior realized without changing how replies are stored (S4).
- Intended behavior changed: `Yes` (SDK upgrade added; append-only explicitly confirmed by the user).
- Approval impact: explicit user approval to continue with the explained design (2026-10-09).
- Design: `design-spec.md` created; classification recorded there.
- Post-design classification: `task_size=Medium`, `architectural_risk=High` (removal of reviewed signed-thinking lifecycle behavior, shared invocation contract, provider SDK upgrade).
- Applied handoff-rule outcome: architecture review route → `/software_engineering_team/architecture_reviewer`; handoff file `solution-handoff.md`.
- Next action: independent architecture review.

### SR-004 — Architecture review ARCH-REV-001 resolution

- Phase and classification: Mixed / `Design Impact` (ARCH-001, ARCH-003) + `Requirement Gap` (ARCH-002) + editorial (ARCH-004)
- Trigger: `/software_engineering_team/architecture_reviewer` ARCH-REV-001, report `design-review-report.md`, record `architecture-review-revision-record.md` (same folder).
- Finding resolutions:
  - ARCH-001: confirmed live (probe P2: tool change with kept thinking → 400; P3: strip once → accepted). Design adds an event-driven prefix-binding guard: `MemoryManager.bindRetainedReasoningToRequestPrefix(digest)`, called by `LLMRequestAssembler` after compaction and before the recovery snapshot. The digest covers the leading system run and tool schemas. Thinking is stripped once on a digest change or on the first request since creation/restore. Normal turns stay append-only. Review options (b) replay stored tools and (c) `drop_block` were rejected with rationale. New REQ-012, AC-013, SCN-005/006.
  - ARCH-002: requirements revised to the S4 design (text-only replies keep current storage); REQ-003, BEH-005, AC-004 rewritten; S4 added to the supplement inventories. Approved by explicit user delegation 2026-10-09.
  - ARCH-003: corrected; snapshots hold latest-cycle thinking. The first resume after the upgrade is a restore, so the guard strips once and the request is valid. P1 shows string vs block-array system is binding-equivalent.
  - ARCH-004: Architecture Phase Input and stale investigation text updated.
  - P-004: recorded as a residual risk.
- Prior status: requirements Approved (SR-003); design Ready (SR-003, reviewed Fail).
- Current status: requirements `Approved` (SR-004; the user explicitly delegated the choice on 2026-10-09: "you decide the most reasonable … and then work on it"; the recommended option was selected); design `Ready` (revised).
- Supplements added: `probes/prefix-change-probe.mjs`, `probes/prefix-change-probe-result.json` (evidence only).
- Intended behavior changed: `Yes`. Thinking is removed once on tool/system change and on restore; text-only reply wording is aligned to S4.
- Approval impact: renewed approval obtained by explicit user delegation (2026-10-09). Considered alternative: persisting per-turn prefix digests to avoid the restore strip; rejected under DESIGN.md "smallest solution / refine on evidence".
- Classification: unchanged (`Medium` / `High`).
- Applied handoff-rule outcome: `architectural_risk=High` → `/software_engineering_team/architecture_reviewer` (re-review of ARCH-REV-001 findings).
- Next action: architecture re-review.

### Review receipt — ARCH-REV-002 (informational)

- 2026-10-09: `/software_engineering_team/architecture_reviewer` ARCH-REV-002 **Pass** on SR-004. The reviewer routed the package to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.
- ARCH-004 residual stale text corrected in place (factual corrections only; no requirement or design change): design-spec evidence row "one-time miss", investigation-notes code-facts row and "Architecture Investigation Findings" placeholder, requirements preserved-behavior invariant, SR-004 approval bullet.
- P-005 (non-blocking): a one-time strip in the middle of a tool round on a live tool change is unverified. The worst case is one failed request, no worse than today. Covered by AC-013(a) live validation.

### SR-005 — Provider-boundary refactor folded into this ticket

- Phase and classification: Mixed (Requirements + Design) / `Refinement` (user-approved refactor scope)
- Trigger: the user asked for the Solution Designer's assessment of the native runtime spine. The SD proposed moving provider-specific history rules out of MemoryManager, one request builder per provider, and an explicit request-prefix owner. User (2026-10-09): "If you think the refactoring will make it better, do it. Ask the implementation engineer to stop and then do the refactoring right now. Update your design."
- Actions:
  - stop request sent to `/software_engineering_team/implementation_engineer`, which confirmed at SR-004 step 7 with uncommitted worktree changes;
  - code investigation: provider-native imports, the rendered-payload consumers (none in production), the `nativeToolCallContext` precedent, the duplicate leading-system-run helpers.
- IDs affected: REQ-013, AC-014 added; BEH-005 traces to REQ-013. No user-visible behavior change.
- Design: `design-spec.md` rewritten for SR-005. The SR-004 version is kept as `design-spec.sr004.bak.md`. Main additions:
  - `llm/provider-native/` (opaque `ProviderNativeAssistantTurn`, `ProviderNativeHistoryPolicy`, registry + neutral operations);
  - the Anthropic turn model and policy moved to `llm/api/`;
  - memory and compaction use the neutral operations;
  - `renderedPayload` and the agent-side pre-render are removed (`BaseLLM`/extension signatures change);
  - `prepareRequest` returns `tools`, which `LlmPhase` sends.
- Classification: `task_size=Large`, `architectural_risk=High`.
- Approval: explicit user instruction (above).
- Applied handoff-rule outcome: Large/High → `/software_engineering_team/architecture_reviewer`.
- Next action: architecture review of SR-005.

### Review receipt — ARCH-REV-003 (informational)

- 2026-10-09: `/software_engineering_team/architecture_reviewer` ARCH-REV-003 **Pass** on SR-005. The reviewer routed the package to `/software_engineering_team/implementation_engineer`. Report: `design-review-report.md`.
- ARCH-005 (Low, non-blocking): factual correction made in `design-spec.md` § Risks (one server test caller of `sendMessages(messages, null, …)`; a test-support `LLMExtension` subclass). R-1 (avoid a registry ↔ Anthropic policy import cycle) noted there too. No requirement or design change.

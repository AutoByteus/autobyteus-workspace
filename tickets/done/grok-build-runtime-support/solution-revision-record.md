# Solution Revision Record

Package: `grok-build-runtime-support`
Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/grok-build-runtime-support` (branch `codex/grok-build-runtime-support`; base `origin/personal`, fast-forwarded from `826e7043e` to `1676bede9` on 2026-09-26)

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from user request (2026-09-26) + live Grok ACP probes | N/A | N/A | Ready for Approval (superseded, never approved) | BEH-001..BEH-012; REQ-001..REQ-016; AC-001..AC-014; SCN-001..SCN-010; DEC-000..DEC-009 | Presented; user identified a factual error before approval |
| SR-002 | Mixed (Evidence + Requirements) | User feedback 2026-09-26: Antigravity CLI runtime is already released; work must be based on the worktree at `origin/personal` | EVD-001 (stale-checkout evidence) | Ready for Approval (SR-001) | Ready for Approval | BEH-001..BEH-013 (current-state columns), BEH-004/BEH-012/BEH-013 (desired), REQ-002/003/005/014/017, AC-001/004/005/008/014/015, SCN-011, DEC-000 | Corrected package re-presented for approval |
| SR-003 | Requirements | User direction 2026-09-26: resolve open decisions from existing runtime implementations | N/A | Ready for Approval (SR-002) | Ready for Approval | DEC-001..DEC-009; BEH-005, BEH-007; REQ-006, REQ-011, REQ-016; AC-013; ASM-002, UNK-003 | All decisions resolved by precedent; only approval remains |
| SR-004 | Requirements | User review 2026-09-26: "does grok allow us to inject in its system prompt? … codex and claude agent sdk … we actually didnt replace, but we injected" | N/A | Ready for Approval (SR-003) | Ready for Approval | DEC-005; BEH-005; REQ-006 | DEC-005 corrected from replacement to injection |
| SR-005 | Requirements | User approval 2026-09-26 conditioned on a reusable ACP layer being better | N/A | Ready for Approval (SR-004) | **Approved** | REQ-018, AC-016 (new) | Requirements approved; architecture design starts |
| SR-006 | Mixed (Evidence + Requirements wording) | User direction 2026-09-26: drop Gemini CLI, consider only DSH | N/A | Approved (SR-005) | Approved | REQ-018, AC-016 (wording) | Second-agent reference switched to DSH; capability-driven layer |
| SR-007 | Design | Architecture design on approved SR-005/SR-006 basis | N/A | Approved; design N/A | Approved; design Ready | All BEH/REQ/AC (design mapping) | `design-spec.md` Ready; task_size Large, architectural_risk High |
| SR-008 | Mixed (Design + Requirements clarification + Evidence) | ARCH-REV-001 Fail/Design Impact (AR-001..AR-004) | AR-001, AR-002, AR-003, AR-004, P-05 | Approved; design Ready (SR-007) | Approved (clarified); design Ready | REQ-011, REQ-016, AC-004, AC-009, AC-013, DEC-006; DS-002/003/004/008 | Design revised; returned for architecture review round 2 |

## Revision Entries

### SR-001 — Grok Build (ACP) runtime + `grok-4.7` catalog refresh: initial requirements baseline

- Phase and classification: `Initial Baseline`
- Triggering user feedback, Product package, investigation evidence, or role/report/round: user request 2026-09-26 ("support grok build as runtime … update the model support to the latest … remove the 4.6 support"); investigation of the runtime stack; five budgeted live ACP probes against `grok` CLI 1.0.41 (≈US$0.16 provider-reported cost).
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: requirements `Ready for Approval`; design `N/A`.
- Requirement, behavior, acceptance-criteria, scenario or decision IDs affected: all IDs listed in the index row (new).
- Scenario-basis or scenario-validity changes: ten `Supported Normal Scenario` rows (SCN-001..SCN-010).
- Why this baseline or revision was recorded: first coherent baseline for user approval.
- Canonical requirements, investigation and design sections changed: `requirements-doc.md` (all), `investigation-notes.md` (all); `design-spec.md` N/A.
- Supplemental artifacts added, changed or removed: added `evidence/grok-acp-probes/` (evidence only).
- Prototype evidence or product decisions incorporated: none.
- Intended behavior changed: `No` (baseline)
- Approval impact: approval pending; never approved.
- Behavior-defining supplement versions and approval references: none.
- Affected design/review basis invalidated or rebuilt: N/A
- Post-design task-size/risk classification and rationale changes: N/A
- Applied handoff-rule outcome / result-file reference: N/A (approval hold; no handoff)
- Downstream and architecture-review impact: none
- Remaining gaps: DEC-000..DEC-009 awaiting user.
- Next action: user approval.
- *Factual correction (recorded in SR-002):* SR-001 code evidence was read from the stale shared checkout (`personal` @ `0f54978ba`, 104 commits behind `origin/personal`), not from the task worktree base `826e7043e` stated above. Its statements that the base had three runtime kinds and that `antigravity_cli` existed only on an unmerged branch were false.

### SR-002 — Evidence correction: Antigravity CLI runtime is released; Grok Build becomes the fifth runtime

- Phase and classification: `Refinement` (evidence correction with resulting requirements-text changes; no user-approved behavior existed yet)
- Triggering user feedback: 2026-09-26 — "why you meant antigravity cli ticket is still not on origin/personal branch? … i think antigravity cli runtime is already released. please check"; "please first update our main repo personal branch to latest"; "basically the main repo should be tracking origin/personal"; "your work is based on your own worktree, because your worktree is made from the origin/personal which is latest".
- Triggering finding IDs: `EVD-001` — first-pass code reads came from `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` at `0f54978ba` (2026-09-23, v1.4.76) instead of the task worktree. Verified: AGY redesign merged `5fe6c2f16`, released `v1.4.81` (2026-09-25, DR-009 Delivery Completed), follow-up `agy-empty-mcp-config-activation` in 1.4.82/1.4.83.
- Corrective operational actions (user-requested): shared checkout `personal` fast-forwarded to `origin/personal` @ `1676bede9` after stashing a stray root `package.json` overwrite (`stash@{0}`, preserved, not applied); confirmed `personal` tracks `origin/personal`. Task worktree fast-forwarded `826e7043e` → `1676bede9` (docs-only delta). All evidence now read from the worktree; base revision recorded in the investigation notes.
- Prior authoritative requirements/design status: SR-001 `Ready for Approval` (not approved)
- Current authoritative requirements/design status: requirements `Ready for Approval` (SR-002); design `N/A`.
- IDs affected:
  - Current-state corrections: BEH-001 (four runtimes, async providers, safe diagnostics), BEH-002 (`runtimeModelSelectionCatalog` + `RunModelSelectionService`; removed references to non-existent `runtime-model-capacity-service.ts`), BEH-004 (AGY has no approval bridge and an AGY-only default-on launch policy), BEH-006 (AGY exact conversation id), BEH-007 (analytics labels lack AGY), BEH-008 (AGY capsule skill copy), BEH-011, BEH-012 (AGY interrupt stops the process).
  - Desired-behavior clarifications: BEH-004/REQ-005 — Grok keeps the standard launch default; AGY-only policy not extended. BEH-012/REQ-010 — Grok run stays active after interrupt.
  - New: BEH-013 / REQ-017 / AC-015 / SCN-011 / UC-001 extension — Grok available to org members and application runs (both execution scopes wire external runtimes; application launch preflight).
  - Strengthened: REQ-002 / QR-001 — version/feature gate and safe classified diagnostics (AGY pattern); REQ-014 / AC-014 — preserved set includes `antigravity_cli`; QR-006 — idle-stall handling.
  - Scope: out-of-scope now names "no change to the four existing runtimes", incl. AGY's missing analytics label (separate-ticket candidate); removed the incorrect "Gemini/Antigravity runtime work" line.
  - Decisions: DEC-000 resolved by the user (Antigravity is the released runtime; Grok is the fifth). DEC-001..DEC-009 unchanged and open.
  - Evidence: persisted launch validation is enum-driven (`Object.values(RuntimeKind)`), so no hard-coded allowlist change is required; SR-001 claim removed.
- Scenario-basis changes: added SCN-011 (application run on Grok, Supported Normal Scenario, evidence: application execution-scope wiring); SCN-005 extended to org members.
- Canonical sections changed: `investigation-notes.md` rewritten (meta, clarifications, source log, BEH table, technical facts, surfaces, stakeholder, persisted data, assumptions/risks incl. RSK-006, implications, design notes); `requirements-doc.md` rewritten (status, problem, behavior table, scope, REQ/AC, scenarios, UI labels, QRs, assumptions, decisions, traceability, architecture input).
- Supplemental artifacts: unchanged (probe evidence remains valid — produced against the real CLI, independent of repo state).
- Prototype evidence or product decisions incorporated: user clarification of DEC-000.
- Intended behavior changed: `Yes` relative to the SR-001 draft (additions/clarifications listed above); no previously approved behavior existed, so no approval is revoked.
- Approval impact: SR-002 requires explicit user approval before design.
- Behavior-defining supplement versions: none.
- Affected design/review basis invalidated or rebuilt: N/A (no design yet).
- Post-design task-size/risk classification: N/A.
- Applied handoff-rule outcome: N/A (approval hold; no handoff).
- Downstream and architecture-review impact: none yet. Design must use the AGY runtime (v1.4.81) as the primary structural precedent for process ownership and the Claude runtime for approvals/HTTP MCP/skill symlinks.
- Remaining gaps: DEC-001..DEC-009; UNK-001..UNK-003.
- Next action: present corrected package; on approval proceed to architecture investigation and `design-spec.md`.

### SR-003 — Open decisions resolved from existing runtime precedent

- Phase and classification: `Refinement`
- Triggering user feedback: 2026-09-26 — "these answers can be answered by looking at the existing runtime implementations … Just investigate how existing runtime works and then answer those questions by yourself."
- Triggering finding IDs: N/A
- Prior status: SR-002 `Ready for Approval` (not approved). Current status: `Ready for Approval`; design `N/A`.
- IDs affected: DEC-001..DEC-009 resolved (evidence: investigation notes, "Precedent-Based Decisions"). Changed from SR-002 recommendations: **DEC-005** now *replaces* Grok's system prompt (`systemPromptOverride`) instead of appending, matching Codex/Claude/AGY and exact system-instruction recording (REQ-006, BEH-005 updated; MCP-discovery-under-override added as a design verification item). **DEC-006** now disables only Grok native subagents and leaves Grok memory/user config untouched (memory is off by default; AutoByteus never mutates provider user config) (REQ-016 promoted to Must, AC-013 updated). **DEC-009** cost flows through the existing `LLMFactory.getModelPricingInfo` path with `model_provider: "GROK"` (BEH-007, REQ-011 wording). Others confirmed as recommended.
- Scenario-basis changes: none.
- Canonical sections changed: requirements-doc status, BEH-005, BEH-007, REQ-006, REQ-011, REQ-016, AC-013, assumptions, decisions table, architecture input, readiness; investigation-notes meta, new "Precedent-Based Decisions" section, ASM-002/UNK-003.
- Supplemental artifacts: none changed.
- Intended behavior changed: `Yes` relative to the SR-002 draft (DEC-005/DEC-006 details); nothing was previously approved.
- Approval impact: SR-003 requires explicit user approval before design.
- Design/review impact: N/A (no design yet). Post-design classification: N/A.
- Applied handoff-rule outcome: N/A (approval hold).
- Remaining gaps: UNK-001 (active-turn append) and UNK-002 (analytics label fallback) are design-time items.
- Next action: user approval of SR-003, then architecture design.

### SR-004 — DEC-005 corrected: inject the composed prompt, do not replace Grok's system prompt

- Phase and classification: `Refinement` (user correction of a precedent inference)
- Trigger: user review of SR-003 (quote in index row).
- Finding: SR-003 inferred "replace" from field names. Re-check: Codex receives the composed prompt as `baseInstructions` with `developerInstructions: null`; Claude as a custom-string `options.systemPrompt`; in both the provider harness keeps its own tool/environment scaffolding, and AutoByteus records the text it supplied. The local Codex protocol schema does not document replacement semantics, so the "replace" claim was not evidence-backed. The consistent pattern is: AutoByteus prompt goes into the provider's system-prompt slot while the harness stays intact. Grok's equivalent slot is ACP `_meta.rules`, verified in probe 1 (lands in `<human_rules>` inside Grok's own system prompt; model obeyed).
- Changes: DEC-005 → inject via `rules`, not `systemPromptOverride`; REQ-006 and BEH-005 wording; removed the SR-003 design verification item (MCP discovery under override) because Grok's default prompt, including its tool guidance, now stays intact. Investigation notes precedent row updated.
- Intended behavior changed: `Yes` relative to SR-003 draft (nothing previously approved). Approval impact: SR-004 requires explicit user approval.
- Design/review impact: N/A (no design yet).
- Next action: user approval of SR-004, then architecture design.

### SR-005 — Reusable ACP layer added (REQ-018) and requirements approved

- Phase and classification: `Refinement` + approval capture
- Trigger: user questions about reusing ACP for other CLIs (ZCode, DSH), the official ACP registry and Gemini CLI support, then: "do you think building a reusable ACP layer is better, if yes. then approved".
- Evidence: live ACP registry (41 agents incl. `grok-build`, `gemini`, `antigravity-acp`, `claude-acp`, `codex-acp`); local `gemini --acp`; DSH/ZCode not in registry (investigation notes, "ACP Ecosystem Evidence").
- Solution Designer answer (the approval condition): **Yes** — the Grok backend needs the ACP transport/session/event code regardless; making it runtime-neutral now costs mainly boundary placement, whereas extracting it later would unwind Grok assumptions from shipped code; several registry agents are realistic next candidates. Guardrails: only standard ACP in the shared layer; all xAI specifics in the Grok profile; no generic user-selectable ACP runtime; profile contract validated against a zero-cost Gemini CLI handshake during design.
- Changes: added REQ-018 (Should) and AC-016; traceability row; status → Approved.
- Approval: **Approved 2026-09-26**; exact basis = requirements-doc at SR-005 (includes SR-003/SR-004 decisions). No behavior-defining supplements.
- Design/review impact: architecture design may start on this basis.
- Next action: architecture investigation and `design-spec.md`.

### SR-006 — Second-agent reference is DSH, not Gemini CLI

- Phase and classification: `Refinement` (user-directed wording change within the approved REQ-018 intent) + evidence
- Trigger: user 2026-09-26 — "we already have antigraviy cli support, so no need to consider gemini cli. forget it. only consider dsh".
- Evidence: `@deepseek-ai/dsh-acp@0.0.1-rc.1` package contract (automation-only; no session load, no MCP, committed text only, no usage/reasoning/tool activity); SDK replay of recorded Grok traffic through `@agentclientprotocol/sdk@1.5.0` with zero errors. See investigation notes "ACP Ecosystem Evidence".
- Changes: REQ-018 rationale and AC-016 now reference DSH and require the shared layer to be capability-driven (advertised ACP capabilities checked; missing ones reported explicitly). Gemini CLI removed from all artifacts.
- Intended behavior changed: wording only; the approved intent of REQ-018 (runtime-neutral ACP layer + Grok profile, Grok-only scope) is unchanged. The user's instruction is the approval for this wording change.
- Design impact: shared ACP layer is designed against the ACP standard plus a capability check; DSH is a documented-contract reference only (no live probe; DSH not installed on PATH).
- Next action: continue architecture design.

### SR-007 — Architecture design complete

- Phase and classification: `Design` (initial design on the approved basis)
- Trigger: requirements approved (SR-005), wording updated (SR-006).
- Evidence added: ARC-01..ARC-19 (investigation notes), SDK replay harness, ACP registry snapshot, DSH ACP README.
- Canonical artifacts: `design-spec.md` created (status Ready); `investigation-notes.md` architecture findings; requirements unchanged.
- Key decisions: official `@agentclientprotocol/sdk@1.5.0` for a runtime-neutral ACP layer (`runtime-management/acp`, `agent-execution/backends/acp`) with launch/session profile contracts; Grok profile in `runtime-management/grok` + `agent-execution/backends/grok`; process per run; model/effort via launch flags; injection via `_meta.rules`; readiness gate on `_x.ai/mcp/server_status`; per-turn usage from prompt-result `_meta.usage` (`gross_includes_cache`); restore via `session/load` with replay suppression and no re-injection; `GROK_SUBAGENTS=0`; `agentProfile.disallowedTools` for `ask_user_question`/`workflow` pending a ≤US$0.05 implementation check; persisted data `Directly Usable — No Migration`.
- Intended behavior changed: `No`.
- Classification: task_size **Large**, architectural_risk **High** (new external protocol + dependency, permission mapping, provider-id binding, concurrent processes, new shared subsystem).
- Applied handoff-rule outcome: recorded in `handoff-architecture-design-complete.md` after rule lookup.
- Next action: route per handoff rules.

### SR-008 — ARCH-REV-001 findings resolved

- Phase and classification: `Design Impact` recovery (plus requirement-wording clarifications and new evidence)
- Trigger: architecture review ARCH-REV-001 (`design-review-report.md`, `architecture-review-revision-record.md`): Fail — AR-001 (High), AR-002 (High), AR-003, AR-004; P-05 Unclear.
- Evidence added: ARC-20..ARC-25 (per-call usage semantics verified on four recorded turns; tier calculation for `base_excludes_cache`; cancelled-call reporting; load-replay usage frames; Grok env switches and `ask_user_question` 1800 s wait; base delta `1676bede9`→`e06080b00`).
- Operational: worktree fast-forwarded to `origin/personal` @ `e06080b0027636cecf20b5e437c496d423c7f26b` (ticket files untracked, no conflicts).
- Design changes: launch env switches `GROK_SUBAGENTS=0`, `GROK_WORKFLOWS=0`, `GROK_ASK_USER_QUESTION=0`; `_meta.agentProfile` removed; step 5 → confirmation with stop-and-return failure branch; usage → one `per_call` record per `response_completed` (`base_excludes_cache`, ordinal key, session model, suppressed during load replay, no turn-level record); session-profile hook `interpretExtNotification → AcpExtEffect[]` replaces `extractTurnUsage`; permission `toolCall` projected like tool cards; capabilities read standard fields only; connection buffers frames for opening sessions; DSH prompt-delivery limit recorded; file `grok-build-turn-usage.ts` → `grok-build-call-usage.ts`.
- Requirement wording: REQ-011/AC-009 clarified to one record per model call — same totals and the same approved pricing intent, as the reviewer confirmed ("Changes approved behavior: No"); no renewed approval needed. AC-004 names canonical `run_bash` (alignment only). REQ-016/AC-013/DEC-006: `workflow` child agents fall under the approved "native subagent spawning is disabled"; **`ask_user_question` is newly named**. Basis: the Claude precedent (`tickets/done/claude-ask-user-question-disallow`; `AskUserQuestion` is in Claude's disallowed list), applied under the user's standing 2026-09-26 direction to decide such questions from existing runtime implementations (SR-003 trigger). Also, AutoByteus has no bridge for Grok's question UI, and the tool would block a turn for up to 1800 s. This addition is reported to the user explicitly; if the user objects, it is a `Requirement Gap` to be reverted before implementation.
- Intended behavior changed: `ask_user_question` addition only (precedent-derived, flagged to the user). Nothing else.
- Classification: task_size Large, architectural_risk High (unchanged).
- Applied handoff-rule outcome: see `handoff-architecture-design-complete.md` (round 2 section).
- Next action: architecture review round 2.

### Review receipt — ARCH-REV-002 Pass (informational, no new SR round)

- Received 2026-09-26 from `/architecture_reviewer`: **Pass** for SR-008 (`design-review-report.md`, `architecture-review-revision-record.md`). AR-001..AR-004 verified resolved. The reviewer handed the package to `/implementation_engineer` (delivery confirmed); the Solution Designer does not repeat that handoff.
- Open non-blocking item **AR-005** (Low, editorial): three stale "per-turn usage" phrases in `design-spec.md` (BEH-007 map row, escalation (b) example, "usage extraction" terminology). Fix at the next design touch. The authoritative per-call usage design (DS-002/003, off-spine "Per-call usage", interface, examples, SR-008 Review Resolution) is unaffected.
- Residual: the `ask_user_question` addition (REQ-016) was reported to the user. If the user objects, reopen it as a `Requirement Gap`.

### SR-009 — Application-launch deferral and separate-ticket candidates

- Phase and classification: `Requirements` scope deferral (user-directed) + evidence; no design redesign.
- Trigger: informational message from `/api_e2e_engineer` 2026-09-26, sent at the user's explicit request: application launch testing (AC-015) is left out of this ticket's validation, and the application problems go to a future ticket. The API/E2E Fail result for this ticket went separately to `/code_reviewer` and is not handled here.
- Findings: STC-001 (applications quarantined, setup routes 503; pre-existing) and STC-002 (the `unsupported` credential authority blocks every Grok/AGY application launch; for Grok this comes from this ticket's own design choice copied from AGY — confirmed in code by the Solution Designer).
- Changes: REQ-017/AC-015 marked deferred with the known gap stated; design-spec BEH-013 row and file mapping note the gap; investigation notes gain a "Separate-Ticket Candidates" section. AR-005 editorial fix applied (BEH-007 row, escalation (b) example, "usage interpretation" terminology).
- Intended behavior changed: `Yes` — the user deferred the application-launch outcome of REQ-017/AC-015 (the user's direction is the approval basis; relayed by API/E2E). Nothing else changes.
- Design/review impact: none for the remaining scope. The application-scope wiring stays as implemented. No new review round, because no in-scope design changed.
- Handoff: none. The message was informational, and the Solution Designer does not re-route the API/E2E result.
- Next action: await the downstream failure-origin result from `/code_reviewer` via the normal rules. Propose STC-001/STC-002 as a new ticket when the user asks.

### SR-010 — Failure-origin review CRR-002: decisions on CR-005/CR-006/CR-007

- Phase and classification: Mixed. It holds one `Requirement Gap` (CR-006, pending the user), one precedent-resolved clarification (CR-007), the confirmation of an earlier user deferral (CR-005), and one carried implementation Local Fix (CR-004).
- Trigger: `/code_reviewer` CRR-002 (Fail) on API/E2E API-REV-001 (Fail); code-review-report.md section "API/E2E Failure-Origin Review (Round 2, CRR-002)".
- Evidence: ARC-26..ARC-29 (approval bisect and Grok local state, Codex/Claude approval precedent, deny → `cancelled`, unauthenticated `session/new`).
- **CR-005 (REQ-017/AC-015):** the user already deferred the application-launch outcome to a future ticket (SR-009, STC-002). `unsupported` is kept for this ticket, consistent with AGY, and both are fixed together later. No design change. Grok has no cheap auth probe (ARC-29), which is input for the future ticket (likely `no_credential` + start-time error surfacing).
- **CR-007 (REQ-005 rationale):** resolved by precedent under the user's standing direction (ARC-27). AutoByteus shows every approval request Grok raises and never grants on the user's behalf. Grok's own policy decides which calls need approval. No forced `ask` rules (DEC-007/REQ-016 unchanged). REQ-005's rationale text was clarified; its requirement text is unchanged. The cause of Grok's `echo`/`touch` auto-allow is undocumented (ARC-26) and reported to the user as a known limitation.
- **CR-006 (AC-004 deny):** `Requirement Gap`. The proposed amendment: denied tool shown denied; Grok ends the turn; the turn is shown completed (not interrupted); the run is idle, and the next message continues. Design delta if approved: in `AcpAgentSession`, a `stopReason:"cancelled"` received while `prompting` (no client cancel) after a user `reject_once` in the same turn → `TURN_COMPLETED`; otherwise it stays `TURN_INTERRUPTED`. Rejected option: auto-sending a synthetic follow-up prompt (a fake user message; AGY-ticket precedent rejects fake bootstrap user messages). **Pending explicit user approval; the design is not revised until then.**
- **CR-004 (Local Fix, carried):** the shared ACP factory converts provider `RequestError`s from `initialize`/`session/new`/`session/load` into `AgentCreationError` with provider message + data (runtime-neutral), and the existing safe ACP errors surface the same way. Unit tests cover create and restore. Implementation-owned.
- Non-blocking carried: CR-001, CR-003 (implementation); CR-002 design-text sync (with AR-005, already fixed in SR-009).
- Intended behavior changed: CR-006 proposal only (pending); CR-007 is a rationale clarification.
- Next action: user decision on CR-006. Then revise design-spec (DS-002/DS-008 mapping, CR-004 error surfacing) and route per the handoff rules (Large/High → architecture review).

### SR-011 — CR-006 approved; design revised for CRR-002

- Phase and classification: Mixed. It contains the requirements approval of CR-006 and the design revision (CR-004 error surfacing, CR-006 turn-end classification, CR-002 text sync).
- Trigger: user reply 2026-09-26 to SR-010: "I think what you suggest is correct … I think what your proposal is reasonable."
- Requirements: AC-004 amended (deny → tool denied, turn completed, run idle, next message continues) and approved; the proposed-amendment row was replaced. REQ-005 rationale (CR-007) and REQ-017 deferral (CR-005) are as recorded in SR-010/SR-009.
- Design: DS-001 (start-time provider errors → `AgentCreationError`), DS-002/DS-008 (turn-end classification by session state + per-turn denial flag), permission bridge (reports user reject), factory ownership, capability requirement check (`requiredFor`), launch profile (`--no-leader`; version gate in capability), session profile (`mcpReadiness()`), prompt builder (no image blocks), launch-args example, stream-contract enums. Summary table "SR-011 Revision" in the design-spec.
- Classification: task_size Large, architectural_risk High (unchanged).
- Review impact: the revised design goes to independent architecture review per the handoff rules. The downstream order afterwards is implementation (CR-004, CR-006, CR-001, CR-003) → code review → API/E2E. AC-015 stays out of validation (user deferral).
- Next action: route per the handoff rules.

### Review receipt — ARCH-REV-003 Pass (informational, no new SR round)

- Received 2026-09-26 from `/architecture_reviewer`: **Pass** for SR-009/SR-010/SR-011. AR-005 resolved. The reviewer handed the package to `/implementation_engineer` (delivery confirmed); the Solution Designer does not repeat that handoff.
- Open non-blocking item **AR-006** (Low, wording): DS-001 and the SR-011 CR-004 row say restore shows the provider text. In fact `agent-run-manager.ts:170-171` wraps any non-activation restore error (including `AgentCreationError`) in the generic `PlatformAgentRunRestoreError`, keeping the provider text only as `cause`. This is existing shared behavior for all runtimes (REQ-014). Interpretation recorded: AC-012 ("run start or turn") covers a new run's start and in-turn errors. Provider text on reopen is not required by this ticket, so no Requirement Gap is raised. The wording will be corrected at the next design touch: the CR-004 conversion still happens on restore, but the manager's generic restore wrapper is what the user sees.

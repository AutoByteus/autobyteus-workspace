# Solution Revision Record — Gemini 3.8 TTS upgrade

## Revision Index
| ID | Phase | Trigger | Finding IDs | Prior status | Current status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | User request plus investigation, 2026-09-24 | N/A | N/A | Ready for Approval; design N/A | BEH-001–003, REQ-001–006, AC-001–008, SCN-001–004 | Proposed rollout and safe test baseline |
| SR-002 | Requirements | User clarification and 2.5 Flash removal, 2026-09-24 | DEC-001/002 open | Ready for Approval | Draft; design N/A | BEH-001/004, REQ-001–003/007, AC-001–003/009, SCN-001/005 | Partial decision; pending default/legacy transition |
| SR-003 | Requirements | User-selected 3.8 Flash default and old TTS retirement | DEC-001 resolved; DEC-002 open | Draft | Draft; design N/A | BEH-001/003, REQ-001–003, AC-001–003, SCN-001 | Model rollout clarified; saved-setting transition pending |
| SR-004 | Requirements | User approval and Gemini LLM check | DEC-002 resolved | Draft | Approved; design N/A | BEH-001/004, REQ-001–008, AC-001–010, SCN-001/005/006 | Approved baseline; design authorized |
| SR-005 | Architecture | Post-approval source/contract investigation | N/A | Approved requirements; design N/A | Approved requirements; design Ready | BEH-001–004, REQ-001–008, AC-001–010, SCN-001–006 | Completed Large/High design, current-only TTS adapter and startup setting migration |
| SR-006 | Architecture recovery | ARCH-REV-001 Fail plus user live-LLM validation emphasis | DR-001, DR-002 | Approved requirements; design Ready, review Fail | Approved requirements; design Ready for re-review | BEH-002/004, REQ-004/007, AC-005/006/009, SCN-003/005 | Corrected non-TTS production spines and multi-speaker nesting; scoped real Gemini LLM check specified |

## SR-001 — Proposed Gemini 3.8 TTS rollout
- Phase/classification: Requirements / Initial Baseline.
- Trigger: User requests latest Google TTS replacement, supplies announcement image, suggests owner-private `.env` to test-vault import for later integration testing.
- Prior authoritative requirements/design status: N/A / N/A.
- Current authoritative requirements/design status: Ready for Approval / N/A — design not started.
- Scenario basis: Existing Settings, speech tool/client, and explicit operator test workflow; no synthetic internal call promoted to product scope.
- Why recorded: New Google models differ in workload positioning; simple ID replacement misses style/speaker and WAV migration semantics.
- Canonical sections: First complete requirements baseline and investigation source log.
- Supplements/Product design: N/A — no requested Product Design outcome or behavior-defining supplement.
- Intended behavior changed from approved basis: N/A — no previous approval.
- Approval basis/reference: Pending explicit user decision on DEC-001/002 and approval of this baseline; no approved baseline exists.
- Design/review/task-size/risk impact: N/A before approved requirements and completed design.
- Handoff-rule outcome/result file: N/A — routine approval hold; no handoff.
- Remaining gaps: User approval; runtime entitlement and SDK compatibility to investigate during architecture/validation.
- Next action: Ask user to approve or revise the proposed rollout before design.

## SR-002 — User-directed 2.5 Flash removal and Google SDK upgrade
- Phase/classification: Requirements / Refinement (material intended-behavior change from unapproved SR-001 proposal).
- Trigger: User follow-ups on 2026-09-24: current 3.1 usage, request to replace current TTS and upgrade Google SDK, then explicit direction to remove 2.5 Flash as too old.
- Finding IDs: DEC-001 and DEC-002 remain open; no downstream review finding.
- Prior authoritative requirements/design status: Ready for Approval / N/A.
- Current authoritative requirements/design status: Draft / N/A — design not started.
- Affected IDs: BEH-001 and new BEH-004; REQ-001–003 and new REQ-007; AC-001–003 and new AC-009; SCN-001 and new SCN-005; UC-001 and new UC-005.
- Scenario basis changes: Existing 3.1 live TTS scenario and 2.5 fallback distinguished; shared SDK's existing LLM/image/video consumers establish a supported regression scenario. No new user-facing feature was invented.
- Why revised: User rejected preserving 2.5 Flash as a selectable/default model and requested a current stable Google SDK. Google SDK 2.24.0 is latest stable as of the investigation date; v2 introduces 3.8 speech metadata support.
- Canonical sections changed: Requirements status, problem, BEH table, scope, REQ/AC, scenarios, external decisions, traceability/readiness; investigation SDK/clarification evidence.
- Supplements/Product design: N/A.
- Intended behavior changed: Yes relative to the previous **unapproved proposal**, not to an approved baseline.
- Approval impact: No requirements have been approved. User's 2.5 Flash removal and SDK request are recorded as partial decisions, not approval of the full package. Exact approved baseline/reference remains N/A.
- Design/review basis/task-size/risk: N/A until approvals and completed design.
- Handoff-rule outcome/result file: N/A — routine requirements clarification hold.
- Remaining gaps: Default choice, other legacy IDs, saved explicit 2.5 Flash transition, and final explicit approval.
- Next action: Obtain the focused decisions, reconcile the requirements baseline, then request explicit approval before architecture.

## SR-003 — User-selected 3.8 Flash default and legacy TTS retirement
- Phase/classification: Requirements / Refinement.
- Trigger: User specified 3.8 Flash as default, differentiated Flash-Lite, and requested removal of old 3.1 preview and 2.5 TTS models. Source inspection corrected the location of saved speech-default settings.
- Finding IDs: DEC-001 resolved; DEC-002 remains open.
- Prior authoritative requirements/design status: Draft / N/A.
- Current authoritative requirements/design status: Draft / N/A — no design started.
- Affected IDs: BEH-001/003, REQ-001–003, AC-001–003, SCN-001, DEC-001/002; persisted-state facts.
- Scenario basis: Existing Settings/admin workflow. Exact source catalog contains 3.1 Flash preview, 2.5 Flash, 2.5 Pro — not 3.5 Flash preview. AppConfig source confirms saved setting is in server `.env`/process environment rather than application DB.
- Why revised: User selected 3.8 Flash default and retirement of all three old built-in Google TTS entries. Saved-setting transition has real continuity implications and remains a decision.
- Canonical sections changed: Requirements status/rollout, BEH-001/003, scope, REQ-002/003, AC-002/003, scenario, persisted data, decisions/readiness; investigation setting location and latest clarification.
- Supplements/Product design: N/A.
- Intended behavior changed: Yes relative to unapproved SR-002 proposal; no approved basis exists.
- Approval impact: User decisions recorded as partial approval of specific points, not approval of complete requirements baseline. Explicit approval still needed after DEC-002 is resolved.
- Design/review/task-size/risk: N/A before completed approved requirements/design.
- Handoff: N/A — routine requirements clarification hold.
- Remaining gap/next action: Decide transition for an explicit saved legacy TTS setting, reconcile final requirements, present complete baseline for explicit approval.

## SR-004 — Approved TTS replacement baseline and LLM assessment
- Phase/classification: Requirements / Refinement and explicit approval.
- Trigger: User's 2026-09-24 “yes ... requirement is clear. lets go” reply to the proposal including automatic saved-setting transition, with an added request to check Gemini LLM currency after the SDK upgrade.
- Finding IDs: DEC-002 resolved; no open behavior decision.
- Prior authoritative requirements/design status: Draft / N/A.
- Current authoritative requirements/design status: Approved / N/A until architecture is completed.
- Affected IDs: BEH-001/004; REQ-001–007 plus new REQ-008; AC-001–009 plus new AC-010; SCN-001/005 plus new SCN-006; UC-001/005 plus new UC-006.
- Scenario basis: Existing settings, speech generation, SDK-backed LLM/image/video calls, and explicit maintainer LLM assessment. All remain supported scenarios.
- Why recorded: The user approved the complete TTS rollout and legacy setting transition and requested a source-backed LLM check, not an automatic LLM catalog change.
- Canonical sections: Requirements approval basis, REQ-003/AC-003 transition, REQ-008/AC-010 assessment, SCN-006, traceability/readiness; investigation approval and LLM evidence.
- Supplements/Product: N/A.
- Intended behavior changed: Yes relative to unapproved SR-003 draft (legacy setting auto-transition), approved by the user. No previous approved baseline invalidated.
- Approval basis/reference: User 2026-09-24 reply quoted above; exact approved baseline is current `requirements-doc.md` at SR-004, no behavior-defining supplement.
- Design/review/task-size/risk: Architecture to be produced and classified after additional investigation.
- Handoff: Pending completed architecture, not yet applicable.
- Remaining gap: No behavior decision. Technical uncertainty remains around v2 SDK compatibility, exact 3.8 request structure and provider access; to be resolved in architecture/validation.
- Next action: Produce design from approved baseline and route completed package.

## SR-005 — Completed post-approval architecture design
- Phase/classification: Architecture / `Architecture Design Complete`.
- Trigger: Approved `SR-004` behavior baseline and additional architecture investigation of the Google 3.8 request/response protocol, shared SDK, both server startup paths, and persisted `.env` setting semantics. No reviewer/downstream finding yet.
- Prior/current status: Requirements Approved / design N/A → requirements remain Approved / design Ready. No intended-behavior change; no renewed user approval required.
- Affected IDs: BEH-001–004; REQ-001–008; AC-001–010; SCN-001–006. Exact scope unchanged. No behavior-defining supplement or Product Design package (`N/A — not applicable`).
- Canonical sections changed: [investigation-notes.md](investigation-notes.md#2026-09-24-post-approval-architecture-investigation-sr-005) records post-approval evidence; [design-spec.md](design-spec.md) establishes behavior-to-path spines, ownership, clean-cut removal, one-key persisted-setting migration, dependency/SDK sequencing, verification guidance and task classification. Approved [requirements-doc.md](requirements-doc.md) remains unchanged.
- Architectural decision: Two production startup paths share `AppConfig.initialize()`, so the retired-setting transform belongs inside that initialization, not an `app.ts`-only hook. Historical IDs remain in a migration-owned module; normal model resolution and audio payload are current-only. Inherited external retired overrides cause actionable startup failure rather than a false durability claim. The existing secret importer/test vault are reused, not replaced.
- Approval basis/impact: User approval reference in `SR-004` remains authoritative; architecture makes no new behavior choice. Google's official model and SDK evidence supports the assessment that no Gemini LLM catalog update is warranted, while compatibility checks remain in scope.
- Size/risk: `task_size=Large`, `architectural_risk=High` because shared SDK major upgrade, changed provider speech contract, private `.env` migration and cross-subsystem regression surface are structural, not merely catalog/content volume.
- Review/routing: Independent review artifacts `N/A — not applicable before review`. `get_handoff_rules` selects `/architecture_reviewer` for this Large/High `Architecture Design Complete` package; see [solution-handoff.md](solution-handoff.md). Direct implementation is not the matched route.
- Remaining uncertainty: Implementation-time SDK latest-stable verification, metadata wire serialization, live provider entitlement/response in selected runtime and safe explicit test-vault import. These are validation gates, not unapproved intended behavior.
- Next action: Route the completed approved solution according to configured handoff rules; do not implement within Solution Designer.

## SR-006 — Independent review design recovery and live Gemini LLM validation emphasis
- Phase/classification: Architecture recovery / `Design Impact` resolved in Solution Designer's revised design, pending independent re-review.
- Triggers: [ARCH-REV-001 Fail](design-review-report.md) with `DR-001` and `DR-002`; user 2026-09-24 instruction to upgrade the Google SDK in this worktree and test whether existing Google LLM requests still work through the safe pnpm key-import/test-vault path. The repository has `GeminiLLM`, not a Gemma adapter in the relevant code; this round interprets conversational “Gemma” as Gemini in context and does not invent a new Gemma feature.
- Prior/current status: Requirements Approved `SR-004`, design Ready `SR-005`, architecture review Fail → requirements still Approved, design Ready `SR-006` for re-review. No code, dependency or credential work was performed in this role.
- Affected IDs: BEH-002/004; REQ-004/007; AC-005/006/009; SCN-003/005. BEH-003/REQ-006/AC-008 safe-import contract remains unchanged. No changed intended behavior or behavior-defining supplement; no renewed user approval needed. The user instruction makes real existing Gemini LLM verification an explicit validation priority within the already approved SDK-regression obligation.
- Canonical updates: [investigation-notes.md](investigation-notes.md#2026-09-24-review-finding-and-user-validation-emphasis-sr-006) logs the review, npm stable-tag read-only probe and actual non-TTS production paths; [design-spec.md](design-spec.md) adds LLM/image/video request-to-result spines and the exact `voiceConfig.prebuiltVoiceConfig.voiceName` nesting, plus Google's at-most-two-speaker limit. [requirements-doc.md](requirements-doc.md) remains the approved `SR-004` authority.
- Review-finding resolution: `DR-001` addressed by `DS-005` LLM, `DS-006` image, `DS-007` video primary production spines and `DS-008` secondary SDK/test spine, owners and focused checks. `DR-002` addressed by explicit speaker-entry nested shape, per-part speaker metadata and at-most-two-prebuilt-speaker validation. No new adapter or compatibility fallback.
- Size/risk: unchanged `task_size=Large`, `architectural_risk=High`. Live provider entitlement, SDK v2 serialization and credential alias remain validation-stage uncertainty.
- Routing: Fresh `get_handoff_rules` selects exact `/architecture_reviewer` for revised Large/High `Architecture Design Complete`; [solution-handoff-sr006.md](solution-handoff-sr006.md) includes the prior review artifact and full package. Direct implementation before independent re-review is not authorized by the prior Fail.
- Next action: Independent re-review of this corrected approved-basis design, followed by the normal implementation/API-E2E route. Implementation should upgrade and lock SDK then perform deterministic and scoped real Gemini LLM validation through the explicit isolated-vault procedure.

## Informational Review Notifications (not solution revisions)
- 2026-09-24: Architecture Reviewer reported **Pass**, [ARCH-REV-002](architecture-review-revision-record.md), against approved `SR-004` and revised `SR-006`; [authoritative report](design-review-report.md) records `DR-001/002` resolved with no current finding. The reviewer confirmed its **primary** reviewed-package handoff to `/implementation_engineer` succeeded. This is informational only: no requirements/design reopening, new `SR-*` round, or duplicate Solution Designer implementation handoff.

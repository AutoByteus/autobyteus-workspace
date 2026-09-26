# Solution Revision Record

- Package identifier: agy-runtime-image-codex-prep-20260926
- Canonical requirements: /Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/requirements-doc.md
- Canonical investigation: /Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/investigation-notes.md
- Design: /Users/normy/autobyteus-org/autobyteus-task-worktrees/agy-runtime-capabilities-20260926/tickets/agy-runtime-image-codex-prep-20260926/design-spec.md

## SR-001 — Initial evidence-backed requirements baseline (2026-09-26)
- Trigger: User's standalone AGY CLI image-generation transcript and four screenshots of AutoByteus Solution Designer image denial and Codex preparation failure.
- Prior result/status: N/A — first round.
- Current result/status: Requirements Ready for Approval; design not started.
- Affected scenarios: SCN-001 to SCN-003; behaviors BEH-001 to BEH-003; REQ-001 to REQ-004; AC-001 to AC-005.
- Canonical sections changed: Initial requirements and investigation baseline.
- Approval basis/impact: No approval yet; present DEC-001/002 and full requirements baseline to user. Do not design or implement before explicit approval.
- Design/review/routing impact: N/A until approval; no handoff while routine approval decision pending.
- Remaining gaps: App image provider credential readiness; exact raw Codex exception (strongly inferred from log and source); separate agent-package authoring context.

## SR-002 — Native AGY tool clarification (2026-09-26)
- Trigger: User challenged replacement with app-owned image tool and explicitly asked why native AGY GenerateImage is absent while Codex/Claude native tools are available.
- Prior result/status: SR-001 Ready for Approval, unapproved.
- Current result/status: Draft; material scope decision DEC-001 open; no design or implementation started.
- Affected IDs: SCN-001, BEH-001/003, REQ-001/002, AC-001/002, DEC-001, ASM-001; Codex SCN-002/003, REQ-003/004 unchanged.
- Canonical sections changed: Problem, current/desired behavior, scope, requirements, acceptance criteria, scenario, dependencies, architecture input, readiness and investigation evidence.
- Approval basis/impact: No user approval exists. Follow-up clarifies intended outcome but does not decide whether native GenerateImage is for all AGY agents or selected authorized agents. Ask user before setting final baseline.
- Design/review/routing impact: Architecture remains N/A. Do not route to implementation.
- Remaining gaps: Native AGY frontmatter semantics and output payload in app capsule; exposure breadth; Codex missing skill and safe error mechanism remain.

## SR-003 — Default AGY-native tools plus configured MCP preference (2026-09-26)
- Trigger: User states that all default AGY internal tools should be available when AutoByteus uses AGY runtime, plus AutoByteus-configured MCP tools.
- Prior result/status: SR-002 Draft, unapproved.
- Current result/status: Draft; broad default-native intent is clear, but Team/Org exception DEC-001 remains materially unresolved.
- Affected IDs: BEH-001/003, SCN-001, REQ-001/002/005, AC-001/002/005, DEC-001, ASM-001; Codex REQ-003/004 unchanged.
- Canonical sections changed: Scope, requirements, AC, scenario, evidence ledger, risk and readiness.
- Approval basis/impact: This is directional intent, not approval of a finalized requirements baseline. Need answer on AGY-native orchestration/interactive tools inside AutoByteus Team/Org and explicit approval before architecture.
- Design/review/routing impact: Architecture still N/A; no implementation route.
- Evidence: Official AGY custom-agent docs and local AGY 1.2.11 isolated probes show explicit frontmatter tools restrict available model-declared tools; default/no-field variants expose native image generation. init.tools inventory alone is not the agent-facing permission set.
- Remaining gaps: Exact all-default tool semantics for custom main agent, native image output payload/app projection, MCP coexistence, Team/Org policy, Codex skill resolution.

## SR-004 — Claude-like native collaboration exclusion and validated native parity (2026-09-26)
- Trigger: User clarifies that AGY should manage its native tools like other provider runtimes, while AutoByteus adds configured MCP; user prefers disabling AGY-native subagents/messaging if AGY permits, as in Claude.
- Prior result/status: SR-003 Draft, unapproved.
- Current result/status: Requirements Ready for Approval; no authoritative design yet.
- Affected IDs: BEH-001, SCN-001/004, REQ-001/005/006, AC-001/005/006, DEC-001, ASM-001; Codex REQ-003/004 unchanged.
- Canonical sections changed: Problem, scope, native-tool contract, requirements/AC/scenarios, decision and evidence/readiness.
- Approval basis/impact: Direction is documented, but explicit approval of this exact SR-004 baseline is still required before architecture.
- Design/review/routing impact: N/A pending approval.
- Evidence: Local AGY 1.2.11 selective custom-agent probe exposed native generate_image but not invoke_subagent/send_message. Official CLI custom-agent docs provide an allowlist, not a documented subtractive denylist. Earlier approved AGY design selected only eight coding tools due provider compatibility controls, not because user required image exclusion.
- Remaining technical risks: Version-verified full native non-collaboration set, future CLI drift, native image output projection, MCP coexistence, Codex missing skill and safe error handling.

## SR-005 — Native image tool provenance made explicit (2026-09-26)
- Trigger: User corrects potential ambiguity: the requested tool is AGY's own native GenerateImage, not AutoByteus's MCP `generate_image`.
- Prior result/status: SR-004 Ready for Approval, unapproved.
- Current result/status: Requirements Ready for Approval; no design or implementation started.
- Affected IDs: BEH-001/003, SCN-001, REQ-001/002, AC-001. Intended outcome is unchanged; test provenance is sharpened.
- Canonical sections changed: Requirements problem statement, approval state, AC-001 verification intent and investigation evidence E-014.
- Approval basis/impact: No user approval exists. Present SR-005 explicitly and obtain approval before architecture.
- Design/review/routing impact: Architecture remains N/A; no implementation route.
- Remaining gaps: Native tool-call and output proof in an AutoByteus-launched AGY run; other SR-004 technical risks remain.

## SR-006 — User approval of SR-005 requirements baseline (2026-09-26)
- Trigger: User answered “Okay” to the explicit scope-approval question and restated that AGY's own tools should not be blocked, except native subagent and messaging tools when removable because AutoByteus provides its own collaboration MCP.
- Prior result/status: SR-005 Ready for Approval, unapproved.
- Current result/status: SR-005 requirements Approved; architecture investigation/design underway.
- Affected IDs: SCN-001 to SCN-004, BEH-001 to BEH-003, REQ-001 to REQ-006, AC-001 to AC-006. No intended-behavior change to SR-005.
- Canonical sections changed: Requirements approval/status and architecture input; investigation approval context.
- Approval basis/impact: User's 2026-09-26 reply to explicit SR-005 approval question is the approval reference. No separate behavior-defining supplement. Original Codex-error request remains in approved scope.
- Design/review/routing impact: Architecture design authorized; no implementation handoff until design complete and classified.
- Remaining gaps: Validate AGY version-appropriate native tool policy/MCP coexistence and native image output; determine exact Codex skill source and safe error mapping.

## SR-007 — Architecture design from approved native-tool baseline (2026-09-26)
- Trigger: SR-005 approval and user's direction to use existing AGY evidence/source rather than perform further exploratory experiments.
- Prior result/status: SR-006 requirements Approved; architecture in progress.
- Current result/status: Architecture Design Complete; requirements baseline SR-005 remains Approved.
- Affected IDs: BEH-001 to BEH-003, SCN-001 to SCN-004, REQ-001 to REQ-006, AC-001 to AC-006; no intended-behavior change.
- Canonical sections changed: Architecture evidence E-016–E-020 and corrected Codex skill-source facts in investigation; full `design-spec.md`.
- Approval basis/impact: Existing 2026-09-26 user approval of SR-005 applies unchanged. No renewed behavior approval required.
- Design/review/routing impact: `task_size=Medium`, `architectural_risk=High` due provider-native capability/security boundary, image output-path contract uncertainty and separate package repo. `get_handoff_rules` selected `/architecture_reviewer` for independent review. No implementation performed.
- Remaining technical risks: Exhaustive supported AGY native profile and actual native-image output shape must pass implementation validation; unknown/unsupported provider contract fails visibly, never falls back to eight tools or MCP image. Codex skill should be bundled portably from canonical sibling source, with safe missing-skill diagnostics.

## SR-008 — ARCH-REV-001/F-001 safe native-image failure design correction (2026-09-26)
- Trigger: Architecture reviewer `design-review-report.md` ARCH-REV-001 Fail — Design Impact F-001; raw AGY `tool_info.error` currently crosses canonical events into the web tool card, but SR-007 did not own a safe native-image failure presentation contract.
- Prior result/status: SR-007 Architecture Design Complete, review Fail; approved requirements baseline SR-005 unchanged.
- Current result/status: Revised Architecture Design Complete, pending independent re-review.
- Affected IDs: BEH-003, SCN-001, REQ-002, AC-002, QR-001; no intended-behavior change.
- Canonical sections changed: Investigation E-021/R-003; `design-spec.md` current-state, DS-003, ownership, boundary/interface, private diagnostics, file responsibility, example and validation sequence; `solution-result.md` review context.
- Approval basis/impact: Existing SR-005 user approval still applies. Correction implements the already-approved safe failure outcome; no renewed approval required.
- Design/review/routing impact: `task_size=Medium`, `architectural_risk=High` unchanged. Return revised package to `/architecture_reviewer` via matching handoff rule; no implementation handoff.
- Remaining technical risks: Native image output shape and exhaustive native profile remain implementation-validation gates; safe failure mapping/private diagnostic sink need tests for provider ERROR, explicit denial, malicious marker redaction and storage failure.

## SR-009 — Proposed nonblocking AGY missing-skill behavior (2026-09-26)
- Trigger: User follow-up E-022 explicitly says a skill that does not exist should cause a backend warning, not block AGY startup, and cites Codex/Claude parity. Static source/test comparison E-023 confirms those backends reconcile unresolved bindings with warning/skip, whereas AGY throws. No further exploratory AGY run was performed.
- Prior result/status: SR-008 revised Architecture Design Complete, independent re-review pending after ARCH-REV-001/F-001; SR-005 requirements approved for the prior blocking-skill behavior. The SR-008 re-review handoff had not been sent.
- Current result/status: SR-009 requirements Ready for Approval; `design-spec.md` Needs Revision; routine approval hold, no implementation-ready result.
- Affected IDs: BEH-002, SCN-002/003, REQ-003/004, AC-003/004, QR-001, DEC-002; native-image and native/MCP boundary IDs remain unchanged.
- Canonical sections changed: `requirements-doc.md` problem, behavior, stakeholders, scope, requirements, acceptance criteria, scenarios, UI, quality, dependency/decision, architecture input and readiness; `investigation-notes.md` evidence E-022/023 and implications; `design-spec.md` approval-hold notice/status; `solution-result.md` hold context.
- Approval basis/impact: The user's new instruction establishes the desired delta, but does not approve the fully reconciled SR-009 baseline. Ask for explicit approval of warn-and-continue for only genuinely missing configured skills, backend warning/no false loading, still bundling Codex's intended workflow skill for normal installs, and continued failure on unsafe provenance/collisions/unrelated errors.
- Design/review/routing impact: Suspend ARCH-REV-001 re-review and all implementation handoff. After approval, revise DS-004 and all affected technical decisions, reclassify and route via current handoff rules. ARCH-REV-001 report remains historical Fail; F-001 correction should carry into revised design.
- Remaining gaps: User approval of SR-009; exact AGY native-image output and complete native profile still need implementation validation, not more design-phase live AGY experiments.

## SR-010 — User approval of SR-009 nonblocking missing-skill requirements (2026-09-26)
- Trigger: User answered “yesss” to the explicit question spelling out that AGY starts/answers despite a genuinely absent configured skill, logs a backend warning, retains other available skills, never claims the missing skill loaded, keeps unsafe/unrelated failures distinct, and still packages the intended Codex skill portably.
- Prior result/status: SR-009 requirements Ready for Approval; design Needs Revision; independent re-review paused.
- Current result/status: SR-009 requirements Approved; architecture revision authorized.
- Affected IDs: BEH-002, SCN-002/003, REQ-003/004, AC-003/004, QR-001, DEC-002; native-image and native/MCP boundary unchanged.
- Canonical sections changed: `requirements-doc.md` status, approval reference, architecture input and readiness; `investigation-notes.md` approval evidence E-024 and relevant path evidence E-025.
- Approval basis/impact: Exact approval reference is user's 2026-09-26 “yesss” reply to the SR-009 approval question. No separate behavior-defining supplement. SR-005 is historical for the superseded blocking-skill outcome.
- Design/review/routing impact: Revise DS-004 and all affected architecture decisions before any re-review; no implementation handoff at this approval-only step.
- Remaining gaps: Reconcile approved absence semantics with AGY materializer's security/provenance boundary; retain ARCH-REV-001/F-001 safe native-image correction.

## SR-011 — Architecture revision for approved AGY missing-skill parity (2026-09-26)
- Trigger: SR-010 approval; E-023/025 static Codex/Claude and AGY path comparison. No additional live AGY experiment.
- Prior result/status: SR-010 requirements Approved; design Needs Revision; ARCH-REV-001/F-001 correction from SR-008 not yet re-reviewed.
- Current result/status: Revised Architecture Design Complete; independent re-review pending.
- Affected IDs: BEH-002, SCN-002/003, REQ-003/004, AC-003/004, QR-001; no change to approved image/tool-boundary IDs or SR-008 native-image safe-failure design.
- Canonical sections changed: `design-spec.md` approval basis, current state, behavior map, DS-004, skill/activation ownership and boundaries, interface and file mapping, examples, change sequence, validation and risks; `solution-result.md` completed package and route context.
- Approval basis/impact: SR-009 requirements explicitly approved in SR-010; no further behavior change introduced by design.
- Design/review/routing impact: `task_size=Medium`, `architectural_risk=High` remain supported by provider capability/security boundary, image output uncertainty and separate package repo. Apply current handoff rules to send revised complete design to independent architecture re-review; do not forward directly to implementation or claim review Pass.
- Remaining technical risks: Complete supported AGY native profile and actual native-image output need implementation validation; reviewer should scrutinize true-absence versus unsafe-source distinction, manifest/restore continuity, native-image public failure safety, and portable Codex skill source.

## SR-012 — ARCH-REV-002/F-002 cause-certified AGY skill absence (2026-09-26)
- Trigger: `design-review-report.md` ARCH-REV-002 Fail — Design Impact F-002, with supported local-package material premise MP-001. The existing shared resolver's `kind:"unresolved"` conflates absent configured skills with present but malformed/name-mismatched contextual candidates; `isSkillDirectory` can also hide a present directory lacking a valid manifest.
- Prior result/status: SR-011 Revised Architecture Design Complete; ARCH-REV-002 review Fail. ARCH-REV-001/F-001 was verified resolved; no implementation handoff occurred.
- Current result/status: Revised Architecture Design Complete; independent re-review pending. Approved SR-009/SR-010 requirements unchanged.
- Affected IDs: BEH-002, SCN-003, REQ-004, AC-004, QR-001; no change to approved native-image/tool-boundary IDs or SR-008 native-image public/private correction.
- Canonical sections changed: `investigation-notes.md` E-026/027, relevant path/risk and implications; `design-spec.md` current state, DS-004, resolution/materialization ownership, dependency/interface/data model, file map, examples, sequence/validation and risk; `solution-result.md` review context.
- Approval basis/impact: SR-009 explicitly approved in SR-010 already distinguishes true missing from unsafe/unrelated failures. This design correction enforces that boundary; no renewed user approval. User's symlink/live-skill-update suggestion is expressly deferred to a separate future ticket and is not incorporated here.
- Design/review/routing impact: `task_size=Medium`, `architectural_risk=High` unchanged. Send SR-012 to independent architecture re-review via current handoff rules; do not forward directly to implementation.
- Remaining technical risks: Native AGY profile/image output require implementation validation; detailed resolver needs absent vs present-invalid vs source-changed tests across contextual/global roots without changing Codex/Claude behavior.

## SR-013 — Proposed Codex-parity AGY skill validation with nonblocking invalid-content disposition (2026-09-26)
- Trigger: User follow-ups E-028/E-030/E-033 after ARCH-REV-003 Pass/implementation handoff: invalid skill content should not block otherwise healthy AGY startup; after learning Codex does semantically judge configured skills (E-032), user directs AGY to judge as well, superseding raw copy-through.
- Prior result/status: SR-012 Architecture Design Complete and ARCH-REV-003 Pass; reviewer primary handoff to `/implementation_engineer` succeeded. SR-009/SR-010 requirements approved warning/skip only for genuine absence and hard failure for invalid/unsafe/colliding sources.
- Current result/status: Requirements Ready for Approval for proposed Codex-parity validation and warn/skip-invalid policy; affected skill portion of `design-spec.md` Needs Revision; routine renewed-approval hold. Unchanged native-image/native-tool design remains reviewed. Implementation Engineer was notified through ordinary message to pause the affected skill policy; Code Reviewer returned CRR-001 Blocked — Requirement Gap without scoring old-policy code or API/E2E handoff; no production code edited by Solution Designer.
- Affected IDs: BEH-002, SCN-003, REQ-004, AC-004, QR-001, DEC-003. BEH-001/003 and native-image/tool IDs unchanged.
- Canonical sections changed: `requirements-doc.md` status and proposed BEH/REQ/AC/scenario/security outcome plus DEC-003; `investigation-notes.md` E-028–E-033 and risk; `design-spec.md` Needs Revision hold; `solution-result.md` approval hold context.
- Approval basis/impact: User conditionally selects Codex-parity AutoByteus skill judgment, now established by E-032. The complete proposal warns/omits absent or malformed/unreadable/name-mismatched content, retains blocking source-provenance/collision and unrelated failures, and safely reports possible AGY-origin rejection after validation. Do not treat SR-010 approval or ARCH-REV-003 Pass as approval of this reconciled baseline; obtain explicit approval before affected design/implementation.
- Design/review/routing impact: No new architecture handoff until approved requirements and revised design; independent review must recheck the changed skill policy. The reviewer’s prior implementation handoff must not be duplicated.
- Remaining gaps: Explicit approval of full SR-013 baseline; revised design for Codex-parity AGY validation, per-skill skip/cleanup and safety/provider-origin failure boundary; implementation code currently in progress on older basis. Live symlink updates remain separately deferred by user.

## SR-014 — Approval of Codex-parity AGY skill validation (2026-09-26)
- Trigger: User replied “approve” to the explicit question stating that AutoByteus validates AGY configured skills as for Codex, warns/skips missing or invalid content without blocking otherwise healthy startup, and retains separate unsafe-path/collision failures (E-034).
- Prior result/status: SR-013 requirements Ready for Approval; affected design Needs Revision; CRR-001 Blocked — Requirement Gap on old IR-001 skill policy.
- Current result/status: SR-013 requirements Approved; affected design still Needs Revision and no re-review or new implementation handoff has occurred.
- Affected IDs: BEH-002, SCN-003, REQ-004, AC-004, QR-001, DEC-003; native-image/tool IDs unchanged.
- Canonical sections changed: `requirements-doc.md` status, exact approval and readiness; `investigation-notes.md` E-034; `solution-revision-record.md` approval entry.
- Approval basis/impact: User's 2026-09-26 “approve” reply to the preceding explicit SR-013 scope question; no behavior-defining supplement. SR-009/SR-010 still governs unchanged missing-skill and native-tool behavior. SR-012 hard-failure invalid-candidate design and IR-001 skill implementation are superseded for this behavior.
- Design/review/routing impact: Revise the AGY skill portion of `design-spec.md`, reclassify completed design and repeat independent architecture review before dependent implementation/source review. Do not treat ARCH-REV-003 or CRR-001 as a pass on SR-013.
- Remaining gaps: Design must separate semantically invalid/missing (warn/omit) from unsafe provenance, collisions and source mutation (safe hard failure); preserve Codex/Claude behavior and review native-image/tool work only through its existing gates.

## SR-015 — Architecture revision for approved nonblocking invalid-skill policy (2026-09-26)
- Trigger: SR-014/E-034 explicit approval and E-035 inspection of the in-progress AGY detailed resolver/materializer boundary; CRR-001 confirms old IR-001 skill policy is not source-reviewable as the current target.
- Prior result/status: SR-013 requirements Approved in SR-014; skill design Needs Revision; ARCH-REV-003 Pass applies only to SR-012; CRR-001 Blocked — Requirement Gap.
- Current result/status: Revised Architecture Design Complete; independent architecture re-review pending. Approved SR-013 requirements unchanged; native-image/tool design from SR-008/SR-012 unchanged.
- Affected IDs: BEH-002, SCN-003, REQ-003/004, AC-003/004, QR-001, DEC-003; BEH-001/003 and native-image/tool IDs unchanged.
- Canonical sections changed: `investigation-notes.md` E-035/current-state and risk; `design-spec.md` approval/current-state, SR-015 recovery, skill DS-004, ownership/dependencies, interfaces, file map, examples, sequence, tradeoffs and risks; `solution-result.md` complete reviewed-package context.
- Approval basis/impact: User's 2026-09-26 “approve” reply E-034 to the explicit validate/warn-skip/safety scope question. No new behavior introduced by this design; no Product supplement.
- Design/review/routing impact: `task_size=Medium`, `architectural_risk=High` remain supported by AGY native capability/security boundary, image output uncertainty, source-provenance classification and separate package repo. Route complete SR-015 design for independent architecture re-review under current handoff rules. Do not forward directly to implementation or treat prior ARCH-REV-003/CRR-001 as Pass on this basis.
- Remaining technical risks: IR-001 code must narrow its resolver catch and change materializer invalid disposition; source-provenance, invalid-name warning sanitization, manifest/restore and Codex/Claude non-regression need tests. Native AGY image provenance/bytes/tool exposure and Codex first-turn remain executable validation gates. Live AGY skill symlinks remain future-ticket scope.

## SR-016 — API-REV-001/CRR-004 native-profile and image-output recovery; approval hold (2026-09-26)
- Trigger: API/E2E real AGY 1.2.11 check API-REV-001 Fail/75.0%, followed by Code Reviewer CRR-004 Fail — Design Impact (F-API-001/F-API-002). The 49-name custom-agent profile rejects 25 registry-only names on first turn; a genuine native image has no path in streamed DONE output. A diagnostic five-name profile is not a production fix.
- Prior result/status: SR-015 Architecture Design Complete and ARCH-REV-004 Pass, followed by IR-003/CRR-003 static source Pass; live API/E2E was an explicit unresolved gate. SR-013 requirements Approved.
- Current result/status: Native-tool/image design Needs Revision; package not implementation-ready. SR-013 skill behavior remains approved. A **proposed** REQ-006/AC-006 collaboration-exposure exception is Ready for Approval as DEC-004; until user approval, old “not exposed” rule remains authoritative. Routine approval hold, no new design/review/implementation handoff.
- Affected IDs: BEH-001/003, SCN-001/002/004, REQ-001/002/003/005/006, AC-001/002/003/005/006, QR-001, DEC-001/004, ASM-001. No changed skill BEH-002/REQ-004/AC-004 intended behavior.
- Canonical sections changed: `investigation-notes.md` E-036–E-040, U-001/U-003 and requirement implications; `requirements-doc.md` status, DEC-004 proposed delta and readiness; `design-spec.md` Needs Revision hold; `solution-result.md` current result.
- Approval basis/impact: SR-005 and SR-013 remain approved for unchanged native-image, MCP and skill outcomes. The provider hook option would prevent collaboration **execution** but may leave its names model-visible, unlike approved REQ-006/AC-006; therefore renewed explicit user approval is needed before that option governs design. Existing transcript `media[]` is a technical candidate within approved REQ-002, not a behavior change.
- Evidence: E-036/037 real API/E2E and CRR-004; E-038 static inspection of four existing provider transcripts with structured native image media; E-039 official CLI/SDK contracts; E-040 current stream/backend event timing. No additional AGY execution during recovery.
- Design/review/routing impact: No direct implementation correction, no architecture review request and no duplicate CRR-004 forwarding while DEC-004 is pending. After approval, revise profile/exclusion and native-image output spines, reclassify and re-review (current task was Medium/High); then Implementation Engineer, Code Reviewer and API/E2E repeat applicable gates. If user rejects visible-but-denied, investigate a different provider integration or report the actual limitation without weakening behavior.
- Remaining gaps: DEC-004 user decision; provider-supported default/custom-agent composition; deterministic transcript-media correlation/security/timing; live MCP/Team/Org, browser/redaction, skill-edge first turns and full native output validation.

## SR-017 — User-directed minimal native-tool scope and bounded provider probes (2026-09-26)
- Trigger: User asks why SR-015 expanded the previously working eight-tool baseline to 49 names, says many are not wanted, requests the exact file/names and directs only useful names. User then explicitly authorizes enough AGY probing before selecting names (E-041/E-044).
- Prior result/status: SR-016 Ready for Approval of a visible-but-denied collaboration hook exception and native-image/tool design Needs Revision. That exception was not approved; SR-013 skill behavior remained approved.
- Current result/status: Requirements Ready for Approval of **DEC-005**, an exact eight-name native custom-agent profile, with broad default-native breadth narrowed. SR-016 hook exception is withdrawn as current proposal, not adopted. Native image-output/profile design remains Needs Revision and no implementation-ready route exists.
- Affected IDs: BEH-001, SCN-001/002/004, REQ-001/003/005/006, AC-001/003/005/006, DEC-001/004/005, ASM-001. REQ-002/AC-002 native image access and safe failure, REQ-004/AC-004 skill policy, and separate MCP outcome remain unchanged.
- Canonical sections changed: `investigation-notes.md` E-041–E-047, U-003/004, supplement inventory and implications; `requirements-doc.md` DEC-005/approval proposal/readiness; `design-spec.md` pending-decision hold; `solution-result.md` current result. Disposable probe scripts and summaries are technical evidence only.
- Approval basis/impact: User direction “only include the names we want” is not explicit approval of our exact selection. Proposed eight: `view_file`, `write_to_file`, `replace_file_content`, `grep_search`, `list_dir`, `find_by_name`, `run_command`, `generate_image`. Prior `multi_replace_file_content` was not invoked in four attempts, including three forced under Low/High, and is omitted as unproven. Optional web tools were verified but not selected because they are outside the two reported cases. User must approve this narrower REQ-001/AC-005 behavior before architecture completes.
- Evidence: Real AGY CLI 1.2.11 isolated first turns pass with exact eight under Low/High models; each seven coding tool is actually invoked; real native image JPEGs and structured media appear; dummy capsule MCP and bundled Codex skill first turn pass with exact eight. Experiments are version/model/task-bounded, not proof of full app or future versions. F-API-002 Files projection remains unresolved.
- Design/review/routing impact: No source edit or reviewer/implementation handoff during approval hold. Once DEC-005 is approved, revise native policy and transcript-media design, classify, repeat independent review and downstream implementation/API-E2E. If not approved, refine the named list with user rather than restoring 49 or assuming hooks.
- Remaining gaps: Exact list approval, complete safe image projection design, model-visible native collaboration exclusion proof, production AGY MCP/Team/Org and browser/Files validation. Never claim 100% universal provider stability from bounded local probes.

## SR-018 — Approved exact-eight native profile and revised transcript-media architecture (2026-09-26)
- Trigger: User explicitly replied “approve” (E-048) to the exact eight-name DEC-005 question after receiving the 49-name file and bounded AGY 1.2.11 invocation evidence; Solution Designer then completed architecture investigation E-049/E-050 for native image result timing, correlation and existing Files content serving.
- Prior result/status: SR-017 requirements Ready for Approval, native-profile/image design Needs Revision; SR-016 hook option withdrawn. API-REV-001/CRR-004 remain the downstream Design Impact origin; ARCH-REV-004/IR-003/CRR-003 passed only superseded SR-015 assumptions.
- Current result/status: Requirements **Approved** for exact eight names; Architecture Design Complete, `task_size=Medium`, `architectural_risk=High`; independent architecture re-review required before implementation/source/API-E2E. No live app or delivery success claimed.
- Affected IDs: BEH-001/003, SCN-001/002/004, REQ-001/002/003/005/006, AC-001/002/003/005/006, QR-001, DEC-001/005, ASM-001; BEH-002/SCN-003/REQ-004/AC-004 skill outcome remains approved and unchanged from SR-013.
- Canonical sections changed: `requirements-doc.md` authority/status and exact eight current behavior/REQ/AC/scenarios/decision/readiness; `investigation-notes.md` E-048–E-050, current behavior/unknowns and implications; `design-spec.md` replaced obsolete SR-015 49-name/explicit-DONE image target with a complete exact-profile and strict result-bound transcript-media architecture; `solution-result.md` current cumulative handoff.
- Approval basis/impact: User’s direct E-048 reply approves exactly `view_file`, `write_to_file`, `replace_file_content`, `grep_search`, `list_dir`, `find_by_name`, `run_command`, `generate_image`, replacing the prior broad default-native exposure promise. It does **not** approve extra names, a collaboration denial hook, MCP image substitution, model-prose path scraping or any change to approved skill behavior. No new approval is needed for structured-media retrieval and run-owned copy because those are technical mechanisms for unchanged REQ-002/AC-001/002.
- Evidence: E-045–E-047 genuinely invoked all eight in disposable exact-profile AGY 1.2.11 runs and separately exercised MCP/Codex skill. E-049 two-turn exact-profile run observes stream image `step_index=4`, matching transcript `GENERIC.media[]` row 4 preceded by native planner call row 3, present at terminal result; actual 370,645-byte JPEG under that conversation brain. E-050 confirms existing canonical file-change and run content route. Provider transcript schema remains undocumented and must fail safely on drift.
- Design/review/routing impact: High-risk provider exposure/security/file-publication contract requires new independent architecture review under handoff rules. Do not treat old ARCH-REV-004 or CRR-003 as pass on SR-018, and do not send a duplicate direct implementation handoff. The reviewer should assess exact native grants, result-bound transcript correlation/containment/copy, safe public/private failure, turn ordering and retained skill boundary. On review pass, normal implementation/source/API-E2E route resumes.
- Remaining gates: Real AutoByteus first-turn image byte/path/Files/reopen, public redaction, Team/Org scoped MCP and native collaboration exclusion, Codex packaged-skill first reply plus skill edge cases, installed-version compatibility and future provider transcript drift. Live symlink skill updates remain separate future-ticket scope. No persistence migration is needed for old capsules/manifest/projections.

## SR-019 — ARCH-REV-005/F-003 turn-release design correction (2026-09-26)
- Trigger: Architecture Reviewer ARCH-REV-005 Fail — Design Impact F-003 on approved SR-018: result-bound image reconciliation and early next-turn eligibility conflicted on the supported two-turn chat path. Reviewer made no implementation handoff.
- Prior result/status: SR-018 Approved requirements and Architecture Design Complete; independent review Fail F-003. F-API-001/F-API-002 design remedies otherwise accepted in principle; old ARCH-REV-004/IR-003/CRR-003 are not current signoff.
- Current result/status: Requirements unchanged and Approved under SR-018/E-048; **revised Architecture Design Complete** SR-019, `task_size=Medium`, `architectural_risk=High`; independent re-review required. No source/API-E2E/delivery pass.
- Affected IDs: BEH-003, SCN-001, REQ-002, AC-001/002, QR-001; DS-002/003 turn lifecycle. REQ-001/AC-005 exact eight and REQ-004/AC-004 skill policy are unchanged.
- Canonical sections changed: `investigation-notes.md` E-051/current lifecycle evidence; `requirements-doc.md` current solution-round reference only; `design-spec.md` result/close/turn-release rule, ownership/interface, concrete two-turn example and follow-up concurrency tests; `solution-result.md` current cumulative handoff.
- Approval basis/impact: Existing E-048 exact-eight approval and prior native image/safe-failure approval remain sufficient. F-003 is internal sequencing, not new intended behavior; no renewed user approval or behavior-defining supplement.
- Design/review/routing impact: Keep `turnId` and input gate occupied through queued transcript reconciliation, artifact/file-change/terminal source-event publication; distinguish synchronous `providerResultSeen` from app-turn completion; reject/acknowledge a follow-up during `finalizing`, then accept retry only after terminal delivery and healthy process. Normal post-result process close must not spuriously fail the completed provider turn. Re-review the complete SR-019 package under the High-risk architecture rule, not direct implementation.
- Remaining gates: Live AGY image/Files/redaction, Team/Org MCP, native collaboration exclusion, Codex skill/edge behavior and provider transcript drift remain downstream. Add delayed-reconciliation/delayed-terminal-listener follow-up test plus pre/post-result close, interrupt and publication-failure cases.

## SR-020 — User-directed AGY-owned image scope proposal; approval hold (2026-09-26)
- Trigger: IR-004 reported that SR-019's backend-only admission/publication gates do not match the app `AgentRun` path (E-052/053). Before that design correction could be reviewed, the user directly questioned the image copy/Files scope and stated the only required outcome is that AGY's own `generate_image` can be called while AGY owns the image location (E-054).
- Prior result/status: SR-019 architecture Pass ARCH-REV-006; IR-004 partial source is **Design Impact**, not Code Review/API-E2E ready. Approved REQ-002/AC-001 still promised an AutoByteus-accessible image path.
- Current result/status: **Requirements Ready for Approval** of DEC-006; `design-spec.md` Needs Revision and its SR-020 shared-boundary draft is non-authoritative. No replacement implementation-ready package or new architecture review is claimed.
- Affected IDs: BEH-003, SCN-001, REQ-002, AC-001/002 and UI/output expectations; BEH-001/REQ-001/005/006 exact-eight, MCP and collaboration policy plus BEH-002/REQ-003/004 skill policy remain approved and unchanged.
- Canonical sections changed: `requirements-doc.md` DEC-006 proposed delta/approval hold; `investigation-notes.md` E-052–E-054 and status; `design-spec.md` Needs Revision hold; `solution-result.md` approval-hold context. No specialist-owned report/source was changed by Solution Designer in this round.
- Approval basis/impact: E-054 is direct user direction to stop AutoByteus-owned image storage, but a precise confirmation is required to replace the previous approved path/Files promise and clarify that “display” means native tool status/ordinary reply, not an AutoByteus image preview. Until then the old requirement is historical authority but dependent image implementation is paused. No behavior-defining supplement or Product artifact.
- Design/review/routing impact: Do not complete the IR-004 shared-admission/publication design or route it while the image finalization premise is disputed. If DEC-006 is approved, remove transcript-media reconciliation/copy/Files/finalization from the target, retain ordinary AGY tool lifecycle and safe error mapping, reclassify and repeat independent review before implementation. The exact-eight native policy and Codex skill still require their downstream gates.
- Remaining gaps: Explicit DEC-006 approval; revised narrow design and applicable review; fresh source/API-E2E validation proving a real AGY-native call without treating app MCP as parity.

## SR-021 — Approval of AGY-native invocation-only image outcome (2026-09-26)
- Trigger: User explicitly confirmed the analogy to Codex image generation: AutoByteus need not know where AGY stored the image; it must make AGY's own tool available/callable, then show the normal tool conversation, and “remove the overscoped design” (E-055).
- Prior result/status: SR-020 DEC-006 Ready for Approval; SR-019 architecture/IR-004 source target held.
- Current result/status: DEC-006 **Approved**; affected design Needs Revision; no implementation-ready or validation claim yet.
- Affected IDs: BEH-003, SCN-001, REQ-002, AC-001/002, QR-001 and UI/output boundary. Exact-eight BEH-001/REQ-001/005/006 and Codex skill BEH-002/REQ-003/004 stay approved unchanged.
- Canonical sections changed: `requirements-doc.md` current outcome, REQ-002/AC-001/002/SCN-001/UI/decision/readiness; `investigation-notes.md` E-055; `solution-revision-record.md` this approval. No behavior-defining supplement or Product artifact.
- Approval basis/impact: E-055 expressly supersedes the AutoByteus-accessible image/path/Files/preview promise. Keep genuine native invocation, accurate tool lifecycle, safe failure and ordinary AGY reply; AGY owns storage. No need to ask again about image-copy removal.
- Design/review/routing impact: Replace SR-019 transcript/copy/finalizing design; treat IR-004 shared-boundary concerns as moot for the reduced target, not as a reason to refactor generic `AgentRun`. Re-review a complete revised design before implementation resumes.
- Remaining gates: Narrow design and independent review, cleanup of partial source and fresh Code Review/API-E2E proving native provenance, exact grants/MCP and Codex skill startup.

## SR-022 — Narrow AGY-native lifecycle architecture after DEC-006 (2026-09-26)
- Trigger: SR-021/E-055 approval and static comparison of current partial converter/backend with `origin/personal` plus existing file-change projection (E-037/045/050/052/053).
- Prior result/status: Approved changed requirements; SR-019 design and IR-004 partial image-copy/finalizing source no longer match intended behavior.
- Current result/status: **Architecture Design Complete**, `task_size=Medium`, `architectural_risk=High`; independent re-review required. No source/API-E2E/delivery pass.
- Affected IDs: BEH-003, SCN-001, REQ-002, AC-001/002, QR-001, DS-002/003; BEH-001 exact-eight and BEH-002 skill spines are retained.
- Canonical sections changed: `design-spec.md` fully replaces obsolete transcript/copy/Files/finalization architecture with native ACTIVE/DONE/error/denial canonical lifecycle and ordinary AGY result/queue behavior; `requirements-doc.md` current solution round/readiness; `investigation-notes.md` current status; `solution-result.md` revised complete handoff.
- Approval basis/impact: User E-055 explicitly authorizes narrowed native-call-only behavior; E-048 and E-034 continue to govern exact names and skills. This design adds no intended behavior beyond those approvals; Product supplement N/A.
- Design/review/routing impact: Remove image transcript reader/copy writer and false path-required failure; do not add the tentative SR-020 AGY busy-input/shared-publication contracts. Exact eight native policy, separate MCP, safe native failure and Codex skill design remain. Medium/High remains because provider grants, security/redaction and skill provenance still cross material contracts. Route to independent architecture re-review under current handoff rules; prior ARCH-REV-006 is not review of this basis.
- Remaining gates: Implementation must remove obsolete partial source, then independent source/API-E2E checks must prove real native call/normal tool card/assistant reply, safe redaction, Team/Org MCP/exclusion and Codex first turn/skill edges. No app image bytes/path/Files acceptance gate.

## SR-023 — ARCH-REV-007/F-004 terminal-result public/private correction (2026-09-26)
- Trigger: Architecture Reviewer ARCH-REV-007 Fail — Design Impact F-004 on SR-022; a real AGY terminal result ERROR can occur without a native image tool ERROR, and the current converter emits raw `result.error` and failed-result `response` publicly (E-056). No implementation handoff occurred.
- Prior result/status: SR-021/DEC-006 requirements Approved and SR-022 architecture review Fail; IR-004 partial source remains unreviewed. Prior F-001/F-002 resolved; F-003 obsolete under E-055.
- Current result/status: Requirements **unchanged and Approved**; corrected **Architecture Design Complete** SR-023, `task_size=Medium`, `architectural_risk=High`; independent re-review required. No source/API-E2E/delivery pass.
- Affected IDs: BEH-003/002, SCN-001/003, REQ-002/004, AC-002/004, QR-001; AGY return/event spine. Exact-eight native grants, scoped MCP, skill disposition and removal of image artifact/finalization remain unchanged.
- Canonical sections changed: `investigation-notes.md` E-056/current status; `design-spec.md` terminal result-failure rule, AGY converter/diagnostic ownership, sequence and direct error-without-tool-step tests; `requirements-doc.md` current solution-round reference only; `solution-result.md` cumulative revised handoff.
- Approval basis/impact: Existing approved safe public failure/security requirements already demand this correction; no new intended behavior, supplement or Product decision, so no renewed user approval.
- Design/review/routing impact: Only exact SUCCESS permits ordinary fallback response. Any non-success/missing/invalid status or explicit terminal error emits a fixed-safe terminal turn ERROR with explicit scope/effect; no raw error/failed response/status/usage in public events and no misleading completed/idle success; bounded raw evidence stays restricted. Re-review complete Medium/High package, not direct implementation. No transcript/copy/Files or shared queue/publisher expansion.
- Remaining gates: Reviewer verifies F-004 closure; implementation cleans partial source and adjusts AGY converter/diagnostic sink; fresh source/API-E2E checks prove terminal ERROR redaction (including no tool step), native invocation, MCP/Team/Org, Codex and skill edges.

## SR-024 — User-approved server-only de-scope of separate package work (2026-09-26)
- Trigger: After user verification and server repository integration, the user explicitly said the other project was outside this ticket, directed removal of package PR #14, and asked Delivery to finalize the current project without a release (E-057; DR-007/008). The user also directly challenged the earlier cross-repository design as over-scoped. No new code or provider experiment was requested.
- Prior result/status: SR-021 requirements/SR-023 design approved and ARCH-REV-008 Pass; IR-005/CRR-005/CRR-007 and API-REV-004 passed on their reported configurations; server merged; separate package PR was unmerged and its review hold prevented Terminal. The old REQ-003/AC-003 and design promised a portable bundled Codex workflow skill.
- Current result/status: **Approved scope correction.** The ticket is server-only: exact-eight native AGY tool profile, AGY-native image invocation/status/safe failures, configured MCP/native-collaboration boundary, and missing/semantic-invalid configured-skill warn/omit/start with safety exclusions. `REQ-003/AC-003` no longer promises the workflow skill is bundled/present; the external package copy/README/link repair and PR finalization target are withdrawn. No new server behavior/interface/source change is needed. `task_size=Medium`, `architectural_risk=High` describe the already-reviewed server implementation; this deletion adds no architectural risk. Delivery may finalize the server-only ticket after truthful report/evidence and safe cleanup disposition, without reopening package PR or releasing a version.
- Affected IDs: BEH-002, SCN-002, REQ-003, AC-003, DEC-002/007, package dependency and design Codex skill spine/validation gate. REQ-001/002/004/005/006 and AC-001/002/004/005/006 remain unchanged. E-058 distinguishes missing-skill AGY first-turn evidence from package-selected workflow-content evidence.
- Canonical sections changed: `requirements-doc.md` approval/scope/REQ-003/AC-003/dependency/decision; `investigation-notes.md` E-057/058 and current evidence state; `design-spec.md` Codex skill spine/file responsibility/validation and classification; `solution-result.md` current delivery-scope handoff. Earlier revision entries and specialist reports remain historical, not silently rewritten.
- Approval basis/impact: Direct explicit user instruction excludes the separate repository and orders current-project finalization; do not ask again. The earlier SR-010 “yesss” applied to a broader question but did not name cross-repo editing; SR-024 supersedes only its portable-skill portion. The user's original Codex startup ask remains through server warn/omit/start. Product/behavior-defining supplement N/A.
- Design/review/routing impact: Remove only the **unmerged** package payload target; no server architecture or reviewed source change. ARCH-REV-008, CRR-005/007 and API-REV-004 retain their actual server assertions; API-REV-002/004 bundled-content assertions are historical tests of selected local `a140474`, not current acceptance. API-REV-002's real missing/invalid-skill success supports reduced AC-003/004, without claiming an ambient-main browser retest. This retrospective scope deletion is not a new implementation-ready architecture handoff. Send corrected authority to Delivery for server-only finalization at the user's explicit request.
- Remaining risks: Provider/version drift and no ambient old-package UI first-turn test are accurately disclosed. Do not claim bundled workflow content, modify `autobyteus-agents/main`, reopen PR #14, or issue a version/release/deployment. Delivery must update final report/receipt and decide safe retention/cleanup of the user-tested App and historical local package worktree.

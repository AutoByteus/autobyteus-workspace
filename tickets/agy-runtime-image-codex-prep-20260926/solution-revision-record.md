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

## SR-013 — Proposed nonblocking handling for all configured-skill problems (2026-09-26)
- Trigger: User follow-up E-028 after ARCH-REV-003 Pass/implementation handoff: an invalid `SKILL.md` should warn and not block AGY startup; user asks whether AutoByteus simply copies the folder and how validation is handled.
- Prior result/status: SR-012 Architecture Design Complete and ARCH-REV-003 Pass; reviewer primary handoff to `/implementation_engineer` succeeded. SR-009/SR-010 requirements approved warning/skip only for genuine absence and hard failure for invalid/unsafe/colliding sources.
- Current result/status: Requirements Draft; affected skill portion of `design-spec.md` Needs Revision; routine clarification/renewed-approval hold. Unchanged native-image/native-tool design remains reviewed. Implementation Engineer was notified through ordinary message to pause the affected skill policy; no production code edited by Solution Designer.
- Affected IDs: BEH-002, SCN-003, REQ-004, AC-004, QR-001, DEC-003. BEH-001/003 and native-image/tool IDs unchanged.
- Canonical sections changed: `requirements-doc.md` status and proposed BEH/REQ/AC/scenario/security outcome plus DEC-003; `investigation-notes.md` E-028/E-029 and risk; `design-spec.md` Needs Revision hold; `solution-result.md` approval hold context.
- Approval basis/impact: User clearly rejects invalid-skill hard-failure outcome, but exact copy-through versus warn-and-omit treatment remains open. Do not treat SR-010 approval or ARCH-REV-003 Pass as approval of the broader policy. Ask user for the disposition of invalid/unusable skill content, then present and obtain explicit approval of the reconciled baseline.
- Design/review/routing impact: No new architecture handoff until approved requirements and revised design; independent review must recheck the changed skill policy. The reviewer’s prior implementation handoff must not be duplicated.
- Remaining gaps: DEC-003; operational distinction between per-skill skip/cleanup and unrelated base AGY infrastructure failure; implementation code currently in progress on older basis. Live symlink updates remain separately deferred by user.

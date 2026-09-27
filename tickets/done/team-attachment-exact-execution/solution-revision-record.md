# SR-001 — diagnostic findings, 2026-09-26
Prior: N/A. SC-001 / REQ-001 / AC-001 diagnostic baseline complete. Confirmed ownership ambiguity with deployed code and stored tree. Approval: diagnostic request only; behavior-changing remediation pending user direction. Design/review/implementation artifacts: N/A — not applicable to read-only diagnosis. No implementation-ready handoff.

# SR-002 — ID-based ownership analysis
Evidence-only follow-up requested by user. Prior SR-001; SC-001/REQ-001/AC-001 unchanged. Identified exact ID loss at final-owner builder and address-based read locators. Recommend canonical agentRunId for final execution identity with team validation; draft identity is a separate lifecycle. Behavior-change approval remains pending; no authoritative design or implementation handoff.

# SR-003 — approved requirements R1 and completed architecture D1
Trigger: user “Yeah, approve.” responding to five-point focused refactor scope after SR-002 analysis. Prior requirements Draft diagnostic scope; current Approved R1. Prior design N/A; current Ready D1. Canonical package relocated into isolated worktree for git authoring; historical diagnostic directory remains read-only reference. REQ-001/AC-001 retained; added BEH-001..004, SC-002..004, REQ-002..006, AC-002..007 to formalize approved scope. SC-001 retained.
Approval basis: carry selected agentRunId through finalization/URLs/reads; validate team; separate drafts; preserve attachments/history; duplicate-address regression tests. No additional behavior-defining supplements. No UI redesign or deployment authorization inferred.
Design: exact-ID final DTO/URLs, existing resolver scope checks, typed stored-reference startup conversion with physical proof, unchanged physical files/drafts, current-only runtime. E3-B production inventory confirms 192 structured old references across 88 trace files and proves migration need, not schema-only inference. Classification task_size Medium / architectural_risk High due to contract/persistence/cutover. Evidence/design are new; no previous independent reviews. Review paths N/A — not applicable yet.
Expected result: Architecture Design Complete; independent review required by matching configured rule after lookup. No implementation or executable validation claimed. Remaining risk: installation-specific transition ambiguities must fail with evidence; implementation must return material design/requirement gaps.
Routing decision: get_handoff_rules selected /architecture_reviewer for Architecture Design Complete / High architectural risk; see solution-handoff.md. No direct implementation or duplicate recipient.

# SR-004 — released startup incident recovery, R2/D2
Date 2026-09-27. Trigger API-REV-002 FAIL and explicit user clarified startup policy in API chat, plus direct request to rename canonical guideline and route via original thread ID. Prior: R1 approved/D1 Ready, ARCH-REV-001 pass, released DR-004 terminal. Current: R2 Approved/D2 Ready for fresh independent review; incident open, fixed-build validation absent. Prior passes remain historical, do not authorize recovery release.
Classification: mixed requirement clarification + Design Impact. REQ-007..010 / AC-008..011 / BEH-005..007 / SC-005..007 added; R1 exact-ID behavior preserved. User says incomplete historic data must not block application, must remain preserved but not shown/loaded as usable; current independently valid data may succeed with explicit warning dispositions. No majority-success semantics. D1 global clean-success gate invalidated/replaced, no runtime old selector fallback.
Authored canonical guideline rename/examples and minimal mandatory authoritative skill reference in isolated companion repo. Requirements/design/current investigation updated; historical R1/D1 copied read-only in recovery-evidence. Cumulative ticket moved from done to in-progress ONLY inside isolated recovery worktree; main uncommitted API evidence preserved and copied byte-identically. Same package identity.
Size Medium / Risk High: changed run admission, persisted-reference conversion scope, released retry; review required. User question clarified: repair existing migration ID; FAILED retries corrected code on new version, terminal successes not forced to rerun; current admission revalidates regardless. No release number/tag chosen or installed data modified.
Routing: AgentTeam tools unavailable after search; user expressly authorizes existing-chat thread ID dispatch. Original architecture review thread 01a0ded0-a092-7ec1-bdfe-00b3b40645df selected by retained Medium/High review contract. New handoff solution-handoff.md, pending confirmed dispatch. Next: architecture review then implementation/source review/actual installed-copy API validation/Delivery; not resolved until corrected startup proof.


# SR-005 — user availability clarification, R2/D2 unchanged architecture
Trigger: implementation-thread direct user statements and engineer policy query.
Original messages verified; references in requirements-doc.md. R2/D2 remain
current, ARCH-REV-002 Pass structural basis retained. Explicitly clarify warning
success for preserved incomplete history, including all-excluded corpus; no
minimum valid-old-run count. Extend AC-008/009 coverage interpretation accordingly.
Separate genuine failed writes/audit from startup admission. Narrow canonical
core exception wording to proven application/new-work prerequisites, not old
history. No unrelated schema/vault behavior change or reset/fallback authorized.
Classification evidence/intent clarification, no architecture delta; Medium/High
retained. Guideline, requirements clarification, design addendum and investigation
updated. No runtime work or validation pass claimed. Return clarification to
existing implementation chat under user-authorized recovery coordination, not a
duplicate architecture handoff; downstream review covers the updated package.

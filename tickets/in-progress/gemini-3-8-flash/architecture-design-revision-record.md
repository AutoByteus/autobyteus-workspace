# Architecture Design Revision Record

The approved `requirements-doc.md`, latest `design-spec.md`, and requirements investigation remain authoritative. This record is a concise navigation and rationale index; it does not revise approved behavior.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| AD-REV-001 | Requirements Engineer handoff for RER-002 / initial architecture round | N/A | `Initial Architecture Baseline` | Architecture Design Complete; `Medium` / `High`; Architecture Review selected. |

## Revision Entries

### AD-REV-001 — Exact Gemini 3.8 replacement with adapter-scoped request policy

- Triggering role, report path, and round: Requirements Engineer; approved package `PKG-GEMINI-3-8-FLASH-2026-09-03`; initial architecture-design round based on `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/requirements-doc.md` at RER-002.
- Triggering finding IDs: N/A — initial architecture baseline.
- Prior authoritative design result: `N/A`.
- Current authoritative design result: `Architecture Design Complete`; exact 3.8 catalog/runtime replacement, a model-value-scoped 3.8 generation-config branch inside `GeminiLLM`, reuse of the existing fixed pricing schedule/current-selection/history boundaries, and no data migration.
- Why this baseline or revision is recorded: The visible model replacement is bounded, but Google's 3.8 request contract is structurally different from the shared adapter's current budget/sampling behavior. The design isolates that difference without regressing current Gemini 3.1 behavior or widening generic model/server/UI contracts.
- Approved behavior or requirement IDs affected: BEH-001–BEH-005; REQ-001–REQ-013; AC-001–AC-011; SCN-001–SCN-006.
- Design-spec sections updated: Initial creation of all sections, including architecture evidence, behavior/path map, task health, no-migration decision, scenario validity, spines/ownership, exact config invariants, pricing shape, removals, file mapping, sequence, risks, and implementation guidance.
- Architecture supplements updated, added, or removed: Added `/home/autobyteus/workspace/.codex/worktrees/gemini-3-8-flash/tickets/in-progress/gemini-3-8-flash/design-spec.md` and this revision record. No separate diagram/data/contract supplement is needed. UI/UX artifacts remain `N/A — not applicable`.
- Downstream and architecture-review impact: Final classification is `task_size=Medium`, `architectural_risk=High`; independent Architecture Review is selected before implementation because the external provider request contract changes inside a shared adapter. Review must verify exact 3.8 field ownership/omissions, 3.1 isolation, two-period pricing, clean 3.7 removal, and no-migration/historical boundaries.
- Next recipient or routing: Apply the Architecture Designer's dynamic handoff rule for `Architecture Design Complete` with `Medium` / `High`; expected next action is independent architecture review, subject to the returned rule.
- Remaining gaps or risks: No requirement gap. Open downstream risks are dependency setup, generated SDK typing versus the approved lower-case value, live 3.8 entitlement/quota/region access, and complete classification of remaining active 3.7 references. These have explicit implementation/validation mitigations in the design.

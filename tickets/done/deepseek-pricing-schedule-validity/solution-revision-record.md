# Solution Revision Record

The latest requirements, investigation notes, and design spec remain authoritative. This record is the concise index of completed solution rounds and their rationale.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | User request plus AutoByteus/autobyteus-workspace issue #2; initial solution round | N/A | `Initial Baseline` | Ready for architecture review |

## Revision Entries

### SR-001 — Effective-dated DeepSeek pricing history baseline

- Triggering role, report path, and round: User-authorized fix of `https://github.com/AutoByteus/autobyteus-workspace/issues/2`; initial solution round.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: A `Design-ready`, user-approved requirements basis; completed evidence-backed investigation; and an actionable design for effective-dated fixed/time-window history, separate window/day timezones, and selected-policy provenance.
- Why this baseline or revision entry is recorded: Establish the first reviewable solution package before implementation.
- Resolution: Preserve the current catalog -> factory -> server pricing provider -> calculator ownership chain. Replace the singular schedule shape with a three-version DeepSeek history, select the latest eligible version from `observed_at`, evaluate explicit ISO weekdays in `Asia/Shanghai` independently from UTC price windows, and keep existing stored outcomes immutable.
- Approved behavior or requirement IDs affected: BEH-001–BEH-005; REQ-001–REQ-012; AC-001–AC-012.
- Canonical artifacts and sections updated:
  - `requirements.md`: approved behavior, scope guardrail, requirements, acceptance criteria, approval state.
  - `investigation-notes.md`: bootstrap context, exact sources, current production paths, reproduction/probe evidence, storage consequences.
  - `design-spec.md`: target history model, selector invariants, ownership/file mapping, clean-cut removals, no-migration decision, test and documentation guidance.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review must decide whether the bounded shared-shape refactor and selector design are implementation-ready. Implementation must not begin from the obsolete singular schedule contract.
- Next recipient or routing: `/architecture_reviewer`.
- Remaining gaps or risks: Remote vendor-price freshness is still release-bound and requires a separate product/security design; existing bug-affected stored aggregates are not repaired; dated historical vendor facts rely on retained repository history, indexed official material, and the issue's CC0 evidence because the live vendor page publishes only the current rule.

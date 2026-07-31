# Solution Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| SR-001 | `solution_designer` initial solution package, 2026-07-31 | N/A | `Initial Baseline` | Design-ready requirements and implementation-ready in-place catalog refresh design. |
| SR-002 | `solution_designer` user follow-up rework, 2026-07-31 | N/A | `Requirement Expansion` | Combined OpenAI GPT-5.6 refresh and Claude Opus 5 support package, superseding the OpenAI-only baseline. |
| SR-003 | `solution_designer` Claude price audit, 2026-07-31 | N/A | `Requirement Clarification` | Audited every active/planned Claude price against Anthropic's current table; identified Sonnet 5's temporary introductory-rate policy choice and paused implementation lock. |
| SR-004 | `solution_designer` user decision after `ARCH-REV-002`, 2026-07-31 | `REQ-GAP-001` | `Requirement Resolution` | User selected final durable Claude pricing; the combined package is design-ready for architecture re-review. |

## Revision Entries

### SR-001 — July 30 GPT-5.6 pricing refresh baseline

- Triggering role, report path, and round: `solution_designer`; initial investigation and design baseline; no prior report.
- Triggering finding IDs: N/A.
- Prior authoritative result: `N/A`.
- Current authoritative result: Design-ready solution package for updating GPT-5.6 Terra/Luna prices in `autobyteus-ts`.
- Why this baseline or revision entry is recorded: Establish the first complete requirements, investigation, and design result before architecture review.
- Resolution: Verified OpenAI's July 30, 2026 API prices and mapped them to the existing centralized GPT-5.6 pricing helper, focused unit contract, and provider catalog documentation. Keep Sol unchanged; no server, persistence, runtime, frontend, Fast-mode, or migration work.
- Approved behavior or requirement IDs affected: BEH-001–BEH-003; REQ-001–REQ-004; AC-001–AC-007.
- Canonical artifacts and sections updated: `requirements.md` (Design-ready requirements and approval status); `investigation-notes.md` (bootstrap, source log, current behavior, design-health and persistence evidence); `design-spec.md` (spines, ownership, boundaries, file mapping, change sequence).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: Architecture review should validate the small in-place scope, effective date `2026-07-30`, derived cache/tier values, and explicit exclusion of Fast mode/historical repricing.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: OpenAI may change pricing again; no live provider call is claimed or required. Historical ticket artifacts retain launch prices as historical evidence and must not be treated as active sources.

### SR-002 — Add Claude Opus 5 support to the pricing-refresh package

- Triggering role, report path, and round: `solution_designer`; user follow-up on 2026-07-31; upstream requirement/design rework round after SR-001 handoff.
- Triggering finding IDs: N/A; the follow-up itself expanded the approved request.
- Prior authoritative result: SR-001 covered only the OpenAI GPT-5.6 pricing refresh.
- Current authoritative result: Combined design-ready package covering OpenAI GPT-5.6 Terra/Luna price refresh plus exact Claude Opus 5 catalog, metadata, pricing, adaptive request-policy, tests, and active documentation support.
- Why this revision entry is recorded: The user explicitly asked whether Claude Opus 5 was already supported and requested it be added. Investigation confirmed no active source/test/docs support and no existing runtime adaptive-policy recognition.
- Resolution: Add exact `claude-opus-5` identity/API value with standard `$5/$25` pricing, `$0.50` cache read, `$6.25` 5-minute cache write, `$10` 1-hour cache write, effective `2026-07-24`, 1M/128k metadata, and reuse the existing adaptive schema/policy with one `AnthropicLLM` family-list extension. Preserve existing OpenAI/server/persistence boundaries and exclude Fast mode, Batch, fallback, cloud variants, and effort-contract changes.
- Approved behavior or requirement IDs affected: BEH-001–BEH-005; REQ-001–REQ-007; AC-001–AC-012.
- Canonical artifacts and sections updated: `requirements.md` (combined scope, Claude requirements and acceptance criteria); `investigation-notes.md` (Opus 5 absence evidence, first-party Anthropic source log, current paths and file map); `design-spec.md` (Claude catalog/request spine, ownership, boundary, file mappings, sequence, and deferrals).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: The initial OpenAI-only package is superseded. Architecture review must review both providers, verify exact Opus 5 identity/pricing/metadata/adaptive policy, and confirm no server, persistence, migration, alias, or Fast-mode work is required.
- Next recipient or routing: `architecture_reviewer`.
- Remaining gaps or risks: No known requirement gap; provider entitlement/live access is not claimed, and provider prices may change again. Active module-design documentation must be kept aligned during implementation.

### SR-003 — Recheck current Claude pricing and isolate Sonnet 5 promotion policy

- Triggering role, report path, and round: `solution_designer`; user request to recheck Claude prices on 2026-07-31; pricing-audit round after SR-002.
- Triggering finding IDs: N/A; fresh first-party pricing audit.
- Prior authoritative result: SR-002 treated the standard Claude price table as the catalog basis and excluded temporary discounts.
- Current authoritative result: Fable 5, Opus 4.8, Opus 4.7, and Sonnet 4.6 match Anthropic's current standard prices; planned Opus 5 values match. Sonnet 5's standard row matches the post-promotion standard, but Anthropic currently advertises `$2/$10` introductory pricing plus proportional cache rates through 2026-08-31.
- Why this revision entry is recorded: The user correctly flagged that Anthropic prices can change. A fresh audit found one time-bounded promotional policy difference that cannot be represented safely by the current single-date `TokenPricingConfig`.
- Resolution: Preserve standard Sonnet 5 values as the recommended catalog policy unless the user explicitly chooses a bounded promotional-rate design. Keep Opus 5/OpenAI requirements unchanged. Do not implement the temporary rate as a permanent static literal without an expiry strategy.
- Approved behavior or requirement IDs affected: REQ-006 and AC-012 remain standard-price behavior; the pending policy choice affects current Sonnet 5 pricing scope and should be recorded before implementation. No new intended-behavior supplement was created.
- Canonical artifacts and sections updated: `requirements.md` (status changed to `Refined`, audit finding, recommendation, open decision, approval state); `investigation-notes.md` (Claude Price Audit Addendum and exact comparison table); `design-spec.md` (pricing audit decision gate and implementation hold).
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: The package is not implementation-locked until the user chooses durable standard Sonnet 5 pricing (recommended) or requests explicit temporary promotional pricing/expiry handling. Architecture review should not treat the prior SR-002 package as final without this decision.
- Next recipient or routing: User for the Sonnet 5 policy decision; then `architecture_reviewer` with the selected package.
- Remaining gaps or risks: Anthropic may change promotional dates/rates again; the current catalog has no validity interval or automatic refresh. Live provider entitlement remains untested.

### SR-004 — Resolve Sonnet 5 durable-pricing requirement gap

- Triggering role, report path, and round: `solution_designer`; user decision after `architecture_reviewer` `ARCH-REV-002` / `REQ-GAP-001`; 2026-07-31 rework round.
- Triggering finding IDs: `REQ-GAP-001` from `/Users/normy/autobyteus_org/autobyteus-worktrees/update-openai-model-pricing/tickets/done/update-openai-model-pricing/design-review-report.md`.
- Prior authoritative result: SR-003 left the Sonnet 5 temporary introductory-versus-durable-standard policy choice open and architecture review was blocked.
- Current authoritative result: Requirements are `Design-ready`; the user explicitly selected final durable standard Sonnet 5 pricing `(3,15,0.3,3.75,6)` and approved excluding the temporary `$2/$10` introductory rate and any expiry/temporal pricing mechanism.
- Why this revision entry is recorded: It resolves the only architecture-review requirement gap and makes the prior recommendation an approved preserved behavior.
- Resolution: Add `BEH-006`, `REQ-008`, and `AC-013` to preserve standard Sonnet 5 pricing; update investigation/design decision gates and retain the combined OpenAI/Opus 5 scope unchanged.
- Approved behavior or requirement IDs affected: BEH-001–BEH-006; REQ-001–REQ-008; AC-001–AC-013.
- Canonical artifacts and sections updated: `requirements.md` (Design-ready status, approved durable policy, REQ-008/AC-013); `investigation-notes.md` (resolved audit decision, BEH-006, user decision source, architecture-review routing); `design-spec.md` (resolved pricing gate, BEH-006, DS-003 preservation); this revision record.
- Supplemental artifacts updated, added, or removed: None.
- Downstream and architecture-review impact: `ARCH-REV-002` is superseded for the requirement gate. Architecture reviewer should re-review the revised package and, if no other gaps exist, issue a new Pass for implementation. Existing uncommitted implementation edits remain preserved but were not approved or reviewed in the blocked round.
- Next recipient or routing: `architecture_reviewer` with the revised cumulative package and superseded review evidence attached.
- Remaining gaps or risks: Provider pricing/availability can change in future; current package intentionally uses durable standard pricing and no automatic promotional expiry. Live provider entitlement remains untested.

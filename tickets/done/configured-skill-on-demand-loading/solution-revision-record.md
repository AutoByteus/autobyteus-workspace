# Solution Revision Record

The current requirements, investigation notes, and design spec remain authoritative. This record indexes solution rounds and rationale only.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| `SR-001` | Solution Designer / initial approved solution / round 1 | N/A | `Initial Baseline` | Design-ready package prepared for architecture review |
| `SR-002` | Architecture Reviewer / `design-review-report.md` / round 1 | `AR-001` | `Design Impact` | Omitted AgentFactory integration coverage now has an explicit target disposition |
| `SR-003` | User / prompt-contract precision request / re-review preparation | N/A | `Design Impact` | Exact normative skill system-prompt template pinned for implementation |
| `SR-004` | User / prompt simplification correction / re-review preparation | N/A | `Design Impact` | Normative prompt reduced to two plain instruction paragraphs plus catalog |
| `SR-005` | User / balanced-rules correction / re-review preparation | N/A | `Design Impact` | Normative prompt finalized as catalog plus four concise rules |
| `SR-006` | User / rule-by-rule prompt correction / re-review preparation | N/A | `Design Impact` | Five concise just-in-time rules finalized; eager multiple-skill reading removed |

## Revision Entries

### SR-001 — Configured skill metadata with direct current-file reads

- Triggering role, report path, and round: Solution Designer; initial baseline; round 1
- Triggering finding IDs: N/A
- Prior authoritative result: `N/A`
- Current authoritative result: Approved requirements and an actionable clean-cut design are ready for architecture review.
- Why this baseline or revision entry is recorded: Establish the initial solution package after the user approved removing prompt-body injection and the complete agent-facing skill-tool group.
- Resolution: Native prompts advertise only configured name/description/absolute `SKILL.md` path plus direct-read guidance; authorized general tools read current content; all three server skill tools and dead prompt-formatting code are removed without compatibility paths or data migration.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`; `R-001`–`R-008`; `AC-001`–`AC-009`
- Canonical artifacts and sections updated: `requirements.md` (approved behavior, requirements, acceptance, persisted-data outcome); `investigation-notes.md` (production paths, tool inventory, persisted evidence); `design-spec.md` (complete target design and removal plan)
- Supplemental artifacts updated, added, or removed: None
- Downstream and architecture-review impact: Architecture reviewer should verify prompt ownership, clean removal boundaries, direct-read freshness, explicit authorization, and no-migration reasoning before implementation.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: Historical snapshots may retain old bodies; retired names may remain inert in stored agent definitions; a skill-bearing native agent still requires an explicitly configured general-purpose reader.

### SR-002 — Complete AgentFactory integration-coverage transition

- Triggering role, report path, and round: Architecture Reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/configured-skill-on-demand-loading/tickets/in-progress/configured-skill-on-demand-loading/design-review-report.md`; round 1 / `ARCH-REV-001`
- Triggering finding IDs: `AR-001`
- Prior authoritative result: `Fail — Design Impact`
- Current authoritative result: Design-impact rework complete; package ready for architecture re-review.
- Why this baseline or revision entry is recorded: The initial design omitted current durable integration coverage that directly enforces both removed body/link injection and invalid unconfigured registry discovery.
- Resolution: Added `autobyteus-ts/tests/integration/agent/agent-skills.test.ts` to the investigation evidence, removal/decommission plan, draft/final file responsibility mappings, target file mapping, and change sequence. The configured-root case is explicitly rewritten for name/description/exact absolute `SKILL.md` path/shared guidance plus body/link absence. The registry-only empty-config case is retained but corrected to assert the original prompt remains unchanged with no skill section.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-004`; `R-001`, `R-002`, `R-005`, `R-006`, `R-007`; `AC-001`, `AC-002`, `AC-007`, `AC-008`
- Canonical artifacts and sections updated: `investigation-notes.md` (source log, relevant files, status); `design-spec.md` (removal plan, draft/final file mappings, target path mapping, change sequence)
- Supplemental artifacts updated, added, or removed: None
- Downstream and architecture-review impact: Implementation now has an explicit disposition for the existing core AgentFactory integration seam; stale contradictory coverage cannot be left behind.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: No new gaps. Previously approved residual risks concerning historical snapshots, earlier reads, inert retired tool names, explicit reader configuration, and `PRELOADED_ONLY` remain unchanged.

### SR-003 — Pin the exact skill system-prompt contract

- Triggering role, report path, and round: User; conversation request during architecture re-review preparation
- Triggering finding IDs: N/A
- Prior authoritative result: Path-only prompt semantics were exact, but the sample wording was explicitly non-normative and could be paraphrased during implementation.
- Current authoritative result: The design contains an exact normative catalog-entry template, headings, static policy sentences, bullet order, dynamic substitution rule, prefix/newline rule, and no-skill suppression rule.
- Why this baseline or revision entry is recorded: System-prompt language controls model behavior. Leaving prose invention to implementation would create avoidable policy drift and review ambiguity.
- Resolution: Replaced the illustrative prompt shape with a copyable authoritative contract and required unit/integration coverage of its exact static wording and dynamic entry structure.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-002`, `BEH-004`; `R-002`, `R-003`, `R-006`; `AC-001`, `AC-002`, `AC-007`
- Canonical artifacts and sections updated: `design-spec.md` (`Concrete Examples / Shape Guidance`, normative prompt contract, test file responsibilities, change sequence, implementation guidance); `investigation-notes.md` (user design direction)
- Supplemental artifacts updated, added, or removed: None
- Downstream and architecture-review impact: Implementation can copy the prompt contract directly; architecture and code review can distinguish exact required prose from dynamic catalog values.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: Exact wording can only change through a later approved solution revision; previously approved operational residual risks remain unchanged.

### SR-004 — Simplify the normative skill prompt

- Triggering role, report path, and round: User; conversation correction during architecture re-review preparation
- Triggering finding IDs: N/A
- Prior authoritative result: The exact prompt was pinned but overexplained internal freshness mechanics and the absence of a retired loader through nine separate rule bullets.
- Current authoritative result: The exact prompt contains only two short instruction paragraphs and the configured skill catalog.
- Why this baseline or revision entry is recorded: System-prompt policy should be direct enough for the model to follow and simple enough for humans to audit. Internal architecture and retired-tool commentary are noise in the model instruction.
- Resolution: Reduced the policy to: use the configured skill when applicable and another approach only when necessary; whenever using a skill, first read its listed `SKILL.md` and resolve relative paths from that file's directory. Removed the `Rules for Using Skills` heading, nine bullets, conversation-history wording, explicit tool discussion, and loader-tool commentary.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-002`, `BEH-003`; `R-002`, `R-003`, `R-004`; `AC-001`, `AC-002`, `AC-004`
- Canonical artifacts and sections updated: `requirements.md` (direct-read wording and residual-risk explanation); `investigation-notes.md` (user correction and simplified freshness rationale); `design-spec.md` (normative prompt contract, examples, test expectations, risks, and implementation guidance)
- Supplemental artifacts updated, added, or removed: None
- Downstream and architecture-review impact: Implementation still has an exact copyable contract, now without policy noise; the runtime architecture and clean tool removal remain unchanged.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: None added. Current file freshness relies on following the simple read-before-use sentence, as intended.

### SR-005 — Restore a concise rules section

- Triggering role, report path, and round: User; conversation correction during architecture re-review preparation
- Triggering finding IDs: N/A
- Prior authoritative result: `SR-004` removed the explicit rules structure entirely while eliminating noisy rules.
- Current authoritative result: The normative prompt has a clear `Rules for Using Skills` section with four short, actionable rules.
- Why this baseline or revision entry is recorded: Simplification should remove internal-mechanics noise, not remove useful behavioral structure.
- Resolution: Restored concise rules for using applicable configured skills (including multiple relevant skills), limiting other approaches to uncovered work, reading the listed `SKILL.md` before use, and resolving relative paths from that file's directory. Conversation-history mechanics, explicit tool-selection prose, and retired-loader commentary remain excluded.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-002`, `BEH-003`; `R-002`, `R-003`, `R-004`; `AC-001`, `AC-002`, `AC-004`
- Canonical artifacts and sections updated: `investigation-notes.md` (user clarification); `design-spec.md` (normative prompt contract, examples, test expectations, sequence, and implementation guidance)
- Supplemental artifacts updated, added, or removed: None
- Downstream and architecture-review impact: Implementation retains an exact, auditable rules block without reintroducing the rejected policy noise.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: None added; previously approved architecture and operational residual risks remain unchanged.

### SR-006 — Finalize the just-in-time skill rules

- Triggering role, report path, and round: User; rule-by-rule conversation correction during architecture re-review preparation
- Triggering finding IDs: N/A
- Prior authoritative result: `SR-005` restored concise structure but coupled multiple applicable skills to using/reading all of them, which could imply eager loading before the relevant part of the work.
- Current authoritative result: The normative prompt has five short rules that preserve just-in-time selection and reading.
- Why this baseline or revision entry is recorded: Multiple skills can be relevant to different portions of work; relevance alone should not require immediate loading. The agent should read a skill when beginning the work that skill governs.
- Resolution: Kept the user-approved applicability, no-match fallback, partial-coverage supplementation, exact-path read-before-governed-work, and relative-path rules. Removed the multiple-applicable-skills rule and all previously rejected reread/current-content/loader commentary.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-002`, `BEH-003`; `R-002`, `R-003`, `R-004`; `AC-001`, `AC-002`, `AC-004`, `AC-005`
- Canonical artifacts and sections updated: `requirements.md` (read timing and residual-risk wording); `investigation-notes.md` (user correction and just-in-time rationale); `design-spec.md` (normative five-rule prompt, test expectations, sequence, risks, and guidance)
- Supplemental artifacts updated, added, or removed: None
- Downstream and architecture-review impact: Implementation now has exact just-in-time prompt semantics and must not infer eager reading merely because multiple configured skills are potentially relevant.
- Next recipient or routing: `architecture_reviewer`
- Remaining gaps or risks: None added; current-file freshness still occurs naturally because reading happens at the point governed work begins.

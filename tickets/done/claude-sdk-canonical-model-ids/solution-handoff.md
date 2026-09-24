# Solution Handoff — Architecture Design Complete

- Result: `Architecture Design Complete`
- Package identifier: `claude-sdk-canonical-model-ids`
- Current solution revision: `SR-003`
- task_size: `Medium`
- architectural_risk: `Low`
- Date: 2026-09-24

## Original Request

User (2026-09-24): for the Claude Agent SDK runtime, the model dropdown shows `Default (recommended)`, `Fable`, etc.; show the canonical model ID instead so users know the exact model. Screenshots attached to the original conversation (team run config, Claude Agent SDK picker).

## Goal (approved)

Claude Agent SDK model pickers show one option per real model, labeled with the canonical model ID (e.g. `claude-opus-5-5[1m]`), with Claude's display name + description as secondary text and a "Recommended" badge; selected field shows `Anthropic / <canonical ID>`. Stored/sent values remain SDK values; saved configs (incl. `default`) keep opening and running unchanged. See `dropdown-preview.md` for the approved visual behavior.

## Approval Basis

- Requirements approved by the user 2026-09-24 ("great. this is what user want to see. approved") at SR-002, covering `requirements-doc.md` + `dropdown-preview.md`.
- SR-003: evidence-only wording correction of BEH-006/REQ-010/AC-007 (new-config seeding stays "same as today", from the definition's default launch config). Approved intent unchanged.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/solution-revision-record.md`
- Approved UI supplement: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/dropdown-preview.md`
- Architecture review report: `N/A — not applicable` (none yet; routing decided by handoff rules)
- Product Design artifacts: `N/A — not applicable`

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids`
- Branch: `codex/claude-sdk-canonical-model-ids`
- Base: `origin/personal` @ `9267d11c8e82f9798b3870362b221edf39d3d7df`
- Finalization target: `origin/personal`
- Ticket artifacts are uncommitted files in the worktree.

## Design Summary

- Server: Claude `canonical_name` = SDK `resolvedModel` (fallback: SDK value); new per-row `selection_presentation { recommended, aliasOfModelIdentifier }` derived from the full SDK row set (the `default` row folds into the first sibling with the same resolved ID, which becomes recommended). Catalog identities unchanged. GraphQL `ModelDetail.selectionPresentation` (nullable, additive).
- Web: one shared picker builder (`utils/modelSelectionOptions.ts`) replaces two duplicated builders; Claude label = canonical ID, secondary = `name · description`, recommended-first; `SearchableGroupedSelect` gets `aliasIds` + `recommended` badge + alias-aware matching + no-emit when re-selecting the option that already represents the value; `RuntimeModelConfigFields` filter uses the matcher.
- Untouched: launch, validation, capacity, token usage, persistence.

## Classification Evidence

- Medium: ~5 server + ~10 web files within existing owners, plus tests.
- Low risk: no identity/persistence/validation change; additive nullable GraphQL field; all `canonical_name` readers checked (see design spec Architecture Investigation Evidence).
- Escalation trigger: see design spec.

## Constraints / Open Risks

- Do not change catalog identifiers or saved values; do not add `value === 'default'` logic in the web.
- Risks: SDK renames `default` (list still correct, no badge/merge); two non-default rows sharing an ID stay separate (ASM-001).

## Relevant Scenarios

SCN-001 (see exact model), SCN-002 (reopen saved `default`/`sonnet`/`opus[1m]`), SCN-003 (CLI upgrade moves alias) — all Supported Normal Scenarios.

## Expected Output / Next Action

Downstream per handoff rules: review or implement the design against the approved requirements; validation must include a browser check of the Claude Agent SDK picker against `dropdown-preview.md` §2–§4a.

## Routing Record

- Handoff rules consulted 2026-09-24. Matching rule: "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/implementation_engineer` (direct implementation route; independent architecture review not required by rules).
- Non-matching: `/architecture_reviewer` (requires Large or High), `/delivery_engineer` (delivery receipt gap only).

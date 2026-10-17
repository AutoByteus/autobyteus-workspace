# Solution Handoff — Architecture Design Complete (SR-007 revision)

- Package identifier: `claude-sonnet-haiku-5-5-model-support`
- Result classification: `Architecture Design Complete` (design revision after independent code review)
- Current solution revision: `SR-007` (design-only revision; requirements and their 2026-10-09 approval unchanged)
- task_size (SR-007 delta): `Small`
- architectural_risk: `Low`
- Selected route: direct implementation, per the handoff rule "task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`. Independent architecture review: `N/A — not applicable` (route rule).

## SR-007 — What To Do Now

Trigger: the user asked for an independent code review of this ticket (via `/project_task_manager`). The review (CRR-001) returned **Changes required (bounded)**. The user then told Solution Designer to "work on it" (2026-10-11).

- Review report (read it first): `/Users/normy/autobyteus_org/independent-reviews/claude-sonnet-haiku-5-5-model-support/independent-code-review-report.md`
- Review revision record: `/Users/normy/autobyteus_org/independent-reviews/claude-sonnet-haiku-5-5-model-support/code-review-revision-record.md`
- Authoritative design delta: `design-spec.md` → section "Revision SR-007" (D-SR7-1..D-SR7-6, file inventory, verification, classification). Evidence: `investigation-notes.md` AF-016..AF-022.

Work by owner:

| Owner | Items |
| --- | --- |
| Implementation Engineer | D-SR7-4 rebase onto current `origin/personal` (`d72d2018b` or newer) taking origin's `TESTING.md`; D-SR7-1 discriminated policy type (CR-002); D-SR7-2 model-named errors (CR-003); D-SR7-3 explicit `claude-sonnet-4-6` row, delete unsupported-ID test cases, fix the two docs (CR-004); implementation checks; update `implementation-handoff.md` / `implementation-revision-record.md` |
| API/E2E Engineer (downstream) | D-SR7-5: run commands and corrected size/cost in both live E2E test headers (CR-001, CR-006); validate the revised package; decide whether a live re-run is warranted (no payload change is designed) |
| Delivery Engineer (downstream) | D-SR7-6: commit `token_usage.md` (CR-005); place the `tcgetattr` importer note in `secret_management.md` or drop it; re-run docs sync; hold for user verification as before |

Working-tree warning: the worktree has uncommitted edits. Discard the `TESTING.md` edit; keep `autobyteus-server-ts/docs/modules/token_usage.md` (e.g. `git rebase --autostash`). The ticket folder is untracked, so the rebase leaves it alone. Stage paths explicitly; untracked SDK `dist/` folders exist.

Escalate as Design Impact (back to Solution Designer) if: an existing test's expected payload or matched message substring must change; the rebase conflicts outside `TESTING.md`; or new origin commits touch `autobyteus-ts/src/llm`, token-usage pricing or the live E2E helpers.

Out of scope (unchanged): reviewer residual risks 1–4 and C-10 (Opus 5.5 rejecting `thinking_enabled: false`).

---

## SR-006 Handoff (preserved for history)

- Classification at SR-006: task_size `Medium`, architectural_risk `Low`, direct implementation route.

## Original Request

The user, with a screenshot of Claude Opus 5.5 / Sonnet 5.5 / Haiku 5.5, asked: "we need to support two more models from claude in autobyteus-ts". Opus 5.5 is already supported, so the scope is **Claude Sonnet 5.5 (`claude-sonnet-5-5`)** and **Claude Haiku 5.5 (`claude-haiku-5-5`)**.

## Goals

- Both models can be selected from the built-in Anthropic catalog, with correct limits and Standard pricing. Haiku's pricing is tiered by prompt size, at 100k tokens including cache tokens.
- Requests to both models are provider-valid:
  - Sonnet 5.5, thinking off → `{type:'between_tools'}`.
  - Haiku 5.5, thinking off → `{type:'disabled'}`.
  - Thinking on → adaptive, with an optional `display:'summarized'`.
  - No sampling parameters; no manual budget.
  - Forced `tool_choice` on Sonnet 5.5 fails locally.
- Existing Claude models' request shapes are unchanged.

## Approval Basis

Requirements were explicitly approved by the user on 2026-10-09 ("approve. i think you are following industry practices"):
- DEC-001 = Sonnet 5.5 + Haiku 5.5.
- DEC-002 = the thinking toggle defaults to off and sends each model's lowest setting. The user can switch it per run in the frontend.
- DEC-003 = Sonnet 5.5 thinking display defaults to `summarized`; Haiku defaults to `omitted`.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support`
- Branch: `codex/claude-5-5-model-support`
- Base: `origin/personal` @ `ff227eb72` (fast-forwarded at the user's request). Finalization target: `origin/personal`.
- The ticket folder is untracked (not committed).

## Artifacts (absolute paths)

- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/requirements-doc.md`
- Investigation notes (incl. AF-001..AF-011): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-5-5-model-support/tickets/in-progress/claude-sonnet-haiku-5-5-model-support/solution-revision-record.md`
- Supplements: None. Product/UI-UX artifacts: `N/A — not applicable`. Architecture review artifacts: `N/A — not applicable` (direct route).

## Design Summary

1. Add `autobyteus-ts/src/llm/api/anthropic-model-request-policy.ts`. It holds an exact-value table of `{ thinkingMode: legacy_budget|adaptive|adaptive_required, thinkingOffShape: disabled|between_tools|omit, rejectsForcedToolChoice }` and a resolver. Unknown values get the legacy-budget policy.
2. Refactor `applyAnthropicRequestParams` in `anthropic-llm.ts` onto that policy. Remove:
   - `matchesAnthropicModelFamily`, which did the prefix matching;
   - the old policy type and resolver;
   - both `claude-opus-5-5` special-case blocks.
3. Add catalog rows `claude-sonnet-5-5` (new `claudeSonnet55Schema`, display default `summarized`) and `claude-haiku-5-5` (existing `claudeAdaptiveThinkingSchema`, tiered pricing).
4. Tests:
   - a new policy table test;
   - a new `anthropic-llm-claude-5-5.test.ts` (sync + stream payloads, forced tool choice, native-turn continuation);
   - an updated catalog-order test;
   - a server calculator Haiku tier case.
5. Docs: `autobyteus-ts/docs/provider_model_catalogs.md` and `llm_module_design_nodejs.md`.

The design spec contains the exact policy table, adapter rule matrix, catalog rows, change sequence and escalation trigger. If any existing Anthropic test needs its expected payload changed, return a Design Impact.

## Evidence

- Anthropic docs (read 2026-10-09):
  - models overview;
  - Sonnet 5.5 and Haiku 5.5 overview and what's-new pages;
  - Thinking page (per-model config table);
  - Extended-thinking page;
  - Pricing page (Haiku long-context rule).
- Code evidence: AF-001..AF-011 in the investigation notes. The SDK 0.132.1 types include `between_tools` (AF-004). The server's gross tier basis matches Anthropic's rule (AF-005).

## Constraints

- No backward-compatibility branches. No changes to prompt caching, native-history policy or the server calculator code.
- Out of scope:
  - the effort parameter;
  - the beta `display:"updates"`;
  - Bedrock/Vertex/Batch/Fast pricing;
  - Opus 5 `disabled` and Fable 5.1 forced-tool-choice (follow-up candidates).

## Base Update (SR-005)

The branch was fast-forwarded to `origin/personal` @ `ff227eb72`. Upstream now resolves the streaming `max_tokens` from catalog `maxOutputTokens` and throws when it is unknown. Keep `staticMetadata` with `maxOutputTokens: 128_000` on both new rows. The request-policy region of `anthropic-llm.ts` is unchanged, now around L103-236.

## Re-investigation (SR-006)

All earlier findings were re-verified against `ff227eb72` (investigation notes, "Full Re-verification Against `ff227eb72`"). Nothing changes in requirements or design. Test guidance added:
- build test models with `maxOutputTokens`;
- end stream mocks with `message_stop`;
- the identity field is `isTurnContinuation`.

Output-limit recovery appends a USER note, so it is compatible with both models (no prefill, append-only).

## Open Risks

- The live API could differ from the docs. AC-011 covers this with a live smoke per model when an Anthropic key is available; otherwise record it as skipped.
- Refactor regression for existing models is mitigated by the unchanged existing tests.

## Expected Output From Implementation

An implementation that meets AC-001..AC-012, with implementation-scoped checks:
- `pnpm -C autobyteus-ts exec vitest run tests/unit/llm`
- the server pricing unit tests
- an `autobyteus-ts` build/typecheck

Then the implementation handoff per the team route.

## Route Record

`get_handoff_rules` was applied on 2026-10-09. The matching rule is Medium/Low → `/implementation_engineer`.

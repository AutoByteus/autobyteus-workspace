# Docs Sync Report

## Scope

- Ticket: `claude-anthropic-effort-control` (Project Task `autobyteus-8`)
- Trigger: validated package from the code reviewer (CRR-003 Pass) after API/E2E round 2 (API-REV-002 Pass, 95%)
- Bootstrap base reference: `origin/personal` @ `e82d03b0f`
- Integrated base reference used for docs sync: `origin/personal` @ `5fb7f2918` (merged into the ticket branch at `257c1b9ea`)
- Post-integration verification reference: `257c1b9ea` (see release-deployment-report.md, "Initial Delivery Integration Refresh")

## Why Docs Were Updated

- Summary: the implementation stages already updated the long-lived docs (IR-001: Claude effort, no thinking display, gen-4 Claude rows removed, one Thinking list; IR-002: the server model-settings validator leaves undeclared top-level keys out of the canonical config, and validated callers store or launch only the canonical selection). Delivery checked them against the final integrated code and found them accurate. Delivery made no further doc edits.
- Why this should live in long-lived project docs: the effort mapping (`reasoning_effort` → `output_config.effort`), the owned-key rule in `AnthropicLLM`, and the validator's "omit undeclared keys" contract change behavior that every runtime's save, edit and launch path depends on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Claude catalog, effort, owned config keys | No change (already updated in IR-001) | L267-278 describe owned keys and `output_config.effort`; the `claude-sonnet-4.8` mentions are the existing "no alias" rule, not removed rows |
| `autobyteus-ts/docs/llm_module_design.md`, `llm_module_design_nodejs.md` | Anthropic adapter design | No change (IR-001) | Stale non-Claude rows recorded as FU-002 (pre-existing) |
| `autobyteus-server-ts/docs/modules/llm_management.md` | validation rule + caller rule | No change (IR-002) | L189-202 match `model-config-schema-validation.ts` and the SR-005 callers |
| `autobyteus-server-ts/docs/modules/run_history.md` | stopped-run save contract | No change (IR-002) | L184-190 state undeclared top-level keys are left out; schema-less model saves `null` (matches API-12) |
| `autobyteus-web/docs/settings.md` | Thinking row, stale key on save | No change (IR-001/IR-002) | — |
| `autobyteus-web/docs/chat.md` | composer Thinking menu | No change (IR-001) | — |
| Repository-wide `*.md` outside `tickets/` | stale terms `thinking_display`, `thinking_budget_tokens`, `legacy_budget`, `claudeSchema`, `claude-opus-4*`, `claude-sonnet-4*` | No change | Only hits are the intended `claude-sonnet-4.8` "no alias" rule |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| (none by delivery) | — | — | Implementation already updated the docs; the integrated base (`5fb7f2918`) changed none of them |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude effort | Every catalog Claude model declares `reasoning_effort` low…max; it goes out as `output_config.effort`; none is sent while thinking is off or unset | design-spec.md (SR-002) | `autobyteus-ts/docs/provider_model_catalogs.md` |
| Owned config keys | `AnthropicLLM` reads only `thinking_enabled` and `reasoning_effort`; stored keys it does not own are never sent | design-spec.md (SR-002), AC-011 | `provider_model_catalogs.md` |
| Validator contract | Undeclared top-level keys are omitted (not refused); callers persist/launch only `validation.selection` | design-spec.md (SR-004/SR-005) | `llm_management.md`, `run_history.md`, `autobyteus-web/docs/settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Gen-4 Claude rows (`claude-opus-4.8`, `claude-opus-4.7`, `claude-sonnet-4.6`), `claudeSchema`, `legacy_budget` policy mode, budget/temperature code | Gen-5 rows with effort schemas | `provider_model_catalogs.md` |
| `thinking_display` setting / web `thinking_budget_tokens` handling | Nothing (display never sent; Anthropic default `omitted`) | `provider_model_catalogs.md`, `autobyteus-web/docs/settings.md`, `chat.md` |
| Validator rejecting undeclared keys | Validator omitting them | `run_history.md`, `llm_management.md` |

## No-Impact Decision

- Not used: the docs did change in this ticket, all in the implementation commits.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, repository finalization
- Notes: follow-ups FU-001..FU-005 in `follow-ups.md`; delivery added none.

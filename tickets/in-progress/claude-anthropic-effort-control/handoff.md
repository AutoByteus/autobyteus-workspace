# Solution Handoff — claude-anthropic-effort-control

- Result: `Architecture Design Complete`
- Package: `claude-anthropic-effort-control` (Project Task `autobyteus-8`, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`), SR-002 (revision after the implementation engineer's Requirement Gap; implementation WIP `781823e77`)
- Requested by: `/project_task_manager` (run `project_task_manager_3a5fea41304e412da92575d61bd88570`) for the user
- Worktree / branch: `/home/autobyteus/workspace/.codex/worktrees/claude-anthropic-effort-control` / `codex/claude-anthropic-effort-control`
- Base: `origin/personal` @ `e82d03b0f` (fetched 2026-10-29); finalization target `origin/personal` (RELEASE.md)
- Ticket folder: `tickets/in-progress/claude-anthropic-effort-control/`
- Approval: SR-001 and SR-002 requirements approved by the User on 2026-10-29 (Solution Designer conversation). Recorded in requirements-doc.md Document Status.
- Classification: task_size `Medium`, architectural_risk `Low` → direct implementation route (no independent architecture review).

## Original request and goals

The user reported that the AutoByteus runtime offers no thinking effort for `claude-opus-5-5` ("Thinking: Not available for this model"). Direction: verify Anthropic support; if effort exists, expose it, send it, make it selectable in Agent Configuration. In conversation the user widened and fixed scope: effort for every Claude model, with whatever levels each supports; remove Claude models below generation 5 (Opus 4.8, Opus 4.7, Sonnet 4.6).

## Root cause (evidence)

Anthropic supports `output_config.effort` on every catalog Claude model (docs SRC-001; live PRB-001: all five levels accepted on Opus 5.5, output tokens 18→171 from low to max). Our catalog never declared effort and `AnthropicLLM` never sends it (an explicit non-goal in earlier tickets); the web hides Opus 5.5's Thinking row because its schema has no thinking key.

## What to build (see design-spec.md)

1. Every remaining Claude catalog schema gets `reasoning_effort` [low, medium, high, xhigh, max], default medium (Opus 5.5, Haiku 5.5) or high (others); Fable 5.1 gets a schema with effort.
2. `AnthropicLLM` maps it to `output_config.effort` (internal key, merged into any `output_config`); unset → nothing sent; thinking switch off + xhigh/max → local error.
3. Web thinking adapter/menu: for Claude schemas with a switch, effort is an independent group (Off/On, effort, display); choosing xhigh/max while off turns thinking on; switching off with xhigh/max sets high; summary "On · High". Applies also to Claude Agent SDK runtime schemas (DEC-005).
4. Remove gen-4 Claude rows, `claudeSchema`, the `legacy_budget` policy mode and unknown-model fallback, budget/temperature-0 code in `AnthropicLLM`, and web `thinking_budget_tokens` handling; update docs/tests.

## Constraints

- Preserve requests for configs without effort (REQ-008/AC-008).
- Persisted data: Directly Usable — no migration, no aliases.
- Live provider checks: the Anthropic key is in the test vault (`AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault`, plus `RUN_LIVE_PROVIDER_TESTS=1`). pnpm runs through `corepack pnpm` here.

## Open risks

- RSK-001 Claude SDK runtime menu shape changes (accepted).
- ASM-001 unprobed models' levels → AC-009 live check.
- Follow-up FU-001 (Opus 5 / Fable 5 "Off" semantics) recorded, not in scope.

## Documents

- requirements-doc.md, investigation-notes.md, design-spec.md, solution-revision-record.md, follow-ups.md (all in the ticket folder).

## Expected output

Implementation per the design's change sequence, with implementation-handoff.md, then the configured downstream route.

## Route

Handoff rule matched: "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (2026-10-29).

## SR-002 revision (2026-10-29)

- User changes: one Thinking list Off · Low · Medium · High · Xhigh · Max (Off = thinking off, no effort sent); remove the thinking display setting (never shown, never sent; Anthropic default `omitted`). The user approved after PRB-003 showed display is presentation-only: omitted blocks keep the full signed reasoning and our runtime already passes them back.
- Design delta: see design-spec.md "SR-002 Delta Against The SR-001 Implementation". Key items: `AnthropicLLM` reads only owned config keys (stored `thinking_display` in real user runs must not reach Anthropic, AC-011); no effort while off (refusal dropped); web reverts to the existing merged list with dependent effort.
- Classification unchanged: Medium / Low → implementation engineer.
- Follow-ups: FU-001, FU-002 (from implementation), FU-003 (Claude SDK Off + stored effort).

## SR-003 revision (2026-10-29) — Design Impact CR-FO-001

- Problem: stopped-run settings Save fails for saved runs holding `thinking_display` (agent, team; Org by code), because editable stopped-run cards preserve the hidden key and the server rejects it.
- User decision (DEC-011): no data migration; editable model-settings drafts leave out keys the current schema does not declare. Invalid values of declared keys keep today's preserve-and-show-error behavior.
- Design: design-spec.md "SR-003 Delta". Fix in `ModelConfigSection.vue` schema alignment, with a shared helper in `utils/llmConfigSchema.ts`. Opening settings alone must not make the draft dirty or write. Update the docs (settings.md, agent_execution_architecture.md). Add tests (AC-012).
- Reruns: API-04, API-06, Org edit path.
- Classification: Medium / Low → implementation engineer.

## SR-004 revision (2026-10-29) — Design Impact DI-1 / DI-2 → architecture review

- Problem: SR-003 targeted the wrong surface (the stopped-run edit goes through `ExistingRunConfigEditor`/`RunSettingsCard`), and Org workspace-only edits revalidate untouched stored configs that no client filter can reach (SRC-023).
- Design: the server model-settings validator omits top-level keys the model's current schema does not declare from the canonical config instead of rejecting them (null schema → null). Saves persist the canonical config, so stale keys disappear on the next real save, and untouched or launched configs pass. The runtime already ignores undeclared keys. No client change, no migration. See design-spec.md "SR-004 Delta".
- Classification: task_size Medium, architectural_risk High (documented shared validation contract, `run_history.md` L184-187) → `/software_engineering_team/architecture_reviewer`.
- Implementation state: production code at 574aa0bd7 (SR-002), API/E2E round 1 at 51b94b3e1, docs at the SR-004 commit; implementation is waiting for the reviewed design.
- Review basis: the cumulative package (SR-001..SR-004); no earlier architecture review exists (direct route until now).

# Requirements Document — openai-gpt-6-1-terra (autobyteus-336)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Request: Task `autobyteus-336`; requested by `/project_task_manager`.
- Approved by: `User`; reference: the Task's direction (the user, 2026-10-30: "in the future we will use the 6.1T as the model for testing. This model is much cheaper.") and the user in this conversation, 2026-10-30: "let's do not remove those models for now. Let's just add the new model and not remove the old model for now. Make it as simple as that." Add only terra (`gpt-6.1-sol` exists; not added).

## Behaviour, Requirements, Acceptance

| ID | Requirement | Acceptance |
| --- | --- | --- |
| REQ-001 | `gpt-6.1-terra` is in the AutoByteus OpenAI catalog: context 1,050,000, max input 922,000, max output 128,000; reasoning effort none/low/medium/high/xhigh/max, default medium; images supported, audio and video unsupported | AC-001: the catalog lists it first among OpenAI models with those values; Settings' model list (server catalog) shows it; `read_file` refuses audio/video for it (capability `unsupported`) |
| REQ-002 | Its prices: input $1, cached input $0.05, cache write $1.25 (30-minute retention, our default), output $5 per 1M tokens; above 272K input tokens 2x input and cache rates, 1.5x output | AC-002: the catalog pricing test asserts both tiers; a Codex or native run on it gets a cost estimate |
| REQ-003 | TESTING.md: live Codex tests use `gpt-6.1-terra`, reasoning effort medium unless a test needs more | AC-003: the rule is in TESTING.md (`docs(testing): …` commit) |
| REQ-004 | The two live Codex test defaults change from `gpt-6.1-sol` to `gpt-6.1-terra` | AC-004: both files default to terra; their env overrides stay |
| REQ-005 | Nothing else changes: no model removed; existing models and prices unchanged | AC-005: existing catalog and token-usage tests pass unchanged except the added model |
| — | Outcome to verify (not a requirement) | a call to `gpt-6.1-terra` through autobyteus-ts with the test-vault key works (small input; never print the key) |

## Scope

- Out of scope: removing older OpenAI models (the user, DEC-001); `gpt-6.1-sol`; Fast mode, Batch/Flex and 12-hour cache pricing (not selectable in AutoByteus); native OpenAI live test defaults (FU-001).
- Preserved: every existing model, price and test.

## Decisions

| ID | Question | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Remove OpenAI models below 6? | dropped: the catalog is the price table for Codex runs too | User | Decided: no |
| DEC-002 | Cache-read price | terra's is 5% of input, not the helper's 10%; the helper takes an optional cache-read price, the existing models keep the default | Solution Designer | Decided |
| DEC-003 | Which cache-write price | $1.25 (30-minute retention, OpenAI's default; AutoByteus requests no extended retention) | Solution Designer | Decided |
| DEC-004 | Add `gpt-6.1-sol`? | the Task says terra only unless the user asks; he chose terra only | User | Decided: no |

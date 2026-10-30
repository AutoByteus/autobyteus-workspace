# Handoff Summary: openai-gpt-6-1-terra (autobyteus-336)

- **Status:** verified from the evidence and finalized into `personal`.
  - **Release:** none, because none was requested (RELEASE.md default). It ships with the next beta.
- **Classification:** `task_size=Small`, `architectural_risk=Low`, direct route.
  - Architecture and code review: `N/A — not applicable`.
  - Test-code review: `Not Required — direct low-risk route`.
- **Revisions:** API-REV-001 / DR-001.

## What Changed

- **New model:** OpenAI `gpt-6.1-terra` in the `autobyteus-ts` model catalog (first in OpenAI's order).
  - 1,050,000 context, 922,000 input and 128,000 output tokens; reasoning effort `none`…`max`, default `medium`.
  - Prices: $1/M input, $0.05/M cache read, $1.25/M cache write, $5/M output. Its tier above 272K input tokens is in the catalog.
  - The Settings list and the Codex runtime offer it.
- **Tests:** the two live Codex-native test defaults change from `gpt-6.1-sol` to `gpt-6.1-terra`.
- **Rule:** a TESTING.md rule that live Codex tests use `gpt-6.1-terra` at reasoning `medium`.
- **Docs:** `provider_model_catalogs.md`.

## Integration

- Merged `origin/personal` `d31c92adfc` (the version bump only) as `c18fe0eedb`, with no overlap.
- Checks (DEL-01): install and prebuild exit 0; `autobyteus-ts` LLM unit tests 70 files and 541 tests passed; server `typecheck` exit 0; server `llm-management` unit tests 12 files and 83 tests passed.

## Verification From Evidence

- Every AC is proven (AC-001..005), and every category is at 95% or above (overall 95.5%).
- Opened:
  - `API-02-04-terra-receipt.json`: the answers `terra-ok` and `codex-terra-ok`, the totals `0.0101493` and `0.008916` (`estimated`), and the token limits;
  - `IMP-02`: "before 32 rows, after 33 rows; every before row is present byte-identical after: True".
- No user check is needed.

## Residual Risk

- The price tier above 272K input tokens is proven by the catalog unit test only.

## Follow-ups

- FU-001 (Solution Designer).
- FU-002 (delivery): other live Codex tests and the release smoke still default to older models.

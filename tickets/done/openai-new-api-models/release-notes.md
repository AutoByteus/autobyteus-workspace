# OpenAI GPT-5.6 API Model Support

## Highlights

- Adds `gpt-5.6-sol`, `gpt-5.6-terra`, and `gpt-5.6-luna` as exact built-in OpenAI API model choices.
- Adds the GPT-5.6 reasoning-effort contract, including `max`, with the documented `medium` default.
- Adds curated 1,050,000-token context and 128,000-token output limits.
- Adds trusted standard and >272K pricing for input, output, cache reads, and cache writes.
- Normalizes direct OpenAI API `cache_write_tokens` into the existing generic cache-write accounting path so the Token Meter can show reported write tokens, unit price, and estimated cost without frontend provider-specific pricing logic.

## Direct OpenAI And Codex Runtime Distinction

Direct OpenAI Responses usage and Codex app-server usage are separate source contracts. Current Codex token events expose cached reads but no cache-write count. AutoByteus therefore keeps Codex cache creation unknown/null, does not infer writes from uncached input, and does not calculate or display a write component from pricing alone. A future official Codex write field requires explicit supported-protocol and cumulative-snapshot mapping review.

## Availability Note

The catalog entries are independent of the configured OpenAI account's limited-preview entitlement. The credential used for round-2 delivery validation was valid but did not have access to any of the three exact model IDs. Successful live GPT-5.6 invocation and a real direct API response containing raw `cache_write_tokens` remain unverified; users without entitlement receive OpenAI's explicit model-access error rather than a silent substitution.

## Compatibility And Data

- No database migration or historical usage rewrite is required.
- No unsuffixed `gpt-5.6` duplicate alias was added.
- Existing OpenAI model schemas and defaults remain unchanged.
- No speculative Codex write alias, remainder inference, provider-specific frontend branch, or compatibility path was introduced.

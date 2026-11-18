# Usage-limit probes (2026-10-24, this Mac)

Scripts are standalone and send no prompt (0 tokens). Outputs are summarized here without account IDs.

| Runtime | Command / API | Time | Result on 2026-10-24 ~19:40 UTC |
| --- | --- | --- | --- |
| Codex (codex-cli 0.164.0) | `node codex-limits.mjs` — app-server `initialize` + `account/rateLimits/read` | 0.65 s | plan `pro`; limit `codex` primary window 10080 min, `usedPercent` 100, `resetsAt` 1793390273 (2026-10-30 20:57 local); `rateLimitReachedType` `rate_limit_reached`; `ordinaryUsageAllowed` false |
| Claude (Agent SDK 0.3.280, `claude` CLI) | `node claude-usage.mjs <path to sdk.mjs>` — `query({prompt: idle stream})` + `usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET({skipBehaviors:true})` (control request `get_usage`) | 0.78 s | `subscription_type` max; `limits[]`: session 87% (resets 21:10Z, severity warning), weekly_all 22% (resets 2026-10-31 16:00Z), weekly_scoped model "Fable" 0% |
| Antigravity (agy, 2026-10-24 build) | `agy -p "/usage" --output-format json` | 2.69 s | `command.data.groups[]`: "Gemini Models" weekly 0.997 / 5h 0.989 remaining; "Claude and GPT models" weekly 0 remaining (resets 2026-10-26T10:22:39Z), 5h disabled; "Gemini 4 Argon" weekly 0.40 remaining (resets 2026-10-26T12:35:29Z). Each group lists its models in `description` |
| Grok 1.0.70 | `node grok-billing.mjs` — `grok agent --no-leader stdio` (ACP, as our Grok runtime uses), `initialize`, then extension method `_x.ai/billing` (the unprefixed `x.ai/billing` is "Method not found") | ~1 s incl. start, 0 tokens | tier "X Basic"; `currentPeriod` weekly 2026-10-22 → 2026-10-29; `onDemandCap`/`onDemandUsed`/`prepaidBalance` 0. The response type also has `creditUsagePercent` and `monthlyLimit` (binary strings), absent in this answer: its meaning when absent (0% used, or not reported) is unverified until the account has usage this period. `_x.ai/models/list` gives models with context sizes. |
| AutoByteus (API keys) | none | — | Not readable |

Stability notes: the Claude method is marked experimental by Anthropic; the agy `/usage` JSON is a CLI command's output; Codex fields are part of the app-server protocol schema (`v2/GetAccountRateLimitsResponse.json`).

## API-key providers (AutoByteus runtime), 2026-10-25, test vault

Command: `AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault node api-limits.mjs <worktree>` (uses the built `autobyteus-ts` resolver; prints status and limit fields only, never keys). No completion request is sent.

| Provider | Endpoint | Result |
| --- | --- | --- |
| DeepSeek | `GET https://api.deepseek.com/user/balance` (391 ms) | 200: `is_available` true, USD total 0.14 (granted 0.13, topped up 0.01) |
| Kimi | `GET https://api.moonshot.ai/v1/users/me/balance` (339 ms) | 200: available 0, voucher 0, cash −0.012 → no balance left |
| xAI API (Grok via API key) | `GET https://api.x.ai/v1/api-key` (175 ms) | 200: key flags only (`api_key_blocked`, `api_key_disabled`, `team_blocked` all false); no balance |
| GLM | `GET https://open.bigmodel.cn/api/monitor/usage/quota/limit` (281 ms) | 200 with `code 500`, "当前用户不存在coding plan" (this account has no Coding Plan) |
| OpenAI | `GET /v1/models` (1 s) | 200, no rate-limit headers; OpenAI has no balance endpoint for normal keys |
| Anthropic API | `POST /v1/messages/count_tokens` (free, 239 ms) | 400 "Your credit balance is too low to access the Anthropic API" → the free call reveals "out of credits" |
| Gemini (AI Studio / Vertex Express) | not probed | no balance or quota endpoint known |

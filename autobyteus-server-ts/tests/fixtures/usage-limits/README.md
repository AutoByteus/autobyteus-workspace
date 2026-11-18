# Usage-limit fixtures (autobyteus-303)

Recorded answers of each agent runtime's zero-token limit read, as the probes in the ticket's
`evidence/limit-probes/` captured them on 2026-10-24/25 (codex-cli 0.164.0, Claude Agent SDK 0.3.280 /
Claude Code, agy 2026-10-24 build, grok 1.0.70). Account IDs, emails and the Claude usage-breakdown rows are
removed; the values are the probe values the requirements' acceptance criteria name (AC-003 … AC-006).

| File | Source |
| --- | --- |
| `codex-rate-limits-exhausted.json` | app-server `account/rateLimits/read` (P-01: weekly window used up, no credits) |
| `claude-get-usage.json` | SDK `usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET({skipBehaviors:true})` (P-02) |
| `antigravity-usage.json` | `agy -p "/usage" --output-format json` (P-03) |
| `grok-billing.json` | Grok ACP `_x.ai/billing` (P-04) |

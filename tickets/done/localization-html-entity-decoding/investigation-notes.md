Status: Complete
Scope: Small

# Findings

1. The visible regression is reproducible from the screenshot: `View Details &rarr;` is rendered literally in the agent/team cards.
2. The regression was introduced by commit `04d81f37` (`feat(web): finalize multilingual ui support`) on 2026-04-09, which moved inline template text into generated localization catalogs.
3. Before extraction, the Vue templates contained HTML entities directly in the markup. After extraction, those entities became plain translation strings such as:
   - `agents.components.agents.AgentCard.and_rarr = '&rarr;'`
   - `agentTeams.components.agentTeams.AgentTeamCard.and_rarr = '&rarr;'`
   - `agents.components.agents.AgentDetail.and_larr_back_to_all_agents = '&larr; Back to all agents'`
4. The localization runtime returns catalog strings as plain text. It interpolates placeholders, but it does not decode HTML entities and it does not render HTML.
5. Because Vue inserts `$t(...)` results as text nodes, `&rarr;` is now displayed literally instead of becoming `→`.

# Broader Impact Scan

The same catalog pattern exists in other visible UI strings:

- `Install &amp; Restart`
- `user:&lt;snowflake&gt;`
- `channel:&lt;snowflake&gt;`
- modal close button `&times;`

# Root Cause

This is a localization/extraction regression, not a font problem. HTML entity markup was valid inside raw template text, but once extracted into catalog strings it became plain data and stopped being entity-decoded by the browser.

# Recommended Fix

Decode HTML entities in the localization runtime after parameter interpolation and before returning the final plain-text string. This repairs the current regressions and prevents the same class of issue from reappearing for future extracted strings.

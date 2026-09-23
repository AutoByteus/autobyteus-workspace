# Release Notes — Anthropic API Key Save

## Fixes

- Saving an Anthropic API key no longer shows a false failure after the server has successfully stored it. Settings immediately shows **Configured**, reports success, and clears the key input.
- The configured state remains correct after refresh or a later save; other provider rows are preserved. Genuine rejected saves still show an error and do not claim a new configured state.

## Security And Scope

- API keys remain write-only and are not returned in status or save responses. The encrypted vault and server credential contract are unchanged.
- This repair changes the frontend credential-list update, not the user's stored credential or the Anthropic API itself.

## New

- MCP server secrets are now kept in AutoByteus's encrypted vault instead of in plain text. When you add or edit an MCP server, values that look like secrets (an API key, a token, an `Authorization` header) are locked automatically, and you can lock or unlock any env or header row yourself. A locked value is stored in the vault, and `mcps.json` keeps only a reference to it.
- Stored secrets are never shown again. The form shows "Stored in the vault", where you can replace or remove the value. The app, its API and its logs never return the value. AutoByteus reads it from the vault only when it connects to the server.
- If you already have plain secrets in your MCP settings, the MCP Servers page offers "Review and move to vault". You choose which values move. A backup of your current `mcps.json`, readable only by you, is written first, and every moved server keeps working. If you choose "Keep as they are", the banner stops asking about those values; each row still offers "Move to vault" later.
- Bulk Import stores values that look like secrets directly in the vault, and tells you which ones it stored. An imported file from another install cannot carry that install's secrets: those entries import, are marked "Needs secret", and you enter the value once on this install.
- When a secret is missing, or the vault is unavailable, the server shows "Needs secret" and does not connect. It never connects with an empty value or falls back to plain text.

## Notes

- Local (stdio) MCP servers still receive their secrets as environment variables, because that is the only way such servers accept them. Another program running as your user could read a running server's environment.
- Nothing moves without your approval. Plain values keep working until you move them.
- Going back to an earlier version: earlier versions don't understand vault references. Servers whose secrets you moved won't connect there, and editing such a server in an earlier version replaces its reference. To go back, restore the backup `mcps.json` that the move wrote (`mcps.json.backup-before-vault-move-…`, next to `mcps.json`) before starting the earlier version. Delete the backup when you no longer need it, because it holds the plain values.

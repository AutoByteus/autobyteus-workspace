// PRB-D1: what the Claude Agent SDK runtime's model list contains (server ClaudeSdkClient, api-key mode, private config dir).
import { resolveProviderApiKeyResolver } from "<worktree>/autobyteus-ts/src/secrets/provider-api-key-resolver.ts";
import { ClaudeSdkClient } from "<worktree>/autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts";
const resolver = resolveProviderApiKeyResolver();
const client = new ClaudeSdkClient(() => resolver.resolve("ANTHROPIC") as any);
const t0 = Date.now();
const rows = await client.listModels();
console.log("ms", Date.now() - t0, "count", rows.length);
for (const r of rows) console.log(JSON.stringify({ id: r.model_identifier, name: r.display_name, canonical: r.canonical_name, schema: r.config_schema, sp: (r as any).selection_presentation }));

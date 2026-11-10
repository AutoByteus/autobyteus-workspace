// PRB-D4: repeated reads with the new CLI on a config dir holding the old CLI's model-options cache.
import { resolveProviderApiKeyResolver } from "<worktree>/autobyteus-ts/src/secrets/provider-api-key-resolver.ts";
import { ClaudeSdkClient } from "<worktree>/autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts";
const resolver = resolveProviderApiKeyResolver();
const client = new ClaudeSdkClient(() => resolver.resolve("ANTHROPIC") as any);
for (let i = 1; i <= 3; i++) {
  const rows = await client.listModels();
  console.log(`read ${i}:`, JSON.stringify(rows.map((r) => [r.model_identifier, r.canonical_name])));
  await new Promise((r) => setTimeout(r, 3000));
}

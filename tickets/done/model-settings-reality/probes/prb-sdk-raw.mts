// PRB-D2: raw supportedModels() rows from the bundled CLI (api-key mode, private config dir).
import { resolveProviderApiKeyResolver } from "<worktree>/autobyteus-ts/src/secrets/provider-api-key-resolver.ts";
import { query } from "<worktree>/autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs";
const key = (await resolveProviderApiKeyResolver().resolve("ANTHROPIC")).revealToTrustedConsumer();
async function* never() { await new Promise(() => {}); }
const q = query({ prompt: never(), options: { env: { ...process.env, ANTHROPIC_API_KEY: key } } });
const rows = await q.supportedModels();
console.log(JSON.stringify(rows, null, 1));
q.close?.(); process.exit(0);

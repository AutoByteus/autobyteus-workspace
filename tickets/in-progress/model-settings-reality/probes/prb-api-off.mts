// PRB-A2: Anthropic Messages API, thinking Off per model (what AutoByteus runtime would send).
import Anthropic from "<worktree>/autobyteus-ts/node_modules/@anthropic-ai/sdk/index.mjs";
import { resolveProviderApiKeyResolver } from "<worktree>/autobyteus-ts/src/secrets/provider-api-key-resolver.ts";
const key = (await resolveProviderApiKeyResolver().resolve("ANTHROPIC")).revealToTrustedConsumer();
const client = new Anthropic({ apiKey: key });
const cases = JSON.parse(process.argv[2]);
for (const c of cases) {
  try {
    const r: any = await client.messages.create({ model: c.model, max_tokens: 2000,
      messages: [{ role: "user", content: "Is 391 prime? Answer yes or no with the factorization, one line." }],
      ...(c.thinking ? { thinking: c.thinking } : {}), ...(c.effort ? { output_config: { effort: c.effort } } : {}), ...(c.temperature !== undefined ? { temperature: c.temperature } : {}) } as any);
    console.log(JSON.stringify({ c, blocks: r.content.map((b: any) => b.type), out: r.usage.output_tokens, details: r.usage.output_tokens_details ?? null }));
  } catch (e: any) { console.log(JSON.stringify({ c, error: e.status, msg: String(e.message).slice(0, 220) })); }
}

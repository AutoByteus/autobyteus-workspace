// PRB-A1: Claude Agent SDK runtime, what "Off" (thinking: disabled) does per model alias, with and without a stored effort.
// Same option shape the server sends (claude-sdk-client.ts L348-349). api-key mode, private config dir, system CLI.
import { resolveProviderApiKeyResolver } from "<worktree>/autobyteus-ts/src/secrets/provider-api-key-resolver.ts";
import { query } from "<worktree>/autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs";
const key = (await resolveProviderApiKeyResolver().resolve("ANTHROPIC")).revealToTrustedConsumer();
const cases = JSON.parse(process.argv[2]);
for (const c of cases) {
  const blocks: string[] = []; let result: any = null; let err: string | null = null; let resolved = "";
  try {
    const q = query({ prompt: "Is 391 prime? Answer yes or no with the factorization, one line.", options: {
      model: c.model, maxTurns: 1, tools: [], permissionMode: "plan", pathToClaudeCodeExecutable: process.env.PRB_CLI ?? "/usr/bin/claude",
      settingSources: [], ...(c.thinking ? { thinking: c.thinking } : {}), ...(c.effort ? { effort: c.effort } : {}),
      env: { ...process.env, ANTHROPIC_API_KEY: key } } });
    for await (const m of q as any) {
      if (m.type === "system" && m.subtype === "init") resolved = m.model;
      if (m.type === "assistant") for (const b of m.message.content) blocks.push(b.type + (b.type === "text" ? ":" + JSON.stringify(b.text.slice(0, 60)) : ""));
      if (m.type === "result") result = { subtype: m.subtype, is_error: m.is_error, out: m.usage?.output_tokens, details: m.usage?.output_tokens_details, text: String(m.result ?? "").slice(0, 160) };
    }
  } catch (e: any) { err = String(e?.message ?? e).slice(0, 300); }
  console.log(JSON.stringify({ case: c, resolved, blocks, result, err }));
}
process.exit(0);

import { openSession, ts } from "./lib.mjs";
import { query } from "/tmp/sdk0280/package/sdk.mjs";
const s = openSession({ tools: [] }, "N");
const pr = (r) => console.log(ts(), "USAGE", JSON.stringify({ usage: { in: r.usage?.input_tokens, out: r.usage?.output_tokens, cr: r.usage?.cache_read_input_tokens, cw: r.usage?.cache_creation_input_tokens }, cost: r.total_cost_usd, model: Object.fromEntries(Object.entries(r.modelUsage ?? {}).map(([k, v]) => [k, { in: v.inputTokens, out: v.outputTokens, cost: v.costUSD }])), num_turns: r.num_turns }));
s.send("Write a 100-word paragraph about oceans."); pr(await s.nextResult());
s.send("Write a 100-word paragraph about mountains."); pr(await s.nextResult());
s.send("Reply only OK."); pr(await s.nextResult());
s.close(); process.exit(0);

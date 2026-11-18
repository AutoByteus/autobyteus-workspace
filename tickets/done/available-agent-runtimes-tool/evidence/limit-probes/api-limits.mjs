const root = process.argv[2];
const { resolveProviderApiKeyResolver } = await import(`${root}/autobyteus-ts/dist/secrets/provider-api-key-resolver.js`);
const r = resolveProviderApiKeyResolver();
const key = async (id, slot) => (await r.resolve(id, slot)).revealToTrustedConsumer().trim();
const pickHeaders = (h) => Object.fromEntries([...h.entries()].filter(([k]) => /ratelimit|retry-after|quota|limit/i.test(k)));
async function probe(name, url, init) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, init);
    const text = await res.text();
    console.log(`== ${name} ${res.status} ${Date.now() - t0}ms headers=${JSON.stringify(pickHeaders(res.headers))}`);
    console.log(text.replace(/"(email|user_id|userId|id|team_id|api_key_id|name|redacted_api_key|acls)"\s*:\s*("[^"]*"|\[[^\]]*\])/g, '"$1":"<redacted>"').slice(0, 900));
  } catch (e) { console.log(`== ${name} ERR ${e?.message}`); }
}
const bearer = (k) => ({ Authorization: `Bearer ${k}` });
await probe("deepseek balance", "https://api.deepseek.com/user/balance", { headers: bearer(await key("DEEPSEEK")) });
await probe("kimi balance", "https://api.moonshot.ai/v1/users/me/balance", { headers: bearer(await key("KIMI")) });
await probe("xai api-key info", "https://api.x.ai/v1/api-key", { headers: bearer(await key("GROK")) });
const glm = await key("GLM");
await probe("glm coding quota", "https://open.bigmodel.cn/api/monitor/usage/quota/limit", { headers: { Authorization: glm } });
await probe("openai models (headers?)", "https://api.openai.com/v1/models", { headers: bearer(await key("OPENAI")) });
await probe("anthropic count_tokens (headers?)", "https://api.anthropic.com/v1/messages/count_tokens", { method: "POST", headers: { "x-api-key": await key("ANTHROPIC"), "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-5", messages: [{ role: "user", content: "hi" }] }) });
process.exit(0);

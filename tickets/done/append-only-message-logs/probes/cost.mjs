import fs from "node:fs/promises";
const dir = process.argv[2];
const mk = (i, size) => ({ messageId: `m${i}`, senderAgentRunId: "a_1", receiverAgentRunId: "b_2", content: "x".repeat(size), messageType: "agent_message", referenceFiles: ["/tmp/r.md"], createdAt: new Date(1e12 + i * 1000).toISOString() });
const messages = Array.from({ length: 82 }, (_, i) => mk(i, 270000)); // ~22 MB, profile of the largest org log
const file = { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "o_1", messages };
await fs.writeFile(`${dir}/log.json`, JSON.stringify(file, null, 2) + "\n");
const next = mk(83, 120000);
const rewrite = async () => { const t = performance.now();
  const cur = JSON.parse(await fs.readFile(`${dir}/log.json`, "utf8"));
  if (cur.messages.some((m) => m.messageId === next.messageId)) return;
  const text = JSON.stringify({ ...cur, messages: [...cur.messages, next] }, null, 2) + "\n";
  const h = await fs.open(`${dir}/log.json.tmp`, "wx"); await h.writeFile(text); await h.sync(); await h.close();
  await fs.rename(`${dir}/log.json.tmp`, `${dir}/log.json`); const d = await fs.open(dir, "r"); await d.sync(); await d.close();
  return [performance.now() - t, text.length]; };
await fs.writeFile(`${dir}/log.jsonl`, messages.map((m) => JSON.stringify(m)).join("\n") + "\n");
const append = async () => { const t = performance.now(); const line = JSON.stringify(next) + "\n";
  const h = await fs.open(`${dir}/log.jsonl`, "a"); await h.write(line); await h.sync(); await h.close();
  return [performance.now() - t, line.length]; };
for (let k = 0; k < 3; k++) { console.log("rewrite ms/bytes", (await rewrite()).map(Math.round)); await fs.writeFile(`${dir}/log.json`, JSON.stringify(file, null, 2) + "\n"); console.log("append  ms/bytes", (await append()).map(Math.round)); }

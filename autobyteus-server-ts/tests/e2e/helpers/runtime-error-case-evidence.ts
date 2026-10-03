import fs from "node:fs/promises";

/** Optional ticket ledger; plain test runs do not write external artifacts. */
export const recordCase = async (id: string, action: () => Promise<unknown>) => {
  const ledger = process.env["AGY_ERROR_LEDGER"];
  const event = async (stage: string, result: string, detail: string) => {
    if (ledger) await fs.appendFile(ledger, `| auto | ${id} | ${new Date().toISOString()} | ${stage} | Approved runtime message/continuity | ${detail.replaceAll("|", "/").replaceAll("\n", " ")} | ${result} | evidence/api-e2e/${process.env["AGY_ERROR_EXECUTION_LOG"] ?? "transport.log"} |\n`);
  };
  await event("Started", "N/A", "Executing real public transport");
  try { const result = await action(); await event("Completed", "Pass", "All assertions passed"); return result; }
  catch (error) { await event("Completed", "Fail", String(error)); throw error; }
};

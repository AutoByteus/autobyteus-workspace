/**
 * IMP-14 (temporary, not committed): reads `test.github.token` from the test vault inside this process and scans the
 * given folders for it, byte for byte. Prints only file counts and hit counts, never the value.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readLiveTestSecret } from "../../../../test-support/test-vault/live-test-secret.js";

const roots = (process.env.IMP14_SCAN_ROOTS ?? "").split(path.delimiter).filter(Boolean);

const walk = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
  const full = path.join(dir, entry.name);
  if (entry.isDirectory()) return walk(full);
  return entry.isFile() ? [full] : [];
});

describe("IMP-14 token scan", () => {
  it("finds the test token in no file of the scanned folders", async (context) => {
    expect(roots.length).toBeGreaterThan(0);
    const token = await readLiveTestSecret(context, "test.github.token");
    const needle = Buffer.from(token.revealToTrustedConsumer(), "utf8");
    expect(needle.length).toBeGreaterThan(10);
    const hits: string[] = [];
    let files = 0;
    let bytes = 0;
    for (const root of roots) {
      for (const file of walk(root)) {
        const content = fs.readFileSync(file);
        files += 1;
        bytes += content.length;
        if (content.includes(needle)) hits.push(file);
      }
      console.log(`IMP-14 scanned ${root}`);
    }
    console.log(`IMP-14 files scanned: ${files}, bytes: ${bytes}, files containing the token: ${hits.length}`);
    expect(hits).toEqual([]);
  });
});

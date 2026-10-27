import fs from "node:fs";
import { it } from "vitest";
import { Tokenizer } from "@huggingface/tokenizers";
it("counts Granite tokens", async () => {
  const dir = "/tmp/wjs-probe/models/granite-embedding-small-english-r2";
  const tok = new Tokenizer(JSON.parse(fs.readFileSync(`${dir}/tokenizer.json`, "utf-8")), JSON.parse(fs.readFileSync(`${dir}/tokenizer_config.json`, "utf-8")));
  const inFile = process.env.WJS_IN ?? "/tmp/wjs-probe/cards.jsonl";
  const counts = fs.readFileSync(inFile, "utf-8").trim().split("\n").map((l) => {
    const t = JSON.parse(l).text as string;
    return [t.length, tok.encode(t).ids.length];
  });
  fs.writeFileSync(process.env.WJS_OUT ?? "/tmp/wjs-probe/card-tokens.json", JSON.stringify(counts));
});

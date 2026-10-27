import fs from "node:fs";
import path from "node:path";
import { it } from "vitest";
import { WorkJournalService } from "../src/agent-work-journal/services/work-journal-service.js";
import { RuntimeKind } from "../src/runtime-management/runtime-kind-enum.js";
it("renders one run in the copy", async () => {
  const dir = path.join("/tmp/wjs-copy/memory", process.env.WJS_RUN!);
  const kind = JSON.parse(fs.readFileSync(path.join(dir, "run_metadata.json"), "utf-8")).runtimeKind as RuntimeKind;
  const pkg = await new WorkJournalService().ensureCurrent({ runId: path.basename(dir), memoryDir: dir, runtimeKind: kind });
  fs.writeFileSync("/tmp/wjs-probe/render-one.json", JSON.stringify({ files: pkg.files.length, kind }));
});

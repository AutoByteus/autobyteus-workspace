// AutoByteus agent instructions as one literal system-prompt section (no {{…}} interpolation).
import { readFileSync } from "node:fs";
export const name = "autobyteus-agent-instructions";
export const inject = ["systemPrompt"];
export function apply(ctx, config) {
  const text = readFileSync(config.instructionsFile, "utf8");
  ctx.systemPrompt.section({ name: "autobyteus:agent-instructions", order: 0, text, interpolate: false });
}

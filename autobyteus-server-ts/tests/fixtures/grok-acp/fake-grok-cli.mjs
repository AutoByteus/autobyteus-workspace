#!/usr/bin/env node
// Fake `grok` CLI for capability/discovery tests: `--version`, `agent --help`, and
// `agent ... stdio` (replays FAKE_ACP_FIXTURE through fake-acp-agent.mjs).
const args = process.argv.slice(2);
if (args[0] === "--version") {
  process.stdout.write(`grok ${process.env.FAKE_GROK_VERSION ?? "1.0.41"} (test) [stable]\n`);
  process.exit(0);
}
if (args[0] === "agent" && args.includes("--help")) {
  process.stdout.write(process.env.FAKE_GROK_AGENT_HELP
    ?? "Commands:\n  stdio  Run the agent over stdio\nOptions:\n  -m, --model <MODEL>\n  --reasoning-effort <EFFORT>\n  --no-leader\n");
  process.exit(0);
}
if (args[0] === "agent" && args.at(-1) === "stdio") {
  await import("./fake-acp-agent.mjs");
} else {
  process.exit(2);
}

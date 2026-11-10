// PRB-D3: does the server's Claude model read follow a Claude Code update without a restart? (symlink swap old CLI -> new CLI in one process)
import { execSync } from "node:child_process";
import { resolveProviderApiKeyResolver } from "<worktree>/autobyteus-ts/src/secrets/provider-api-key-resolver.ts";
import { ClaudeSdkClient } from "<worktree>/autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts";
const resolver = resolveProviderApiKeyResolver();
const client = new ClaudeSdkClient(() => resolver.resolve("ANTHROPIC") as any);
const show = (label: string, rows: any[]) => console.log(label, JSON.stringify(rows.map((r) => [r.model_identifier, r.canonical_name])));
show("before swap:", await client.listModels());
execSync("ln -sfn /usr/lib/node_modules/@anthropic-ai/claude-code/bin/claude.exe /tmp/msr-probes/bin/claude");
show("after swap: ", await client.listModels());

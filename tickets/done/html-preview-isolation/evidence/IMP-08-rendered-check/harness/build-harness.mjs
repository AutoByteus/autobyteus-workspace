import { build } from "/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/node_modules/.pnpm/esbuild@0.27.3/node_modules/esbuild/lib/main.js";
await build({
  entryPoints: ["/tmp/hpi-scripts/rendered/harness-entry.ts"],
  bundle: true, platform: "node", format: "esm", target: "node20",
  outfile: "/tmp/hpi-scripts/rendered/harness.mjs",
  nodePaths: ["/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/autobyteus-server-ts/node_modules"],
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  plugins: [{ name: "stub-workspace-manager", setup(b) {
    b.onResolve({ filter: /workspace-manager\.js$/ }, () => ({ path: "/tmp/hpi-scripts/rendered/stub-workspace-manager.mjs" }));
  } }],
});
console.log("built");

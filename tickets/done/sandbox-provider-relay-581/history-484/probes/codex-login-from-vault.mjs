#!/usr/bin/env node
// autobyteus-484 probe: sign the container's Codex in with the test vault's OpenAI key, through stdin
// (`codex login --with-api-key`), so the key is never in a command line, an environment variable or the output.
// Run inside a throwaway server container: AUTOBYTEUS_TEST_VAULT=<dir> node codex-login-from-vault.mjs
// Prints the exit status only. Codex writes the key to $CODEX_HOME/auth.json (default /root/.codex), which
// lives in the container's fresh /root volume and is removed with it.
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const pnpm = "/opt/autobyteus/server-package/node_modules/.pnpm";
const dist = path.join(pnpm, fs.readdirSync(pnpm).find((d) => d.startsWith("autobyteus-ts@")), "node_modules", "autobyteus-ts", "dist", "secrets", "vault");
const { openTestVaultReader } = await import(pathToFileURL(path.join(dist, "open-test-vault.js")).href);

const reader = await openTestVaultReader(process.env.AUTOBYTEUS_TEST_VAULT);
const key = (await reader.readProviderApiKey("OPENAI")).revealToTrustedConsumer();
reader.close();

const child = spawn("codex", ["login", "--with-api-key"], { stdio: ["pipe", "ignore", "ignore"] });
child.stdin.end(`${key}\n`);
const code = await new Promise((resolve) => child.on("close", resolve));
console.log(`codex login --with-api-key exit ${code}`);
process.exitCode = code === 0 ? 0 : 1;

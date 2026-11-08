/**
 * The node-access CLI (design M-2), built to `dist/node-access-cli.js`. Run it on the node's own computer, as the user
 * whose data folder the node uses:
 *
 *   node dist/node-access-cli.js setup-code --data-dir <dir>
 *
 * It asks the running node for a setup code through the node's local control socket and prints it. Enter the code on
 * the desktop app's Nodes page within 30 minutes; it works once. Exit codes: 0 printed, 1 failed, 2 usage.
 */
import { requestSetupCode } from "./node-access/services/local-control-socket.js";

const USAGE = "Usage: node dist/node-access-cli.js setup-code --data-dir <dir>";

const readDataDir = (args: readonly string[]): string | null => {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]!;
    if (arg === "--data-dir") return args[index + 1] ?? null;
    if (arg.startsWith("--data-dir=")) return arg.slice("--data-dir=".length) || null;
  }
  return null;
};

const main = async (args: readonly string[]): Promise<number> => {
  const dataDir = readDataDir(args);
  if (args[0] !== "setup-code" || !dataDir) {
    console.error(USAGE);
    return 2;
  }
  try {
    const { setupCode, expiresAt } = await requestSetupCode(dataDir);
    console.log(`Setup code: ${setupCode}`);
    console.log(`Valid once, until ${expiresAt}. Enter it on the Nodes page of the AutoByteus desktop app.`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
};

process.exitCode = await main(process.argv.slice(2));

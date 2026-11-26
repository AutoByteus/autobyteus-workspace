import { asText } from "../command-text.js";
import { actionLine, readLine, textItems, type PlatformToolConverter } from "./platform-line-parts.js";

/** The sandbox tools (autobyteus-581): create, run a command in, and remove a sandbox node. */

const createSandbox: PlatformToolConverter = (call, result) => {
  const packages = Array.isArray(call.args.agentPackages) ? textItems(call.args.agentPackages) : [];
  return actionLine(`Create sandbox: ${packages.length ? packages.join(", ") : "(packages not recorded)"}`, result);
};

const runInSandbox: PlatformToolConverter = (call, result) => {
  const argv = Array.isArray(call.args.argv) ? textItems(call.args.argv) : [];
  return readLine(`Run in sandbox ${asText(call.args.sandboxId) ?? "?"}: ${argv.length ? argv.join(" ") : "(command not recorded)"}`, result);
};

const destroySandbox: PlatformToolConverter = (call, result) =>
  actionLine(`Destroy sandbox ${asText(call.args.sandboxId) ?? "?"}`, result);

export const sandboxToolConverters: ReadonlyMap<string, PlatformToolConverter> = new Map([
  ["create_sandbox", createSandbox],
  ["run_in_sandbox", runInSandbox],
  ["destroy_sandbox", destroySandbox],
]);

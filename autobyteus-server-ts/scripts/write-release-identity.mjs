import fs from "node:fs/promises";
import path from "node:path";

/**
 * Stamps the release this server build belongs to (autobyteus-285, D1): `dist/release-identity.json` =
 * `{ "version": <autobyteus-web package version> }`, the release version (RELEASE.md). The server reads it to
 * tell an update restart from a plain one. Run by `build:full` after `tsc`, so every packaged server carries it.
 */
const serverRoot = path.resolve(import.meta.dirname, "..");
const webPackagePath = path.resolve(serverRoot, "..", "autobyteus-web", "package.json");
const target = path.join(serverRoot, "dist", "release-identity.json");

const main = async () => {
  const { version } = JSON.parse(await fs.readFile(webPackagePath, "utf8"));
  if (typeof version !== "string" || !version.trim()) throw new Error(`No release version in ${webPackagePath}.`);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${JSON.stringify({ version: version.trim() }, null, 2)}\n`);
};

main().catch((error) => {
  console.error("Failed to write the release identity.", error);
  process.exitCode = 1;
});

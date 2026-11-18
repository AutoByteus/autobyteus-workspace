import fs from "node:fs";
import path from "node:path";

export type ToolCheck = Readonly<{ tool: string; found: boolean }>;

const isExecutableFile = (candidate: string, platform: NodeJS.Platform): boolean => {
  try {
    if (!fs.statSync(candidate).isFile()) return false;
    if (platform !== "win32") fs.accessSync(candidate, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
};

/**
 * Whether each prerequisite tool is on the server's `PATH` (the manifest's `command -v` check), with `PATHEXT` on
 * Windows. A lookup only: no shell is spawned. Agent shells inherit this environment, so the answer holds for them.
 */
export const checkTools = (
  tools: readonly string[],
  env: Readonly<Record<string, string | undefined>> = process.env,
  platform: NodeJS.Platform = process.platform,
): ToolCheck[] => {
  const directories = (env.PATH ?? env.Path ?? "").split(path.delimiter).filter(Boolean);
  const extensions = platform === "win32"
    ? (env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean)
    : [""];
  return tools.map((tool) => ({
    tool,
    found: directories.some((directory) =>
      extensions.some((extension) => isExecutableFile(path.join(directory, tool + extension), platform))),
  }));
};

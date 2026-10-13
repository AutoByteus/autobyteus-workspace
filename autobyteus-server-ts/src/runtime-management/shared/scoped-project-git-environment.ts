import path from "node:path";
/** Call only after shared binding admission; modifies this child's exact project trust,
 * never process.env, user/global Git config, or unrelated directory policy. */
export function scopedProjectGitEnvironment(base: NodeJS.ProcessEnv, project: string): NodeJS.ProcessEnv {
  if (!path.isAbsolute(project) || /[\x00\n\r]/.test(project)) throw new Error("Shared Git project must be an absolute path.");
  const count = base.GIT_CONFIG_COUNT ?? "0";
  if (!/^(0|[1-9][0-9]*)$/.test(count) || !Number.isSafeInteger(Number(count) + 1)) throw new Error("Invalid inherited GIT_CONFIG_COUNT.");
  const index = Number(count);
  return { ...base, GIT_CONFIG_COUNT: String(index + 1), [`GIT_CONFIG_KEY_${index}`]: "safe.directory",
    [`GIT_CONFIG_VALUE_${index}`]: path.resolve(project) };
}

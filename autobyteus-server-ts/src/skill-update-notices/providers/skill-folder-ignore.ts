import path from "node:path";
import { GitIgnoreStrategy } from "../../file-explorer/traversal-ignore-strategy/git-ignore-strategy.js";

/**
 * Noise inside a skill folder (REQ-010): version control, dependency and build folders, and OS
 * and editor files. A dedicated list, not the code-workspace default list, because skills may
 * legitimately contain folders such as `lib/`, `env/`, `var/` or `target/`.
 */
const IGNORED_NAMES: ReadonlySet<string> = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  "dist",
  "build",
  ".DS_Store",
]);

const isTempFileName = (name: string): boolean =>
  name.endsWith(".swp") || name.endsWith("~") || name.startsWith(".#");

/**
 * The ignore rule of one skill folder: the noise list above plus the folder's own `.gitignore`
 * (read when this rule is created). Paths outside the folder are never ignored by it.
 */
export class SkillFolderIgnore {
  private readonly skillDir: string;
  private readonly gitIgnore: GitIgnoreStrategy;

  constructor(skillDir: string) {
    this.skillDir = path.resolve(skillDir);
    this.gitIgnore = new GitIgnoreStrategy(this.skillDir);
  }

  ignores(absolutePath: string, isDirectory: boolean): boolean {
    const relative = path.relative(this.skillDir, path.resolve(absolutePath));
    if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return false;
    const segments = relative.split(path.sep);
    if (segments.some((segment) => IGNORED_NAMES.has(segment))) return true;
    if (!isDirectory && isTempFileName(segments[segments.length - 1]!)) return true;
    return this.gitIgnore.shouldIgnore(absolutePath, isDirectory);
  }
}

import fs from "node:fs";
import path from "node:path";
import ignore, { type Ignore } from "ignore";
import type { TraversalIgnoreStrategy } from "./traversal-ignore-strategy.js";

export class GitIgnoreStrategy implements TraversalIgnoreStrategy {
  private rootPath: string;
  private spec: Ignore;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
    this.spec = ignore();

    const gitignorePath = path.join(this.rootPath, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const raw = fs.readFileSync(gitignorePath, "utf-8");
      const lines = raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"));
      if (lines.length > 0) {
        this.spec.add(lines);
      }
    }
  }

  shouldIgnore(filePath: string, isDirectory: boolean): boolean {
    const relativePath = path.relative(this.rootPath, filePath);
    if (relativePath === "" || relativePath === ".") {
      return false;
    }
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return false;
    }

    let normalizedPath = relativePath.split(path.sep).join("/");
    if (isDirectory) {
      normalizedPath += "/";
    }
    return this.spec.ignores(normalizedPath);
  }
}

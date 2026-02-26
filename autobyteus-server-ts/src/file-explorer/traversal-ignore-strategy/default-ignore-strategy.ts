import path from "node:path";
import ignore, { type Ignore } from "ignore";
import type { TraversalIgnoreStrategy } from "./traversal-ignore-strategy.js";

export class DefaultIgnoreStrategy implements TraversalIgnoreStrategy {
  private rootPath: string;
  private spec: Ignore;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
    this.spec = ignore().add([
      "__pycache__/",
      "*.pyc",
      "*.pyo",
      "*.pyd",
      ".Python",
      "build/",
      "develop-eggs/",
      "dist/",
      "downloads/",
      "eggs/",
      ".eggs/",
      "lib/",
      "lib64/",
      "parts/",
      "sdist/",
      "var/",
      "wheels/",
      "share/python-wheels/",
      "*.egg-info/",
      ".installed.cfg",
      "*.egg",
      "MANIFEST",
      ".env",
      ".venv",
      "env/",
      "venv/",
      "ENV/",
      "venv.bak/",
      "env.bak/",
      "node_modules/",
      "npm-debug.log*",
      "yarn-debug.log*",
      "yarn-error.log*",
      "lerna-debug.log*",
      ".pnpm-debug.log*",
      "report.[0-9]*.[0-9]*.[0-9]*.[0-9]*.json",
      "pids",
      "*.pid",
      "*.seed",
      "*.log",
      "*.log.bak",
      "*.class",
      "*.jar",
      "*.war",
      "*.ear",
      "target/",
      "build/",
      ".gradle/",
      "*.o",
      "*.a",
      "*.so",
      "*.lo",
      "*.c",
      "*.exe",
      "*.dll",
      "*.obj",
      "*.ilk",
      "*.pdb",
      "bin/",
      "obj/",
      "build/",
      ".idea/",
      ".vscode/",
      "*.suo",
      "*.ntvs*",
      "*.njsproj",
      "*.sln",
      "*.swp",
      "*.swo",
      "*.swn",
      ".DS_Store",
      ".DS_Store?",
      "._*",
      ".Spotlight-V100",
      ".Trashes",
      "ehthumbs.db",
      "Thumbs.db",
      "desktop.ini",
      "*.db",
      "*.sqlite",
      "*.sqlite3",
      "*.db-journal",
      "*.db-shm",
      "*.db-wal",
      "logs",
      "*.log",
      "*.zip",
      "*.tar",
      "*.gz",
      "*.rar",
      "*.7z",
      "*.tmp",
      "*.temp",
      "*~",
      "*.bak",
    ]);
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

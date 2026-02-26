/**
 * File utilities for path resolution and security checks.
 */
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * Returns the default downloads folder for the current OS.
 */
export function getDefaultDownloadFolder(): string {
  // In Node.js, we can construct this. There isn't a direct "Downloads" API,
  // so we assume standard location ~/Downloads for most systems.
  return path.join(os.homedir(), 'Downloads');
}

/**
 * Resolves a file path and ensures it is contained within allowed safe directories.
 * 
 * Allowed directories:
 * 1. The Agent's Workspace (workspace_root)
 * 2. The User's Downloads directory
 * 3. The System Temporary directory
 * 
 * @param userPath The relative or absolute path provided by the user/tool.
 * @param workspaceRoot The root directory of the agent's workspace.
 * @returns The resolved absolute path.
 * @throws Error If the path is outside the allowed directories.
 */
export function resolveSafePath(userPath: string, workspaceRoot: string): string {
  const workspace = path.resolve(workspaceRoot);
  const downloads = path.resolve(getDefaultDownloadFolder());
  const tempDir = path.resolve(os.tmpdir());
  
  let target: string;
  if (path.isAbsolute(userPath)) {
    target = path.resolve(userPath);
  } else {
    target = path.resolve(workspace, userPath);
  }

  const allowedRoots = [workspace, downloads, tempDir];
  
  let isSafe = false;
  for (const root of allowedRoots) {
    const rel = path.relative(root, target);
    // path.relative returns a path relative to 'from'.
    // If it starts with '..' and is not absolute, it is outside.
    // Also check if it's on a different drive (Windows) -> relative returns absolute path there usually or behavior varies,
    // but simplified check: !rel.startsWith('..') && !path.isAbsolute(rel) covers "is inside".
    // Actually, if it's inside, `rel` should not start with '..'
    if (!rel.startsWith('..') && !path.isAbsolute(rel)) {
      isSafe = true;
      break;
    }
    // Handle the case where target IS the root
    if (rel === '') {
        isSafe = true;
        break;
    }
  }

  if (!isSafe) {
    throw new Error(
      `Security Violation: Path '${userPath}' is not within allowed directories ` +
      `(Workspace: ${workspace}, Downloads: ${downloads}, or Temp: ${tempDir}).`
    );
  }

  return target;
}

import fs from "node:fs";
import path from "node:path";

export const isManagedId = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Check every owned ancestor with lstat; do not follow substituted directories. */
export function assertOwnedDirectory(root: string, target: string, allowMissing = false): void {
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Path is outside managed skill storage.");
  let current = path.resolve(root);
  for (const segment of ["", ...relative.split(path.sep).filter(Boolean)]) {
    if (segment) current = path.join(current, segment);
    try {
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`Unsafe managed skill directory: ${current}`);
    } catch (error) {
      if (allowMissing && (error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }
  }
  const realRoot = fs.realpathSync(root);
  const realTarget = fs.realpathSync(target);
  const realRelative = path.relative(realRoot, realTarget);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) throw new Error("Managed directory escapes its owner.");
}

export function managedRepositoryPath(root: string, id: string, generation: string): string {
  if (!isManagedId(id) || !isManagedId(generation)) throw new Error("Invalid managed skill identity.");
  return path.join(root, id, "generations", generation, "repository");
}

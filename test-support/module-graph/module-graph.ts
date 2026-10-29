import fs from 'node:fs';
import path from 'node:path';

/*
 * Static module graph of TypeScript sources, for "this entry never loads X"
 * checks. Relative imports are followed; package specifiers are recorded, not
 * followed. Type-only imports are erased at runtime and skipped. Dynamic
 * `import()` targets are recorded and followed only on request.
 */

export type ModuleGraph = Readonly<{
  files: ReadonlySet<string>;
  packages: ReadonlySet<string>;
  /** Relative targets of dynamic `import()` calls. */
  dynamic: ReadonlySet<string>;
}>;

const IMPORT_PATTERN =
  /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s*)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

const resolveRelative = (fromFile: string, specifier: string): string => {
  const base = path.resolve(path.dirname(fromFile), specifier);
  const candidates = base.endsWith('.js')
    ? [base.replace(/\.js$/, '.ts'), base]
    : [base, `${base}.ts`, path.join(base, 'index.ts')];
  const found = candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
  if (!found) throw new Error(`unresolved ${specifier} from ${fromFile}`);
  return found;
};

/** Package name of a specifier (`node:sqlite`, `@scope/pkg`, `pkg`). */
const packageName = (specifier: string): string => {
  if (specifier.startsWith('node:')) return specifier;
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]!;
};

export const moduleGraph = (entry: string, options: { followDynamic: boolean }): ModuleGraph => {
  const files = new Set<string>();
  const packages = new Set<string>();
  const dynamic = new Set<string>();
  const pending = [entry];
  while (pending.length > 0) {
    const file = pending.pop()!;
    if (files.has(file)) continue;
    files.add(file);
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const typeOnly = Boolean(match[2]);
      const dynamicSpecifier = match[4];
      const specifier = match[3] ?? dynamicSpecifier;
      if (typeOnly || !specifier) continue;
      if (!specifier.startsWith('.')) {
        packages.add(packageName(specifier));
        continue;
      }
      const resolved = resolveRelative(file, specifier);
      if (dynamicSpecifier) {
        dynamic.add(resolved);
        if (!options.followDynamic) continue;
      }
      pending.push(resolved);
    }
  }
  return { files, packages, dynamic };
};

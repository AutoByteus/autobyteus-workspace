#!/usr/bin/env node
// Prunes the frozen copies in the sealed migration area to the members migrations and their tests use
// (docs/design/data_migration_guideline.md, "Sealed migration area": copy what you use, not whole services).
//
//   node scripts/prune-frozen-layer.mjs          (from autobyteus-server-ts/, after copying source files whole into
//                                                 src/app-data-migrations/frozen/<package>/<original path>)
//
// Only the frozen copies of other code are touched (`frozen/server/`, `frozen/autobyteus-ts/`,
// `frozen/application-sdk-contracts/`), never migration-owned code. Every result is a line subset of the copied
// source apart from removed `implements` clauses and whitespace, so behavior is the source's. Steps, repeated until
// nothing changes:
//   1. drop `implements` clauses: a frozen copy does not implement the application's ports;
//   2. remove unreferenced top-level declarations, class members (by symbol, and kept whenever any file accesses a
//      property of that name) and import/export specifiers; references count from the whole migration area and
//      every test that mentions it;
//   3. delete frozen copies no migration folder reaches through relative imports, and files left empty;
//   4. tidy the blank lines and empty specifier lists the removals leave.
// The boundary test (tests/architecture/app-data-migration-boundaries.test.ts) and the migration suites decide
// whether the result is right.
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverRoot = path.resolve(process.argv[2] ?? path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const require = createRequire(path.join(serverRoot, "package.json"));
const ts = require("typescript");
const area = path.join(serverRoot, "src", "app-data-migrations");
const targetRoots = ["server", "autobyteus-ts", "application-sdk-contracts"]
  .map((name) => path.join(area, "frozen", name)).filter((root) => fs.existsSync(root));
const KEEP_MEMBERS = new Set(["constructor", "toJSON", "toString", "valueOf", "then"]);
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".ts") ? [path.join(dir, e.name)] : []);
const isTarget = (f) => targetRoots.some((r) => f.startsWith(r + path.sep));
const targets = () => targetRoots.flatMap(walk);
const parsed = ts.parseJsonConfigFileContent(ts.readConfigFile(path.join(serverRoot, "tsconfig.json"), ts.sys.readFile).config, ts.sys, serverRoot);
const options = { ...parsed.options, noEmit: true };
const write = (file, text) => { if (text !== fs.readFileSync(file, "utf8")) { fs.writeFileSync(file, text); return 1; } return 0; };

const stripImplements = () => targets().reduce((n, file) => n + write(file, fs.readFileSync(file, "utf8").replace(
  /^((?:export\s+)?(?:abstract\s+)?class\s+\w+(?:<[^>{]*>)?(?:\s+extends\s+[^{]+?)?)\s+implements\s+[^{]+\{/gm, "$1 {")), 0);

const containerOf = (node) => {
  for (let n = node; n; n = n.parent) {
    if (n.parent && ts.isSourceFile(n.parent)) return n;
    if (n.parent && (ts.isClassDeclaration(n.parent) || ts.isClassExpression(n.parent)) && ts.isClassElement(n)) return n;
  }
  return node;
};
const within = (inner, outer) => inner.getSourceFile() === outer.getSourceFile() && inner.pos >= outer.pos && inner.end <= outer.end;

let oldProgram;
const pruneOnce = () => {
  const roots = [...walk(area), ...walk(path.join(serverRoot, "tests")).filter((f) => /app-data-migrations|frozen/.test(fs.readFileSync(f, "utf8")))];
  const rootSet = new Set(roots);
  const program = ts.createProgram({ rootNames: roots, options, oldProgram });
  oldProgram = program;
  const checker = program.getTypeChecker();
  const used = new Set();          // declaration nodes referenced from outside themselves
  const memberNames = new Set();   // property names accessed anywhere (conservative member use)
  const mark = (id) => {
    let sym;
    try { sym = checker.getSymbolAtLocation(id); } catch { return; }
    const seen = new Set();
    while (sym && !seen.has(sym)) {
      seen.add(sym);
      for (const decl of sym.declarations ?? []) {
        if (decl.name === id) continue;
        if (!within(id, containerOf(decl))) used.add(decl);
      }
      if (!(sym.flags & ts.SymbolFlags.Alias)) break;
      try { sym = checker.getImmediateAliasedSymbol(sym); } catch { break; }
    }
  };
  for (const sf of program.getSourceFiles()) {
    if (!rootSet.has(path.resolve(sf.fileName))) continue;
    const visit = (node) => {
      if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) {
        const p = node.parent;
        const isDeclName = p && p.name === node && (ts.isDeclaration(p) || ts.isPropertyAssignment(p)) && !ts.isPropertyAccessExpression(p);
        if (ts.isPropertyAccessExpression(p) && p.name === node) memberNames.add(node.text);
        if (ts.isBindingElement(p) && p.propertyName === node) memberNames.add(node.text);
        if (ts.isShorthandPropertyAssignment(p) || (ts.isBindingElement(p) && !p.propertyName && p.name === node)) memberNames.add(node.text);
        if (!isDeclName || ts.isImportSpecifier(p) || ts.isExportSpecifier(p)) mark(node);
        if (ts.isExportSpecifier(p) && p.propertyName === node) mark(node);
      } else if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
        memberNames.add(node.argumentExpression.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
  let changed = 0;
  for (const file of roots.filter(isTarget)) {
    const sf = program.getSourceFile(file);
    if (!sf) continue;
    const remove = [];
    const unused = (decl) => !used.has(decl);
    for (const st of sf.statements) {
      if ((ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st)
        || ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) && st.name) {
        // Overloads share one symbol: any used declaration keeps them all.
        const sym = checker.getSymbolAtLocation(st.name);
        const all = sym?.declarations?.filter((d) => d.getSourceFile() === sf) ?? [st];
        if (all.every(unused)) { remove.push(st); continue; }
        if (ts.isClassDeclaration(st)) for (const m of st.members) {
          if (ts.isConstructorDeclaration(m) || ts.isIndexSignatureDeclaration(m) || !m.name || ts.isComputedPropertyName(m.name)) continue;
          const name = m.name.getText(sf);
          if (KEEP_MEMBERS.has(name) || memberNames.has(name.replace(/^#/, ""))) continue;
          const msym = checker.getSymbolAtLocation(m.name);
          if ((msym?.declarations ?? [m]).every(unused)) remove.push(m);
        }
      } else if (ts.isVariableStatement(st)) {
        const decls = st.declarationList.declarations;
        if (decls.every((d) => ts.isIdentifier(d.name)) && decls.every(unused)) remove.push(st);
      } else if (ts.isImportDeclaration(st) && st.importClause) {
        const c = st.importClause, parts = [];
        if (c.name) parts.push(c);
        if (c.namedBindings && ts.isNamespaceImport(c.namedBindings)) parts.push(c.namedBindings);
        if (c.namedBindings && ts.isNamedImports(c.namedBindings)) parts.push(...c.namedBindings.elements);
        const dead = parts.filter(unused);
        if (parts.length && dead.length === parts.length) remove.push(st);
        else remove.push(...dead.map((d) => (d === c ? c.name : d)));
      } else if (ts.isExportDeclaration(st) && st.exportClause && ts.isNamedExports(st.exportClause)) {
        const els = st.exportClause.elements, dead = els.filter(unused);
        if (els.length && dead.length === els.length) remove.push(st);
        else remove.push(...dead);
      }
    }
    if (!remove.length) continue;
    let text = sf.getFullText();
    const ranges = remove.map((n) => {
      if (ts.isImportSpecifier(n) || ts.isExportSpecifier(n) || ts.isIdentifier(n) || ts.isNamespaceImport(n)) {
        let s = n.getStart(sf), e = n.getEnd();
        const after = text.slice(e).match(/^\s*,/);
        if (after) e += after[0].length;
        else { const before = text.slice(0, s).match(/,\s*$/); if (before) s -= before[0].length; }
        return [s, e];
      }
      return [n.getFullStart(), n.getEnd()];
    }).sort((a, b) => b[0] - a[0]);
    let last = Infinity;
    for (const [s, e] of ranges) { if (e > last) continue; text = text.slice(0, s) + text.slice(e); last = s; }
    text = text.replace(/import\s+(type\s+)?(\w+)\s*,\s*\{\s*\}\s*from/g, "import $1$2 from")
      .replace(/^import\s+(type\s+)?\{\s*\}\s*from\s*['"][^'"]+['"];?[ \t]*\n?/gm, "")
      .replace(/^export\s+(type\s+)?\{\s*\}\s*from\s*['"][^'"]+['"];?[ \t]*\n?/gm, "");
    changed += write(file, text);
  }
  return changed;
};

// Frozen copies no migration folder reaches, and files left without statements.
const IMPORT = /(?:^|\n)\s*(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\sfrom\s+)?['"](\.{1,2}\/[^'"]+)['"]|\bimport\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g;
const deleteUnreached = () => {
  const resolve = (from, spec) => { const p = path.resolve(path.dirname(from), spec); return p.endsWith(".js") ? `${p.slice(0, -3)}.ts` : `${p}.ts`; };
  const reached = new Set(), pending = walk(path.join(area, "migrations"));
  while (pending.length) {
    const file = pending.pop();
    if (reached.has(file) || !fs.existsSync(file)) continue;
    reached.add(file);
    for (const m of fs.readFileSync(file, "utf8").matchAll(IMPORT)) pending.push(resolve(file, m[1] ?? m[2]));
  }
  let deleted = 0;
  for (const file of targets()) {
    const empty = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true).statements.length === 0;
    if (empty || !reached.has(file)) { fs.unlinkSync(file); deleted += 1; }
  }
  for (const root of targetRoots) {
    const removeEmptyDirs = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) removeEmptyDirs(path.join(dir, e.name)); if (dir !== root && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir); };
    removeEmptyDirs(root);
  }
  return deleted;
};

const tidy = () => targets().reduce((n, file) => {
  let t = fs.readFileSync(file, "utf8");
  t = t.replace(/[ \t]+\n/g, "\n")                    // whitespace-only remains of removed specifiers
    .replace(/(\{)\n(?:\s*\n)+/g, "$1\n")             // blank lines right after an opening brace
    .replace(/\n(?:[ \t]*\n){2,}/g, "\n\n")            // at most one blank line in a row
    .replace(/^\n+/, "")
    .replace(/(import\s+(?:type\s+)?)\{\s*\n\s*([^{}\n]+?),?\s*\n\s*\}/g, (_, head, name) => `${head}{ ${name.trim().replace(/,$/, "")} }`);
  return n + write(file, t);
}, 0);

let round = 0;
for (;;) {
  round += 1;
  const stripped = stripImplements(), pruned = pruneOnce(), deleted = deleteUnreached();
  process.stderr.write(`round ${round}: ${stripped} implements dropped, ${pruned} files pruned, ${deleted} files deleted\n`);
  if (!stripped && !pruned && !deleted) break;
}
console.log(`pruned in ${round} rounds; tidied ${tidy()} files`);

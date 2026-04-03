#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
const packageJsonPath = path.join(appRoot, 'package.json');

function fail(message) {
  console.error(`[guard:web-boundary] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(packageJsonPath)) {
  fail(`package.json not found at ${packageJsonPath}`);
}

const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const dependencies = pkg.dependencies ?? {};

if (dependencies['autobyteus-ts']) {
  fail(
    "Invalid dependency: package.json dependencies must not include 'autobyteus-ts'. " +
      'Use local frontend utilities instead of cross-workspace imports.',
  );
}

const staleWorkspaceLink = path.join(appRoot, 'node_modules', 'autobyteus-ts');
if (fs.existsSync(staleWorkspaceLink)) {
  const stat = fs.lstatSync(staleWorkspaceLink);
  if (stat.isSymbolicLink()) {
    const targetPath = fs.realpathSync(staleWorkspaceLink);
    if (!targetPath.startsWith(`${appRoot}${path.sep}`)) {
      fs.unlinkSync(staleWorkspaceLink);
      console.warn(
        `[guard:web-boundary] Removed stale external symlink: ${staleWorkspaceLink} -> ${targetPath}`,
      );
    }
  } else {
    fail(
      `Invalid local node_modules entry at ${staleWorkspaceLink}. ` +
        "Run 'pnpm install' in autobyteus-web to reset dependencies.",
    );
  }
}

const includeDirs = [
  'components',
  'composables',
  'electron',
  'graphql',
  'pages',
  'plugins',
  'services',
  'stores',
  'types',
  'utils',
];

const fileExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.vue']);
const scriptExtensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.sh']);
const importPatterns = [
  /from\s+['"]autobyteus-ts(?:\/[^'"]*)?['"]/,
  /require\(\s*['"]autobyteus-ts(?:\/[^'"]*)?['"]\s*\)/,
  /from\s+['"](?:\.\.\/)+autobyteus-ts\/[^'"]+['"]/,
  /require\(\s*['"](?:\.\.\/)+autobyteus-ts\/[^'"]+['"]\s*\)/,
];

function walkDir(dirPath, collector, extensions = fileExtensions) {
  if (!fs.existsSync(dirPath)) {
    return;
  }
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, collector, extensions);
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      collector(fullPath);
    }
  }
}

const violations = [];
const guardScriptRelativePath = path.join('scripts', 'guard-web-boundary.mjs');

for (const dir of includeDirs) {
  walkDir(path.join(appRoot, dir), (filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (importPatterns.some((pattern) => pattern.test(line))) {
        violations.push(`${path.relative(appRoot, filePath)}:${index + 1}: ${line.trim()}`);
      }
    }
  });
}

walkDir(path.join(appRoot, 'scripts'), (filePath) => {
  const relativePath = path.relative(appRoot, filePath);
  if (relativePath === guardScriptRelativePath) {
    return;
  }

  if (!scriptExtensions.has(path.extname(filePath))) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.includes('autobyteus-ts')) {
      violations.push(`${relativePath}:${index + 1}: ${line.trim()}`);
    }
  }
}, scriptExtensions);

if (violations.length > 0) {
  fail(
    'Direct autobyteus-ts dependencies are not allowed in active autobyteus-web code:\n' +
      violations.join('\n'),
  );
}

console.log('[guard:web-boundary] Passed.');

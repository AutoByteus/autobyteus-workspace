#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const appRoot = process.cwd();
const includeDirs = ['app.vue', 'components', 'composables', 'layouts', 'pages', 'plugins', 'services', 'stores', 'types'];
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.vue']);
const violations = [];

const allowedCatalogImportFragments = [
  `${path.sep}localization${path.sep}runtime${path.sep}`,
  `${path.sep}localization${path.sep}messages${path.sep}`,
];

const allowedRawLocaleAccessFragments = [
  `${path.sep}localization${path.sep}runtime${path.sep}systemLocaleResolver.ts`,
];

function walk(entryPath, collector) {
  if (!fs.existsSync(entryPath)) {
    return;
  }

  const stat = fs.statSync(entryPath);
  if (stat.isFile()) {
    collector(entryPath);
    return;
  }

  for (const entry of fs.readdirSync(entryPath, { withFileTypes: true })) {
    const fullPath = path.join(entryPath, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, collector);
      continue;
    }

    if (extensions.has(path.extname(entry.name))) {
      collector(fullPath);
    }
  }
}

function isAllowedCatalogImport(relativePath) {
  return allowedCatalogImportFragments.some((fragment) => relativePath.includes(fragment));
}

function isAllowedRawLocaleAccess(relativePath) {
  return allowedRawLocaleAccessFragments.some((fragment) => relativePath.includes(fragment));
}

for (const includeDir of includeDirs) {
  walk(path.join(appRoot, includeDir), (filePath) => {
    const relativePath = path.relative(appRoot, filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const trimmed = line.trim();

      if (
        trimmed.includes('localization/messages/') &&
        !isAllowedCatalogImport(filePath)
      ) {
        violations.push(`${relativePath}:${index + 1}: direct localization/messages import is forbidden outside localization/runtime and localization/messages.`);
      }

      if (
        /from\s+['"]vue-i18n['"]/.test(trimmed) ||
        /useI18n\s*\(/.test(trimmed)
      ) {
        violations.push(`${relativePath}:${index + 1}: raw vue-i18n usage is forbidden; use LocalizationRuntime/useLocalization.`);
      }

      if (!isAllowedRawLocaleAccess(filePath)) {
        if (trimmed.includes('navigator.language') || trimmed.includes('navigator.languages')) {
          violations.push(`${relativePath}:${index + 1}: direct navigator locale access is forbidden outside systemLocaleResolver.`);
        }

        if (trimmed.includes('electronAPI.getAppLocale(')) {
          violations.push(`${relativePath}:${index + 1}: direct electron locale access is forbidden outside systemLocaleResolver.`);
        }
      }
    }
  });
}

if (violations.length > 0) {
  console.error('[guard:localization-boundary] Failed.');
  console.error(violations.join('\n'));
  process.exit(1);
}

console.log('[guard:localization-boundary] Passed.');

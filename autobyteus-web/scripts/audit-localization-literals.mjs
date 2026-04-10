#!/usr/bin/env node

import { localizationMigrationScopes } from '../localization/audit/migrationScopes.ts';
import { auditLocalizationLiterals } from './lib/localizationLiteralAudit.mjs';

const findings = auditLocalizationLiterals({
  appRoot: process.cwd(),
  scopes: localizationMigrationScopes,
});

if (findings.length > 0) {
  console.error('[audit:localization-literals] Unresolved product literals found.');
  for (const finding of findings) {
    console.error(`${finding.scopeId}\t${finding.file}\t${finding.finding}\t${finding.status}`);
  }
  process.exit(1);
}

console.log('[audit:localization-literals] Passed with zero unresolved findings.');

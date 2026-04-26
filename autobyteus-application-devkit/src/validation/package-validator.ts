import fs from 'node:fs/promises';
import path from 'node:path';
import { validateApplicationRoot } from './application-root-validator.js';
import { createValidationResult, errorDiagnostic, type ValidationDiagnostic, type ValidationResult } from './validation-result.js';
import { pathExists, statIfExists } from './validation-helpers.js';

export const validateApplicationPackage = async (packageRoot: string): Promise<ValidationResult> => {
  const diagnostics: ValidationDiagnostic[] = [];
  const resolvedPackageRoot = path.resolve(packageRoot);
  const applicationsRoot = path.join(resolvedPackageRoot, 'applications');

  if (await pathExists(path.join(resolvedPackageRoot, 'application.json'))) {
    diagnostics.push(
      errorDiagnostic(
        'PACKAGE_ROOT_NOT_IMPORTABLE',
        'Package root appears to be a source/application root. Import dist/importable-package instead.',
        resolvedPackageRoot,
      ),
    );
  }

  const applicationsStat = await statIfExists(applicationsRoot);
  if (!applicationsStat?.isDirectory()) {
    diagnostics.push(errorDiagnostic('MISSING_APPLICATIONS_ROOT', 'package root must contain applications/.', applicationsRoot));
    return createValidationResult(diagnostics);
  }

  const entries = await fs.readdir(applicationsRoot, { withFileTypes: true });
  const applicationEntries = entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'));
  if (applicationEntries.length === 0) {
    diagnostics.push(errorDiagnostic('NO_APPLICATIONS', 'applications/ must contain at least one application directory.', applicationsRoot));
  }
  for (const entry of applicationEntries) {
    await validateApplicationRoot({ packageRoot: resolvedPackageRoot, localApplicationId: entry.name, diagnostics });
  }

  return createValidationResult(diagnostics);
};

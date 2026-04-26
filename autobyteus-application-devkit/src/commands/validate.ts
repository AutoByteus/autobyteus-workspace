import path from 'node:path';
import { validateApplicationPackage } from '../validation/package-validator.js';
import { formatValidationDiagnostics } from '../validation/validation-result.js';
import { parseCommandOptions, readStringFlag } from './command-options.js';

export const runValidateCommand = async (args: string[]): Promise<void> => {
  const options = parseCommandOptions(args);
  const packageRoot = readStringFlag(options, 'package-root') ?? path.resolve(process.cwd(), 'dist', 'importable-package');
  const result = await validateApplicationPackage(packageRoot);
  if (!result.valid) {
    console.error(formatValidationDiagnostics(result));
    process.exitCode = 1;
    return;
  }
  console.log(`Package is valid: ${path.resolve(packageRoot)}`);
};

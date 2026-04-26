import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeLocalApplicationId } from '../validation/local-application-id.js';

export type ApplicationTemplateOptions = {
  targetDirectory: string;
  applicationId: string;
  applicationName: string;
  packageName?: string | null;
  force?: boolean | null;
};

export type ApplicationTemplateResult = {
  projectRoot: string;
  applicationId: string;
  applicationName: string;
  packageName: string;
};

const TEMPLATE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'templates',
  'basic',
);

const SOURCE_TEMPLATE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'templates',
  'basic',
);

const isTextTemplateFile = (filePath: string): boolean => {
  const extension = path.extname(filePath).toLowerCase();
  return ['.json', '.mjs', '.ts', '.html', '.css', '.md', '.svg', '.gitignore', ''].includes(extension)
    || path.basename(filePath) === '.gitignore';
};

const toSafePackageName = (applicationId: string): string => (
  applicationId
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'custom-autobyteus-application'
);

const assertTargetDirectoryReady = async (targetDirectory: string, force: boolean): Promise<void> => {
  let entries: string[] = [];
  try {
    entries = await fs.readdir(targetDirectory);
  } catch {
    return;
  }
  if (entries.length > 0 && !force) {
    throw new Error(`Target directory is not empty: ${targetDirectory}`);
  }
};

const renderTemplateContent = (content: string, variables: Record<string, string>): string => (
  Object.entries(variables).reduce(
    (nextContent, [key, value]) => nextContent.replaceAll(`__${key}__`, value),
    content,
  )
);

const resolveExistingTemplateRoot = async (): Promise<string> => {
  try {
    await fs.access(TEMPLATE_ROOT);
    return TEMPLATE_ROOT;
  } catch {
    return SOURCE_TEMPLATE_ROOT;
  }
};

const copyTemplateTree = async (input: {
  sourceRoot: string;
  targetRoot: string;
  variables: Record<string, string>;
  currentSourceRoot?: string;
}): Promise<void> => {
  const sourceRoot = input.currentSourceRoot ?? input.sourceRoot;
  const entries = await fs.readdir(sourceRoot, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceRoot, entry.name);
    const relativePath = path.relative(input.sourceRoot, sourcePath);
    const targetPath = path.join(input.targetRoot, relativePath);
    if (entry.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true });
      await copyTemplateTree({ ...input, currentSourceRoot: sourcePath });
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    if (!isTextTemplateFile(sourcePath)) {
      await fs.copyFile(sourcePath, targetPath);
      continue;
    }
    const content = await fs.readFile(sourcePath, 'utf8');
    await fs.writeFile(targetPath, renderTemplateContent(content, input.variables), 'utf8');
  }
};

export const materializeApplicationTemplate = async (
  options: ApplicationTemplateOptions,
): Promise<ApplicationTemplateResult> => {
  const applicationId = normalizeLocalApplicationId(options.applicationId, 'Application id');
  const applicationName = options.applicationName.trim();
  if (!applicationName) {
    throw new Error('Application name is required.');
  }
  const projectRoot = path.resolve(options.targetDirectory);
  const packageName = options.packageName?.trim() || `@autobyteus-custom/${toSafePackageName(applicationId)}`;
  await assertTargetDirectoryReady(projectRoot, Boolean(options.force));
  await fs.mkdir(projectRoot, { recursive: true });

  const sourceRoot = await resolveExistingTemplateRoot();
  await copyTemplateTree({
    sourceRoot,
    targetRoot: projectRoot,
    variables: {
      APPLICATION_ID: applicationId,
      APPLICATION_NAME: applicationName,
      PACKAGE_NAME: packageName,
    },
  });

  return { projectRoot, applicationId, applicationName, packageName };
};

import path from 'node:path';
import type { ResolvedApplicationDevkitConfig } from '../config/application-devkit-config.js';
import { normalizeLocalApplicationId } from '../validation/local-application-id.js';

export type ResolvedApplicationProjectPaths = {
  projectRoot: string;
  applicationManifestPath: string;
  sourceFrontendRoot: string;
  sourceFrontendEntryPoint: string;
  sourceFrontendEntryHtml: string;
  sourceBackendRoot: string;
  sourceBackendEntryPoint: string;
  sourceMigrationsRoot: string | null;
  sourceBackendAssetsRoot: string | null;
  sourceAgentsRoot: string;
  sourceAgentTeamsRoot: string;
  outputPackageRoot: string;
  generatedApplicationsRoot: string;
  generatedApplicationRoot: string;
  generatedUiRoot: string;
  generatedBackendRoot: string;
  devOutputRoot: string;
  devUiRoot: string;
};


const assertDirectChild = (parentPath: string, targetPath: string, fieldName: string): void => {
  const parent = path.resolve(parentPath);
  const target = path.resolve(targetPath);
  if (target !== parent && path.dirname(target) === parent) {
    return;
  }
  throw new Error(`${fieldName} must be a direct child of ${parent}.`);
};

const assertInside = (rootPath: string, targetPath: string, fieldName: string): void => {
  const root = path.resolve(rootPath);
  const target = path.resolve(targetPath);
  if (target === root || target.startsWith(`${root}${path.sep}`)) {
    return;
  }
  throw new Error(`${fieldName} must stay inside the project root.`);
};

const resolveProjectRelativePath = (
  projectRoot: string,
  rawPath: string,
  fieldName: string,
): string => {
  const normalized = rawPath.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  if (path.isAbsolute(normalized)) {
    throw new Error(`${fieldName} must be relative to the project root.`);
  }
  const resolved = path.resolve(projectRoot, normalized);
  assertInside(projectRoot, resolved, fieldName);
  return resolved;
};

const resolveOutputPath = (
  projectRoot: string,
  rawPath: string,
  fieldName: string,
): string => {
  const normalized = rawPath.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  const resolved = path.isAbsolute(normalized)
    ? path.resolve(normalized)
    : path.resolve(projectRoot, normalized);
  const filesystemRoot = path.parse(resolved).root;
  if (resolved === filesystemRoot || resolved === path.resolve(projectRoot)) {
    throw new Error(`${fieldName} cannot be the filesystem root or project root.`);
  }
  return resolved;
};

const isSameOrInside = (parentPath: string, candidatePath: string): boolean => {
  const parent = path.resolve(parentPath);
  const candidate = path.resolve(candidatePath);
  return candidate === parent || candidate.startsWith(`${parent}${path.sep}`);
};

const assertNoOverlap = (leftPath: string, rightPath: string, message: string): void => {
  if (isSameOrInside(leftPath, rightPath) || isSameOrInside(rightPath, leftPath)) {
    throw new Error(message);
  }
};

const resolveOptionalChildPath = (
  parentPath: string,
  rawPath: string | null,
  fieldName: string,
): string | null => {
  if (!rawPath) {
    return null;
  }
  const normalized = rawPath.trim();
  if (!normalized) {
    return null;
  }
  if (path.isAbsolute(normalized)) {
    throw new Error(`${fieldName} must be relative to its source root.`);
  }
  const resolved = path.resolve(parentPath, normalized);
  assertInside(parentPath, resolved, fieldName);
  return resolved;
};

export const resolveApplicationProjectPaths = (input: {
  projectRoot: string;
  config: ResolvedApplicationDevkitConfig;
  localApplicationId: string;
  outputPackageRootOverride?: string | null;
}): ResolvedApplicationProjectPaths => {
  const projectRoot = path.resolve(input.projectRoot);
  const outputPackageRoot = resolveOutputPath(
    projectRoot,
    input.outputPackageRootOverride ?? input.config.output.packageRoot,
    'output.packageRoot',
  );
  const sourceFrontendRoot = resolveProjectRelativePath(projectRoot, input.config.source.frontendDir, 'source.frontendDir');
  const sourceBackendRoot = resolveProjectRelativePath(projectRoot, input.config.source.backendDir, 'source.backendDir');
  const sourceAgentsRoot = resolveProjectRelativePath(projectRoot, input.config.source.agentsDir, 'source.agentsDir');
  const sourceAgentTeamsRoot = resolveProjectRelativePath(
    projectRoot,
    input.config.source.agentTeamsDir,
    'source.agentTeamsDir',
  );
  const sourceRoot = path.join(projectRoot, 'src');
  const sourceRoots = [
    { path: sourceRoot, label: 'the editable src/ tree' },
    { path: sourceFrontendRoot, label: 'source.frontendDir' },
    { path: sourceBackendRoot, label: 'source.backendDir' },
    { path: sourceAgentsRoot, label: 'source.agentsDir' },
    { path: sourceAgentTeamsRoot, label: 'source.agentTeamsDir' },
  ];
  for (const source of sourceRoots) {
    assertNoOverlap(source.path, outputPackageRoot, `output.packageRoot must not overlap ${source.label}.`);
  }

  const generatedApplicationsRoot = path.join(outputPackageRoot, 'applications');
  const generatedApplicationRoot = path.join(generatedApplicationsRoot, input.localApplicationId);
  assertDirectChild(generatedApplicationsRoot, generatedApplicationRoot, 'generatedApplicationRoot');
  normalizeLocalApplicationId(input.localApplicationId, 'localApplicationId');
  return {
    projectRoot,
    applicationManifestPath: path.join(projectRoot, 'application.json'),
    sourceFrontendRoot,
    sourceFrontendEntryPoint: resolveOptionalChildPath(
      sourceFrontendRoot,
      input.config.frontend.entryPoint,
      'frontend.entryPoint',
    )!,
    sourceFrontendEntryHtml: resolveOptionalChildPath(sourceFrontendRoot, input.config.frontend.entryHtml, 'frontend.entryHtml')!,
    sourceBackendRoot,
    sourceBackendEntryPoint: resolveOptionalChildPath(sourceBackendRoot, input.config.backend.entryPoint, 'backend.entryPoint')!,
    sourceMigrationsRoot: resolveOptionalChildPath(sourceBackendRoot, input.config.backend.migrationsDir, 'backend.migrationsDir'),
    sourceBackendAssetsRoot: resolveOptionalChildPath(sourceBackendRoot, input.config.backend.assetsDir, 'backend.assetsDir'),
    sourceAgentsRoot,
    sourceAgentTeamsRoot,
    outputPackageRoot,
    generatedApplicationsRoot,
    generatedApplicationRoot,
    generatedUiRoot: path.join(generatedApplicationRoot, 'ui'),
    generatedBackendRoot: path.join(generatedApplicationRoot, 'backend'),
    devOutputRoot: path.join(projectRoot, 'dist', 'dev'),
    devUiRoot: path.join(projectRoot, 'dist', 'dev', 'ui'),
  };
};

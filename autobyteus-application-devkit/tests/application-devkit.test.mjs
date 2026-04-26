import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createDevBootstrapSession,
  materializeApplicationTemplate,
  packApplicationProject,
  validateApplicationPackage,
} from '../dist/index.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tempRoot = path.join(packageRoot, '.tmp-tests');

const createTempDirectory = async (name) => {
  const directory = path.join(tempRoot, `${Date.now()}-${process.pid}-${name}`);
  await fs.rm(directory, { recursive: true, force: true });
  await fs.mkdir(directory, { recursive: true });
  return directory;
};

test('create materializes the canonical source/dist project layout', async () => {
  const target = path.join(await createTempDirectory('create'), 'sample-app');
  await materializeApplicationTemplate({
    targetDirectory: target,
    applicationId: 'sample-app',
    applicationName: 'Sample App',
  });

  assert.equal(await fileExists(path.join(target, 'application.json')), true);
  assert.equal(await fileExists(path.join(target, 'autobyteus-app.config.mjs')), true);
  assert.equal(await fileExists(path.join(target, 'src/frontend/app.ts')), true);
  assert.equal(await fileExists(path.join(target, 'src/backend/index.ts')), true);
  assert.equal(await fileExists(path.join(target, 'ui')), false);
  assert.equal(await fileExists(path.join(target, 'backend')), false);
});

test('pack emits a valid importable package under dist/importable-package', async () => {
  const target = path.join(await createTempDirectory('pack'), 'sample-app');
  await materializeApplicationTemplate({
    targetDirectory: target,
    applicationId: 'sample-app',
    applicationName: 'Sample App',
  });

  const result = await packApplicationProject({ projectRoot: target });
  const appRoot = path.join(result.packageRoot, 'applications/sample-app');

  assert.equal(result.validation.valid, true);
  assert.equal(await fileExists(path.join(appRoot, 'application.json')), true);
  assert.equal(await fileExists(path.join(appRoot, 'ui/index.html')), true);
  assert.equal(await fileExists(path.join(appRoot, 'ui/app.js')), true);
  assert.equal(await fileExists(path.join(appRoot, 'backend/bundle.json')), true);
  assert.equal(await fileExists(path.join(appRoot, 'backend/dist/entry.mjs')), true);
  assert.equal(await fileExists(path.join(target, 'ui')), false);
  assert.equal(await fileExists(path.join(target, 'backend')), false);

  const validation = await validateApplicationPackage(result.packageRoot);
  assert.equal(validation.valid, true);
});

test('validator reports actionable diagnostics for missing generated files', async () => {
  const target = path.join(await createTempDirectory('invalid'), 'sample-app');
  await materializeApplicationTemplate({
    targetDirectory: target,
    applicationId: 'sample-app',
    applicationName: 'Sample App',
  });
  const result = await packApplicationProject({ projectRoot: target });
  await fs.rm(path.join(result.packageRoot, 'applications/sample-app/ui/index.html'));

  const validation = await validateApplicationPackage(result.packageRoot);
  assert.equal(validation.valid, false);
  assert.equal(validation.diagnostics.some((diagnostic) => (
    diagnostic.code === 'MISSING_PACKAGE_FILE'
    && diagnostic.message.includes('ui.entryHtml')
  )), true);
});

test('pack rejects unsafe application ids before package writes', async (t) => {
  for (const unsafeId of ['../escaped', 'a/b']) {
    await t.test(unsafeId, async () => {
      const target = path.join(await createTempDirectory(`unsafe-id-${unsafeId.replace(/[^a-z0-9]/gi, '-')}`), 'sample-app');
      await materializeApplicationTemplate({
        targetDirectory: target,
        applicationId: 'sample-app',
        applicationName: 'Sample App',
      });
      await rewriteApplicationManifest(target, { id: unsafeId });

      await assert.rejects(
        () => packApplicationProject({ projectRoot: target }),
        /application\.json id .*only letters, numbers, underscores, or hyphens/,
      );
      assert.equal(await fileExists(path.join(target, 'dist/importable-package')), false);
    });
  }
});

test('pack validates generated application roots as direct applications children', async () => {
  const target = path.join(await createTempDirectory('path-owner-unsafe-id'), 'sample-app');
  await materializeApplicationTemplate({
    targetDirectory: target,
    applicationId: 'sample-app',
    applicationName: 'Sample App',
  });

  const { DEFAULT_APPLICATION_DEVKIT_CONFIG, resolveApplicationProjectPaths } = await import('../dist/index.js');
  assert.throws(
    () => resolveApplicationProjectPaths({
      projectRoot: target,
      config: DEFAULT_APPLICATION_DEVKIT_CONFIG,
      localApplicationId: '../escaped',
    }),
    /generatedApplicationRoot must be a direct child/,
  );
  assert.throws(
    () => resolveApplicationProjectPaths({
      projectRoot: target,
      config: DEFAULT_APPLICATION_DEVKIT_CONFIG,
      localApplicationId: 'a/b',
    }),
    /generatedApplicationRoot must be a direct child/,
  );
});

test('pack rejects agents and agent-teams source/output overlap before output cleanup', async (t) => {
  for (const sourceField of ['agentsDir', 'agentTeamsDir']) {
    await t.test(sourceField, async () => {
      const target = path.join(await createTempDirectory(`overlap-${sourceField}`), 'sample-app');
      await materializeApplicationTemplate({
        targetDirectory: target,
        applicationId: 'sample-app',
        applicationName: 'Sample App',
      });
      await writeDevkitConfig(target, {
        source: {
          [sourceField]: 'dist/importable-package',
        },
        output: {
          packageRoot: 'dist/importable-package',
        },
      });
      const sentinelPath = path.join(target, 'dist/importable-package/source-sentinel.txt');
      await fs.mkdir(path.dirname(sentinelPath), { recursive: true });
      await fs.writeFile(sentinelPath, 'keep-source', 'utf8');

      await assert.rejects(
        () => packApplicationProject({ projectRoot: target }),
        (error) => error instanceof Error
          && error.message.includes(`output.packageRoot must not overlap source.${sourceField}.`),
      );
      assert.equal(await fs.readFile(sentinelPath, 'utf8'), 'keep-source');
    });
  }
});

test('validator reports unsafe local application ids in generated packages', async () => {
  const target = path.join(await createTempDirectory('unsafe-validate'), 'sample-app');
  await materializeApplicationTemplate({
    targetDirectory: target,
    applicationId: 'sample-app',
    applicationName: 'Sample App',
  });
  const result = await packApplicationProject({ projectRoot: target });
  await rewriteApplicationManifest(path.join(result.packageRoot, 'applications/sample-app'), { id: 'a/b' });

  const validation = await validateApplicationPackage(result.packageRoot);
  assert.equal(validation.valid, false);
  assert.equal(validation.diagnostics.some((diagnostic) => (
    diagnostic.code === 'INVALID_LOCAL_APPLICATION_ID'
    && diagnostic.message.includes('application.json id')
  )), true);
});

test('dev bootstrap session uses v3 launch hints and one real-backend application identity', () => {
  const session = createDevBootstrapSession({
    hostOrigin: 'http://127.0.0.1:43124',
    iframeLaunchId: 'application-local:%2Fworkspace__sample-app::dev-launch',
    localApplicationId: 'sample-app',
    applicationId: 'application-local:%2Fworkspace__sample-app',
    applicationName: 'Sample App',
    backendBaseUrl: 'http://127.0.0.1:43123/rest/applications/application-local:%2Fworkspace__sample-app/backend',
    backendNotificationsUrl: null,
  });

  assert.match(session.iframePath, /autobyteusContractVersion=3/);
  assert.match(session.iframePath, /autobyteusApplicationId=application-local/);
  assert.match(session.iframePath, /autobyteusIframeLaunchId=/);
  assert.match(session.iframePath, /autobyteusHostOrigin=http/);
  assert.equal(session.bootstrapEnvelope.payload.application.applicationId, 'application-local:%2Fworkspace__sample-app');
  assert.equal(session.bootstrapEnvelope.payload.requestContext.applicationId, 'application-local:%2Fworkspace__sample-app');
  assert.equal(session.bootstrapEnvelope.payload.iframeLaunchId, 'application-local:%2Fworkspace__sample-app::dev-launch');
});

const rewriteApplicationManifest = async (projectRoot, overrides) => {
  const manifestPath = path.join(projectRoot, 'application.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
  await fs.writeFile(manifestPath, `${JSON.stringify({ ...manifest, ...overrides }, null, 2)}\n`, 'utf8');
};

const writeDevkitConfig = async (projectRoot, config) => {
  await fs.writeFile(
    path.join(projectRoot, 'autobyteus-app.config.mjs'),
    `export default ${JSON.stringify(config, null, 2)};\n`,
    'utf8',
  );
};

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

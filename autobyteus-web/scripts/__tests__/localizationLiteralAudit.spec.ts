import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { auditLocalizationLiterals } from '../lib/localizationLiteralAudit.mjs';

const tempDirs: string[] = [];

function createFixtureDir(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'localization-audit-'));
  tempDirs.push(dir);

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(dir, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
  }

  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('auditLocalizationLiterals', () => {
  it('flags raw literals in mixed templates instead of suppressing the whole file', () => {
    const appRoot = createFixtureDir({
      'components/MixedLiteral.vue': `
<template>
  <section>
    <h1>{{ $t('demo.title') }}</h1>
    <p>Run Verification</p>
  </section>
</template>
`,
    });

    const findings = auditLocalizationLiterals({
      appRoot,
      scopes: [{ scopeId: 'M-002', include: ['components/'] }],
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scopeId: 'M-002',
          file: 'components/MixedLiteral.vue',
          finding: 'Run Verification',
          status: 'unresolved',
        }),
      ]),
    );
  });

  it('flags raw user-facing labels in producer ts files', () => {
    const appRoot = createFixtureDir({
      'composables/useRightSideTabs.ts': `
export const tabs = [
  { name: 'files', label: 'Files' },
  { name: 'progress', label: localizationRuntime.translate('shell.rightTabs.activity') },
];
`,
    });

    const findings = auditLocalizationLiterals({
      appRoot,
      scopes: [{ scopeId: 'M-013', include: ['composables/'] }],
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scopeId: 'M-013',
          file: 'composables/useRightSideTabs.ts',
          finding: 'Files',
          status: 'unresolved',
        }),
      ]),
    );
  });

  it('flags raw literals returned from vue script setup blocks', () => {
    const appRoot = createFixtureDir({
      'components/app/AppUpdateNotice.vue': `
<template>
  <p>{{ statusMessage }}</p>
</template>
<script setup lang="ts">
const statusMessage = computed(() => {
  return 'Update downloaded. Restart to install.';
});
</script>
`,
    });

    const findings = auditLocalizationLiterals({
      appRoot,
      scopes: [{ scopeId: 'M-001', include: ['components/'] }],
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scopeId: 'M-001',
          file: 'components/app/AppUpdateNotice.vue#script-1',
          finding: 'Update downloaded. Restart to install.',
          status: 'unresolved',
        }),
      ]),
    );
  });

  it('flags raw toast strings in broad store producer files', () => {
    const appRoot = createFixtureDir({
      'stores/appUpdateStore.ts': `
function install() {
  addToast('Update downloaded. Restart to install.', 'success');
}
`,
    });

    const findings = auditLocalizationLiterals({
      appRoot,
      scopes: [{ scopeId: 'M-013', include: ['stores/'] }],
    });

    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          scopeId: 'M-013',
          file: 'stores/appUpdateStore.ts',
          finding: 'Update downloaded. Restart to install.',
          status: 'unresolved',
        }),
      ]),
    );
  });
});

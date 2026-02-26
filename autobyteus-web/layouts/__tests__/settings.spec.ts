import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('settings layout source', () => {
  it('renders standalone settings shell without app chrome', () => {
    const filePath = resolve(process.cwd(), 'layouts/settings.vue');
    const content = readFileSync(filePath, 'utf-8');

    expect(content).toContain('<slot />');
    expect(content).not.toContain('<AppLeftPanel');
    expect(content).not.toContain('settings-layout-back-button');
  });
});

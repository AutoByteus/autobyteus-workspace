import { describe, expect, it } from 'vitest';
import { classifyAppUpdateError } from '../appUpdateErrorClassifier';

describe('classifyAppUpdateError', () => {
  it('classifies transient network diagnostics without using raw text as the safe message', () => {
    const result = classifyAppUpdateError(new Error('net::ERR_CONNECTION_CLOSED'), {
      operation: 'manual-check',
      fallbackMessage: 'Failed to check for updates.',
    });

    expect(result.kind).toBe('network');
    expect(result.message).toContain('Could not reach the update server');
    expect(result.message).not.toContain('net::ERR_CONNECTION_CLOSED');
    expect(result.diagnostic).toContain('net::ERR_CONNECTION_CLOSED');
  });

  it('classifies missing channel metadata as release-preparing', () => {
    const result = classifyAppUpdateError(
      new Error('ERR_UPDATER_CHANNEL_FILE_NOT_FOUND: Cannot find latest-mac.yml'),
      {
        operation: 'startup-check',
        fallbackMessage: 'Failed to check for updates.',
      },
    );

    expect(result.kind).toBe('release-preparing');
    expect(result.message).toContain('still being prepared');
    expect(result.message).not.toContain('latest-mac.yml');
  });

  it('classifies package metadata problems separately from release preparation', () => {
    const result = classifyAppUpdateError(
      new Error('ERR_UPDATER_ZIP_FILE_NOT_FOUND: ZIP file not provided: [{"name":"AutoByteus.dmg"}]'),
      {
        operation: 'manual-check',
        fallbackMessage: 'Failed to check for updates.',
      },
    );

    expect(result.kind).toBe('metadata');
    expect(result.message).toContain('Update information is incomplete');
    expect(result.message).not.toContain('ZIP file not provided');
  });

  it('uses operation fallback for download and install errors', () => {
    expect(classifyAppUpdateError(new Error('disk write failed'), {
      operation: 'download',
      fallbackMessage: 'Failed to download update.',
    }).kind).toBe('download');

    expect(classifyAppUpdateError(new Error('quit failed'), {
      operation: 'install',
      fallbackMessage: 'Failed to install update and restart.',
    }).kind).toBe('install');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { NPM_BEFORE_ENV, resolveNpmBefore } from '../lib/npm-before.mjs';

/**
 * The time bound of the Windows staging `npm install` (autobyteus-345, REQ-004, AC-006): the override, the commit time,
 * neither (the build stops) and an invalid override (refused).
 */
describe('resolveNpmBefore', () => {
  it('takes the override first and does not read the commit', () => {
    const commitTime = vi.fn(() => '2026-11-01T09:12:44+01:00');
    expect(resolveNpmBefore({ env: { [NPM_BEFORE_ENV]: '2026-10-01T00:00:00Z' }, workspaceRoot: '/w', commitTime }))
      .toBe('2026-10-01T00:00:00Z');
    expect(commitTime).not.toHaveBeenCalled();
  });

  it('accepts a plain date as the override', () => {
    expect(resolveNpmBefore({ env: { [NPM_BEFORE_ENV]: ' 2026-10-01 ' }, workspaceRoot: '/w' })).toBe('2026-10-01');
  });

  it('takes the commit time of the workspace HEAD without an override', () => {
    const commitTime = vi.fn(() => '2026-11-01T09:12:44+01:00');
    expect(resolveNpmBefore({ env: {}, workspaceRoot: '/w', commitTime })).toBe('2026-11-01T09:12:44+01:00');
    expect(commitTime).toHaveBeenCalledWith('/w');
  });

  it('treats an empty override as none', () => {
    expect(resolveNpmBefore({ env: { [NPM_BEFORE_ENV]: '  ' }, workspaceRoot: '/w', commitTime: () => '2026-11-01T09:12:44Z' }))
      .toBe('2026-11-01T09:12:44Z');
  });

  it('stops with a clear message when neither is available', () => {
    expect(() => resolveNpmBefore({ env: {}, workspaceRoot: '/w', commitTime: () => { throw new Error('not a git repository'); } }))
      .toThrow(/AUTOBYTEUS_NPM_BEFORE.*ISO 8601|not a git repository/s);
    expect(() => resolveNpmBefore({ env: {}, workspaceRoot: '/w', commitTime: () => '' })).toThrow(/Set AUTOBYTEUS_NPM_BEFORE/);
  });

  it.each(['yesterday', '2026-13-45', '1730000000', '2026-11-01T25:00:00Z'])('refuses an override that is not an ISO 8601 date: %s', (value) => {
    expect(() => resolveNpmBefore({ env: { [NPM_BEFORE_ENV]: value }, workspaceRoot: '/w', commitTime: () => '2026-11-01T09:12:44Z' }))
      .toThrow(/not an ISO 8601/);
  });

  it('reads the real HEAD of this repository by default', () => {
    expect(Number.isNaN(Date.parse(resolveNpmBefore({ env: {}, workspaceRoot: process.cwd() })))).toBe(false);
  });
});

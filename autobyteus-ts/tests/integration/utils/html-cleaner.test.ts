import { describe, it, expect } from 'vitest';
import { clean, CleaningMode } from '../../../src/utils/html-cleaner.js';

describe('html_cleaner (integration)', () => {
  it('cleans HTML without throwing', () => {
    const html = '<div><p>Hello <strong>world</strong></p></div>';
    const result = clean(html, CleaningMode.STANDARD);
    expect(result).toContain('<strong>world</strong>');
  });
});

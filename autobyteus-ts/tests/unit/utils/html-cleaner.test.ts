import { describe, it, expect } from 'vitest';
import { load } from 'cheerio';
import { clean, CleaningMode } from '../../../src/utils/html-cleaner.js';

const SAMPLE_HTML = `
<div>
  <!-- This is a comment -->
  <script>alert('hi');</script>
  <p>Sample</p>
</div>
`;

const COMPLEX_HTML = `
<div class="container">
  <nav class="navigation">
    <ul style="list-style: none;">
      <li class="nav-item"><a href="#home">Home</a></li>
      <li class="nav-item"><a href="#about">About</a></li>
    </ul>
  </nav>
  <main>
    <h1 class="title" data-custom="value">Welcome</h1>
    <p style="color: blue;">This is a <strong>test</strong> paragraph.</p>
    <div></div>
    <img src="data:image/jpeg;base64,/9j/" alt="Embedded image">
    <script>console.log('Hello');</script>
  </main>
</div>
`;

const normalizeHtml = (html: string): string => {
  if (!html.trim()) {
    return '';
  }
  const $ = load(html);
  return $.text().replace(/\s+/g, ' ').trim();
};

describe('html_cleaner', () => {
  it('NONE mode returns original HTML unchanged', () => {
    const result = clean(COMPLEX_HTML, CleaningMode.NONE);
    expect(result).toBe(COMPLEX_HTML);
  });

  it('ULTIMATE mode removes container tags and preserves essential content', () => {
    const result = clean(COMPLEX_HTML, CleaningMode.ULTIMATE);

    expect(result).not.toContain('<div class="container">');
    expect(result).not.toContain('<nav');
    expect(result).toContain('<a href="#home">Home</a>');
    expect(result).toContain('<strong>test</strong>');
    expect(result).not.toContain('style=');
    expect(result).not.toContain('data-custom=');
    expect(result).not.toContain('<div></div>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('data:image/jpeg;base64');
  });

  it('TEXT_CONTENT_FOCUSED mode extracts only text content', () => {
    const result = clean(COMPLEX_HTML, CleaningMode.TEXT_CONTENT_FOCUSED);
    const expected = 'Home About Welcome This is a test paragraph.';
    expect(normalizeHtml(result)).toBe(normalizeHtml(expected));
  });

  it('THOROUGH mode removes classes but keeps structure', () => {
    const result = clean(COMPLEX_HTML, CleaningMode.THOROUGH);
    expect(result).not.toContain('class=');
    expect(result).toContain('<nav>');
    expect(result).toContain('<main>');
    expect(result).toContain('<a href="#home">');
  });

  it('STANDARD mode preserves classes but removes styles', () => {
    const result = clean(COMPLEX_HTML, CleaningMode.STANDARD);
    expect(result).toContain('class="container"');
    expect(result).toContain('class="navigation"');
    expect(result).not.toContain('style=');
  });

  it('GOOGLE_SEARCH_RESULT mode preserves links and text only', () => {
    const result = clean(COMPLEX_HTML, CleaningMode.GOOGLE_SEARCH_RESULT);
    expect(result).toContain('<a href="#home">Home</a>');
    expect(result).toContain('<a href="#about">About</a>');
    expect(result).toContain('Welcome');
    expect(result).not.toContain('<nav>');
    expect(result).not.toContain('<main>');
    expect(result).not.toContain('<h1>');
  });

  it('handles empty input', () => {
    expect(clean('', CleaningMode.STANDARD)).toBe('');
    expect(clean('   ', CleaningMode.STANDARD)).toBe('');
    expect(clean('\n\t', CleaningMode.STANDARD)).toBe('');
  });

  it('handles malformed HTML', () => {
    const malformed = '<div>Unclosed div <p>Unclosed paragraph <span>Text</div>';
    const result = clean(malformed, CleaningMode.STANDARD);
    expect(result).toContain('Text');
  });

  it('removes nested empty tags', () => {
    const nested = '<div><span><p></p></span><p>Content</p></div>';
    const result = clean(nested, CleaningMode.STANDARD);
    expect(result).toContain('<p>Content</p>');
    expect(result).not.toContain('<p></p>');
    expect(result).not.toContain('<span></span>');
  });

  it('removes comments', () => {
    const result = clean(SAMPLE_HTML, CleaningMode.STANDARD);
    expect(result).not.toContain('<!-- This is a comment -->');
  });

  it('removes scripts', () => {
    const result = clean(SAMPLE_HTML, CleaningMode.STANDARD);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert');
  });

  it('removes embedded base64 images', () => {
    const htmlWithEmbedded = '<img src="data:image/jpeg;base64,/9j/4AAQ" alt="test">';
    const result = clean(htmlWithEmbedded, CleaningMode.STANDARD);
    expect(result).not.toContain('data:image/jpeg;base64');
  });

  it('cleans whitespace', () => {
    const messy = `
      <div>
        Multiple    Spaces
        And
        Lines
      </div>
    `;
    const result = clean(messy, CleaningMode.STANDARD);
    expect(normalizeHtml(result)).toContain('Multiple Spaces And Lines');
  });
});

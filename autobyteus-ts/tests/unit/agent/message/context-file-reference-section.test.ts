import { describe, expect, it } from 'vitest';
import {
  appendContextFileReferenceSection,
  appendReferenceFilesSection,
  buildReferenceFilesSection,
  collectContextFileReferencePaths
} from '../../../../src/agent/message/context-file-reference-section.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';

const contextFile = (uri: string): ContextFile =>
  new ContextFile(uri, ContextFileType.TEXT);

describe('context-file reference section', () => {
  it('leaves content unchanged when no local reference paths are available', () => {
    expect(appendContextFileReferenceSection('hello', [])).toBe('hello');
    expect(buildReferenceFilesSection([])).toBe('');
  });

  it('collects multiple absolute paths in first-seen order', () => {
    const paths = collectContextFileReferencePaths([
      contextFile('/abs/a.png'),
      contextFile('/abs/b.pdf')
    ]);

    expect(paths).toEqual(['/abs/a.png', '/abs/b.pdf']);
    expect(appendReferenceFilesSection('Please analyze', paths)).toBe(
      'Please analyze\n\nReference files:\n- /abs/a.png\n- /abs/b.pdf'
    );
  });

  it('dedupes duplicate paths', () => {
    expect(
      collectContextFileReferencePaths([
        contextFile('/abs/a.png'),
        contextFile('/abs/a.png'),
        contextFile('file:///abs/a.png')
      ])
    ).toEqual(['/abs/a.png']);
  });

  it('normalizes file URLs into local paths', () => {
    expect(
      collectContextFileReferencePaths([contextFile('file:///tmp/proof%20file.png')])
    ).toEqual(['/tmp/proof file.png']);
  });

  it('uses a resolver callback before rejecting REST locators', () => {
    const paths = collectContextFileReferencePaths(
      [contextFile('/rest/runs/run-1/context-files/proof.png')],
      {
        resolveUri: (uri) =>
          uri === '/rest/runs/run-1/context-files/proof.png' ? '/resolved/proof.png' : null
      }
    );

    expect(paths).toEqual(['/resolved/proof.png']);
  });

  it('ignores HTTP URLs, data URLs, unresolved REST locators, and null bytes', () => {
    expect(
      collectContextFileReferencePaths([
        contextFile('https://example.com/a.png'),
        contextFile('data:image/png;base64,abc'),
        contextFile('/rest/runs/run-1/context-files/proof.png'),
        contextFile('/tmp/bad\0path.png')
      ])
    ).toEqual([]);
  });

  it('does not append the same exact section twice', () => {
    const content = 'hello\n\nReference files:\n- /abs/a.png';

    expect(appendReferenceFilesSection(content, ['/abs/a.png'])).toBe(content);
  });
});

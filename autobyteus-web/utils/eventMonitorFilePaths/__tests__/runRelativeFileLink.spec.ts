import { describe, expect, it } from 'vitest';
import { resolveRunRelativeFileLink } from '../runRelativeFileLink';

// autobyteus-609 D-H: a Markdown link in a run's conversation to a path relative to the run's own folder is that file of
// the folder; one that leaves the folder, or names nothing previewable, is no file.
describe('resolveRunRelativeFileLink', () => {
  it.each([
    ['media/clip.mp4', '/w/run', '/w/run/media/clip.mp4', 'Video'],
    ['docs/a.md#x', '/w/run', '/w/run/docs/a.md', 'Text'],
    ['./notes.md', '/w/run/', '/w/run/notes.md', 'Text'],
    ['docs/../media/cover.png', '/w/run', '/w/run/media/cover.png', 'Image'],
    ['my%20report.md?v=2', '/w/run', '/w/run/my report.md', 'Text'],
    ['docs/a.md', 'C:\\Users\\me\\run', 'C:/Users/me/run/docs/a.md', 'Text'],
  ] as const)('%s in %s is %s', (href, root, path, previewType) => {
    expect(resolveRunRelativeFileLink(href, root)).toMatchObject({ kind: 'absolute', normalizedCandidate: path, previewType, rawCandidate: href, sourceKind: 'markdown-link' });
  });

  it.each([
    ['../outside.md', '/w/run', 'leaves the folder'],
    ['docs/../../outside.md', '/w/run', 'leaves the folder through a subfolder'],
    ['#heading', '/w/run', 'names no file'],
    ['docs/archive.zip', '/w/run', 'cannot be previewed'],
    ['docs\\a.md', '/w/run', 'a backslash path'],
    ['docs/a.md', '', 'no folder'],
    ['docs/a.md', 'relative/root', 'a folder that is not absolute'],
  ])('%s in "%s" is no file (%s)', (href, root) => {
    expect(resolveRunRelativeFileLink(href, root)).toBeNull();
  });
});

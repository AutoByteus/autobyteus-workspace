import { describe, it, expect } from 'vitest';
import { WriteFileContentStreamer, EditFileContentStreamer } from '../../../../../src/agent/streaming/api-tool-call/file-content-streamer.js';

describe('FileContentStreamers', () => {
  it('write_file streamer emits content and path', () => {
    const streamer = new WriteFileContentStreamer();

    const update1 = streamer.feed('{"path":"a.txt","content":"hi');
    expect(update1.contentDelta).toBe('hi');
    expect(update1.path).toBe('a.txt');
    expect(update1.contentComplete).toBeUndefined();

    const update2 = streamer.feed('\\');
    expect(update2.contentDelta).toBe('');

    const update3 = streamer.feed('nthere"}');
    expect(update3.contentDelta).toBe('\nthere');
    expect(update3.contentComplete).toBe('hi\nthere');
    expect(streamer.path).toBe('a.txt');
    expect(streamer.content).toBe('hi\nthere');
  });

  it('edit_file streamer emits patch content', () => {
    const streamer = new EditFileContentStreamer();

    const update1 = streamer.feed('{"patch":"@@ -1 +1 @@');
    expect(update1.contentDelta).toBe('@@ -1 +1 @@');

    const update2 = streamer.feed('\\');
    expect(update2.contentDelta).toBe('');

    const update3 = streamer.feed('n-foo\\n+bar"}');
    expect(update3.contentDelta).toBe('\n-foo\n+bar');
    expect(update3.contentComplete).toBe('@@ -1 +1 @@\n-foo\n+bar');
  });

  it('handles content before path', () => {
    const streamer = new WriteFileContentStreamer();

    const update1 = streamer.feed('{"content":"h');
    expect(update1.contentDelta).toBe('h');
    expect(update1.contentComplete).toBeUndefined();

    const update2 = streamer.feed('i","path":"later.txt"}');
    expect(update2.contentDelta).toBe('i');
    expect(update2.contentComplete).toBe('hi');
    expect(update2.path).toBe('later.txt');
    expect(streamer.path).toBe('later.txt');
  });
});

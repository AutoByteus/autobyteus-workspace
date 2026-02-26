import { describe, it, expect } from 'vitest';
import { createDataUri } from '../../../../src/llm/utils/media-payload-formatter.js';

describe('media_payload_formatter (integration)', () => {
  it('creates image_url data uri structure', () => {
    const data = createDataUri('image/png', 'abc123');
    expect(data).toEqual({
      type: 'image_url',
      image_url: {
        url: 'data:image/png;base64,abc123'
      }
    });
  });
});

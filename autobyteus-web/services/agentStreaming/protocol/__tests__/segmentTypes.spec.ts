import { describe, it, expect } from 'vitest';
import { createSegmentFromPayload } from '../segmentTypes';
import type { SegmentStartPayload } from '../messageTypes';

describe('createSegmentFromPayload (media)', () => {
  it('creates a media segment from metadata', () => {
    const payload: SegmentStartPayload = {
      id: 'seg-1',
      segment_type: 'media',
      metadata: {
        media_type: 'image',
        urls: ['http://server/img.png', ''],
      },
    };

    const segment = createSegmentFromPayload(payload);
    expect(segment.type).toBe('media');
    if (segment.type === 'media') {
      expect(segment.mediaType).toBe('image');
      expect(segment.urls).toEqual(['http://server/img.png']);
    }
  });

  it('defaults to image when media_type is invalid', () => {
    const payload: SegmentStartPayload = {
      id: 'seg-2',
      segment_type: 'media',
      metadata: {
        media_type: 'unknown',
        urls: ['http://server/audio.mp3'],
      },
    };

    const segment = createSegmentFromPayload(payload);
    expect(segment.type).toBe('media');
    if (segment.type === 'media') {
      expect(segment.mediaType).toBe('image');
      expect(segment.urls).toEqual(['http://server/audio.mp3']);
    }
  });
});

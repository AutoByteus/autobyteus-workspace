import { describe, expect, it } from 'vitest';
import {
  getMediaFileKindFromPath,
  isSupportedMediaFileExtension,
  SUPPORTED_MEDIA_FILE_EXTENSIONS,
} from '../../../src/utils/media-file-kind.js';

describe('media-file-kind', () => {
  const expectedExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.webp',
    '.mp3',
    '.wav',
    '.m4a',
    '.ogg',
    '.aac',
    '.flac',
    '.mp4',
    '.mpeg',
    '.mov',
    '.avi',
    '.webm',
    '.mkv',
  ] as const;

  it('exports the complete supported media extension set from one shared map', () => {
    expect(new Set(SUPPORTED_MEDIA_FILE_EXTENSIONS)).toEqual(new Set(expectedExtensions));
    expect(SUPPORTED_MEDIA_FILE_EXTENSIONS).toHaveLength(new Set(SUPPORTED_MEDIA_FILE_EXTENSIONS).size);
  });

  it('classifies supported image, audio, and video extensions from one shared map', () => {
    const expected = [
      ['photo.jpg', 'image'],
      ['photo.jpeg', 'image'],
      ['photo.png', 'image'],
      ['photo.gif', 'image'],
      ['photo.webp', 'image'],
      ['audio.mp3', 'audio'],
      ['audio.wav', 'audio'],
      ['audio.m4a', 'audio'],
      ['audio.ogg', 'audio'],
      ['audio.aac', 'audio'],
      ['audio.flac', 'audio'],
      ['video.mp4', 'video'],
      ['video.mpeg', 'video'],
      ['video.mov', 'video'],
      ['video.avi', 'video'],
      ['video.webm', 'video'],
      ['video.mkv', 'video'],
    ] as const;

    for (const [source, kind] of expected) {
      expect(getMediaFileKindFromPath(source)).toBe(kind);
      expect(isSupportedMediaFileExtension(source.slice(source.lastIndexOf('.')))).toBe(true);
    }
  });

  it('extracts media extensions from URLs without treating non-media as supported', () => {
    expect(getMediaFileKindFromPath('https://example.com/meeting.M4A?download=1')).toBe('audio');
    expect(getMediaFileKindFromPath('file:///tmp/clip.MPEG#frag')).toBe('video');
    expect(isSupportedMediaFileExtension('M4A')).toBe(true);
    expect(getMediaFileKindFromPath('notes.txt')).toBeNull();
    expect(isSupportedMediaFileExtension('.txt')).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import type { ContextAttachment } from '~/types/conversation';
import { planContextAttachmentSubmission } from '../contextAttachmentSend';

describe('planContextAttachmentSubmission', () => {
  it('retains all current items while excluding unsupported and blank locators from execution', () => {
    const attachments: ContextAttachment[] = [
      {
        kind: 'workspace_path',
        id: '/tmp/spec.md',
        locator: '/tmp/spec.md',
        displayName: 'spec.md',
        type: 'Markdown',
      },
      {
        kind: 'unsupported_local_file',
        id: 'local-file://opaque/image.png',
        locator: 'local-file://opaque/image.png',
        displayName: 'image.png',
        type: 'Image',
      },
      {
        kind: 'external_url',
        id: 'https://cdn.example/proof.png',
        locator: 'https://cdn.example/proof.png',
        displayName: 'proof.png',
        type: 'Image',
      },
      {
        kind: 'unsupported_local_file',
        id: 'local-file://opaque/video.mp4',
        locator: 'local-file://opaque/video.mp4',
        displayName: 'video.mp4',
        type: 'Video',
      },
      {
        kind: 'workspace_path',
        id: 'blank',
        locator: '  ',
        displayName: 'blank',
        type: 'Text',
      },
    ];

    const plan = planContextAttachmentSubmission(attachments);

    expect(plan.retainedMessageAttachments).toEqual(attachments);
    expect(plan.retainedMessageAttachments).not.toBe(attachments);
    expect(plan.executable).toEqual({
      contextFilePaths: ['/tmp/spec.md'],
      imageUrls: ['https://cdn.example/proof.png'],
    });
  });
});

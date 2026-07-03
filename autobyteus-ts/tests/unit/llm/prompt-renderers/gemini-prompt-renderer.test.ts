import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { GeminiPromptRenderer } from '../../../../src/llm/prompt-renderers/gemini-prompt-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';

describe('GeminiPromptRenderer', () => {
  it('renders basic messages', async () => {
    const renderer = new GeminiPromptRenderer();
    const messages = [
      new Message(MessageRole.SYSTEM, 'System'),
      new Message(MessageRole.USER, 'Hello'),
      new Message(MessageRole.ASSISTANT, 'Hi')
    ];

    const rendered = await renderer.render(messages);
    expect(rendered).toEqual([
      { role: 'user', parts: [{ text: 'Hello' }] },
      { role: 'model', parts: [{ text: 'Hi' }] }
    ]);
  });

  it('renders tool payloads as native functionCall/functionResponse parts', async () => {
    const renderer = new GeminiPromptRenderer();
    const messages = [
      new Message(MessageRole.ASSISTANT, {
        content: null,
        tool_payload: new ToolCallPayload([{ id: 'call_1', name: 'search', arguments: { query: 'autobyteus' } }])
      }),
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('call_1', 'search', { status: 'ok' })
      })
    ];

    const rendered = await renderer.render(messages);
    expect(rendered).toEqual([
      { role: 'model', parts: [{ functionCall: { id: 'call_1', name: 'search', args: { query: 'autobyteus' } } }] },
      { role: 'user', parts: [{ functionResponse: { id: 'call_1', name: 'search', response: { result: { status: 'ok' } } } }] }
    ]);
    expect(JSON.stringify(rendered)).not.toContain('[TOOL_');
  });

  it('renders local .m4a audio as Gemini inlineData instead of dropping media', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-m4a-render-'));
    const audioPath = path.join(tempDir, 'sample.m4a');
    const audioBytes = Buffer.from('small m4a fixture');
    await fs.writeFile(audioPath, audioBytes);

    try {
      const renderer = new GeminiPromptRenderer();
      const rendered = await renderer.render([
        new Message(MessageRole.USER, {
          content: 'Transcribe this.',
          audio_urls: [audioPath],
        }),
      ]);

      expect(rendered).toEqual([
        {
          role: 'user',
          parts: [
            { text: 'Transcribe this.' },
            {
              inlineData: {
                data: audioBytes.toString('base64'),
                mimeType: 'audio/mp4',
              },
            },
          ],
        },
      ]);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  it('surfaces declared Gemini media conversion failures instead of rendering text only', async () => {
    const renderer = new GeminiPromptRenderer();

    await expect(renderer.render([
      new Message(MessageRole.USER, {
        content: 'Transcribe this.',
        audio_urls: ['/tmp/missing-audio-file.m4a'],
      }),
    ])).rejects.toThrow('Failed to process Gemini declared media source');
  });
});

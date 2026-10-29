import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BaseTool } from '../../../../src/tools/base-tool.js';
import { defaultToolRegistry } from '../../../../src/tools/registry/tool-registry.js';
import { registerReadFileTool } from '../../../../src/tools/file/read-file.js';
import { configureFileToolDeniedPaths } from '../../../../src/tools/file/workspace-path-utils.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';
import type { MultimodalCapabilities } from '../../../../src/llm/multimodal-capabilities.js';

// read_file on image, audio and video files (autobyteus-328): the file is returned as a context file the agent loop
// attaches to the next turn, under read_file's path rule, with line ranges, empty files and kinds the model cannot
// take refused. Synthesized files only.
const PNG_BYTES = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==', 'base64');
const WAV_BYTES = Buffer.from('RIFF$\u0000\u0000\u0000WAVEfmt \u0010\u0000\u0000\u0000\u0001\u0000\u0001\u0000D¬\u0000\u0000\u0088X\u0001\u0000\u0002\u0000\u0010\u0000data\u0000\u0000\u0000\u0000', 'latin1');
const MP4_BYTES = Buffer.from('\u0000\u0000\u0000\u0018ftypmp42\u0000\u0000\u0000\u0000mp42isom', 'latin1');

const contextWith = (capabilities?: MultimodalCapabilities) => ({
  agentId: 'read-file-media-agent',
  workspaceRootPath: null,
  ...(capabilities ? { llmInstance: { model: { multimodalCapabilities: capabilities } } } : {}),
});
const allUnsupported: MultimodalCapabilities = { image: 'unsupported', audio: 'unsupported', video: 'unsupported' };
const allSupported: MultimodalCapabilities = { image: 'supported', audio: 'supported', video: 'supported' };

describe('read_file on media files', () => {
  let dir: string;

  beforeEach(async () => {
    defaultToolRegistry.clear();
    registerReadFileTool();
    dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'read-file-media-')));
  });

  afterEach(async () => {
    configureFileToolDeniedPaths([]);
    await fs.rm(dir, { recursive: true, force: true });
  });

  const tool = (): BaseTool => defaultToolRegistry.createTool('read_file') as BaseTool;
  const write = async (name: string, bytes: Buffer): Promise<string> => {
    const filePath = path.join(dir, name);
    await fs.writeFile(filePath, bytes);
    return filePath;
  };

  it.each([
    ['photo.png', PNG_BYTES, ContextFileType.IMAGE],
    ['voice.wav', WAV_BYTES, ContextFileType.AUDIO],
    ['clip.mp4', MP4_BYTES, ContextFileType.VIDEO],
  ])('returns %s as a context file of its kind, not as text', async (name, bytes, fileType) => {
    const filePath = await write(name, bytes);

    const result = await tool().execute(contextWith(allSupported), { path: filePath });

    expect(result).toBeInstanceOf(ContextFile);
    expect(result).toMatchObject({ uri: filePath, fileName: name, fileType });
  });

  it('resolves a relative media path against an absolute base_dir', async () => {
    const filePath = await write('photo.png', PNG_BYTES);

    const result = await tool().execute(contextWith(), { path: 'photo.png', base_dir: dir });

    expect(result).toBeInstanceOf(ContextFile);
    expect(result).toMatchObject({ uri: filePath, fileType: ContextFileType.IMAGE });
  });

  it('loads media when the model capability is unknown', async () => {
    const filePath = await write('voice.wav', WAV_BYTES);

    const result = await tool().execute(
      contextWith({ image: 'unknown', audio: 'unknown', video: 'unknown' }),
      { path: filePath },
    );

    expect(result).toBeInstanceOf(ContextFile);
  });

  it('ignores include_line_numbers for media', async () => {
    const filePath = await write('photo.png', PNG_BYTES);

    const result = await tool().execute(contextWith(), { path: filePath, include_line_numbers: false });

    expect(result).toBeInstanceOf(ContextFile);
  });

  it.each([
    ['photo.png', PNG_BYTES, 'The selected model does not support image input. The image file was not loaded. Continue without visual analysis and do not claim to have inspected it.'],
    ['voice.wav', WAV_BYTES, 'The selected model does not support audio input. The audio file was not loaded. Continue without audio analysis and do not claim to have inspected it.'],
    ['clip.mp4', MP4_BYTES, 'The selected model does not support video input. The video file was not loaded. Continue without video analysis and do not claim to have inspected it.'],
  ])('refuses %s when the model does not support its kind', async (name, bytes, message) => {
    const filePath = await write(name, bytes);

    await expect(tool().execute(contextWith(allUnsupported), { path: filePath })).rejects.toThrow(message);
  });

  it('refuses only the kind the model does not support', async () => {
    const imagePath = await write('photo.png', PNG_BYTES);
    const audioPath = await write('voice.wav', WAV_BYTES);
    const context = contextWith({ image: 'supported', audio: 'unsupported', video: 'supported' });

    await expect(tool().execute(context, { path: imagePath })).resolves.toBeInstanceOf(ContextFile);
    await expect(tool().execute(context, { path: audioPath })).rejects.toThrow('does not support audio input');
  });

  it('refuses an empty media file', async () => {
    const filePath = await write('empty.png', Buffer.alloc(0));

    await expect(tool().execute(contextWith(), { path: filePath }))
      .rejects.toThrow(`The media file '${filePath}' is empty and was not loaded.`);
  });

  it.each([
    [{ start_line: 1 }],
    [{ end_line: 3 }],
    [{ start_line: 1, end_line: 2 }],
  ])('refuses line ranges on a media file (%o)', async (range) => {
    const filePath = await write('clip.mp4', MP4_BYTES);

    await expect(tool().execute(contextWith(), { path: filePath, ...range }))
      .rejects.toThrow('start_line and end_line apply to text files only');
  });

  it('refuses a missing media file', async () => {
    const filePath = path.join(dir, 'missing.png');

    await expect(tool().execute(contextWith(), { path: filePath })).rejects.toThrow('does not exist');
  });

  it('refuses a directory named like a media file', async () => {
    const dirPath = path.join(dir, 'album.png');
    await fs.mkdir(dirPath);

    await expect(tool().execute(contextWith(), { path: dirPath })).rejects.toThrow('is not a regular file');
  });

  it('refuses a relative media path without base_dir', async () => {
    await write('photo.png', PNG_BYTES);

    await expect(tool().execute(contextWith(), { path: 'photo.png' }))
      .rejects.toThrow("Relative file paths require an explicit absolute 'base_dir'");
  });

  it('refuses a media file under a denied path', async () => {
    const filePath = await write('photo.png', PNG_BYTES);
    configureFileToolDeniedPaths([dir]);

    await expect(tool().execute(contextWith(), { path: filePath })).rejects.toThrow('FILE_TOOL_PATH_DENIED');
  });
});

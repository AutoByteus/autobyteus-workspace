import { describe, it, expect } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { PromptBuilder } from '../../../src/prompt/prompt-builder.js';

describe('PromptBuilder', () => {
  it('builds prompt from template file', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-builder-'));
    const templatePath = path.join(tempDir, 'template.txt');
    const templateContent = '[Movie Title]:\n{{ movie_title }}\n\n[Genre]:\n{{ genre }}';
    await fs.writeFile(templatePath, templateContent, 'utf-8');

    const prompt = PromptBuilder.fromFile(templatePath)
      .setVariableValue('movie_title', 'The Matrix')
      .setVariableValue('genre', 'Science Fiction')
      .build();

    expect(prompt).toBe('[Movie Title]:\nThe Matrix\n\n[Genre]:\nScience Fiction');
  });

  it('throws when template is missing', () => {
    expect(() => new PromptBuilder().build()).toThrow('Template is not set');
  });

  it('fills missing variables with empty strings', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'prompt-builder-'));
    const templatePath = path.join(tempDir, 'template.txt');
    const templateContent = '[Movie Title]:\n{{ movie_title }}\n\n[Genre]:\n{{ genre }}';
    await fs.writeFile(templatePath, templateContent, 'utf-8');

    const prompt = PromptBuilder.fromFile(templatePath)
      .setVariableValue('movie_title', 'Inception')
      .build();

    expect(prompt).toBe('[Movie Title]:\nInception\n\n[Genre]:\n');
  });
});

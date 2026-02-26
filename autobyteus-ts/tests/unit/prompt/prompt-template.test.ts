import { describe, it, expect } from 'vitest';
import { PromptTemplate } from '../../../src/prompt/prompt-template.js';

describe('PromptTemplate', () => {
  it('stores the template string', () => {
    const templateStr = 'This is a template with {{ requirement }}';
    const promptTemplate = new PromptTemplate({ template: templateStr });
    expect(promptTemplate.template).toBe(templateStr);
  });

  it('serializes to dict', () => {
    const templateStr = 'This is a template with {{ requirement }}';
    const promptTemplate = new PromptTemplate({ template: templateStr });
    expect(promptTemplate.toDict()).toEqual({ template: templateStr });
  });

  it('fills with all variables', () => {
    const templateStr = 'Hello, {{ name }}! Welcome to {{ platform }}.';
    const promptTemplate = new PromptTemplate({ template: templateStr });
    const filled = promptTemplate.fill({ name: 'Alice', platform: 'OpenAI' });
    expect(filled).toBe('Hello, Alice! Welcome to OpenAI.');
  });

  it('fills missing variables with empty strings', () => {
    const templateStr = 'Hello, {{ name }}! Welcome to {{ platform }}.';
    const promptTemplate = new PromptTemplate({ template: templateStr });
    const filled = promptTemplate.fill({ name: 'Bob' });
    expect(filled).toBe('Hello, Bob! Welcome to .');
  });

  it('ignores extra variables', () => {
    const templateStr = 'Hello, {{ name }}!';
    const promptTemplate = new PromptTemplate({ template: templateStr });
    const filled = promptTemplate.fill({ name: 'Charlie', platform: 'OpenAI' });
    expect(filled).toBe('Hello, Charlie!');
  });
});

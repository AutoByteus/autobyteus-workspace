import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { ReadUrl } from '../../../../src/tools/web/read-url-tool.js';

const makeContext = () => ({ agentId: 'test-agent' });

describe('ReadUrl tool (integration)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('defaults to text output format', async () => {
    const mockHtml = '<html><body><p>Hello <strong>world</strong></p></body></html>';
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: mockHtml
    } as any);

    const tool = new ReadUrl();
    const result = await tool.execute(makeContext(), { url: 'http://example.com' });

    expect(result).toContain('Hello world');
    expect(result).not.toContain('<strong>');
  });
});

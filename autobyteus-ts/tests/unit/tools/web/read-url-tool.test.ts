import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import { ReadUrl } from '../../../../src/tools/web/read-url-tool.js';

const makeContext = () => ({ agentId: 'test-agent' });

describe('ReadUrl tool', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns cleaned text for text output', async () => {
    const mockHtml = '<html><body><h1>Title</h1><p>Some text content.</p></body></html>';
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: mockHtml
    } as any);

    const tool = new ReadUrl();
    const result = await tool.execute(makeContext(), { url: 'http://example.com' });

    expect(result).toContain('Title');
    expect(result).toContain('Some text content.');
    expect(result).not.toContain('<html>');
  });

  it('returns cleaned HTML for html output', async () => {
    const mockHtml = '<html><body><div id="content">Important Data</div><script>bad</script></body></html>';
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 200,
      data: mockHtml
    } as any);

    const tool = new ReadUrl();
    const result = await tool.execute(makeContext(), { url: 'http://example.com', output_format: 'html' });

    expect(result).toContain('Important Data');
    expect(result).not.toContain('<script>');
  });

  it('returns error message for non-200 responses', async () => {
    vi.spyOn(axios, 'get').mockResolvedValue({
      status: 404,
      data: 'Not Found'
    } as any);

    const tool = new ReadUrl();
    const result = await tool.execute(makeContext(), { url: 'http://example.com/notfound' });

    expect(result).toContain('Failed to fetch content');
    expect(result).toContain('404');
  });

  it('handles network errors gracefully', async () => {
    const error = Object.assign(new Error('Connection refused'), { isAxiosError: true });
    vi.spyOn(axios, 'get').mockRejectedValue(error);

    const tool = new ReadUrl();
    const result = await tool.execute(makeContext(), { url: 'http://example.com' });

    expect(result).toContain('Error reading URL');
    expect(result).toContain('Connection refused');
  });
});

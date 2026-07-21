import { beforeEach, describe, expect, it, vi } from 'vitest';

const mermaidMocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
  parse: vi.fn(),
}));

vi.mock('mermaid', () => ({
  default: mermaidMocks,
}));

import { mermaidService } from '../mermaidService';

describe('mermaidService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('suppresses Mermaid-owned fallback rendering for embedded failures', () => {
    mermaidService.initialize(true);

    expect(mermaidMocks.initialize).toHaveBeenCalledWith({
      startOnLoad: false,
      theme: 'dark',
      securityLevel: 'loose',
      suppressErrorRendering: true,
    });
  });
});

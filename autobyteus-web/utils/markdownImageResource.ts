export type MarkdownImageResourceResolution =
  | { kind: 'direct'; url: string }
  | { kind: 'managed'; fetchUrl: string; fragment: string | null }
  | { kind: 'blocked'; reason: 'invalid-path' | 'outside-workspace' }

export type MarkdownImageResourceResolver = (
  source: string,
) => MarkdownImageResourceResolution

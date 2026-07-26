export type GeminiRuntimeSelection =
  | { kind: 'vertexExpress' }
  | { kind: 'vertexProject'; project: string; location: string }
  | { kind: 'aiStudio' }
  | { kind: 'unconfigured' };

export type GeminiRuntimeResolver = () => Promise<GeminiRuntimeSelection>;

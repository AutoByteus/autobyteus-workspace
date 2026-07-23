import { GoogleGenAI } from '@google/genai';
import type {
  ProviderApiKeyResolver,
  ProviderApiKeyStatus,
} from '../secrets/provider-api-key-resolver.js';

type GeminiRuntime = 'vertex' | 'api_key';

export interface GeminiRuntimeInfo {
  runtime: GeminiRuntime;
  project: string | null;
  location: string | null;
}

export type GeminiRuntimeSelection =
  | { kind: 'vertexExpress' }
  | { kind: 'vertexProject'; project: string; location: string }
  | { kind: 'aiStudio' }
  | { kind: 'unconfigured' };

export type GeminiRuntimeSelectionInput = {
  vertexExpressStatus: ProviderApiKeyStatus;
  aiStudioStatus: ProviderApiKeyStatus;
  project?: string | null;
  location?: string | null;
};

export const selectGeminiRuntime = (
  input: GeminiRuntimeSelectionInput,
): GeminiRuntimeSelection => {
  if (input.vertexExpressStatus === 'CONFIGURED') {
    return { kind: 'vertexExpress' };
  }
  const project = input.project?.trim();
  const location = input.location?.trim();
  if (project && location) {
    return { kind: 'vertexProject', project, location };
  }
  if (input.aiStudioStatus === 'CONFIGURED') {
    return { kind: 'aiStudio' };
  }
  return { kind: 'unconfigured' };
};

export async function selectGeminiRuntimeForResolver(
  resolver: ProviderApiKeyResolver,
  project = process.env.VERTEX_AI_PROJECT ?? null,
  location = process.env.VERTEX_AI_LOCATION ?? null,
): Promise<GeminiRuntimeSelection> {
  const [vertexExpressStatus, aiStudioStatus] = await Promise.all([
    resolver.getStatus('GEMINI', 'geminiVertexExpressApiKey'),
    resolver.getStatus('GEMINI', 'geminiAiStudioApiKey'),
  ]);
  return selectGeminiRuntime({
    vertexExpressStatus,
    aiStudioStatus,
    project,
    location,
  });
}

export async function initializeGeminiClientWithRuntime(
  selection: GeminiRuntimeSelection,
  resolver: ProviderApiKeyResolver,
): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
  switch (selection.kind) {
    case 'aiStudio': {
      const secret = await resolver.resolve('GEMINI', 'geminiAiStudioApiKey');
      return {
        client: new GoogleGenAI({ apiKey: secret.revealToTrustedConsumer() }),
        runtimeInfo: { runtime: 'api_key', project: null, location: null },
      };
    }
    case 'vertexExpress': {
      const secret = await resolver.resolve('GEMINI', 'geminiVertexExpressApiKey');
      return {
        client: new GoogleGenAI({
          vertexai: true,
          apiKey: secret.revealToTrustedConsumer(),
        }),
        runtimeInfo: { runtime: 'vertex', project: null, location: null },
      };
    }
    case 'vertexProject':
      return {
        client: new GoogleGenAI({
          vertexai: true,
          project: selection.project,
          location: selection.location,
        }),
        runtimeInfo: {
          runtime: 'vertex',
          project: selection.project,
          location: selection.location,
        },
      };
    case 'unconfigured':
      throw new Error('GEMINI_RUNTIME_UNCONFIGURED');
  }
}

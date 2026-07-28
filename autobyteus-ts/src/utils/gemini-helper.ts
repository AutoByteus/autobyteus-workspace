import { GoogleGenAI } from '@google/genai';
import type { ProviderApiKeyResolver } from '../secrets/provider-api-key-resolver.js';
import type { GeminiRuntimeSelection } from './gemini-runtime.js';

export type GeminiRuntime = 'vertex' | 'api_key';
export interface GeminiRuntimeInfo {
  runtime: GeminiRuntime;
  project: string | null;
  location: string | null;
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
        client: new GoogleGenAI({ vertexai: true, apiKey: secret.revealToTrustedConsumer() }),
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

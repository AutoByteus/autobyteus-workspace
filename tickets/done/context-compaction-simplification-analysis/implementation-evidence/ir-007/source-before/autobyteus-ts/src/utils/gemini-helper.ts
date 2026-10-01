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
  transport: { singleAttempt?: boolean } = {},
): Promise<{ client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo }> {
  const httpOptions = transport.singleAttempt ? { retryOptions: { attempts: 1 } } : undefined;
  switch (selection.kind) {
    case 'aiStudio': {
      const secret = await resolver.resolve('GEMINI', 'geminiAiStudioApiKey');
      return {
        client: new GoogleGenAI({ httpOptions, apiKey: secret.revealToTrustedConsumer() }),
        runtimeInfo: { runtime: 'api_key', project: null, location: null },
      };
    }
    case 'vertexExpress': {
      const secret = await resolver.resolve('GEMINI', 'geminiVertexExpressApiKey');
      return {
        client: new GoogleGenAI({ httpOptions, vertexai: true, apiKey: secret.revealToTrustedConsumer() }),
        runtimeInfo: { runtime: 'vertex', project: null, location: null },
      };
    }
    case 'vertexProject':
      return {
        client: new GoogleGenAI({
          httpOptions,
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

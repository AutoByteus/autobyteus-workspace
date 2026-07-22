import { GoogleGenAI } from '@google/genai';
import type { ResolvedLLMAuthentication } from '../llm/llm-construction-context.js';

type GeminiRuntime = 'vertex' | 'api_key';

export interface GeminiRuntimeInfo {
  runtime: GeminiRuntime;
  project: string | null;
  location: string | null;
}

export function initializeGeminiClientWithRuntime(
  authentication: ResolvedLLMAuthentication,
): { client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo } {
  switch (authentication.kind) {
    case 'geminiAiStudio': {
      const apiKey = authentication.apiKey.revealToTrustedConsumer();
      return {
        client: new GoogleGenAI({ apiKey }),
        runtimeInfo: { runtime: 'api_key', project: null, location: null },
      };
    }
    case 'geminiVertexExpress': {
      const apiKey = authentication.apiKey.revealToTrustedConsumer();
      return {
        client: new GoogleGenAI({ vertexai: true, apiKey }),
        runtimeInfo: { runtime: 'vertex', project: null, location: null },
      };
    }
    case 'geminiVertexProject': {
      const { project, location } = authentication;
      return {
        client: new GoogleGenAI({ vertexai: true, project, location }),
        runtimeInfo: { runtime: 'vertex', project, location },
      };
    }
    default:
      throw new Error('Gemini requires an explicitly resolved Gemini authentication mode.');
  }
}

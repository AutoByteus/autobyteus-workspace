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
  if (authentication.kind === 'googleWorkloadIdentity') {
    const { project, location } = authentication;
    const client = new GoogleGenAI({ vertexai: true, project, location });
    return {
      client,
      runtimeInfo: { runtime: 'vertex', project, location }
    };
  }

  if (authentication.kind === 'apiKey') {
    const apiKey = authentication.apiKey.revealToTrustedConsumer();
    const client = new GoogleGenAI({ apiKey });
    return {
      client,
      runtimeInfo: { runtime: 'api_key', project: null, location: null }
    };
  }

  throw new Error('Gemini requires explicitly resolved API-key or workload-identity authentication.');
}

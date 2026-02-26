import { GoogleGenAI } from '@google/genai';

type GeminiRuntime = 'vertex' | 'api_key';

export interface GeminiRuntimeInfo {
  runtime: GeminiRuntime;
  project: string | null;
  location: string | null;
}

export function initializeGeminiClientWithRuntime(): { client: GoogleGenAI; runtimeInfo: GeminiRuntimeInfo } {
  const vertexApiKey = process.env.VERTEX_AI_API_KEY ?? null;
  if (vertexApiKey) {
    const client = new GoogleGenAI({ vertexai: true, apiKey: vertexApiKey });
    return {
      client,
      runtimeInfo: { runtime: 'vertex', project: null, location: null }
    };
  }

  const project = process.env.VERTEX_AI_PROJECT ?? null;
  const location = process.env.VERTEX_AI_LOCATION ?? null;

  if (project && location) {
    const client = new GoogleGenAI({ vertexai: true, project, location });
    return {
      client,
      runtimeInfo: { runtime: 'vertex', project, location }
    };
  }

  const apiKey = process.env.GEMINI_API_KEY ?? null;
  if (apiKey) {
    const client = new GoogleGenAI({ apiKey });
    return {
      client,
      runtimeInfo: { runtime: 'api_key', project: null, location: null }
    };
  }

  throw new Error(
    "Failed to initialize Gemini Client: Missing configuration. Please set 'VERTEX_AI_API_KEY' for Vertex AI Express, " +
      "OR set both 'VERTEX_AI_PROJECT' and 'VERTEX_AI_LOCATION' for Vertex AI mode, " +
      "OR set 'GEMINI_API_KEY' for AI Studio mode."
  );
}

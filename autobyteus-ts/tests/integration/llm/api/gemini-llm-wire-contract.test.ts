import http from 'node:http';
import { GoogleGenAI } from '@google/genai';
import { describe, expect, it } from 'vitest';
import { GeminiLLM } from '../../../../src/llm/api/gemini-llm.js';
import { extractProviderErrorEvidence } from '../../../../src/llm/errors/provider-error.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import { MissingApiKeyError } from '../../../../src/secrets/provider-api-key-error.js';
import type { ProviderApiKeyResolver } from '../../../../src/secrets/provider-api-key-resolver.js';
import { geminiRuntimeResolver } from '../../../unit/provider-api-key-resolver-test-helpers.js';

type CapturedRequest = {
  method: string | undefined;
  url: string | undefined;
  body: string;
};

const model = new LLMModel({
  name: 'gemini-3.8-flash',
  value: 'gemini-3.8-flash',
  canonicalName: 'gemini-3.8-flash',
  provider: LLMProvider.GEMINI,
});

const messages = [new Message(MessageRole.USER, 'Hello over the installed SDK')];

const startLoopbackServer = async (
  respond: (response: http.ServerResponse) => void,
): Promise<{
  baseUrl: string;
  requests: CapturedRequest[];
  close: () => Promise<void>;
}> => {
  const requests: CapturedRequest[] = [];
  const server = http.createServer((request, response) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => {
      requests.push({ method: request.method, url: request.url, body });
      respond(response);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('TEST_LOOPBACK_ADDRESS_MISSING');
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    }),
  };
};

const injectInstalledSdkClient = (llm: GeminiLLM, baseUrl: string): void => {
  const client = new GoogleGenAI({
    apiKey: 'synthetic-wire-key',
    httpOptions: { baseUrl, apiVersion: '' },
  });
  (llm as unknown as {
    clientPromise: Promise<{
      client: GoogleGenAI;
      runtimeInfo: { runtime: 'api_key'; project: null; location: null };
    }>;
  }).clientPromise = Promise.resolve({
    client,
    runtimeInfo: { runtime: 'api_key', project: null, location: null },
  });
};

describe('Gemini 3.8 installed SDK wire contract', () => {
  it('serializes the lower-case thinking level and final allowed fields over loopback HTTP', async () => {
    const server = await startLoopbackServer((response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        candidates: [{ content: { role: 'model', parts: [{ text: 'wire-ok' }] }, finishReason: 'STOP' }],
        usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 2, totalTokenCount: 6 },
      }));
    });
    try {
      const llm = new GeminiLLM(
        model,
        new LLMConfig({
          systemMessage: 'Wire system prompt',
          temperature: 0.9,
          topP: 0.8,
          maxTokens: 321,
          stopSequences: ['STOP'],
          frequencyPenalty: 0.4,
          presencePenalty: 0.3,
          extraParams: {
            thinking_level: 'high',
            include_thoughts: true,
            thinkingConfig: { thinkingBudget: 999 },
            thinkingBudget: 999,
            topK: 64,
            candidateCount: 2,
            seed: 42,
          },
        }),
        {} as ProviderApiKeyResolver,
        geminiRuntimeResolver(),
      );
      injectInstalledSdkClient(llm, server.baseUrl);

      const result = await llm.sendMessages(messages);

      expect(result).toMatchObject({ content: 'wire-ok' });
      expect(server.requests).toHaveLength(1);
      expect(server.requests[0]).toMatchObject({
        method: 'POST',
        url: '/models/gemini-3.8-flash:generateContent',
      });
      const body = JSON.parse(server.requests[0]!.body);
      expect(body).toMatchObject({
        contents: [{ role: 'user', parts: [{ text: 'Hello over the installed SDK' }] }],
        generationConfig: {
          responseMimeType: 'text/plain',
          thinkingConfig: { thinkingLevel: 'high', includeThoughts: true },
          maxOutputTokens: 321,
          stopSequences: ['STOP'],
          seed: 42,
        },
      });
      expect(body.systemInstruction).toBeDefined();
      for (const forbidden of [
        'temperature', 'topP', 'topK', 'candidateCount', 'frequencyPenalty',
        'presencePenalty', 'thinkingBudget', 'thinking_level', 'include_thoughts',
      ]) {
        expect(server.requests[0]!.body).not.toContain(`"${forbidden}"`);
      }
    } finally {
      await server.close();
    }
  });

  it('preserves safe provider-error evidence from the installed SDK HTTP failure shape', async () => {
    const server = await startLoopbackServer((response) => {
      response.writeHead(429, {
        'content-type': 'application/json',
        'x-request-id': 'synthetic-request-id',
      });
      response.end(JSON.stringify({
        error: {
          code: 429,
          message: 'Quota rejected for token=secret-wire-value',
          status: 'RESOURCE_EXHAUSTED',
        },
      }));
    });
    try {
      const llm = new GeminiLLM(
        model,
        new LLMConfig(),
        {} as ProviderApiKeyResolver,
        geminiRuntimeResolver(),
      );
      injectInstalledSdkClient(llm, server.baseUrl);

      let thrown: unknown;
      try {
        await llm.sendMessages(messages);
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      const evidence = extractProviderErrorEvidence(thrown);
      expect(evidence.providerStatus).toBe(429);
      expect(evidence.message).toContain('token=<redacted>');
      expect(evidence.message).not.toContain('secret-wire-value');
      expect(server.requests[0]?.url).toBe('/models/gemini-3.8-flash:generateContent');
    } finally {
      await server.close();
    }
  });

  it('retains the stable missing-key error before any provider request is created', async () => {
    const resolver: ProviderApiKeyResolver = {
      async resolve() {
        throw new MissingApiKeyError('GEMINI');
      },
    };
    const llm = new GeminiLLM(model, new LLMConfig(), resolver, geminiRuntimeResolver());

    await expect(llm.sendMessages(messages)).rejects.toMatchObject({
      name: 'MissingApiKeyError',
      kind: 'missing_api_key',
      message: 'API key not provided for GEMINI. Configure the GEMINI API key before sending a request.',
    });
  });
});

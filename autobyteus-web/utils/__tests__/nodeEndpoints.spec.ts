import { describe, expect, it } from 'vitest';
import { deriveNodeEndpoints, normalizeNodeBaseUrl } from '../nodeEndpoints';

describe('nodeEndpoints', () => {
  it('derives endpoints from a plain http host', () => {
    const endpoints = deriveNodeEndpoints('http://localhost:29695');

    expect(endpoints.graphqlHttp).toBe('http://localhost:29695/graphql');
    expect(endpoints.graphqlWs).toBe('ws://localhost:29695/graphql');
    expect(endpoints.rest).toBe('http://localhost:29695/rest');
    expect(endpoints.agentWs).toBe('ws://localhost:29695/ws/agent');
    expect(endpoints.teamWs).toBe('ws://localhost:29695/ws/agent-team');
    expect(endpoints.terminalWs).toBe('ws://localhost:29695/ws/terminal');
    expect(endpoints.fileExplorerWs).toBe('ws://localhost:29695/ws/file-explorer');
    expect(endpoints.health).toBe('http://localhost:29695/rest/health');
  });

  it('uses wss for https node endpoints', () => {
    const endpoints = deriveNodeEndpoints('https://node.example.com');

    expect(endpoints.graphqlHttp).toBe('https://node.example.com/graphql');
    expect(endpoints.graphqlWs).toBe('wss://node.example.com/graphql');
    expect(endpoints.agentWs).toBe('wss://node.example.com/ws/agent');
    expect(endpoints.teamWs).toBe('wss://node.example.com/ws/agent-team');
  });

  it('normalizes trailing slash and known api suffixes', () => {
    expect(normalizeNodeBaseUrl('http://localhost:29695/')).toBe('http://localhost:29695');
    expect(normalizeNodeBaseUrl('http://localhost:29695/graphql')).toBe('http://localhost:29695');
    expect(normalizeNodeBaseUrl('http://localhost:29695/rest')).toBe('http://localhost:29695');
    expect(normalizeNodeBaseUrl('http://localhost:29695/ws/agent')).toBe('http://localhost:29695');
    expect(normalizeNodeBaseUrl('node.example.com/rest/health')).toBe('http://node.example.com');
  });

  it('preserves non-api base path prefixes', () => {
    const endpoints = deriveNodeEndpoints('https://gateway.example.com/autobyteus');

    expect(endpoints.graphqlHttp).toBe('https://gateway.example.com/autobyteus/graphql');
    expect(endpoints.rest).toBe('https://gateway.example.com/autobyteus/rest');
    expect(endpoints.fileExplorerWs).toBe('wss://gateway.example.com/autobyteus/ws/file-explorer');
  });

  it('rejects invalid or unsupported urls', () => {
    expect(() => normalizeNodeBaseUrl('')).toThrow('Node base URL is required');
    expect(() => normalizeNodeBaseUrl('ftp://node.example.com')).toThrow('Node base URL must use http or https');
    expect(() => normalizeNodeBaseUrl('http://')).toThrow('Invalid node base URL');
  });
});


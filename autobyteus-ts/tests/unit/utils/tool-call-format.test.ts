import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolveToolCallFormat, isXmlToolFormat, isJsonToolFormat } from '../../../src/utils/tool-call-format.js';

describe('tool_call_format', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it('should default to api_tool_call when env var is unset', () => {
    delete process.env.AUTOBYTEUS_STREAM_PARSER;
    expect(resolveToolCallFormat()).toBe('api_tool_call');
  });

  it('should resolve valid formats', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    expect(resolveToolCallFormat()).toBe('xml');
    
    process.env.AUTOBYTEUS_STREAM_PARSER = 'JSON'; // Case insensitive
    expect(resolveToolCallFormat()).toBe('json');
  });

  it('should default to api_tool_call for invalid formats', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'invalid_format';
    expect(resolveToolCallFormat()).toBe('api_tool_call');
  });

  it('isXmlToolFormat should check for xml', () => {
    process.env.AUTOBYTEUS_STREAM_PARSER = 'xml';
    expect(isXmlToolFormat()).toBe(true);
    
    process.env.AUTOBYTEUS_STREAM_PARSER = 'json';
    expect(isXmlToolFormat()).toBe(false);
  });
});

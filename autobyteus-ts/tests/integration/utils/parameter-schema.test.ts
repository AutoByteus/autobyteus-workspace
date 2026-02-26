import { describe, it, expect } from 'vitest';
import { ParameterSchema, ParameterDefinition, ParameterType } from '../../../src/utils/parameter-schema.js';

describe('ParameterSchema (integration)', () => {
  it('validates missing required parameters', () => {
    const schema = new ParameterSchema();
    schema.addParameter(new ParameterDefinition({
      name: 'path',
      type: ParameterType.STRING,
      description: 'Path',
      required: true
    }));

    const [ok, errors] = schema.validateConfig({});
    expect(ok).toBe(false);
    expect(errors[0]).toContain("Required parameter 'path' is missing");
  });
});

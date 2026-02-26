import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { zodToParameterSchema } from '../../../src/tools/zod-schema-converter.js';
import { ParameterSchema, ParameterType } from '../../../src/utils/parameter-schema.js';

const Address = z.object({
  street: z.string().describe('Street name and number.'),
  city: z.string().describe('City name.')
});

const Person = z.object({
  name: z.string().describe("The person's full name."),
  age: z.number().int().optional().describe("The person's age."),
  tags: z.array(z.string()).default([]).describe('A list of tags.'),
  address: Address.describe("The person's primary address."),
  prior_addresses: z.array(Address).default([]).describe('List of prior addresses.')
});

describe('zodToParameterSchema', () => {
  it('converts basic types and optionals', () => {
    const schema = zodToParameterSchema(Person);
    expect(schema).toBeInstanceOf(ParameterSchema);
    expect(schema.parameters.length).toBe(5);

    const nameParam = schema.getParameter('name');
    expect(nameParam).toBeTruthy();
    expect(nameParam?.type).toBe(ParameterType.STRING);
    expect(nameParam?.required).toBe(true);
    expect(nameParam?.description).toBe("The person's full name.");

    const ageParam = schema.getParameter('age');
    expect(ageParam).toBeTruthy();
    expect(ageParam?.type).toBe(ParameterType.INTEGER);
    expect(ageParam?.required).toBe(false);
    expect(ageParam?.description).toBe("The person's age.");
  });

  it('converts array of primitives', () => {
    const schema = zodToParameterSchema(Person);
    const tagsParam = schema.getParameter('tags');

    expect(tagsParam).toBeTruthy();
    expect(tagsParam?.type).toBe(ParameterType.ARRAY);
    expect(tagsParam?.required).toBe(false);
    expect(tagsParam?.description).toBe('A list of tags.');
    expect(tagsParam?.arrayItemSchema).toEqual({ type: 'string' });
  });

  it('converts nested objects', () => {
    const schema = zodToParameterSchema(Person);
    const addressParam = schema.getParameter('address');

    expect(addressParam).toBeTruthy();
    expect(addressParam?.type).toBe(ParameterType.OBJECT);
    expect(addressParam?.required).toBe(true);
    expect(addressParam?.objectSchema).toBeInstanceOf(ParameterSchema);

    const nestedSchema = addressParam?.objectSchema as ParameterSchema;
    const streetParam = nestedSchema.getParameter('street');
    expect(streetParam?.type).toBe(ParameterType.STRING);
    expect(streetParam?.required).toBe(true);
    expect(streetParam?.description).toBe('Street name and number.');
  });

  it('converts array of objects', () => {
    const schema = zodToParameterSchema(Person);
    const priorParam = schema.getParameter('prior_addresses');

    expect(priorParam).toBeTruthy();
    expect(priorParam?.type).toBe(ParameterType.ARRAY);
    expect(priorParam?.required).toBe(false);

    const itemSchema = priorParam?.arrayItemSchema as ParameterSchema;
    expect(itemSchema).toBeInstanceOf(ParameterSchema);
    expect(itemSchema.parameters.length).toBe(2);

    const cityParam = itemSchema.getParameter('city');
    expect(cityParam?.type).toBe(ParameterType.STRING);
    expect(cityParam?.required).toBe(true);
  });
});

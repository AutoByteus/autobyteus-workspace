export const APPLICATION_AGENT_TOOL_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,127}$/;
export class ApplicationAgentToolDeclarationParseError extends Error {
    constructor(message) {
        super(message);
        this.name = "ApplicationAgentToolDeclarationParseError";
    }
}
const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const assertAllowedKeys = (value, allowedKeys, fieldName) => {
    const allowed = new Set(allowedKeys);
    const unknown = Object.keys(value).find((key) => !allowed.has(key));
    if (unknown) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName} contains unsupported key '${unknown}'.`);
    }
};
const requireString = (value, fieldName) => {
    if (typeof value !== "string") {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName} must be a string.`);
    }
    const normalized = value.trim();
    if (!normalized) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName} must not be empty.`);
    }
    return normalized;
};
const normalizeDescription = (value, fieldName, fallback) => {
    if (value === undefined)
        return fallback;
    return requireString(value, fieldName);
};
const normalizeRequired = (value, properties, fieldName) => {
    if (value === undefined)
        return [];
    if (!Array.isArray(value)) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName} must be an array.`);
    }
    const result = [];
    const seen = new Set();
    for (const candidate of value) {
        if (typeof candidate !== "string" || !candidate) {
            throw new ApplicationAgentToolDeclarationParseError(`${fieldName} entries must be non-empty strings.`);
        }
        if (!Object.prototype.hasOwnProperty.call(properties, candidate)) {
            throw new ApplicationAgentToolDeclarationParseError(`${fieldName} contains unknown property '${candidate}'.`);
        }
        if (seen.has(candidate)) {
            throw new ApplicationAgentToolDeclarationParseError(`${fieldName} contains duplicate property '${candidate}'.`);
        }
        seen.add(candidate);
        result.push(candidate);
    }
    return result.sort((left, right) => left.localeCompare(right));
};
const normalizeProperties = (value, fieldName) => {
    if (value === undefined)
        return {};
    if (!isRecord(value)) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName} must be an object.`);
    }
    const normalized = Object.create(null);
    for (const name of Object.keys(value).sort((left, right) => left.localeCompare(right))) {
        if (!name) {
            throw new ApplicationAgentToolDeclarationParseError(`${fieldName} property names must not be empty.`);
        }
        normalized[name] = normalizePropertySchema(value[name], `${fieldName}.${name}`, `Parameter '${name}'.`);
    }
    return normalized;
};
const normalizeFiniteNumber = (value, fieldName) => {
    if (value === undefined)
        return undefined;
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName} must be a finite number.`);
    }
    return value;
};
const normalizePropertySchema = (value, fieldName, descriptionFallback) => {
    if (!isRecord(value)) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName} must be an object schema.`);
    }
    if (typeof value.type !== "string") {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName}.type must be one non-null supported type.`);
    }
    const description = normalizeDescription(value.description, `${fieldName}.description`, descriptionFallback);
    if (value.type === "object") {
        assertAllowedKeys(value, ["type", "description", "properties", "required"], fieldName);
        const properties = normalizeProperties(value.properties, `${fieldName}.properties`);
        return Object.freeze({
            type: "object",
            ...(description ? { description } : {}),
            properties: Object.freeze(properties),
            required: Object.freeze(normalizeRequired(value.required, properties, `${fieldName}.required`)),
        });
    }
    if (value.type === "array") {
        assertAllowedKeys(value, ["type", "description", "items"], fieldName);
        if (value.items === undefined) {
            throw new ApplicationAgentToolDeclarationParseError(`${fieldName}.items is required.`);
        }
        return Object.freeze({
            type: "array",
            ...(description ? { description } : {}),
            items: normalizePropertySchema(value.items, `${fieldName}.items`),
        });
    }
    if (!["string", "integer", "number", "boolean"].includes(value.type)) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName}.type '${value.type}' is not supported.`);
    }
    if (value.type === "string") {
        assertAllowedKeys(value, ["type", "description", "enum", "pattern"], fieldName);
        if (value.enum !== undefined && value.pattern !== undefined) {
            throw new ApplicationAgentToolDeclarationParseError(`${fieldName} cannot declare both enum and pattern.`);
        }
        let enumValues;
        if (value.enum !== undefined) {
            if (!Array.isArray(value.enum) || value.enum.length === 0) {
                throw new ApplicationAgentToolDeclarationParseError(`${fieldName}.enum must be non-empty.`);
            }
            enumValues = [];
            const seen = new Set();
            for (const candidate of value.enum) {
                if (typeof candidate !== "string" || seen.has(candidate)) {
                    throw new ApplicationAgentToolDeclarationParseError(`${fieldName}.enum must contain unique strings.`);
                }
                seen.add(candidate);
                enumValues.push(candidate);
            }
            enumValues.sort((left, right) => left.localeCompare(right));
        }
        if (value.pattern !== undefined && typeof value.pattern !== "string") {
            throw new ApplicationAgentToolDeclarationParseError(`${fieldName}.pattern must be a string.`);
        }
        if (typeof value.pattern === "string") {
            try {
                new RegExp(value.pattern);
            }
            catch {
                throw new ApplicationAgentToolDeclarationParseError(`${fieldName}.pattern is invalid.`);
            }
        }
        return Object.freeze({
            type: "string",
            ...(description ? { description } : {}),
            ...(enumValues ? { enum: Object.freeze(enumValues) } : {}),
            ...(typeof value.pattern === "string" ? { pattern: value.pattern } : {}),
        });
    }
    if (value.type === "boolean") {
        assertAllowedKeys(value, ["type", "description"], fieldName);
        return Object.freeze({ type: "boolean", ...(description ? { description } : {}) });
    }
    assertAllowedKeys(value, ["type", "description", "minimum", "maximum"], fieldName);
    const minimum = normalizeFiniteNumber(value.minimum, `${fieldName}.minimum`);
    const maximum = normalizeFiniteNumber(value.maximum, `${fieldName}.maximum`);
    if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName}.minimum must not exceed maximum.`);
    }
    return Object.freeze({
        type: value.type,
        ...(description ? { description } : {}),
        ...(minimum !== undefined ? { minimum } : {}),
        ...(maximum !== undefined ? { maximum } : {}),
    });
};
export const parseApplicationAgentToolInputSchema = (value, fieldName = "inputSchema") => {
    if (!isRecord(value)) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName} must be an object schema.`);
    }
    assertAllowedKeys(value, ["type", "properties", "required"], fieldName);
    if (value.type !== "object") {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName}.type must be 'object'.`);
    }
    const properties = normalizeProperties(value.properties, `${fieldName}.properties`);
    return Object.freeze({
        type: "object",
        properties: Object.freeze(properties),
        required: Object.freeze(normalizeRequired(value.required, properties, `${fieldName}.required`)),
    });
};
export const parseApplicationAgentToolDeclarations = (value, fieldName = "agentTools") => {
    if (value === undefined || value === null)
        return Object.freeze([]);
    if (!Array.isArray(value)) {
        throw new ApplicationAgentToolDeclarationParseError(`${fieldName} must be an array.`);
    }
    const declarations = [];
    const names = new Set();
    value.forEach((candidate, index) => {
        const itemField = `${fieldName}[${index}]`;
        if (!isRecord(candidate)) {
            throw new ApplicationAgentToolDeclarationParseError(`${itemField} must be an object.`);
        }
        assertAllowedKeys(candidate, ["name", "description", "inputSchema"], itemField);
        const name = requireString(candidate.name, `${itemField}.name`);
        if (!APPLICATION_AGENT_TOOL_NAME_PATTERN.test(name)) {
            throw new ApplicationAgentToolDeclarationParseError(`${itemField}.name '${name}' is not provider-safe.`);
        }
        if (names.has(name)) {
            throw new ApplicationAgentToolDeclarationParseError(`${fieldName} contains duplicate tool '${name}'.`);
        }
        names.add(name);
        declarations.push(Object.freeze({
            name,
            description: requireString(candidate.description, `${itemField}.description`),
            inputSchema: parseApplicationAgentToolInputSchema(candidate.inputSchema, `${itemField}.inputSchema`),
        }));
    });
    return Object.freeze(declarations);
};
//# sourceMappingURL=application-agent-tools.js.map
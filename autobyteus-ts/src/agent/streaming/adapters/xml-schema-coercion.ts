import { ParameterDefinition, ParameterSchema, ParameterType } from '../../../utils/parameter-schema.js';

type XmlNode = XmlTextNode | XmlElementNode;

type XmlTextNode = {
  kind: 'text';
  value: string;
};

type XmlElementNode = {
  kind: 'element';
  tagName: string;
  attributes: Record<string, string>;
  children: XmlNode[];
  rawInner: string;
};

const XML_ENTITY_PATTERN = /&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g;
const XML_NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'"
};

export const decodeXmlEntitiesOnce = (value: string): string =>
  value.replace(XML_ENTITY_PATTERN, (fullMatch, entity) => {
    if (entity in XML_NAMED_ENTITIES) {
      return XML_NAMED_ENTITIES[entity];
    }

    if (entity.startsWith('#x')) {
      const parsed = Number.parseInt(entity.slice(2), 16);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : fullMatch;
    }

    if (entity.startsWith('#')) {
      const parsed = Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : fullMatch;
    }

    return fullMatch;
  });

export const parseXmlArgumentsWithSchema = (
  argsContent: string,
  schema: ParameterSchema
): Record<string, unknown> | null => {
  const parsed = parseXmlContent(argsContent);
  const elements = parsed.nodes.filter(isElementNode);
  if (elements.length === 0) {
    return null;
  }

  return coerceNamedElements(elements, schema);
};

const isElementNode = (node: XmlNode): node is XmlElementNode => node.kind === 'element';

const isPotentialOpeningTagStart = (fragment: string, index: number): boolean =>
  fragment[index] === '<' && /[A-Za-z_]/.test(fragment[index + 1] ?? '');

const parseTagToken = (
  fragment: string,
  startIndex: number
): { raw: string; nextIndex: number } | null => {
  let quote: '"' | "'" | null = null;

  for (let index = startIndex + 1; index < fragment.length; index += 1) {
    const char = fragment[index];
    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === '>') {
      return {
        raw: fragment.slice(startIndex, index + 1),
        nextIndex: index + 1
      };
    }
  }

  return null;
};

const parseOpeningTag = (
  rawTag: string
): { name: string; attributes: Record<string, string>; selfClosing: boolean } | null => {
  const trimmed = rawTag.trim();
  const match = /^<([A-Za-z_][A-Za-z0-9_:-]*)([\s\S]*?)(\/?)>$/.exec(trimmed);
  if (!match) {
    return null;
  }

  const name = match[1];
  const attrText = match[2] ?? '';
  const selfClosing = match[3] === '/';
  const attributes: Record<string, string> = {};
  const attrPattern = /([A-Za-z_][A-Za-z0-9_:-]*)\s*=\s*(["'])([\s\S]*?)\2/g;
  let attrMatch: RegExpExecArray | null;

  while ((attrMatch = attrPattern.exec(attrText)) !== null) {
    attributes[attrMatch[1]] = decodeXmlEntitiesOnce(attrMatch[3]);
  }

  return { name, attributes, selfClosing };
};

const parseClosingTag = (
  fragment: string,
  startIndex: number
): { name: string; nextIndex: number } | null => {
  if (!fragment.startsWith('</', startIndex)) {
    return null;
  }

  const token = parseTagToken(fragment, startIndex);
  if (!token) {
    return null;
  }

  const match = /^<\/\s*([A-Za-z_][A-Za-z0-9_:-]*)\s*>$/.exec(token.raw.trim());
  if (!match) {
    return null;
  }

  return {
    name: match[1],
    nextIndex: token.nextIndex
  };
};

const findNextMarkupStart = (fragment: string, startIndex: number, stopTag?: string): number => {
  for (let index = startIndex; index < fragment.length; index += 1) {
    if (fragment.startsWith('<![CDATA[', index)) {
      return index;
    }

    if (stopTag) {
      const closing = parseClosingTag(fragment, index);
      if (closing?.name === stopTag) {
        return index;
      }
    }

    if (isPotentialOpeningTagStart(fragment, index)) {
      return index;
    }
  }

  return -1;
};

const parseXmlContent = (
  fragment: string,
  startIndex = 0,
  stopTag?: string
): { nodes: XmlNode[]; nextIndex: number; closingStart: number | null; closed: boolean } => {
  const nodes: XmlNode[] = [];
  let index = startIndex;

  while (index < fragment.length) {
    if (stopTag) {
      const closing = parseClosingTag(fragment, index);
      if (closing?.name === stopTag) {
        return {
          nodes,
          nextIndex: closing.nextIndex,
          closingStart: index,
          closed: true
        };
      }
    }

    if (fragment.startsWith('<![CDATA[', index)) {
      const cdataEnd = fragment.indexOf(']]>', index + 9);
      const textEnd = cdataEnd === -1 ? fragment.length : cdataEnd;
      nodes.push({
        kind: 'text',
        value: fragment.slice(index + 9, textEnd)
      });
      index = cdataEnd === -1 ? fragment.length : cdataEnd + 3;
      continue;
    }

    if (isPotentialOpeningTagStart(fragment, index)) {
      const token = parseTagToken(fragment, index);
      const openingTag = token ? parseOpeningTag(token.raw) : null;
      if (!token || !openingTag) {
        nodes.push({ kind: 'text', value: fragment[index] });
        index += 1;
        continue;
      }

      if (openingTag.selfClosing) {
        nodes.push({
          kind: 'element',
          tagName: openingTag.name,
          attributes: openingTag.attributes,
          children: [],
          rawInner: ''
        });
        index = token.nextIndex;
        continue;
      }

      const childStart = token.nextIndex;
      const childResult = parseXmlContent(fragment, childStart, openingTag.name);
      const rawInnerEnd =
        childResult.closed && childResult.closingStart !== null ? childResult.closingStart : childResult.nextIndex;

      nodes.push({
        kind: 'element',
        tagName: openingTag.name,
        attributes: openingTag.attributes,
        children: childResult.nodes,
        rawInner: fragment.slice(childStart, rawInnerEnd)
      });
      index = childResult.nextIndex;
      continue;
    }

    const nextMarkupStart = findNextMarkupStart(fragment, index, stopTag);
    const textEnd = nextMarkupStart === -1 ? fragment.length : nextMarkupStart;
    const text = fragment.slice(index, textEnd);
    if (text) {
      nodes.push({
        kind: 'text',
        value: decodeXmlEntitiesOnce(text)
      });
    }
    index = textEnd;
  }

  return {
    nodes,
    nextIndex: index,
    closingStart: null,
    closed: false
  };
};

const getNodeName = (node: XmlElementNode): string => {
  if (node.tagName === 'arg') {
    return node.attributes.name?.trim() || node.tagName;
  }

  return node.tagName;
};

const getChildElements = (node: XmlElementNode): XmlElementNode[] => node.children.filter(isElementNode);

const getChildElementsByName = (node: XmlElementNode, name: string): XmlElementNode[] =>
  getChildElements(node).filter((child) => getNodeName(child) === name);

const getScalarText = (node: XmlElementNode): string =>
  node.children
    .filter((child): child is XmlTextNode => child.kind === 'text')
    .map((child) => child.value)
    .join('');

const mapJsonTypeToParameterType = (type: string): ParameterType | null => {
  switch (type) {
    case 'string':
      return ParameterType.STRING;
    case 'integer':
      return ParameterType.INTEGER;
    case 'number':
      return ParameterType.FLOAT;
    case 'boolean':
      return ParameterType.BOOLEAN;
    case 'object':
      return ParameterType.OBJECT;
    case 'array':
      return ParameterType.ARRAY;
    default:
      return null;
  }
};

const buildSchemaFromJsonSchema = (schema: Record<string, unknown>): ParameterSchema | null => {
  const properties = schema.properties;
  if (!properties || typeof properties !== 'object' || Array.isArray(properties)) {
    return null;
  }

  const required = Array.isArray(schema.required)
    ? schema.required.filter((value): value is string => typeof value === 'string')
    : [];
  const parameterSchema = new ParameterSchema();

  for (const [name, rawDefinition] of Object.entries(properties)) {
    if (!rawDefinition || typeof rawDefinition !== 'object' || Array.isArray(rawDefinition)) {
      continue;
    }

    const definition = rawDefinition as Record<string, unknown>;
    const type = typeof definition.type === 'string' ? mapJsonTypeToParameterType(definition.type) : null;
    if (!type) {
      continue;
    }

    parameterSchema.addParameter(
      new ParameterDefinition({
        name,
        type,
        description: String(definition.description ?? `${name} parameter`),
        required: required.includes(name),
        arrayItemSchema:
          type === ParameterType.ARRAY && definition.items && typeof definition.items === 'object'
            ? (definition.items as Record<string, unknown>)
            : undefined,
        objectSchema:
          type === ParameterType.OBJECT ? buildSchemaFromJsonSchema(definition) ?? undefined : undefined
      })
    );
  }

  return parameterSchema;
};

const buildParameterDefinitionFromJsonSchema = (
  name: string,
  schema: Record<string, unknown>
): ParameterDefinition | null => {
  const typeName = typeof schema.type === 'string' ? schema.type : null;
  if (!typeName) {
    return null;
  }

  const type = mapJsonTypeToParameterType(typeName);
  if (!type) {
    return null;
  }

  return new ParameterDefinition({
    name,
    type,
    description: String(schema.description ?? `${name} parameter`),
    arrayItemSchema:
      type === ParameterType.ARRAY && schema.items && typeof schema.items === 'object'
        ? (schema.items as Record<string, unknown>)
        : undefined,
    objectSchema: type === ParameterType.OBJECT ? buildSchemaFromJsonSchema(schema) ?? undefined : undefined
  });
};

const coercePrimitiveValue = (value: string, type: ParameterType): unknown => {
  if (type === ParameterType.STRING || type === ParameterType.ENUM) {
    return value;
  }

  if (type === ParameterType.INTEGER) {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? value : parsed;
  }

  if (type === ParameterType.FLOAT) {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? value : parsed;
  }

  if (type === ParameterType.BOOLEAN) {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no'].includes(normalized)) {
      return false;
    }
  }

  return value;
};

const coerceStringValue = (node: XmlElementNode): string => {
  if (getChildElements(node).length > 0) {
    return node.rawInner;
  }

  return getScalarText(node);
};

const normalizeHeuristicObject = (value: Record<string, unknown>): unknown => {
  const keys = Object.keys(value);
  if (keys.length === 1 && keys[0] === 'item') {
    return Array.isArray(value.item) ? value.item : [value.item];
  }

  return value;
};

const heuristicValueForElement = (node: XmlElementNode): unknown => {
  const childElements = getChildElements(node);
  if (childElements.length === 0) {
    return coerceStringValue(node);
  }

  const grouped = new Map<string, XmlElementNode[]>();
  for (const child of childElements) {
    const name = getNodeName(child);
    if (!name) {
      continue;
    }

    const existing = grouped.get(name) ?? [];
    existing.push(child);
    grouped.set(name, existing);
  }

  const result: Record<string, unknown> = {};
  for (const [name, elements] of grouped.entries()) {
    result[name] =
      elements.length === 1
        ? heuristicValueForElement(elements[0])
        : elements.map((element) => heuristicValueForElement(element));
  }

  return normalizeHeuristicObject(result);
};

const coerceArrayItem = (
  node: XmlElementNode,
  itemSchema?: ParameterType | ParameterSchema | Record<string, unknown>
): unknown => {
  if (itemSchema instanceof ParameterSchema) {
    return coerceNamedElements(getChildElements(node), itemSchema);
  }

  if (itemSchema && typeof itemSchema === 'object') {
    const tempDefinition = buildParameterDefinitionFromJsonSchema('item', itemSchema as Record<string, unknown>);
    if (tempDefinition) {
      return coerceElementByDefinition(node, tempDefinition);
    }
  }

  if (itemSchema && Object.values(ParameterType).includes(itemSchema as ParameterType)) {
    return coercePrimitiveValue(coerceStringValue(node), itemSchema as ParameterType);
  }

  return getChildElements(node).length > 0 ? heuristicValueForElement(node) : coerceStringValue(node);
};

const coerceArrayValue = (node: XmlElementNode, definition: ParameterDefinition): unknown[] => {
  const itemNodes = getChildElementsByName(node, 'item');
  if (itemNodes.length > 0) {
    return itemNodes.map((itemNode) => coerceArrayItem(itemNode, definition.arrayItemSchema));
  }

  const childElements = getChildElements(node);
  if (childElements.length > 0) {
    return childElements.map((child) => coerceArrayItem(child, definition.arrayItemSchema));
  }

  const scalar = coerceStringValue(node);
  if (scalar.trim() === '') {
    return [];
  }

  return [coercePrimitiveValue(scalar, (definition.arrayItemSchema as ParameterType) ?? ParameterType.STRING)];
};

const coerceObjectValue = (node: XmlElementNode, schema?: ParameterSchema | null): Record<string, unknown> => {
  if (!schema) {
    const heuristic = heuristicValueForElement(node);
    return typeof heuristic === 'object' && heuristic !== null ? (heuristic as Record<string, unknown>) : {};
  }

  return coerceNamedElements(getChildElements(node), schema);
};

const coerceElementByDefinition = (node: XmlElementNode, definition: ParameterDefinition): unknown => {
  switch (definition.type) {
    case ParameterType.STRING:
    case ParameterType.ENUM:
      return coerceStringValue(node);
    case ParameterType.INTEGER:
    case ParameterType.FLOAT:
    case ParameterType.BOOLEAN:
      return coercePrimitiveValue(coerceStringValue(node), definition.type);
    case ParameterType.ARRAY:
      return coerceArrayValue(node, definition);
    case ParameterType.OBJECT:
      return coerceObjectValue(node, definition.objectSchema);
    default:
      return heuristicValueForElement(node);
  }
};

const coerceElementGroup = (elements: XmlElementNode[], definition: ParameterDefinition): unknown => {
  if (definition.type === ParameterType.ARRAY) {
    if (elements.length === 1) {
      return coerceArrayValue(elements[0], definition);
    }
    return elements.map((element) => coerceArrayItem(element, definition.arrayItemSchema));
  }

  if (elements.length === 1) {
    return coerceElementByDefinition(elements[0], definition);
  }

  return elements.map((element) => coerceElementByDefinition(element, definition));
};

const coerceNamedElements = (
  elements: XmlElementNode[],
  schema: ParameterSchema
): Record<string, unknown> => {
  const grouped = new Map<string, XmlElementNode[]>();
  for (const element of elements) {
    const name = getNodeName(element);
    if (!name) {
      continue;
    }

    const existing = grouped.get(name) ?? [];
    existing.push(element);
    grouped.set(name, existing);
  }

  const coerced: Record<string, unknown> = {};
  for (const [name, namedElements] of grouped.entries()) {
    const definition = schema.getParameter(name);
    coerced[name] = definition
      ? coerceElementGroup(namedElements, definition)
      : namedElements.length === 1
        ? heuristicValueForElement(namedElements[0])
        : namedElements.map((element) => heuristicValueForElement(element));
  }

  return coerced;
};

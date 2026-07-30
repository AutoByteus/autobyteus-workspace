import { CompactionResult, type CompactionSemanticEntry } from './compaction-result.js';

export type CompactionResponseParserOptions = {
  maxEpisodeChars?: number;
  maxFactChars?: number;
  maxFactCount?: number;
};

const DEFAULT_MAX_EPISODE_CHARS = 4000;
const DEFAULT_MAX_FACT_CHARS = 500;
const DEFAULT_MAX_FACT_COUNT = 20;
const RESPONSE_FIELDS = [
  'episodes',
  'critical_issues',
  'unresolved_work',
  'durable_facts',
  'user_preferences',
  'important_artifacts',
] as const;

const clampText = (value: string, limit: number): string => value.length <= limit ? value : value.slice(0, limit).trim();

const extractFenceCandidates = (text: string): string[] => {
  const matches = Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi));
  return matches.map((match) => match[1]?.trim()).filter((value): value is string => Boolean(value));
};

const extractBalancedJsonObjects = (text: string): string[] => {
  const results: string[] = [];

  for (let start = 0; start < text.length; start += 1) {
    if (text[start] !== '{') {
      continue;
    }

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let end = start; end < text.length; end += 1) {
      const char = text[end];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          results.push(text.slice(start, end + 1));
          break;
        }
      }
    }
  }

  return results;
};

export class CompactionResponseParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompactionResponseParseError';
  }
}

export class CompactionResponseParser {
  private readonly maxEpisodeChars: number;
  private readonly maxFactChars: number;
  private readonly maxFactCount: number;

  constructor(options: CompactionResponseParserOptions = {}) {
    this.maxEpisodeChars = options.maxEpisodeChars ?? DEFAULT_MAX_EPISODE_CHARS;
    this.maxFactChars = options.maxFactChars ?? DEFAULT_MAX_FACT_CHARS;
    this.maxFactCount = options.maxFactCount ?? DEFAULT_MAX_FACT_COUNT;
  }

  parse(text: string): CompactionResult {
    const parsedObject = this.parseObject(text);
    const unexpectedFields = Object.keys(parsedObject)
      .filter((field) => !RESPONSE_FIELDS.includes(field as typeof RESPONSE_FIELDS[number]));
    if (unexpectedFields.length) {
      throw new CompactionResponseParseError(
        `Compaction response contains unsupported fields: ${unexpectedFields.join(', ')}.`,
      );
    }
    if (!Array.isArray(parsedObject.episodes)) {
      throw new CompactionResponseParseError('Compaction response is missing an episodes array.');
    }
    const episodes = parsedObject.episodes.flatMap((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
      const fields = Object.keys(entry);
      if (fields.some((field) => field !== 'summary')) {
        throw new CompactionResponseParseError(
          'Compaction episode entries may contain only summary.',
        );
      }
      const rawSummary = (entry as Record<string, unknown>).summary;
      const summary = typeof rawSummary === 'string'
        ? clampText(rawSummary.trim(), this.maxEpisodeChars)
        : '';
      return summary ? [{ summary }] : [];
    }).slice(0, 3);
    if (!episodes.length) {
      throw new CompactionResponseParseError('Compaction response requires one to three non-empty episodes.');
    }
    let remainingFacts = this.maxFactCount;
    const takeEntries = (key: string): CompactionSemanticEntry[] => {
      const entries = this.parseEntries(parsedObject, key, remainingFacts);
      remainingFacts -= entries.length;
      return entries;
    };
    return new CompactionResult({
      episodes,
      criticalIssues: takeEntries('critical_issues'),
      unresolvedWork: takeEntries('unresolved_work'),
      durableFacts: takeEntries('durable_facts'),
      userPreferences: takeEntries('user_preferences'),
      importantArtifacts: takeEntries('important_artifacts'),
    });
  }

  private parseEntries(
    parsedObject: Record<string, unknown>,
    key: string,
    limit: number,
  ): CompactionSemanticEntry[] {
    const fieldValue = parsedObject[key];
    if (!Array.isArray(fieldValue)) {
      throw new CompactionResponseParseError(`Compaction response is missing a ${key} array.`);
    }
    if (limit <= 0) return [];

    const entries: CompactionSemanticEntry[] = [];
    for (const entryValue of fieldValue) {
      if (!entryValue || typeof entryValue !== 'object') {
        continue;
      }
      const entryRecord = entryValue as Record<string, unknown>;
      if (Object.keys(entryRecord).some((field) => field !== 'fact')) {
        throw new CompactionResponseParseError(
          `Compaction ${key} entries may contain only fact.`,
        );
      }
      const fact = typeof entryRecord.fact === 'string' ? clampText(entryRecord.fact.trim(), this.maxFactChars) : '';
      if (!fact) {
        continue;
      }

      entries.push({
        fact,
      });

      if (entries.length >= limit) {
        break;
      }
    }

    return entries;
  }

  private parseObject(text: string): Record<string, unknown> {
    const candidates = [
      text.trim(),
      ...extractFenceCandidates(text),
      ...extractBalancedJsonObjects(text)
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch (_error) {
        // try next candidate
      }
    }

    throw new CompactionResponseParseError('Could not parse a valid JSON object from the compaction response.');
  }
}

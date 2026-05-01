import { CompactionResult, type CompactionSemanticEntry } from './compaction-result.js';

export type CompactionResponseParserOptions = {
  maxSummaryChars?: number;
  maxFactChars?: number;
  maxFactCount?: number;
};

const DEFAULT_MAX_SUMMARY_CHARS = 4000;
const DEFAULT_MAX_FACT_CHARS = 500;
const DEFAULT_MAX_FACT_COUNT = 20;

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

const getObjectField = (record: Record<string, unknown>, snakeCaseKey: string, camelCaseKey: string): unknown => {
  if (record[snakeCaseKey] !== undefined) {
    return record[snakeCaseKey];
  }
  return record[camelCaseKey];
};

export class CompactionResponseParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CompactionResponseParseError';
  }
}

export class CompactionResponseParser {
  private readonly maxSummaryChars: number;
  private readonly maxFactChars: number;
  private readonly maxFactCount: number;

  constructor(options: CompactionResponseParserOptions = {}) {
    this.maxSummaryChars = options.maxSummaryChars ?? DEFAULT_MAX_SUMMARY_CHARS;
    this.maxFactChars = options.maxFactChars ?? DEFAULT_MAX_FACT_CHARS;
    this.maxFactCount = options.maxFactCount ?? DEFAULT_MAX_FACT_COUNT;
  }

  parse(text: string): CompactionResult {
    const parsedObject = this.parseObject(text);
    const episodicSummary = getObjectField(parsedObject, 'episodic_summary', 'episodicSummary');

    if (typeof episodicSummary !== 'string' || !episodicSummary.trim()) {
      throw new CompactionResponseParseError('Compaction response is missing a non-empty episodic_summary string.');
    }

    return new CompactionResult(clampText(episodicSummary.trim(), this.maxSummaryChars), {
      criticalIssues: this.parseEntries(parsedObject, 'critical_issues', 'criticalIssues'),
      unresolvedWork: this.parseEntries(parsedObject, 'unresolved_work', 'unresolvedWork'),
      durableFacts: this.parseEntries(parsedObject, 'durable_facts', 'durableFacts'),
      userPreferences: this.parseEntries(parsedObject, 'user_preferences', 'userPreferences'),
      importantArtifacts: this.parseEntries(parsedObject, 'important_artifacts', 'importantArtifacts'),
    });
  }

  private parseEntries(parsedObject: Record<string, unknown>, snakeCaseKey: string, camelCaseKey: string): CompactionSemanticEntry[] {
    const fieldValue = getObjectField(parsedObject, snakeCaseKey, camelCaseKey);
    if (!Array.isArray(fieldValue)) {
      throw new CompactionResponseParseError(`Compaction response is missing a ${snakeCaseKey} array.`);
    }

    const entries: CompactionSemanticEntry[] = [];
    for (const entryValue of fieldValue) {
      if (!entryValue || typeof entryValue !== 'object') {
        continue;
      }
      const entryRecord = entryValue as Record<string, unknown>;
      const fact = typeof entryRecord.fact === 'string' ? clampText(entryRecord.fact.trim(), this.maxFactChars) : '';
      if (!fact) {
        continue;
      }

      entries.push({
        fact,
      });

      if (entries.length >= this.maxFactCount) {
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

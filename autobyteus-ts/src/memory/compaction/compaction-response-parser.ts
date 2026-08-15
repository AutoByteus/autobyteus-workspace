import { CompactionResult, type CompactionSemanticEntry } from './compaction-result.js';
import { providerSafeCompactionText } from '../presentation/unicode-safe-text.js';

export type CompactionResponseParserOptions = {
  maxEpisodeChars?: number;
  maxFactChars?: number;
};

export type CompactionResponseValidationStage =
  | 'json_object_extraction'
  | 'six_array_schema_validation'
  | 'multiple_valid_objects';

const DEFAULT_MAX_EPISODE_CHARS = 4000;
const DEFAULT_MAX_FACT_CHARS = 500;
const RESPONSE_FIELDS = [
  'episodes',
  'critical_issues',
  'unresolved_work',
  'durable_facts',
  'user_preferences',
  'important_artifacts',
] as const;

type ResponseField = typeof RESPONSE_FIELDS[number];

type CandidateFailure = {
  requiredFieldCoverage: number;
  message: string;
};

type CandidateValidation =
  | { result: CompactionResult; failure?: never }
  | { result?: never; failure: CandidateFailure };

const clampText = (value: string, limit: number): string =>
  providerSafeCompactionText.truncateEnd(value, limit).trim();

const extractFenceCandidates = (text: string): string[] => {
  const matches = Array.from(text.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi));
  return matches
    .map((match) => match[1]?.trim())
    .filter((value): value is string => Boolean(value));
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

const extractDistinctCandidates = (text: string): string[] => [
  text.trim(),
  ...extractFenceCandidates(text),
  ...extractBalancedJsonObjects(text),
].filter(Boolean).filter((candidate, index, candidates) =>
  candidates.indexOf(candidate) === index);

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export class CompactionResponseParseError extends Error {
  readonly stage: CompactionResponseValidationStage;

  constructor(stage: CompactionResponseValidationStage, message: string) {
    super(message);
    this.name = 'CompactionResponseParseError';
    this.stage = stage;
  }
}

export class CompactionResponseParser {
  private readonly maxEpisodeChars: number;
  private readonly maxFactChars: number;

  constructor(options: CompactionResponseParserOptions = {}) {
    this.maxEpisodeChars = options.maxEpisodeChars ?? DEFAULT_MAX_EPISODE_CHARS;
    this.maxFactChars = options.maxFactChars ?? DEFAULT_MAX_FACT_CHARS;
  }

  parse(text: string): CompactionResult {
    const parsedObjects = this.parseObjectCandidates(text);
    const validResults = new Map<string, CompactionResult>();
    const failures: CandidateFailure[] = [];

    for (const parsedObject of parsedObjects) {
      const validation = this.validateCandidate(parsedObject);
      if (validation.result) {
        validResults.set(JSON.stringify(validation.result), validation.result);
      } else {
        failures.push(validation.failure);
      }
    }

    if (validResults.size === 0) {
      const mostRelevantFailure = failures.reduce<CandidateFailure | null>(
        (selected, failure) => !selected
          || failure.requiredFieldCoverage > selected.requiredFieldCoverage
          ? failure
          : selected,
        null,
      );
      throw new CompactionResponseParseError(
        'six_array_schema_validation',
        mostRelevantFailure?.message
          ?? 'No parsed JSON object satisfied the six-array compaction response schema.',
      );
    }

    if (validResults.size > 1) {
      throw new CompactionResponseParseError(
        'multiple_valid_objects',
        'Compaction response contains multiple distinct valid compaction objects.',
      );
    }

    return validResults.values().next().value!;
  }

  private parseObjectCandidates(text: string): Record<string, unknown>[] {
    const parsedObjects: Record<string, unknown>[] = [];
    for (const candidate of extractDistinctCandidates(text)) {
      try {
        const parsed = JSON.parse(candidate);
        if (isObjectRecord(parsed)) {
          parsedObjects.push(parsed);
        }
      } catch (_error) {
        // Keep checking remaining exact, fenced, and balanced-object candidates.
      }
    }

    if (!parsedObjects.length) {
      throw new CompactionResponseParseError(
        'json_object_extraction',
        'Could not parse a valid JSON object from the compaction response.',
      );
    }
    return parsedObjects;
  }

  private validateCandidate(parsedObject: Record<string, unknown>): CandidateValidation {
    const requiredFieldCoverage = RESPONSE_FIELDS.filter(
      (field) => Array.isArray(parsedObject[field]),
    ).length;

    for (const field of RESPONSE_FIELDS) {
      if (!Array.isArray(parsedObject[field])) {
        return {
          failure: {
            requiredFieldCoverage,
            message: `Compaction response is missing a ${field} array.`,
          },
        };
      }
    }

    const parsedEpisodes = this.parseRecognizedEntries(
      parsedObject.episodes as unknown[],
      'episodes',
      'summary',
      this.maxEpisodeChars,
    );
    if (typeof parsedEpisodes === 'string') {
      return { failure: { requiredFieldCoverage, message: parsedEpisodes } };
    }
    if (!parsedEpisodes.length) {
      return {
        failure: {
          requiredFieldCoverage,
          message: 'Compaction response requires at least one non-empty episode.',
        },
      };
    }

    const factEntries = new Map<ResponseField, CompactionSemanticEntry[]>();
    for (const field of RESPONSE_FIELDS.slice(1)) {
      const entries = this.parseRecognizedEntries(
        parsedObject[field] as unknown[],
        field,
        'fact',
        this.maxFactChars,
      );
      if (typeof entries === 'string') {
        return { failure: { requiredFieldCoverage, message: entries } };
      }
      factEntries.set(field, entries.map((fact) => ({ fact })));
    }

    return {
      result: new CompactionResult({
        episodes: parsedEpisodes.map((summary) => ({ summary })),
        criticalIssues: factEntries.get('critical_issues'),
        unresolvedWork: factEntries.get('unresolved_work'),
        durableFacts: factEntries.get('durable_facts'),
        userPreferences: factEntries.get('user_preferences'),
        importantArtifacts: factEntries.get('important_artifacts'),
      }),
    };
  }

  private parseRecognizedEntries(
    values: unknown[],
    field: ResponseField,
    recognizedProperty: 'summary' | 'fact',
    maxChars: number,
  ): string[] | string {
    const entries: string[] = [];
    for (const value of values) {
      if (!isObjectRecord(value)) {
        continue;
      }
      const fields = Object.keys(value);
      if (!fields.length) {
        continue;
      }
      if (!Object.hasOwn(value, recognizedProperty)) {
        return `Compaction ${field} entries must contain ${recognizedProperty}.`;
      }
      const rawText = value[recognizedProperty];
      if (typeof rawText !== 'string') {
        continue;
      }
      const text = clampText(rawText.trim(), maxChars);
      if (text) {
        entries.push(text);
      }
    }
    return entries;
  }
}

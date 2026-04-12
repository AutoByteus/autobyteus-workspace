import { describe, expect, it } from 'vitest';
import {
  AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE,
  AUTOBYTEUS_COMPACTION_DEBUG_LOGS,
  AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER,
  AUTOBYTEUS_COMPACTION_TRIGGER_RATIO,
  CompactionRuntimeSettingsResolver,
} from '../../../src/memory/compaction/compaction-runtime-settings.js';

describe('CompactionRuntimeSettingsResolver', () => {
  it('parses model override, ratio, token override, and debug toggle', () => {
    const resolver = new CompactionRuntimeSettingsResolver();
    const settings = resolver.resolve({
      [AUTOBYTEUS_COMPACTION_TRIGGER_RATIO]: '1.4',
      [AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER]: '  provider/model  ',
      [AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE]: '4096.9',
      [AUTOBYTEUS_COMPACTION_DEBUG_LOGS]: 'YES',
    });

    expect(settings).toEqual({
      triggerRatioOverride: 1,
      activeContextTokensOverride: 4096,
      compactionModelIdentifier: 'provider/model',
      detailedLogsEnabled: true,
    });
  });

  it('drops invalid and blank values', () => {
    const resolver = new CompactionRuntimeSettingsResolver();
    const settings = resolver.resolve({
      [AUTOBYTEUS_COMPACTION_TRIGGER_RATIO]: '0',
      [AUTOBYTEUS_COMPACTION_MODEL_IDENTIFIER]: '   ',
      [AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE]: '-10',
      [AUTOBYTEUS_COMPACTION_DEBUG_LOGS]: 'false',
    });

    expect(settings).toEqual({
      triggerRatioOverride: null,
      activeContextTokensOverride: null,
      compactionModelIdentifier: null,
      detailedLogsEnabled: false,
    });
  });
});

import { describe, it, expect } from 'vitest';
import { ToolResultContinuationBuilder } from '../../../../src/agent/loop/tool-result-continuation-builder.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { SenderType } from '../../../../src/agent/sender-type.js';
import { ContextFile } from '../../../../src/agent/message/context-file.js';
import { ContextFileType } from '../../../../src/agent/message/context-file-type.js';

describe('ToolResultContinuationBuilder', () => {
  it('builds SenderType.TOOL continuation text and preserves media context files', () => {
    const builder = new ToolResultContinuationBuilder();
    const image = new ContextFile('/tmp/result.png', ContextFileType.IMAGE);
    const resultEvent = new ToolResultEvent('tool_a', image, 'inv-1', undefined, { value: 1 }, 'turn-1', false);

    const message = builder.build([resultEvent]);

    expect(message.senderType).toBe(SenderType.TOOL);
    expect(message.content).toContain('Tool: tool_a (ID: inv-1)');
    expect(message.content).toContain('Status: Success');
    expect(message.content).toContain("The file 'result.png' has been loaded");
    expect(message.contextFiles).toEqual([image]);
  });
});

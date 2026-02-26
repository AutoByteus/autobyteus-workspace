import { describe, it, expect, beforeEach } from 'vitest';
import { tool, FunctionalTool } from '../../../src/tools/functional-tool.js';
import { ToolRegistry, defaultToolRegistry } from '../../../src/tools/registry/tool-registry.js';
import { ToolDefinition } from '../../../src/tools/registry/tool-definition.js';
import { ParameterType } from '../../../src/utils/parameter-schema.js';

describe('FunctionalTool (integration)', () => {
  beforeEach(() => {
    defaultToolRegistry.clear();
  });

  it('decorated tool is executable and uses context', async () => {
    const executable = tool({
      paramTypeHints: { text: ParameterType.STRING },
      description: 'Executable tool'
    })(async function executableFunc(context: { agentId: string }, text: string) {
      return `executed: ${text} by ${context.agentId}`;
    });

    const result = await executable.execute({ agentId: 'functional_test_agent' }, { text: 'hello' });
    expect(result).toBe('executed: hello by functional_test_agent');
  });

  it('decorated tool with state persists across calls', async () => {
    const statefulCounter = tool({
      paramTypeHints: {}
    })(function statefulCounter(tool_state: Record<string, any>) {
      const count = (tool_state.count ?? 0) + 1;
      tool_state.count = count;
      return count;
    });

    expect(statefulCounter).toBeInstanceOf(FunctionalTool);

    const result1 = await statefulCounter.execute({ agentId: 'agent' }, {});
    expect(result1).toBe(1);
    expect((statefulCounter as any).toolState.get('count')).toBe(1);

    const result2 = await statefulCounter.execute({ agentId: 'agent' }, {});
    expect(result2).toBe(2);
    expect((statefulCounter as any).toolState.get('count')).toBe(2);
  });
});

import { describe, it, expect } from 'vitest';
import {
  renderAssistantCompleteResponse,
  renderError,
  renderToolApprovalRequest,
  renderToolAutoExecuting,
  renderToolInteractionLog,
  renderSystemTaskNotification
} from '../../../src/cli/agent-team/widgets/renderables.js';

describe('agent team renderables', () => {
  it('renders assistant response with reasoning and content', () => {
    const result = renderAssistantCompleteResponse({
      content: 'Hello!',
      reasoning: 'Thinking...',
      usage: undefined
    } as any);

    expect(result[0]).toContain('<Thinking>');
    expect(result[0]).toContain('Thinking...');
    expect(result[1]).toContain('assistant: Hello!');
  });

  it('renders tool logs and approvals', () => {
    const log = renderToolInteractionLog({
      log_entry: 'done',
      tool_invocation_id: 'inv-1',
      tool_name: 'run_bash'
    } as any);
    expect(log).toContain('[tool-log] done');

    const approval = renderToolApprovalRequest({
      invocation_id: 'inv-2',
      tool_name: 'write_file',
      arguments: { path: '/tmp/demo' }
    } as any);
    expect(approval).toContain("approval for tool 'write_file'");
    expect(approval).toContain('"path": "/tmp/demo"');

    const autoExec = renderToolAutoExecuting({
      invocation_id: 'inv-3',
      tool_name: 'run_bash',
      arguments: { command: 'ls' }
    } as any);
    expect(autoExec).toContain("Executing tool 'run_bash'");
    expect(autoExec).toContain('"command": "ls"');
  });

  it('renders errors and system task notifications', () => {
    const error = renderError({
      source: 'llm',
      message: 'boom',
      details: 'stack'
    } as any);
    expect(error).toContain('Error from llm: boom');
    expect(error).toContain('Details: stack');

    const notification = renderSystemTaskNotification({
      sender_id: 'sys',
      content: 'New task assigned'
    } as any);
    expect(notification).toContain('System Task Notification: New task assigned');
  });
});

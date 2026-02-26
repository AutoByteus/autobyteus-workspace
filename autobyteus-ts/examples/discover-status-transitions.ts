import {
  AgentReadyEvent,
  AgentStoppedEvent,
  AgentErrorEvent,
  AgentIdleEvent,
  ShutdownRequestedEvent,
  BootstrapStartedEvent,
  BootstrapStepRequestedEvent,
  BootstrapStepCompletedEvent,
  BootstrapCompletedEvent,
  UserMessageReceivedEvent,
  InterAgentMessageReceivedEvent,
  LLMUserMessageReadyEvent,
  LLMCompleteResponseReceivedEvent,
  PendingToolInvocationEvent,
  ApprovedToolInvocationEvent,
  ToolExecutionApprovalEvent,
  ToolResultEvent
} from '../src/agent/events/agent-events.js';
import { AgentStatusDeriver } from '../src/agent/status/status-deriver.js';
import { AgentStatus } from '../src/agent/status/status-enum.js';
import { AgentInputUserMessage } from '../src/agent/message/agent-input-user-message.js';
import { InterAgentMessage } from '../src/agent/message/inter-agent-message.js';
import { LLMUserMessage } from '../src/llm/user-message.js';
import { CompleteResponse } from '../src/llm/utils/response-types.js';
import { ToolInvocation } from '../src/agent/tool-invocation.js';
import { setConsoleLogLevel } from './shared/logging.js';

setConsoleLogLevel(
  process.env.AUTOBYTEUS_LOG_LEVEL ?? 'info',
  process.env.AUTOBYTEUS_LOG_FILE ?? './logs/discover_status_transitions.log'
);

const sampleUserMessage = new AgentInputUserMessage('hello');
const sampleInterAgentMessage = InterAgentMessage.createWithDynamicMessageType(
  'Role',
  'agent-1',
  'message',
  'TASK_ASSIGNMENT',
  'agent-0'
);
const sampleLlmUserMessage = new LLMUserMessage({ content: 'user input' });
const sampleCompleteResponse = CompleteResponse.fromContent('response');
const sampleInvocation = new ToolInvocation('write_file', { path: 'test.txt', content: 'hi' }, 'tool-1');

const eventFactories = [
  { name: 'BootstrapStartedEvent', make: () => new BootstrapStartedEvent() },
  { name: 'BootstrapStepRequestedEvent', make: () => new BootstrapStepRequestedEvent(1) },
  { name: 'BootstrapStepCompletedEvent', make: () => new BootstrapStepCompletedEvent(1, 'step', true) },
  { name: 'BootstrapCompletedEvent', make: () => new BootstrapCompletedEvent(true) },
  { name: 'AgentReadyEvent', make: () => new AgentReadyEvent() },
  { name: 'AgentIdleEvent', make: () => new AgentIdleEvent() },
  { name: 'ShutdownRequestedEvent', make: () => new ShutdownRequestedEvent() },
  { name: 'AgentStoppedEvent', make: () => new AgentStoppedEvent() },
  { name: 'AgentErrorEvent', make: () => new AgentErrorEvent('error') },
  { name: 'UserMessageReceivedEvent', make: () => new UserMessageReceivedEvent(sampleUserMessage) },
  { name: 'InterAgentMessageReceivedEvent', make: () => new InterAgentMessageReceivedEvent(sampleInterAgentMessage) },
  { name: 'LLMUserMessageReadyEvent', make: () => new LLMUserMessageReadyEvent(sampleLlmUserMessage) },
  { name: 'LLMCompleteResponseReceivedEvent', make: () => new LLMCompleteResponseReceivedEvent(sampleCompleteResponse) },
  { name: 'PendingToolInvocationEvent', make: () => new PendingToolInvocationEvent(sampleInvocation) },
  { name: 'ApprovedToolInvocationEvent', make: () => new ApprovedToolInvocationEvent(sampleInvocation) },
  { name: 'ToolExecutionApprovalEvent(approved)', make: () => new ToolExecutionApprovalEvent('tool-1', true) },
  { name: 'ToolExecutionApprovalEvent(denied)', make: () => new ToolExecutionApprovalEvent('tool-1', false) },
  { name: 'ToolResultEvent', make: () => new ToolResultEvent('write_file', 'ok', 'tool-1') }
];

type Transition = {
  from: string;
  to: string;
  event: string;
  autoExecuteTools: boolean;
};

function discoverTransitions(autoExecuteTools: boolean): Transition[] {
  const statuses = Object.values(AgentStatus);
  const transitions: Transition[] = [];

  for (const status of statuses) {
    for (const eventFactory of eventFactories) {
      const deriver = new AgentStatusDeriver(status as AgentStatus);
      const [oldStatus, newStatus] = deriver.apply(eventFactory.make(), {
        agentId: 'status_discovery',
        autoExecuteTools
      });
      if (oldStatus !== newStatus) {
        transitions.push({
          from: oldStatus,
          to: newStatus,
          event: eventFactory.name,
          autoExecuteTools
        });
      }
    }
  }

  return transitions;
}

function printTable(rows: Transition[]): void {
  if (!rows.length) {
    console.log('No transitions discovered.');
    return;
  }

  const headers = ['From', 'To', 'Event', 'AutoExecuteTools'];
  const widths = headers.map((header) => header.length);

  for (const row of rows) {
    const values = [row.from, row.to, row.event, row.autoExecuteTools ? 'true' : 'false'];
    values.forEach((value, idx) => {
      widths[idx] = Math.max(widths[idx], value.length);
    });
  }

  const formatRow = (values: string[]) =>
    values.map((value, idx) => value.padEnd(widths[idx])).join(' | ');

  console.log(formatRow(headers));
  console.log(widths.map((w) => '-'.repeat(w)).join('-|-'));

  for (const row of rows) {
    const values = [row.from, row.to, row.event, row.autoExecuteTools ? 'true' : 'false'];
    console.log(formatRow(values));
  }
}

const transitions = [
  ...discoverTransitions(true),
  ...discoverTransitions(false)
].sort((a, b) => {
  if (a.from !== b.from) return a.from.localeCompare(b.from);
  if (a.to !== b.to) return a.to.localeCompare(b.to);
  if (a.event !== b.event) return a.event.localeCompare(b.event);
  return Number(a.autoExecuteTools) - Number(b.autoExecuteTools);
});

console.log('--- Discovering agent status transitions ---');
printTable(transitions);
console.log(`\nTotal transitions discovered: ${transitions.length}`);

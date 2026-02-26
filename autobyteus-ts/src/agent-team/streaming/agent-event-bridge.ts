import { AgentEventStream } from '../../agent/streaming/streams/agent-event-stream.js';
import type { AgentTeamExternalEventNotifier } from './agent-team-event-notifier.js';

type AgentLike = { agentId: string } | Record<string, any>;

type BridgeOptions = { stream?: AgentEventStream };

const resolveOptions = (loopOrOptions?: unknown, maybeOptions?: BridgeOptions): BridgeOptions | undefined => {
  if (loopOrOptions && typeof loopOrOptions === 'object' && 'stream' in (loopOrOptions as BridgeOptions)) {
    return loopOrOptions as BridgeOptions;
  }
  return maybeOptions;
};

export class AgentEventBridge {
  private agentName: string;
  private notifier: AgentTeamExternalEventNotifier;
  private stream: AgentEventStream;
  private cancelled = false;
  private task: Promise<void>;

  constructor(
    agent: AgentLike,
    agentName: string,
    notifier: AgentTeamExternalEventNotifier,
    loopOrOptions?: unknown,
    maybeOptions?: BridgeOptions
  ) {
    this.agentName = agentName;
    this.notifier = notifier;

    const options = resolveOptions(loopOrOptions, maybeOptions);
    this.stream = options?.stream ?? new AgentEventStream(agent as any);

    this.task = this.run();
    console.info(`AgentEventBridge created and task started for agent '${agentName}'.`);
  }

  private async run(): Promise<void> {
    try {
      for await (const event of this.stream.allEvents()) {
        if (this.cancelled) {
          break;
        }
        this.notifier.publishAgentEvent(this.agentName, event);
      }
    } catch (error) {
      if (this.cancelled) {
        console.info(`AgentEventBridge task for '${this.agentName}' was cancelled.`);
      } else {
        console.error(`Error in AgentEventBridge for '${this.agentName}': ${error}`);
      }
    } finally {
      console.debug(`AgentEventBridge task for '${this.agentName}' is finishing.`);
    }
  }

  async cancel(): Promise<void> {
    console.info(`Cancelling AgentEventBridge for '${this.agentName}'.`);
    this.cancelled = true;
    await this.stream.close();
    await this.task;
    console.info(`AgentEventBridge for '${this.agentName}' cancelled successfully.`);
  }
}
